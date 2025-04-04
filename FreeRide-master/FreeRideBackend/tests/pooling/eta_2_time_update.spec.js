/* eslint-disable no-undef */
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import moment from 'moment-timezone';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  Riders, Drivers, Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createRequest, rideEta } from '../utils/rider';
import { driverCancel, driverMoved, createDriverLogin } from '../utils/driver';
import { sleep } from '../../utils/ride';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driverSocket;
let rider1Socket;
let driverToken;
let rider2Socket;
let sandbox;
let driver;
let rider1;
let rider2;
let rider1Token;
let rider2Token;
let location;
let ride1;
let ride2;
let route1;
let eta1;
let eta2;
let lastUpdateBefore;
let lastUpdateAfter;

const keyLoc = {
  d1a: [40.192642, -8.413896, 'IPN'],
  d1b: [40.219318, -8.437634, 'Casa do Sal'],

  req1p: [40.212649, -8.442989, 'Forum Coimbra'],
  req1d: [40.216346, -8.412707, 'Celas'],

  req2p: [40.212649, -8.442989, 'Forum Coimbra'],
  req2d: [40.216346, -8.412707, 'Celas']
};

describe('ETA update', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Coimbra',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        {
          latitude: 40.226855,
          longitude: -8.454739
        },
        {
          latitude: 40.228750,
          longitude: -8.392574
        },
        {
          latitude: 40.184892,
          longitude: -8.388655
        },
        {
          latitude: 40.185754,
          longitude: -8.453012
        },
        {
          latitude: 40.226855,
          longitude: -8.454739
        }
      ]
    });

    const driverInfo = {
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      locations: [location._id]
    };

    ({ driver, driverSocket, driverToken } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));

    rider1 = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider',
      lastName: '1',
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


    rider1Token = rider1SessionResponse.accessToken;
    rider2Token = rider2SessionResponse.accessToken;

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
  });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();

    await Riders.updateRider(rider1._id, { lastCancelTimestamp: null });
    await Riders.updateRider(rider2._id, { lastCancelTimestamp: null });

    location.concurrentRideLimit = 3;
    await location.save();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('ETA with driver movement', () => {
    it('Should update after 2 minutes', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      // Fetch initial ETA
      ride1 = await Rides.findOne({ rider: rider1 });
      await rideEta(ride1, rider1Token, app, request, domain);
      await sleep(1000);
      eta1 = await rideEta(ride1, rider1Token, app, request, domain);
      const etaAtCreate = ride1.eta;

      // Last update > 2 minutes ago
      route1 = await Routes.findOne({ driver, active: true });
      route1.lastUpdate = moment(route1.lastUpdate).subtract(10, 'm').toDate();
      await route1.save();
      route1 = await Routes.findOne({ driver, active: true });
      lastUpdateBefore = route1.lastUpdate;

      // Driver moves closer to pickup
      await driverMoved(driverSocket, keyLoc.d1b[0], keyLoc.d1b[1]);

      // Fetch updated ETA
      await rideEta(ride1, rider1Token, app, request, domain);
      await sleep(1000);
      eta2 = await rideEta(ride1, rider1Token, app, request, domain);
      route1 = await Routes.findOne({ driver, active: true });
      lastUpdateAfter = route1.lastUpdate;

      driver = await Drivers.findOne({ _id: driver._id });

      ride1 = await Rides.findOne({ rider: rider1 });
      const { initialEta, eta } = ride1;

      sinon.assert.match([
        String(ride1.driver),
        driver.currentLocation.coordinates[0],
        driver.currentLocation.coordinates[1],
        lastUpdateBefore < lastUpdateAfter,
        eta1 > eta2,
        Math.round(initialEta),
        Math.round(initialEta) === Math.round(eta)
      ], [
        String(driver._id),
        keyLoc.d1b[1],
        keyLoc.d1b[0],
        true,
        true,
        Math.round(etaAtCreate),
        false
      ]);
    });
    it('Should not update if less than 2 minutes passed', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      // Fetch initial ETA
      ride1 = await Rides.findOne({ rider: rider1 });
      eta1 = await rideEta(ride1, rider1Token, app, request, domain);
      const etaAtCreate = ride1.eta;

      route1 = await Routes.findOne({ driver, active: true });
      lastUpdateBefore = route1.lastUpdate;

      // Driver moves closer to pickup
      await driverMoved(driverSocket, keyLoc.d1b[0], keyLoc.d1b[1]);

      // Fetch updated ETA
      await rideEta(ride1, rider1Token, app, request, domain);
      eta2 = await rideEta(ride1, rider1Token, app, request, domain);
      route1 = await Routes.findOne({ driver, active: true });
      lastUpdateAfter = route1.lastUpdate;

      driver = await Drivers.findOne({ _id: driver._id });

      ride1 = await Rides.findOne({ rider: rider1 });
      const { initialEta, eta } = ride1;

      sinon.assert.match([
        String(ride1.driver),
        driver.currentLocation.coordinates[0],
        driver.currentLocation.coordinates[1],
        lastUpdateBefore,
        eta1,
        Math.round(initialEta),
        Math.round(initialEta) === Math.round(eta)
      ], [
        String(driver._id),
        keyLoc.d1b[1],
        keyLoc.d1b[0],
        lastUpdateAfter,
        eta2,
        Math.round(etaAtCreate),
        true
      ]);
    });

    it('Should fix route on eta request', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      // Cancel ride 2
      ride2 = await Rides.findOne({ rider: rider2 });
      await driverCancel(driverToken, ride2._id, app, request, domain);

      // Make route inconsistent
      route1 = await Routes.findOne({ driver, active: true });
      const activeRideIdBefore = route1.activeRideId;
      for (let i = 0; i < route1.stops.length; i += 1) {
        if (String(route1.stops[i].ride) === String(ride2._id)) {
          route1.stops[i].status = 'waiting';
        }
      }
      route1.activeRideId = ride2._id;
      await route1.save();

      // Trigger ETA request by rider 1 and route fix
      ride1 = await Rides.findOne({ rider: rider1 });
      await rideEta(ride1, rider2Token, app, request, domain);
      await sleep(500);
      route1 = await Routes.findOne({ driver, active: true });
      const activeRideIdAfter = route1.activeRideId;
      let cancelCount = 0;
      route1.stops.forEach((stop) => {
        if (stop.status === 'cancelled') {
          cancelCount += 1;
        }
      });

      ride2 = await Rides.findOne({ rider: rider2 });

      sinon.assert.match([
        ride1.status,
        ride2.status,
        String(ride1.driver),
        String(ride2.driver),
        String(activeRideIdAfter),
        String(activeRideIdAfter),
        cancelCount
      ], [
        202, 204, String(driver._id), String(driver._id),
        String(activeRideIdBefore), String(ride1._id), 2
      ]);
    });
  });
  describe('ETA without driver movement', () => {
    it('Should update route after 2 minutes and return same route', async () => {
      location.concurrentRideLimit = 1;
      await location.save();

      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      await createRequest(rider2Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      // Fetch initial route and change last update > 2 minutes ago
      route1 = await Routes.findOne({ driver, active: true });
      route1.lastUpdate = moment(route1.lastUpdate).subtract(10, 'm').toDate();
      await route1.save();
      const { lastUpdate: updateTsBefore, stops: stopsBefore } = route1;

      // Fetch updated ETA
      ride1 = await Rides.findOne({ rider: rider1 });
      await rideEta(ride1, rider1Token, app, request, domain);
      await sleep(1000);
      await rideEta(ride1, rider1Token, app, request, domain);
      route1 = await Routes.findOne({ driver, active: true });
      const { lastUpdate: updateTsAfter, stops: stopsAfter } = route1;

      const beforeTypes = stopsBefore.slice(2, stopsBefore.length).map(item => item.stopType);
      const beforeRides = stopsBefore.slice(2, stopsBefore.length).map(item => String(item._id));
      const afterTypes = stopsAfter.slice(3, stopsAfter.length).map(item => item.stopType);
      const afterRides = stopsAfter.slice(3, stopsAfter.length).map(item => String(item._id));

      sinon.assert.match(updateTsAfter > updateTsBefore, true);
      sinon.assert.match(beforeTypes, afterTypes);
      sinon.assert.match(beforeRides, afterRides);
    });
  });
});
