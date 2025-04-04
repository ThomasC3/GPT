import sinon from 'sinon';
import { expect } from 'chai';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Locations, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { riderEndpoint, createRiderLogin } from '../utils/rider';
import redisHandler from '../utils/redis';
import { isAllowed } from '../../middlewares/rider/utils/phoneNumber';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let riderSocket;
let riderToken;
let location;
let sandbox;

describe('Phone', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();

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

    await Settings.deleteMany();
  });

  describe('isAllowed', () => {
    it('should allow some numbers', async () => {
      await Settings.createSettings({
        riderAndroid: '1.0.0',
        // eslint-disable-next-line no-useless-escape
        blockNumberPatterns: '\\+44744100'
      });

      sinon.assert.match(await isAllowed('+312341242341'), true);
      return sinon.assert.match(await isAllowed('+44744100'), false);
    });

    it('should allow some numbers with multiple block patterns', async () => {
      await Settings.createSettings({
        riderAndroid: '1.0.0',
        // eslint-disable-next-line no-useless-escape
        blockNumberPatterns: '\\+55555(1|2), \\+123456789, \\+987654321'
      });

      sinon.assert.match(await isAllowed('+555551'), false);
      sinon.assert.match(await isAllowed('+555552'), false);
      sinon.assert.match(await isAllowed('+555553'), true);
      sinon.assert.match(await isAllowed('+123456789'), false);
      sinon.assert.match(await isAllowed('+987654321'), false);
    });

    it('should only allow numbers from specific country codes if that pattern is added, while keeping other rules', async () => {
      await Settings.createSettings({
        riderAndroid: '1.0.0',
        // eslint-disable-next-line no-useless-escape
        blockNumberPatterns: '\\+123456789, \\+44744100, \\+(?!(1|44|52|55))'
      });

      // Specific blocked patterns in allowed country codes
      sinon.assert.match(await isAllowed('+123456789'), false);
      sinon.assert.match(await isAllowed('+44744100'), false);
      // Allowed country codes
      sinon.assert.match(await isAllowed('+123456788'), true);
      sinon.assert.match(await isAllowed('+44123456789'), true);
      sinon.assert.match(await isAllowed('+52123456789'), true);
      sinon.assert.match(await isAllowed('+55123456789'), true);
      // Invalid country codes
      sinon.assert.match(await isAllowed('+3123456789'), false);
      sinon.assert.match(await isAllowed('+54123456789'), false);
    });

    it('should allow all numbers', async () => {
      await Settings.createSettings({
        riderAndroid: '1.0.0'
      });

      sinon.assert.match(await isAllowed('+312341242341'), true);
      return sinon.assert.match(await isAllowed('+44744100'), true);
    });

    it('should allow all numbers', async () => {
      sinon.assert.match(await isAllowed('+312341242341'), true);
      return sinon.assert.match(await isAllowed('+44744100'), true);
    });

    it('should allow return 200 if allowed number', async () => {
      await Settings.createSettings({
        riderAndroid: '1.0.0',
        // eslint-disable-next-line no-useless-escape
        blockNumberPatterns: '\\+44744100'
      });

      const { body: { phone } } = await riderEndpoint(
        '/v1/phone-pincode', 'post',
        riderToken, app, request, domain,
        { phone: '911111111', countryCode: 'PT' },
        200
      );
      expect(phone).to.equal('+351911111111');
    });

    it('should allow return 200 if not allowed number', async () => {
      await Settings.createSettings({
        riderAndroid: '1.0.0',
        // eslint-disable-next-line no-useless-escape
        blockNumberPatterns: '\\+44744100'
      });

      await riderEndpoint(
        '/v1/phone-pincode', 'post',
        riderToken, app, request, domain,
        { phone: '7441000114', countryCode: 'GB' },
        200
      );
    });

    it('should allow return 200 if not settings', async () => {
      await riderEndpoint(
        '/v1/phone-pincode', 'post',
        riderToken, app, request, domain,
        { phone: '7441000114', countryCode: 'GB' },
        200
      );
    });
  });
});
