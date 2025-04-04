import moment from 'moment-timezone';
import * as Sentry from '@sentry/node';
import {
  Routes, Rides, Locations, RideStatus, Drivers, PaymentPolicies, Zones
} from '../models';
import { getUpdatedRoute } from '../services/matching';
import { captureScopedException } from './sentry';
import logger from '../logger';
import { googleMaps, mongodb } from '../services';
import { dateDifference } from './time';
import { dumpRideForDriverRideList } from './dump';

const HTTP_OK = 200;

const PRE_PICKUP_STATUS = [
  RideStatus.RideInQueue,
  RideStatus.NextInQueue,
  RideStatus.DriverEnRoute,
  RideStatus.DriverArrived
];

const ACTIVE_STATUS = [
  ...PRE_PICKUP_STATUS,
  RideStatus.RideInProgress
];

const INACTIVE_RIDE_STATUS = [
  RideStatus.RequestCancelled,
  RideStatus.CancelledInQueue,
  RideStatus.CancelledEnRoute,
  RideStatus.CancelledNoShow,
  RideStatus.CancelledNotAble
];

export const isPoolingEnabled = async (ride) => {
  if (ride && ride.location) {
    const location = await Locations.findOne({ _id: ride.location });
    if (location) {
      return location.poolingEnabled;
    }
  }
  return false;
};

export const getActiveRideId = (stops) => {
  let activeRideId = null;
  stops.forEach((stop) => {
    if (!activeRideId && stop.status === 'waiting') {
      activeRideId = stop.ride;
    }
  });
  return activeRideId;
};

export const getDriverRequestedActiveRides = async driverId => Rides.find({
  driver: driverId,
  status: { $in: ACTIVE_STATUS },
  dropoffLatitude: { $ne: null } // Requested ride
}).sort([['createdTimestamp', 'asc']]);


export const updateRideEta = async (stops) => {
  const updates = {};
  let stop;
  for (let i = 0; i < stops.length; i += 1) {
    stop = stops[i];
    if (stop.status === 'waiting') {
      if (stop.stopType === 'pickup') {
        updates[stop.ride] = { ...updates[stop.ride], eta: stop.cost };
      } else if (stop.stopType === 'dropoff') {
        updates[stop.ride] = { ...updates[stop.ride], dropoffEta: stop.cost };
      }
    }
  }
  const promises = Object.entries(updates).map(([rideId, body]) => Rides.updateRide(rideId, body));
  return Promise.all(promises);
};

export const applyStopAction = (route, ride, eventType) => {
  // Update route stops status
  let routeChangedCheck = false;
  const newStops = route.stops.map((stop_) => {
    const stop = stop_;
    if (eventType === 'cancel' && (String(stop.ride) === String(ride._id))) {
      routeChangedCheck = routeChangedCheck || stop.status !== 'cancelled';
      stop.status = 'cancelled';
    } else if ((eventType === 'pickup') && (stop.stopType === 'pickup') && (String(stop.ride) === String(ride._id))) {
      routeChangedCheck = routeChangedCheck || stop.status !== 'done';
      stop.status = 'done';
    } else if ((eventType === 'dropoff') && (String(stop.ride) === String(ride._id))) {
      routeChangedCheck = routeChangedCheck || stop.status !== 'done';
      stop.status = 'done';
    }
    return stop;
  });

  const outOfSequence = routeChangedCheck && String(route.activeRideId) !== String(ride._id);
  return { newStops, routeChangedCheck, outOfSequence };
};

export const updateRouteOrClose = async (route_) => {
  const route = route_;
  // Update current active ride and update
  const activeRideId = getActiveRideId(route.stops);
  if (activeRideId) {
    route.activeRideId = activeRideId;
    return route.save();
  }
  // Close route if completed
  route.active = false;
  return route.save();
};

export const updateRouteRide = async (ride, eventType) => {
  const withPooling = ride.poolingLocation;
  // If ride initiated by rider (not driver), update route
  if (withPooling && ride.rider) {
    let route;
    try {
      route = await Routes.lock({ driver: ride.driver, active: true });
      if (route) {
        const { newStops, outOfSequence } = applyStopAction(route, ride, eventType);
        route.stops = newStops;
        // If this event is out of order from route
        // or there's been a cancellation, optimize remaining route
        if ((eventType === 'cancel' || outOfSequence) && getActiveRideId(route.stops)) {
          try {
            const stops = await getUpdatedRoute(route);
            if (stops?.length > 0) {
              route.stops = stops;
              route.lastUpdate = new Date();
              await updateRideEta(stops);
            }
          } catch (error) {
            logger.error(error);
            Sentry.captureException(error);
          }
        }
        await updateRouteOrClose(route);
        await Routes.release({ _id: route._id });
      }
    } catch (error) {
      if (route?._id) {
        await Routes.release({ _id: route._id });
      }
      logger.error(error);
      Sentry.captureException(error);
    }
  }
};

export const sleep = waitTimeInMs => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

export const getGoogleEta = async (origCoord, destCoord) => {
  try {
    // Coordinates should be in format [latitude, longitude]
    let eta = null;
    const googleMapsResult = await googleMaps.client.directions({
      origin: `${origCoord[0]},${origCoord[1]}`,
      destination: `${destCoord[0]},${destCoord[1]}`,
      units: 'imperial'
    }).asPromise();

    if (googleMapsResult.status === HTTP_OK && googleMapsResult.json
      && googleMapsResult.json.status === 'OK' && googleMapsResult.json.routes.length) {
      eta = googleMapsResult.json.routes[0].legs.reduce((
        sum, { duration = { value: 0 } }
      ) => sum + duration.value, 0);
      eta /= 60;
    } else {
      logger.info('GMaps ERROR: ZERO_RESULTS');
      return false;
    }
    return eta;
  } catch (error) {
    logger.error('GMaps ERROR: ', error);
    Sentry.captureException(error);
    return false;
  }
};

export const fixRoute = async (driverId) => {
  let route;
  const changeList = [];
  try {
    const params = { driver: driverId, active: true };
    route = await Routes.lock(params);

    const rideDict = {};
    if (route && route.stops.length) {
      // Fetch rides for stops with waiting status
      const waitingStops = route.stops.filter(stop => stop.status === 'waiting' && stop.ride);
      const uniqueRideIds = [...new Set(waitingStops.map(stop => stop.ride))];
      const rides = await Promise.all(uniqueRideIds.map(rideId => Rides.findOne({ _id: rideId })));

      // Build waiting stop unique ride dict
      rides.forEach((ride) => {
        rideDict[`${ride._id}`] = ride;
        return ride;
      });

      // Build change list for outdated stop statuses
      let ride;
      waitingStops.forEach((stop) => {
        ride = rideDict[stop.ride];
        if (ride && INACTIVE_RIDE_STATUS.includes(ride.status)) {
          changeList.push({ ride, change: 'cancel' });
        } else if (ride && stop.stopType === 'pickup' && ride.status >= RideStatus.RideInProgress) {
          changeList.push({ ride, change: 'pickup' });
        } else if (ride && stop.stopType === 'dropoff' && ride.status === RideStatus.RideComplete) {
          changeList.push({ ride, change: 'dropoff' });
        }
      });

      // Apply changes to stops
      let routeChanged = false;
      changeList.forEach((change) => {
        const {
          newStops, routeChangedCheck
        } = applyStopAction(route, change.ride, change.change);
        route.stops = newStops;
        routeChanged = routeChanged || routeChangedCheck;
      });

      // Update stops or close route for driver
      await updateRouteOrClose(route);
      await Routes.release({ _id: route._id });

      // Update driver rides
      const driverActiveRides = await Rides.find(
        { driver: driverId, status: { $in: ACTIVE_STATUS } }
      ).sort({ createdTimestamp: 1 });

      const formattedRides = driverActiveRides.map(dumpRideForDriverRideList);
      await Drivers.findOneAndUpdate(
        { _id: driverId },
        { $set: { driverRideList: formattedRides } }
      );

      if (routeChanged) {
        throw new Error('Inconsistent route');
      }
    }
  } catch (error) {
    if (route) {
      await Routes.release({ _id: route._id });
    }
    const routeInfo = JSON.stringify({
      route,
      missingEvents: changeList.map(change => ({ ride: change.ride._id, event: change.change }))
    });
    logger.info(error);
    logger.info(routeInfo);
    captureScopedException(
      error,
      {
        type: 'Scoped',
        info: routeInfo,
        tag: 'scoped',
        level: 'warning'
      }
    );
  }
};

export const fixAndUpdateEtas = async (driverId) => {
  await fixRoute(driverId);

  const params = { driver: driverId, active: true };
  const route = await Routes.lock(params);

  const minuteInSeconds = 60;
  const minutesToUpdateRoute = 2 * minuteInSeconds;

  if (route && (new Date() - route.lastUpdate) / 1000 >= minutesToUpdateRoute) {
    try {
      const stops = await getUpdatedRoute(route);
      if (stops) {
        route.stops = stops;
        route.lastUpdate = new Date();
        await updateRouteOrClose(route);
        await updateRideEta(stops);
      }
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
    }
  }
  if (route && route._id) {
    await Routes.release({ _id: route._id });
  }
};

export const poolingRideTag = async (rideId) => {
  const route = await Routes.findOne({
    stops: {
      $elemMatch: {
        ride: new mongodb.Types.ObjectId(rideId)
      }
    }
  });

  if (!route) { return false; }

  let passengersInCar = 0;
  let stop = {};
  let inRide = false;
  for (let i = 0; i < route.stops.length; i += 1) {
    stop = route.stops[i];
    if (stop.stopType === 'current_location') {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (String(stop.ride) !== String(rideId) && stop.status !== 'cancelled') {
      // Rider in car and there is a pickup
      if (inRide && stop.stopType === 'pickup') {
        return true;
      }
      // Rider not in car and there is a pickup
      if (stop.stopType === 'pickup') {
        passengersInCar += 1;
      // Rider not in car and there is a dropoff
      } else if (!inRide && stop.stopType === 'dropoff') {
        passengersInCar -= 1;
      }
    // The rider is picked up
    } else if (String(stop.ride) === String(rideId) && stop.stopType === 'pickup') {
      inRide = true;
    // The rider is droppped off
    } else if (String(stop.ride) === String(rideId) && stop.stopType === 'dropoff') {
      break;
    }
  }
  return passengersInCar > 0;
};

export const stopsBeforeDropoffCount = async (rideId) => {
  const route = await Routes.findOne({
    stops: {
      $elemMatch: {
        ride: new mongodb.Types.ObjectId(rideId)
      }
    }
  });

  // Non-pooling
  if (!route) {
    return { actionCount: 0, stopCount: 0 };
  }
  // Pooling
  const ride = await Rides.findOne({ _id: rideId });
  const onGoing = ACTIVE_STATUS.includes(ride.status);

  const filteredStops = route.stops.filter(stop => (
    stop.stopType !== 'current_location'
    && stop.status !== 'cancelled'
    && (onGoing ? stop.status === 'waiting' : stop.status === 'done')
  ));

  let isRide;
  let startCount = false;
  let currentFixedStop = null;
  let actionCount = 0;
  let stopCount = 0;
  let stop = {};
  for (let i = 0; i < filteredStops.length; i += 1) {
    stop = filteredStops[i];
    isRide = String(stop.ride) === String(rideId);
    if (startCount && !isRide) {
      actionCount += 1;
      const differentFs = String(currentFixedStop) !== String(stop.fixedStopId);
      const isFixedStop = !!stop.fixedStopId;
      if (differentFs || !isFixedStop) {
        stopCount += 1;
      }
    } else if (!startCount && isRide && stop.stopType === 'pickup') {
      startCount = true;
    } else if (startCount && isRide && stop.stopType === 'dropoff') {
      // Subtract 1 from stopCount if previous stop has same fixed-stop id as dropoff
      const dropoffIsFixedStop = !!stop.fixedStopId;
      const sameFs = i > 0 && String(stop.fixedStopId) === String(currentFixedStop);
      if (dropoffIsFixedStop && sameFs && stopCount > 0) {
        stopCount -= 1;
      }
      break;
    }
    currentFixedStop = stop.fixedStopId;
  }
  return { actionCount, stopCount };
};

export const stopsBeforePickupCount = async (rideId) => {
  const route = await Routes.findOne({
    stops: {
      $elemMatch: {
        ride: new mongodb.Types.ObjectId(rideId)
      }
    }
  });

  const ride = await Rides.findOne({ _id: rideId });
  const onGoing = PRE_PICKUP_STATUS.includes(ride.status);

  let filteredStops = [];
  // Non-pooling
  if (!route) {
    const activeRides = await Rides.findActiveFor('driver', ride.driver);
    // Filter hailed rides
    const sortedRides = activeRides.filter(r => r.request);
    filteredStops = sortedRides.map(stop => (
      PRE_PICKUP_STATUS.includes(stop.status) ? [
        {
          ride: stop._id, fixedStopId: stop.pickupFixedStopId, stopType: 'pickup', status: 'waiting'
        },
        {
          ride: stop._id, fixedStopId: stop.dropoffFixedStopId, stopType: 'dropoff', status: 'waiting'
        }
      ] : [
        {
          ride: stop._id, fixedStopId: stop.pickupFixedStopId, stopType: 'pickup', status: 'done'
        },
        {
          ride: stop._id, fixedStopId: stop.dropoffFixedStopId, stopType: 'dropoff', status: 'waiting'
        }
      ]
    )).flat()
      .filter(stop => (onGoing ? stop.status === 'waiting' : stop.status === 'done'));
  } else {
    // Pooling
    filteredStops = route.stops.filter(stop => (
      stop.stopType !== 'current_location'
      && stop.status !== 'cancelled'
      && (onGoing ? stop.status === 'waiting' : stop.status === 'done')
    ));
  }

  let isRide;
  let currentFixedStop = null;
  let actionCount = 0;
  let stopCount = 0;
  let stop = {};
  for (let i = 0; i < filteredStops.length; i += 1) {
    stop = filteredStops[i];
    isRide = String(stop.ride) === String(rideId);
    if (!isRide) {
      actionCount += 1;
      const differentFs = String(currentFixedStop) !== String(stop.fixedStopId);
      const isFixedStop = !!stop.fixedStopId;
      if (differentFs || !isFixedStop) {
        stopCount += 1;
      }
    } else if (isRide && stop.stopType === 'pickup') {
      const pickupIsFixedStop = !!stop.fixedStopId;
      const sameFs = i > 0 && String(stop.fixedStopId) === String(currentFixedStop);
      if (pickupIsFixedStop && sameFs && stopCount > 0) {
        stopCount -= 1;
      }
      break;
    }
    currentFixedStop = stop.fixedStopId;
  }
  return { actionCount, stopCount };
};

export const paymentTotalCount = (items, status, key = 'totalPrice') => items.reduce((sum, item) => sum + (
  (
      item.request?.paymentInformation
      && item.request.paymentInformation.status === status
      && item.request.paymentInformation[key]
  )
    ? parseFloat(item.request.paymentInformation[key]) : 0.0
), 0.0);


export const tipTotalCount = (items, key = 'total') => items.reduce((sum, item) => (
  sum + parseFloat(
    (item.tips?.length > 0 && item.tips[0][key]) || 0.0
  )
), 0.0);


export const ridesFromFixedStop = async (driverId, fixedStopId) => {
  const route = await Routes.findOne({ driver: driverId, active: true });
  // Pooling
  if (route) {
    const fsStartIndex = route.stops.findIndex(
      item => String(item.fixedStopId) === String(fixedStopId)
      && item.status === 'waiting'
    );
    if (fsStartIndex !== 0 && !fsStartIndex) {
      return [];
    }
    let fsStopIndex = route.stops.findIndex(
      (item, index) => (
        // next action not fixed-stop
        index > fsStartIndex
        && !item.fixedStopId
      ) || (
        // or different fixed-stop
        index > fsStartIndex
        && String(item.fixedStopId) !== String(fixedStopId)
        && item.status === 'waiting'
      )
    );

    if (fsStopIndex === -1) {
      fsStopIndex = route.stops.length;
    }

    const ridesInFixedStop = route.stops.slice(
      fsStartIndex, fsStopIndex
    ).map(item => Rides.findById(item.ride));

    return Promise.all(ridesInFixedStop);
  }

  // Non-pooling
  const activeRides = await Rides.findActiveFor('driver', driverId);

  if (activeRides[0]) {
    const activeRideHasFs = (activeRides[0].pickupFixedStopId || activeRides[0].dropoffFixedStopId);
    if (activeRideHasFs) {
      return [activeRides[0]];
    }
  }
  return [];
};

export const getFixedStopNameFromStop = (stop, ride) => ride[`${stop.stopType}FixedStopId`]?.name;
export const getFixedStopIdFromRide = (ride) => {
  if (ride?.status === RideStatus.RideInProgress) {
    return ride.dropoffFixedStopId?._id;
  }

  if (ride?.status && ACTIVE_STATUS.includes(ride?.status)) {
    return ride.pickupFixedStopId?._id;
  }

  return null;
};

export const getActiveFixedStop = async (driverId) => {
  const route = await Routes.findOne({ driver: driverId, active: true });
  if (!route) {
    const activeRides = await Rides.find(
      { driver: driverId, status: { $in: ACTIVE_STATUS } }
    ).sort({ createdTimestamp: 1 });
    return getFixedStopIdFromRide(activeRides[0]);
  }
  const stop = route.stops.find(
    item => item.status === 'waiting'
  );
  return stop?.fixedStopId;
};

export const getDriverArrivedTimestampFromFs = async (ride) => {
  const activeFixedStop = await getActiveFixedStop(ride.driver);
  if (`${activeFixedStop}` === `${ride.pickupFixedStopId}`) {
    const ridesInFs = await ridesFromFixedStop(ride.driver, ride.pickupFixedStopId);
    const { driverArrivedTimestamp } = ridesInFs.find(
      item => item.driverArrivedTimestamp
    ) || { driverArrivedTimestamp: null };
    return driverArrivedTimestamp;
  }
  return null;
};

export const checkDriverNearPickup = async (driverId, ride, rangeInMeters) => {
  const { pickupLongitude, pickupLatitude } = ride;

  const [driverIsNear] = await Drivers
    .aggregate([{
      $geoNear: {
        near: { type: 'Point', coordinates: [pickupLongitude, pickupLatitude] },
        spherical: true,
        maxDistance: rangeInMeters,
        distanceField: 'distanceFromCurrentLocation',
        query: { _id: { $eq: new mongodb.Types.ObjectId(driverId) } }
      }
    }]);
  return !!driverIsNear;
};

export const getNonPoolingEtas = async (ride, activeRides) => {
  if (!activeRides.length) { return {}; }

  // Driver queue
  const [nextRide] = activeRides;
  const nextRideIsInProgress = nextRide?.status === RideStatus.RideInProgress;
  const rideIsNext = String(nextRide?._id) === String(ride._id);

  // Coordinates
  const driverCoord = [...ride.driver.currentLocation.coordinates].reverse();
  const ridePickup = [ride.pickupLatitude, ride.pickupLongitude];
  const rideDropoff = [ride.dropoffLatitude, ride.dropoffLongitude];
  const nextRidePickup = [nextRide?.pickupLatitude, nextRide?.pickupLongitude];
  const nextRideDropoff = [nextRide?.dropoffLatitude, nextRide?.dropoffLongitude];

  const rideUpdate = {};
  const nextRideUpdate = { _id: nextRide?._id };

  let timestamp = null;
  let minutes = 0;
  let partialMinutes = null;

  // If ride is next on queue
  if (rideIsNext) {
    // From driver to pickup of ride
    partialMinutes = await getGoogleEta(driverCoord, ridePickup);
    if (!Number.isNaN(partialMinutes)) {
      minutes += partialMinutes;
      timestamp = moment.utc().add(minutes, 'minutes') / 1000;
    }
  // If ride is second on queue
  } else {
    if (nextRideIsInProgress) {
      // From driver to dropoff of first rider in queue
      partialMinutes = await getGoogleEta(driverCoord, nextRideDropoff);
      if (!Number.isNaN(partialMinutes)) {
        minutes += partialMinutes;
        nextRideUpdate.dropoffEta = moment.utc().add(minutes, 'minutes') / 1000;
      }
    } else {
      // From driver to pickup of first rider in queue
      partialMinutes = await getGoogleEta(driverCoord, nextRidePickup);
      if (!Number.isNaN(partialMinutes)) {
        minutes += partialMinutes;
        timestamp = moment.utc().add(minutes, 'minutes') / 1000;
        nextRideUpdate.eta = timestamp;
      }

      // From pickup to dropoff of first rider in queue
      partialMinutes = await getGoogleEta(nextRidePickup, nextRideDropoff);
      if (!Number.isNaN(partialMinutes)) {
        minutes += partialMinutes;
        nextRideUpdate.dropoffEta = moment.utc().add(minutes, 'minutes') / 1000;
      }
    }
    // From dropoff to pickup of second rider in queue
    partialMinutes = await getGoogleEta(nextRideDropoff, ridePickup);
    if (!Number.isNaN(partialMinutes)) {
      minutes += partialMinutes;
      timestamp = moment.utc().add(minutes, 'minutes') / 1000;
    }
  }

  // Get ETA for this ride
  if (timestamp) {
    rideUpdate.eta = timestamp;
  }

  // Get initialETA for this ride
  if (!ride.initialEta && timestamp) {
    rideUpdate.initialEta = rideUpdate.eta;
  }

  // Get dropoff eta for this ride
  const rideEtaMin = await getGoogleEta(ridePickup, rideDropoff);
  if (!Number.isNaN(rideEtaMin)) {
    rideUpdate.dropoffEta = moment.utc().add(minutes + rideEtaMin, 'minutes') / 1000;
  }
  return {
    rideUpdate, nextRideUpdate, timestamp, minutes
  };
};

export const setNonPoolingEtas = async (rideId) => {
  const ride = await Rides.findById(rideId).populate('driver');
  const activeRides = await getDriverRequestedActiveRides(ride.driver._id);

  const {
    rideUpdate, nextRideUpdate, timestamp, minutes
  } = await getNonPoolingEtas(ride, activeRides);

  // Update if ETAs available
  if (Object.keys(rideUpdate).filter(k => k !== '_id').length > 0) {
    await Rides.updateRide(rideId, rideUpdate);
  }
  if (nextRideUpdate?._id && Object.keys(nextRideUpdate).filter(k => k !== '_id').length > 0) {
    await Rides.updateRide(nextRideUpdate._id, nextRideUpdate);
  }
  return { timestamp, minutes };
};

export const setNonPoolingEtasWithNewRide = async (rideData, driver) => {
  const newRide = { ...rideData, driver };
  const activeRides = await getDriverRequestedActiveRides(driver._id);

  const {
    rideUpdate, nextRideUpdate
  } = await getNonPoolingEtas(newRide, [...activeRides, newRide]);

  // Update if ETAs available
  if (nextRideUpdate?._id && Object.keys(nextRideUpdate).filter(k => k !== '_id').length > 0) {
    await Rides.updateRide(nextRideUpdate._id, nextRideUpdate);
  }
  return rideUpdate;
};

export const actionRideCount = (driverInfo) => {
  let actionCount = 0;
  let rideCount = 0;
  if (driverInfo.driverRideList) {
    const pickupActionCount = driverInfo.driverRideList.filter(
      ride => PRE_PICKUP_STATUS.includes(ride.rideId.status)
    ).length;
    const dropoffActionCount = driverInfo.driverRideList.filter(
      ride => ACTIVE_STATUS.includes(ride.rideId.status)
    ).length;
    rideCount = dropoffActionCount;
    actionCount = pickupActionCount + dropoffActionCount;
  }
  return { ...driverInfo.toJSON(), rideCount, actionCount };
};

export const getRidePolylines = async (ride) => {
  let polylines = [];

  if ([RideStatus.DriverEnRoute, RideStatus.DriverArrived].includes(ride.status)) {
    polylines.push(
      googleMaps.client.directions({
        origin: `${ride.driver.currentLocation.coordinates[1]},${ride.driver.currentLocation.coordinates[0]}`,
        destination: `${ride.pickupLatitude},${ride.pickupLongitude}`,
        units: 'imperial'
      }).asPromise(),
    );
  } else {
    polylines.push(Promise.resolve(null));
  }


  if (ride.pickupLatitude) {
    polylines.push(
      googleMaps.client.directions({
        origin: `${ride.pickupLatitude},${ride.pickupLongitude}`,
        destination: `${ride.dropoffLatitude},${ride.dropoffLongitude}`,
        units: 'imperial'
      }).asPromise(),
    );
  }

  polylines = await Promise.all(polylines);

  polylines = polylines.map((googleMapsResult) => {
    if (googleMapsResult && googleMapsResult.status === HTTP_OK && googleMapsResult.json
      && googleMapsResult.json.status === 'OK' && googleMapsResult.json.routes.length) {
      return googleMapsResult.json.routes[0].overview_polyline.points;
    }
    return null;
  });

  polylines = {
    driverEnRoute: polylines[0],
    destinationRoute: polylines[1]
  };

  return polylines;
};

export const calcETAmetrics = ride => ({
  etaDifference: dateDifference(
    moment.unix(ride.pickupTimestamp / 1000), moment.unix(ride.initialEta), 'minutes'
  ),
  etaMinutes: dateDifference(
    ride.createdTimestamp, moment.unix(ride.initialEta), 'minutes'
  )
});

const getPaymentSource = (policy, originZone, destinationZone, location) => {
  if (policy.value === 'origin') {
    return originZone.isDefault ? location : originZone;
  }
  if (policy.value === 'destination') {
    return destinationZone.isDefault ? location : destinationZone;
  }
  Sentry.captureException(new Error(`Invalid payment policy value: ${policy.value}`));
  return location;
};

/**
 * This function retrieves the payment policy based on the request information provided.
 * @param {Object} requestInfo - Request information containing locationId,
 * origin and destination coordinates.
 * @returns {Promise<Object>} - Returns payment policy information on either the location,
 * originZone, or destinationZone.
 */
export const determinePaymentSourceForRideRequest = async (requestInfo) => {
  const { locationId, origin, destination } = requestInfo;

  const location = await Locations.getLocation({ _id: locationId });
  if (!location) {
    throw new Error('Invalid location');
  }

  const originZone = await Zones.detectZone(locationId, origin);
  const destinationZone = await Zones.detectZone(locationId, destination);


  if (!originZone || !destinationZone) {
    return location;
  }

  const policy = await PaymentPolicies.getPaymentPolicy({ originZone, destinationZone });

  if (!policy) {
    return location;
  }

  return getPaymentSource(policy, originZone, destinationZone, location);
};

export default {
  getActiveRideId,
  updateRouteRide,
  updateRideEta,
  sleep,
  isPoolingEnabled,
  getGoogleEta,
  fixRoute,
  fixAndUpdateEtas,
  poolingRideTag,
  stopsBeforeDropoffCount,
  stopsBeforePickupCount,
  paymentTotalCount,
  ridesFromFixedStop,
  getFixedStopNameFromStop,
  getActiveFixedStop,
  getDriverArrivedTimestampFromFs,
  tipTotalCount,
  checkDriverNearPickup,
  getNonPoolingEtas,
  setNonPoolingEtas,
  setNonPoolingEtasWithNewRide,
  getRidePolylines,
  calcETAmetrics,
  determinePaymentSourceForRideRequest,
  getDriverRequestedActiveRides
};
