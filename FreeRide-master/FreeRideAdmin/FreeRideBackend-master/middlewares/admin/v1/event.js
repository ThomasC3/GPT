import { Types } from 'mongoose';
import {
  Events
} from '../../../models';
import { dump, validator } from '../../../utils';
import { eventHour } from '../../../utils/events';
import { adminErrorCatchHandler } from '..';

const getDriverParamsValidator = req => validator.validate(
  validator.rules.object().keys({
    targetId: validator.rules.string(),
    targetType: validator.rules.string().valid('Driver'),
    createdTimestamp: validator.rules.object().keys({
      start: validator.rules.string().allow(''),
      end: validator.rules.string().allow('')
    }),
    location: validator.rules.string()
  }),
  req.query
);

const getEvents = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        targetId: validator.rules.string(),
        targetType: validator.rules.string().valid('Rider', 'Driver', 'Admin', 'Vehicle', 'Job'),
        eventType: validator.rules.string().allow(''),
        createdTimestamp: validator.rules.object().keys({
          start: validator.rules.string().allow(''),
          end: validator.rules.string().allow('')
        }),
        location: validator.rules.string().allow(''),
        skip: validator.rules.number().integer().min(0),
        limit: validator.rules.number().integer().min(1),
        sort: validator.rules.string().valid('', 'createdTimestamp'),
        order: validator.rules.string().allow(''),
        or: validator.rules.boolean().truthy(1).falsy(0).allow('')
      }),
      req.query
    );

    const events = await Events.getEvents(filterParams);
    events.items = events.items.map(
      item => dump.dumpEvents(item, { timezone: events.locationTimezone })
    );
    delete events.locationTimezone;

    res.status(200).json(events);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getLoginHours = async (req, res) => {
  try {
    const filterParams = getDriverParamsValidator(req);
    const { location } = filterParams;

    const {
      locationHours
    } = await eventHour({ ...filterParams, locations: [new Types.ObjectId(location)] }, ['LOCATION SET'], ['LOGOUT']);

    res.status(200).json({
      locationHours: dump.dumpHoursForAdmin(locationHours[0])
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getAvailableHours = async (req, res) => {
  try {
    const filterParams = getDriverParamsValidator(req);
    const { location } = filterParams;

    const {
      locationHours
    } = await eventHour({ ...filterParams, locations: [new Types.ObjectId(location)] }, ['AVAILABLE'], ['UNAVAILABLE']);

    res.status(200).json({
      locationHours: dump.dumpHoursForAdmin(locationHours[0])
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getEvents,
  getLoginHours,
  getAvailableHours
};
