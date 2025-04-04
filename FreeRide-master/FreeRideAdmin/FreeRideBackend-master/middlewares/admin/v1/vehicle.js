import { Types } from 'mongoose';
import { adminErrorCatchHandler } from '..';
import { ApplicationError } from '../../../errors';
import {
  AdminRoles, Vehicles, InspectionResults, Responses, Events, Zones
} from '../../../models';
import { validator } from '../../../utils';
import { validateVehicleUpdate, validateMatchingRule, checkMatchingRule } from '../../../utils/check';
import { dumpVehicleForAdmin, dumpVehiclesForAdmin } from '../../../utils/dump';
import {
  getAttributesFromInspection, validateVehicleInspectionResponses,
  handleVehicleUpdate
} from '../../../utils/vehicle';
import { commonAttributeObj } from '../../../utils/transformations';
import { locationValidator, getAdminLocations } from '../utils/location';
import { vehicleAttributeStats } from '../../../utils/events';

const ALLOWED_ATTRIBUTES = [
  'name',
  'vehicleType',
  'publicId',
  'licensePlate',
  'isADAOnly',
  'isReady',
  'passengerCapacity',
  'adaCapacity',
  'location',
  'isDeleted',
  'driverId',
  // 'lastCheckIn',
  // 'lastCheckOut',
  'battery',
  'mileage',
  'pluggedIn',
  // Custom attributes
  'setCustomADACapacity',
  'setCustomPassengerCapacity',
  'matchingRule',
  'zones',
  'jobs'
];

const createVehicleValidator = (req) => {
  const { rules, validate } = validator;
  const schemaObject = rules.object().keys({
    name: rules.string().required(),
    vehicleType: rules.string().required(),
    publicId: rules.string().required(),
    licensePlate: rules.string().allow(''),
    adaCapacity: rules.number().integer(),
    passengerCapacity: rules.number().integer(),
    isReady: rules.boolean(),
    isADAOnly: rules.boolean(),
    location: rules.string().required(),
    matchingRule: rules.string().allow(''),
    zones: rules.array().items(validator.rules.string()),
    jobs: rules.array().items(validator.rules.string())
  });
  return validate(schemaObject, req.body);
};

const updateVehicleValidator = (req) => {
  const { rules, validate } = validator;
  const schemaObject = rules.object().keys({
    name: rules.string(),
    vehicleType: rules.string(),
    publicId: rules.string(),
    licensePlate: rules.string().allow(''),
    setCustomADACapacity: rules.boolean(),
    setCustomPassengerCapacity: rules.boolean(),
    adaCapacity: rules.number().integer(),
    passengerCapacity: rules.number().integer(),
    isADAOnly: rules.boolean(),
    isReady: rules.boolean(),
    location: rules.string(),
    matchingRule: rules.string().allow(''),
    zones: rules.array().items(validator.rules.string()),
    jobs: rules.array().items(validator.rules.string())
  });
  return validate(schemaObject, req.body);
};

const getVehicleParamsValidator = req => validator.validate(
  validator.rules.object().keys({
    createdTimestamp: validator.rules.object().keys({
      start: validator.rules.string().allow(''),
      end: validator.rules.string().allow('')
    }),
    location: validator.rules.string()
  }),
  req.query
);

const listVehiclesParamsValidator = req => validator.validate(
  validator.rules.object().keys({
    // Vehicle info
    name: validator.rules.string().allow(''),
    publicId: validator.rules.string().allow(''),
    isReady: validator.rules.boolean().allow(''),
    available: validator.rules.boolean().allow(''),
    location: validator.rules.string().allow(''),
    vehicleType: validator.rules.string().allow(''),
    job: validator.rules.string().allow(''),
    // Matching info
    zone: validator.rules.string().allow(''),
    matchingRule: validator.rules.string().allow(''),
    // Sort and pagination
    order: validator.rules.number().integer().valid('', -1, 1),
    sort: validator.rules.string().valid('', 'name', 'publicId'),
    page: validator.rules.number().integer().min(1),
    limit: validator.rules.number().integer().min(1)
  }),
  req.query
);

const vehiclesDeleteRoles = [AdminRoles.Developer, AdminRoles.SuperAdmin, AdminRoles.Admin];
const vehiclesEditRoles = [
  ...vehiclesDeleteRoles,
  AdminRoles.DataAdmin,
  AdminRoles.RegionManager,
  AdminRoles.Manager
];

const createVehicle = async (req, res) => {
  try {
    const { user: admin } = req;
    const vehicleData = createVehicleValidator(req);
    await locationValidator(req.body.location, admin);

    if (vehicleData.matchingRule) {
      const locationZones = await Zones.getZones({ location: vehicleData.location });
      validateMatchingRule(vehicleData, locationZones);
    }

    const result = await Vehicles.createVehicle(vehicleData);
    res.status(201).json(dumpVehicleForAdmin(result));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getVehicles = async (req, res) => {
  try {
    const filterParams = listVehiclesParamsValidator(req);
    filterParams.isDeleted = false;
    if (filterParams.zone) {
      filterParams.zones = { $in: filterParams.zone };
      delete filterParams.zone;
    }
    if (filterParams.matchingRule === 'unset') {
      filterParams.matchingRule = { $in: ['', null] };
    }
    if (filterParams.job) {
      filterParams.jobs = filterParams.job;
      delete filterParams.job;
    }

    const locations = await getAdminLocations(req.user, filterParams.location ? [filterParams.location] : []);
    if (locations.length === 0) {
      return res.status(200).json({ items: [], total: 0, vehicleTypes: [] });
    }

    filterParams.location = { $in: locations.map(location => location._id) };

    const result = await Vehicles.getVehicles(filterParams);
    result.items = result.items.map(item => dumpVehiclesForAdmin(item));
    res.status(200).json(result);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getVehicle = async (req, res) => {
  try {
    const result = await Vehicles.getVehicle({ _id: req.params.id });
    if (!result) throw new ApplicationError('Unable to find vehicle', 404);
    res.status(200).json(dumpVehicleForAdmin(result));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateVehicle = async (req, res) => {
  try {
    const {
      params: {
        id: vehicleId
      },
      user: admin
    } = req;

    const originalVehicle = await validateVehicleUpdate(vehicleId);
    req.body = commonAttributeObj(ALLOWED_ATTRIBUTES, req.body);
    const updateData = updateVehicleValidator(req);
    await locationValidator(originalVehicle.location, admin);

    const locationZones = await Zones.getZones({ location: updateData.location });
    validateMatchingRule(updateData, locationZones);
    try {
      checkMatchingRule(updateData, locationZones);
    } catch (error) {
      updateData.isReady = false;
    }

    const updatedVehicle = await Vehicles.updateVehicle(vehicleId, updateData);
    if (!updatedVehicle) throw new ApplicationError('Unable to find vehicle', 404);

    await handleVehicleUpdate(originalVehicle, updatedVehicle);

    res.status(200).json(dumpVehicleForAdmin(updatedVehicle));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const { params: { id } } = req;
    await validateVehicleUpdate(id, 'DELETE');
    const deletedVehicle = await Vehicles.updateVehicle(id, { isDeleted: true });
    res.status(200).json(dumpVehicleForAdmin(deletedVehicle));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const vehicleInspection = async (req, res) => {
  try {
    const {
      user: { id: adminId },
      params: { id: vehicleId },
      body: { responses }
    } = req;

    const validatedResponses = await validateVehicleInspectionResponses(responses);
    const inspectionResult = await InspectionResults.createAdminInspectionResult({
      inspectionType: 'admin-check', userId: adminId, vehicleId
    });

    const responseArray = validatedResponses.map(response => ({
      ...response,
      inspectionResultId: inspectionResult._id,
      vehicleId,
      adminId
    }));
    await Responses.insertMany(responseArray);
    const vehicleAttributes = getAttributesFromInspection(validatedResponses);

    const updatedVehicle = await Vehicles.updateVehicle(vehicleId, vehicleAttributes);

    await Events.createByAdmin({
      admin: req.user,
      vehicle: updatedVehicle,
      eventType: 'ADMIN INSPECTION',
      eventData: { responses: vehicleAttributes, location: updatedVehicle.location },
      targetType: 'Vehicle'
    });

    res.status(200).json(dumpVehicleForAdmin(updatedVehicle));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getVehicleStats = async (req, res) => {
  try {
    const filterParams = getVehicleParamsValidator(req);

    const {
      params: {
        id: vehicleId
      }
    } = req;

    filterParams.targetId = vehicleId;
    filterParams.targetType = 'Vehicle';

    const [vehicleStats] = await vehicleAttributeStats(
      { ...filterParams, locations: [new Types.ObjectId(filterParams.location)] }
    );

    res.status(200).json({ vehicleStats });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  deleteVehicle,
  vehiclesEditRoles,
  vehiclesDeleteRoles,
  vehicleInspection,
  getVehicleStats
};
