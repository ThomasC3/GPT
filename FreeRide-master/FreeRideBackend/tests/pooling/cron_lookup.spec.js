import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import {
  Drivers, Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

import { createRequest, createRiderLogin } from '../utils/rider';
import { createDriverLogin } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driverSocket;
let rider1Socket;
let rider2Socket;
let sandbox;
let driver;
let rider1;
let rider2;
let rider1Token;
let rider2Token;
let location;

const keyLoc = {
  // Driver 1
  d1a: [32.717755, -117.169051, 'Museum of contemporary art SD'],
  // Request 1
  req1p: [32.715932, -117.167098, 'The Westin SD'],
  req1d: [32.711663, -117.137382, '99 cents only store']
};

describe('Driver arriving/arrived flow', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        {
          latitude: 32.746804,
          longitude: -117.171647
        },
        {
          latitude: 32.750081,
          longitude: -117.007942
        },
        {
          latitude: 32.658783,
          longitude: -117.020256
        },
        {
          latitude: 32.657523,
          longitude: -117.187222
        },
        {
          latitude: 32.746804,
          longitude: -117.171647
        }
      ]
    });

    ({ driver } = await createDriverLogin({
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      locations: [location._id],
      email: 'driver1@mail.com',
      password: 'Password1',
      firstName: 'Driver',
      lastName: '1',
      isAvailable: true
    }, app, request, domain, driverSocket));

    ({ riderToken: rider1Token, rider: rider1 } = await createRiderLogin({
      email: 'rider@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }, app, request, domain, rider1Socket));

    ({ riderToken: rider2Token, rider: rider2 } = await createRiderLogin({
      email: 'rider2@mail.com',
      firstName: 'Rider',
      lastName: '2',
      password: 'Password2',
      location: location._id,
      dob: '2000-12-11'
    }, app, request, domain, rider2Socket));
  });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.updateOne(
      { _id: driver._id },
      {
        $set: {
          driverRideList: [],
          isAvailable: true
        }
      }
    );

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();

    await Drivers.syncIndexes();
  });

  describe('Cron Lookup', () => {
    it('Cron should get request at first without lastRetryTimestamp', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );

      const riderRequests = await Requests.find({});
      sinon.assert.match(riderRequests.length, 1);
      const riderRequest = riderRequests[0];

      await driverSearcher.search();

      const req1 = await Requests.findOne({ _id: riderRequest.id });
      const ride1 = await Rides.findOne({ rider: rider1 });

      sinon.assert.match(String(ride1.driver), String(driver._id));
      sinon.assert.match(req1.searchRetries, 0);
      sinon.assert.match(req1.lastRetryTimestamp, null);
    });

    it('Cron should not request at 1st and has lastRetryTimestamp', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );

      const riderRequests = await Requests.find({});
      sinon.assert.match(riderRequests.length, 1);
      const riderRequest = riderRequests[0];

      await Drivers.updateDriver(driver.id, { isAvailable: false });

      await driverSearcher.search();

      const req1 = await Requests.findOne({ _id: riderRequest.id });

      driver = await Drivers.findOne({ _id: driver._id });
      const ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(ride1, null);
      sinon.assert.match(req1.searchRetries, 1);
      sinon.assert.match(!!req1.lastRetryTimestamp, true);
    });

    it('Cron should not request at 1st and has lastRetryTimestamp', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );

      await Drivers.updateDriver(driver.id, { isAvailable: false });
      await driverSearcher.search();

      let req1 = await Requests.findOne({ rider: rider1 });
      let ride1 = await Rides.findOne({ rider: rider1 });

      // No Ride match, due to no driver
      sinon.assert.match(!!ride1, false);
      sinon.assert.match(req1.searchRetries, 1);
      sinon.assert.match(!!req1.lastRetryTimestamp, true);

      // Driver is now available
      await Drivers.updateDriver(driver.id, { isAvailable: true });

      await driverSearcher.search();

      req1 = await Requests.findOne({ rider: rider1 });
      ride1 = await Rides.findOne({ rider: rider1 });

      // Still, no ride match, due to no driver, due to retry of 15s, wont be retried
      sinon.assert.match(!!ride1, false);
      sinon.assert.match(req1.searchRetries, 1);
      sinon.assert.match(!!req1.lastRetryTimestamp, true);

      // Update retry timestamp to be processed
      const fifteenSeconds = 15000;
      req1 = await Requests.updateRequest(
        { _id: req1.id },
        { lastRetryTimestamp: req1.lastRetryTimestamp - fifteenSeconds }
      );

      await createRequest(
        rider2Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );

      // both requests should be matched
      await driverSearcher.search();

      req1 = await Requests.findOne({ rider: rider1 });
      ride1 = await Rides.findOne({ rider: rider1 });
      const req2 = await Requests.findOne({ rider: rider2 });
      const ride2 = await Rides.findOne({ rider: rider2 });

      sinon.assert.match(!!ride1, true);
      sinon.assert.match(req1.searchRetries, 1);
      sinon.assert.match(!!req1.lastRetryTimestamp, true);

      sinon.assert.match(!!ride2, true);
      sinon.assert.match(req2.searchRetries, 0);
      sinon.assert.match(!!req2.lastRetryTimestamp, false);
    });
  });
});
