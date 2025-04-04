import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createRequest, createRiderLogin } from '../utils/rider';
import { createDriverLogin } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver1Socket;
let driver2Socket;
let rider1Socket;
let rider2Socket;
let sandbox;
let driver1;
let driver2;
let rider1;
let rider2;
let rider1Token;
let rider2Token;
let location;
let ride1;
let ride2;
let route1;
let route2;

const keyLoc = {
  // Driver 1
  d1a: [41.037142, -71.94371, 'S Emory Street'],
  // Driver 2
  d2a: [41.0331, -71.947482, 'Lions Field Park'],
  // Request 1
  req1p: [41.036725, -71.944118, 'Montauk Brewing Company'],
  req1d: [41.029976, -71.957344, 'Breakers Montauk'],
  // Request 2
  req2p: [41.033085, -71.947211, 'John\'s Drive In'],
  req2d: [41.036725, -71.944118, 'Montauk Brewing Company']
};

describe('Scenario #5', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Long Island',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        {
          latitude: 41.328139,
          longitude: -74.503079
        },
        {
          latitude: 41.478170,
          longitude: -71.706465
        },
        {
          latitude: 40.409779,
          longitude: -71.911475
        },
        {
          latitude: 40.371393,
          longitude: -74.836740
        },
        {
          latitude: 41.328139,
          longitude: -74.503079
        }
      ]
    });

    const driver1Info = {
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      email: 'driver1@mail.com',
      locations: [location._id]
    };

    ({
      driver: driver1, driverSocket: driver1Socket
    } = await createDriverLogin(
      driver1Info, app, request, domain, driver1Socket
    ));

    const driver2Info = {
      currentLocation: {
        coordinates: [keyLoc.d2a[1], keyLoc.d2a[0]],
        type: 'Point'
      },
      email: 'driver2@mail.com',
      locations: [location._id]
    };

    ({
      driver: driver2, driverSocket: driver2Socket
    } = await createDriverLogin(
      driver2Info, app, request, domain, driver2Socket
    ));

    ({ rider: rider1, riderToken: rider1Token } = await createRiderLogin({
      email: 'rider1@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }, app, request, domain, rider1Socket));


    ({ rider: rider2, riderToken: rider2Token } = await createRiderLogin({
      email: 'rider2@mail.com',
      firstName: 'Rider',
      lastName: '2',
      password: 'Password2',
      location: location._id,
      dob: '2000-12-11'
    }, app, request, domain, rider1Socket));
  });

  before(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    driver1Socket.removeAllListeners();
    driver2Socket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();

    // Request 1 created
    logger.debug('REQUEST 1 CREATED');
    logger.debug([keyLoc.req1p[2], keyLoc.req1p[0], keyLoc.req1p[1]]);
    logger.debug([keyLoc.req1d[2], keyLoc.req1d[0], keyLoc.req1d[1]]);

    await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
    await driverSearcher.search();

    // Request 2 created
    logger.debug('REQUEST 2 CREATED');
    logger.debug([keyLoc.req2p[2], keyLoc.req2p[0], keyLoc.req2p[1]]);
    logger.debug([keyLoc.req2d[2], keyLoc.req2d[0], keyLoc.req2d[1]]);

    await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
    await driverSearcher.search();
  });

  describe('Scenario #5', () => {
    it('Should assign driver 1 to ride request 1', async () => {
      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(String(ride1.driver), String(driver1._id));
    });

    it('Should assign driver 2 to ride request 2', async () => {
      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver2._id));
    });

    it('Should have 3 stops assigned to driver 1', async () => {
      route1 = await Routes.findOne({ driver: driver1 });
      return sinon.assert.match(route1.stops.length, 3);
    });
    it('Should have correct route sequence for driver 1', async () => {
      const routeA = route1.stops.map((stop) => {
        if (stop.ride) {
          return [String(stop.ride), stop.stopType, stop.status];
        }
        return [-1, stop.stopType, stop.status];
      });

      const routeB = [
        [-1, 'current_location', 'done'],
        [String(ride1._id), 'pickup', 'waiting'],
        [String(ride1._id), 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });
    it('Should have 3 stops assigned to driver 2', async () => {
      route2 = await Routes.findOne({ driver: driver2 });
      return sinon.assert.match(route2.stops.length, 3);
    });
    it('Should have correct route sequence for driver 2', async () => {
      const routeA = route2.stops.map((stop) => {
        if (stop.ride) {
          return [String(stop.ride), stop.stopType, stop.status];
        }
        return [-1, stop.stopType, stop.status];
      });

      const routeB = [
        [-1, 'current_location', 'done'],
        [String(ride2._id), 'pickup', 'waiting'],
        [String(ride2._id), 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });
  });
});
