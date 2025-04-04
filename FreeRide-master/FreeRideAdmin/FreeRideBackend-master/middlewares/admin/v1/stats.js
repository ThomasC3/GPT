import moment from 'moment';
import _ from 'lodash';
import { RideStatus } from '../../../models';
import { getAdminLocations } from '../utils/location';
import { adminErrorCatchHandler } from '..';

import {
  rideDistance,
  countWeekdays,
  formatTime,
  getServiceTime,
  formatPercentage,
  WEEKDAYS
} from '../../../utils/stats';

import {
  average,
  sum,
  perc,
  isNumber
} from '../../../utils/math';

import {
  timeDiffSeconds,
  validateFilters,
  repeatQueryLocation
} from '../../../utils/query';

const ACTIVE_STATUS = [
  RideStatus.RideInQueue,
  RideStatus.NextInQueue,
  RideStatus.DriverEnRoute,
  RideStatus.DriverArrived,
  RideStatus.RideInProgress
];

const DRIVER_CANCELLED_STATUS = [
  RideStatus.CancelledInQueue,
  RideStatus.CancelledEnRoute,
  RideStatus.CancelledNotAble
];

const getWaitTimes = async (req, res) => {
  try {
    const projectVars = {
      pickupTimestamp: 1,
      createdTimestamp: 1,
      dropoffTimestamp: 1
    };
    const groupOptions = {
      pickupTimes: {
        $push: timeDiffSeconds({ $toDate: { $toDouble: '$pickupTimestamp' } }, '$createdTimestamp')
      },
      rideTimes: {
        $push: timeDiffSeconds('$dropoffTimestamp', { $toDate: { $toDouble: '$pickupTimestamp' } })
      },
      totalTimes: {
        $push: timeDiffSeconds('$dropoffTimestamp', '$createdTimestamp')
      }
    };

    const locations = await getAdminLocations(req.user);
    const defaultJson = {
      pickupTimes: [],
      rideTimes: [],
      totalTimes: []
    };
    const filterOptions = {
      status: { $in: [RideStatus.RideComplete] },
      request: { $ne: null },
      pickupTimestamp: { $ne: null }
    };
    const pickupList = await repeatQueryLocation(
      req, locations, defaultJson, filterOptions, projectVars, groupOptions
    );

    let waitTimes = pickupList.map(city => (
      {
        city: city._id.locationName,
        pickupTime: isNumber(perc(city.pickupTimes, 0.75)) ? formatTime(perc(city.pickupTimes, 0.75)) : '--',
        rideTime: isNumber(perc(city.rideTimes, 0.75)) ? formatTime(perc(city.rideTimes, 0.75)) : '--',
        totalTime: isNumber(perc(city.totalTimes, 0.75)) ? formatTime(perc(city.totalTimes, 0.75)) : '--',
        pickupTimeAvg: isNumber(average(city.pickupTimes)) ? formatTime(average(city.pickupTimes)) : '--',
        rideTimeAvg: isNumber(average(city.rideTimes)) ? formatTime(average(city.rideTimes)) : '--',
        totalTimeAvg: isNumber(average(city.totalTimes)) ? formatTime(average(city.totalTimes)) : '--',
        rideCount: city.pickupTimes.length > 0 ? city.pickupTimes.length : '--'
      }
    ));
    waitTimes = _.sortBy(waitTimes, 'city');

    res.status(200).json({
      waitTimes
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      `We were unable to fetch wait times at this time.${error}`);
  }
};

const getRideStats = async (req, res) => {
  try {
    // Rides
    let projectVars = {
      status: 1,
      cancelledBy: 1,
      request: 1
    };
    let groupOptions = {
      allRides: {
        $push: '$status'
      },
      completedRides: {
        $push: {
          $cond: [
            { $eq: ['$status', RideStatus.RideComplete] },
            '$status',
            null
          ]
        }
      },
      ongoingRides: {
        $push: {
          $cond: [
            { $in: ['$status', ACTIVE_STATUS] },
            '$status',
            null
          ]
        }
      },
      noShowRides: {
        $push: {
          $cond: [
            { $eq: ['$status', RideStatus.CancelledNoShow] },
            '$status',
            null
          ]
        }
      },
      notAbleRides: {
        $push: {
          $cond: [{
            $and: [
              { $in: ['$status', DRIVER_CANCELLED_STATUS] },
              { $eq: ['$cancelledBy', 'DRIVER'] }
            ]
          },
          '$status',
          null
          ]
        }
      },
      riderCancelRides: {
        $push: {
          $cond: [{
            $and: [
              { $in: ['$status', [RideStatus.CancelledNotAble]] },
              { $eq: ['$cancelledBy', 'RIDER'] }
            ]
          },
          '$status',
          null
          ]
        }
      },
      riderCancelOnRequestRides: {
        $push: {
          $cond: [
            { $in: ['$status', [RideStatus.RequestCancelled]] },
            '$status',
            null
          ]
        }
      }
    };

    const locations = await getAdminLocations(req.user);

    let defaultJson = {
      allRides: [],
      completedRides: [],
      ongoingRides: [],
      noShowRides: [],
      notAbleRides: [],
      riderCancelRides: [],
      riderCancelOnRequestRides: []
    };
    let filterOptions = {
      request: { $ne: null }
    };
    const rideList = await repeatQueryLocation(
      req, locations, defaultJson, filterOptions, projectVars, groupOptions
    );

    filterOptions = {
      request: { $eq: null }
    };
    projectVars = {
      status: 1
    };
    groupOptions = {
      allHailedRides: {
        $push: '$status'
      }
    };
    defaultJson = {
      allHailedRides: []
    };

    const hailedRideList = await repeatQueryLocation(
      req, locations, defaultJson, filterOptions, projectVars, groupOptions
    );

    // Missed rides
    defaultJson = {
      requestCount: 0
    };
    const missedRequestList = await repeatQueryLocation(req, locations, defaultJson, {}, {}, {}, 'Requests', 'missed');
    const cancelledRequestList = await repeatQueryLocation(req, locations, defaultJson, {}, {}, {}, 'Requests', 'cancelledRequest');

    // Result
    let [
      hailedRideCount,
      missedRideCount,
      cancelledRequestCount,
      requestCount
    ] = [0, 0, 0];
    let output = {};

    let cityName;
    let cityHailedRides;
    let cityMissedRequests;
    let cityCancelledRequests;
    let rideCount;
    let rideStats = rideList.map((city) => {
      cityName = city._id.locationName;
      cityHailedRides = hailedRideList.filter(item => item._id.locationName === cityName);
      cityMissedRequests = missedRequestList.filter(item => item._id.locationName === cityName);
      cityCancelledRequests = cancelledRequestList
        .filter(item => item._id.locationName === cityName);
      if (cityHailedRides.length) {
        hailedRideCount = cityHailedRides[0].allHailedRides.length;
      } else {
        hailedRideCount = 0;
      }
      if (cityMissedRequests.length) {
        missedRideCount = cityMissedRequests[0].requestCount;
      } else {
        missedRideCount = 0;
      }
      if (cityCancelledRequests.length) {
        cancelledRequestCount = cityCancelledRequests[0].requestCount;
      } else {
        cancelledRequestCount = 0;
      }
      rideCount = (city ? city.allRides.length : 0);
      requestCount = missedRideCount + rideCount + cancelledRequestCount;
      output = {
        city: cityName,
        completedRides: city ? city.completedRides.filter(Boolean).length : 0,
        hailedRides: hailedRideCount,
        ongoingRides: city ? city.ongoingRides.filter(Boolean).length : 0,
        noShowRides: city ? city.noShowRides.filter(Boolean).length : 0,
        notAbleRides: city ? city.notAbleRides.filter(Boolean).length : 0,
        riderCancelRides: city ? city.riderCancelRides.filter(Boolean).length : 0,
        riderCancelOnRequestRides: city ? city.riderCancelOnRequestRides.filter(Boolean).length : 0,
        missedRides: missedRideCount,
        cancelledRequests: cancelledRequestCount,
        rideCount: rideCount + hailedRideCount,
        requestCount
      };

      output.completedRidesPerc = formatPercentage(output.completedRides, output.rideCount);
      output.hailedRidesPerc = formatPercentage(output.hailedRides, output.rideCount);
      output.ongoingRidesPerc = formatPercentage(output.ongoingRides, output.rideCount);
      output.noShowRidesPerc = formatPercentage(output.noShowRides, output.rideCount);
      output.notAbleRidesPerc = formatPercentage(output.notAbleRides, output.rideCount);
      output.riderCancelRidesPerc = formatPercentage(output.riderCancelRides, output.rideCount);
      output.riderCancelOnRequestRidesPerc = formatPercentage(
        output.riderCancelOnRequestRides, output.rideCount
      );
      return output;
    });
    rideStats = _.sortBy(rideStats, 'city');

    res.status(200).json({
      rideStats
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getRiderStats = async (req, res) => {
  try {
    const filterOptions = {
      status: { $in: [RideStatus.RideComplete] }
    };
    const projectVars = {
      passengers: 1,
      createdTimestamp: 1,
      serviceHours: { $arrayElemAt: ['$locationInfo.serviceHours', 0] },
      enforceServiceHours: { $arrayElemAt: ['$locationInfo.isUsingServiceTimes', 0] }

    };
    const groupOptions = {
      n_passengers: {
        $push: {
          $toDouble: '$passengers'
        }
      },
      timestamps: {
        $push: '$createdTimestamp'
      },
      enforceServiceHours: {
        $push: '$enforceServiceHours'
      },
      serviceHours: {
        $push: '$serviceHours'
      }
    };

    const locations = await getAdminLocations(req.user);

    const defaultJson = {
      n_passengers: [],
      timestamps: [],
      enforceServiceHours: [],
      serviceHours: []
    };
    const rideList = await repeatQueryLocation(
      req, locations, defaultJson, filterOptions, projectVars, groupOptions
    );

    let [startDate, endDate] = [0, 0];
    let serviceSpan;
    let tsList;
    let location;
    let filterTimestamp;
    let riderStats = rideList.map((city) => {
      location = locations.find(item => String(item._id) === String(city._id.locationId));
      filterTimestamp = validateFilters(req, location.timezone);
      if (!filterTimestamp) {
        tsList = city.timestamps || [];
        tsList = tsList.sort((a, b) => moment(a) - moment(b));
        startDate = moment(tsList[0]);
        endDate = moment(tsList[tsList.length - 1]);
      } else {
        startDate = moment(filterTimestamp.$gte);
        endDate = moment(filterTimestamp.$lt);
      }
      serviceSpan = getServiceTime(startDate, endDate, city.serviceHours);
      return {
        city: city._id.locationName,
        passengers: sum(city.n_passengers),
        rideCount: city.n_passengers.length,
        average: isNumber(average(city.n_passengers)) ? average(city.n_passengers).toFixed(3) : '--',
        enforceServiceHours: city.enforceServiceHours[0] ? 'Yes' : 'No',
        serviceHours: serviceSpan.serviceHours.toFixed(0),
        perServiceHour: (sum(city.n_passengers) / serviceSpan.serviceHours).toFixed(3),
        weekDayCount: String(serviceSpan.weekDayCount),
        hourCount: String(serviceSpan.hourCount)
      };
    });
    riderStats = _.sortBy(riderStats, 'city');

    let [days, weeks, months] = [0, 0, 0];
    let volumeStats = rideList.map((city) => {
      if (!filterTimestamp) {
        tsList = city.timestamps;
        tsList = tsList.sort((a, b) => moment(a) - moment(b));
        startDate = moment(tsList[0]);
        endDate = moment(tsList[tsList.length - 1]);
      } else {
        startDate = moment(filterTimestamp.$gte);
        endDate = moment(filterTimestamp.$lt);
      }
      days = moment.duration(endDate.diff(startDate)).asDays();
      weeks = moment.duration(endDate.diff(startDate)).asWeeks();
      months = moment.duration(endDate.diff(startDate)).asMonths();
      return {
        city: city._id.locationName,
        rideCount: city.n_passengers.length,
        passengerCount: sum(city.n_passengers),
        startDay: startDate.format('MM/DD/YYYY'),
        endDay: endDate.format('MM/DD/YYYY'),
        days: Math.round(days),
        perDay: (city.n_passengers.length / days).toFixed(3),
        perWeek: (city.n_passengers.length / weeks).toFixed(3),
        perMonth: (city.n_passengers.length / months).toFixed(3),
        passengersPerDay: (sum(city.n_passengers) / days).toFixed(3),
        passengersPerWeek: (sum(city.n_passengers) / weeks).toFixed(3),
        passengersPerMonth: (sum(city.n_passengers) / months).toFixed(3)
      };
    });
    volumeStats = _.sortBy(volumeStats, 'city');


    res.status(200).json({
      riderStats,
      volumeStats
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getRatingStats = async (req, res) => {
  try {
    const filterOptions = {
      status: { $in: [RideStatus.RideComplete] },
      pickupTimestamp: { $ne: null },
      ratingForDriver: { $ne: null },
      request: { $ne: null }
    };
    const projectVars = {
      ratingForDriver: 1
    };
    const groupOptions = {
      ratings: {
        $push: '$ratingForDriver'
      }
    };

    const locations = await getAdminLocations(req.user);

    const defaultJson = {
      ratings: []
    };
    const rideList = await repeatQueryLocation(
      req, locations, defaultJson, filterOptions, projectVars, groupOptions
    );

    let ratingStats = rideList.map(city => (
      {
        city: city._id.locationName,
        average: isNumber(average(city.ratings)) ? average(city.ratings).toFixed(3) : '--',
        ratings: city.ratings.length,
        one_star: city.ratings.filter(item => item === 1).length,
        two_star: city.ratings.filter(item => item === 2).length,
        three_star: city.ratings.filter(item => item === 3).length,
        four_star: city.ratings.filter(item => item === 4).length,
        five_star: city.ratings.filter(item => item === 5).length
      }
    ));
    ratingStats = _.sortBy(ratingStats, 'city');

    res.status(200).json({
      ratingStats
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};


const getMileStats = async (req, res) => {
  try {
    const filterOptions = {
      status: { $in: [RideStatus.RideComplete] },
      pickupTimestamp: { $ne: null },
      request: { $ne: null }
    };
    const projectVars = {
      pickupLatitude: 1,
      pickupLongitude: 1,
      dropoffLatitude: 1,
      dropoffLongitude: 1,
      passengers: 1,
      serviceHours: { $arrayElemAt: ['$locationInfo.serviceHours', 0] },
      enforceServiceHours: { $arrayElemAt: ['$locationInfo.isUsingServiceTimes', 0] }
    };
    const groupOptions = {
      pickupLat: {
        $push: '$pickupLatitude'
      },
      pickupLon: {
        $push: '$pickupLongitude'
      },
      dropoffLat: {
        $push: '$dropoffLatitude'
      },
      dropoffLon: {
        $push: '$dropoffLongitude'
      },
      enforceServiceHours: {
        $push: '$enforceServiceHours'
      },
      serviceHours: {
        $push: '$serviceHours'
      },
      n_passengers: {
        $push: {
          $toDouble: '$passengers'
        }
      }
    };

    const locations = await getAdminLocations(req.user);

    const defaultJson = {
      pickupLat: [],
      pickupLon: [],
      dropoffLat: [],
      dropoffLon: [],
      enforceServiceHours: [],
      serviceHours: [],
      n_passengers: []
    };
    const rideList = await repeatQueryLocation(
      req, locations, defaultJson, filterOptions, projectVars, groupOptions
    );

    let filterTimestamp;
    let location;
    let [startDate, endDate] = [0, 0];
    let eucDistList = [];
    let service;
    const mileStats = _.sortBy(rideList.map((city) => {
      location = locations.find(item => String(item._id) === String(city._id.locationId));
      filterTimestamp = validateFilters(req, location.timezone);
      if (!filterTimestamp) {
        let tsList = city.timestamps || [];
        tsList = tsList.sort((a, b) => moment(a) - moment(b));
        startDate = moment(tsList[0]);
        endDate = moment(tsList[tsList.length - 1]);
      } else {
        startDate = moment(filterTimestamp.$gte);
        endDate = moment(filterTimestamp.$lt);
      }
      const weekDayCount = countWeekdays(startDate, endDate);
      let serviceDays = 0;
      if (city.serviceHours[0] && city.serviceHours[0].length) {
        serviceDays = 0;
        for (let i = 0; i < city.serviceHours[0].length; i += 1) {
          service = city.serviceHours[0][i];
          serviceDays += weekDayCount[WEEKDAYS[service.day]];
        }
      } else {
        serviceDays = sum(weekDayCount.slice(1));
      }
      eucDistList = rideDistance(city.pickupLat, city.pickupLon, city.dropoffLat, city.dropoffLon);
      return {
        city: city._id.locationName,
        rideCount: city.n_passengers.length,
        miles: sum(eucDistList).toFixed(3),
        milesPerDay: (sum(eucDistList) / serviceDays).toFixed(3),
        passengersPerMile: (sum(city.n_passengers) / sum(eucDistList)).toFixed(3),
        passengerCount: sum(city.n_passengers),
        serviceDays,
        enforceServiceHours: city.enforceServiceHours[0] ? 'Yes' : 'No'
      };
    }), 'city');

    res.status(200).json({ mileStats });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getExperienceStats = async (req, res) => {
  try {
    const filterOptions = {
      status: { $in: [RideStatus.RideComplete] },
      pickupTimestamp: { $ne: null },
      request: { $ne: null }
    };
    const projectVars = {
      ratingForDriver: 1,
      createdTimestamp: 1,
      pickupTimestamp: 1,
      rider: 1,
      poolingTag: 1,
      stopsBeforeDropoff: 1
    };
    const preGroupSort = {
      createdTimestamp: 1
    };
    const groupOptions = {
      rides: { $push: '$_id' },
      ratings: { $push: '$ratingForDriver' },
      pickupTimes: {
        $push: timeDiffSeconds({ $toDate: { $toDouble: '$pickupTimestamp' } }, '$createdTimestamp')
      },
      poolingTags: { $push: '$poolingTag' },
      stopsBeforeDropoffs: { $push: '$stopsBeforeDropoff' }
    };

    const addOptions = [{
      $addFields: {
        firstRide: { $arrayElemAt: ['$rides', 0] },
        firstRating: { $arrayElemAt: ['$ratings', 0] },
        firstPickupTime: { $arrayElemAt: ['$pickupTimes', 0] },
        firstPoolingTag: { $arrayElemAt: ['$poolingTags', 0] },
        firstStopsBeforeDropoff: { $arrayElemAt: ['$stopsBeforeDropoffs', 0] }
      }
    },
    {
      $project: {
        rideCount: { $size: '$rides' },
        firstRide: 1,
        firstRating: 1,
        firstPickupTime: 1,
        firstPoolingTag: 1,
        firstStopsBeforeDropoff: 1
      }
    },
    {
      $group: {
        _id: {
          locationId: '$_id.locationId',
          locationName: '$_id.locationName'
        },
        riders: { $push: '$_id.riderId' },
        rideCounts: { $push: '$rideCount' },
        firstRides: { $push: '$firstRide' },
        firstRatings: { $push: '$firstRating' },
        firstPickupTimes: { $push: '$firstPickupTime' },
        firstPoolingTags: { $push: '$firstPoolingTag' },
        firstStopsBeforeDropoffs: { $push: '$firstStopsBeforeDropoff' }
      }
    }
    ];

    const locations = await getAdminLocations(req.user);

    const defaultJson = {
      riders: [],
      rideCounts: [],
      firstRides: [],
      firstRatings: [],
      firstPickupTimes: [],
      firstStopsBeforeDropoffs: []
    };
    const rideList = await repeatQueryLocation(req, locations, defaultJson, filterOptions, projectVars, groupOptions, 'Rides', 'cityRiderGroup', preGroupSort, addOptions);

    let oneTimers = {
      firstRides: [],
      firstRatings: [],
      firstPickupTimes: [],
      poolingRide: [],
      stopsBeforeDropoff: []
    };
    let multTimers = {
      firstRides: [],
      firstRatings: [],
      firstPickupTimes: [],
      poolingRide: [],
      stopsBeforeDropoff: []
    };
    let experienceStats = [];
    let city;
    for (let g = 0; g < rideList.length; g += 1) {
      city = rideList[g];
      oneTimers = {
        firstRides: [],
        firstRatings: [],
        firstPickupTimes: [],
        poolingRide: [],
        stopsBeforeDropoff: []
      };
      multTimers = {
        firstRides: [],
        firstRatings: [],
        firstPickupTimes: [],
        poolingRide: [],
        stopsBeforeDropoff: []
      };
      for (let i = 0; i < city.riders.length; i += 1) {
        if (city.rideCounts[i] === 1) {
          oneTimers.firstRides.push(city.firstRides[i]);
          oneTimers.firstRatings.push(city.firstRatings[i]);
          oneTimers.firstPickupTimes.push(city.firstPickupTimes[i]);
          oneTimers.poolingRide.push(city.firstPoolingTags[i]);
          oneTimers.stopsBeforeDropoff.push(city.firstStopsBeforeDropoffs[i]);
        } else {
          multTimers.firstRides.push(city.firstRides[i]);
          multTimers.firstRatings.push(city.firstRatings[i]);
          multTimers.firstPickupTimes.push(city.firstPickupTimes[i]);
          multTimers.poolingRide.push(city.firstPoolingTags[i]);
          multTimers.stopsBeforeDropoff.push(city.firstStopsBeforeDropoffs[i]);
        }
      }
      experienceStats.push({
        city: city._id.locationName,
        totalRideCount: sum(city.rideCounts),
        rideCountOne: oneTimers.firstRides.length,
        pickupTimesOneAvg: isNumber(average(oneTimers.firstPickupTimes)) ? formatTime(average(oneTimers.firstPickupTimes)) : '--',
        pickupTimesOne: isNumber(perc(oneTimers.firstPickupTimes, 0.75)) ? formatTime(perc(oneTimers.firstPickupTimes, 0.75)) : '--',
        ratingsOne: isNumber(average(oneTimers.firstRatings)) ? average(oneTimers.firstRatings).toFixed(3) : '--',
        poolingOne: oneTimers.firstRides.length ? oneTimers.poolingRide.filter(Boolean).length : '--',
        poolingOnePerc: oneTimers.firstRides.length ? Math.round((oneTimers.poolingRide.filter(Boolean).length / oneTimers.firstRides.length) * 100) : '--',
        stopsBeforeDropoffOne: isNumber(average(oneTimers.stopsBeforeDropoff.filter(isNumber)))
          ? Math.round(average(oneTimers.stopsBeforeDropoff.filter(isNumber))) : '--',
        rideCountMult: multTimers.firstRides.length,
        ratingsMult: isNumber(average(multTimers.firstRatings)) ? average(multTimers.firstRatings).toFixed(3) : '--',
        pickupTimesMultAvg: isNumber(average(multTimers.firstPickupTimes)) ? formatTime(average(multTimers.firstPickupTimes)) : '--',
        pickupTimesMult: isNumber(perc(multTimers.firstPickupTimes, 0.75)) ? formatTime(perc(multTimers.firstPickupTimes, 0.75)) : '--',
        poolingMult: multTimers.firstRides.length ? multTimers.poolingRide.filter(Boolean).length : '--',
        poolingMultPerc: multTimers.firstRides.length ? Math.round((multTimers.poolingRide.filter(Boolean).length / multTimers.firstRides.length) * 100) : '--',
        stopsBeforeDropoffMult: isNumber(average(multTimers.stopsBeforeDropoff.filter(isNumber)))
          ? Math.round(average(multTimers.stopsBeforeDropoff.filter(isNumber))) : '--'
      });
    }

    experienceStats = _.sortBy(experienceStats, 'city');

    res.status(200).json({
      experienceStats
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getPoolingStats = async (req, res) => {
  try {
    const filterOptions = {
      status: { $in: [RideStatus.RideComplete] },
      pickupTimestamp: { $ne: null },
      request: { $ne: null },
      poolingLocation: true
    };
    const projectVars = {
      poolingTag: 1,
      etaDifference: 1,
      etaMinutes: 1
    };
    const groupOptions = {
      rides: { $push: '$_id' },
      poolingTags: { $push: '$poolingTag' },
      avgETADifference: { $avg: '$etaDifference' },
      avgETA: { $avg: '$etaMinutes' }
    };

    const locations = await getAdminLocations(req.user);

    const defaultJson = {
      rides: [],
      poolingTags: []
    };
    const rideList = await repeatQueryLocation(req, locations, defaultJson, filterOptions, projectVars, groupOptions, 'Rides', 'poolingGroup');

    const minSecFormat = true;
    let pooledRideCount = 0;
    let poolingStats = [];
    let city;
    for (let g = 0; g < rideList.length; g += 1) {
      city = rideList[g];
      pooledRideCount = city.poolingTags.filter(ride => ride).length;
      poolingStats.push({
        city: city._id.locationName,
        rideCount: city.rides.length,
        pooledRide: pooledRideCount,
        pooledRidePerc: city.rides.length ? Math.round((pooledRideCount / city.rides.length) * 100) : '--',
        avgETA: formatTime(city.avgETA * 60, minSecFormat),
        avgETADifference: formatTime(city.avgETADifference * 60, minSecFormat)
      });
    }

    poolingStats = _.sortBy(poolingStats, 'city');

    res.status(200).json({
      poolingStats
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getWaitTimes,
  getRideStats,
  getRiderStats,
  getRatingStats,
  getMileStats,
  getExperienceStats,
  getPoolingStats
};
