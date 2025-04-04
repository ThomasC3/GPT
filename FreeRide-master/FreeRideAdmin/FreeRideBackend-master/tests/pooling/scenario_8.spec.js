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
import { createDriverLogin } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver1Socket;
let driver2Socket;
let driver3Socket;
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

const keyLoc = {
  // Driver 1
  d1a: [32.717755, -117.169051, 'Museum of contemporary art SD'],
  // Driver 2
  d2a: [32.710472, -117.143218, 'Sherman Heights CC'],
  // Driver 3
  d3a: [32.717755, -117.169051, 'Museum of contemporary art SD'],
  // Request 1
  req1p: [32.715932, -117.167098, 'The Westin SD'],
  req1d: [32.711663, -117.137382, '99 cents only store'],
  // Request 2
  req2p: [32.711663, -117.137382, '99 cents only store'],
  req2d: [32.709406, -117.136760, 'Grant Hill Neighborhood Park']
};

describe('Scenario #8', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver3Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      cancelTime: 4,
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
    } = await createDriverLogin(driver1Info, app, request, domain, driver1Socket));

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
    } = await createDriverLogin(driver2Info, app, request, domain, driver2Socket));

    const driver3Info = {
      currentLocation: {
        coordinates: [keyLoc.d3a[1], keyLoc.d3a[0]],
        type: 'Point'
      },
      email: 'driver3@mail.com',
      locations: [location._id],
      password: 'Password3'
    };

    ({
      driverSocket: driver3Socket
    } = await createDriverLogin(driver3Info, app, request, domain, driver3Socket));

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

    driver1Socket.removeAllListeners();
    driver2Socket.removeAllListeners();
    driver3Socket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
  });

  describe('Pooling with pickups larger than 10 minutes', () => {
    it('Should assign driver 1 to ride request 1', async () => {
      // Request 1 created
      logger.debug('REQUEST 1 CREATED');
      logger.debug([keyLoc.req1p[2], keyLoc.req1p[0], keyLoc.req1p[1]]);
      logger.debug([keyLoc.req1d[2], keyLoc.req1d[0], keyLoc.req1d[1]]);

      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver1._id));

      // Request 2 created
      logger.debug('REQUEST 2 CREATED');
      logger.debug([keyLoc.req2p[2], keyLoc.req2p[0], keyLoc.req2p[1]]);
      logger.debug([keyLoc.req2d[2], keyLoc.req2d[0], keyLoc.req2d[1]]);

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver2._id));
    });
  });
});
