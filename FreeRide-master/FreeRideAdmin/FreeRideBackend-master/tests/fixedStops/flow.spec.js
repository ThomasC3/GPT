import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import logger from '../../logger';
import driverSearcher from '../../services/driverSearch';
import { riderEndpoint, createFsRequest } from '../utils/rider';
import { createDriverLogin } from '../utils/driver';
import {
  Riders, Locations, FixedStops, Requests, Rides, Routes, Drivers, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driverSocket;
let rider1Socket;
let rider2Socket;
let sandbox;
let driver;
let rider1;
let rider2;
let rider1Token;
let rider2Token;
let location;

const keyLoc = {
  fs8: { lat: 40.6810937, lng: -73.9078617 },
  fs4: { lat: 40.6851291, lng: -73.9148140 },
  fs6: { lat: 40.6883182, lng: -73.9203072 },
  fs7: { lat: 40.6915723, lng: -73.9258862 },
  fs3: { lat: 40.6944357, lng: -73.9307785 },
  fs2: { lat: 40.6964530, lng: -73.9346409 },
  fs5: { lat: 40.6987957, lng: -73.9385891 },
  fs1: { lat: 40.7003574, lng: -73.9414215 }
};

describe('Flow For FixedStops', () => {
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
      fixedStopEnabled: true,
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

    const fixedStopData = {
      status: 1,
      businessName: 'Coca-cola',
      address: 'Here',
      location: location._id
    };

    const promises = [];
    let key;
    for (let i = 0; i < Object.keys(keyLoc).length; i += 1) {
      key = Object.keys(keyLoc)[i];
      promises.push(FixedStops.createFixedStop(
        { name: key, ...keyLoc[key], ...fixedStopData }
      ));
    }
    await Promise.all(promises);

    const driverInfo = {
      // Leroy Merlin
      currentLocation: {
        coordinates: [keyLoc.fs8.lng, keyLoc.fs8.lat],
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
    };

    ({ driver, driverSocket } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));

    rider1 = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();


    rider2 = await new Riders({
      email: 'rider2@mail.com',
      firstName: 'Rider',
      lastName: '2',
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
        logger.debug('RIDER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider2Socket
      .emit('authenticate', { token: rider2Token })
      .on('authenticated', () => {
        logger.debug('RIDER2 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  after(async () => { });

  before(async () => {
    sandbox.restore();
    await FixedStops.syncIndexes();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();

    await Riders.updateRider(rider1._id, { lastCancelTimestamp: null });
    await Riders.updateRider(rider2._id, { lastCancelTimestamp: null });
  });

  describe('Create Request', () => {
    it('Should create a request and a ride with proper fixed stop IDs', async () => {
      const queryParams = {
        latitude: keyLoc.fs8.lat,
        longitude: keyLoc.fs8.lng,
        locationId: String(location._id),
        fixedStopNumber: 3
      };
      const queryString = new URLSearchParams(queryParams).toString();

      // fs8,4,6
      const { body: fixedStops } = await riderEndpoint(
        `/v1/fixed-stops?${queryString}`,
        'GET',
        rider1Token, app, request, domain
      );

      sinon.assert.match(fixedStops[0].name, 'fs8');
      sinon.assert.match(fixedStops[0].latitude, keyLoc.fs8.lat);
      sinon.assert.match(fixedStops[0].longitude, keyLoc.fs8.lng);
      sinon.assert.match(fixedStops[1].name, 'fs4');
      sinon.assert.match(fixedStops[2].name, 'fs6');

      await createFsRequest(
        rider1Token, fixedStops[0].id, fixedStops[2].id, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      const req1 = await Requests.findOne({ rider: rider1 });
      const ride1 = await Rides.findOne({ rider: rider1 });

      sinon.assert.match(`${req1.pickupFixedStopId}`, `${fixedStops[0].id}`);
      sinon.assert.match(`${req1.dropoffFixedStopId}`, `${fixedStops[2].id}`);

      sinon.assert.match(`${ride1.pickupFixedStopId}`, `${fixedStops[0].id}`);
      return sinon.assert.match(`${ride1.dropoffFixedStopId}`, `${fixedStops[2].id}`);
    });
  });
});
