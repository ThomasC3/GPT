import {
  Drivers,
  Events,
  InspectionForms,
  InspectionResults,
  MatchingRules,
  Responses,
  Services,
  Vehicles,
  Zones
} from '../../../models';
import {
  ApplicationError,
  SessionExpiredError
} from '../../../errors';
import { errorCatchHandler, validator } from '../../../utils';
import {
  checkServiceAvailability,
  checkVehicleAvailability,
  validateAllowedToCheckInVehicle,
  checkMatchingRule
} from '../../../utils/check';
import {
  dumpDriverStatusVehicle, dumpInspectionFormForDriver,
  dumpServiceForDriver, dumpVehicleAttributes, dumpVehiclesForDriver,
  dumpMatchingRuleZonesForDriver
} from '../../../utils/dump';
import {
  deriveVehicleService, getAttributesFromInspection,
  getVehicleCapacity, validateVehicleInspectionResponses,
  addVehicleZonesMatchingRuleData
} from '../../../utils/vehicle';
import { getDriverLocation } from '../utils/location';
import { getUnavailabilityReasons } from '../utils/status';

const checkOutValidator = (req) => {
  const { rules, validate } = validator;
  const schemaObject = rules.object().keys({
    service: rules.string().required(),
    inspectionForm: {
      id: rules.string().required(),
      responses: rules.array().items(
        rules.object().keys({
          questionId: rules.string().required(),
          response: rules.string().required()
        })
      )
    }
  });
  return validate(schemaObject, req.body);
};

const checkInValidator = (req) => {
  const { rules, validate } = validator;
  const schemaObject = rules.object().keys({
    inspectionForm: {
      id: rules.string().required(),
      responses: rules.array().items(
        rules.object().keys({
          questionId: rules.string().required(),
          response: rules.string().required()
        })
      )
    }
  });
  return validate(schemaObject, req.body);
};

const getCheckOutForm = async (req, res) => {
  try {
    const {
      params: {
        id: vehicleId
      },
      user: {
        _id: driverId
      }
    } = req;

    const driver = await Drivers.getDriver({ _id: driverId });
    if (!driver.isOnline) {
      throw new SessionExpiredError('Unable to get check-out form.');
    }

    const vehicle = await checkVehicleAvailability(vehicleId);

    const inspectionFormId = vehicle.vehicleType.checkOutForm;
    const inspectionForm = await InspectionForms.getInspectionForm({ _id: inspectionFormId });

    Drivers.updateDriver(driverId, { status: 'Checking out a vehicle' });
    res.status(200).json({
      inspectionForm: dumpInspectionFormForDriver(inspectionForm)
    });
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

const getVehicles = async (req, res) => {
  try {
    const { location } = req.query;
    if (!location) throw new ApplicationError('Location is required', 400);
    const findQuery = {
      location,
      isDeleted: false,
      isReady: true,
      driverId: { $eq: null },
      matchingRule: { $in: ['shared', 'priority', 'exclusive', 'locked'] },
      sort: 'lastCheckIn',
      order: 1
    };

    const vehicles = await Vehicles.getVehicles(findQuery);
    const availableServices = await Services.getServices({ isDeleted: false });
    const availableZones = await Zones.getZones({ location });
    const availableMatchingRules = await MatchingRules.getMatchingRules({});
    const vehicleList = vehicles.items.reduce((result, vehicle_) => {
      try {
        checkMatchingRule(vehicle_, availableZones);
      } catch (error) {
        return result;
      }
      const vehicle = addVehicleZonesMatchingRuleData(
        vehicle_.toJSON(), availableZones, availableMatchingRules
      );
      const vehicleDump = {
        ...dumpVehiclesForDriver(vehicle),
        ...dumpVehicleAttributes(vehicle)
      };
      const services = deriveVehicleService(vehicleDump, availableServices);
      vehicleDump.services = services.map(service => dumpServiceForDriver(service));
      return result.concat(vehicleDump);
    }, []);
    res.status(200).json(vehicleList);
  } catch (error) {
    errorCatchHandler(res, error);
  }
};

const checkOut = async (req, res) => {
  try {
    await checkOutValidator(req);
    const {
      params: {
        id: vehicleId
      },
      body,
      user
    } = req;
    const {
      service,
      inspectionForm: {
        id: inspectionFormId,
        responses
      }
    } = body;
    const driverId = user._id;
    const driver = await Drivers.getDriver({ _id: driverId });
    if (!driver.isOnline) {
      throw new SessionExpiredError('Unable to check-out vehicle.');
    }

    const occupiedVehicle = await Vehicles.getVehicle({ driverId });
    const location = await getDriverLocation(driver);
    if (driver.vehicle || occupiedVehicle) {
      throw new ApplicationError('Already checked-out a vehicle', 400, 'driver.checkedOut');
    }

    const vehicle = await checkVehicleAvailability(vehicleId);
    const { adaCapacity, passengerCapacity } = getVehicleCapacity(vehicle);
    const selectedService = await checkServiceAvailability(service,
      { adaCapacity, passengerCapacity, isADAOnly: vehicle.isADAOnly });
    const validatedResponses = await validateVehicleInspectionResponses(responses);

    const inspectionForm = InspectionForms.getInspectionForm({ _id: inspectionFormId });

    if (!inspectionForm) {
      throw new ApplicationError('Unable to find specified inspection form', 404);
    }
    const inspectionResult = await InspectionResults.createDriverInspectionResult({
      inspectionFormId, vehicleId, userId: driverId, inspectionType: 'check-out'
    });


    const responseArray = validatedResponses.map(response => ({
      ...response,
      inspectionResultId: inspectionResult._id,
      vehicleId,
      driverId
    }));

    await Responses.createResponses(responseArray);
    const updatedDriver = await Drivers.updateDriver(
      driverId,
      {
        vehicle: {
          vehicleId,
          vehicleName: vehicle.name,
          licensePlate: vehicle.licensePlate,
          vehicleType: {
            id: vehicle.vehicleType._id,
            type: vehicle.vehicleType.type,
            profile: vehicle.vehicleType.profile,
            fallbackProfile: vehicle.vehicleType.fallbackProfile
          },
          publicId: vehicle.publicId,
          passengerCapacity,
          adaCapacity,
          service: {
            id: selectedService._id,
            key: selectedService.key,
            title: selectedService.title
          },
          jobs: vehicle.jobs,
          ...dumpMatchingRuleZonesForDriver(vehicle.matchingRuleInfo, vehicle.zones)
        },
        isAvailable: true,
        status: 'Available'
      },
    );

    const vehicleAttributes = getAttributesFromInspection(validatedResponses);

    await Vehicles.updateVehicle(vehicleId, {
      driverId,
      lastCheckOut: Date.now(),
      ...vehicleAttributes
    });

    const unavailabilityReasons = await getUnavailabilityReasons(location);

    await Events.createByDriver({
      driver,
      vehicle,
      eventType: 'CHECK-OUT',
      eventData: { service, responses: vehicleAttributes, location: updatedDriver.activeLocation },
      targetType: 'Vehicle'
    });

    await Events.createByDriver({
      driver,
      eventType: 'AVAILABLE',
      eventData: { service, location: updatedDriver.activeLocation },
      targetType: 'Driver'
    });

    const response = dumpDriverStatusVehicle(updatedDriver, vehicle, unavailabilityReasons);
    res.status(200).json(response);
  } catch (error) {
    errorCatchHandler(res, error);
  }
};

const getCheckInForm = async (req, res) => {
  try {
    const {
      user: {
        _id: driverId
      }
    } = req;

    const driver = await validateAllowedToCheckInVehicle(driverId);
    const vehicle = await Vehicles.getVehicle({ _id: driver.vehicle?.vehicleId });

    const inspectionFormId = vehicle.vehicleType.checkInForm;
    const inspectionForm = await InspectionForms.getInspectionForm({ _id: inspectionFormId });
    if (!inspectionForm) {
      throw new ApplicationError('Unable to fetch check-in inspection form', 404);
    }

    await Drivers.updateDriver(driver._id, { status: 'Checking in vehicle' });
    res.status(200).json({
      inspectionForm: dumpInspectionFormForDriver(inspectionForm)
    });
  } catch (err) {
    errorCatchHandler(res, err);
  }
};


const checkIn = async (req, res) => {
  try {
    await checkInValidator(req);
    const {
      user: {
        _id: driverId
      },
      body: {
        inspectionForm: {
          id: inspectionFormId,
          responses
        }
      }
    } = req;
    const driver = await validateAllowedToCheckInVehicle(driverId);
    const vehicleId = driver.vehicle?.vehicleId;
    const vehicle = await Vehicles.getVehicle(vehicleId);

    const validatedResponses = await validateVehicleInspectionResponses(responses);
    const inspectionForm = await InspectionForms.getInspectionForm({ _id: inspectionFormId });
    if (!inspectionForm) {
      throw new ApplicationError('Unable to fetch check-in inspection form', 404);
    }
    const inspectionResult = await InspectionResults.createDriverInspectionResult({
      inspectionFormId, vehicleId, userId: driverId, inspectionType: 'check-in'
    });

    const responseArray = validatedResponses.map(response => ({
      ...response,
      inspectionResultId: inspectionResult._id,
      vehicleId,
      driverId
    }));
    await Responses.createResponses(responseArray);

    const updatedDriver = await Drivers.updateDriver(driverId, {
      vehicle: null
    });

    const vehicleAttributes = getAttributesFromInspection(validatedResponses);
    await Vehicles.updateVehicle(vehicleId, {
      driverId: null,
      lastCheckIn: Date.now(),
      ...vehicleAttributes
    });
    await Events.createByDriver({
      driver,
      vehicle,
      eventType: 'CHECK-IN',
      eventData: {
        service: driver.vehicle.service.key,
        responses: vehicleAttributes,
        location: vehicle.location
      },
      targetType: 'Vehicle'
    });
    res.status(200).json({
      vehicle: updatedDriver.vehicle,
      isAvailable: updatedDriver.isAvailable
    });
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

export default {
  getCheckOutForm,
  getVehicles,
  checkOut,
  getCheckInForm,
  checkIn
};
