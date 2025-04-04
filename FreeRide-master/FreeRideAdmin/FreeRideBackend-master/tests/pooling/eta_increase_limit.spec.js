import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  Requests, Riders, Drivers, Locations, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createRequest } from '../utils/rider';
import { createDriverLogin } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver1Socket;
let rider1Socket;
let rider2Socket;
let sandbox;
let driver1;
let rider1;
let rider2;
let rider1Token;
let rider2Token;
let location;
let ride1;
let ride2;

const keyLoc = {
  d1a: [32.697327, -117.085174, 'BR'],

  req1p: [32.738419, -117.026602, 'P1'],
  req1d: [32.742029, -117.022826, 'D'],

  req2p: [32.668643, -117.076884, 'P2'],
  req2d: [32.742029, -117.022826, 'D']
};

describe('ETA increase limit filter', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    location = await Locations.createLocation({
      name: 'San Diego',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      inversionRangeFeet: 50,
      etaIncreaseLimit: 5,
      serviceArea: [
        {
          latitude: 32.720245,
          longitude: -117.110911
        },
        {
          latitude: 32.763587,
          longitude: -117.010957
        },
        {
          latitude: 32.660626,
          longitude: -116.993861
        },
        {
          latitude: 32.647368,
          longitude: -117.094861
        },
        {
          latitude: 32.720245,
          longitude: -117.110911
        }
      ]
    });

    const driver1Info = {
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      locations: [location._id]
    };

    ({
      driver: driver1, driverSocket: driver1Socket
    } = await createDriverLogin(
      driver1Info, app, request, domain, driver1Socket
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

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.updateOne({ _id: driver1._id }, { $set: { driverRideList: [] } });

    driver1Socket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
  });

  describe('ETA increase limit', () => {
    it('Should add rider 2 to driver 2 because of limit', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver1._id));

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      ride2 = await Rides.findOne({ rider: rider2 });

      return sinon.assert.match(ride2, null);
    });
  });
});
