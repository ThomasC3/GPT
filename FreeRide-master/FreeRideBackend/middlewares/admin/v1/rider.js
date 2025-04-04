import csv from 'csv';
import {
  Riders, Rides, Locations
} from '../../../models';
import { validator, dump } from '../../../utils';
import { commonAttributeObj } from '../../../utils/transformations';
import { convertDate } from '../../../utils/time';
import { adminErrorCatchHandler } from '..';
import { riderDeleteHelper } from '../../../utils/rider';
import { validateRiderDelete, monthRangeLimitCheck } from '../../../utils/check';
import RiderSerializer from '../utils/RiderSerializer';

const ALLOWED_ATTRIBUTES = [
  // 'email',
  // 'password',
  // 'lastCancelTimestamp',
  // 'firstName',
  // 'lastName',
  // 'gender',
  'dob',
  // 'facebook',
  // 'google',
  // 'phone',
  'isPhoneVerified',
  // 'zip',
  // 'location',
  // 'phoneCode',
  // 'emailCode',
  'isEmailVerified',
  // 'isExistingUser',
  // 'socketIds',
  'isBanned',
  // 'strikeCount',
  // 'isDeleted',
  // 'isLegacyUser',
  // 'legacyId',
  'subscriptions'
  // 'stripeCustomerId',
  // 'promocode',
  // 'createdTimestamp',
  // 'locale'
];

const getRider = async (req, res) => {
  const {
    params: { id }
  } = req;
  try {
    const rider = await Riders.getRider({ _id: id });
    rider.dob = convertDate(rider.dob);

    const ratingInfo = await Rides.buildRatingInfo('rider', rider._id);

    res.status(200).json({ ...rider.toJSON(), ...ratingInfo });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getRiders = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        skip: validator.rules.number().integer().min(0),
        limit: validator.rules.number().integer().min(1),
        firstName: validator.rules.string().allow(''),
        lastName: validator.rules.string().allow(''),
        email: validator.rules.string().email().allow(''),
        sort: validator.rules.string().valid('', 'createdTimestamp', 'firstName', 'lastName', 'email'),
        order: validator.rules.string().allow('')
      }),
      req.query,
    );

    filterParams.isDeleted = false;
    const riders = await Riders.getRiders(filterParams);
    riders.items = riders.items.map(i => i.toJSON());

    res.status(200).json(riders);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateRider = async (req, res) => {
  try {
    const {
      params: { id },
      body: updatedRiderData
    } = req;

    const updatedRider = commonAttributeObj(ALLOWED_ATTRIBUTES, updatedRiderData);

    const rider = await Riders.updateRider(id, updatedRider);
    res.status(200).json(dump.dumpRider(rider.toJSON()));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteRider = async (req, res) => {
  try {
    const {
      params: { id }
    } = req;

    const rider = await validateRiderDelete(id);

    const deletedRider = await riderDeleteHelper(rider);

    res.status(200).json(dump.dumpRider(deletedRider.toJSON()));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getCsvRiders = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        limit: validator.rules.number().integer().min(1),
        location: validator.rules.string().allow(''),
        isEmailVerified: validator.rules.boolean().truthy(1).falsy(0).allow(''),
        createdTimestamp: validator.rules.object().keys({
          start: validator.rules.string().allow('').required(),
          end: validator.rules.string().allow('').required()
        })
      }),
      req.query
    );
    monthRangeLimitCheck(filterParams);

    const locationTimezone = filterParams.location
      ? (await Locations.findById(filterParams.location))?.timezone
      : null;

    const cursor = await Riders.getRidersCursor(filterParams, locationTimezone);
    const transformer = RiderSerializer.adminRiderToCsv;

    res.setHeader('Content-Disposition', `attachment; filename="download-${Date.now()}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.writeHead(200, { 'Content-Type': 'text/csv' });
    res.flushHeaders();

    const columns = RiderSerializer.csvColumns();
    cursor
      .pipe(csv.transform(transformer))
      .pipe(csv.stringify({
        header: true,
        columns,
        cast: {
          boolean: (value, context) => {
            if (context.column === 'index') {
              return String(context.records + 1);
            }
            return value ? 'True' : 'False';
          }
        }
      }))
      .pipe(res);
  } catch (error) {
    adminErrorCatchHandler(res, error, {});
  }
};

export default {
  getRider,
  getRiders,
  updateRider,
  deleteRider,
  getCsvRiders
};
