/* eslint-disable no-await-in-loop */
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import { createRequest, createRiderLogin } from '../utils/rider';
import { createDriverLogin, driverEndpoint } from '../utils/driver';
import {
  Drivers, Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driver;
let rider1;
let rider2;
let rider3;
let riders;

let driverSocket;
let rider1Socket;
let rider2Socket;
let rider3Socket;
let rider4Socket;
let rider5Socket;
let sandbox;

let location;

const keyLoc = {
  // Driver 1
  d1a: [40.680806, -73.902878, '1610 Bushwick Ave, Brooklyn, NY 11207, USA'],
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Pooling driver capacity route', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider4Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider5Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      poolingEnabled: true,
      isUsingServiceTimes: false,
      isActive: true,
      concurrentRideLimit: 4,
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ]
    });

    driver = await createDriverLogin({
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      },
      locations: [location._id]
    }, app, request, domain, driverSocket);

    const riderSockets = [rider1Socket, rider2Socket, rider3Socket, rider4Socket, rider5Socket];
    riders = [];
    for (let i = 0; i < 5; i += 1) {
      riders.push(createRiderLogin({
        email: `rider${i + 1}@mail.com`,
        firstName: 'Rider FN',
        lastName: 'Rider LN',
        password: `Password${i + 1}`,
        location: location._id,
        dob: '2000-12-11'
      }, app, request, domain, riderSockets[i]));
    }
    riders = await Promise.all(riders);
    [rider1, rider2, rider3] = riders;
  });

  after(async () => { });

  beforeEach(async () => {
    sandbox.restore();

    await Drivers.updateOne({ _id: driver.driver._id }, { $set: { driverRideList: [] } });

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();
  });

  describe('Capacity actions #1 - Vehicle filled with first two rides', () => {
    it('Should have 2 pickups with 2 dropoffs before the next pickup', async () => {
      let ride;
      for (let i = 0; i < 3; i += 1) {
        await createRequest(
          riders[i].riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 2
        );
        await driverSearcher.search();
        ride = await Rides.findOne({ rider: riders[i].rider._id });
        sinon.assert.match(!!ride, true);
      }

      const { body: actions } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      sinon.assert.match(actions.map(item => item.stopType), [
        'pickup', 'pickup', 'dropoff', 'dropoff', 'pickup', 'dropoff'
      ]);

      return sinon.assert.match(actions.length, 6);
    });
  });
  describe('Capacity actions #2 - Vehicle not filled with first two rides', () => {
    it('Should have 3 pickups with 3 dropoffs', async () => {
      await createRequest(
        rider1.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();
      const ride1 = await Rides.findOne({ rider: rider1.rider._id });
      sinon.assert.match(!!ride1, true);

      await createRequest(
        rider2.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();
      const ride2 = await Rides.findOne({ rider: rider2.rider._id });
      sinon.assert.match(!!ride2, true);

      await createRequest(
        rider3.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 2
      );
      await driverSearcher.search();
      const ride3 = await Rides.findOne({ rider: rider3.rider._id });
      sinon.assert.match(!!ride3, true);

      const { body: actions } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      sinon.assert.match(actions.map(item => item.stopType), [
        'pickup', 'pickup', 'pickup', 'dropoff', 'dropoff', 'dropoff'
      ]);

      return sinon.assert.match(actions.length, 6);
    });
  });
  describe('Capacity actions #3 - Vehicle not filled with first 3 rides', () => {
    it('Should have 3 pickups with 3 dropoffs before the last two pickups because of stops limit', async () => {
      let ride;
      for (let i = 0; i < 5; i += 1) {
        await createRequest(
          riders[i].riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1
        );
        await driverSearcher.search();
        ride = await Rides.findOne({ rider: riders[i].rider._id });
        sinon.assert.match(!!ride, true);
      }

      const { body: actions } = await driverEndpoint('/v1/actions', 'get', driver.driverToken, app, request, domain);

      sinon.assert.match(actions.map(item => item.stopType), [
        'pickup', 'pickup', 'pickup', 'dropoff', 'dropoff', 'dropoff', 'pickup', 'pickup', 'dropoff', 'dropoff'
      ]);

      return sinon.assert.match(actions.length, 10);
    });
  });
});
