/* eslint-disable no-undef */
import sinon from 'sinon';
import { expect } from 'chai';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  createRequest,
  riderCancel,
  requestCancel
} from '../utils/rider';
import {
  pickUp,
  dropOff,
  driverCancel,
  createDriverLogin
} from '../utils/driver';
import {
  Riders, Drivers, Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driver;
let driverSocket;
let rider1Socket;
let rider2Socket;
let rider3Socket;
let sandbox;
let rider1;
let rider2;
let rider3;
let driverToken;
let rider1Token;
let rider2Token;
let rider3Token;
let location;

const keyLoc = {
  // Driver 1
  d1a: [40.680806, -73.902878, '1610 Bushwick Ave, Brooklyn, NY 11207, USA'],
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA'],
  // Request 2
  req2p: [40.686650, -73.913063, '115-57 Eldert St, Brooklyn, NY 11207, USA'],
  req2d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA'],
  // Request 3
  req3p: [40.686650, -73.913063, '115-57 Eldert St, Brooklyn, NY 11207, USA'],
  req3d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Route updates on change from pooling to non-pooling and back', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      poolingEnabled: true,
      serviceArea: [
        {
          longitude: -73.978573,
          latitude: 40.721239
        },
        {
          longitude: -73.882936,
          latitude: 40.698337
        },
        {
          longitude: -73.918642,
          latitude: 40.629585
        },
        {
          longitude: -73.978573,
          latitude: 40.660845
        },
        {
          longitude: -73.978573,
          latitude: 40.721239
        }
      ]
    });

    const driverInfo = {
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      locations: [location._id],
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      }
    };

    ({ driver, driverToken, driverSocket } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));

    rider1 = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    rider2 = await new Riders({
      email: 'rider2@mail.com',
      firstName: 'Rider',
      lastName: '2',
      password: 'Password2',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    rider3 = await new Riders({
      email: 'rider3@mail.com',
      firstName: 'Rider',
      lastName: '3',
      password: 'Password3',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const rider1SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider1@mail.com', password: 'Password1' })
      .expect(200)
      .end()
      .get('body');

    const rider2SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider2@mail.com', password: 'Password2' })
      .expect(200)
      .end()
      .get('body');

    const rider3SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider3@mail.com', password: 'Password3' })
      .expect(200)
      .end()
      .get('body');

    rider1Token = rider1SessionResponse.accessToken;
    rider2Token = rider2SessionResponse.accessToken;
    rider3Token = rider3SessionResponse.accessToken;

    rider1Socket
      .emit('authenticate', { token: rider1Token })
      .on('authenticated', () => {
        logger.debug('RIDER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider2Socket
      .emit('authenticate', { token: rider2Token })
      .on('authenticated', () => {
        logger.debug('RIDER2 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider3Socket
      .emit('authenticate', { token: rider3Token })
      .on('authenticated', () => {
        logger.debug('RIDER3 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  after(async () => { });

  afterEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
    rider3Socket.removeAllListeners();
  });

  beforeEach(async () => {
    await Riders.updateRider(rider1._id, { lastCancelTimestamp: null });
    await Riders.updateRider(rider2._id, { lastCancelTimestamp: null });
    await Riders.updateRider(rider3._id, { lastCancelTimestamp: null });
  });

  describe('Pooling change', () => {
    it('Should have cancelled rides on both non-pooling and pooling', async () => {
      // Location pooling true
      location = await Locations.findOneAndUpdate(
        { _id: location._id }, { $set: { poolingEnabled: true } }, { new: true, upsert: false }
      );
      location = await Locations.findOne({ _id: location._id });
      sinon.assert.match(location.poolingEnabled, true);

      // Request 1
      const request1 = await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );

      // Request 2
      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain
      );
      await driverSearcher.search();

      // Request 3
      await createRequest(
        rider3Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain
      );
      await driverSearcher.search();

      // Location pooling false
      location = await Locations.findOneAndUpdate(
        { _id: location._id }, { $set: { poolingEnabled: false } }, { new: true, upsert: false }
      );
      location = await Locations.findOne({ _id: location._id });
      sinon.assert.match(location.poolingEnabled, false);

      // All rides assigned a driver
      let ride1 = await Rides.findOne({ rider: rider1 });
      let ride2 = await Rides.findOne({ rider: rider2 });
      let ride3 = await Rides.findOne({ rider: rider3 });
      sinon.assert.match(ride1.driver, driver._id);
      sinon.assert.match(ride2.driver, driver._id);
      sinon.assert.match(ride3.driver, driver._id);

      // Location pooling false
      location = await Locations.findOneAndUpdate(
        { _id: location._id }, { $set: { poolingEnabled: false } }, { new: true, upsert: false }
      );
      location = await Locations.findOne({ _id: location._id });
      sinon.assert.match(location.poolingEnabled, false);

      const routeAfterRequests = await Routes.findOne();
      expect(routeAfterRequests.stops.length).to.equal(3 * 2 + 3);

      // Cancelling all rides
      await requestCancel(request, app, domain, rider1Token, request1);
      const routeAfterFirstCancel = await Routes.findOne({ active: true });
      expect(routeAfterFirstCancel.stops.length).to.equal(3 * 2 + 4);

      await driverCancel(driverToken, ride2._id, app, request, domain);
      const routeAfterSecondCancel = await Routes.findOne({ active: true });
      expect(routeAfterSecondCancel.stops.length).to.equal(3 * 2 + 5);

      await riderCancel(rider3Socket, rider3Socket, ride3);
      const routeAfterLastCancel = await Routes.findOne({ active: false });
      expect(routeAfterLastCancel.stops.length).to.equal(3 * 2 + 5);

      // Check rides statuses
      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });
      ride3 = await Rides.findOne({ rider: rider3 });
      sinon.assert.match(ride1.status, 101);
      sinon.assert.match(ride2.status, 204);
      sinon.assert.match(ride2.cancelledBy, 'DRIVER');
      sinon.assert.match(ride3.status, 207);
      sinon.assert.match(ride3.cancelledBy, 'RIDER');

      await request(app)
        .get('/v1/rides/queue')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${driverToken}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((queue) => {
          sinon.assert.match(queue.length, 0);
          return queue;
        });

      const routeBefore = await Routes.findOne({ driver: driver._id, active: false });
      sinon.assert.match(routeBefore.stops.length, 11);

      const routeAfter = await Routes.findOne({ driver: driver._id, active: true });
      return sinon.assert.match(routeAfter, null);
    });
    it('Should have pick up rides', async () => {
      // Location pooling true
      location = await Locations.findOneAndUpdate(
        { _id: location._id }, { $set: { poolingEnabled: true } }, { new: true, upsert: false }
      );
      location = await Locations.findOne({ _id: location._id });
      sinon.assert.match(location.poolingEnabled, true);

      // Request 1
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      // Location pooling false
      location = await Locations.findOneAndUpdate(
        { _id: location._id }, { $set: { poolingEnabled: false } }, { new: true, upsert: false }
      );
      location = await Locations.findOne({ _id: location._id });
      sinon.assert.match(location.poolingEnabled, false);

      // Pick up ride 1
      logger.debug('Picking up rider 1...');
      let ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(ride1.driver, driver._id);
      await pickUp(driverToken, ride1, app, request, domain);

      // Check ride 1 status
      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(ride1.status, 300);
      logger.debug('Rider 1 picked up...');

      await request(app)
        .get('/v1/rides/queue')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${driverToken}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((queue) => {
          sinon.assert.match(queue.length, 1);
          return queue;
        });

      // Should have route created and with pick up done
      const route1 = await Routes.findOne({ driver: driver._id, active: true });
      sinon.assert.match(route1.stops.length, 3);
      sinon.assert.match(route1.stops[1].stopType, 'pickup');
      return sinon.assert.match(route1.stops[1].status, 'done');
    });
    it('Should drop off rides', async () => {
      // Location pooling true
      location = await Locations.findOneAndUpdate(
        { _id: location._id }, { $set: { poolingEnabled: true } }, { new: true, upsert: false }
      );
      location = await Locations.findOne({ _id: location._id });
      sinon.assert.match(location.poolingEnabled, true);

      // Request 1
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      // Location pooling false
      location = await Locations.findOneAndUpdate(
        { _id: location._id }, { $set: { poolingEnabled: false } }, { new: true, upsert: false }
      );
      location = await Locations.findOne({ _id: location._id });
      sinon.assert.match(location.poolingEnabled, false);

      // Picking up and dropping off ride 1
      logger.debug('Dropping off rider 1...');
      let ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(ride1.driver, driver._id);
      await pickUp(driverToken, ride1, app, request, domain);
      await dropOff(driverToken, ride1, app, request, domain);

      // Check ride 1 status
      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(ride1.status, 700);

      logger.debug('Rider 1 dropped off...');

      await request(app)
        .get('/v1/rides/queue')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${driverToken}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((queue) => {
          sinon.assert.match(queue.length, 0);
          return queue;
        });

      // Should have route created and have drop off done
      const routeBefore = await Routes.findOne({ driver: driver._id, active: false });
      sinon.assert.match(routeBefore.stops.length, 3);
      sinon.assert.match(routeBefore.stops[2].stopType, 'dropoff');

      const routeAfter = await Routes.findOne({ driver: driver._id, active: true });
      return sinon.assert.match(routeAfter, null);
    });
    it('Should not have routes created on non-pooling', async () => {
      // Location pooling false
      location = await Locations.findOneAndUpdate(
        { _id: location._id }, { $set: { poolingEnabled: false } }, { new: true, upsert: false }
      );
      location = await Locations.findOne({ _id: location._id });
      sinon.assert.match(location.poolingEnabled, false);

      // Request 1
      const request1 = await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      // Request 2
      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain
      );
      await driverSearcher.search();

      // Request 3
      await createRequest(
        rider3Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain
      );
      await driverSearcher.search();

      // Request 1 and 2 assigned
      let ride1 = await Rides.findOne({ rider: rider1 });
      let ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(ride1.driver, driver._id);
      sinon.assert.match(ride2.driver, driver._id);

      // Request 3 could not be assigned a driver
      const ride3 = await Rides.findOne({ rider: rider3 });
      sinon.assert.match(ride3, null);

      // Cancel both rides
      logger.debug('Cancelling...');
      await requestCancel(request, app, domain, rider1Token, request1);
      logger.debug('Cancelled ride1');
      await driverCancel(driverToken, ride2._id, app, request, domain);
      logger.debug('Cancelled ride2');

      // Check rides statuses
      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(ride1.status, 101);
      sinon.assert.match(ride2.status, 204);
      sinon.assert.match(ride2.cancelledBy, 'DRIVER');

      await request(app)
        .get('/v1/rides/queue')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${driverToken}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((queue) => {
          sinon.assert.match(queue.length, 0);
          return queue;
        });

      // Should not have created any route
      const routeBefore = await Routes.findOne({ driver: driver._id, active: false });
      sinon.assert.match(routeBefore, null);

      const routeAfter = await Routes.findOne({ driver: driver._id, active: true });
      return sinon.assert.match(routeAfter, null);
    });
  });
});
