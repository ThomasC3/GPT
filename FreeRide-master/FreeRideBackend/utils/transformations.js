import moment from 'moment-timezone';

const mapDateSearch = (date, locationTz = null) => {
  const toReturn = {};
  if (date) {
    if (date.start) {
      if (locationTz) {
        toReturn.$gte = moment.tz(date.start, locationTz).format();
      } else {
        toReturn.$gte = moment(date.start).format();
      }
    }
    if (date.end) {
      if (locationTz) {
        toReturn.$lt = moment.tz(date.end, locationTz).format();
      } else {
        toReturn.$lt = moment(date.end).format();
      }
    }
  }

  return Object.keys(toReturn).length ? toReturn : undefined;
};

const mapNonIntervalDateSearch = (date, locationTz = null) => {
  const toReturn = {};
  if (date) {
    if (locationTz) {
      toReturn.$gte = moment.tz(date, locationTz).format();
      toReturn.$lt = moment.tz(date, locationTz).format();
    } else {
      toReturn.$gte = moment(date).format();
      toReturn.$lt = moment(date).format();
    }
  }

  return Object.keys(toReturn).length ? toReturn : undefined;
};

const mapDateSearchAggregate = (date, locationTz = null) => {
  const toReturn = {};
  if (date) {
    if (date.start) {
      if (locationTz) {
        toReturn.$gte = moment(new Date(date.start)).tz(locationTz, true).toDate();
      } else {
        toReturn.$gte = new Date(date.start);
      }
    }
    if (date.end) {
      if (locationTz) {
        toReturn.$lt = moment(new Date(date.end)).tz(locationTz, true).toDate();
      } else {
        toReturn.$lt = new Date(date.end);
      }
    }
  }

  return Object.keys(toReturn).length ? toReturn : undefined;
};

const toDayOfWeek = number => ({
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
}[number] || 'Sunday');

const dayToNumber = (day) => {
  let toReturn = '';
  switch (day) {
  case 'Monday':
    toReturn = 1; break;
  case 'Tuesday':
    toReturn = 2; break;
  case 'Wednesday':
    toReturn = 3; break;
  case 'Thursday':
    toReturn = 4; break;
  case 'Friday':
    toReturn = 5; break;
  case 'Saturday':
    toReturn = 6; break;
  default:
    toReturn = 0;
  }
  return toReturn;
};

const feetToMeter = feet => feet / 3.2808;

const commonAttributeObj = (
  allowedKeys,
  availableData,
  { restrictedKeys, adminRole, allowedRoles } = {}
) => {
  const availableKeys = Object.keys(availableData);
  const updatableKeys = availableKeys.filter((value) => {
    if (restrictedKeys && restrictedKeys.includes(value)) {
      return allowedKeys.includes(value) && allowedRoles.includes(adminRole);
    }
    return allowedKeys.includes(value);
  });
  return updatableKeys.reduce((a, k) => ({ ...a, [k]: availableData[k] }), {});
};

const formatIntervalQuery = (format, a, b) => {
  if (format === '[]') { return { $gte: a, $lte: b }; }
  if (format === '[[') { return { $gte: a, $lt: b }; }
  if (format === ']]') { return { $gt: a, $lte: b }; }
  if (format === '][') { return { $gt: a, $lt: b }; }
  return { $gte: a, $lte: b };
};

const buildJobCode = job => `${job.location?.locationCode || job.locationCode || ''}-${job.clientCode}${job.typeCode}`;

export {
  mapDateSearch,
  mapNonIntervalDateSearch,
  mapDateSearchAggregate,
  toDayOfWeek,
  dayToNumber,
  feetToMeter,
  commonAttributeObj,
  formatIntervalQuery,
  buildJobCode
};

export default {
  mapDateSearch,
  mapDateSearchAggregate,
  toDayOfWeek,
  dayToNumber,
  feetToMeter,
  commonAttributeObj,
  formatIntervalQuery,
  buildJobCode
};
