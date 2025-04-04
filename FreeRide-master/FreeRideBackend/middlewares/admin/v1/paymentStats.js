import moment from 'moment';
import _ from 'lodash';
import { PaymentStatus } from '../../../models';
import { adminErrorCatchHandler } from '..';

import {
  getServiceTime,
  reduceSum,
  reduceConcat
} from '../../../utils/stats';
import { sum } from '../../../utils/math';
import { unique } from '../../../utils/array';

import {
  validateFilters,
  repeatQueryLocation,
  promocodeQuery
} from '../../../utils/query';
import { getAdminLocations } from '../utils/location';

const PAYMENT_SUCCEEDED_STATUS = PaymentStatus.properties[PaymentStatus.succeeded].name;
const PAYMENT_REFUNDED_STATUS = PaymentStatus.properties[PaymentStatus.refunded].name;
const PAYMENT_PENDING_STATUS = PaymentStatus.properties[PaymentStatus.requires_capture].name;
const PAYMENT_CANCELLED_STATUS = PaymentStatus.properties[PaymentStatus.canceled].name;

const getPaymentStats = async (req, res) => {
  try {
    const filterOptions = {
      'paymentInformation.status': {
        $in: [
          PAYMENT_SUCCEEDED_STATUS,
          PAYMENT_CANCELLED_STATUS,
          PAYMENT_PENDING_STATUS,
          PAYMENT_REFUNDED_STATUS
        ]
      }
    };
    const projectVars = {
      totalPrice: '$paymentInformation.totalPrice',
      amountRefunded: '$paymentInformation.amountRefunded',
      paymentStatus: '$paymentInformation.status',
      serviceHours: { $arrayElemAt: ['$locationInfo.serviceHours', 0] },
      timestamp: '$requestTimestamp'
    };
    const groupOptions = {
      riders: { $push: '$rideRider' },
      drivers: { $push: '$rideDriver' },
      totalPrice: { $push: '$totalPrice' },
      amountRefunded: { $push: '$amountRefunded' },
      serviceHours: { $push: '$serviceHours' },
      paymentStatus: { $push: '$paymentStatus' },
      timestamps: { $push: '$timestamp' },
      cancelled: {
        $push: {
          $cond: [
            { $eq: ['$paymentStatus', PAYMENT_CANCELLED_STATUS] },
            '$totalPrice',
            null
          ]
        }
      },
      pending: {
        $push: {
          $cond: [
            { $eq: ['$paymentStatus', PAYMENT_PENDING_STATUS] },
            '$totalPrice',
            null
          ]
        }
      },
      succeeded: {
        $push: {
          $cond: [
            { $eq: ['$paymentStatus', PAYMENT_SUCCEEDED_STATUS] },
            '$totalPrice',
            null
          ]
        }
      },
      partialCharge: {
        $push: {
          $cond: [
            { $eq: ['$paymentStatus', PAYMENT_REFUNDED_STATUS] },
            { $subtract: ['$totalPrice', '$amountRefunded'] },
            null
          ]
        }
      },
      refunded: {
        $push: {
          $cond: [
            { $eq: ['$paymentStatus', PAYMENT_REFUNDED_STATUS] },
            '$amountRefunded',
            null
          ]
        }
      }
    };

    const selectedLocationsFilter = req.query.filters?.locations;
    const locations = await getAdminLocations(req.user, selectedLocationsFilter);

    const defaultJson = {
      riders: [],
      drivers: [],
      totalPrice: [],
      amountRefunded: [],
      paymentStatus: [],
      cancelled: [],
      pending: [],
      succeeded: [],
      refunded: [],
      partialCharge: [],
      serviceHours: []
    };
    const requestList = await repeatQueryLocation(req, locations, defaultJson, filterOptions, projectVars, groupOptions, 'Requests', 'payment');

    let [
      cancelledValue, cancelledCount, pendingValue,
      pendingCount, succeededValue, succeededCount,
      driverCount, riderCount, serviceSpan, startDate,
      refundedValue, refundedCount, partialChargeValue,
      partialChargeCount, endDate, location,
      filterTimestamp, city
    ] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let [
      cancelledList, pendingList,
      succeededList, paymentStats,
      refundedList, partialChargeList,
      tsList
    ] = [[], [], [], [], [], [], []];

    for (let g = 0; g < requestList.length; g += 1) {
      city = requestList[g];
      // eslint-disable-next-line no-loop-func
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
      cancelledList = city.cancelled.filter(item => item || item === 0) || [];
      pendingList = city.pending.filter(item => item || item === 0) || [];
      succeededList = city.succeeded.filter(item => item || item === 0) || [];
      refundedList = city.refunded.filter(item => item || item === 0) || [];
      partialChargeList = city.partialCharge.filter(item => item) || [];
      [cancelledCount, cancelledValue] = [cancelledList.length, sum(cancelledList)];
      [pendingCount, pendingValue] = [pendingList.length, sum(pendingList)];
      [succeededCount, succeededValue] = [succeededList.length, sum(succeededList)];
      [refundedCount, refundedValue] = [refundedList.length, sum(refundedList)];
      [partialChargeCount, partialChargeValue] = [partialChargeList.length, sum(partialChargeList)];
      driverCount = unique(city.drivers.filter(
        // eslint-disable-next-line no-loop-func
        (item, index) => succeededList[index] || succeededList[index] === 0
          || refundedList[index] || refundedList[index] === 0
      )).length;
      riderCount = unique(city.riders.filter(
        (item, index) => succeededList[index] || succeededList[index] === 0
          || refundedList[index] || refundedList[index] === 0
      )).length;
      paymentStats.push({
        city: city._id.locationName,
        requestCount: city.paymentStatus.length,
        cancelledCount,
        cancelledValue,
        pendingCount,
        pendingValue,
        succeededCount,
        succeededValue,
        refundedCount,
        refundedValue,
        partialChargeValue,
        partialChargeCount,
        driverCount,
        riderCount,
        serviceHourCount: serviceSpan.serviceHours,
        perDriver: (succeededValue + partialChargeValue) / driverCount,
        perRider: (succeededValue + partialChargeValue) / riderCount,
        perRide: (succeededValue + partialChargeValue) / (succeededCount + partialChargeCount),
        perServiceHour: (succeededValue + partialChargeValue) / serviceSpan.serviceHours
      });
    }

    paymentStats = _.sortBy(paymentStats, 'city');

    const paymentStatsTotal = reduceSum(
      paymentStats,
      Object.keys(paymentStats[0]).filter(item => !['city', 'perRider', 'perDriver', 'perServiceHour'].includes(item))
    );

    res.status(200).json({ paymentStats, paymentStatsTotal: [paymentStatsTotal] });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getPromocodeStats = async (req, res) => {
  try {
    const filterOptions = {
      'paymentInformation.promocodeUsed': true
    };

    const projectVars = {
      locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
      locationId: { $arrayElemAt: ['$locationInfo._id', 0] },
      rider: 1,
      saved: '$paymentInformation.discount',
      promocodeId: '$paymentInformation.promocodeId',
      promocodeCode: '$paymentInformation.promocodeCode'
    };

    const groupOptions = {
      riders: { $push: '$rider' },
      saved: { $push: '$saved' }
    };

    const selectedLocationsFilter = req.query.filters?.locations;
    const locations = await getAdminLocations(req.user, selectedLocationsFilter);

    filterOptions.location = { $in: locations.map(item => item._id) };

    // Get promocode usage
    let promocodeUseList = await promocodeQuery(filterOptions, projectVars, groupOptions);
    promocodeUseList = promocodeUseList.filter(item => item._id.promocodeId);

    const filterTimestamp = validateFilters(req);

    let [days, weeks, months, startDate, endDate] = [0, 0, 0, 0, 0];
    let tsList = [];
    let promocodeStats = [];
    let promocode;
    for (let i = 0; i < promocodeUseList.length; i += 1) {
      promocode = promocodeUseList[i];
      if (!filterTimestamp) {
        tsList = promocode.timestamps;
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
      promocodeStats.push({
        city: promocode._id.locationName,
        promocodeCode: promocode._id.promocodeCode,
        promocodeUseCount: promocode.riders.length,
        riderCount: unique(promocode.riders).length,
        totalSaved: sum(promocode.saved),
        perDay: promocode.riders.length / days,
        perWeek: promocode.riders.length / weeks,
        perMonth: promocode.riders.length / months,
        timestamps: promocode.timestamps
      });
    }

    promocodeStats = _.sortBy(promocodeStats, ['city', 'promocodeCode']);

    let cityPromocodeStats;
    let total;
    let promocodeStatsTotal = locations.map((loc) => {
      cityPromocodeStats = promocodeStats.filter(current => current.city === loc.name);
      total = reduceSum(cityPromocodeStats, ['totalSaved', 'riderCount', 'promocodeUseCount']);
      if (!filterTimestamp) {
        tsList = reduceConcat(cityPromocodeStats, ['timestamps']).timestamps;
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
      return ({
        city: loc.name,
        promocodeUseCount: total.promocodeUseCount,
        riderCount: total.riderCount,
        totalSaved: total.totalSaved,
        perDay: total.promocodeUseCount / days,
        perWeek: total.promocodeUseCount / weeks,
        perMonth: total.promocodeUseCount / months
      });
    });
    promocodeStatsTotal = _.sortBy(promocodeStatsTotal, 'city');

    res.status(200).json({ promocodeStats, promocodeStatsTotal });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getTipStats = async (req, res) => {
  try {
    const selectedLocationsFilter = req.query.filters?.locations;
    const locations = await getAdminLocations(req.user, selectedLocationsFilter);

    const defaultJson = {
      tipTotal: 0,
      tipPerc: '--',
      rideCount: 0,
      tipCount: 0
    };

    const tipStats = await repeatQueryLocation(
      req,
      locations,
      defaultJson,
      { status: PAYMENT_SUCCEEDED_STATUS },
      {},
      {},
      'Tips',
      'tips'
    );
    const rideStats = await repeatQueryLocation(
      req,
      locations,
      {},
      {},
      {},
      {},
      'Rides',
      'ridesTimeline'
    ).then((result) => {
      const response = {};
      result.forEach((item) => {
        response[item._id.locationId] = item.rideCount || 0;
      });
      return response;
    });
    const sortedStats = _.sortBy(
      tipStats.map((item) => {
        const { locationId } = item._id;
        const rideCount = rideStats[locationId];
        return {
          city: item._id.locationName,
          tipTotal: item.tipTotal,
          tipPerc:
            rideCount === 0
              ? '--'
              : Math.round((item.tipCount / rideCount) * 100),
          rideCount,
          tipCount: item.tipCount
        };
      }),
      'city'
    );

    res.status(200).json({ tipStats: sortedStats });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getPaymentStats,
  getPromocodeStats,
  getTipStats
};
