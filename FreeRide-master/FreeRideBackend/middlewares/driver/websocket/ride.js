/* eslint-disable no-await-in-loop */
import {
  Rides,
  Drivers,
  Routes,
  RideStatus
} from '../../../models';
import { validator } from '../../../utils';
import { sns, websocket } from '../../../services';
import { SnsMessage } from '../../../services/SnsMessage';
import logger from '../../../logger';

import {
  checkDriverNearPickup
} from '../../../utils/ride';
import { getLocaleFromUser, buildTranslator } from '../../../utils/translation';
import { captureScopedException } from '../../../utils/sentry';
import { feetToMeter } from '../../../utils/transformations';

const ACTIVE_NOT_ARRIVED_STATUS = [
  RideStatus.RideInQueue,
  RideStatus.NextInQueue,
  RideStatus.DriverEnRoute
];

const ACTIVE_NO_PICKUP_STATUS = [
  ...ACTIVE_NOT_ARRIVED_STATUS,
  RideStatus.DriverArrived
];

const ACTIVE_STATUS = [
  ...ACTIVE_NO_PICKUP_STATUS,
  RideStatus.RideInProgress
];

const driverMoved = async (socket, io, data) => {
  let activeRide = null;
  let driverId = null;

  try {
    const { latitude, longitude } = validator.validate(
      validator.rules.object().keys({
        latitude: validator.rules.number().min(-90).max(90).required(),
        longitude: validator.rules.number().min(-180).max(180).required()
      }),
      data
    );

    ({ _id: driverId } = socket.decoded_token.user);

    // Update driver's current location
    const driver = await Drivers.updateDriver(
      driverId,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }
    );

    // Announce driver movement to Rider app
    const activeRides = await Rides.find(
      { driver: driverId, status: { $in: ACTIVE_STATUS } }
    ).populate('location').sort({ createdTimestamp: 1 });

    const existingRideRooms = await Promise.all(
      activeRides.map(ride => websocket.isRoomExists(ride._id.toString())
        .then(exists => ({ rideId: ride._id.toString(), exists })))
    );

    activeRides.forEach((ride) => {
      const rideId = ride._id.toString();
      const roomExists = existingRideRooms.find(room => room.rideId === rideId).exists;

      if (roomExists) {
        websocket.emitWebsocketEventToRoom(
          rideId,
          'ride-driver-moved',
          {
            ride: rideId,
            latitude,
            longitude
          }
        );
      }
    });

    // Check if driver is working with pooling rides or not
    const route = await Routes.findOne({ driver: driverId, active: true });

    if (route) {
      const { activeRideId } = route;
      if (activeRideId) {
        // Only allow driver arriving notification for active ride if it is at 202 (DriverEnRoute)
        activeRide = await Rides.findOne(
          {
            _id: activeRideId,
            status: RideStatus.DriverEnRoute
          }
        ).populate('location');
      }
    } else if (activeRides.length) {
      // Only next ride in queue may be changed to 203
      const driverArrivedRides = activeRides.filter(
        item => item.status === RideStatus.DriverArrived
      );
      const waitingDriverArrivedRides = activeRides.filter(
        item => item.status === RideStatus.DriverEnRoute
      );
      // Only if there are no rides already in 203 (DriverArrived)
      // may the next ride in 202 (DriverEnRoute) receive driver arriving notification
      if (!driverArrivedRides.length && waitingDriverArrivedRides.length) {
        [activeRide] = waitingDriverArrivedRides;
      }
    }

    const triggerArrivingNotification = activeRide && !activeRide.driverArrivingTimestamp;
    if (triggerArrivingNotification) {
      const { arrivedRangeFeet } = activeRide.location;
      const arrivedRangeMeters = feetToMeter(arrivedRangeFeet || 500);

      const driverIsNear = checkDriverNearPickup(
        driverId, activeRide, arrivedRangeMeters
      );

      if (driverIsNear) {
        const now = Date.now();
        const addParams = { driverArrivingTimestamp: { $exists: false } };
        const updateParams = { $set: { driverArrivingTimestamp: now } };
        logger.info(`[driver-moved] ride=${activeRide._id} driverArrivingTimestamp=${now}`);
        const driverArrivingRide = await Rides.updateRide(
          activeRide._id,
          updateParams,
          addParams
        );

        if (driverArrivingRide) {
          const riderLocale = await getLocaleFromUser('rider', driverArrivingRide.rider);
          await sns.send(
            'RIDER',
            driverArrivingRide.rider.toString(),
            new SnsMessage(
              'driverArriving',
              {
                driverDisplayName: driver.displayName
              },
              await buildTranslator(riderLocale)
            )
          );
        }
      }
    }
  } catch (err) {
    logger.error('[driver-moved] [error]');
    logger.error(err);

    captureScopedException(err, {
      type: 'DriverWebsocket',
      info: { rideId: activeRide?._id, event: 'driver-moved', driverId }
    });
    socket.emit('wserror', { message: err.message });
  }
};

const ack = async (socket, io, data) => {
  logger.info(`[ACK] Ride: ${data?.ride}`);
  await Rides.findOneAndUpdate(
    { _id: data?.ride, ackReceived: { $ne: true } },
    { $set: { ackReceived: true } },
    { new: true, upsert: false }
  );
};

export default {
  driverMoved,
  ack
};
