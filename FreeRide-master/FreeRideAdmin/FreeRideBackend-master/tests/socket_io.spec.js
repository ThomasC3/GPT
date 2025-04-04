import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import reBroadcast from '../services/reBroadcast';
import { port, domain } from '../config';
import logger from '../logger';
import { createRequest } from './utils/rider';
import { sleep } from '../utils/ride';
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
let riderSocket;
let riderToken;
let location;

const keyLoc = {
  // Driver 1
  d1a: [40.680806, -73.902878, '1610 Bushwick Ave, Brooklyn, NY 11207, USA'],
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Socket.io', () => {
  before(async () => {
    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

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

    ({ driver, driverSocket } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));

    await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const riderSessionResponse = await request(app)
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

    riderToken = riderSessionResponse.accessToken;

    riderSocket
      .emit('authenticate', { token: riderToken })
      .on('authenticated', () => {
        logger.debug('RIDER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  after(async () => { });

  describe('Driver sockets', () => {
    beforeEach(async () => {
      await driverSocket.removeAllListeners();

      await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });
      await Requests.deleteMany();
      await Rides.deleteMany();
      await Routes.deleteMany();
    });
    it('Should change ride ack state', async () => {
      driverSocket.on('ride-request-received', (data) => {
        driverSocket.emit('ride-request-received-ack', { ride: data.ride });
      });

      await createRequest(riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      const count = await reBroadcast.broadcastMatches();
      sinon.assert.match(count, 0);

      const { ackReceived } = await Rides.findOne();

      return sinon.assert.match(ackReceived, true);
    });
    it('Should rebroadcast ride match and not change ack state if no response from driver', async () => {
      await createRequest(riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      let { ackReceived } = await Rides.findOne();
      sinon.assert.match(ackReceived, false);

      const count = await reBroadcast.broadcastMatches();
      sinon.assert.match(count, 1);

      ({ ackReceived } = await Rides.findOne());

      return sinon.assert.match(ackReceived, false);
    });
    it('Should rebroadcast ride match and change ack state', async () => {
      await createRequest(riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      let { ackReceived } = await Rides.findOne();
      sinon.assert.match(ackReceived, false);

      await driverSocket.on('ride-request-received', (data) => {
        driverSocket.emit('ride-request-received-ack', { ride: data.ride });
      });

      let count = await reBroadcast.broadcastMatches();
      sinon.assert.match(count, 1);

      await sleep(1000); // Allow for changing of ackReceived state in ride

      count = await reBroadcast.broadcastMatches();
      sinon.assert.match(count, 0);

      ({ ackReceived } = await Rides.findOne());

      return sinon.assert.match(ackReceived, true);
    });
  });
});
