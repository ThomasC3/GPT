import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';

import momentTimezone from 'moment-timezone';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Settings, Riders, Locations, Requests
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { signUp } from '../utils/ride';
import redisHandler from '../utils/redis';
import {
  riderEndpoint, createRiderLogin, createRequest, getPaymentSettings
} from '../utils/rider';
import { TI18N } from '../utils/i18nHelper';
import { emailVerificationDeadline } from '../../utils/rider';
// import { ORIGINAL_STRIPE_CLIENT, mockStripe } from '../global';
import { stripe } from '../../services';

let location;
const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

const riderBody = {
  email: 'rider@mail.com',
  dob: '1994-07-02',
  password: 'password1!',
  firstName: 'fname',
  lastName: 'lname',
  gender: 'male',
  phone: '911111111',
  zip: '3030'
};
const keyLoc = {
  req1p: [
    40.683619,
    -73.907704,
    '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'
  ],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

let riderSocket;
let sandbox;

describe('Rider Email verification', () => {
  before(async () => {
    sandbox = sinon.createSandbox();
    // stripe.stripeClient = ORIGINAL_STRIPE_CLIENT;
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ],
      serviceHours: []
    });
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);
  });

  beforeEach(async () => {
    sandbox.restore();
    riderSocket.removeAllListeners();

    await Riders.deleteMany();
    await Requests.deleteMany();
    redisHandler.deleteAllKeys('rl_rider_signup:*');
  });

  afterEach(async () => {
    redisHandler.deleteAllKeys('rl_rider_signup:*');
  });

  after(async () => {
    // mockStripe();
    sandbox.restore();
  });

  describe('Email verification deadline', () => {
    it('adds email verification deadline to new rider account', async () => {
      await signUp(riderBody, app, request, domain.rider);
      const rider = await Riders.findOne({ email: riderBody.email });
      const deadline = emailVerificationDeadline();
      sinon.assert.match(!!rider.emailVerificationDeadline, true);
      sinon.assert.match(rider.isEmailVerified, false);
      sinon.assert.match(
        momentTimezone(rider.emailVerificationDeadline).format('DD-MM-YYYY'),
        deadline.format('DD-MM-YYYY')
      );
    });
    it('adds email verification deadline to existing riders when rider fetches profile', async () => {
      const { riderToken } = await createRiderLogin(riderBody,
        app,
        request,
        domain,
        riderSocket);

      await Riders.findOneAndUpdate(
        { email: riderBody.email },
        { emailVerificationDeadline: null }
      );

      const response = await riderEndpoint(
        '/v1/user',
        'get',
        riderToken,
        app,
        request,
        domain
      );
      const deadline = emailVerificationDeadline();
      sinon.assert.match(
        momentTimezone(response.body.emailVerificationDeadline).format(),
        deadline.format()
      );
      sinon.assert.match(!!response.body.emailVerificationDeadline, true);
      sinon.assert.match(response.body.isEmailVerified, false);
    });
  });
  describe('Email verification', () => {
    it('should send verification code and verify existing email successfully', async () => {
      const { riderToken } = await createRiderLogin(
        {
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: '1',
          password: 'Password1',
          dob: '2000-12-11'
        },
        app,
        request,
        domain,
        riderSocket
      );

      await riderEndpoint(
        '/v1/send-email-verification',
        'post',
        riderToken,
        app,
        request,
        domain,
        {},
        200
      );
      const rider = await Riders.getRider({ email: 'rider@mail.com' });
      sinon.assert.match(rider.isEmailVerified, false);
      sinon.assert.match(!!rider.emailCode, true);

      await riderEndpoint(
        '/v1/email-verify',
        'post',
        riderToken,
        app,
        request,
        domain,
        { code: rider.emailCode },
        200
      );

      const verifiedRider = await Riders.getRider({ email: 'rider@mail.com' });
      sinon.assert.match(verifiedRider.isEmailVerified, true);
      sinon.assert.match(!!verifiedRider.emailCode, false);
    });
    it('should not send verification email to already verified email', async () => {
      const { riderToken } = await createRiderLogin(
        {
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: '1',
          password: 'Password1',
          dob: '2000-12-11'
        },
        app,
        request,
        domain,
        riderSocket
      );
      await Riders.findOneAndUpdate(
        { email: 'rider@mail.com' },
        { isEmailVerified: true }
      );

      const response = await riderEndpoint(
        '/v1/send-email-verification',
        'post',
        riderToken,
        app,
        request,
        domain,
        {},
        400
      );
      sinon.assert.match(response.body.message, 'The email address for this account is already verified');
    });

    it('should not be able to change and verify new email with wrong password', async () => {
      const { riderToken } = await createRiderLogin(
        {
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: '1',
          password: 'Password1',
          dob: '2000-12-11'
        },
        app,
        request,
        domain,
        riderSocket
      );

      const response = await riderEndpoint(
        '/v1/send-email-verification',
        'post',
        riderToken,
        app,
        request,
        domain,
        { email: 'new@mail.com', password: 'wrongPassword' },
        400
      );
      sinon.assert.match(response.body.message, 'Wrong password');
    });

    it('should not be able to change and verify new email if email already exists', async () => {
      await signUp(riderBody, app, request, domain.rider);
      const { riderToken } = await createRiderLogin(
        {
          email: 'rider2@mail.com',
          firstName: 'Rider',
          lastName: '1',
          password: 'Password1',
          dob: '2000-12-11'
        },
        app,
        request,
        domain,
        riderSocket
      );

      const response = await riderEndpoint(
        '/v1/send-email-verification',
        'post',
        riderToken,
        app,
        request,
        domain,
        { email: riderBody.email, password: 'Password1' },
        400
      );
      sinon.assert.match(
        response.body.message,
        'The email address you provided already exists for another user. Please enter a different email address to proceed with the verification process'
      );
    });

    it('should change and verify new email successfully with correct password', async () => {
      const { riderToken } = await createRiderLogin(
        {
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: '1',
          password: 'Password1',
          dob: '2000-12-11'
        },
        app,
        request,
        domain,
        riderSocket
      );

      await riderEndpoint(
        '/v1/send-email-verification',
        'post',
        riderToken,
        app,
        request,
        domain,
        { email: 'new@mail.com', password: 'Password1' },
        200
      );
      const rider = await Riders.findOne({ email: 'rider@mail.com' });
      sinon.assert.match(rider.isEmailVerified, false);
      sinon.assert.match(!!rider.emailCode, true);
      sinon.assert.match(rider.tempEmail, 'new@mail.com');

      await riderEndpoint(
        '/v1/email-verify',
        'post',
        riderToken,
        app,
        request,
        domain,
        { code: rider.emailCode, email: 'new@mail.com' },
        200
      );

      const verifiedRider = await Riders.findOne({ email: 'new@mail.com' });
      sinon.assert.match(verifiedRider.isEmailVerified, true);
      sinon.assert.match(!!verifiedRider.emailCode, false);
      sinon.assert.match(!!verifiedRider.tempEmail, false);
    });
    it('email verification should fail with wrong code', async () => {
      const { riderToken } = await createRiderLogin(
        {
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: '1',
          password: 'Password1',
          dob: '2000-12-11'
        },
        app,
        request,
        domain,
        riderSocket
      );

      await riderEndpoint(
        '/v1/send-email-verification',
        'post',
        riderToken,
        app,
        request,
        domain,
        { email: 'new@mail.com', password: 'Password1' },
        200
      );
      const rider = await Riders.findOne({ email: 'rider@mail.com' });
      sinon.assert.match(rider.isEmailVerified, false);
      sinon.assert.match(!!rider.emailCode, true);
      sinon.assert.match(rider.tempEmail, 'new@mail.com');

      const response = await riderEndpoint(
        '/v1/email-verify',
        'post',
        riderToken,
        app,
        request,
        domain,
        { email: 'new@mail.com', code: 'wrongCode' },
        400
      );
      sinon.assert.match(
        response.body.message,
        'The pincode you entered is invalid.'
      );
    });
    it('email verification should fail with wrong email during code validation', async () => {
      const { riderToken } = await createRiderLogin(
        {
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: '1',
          password: 'Password1',
          dob: '2000-12-11'
        },
        app,
        request,
        domain,
        riderSocket
      );

      await riderEndpoint(
        '/v1/send-email-verification',
        'post',
        riderToken,
        app,
        request,
        domain,
        { email: 'new@mail.com', password: 'Password1' },
        200
      );
      const rider = await Riders.findOne({ email: 'rider@mail.com' });
      sinon.assert.match(rider.isEmailVerified, false);
      sinon.assert.match(!!rider.emailCode, true);
      sinon.assert.match(rider.tempEmail, 'new@mail.com');

      const response = await riderEndpoint(
        '/v1/email-verify',
        'post',
        riderToken,
        app,
        request,
        domain,
        { email: 'wrongEmail@mail.com', code: rider.emailCode },
        400
      );
      sinon.assert.match(response.body.message, 'The email address you entered is not valid. Please reenter a valid email');
    });
  });
  describe('Ride requests', () => {
    it('allows ride request when email is not verified and deadline is not passed', async () => {
      const { riderToken } = await createRiderLogin(
        riderBody,
        app,
        request,
        domain,
        riderSocket
      );

      await createRequest(
        riderToken,
        keyLoc.req1p,
        keyLoc.req1d,
        location._id,
        app,
        request,
        domain,
        false,
        1
      );

      const requests = await Requests.find();
      sinon.assert.match(requests.length, 1);
    });
    it('rejects ride request when email is not verified and deadline is passed', async () => {
      const { riderToken } = await createRiderLogin(
        riderBody,
        app,
        request,
        domain,
        riderSocket
      );
      await Riders.updateOne(
        { email: riderBody.email },
        { emailVerificationDeadline: momentTimezone().subtract(1, 'day') }
      );
      const response = await createRequest(
        riderToken,
        keyLoc.req1p,
        keyLoc.req1d,
        location._id,
        app,
        request,
        domain,
        false,
        1,
        400
      );
      sinon.assert.match(response.code, 400);
      sinon.assert.match(response.message, TI18N.en.request.unVerifiedEmail);
    });
    it('allows ride request when email has been verified', async () => {
      await Riders.updateOne(
        { email: riderBody.email },
        { isEmailVerified: true }
      );
      const { riderToken } = await createRiderLogin(
        riderBody,
        app,
        request,
        domain,
        riderSocket
      );
      await createRequest(
        riderToken,
        keyLoc.req1p,
        keyLoc.req1d,
        location._id,
        app,
        request,
        domain,
        false,
        1
      );

      const requests = await Requests.find();
      sinon.assert.match(requests.length, 1);
    });
  });
  describe('Fetch rider details GET /user', () => {
    it('returns correct rider email verification details', async () => {
      let response;
      const { riderToken } = await createRiderLogin(
        riderBody,
        app,
        request,
        domain,
        riderSocket
      );

      response = await riderEndpoint(
        '/v1/user',
        'get',
        riderToken,
        app,
        request,
        domain
      );
      sinon.assert.match(response.body.isEmailVerified, false);
      sinon.assert.match(response.body.isPastEmailVerificationDeadline, false);

      await Riders.findOneAndUpdate(
        { email: riderBody.email },
        { emailVerificationDeadline: momentTimezone().subtract(1, 'day') }
      );

      response = await riderEndpoint(
        '/v1/user',
        'get',
        riderToken,
        app,
        request,
        domain
      );

      sinon.assert.match(response.body.isEmailVerified, false);
      sinon.assert.match(response.body.isPastEmailVerificationDeadline, true);

      await Riders.findOneAndUpdate(
        { email: riderBody.email },
        { isEmailVerified: true }
      );
      response = await riderEndpoint(
        '/v1/user',
        'get',
        riderToken,
        app,
        request,
        domain
      );
      sinon.assert.match(response.body.isEmailVerified, true);
      sinon.assert.match(response.body.isPastEmailVerificationDeadline, false);
    });
  });

  describe('Rider payment information', () => {
    it('should update email in stripe after email change', async () => {
      const email = 'rider@mail.com';
      const newEmail = 'new@mail.com';
      const { riderToken } = await createRiderLogin(
        {
          email,
          firstName: 'Rider',
          lastName: '1',
          password: 'Password1',
          dob: '2000-12-11'
        },
        app,
        request,
        domain,
        riderSocket
      );

      // set stripe customer ID
      const paymentInformation = await getPaymentSettings(riderToken, app, request, domain);
      const stripeCustomerData = await stripe.getCustomer(paymentInformation.stripeCustomerId);
      sinon.assert.match(stripeCustomerData.email, email);

      await riderEndpoint(
        '/v1/send-email-verification',
        'post',
        riderToken,
        app,
        request,
        domain,
        { email: newEmail, password: 'Password1' },
        200
      );

      const { emailCode } = await Riders.findOne({ email });
      await riderEndpoint(
        '/v1/email-verify',
        'post',
        riderToken,
        app,
        request,
        domain,
        { code: emailCode, email: newEmail },
        200
      );

      const response = await riderEndpoint(
        '/v1/user',
        'get',
        riderToken,
        app,
        request,
        domain
      );
      sinon.assert.match(response.body.isEmailVerified, true);
      sinon.assert.match(response.body.email, newEmail);
      // const updatedStripeCustomerData = await stripe.getCustomer(response.body.stripeCustomerId);
      // sinon.assert.match(updatedStripeCustomerData.email, newEmail);
    });
  });
});
