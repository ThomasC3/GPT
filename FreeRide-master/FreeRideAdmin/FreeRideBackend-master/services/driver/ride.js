import logger from '../../logger';
import { noShowRideCancelCheck } from '../../middlewares/driver/utils/noShowCancelLogic';
import { sendRideCompletedEmail } from '../../middlewares/driver/utils/ride';
import {
  Drivers, ridesCancellationSources, Riders, Rides, RideStatus, Zones
} from '../../models';
import { PRE_ARRIVED_STATUS, PRE_PICKUP_STATUS } from '../../models/ride';
import { dumpRideForDriver } from '../../utils/dump';
import { cancelRequestPayment, captureRequestPayment } from '../../utils/request';
import {
  calcETAmetrics, poolingRideTag, stopsBeforeDropoffCount, updateRouteRide
} from '../../utils/ride';
import { buildTranslator, getLocaleFromUser } from '../../utils/translation';
import setQueue from '../queue';
import sns from '../sns';
import { SnsMessage } from '../SnsMessage';
import websocket from '../websocket';


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

export const rideCancelService = async (
  ride,
  { noShow, ...data } = {},
  cancelledBy = ridesCancellationSources.DRIVER
) => {
  try {
    if (!ride.isAllowedCancel()) {
      logger.info(`[ride-cancel] [not-allowed] ride=${ride?._id}`);
      throw new Error('Unable to cancel ride');
    }

    if (noShow) {
      const isAllowedNoShowCancel = await noShowRideCancelCheck(ride, data);
      if (!isAllowedNoShowCancel) {
        logger.info(
          `[ride-cancel-no-show] [not-allowed] ride=${ride?._id} current-location=${data.latitude},${data.longitude}`
        );
        throw new Error('Unable to cancel no show');
      }
    }

    const rideId = ride._id;
    const driverId = ride.driver;

    if (ACTIVE_NO_PICKUP_STATUS.includes(ride.status)) {
      await cancelRequestPayment(ride.request);
    }

    // Update Route
    await updateRouteRide(ride, 'cancel');

    const rideUpdate = { cancelTimestamp: Date.now(), cancelledBy };

    switch (true) {
    case noShow:
      rideUpdate.status = RideStatus.CancelledNoShow;
      break;
    case ride.status === RideStatus.RideInQueue
        || ride.status === RideStatus.NextInQueue:
      rideUpdate.status = RideStatus.CancelledInQueue;
      break;
    case ride.status === RideStatus.DriverEnRoute:
      rideUpdate.status = RideStatus.CancelledEnRoute;
      break;
    case ride.status === RideStatus.DriverArrived:
      rideUpdate.status = RideStatus.CancelledNotAble;
      break;
    default:
      throw new Error(`Invalid ride status - ${ride.status}`);
    }

    if (noShow) {
      await Riders.updateRider(ride.rider, { lastCancelTimestamp: Date.now() });
    }

    const updatedRide = await Rides.updateRide(rideId, rideUpdate);

    if (ACTIVE_NO_PICKUP_STATUS.includes(ride.status)) {
      const riderLocale = await getLocaleFromUser('rider', ride.rider);
      await sns.send(
        'RIDER',
        ride.rider.toString(),
        new SnsMessage(
          'driverPassesOnRequest',
          {},
          await buildTranslator(riderLocale)
        )
      );
    }

    await setQueue(driverId);
    return { success: true, ride: updatedRide };
  } catch (error) {
    logger.info(
      `[ride-cancel] [not-allowed] ride=${ride?._id} error=${error.message}`
    );
    return { success: false, ride, error };
  }
};

export const rideCompleteService = async (ride) => {
  try {
    if (!ride.isAllowedDropoff()) {
      logger.info(`[ride-complete] [not-allowed] ride=${ride?._id}`);
      throw new Error('Unable to complete ride');
    }
    const rideId = ride._id;
    const driverId = ride.driver;

    // Update Route
    await updateRouteRide(ride, 'dropoff');

    await Rides.updateRide(rideId, {
      dropoffTimestamp: Date.now(),
      status: 700
    });

    const {
      actionCount: stopsBeforeDropoff,
      stopCount: fixedStopsBeforeDropoff
    } = await stopsBeforeDropoffCount(rideId);
    const poolingTag = await poolingRideTag(rideId);

    const hailedRide = ride && !ride.rider;
    let hailedInfo = {};
    if (hailedRide) {
      const {
        currentLocation: { coordinates: driverCoordinates }
      } = await Drivers.findOne({ _id: driverId });
      const dropoffZone = await Zones.detectZone(ride.location, {
        longitude: driverCoordinates[0],
        latitude: driverCoordinates[1]
      });
      hailedInfo = {
        isDropoffFixedStop: false,
        hailedDropoffLatitude: driverCoordinates[1],
        hailedDropoffLongitude: driverCoordinates[0],
        dropoffZone: dropoffZone ? {
          id: dropoffZone._id,
          name: dropoffZone.name
        } : null
      };
    }

    const updatedRide = await Rides.updateRide(rideId, {
      stopsBeforeDropoff,
      fixedStopsBeforeDropoff,
      poolingTag,
      ...hailedInfo
    });

    const fullRideDetails = await Rides.findById(rideId)
      .populate('rider')
      .populate('driver')
      .populate('location')
      .populate('request')
      .populate({ path: 'pickupFixedStopId', model: 'FixedStops' })
      .populate({ path: 'dropoffFixedStopId', model: 'FixedStops' });

    websocket.emitWebsocketEventToRoom(
      rideId,
      'request-completed',
      dumpRideForDriver(fullRideDetails)
    );

    sendRideCompletedEmail(fullRideDetails);
    await setQueue(driverId);
    return { success: true, ride: updatedRide };
  } catch (error) {
    logger.error(`[ride-complete] [error] ride=${ride?._id}`);
    return { success: false, ride, error };
  }
};

export const driverArrivedService = async (ride) => {
  try {
    const driverArrivedTimestamp = Date.now();
    if (!ride.isAllowedDriverArrived()) {
      logger.info(`[driver-arrived] [not-allowed] ride=${ride?._id}`);
      throw new Error('Driver arrived is not allowed');
    }

    const filterOption = { status: { $in: PRE_ARRIVED_STATUS } };
    const updatedRide = await Rides.driverArrived(ride, driverArrivedTimestamp, filterOption);

    if (updatedRide) {
      const driverId = ride.driver;
      const driver = await Drivers.findOne({ _id: driverId });
      const riderLocale = await getLocaleFromUser('rider', updatedRide.rider);
      await sns.send(
        'RIDER',
        updatedRide.rider.toString(),
        new SnsMessage(
          'driverArrived',
          {
            driverDisplayName: driver.displayName
          },
          await buildTranslator(riderLocale)
        )
      );
    }

    return { success: true, ride: updatedRide };
  } catch (error) {
    logger.error(`[driver-arrived] [error] ride=${ride?._id}`);
    return { success: false, ride, error };
  }
};

export const ridePickUpService = async (ride) => {
  try {
    if (!ride.isAllowedPickup()) {
      logger.info(`[ride-pick-up] [not-allowed] ride=${ride?._id}`);
      throw new Error('Ride pick up is not allowed');
    }

    if (ACTIVE_STATUS.includes(ride.status)) {
      await captureRequestPayment(ride.request);
    }
    const rideId = ride._id;
    const driverId = ride.driver;

    const updateParams = {
      pickupTimestamp: Date.now(),
      status: RideStatus.RideInProgress
    };

    let etaMetrics = {};
    if (ride.poolingLocation) {
      etaMetrics = calcETAmetrics({ ...ride.toJSON(), ...updateParams });
    }

    // Update Route
    await updateRouteRide(ride, 'pickup');

    const updatedRide = await Rides.updateRide(
      rideId,
      { ...updateParams, ...etaMetrics },
      { status: { $in: PRE_PICKUP_STATUS } }
    );

    await setQueue(driverId);

    return { success: true, ride: updatedRide };
  } catch (error) {
    logger.error(`[driver-ride-pickup] [error] ride=${ride?._id}`);
    return { success: false, ride, error };
  }
};
export default {
  rideCancelService,
  rideCompleteService,
  driverArrivedService,
  ridePickUpService
};
