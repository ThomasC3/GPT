import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  Riders, Drivers, Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

import { createRequest } from '../utils/rider';
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
let ride1;
let ride2;
let route;

const keyLoc = {
  // Driver 1
  d1a: [41.034857, -71.944062, 'The Plaza'],
  d1b: [41.031551, -71.953954, '2nd House Rd'],
  // Request 1
  req1p: [41.032824, -71.944699, 'Sole East Beach'],
  req1d: [41.036324, -71.954825, 'Sole East Resort'],
  // Request 2
  req2p: [41.034759, -71.941856, 'Joni\'s'],
  req2d: [41.039911, -71.960877, '169 2nd House Rd']
};

describe('Scenario #7', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Hollywood',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      cancelTime: 4,
      serviceArea: [
        {
          latitude: 41.102616,
          longitude: -71.903774
        },
        {
          latitude: 41.067565,
          longitude: -71.835808
        },
        {
          latitude: 41.012256,
          longitude: -71.925227
        },
        {
          latitude: 40.988736,
          longitude: -72.039504
        },
        {
          latitude: 41.031708,
          longitude: -72.084481
        },
        {
          latitude: 41.102616,
          longitude: -71.903774
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

    ({
      driver, driverSocket
    } = await createDriverLogin(driverInfo, app, request, domain, driverSocket));

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

  before(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
  });

  describe('Route', () => {
    it('Should assign driver 1 to ride request 1', async () => {
      // Request 1
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));
      // Move to pickup
      driver.currentLocation.coordinates = [keyLoc.req1p[1], keyLoc.req1p[0]];
      await driver.save();

      ride1.status = 300;
      await ride1.save();

      route = await Routes.findOne({ driver: driver._id, active: true });
      route.stops[1].status = 'done';
      await route.save();

      // Move to location #2
      driver.currentLocation.coordinates = [keyLoc.d1b[1], keyLoc.d1b[0]];
      await driver.save();
      driver = await Drivers.findOne({ _id: driver.id });

      // Request 2
      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });

      sinon.assert.match(
        [String(ride1.driver), String(ride2.driver)],
        [String(driver._id), String(driver._id)]
      );

      const rideDict = {};
      rideDict[String(ride1._id)] = 'Ride1';
      rideDict[String(ride2._id)] = 'Ride2';

      route = await Routes.findOne({ driver: driver._id, active: true });

      const routeRides = [];
      let stop;
      for (let i = 0; i < route.stops.length; i += 1) {
        stop = route.stops[i];
        if (stop.stopType === 'pickup' || stop.stopType === 'dropoff') {
          routeRides.push([stop.stopType, rideDict[stop.ride]]);
        }
      }
      sinon.assert.match(routeRides, [
        ['pickup', 'Ride1'],
        ['dropoff', 'Ride1'],
        ['pickup', 'Ride2'],
        ['dropoff', 'Ride2']
      ]);
    });
  });
});
