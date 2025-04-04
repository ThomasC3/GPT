/* eslint-disable no-undef */

import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import moment from 'moment';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import { createRequest } from '../utils/rider';
import {
  pickUp, dropOff, noShowCancel,
  driverMoved, createDriverLogin
} from '../utils/driver';
import {
  Riders, Drivers, Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driver;
let driverSocket;
let driverToken;
let rider1Socket;
let rider2Socket;
let sandbox;
let rider1;
let rider2;
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

describe('Request cancel on pooling', () => {
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
      poolingEnabled: true,
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
      locations: [location._id],
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      }
    };

    ({ driver, driverSocket, driverToken } = await createDriverLogin(
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

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Locations.syncIndexes();
    await Drivers.syncIndexes();
  });

  describe('Rider cancels request', () => {
    beforeEach(async () => {
      await Riders.updateRider(rider1._id, { lastCancelTimestamp: null });
      await Riders.updateRider(rider2._id, { lastCancelTimestamp: null });
    });

    it('Should have cancelled ride on route', async () => {
      const request1 = await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      let route1 = await Routes.findOne({ driver: driver._id, active: true });
      let ride1 = await Rides.findOne({ rider: rider1._id });
      sinon.assert.match(route1.activeRideId, ride1._id);
      sinon.assert.match(route1.stops.length, 6);

      await request(app)
        .post('/v1/ride/request/cancel')
        .set('host', domain.rider)
        .set('X-Mobile-Os', 'Android')
        .set('X-App-Version', '1.0.0')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${rider1Token}`)
        .send(request1)
        .expect(200)
        .end();

      const spy = sinon.spy();
      const rider1UpToDate = await Riders.findOne({ _id: rider1._id });
      const { lastCancelTimestamp } = rider1UpToDate;
      spy(lastCancelTimestamp);
      sinon.assert.calledWith(spy, sinon.match.typeOf('date'));

      ride1 = await Rides.findOne({ rider: rider1._id });
      sinon.assert.match(ride1.status, 101);

      route1 = await Routes.findOne({ driver: driver._id, active: true });
      sinon.assert.match(route1.stops.length, 7);

      const ride2 = await Rides.findOne({ rider: rider2._id });
      return sinon.assert.match(route1.activeRideId, ride2._id);
    });

    it('Should not allow a request immediately after a cancel', async () => {
      const request1 = await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      await request(app)
        .post('/v1/ride/request/cancel')
        .set('host', domain.rider)
        .set('X-Mobile-Os', 'Android')
        .set('X-App-Version', '1.0.0')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${rider1Token}`)
        .send(request1)
        .expect(200)
        .end();

      const response = await request(app)
        .post('/v1/ride/request')
        .set('host', domain.rider)
        .set('X-Mobile-Os', 'Android')
        .set('X-App-Version', '1.0.0')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${rider1Token}`)
        .send({
          passengers: 1,
          isADA: false,
          origin: {
            address: keyLoc.req1p[2],
            latitude: keyLoc.req1p[0],
            longitude: keyLoc.req1p[1]
          },
          message: null,
          location: location._id.toString(),
          destination: {
            address: keyLoc.req1d[2],
            latitude: keyLoc.req1d[0],
            longitude: keyLoc.req1d[1]
          }
        })
        .expect(403)
        .end()
        .get('body')
        .then(result => result);

      sinon.assert.match(response.code, 403);

      const hasExpectedResponse = [
        'Please try requesting again in 2 minutes',
        'Please try requesting again in 3 minutes'
      ].includes(response.message);

      return sinon.assert.match(true, hasExpectedResponse);
    });

    it('Should not allow a request immediately after a no-show cancel', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      const ride = await Rides.findOne({ rider: rider1._id });
      await driverMoved(driverSocket, keyLoc.req1p[0], keyLoc.req1p[1]);
      const threeMinutesBeforeNow = moment().utc().subtract(3, 'm').toDate();
      ride.driverArrivedTimestamp = threeMinutesBeforeNow;
      ride.driverArrivingTimestamp = threeMinutesBeforeNow;
      ride.status = 203;
      await ride.save();
      await noShowCancel(driverToken, { ride }, app, request, domain);

      const response = await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1, 403
      );

      sinon.assert.match(response.code, 403);

      const hasExpectedResponse = [
        'Please try requesting again in 2 minutes',
        'Please try requesting again in 3 minutes'
      ].includes(response.message);

      return sinon.assert.match(true, hasExpectedResponse);
    });

    it('Should have cancelled ride on route and clean route', async () => {
      const request1 = await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      let route1 = await Routes.findOne({ driver: driver._id, active: true });
      let ride1 = await Rides.findOne({ rider: rider1._id });
      sinon.assert.match(route1.activeRideId, ride1._id);
      sinon.assert.match(route1.stops.length, 6);

      const ride2 = await Rides.findOne({ rider: rider2._id });
      await pickUp(driverToken, ride2, app, request, domain);
      await dropOff(driverToken, ride2, app, request, domain);

      await request(app)
        .post('/v1/ride/request/cancel')
        .set('host', domain.rider)
        .set('X-Mobile-Os', 'Android')
        .set('X-App-Version', '1.0.0')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${rider1Token}`)
        .send(request1)
        .expect(200)
        .end();

      const spy = sinon.spy();
      const rider1UpToDate = await Riders.findOne({ _id: rider1._id });
      const { lastCancelTimestamp } = rider1UpToDate;
      spy(lastCancelTimestamp);
      sinon.assert.calledWith(spy, sinon.match.typeOf('date'));

      ride1 = await Rides.findOne({ rider: rider1._id });
      sinon.assert.match(ride1.status, 101);

      route1 = await Routes.findOne({ driver: driver._id, active: true });
      return sinon.assert.match(route1, null);
    });
  });
});
