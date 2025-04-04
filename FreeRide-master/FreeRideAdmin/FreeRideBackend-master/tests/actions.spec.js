import sinon from 'sinon';
import moment from 'moment-timezone';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import { port, domain } from '../config';
import logger from '../logger';
import { createRequest } from './utils/rider';
import { hailRide, pickUp, createDriverLogin } from './utils/driver';
import {
  Riders, Drivers, Locations, Requests, Rides, Routes, Settings
} from '../models';
import { emptyAllCollections } from './utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driver;
let driverSocket;
let rider1Socket;
let rider2Socket;
let sandbox;
let rider1;
let rider2;
let driverToken;
let rider1Token;
let rider2Token;
let location;

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

describe('Actions #1 without pooling', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
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
    const driverInfo = {
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      locations: [location._id],
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      }
    };

    ({ driver, driverToken, driverSocket } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));
    rider1 = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();
    rider2 = await new Riders({
      email: 'rider2@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password2',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const rider1SessionResponse = await request(app)
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
    const rider2SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider2@mail.com', password: 'Password2' })
      .expect(200)
      .end()
      .get('body');

    rider1Token = rider1SessionResponse.accessToken;
    rider2Token = rider2SessionResponse.accessToken;

    rider1Socket
      .emit('authenticate', { token: rider1Token })
      .on('authenticated', () => {
        logger.debug('RIDER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
    rider2Socket
      .emit('authenticate', { token: rider2Token })
      .on('authenticated', () => {
        logger.debug('RIDER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  beforeEach(async () => {
    sandbox.restore();

    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();
  });

  describe('Driver actions', () => {
    it('Should have 4 stops', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      const ride1 = await Rides.findOne({ rider: rider1 });

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      const ride2 = await Rides.findOne({ rider: rider2 });

      const actionList = await request(app)
        .get('/v1/actions')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${driverToken}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((actions) => {
          // ETAs
          sinon.assert.match(moment.utc(actions[1].eta).diff(moment.utc(actions[0].eta), 'minutes'), 2);
          sinon.assert.match(moment.utc(actions[2].eta).diff(moment.utc(actions[1].eta), 'minutes'), 2);
          sinon.assert.match(moment.utc(actions[3].eta).diff(moment.utc(actions[2].eta), 'minutes'), 2);
          // Rides
          sinon.assert.match(String(actions[0].id), String(ride1._id));
          sinon.assert.match(actions[0].current, true);
          sinon.assert.match(actions[0].status, 202);
          sinon.assert.match(String(actions[2].id), String(ride2._id));
          sinon.assert.match(actions[2].current, false);
          sinon.assert.match(actions[2].status, 200);
          // Actions
          sinon.assert.match(actions[0].stopType, 'pickup'); // Current action
          sinon.assert.match(actions[1].stopType, 'dropoff');
          sinon.assert.match(actions[2].stopType, 'pickup'); // Next pickup
          sinon.assert.match(actions[3].stopType, 'dropoff');
          return actions;
        });

      sinon.assert.match(actionList.length, 4);

      await pickUp(driverToken, ride1, app, request, domain);

      const actionListAfterPickup = await request(app)
        .get('/v1/actions')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${driverToken}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((actions) => {
          // ETAs
          sinon.assert.match(moment.utc(actions[1].eta).diff(moment.utc(actions[0].eta), 'minutes'), 2);
          sinon.assert.match(moment.utc(actions[2].eta).diff(moment.utc(actions[1].eta), 'minutes'), 2);
          // Rides
          sinon.assert.match(String(actions[0].id), String(ride1._id));
          sinon.assert.match(actions[0].current, true);
          sinon.assert.match(actions[0].status, 300);
          sinon.assert.match(String(actions[1].id), String(ride2._id));
          sinon.assert.match(actions[1].current, false);
          sinon.assert.match(actions[1].status, 201);
          // Actions
          sinon.assert.match(actions[0].stopType, 'dropoff'); // Current action
          sinon.assert.match(actions[1].stopType, 'pickup'); // Next pickup
          sinon.assert.match(actions[2].stopType, 'dropoff');
          return actions;
        });

      sinon.assert.match(actionListAfterPickup.length, 3);
    });
    it('Should have 1 hailed ride and 4 stops', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      const ride1 = await Rides.findOne({ rider: rider1 });

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      const ride2 = await Rides.findOne({ rider: rider2 });

      const ride3 = await hailRide(driverToken, location, app, request, domain);

      const actionList = await request(app)
        .get('/v1/actions')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${driverToken}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((actions) => {
          // Hailed ride
          sinon.assert.match(String(actions[0].id), String(ride3.id));
          sinon.assert.match(actions[0].current, false);
          sinon.assert.match(actions[0].hailed, true);
          sinon.assert.match(actions[0].status, 300);
          sinon.assert.match(actions[0].stopType, 'dropoff');
          // Requested rides
          sinon.assert.match(String(actions[1].id), String(ride1._id));
          sinon.assert.match(actions[1].current, true);
          sinon.assert.match(actions[1].hailed, false);
          sinon.assert.match(actions[1].status, 202);
          sinon.assert.match(String(actions[2].id), String(ride1._id));
          sinon.assert.match(actions[2].current, false);
          sinon.assert.match(actions[2].hailed, false);
          sinon.assert.match(actions[2].status, 202);
          sinon.assert.match(String(actions[3].id), String(ride2._id));
          sinon.assert.match(actions[3].current, false);
          sinon.assert.match(actions[3].hailed, false);
          sinon.assert.match(actions[3].status, 200);
          sinon.assert.match(String(actions[4].id), String(ride2._id));
          sinon.assert.match(actions[4].current, false);
          sinon.assert.match(actions[4].hailed, false);
          sinon.assert.match(actions[4].status, 200);
          // Actions
          sinon.assert.match(actions[1].stopType, 'pickup'); // Current action
          sinon.assert.match(actions[2].stopType, 'dropoff');
          sinon.assert.match(actions[3].stopType, 'pickup'); // Next pickup
          sinon.assert.match(actions[4].stopType, 'dropoff');
          return actions;
        });

      return sinon.assert.match(actionList.length, 5);
    });
    it('Should have 1 hailed ride', async () => {
      const ride3 = await hailRide(driverToken, location, app, request, domain);

      const actionList = await request(app)
        .get('/v1/actions')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${driverToken}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((actions) => {
          sinon.assert.match(actions[0].current, true);
          sinon.assert.match(actions[0].hailed, true);
          sinon.assert.match(actions[0].status, 300);
          sinon.assert.match(String(actions[0].id), String(ride3.id));
          sinon.assert.match(actions[0].stopType, 'dropoff');
          return actions;
        });

      return sinon.assert.match(actionList.length, 1);
    });
    it('Should have no actions', async () => {
      const actionList = await request(app)
        .get('/v1/actions')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${driverToken}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then(actions => actions);

      return sinon.assert.match(actionList.length, 0);
    });
  });
});
