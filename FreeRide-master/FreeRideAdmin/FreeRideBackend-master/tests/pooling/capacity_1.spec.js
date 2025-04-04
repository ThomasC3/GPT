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
import { createDriverLogin } from '../utils/driver';

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
let ride1;
let ride2;

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
  req2d: [40.2041, -8.404072, 'McDonalds']
};

describe('Capacity 1', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    // Coimbra-B (SE)
    // Entrada das acacias (SD)
    // Retiro do mondego (ID)
    // Hotel D. Luis (IE)
    location = await Locations.createLocation({
      name: 'Location',
      isADA: true,
      poolingEnabled: true,
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

    const driverInfo = {
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
      isADA: true,
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

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
  });

  describe('Pooling capacity with ADA', () => {
    it('Should assign driver 1 to request with 4 passengers with ADA', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, true, 4
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(String(ride1.driver), String(driver._id));
    });

    it('Should not assign driver 1 to request with 5 passengers with ADA', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, true, 5
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(ride1, null);
    });

    it('Should not assign driver 1 to request with 1 passenger not ADA after 3 passengers with ADA', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, true, 3
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(ride2, null);
    });

    it('Should not assign driver 1 to request with 1 passenger without ADA', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(ride1, null);
    });

    it('Should assign driver 1 to request with 1 passenger with ADA after 4 passengers with ADA', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, true, 4
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, true, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver._id));
    });

    it('Should assign driver 1 to request with 1 passenger with ADA after 1 passenger with ADA', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, true, 1
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, true, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver._id));
    });
  });
});
