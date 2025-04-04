import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';

import app from '../../server';
import { port, domain } from '../../config';
import { Settings, Riders } from '../../models';
import { emptyAllCollections } from '../utils/helper';
import redisHandler from '../utils/redis';

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

let riderSocket;
let sandbox;

describe('Driver', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
  });

  beforeEach(async () => {
    sandbox.restore();
    riderSocket.removeAllListeners();

    await Riders.deleteMany();
    redisHandler.deleteAllKeys('rl_rider_signup:*');
  });

  afterEach(async () => {
    redisHandler.deleteAllKeys('rl_rider_signup:*');
  });

  describe('POST /register', () => {
    it('Should not allow more than 5 requests at once from a single IP address', async () => {
      for (let i = 0; i < 6; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const response = await request(app)
          .post('/v1/register')
          .set('host', domain.rider)
          .set('Accept', 'application/json')
          .set('Content-Type', 'application/json')
          .set('x-forwarded-for', '108.157.81.170')
          .send({ ...riderBody, email: `user${i}@mail.com` });

        if (i < 5) {
          sinon.assert.match(response.status, 200);
        } else {
          sinon.assert.match(response.status, 429);
          sinon.assert.match(response.body.message, 'Too Many Requests, please wait a few minutes before trying again');
        }
      }
    });
  });
});
