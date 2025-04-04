import moment from 'moment';
import {
  Events, Vehicles, Locations,
  Zones, MatchingRules,
  Drivers as Model
} from '../../../models';
import ride from './ride';
import settings from './settings';
import locations from './location';
import notifications from './notifications';
import tip from './tip';
import auth from './auth';
import report from './report';
import { SesMailer } from '../../../services';
import Auth from '../../../services/auth';
import vehicle from './vehicle';
import { generateNumber } from '../../../utils/crypto';
import { errorCatchHandler, validator } from '../../../utils';
import {
  EmailNotSentError,
  DriverNotFoundError,
  InvalidPinCodeNumber,
  ValidationError,
  ApplicationError,
  LocationNotFoundError,
  SessionExpiredError,
  ForbiddenError,
  ConflictError
} from '../../../errors';
import {
  dumpDriver,
  dumpDriverStatusVehicle,
  dumpDriverForDriver
} from '../../../utils/dump';
import { getDriverLocation } from '../utils/location';
import { getUnavailabilityReasons } from '../utils/status';
import { addVehicleZonesMatchingRuleData } from '../../../utils/vehicle';

const ping = (_req, res) => {
  res.send('OK');
};

const changePassword = async (req, res) => {
  const {
    body: {
      password
    }
  } = req;

  try {
    const { _id } = req.user;
    await Model.updateDriver(_id, { password, isTemporaryPassword: false });
    res.status(200).json({ message: 'Your password has been successfully updated.' });
  } catch (err) {
    errorCatchHandler(
      res, err,
      'We were unable to change your account password because (ex: Account is Facebook Login, Account is Google Login, etc)'
    );
  }
};

const getDriver = async (req, res) => {
  try {
    const { _id } = req.user;
    const driver = await Model.getDriver({ _id });
    if (!driver) {
      throw new DriverNotFoundError('We were unable to fetch your account information.');
    }

    res.status(200).json(dumpDriverForDriver(driver));
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

const getLoggedInDrivers = async (req, res) => {
  try {
    const {
      user: { _id }
    } = req;
    const driver = await Model.getDriver({ _id });
    if (!driver.activeLocation) {
      throw new ApplicationError('Active location not available', 400);
    }
    let drivers = await Model.getDrivers({
      isOnline: true,
      lastActiveLocation: driver.activeLocation
    });

    const availableZones = await Zones.getZones({ location: driver.activeLocation });
    const availableMatchingRules = await MatchingRules.getMatchingRules({});

    drivers = await Promise.all(
      drivers.items.map(async (item) => {
        let currentDriver = item;
        if (currentDriver.vehicle) {
          const driverVehicle = await Vehicles.findOne({
            _id: currentDriver.vehicle.vehicleId
          }).populate('vehicleType')
            .populate('matchingRuleInfo');
          const vehicleInfo = addVehicleZonesMatchingRuleData(
            driverVehicle.toJSON(), availableZones, availableMatchingRules
          );
          const { service } = currentDriver.vehicle;
          currentDriver = {
            ...currentDriver.toJSON(),
            vehicle: vehicleInfo,
            serviceKey: service?.key,
            serviceTitle: service?.title
          };
        }
        return dumpDriver(currentDriver);
      })
    );
    res.status(200).json(drivers);
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

const getLoggedOutDrivers = async (req, res) => {
  try {
    const {
      query,
      user: { _id }
    } = req;
    const filterParams = validator.validate(
      validator.rules.object().keys({
        skip: validator.rules.number().integer().min(0),
        limit: validator.rules.number().integer().min(1)
      }),
      query,
    );
    const driver = await Model.getDriver({ _id });
    if (!driver.activeLocation) {
      throw new ApplicationError('Active location not available', 400);
    }
    const lastTwoHours = moment().subtract(2, 'hours');
    filterParams.isOnline = false;
    filterParams.lastActiveLocation = driver.activeLocation;
    filterParams.loggedOutTimestamp = { $gte: lastTwoHours.toDate() };
    filterParams.sort = 'loggedOutTimestamp';
    filterParams.order = -1;
    const drivers = await Model.getDrivers(filterParams);

    drivers.items = drivers.items.map(item => dumpDriver({ ...item.toJSON(), vehicle: null }));
    res.status(200).json(drivers);
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

const updateDriver = async (req, res) => {
  const {
    body: driverData
  } = req;
  try {
    const { _id } = req.user;

    const driver = await Model.updateDriver(_id, driverData);

    res.status(200).json(driver.toJSON());
  } catch (err) {
    errorCatchHandler(res, err, 'We were unable to update your account information.');
  }
};

const setLocation = async (req, res) => {
  try {
    const {
      user: { _id },
      body: {
        activeLocation
      }
    } = req;

    let driver = await Model.getDriver({ _id });

    const location = await Locations.getLocation(activeLocation);
    if (!location) {
      throw new LocationNotFoundError();
    }

    if (driver.activeLocation) {
      throw new ConflictError('Already set location.', 'ConflictError.alreadySetLocation');
    }

    if (!driver.locations?.includes(location._id)) {
      throw new ForbiddenError('Cannot set location specified');
    }

    const activeLocationsFilter = { _id: { $in: driver.locations }, isActive: true, limit: 0 };
    const allowedLocations = await Locations.getLocations(activeLocationsFilter);
    if (!allowedLocations || allowedLocations.length === 0) {
      throw new LocationNotFoundError();
    }

    driver = await Model.updateDriver(driver._id, {
      activeLocation: location._id,
      lastActiveLocation: location._id
    });

    if (`${driver.activeLocation}` !== `${location._id}`) {
      throw new ApplicationError('We were unable to set locations at this time.');
    }

    await Events.createByDriver({
      driver,
      eventType: 'LOCATION SET',
      targetType: 'Driver',
      eventData: {
        location: driver.activeLocation
      }
    });

    res.status(200).json({
      code: 200,
      message: 'Successfully set location'
    });
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

const getStatus = async (req, res) => {
  try {
    const { _id } = req.user;
    const driver = await Model.getDriver({ _id });
    const location = await getDriverLocation(driver);

    let response = {};
    const unavailabilityReasons = await getUnavailabilityReasons(location);

    if (driver.vehicle?.vehicleId) {
      const checkedOutVehicle = await Vehicles.findOne({ _id: driver.vehicle.vehicleId })
        .populate('zones', 'name')
        .populate('matchingRuleInfo');
      response = dumpDriverStatusVehicle(driver, checkedOutVehicle, unavailabilityReasons);
    } else {
      response = dumpDriverStatusVehicle(driver, null, unavailabilityReasons);
    }

    res.status(200).json(response);
  } catch (err) {
    errorCatchHandler(res, err, 'We were unable to fetch your availability status at this time.');
  }
};

const updateStatus = async (req, res) => {
  const {
    user: { _id },
    body: {
      isAvailable,
      reason
    }
  } = req;

  try {
    const driver = await Model.getDriver({ _id });

    if (!driver.isOnline && isAvailable) {
      throw new SessionExpiredError('Unable to update availability.');
    }

    if (!driver.activeLocation && isAvailable) {
      throw new ApplicationError('Unable to update your availability because you have not set location', 400);
    }

    const location = await Locations.findOne({ _id: driver.activeLocation });

    if (!location && isAvailable) {
      throw new LocationNotFoundError('We were unable to fetch your location information.');
    }

    if (location?.fleetEnabled && isAvailable && !driver.vehicle?.vehicleId) {
      throw new ApplicationError('Unable to update your availability because you are not attached to a vehicle', 400);
    }

    const updatedDriver = await Model.updateDriver(_id, {
      isAvailable,
      status: isAvailable ? 'Available' : reason || 'Unavailable'
    });

    let response = {};
    const unavailabilityReasons = await getUnavailabilityReasons(location);

    if (updatedDriver.vehicle?.vehicleId) {
      const checkedOutVehicle = await Vehicles.findOne({ _id: updatedDriver.vehicle.vehicleId })
        .populate('zones', 'name')
        .populate('matchingRuleInfo');
      response = dumpDriverStatusVehicle(updatedDriver, checkedOutVehicle, unavailabilityReasons);
    } else {
      response = dumpDriverStatusVehicle(updatedDriver, null, unavailabilityReasons);
    }

    const eventData = {
      driver: updatedDriver,
      eventType: updatedDriver.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
      eventData: {
        reason: (updatedDriver.isAvailable ? null : reason || 'Unavailable'),
        location: driver.activeLocation
      },
      targetType: 'Driver'
    };
    if (driver.vehicle) { eventData.eventData.service = driver.vehicle.service.key; }
    await Events.createByDriver(eventData);

    res.status(200).json(response);
  } catch (error) {
    errorCatchHandler(res, error);
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const emailCode = generateNumber(1000, 9999);

  try {
    if (!email) {
      throw new EmailNotSentError(null, null, null, 406);
    }
    const driver = await Model.getDriver({ email });
    if (!driver) {
      throw new EmailNotSentError();
    }

    driver.set({ emailCode, isEmailVerified: false });
    await driver.save();

    const result = await SesMailer.send('forgotPassword', email, {
      subject: { role: 'Driver' },
      html: { pincode: emailCode }
    });

    if (!result) {
      throw new EmailNotSentError();
    }

    res.status(200).json({ email, message: 'Please check your email inbox for a PIN code to verify your account.' });
  } catch (err) {
    errorCatchHandler(res, err, 'We were unable to send a pincode to the email you provided.');
  }
};

const emailVerify = async (req, res) => {
  const { email, code } = req.body;
  try {
    const driver = await Model.getDriver({ email });
    if (!driver) {
      throw new ValidationError('The email you entered is invalid.');
    }
    if (parseInt(driver.emailCode, 10) !== parseInt(code, 10)) {
      throw new InvalidPinCodeNumber('The pincode you entered is invalid.');
    }
    driver.set({ emailCode: null, isEmailVerified: true });
    await driver.save();

    const user = Auth.getToken(driver);

    res.status(200).json({ email, code, accessToken: user.accessToken });
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

export default {
  ping,
  changePassword,
  getDriver,
  updateDriver,
  getStatus,
  updateStatus,
  ride,
  settings,
  locations,
  notifications,
  forgotPassword,
  emailVerify,
  auth,
  report,
  tip,
  vehicle,
  getLoggedInDrivers,
  getLoggedOutDrivers,
  setLocation
};
