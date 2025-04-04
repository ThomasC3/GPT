import { adminErrorCatchHandler } from '..';
import { VehicleTypes } from '../../../models';
import { validator } from '../../../utils';
import { validateVehicleTypesDelete } from '../../../utils/check';
import { dumpVehicleTypeForAdmin } from '../../../utils/dump';
import { commonAttributeObj } from '../../../utils/transformations';


const ALLOWED_ATTRIBUTES = [
  'type',
  'passengerCapacity',
  'adaCapacity',
  'checkInForm',
  'checkOutForm',
  'isDeleted'
];

const createVehicleTypeValidator = (req) => {
  const { rules, validate } = validator;
  const schemaObject = rules.object().keys({
    type: rules.string().required(),
    passengerCapacity: rules.number().integer().required(),
    adaCapacity: rules.number().integer(),
    checkInForm: rules.string().allow(null),
    checkOutForm: rules.string().allow(null)
  });
  return validate(schemaObject, req.body);
};


const updateVehicleTypeValidator = (req) => {
  const { rules, validate } = validator;
  const schemaObject = rules.object().keys({
    type: rules.string(),
    passengerCapacity: rules.number().integer(),
    adaCapacity: rules.number().integer(),
    checkInForm: rules.string().allow(null),
    checkOutForm: rules.string().allow(null)
  });
  return validate(schemaObject, req.body);
};

const createVehicleType = async (req, res) => {
  try {
    const vehicleTypeData = createVehicleTypeValidator(req);
    const result = await VehicleTypes.createVehicleType(vehicleTypeData);
    res.status(201).json(dumpVehicleTypeForAdmin(result));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getVehicleType = async (req, res) => {
  try {
    const { params: { id } } = req;
    const result = await VehicleTypes.getVehicleType({ _id: id });
    res.status(200).json(dumpVehicleTypeForAdmin(result));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getVehicleTypes = async (req, res) => {
  try {
    const { query } = req;
    query.isDeleted = false;
    const result = await VehicleTypes.getVehicleTypes(query);
    const vehicleTypes = result.map(item => dumpVehicleTypeForAdmin(item));
    res.status(200).json(vehicleTypes);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateVehicleType = async (req, res) => {
  try {
    const { params: { id } } = req;
    req.body = commonAttributeObj(ALLOWED_ATTRIBUTES, req.body);
    const vehicleTypeData = updateVehicleTypeValidator(req);
    const result = await VehicleTypes.updateVehicleType(id, vehicleTypeData);
    res.status(200).json(dumpVehicleTypeForAdmin(result));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteVehicleType = async (req, res) => {
  try {
    const { params: { id } } = req;
    await validateVehicleTypesDelete(id);
    const deletedVehicleType = await VehicleTypes.updateVehicleType(id, { isDeleted: true });
    res.status(200).json(dumpVehicleTypeForAdmin(deletedVehicleType));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  createVehicleType,
  getVehicleType,
  getVehicleTypes,
  updateVehicleType,
  deleteVehicleType
};
