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
  d1a: [32.71997833251953, -117.16740417480469, 'Driver location #1'],
  d1b: [32.719120025634766, -117.16740417480469, 'Driver location #2'],
  // Request 1
  req1p: [32.71731186, -117.1660538, 'San Diego Central Courthouse, Union St 1100'],
  req1d: [32.71333694, -117.1534805, 'NewSchool of Architecture & Design, F St 1249'],
  // Request 2
  req2p: [32.72120667, -117.166687, '1500 State St, San Diego, CA 92101, USA'],
  req2d: [32.71012115, -117.1525269, '453 13th St, 13th St 453']
};

describe('Scenario #10', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'San Diego',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      cancelTime: 4,
      serviceArea: [
        {
          latitude: 32.731277,
          longitude: -117.181905
        },
        {
          latitude: 32.734230,
          longitude: -117.130650
        },
        {
          latitude: 32.696678,
          longitude: -117.134446
        },
        {
          latitude: 32.701163,
          longitude: -117.187053
        },
        {
          latitude: 32.731277,
          longitude: -117.181905
        }
      ]
    });

    const driverInfo = {
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      email: 'driver@mail.com',
      locations: [location._id]
    };

    ({ driver } = await createDriverLogin(driverInfo, app, request, domain, driverSocket));

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
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      // Move to location pickup ride 1
      driver = await Drivers.findOne({ _id: driver.id });
      driver.currentLocation.coordinates = [keyLoc.d1b[1], keyLoc.d1b[0]];
      await driver.save();
      driver = await Drivers.findOne({ _id: driver.id });

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
        ['pickup', 'Ride2'],
        ['dropoff', 'Ride1'],
        ['dropoff', 'Ride2']
      ]);
    });
  });
});
