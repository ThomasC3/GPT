import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import nock from 'nock';

import app from '../../server';
import { port, domain, aws as awsConfig } from '../../config';
import {
  createRequest, riderEndpoint,
  createRiderLogin, getPaymentSettings,
  riderLogin
} from '../utils/rider';
import { createDriverLogin } from '../utils/driver';
import { signUp } from '../utils/ride';
import { TI18N } from '../utils/i18nHelper';
import {
  Riders, Drivers, Locations,
  Requests, Rides, Settings,
  SnsArns
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import driverSearcher from '../../services/driverSearch';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driver;
let driverSocket;
let rider1Socket;
let rider2Socket;
let rider3Socket;
let rider4Socket;
let sandbox;
let rider1;
let rider2;
let rider3;
let rider4;
let location;
let mock;
let googleMock;

const googleRider = {
  id: '110169484474386276334',
  email: 'user@example.com',
  verified_email: true,
  name: 'John Doe',
  given_name: 'John',
  family_name: 'Doe',
  picture: '',
  locale: 'en'
};

const keyLoc = {
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Rider Account deletion', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    const snsUrl = `https://sns.${awsConfig.region}.amazonaws.com`;

    const deleteResult = `<DeleteEndpointResponse xmlns="https://sns.amazonaws.com/doc/2010-03-31/">
        <ResponseMetadata>
            <RequestId>c1d2b191-353c-5a5f-8969-fbdd3900afa8</RequestId>
        </ResponseMetadata>
    </DeleteEndpointResponse>`;

    const createResult = `<CreatePlatformEndpointResponse xmlns="https://sns.amazonaws.com/doc/2010-03-31/">
        <CreatePlatformEndpointResult>
            <EndpointArn>some:fake:arn:endpoint</EndpointArn>
        </CreatePlatformEndpointResult>
        <ResponseMetadata>
            <RequestId>6613341d-3e15-53f7-bf3c-7e56994ba278</RequestId>
        </ResponseMetadata>
    </CreatePlatformEndpointResponse>`;

    const publishResult = `<PublishResponse xmlns="https://sns.amazonaws.com/doc/2010-03-31/">
        <PublishResult>
            <MessageId>567910cd-659e-55d4-8ccb-5aaf14679dc0</MessageId>
        </PublishResult>
        <ResponseMetadata>
            <RequestId>d74b8436-ae13-5ab4-a9ff-ce54dfea72a0</RequestId>
        </ResponseMetadata>
    </PublishResponse>`;

    mock = nock(snsUrl)
      .persist()
      .post('/', body => body.Action === 'DeleteEndpoint')
      .reply(200, deleteResult)
      .post('/', body => body.Action === 'CreatePlatformEndpoint')
      .reply(200, createResult)
      .post('/', body => body.Action === 'Publish')
      .reply(200, publishResult);

    googleMock = nock('https://www.googleapis.com')
      .persist()
      .get('/oauth2/v2/userinfo')
      .reply(200, googleRider);


    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider4Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ]
    });

    driver = await createDriverLogin({
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      },
      locations: [location._id],
      email: 'driver1@mail.com',
      password: 'Password1',
      isOnline: true
    }, app, request, domain, driverSocket);

    rider1 = await createRiderLogin({ email: 'rider1@mail.com', password: 'Password1', phone: '111' }, app, request, domain, rider1Socket);
    rider2 = await createRiderLogin({ email: 'rider2@mail.com', password: 'Password2', phone: '222' }, app, request, domain, rider2Socket);
    rider3 = await createRiderLogin({ email: 'rider3@mail.com', password: 'Password3', phone: '333' }, app, request, domain, rider3Socket);
    rider4 = await createRiderLogin({ email: 'rider4@mail.com', password: 'Password4', phone: '444' }, app, request, domain, rider4Socket);

    function createSubscription(riderToken) {
      const payload = {
        deviceToken: riderToken,
        platform: 'ios',
        environment: 'debug'
      };
      return riderEndpoint('/v1/notifications', 'post', riderToken, app, request, domain, payload, 200);
    }

    const subscriptionPromises = [rider1, rider2, rider3, rider4].map(
      r => createSubscription(r.riderToken)
    );
    await Promise.all(subscriptionPromises);
  });

  after(async () => {
    mock.interceptors.forEach(nock.removeInterceptor);
    googleMock.interceptors.forEach(nock.removeInterceptor);
  });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('DELETE /user', () => {
    describe('ride/request ongoing validation', () => {
      it('doesn\'t allow deletion with ongoing requests', async () => {
        await createRequest(
          rider1.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
        );

        const { body } = await riderEndpoint('/v1/user', 'delete', rider1.riderToken, app, request, domain, {}, 400);
        sinon.assert.match(body.message, TI18N.en.OngoingRequestError.default);

        const rider = await Riders.findOne({ _id: rider1.rider._id });
        sinon.assert.match(rider.phone, '111');
        sinon.assert.match(rider.email, 'rider1@mail.com');
        return sinon.assert.match(rider.isDeleted, false);
      });
      it('doesn\'t allow deletion with ongoing rides', async () => {
        await createRequest(
          rider2.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
        );
        await driverSearcher.search();

        const { body } = await riderEndpoint('/v1/user', 'delete', rider2.riderToken, app, request, domain, {}, 400);
        sinon.assert.match(body.message, TI18N.en.OngoingRideError.default);

        const rider = await Riders.findOne({ _id: rider2.rider._id });
        sinon.assert.match(rider.phone, '222');
        sinon.assert.match(rider.email, 'rider2@mail.com');
        return sinon.assert.match(rider.isDeleted, false);
      });
    });

    describe('deletion success', () => {
      it('masks phone and email', async () => {
        sinon.assert.match(await SnsArns.find({ userId: rider3.rider._id }).countDocuments(), 1);
        sinon.assert.match(await SnsArns.countDocuments(), 4);

        const { body } = await riderEndpoint('/v1/user', 'delete', rider3.riderToken, app, request, domain, {}, 200);
        sinon.assert.match(body.message, TI18N.en.riderAccount.deleteSuccess);

        sinon.assert.match(await SnsArns.find({ userId: rider3.rider._id }).countDocuments(), 0);

        const rider = await Riders.findOne({ _id: rider3.rider._id });
        sinon.assert.match(rider.phone, `${rider3.rider._id}_333`);
        sinon.assert.match(rider.email, `${rider3.rider._id}_rider3@mail.com`);
        return sinon.assert.match(rider.isDeleted, true);
      });

      it('allows creation of account with same email and phone', async () => {
        const riderBody = {
          dob: '1994-07-02',
          password: 'password1!',
          firstName: 'fname',
          lastName: 'lname',
          gender: 'male',
          zip: '3030',
          email: rider4.rider.email,
          phone: rider4.rider.phone
        };
        const response = await signUp(riderBody, app, request, domain.rider);
        sinon.assert.match(response.body.message, TI18N.en.registration.email);

        // Setup stripe account
        const {
          stripeCustomerId: oldStripeCustomerId
        } = await getPaymentSettings(rider4.riderToken, app, request, domain);
        sinon.assert.match(!!oldStripeCustomerId, true);

        // Check SNS subscriptions before and after deletion
        sinon.assert.match(await SnsArns.find({ userId: rider4.rider._id }).countDocuments(), 1);
        const { body } = await riderEndpoint('/v1/user', 'delete', rider4.riderToken, app, request, domain, {}, 200);
        sinon.assert.match(body.message, TI18N.en.riderAccount.deleteSuccess);
        sinon.assert.match(await SnsArns.find({ userId: rider4.rider._id }).countDocuments(), 0);

        // Check account deletion masking
        const oldRider = await Riders.findOne({ _id: rider4.rider._id });
        sinon.assert.match(oldRider.phone, `${rider4.rider._id}_444`);
        sinon.assert.match(oldRider.email, `${rider4.rider._id}_rider4@mail.com`);
        sinon.assert.match(oldRider.subscriptions.receipt, false);
        sinon.assert.match(oldRider.isDeleted, true);

        // Create another account with same email and phone
        await signUp(riderBody, app, request, domain.rider);

        // Setup stripe account
        const {
          accessToken: newRiderToken
        } = await riderLogin(riderBody.email, riderBody.password, app, request, domain);
        await getPaymentSettings(newRiderToken, app, request, domain);

        const newRider = await Riders.findOne({ email: 'rider4@mail.com' });
        sinon.assert.match(newRider.phone, '444');
        sinon.assert.match(newRider.subscriptions.receipt, true);
        sinon.assert.match(oldStripeCustomerId !== newRider.stripeCustomerId, true);
        return sinon.assert.match(newRider.isDeleted, false);
      });
      it('should mask google id during deletion and allow new google account creation', async () => {
        const riderAccessToken = '123456789';
        const response = await riderEndpoint(
          '/v1/auth/google', 'post',
          '', app, request, domain,
          { accessToken: riderAccessToken },
          200
        );

        const rider = await Riders.findOne({ email: googleRider.email });
        sinon.assert.match(rider.google, googleRider.id);

        await riderEndpoint('/v1/user', 'delete', response.body.accessToken, app, request, domain, {}, 200);

        const deletedRider = await Riders.findOne({ email: `${rider._id}_${rider.email}` });
        sinon.assert.match(deletedRider.google, `${rider._id}_${googleRider.id}`);
        sinon.assert.match(deletedRider.isDeleted, true);

        // Create a new rider with the same Google account
        await riderEndpoint(
          '/v1/auth/google', 'post',
          '', app, request, domain,
          { accessToken: riderAccessToken },
          200
        );

        const newRider = await Riders.findOne({ email: googleRider.email });
        sinon.assert.match(newRider.google, googleRider.id);
        sinon.assert.match(newRider.isDeleted, false);
      });
    });
  });
});
