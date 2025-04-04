import events from 'events';
import { Sentry } from '.';
import { websocket } from '../services';
import { ApplicationError } from '../errors';
import logger from '../logger';

export const eventEmitter = new events.EventEmitter();

const emitRideUpdateEvent = data => eventEmitter.emit('ride-updates', data);

export const checkActiveRideAndRoom = async (rideObj, userTypeObj, event) => {
  const ride = rideObj;
  const userType = userTypeObj.toLowerCase();

  let socketIds;
  let isRoomExists = false;

  if (!ride.isActive()) {
    isRoomExists = await websocket.isRoomExists(ride._id);

    const userId = userType === 'driver' ? ride.driver : ride.rider;
    socketIds = await websocket.getUserSocketIds(userId, userType);
    websocket.emitWebsocketEventToSocketIds(
      'ride-updates',
      socketIds,
      {
        ride: ride._id.toString(),
        status: ride.status,
        message: null
      }
    );

    Sentry.captureScopedException(
      new ApplicationError(`Ride is no longer active during ${event} event`, 500),
      {
        tag: event,
        type: 'event',
        info: {
          ride: ride._id
        }
      }
    );
    return false;
  }

  isRoomExists = await websocket.isRoomExists(ride._id);

  if (!isRoomExists) {
    try {
      const driverSocketIds = await websocket.getUserSocketIds(ride.driver, 'driver');
      await websocket.joinSocketToRoom(driverSocketIds, ride._id.toString());
      const riderSocketIds = await websocket.getUserSocketIds(ride.rider, 'rider');
      await websocket.joinSocketToRoom(riderSocketIds, ride._id.toString());
    } catch (err) {
      if (err.message
        && !err.message.includes('timeout reached while waiting for remoteJoin response')) {
        throw err;
      }
    } finally {
      logger.warn(`Room for ride with specified id of ${ride._id} not found during ${event} event`);
    }
  }
  return true;
};

export default { checkActiveRideAndRoom };
