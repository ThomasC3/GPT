import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import { port, domain } from '../config';
import logger from '../logger';
import {
  Riders, Drivers, Locations, Settings
} from '../models';
import { emptyAllCollections } from './utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driverSocket;
let driver2Socket;
let driver3Socket;

let rider1Socket;
let rider2Socket;
let rider3Socket;

let driverToken;
let rider1Token;
let rider2Token;
let rider3Token;
let location;

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  d1b: [40.198857, -8.40275, 'Via lusitania'],
  d1c: [40.202714, -8.404019, 'Moinho velho'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds'],
  // Request 2
  req2p: [40.19689, -8.402655, 'Minipreco'],
  req2d: [40.2041, -8.404072, 'McDonalds'],
  // Request 3
  req3p: [40.19689, -8.402655, 'Minipreco'],
  req3d: [40.2006767, -8.4050056, 'SuperCor'],
  // Request 4
  req4p: [40.197, -8.4027, 'Minipreco'],
  req4d: [40.2006767, -8.4050056, 'SuperCor']
};

describe('Login Flow', () => {
  before(async () => {
    sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    driver2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver3Socket = io.connect(`http://localhost:${port}`, ioOptions);

    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);

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

    await Drivers.createDriver({
      // Leroy Merlin
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

    await Drivers.createDriver({
      // Leroy Merlin
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
    });

    await Drivers.createDriver({
      // Leroy Merlin
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
    });

    await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();


    await new Riders({
      email: 'RIDER2@mail.com',
      firstName: 'Rider',
      lastName: '2',
      password: 'Password2',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    await new Riders({
      email: 'rider3@mail.com',
      firstName: 'Rider',
      lastName: '3',
      password: 'Password3',
      location: location._id,
      dob: '2000-12-11'
    }).save();
  });

  describe('Login', () => {
    it('Rider 1', async () => {
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

      rider1Token = rider1SessionResponse.accessToken;

      rider1Socket
        .emit('authenticate', { token: rider1Token })
        .on('authenticated', () => {
          logger.debug('RIDER1 authentiticated through sockets');
        })
        .on('unauthorized', (msg) => {
          throw new Error(msg);
        });
    });

    it('Rider 2', async () => {
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

      rider2Token = rider2SessionResponse.accessToken;

      rider2Socket
        .emit('authenticate', { token: rider2Token })
        .on('authenticated', () => {
          logger.debug('RIDER2 authentiticated through sockets');
        })
        .on('unauthorized', (msg) => {
          throw new Error(msg);
        });
    });

    it('Rider 3', async () => {
      const rider3SessionResponse = await request(app)
        .post('/v1/login')
        .set('host', domain.rider)
        .set('X-Mobile-Os', 'Android')
        .set('X-App-Version', '1.0.0')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({ email: 'RIDER3@mail.com', password: 'Password3' })
        .expect(200)
        .end()
        .get('body');

      rider3Token = rider3SessionResponse.accessToken;

      rider3Socket
        .emit('authenticate', { token: rider3Token })
        .on('authenticated', () => {
          logger.debug('RIDER3 authentiticated through sockets');
        })
        .on('unauthorized', (msg) => {
          throw new Error(msg);
        });
    });

    it('Driver 1', async () => {
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

      driverSocket
        .emit('authenticate', { token: driverToken })
        .on('authenticated', () => {
          logger.debug('DRIVER1 authentiticated through sockets');
        })
        .on('unauthorized', (msg) => {
          throw new Error(msg);
        });
    });

    it('Driver 2', async () => {
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

    it('Driver 3', async () => {
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
  });
});
