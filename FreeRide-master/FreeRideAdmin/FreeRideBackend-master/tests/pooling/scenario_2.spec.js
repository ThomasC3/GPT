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
import { pickUp, dropOff, createDriverLogin } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver1Socket;
let driver2Socket;
let rider1Socket;
let rider2Socket;
let rider3Socket;
let driver1Token;
let driver2Token;
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
  d1a: [32.721130, -117.168315, 'Harbor breakfast'],
  d1b: [32.719783, -117.164770, 'Social security administration'],
  d1c: [32.716744, -117.161996, 'Civic center'],
  // Driver 2
  d2a: [32.721914, -117.162818, 'California western school of law'],
  d2b: [32.719813, -117.162639, 'Ace parking'],
  // Request 1
  req1p: [32.720157, -117.166016, 'Extraordinary desserts'],
  req1d: [32.717816, -117.162872, 'SD civic theatre'],
  // Request 2
  req2p: [32.718926, -117.162754, 'Medico dental building'],
  req2d: [32.717788, -117.159084, 'Donut bar'],
  // Request 3
  req3p: [32.720397, -117.163794, 'Mixon Liquor & Deli'],
  req3d: [32.719873, -117.159256, 'Domino\'s pizza']
};

describe('Scenario #2', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    // Solar turbines (NW)
    // Naval medical center (NE)
    // Autozone auto parts (SE)
    // America's national heroes (SW)
    location = await Locations.createLocation({
      name: 'Location',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      cancelTime: 15,
      serviceArea: [
        {
          latitude: 32.726775,
          longitude: -117.173429
        },
        {
          latitude: 32.727389,
          longitude: -117.145137
        },
        {
          latitude: 32.706067,
          longitude: -117.143322
        },
        {
          latitude: 32.708991,
          longitude: -117.171079
        },
        {
          latitude: 32.726775,
          longitude: -117.173429
        }
      ]
    });

    const driver1Info = {
      // Harbor breakfast
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      email: 'driver1@mail.com',
      locations: [location._id]
    };

    ({
      driver: driver1, driverSocket: driver1Socket, driverToken: driver1Token
    } = await createDriverLogin(
      driver1Info, app, request, domain, driver1Socket
    ));

    const driver2Info = {
      // California western school of law
      currentLocation: {
        coordinates: [keyLoc.d2a[1], keyLoc.d2a[0]],
        type: 'Point'
      },
      email: 'driver2@mail.com',
      locations: [location._id]
    };

    ({
      driver: driver2, driverSocket: driver2Socket, driverToken: driver2Token
    } = await createDriverLogin(
      driver2Info, app, request, domain, driver2Socket
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

    // Driver 1 picks up ride 1
    ride1 = await Rides.findOne({ rider: rider1 });
    logger.debug(`Driver 1 picks up ride 1 (${(String(driver1._id) === String(ride1.driver))}) `);
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


    // Driver 1 moves to dropoff ride 1
    logger.debug('Driver 1 moved to drop off of ride 1');
    logger.debug([keyLoc.req1d[0], keyLoc.req1d[1], keyLoc.req1d[2]]);
    driver1.currentLocation.coordinates = [keyLoc.req1d[1], keyLoc.req1d[0]];
    await driver1.save();

    // Driver 1 drops off ride 1
    ride1 = await Rides.findOne({ rider: rider1 });
    logger.debug(`Driver 1 drops off ride 1 (${String(ride1.id)})`);
    await dropOff(driver1Token, ride1, app, request, domain);

    // Driver 2 moves to pickup ride 2
    logger.debug('Driver 2 moved to pickup ride 2');
    logger.debug([keyLoc.req2p[0], keyLoc.req2p[1], keyLoc.req2p[2]]);
    driver2.currentLocation.coordinates = [keyLoc.req2p[1], keyLoc.req2p[0]];
    await driver2.save();

    // Driver 2 picks up ride 2
    ride2 = await Rides.findOne({ rider: rider2 });
    await pickUp(driver2Token, ride2, app, request, domain);

    // Request 3 created
    logger.debug('REQUEST 3 CREATED');
    logger.debug([keyLoc.req3p[2], keyLoc.req3p[0], keyLoc.req3p[1]]);
    logger.debug([keyLoc.req3d[2], keyLoc.req3d[0], keyLoc.req3d[1]]);
    await createRequest(rider3Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain);
    await driverSearcher.search();

    ride3 = await Rides.findOne({ rider: rider3 });
    sinon.assert.match(String(ride3.driver), String(driver1._id));

    ride3 = await Rides.findOne({ rider: rider3 });
  });

  describe('Pooling ride with 2 drivers and 3 requests', () => {
    it('Should assign driver 1 to ride request 1', async () => {
      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(String(ride1.driver), String(driver1._id));
    });
    it('Should assign driver 2 to ride request 2', async () => {
      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver2._id));
    });
    it('Should assign driver 1 to ride request 3', async () => {
      ride3 = await Rides.findOne({ rider: rider3 });
      return sinon.assert.match(String(ride3.driver), String(driver1._id));
    });
    it('Should have 3 stops assigned to driver 1', async () => {
      route1 = await Routes.findOne({ driver: driver1, active: true });
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
        [String(ride3._id), 'pickup', 'waiting'],
        [String(ride3._id), 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });

    it('Should have 3 stops assigned to driver 2', async () => {
      route2 = await Routes.findOne({ driver: driver2, active: true });
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
        [String(ride2._id), 'pickup', 'done'],
        [String(ride2._id), 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });

    it('Should have pickup done for driver 1', async () => {
      // Driver 1 picks up ride 3
      await pickUp(driver1Token, ride3, app, request, domain);
      ride3 = await Rides.findOne({ rider: rider3 });
      return sinon.assert.match(ride3.status, 300);
    });

    it('Should have dropoff done for driver 1', async () => {
      // Driver 1 drops off ride 3
      await dropOff(driver1Token, ride3, app, request, domain);
      ride3 = await Rides.findOne({ rider: rider3 });
      return sinon.assert.match(ride3.status, 700);
    });
    it('Should have reset route for driver 1', async () => {
      route1 = await Routes.findOne({ driver: driver1, active: true });
      return sinon.assert.match(route1, null);
    });
  });
});
