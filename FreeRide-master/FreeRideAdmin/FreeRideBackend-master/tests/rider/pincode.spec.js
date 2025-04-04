import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import { expect } from 'chai';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Locations, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { riderEndpoint, createRiderLogin } from '../utils/rider';
import redisHandler from '../utils/redis';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let riderSocket;
let riderToken;
let location;
let sandbox;

describe('Pincode', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

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

    ({ riderToken } = await createRiderLogin({
      email: 'rider@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }, app, request, domain, riderSocket));
  });

  beforeEach(async () => {
    sandbox.restore();
    riderSocket.removeAllListeners();

    redisHandler.deleteAllKeys('rl_rider_pincode:*');
  });

  describe('POST Phone Pincode', () => {
    it('Should throw error when sms is disabled', async () => {
      await Settings.updateSettings({ smsDisabled: true });
      const response = await riderEndpoint(
        '/v1/phone-pincode', 'post',
        riderToken, app, request, domain,
        { phone: '911111111', countryCode: 'PT' },
        400
      );
      expect(response.body.message).to.be.equal('This feature is unavailable at this time.');
    });

    it('Should be successful when sms is enabled', async () => {
      await Settings.updateSettings({ smsDisabled: false });
      const response = await riderEndpoint(
        '/v1/phone-pincode', 'post',
        riderToken, app, request, domain,
        { phone: '911111111', countryCode: 'PT' }
      );
      expect(response.body.message).to.be.equal('Please check your text messages for a PIN code to verify your phone number.');
    });

    it('Should not allow more than 2 requests', async () => {
      await riderEndpoint(
        '/v1/phone-pincode', 'post',
        riderToken, app, request, domain,
        { phone: '911111111', countryCode: 'PT' }
      );

      await riderEndpoint(
        '/v1/phone-pincode', 'post',
        riderToken, app, request, domain,
        { phone: '911111111', countryCode: 'PT' }
      );

      const response = await riderEndpoint(
        '/v1/phone-pincode', 'post',
        riderToken, app, request, domain,
        { phone: '911111111', countryCode: 'PT' },
        429
      );

      sinon.assert.match(response.body.message, 'Too Many Requests');
      sinon.assert.match(response.body.code, 429);
      return sinon.assert.match(response.status, 429);
    });
  });
});
