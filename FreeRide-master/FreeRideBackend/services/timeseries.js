import moment from 'moment';
import { Timeseries, Rides } from '../models';
import { isNumber, calculateIntervals } from '../utils/math';
import { formatIntervalQuery } from '../utils/transformations';
import {
  rollingWindowBackwards,
  expandTimeseries, determineTag,
  latestTimeIndex
} from '../utils/timeseries';

// Get readings
export const getReadings = async (range, location, type) => (
  Timeseries.find({ timestamp: formatIntervalQuery('[]', range.start, range.end), 'metadata.location': location, type }).sort({ timestamp: 1 })
);
export const getCurrentGranularityReading = async (location, time = moment().utc()) => (
  Timeseries.findOne({ timestamp: latestTimeIndex(time), 'metadata.location': location, type: '15minAvgTimeToPickup' })
);

export const getCurrentInstantaneousReading = async (location, time = moment().utc()) => (
  Timeseries.findOne({ timestamp: latestTimeIndex(time), 'metadata.location': location, type: '1hourAvgTimeToPickup' })
);

export const getCurrentHistoricReading = async (location, time = moment().utc()) => (
  Timeseries.findOne({ timestamp: latestTimeIndex(time), 'metadata.location': location, type: '21dayIntervalTimeToPickup' })
);

export const getCurrentTag = async (location, time = moment().utc()) => {
  const intervalReading = await getCurrentHistoricReading(location, time);
  return intervalReading.measurement || 0;
};

// Build readings
export const buildGranularityTimeseries = (
  range, location, granularity = 'minute', granularitySize = 15, metric = 'timeToPickup'
) => {
  let rangeMatch;
  let groupOptions = {};
  let projectOptions = {};
  let lookupOptions = [];

  if (metric === 'timeToPickupV1') {
    rangeMatch = {
      pickupTimestamp: formatIntervalQuery('[[', `${range.start.unix() * 1000}`, `${range.end.unix() * 1000}`)
    };
    lookupOptions = [
      {
        $lookup: {
          from: 'Requests',
          localField: 'request',
          foreignField: '_id',
          as: 'request'
        }
      },
      {
        $addFields: {
          requestTimestamp: { $arrayElemAt: ['$request.requestTimestamp', 0] }
        }
      }
    ];
    groupOptions = {
      measurements: {
        $push: {
          $divide: [
            {
              $dateDiff: {
                startDate: '$requestTimestamp',
                endDate: { $toDate: { $toDouble: '$pickupTimestamp' } },
                unit: 'second'
              }
            },
            60
          ]
        }
      },
      rideIds: { $push: '$_id' }
    };
    projectOptions = {
      measurements: 1,
      rideIds: 1,
      count: { $size: '$measurements' },
      measurement: { $avg: '$measurements' },
      _id: false
    };
  } else if (metric === 'timeToPickup') {
    rangeMatch = {
      pickupTimestamp: formatIntervalQuery('[[', `${range.start.unix() * 1000}`, `${range.end.unix() * 1000}`)
    };
    groupOptions = {
      measurements: {
        $push: {
          $divide: [
            {
              $dateDiff: {
                startDate: '$requestTimestamp',
                endDate: { $toDate: { $toDouble: '$pickupTimestamp' } },
                unit: 'second'
              }
            },
            60
          ]
        }
      },
      rideIds: { $push: '$_id' }
    };
    projectOptions = {
      measurements: 1,
      rideIds: 1,
      count: { $size: '$measurements' },
      measurement: { $avg: '$measurements' },
      _id: false
    };
  }
  return Rides.aggregate([
    {
      $match: {
        ...rangeMatch,
        location
      }
    },
    ...lookupOptions,
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: { $toDate: { $toDouble: '$pickupTimestamp' } },
            unit: granularity,
            binSize: granularitySize
          }
        },
        ...groupOptions
      }
    },
    {
      $sort: {
        _id: 1
      }
    },
    {
      $project: {
        timestamp: {
          $dateAdd: {
            startDate: '$_id',
            unit: granularity,
            amount: granularitySize
          }
        },
        ...projectOptions
      }
    }
  ]);
};

// Build readings
export const buildGranularityReadings = async (range, location) => {
  const granularitySeries = await buildGranularityTimeseries(range, location);
  const granularityReadings = granularitySeries.map(window => ({
    timestamp: window.timestamp,
    measurement: window.measurement,
    type: '15minAvgTimeToPickup',
    metadata: {
      location,
      timestampType: 'pickupTimestamp',
      measurements: window.measurements,
      count: window.count,
      rideIds: window.rideIds
    }
  }));
  return granularityReadings;
};

export const buildInstantaneousReadings = async (range, location) => {
  const hourRollingWindow = rollingWindowBackwards(range, 'hour', 1);

  const requiredRange = {
    start: hourRollingWindow[0].start,
    end: hourRollingWindow.slice(-1)[0].end
  };
  const granularityReadings = await getReadings(requiredRange, location, '15minAvgTimeToPickup');

  const rollingReadings = expandTimeseries(granularityReadings, hourRollingWindow);
  const instantaneousReadings = rollingReadings
    .filter(reading => isNumber(reading.measurement))
    .map(intervals => ({
      timestamp: intervals.timestamp.toDate(),
      measurement: intervals.measurement,
      type: '1hourAvgTimeToPickup',
      metadata: { location }
    }));
  return instantaneousReadings;
};

export const buildHistoricReadings = async (range, location) => {
  const dayRollingWindow = rollingWindowBackwards(range, 'day', 21);
  const requiredRange = {
    start: dayRollingWindow[0].start,
    end: dayRollingWindow.slice(-1)[0].end
  };
  const readings = await getReadings(requiredRange, location, { $in: ['15minAvgTimeToPickup', '1hourAvgTimeToPickup'] });
  const rideReadings = readings.filter(reading => reading.type === '15minAvgTimeToPickup');
  const instantaneousReadings = readings.filter(reading => reading.type === '1hourAvgTimeToPickup');

  const expandedIntervalReadings = expandTimeseries(
    rideReadings, dayRollingWindow, calculateIntervals
  );
  const intervalReadings = expandedIntervalReadings
    .map((window) => {
      // TODO: Improve efficiency of tag calculation
      const instantaneousValue = instantaneousReadings.find(
        inst => inst.timestamp.toISOString() === window.timestamp.toISOString()
      );
      const tag = determineTag(instantaneousValue, window.measurement);
      return {
        timestamp: window.timestamp.toDate(),
        measurement: tag,
        type: '21dayIntervalTimeToPickup',
        metadata: {
          location,
          intervals: window.measurement,
          instantaneous: instantaneousValue?.measurement
        }
      };
    }).filter(reading => isNumber(reading.measurement));

  return intervalReadings;
};

// Add readings
export const addGranularityReadings = async (range, location) => (
  Timeseries.createReadings(await buildGranularityReadings(range, location))
);

export const addInstantaneousReadings = async (range, location) => (
  Timeseries.createReadings(await buildInstantaneousReadings(range, location))
);

export const addHistoricReadings = async (range, location) => (
  Timeseries.createReadings(await buildHistoricReadings(range, location))
);

// Adds all granularity readings for range and last ones for instantaneous and historic
export const addReadingsForHistory = async (range, location) => {
  const gReadings = await addGranularityReadings(range, location);
  const iReadings = await addInstantaneousReadings({ start: range.end, end: range.end }, location);
  const hReadings = await addHistoricReadings({ start: range.end, end: range.end }, location);
  return {
    granularityReadings: gReadings,
    instantaneousReadings: iReadings,
    historicReadings: hReadings,
    range
  };
};

export const addReadingsForRange = async (range, location) => {
  await addGranularityReadings(range, location);
  await addInstantaneousReadings(range, location);
  await addHistoricReadings(range, location);
};

// Adds one reading for granularity, instantaneous and historic for the last complete 15 minutes
export const addCurrentReadings = async (location, time = moment().utc()) => {
  const end = latestTimeIndex(time);
  const start = end.clone().subtract(15, 'minutes');
  const granularityReadings = await addGranularityReadings({ start, end }, location);
  const instantaneousReadings = await addInstantaneousReadings({ start: end, end }, location);
  const historicReadings = await addHistoricReadings({ start: end, end }, location);
  return {
    granularityReadings,
    instantaneousReadings,
    historicReadings,
    range: { start, end }
  };
};

// Charts
export const buildChart = async (location, timestamp) => {
  const granularityReadings = await getReadings(timestamp, location, '21dayIntervalTimeToPickup');
  const granularityWindows = rollingWindowBackwards(timestamp, 'minute', 15);

  const tagTimeseries = expandTimeseries(
    granularityReadings.map(
      reading => ({ timestamp: reading.timestamp, measurement: reading.measurement })
    ), granularityWindows
  );
  const instantaneousTimeseries = expandTimeseries(
    granularityReadings.map(
      reading => ({ timestamp: reading.timestamp, measurement: reading.metadata.instantaneous })
    ), granularityWindows
  );
  const p30Timeseries = expandTimeseries(
    granularityReadings.map(
      reading => ({ timestamp: reading.timestamp, measurement: reading.metadata.intervals.p30 })
    ), granularityWindows
  );
  const p40Timeseries = expandTimeseries(
    granularityReadings.map(
      reading => ({ timestamp: reading.timestamp, measurement: reading.metadata.intervals.p40 })
    ), granularityWindows
  );
  const p60Timeseries = expandTimeseries(
    granularityReadings.map(
      reading => ({ timestamp: reading.timestamp, measurement: reading.metadata.intervals.p60 })
    ), granularityWindows
  );
  const p70Timeseries = expandTimeseries(
    granularityReadings.map(
      reading => ({ timestamp: reading.timestamp, measurement: reading.metadata.intervals.p70 })
    ), granularityWindows
  );

  return {
    tagTimeseries,
    instantaneousTimeseries,
    p30Timeseries,
    p40Timeseries,
    p60Timeseries,
    p70Timeseries
  };
};

export default {
  // Get readings
  getReadings,
  getCurrentGranularityReading,
  getCurrentInstantaneousReading,
  getCurrentHistoricReading,
  getCurrentTag,
  // Build readings
  buildGranularityTimeseries,
  buildGranularityReadings,
  buildInstantaneousReadings,
  buildHistoricReadings,
  // Add readings
  addGranularityReadings,
  addInstantaneousReadings,
  addHistoricReadings,
  addReadingsForHistory,
  addReadingsForRange,
  addCurrentReadings,
  // Build chart
  buildChart
};
