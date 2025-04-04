import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import { port, domain } from '../config';
import logger from '../logger';
import {
  Riders, Drivers, Locations, Requests, Rides, Routes, Settings
} from '../models';
import { emptyAllCollections } from './utils/helper';

import { createRequestAnyStatus } from './utils/rider';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driverSocket;
let riderSocket;
let sandbox;
let driverToken;
let riderToken;
let location;
let request1;
let nRequests;

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds'],
  // Request 2
  req2p: [32.718926, -117.162754, 'Medico dental building'],
  req2d: [40.2041, -8.404072, 'McDonalds'],
  // Request 3
  req3p: [40.19689, -8.402655, 'Minipreco'],
  req3d: [32.717788, -117.159084, 'Donut bar'],
  // Request 4
  req4p: [32.718926, -117.162754, 'Medico dental building'],
  req4d: [32.717788, -117.159084, 'Donut bar']
};

describe('Enforce service area', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    // Coimbra-B (SE)
    // Entrada das acacias (SD)
    // Retiro do mondego (ID)
    // Hotel D. Luis (IE)
    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
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

    await Drivers.createDriver({
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
      locations: [location._id],
      password: 'Password1',
      dob: '2000-12-11'
    });

    await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const driverSessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.driver)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'driver1@mail.com', password: 'Password1' })
      .expect(200)
      .end()
      .get('body');

    const riderSessionResponse = await request(app)
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

    driverToken = driverSessionResponse.accessToken;
    riderToken = riderSessionResponse.accessToken;

    driverSocket
      .emit('authenticate', { token: driverToken })
      .on('authenticated', () => {
        logger.debug('DRIVER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    riderSocket
      .emit('authenticate', { token: riderToken })
      .on('authenticated', () => {
        logger.debug('RIDER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  // after(async () => {
  //   await app.close();
  // });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    driverSocket.removeAllListeners();
    riderSocket.removeAllListeners();
  });

  describe('Enforce service area', () => {
    it('Should create request if pickup and dropoff within serviceArea', async () => {
      request1 = await createRequestAnyStatus(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      sinon.assert.match(request1.code !== 400, true);
      nRequests = await Requests.find({}).countDocuments();
      return sinon.assert.match(nRequests, 1);
    });
    it('Should not create request if pickup is not within serviceArea', async () => {
      request1 = await createRequestAnyStatus(
        riderToken, keyLoc.req2p, keyLoc.req2d, location, app, request, domain
      );
      sinon.assert.match(request1.code === 400, true);
      nRequests = await Requests.find({}).countDocuments();
      return sinon.assert.match(nRequests, 0);
    });
    it('Should not create request if dropoff is not within serviceArea', async () => {
      request1 = await createRequestAnyStatus(
        riderToken, keyLoc.req3p, keyLoc.req3d, location, app, request, domain
      );
      sinon.assert.match(request1.code === 400, true);
      nRequests = await Requests.find({}).countDocuments();
      return sinon.assert.match(nRequests, 0);
    });
    it('Should create request if both pickup and dropoff are not within serviceArea', async () => {
      request1 = await createRequestAnyStatus(
        riderToken, keyLoc.req4p, keyLoc.req4d, location, app, request, domain
      );
      sinon.assert.match(request1.code === 400, true);
      nRequests = await Requests.find({}).countDocuments();
      return sinon.assert.match(nRequests, 0);
    });
  });
});
