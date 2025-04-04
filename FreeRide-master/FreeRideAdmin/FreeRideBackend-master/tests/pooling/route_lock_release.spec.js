import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import { createRequest } from '../utils/rider';
import { createDriverLogin } from '../utils/driver';
import {
  Riders, Locations, Requests, Rides, Routes, Settings
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
let sandbox;
let rider1Token;
let rider2Token;
let location;
let lockedRoute;
let unlockedRoute;
let doubleLockedRoute;

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2006767, -8.4050056, 'SuperCor'],
  // Request 3
  req2p: [40.2041, -8.404072, 'McDonalds'],
  req2d: [40.205643, -8.403842, 'Tamoeiro']
};

describe('Route lock/release', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

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

    const driverInfo = {
      email: 'some@mail.com',
      locations: [location._id],
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      }
    };

    ({ driver, driverSocket } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));

    await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    await new Riders({
      email: 'rider2@mail.com',
      firstName: 'Rider',
      lastName: '1',
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
        logger.debug('RIDER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider2Socket
      .emit('authenticate', { token: rider2Token })
      .on('authenticated', () => {
        logger.debug('RIDER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  after(async () => { });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();
  });

  describe('Route lock/release', () => {
    it('Should lock and release', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      await Routes.lock({ driver: driver._id });
      lockedRoute = await Routes.findOne({ driver: driver._id });
      sinon.assert.match(lockedRoute.lock, true);

      await Routes.release({ driver: driver._id });
      unlockedRoute = await Routes.findOne({ driver: driver._id });
      return sinon.assert.match(unlockedRoute.lock, false);
    });
    it('Should unlock route after 10 seconds', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      await Routes.lock({ driver: driver._id });
      lockedRoute = await Routes.findOne({ driver: driver._id });
      sinon.assert.match(lockedRoute.lock, true);

      await Routes.lock({ driver: driver._id });
      doubleLockedRoute = await Routes.findOne({ driver: driver._id });
      return sinon.assert.match(doubleLockedRoute.lock, true);
    });
  });
});
