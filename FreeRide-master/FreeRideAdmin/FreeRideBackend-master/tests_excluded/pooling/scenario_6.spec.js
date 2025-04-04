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
import { createRequest } from '../../tests/utils/rider';
import { pickUp } from '../../tests/utils/driver';
import { emptyAllCollections } from '../../tests/utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver1Socket;
let driver2Socket;
let rider1Socket;
let rider2Socket;
let rider3Socket;
let rider4Socket;
let sandbox;
let driver1;
let driver2;
let driver1Token;
let driver2Token;
let rider1;
let rider2;
let rider3;
let rider4;
let rider1Token;
let rider2Token;
let rider3Token;
let rider4Token;
let location;
let ride1;
let ride2;
let ride3;
let ride4;

const keyLoc = {
  // Driver 1
  d1a: [40.716172, -73.959511, 'N 4th and Bedford'],
  d1b: [40.719496, -73.955957, 'N 10th and Bedford'],
  d1c: [40.725422, -73.951735, 'N Manhattan and Norman'],
  // Driver 2
  d2a: [40.709348, -73.962428, 'S 8th and Driggs'],
  // Request 1
  req1p: [40.72514, -73.951274, '680 Manhattan Ave'],
  req1d: [40.717715, -73.963307, '63 N 3rd st'],
  // Request 2
  req2p: [40.716128, -73.959712, '238 Bedford Ave'],
  req2d: [40.716743, -73.965721, '240 Kent Ave'],
  // Request 3
  req3p: [40.710168, -73.965428, '381 Berry St'],
  req3d: [40.714005, -73.955661, 'Metropolitan & Havemeyer'],
  // Request 4
  req4p: [40.716001, -73.959844, '242 bedford ave'],
  req4d: [40.716559, -73.967078, 'Grand Ferry Park']
};

describe('Scenario #6', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider4Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Williamsburg',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        {
          latitude: 40.732995,
          longitude: -73.969463
        },
        {
          latitude: 40.732598,
          longitude: -73.929026
        },
        {
          latitude: 40.703843,
          longitude: -73.928871
        },
        {
          latitude: 40.703785,
          longitude: -73.972981
        },
        {
          latitude: 40.732995,
          longitude: -73.969463
        }
      ]
    });

    driver1 = await Drivers.createDriver({
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
    });

    driver2 = await Drivers.createDriver({
      currentLocation: {
        coordinates: [keyLoc.d2a[1], keyLoc.d2a[0]],
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
      password: 'Password2',
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

    rider3 = await new Riders({
      email: 'rider3@mail.com',
      firstName: 'Rider',
      lastName: '3',
      password: 'Password3',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    rider4 = await new Riders({
      email: 'rider4@mail.com',
      firstName: 'Rider',
      lastName: '4',
      password: 'Password4',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const driver1SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.driver)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'driver1@mail.com', password: 'Password1' })
      .expect(200)
      .end()
      .get('body');

    const driver2SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.driver)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'driver2@mail.com', password: 'Password2' })
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

    const rider4SessionResponse = await request(app)
      .post('/v1/login')
      .set('host', domain.rider)
      .set('X-Mobile-Os', 'Android')
      .set('X-App-Version', '1.0.0')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({ email: 'rider4@mail.com', password: 'Password4' })
      .expect(200)
      .end()
      .get('body');


    driver1Token = driver1SessionResponse.accessToken;
    driver2Token = driver2SessionResponse.accessToken;
    rider1Token = rider1SessionResponse.accessToken;
    rider2Token = rider2SessionResponse.accessToken;
    rider3Token = rider3SessionResponse.accessToken;
    rider4Token = rider4SessionResponse.accessToken;

    driver1Socket
      .emit('authenticate', { token: driver1Token })
      .on('authenticated', () => {
        logger.info('DRIVER1 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    driver2Socket
      .emit('authenticate', { token: driver2Token })
      .on('authenticated', () => {
        logger.info('DRIVER2 authentiticated through sockets');
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

    rider3Socket
      .emit('authenticate', { token: rider3Token })
      .on('authenticated', () => {
        logger.info('RIDER3 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    rider4Socket
      .emit('authenticate', { token: rider4Token })
      .on('authenticated', () => {
        logger.info('RIDER4 authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  // after(async () => {
  //   await app.close();
  // });

  before(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    driver1Socket.removeAllListeners();
    driver2Socket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
    rider3Socket.removeAllListeners();
    rider4Socket.removeAllListeners();

    // Request 1 created
    logger.info('REQUEST 1 CREATED');
    logger.info([keyLoc.req1p[2], keyLoc.req1p[0], keyLoc.req1p[1]]);
    logger.info([keyLoc.req1d[2], keyLoc.req1d[0], keyLoc.req1d[1]]);

    await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
    await driverSearcher.search();

    ride1 = await Rides.findOne({ rider: rider1 });
    sinon.assert.match(String(ride1.driver), String(driver1._id));

    // Request 2 created
    logger.info('REQUEST 2 CREATED');
    logger.info([keyLoc.req2p[2], keyLoc.req2p[0], keyLoc.req2p[1]]);
    logger.info([keyLoc.req2d[2], keyLoc.req2d[0], keyLoc.req2d[1]]);

    await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
    await driverSearcher.search();

    ride2 = await Rides.findOne({ rider: rider2 });
    sinon.assert.match(String(ride2.driver), String(driver2._id));

    // Driver 2 moves to pick up rider 2
    driver2.currentLocation.coordinates = [keyLoc.req2p[1], keyLoc.req2p[0]];
    await driver2.save();
    ride2 = await Rides.findOne({ rider: rider2 });
    await pickUp(driver2Token, ride2, app, request, domain);

    // Driver 1 moves to postion #1
    driver1.currentLocation.coordinates = [keyLoc.d1b[1], keyLoc.d1b[0]];
    await driver1.save();

    // Request 3 created
    logger.info('REQUEST 3 CREATED');
    logger.info([keyLoc.req3p[2], keyLoc.req3p[0], keyLoc.req3p[1]]);
    logger.info([keyLoc.req3d[2], keyLoc.req3d[0], keyLoc.req3d[1]]);

    await createRequest(rider3Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain);
    await driverSearcher.search();

    ride3 = await Rides.findOne({ rider: rider3 });
    sinon.assert.match(String(ride3.driver), String(driver2._id));

    // Request 2 created
    logger.info('REQUEST 4 CREATED');
    logger.info([keyLoc.req4p[2], keyLoc.req4p[0], keyLoc.req4p[1]]);
    logger.info([keyLoc.req4d[2], keyLoc.req4d[0], keyLoc.req4d[1]]);

    await createRequest(rider4Token, keyLoc.req4p, keyLoc.req4d, location, app, request, domain);
    await driverSearcher.search();

    ride4 = await Rides.findOne({ rider: rider4 });
    sinon.assert.match(String(ride4.driver), String(driver2._id));

    // Driver 1 moves to postion #2
    driver1.currentLocation.coordinates = [keyLoc.d1c[1], keyLoc.d1c[0]];
    await driver1.save();

    // Driver 1 picks up rider 1
    ride1 = await Rides.findOne({ rider: rider1 });
    await pickUp(driver1Token, ride1, app, request, domain);
  });

  describe('Scenario #6', () => {
    it('Should assign driver 1 to ride request 1', async () => {
      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(String(ride1.driver), String(driver1._id));
    });

    it('Should assign driver 2 to ride request 2', async () => {
      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver2._id));
    });

    it('Should assign driver 2 to ride request 3', async () => {
      ride3 = await Rides.findOne({ rider: rider3 });
      return sinon.assert.match(String(ride3.driver), String(driver2._id));
    });

    it('Should assign driver 2 to ride request 4', async () => {
      ride4 = await Rides.findOne({ rider: rider4 });
      return sinon.assert.match(String(ride4.driver), String(driver2._id));
    });
  });
});
