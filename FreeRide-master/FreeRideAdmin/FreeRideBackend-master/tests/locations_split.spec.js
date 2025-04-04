/* eslint-disable no-undef */
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import { port, domain } from '../config';
import logger from '../logger';
import {
  Riders,
  Drivers,
  Locations,
  Requests,
  Rides,
  Settings
} from '../models';
import { emptyAllCollections } from './utils/helper';

import { createRequest } from './utils/rider';

import { createDriverLogin } from './utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driverSocket;
let rider1Socket;
let rider2Socket;
let sandbox;
let driver2Socket;
let rider1;
let rider2;
let rider1Token;
let rider2Token;
let location1;
let location2;
let request1;
let request2;

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  d1b: [40.198857, -8.40275, 'Via lusitania'],
  d1c: [40.202714, -8.404019, 'Moinho velho'],
  // Driver 2
  d2a: [40.680806, -73.902878, '1610 Bushwick Ave, Brooklyn, NY 11207, USA'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds'],
  // Request 2
  req2p: [
    40.683619,
    -73.907704,
    '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'
  ],
  req2d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA'],
  // Request 3
  req3p: [40.19689, -8.402655, 'Minipreco'],
  req3d: [40.2006767, -8.4050056, 'SuperCor'],
  // Request 4
  req4p: [40.197, -8.4027, 'Minipreco'],
  req4d: [40.2006767, -8.4050056, 'SuperCor']
};

describe('Locations Split', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location1 = await Locations.createLocation({
      name: 'Location',
      isUsingServiceTimes: false,
      isActive: true,
      cronWorkingSet: 'ws_0',
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

    location2 = await Locations.createLocation({
      name: 'Location 2',
      isUsingServiceTimes: false,
      isActive: true,
      cronWorkingSet: 'ws_1',
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
      // Leroy Merlin
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      firstName: 'Driver',
      lastName: '1',
      email: 'driver1@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      locations: [location1._id],
      password: 'Password1',
      dob: '2000-12-11'
    };

    const driver2Info = {
      // Leroy Merlin
      currentLocation: {
        coordinates: [keyLoc.d2a[1], keyLoc.d2a[0]],
        type: 'Point'
      },
      firstName: 'Driver 2',
      lastName: '2',
      email: 'driver2@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      locations: [location2._id],
      password: 'Password1',
      dob: '2000-12-11'
    };

    await createDriverLogin(driverInfo, app, request, domain, driverSocket);
    await createDriverLogin(driver2Info, app, request, domain, driver2Socket);

    rider1 = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
      location: location1._id,
      dob: '2000-12-11'
    }).save();

    rider2 = await new Riders({
      email: 'rider2@mail.com',
      firstName: 'Rider',
      lastName: '2',
      password: 'Password2',
      location: location2._id,
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

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Test', () => {
    it('should handle requests in working set 0', async () => {
      sinon.assert.match(process.env.LOCATION_WORKING_SET, 'ws_0');

      await createRequest(
        rider1Token,
        keyLoc.req1p,
        keyLoc.req1d,
        location1,
        app,
        request,
        domain,
        false,
        3
      );
      await createRequest(
        rider2Token,
        keyLoc.req2p,
        keyLoc.req2d,
        location2,
        app,
        request,
        domain,
        false,
        1
      );
      await driverSearcher.search();
      request1 = await Requests.findOne({ rider: rider1 });
      request2 = await Requests.findOne({ rider: rider2 });
      sinon.assert.match(request1.status, 102);
      sinon.assert.match(request2.status, 100);
    });
    it('should handle requests working set 1', async () => {
      process.env.LOCATION_WORKING_SET = 'ws_1';
      sinon.assert.match(process.env.LOCATION_WORKING_SET, 'ws_1');

      await createRequest(
        rider1Token,
        keyLoc.req1p,
        keyLoc.req1d,
        location1,
        app,
        request,
        domain,
        false,
        3
      );
      await createRequest(
        rider2Token,
        keyLoc.req2p,
        keyLoc.req2d,
        location2,
        app,
        request,
        domain,
        false,
        1
      );
      await driverSearcher.search();
      request1 = await Requests.findOne({ rider: rider1 });
      request2 = await Requests.findOne({ rider: rider2 });
      sinon.assert.match(request1.status, 100);
      sinon.assert.match(request2.status, 102);
      process.env.LOCATION_WORKING_SET = 'ws_0';
    });
  });
});
