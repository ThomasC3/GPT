import moment from 'moment';
import { Rides, Routes, RideStatus } from '../models';
import sns from './sns';
import { SnsMessage } from './SnsMessage';
import { getLocaleFromUser, buildTranslator } from '../utils/translation';

const ACTIVE_NOT_EN_ROUTE = [
  RideStatus.RideInQueue,
  RideStatus.NextInQueue
];

const ACTIVE_STATUS = [
  ...ACTIVE_NOT_EN_ROUTE,
  RideStatus.DriverEnRoute,
  RideStatus.DriverArrived,
  RideStatus.RideInProgress
];

const moveRideToDriverEnRoute = async (rideObject, rideId = null) => {
  const ride = rideObject || await Rides.findOne({ _id: rideId });

  if (!ACTIVE_NOT_EN_ROUTE.includes(ride.status)) {
    return;
  }

  // Move ride to en route status
  await Rides.updateRide(
    ride._id,
    { status: RideStatus.DriverEnRoute },
    { status: { $in: ACTIVE_NOT_EN_ROUTE } }
  );
};

const moveRidesToNextInQueue = async ride => Rides.updateRide(
  ride._id,
  { status: RideStatus.NextInQueue }, // Update body
  { status: RideStatus.RideInQueue }, // Filter
);

const setQueue = async (driver) => {
  if (!driver) { return; }

  // Fetch driver's route
  const route = await Routes.findOne({ driver, active: true });
  const withPooling = !!route;

  const queueUpdates = [];

  if (!withPooling) {
    // Fetch driver's ongoing rides
    const activeRides = await Rides.find({
      request: { $exists: true },
      driver,
      status: { $in: ACTIVE_STATUS }
    })
      .populate('driver')
      .sort({ createdTimestamp: 1 });
    const [currentRide, nextRide] = activeRides;

    // Move current ride to Driver En Route
    if (currentRide && ACTIVE_NOT_EN_ROUTE.includes(currentRide.status)) {
      queueUpdates.push(moveRideToDriverEnRoute(currentRide));
    }
    if (nextRide) {
      const isFixedStop = !!nextRide.isPickupFixedStop || currentRide.isDropoffFixedStop;
      const sameFixedStop = (
        String(nextRide.pickupFixedStopId) === String(currentRide.dropoffFixedStopId)
      );
      // If next action is in same fixed-stop
      if (currentRide.status === 300 && isFixedStop && sameFixedStop) {
        // Move next ride to Driver En Route
        queueUpdates.push(moveRideToDriverEnRoute(nextRide));
      // If next action is dropoff of current ride before pickup of next
      } else if (
        currentRide.status === 300
        || (currentRide.status !== 300 && isFixedStop && sameFixedStop)
      ) {
        // Move next ride to Next In Queue
        queueUpdates.push(moveRidesToNextInQueue(nextRide));
      }
    }
  } else {
    const activeStops = route.stops.filter(stop => stop.status === 'waiting');
    let currentFixedStop = activeStops.length && activeStops[0].fixedStopId;
    let stopCount = 0;
    for (let i = 0; i < activeStops.length; i += 1) {
      const stop = activeStops[i];
      const differentFs = String(currentFixedStop) !== String(stop.fixedStopId);
      const isFixedStop = !!stop.fixedStopId;
      if (i > 0 && (differentFs || !isFixedStop)) {
        stopCount += 1;
        // More than 1 stop before pickup will not change status
        if (stopCount > 1) {
          break;
        }
      }
      if (stop.stopType === 'pickup') {
        if (stopCount === 0) {
          // If next action is to pickup ride or is in the same fixed-stop
          queueUpdates.push(moveRideToDriverEnRoute(null, stop.ride));
        } else {
          // If there is one stop before pickup of next ride
          queueUpdates.push(moveRidesToNextInQueue(stop.ride));
        }
      }
      currentFixedStop = stop.fixedStopId;
    }
  }
  await Promise.all(queueUpdates);
};

export default setQueue;
