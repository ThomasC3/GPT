import moment from 'moment';
import { average, isNumber } from './math';

// The function rollingWindowBackwards determines the rolling windows of a given size,
// moving by a given granularity and that end within the provided range.
export const rollingWindowBackwards = (range, windowType, windowSize, granularity = 'minutes', granularitySize = 15) => {
  const { start, end } = range;
  const windows = [];
  const windowShift = moment.duration(granularitySize, granularity);
  const windowRange = moment.duration(windowSize, windowType);
  let windowEnd = end.clone();
  let windowStart = windowEnd.clone().subtract(windowRange);
  do {
    windows.push({ start: windowStart.clone(), end: windowEnd.clone() });
    windowEnd = windowEnd.subtract(windowShift);
    windowStart = windowStart.subtract(windowShift);
  } while (windowEnd >= start);
  return windows.reverse();
};

// The function expandTimeseries changes the granularity and/or content of a given "timeseries".
// For each window, the measurements that fall within are processed into a single measurement,
// using the "func" method, and indexed at the end of the window.
export const expandTimeseries = (timeseries, windows, func = average, args = [], addArgs = {}) => (
  windows.map(
    window => ({
      measurement: func(
        timeseries.filter(reading => (
          moment(reading.timestamp) > moment(window.start)
          && moment(reading.timestamp) <= moment(window.end)
        )).map(item => item.measurement),
        ...args
      ),
      instMeasurement: addArgs.instantaneousReadings?.find(reading => (
        moment(reading.timestamp) === moment(window.end)
      ))?.measurement,
      timestamp: window.end
    })
  )
);

export const determineTag = (instantaneousReading, intervals) => {
  if (!isNumber(instantaneousReading?.measurement) || !isNumber(intervals?.p30)) {
    return undefined;
  }

  // Not busy x < p30
  if (instantaneousReading.measurement < intervals.p30) {
    return -2;
  }
  // Less busy p30 <= x < p40
  if (
    instantaneousReading.measurement >= intervals.p30
    && instantaneousReading.measurement < intervals.p40
  ) {
    return -1;
  }
  // Normal p40 <= x < p60
  if (
    instantaneousReading.measurement >= intervals.p40
    && instantaneousReading.measurement < intervals.p60
  ) {
    return 0;
  }
  // Busy p60 <= x < p70
  if (
    instantaneousReading.measurement >= intervals.p60
    && instantaneousReading.measurement < intervals.p70
  ) {
    return 1;
  }
  // Very busy x >= p70
  if (instantaneousReading.measurement >= intervals.p70) {
    return 2;
  }
  return undefined;
};

export const latestTimeIndex = time => (
  time.clone().startOf('hour').add(Math.floor((time.minute() / 15)) * 15, 'minutes')
);

export default {
  rollingWindowBackwards,
  expandTimeseries,
  determineTag,
  latestTimeIndex
};
