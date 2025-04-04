import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  Riders, Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createRequest } from '../utils/rider';
import { pickUp, driverCancel, createDriverLogin } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driverSocket;
let driverToken;
let rider1Socket;
let rider2Socket;
let rider3Socket;
let sandbox;
let driver;
let rider1;
let rider2;
let rider3;
let rider1Token;
let rider2Token;
let rider3Token;
let location;
let ride1;
let ride2;
let ride3;
let route1;

const keyLoc = {
  a0: [32.747821, -117.108172, 'A0'],
  a1: [32.747804, -117.106977, 'A1'],
  a2: [32.747804, -117.105704, 'A2'],
  a3: [32.747788, -117.104490, 'A3'],
  a4: [32.747755, -117.103256, 'A4'],

  b0: [32.745976, -117.108192, 'B0'],
  b1: [32.745959, -117.107017, 'B1'],
  b2: [32.745926, -117.105763, 'B2'],
  b3: [32.745910, -117.104510, 'B3'],
  b4: [32.745910, -117.103276, 'B4'],

  c0: [32.744098, -117.108251, 'C0'],
  c1: [32.744065, -117.107017, 'C1'],
  c2: [32.744081, -117.105763, 'C2'],
  c3: [32.744048, -117.104529, 'C3'],
  c4: [32.744065, -117.103295, 'C4'],

  d0: [32.742236, -117.108251, 'D0'],
  d1: [32.742202, -117.107002, 'D1'],
  d2: [32.742224, -117.105794, 'D2'],
  d3: [32.742181, -117.104560, 'D3'],
  d4: [32.742181, -117.103301, 'D4']
};

describe('Route update', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'SD',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      inversionRangeFeet: 10,
      serviceArea: [
        {
          latitude: 32.755519,
          longitude: -117.118018
        },
        {
          latitude: 32.757816,
          longitude: -117.079595
        },
        {
          latitude: 32.729851,
          longitude: -117.079809
        },
        {
          latitude: 32.729941,
          longitude: -117.129672
        },
        {
          latitude: 32.755519,
          longitude: -117.118018
        }
      ]
    });

    const driverInfo = {
      currentLocation: {
        coordinates: [keyLoc.a0[1], keyLoc.a0[0]],
        type: 'Point'
      },
      email: 'driver@mail.com',
      locations: [location._id]
    };

    ({ driver, driverSocket, driverToken } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));

    rider1 = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    rider2 = await new Riders({
      email: 'rider2@mail.com',
      firstName: 'Rider',
      lastName: '2',
      password: 'Password2',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    rider3 = await new Riders({
      email: 'rider3@mail.com',
      firstName: 'Rider',
      lastName: '3',
      password: 'Password3',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const rider1SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider1@mail.com', password: 'Password1' })
      .expect(200)
      .end()
      .get('body');

    const rider2SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider2@mail.com', password: 'Password2' })
      .expect(200)
      .end()
      .get('body');

    const rider3SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider3@mail.com', password: 'Password3' })
      .expect(200)
      .end()
      .get('body');


    rider1Token = rider1SessionResponse.accessToken;
    rider2Token = rider2SessionResponse.accessToken;
    rider3Token = rider3SessionResponse.accessToken;

    rider1Socket
      .emit('authenticate', { token: rider1Token })
      .on('authenticated', () => {
        logger.debug('RIDER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider2Socket
      .emit('authenticate', { token: rider2Token })
      .on('authenticated', () => {
        logger.debug('RIDER2 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider3Socket
      .emit('authenticate', { token: rider3Token })
      .on('authenticated', () => {
        logger.debug('RIDER3 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  before(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
    rider3Socket.removeAllListeners();

    await Locations.syncIndexes();
  });

  describe('Route update for cancel', () => {
    it('Should assign driver 1 to ride request 1 and pick up', async () => {
      // Request 1 created
      logger.debug('REQUEST 1 CREATED');
      logger.debug([keyLoc.a0[2], keyLoc.a0[0], keyLoc.a0[1]]);
      logger.debug([keyLoc.d0[2], keyLoc.d0[0], keyLoc.d0[1]]);

      await createRequest(rider1Token, keyLoc.a0, keyLoc.d0, location, app, request, domain);
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      await pickUp(driverToken, ride1, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(String(ride1.status), 300);
    });
    it('Should assign driver 1 to ride request 2 and pick up', async () => {
      // Request 1 created
      logger.debug('REQUEST 2 CREATED');
      logger.debug([keyLoc.a0[2], keyLoc.a0[0], keyLoc.a0[1]]);
      logger.debug([keyLoc.d1[2], keyLoc.d1[0], keyLoc.d1[1]]);

      await createRequest(rider2Token, keyLoc.a0, keyLoc.d1, location, app, request, domain);
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      await pickUp(driverToken, ride2, app, request, domain);

      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.status), 300);
    });
    it('Should assign driver 1 to ride request 3 and cancel', async () => {
      // Request 1 created
      logger.debug('REQUEST 3 CREATED');
      logger.debug([keyLoc.b1[2], keyLoc.b1[0], keyLoc.b1[1]]);
      logger.debug([keyLoc.c2[2], keyLoc.c2[0], keyLoc.c2[1]]);

      await createRequest(rider3Token, keyLoc.b1, keyLoc.c2, location, app, request, domain);
      await driverSearcher.search();

      ride3 = await Rides.findOne({ rider: rider3 });
      await driverCancel(driverToken, ride3._id, app, request, domain);

      route1 = await Routes.findOne({ driver });
      return sinon.assert.match(route1.stops[route1.stops.length - 4].status, 'cancel');
    });
  });
});
