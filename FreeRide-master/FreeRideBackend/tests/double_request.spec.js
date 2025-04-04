import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import { port, domain } from '../config';
import logger from '../logger';
import { createRequest } from './utils/rider';
import { createDriverLogin } from './utils/driver';
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
let rider1Token;
let rider2Token;
let location;
let request1;

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2006767, -8.4050056, 'SuperCor'],
  // Request 3
  req2p: [40.2041, -8.404072, 'McDonalds'],
  req2d: [40.205643, -8.403842, 'Tamoeiro']
};

describe('ETA without pooling', () => {
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

    ({ driver, driverSocket } = await createDriverLogin(
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

    await new Riders({
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

  after(async () => { });

  beforeEach(async () => {
    sandbox.restore();

    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();
  });

  describe('Rider ETA', () => {
    it('Should not create two rides if two requests from same rider', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await createRequest(rider1Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      const riderRides = await Rides.find({ rider: rider1 });
      return sinon.assert.match(riderRides.length, 1);
    });
    it('Should not create second ride if rider already in a ride', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      await createRequest(rider1Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      const riderRides = await Rides.find({ rider: rider1 });
      return sinon.assert.match(riderRides.length, 1);
    });
    it('Should complete request if rider already in a ride and request status is 100', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      request1 = await Requests.findOne({ rider: rider1 });
      await driverSearcher.search();

      await Requests.updateRequest({ _id: request1._id }, { status: 100 });
      await driverSearcher.search();

      const riderRides = await Rides.find({ rider: rider1 });
      sinon.assert.match(riderRides.length, 1);
      sinon.assert.match(`${riderRides[0].request}`, `${request1._id}`);

      request1 = await Requests.findOne({ _id: request1._id });
      sinon.assert.match(request1.status, 102);
    });
    it('Should cancel request if rider already in a ride and request status is 102', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      request1 = await Requests.findOne({ rider: rider1 });
      await driverSearcher.search();

      driverSearcher.search();
      await Requests.updateRequest({ _id: request1._id }, { status: 102 });

      const riderRides = await Rides.find({ rider: rider1 });
      sinon.assert.match(riderRides.length, 1);

      request1 = await Requests.findOne({ _id: request1._id });
      sinon.assert.match(request1.status, 102);
    });
    it('Should not cancel request if rider already in a ride and request status is 101', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      request1 = await Requests.findOne({ rider: rider1 });
      await driverSearcher.search();

      await Requests.updateRequest({ _id: request1._id }, { status: 100 });
      driverSearcher.search();
      await Requests.updateRequest({ _id: request1._id }, { status: 101 });

      const riderRides = await Rides.find({ rider: rider1 });
      sinon.assert.match(riderRides.length, 1);

      request1 = await Requests.findOne({ _id: request1._id });
      sinon.assert.match(request1.status, 101);
    });
  });
});
