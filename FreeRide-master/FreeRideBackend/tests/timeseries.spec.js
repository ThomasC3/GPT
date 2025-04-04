/* eslint-disable no-await-in-loop */
import moment from 'moment';
import { expect } from 'chai';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import { port, domain } from '../config';
import {
  Settings, Locations, Requests, Rides
} from '../models';
import { emptyAllCollections, emptyCollection } from './utils/helper';
import {
  // Build timeseries
  buildGranularityTimeseries,
  // Get readings
  getReadings,
  getCurrentGranularityReading,
  getCurrentInstantaneousReading,
  getCurrentHistoricReading,
  getCurrentTag,
  // Add readings
  addGranularityReadings,
  addInstantaneousReadings,
  addHistoricReadings,
  addReadingsForRange,
  addCurrentReadings
} from '../services/timeseries';
import { latestTimeIndex } from '../utils/timeseries';

import { createDriverLogin, pickUp, dropOff } from './utils/driver';
import { createRiderLogin, createRequest } from './utils/rider';
import driverSearcher from '../services/driverSearch';
import { DATE_FORMAT_ALT } from '../utils/time';

import { addMetricHistory } from '../utils/addMetricHistory';
import { MetricsService } from '../services';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let location1;
let start;
let end;

const locationServiceArea = [[
  [3.4020295258541466, 6.664068753848554],
  [3.339544784643209, 6.657078139769771],
  [3.3362832184810998, 6.600979128639201],
  [3.4099259491939904, 6.601661221767648],
  [3.4020295258541466, 6.664068753848554]
]];

const timeseriesData = [
  [moment('2022-01-01 00:01', DATE_FORMAT_ALT), 5],
  [moment('2022-01-01 00:05', DATE_FORMAT_ALT), 5],
  [moment('2022-01-01 00:11', DATE_FORMAT_ALT), 5], // 00:15 - 5
  [moment('2022-01-01 00:15', DATE_FORMAT_ALT), 5],
  [moment('2022-01-01 00:16', DATE_FORMAT_ALT), 10],
  [moment('2022-01-01 00:20', DATE_FORMAT_ALT), 10],
  [moment('2022-01-01 00:22', DATE_FORMAT_ALT), 10], // 00:30 - 8.75
  [moment('2022-01-01 00:30', DATE_FORMAT_ALT), 10],
  [moment('2022-01-01 00:35', DATE_FORMAT_ALT), 20] // 00:45 - 15
];

describe('Timeseries service', () => {
  before('Add location and ride data', async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    location1 = await Locations.createLocation({
      name: 'Timeseries location',
      isActive: true,
      serviceArea: locationServiceArea[0].map(
        coord => ({ latitude: coord[1], longitude: coord[0] })
      )
    });

    const point = [6.632451, 3.353235, 'address'];
    const { driverToken } = await createDriverLogin({
      currentLocation: { coordinates: point.slice(0, 2).reverse(), type: 'Point' },
      locations: [location1._id]
    }, app, request, domain, io.connect(`http://localhost:${port}`, ioOptions));
    const { riderToken } = await createRiderLogin({}, app, request, domain, io.connect(`http://localhost:${port}`, ioOptions));

    for (let i = 0; i < timeseriesData.length; i += 1) {
      const data = timeseriesData[i];
      await createRequest(riderToken, point, point, location1, app, request, domain);
      await driverSearcher.search();
      const ride = await Rides.findOne({ status: { $ne: 700 } });
      await pickUp(driverToken, ride, app, request, domain);
      await dropOff(driverToken, ride, app, request, domain);
      await Rides.findOneAndUpdate({ _id: ride._id }, {
        $set: {
          createdTimestamp: data[0].clone().subtract(data[1], 'minutes').toDate(),
          pickupTimestamp: data[0].unix() * 1000,
          requestTimestamp: data[0].clone().subtract(data[1], 'minutes').toDate()
        }
      });
      await Requests.findOneAndUpdate({ _id: ride.request }, {
        $set: {
          requestTimestamp: data[0].clone().subtract(data[1], 'minutes').toDate()
        }
      });
    }

    // Last hour ride
    await createRequest(riderToken, point, point, location1, app, request, domain);
    await driverSearcher.search();
    const prevRide = await Rides.findOne({ status: { $ne: 700 } });
    await pickUp(driverToken, prevRide, app, request, domain);
    await dropOff(driverToken, prevRide, app, request, domain);
    const prevPickupTs = latestTimeIndex(moment.utc()).subtract(75, 'minute');
    await Rides.findOneAndUpdate({ _id: prevRide._id }, {
      $set: {
        createdTimestamp: prevPickupTs.clone().subtract(5, 'minutes').toDate(),
        pickupTimestamp: prevPickupTs.unix() * 1000,
        requestTimestamp: prevPickupTs.clone().subtract(5, 'minutes').toDate()
      }
    });
    await Requests.findOneAndUpdate({ _id: prevRide.request }, {
      $set: {
        requestTimestamp: prevPickupTs.clone().subtract(5, 'minutes').toDate()
      }
    });

    // Current ride
    await createRequest(riderToken, point, point, location1, app, request, domain);
    await driverSearcher.search();
    const ride = await Rides.findOne({ status: { $ne: 700 } });
    await pickUp(driverToken, ride, app, request, domain);
    await dropOff(driverToken, ride, app, request, domain);
    const pickupTs = latestTimeIndex(moment.utc()).subtract(2, 'minute');
    await Rides.findOneAndUpdate({ _id: ride._id }, {
      $set: {
        createdTimestamp: pickupTs.clone().subtract(10, 'minutes').toDate(),
        pickupTimestamp: pickupTs.unix() * 1000,
        requestTimestamp: pickupTs.clone().subtract(10, 'minutes').toDate()
      }
    });
    await Requests.findOneAndUpdate({ _id: ride.request }, {
      $set: {
        requestTimestamp: pickupTs.clone().subtract(10, 'minutes').toDate()
      }
    });
  });
  describe('Measurement processing', () => {
    before(() => {
      start = moment('2022-01-01 00:00', DATE_FORMAT_ALT);
      end = moment('2022-01-01 02:00', DATE_FORMAT_ALT);
    });
    beforeEach(async () => {
      await emptyCollection('Timeseries');
    });
    it('creates granularity, instantaneous and historic measurements', async () => {
      const v1 = await buildGranularityTimeseries({ start, end }, location1._id, 'minute', 15, 'timeToPickupV1');
      const v2 = await buildGranularityTimeseries({ start, end }, location1._id, 'minute', 15, 'timeToPickup');
      expect(
        v1.map(reading => [reading.timestamp.toISOString(), reading.measurement])
      ).to.be.eql([
        ['2022-01-01T00:15:00.000Z', 5],
        ['2022-01-01T00:30:00.000Z', 8.75],
        ['2022-01-01T00:45:00.000Z', 15]
      ]);
      expect(
        v2.map(reading => [reading.timestamp.toISOString(), reading.measurement])
      ).to.be.eql([
        ['2022-01-01T00:15:00.000Z', 5],
        ['2022-01-01T00:30:00.000Z', 8.75],
        ['2022-01-01T00:45:00.000Z', 15]
      ]);
    });
    it('creates granularity, instantaneous and historic measurements', async () => {
      await addGranularityReadings({ start, end }, location1._id);
      await addInstantaneousReadings({ start, end }, location1._id);
      await addHistoricReadings({ start, end }, location1._id);

      const rideReadings = await getReadings({ start, end }, location1._id, '15minAvgTimeToPickup');
      expect(
        rideReadings.map(reading => [reading.timestamp.toISOString(), reading.measurement])
      ).to.be.eql([
        ['2022-01-01T00:15:00.000Z', 5],
        ['2022-01-01T00:30:00.000Z', 8.75],
        ['2022-01-01T00:45:00.000Z', 15]
      ]);
      const avg21dayReadings = await getReadings(
        { start, end }, location1._id, '21dayIntervalTimeToPickup'
      );
      expect(avg21dayReadings).to.be.lengthOf(6);
      expect(avg21dayReadings.map(
        reading => [
          reading.timestamp.toISOString(),
          reading.metadata.instantaneous,
          [
            reading.metadata.intervals.p30,
            reading.metadata.intervals.p40,
            reading.metadata.intervals.p60,
            reading.metadata.intervals.p70
          ],
          reading.measurement
        ]
      )).to.be.eql([
        ['2022-01-01T00:15:00.000Z', 5, [5, 5, 5, 5], 2], // inst = 5
        ['2022-01-01T00:30:00.000Z', (5 + 8.75) / 2, [5, 5, 8.75, 8.75], 0], // inst = 6.875
        ['2022-01-01T00:45:00.000Z', (5 + 8.75 + 15) / 3, [5, 8.75, 8.75, 15], 1], // inst = 9,583
        ['2022-01-01T01:00:00.000Z', (5 + 8.75 + 15) / 3, [5, 8.75, 8.75, 15], 1], // inst = 9,583
        ['2022-01-01T01:15:00.000Z', (8.75 + 15) / 2, [5, 8.75, 8.75, 15], 1], // inst = 11,875
        ['2022-01-01T01:30:00.000Z', 15, [5, 8.75, 8.75, 15], 2] // inst = 15
      ]);
    });
    it('creates all measurements for windows ending in the last complete 15 minutes', async () => {
      const now = moment('2022-01-01 00:31', DATE_FORMAT_ALT);
      await addCurrentReadings(location1._id, now);

      const currentGranularityReading = await getCurrentGranularityReading(location1._id, now);
      expect(currentGranularityReading.measurement).to.equal(8.75);
      const currentReading = await getCurrentInstantaneousReading(location1._id, now);
      expect(currentReading.measurement).to.equal(8.75);
      const intervalReading = await getCurrentHistoricReading(location1._id, now);
      expect([
        intervalReading.metadata.intervals.avg,
        intervalReading.metadata.intervals.p70,
        intervalReading.measurement
      ]).to.eql([8.75, 8.75, 2]);
      const tag = await getCurrentTag(location1._id, now);
      expect(tag).to.equal(2);
    });
    it('creates all measurements for the specified range', async () => {
      await addReadingsForRange({ start, end }, location1._id);

      const granularityReadings = await getReadings({ start, end }, location1._id, '15minAvgTimeToPickup');
      expect(
        granularityReadings.map(reading => [reading.timestamp.toISOString(), reading.measurement])
      ).to.be.eql([
        ['2022-01-01T00:15:00.000Z', 5],
        ['2022-01-01T00:30:00.000Z', 8.75],
        ['2022-01-01T00:45:00.000Z', 15]
      ]);
      const instantaneousReadings = await getReadings({ start, end }, location1._id, '1hourAvgTimeToPickup');
      expect(
        instantaneousReadings.map(reading => [reading.timestamp.toISOString(), reading.measurement])
      ).to.be.eql([
        ['2022-01-01T00:15:00.000Z', 5],
        ['2022-01-01T00:30:00.000Z', (5 + 8.75) / 2],
        ['2022-01-01T00:45:00.000Z', (5 + 8.75 + 15) / 3],
        ['2022-01-01T01:00:00.000Z', (5 + 8.75 + 15) / 3],
        ['2022-01-01T01:15:00.000Z', (8.75 + 15) / 2],
        ['2022-01-01T01:30:00.000Z', 15]
      ]);
      const historicReadings = await getReadings({ start, end }, location1._id, '21dayIntervalTimeToPickup');
      expect(
        historicReadings.map(reading => [
          reading.timestamp.toISOString(),
          [
            reading.metadata.intervals.p30,
            reading.metadata.intervals.p40,
            reading.metadata.intervals.p60,
            reading.metadata.intervals.p70
          ],
          reading.metadata.instantaneous,
          reading.measurement
        ])
      ).to.be.eql([
        ['2022-01-01T00:15:00.000Z', [5, 5, 5, 5], 5, 2],
        ['2022-01-01T00:30:00.000Z', [5, 5, 8.75, 8.75], (5 + 8.75) / 2, 0],
        ['2022-01-01T00:45:00.000Z', [5, 8.75, 8.75, 15], (5 + 8.75 + 15) / 3, 1],
        ['2022-01-01T01:00:00.000Z', [5, 8.75, 8.75, 15], (5 + 8.75 + 15) / 3, 1],
        ['2022-01-01T01:15:00.000Z', [5, 8.75, 8.75, 15], (8.75 + 15) / 2, 1],
        ['2022-01-01T01:30:00.000Z', [5, 8.75, 8.75, 15], 15, 2]
      ]);
    });
    it('should not add same metric twice', async () => {
      await addReadingsForRange({ start, end }, location1._id);

      const granularityReadings = await getReadings({ start, end }, location1._id, '15minAvgTimeToPickup');
      expect(granularityReadings).to.be.lengthOf(3);
      const instantaneousReadings = await getReadings({ start, end }, location1._id, '1hourAvgTimeToPickup');
      expect(instantaneousReadings).to.be.lengthOf(6);
      const historicReadings = await getReadings({ start, end }, location1._id, '21dayIntervalTimeToPickup');
      expect(historicReadings).to.be.lengthOf(6);

      await addReadingsForRange({ start, end }, location1._id);

      const granularityReadingsAfter = await getReadings({ start, end }, location1._id, '15minAvgTimeToPickup');
      expect(granularityReadingsAfter).to.be.lengthOf(3);
      const instantaneousReadingsAfter = await getReadings({ start, end }, location1._id, '1hourAvgTimeToPickup');
      expect(instantaneousReadingsAfter).to.be.lengthOf(6);
      const historicReadingsAfter = await getReadings({ start, end }, location1._id, '21dayIntervalTimeToPickup');
      expect(historicReadingsAfter).to.be.lengthOf(6);
    });
  });
  describe('Timeseries cron job and script', () => {
    beforeEach(async () => {
      await emptyCollection('Timeseries');
    });
    it('should run script correctly', async () => {
      await addMetricHistory();

      const now = latestTimeIndex(moment.utc());
      const windowStart = now.clone().subtract(21, 'days');

      const granularityReadings = await getReadings({ start: windowStart, end: now }, location1._id, '15minAvgTimeToPickup');
      expect(granularityReadings).to.be.lengthOf(2);
      const granularityReading = await getCurrentGranularityReading(location1._id);
      expect(granularityReading.measurement).to.equal(10);
      expect(granularityReading.metadata.measurements).to.be.lengthOf(1);

      const instantaneousReadings = await getReadings({ start: windowStart, end: now }, location1._id, '1hourAvgTimeToPickup');
      expect(instantaneousReadings).to.be.lengthOf(1);
      const instantaneousReading = await getCurrentInstantaneousReading(location1._id);
      expect(instantaneousReading.measurement).to.equal(10);

      const historicReading = await getCurrentHistoricReading(location1._id);
      expect(historicReading.measurement).to.equal(2);
      expect(historicReading.metadata.intervals).to.eql({
        avg: 7.5, p30: 5, p40: 5, p60: 10, p70: 10
      });
    });
    it('should run cron job correctly', async () => {
      await MetricsService.update();

      const granularityReadingsAfter = await getCurrentGranularityReading(location1._id);
      expect(granularityReadingsAfter.measurement).to.equal(10);
      expect(granularityReadingsAfter.metadata.measurements).to.be.lengthOf(1);
      const instantaneousReadingsAfter = await getCurrentInstantaneousReading(location1._id);
      expect(instantaneousReadingsAfter.measurement).to.equal(10);
      const historicReadingsAfter = await getCurrentHistoricReading(location1._id);
      expect(historicReadingsAfter.measurement).to.equal(2);
      expect(historicReadingsAfter.metadata.intervals).to.eql({
        avg: 10, p30: 10, p40: 10, p60: 10, p70: 10
      });
    });
  });
});
