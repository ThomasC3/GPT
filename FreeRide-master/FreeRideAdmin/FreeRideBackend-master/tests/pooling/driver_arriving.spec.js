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
import { emptyAllCollections } from '../utils/helper';

import { createRequest } from '../utils/rider';

import {
  driverMoved,
  driverArrived,
  createDriverLogin
} from '../utils/driver';

import { sleep } from '../../utils/ride';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver1Socket;
let driver1Token;
let rider1Socket;
let sandbox;
let driver1;
let rider1;
let rider1Token;
let location;
let ride1;

const keyLoc = {
  // Driver 1
  d1a: [32.717755, -117.169051, 'Museum of contemporary art SD'],
  // Request 1
  req1p: [32.715932, -117.167098, 'The Westin SD'],
  req1d: [32.711663, -117.137382, '99 cents only store']
};

describe('Driver arriving/arrived flow', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        {
          latitude: 32.746804,
          longitude: -117.171647
        },
        {
          latitude: 32.750081,
          longitude: -117.007942
        },
        {
          latitude: 32.658783,
          longitude: -117.020256
        },
        {
          latitude: 32.657523,
          longitude: -117.187222
        },
        {
          latitude: 32.746804,
          longitude: -117.171647
        }
      ]
    });

    const driverInfo = {
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
    };

    ({
      driver: driver1,
      driverSocket: driver1Socket,
      driverToken: driver1Token
    } = await createDriverLogin(
      driverInfo,
      app,
      request,
      domain,
      driver1Socket
    ));

    rider1 = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider',
      lastName: '1',
      password: 'Password1',
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

  // after(async () => {
  //   await app.close();
  // });

  before(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.updateOne({ _id: driver1._id }, { $set: { driverRideList: [] } });

    driver1Socket.removeAllListeners();
    rider1Socket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Driver arriving and arrived flow', () => {
    it('Should add driverArrivingTimestamp and driverArrivedTimestamp to ride and change state', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      driver1 = await Drivers.findOne({ _id: driver1.id });
      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver1._id));

      await driverMoved(driver1Socket, keyLoc.req1p[0], keyLoc.req1p[1]);
      await driverMoved(driver1Socket, keyLoc.req1p[0], keyLoc.req1p[1]);
      driver1 = await Drivers.findOne({ _id: driver1.id });

      sinon.assert.match(
        [
          driver1.currentLocation.coordinates[1],
          driver1.currentLocation.coordinates[0]
        ],
        [
          keyLoc.req1p[0],
          keyLoc.req1p[1]
        ]
      );

      await sleep(1000);

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(
        [
          Object.keys(ride1.toJSON()).includes('driverArrivingTimestamp'),
          ride1.status
        ],
        [true, 202]
      );

      await driverArrived(driver1Token, ride1, app, request, domain);
      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(
        [
          Object.keys(ride1.toJSON()).includes('driverArrivedTimestamp'),
          ride1.status
        ],
        [true, 203]
      );
    });
  });
});
// });
