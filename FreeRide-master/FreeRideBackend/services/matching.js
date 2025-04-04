import * as Sentry from '@sentry/node';
import {
  Drivers, Locations, Rides,
  Requests, RequestStatus, RideStatus
} from '../models';
import { googleMaps, lambda, queue as setQueue } from '.';
import logger from '../logger';

export const findDriverPooling = async (rideRequest) => {
  try {
    let result = await lambda.getBestDriver(rideRequest._id);

    if (result?.body) {
      result = JSON.parse(result.body);
    } else {
      return false;
    }
    const {
      driver: _id,
      plan: stops,
      profile: vehicleProfile
    } = result;

    const driver = await Drivers.getDriver({ _id });

    return { driver, stops, vehicleProfile };
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  return false;
};

export const getUpdatedRoute = async (route) => {
  try {
    const driverId = route.driver;
    const routeStops = route.stops;
    let result = await lambda.getRouteUpdate(driverId, routeStops);
    if (result?.body) {
      result = JSON.parse(result.body);
    } else {
      return false;
    }
    return result.plan;
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  return false;
};

export const vehicleCallOrder = (driverList, rideRequest) => {
  const {
    pickupZone: { id: originZone },
    dropoffZone: { id: destinationZone }
  } = rideRequest;
  const buckets = [[], [], [], [], []];

  for (let i = 0; i < driverList.length; i += 1) {
    const driver = driverList[i];
    const matchingRule = driver.vehicle.matchingRule.key;
    const zones = driver.vehicle.zones.map(zone => `${zone.id}`);
    switch (matchingRule) {
    case 'locked':
      if (zones.includes(`${originZone}`) && zones.includes(`${destinationZone}`)) {
        // Locked
        buckets[0].push(driver);
      }
      break;
    case 'exclusive':
    case 'priority':
      if (zones.includes(`${originZone}`)) {
        // Priority or Exclusive with origin
        buckets[1].push(driver);
        break;
      }
      if (zones.includes(`${destinationZone}`)) {
        // Priority or Exclusive with destination
        buckets[2].push(driver);
        break;
      }
      if (matchingRule === 'priority') {
        // Priority with neither origin nor destination
        buckets[4].push(driver);
      }
      break;
    case 'shared':
      // Shared
      buckets[3].push(driver);
      break;
    default:
      break;
    }
  }

  return buckets;
};

export const findDriver = async (rideRequest) => {
  try {
    let requestedPassengers = rideRequest.passengers;
    let requestedADAPassengers = 0;
    let services;
    const location = await Locations.getLocation(rideRequest.location);
    const { fleetEnabled } = location;

    const MAX_RIDES = 2;

    // if the requested ride is ADA but the location is not ADA return
    if (rideRequest.isADA && !location.isADA) return;

    const match1 = {
      isAvailable: true,
      activeLocation: rideRequest.location
    };

    if (rideRequest.isADA) {
      // if request is ADA only look for drivers that accept ADA passengers
      services = ['mixed_service', 'ada_only'];

      // # of passengers - 1
      requestedPassengers -= 1;
      requestedADAPassengers = 1;
    } else {
      services = ['mixed_service', 'passenger_only'];
    }

    let paxCapacity;
    let paxADACapacity;
    if (fleetEnabled) {
      match1['vehicle.service.key'] = { $in: services };
      paxCapacity = '$vehicle.passengerCapacity';
      paxADACapacity = '$vehicle.adaCapacity';
    } else {
      match1.isADA = !!rideRequest.isADA;
      paxCapacity = rideRequest.isADA ? 3 : 5;
      paxADACapacity = rideRequest.isADA ? 1 : 0;
    }

    // Step 1: Check online drivers that are in the location
    const driverList = await Drivers.aggregate([
      {
        $geoNear: {
          query: match1,
          near: {
            type: 'Point',
            coordinates: [rideRequest.pickupLongitude, rideRequest.pickupLatitude]
          },
          distanceField: 'dist.calculated'
        }
      },
      {
        $sort: { 'dist.calculated': 1 }
      },
      {
        $addFields: {
          activeRidesCount: { $size: { $ifNull: ['$driverRideList', []] } }
        }
      },
      {
        $match: {
          $and: [
            { activeRidesCount: { $lt: MAX_RIDES } },
            { $expr: { $cond: [{ $lte: [requestedPassengers, paxCapacity] }, true, false] } },
            // eslint-disable-next-line max-len
            { $expr: { $cond: [{ $lte: [requestedADAPassengers, paxADACapacity] }, true, false] } }
          ]
        }
      },
      {
        $addFields: {
          lastDropoffLocation: [
            { $arrayElemAt: ['$driverRideList.dropoffLatitude', 0] },
            { $arrayElemAt: ['$driverRideList.dropoffLongitude', 0] }
          ]
        }
      }
    ]);

    let drivers = driverList;
    if (fleetEnabled) {
      const buckets = vehicleCallOrder(driverList, rideRequest);
      const candidateDrivers = buckets.find(bucket => bucket.length > 0) || [];
      drivers = candidateDrivers.length > 0 ? candidateDrivers.slice(0, 10) : [];
    }

    // Step 3: Sort by Distance
    const pickupDistancePromises = drivers.map((driver) => {
      let lastDropoffLocation;
      if (driver.lastDropoffLocation
      && driver.lastDropoffLocation[0]
      && driver.lastDropoffLocation[1]) {
        // eslint-disable-next-line prefer-destructuring
        lastDropoffLocation = driver.lastDropoffLocation;
      } else {
        lastDropoffLocation = false;
      }

      const isMultipleCurrentRiders = driver.activeRidesCount > 0;

      let driverLocation;
      if (lastDropoffLocation && isMultipleCurrentRiders) {
        driverLocation = `${lastDropoffLocation[0]},${lastDropoffLocation[1]}`;
      } else {
        driverLocation = `${driver.currentLocation.coordinates[1]},${driver.currentLocation.coordinates[0]}`;
      }

      return googleMaps.calculateDistance(
        driverLocation,
        `${rideRequest.pickupLatitude},${rideRequest.pickupLongitude}`,
      ).then(res => ({ // DURATION CAN be found here res.json.rows[0].elements[0].duration.value
        driverId: driver._id.toString(),
        searchRadius: isMultipleCurrentRiders ? 0.1 : 1,
        pickupDistance: res
          ? res.json.rows[0].elements[0].distance.value
          : false
      }));
    });


    const pickupDistances = await Promise.all(pickupDistancePromises);

    // Step 4: Sort by drivers with closest pickupDistance
    const nearestFilteredDriver = pickupDistances
      .filter(driverDistance => driverDistance.pickupDistance
      && driverDistance.pickupDistance <= driverDistance.searchRadius)
      .reduce(
        (driverA, driverB) => (driverA.pickupDistance < driverB.pickupDistance ? driverA : driverB),
        false,
      );

    if (nearestFilteredDriver) {
      // eslint-disable-next-line
      return drivers.find(driver => driver._id.toString() === nearestFilteredDriver.driverId);
    }

    if (drivers.length > 0) {
      const nearestDriver = pickupDistances
        .reduce(
          (driverA, driverB) => (
            driverA.pickupDistance < driverB.pickupDistance ? driverA : driverB
          ),
        );
      // eslint-disable-next-line
      return drivers.find(driver => driver._id.toString() === nearestDriver.driverId);
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
};

export const createRideForMatch = async (ride, driver) => {
  let profile = '';
  if (Object.keys(ride).includes('vehicleProfile')) {
    profile = ride.vehicleProfile;
    delete ride.vehicleProfile;
  }
  const createdRide = await Rides.createRide({
    status: RideStatus.RideInQueue,
    ...ride,
    // Driver info
    driver: driver._id,
    driverFirstName: driver.firstName,
    driverLastName: driver.lastName,
    driverDisplayName: driver.displayName,
    driverProfilePicture: driver.profilePicture?.imageUrl,
    driverInitialLatitude: driver.currentLatitude,
    driverInitialLongitude: driver.currentLongitude,
    vehicle: driver.vehicle ? {
      service: driver.vehicle?.service,
      matchingRule: driver.vehicle?.matchingRule,
      zones: driver.vehicle?.zones || [],
      vehicleId: driver.vehicle?.vehicleId,
      vehicleName: driver.vehicle?.vehicleName,
      publicId: driver.vehicle?.publicId,
      licensePlate: driver.vehicle?.licensePlate,
      jobs: driver.vehicle?.jobs,
      vehicleType: {
        id: driver.vehicle?.vehicleType?.id,
        type: driver.vehicle?.vehicleType?.type,
        profile: driver.vehicle?.vehicleType?.profile,
        fallbackProfile: driver.vehicle?.vehicleType?.fallbackProfile
      },
      profile
    } : null
  });

  const requestedRide = !!ride.request;
  if (requestedRide) {
    await Requests.updateRequest(
      { _id: ride.request },
      { $set: { status: RequestStatus.RequestAccepted, processing: false } }
    );
    await setQueue(driver._id);
  }

  const updatedRide = await Rides.findById(createdRide._id);

  return updatedRide;
};

export default {
  findDriverPooling,
  getUpdatedRoute,
  findDriver,
  createRideForMatch
};
