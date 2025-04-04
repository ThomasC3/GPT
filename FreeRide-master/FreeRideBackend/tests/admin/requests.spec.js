import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';

import { stripe } from '../../services';
import { port, domain } from '../../config';
import { createRequest, createRiderLogin, getPaymentSettings } from '../utils/rider';
import {
  Riders, Locations,
  Requests, Rides, Messages,
  RequestStatus, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { adminEndpoint, createAdminLogin } from '../utils/admin';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let rider1Socket;
let rider2Socket;
let rider3Socket;
let sandbox;
let rider;
let riderToken;
let rider1Token;
let rider2Token;
let rider3Token;
let location;
let location2;
let adminSessionResponse;
let developerToken;

const keyLoc = {
  // Driver 1
  d1a: [40.680806, -73.902878, '1610 Bushwick Ave, Brooklyn, NY 11207, USA'],
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA'],
  // Request 2
  req2p: [40.686650, -73.913063, '115-57 Eldert St, Brooklyn, NY 11207, USA'],
  req2d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

const locationInfo = {
  name: 'Location',
  isADA: false,
  isUsingServiceTimes: false,
  isActive: true,
  paymentEnabled: true,
  paymentInformation: {
    ridePrice: 100,
    capEnabled: false,
    priceCap: 50,
    pricePerHead: 50,
    currency: 'usd'
  },
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
};

describe('Clear Zombie requests', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation(locationInfo);
    location2 = await Locations.createLocation({ ...locationInfo, name: 'Location 2' });

    // (riderParams, app, request, domain, riderSocket = null)
    ({ rider, riderToken } = await createRiderLogin({
      email: 'rider1@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }, app, request, domain, rider1Socket));
    await getPaymentSettings(riderToken, app, request, domain, location._id);
    rider = await Riders.findOne({ _id: rider._id });
    stripe.clearPaymentMethods(rider.stripeCustomerId);
    await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');
    rider1Token = riderToken;

    ({ rider, riderToken } = await createRiderLogin({
      email: 'rider2@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }, app, request, domain, rider2Socket));
    await getPaymentSettings(riderToken, app, request, domain, location._id);
    rider = await Riders.findOne({ _id: rider._id });
    stripe.clearPaymentMethods(rider.stripeCustomerId);
    await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');
    rider2Token = riderToken;

    ({ rider, riderToken } = await createRiderLogin({
      email: 'rider3@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location2._id,
      dob: '2000-12-11'
    }, app, request, domain, rider3Socket));
    await getPaymentSettings(riderToken, app, request, domain, location._id);
    rider = await Riders.findOne({ _id: rider._id });
    stripe.clearPaymentMethods(rider.stripeCustomerId);
    await stripe.attachPaymentMethod(rider.stripeCustomerId, 'pm_card_visa_debit');
    rider3Token = riderToken;

    adminSessionResponse = await createAdminLogin();
    developerToken = adminSessionResponse.adminToken;
  });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Requests.deleteMany();
    await Messages.deleteMany();
  });

  describe('POST /requests/clearZombies', () => {
    it('Should return all existing requests', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await createRequest(rider3Token, keyLoc.req2p, keyLoc.req2d, location2, app, request, domain);

      const response = await request(app)
        .get('/v1/requests')
        .set('host', domain.admin)
        .set('X-Mobile-Os', 'Android')
        .set('X-App-Version', '1.0.0')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${developerToken}`)
        .send()
        .expect(200)
        .end();

      sinon.assert.match(response.body.total, 3);
      return sinon.assert.match(response.body.items.length, 3);
    });

    it('Should cancel all requests from location in the last hour', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await createRequest(rider3Token, keyLoc.req2p, keyLoc.req2d, location2, app, request, domain);

      const twoHour = 2 * 60 * 60 * 1000;
      const requestTimestamp = Date.now() - twoHour;

      // update requests createdTimestamp in order to be older than 1h
      await Requests.updateMany({}, { $set: { requestTimestamp } });

      const zombies = await adminEndpoint(
        `/v1/zombies?location=${location._id}`, 'get', developerToken, app, request, domain
      );
      sinon.assert.match(zombies.body.length, 2);

      const response = await adminEndpoint(
        '/v1/requests/clearZombies', 'post', developerToken, app, request, domain, { location: location._id }
      );

      const requests = await Requests.find({
        status: RequestStatus.RequestCancelled,
        cancelledBy: 'ADMIN',
        location: location._id
      });

      sinon.assert.match(response.body.modifiedCount, 2);
      return sinon.assert.match(requests.length, 2);
    });

    it('Should cancel no requests', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await createRequest(rider3Token, keyLoc.req2p, keyLoc.req2d, location2, app, request, domain);

      const response = await adminEndpoint(
        '/v1/requests/clearZombies', 'post', developerToken, app, request, domain, { location: location._id }
      );

      const requests = await Requests.find({
        status: RequestStatus.RequestCancelled,
        cancelledBy: 'ADMIN',
        location: location._id
      });

      sinon.assert.match(response.body.modifiedCount, 0);
      return sinon.assert.match(requests.length, 0);
    });

    it('Should cancel just one pending request', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await createRequest(rider3Token, keyLoc.req2p, keyLoc.req2d, location2, app, request, domain);

      // on the edge of the hour
      const oneHour = 1 * 60 * 60 * 1000 + 1;
      const requestTimestamp = Date.now() - oneHour;

      // update requests createdTimestamp in order to be older than 1h
      const requests = await Requests.find({ location });
      await Requests.findOneAndUpdate(
        { _id: requests[0]._id },
        { requestTimestamp },
        { new: true }
      );

      const response = await adminEndpoint(
        '/v1/requests/clearZombies', 'post', developerToken, app, request, domain, { location: location._id }
      );

      const cancelledRequests = await Requests.find({
        status: RequestStatus.RequestCancelled,
        cancelledBy: 'ADMIN',
        location: location._id
      });

      sinon.assert.match(response.body.modifiedCount, 1);
      return sinon.assert.match(cancelledRequests.length, 1);
    });
  });
});
