import { expect } from 'chai';
import moment from 'moment';
import {
  rollingWindowBackwards,
  expandTimeseries, determineTag,
  latestTimeIndex
} from '../utils/timeseries';
import { calculateIntervals } from '../utils/math';
import { DATE_FORMAT_ALT as DATETIME_F } from '../utils/time';

let start;
let end;
let now;

const timeseries = [
  { timestamp: moment('2022-01-01 00:01', DATETIME_F).toDate(), measurement: 5 },
  { timestamp: moment('2022-01-01 00:10', DATETIME_F).toDate(), measurement: 10 },
  { timestamp: moment('2022-01-01 00:14', DATETIME_F).toDate(), measurement: 15 },
  { timestamp: moment('2022-01-01 00:31', DATETIME_F).toDate(), measurement: 20 },
  { timestamp: moment('2022-01-01 00:35', DATETIME_F).toDate(), measurement: 25 },
  { timestamp: moment('2022-01-01 00:46', DATETIME_F).toDate(), measurement: 30 }
];

describe('Timeseries utils', () => {
  before(async () => {
    start = moment('2022-01-01 00:00', DATETIME_F);
    end = moment('2022-01-01 01:00', DATETIME_F);
    now = moment('2022-01-01 11:15', DATETIME_F);
  });
  describe('Rolling windows', () => {
    it('generates rolling windows for 15 minute windows', async () => {
      const windowType = 'minute';
      const windowSize = 15;
      const windows = rollingWindowBackwards({ start, end }, windowType, windowSize);
      expect(windows.map(window => [window.start.format(), window.end.format()])).to.eql([
        ['2021-12-31T23:45:00+00:00', start.format()],
        ['2022-01-01T00:00:00+00:00', '2022-01-01T00:15:00+00:00'],
        ['2022-01-01T00:15:00+00:00', '2022-01-01T00:30:00+00:00'],
        ['2022-01-01T00:30:00+00:00', '2022-01-01T00:45:00+00:00'],
        ['2022-01-01T00:45:00+00:00', end.format()]
      ]);
    });
    it('generates rolling windows for 1 hour windows', async () => {
      const windowType = 'hour';
      const windowSize = 1;
      const windows = rollingWindowBackwards({ start, end }, windowType, windowSize);
      expect(windows.map(window => [window.start.format(), window.end.format()])).to.eql([
        ['2021-12-31T23:00:00+00:00', start.format()],
        ['2021-12-31T23:15:00+00:00', '2022-01-01T00:15:00+00:00'],
        ['2021-12-31T23:30:00+00:00', '2022-01-01T00:30:00+00:00'],
        ['2021-12-31T23:45:00+00:00', '2022-01-01T00:45:00+00:00'],
        ['2022-01-01T00:00:00+00:00', end.format()]
      ]);
    });
    it('generates rolling windows for 21 day windows', async () => {
      const windowType = 'day';
      const windowSize = 21;
      const windows = rollingWindowBackwards({ start, end }, windowType, windowSize);
      expect(windows.map(window => [window.start.format(), window.end.format()])).to.eql([
        ['2021-12-11T00:00:00+00:00', start.format()],
        ['2021-12-11T00:15:00+00:00', '2022-01-01T00:15:00+00:00'],
        ['2021-12-11T00:30:00+00:00', '2022-01-01T00:30:00+00:00'],
        ['2021-12-11T00:45:00+00:00', '2022-01-01T00:45:00+00:00'],
        ['2021-12-11T01:00:00+00:00', end.format()]
      ]);
    });
    it('generates last rolling window of 15 minutes', async () => {
      const windowType = 'minute';
      const windowSize = 15;
      const [lastWindow] = rollingWindowBackwards({ start: now, end: now }, windowType, windowSize);
      expect(
        [lastWindow.start.format(), lastWindow.end.format()]
      ).to.eql(
        ['2022-01-01T11:00:00+00:00', now.format()]
      );
    });
    it('generates last rolling window of 1 hour', async () => {
      const windowType = 'hour';
      const windowSize = 1;
      const [lastWindow] = rollingWindowBackwards({ start: now, end: now }, windowType, windowSize);
      expect(
        [lastWindow.start.format(), lastWindow.end.format()]
      ).to.eql(
        ['2022-01-01T10:15:00+00:00', now.format()]
      );
    });
    it('generates last rolling window of 21 days', async () => {
      const windowType = 'day';
      const windowSize = 21;
      const [lastWindow] = rollingWindowBackwards({ start: now, end: now }, windowType, windowSize);
      expect(
        [lastWindow.start.format(), lastWindow.end.format()]
      ).to.eql(
        ['2021-12-11T11:15:00+00:00', now.format()]
      );
    });
  });
  describe('Timeseries expansion', () => {
    it('expands 15 minute granularity timeseries', async () => {
      const windowType = 'minute';
      const windowSize = 15;
      const windows = rollingWindowBackwards({ start, end }, windowType, windowSize);
      const expandedTimeseries = expandTimeseries(timeseries, windows);
      expect(
        expandedTimeseries.map(reading => [reading.timestamp.format(), reading.measurement])
      ).to.eql([
        [start.format(), null],
        ['2022-01-01T00:15:00+00:00', 10],
        ['2022-01-01T00:30:00+00:00', null],
        ['2022-01-01T00:45:00+00:00', 22.5],
        [end.format(), 30]
      ]);
    });
    it('expands 1 hour granularity timeseries', async () => {
      const windowType = 'hour';
      const windowSize = 1;
      const windows = rollingWindowBackwards({ start, end }, windowType, windowSize);
      const expandedTimeseries = expandTimeseries(timeseries, windows);
      expect(
        expandedTimeseries.map(reading => [reading.timestamp.format(), reading.measurement])
      ).to.eql([
        [start.format(), null],
        ['2022-01-01T00:15:00+00:00', (5 + 10 + 15) / 3],
        ['2022-01-01T00:30:00+00:00', (5 + 10 + 15) / 3],
        ['2022-01-01T00:45:00+00:00', (5 + 10 + 15 + 20 + 25) / 5],
        [end.format(), (5 + 10 + 15 + 20 + 25 + 30) / 6]
      ]);
    });
  });
  describe('Tag calculation', () => {
    it('calculates tag with intervals', async () => {
      const intervals = {
        p30: 5,
        p40: 10,
        p60: 15,
        p70: 20
      };
      expect(determineTag({ measurement: 4 }, intervals)).to.be.eql(-2);
      expect(determineTag({ measurement: 5 }, intervals)).to.be.eql(-1);
      expect(determineTag({ measurement: 6 }, intervals)).to.be.eql(-1);
      expect(determineTag({ measurement: 10 }, intervals)).to.be.eql(0);
      expect(determineTag({ measurement: 11 }, intervals)).to.be.eql(0);
      expect(determineTag({ measurement: 15 }, intervals)).to.be.eql(1);
      expect(determineTag({ measurement: 17 }, intervals)).to.be.eql(1);
      expect(determineTag({ measurement: 20 }, intervals)).to.be.eql(2);
      expect(determineTag({ measurement: 30 }, intervals)).to.be.eql(2);
    });
    it('calculates tag for historic timeseries', async () => {
      const windowType = 'day';
      const windowSize = 21;
      const windows = rollingWindowBackwards({ start, end }, windowType, windowSize);
      const expandedIntervalReadings = expandTimeseries(
        timeseries, windows, calculateIntervals
      );
      expect(expandedIntervalReadings.map(
        reading => [
          reading.timestamp.format(),
          [
            reading.measurement.p30,
            reading.measurement.p40,
            reading.measurement.p60,
            reading.measurement.p70
          ],
          determineTag({ measurement: 10.5 }, reading.measurement)
        ]
      )).to.be.eql([
        [start.format(), [null, null, null, null], undefined],
        ['2022-01-01T00:15:00+00:00', [5, 10, 10, 15], 1],
        ['2022-01-01T00:30:00+00:00', [5, 10, 10, 15], 1],
        ['2022-01-01T00:45:00+00:00', [10, 15, 20, 20], -1],
        [end.format(), [10, 15, 20, 25], -1]
      ]);
    });
  });
  describe('Latest time index', () => {
    it('should determine latest complete 15 min time index for a specified time 11:01', async () => {
      const time = moment('2022-01-01 11:01', DATETIME_F);
      expect(latestTimeIndex(time).format()).to.equal('2022-01-01T11:00:00+00:00');
    });
    it('should determine latest complete 15 min time index for a specified time 11:00', async () => {
      const time = moment('2022-01-01 11:00', DATETIME_F);
      expect(latestTimeIndex(time).format()).to.equal('2022-01-01T11:00:00+00:00');
    });
    it('should determine latest complete 15 min time index for a specified time 10:50', async () => {
      const time = moment('2022-01-01 10:50', DATETIME_F);
      expect(latestTimeIndex(time).format()).to.equal('2022-01-01T10:45:00+00:00');
    });
  });
});
