import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  Riders, Drivers, Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../../tests/utils/helper';
import { createRequest, riderCancel, rideEta } from '../../tests/utils/rider';
import { driverCancel, noShowCancel } from '../../tests/utils/driver';


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
let driverToken;
let rider1;
let rider2;
let rider1Token;
let rider2Token;
let location;
let ride1;
let ride2;
let route1;
let eta1;
let eta2;
let eta3;

const keyLoc = {
  d1a: [40.192642, -8.413896, 'IPN'],

  req1p: [40.205074, -8.407353, 'Alma shopping'],
  req1d: [40.216346, -8.412707, 'Celas'],

  req2p: [40.207479, -8.429915, 'Largo da portagem'],
  req2d: [40.185202, -8.398171, 'Portela do mondego']
};

describe('ETA', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Coimbra',
      poolingEnabled: true,
      isADA: false,
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
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      firstName: 'Driver',
      lastName: '1',
      email: 'driver@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      locations: [location._id],
      password: 'Password1',
      dob: '2000-12-11'
    });

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

    const driverSessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.driver)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'driver@mail.com', password: 'Password1' })
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
        logger.info('DRIVER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider1Socket
      .emit('authenticate', { token: rider1Token })
      .on('authenticated', () => {
        logger.info('RIDER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider2Socket
      .emit('authenticate', { token: rider2Token })
      .on('authenticated', () => {
        logger.info('RIDER2 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  // after(async () => {
  //   await app.close();
  // });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();

    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
  });

  describe('ETA on cancel', () => {
    it('Should update ride 1 eta on ride 2 driver-cancel', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      await rideEta(ride1, rider1Token, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      eta1 = await rideEta(ride1, rider1Token, app, request, domain);

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      ride2 = await Rides.findOne({ rider: rider2 });
      await rideEta(ride2, rider2Token, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });

      // State before cancel
      route1 = await Routes.findOne({ driver, active: true });
      ride1 = await Rides.findOne({ rider: rider1 });
      eta2 = await rideEta(ride1, rider1Token, app, request, domain);
      const stopBefore = route1.stops[4];

      // Canceling ride 2
      ride2 = await Rides.findOne({ rider: rider2 });
      await driverCancel(driverSocket, rider2Socket, ride2);
      ride2 = await Rides.findOne({ rider: rider2 });

      // State after cancel
      route1 = await Routes.findOne({ driver, active: true });
      ride1 = await Rides.findOne({ rider: rider1 });
      eta3 = await rideEta(ride1, rider1Token, app, request, domain);
      const stopAfter = route1.stops[5];

      const spy = sinon.spy();
      ride1 = await Rides.findOne({ rider: rider1 });
      const initialEta1 = ride1.initialEta;
      spy(initialEta1);
      sinon.assert.calledWith(spy, sinon.match.typeOf('number'));

      logger.info(eta1, eta2, eta3);

      return sinon.assert.match([
        String(stopBefore.ride),
        String(stopAfter.ride),
        stopBefore.cost > stopAfter.cost,
        eta1 < eta2,
        eta2 > eta3,
        ride2.status === 204 || ride2.status === 205
      ], [String(ride1._id), String(ride1._id), true, true, true, true]);
    });

    it('Should update ride 1 eta on ride 2 no-show-cancel', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      await rideEta(ride1, rider1Token, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      eta1 = await rideEta(ride1, rider1Token, app, request, domain);

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      ride2 = await Rides.findOne({ rider: rider2 });
      await rideEta(ride2, rider2Token, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });

      // State before cancel
      route1 = await Routes.findOne({ driver, active: true });
      ride1 = await Rides.findOne({ rider: rider1 });
      eta2 = await rideEta(ride1, rider1Token, app, request, domain);
      const stopBefore = route1.stops[4];

      // Canceling ride 2
      ride2 = await Rides.findOne({ rider: rider2 });
      await noShowCancel(driverSocket, rider2Socket, ride2);
      ride2 = await Rides.findOne({ rider: rider2 });

      // State after cancel
      route1 = await Routes.findOne({ driver, active: true });
      ride1 = await Rides.findOne({ rider: rider1 });
      eta3 = await rideEta(ride1, rider1Token, app, request, domain);
      const stopAfter = route1.stops[5];

      logger.info(eta1, eta2, eta3);

      return sinon.assert.match([
        String(stopBefore.ride),
        String(stopAfter.ride),
        stopBefore.cost > stopAfter.cost,
        eta1 < eta2,
        eta2 > eta3,
        ride2.status
      ], [String(ride1._id), String(ride1._id), true, true, true, 206]);
    });

    it('Should update ride 1 eta on ride 2 rider-cancel', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      await rideEta(ride1, rider1Token, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      eta1 = await rideEta(ride1, rider1Token, app, request, domain);

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      ride2 = await Rides.findOne({ rider: rider2 });
      await rideEta(ride2, rider2Token, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });

      // State before cancel
      route1 = await Routes.findOne({ driver, active: true });
      ride1 = await Rides.findOne({ rider: rider1 });
      eta2 = await rideEta(ride1, rider1Token, app, request, domain);
      const stopBefore = route1.stops[4];

      // Canceling ride 2
      ride2 = await Rides.findOne({ rider: rider2 });
      await riderCancel(driverSocket, rider2Socket, ride2);
      ride2 = await Rides.findOne({ rider: rider2 });

      // State after cancel
      route1 = await Routes.findOne({ driver, active: true });
      ride1 = await Rides.findOne({ rider: rider1 });
      eta3 = await rideEta(ride1, rider1Token, app, request, domain);
      const stopAfter = route1.stops[5];

      logger.info(eta1, eta2, eta3);

      return sinon.assert.match([
        String(stopBefore.ride),
        String(stopAfter.ride),
        stopBefore.cost > stopAfter.cost,
        eta1 < eta2,
        eta2 > eta3,
        ride2.status
      ], [String(ride1._id), String(ride1._id), true, true, true, 207]);
    });
  });
});
