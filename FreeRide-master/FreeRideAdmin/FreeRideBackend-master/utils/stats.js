import moment from 'moment-timezone';
import {
  Routes
} from '../models';
import { mongodb } from '../services';
import { sum } from './math';

export const WEEKDAYS = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

const DEFAULT_HOURS_PER_DAY = 8;

const distance = (pickupCoord, dropoffCoord, unit) => {
  try {
    const radlat1 = Math.PI * pickupCoord[0] / 180;
    const radlat2 = Math.PI * dropoffCoord[0] / 180;
    const theta = pickupCoord[1] - dropoffCoord[1];
    const radtheta = Math.PI * theta / 180;
    let dist = Math.sin(radlat1) * Math.sin(radlat2)
      + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit === 'K') { dist *= 1.609344; }
    if (unit === 'N') { dist *= 0.8684; }
    return dist;
  } catch (err) {
    return 0;
  }
};

export const rideDistance = (pickupLatList, pickupLonList, dropoffLatList, dropoffLonList) => {
  const distances = [];
  let pickupCoord;
  let dropoffCoord;
  for (let i = 0; i < pickupLatList.length; i += 1) {
    pickupCoord = [pickupLatList[i], pickupLonList[i]];
    dropoffCoord = [dropoffLatList[i], dropoffLonList[i]];
    distances.push(distance(pickupCoord, dropoffCoord, 'N'));
  }
  return distances;
};

export const countWeekdays = (startDate, endDate) => {
  // Sunday: 0
  const dayCount = [0, 0, 0, 0, 0, 0, 0];
  let currDay = startDate.startOf('day').clone();
  while (currDay <= endDate) {
    dayCount[currDay.day()] += 1;
    currDay = currDay.add(1, 'days');
  }
  return dayCount;
};

export const checkPoolingRide = async (rideId) => {
  const route = await Routes.findOne({
    stops: {
      $elemMatch: {
        ride: new mongodb.Types.ObjectId(rideId)
      }
    }
  });

  if (!route) { return { poolingRide: false, stopsBeforeDropoff: false }; }

  let passengersInCar = 0;
  let stopPassengerCount = false;
  let startStopCount = false;
  let stopsBeforeDropoff = 0;
  let stop = {};
  for (let i = 0; i < route.stops.length; i += 1) {
    stop = route.stops[i];
    if (stop.stopType === 'current_location') {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (String(stop.ride) !== String(rideId) && stop.status !== 'cancelled' && !stopPassengerCount) {
      if (stop.stopType === 'pickup') {
        passengersInCar += 1;
      } else if (stop.stopType === 'dropoff') {
        passengersInCar -= 1;
      }
    } else if (String(stop.ride) === String(rideId)) {
      stopPassengerCount = true;
    }
    if (startStopCount && String(stop.ride) !== String(rideId) && stop.status !== 'cancelled') {
      stopsBeforeDropoff += 1;
    }
    if (!startStopCount && String(stop.ride) === String(rideId) && stop.stopType === 'pickup') {
      startStopCount = true;
    } else if (startStopCount && String(stop.ride) === String(rideId) && stop.stopType === 'dropoff') {
      break;
    }
  }
  return { poolingRide: passengersInCar > 0, stopsBeforeDropoff };
};

export const formatTime = (timeDiffSeconds_, minSecFormat = false) => {
  if (!timeDiffSeconds_) {
    return '--';
  }
  const leadingSign = timeDiffSeconds_ < 0 ? '-' : '';
  let remainingTime = Math.abs(timeDiffSeconds_);
  const minutes = Math.floor(remainingTime / 60);
  remainingTime -= minutes * 60;
  const seconds = Math.floor(remainingTime);
  remainingTime -= seconds;
  const milliseconds = Math.round(remainingTime * 1000);
  if (minSecFormat) {
    return `${leadingSign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${leadingSign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`;
};

export const getServiceTime = (startDate, endDate, serviceHoursInfo) => {
  let service;
  let serviceHours;
  const weekDayCount = countWeekdays(startDate, endDate);
  const monToSatDayCount = weekDayCount.slice(1);
  let [ndays, timeDiff] = [0, 0];
  let hourCount = [0, 0, 0, 0, 0, 0, 0];
  if (serviceHoursInfo[0] && serviceHoursInfo[0].length) {
    serviceHours = 0;
    hourCount = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < serviceHoursInfo[0].length; i += 1) {
      service = serviceHoursInfo[0][i];
      ndays = weekDayCount[WEEKDAYS[service.day]];
      timeDiff = moment.duration(moment(service.closeTime, 'HH:mm').diff(moment(service.openTime, 'HH:mm')));
      serviceHours += ndays * Math.round(timeDiff.hours() + timeDiff.minutes() / 60);
      hourCount[WEEKDAYS[service.day]] = Math.round(timeDiff.hours() + timeDiff.minutes() / 60);
    }
  } else {
    serviceHours = DEFAULT_HOURS_PER_DAY * sum(monToSatDayCount);
  }
  return { serviceHours, weekDayCount, hourCount };
};

export const reduceSum = (obj, keys) => {
  const sumObj = {};
  let key;
  for (let i = 0; i < keys.length; i += 1) {
    key = keys[i];
    // eslint-disable-next-line no-loop-func
    sumObj[key] = obj.reduce((accu, next) => accu + next[key], 0);
  }
  return sumObj;
};

export const reduceConcat = (obj, keys) => {
  const sumObj = {};
  let key;
  for (let i = 0; i < keys.length; i += 1) {
    key = keys[i];
    // eslint-disable-next-line no-loop-func
    sumObj[key] = obj.reduce((accu, next) => accu.concat(next[key]), []);
  }
  return sumObj;
};

export const formatPercentage = (n, d) => (d === 0 ? '--' : ((n / d) * 100).toFixed(1));

export default {
  rideDistance,
  countWeekdays,
  checkPoolingRide,
  formatTime,
  getServiceTime,
  reduceSum,
  reduceConcat,
  formatPercentage,
  WEEKDAYS
};
