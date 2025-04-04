import sinon from 'sinon';
import moment from 'moment-timezone';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  createRequest
} from '../utils/rider';
import {
  pickUp,
  hailRide,
  createDriverLogin
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
let rider1Socket;
let rider2Socket;
let rider3Socket;
let sandbox;
let rider1;
let rider2;
let rider3;
let driverToken;
let rider1Token;
let rider2Token;
let rider3Token;
let location;

const keyLoc = {
  // Driver 1
  d1a: [40.680806, -73.902878, '1610 Bushwick Ave, Brooklyn, NY 11207, USA'],
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA'],
  // Request 2
  req2p: [40.686650, -73.913063, '115-57 Eldert St, Brooklyn, NY 11207, USA'],
  req2d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA'],
  // Request 3
  req3p: [40.690955, -73.920558, '1040 Bushwick Ave, Brooklyn, NY 11221, USA'],
  req3d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Actions #1 with pooling', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      poolingEnabled: true,
      isADA: true,
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


    rider3 = await new Riders({
      email: 'rider3@mail.com',
      firstName: 'Rider',
      lastName: '2',
      password: 'Password3',
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

    const rider3SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider3@mail.com', password: 'Password3' })
      .expect(200)
      .end()
      .get('body');

    rider1Token = rider1SessionResponse.accessToken;
    rider2Token = rider2SessionResponse.accessToken;
    rider3Token = rider3SessionResponse.accessToken;

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

    rider3Socket
      .emit('authenticate', { token: rider3Token })
      .on('authenticated', () => {
        logger.debug('RIDER2 authentiticated through sockets');
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

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Driver actions', () => {
    it('Should have 4 stops', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: rider1 });
      // await pickUp(driverSocket, rider1Socket, ride1);

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      const ride2 = await Rides.findOne({ rider: rider2 });
      await pickUp(driverToken, ride2, app, request, domain);

      await createRequest(rider3Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain);
      await driverSearcher.search();

      const ride3 = await Rides.findOne({ rider: rider3 });
      await pickUp(driverToken, ride3, app, request, domain);

      sinon.assert.match(await Routes.countDocuments(), 1);
      const route = await Routes.findOne({}).populate('driver activeRideId stops.5.ride');
      sinon.assert.match(route.driver.firstName, 'Driver FN');
      sinon.assert.match(`${route.activeRideId.driver}`, `${driver._id}`);
      sinon.assert.match(`${route.stops[5].ride.driver}`, `${driver._id}`);

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
          sinon.assert.match(actions[0].eta.split('T')[0], moment.utc().format('YYYY-MM-DD'));
          sinon.assert.match(actions[1].eta.split('T')[0], moment.utc().format('YYYY-MM-DD'));
          sinon.assert.match(actions[2].eta.split('T')[0], moment.utc().format('YYYY-MM-DD'));
          sinon.assert.match(actions[3].eta.split('T')[0], moment.utc().format('YYYY-MM-DD'));
          sinon.assert.match(actions[0].eta.split('T')[0], moment.utc().format('YYYY-MM-DD'));
          sinon.assert.match(actions[0].stopType, 'pickup');
          sinon.assert.match(actions[0].current, true);
          sinon.assert.match(String(actions[0].id), String(ride1._id));
          sinon.assert.match(actions[1].stopType, 'dropoff');
          sinon.assert.match(actions[1].current, false);
          sinon.assert.match(actions[2].stopType, 'dropoff');
          sinon.assert.match(actions[3].stopType, 'dropoff');
          return actions;
        });

      sinon.assert.match(actionList.length, 4);
    });
    it('Should have 1 hailed ride and 4 stops', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: rider1 });
      // await pickUp(driverSocket, rider1Socket, ride1);

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      const ride2 = await Rides.findOne({ rider: rider2 });
      await pickUp(driverToken, ride2, app, request, domain);

      await createRequest(rider3Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain);
      await driverSearcher.search();

      const ride3 = await Rides.findOne({ rider: rider3 });
      await pickUp(driverToken, ride3, app, request, domain);

      const ride4 = await hailRide(driverToken, location, app, request, domain);

      sinon.assert.match(await Routes.countDocuments(), 1);
      await Routes.findOne({ active: true });

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
          sinon.assert.match(actions[0].current, false);
          sinon.assert.match(actions[0].hailed, true);
          sinon.assert.match(actions[0].status, 300);
          sinon.assert.match(String(actions[0].id), String(ride4.id));
          sinon.assert.match(actions[0].stopType, 'dropoff');

          sinon.assert.match(actions[1].current, true);
          sinon.assert.match(actions[1].hailed, false);
          sinon.assert.match(actions[1].status, 202);
          sinon.assert.match(String(actions[1].id), String(ride1._id));
          sinon.assert.match(actions[1].stopType, 'pickup');

          sinon.assert.match(actions[2].current, false);
          sinon.assert.match(actions[2].stopType, 'dropoff');

          sinon.assert.match(actions[3].stopType, 'dropoff');
          sinon.assert.match(actions[4].stopType, 'dropoff');
          return actions;
        });

      sinon.assert.match(actionList.length, 5);
    });
    it('Should have 1 hailed ride', async () => {
      const ride4 = await hailRide(driverToken, location, app, request, domain);

      sinon.assert.match(await Routes.countDocuments(), 0);
      const route = await Routes.findOne({ active: true });
      sinon.assert.match(route, null);

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
          sinon.assert.match(String(actions[0].id), String(ride4.id));
          sinon.assert.match(actions[0].stopType, 'dropoff');
          return actions;
        });

      sinon.assert.match(actionList.length, 1);
    });
    it('Should have no actions', async () => {
      sinon.assert.match(await Routes.countDocuments(), 0);
      const route = await Routes.findOne({ active: true });
      sinon.assert.match(route, null);

      const actionList = await request(app)
        .get('/v1/actions')
        .set('host', domain.driver)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${driverToken}`)
        .send()
        .expect(200)
        .end()
        .get('body');

      sinon.assert.match(actionList.length, 0);
    });
  });
});
