import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import { expect } from 'chai';
import nock from 'nock';
import jwt from 'jsonwebtoken';
import app from '../../server';
import { port, domain } from '../../config';
import { Settings, Riders } from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { signUp } from '../utils/ride';
import redisHandler from '../utils/redis';
import { riderEndpoint, createRiderLogin, riderLogin } from '../utils/rider';
import Organizations from '../../models/Organizations';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

const riderBody = {
  email: 'test@test.com',
  dob: '1994-07-02',
  password: 'password1!',
  firstName: 'fname',
  lastName: 'lname',
  gender: 'male',
  phone: '911111111',
  zip: '3030'
};

const demoGoogleRider = {
  id: '110169484474386276334',
  email: 'user@example.com',
  verified_email: true,
  name: 'John Doe',
  given_name: 'John',
  family_name: 'Doe',
  picture: '',
  locale: 'en'
};

const demoAppleRider = {
  id: '110169484474386276334',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe'
};

let riderSocket;
let sandbox;
let googleMock;
let appleMock;
let jwtVerifyStub;

describe('Rider Auth', () => {
  const setupAppleAuthStubs = (email) => {
    jwtVerifyStub = sandbox.stub(jwt, 'verify').callsFake(() => ({
      sub: demoAppleRider.id,
      email
    }));

    sandbox.stub(jwt, 'decode').callsFake(() => ({
      header: { kid: 'testKid' },
      sub: demoAppleRider.id,
      email
    }));
  };

  before(async () => {
    sandbox = sinon.createSandbox();
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
  });

  beforeEach(async () => {
    riderSocket.removeAllListeners();

    await Riders.deleteMany();
    redisHandler.deleteAllKeys('rl_rider_signup:*');
  });

  after(() => {
    sandbox.restore();
  });

  describe('Google registration POST /auth/google', () => {
    const riderAccessToken = '283923901920';
    before(async () => {
      googleMock = nock('https://www.googleapis.com')
        .persist()
        .get('/oauth2/v2/userinfo')
        .reply(200, demoGoogleRider);
    });

    after(async () => {
      googleMock.interceptors.forEach(nock.removeInterceptor);
    });
    it('should successfully register a new rider using Google authentication', async () => {
      const response = await riderEndpoint(
        '/v1/auth/google', 'post',
        '', app, request, domain,
        { accessToken: riderAccessToken },
        200
      );
      expect(response.body.email).to.equal(demoGoogleRider.email);
      expect(response.body.phone).to.equal(null);
      expect(response.body.accessToken).to.be.a('string');

      // confirm the rider is saved
      const foundGoogleRider = await Riders.findOne({ email: demoGoogleRider.email });
      expect(foundGoogleRider.isEmailVerified).to.equal(true);
      expect(foundGoogleRider.email).to.equal(demoGoogleRider.email);
    });
    it('should authenticate an existing rider using Google login', async () => {
      const response = await riderEndpoint(
        '/v1/auth/google', 'post',
        '', app, request, domain,
        { accessToken: riderAccessToken },
        200
      );
      expect(response.body.email).to.equal(demoGoogleRider.email);
      expect(response.body.accessToken).to.be.a('string');
    });
    it('should throw error when google access token is not provided', async () => {
      const response = await riderEndpoint(
        '/v1/auth/google', 'post',
        '', app, request, domain,
        { accessToken: '' },
        403
      );

      return sinon.assert.match(response.body.message, 'Access token is required');
    });
    it('should return an error when Google authentication provides no payload', async () => {
      googleMock.interceptors.forEach(nock.removeInterceptor);
      googleMock = nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, null);

      const response = await riderEndpoint(
        '/v1/auth/google', 'post',
        '', app, request, domain,
        { accessToken: riderAccessToken },
        400
      );

      expect(response.body.message).to.equal('Unable to retrieve user information from Google. Please try again later.');
    });
    it('should return an error when Google authentication fails', async () => {
      googleMock.interceptors.forEach(nock.removeInterceptor);
      googleMock = nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(400, 'error');

      const response = await riderEndpoint(
        '/v1/auth/google', 'post',
        '', app, request, domain,
        { accessToken: riderAccessToken },
        400
      );

      expect(response.body.message).to.equal('We were unable to fetch your account information.');
    });
  });

  describe('Apple registration POST /auth/apple', () => {
    const riderIdentityToken = 'mockedToken';

    beforeEach(async () => {
      appleMock = nock('https://appleid.apple.com')
        .persist()
        .get('/auth/keys')
        .reply(200, {
          keys: [
            {
              kid: 'testKid',
              kty: 'RSA',
              use: 'sig',
              alg: 'RS256',
              n: 'testN',
              e: 'AQAB'
            }
          ]
        });
      setupAppleAuthStubs(demoAppleRider.email);
    });

    afterEach(() => {
      sandbox.restore();
      appleMock.interceptors.forEach(nock.removeInterceptor);
    });

    it('should successfully register a new rider using Apple authentication', async () => {
      const response = await riderEndpoint(
        '/v1/auth/apple', 'post',
        '', app, request, domain,
        {
          identityToken: riderIdentityToken,
          firstName: demoAppleRider.firstName,
          lastName: demoAppleRider.lastName
        },
        200
      );
      expect(response.body.email).to.equal(demoAppleRider.email);
      expect(response.body.phone).to.equal(null);
      expect(response.body.accessToken).to.be.a('string');

      // confirm the rider is saved
      const foundAppleRider = await Riders.findOne({ email: demoAppleRider.email });
      expect(foundAppleRider.isEmailVerified).to.equal(true);
      expect(foundAppleRider.email).to.equal(demoAppleRider.email);
    });

    it('should authenticate an existing rider using Apple login', async () => {
      await Riders.create({
        email: demoAppleRider.email,
        firstName: demoAppleRider.firstName,
        lastName: demoAppleRider.lastName,
        apple: demoAppleRider.id,
        isEmailVerified: true
      });

      const response = await riderEndpoint(
        '/v1/auth/apple', 'post',
        '', app, request, domain,
        {
          identityToken: riderIdentityToken,
          firstName: demoAppleRider.firstName,
          lastName: demoAppleRider.lastName
        },
        200
      );
      expect(response.body.email).to.equal(demoAppleRider.email);
      expect(response.body.accessToken).to.be.a('string');
    });

    it('should merge an existing rider account created with email and password when using Apple sign-in', async () => {
      const signUpResponse = await signUp(riderBody, app, request, domain.rider);
      expect(signUpResponse.status).to.equal(200);

      const response = await riderEndpoint(
        '/v1/auth/apple', 'post',
        '', app, request, domain,
        {
          identityToken: riderIdentityToken,
          firstName: demoAppleRider.firstName,
          lastName: demoAppleRider.lastName
        },
        200
      );

      expect(response.body.email).to.equal(demoAppleRider.email);
      expect(response.body.accessToken).to.be.a('string');

      // Confirm the rider is updated with Apple ID
      const foundAppleRider = await Riders.findOne({ email: demoAppleRider.email });
      expect(foundAppleRider.isEmailVerified).to.equal(true);
      expect(foundAppleRider.email).to.equal(demoAppleRider.email);
      expect(foundAppleRider.apple).to.equal(demoAppleRider.id);
    });

    it('should mask apple id during deletion and allow new apple account creation', async () => {
      let response = await riderEndpoint(
        '/v1/auth/apple', 'post',
        '', app, request, domain,
        {
          identityToken: riderIdentityToken,
          firstName: demoAppleRider.firstName,
          lastName: demoAppleRider.lastName
        },
        200
      );
      const rider = await Riders.findOne({ email: demoAppleRider.email });
      expect(rider.apple).to.equal(demoAppleRider.id);

      // restore jwt.verify for request to /user
      jwtVerifyStub.restore();
      await riderEndpoint('/v1/user', 'delete', response.body.accessToken, app, request, domain, {}, 200);

      const deletedRider = await Riders.findOne({ email: `${rider._id}_${rider.email}` });
      sinon.assert.match(deletedRider.apple, `${rider._id}_${demoAppleRider.id}`);
      sinon.assert.match(deletedRider.isDeleted, true);

      jwtVerifyStub = sandbox.stub(jwt, 'verify').callsFake(() => ({
        sub: demoAppleRider.id,
        email: demoAppleRider.email
      }));
      response = await riderEndpoint(
        '/v1/auth/apple', 'post',
        '', app, request, domain,
        {
          identityToken: riderIdentityToken,
          firstName: demoAppleRider.firstName,
          lastName: demoAppleRider.lastName
        },
        200
      );
      expect(response.body.email).to.equal(demoAppleRider.email);
      expect(response.body.phone).to.equal(null);
      expect(response.body.accessToken).to.be.a('string');
    });

    it('should throw error when Apple identity token is not provided', async () => {
      const response = await riderEndpoint(
        '/v1/auth/apple', 'post',
        '', app, request, domain,
        {
          identityToken: '',
          firstName: demoAppleRider.firstName,
          lastName: demoAppleRider.lastName
        },
        403
      );

      return sinon.assert.match(response.body.message, 'Identity token is required');
    });

    it('should return an error when Apple authentication provides no payload', async () => {
      appleMock.interceptors.forEach(nock.removeInterceptor);
      appleMock = nock('https://appleid.apple.com')
        .get('/auth/keys')
        .reply(200, null);

      const response = await riderEndpoint(
        '/v1/auth/apple', 'post',
        '', app, request, domain,
        {
          identityToken: riderIdentityToken,
          firstName: demoAppleRider.firstName,
          lastName: demoAppleRider.lastName
        },
        400
      );

      expect(response.body.message).to.equal('We were unable to fetch your account information.');
    });

    it('should return an error when Apple authentication fails', async () => {
      appleMock.interceptors.forEach(nock.removeInterceptor);
      appleMock = nock('https://appleid.apple.com')
        .get('/auth/keys')
        .reply(400, 'error');

      const response = await riderEndpoint(
        '/v1/auth/apple', 'post',
        '', app, request, domain,
        {
          identityToken: riderIdentityToken,
          firstName: demoAppleRider.firstName,
          lastName: demoAppleRider.lastName
        },
        400
      );

      expect(response.body.message).to.equal('We were unable to fetch your account information.');
    });
  });

  describe('POST /register', () => {
    it('Should create two accounts', async () => {
      await signUp(riderBody, app, request, domain.rider);
      const response = await signUp(
        { ...riderBody, email: 'test2@test.com' },
        app, request,
        domain.rider
      );

      const riders = await Riders.find({});
      sinon.assert.match(riders.length, 2);
      return sinon.assert.match(response.status, 200);
    });

    it('Should not allow riders with same email with different case', async () => {
      await signUp(riderBody, app, request, domain.rider);
      const response = await signUp(
        { ...riderBody, email: 'TEST@test.com' },
        app, request,
        domain.rider
      );

      const riders = await Riders.find({});
      sinon.assert.match(riders.length, 1);
      return sinon.assert.match(response.status, 400);
    });

    it('Should not allow riders with same email', async () => {
      await signUp(riderBody, app, request, domain.rider);
      const response = await signUp(riderBody, app, request, domain.rider);

      const riders = await Riders.find({});
      sinon.assert.match(riders.length, 1);
      return sinon.assert.match(response.status, 400);
    });

    it('Should not allow riders with same email', async () => {
      await signUp(riderBody, app, request, domain.rider);
      const response = await signUp(riderBody, app, request, domain.rider);

      const riders = await Riders.find({});
      sinon.assert.match(riders.length, 1);
      sinon.assert.match(response.body.code, 400);
      sinon.assert.match(
        response.body.message,
        'An account already exists for this email or phone'
      );
      return sinon.assert.match(response.status, 400);
    });
    it('should not allow riders with invalid email domain', async () => {
      await Settings.updateSettings({ blacklistedEmailDomains: 'temp.com,blacklisted.com' });
      const response = await signUp(
        { ...riderBody, email: 'rider@blacklisted.com' },
        app, request, domain.rider
      );
      sinon.assert.match(response.body.code, 400);
      sinon.assert.match(response.body.message, 'Unable to create rider');
    });
    it('should return intercom hashes when registering a new user', async () => {
      const response = await signUp({ ...riderBody, email: 'rider@mail.com' }, app, request, domain.rider);

      expect(response.status).to.equal(200);
      expect(response.body.iosUserIntercomHash).to.be.a('string');
      expect(response.body.androidUserIntercomHash).to.be.a('string');
      expect(response.body.accessToken).to.be.a('string');
    });
  });
  describe('POST /login', () => {
    it('does not allow login of deleted account', async () => {
      await signUp(riderBody, app, request, domain.rider);
      await Riders.updateOne({ email: riderBody.email }, { isDeleted: true });
      await riderEndpoint(
        '/v1/login',
        'post',
        '',
        app,
        request,
        domain,
        { email: riderBody.email, password: riderBody.password },
        400
      );
    });
    it('logs in successfully', async () => {
      await signUp(riderBody, app, request, domain.rider);
      const response = await riderEndpoint(
        '/v1/login',
        'post',
        '',
        app,
        request,
        domain,
        { email: riderBody.email, password: riderBody.password },
        200
      );
      expect(response.body.accessToken).to.be.a('string');
      expect(response.body.iosUserIntercomHash).to.be.a('string');
      expect(response.body.androidUserIntercomHash).to.be.a('string');
    });
  });
  describe('PUT /user', () => {
    it('does not allow email to be updated', async () => {
      const { riderToken } = await createRiderLogin({
        email: 'rider@mail.com',
        firstName: 'Rider',
        lastName: '1',
        password: 'Password1',
        dob: '2000-12-11'
      }, app, request, domain, riderSocket);

      await riderEndpoint(
        '/v1/user', 'put',
        riderToken, app, request, domain,
        { email: 'something@else.com', lastName: 'something' },
        200
      );

      const riders = await Riders.find({});
      sinon.assert.match(riders.length, 1);
      sinon.assert.match(riders[0].lastName, 'something');
      return sinon.assert.match(riders[0].email, 'rider@mail.com');
    });

    it('doesn allow email to be blanked', async () => {
      const { riderToken } = await createRiderLogin({
        email: 'rider@mail.com',
        firstName: 'Rider',
        lastName: 'lastName',
        password: 'Password1',
        dob: '2000-12-11'
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        '/v1/user', 'put',
        riderToken, app, request, domain,
        { email: '', lastName: 'something' },
        400
      );

      sinon.assert.match(
        response.body.message,
        'We were unable to update your account information.'
      );

      const riders = await Riders.find({});
      sinon.assert.match(riders.length, 1);
      sinon.assert.match(riders[0].lastName, 'lastName');
      return sinon.assert.match(riders[0].email, 'rider@mail.com');
    });

    it('doesn allow lastName to be blanked', async () => {
      const { riderToken } = await createRiderLogin({
        email: 'rider@mail.com',
        firstName: 'Rider',
        lastName: 'lastName',
        password: 'Password1',
        dob: '2000-12-11'
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        '/v1/user', 'put',
        riderToken, app, request, domain,
        { lastName: '' },
        400
      );

      sinon.assert.match(
        response.body.message,
        'We were unable to update your account information.'
      );

      const riders = await Riders.find({});
      sinon.assert.match(riders.length, 1);
      sinon.assert.match(riders[0].email, 'rider@mail.com');
      return sinon.assert.match(riders[0].lastName, 'lastName');
    });

    it('should not allow firstName to be blank', async () => {
      const { riderToken } = await createRiderLogin({
        email: 'rider@mail.com',
        firstName: 'Rider',
        lastName: 'lastName',
        password: 'Password1',
        dob: '2000-12-11'
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        '/v1/user', 'put',
        riderToken, app, request, domain,
        { firstName: '' },
        400
      );

      sinon.assert.match(
        response.body.message,
        'We were unable to update your account information.'
      );

      const riders = await Riders.find({});
      sinon.assert.match(riders.length, 1);
      sinon.assert.match(riders[0].email, 'rider@mail.com');
      return sinon.assert.match(riders[0].firstName, 'Rider');
    });
    it('should successfully update user profile information', async () => {
      const { riderToken } = await createRiderLogin({
        email: 'rider@mail.com',
        firstName: 'Rider',
        lastName: 'lastName',
        password: 'Password1',
        dob: '2000-12-11'
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        '/v1/user', 'put',
        riderToken, app, request, domain,
        { firstName: 'newFirstName' },
        200
      );

      expect(response.body.email).to.equal('rider@mail.com');
      expect(response.body.firstName).to.equal('newFirstName');
      expect(response.body.iosUserIntercomHash).to.be.a('string');
      expect(response.body.androidUserIntercomHash).to.be.a('string');
    });
  });

  describe('POST /forgot-password', () => {
    describe('email validation', () => {
      it('doesn\'t allow email to be blank when request new password', async () => {
        await createRiderLogin({
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: 'lastName',
          password: 'Password1',
          dob: '2000-12-11'
        }, app, request, domain, riderSocket);

        const response = await riderEndpoint(
          '/v1/forgot-password', 'post',
          '', app, request, domain,
          { email: '' },
          406
        );

        sinon.assert.match(
          response.body.message,
          'Email not sent'
        );

        const riders = await Riders.find({});
        sinon.assert.match(riders.length, 1);
        sinon.assert.match(riders[0].email, 'rider@mail.com');
        return sinon.assert.match(riders[0].firstName, 'Rider');
      });
      it('doesn\'t allow request new password of email that does not exist', async () => {
        await createRiderLogin({
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: 'lastName',
          password: 'Password1',
          dob: '2000-12-11'
        }, app, request, domain, riderSocket);
        const response = await riderEndpoint(
          '/v1/forgot-password', 'post',
          '', app, request, domain,
          { email: 'not_a_rider@mail.com' },
          400
        );

        return sinon.assert.match(
          response.body.message,
          'Email not sent'
        );
      });
      it('allows request of new password with valid email', async () => {
        await createRiderLogin({
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: 'lastName',
          password: 'Password1',
          dob: '2000-12-11'
        }, app, request, domain, riderSocket);

        const response = await riderEndpoint(
          '/v1/forgot-password', 'post',
          '', app, request, domain,
          { email: 'rider@mail.com' },
          200
        );

        sinon.assert.match(response.body.email, 'rider@mail.com');
        return sinon.assert.match(response.body.message, 'Please check your email inbox for a PIN code to verify your account.');
      });
      it('allows reset of new password for legacy rider', async () => {
        await Riders.collection.insertOne({
          email: 'rider@mail.com',
          dob: '01-20-2019',
          emailCode: null,
          facebook: '123',
          firstName: 'Rider',
          gender: 'unspecified',
          isBanned: false,
          isDeleted: false,
          isEmailVerified: true,
          isExistingUser: true,
          isLegacyUser: true,
          isPhoneVerified: true,
          lastName: '',
          legacyId: 'RandomIdWithNumb3rs',
          password: null,
          phone: '+19111111111',
          phoneCode: null,
          socketIds: [],
          zip: '92101',
          google: null
        });

        const riderBefore = await Riders.findOne({});

        let response = await riderEndpoint(
          '/v1/forgot-password', 'post',
          null, app, request, domain,
          { email: 'rider@mail.com' },
          200
        );

        const riderAfter = await Riders.findOne({});

        sinon.assert.match(!!riderBefore.emailCode, false);
        sinon.assert.match(!!riderAfter.emailCode, true);
        sinon.assert.match(!!riderBefore.isEmailVerified, true);
        sinon.assert.match(!!riderAfter.isEmailVerified, false);
        sinon.assert.match(response.body.email, 'rider@mail.com');
        sinon.assert.match(response.body.message, 'Please check your email inbox for a PIN code to verify your account.');

        response = await riderEndpoint(
          '/v1/forgot-password/verify', 'post',
          'riderToken', app, request, domain,
          {
            email: riderAfter.email,
            code: riderAfter.emailCode
          },
          200
        );

        const riderToken = response.body.accessToken;

        response = await riderEndpoint(
          '/v1/change-password', 'post',
          riderToken, app, request, domain,
          { password: '123' },
          200
        );

        const riderloginResult = await riderLogin(riderAfter.email, '123', app, request, domain);
        sinon.assert.match(riderloginResult.isEmailVerified, true);
        return sinon.assert.match(riderloginResult.emailCode, null);
      });
    });
  });
  describe('POST /logout', () => {
    describe('token validation', () => {
      it('doesn\'t logout if token not provided', async () => {
        await createRiderLogin({
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: 'lastName',
          password: 'Password1',
          dob: '2000-12-11'
        }, app, request, domain, riderSocket);

        const response = await riderEndpoint(
          '/v1/logout', 'post',
          null, app, request, domain,
          { deviceToken: 'invalidRiderToken' },
          400
        );

        return sinon.assert.match(response.body.message, 'Unable to log you out at this time.');
      });
      it('allows logout with valid token', async () => {
        const { riderToken } = await createRiderLogin({
          email: 'rider@mail.com',
          firstName: 'Rider',
          lastName: 'lastName',
          password: 'Password1',
          dob: '2000-12-11'
        }, app, request, domain, riderSocket);

        const response = await riderEndpoint(
          '/v1/logout', 'post',
          riderToken, app, request, domain,
          { deviceToken: riderToken },
          200
        );

        return sinon.assert.match(response.body.message, 'You\'ve been successfully logged out.');
      });
    });
  });

  describe('GET /user', () => {
    it('should return user profile data', async () => {
      const { riderToken } = await createRiderLogin({
        email: 'rider@mail.com',
        firstName: 'Rider',
        lastName: 'lastName',
        password: 'Password1',
        dob: '2000-12-11'
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        '/v1/user', 'get',
        riderToken, app, request, domain,
        {},
        200
      );

      expect(response.body.firstName).to.be.equal('Rider');
      expect(response.body.lastName).to.be.equal('lastName');
      expect(response.body.email).to.be.equal('rider@mail.com');
      expect(response.body.iosUserIntercomHash).to.be.a('string');
      expect(response.body.androidUserIntercomHash).to.be.a('string');
    });
  });

  describe('Organization Assignment', () => {
    const organizationEmail = 'test@ridecircuit.com';
    const regularEmail = 'test@unknown.com';

    before(() => {
      appleMock = nock('https://appleid.apple.com')
        .persist()
        .get('/auth/keys')
        .reply(200, {
          keys: [
            {
              kid: 'testKid',
              kty: 'RSA',
              use: 'sig',
              alg: 'RS256',
              n: 'testN',
              e: 'AQAB'
            }
          ]
        });
    });

    after(() => {
      appleMock.interceptors.forEach(nock.removeInterceptor);
    });

    it('should assign organization ID for email signup with ridecircuit.com domain', async () => {
      const response = await signUp(
        {
          ...riderBody,
          email: organizationEmail
        },
        app,
        request,
        domain.rider
      );

      expect(response.status).to.equal(200);

      const rider = await Riders.findOne({ email: organizationEmail });
      expect(rider.organization).to.equal(Organizations['ridecircuit.com']);
    });

    it('should not assign organization ID for email signup with non-circuit domain', async () => {
      const response = await signUp(
        {
          ...riderBody,
          email: regularEmail
        },
        app,
        request,
        domain.rider
      );

      expect(response.status).to.equal(200);

      const rider = await Riders.findOne({ email: regularEmail });
      expect(rider.organization).to.equal(null);
    });

    describe('Social Auth Organization Assignment', () => {
      beforeEach(() => {
        if (googleMock) {
          googleMock.interceptors.forEach(nock.removeInterceptor);
        }
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should assign organization ID for Google signup with ridecircuit.com domain', async () => {
        googleMock = nock('https://www.googleapis.com')
          .persist()
          .get('/oauth2/v2/userinfo')
          .reply(200, {
            ...demoGoogleRider,
            email: organizationEmail
          });

        await riderEndpoint(
          '/v1/auth/google',
          'post',
          '',
          app,
          request,
          domain,
          { accessToken: '283923901920' },
          200
        );

        const rider = await Riders.findOne({ email: organizationEmail });
        expect(rider.organization).to.equal(Organizations['ridecircuit.com']);
      });

      it('should not assign organization ID for Google signup with non-circuit domain', async () => {
        googleMock = nock('https://www.googleapis.com')
          .persist()
          .get('/oauth2/v2/userinfo')
          .reply(200, {
            ...demoGoogleRider,
            email: regularEmail
          });

        await riderEndpoint(
          '/v1/auth/google',
          'post',
          '',
          app,
          request,
          domain,
          { accessToken: '283923901920' },
          200
        );

        const rider = await Riders.findOne({ email: regularEmail });
        expect(rider.organization).to.equal(null);
      });

      it('should assign organization ID for Apple signup with ridecircuit.com domain', async () => {
        setupAppleAuthStubs(organizationEmail);

        await riderEndpoint(
          '/v1/auth/apple',
          'post',
          '',
          app,
          request,
          domain,
          {
            identityToken: 'mockedToken',
            firstName: demoAppleRider.firstName,
            lastName: demoAppleRider.lastName
          },
          200
        );

        const rider = await Riders.findOne({ email: organizationEmail });
        expect(rider.organization).to.equal(Organizations['ridecircuit.com']);
      });

      it('should not assign organization ID for Apple signup with non-circuit domain', async () => {
        setupAppleAuthStubs(regularEmail);

        await riderEndpoint(
          '/v1/auth/apple',
          'post',
          '',
          app,
          request,
          domain,
          {
            identityToken: 'mockedToken',
            firstName: demoAppleRider.firstName,
            lastName: demoAppleRider.lastName
          },
          200
        );

        const rider = await Riders.findOne({ email: regularEmail });
        expect(rider.organization).to.equal(null);
      });
    });
  });
});
