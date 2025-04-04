import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import driverSearcher from '../services/driverSearch';
import { port, domain } from '../config';
import { createRequest, rideEta } from '../tests/utils/rider';
import { driverCancel, pickUp, driverMoved } from '../tests/utils/driver';
import {
  Riders, Drivers, Locations, Requests, Rides, Routes, Settings
} from '../models';
import { emptyAllCollections } from '../tests/utils/helper';
import logger from '../logger';

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
      isADA: true,
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        {
          latitude: 40.226855,
          longitude: -8.454739
        },
        {
          latitude: 40.228750,
          longitude: -8.392574
        },
        {
          latitude: 40.184892,
          longitude: -8.388655
        },
        {
          latitude: 40.185754,
          longitude: -8.453012
        },
        {
          latitude: 40.226855,
          longitude: -8.454739
        }
      ]
    });

    driver = await Drivers.createDriver({
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      isADA: false,
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
    });

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

    const driverSessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.driver)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'some@mail.com', password: 'Password1' })
      .expect(200)
      .end()
      .get('body');

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

    driverToken = driverSessionResponse.accessToken;
    rider1Token = rider1SessionResponse.accessToken;
    rider2Token = rider2SessionResponse.accessToken;

    driverSocket
      .emit('authenticate', { token: driverToken })
      .on('authenticated', () => {
        logger.info('DRIVER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider1Socket
      .emit('authenticate', { token: rider1Token })
      .on('authenticated', () => {
        logger.info('RIDER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider2Socket
      .emit('authenticate', { token: rider2Token })
      .on('authenticated', () => {
        logger.info('RIDER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  after(async () => { });

  beforeEach(async () => {
    sandbox.restore();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();

    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();
  });

  describe('Rider ETA', () => {
    it('Should have later ETA for rider 2', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      let ride1 = await Rides.findOne({ rider: rider1 });
      await rideEta(ride1, rider1Token, app, request, domain);

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      let ride2 = await Rides.findOne({ rider: rider2 });
      await rideEta(ride2, rider2Token, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      const eta1 = await rideEta(ride1, rider1Token, app, request, domain);

      ride2 = await Rides.findOne({ rider: rider2 });
      const eta2 = await rideEta(ride2, rider2Token, app, request, domain);

      const spy = sinon.spy();
      ride1 = await Rides.findOne({ rider: rider1 });
      const initialEta1 = ride1.initialEta;
      spy(initialEta1);
      sinon.assert.calledWith(spy, sinon.match.typeOf('number'));

      ride2 = await Rides.findOne({ rider: rider2 });
      const initialEta2 = ride2.initialEta;
      spy(initialEta2);
      sinon.assert.calledWith(spy, sinon.match.typeOf('number'));

      sinon.assert.match(initialEta1 === initialEta2, false);

      return sinon.assert.match(eta1 < eta2, true);
    });
    it('Should return ETA for rider 2 after cancel', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      let ride1 = await Rides.findOne({ rider: rider1 });
      await rideEta(ride1, rider1Token, app, request, domain);

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      let ride2 = await Rides.findOne({ rider: rider2 });
      await rideEta(ride2, rider2Token, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });

      const etaBefore = await rideEta(ride2, rider2Token, app, request, domain);

      await driverCancel(driverSocket, rider1Socket, ride1);

      const etaAfter = await rideEta(ride2, rider2Token, app, request, domain);

      return sinon.assert.match(etaBefore > etaAfter, true);
    });
    it('Should return ETA for rider 2 with driver -> dropoff_2 -> pickup_1', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      let ride1 = await Rides.findOne({ rider: rider1 });
      await rideEta(ride1, rider1Token, app, request, domain);

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      let ride2 = await Rides.findOne({ rider: rider2 });
      await rideEta(ride2, rider2Token, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });

      const etaBefore = await rideEta(ride2, rider2Token, app, request, domain);

      await driverMoved(driverSocket, keyLoc.req1p[0], keyLoc.req1p[1]);
      await pickUp(driverToken, ride1, app, request, domain);

      const etaAfter = await rideEta(ride2, rider2Token, app, request, domain);

      return sinon.assert.match(etaBefore > etaAfter, true);
    });
  });
});
