import {
  Locations, FixedStops
} from '../../../models';
import { dumpAdminFixedStop } from '../../../utils/dump';
import { validator } from '../../../utils';
import { adminErrorCatchHandler } from '..';
import {
  ApplicationError, FixedStopNotFoundError
} from '../../../errors';
import { commonAttributeObj } from '../../../utils/transformations';
import { locationValidator } from '../utils/location';

const ALLOWED_ATTRIBUTES = [
  'location',
  'lat',
  'lng',
  'status',
  'name',
  'businessName',
  'address',
  'isDeleted'
];

const getFixedStops = async (req, res) => {
  const {
    params: { id: locationId }
  } = req;

  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        skip: validator.rules.number().integer().min(0),
        limit: validator.rules.number().integer().min(1),
        name: validator.rules.string().allow(''),
        sort: validator.rules.string().valid('', 'name'),
        order: validator.rules.string().allow('')
      }),
      req.query
    );

    const location = await locationValidator(locationId, req.user);
    const { items: fixedStops } = await Locations.getFixedStops(location._id, filterParams);

    res.status(200).json(fixedStops.map(dumpAdminFixedStop));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const createFixedStop = async (req, res) => {
  try {
    const {
      body: fixedStopFormData,
      user
    } = req;

    if (!fixedStopFormData) { throw new ApplicationError('Missing FixedStop Information', 400); }
    const fixedStopData = commonAttributeObj(ALLOWED_ATTRIBUTES, fixedStopFormData);

    if (!fixedStopData.location) { throw new ApplicationError('Missing Location for FixedStop'); }
    await locationValidator(fixedStopData.location, user);

    const fixedStop = await FixedStops.createFixedStop(fixedStopData);
    res.status(200).json(dumpAdminFixedStop(fixedStop));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateFixedStop = async (req, res) => {
  try {
    const {
      params: { id },
      body: fixedStopFormData,
      user
    } = req;
    const fixedStopData = commonAttributeObj(ALLOWED_ATTRIBUTES, fixedStopFormData);
    const fixedStop = await FixedStops.getFixedStop({ _id: id });

    if (!fixedStop) { throw new FixedStopNotFoundError(); }
    await locationValidator(fixedStopData.location, user);

    await FixedStops.updateFixedStop(id, fixedStopData);

    const updatedFixedStop = await FixedStops.getFixedStop({ _id: id });
    res.status(200).json(dumpAdminFixedStop(updatedFixedStop));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteFixedStop = async (req, res) => {
  try {
    const { params: { id } } = req;
    const fixedStop = await FixedStops.getFixedStop({ _id: id });
    if (!fixedStop) { throw new FixedStopNotFoundError(); }
    await locationValidator(fixedStop.location, req.user);

    const deletedFixedStop = await FixedStops.deleteFixedStop(id);
    res.status(200).json(dumpAdminFixedStop(deletedFixedStop));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getFixedStops,
  createFixedStop,
  updateFixedStop,
  deleteFixedStop
};
