import mongoose from 'mongoose';
import { adminErrorCatchHandler } from '..';
import { Rides, Locations } from '../../../models';
import { validator, transformations } from '../../../utils';
import { monthRangeLimitCheck } from '../../../utils/check';

const getRides = async (req, res) => {
  try {
    const serviceKeys = ['skip', 'limit', 'sort', 'order'];
    const filterParams = validator.validate(
      validator.rules.object().keys({
        skip: validator.rules.number().integer().min(0),
        limit: validator.rules.number().integer().min(1),
        location: validator.rules.string(),
        driver: validator.rules.string(),
        rider: validator.rules.string(),
        status: validator.rules.array().items(validator.rules.number()),
        isADA: validator.rules.boolean().truthy(1).falsy(0).allow(''),
        ratingForRider: validator.rules.number().allow(''),
        ratingForDriver: validator.rules.number().allow(''),
        createdTimestamp: validator.rules.object().keys({
          start: validator.rules.string().allow(''),
          end: validator.rules.string().allow('')
        })
      }),
      req.query,
    );

    monthRangeLimitCheck(filterParams);

    let locationTimezone = null;
    const findQuery = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit || 30;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'createdTimestamp']: filterParams.order ? parseInt(filterParams.order, 10) : -1
    };

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key) && filterParams[key]) {
        findQuery[key] = filterParams[key];
      }
    });

    if (findQuery.location) {
      const location = await Locations.getLocation(findQuery.location);
      if (location) {
        locationTimezone = location.timezone;
      }
    }

    if (findQuery.createdTimestamp) {
      if (findQuery.createdTimestamp.start && findQuery.createdTimestamp.end) {
        findQuery.createdTimestamp = transformations.mapDateSearchAggregate(
          findQuery.createdTimestamp, locationTimezone
        );
      } else {
        delete findQuery.createdTimestamp;
      }
    }
    if (findQuery.status) findQuery.status = { $in: findQuery.status };
    if (findQuery.location) findQuery.location = new mongoose.Types.ObjectId(findQuery.location);
    const rides = await Rides
      .aggregate([
        { $match: findQuery },
        { $sort: sort },
        {
          $project: {
            _id: 0,
            id: '$_id',
            dropoffLatitude: 1,
            dropoffLongitude: 1,
            pickupLatitude: 1,
            pickupLongitude: 1
          }
        },
        {
          $group: {
            _id: null,
            items: { $push: '$$ROOT' },
            total: { $sum: 1 }
          }
        },
        { $unwind: '$items' },
        { $skip: skip },
        { $limit: limit },
        {
          $group: {
            _id: 0,
            total: {
              $first: '$total'
            },
            items: {
              $push: '$items'
            }
          }
        },
        { $project: { items: 1, total: 1, _id: 0 } }
      ]);
    res.json({
      total: 0, items: [], skip, limit, ...rides[0]
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getRides
};
