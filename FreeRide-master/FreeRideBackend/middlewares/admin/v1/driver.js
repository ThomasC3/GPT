import moment from 'moment-timezone';
import {
  Drivers, Rides,
  Routes, Events,
  Vehicles, Locations
} from '../../../models';
import {
  ApplicationError,
  DriverNotFoundError
} from '../../../errors';
import { validator } from '../../../utils';
import { dumpDriverForAdmin } from '../../../utils/dump';
import { commonAttributeObj } from '../../../utils/transformations';
import { validateAllowedToCheckInVehicle, verifyEqualIdArray } from '../../../utils/check';
import { captureScopedException } from '../../../utils/sentry';
import { adminErrorCatchHandler } from '..';
import { fixRoute } from '../../../utils/ride';
import { getRideInfoFromStop } from '../../driver/utils/ride';
import { getDriverLocation } from '../../driver/utils/location';
import { s3 } from '../../../services';
import { aws as awsConfig } from '../../../config';
import { getAdminLocations } from '../utils/location';

const ALLOWED_ATTRIBUTES = [
  'dob',
  'email',
  'password',
  'firstName',
  'gender',
  'lastName',
  'displayName',
  'locations',
  'phone',
  // 'isOnline',
  'zip',
  // 'isTemporaryPassword',
  // 'emailCode',
  // 'isEmailVerified',
  // 'currentLocation',
  // 'socketIds',
  'isADA',
  'isBanned',
  'isDeleted',
  // 'driverRideList',
  // 'vehicle',
  'isAvailable',
  'status',
  // 'loggedOutTimestamp',
  'activeLocation',
  'lastActiveLocation',
  'employeeId'
];

const addDriver = async (req, res) => {
  const {
    body: driverFormData
  } = req;

  try {
    const driverData = commonAttributeObj(ALLOWED_ATTRIBUTES, driverFormData);
    const driver = await Drivers.getDriver({ email: driverData.email });

    if (driver) {
      throw new ApplicationError(`Driver with email ${driver.email} already exists`, 409);
    }

    const addedDriver = await Drivers.createDriver(driverData);

    res.status(200).json(addedDriver.toJSON());
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const buildRouteInfo = async (id) => {
  if (!id) {
    return {
      lastActionTimestamp: null,
      activeRidesCount: null,
      minutesSinceRouteStart: null,
      waitingStopsCount: null
    };
  }
  const driver = await Drivers.getDriver({ _id: id });
  const driverRides = await Rides.findActiveFor('driver', driver._id);
  const driverRidesCount = driverRides.length;
  const route = await Routes.findOne({ driver: id, active: true });

  const routeData = {
    lastActionTimestamp: null,
    activeRidesCount: driverRidesCount,
    minutesSinceRouteStart: null,
    waitingStopsCount: null
  };

  if (route) {
    let routeStart = null;
    if (route.firstRequestTimestamp) {
      routeStart = moment.utc(route.firstRequestTimestamp);
      const totalMinutes = moment.utc().diff(routeStart, 'minutes');
      let minutes = totalMinutes;

      const days = Math.floor(minutes / (24 * 60), -1);
      minutes -= days * (24 * 60);
      const hours = Math.floor(minutes / (60), -1);
      minutes -= hours * 60;

      routeData.minutesSinceRouteStart = `${days} days, ${hours} hours and ${minutes} minutes (${totalMinutes} m)`;
    }

    let stopsCount = 0;
    const routeRides = [];
    let lastActionTimestamp = null;
    if (route.stops.length) {
      let ridesFromStops = route.stops.map(stop => getRideInfoFromStop(stop));
      ridesFromStops = await Promise.all(ridesFromStops);

      ridesFromStops.forEach((rideAndStop) => {
        const { stop, ride } = rideAndStop;

        if (stop.status === 'waiting') { stopsCount += 1; }

        if (stop.ride && !(routeRides.includes(String(stop.ride)))) {
          if (ride.pickupTimestamp) {
            const pickupTimestamp = new Date(moment.utc(ride.pickupTimestamp * 1000).unix());
            const pickupIsAfterLastAction = pickupTimestamp > lastActionTimestamp;

            if (pickupIsAfterLastAction) {
              lastActionTimestamp = pickupTimestamp;
            }
          }
          if (ride.dropoffTimestamp && ride.dropoffTimestamp > lastActionTimestamp) {
            lastActionTimestamp = ride.dropoffTimestamp;
          }
          routeRides.push(String(stop.ride));
        }
      });
    }

    routeData.waitingStopsCount = stopsCount;
    if (lastActionTimestamp) {
      const options = { timeZone: 'America/New_York' };
      routeData.lastActionTimestamp = `${lastActionTimestamp.toLocaleString('en-US', options)} EST`;
    }
  }

  return routeData;
};

const getDriver = async (req, res) => {
  const {
    params: { id }
  } = req;

  try {
    const driver = await Drivers.getDriver({ _id: id });
    if (!driver) { throw new DriverNotFoundError(); }

    const routeData = await buildRouteInfo(driver._id);
    const ratingInfo = await Rides.buildRatingInfo('driver', driver._id);
    res.status(200).json({
      ...driver.toJSON(),
      ...routeData,
      ...ratingInfo,
      vehicle: driver.vehicle ? driver.vehicle : null
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getFixRoute = async (req, res) => {
  const {
    params: { id }
  } = req;
  try {
    await fixRoute(id);

    const routeData = await buildRouteInfo(id);

    res.status(200).json({ ...routeData });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getResetRoute = async (req, res) => {
  const {
    params: { id }
  } = req;
  try {
    const driver = await Drivers.getDriver({ _id: id });

    const params = { driver: id, active: true };
    const route = await Routes.lock(params);

    if (route) {
      await Routes.updateRoute(route._id, {
        active: false
      });
      await Routes.release({ _id: route._id });
    }

    const routeData = await buildRouteInfo(driver._id);
    res.status(200).json({ ...routeData });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteDriver = async (req, res) => {
  try {
    const {
      params: { id },
      user: admin
    } = req;

    const currentDriver = await Drivers.findOne({ _id: id });

    if (currentDriver.vehicle?.vehicleId) {
      throw new ApplicationError('Unable to delete driver because vehicle is attached', 400);
    }
    if (currentDriver.driverRideList?.length) {
      throw new ApplicationError('Unable to delete driver because driver has ongoing rides', 400);
    }

    const updatedDriver = {
      isDeleted: true,
      isOnline: false,
      isAvailable: false,
      activeLocation: null
    };

    const driver = await Drivers.updateDriver(id, updatedDriver);

    await Promise.all([
      Events.createByAdmin({
        admin,
        driver,
        eventType: 'LOGOUT',
        targetType: 'Driver',
        eventData: {
          location: currentDriver.activeLocation
        }
      }),
      Events.createByAdmin({
        admin,
        driver,
        eventType: 'DELETE',
        targetType: 'Driver'
      })
    ]);

    res.status(200).json(dumpDriverForAdmin(driver.toJSON()));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateDriver = async (req, res) => {
  try {
    const {
      params: { id },
      body: updatedDriverData,
      user: admin
    } = req;

    const updatedDriver = commonAttributeObj(ALLOWED_ATTRIBUTES, updatedDriverData);

    if (updatedDriver.email) {
      const existingDriver = await Drivers.findOne({
        _id: { $ne: id },
        email: updatedDriver.email
      });

      if (existingDriver) {
        throw new ApplicationError(`Driver with email ${updatedDriver.email} already exists`, 409);
      }
    }

    const currentDriver = await Drivers.findOne({ _id: id });

    if (updatedDriver.isAvailable === undefined) {
      delete updatedDriver.isAvailable;
    }
    if (updatedDriver.isOnline === undefined) {
      delete updatedDriver.isOnline;
    }

    const location = await getDriverLocation(currentDriver);

    const changingAvailability = Object.keys(updatedDriver).includes('isAvailable')
      && (currentDriver.isAvailable !== updatedDriver.isAvailable);

    if (changingAvailability) {
      if (
        changingAvailability && updatedDriver.isAvailable
        && location?.fleetEnabled && !currentDriver.vehicle?.vehicleId
      ) {
        throw new ApplicationError('Unable to update availability because no vehicle is attached', 400);
      }
    }

    if (changingAvailability) {
      if (
        (
          (Object.keys(updatedDriver).includes('isOnline') && !updatedDriver.isOnline)
          || (!Object.keys(updatedDriver).includes('isOnline') && !currentDriver.isOnline)
        )
        && updatedDriver.isAvailable
      ) {
        throw new ApplicationError('Unable to update availability because driver is logged out', 400);
      }
      updatedDriver.status = updatedDriver.isAvailable ? 'Available' : 'Unavailable';
    }

    const sameLocations = updateDriver.locations
      ? verifyEqualIdArray(currentDriver.locations, updateDriver.locations) : false;
    if (
      !sameLocations && currentDriver.activeLocation && updatedDriver.locations
      && !updatedDriver.locations?.includes(
        currentDriver.activeLocation.toHexString()
      )
    ) {
      if (currentDriver.isOnline) {
        throw new ApplicationError('Unable to update locations because driver is logged in', 400);
      } else if (updatedDriver.isOnline) {
        throw new ApplicationError('Unable to update locations because you are logging driver in', 400);
      } else {
        updatedDriver.activeLocation = null;
      }
    }

    const driver = await Drivers.updateDriver(id, updatedDriver);

    if (changingAvailability) {
      await Events.createByAdmin({
        admin,
        driver,
        eventType: updatedDriver.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
        targetType: 'Driver',
        eventData: {
          location: currentDriver.activeLocation
        }
      });
    }

    res.status(200).json(dumpDriverForAdmin(driver.toJSON()));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    const {
      image
    } = validator.validate(
      validator.rules.object().keys({
        image: validator.rules.string().required()
      }),
      req.body
    );

    const {
      id: driverId
    } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    let driver = await Drivers.findById(driverId);

    if (!driver) {
      throw new DriverNotFoundError(`Driver with id of ${driverId} not found`);
    }

    const submitTimestamp = new Date();
    const type = image.split(';')[0].split('/')[1];
    const fileName = `profile_${driver._id.toString()}_${+(submitTimestamp)}.${type}`;
    const bucketName = awsConfig.s3.images_bucket_name;

    const uploadedImage = await s3.uploadImage(image, type, fileName, bucketName);

    const profilePicture = {
      imageUrl: uploadedImage.Location
    };

    driver = await Drivers.updateDriver(driverId, { profilePicture });

    res.status(200).json({ profilePicture: driver.profilePicture });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const removeProfilePicture = async (req, res) => {
  try {
    const {
      id: driverId
    } = validator.validate(
      validator.rules.object().keys({
        id: validator.rules.string().required()
      }),
      req.params
    );

    let driver = await Drivers.findById(driverId);

    if (!driver) {
      throw new DriverNotFoundError(`Driver with id of ${driverId} not found`);
    }

    driver = await Drivers.updateDriver(driverId, { profilePicture: null });

    res.status(200).json({ profilePicture: driver.profilePicture });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getDrivers = async (req, res) => {
  try {
    const {
      user: admin
    } = req;

    const filterParams = validator.validate(
      validator.rules.object().keys({
        skip: validator.rules.number().integer().min(0),
        limit: validator.rules.number().integer().min(1),
        firstName: validator.rules.string().allow(''),
        lastName: validator.rules.string().allow(''),
        email: validator.rules.string().email().allow(''),
        isOnline: validator.rules.boolean().truthy(1).falsy(0).allow(''),
        isAvailable: validator.rules.boolean().truthy(1).falsy(0).allow(''),
        locations: validator.rules.array().items(validator.rules.string()),
        sort: validator.rules.string().valid('', 'firstName', 'lastName', 'email', 'loggedOutTimestamp'),
        order: validator.rules.string().allow('')
      }),
      req.query,
    );
    filterParams.isDeleted = false;

    const locations = await getAdminLocations(admin, filterParams.locations);
    if (locations.length === 0) {
      return res.status(200).json({ items: [], total: 0 });
    }

    filterParams.locations = locations.map(location => location._id);
    let timezone = null;

    if (filterParams.locations?.length > 0) {
      try {
        ({ timezone } = await Locations.findOne({ _id: filterParams.locations[0] }));
        filterParams.$or = [
          { lastActiveLocation: { $eq: null } },
          { lastActiveLocation: { $in: filterParams.locations } }
        ];
      } catch (error) {
        captureScopedException(
          error,
          {
            type: 'Scoped',
            info: filterParams.locations,
            tag: 'scoped',
            level: 'warning'
          }
        );
      }
    }

    const drivers = await Drivers.getDrivers(filterParams);

    drivers.items = await Promise.all(
      drivers.items.map(async driver => ({
        ...dumpDriverForAdmin(driver.toJSON(), timezone),
        ...(await buildRouteInfo(driver._id))
      }))
    );

    res.status(200).json(drivers);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const detachVehicle = async (req, res) => {
  try {
    const {
      params: { id: driverId },
      user: admin
    } = req;
    const driver = await validateAllowedToCheckInVehicle(driverId);
    const { vehicle } = driver;

    const updatedVehicle = await Vehicles.updateVehicle(driver.vehicle.vehicleId, {
      driverId: null,
      lastCheckIn: Date.now()
    });

    driver.vehicle = null;
    driver.save();

    await Events.createByAdmin({
      admin,
      vehicle: updatedVehicle,
      eventType: 'ADMIN CHECK-IN',
      targetType: 'Vehicle',
      eventData: {
        service: vehicle.service.key,
        driverId: driver._id,
        location: updatedVehicle.location
      }
    });
    res.status(200).json(dumpDriverForAdmin(driver.toJSON()));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  addDriver,
  getDriver,
  updateDriver,
  uploadProfilePicture,
  removeProfilePicture,
  getDrivers,
  getFixRoute,
  getResetRoute,
  detachVehicle,
  deleteDriver
};
