import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import { expect } from 'chai';
import app from '../../server';
import { port, domain } from '../../config';
import logger from '../../logger';
import { Locations, Settings } from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { adminEndpoint, createAdminLogin } from '../utils/admin';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let adminToken;

let driver1Socket;
let driver2Socket;
let driver3Socket;

let driverToken;
let location;

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin']
};
let driverObject;

describe('Admin driver signup flow', () => {
  before(async () => {
    sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver3Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    // Coimbra-B (SE)
    // Entrada das acacias (SD)
    // Retiro do mondego (ID)
    // Hotel D. Luis (IE)
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

    driverObject = {
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      firstName: 'Driver',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      locations: [location._id],
      password: 'Password1',
      dob: '2000-12-11'
    };

    ({ adminToken } = await createAdminLogin());
  });

  describe('Driver admin signup and app login', () => {
    it('Driver 1 - lower case signup and login', async () => {
      await request(app)
        .post('/v1/drivers')
        .set('host', domain.admin)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentLocation: {
            coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
            type: 'Point'
          },
          firstName: 'Driver',
          lastName: '1',
          email: 'driver1@mail.com',
          zip: 10001,
          phone: 123456789,
          isOnline: true,
          isTemporaryPassword: false,
          locations: [location._id],
          password: 'Password1',
          dob: '2000-12-11'
        })
        .expect(200)
        .end();

      const driverSessionResponse = await request(app)
        .post('/v1/login')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({ email: 'driver1@mail.com', password: 'Password1' })
        .expect(200)
        .end()
        .get('body');

      driverToken = driverSessionResponse.accessToken;

      driver1Socket
        .emit('authenticate', { token: driverToken })
        .on('authenticated', () => {
          logger.debug('DRIVER1 authentiticated through sockets');
        })
        .on('unauthorized', (msg) => {
          throw new Error(msg);
        });
    });

    it('Driver 2 - lower case signup, upper case login', async () => {
      await request(app)
        .post('/v1/drivers')
        .set('host', domain.admin)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentLocation: {
            coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
            type: 'Point'
          },
          firstName: 'Driver',
          lastName: '2',
          email: 'driver2@mail.com',
          zip: 10001,
          phone: 123456789,
          isOnline: true,
          isTemporaryPassword: false,
          locations: [location._id],
          password: 'Password1',
          dob: '2000-12-11'
        })
        .expect(200)
        .end();

      const driverSessionResponse = await request(app)
        .post('/v1/login')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({ email: 'DRIVER2@mail.com', password: 'Password1' })
        .expect(200)
        .end()
        .get('body');

      driverToken = driverSessionResponse.accessToken;

      driver2Socket
        .emit('authenticate', { token: driverToken })
        .on('authenticated', () => {
          logger.debug('DRIVER2 authentiticated through sockets');
        })
        .on('unauthorized', (msg) => {
          throw new Error(msg);
        });
    });

    it('Driver 3 - upper case signup, lower case login', async () => {
      await request(app)
        .post('/v1/drivers')
        .set('host', domain.admin)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentLocation: {
            coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
            type: 'Point'
          },
          firstName: 'Driver',
          lastName: '3',
          email: 'DRIVER3@mail.com',
          zip: 10001,
          phone: 123456789,
          isOnline: true,
          isTemporaryPassword: false,
          locations: [location._id],
          password: 'Password1',
          dob: '2000-12-11'
        })
        .expect(200)
        .end();

      const driverSessionResponse = await request(app)
        .post('/v1/login')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({ email: 'driver3@mail.com', password: 'Password1' })
        .expect(200)
        .end()
        .get('body');

      driverToken = driverSessionResponse.accessToken;

      driver3Socket
        .emit('authenticate', { token: driverToken })
        .on('authenticated', () => {
          logger.debug('DRIVER3 authentiticated through sockets');
        })
        .on('unauthorized', (msg) => {
          throw new Error(msg);
        });
    });
    it('should test that driver emails are unique', async () => {
      let response = await adminEndpoint(
        '/v1/drivers',
        'post',
        adminToken,
        app,
        request,
        domain,
        { ...driverObject, email: 'driver4@mail.com', lastName: '4' }
      );
      expect(response.status).to.equal(200);
      response = await adminEndpoint(
        '/v1/drivers',
        'post',
        adminToken,
        app,
        request,
        domain,
        { ...driverObject, email: 'driver4@mail.com', lastName: '4' }
      );
      expect(response.status).to.equal(409);
      expect(response.body.message).to.equal(
        'Driver with email driver4@mail.com already exists'
      );
    });
  });
});
