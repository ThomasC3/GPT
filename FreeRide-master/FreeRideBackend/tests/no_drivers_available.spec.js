/* eslint-disable no-undef */

import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import { port, domain } from '../config';
import logger from '../logger';
import { createRequest } from './utils/rider';
import {
  Riders, Locations, Requests, Settings
} from '../models';
import { emptyAllCollections } from './utils/helper';
import { sleep } from '../utils/ride';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;
let location;
let riderSocket;
let riderToken;

const keyLoc = {
  // Driver 1
  d1a: [40.680806, -73.902878, '1610 Bushwick Ave, Brooklyn, NY 11207, USA'],
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Request cancel without pooling', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      poolingEnabled: false,
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

    await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

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

    riderToken = riderSessionResponse.accessToken;

    riderSocket
      .emit('authenticate', { token: riderToken })
      .on('authenticated', () => {
        logger.debug('RIDER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  beforeEach(async () => {
    sandbox.restore();
    await Requests.deleteMany();
  });

  describe('No drivers available', () => {
    it('Normal request', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      let request1 = await Requests.findOne({});
      sinon.assert.match([
        request1.status,
        request1.processing,
        request1.searchRetries
      ],
      [100, false, 0]);


      await driverSearcher.search();
      request1 = await Requests.findOne({});
      sinon.assert.match([
        request1.status,
        request1.processing,
        request1.searchRetries
      ],
      [100, false, 1]);

      // not processed due to 15s retrytimestamp
      await driverSearcher.search();
      request1 = await Requests.findOne({});
      sinon.assert.match([
        request1.status,
        request1.processing,
        request1.searchRetries
      ],
      [100, false, 1]);

      let lastRetry = Date.now() - 15 * 1000 - 1; // 15s ago
      await Requests.updateRequest(
        { _id: request1._id },
        {
          lastRetryTimestamp: lastRetry
        }
      );

      await driverSearcher.search();
      request1 = await Requests.findOne({});
      sinon.assert.match([
        request1.status,
        request1.processing,
        request1.searchRetries
      ],
      [100, false, 2]);

      const timedOutTimestamp = Date.now() - 6 * 60 * 1000 - 1; // 5 mins ago
      lastRetry = Date.now() - 15 * 1000 - 1; // 15s ago
      await Requests.updateRequest(
        { _id: request1._id },
        {
          searchRetries: 19,
          requestTimestamp: timedOutTimestamp,
          lastRetryTimestamp: lastRetry
        }
      );

      await driverSearcher.search();
      request1 = await Requests.findOne({});
      return sinon.assert.match([
        request1.status,
        request1.processing,
        request1.searchRetries
      ],
      [101, false, 20]);
    });

    it('Duplicate request', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      let request1 = await Requests.findOne({});
      sinon.assert.match([
        request1.status,
        request1.processing,
        request1.searchRetries
      ],
      [100, false, 0]);

      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await sleep(1000);
      const requestCount = await Requests.find({}).count();
      sinon.assert.match(requestCount, 2);

      request1 = await Requests.findOne({ _id: request1._id });
      sinon.assert.match([
        request1.status,
        request1.processing,
        request1.searchRetries
      ],
      [101, false, 0]);

      const request2 = await Requests.findOne({ _id: { $nin: [request1._id] } });
      return sinon.assert.match([
        request2.status,
        request2.processing,
        request2.searchRetries
      ],
      [100, false, 0]);
    });
  });
});
