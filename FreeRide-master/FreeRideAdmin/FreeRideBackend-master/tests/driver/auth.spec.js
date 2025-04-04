import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';

import app from '../../server';
import { port, domain } from '../../config';
import { Drivers } from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { driverEndpoint, createDriverLogin, driverLogin } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driverSocket;
let sandbox;

describe('Driver Auth', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
  });

  beforeEach(async () => {
    sandbox.restore();
    driverSocket.removeAllListeners();

    await Drivers.deleteMany();
  });

  describe('POST /forgot-password', () => {
    describe('email validation', () => {
      it('doesn\'t allow email to be blank when request new password', async () => {
        const { driverToken } = await createDriverLogin({
          email: 'driver@mail.com',
          firstName: 'Driver',
          lastName: 'lastName',
          password: 'Password1',
          dob: '2000-12-11'
        }, app, request, domain, driverSocket, { attachSharedVehicle: false });

        const response = await driverEndpoint(
          '/v1/forgot-password', 'post',
          driverToken, app, request, domain,
          { email: '' },
          406
        );

        sinon.assert.match(
          response.body.message,
          'We were unable to send a pincode to the email you provided.'
        );

        const drivers = await Drivers.find({});
        sinon.assert.match(drivers.length, 1);
        sinon.assert.match(drivers[0].email, 'driver@mail.com');
        return sinon.assert.match(drivers[0].firstName, 'Driver');
      });
      it('doesn\'t allow request new password of email that does not belong to a user', async () => {
        const { driverToken } = await createDriverLogin({
          email: 'driver@mail.com',
          firstName: 'Driver',
          lastName: 'lastName',
          password: 'Password1',
          dob: '2000-12-11'
        }, app, request, domain, driverSocket, { attachSharedVehicle: false });

        const response = await driverEndpoint(
          '/v1/forgot-password', 'post',
          driverToken, app, request, domain,
          { email: 'not_a_driver@mail.com' },
          500
        );

        return sinon.assert.match(
          response.body.message,
          'We were unable to send a pincode to the email you provided.'
        );
      });
      it('allows request of new password with valid email and change password', async () => {
        await createDriverLogin({
          email: 'driver@mail.com',
          firstName: 'Driver',
          lastName: 'lastName',
          password: 'Password1',
          dob: '2000-12-11'
        }, app, request, domain, driverSocket, { attachSharedVehicle: false });

        let response = await driverEndpoint(
          '/v1/forgot-password', 'post',
          null, app, request, domain,
          { email: 'driver@mail.com' },
          200
        );

        sinon.assert.match(response.body.email, 'driver@mail.com');
        sinon.assert.match(response.body.message, 'Please check your email inbox for a PIN code to verify your account.');

        const { emailCode, _id: driverId } = await Drivers.findOne({});
        const { body: { accessToken } } = await driverEndpoint(
          '/v1/forgot-password/verify', 'post',
          null, app, request, domain,
          { email: 'driver@mail.com', code: emailCode },
          200
        );

        response = await driverEndpoint(
          '/v1/change-password', 'post',
          accessToken, app, request, domain,
          { password: '123' },
          200
        );

        const driverloginResult = await driverLogin('driver@mail.com', '123', app, request, domain);

        sinon.assert.match(driverloginResult.id, `${driverId}`);
        return sinon.assert.match(driverloginResult.emailCode, null);
      });
    });
  });
  describe('POST /logout', () => {
    describe('token validation', () => {
      it('doesn\'t logout if auth token is not provided', async () => {
        await createDriverLogin({
          email: 'driver@mail.com',
          firstName: 'Driver',
          lastName: 'lastName',
          password: 'Password1',
          dob: '2000-12-11'
        }, app, request, domain, driverSocket, { attachSharedVehicle: false });

        const response = await driverEndpoint(
          '/v1/logout', 'post',
          null, app, request, domain,
          { deviceToken: 'invalidDriverToken' },
          403
        );

        return sinon.assert.match(response.body.message, 'Forbidden');
      });
      it('allows logout with valid token and no device token', async () => {
        const { driverToken, driver } = await createDriverLogin({
          email: 'driver@mail.com',
          firstName: 'Driver',
          lastName: 'lastName',
          password: 'Password1',
          dob: '2000-12-11',
          isAvailable: false
        }, app, request, domain, driverSocket, { attachSharedVehicle: false });

        const response = await driverEndpoint(
          '/v1/logout', 'post',
          driverToken, app, request, domain,
          {},
          200
        );
        const loggedOutDriver = await Drivers.getDriver({ _id: driver._id });
        sinon.assert.match(loggedOutDriver.isOnline, false);
        return sinon.assert.match(response.body.message, 'You\'ve been successfully logged out.');
      });
    });
  });
  describe('POST /login', () => {
    it('driver on login becomes unavailable', async () => {
      await Drivers.createDriver({
        email: 'driver2@mail.com',
        firstName: 'Driver',
        lastName: 'lastName',
        password: 'Password2',
        dob: '2000-12-11',
        isAvailable: true,
        isOnline: false,
        phone: 123456789
      });

      let driver2 = await Drivers.findOne({ email: 'driver2@mail.com' });
      sinon.assert.match(driver2.isAvailable, true);
      sinon.assert.match(driver2.isOnline, false);

      const response = await driverEndpoint(
        '/v1/login', 'post',
        null, app, request, domain,
        { email: 'driver2@mail.com', password: 'Password2' },
        200
      );

      sinon.assert.match(response.status, 200);

      driver2 = await Drivers.findOne({ email: 'driver2@mail.com' });
      sinon.assert.match(driver2.isAvailable, false);
      return sinon.assert.match(driver2.isOnline, true);
    });
  });
});
