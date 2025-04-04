import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  Riders, Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createRequest } from '../utils/rider';
import { pickUp, createDriverLogin } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver1Socket;
let driver1Token;
let driver2Socket;
let driver2Token;
let rider1Socket;
let rider2Socket;
let rider3Socket;
let sandbox;
let driver1;
let driver2;
let rider1;
let rider2;
let rider3;
let rider1Token;
let rider2Token;
let rider3Token;
let location;
let ride1;
let ride2;
let ride3;
let route1;
let route2;

const keyLoc = {
  // Driver 1
  d1a: [32.716032, -117.167041, 'The Westin San Diego'],
  d1b: [32.712551, -117.169189, 'Driver 1 position 2'],
  d1c: [32.707847, -117.159213, 'Driver 1 position 3'],
  // Driver 2
  d2a: [32.715524, -117.159091, 'Parq Restaurant & Nightclub'],
  // Request 1
  req1p: [32.716855, -117.169478, 'Santa Fe Depot'],
  req1d: [32.706917, -117.158693, 'Omni San Diego'],
  // Request 2
  req2p: [32.709085, -117.159019, 'The Broken Yolk Cafe'],
  req2d: [32.711375, -117.152669, 'Quartyard'],
  // Request 3
  req3p: [32.708792, -117.154563, 'San Diego Central Library'],
  req3d: [32.71559, -117.1558, 'Hodad\'s Downtown']
};

describe('Scenario #3', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'SD',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      inversionRangeFeet: 10,
      serviceArea: [
        {
          latitude: 33.123204,
          longitude: -117.427767
        },
        {
          latitude: 33.138359,
          longitude: -116.837406
        },
        {
          latitude: 32.655365,
          longitude: -116.795193
        },
        {
          latitude: 32.619951,
          longitude: -117.378216
        },
        {
          latitude: 33.123204,
          longitude: -117.427767
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
      driver: driver1,
      driverSocket: driver1Socket,
      driverToken: driver1Token
    } = await createDriverLogin(
      driver1Info,
      app,
      request,
      domain,
      driver1Socket
    ));

    const driver2Info = {
      currentLocation: {
        coordinates: [keyLoc.d2a[1], keyLoc.d2a[0]],
        type: 'Point'
      },
      email: 'driver2@mail.com',
      locations: [location._id],
      password: 'Password2'
    };

    ({
      driver: driver2,
      driverSocket: driver2Socket,
      driverToken: driver2Token
    } = await createDriverLogin(
      driver2Info,
      app,
      request,
      domain,
      driver2Socket
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

  before(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    driver1Socket.removeAllListeners();
    driver2Socket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
    rider3Socket.removeAllListeners();

    // Request 1 created
    logger.debug('REQUEST 1 CREATED');
    logger.debug([keyLoc.req1p[2], keyLoc.req1p[0], keyLoc.req1p[1]]);
    logger.debug([keyLoc.req1d[2], keyLoc.req1d[0], keyLoc.req1d[1]]);

    await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
    await driverSearcher.search();

    ride1 = await Rides.findOne({ rider: rider1 });
    sinon.assert.match(String(ride1.driver), String(driver1._id));

    ride1 = await Rides.findOne({ rider: rider1 });
    await pickUp(driver1Token, ride1, app, request, domain);

    // Driver 1 moves to second position
    logger.debug('Driver 1 moved to: ');
    logger.debug([keyLoc.d1b[0], keyLoc.d1b[1], keyLoc.d1b[2]]);
    driver1.currentLocation.coordinates = [keyLoc.d1b[1], keyLoc.d1b[0]];
    await driver1.save();

    // Request 2 created
    logger.debug('REQUEST 2 CREATED');
    logger.debug([keyLoc.req2p[2], keyLoc.req2p[0], keyLoc.req2p[1]]);
    logger.debug([keyLoc.req2d[2], keyLoc.req2d[0], keyLoc.req2d[1]]);

    await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
    await driverSearcher.search();

    ride2 = await Rides.findOne({ rider: rider2 });
    sinon.assert.match(String(ride2.driver), String(driver2._id));

    // Driver 1 moves to second position
    logger.debug('Driver 1 moved to: ');
    logger.debug([keyLoc.d1c[0], keyLoc.d1c[1], keyLoc.d1c[2]]);
    driver1.currentLocation.coordinates = [keyLoc.d1c[1], keyLoc.d1c[0]];
    await driver1.save();

    // Driver 2 moves to pickup ride 2
    logger.debug('Driver 2 moved to: ');
    logger.debug([keyLoc.req2p[0], keyLoc.req2p[1], keyLoc.req2p[2]]);
    driver2.currentLocation.coordinates = [keyLoc.req2p[1], keyLoc.req2p[0]];
    await driver2.save();

    ride2 = await Rides.findOne({ rider: rider2 });
    await pickUp(driver2Token, ride2, app, request, domain);

    // Request 3 created
    logger.debug('REQUEST 3 CREATED');
    logger.debug([keyLoc.req3p[2], keyLoc.req3p[0], keyLoc.req3p[1]]);
    logger.debug([keyLoc.req3d[2], keyLoc.req3d[0], keyLoc.req3d[1]]);

    await createRequest(rider3Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain);
    await driverSearcher.search();

    ride3 = await Rides.findOne({ rider: rider3 });
    sinon.assert.match(String(ride3.driver), String(driver2._id));
  });

  describe('Scenario #3', () => {
    it('Should assign driver 1 to ride request 1 and pickup', async () => {
      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(String(ride1.driver), String(driver1._id));
    });

    it('Should assign driver 2 to ride request 2', async () => {
      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver2._id));
    });

    it('Should assign driver 2 to ride request 3', async () => {
      ride3 = await Rides.findOne({ rider: rider3 });
      return sinon.assert.match(String(ride3.driver), String(driver2._id));
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
        [String(ride1._id), 'pickup', 'done'],
        [String(ride1._id), 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });
    it('Should have 6 stops assigned to driver 2', async () => {
      route2 = await Routes.findOne({ driver: driver2 });
      return sinon.assert.match(route2.stops.length, 6);
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
        [String(ride2._id), 'pickup', 'done'],
        [-1, 'current_location', 'done'],
        [String(ride3._id), 'pickup', 'waiting'],
        [String(ride2._id), 'dropoff', 'waiting'],
        [String(ride3._id), 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });
  });
});
