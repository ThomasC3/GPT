import { Server } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import * as Sentry from '@sentry/node';
import authorize from './socketio-jwt';
import { auth, redis as config } from '../config';
import logger from '../logger';
import { Riders, Drivers, Rides } from '../models';
import { eventEmitter as rideUpdate } from '../models/ride';
import driverRide from '../middlewares/driver/websocket/ride';
import server from '../app';
import { websocket as riderWebsocketEvents } from '../routers/rider';
import { websocket as driverWebsocketEvents } from '../routers/driver';
import { ApplicationError } from '../errors';
import { socketIoLogger } from './logging';

export class WebSocket {
  constructor() {
    this.routes = {
      rider: riderWebsocketEvents,
      driver: driverWebsocketEvents
    };
  }

  init(httpServer) {
    const redisPubClient = new Redis({
      port: config.port,
      host: config.host,
      db: config.pubsubDb,
      password: config.password || undefined
    });
    const redisSubClient = redisPubClient.duplicate();

    this.socketServer = new Server({
      adapter: createAdapter(redisPubClient, redisSubClient),
      connectTimeout: 45000,
      cookie: {
        name: 'io',
        httpOnly: false
      },
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Sec-WebSocket-Key', 'Sec-WebSocket-Version', 'Sec-WebSocket-Extensions'],
        credentials: true
      },
      pingInterval: 25000,
      pingTimeout: 60000,
      allowEIO3: true
    });

    if (httpServer) {
      this.socketServer.attach(httpServer);
    }

    this.socketServer.use(socketIoLogger);

    logger.info(`[INIT WEBSOCKETS] host=${config.host} port=${config.port} db=${config.pubsubDb}`);

    this.socketServer
      .on('connection', (socket) => {
        socket.on('disconnecting', async (reason) => {
          let userId = '(undefined)';
          if (socket.user) {
            userId = socket.user._id;
          }
          const rooms = this.socketServer.of('/').adapter.socketRooms(socket.id);
          logger.debug(`[Socket_disconnecting] user_id=${userId} socket_id=${socket.id} rooms=[${Array.from(rooms).join(', ')}] reason=${reason}`);
        });

        const authTimeout = setTimeout(() => {
          socket.disconnect('unauthorized');
        }, 15000);

        socket.on('authenticate', (data) => {
          if (authorize(socket, data, { secret: auth.secret })) {
            clearTimeout(authTimeout);
            this.onAuthenticated.bind(this)(socket);
          }
        });
      });

    this.setRideUpdateListener.bind(this)();
  }

  async onAuthenticated(socket) {
    try {
      let driver = false;
      let rider = false;
      const { userType, user: { _id: userId } } = socket.decoded_token;
      logger.debug(`[Socket_connect] user_type=${userType} user_id=${userId} socket_id=${socket.id}`);

      switch (userType) {
      case 'rider':
        rider = await Riders.findById(userId);
        if (!rider) {
          throw new Error('Wrong user id');
        }
        break;
      case 'driver':
        driver = await Drivers.findById(userId);
        if (!driver) {
          throw new Error('Wrong user id');
        }
        break;
      default:
        throw new Error('Unknown user type');
      }

      await this.clearDisconnectedSocketIds(userId, userType);
      await this.saveSocketId(userId, userType, socket.id);

      socket.on('disconnect', this.onDisconnect.bind(this, userId, userType, socket.id));
      this.setEventListeners(this.routes[userType], socket);

      const rides = await Rides.findActiveFor(userType, userId);

      if (rides && rides.length > 0) {
        await Promise.all(
          rides.map(ride => this.joinSocketToRoom([socket.id], ride._id.toString())),
        );
      }
    } catch (err) {
      logger.debug(err);
      Sentry.captureException(err);

      socket.emit('wserror', { message: err.message });
    }
  }

  onDisconnect(userId, userType, socketId) {
    logger.debug(`[Socket_disconnect] user_type=${userType} user_id=${userId} socket_id=${socketId}`);
    this.deleteSocketId(userId, userType, socketId);
  }

  setRideUpdateListener() {
    rideUpdate.on('ride-updates', async (rideInfo) => {
      const ride = rideInfo;
      if (ride.createdRide && ride.hailed) {
        const driverSocketIds = await this.getUserSocketIds(ride.driver, 'driver');

        await this.joinSocketToRoom(driverSocketIds, ride.ride);

        delete ride.createdRide;
        delete ride.driver;
      }

      delete ride.hailed;

      this.emitWebsocketEventToRoom(ride.ride, 'ride-updates', ride);

      if (![200, 201, 202, 203, 300].includes(ride.status)) {
        const isRoomExists = await this.isRoomExists(ride.ride);

        if (isRoomExists) {
          const socketIdsInRoom = await this.getRoomClients(ride.ride);

          await Promise.all(socketIdsInRoom.map(socketId => this.leaveRoom(socketId, ride.ride)));
        }
      }
    });
  }

  setEventListeners(routes, socket) {
    Object.keys(routes).forEach((eventName) => {
      socket.on(eventName, data => routes[eventName](socket, this.socketServer, data));
    });
  }

  setDriverLocationListener(socket) {
    socket.on('ride-driver-moved', driverRide.driverMoved.bind(null, socket, this.socketServer));
  }

  /**
   * Saves user socket to db
   * @param {String} userId user id
   * @param {String} userType user type
   * @param {String} socketId socket id
   * @returns {Promise} promise which will be resolved when deleted socket
   */
  // eslint-disable-next-line class-methods-use-this
  async saveSocketId(userId, userType, socketId) {
    //  eslint-disable-next-line
    logger.debug(`[Socket_save] user_type=${userType} user_id=${userId} socket_id=[${socketId}]`);
    switch (userType) {
    case 'driver':
      await Drivers.saveSocket(userId, socketId);
      break;
    case 'rider':
      await Riders.saveSocket(userId, socketId);
      break;
    default:
      throw new ApplicationError('Invalid user type on saveSocketId');
    }
  }

  /**
   * Deletes user socket from db
   * @param {String} userId user id
   * @param {String} userType user type
   * @param {String} socketId socket id
   * @returns {Promise} promise which will be resolved when deleted socket
   */
  // eslint-disable-next-line class-methods-use-this
  async deleteSocketId(userId, userType, socketId) {
    // eslint-disable-next-line
    logger.debug(`[Socket_delete] user_type=${userType} user_id=${userId} socket_id=[${socketId}]`);
    switch (userType) {
    case 'driver':
      await Drivers.deleteSocket(userId, socketId);
      break;
    case 'rider':
      await Riders.deleteSocket(userId, socketId);
      break;
    default:
      throw new ApplicationError('Invalid user type on deleteSocketId');
    }
  }

  /**
   * Returns array of sockets for user
   * @param {String} userId user id
   * @param {String} userType user type `driver` or `rider`
   * @returns {Promise} promise which will be resolved when got sockets
   */
  // eslint-disable-next-line class-methods-use-this
  async getUserSocketIds(userId, userType) {
    let user;
    let socketIds = [];
    // eslint-disable-next-line
    switch (userType) {
    case 'driver':
      user = await Drivers.findById(userId);
      break;
    case 'rider':
      user = await Riders.findById(userId);
      break;
    default:
      throw new ApplicationError('Invalid user type on getUserSocketIds');
    }

    if (user) {
      // eslint-disable-next-line
      socketIds = user.socketIds;
    }
    return socketIds;
  }

  /**
   * Joins user socket to room
   * @param {Array<String>} socketIds array of socket ids
   * @param {String} roomName room name
   * @returns {Promise}
   */
  async joinSocketToRoom(socketIds, roomName) {
    if (socketIds) {
      try {
        const sockets = await this.socketServer.fetchSockets();
        return Promise.all(
          socketIds.map((id) => {
            const socket = sockets.find(el => el.id === id);
            if (socket) {
              return socket.join([roomName]);
            }
            return Promise.resolve();
          })
        );
      } catch (error) {
        logger.warn(`Error adding sockets [${socketIds}] to room ${roomName}`);
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  }

  /**
   * Emits websocket event to sockets
   * @param {String} event event name
   * @param {Array<String>} socketIds array of socket ids
   * @param {Object} data data to send
   */
  emitWebsocketEventToSocketIds(event, socketIds, data) {
    if (socketIds) {
      socketIds.forEach(socketId => this.socketServer.to(socketId).emit(event, data));
    }
  }

  /**
   * Emits websocket event to room
   * @param {String} roomName websocket room name
   * @param {String} eventName websocket event name
   * @param {Object} data data to send
   */
  emitWebsocketEventToRoom(roomName, eventName, data) {
    this.socketServer.to(roomName).emit(eventName, data);
  }

  /**
   * Checks if socket is connected
   * @param {String} socketId socket id
   * @returns {Promise<Boolean>} true - socket connected, false - socket disconnected
   */
  async isConnected(socketId) {
    return new Promise(async (resolve) => {
      const sockets = await this.socketServer.fetchSockets();
      sockets.forEach((el) => {
        if (el.id === socketId) {
          resolve(el.connected);
        }
      });
      resolve(false);
    });
  }

  /**
   * Checks if room exists
   * @param {String} roomName room name
   * @returns {Promise<Boolean>} true - room exists, false - room doesnt exists
   */
  isRoomExists(roomName) {
    return Promise.resolve(this.socketServer.of('/').adapter.hasRoom(roomName));
  }

  /**
   * Leaves websocket room
   * @param {String} socketId socket id
   * @param {String} roomName room name
   * @returns {Promise}
   */
  async leaveRoom(socketId, roomName) {
    return this.socketServer.of('/').adapter.del({ id: socketId, room: roomName });
  }

  /**
   * Returns socket ids in room
   * @param {String} roomName
   * @returns {Promise}
   */
  async getRoomClients(roomName) {
    return this.socketServer.of('/').in(roomName).fetchSockets();
  }

  /**
   * Deletes disconnected sockets from DB
   * @param {String} userId user id
   * @param {String} userType user type 'driver' or 'rider'
   * @returns {Promise}
   */
  async clearDisconnectedSocketIds(userId, userType) {
    const socketIds = await this.getUserSocketIds(userId, userType);
    const connectedSocketIds = await Promise.all(
      socketIds.map(socketId => this.isConnected(socketId)
        .then(connected => ({ socketId, connected }))),
    );
    const socketsToDisconnect = [];

    connectedSocketIds.forEach((socket) => {
      if (!socket.connected) {
        socketsToDisconnect.push(socket.socketId);
      }
    });

    return this.deleteSocketId(userId, userType, socketsToDisconnect);
  }
}

export default new WebSocket(server);
