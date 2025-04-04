import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import { port, domain } from '../config';
import logger from '../logger';
import { createRequest, createRequestAnyStatus } from './utils/rider';
import {
  Riders, Locations, Requests, Rides, Routes, Settings
} from '../models';
import { emptyAllCollections } from './utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let rider;
let riderSocket;
let sandbox;
let riderToken;
let location;

const keyLoc = {
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Location passenger limit in requests', () => {
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
      passengerLimit: 2,
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

    rider = await new Riders({
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

  after(async () => { });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();
  });

  describe('Passenger limit', () => {
    it('Should be able to request ride with 2 passengers', async () => {
      const result = await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 2
      );
      sinon.assert.match(result.passengers, 2);

      const allRequests = await Requests.find({ rider: rider._id });
      return sinon.assert.match(allRequests.length, 1);
    });
    it('Should not be able to request ride with more than 2 passengers', async () => {
      const result = await createRequestAnyStatus(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 5
      );
      sinon.assert.match(result.code, 400);

      const allRequests = await Requests.find({ rider: rider._id });
      return sinon.assert.match(allRequests.length, 0);
    });
  });
});
