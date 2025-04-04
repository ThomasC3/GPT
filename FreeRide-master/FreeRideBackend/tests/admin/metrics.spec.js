/* eslint-disable no-await-in-loop */
import moment from 'moment';
import { expect } from 'chai';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Settings, Locations, Requests, Rides
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { addReadingsForRange, addCurrentReadings } from '../../services/timeseries';
import { latestTimeIndex } from '../../utils/timeseries';
import { DATE_FORMAT_ALT as DATETIME_F } from '../../utils/time';
import { createDriverLogin, pickUp, dropOff } from '../utils/driver';
import { createRiderLogin, createRequest } from '../utils/rider';
import { createAdminLogin, adminEndpoint } from '../utils/admin';
import driverSearcher from '../../services/driverSearch';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let location1;
let adminToken;
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
  [moment('2022-01-01 00:01', DATETIME_F), 5],
  [moment('2022-01-01 00:05', DATETIME_F), 5],
  [moment('2022-01-01 00:11', DATETIME_F), 5], // 00:15 - 5
  [moment('2022-01-01 00:15', DATETIME_F), 5],
  [moment('2022-01-01 00:16', DATETIME_F), 10],
  [moment('2022-01-01 00:20', DATETIME_F), 10],
  [moment('2022-01-01 00:22', DATETIME_F), 10], // 00:30 - 8.75
  [moment('2022-01-01 00:30', DATETIME_F), 10],
  [moment('2022-01-01 00:35', DATETIME_F), 20] // 00:45 - 15
];

describe('Admin dashboard tag metrics', () => {
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

    await createRequest(riderToken, point, point, location1, app, request, domain);
    await driverSearcher.search();
    const ride = await Rides.findOne({ status: { $ne: 700 } });
    await pickUp(driverToken, ride, app, request, domain);
    await dropOff(driverToken, ride, app, request, domain);
    const pickupTs = latestTimeIndex(moment.utc()).subtract(2, 'minute');
    await Rides.findOneAndUpdate({ _id: ride._id }, {
      $set: {
        createdTimestamp: pickupTs.clone().subtract(10, 'minutes').toDate(),
        pickupTimestamp: pickupTs.unix() * 1000
      }
    });
    await Requests.findOneAndUpdate({ _id: ride.request }, {
      $set: {
        requestTimestamp: pickupTs.clone().subtract(10, 'minutes').toDate()
      }
    });

    ({ adminToken } = await createAdminLogin(
      { locations: [location1._id] }
    ));
  });
  describe('Activity dashboard tag metrics', () => {
    before('Add timeseries data', async () => {
      start = moment('2022-01-01 00:00', DATETIME_F);
      end = moment('2022-01-01 02:00', DATETIME_F);
      await addReadingsForRange({ start, end }, location1._id);
      await addCurrentReadings(location1._id);
    });
    it('should return lastest tag info', async () => {
      const { body } = await adminEndpoint(`/v1/metrics?location=${location1._id}`, 'get', adminToken, app, request, domain);
      expect(body.location).to.equal(`${location1._id}`);
      expect(body.type).to.equal('21dayIntervalTimeToPickup');
      expect(body.measurement).to.equal(2);
    });
    it('should return tag info for specific time', async () => {
      const timestamp = '2022-01-01 01:15';
      const { body } = await adminEndpoint(`/v1/metrics?location=${location1._id}&timestamp=${timestamp}`, 'get', adminToken, app, request, domain);
      expect(body.timestamp).to.equal('2022-01-01T01:15:00.000Z');
      expect(body.location).to.equal(`${location1._id}`);
      expect(body.instantaneous).to.equal((8.75 + 15) / 2);
      expect(body.p30).to.equal(5);
      expect(body.p40).to.equal(8.75);
      expect(body.p60).to.equal(8.75);
      expect(body.p70).to.equal(15);
      expect(body.type).to.equal('21dayIntervalTimeToPickup');
      expect(body.measurement).to.equal(1);
    });
    it('should return chart data for range', async () => {
      const { body } = await adminEndpoint(
        `/v1/metrics/chart?location=${location1._id}&timestamp[start]=${start.format(DATETIME_F)}&timestamp[end]=${end.format(DATETIME_F)}`,
        'get', adminToken, app, request, domain
      );
      expect(body.tagTimeseries).to.lengthOf(9);
      expect(body.tagTimeseries).to.eql([
        { measurement: null, timestamp: '2022-01-01T00:00:00.000Z' },
        { measurement: 2, timestamp: '2022-01-01T00:15:00.000Z' },
        { measurement: 0, timestamp: '2022-01-01T00:30:00.000Z' },
        { measurement: 1, timestamp: '2022-01-01T00:45:00.000Z' },
        { measurement: 1, timestamp: '2022-01-01T01:00:00.000Z' },
        { measurement: 1, timestamp: '2022-01-01T01:15:00.000Z' },
        { measurement: 2, timestamp: '2022-01-01T01:30:00.000Z' },
        { measurement: null, timestamp: '2022-01-01T01:45:00.000Z' },
        { measurement: null, timestamp: '2022-01-01T02:00:00.000Z' }
      ]);
      expect(body.p70Timeseries).to.lengthOf(9);
      expect(body.p70Timeseries).to.eql([
        { measurement: null, timestamp: '2022-01-01T00:00:00.000Z' },
        { measurement: 5, timestamp: '2022-01-01T00:15:00.000Z' },
        { measurement: 8.75, timestamp: '2022-01-01T00:30:00.000Z' },
        { measurement: 15, timestamp: '2022-01-01T00:45:00.000Z' },
        { measurement: 15, timestamp: '2022-01-01T01:00:00.000Z' },
        { measurement: 15, timestamp: '2022-01-01T01:15:00.000Z' },
        { measurement: 15, timestamp: '2022-01-01T01:30:00.000Z' },
        { measurement: null, timestamp: '2022-01-01T01:45:00.000Z' },
        { measurement: null, timestamp: '2022-01-01T02:00:00.000Z' }
      ]);
      expect(body.instantaneousTimeseries).to.lengthOf(9);
      expect(body.instantaneousTimeseries).to.eql([
        { measurement: null, timestamp: '2022-01-01T00:00:00.000Z' },
        { measurement: 5, timestamp: '2022-01-01T00:15:00.000Z' },
        { measurement: (5 + 8.75) / 2, timestamp: '2022-01-01T00:30:00.000Z' },
        { measurement: (5 + 8.75 + 15) / 3, timestamp: '2022-01-01T00:45:00.000Z' },
        { measurement: (5 + 8.75 + 15) / 3, timestamp: '2022-01-01T01:00:00.000Z' },
        { measurement: (8.75 + 15) / 2, timestamp: '2022-01-01T01:15:00.000Z' },
        { measurement: 15, timestamp: '2022-01-01T01:30:00.000Z' },
        { measurement: null, timestamp: '2022-01-01T01:45:00.000Z' },
        { measurement: null, timestamp: '2022-01-01T02:00:00.000Z' }
      ]);
    });
  });
});
