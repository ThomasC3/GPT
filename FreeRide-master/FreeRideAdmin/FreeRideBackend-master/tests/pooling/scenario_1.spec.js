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
let driver2Token;
let driver2Socket;
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
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  d1b: [40.198857, -8.40275, 'Via lusitania'],
  d1c: [40.202714, -8.404019, 'Moinho velho'],
  // Driver 2
  d2a: [40.21115, -8.402744, 'Sabor & Arte'],
  d2b: [40.207848, -8.40033, 'PSP Coimbra'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds'],
  // Request 2
  req2p: [40.209975, -8.401433, 'OGAMI'],
  req2d: [40.206329, -8.400983, 'Atrium'],
  // Request 3
  req3p: [40.2006767, -8.4050056, 'SuperCor'],
  req3d: [40.205643, -8.403842, 'Tamoeiro']
};

describe('Scenario #1', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    // Coimbra-B (SE)
    // Entrada das acacias (SD)
    // Retiro do mondego (ID)
    // Hotel D. Luis (IE)
    location = await Locations.createLocation({
      name: 'Location',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      inversionRangeFeet: 10,
      serviceArea: [
        {
          latitude: 40.2246842,
          longitude: -8.4420742
        },
        {
          latitude: 40.2238472,
          longitude: -8.3978139
        },
        {
          latitude: 40.1860998,
          longitude: -8.3972703
        },
        {
          latitude: 40.189714,
          longitude: -8.430009
        },
        {
          latitude: 40.2246842,
          longitude: -8.4420742
        }
      ]
    });

    const driver1Info = {
      // Leroy Merlin
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
      // Sabor & Arte
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

  // after(async () => {
  //   await app.close();
  // });

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
  });

  describe('Pooling ride with 2 drivers and 3 requests', () => {
    it('Should assign driver 1 to ride request 1', async () => {
      // Request 1 created
      logger.debug('REQUEST 2 CREATED');
      logger.debug([keyLoc.req1p[2], keyLoc.req1p[0], keyLoc.req1p[1]]);
      logger.debug([keyLoc.req1d[2], keyLoc.req1d[0], keyLoc.req1d[1]]);

      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(String(ride1.driver), String(driver1._id));
    });

    it('Should assign driver 2 to ride request 2', async () => {
      // Driver 1 picks up ride 1
      ride1 = await Rides.findOne({ rider: rider1 });
      driver1.currentLocation.coordinates = [ride1.pickupLongitude, ride1.pickupLatitude];
      await driver1.save();
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
      return sinon.assert.match(String(ride2.driver), String(driver2._id));
    });

    it('Should assign driver 1 to ride request 3', async () => {
      // Driver 2 picks up ride 2
      ride2 = await Rides.findOne({ rider: rider2 });
      await pickUp(driver2Token, ride2, app, request, domain);
      driver2.currentLocation.coordinates = [ride2.pickupLongitude, ride2.pickupLatitude];
      await driver2.save();

      // Driver 1 moves to third position
      logger.debug('Driver 1 moved to: ');
      logger.debug([keyLoc.d1c[0], keyLoc.d1c[1], keyLoc.d1c[2]]);
      driver1.currentLocation.coordinates = [keyLoc.d1c[1], keyLoc.d1c[0]];
      await driver1.save();

      // Driver 2 moves to second position
      logger.debug('Driver 2 moved to: ');
      logger.debug([keyLoc.d2b[0], keyLoc.d2b[1], keyLoc.d2b[2]]);
      driver2.currentLocation.coordinates = [keyLoc.d2b[1], keyLoc.d2b[0]];
      await driver2.save();

      // Request 3 created
      logger.debug('REQUEST 3 CREATED');
      logger.debug([keyLoc.req3p[2], keyLoc.req3p[0], keyLoc.req3p[1]]);
      logger.debug([keyLoc.req3d[2], keyLoc.req3d[0], keyLoc.req3d[1]]);

      await createRequest(rider3Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain);
      await driverSearcher.search();

      ride3 = await Rides.findOne({ rider: rider3 });

      return sinon.assert.match(String(ride3.driver), String(driver1._id));
    });
    it('Should have 6 stops assigned to driver 1', async () => {
      route1 = await Routes.findOne({ driver: driver1 });

      return sinon.assert.match(route1.stops.length, 6);
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
        [-1, 'current_location', 'done'],
        [String(ride3._id), 'pickup', 'waiting'],
        [String(ride1._id), 'dropoff', 'waiting'],
        [String(ride3._id), 'dropoff', 'waiting']
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
        [String(ride2._id), 'pickup', 'done'],
        [String(ride2._id), 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });
  });
});
