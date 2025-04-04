/* eslint-disable no-undef */
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';

import app from '../../server';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  Riders, Locations, Settings,
  Requests, Rides, Routes
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createRequest, riderEndpoint } from '../utils/rider';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let rider1Socket;
let sandbox;
let rider1;
let rider1Token;
let location;

const keyLoc = {
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds']
};

describe('Versioning', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '2.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
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

    rider1 = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const rider1SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '2.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider1@mail.com', password: 'Password1' })
      .expect(200)
      .end()
      .get('body');

    rider1Token = rider1SessionResponse.accessToken;

    rider1Socket
      .emit('authenticate', { token: rider1Token })
      .on('authenticated', () => {
        logger.debug('RIDER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    rider1Socket.removeAllListeners();

    await Locations.syncIndexes();

    await Riders.updateRider(rider1._id, { lastCancelTimestamp: null });
  });

  describe('Request without valid version info', () => {
    describe('for POST ride/request', () => {
      it('Should return a 403', async () => {
        const payload = {};
        const response = await riderEndpoint(
          '/v1/ride/request', 'post', rider1Token, app, request, domain, payload, 403, null
        );

        sinon.assert.match(response.status, 403);
        return sinon.assert.match(
          response.body.message,
          'You need to update Circuit app to the latest version in order to request rides'
        );
      });
    });

    describe('for POST ride/request on old version', () => {
      it('Should return a 403', async () => {
        const payload = {};
        const response = await riderEndpoint(
          '/v1/ride/request', 'post', rider1Token, app, request, domain, payload, 403, '1.9.0'
        );

        sinon.assert.match(response.status, 403);
        return sinon.assert.match(
          response.body.message,
          'You need to update Circuit app to the latest version in order to request rides'
        );
      });
    });

    describe('for GET /locations', () => {
      it('Should return a 403', async () => {
        const payload = {};
        const response = await riderEndpoint(
          '/v1/locations', 'get', rider1Token, app, request, domain, payload, 403, null
        );

        sinon.assert.match(response.status, 403);
        return sinon.assert.match(
          response.body.message,
          'You need to update Circuit app to the latest version in order to request rides'
        );
      });
    });

    describe('for GET /location/:id', () => {
      it('Should return a 403', async () => {
        const payload = {};
        const response = await riderEndpoint(
          `/v1/locations/${location.id}`, 'get', rider1Token, app, request, domain, payload, 403, null
        );

        sinon.assert.match(response.status, 403);
        return sinon.assert.match(
          response.body.message,
          'You need to update Circuit app to the latest version in order to request rides'
        );
      });
    });

    describe('for GET /rides', () => {
      it('Should return 200', async () => {
        const payload = {};
        const response = await riderEndpoint(
          '/v1/rides', 'get', rider1Token, app, request, domain, payload, 200, null
        );

        return sinon.assert.match(response.status, 200);
      });
    });
  });

  describe('Request with valid version info', () => {
    describe('for POST ride/request', () => {
      it('Should return a 200', async () => {
        const response = await createRequest(
          rider1Token, keyLoc.req1p, keyLoc.req1d,
          location, app, request, domain, false, 1,
          200, '2.0.0'
        );
        return sinon.assert.match(response.location, location.id);
      });
    });

    describe('for GET /locations', () => {
      it('Should return a 400', async () => {
        const payload = {}; // missing coordinates
        const response = await riderEndpoint(
          '/v1/locations', 'get', rider1Token, app, request, domain, payload, 400, '2.0.0'
        );

        return sinon.assert.match(response.status, 400);
      });
    });

    describe('for GET /locations', () => {
      it('Should return a 400', async () => {
        const payload = {}; // missing coordinates
        const response = await riderEndpoint(
          '/v1/locations', 'get', rider1Token, app, request, domain, payload, 400, '2.1.0'
        );

        return sinon.assert.match(response.status, 400);
      });
    });
  });
});
