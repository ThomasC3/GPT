/* eslint-disable no-await-in-loop */
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import moment from 'moment';
import app from '../../server';
import { port, domain } from '../../config';
import driverSearcher from '../../services/driverSearch';
import { createRequest, createRiderLogin } from '../utils/rider';
import {
  Locations, Requests, Rides, Routes, Drivers, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;
let rider;
let location;

const keyLoc = {
  A: [40.6810937, -73.9078617, 'Address A'],
  B: [40.6851291, -73.9148140, 'Address B']
};

describe('DriverSearcher', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();

    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isActive: true,
      poolingEnabled: false,
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ]
    });

    rider = await createRiderLogin(
      { location: location._id, email: 'rider@mail.com' },
      app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
    );
  });

  describe('Cron matching', () => {
    beforeEach(async () => {
      sandbox.restore();
      await Requests.deleteMany();
      await Rides.deleteMany();
      await Routes.deleteMany();

      await Drivers.syncIndexes();
      await Locations.syncIndexes();
    });

    it('Should cancel request as missed after 3 minutes', async () => {
      await createRequest(rider.riderToken, keyLoc.A, keyLoc.B, location, app, request, domain);

      // Before missed timeout
      await driverSearcher.search();
      const requestBeforeMissedTimeout = await Requests.findOne({ rider: rider.rider._id });
      sinon.assert.match(requestBeforeMissedTimeout.status, 100);

      // Before missed timeout (2 minutes)
      await Requests.findOneAndUpdate(
        { rider: rider.rider._id },
        { $set: { lastRetryTimestamp: moment().subtract(15, 'seconds'), requestTimestamp: moment().subtract(2, 'minutes') } }
      );
      await driverSearcher.search();
      const requestBeforeMissedTimeout2 = await Requests.findOne({ rider: rider.rider._id });
      sinon.assert.match(requestBeforeMissedTimeout2.status, 100);

      // After missed timeout (3 minutes)
      await Requests.findOneAndUpdate(
        { rider: rider.rider._id },
        { $set: { lastRetryTimestamp: moment().subtract(15, 'seconds'), requestTimestamp: moment().subtract(3, 'minutes') } }
      );
      await driverSearcher.search();
      const requestAfterMissedTimeout = await Requests.findOne({ rider: rider.rider._id });
      return sinon.assert.match(requestAfterMissedTimeout.status, 101);
    });
  });
});
