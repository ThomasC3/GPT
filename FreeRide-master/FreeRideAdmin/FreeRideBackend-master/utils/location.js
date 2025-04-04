import moment from 'moment-timezone';
import Joi from '@hapi/joi';
import { toDayOfWeek, buildJobCode } from './transformations';
import {
  Drivers, Locations, Jobs, Events
} from '../models';
import { LocationError } from '../errors';
import { validator } from '.';

export const hasOnlineDrivers = async location => (
  Drivers.findOne({ activeLocation: location._id, isOnline: true, isDeleted: false })
);

const getTimeSlot = (serviceHours, locationTime) => {
  // eg 2
  const currentDayInteger = locationTime.day();
  // eg Tuesday
  const currentDayString = toDayOfWeek(currentDayInteger);

  const timeSlot = serviceHours.find(el => el.day === currentDayString);
  return timeSlot;
};

const buildInterval = (timeSlot, currentDay) => {
  const openTimeHHMM = timeSlot.openTime.split(':');
  const closeTimeHHMM = timeSlot.closeTime.split(':');
  const openTime = currentDay.clone().hours(openTimeHHMM[0], 'hours').minute(openTimeHHMM[1], 'minutes')
    .seconds(0)
    .millisecond(0);
  const closeTime = currentDay.clone().hours(closeTimeHHMM[0], 'hours').minute(closeTimeHHMM[1], 'minutes')
    .seconds(0)
    .millisecond(0);

  if (closeTime.isBefore(openTime)) {
    closeTime.add(1, 'days');
  }
  return [openTime, closeTime];
};

export const isLocationClosed = (locationData) => {
  const { serviceHours, timezone: locationTimezone } = locationData;

  const currentTime = moment.utc().tz(locationTimezone)
    .seconds(0)
    .millisecond(0);

  let timeSlot = getTimeSlot(serviceHours, currentTime);
  let [openTime, closeTime] = buildInterval(timeSlot, currentTime);

  if (currentTime.isBefore(openTime)) {
    const previousDay = currentTime.clone().subtract(1, 'days');
    timeSlot = getTimeSlot(serviceHours, previousDay);
    [openTime, closeTime] = buildInterval(timeSlot, previousDay);
  }

  if (timeSlot.closed) { return true; }

  return !currentTime.isBetween(openTime, closeTime, null, '[)');
};

export const isPaymentInformationValid = (locationData) => {
  if (!locationData.paymentEnabled) { return true; }

  const { paymentInformation } = locationData;
  const rules = validator.rules.object({
    ridePrice: validator.rules.number().integer().min(0).required(),
    priceCap: validator.rules.number().integer().min(0),
    capEnabled: validator.rules.boolean(),
    pricePerHead: validator.rules.number().integer().min(0),
    currency: validator.rules.string().lowercase().required().regex(/^usd$/)
  }).with('capEnabled', ['priceCap']);

  const { error } = rules.validate(paymentInformation);

  if (error) {
    const errMsg = error.details.map(detail => detail.message).join('. ');
    throw new LocationError(errMsg, 400);
  }

  return true;
};

export const isPwywInformationValid = (locationData) => {
  if (!locationData.pwywEnabled) { return true; }

  let { pwywInformation } = locationData;
  // if no pwywOptions were sent, set default and validate as empty
  pwywInformation = pwywInformation || { pwywOptions: [] };

  pwywInformation.pwywOptions = pwywInformation.pwywOptions.map(item => parseInt(item, 10));
  const rules = validator.rules.object({
    pwywOptions: validator.rules.array().items(validator.rules.number().integer().min(0))
      .min(3)
      .sort({ order: 'ascending' })
      .strict(),
    maxCustomValue: validator.rules.number().integer().min(0).greater(Joi.ref('pwywOptions.2')),
    currency: validator.rules.string().lowercase().required().regex(/^usd$/)
  });

  const { error } = rules.validate(pwywInformation);

  if (error) {
    const errMsg = error.details.map(detail => detail.message).join('. ');
    throw new LocationError(errMsg, 400);
  }

  return true;
};

export const isFreeRideAgeRestrictionValid = (locationData) => {
  if (!locationData.freeRideAgeRestrictionInterval) { return true; }

  const { freeRideAgeRestrictionInterval: { min, max } } = locationData;

  if (min && (min < 16)) {
    throw new LocationError(`Invalid minimum age: ${min} is below 16.`);
  }
  if (max && (max < 16)) {
    throw new LocationError(`Invalid maximum age: ${max} is below 16.`);
  }
  if (min && max && (max < min)) {
    throw new LocationError(`Invalid age interval: ${max} is below ${min}.`);
  }

  return true;
};

export const isTipInformationValid = (locationData) => {
  if (!locationData.tipEnabled) { return true; }

  const { tipInformation } = locationData;
  tipInformation.tipOptions = tipInformation.tipOptions.map(item => parseInt(item, 10));
  const rules = validator.rules.object({
    tipOptions: validator.rules.array().items(validator.rules.number().integer().min(0))
      .min(3)
      .sort({ order: 'ascending' })
      .strict(),
    maxCustomValue: validator.rules.number().integer().min(0).greater(Joi.ref('tipOptions.2')),
    currency: validator.rules.string().lowercase().required().regex(/^usd$/)
  });

  const { error } = rules.validate(tipInformation);

  if (error) {
    const errMsg = error.details.map(detail => detail.message).join('. ');
    throw new LocationError(errMsg, 400);
  }

  return true;
};

export const isTipValueValid = (locationData, tipAmount) => (
  (tipAmount >= locationData.tipBaseValue) && (tipAmount <= locationData.tipMaxValue)
);

export const getLocationsInWorkingSet = async () => {
  // Trap env variable here so it can be re-declared every time func is called for tests purpose
  const cronWorkingSet = process.env.LOCATION_WORKING_SET;
  if (!cronWorkingSet) {
    throw new Error('Cron error - LOCATION_WORKING_SET not set in current environment');
  }
  const locations = await Locations.find({ cronWorkingSet });
  return locations;
};

export const handleLocationCodeUpdate = async (updatedLocation) => {
  const jobs = await Jobs.find({ location: updatedLocation._id, isDeleted: false });
  const promises = [
    ...jobs.map(job => Jobs.updateJobById(
      job._id, {
        locationCode: updatedLocation.locationCode,
        code: buildJobCode({ ...job.toJSON(), locationCode: updatedLocation.locationCode })
      }
    )),
    ...jobs.map(job => Events.createByLocationOnJob({
      job,
      location: updatedLocation,
      eventType: 'UPDATE',
      eventData: {
        changes: {
          locationCode: {
            previous: job.locationCode,
            current: updatedLocation.locationCode
          }
        }
      }
    }))
  ];
  return Promise.all(promises);
};

export default {
  isLocationClosed,
  isPaymentInformationValid,
  isPwywInformationValid,
  hasOnlineDrivers,
  isTipValueValid,
  getLocationsInWorkingSet,
  handleLocationCodeUpdate
};
