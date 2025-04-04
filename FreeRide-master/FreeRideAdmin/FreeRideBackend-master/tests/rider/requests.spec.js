import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import logger from '../../logger';
import { createRequest, riderEndpoint } from '../utils/rider';
import {
  Riders, Drivers, Locations,
  Requests, Rides, Routes,
  RequestStatus, Settings, Messages
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driverSocket;
let rider1Socket;
let rider2Socket;
let sandbox;
let driverToken;
let rider1;
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

describe('Rider request and duplicate handling', () => {
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

    await Drivers.createDriver({
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
    });

    rider1 = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    await new Riders({
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
        logger.debug('DRIVER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

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
    await Requests.deleteMany();
    await Messages.deleteMany();
  });

  describe('POST /requests', () => {
    it('Creates a Request with a message', async () => {
      const payload = {
        passengers: 1,
        isADA: false,
        origin: {
          address: keyLoc.req1p[2],
          latitude: keyLoc.req1p[0],
          longitude: keyLoc.req1p[1]
        },
        message: 'test message',
        location: location._id.toString(),
        destination: {
          address: keyLoc.req1d[2],
          latitude: keyLoc.req1d[0],
          longitude: keyLoc.req1d[1]
        }
      };

      await riderEndpoint('/v1/ride/request', 'post', rider1Token, app, request, domain, payload);

      const msg = await Messages.findOne({});
      return sinon.assert.match(msg.message, 'test message');
    });
  });

  describe('GET /requests', () => {
    it('Should return a single ride for a specific rider', async () => {
      const { location: riderLocation } = await Riders.findOne({ _id: rider1._id }).populate('location');
      sinon.assert.match(riderLocation.name, 'Location');

      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);

      const requests = await request(app)
        .get('/v1/requests')
        .set('host', domain.rider)
        .set('X-Mobile-Os', 'Android')
        .set('X-App-Version', '1.0.0')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${rider1Token}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((response) => {
          sinon.assert.match(response[0].status, RequestStatus.RideRequested);

          return response;
        });

      return sinon.assert.match(requests.length, 1);
    });

    it('Should return two requests, one cancelled', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await createRequest(rider1Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);

      const requests = await request(app)
        .get('/v1/requests')
        .set('host', domain.rider)
        .set('X-Mobile-Os', 'Android')
        .set('X-App-Version', '1.0.0')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${rider1Token}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((response) => {
          sinon.assert.match(response[0].status, RequestStatus.RideRequested);
          sinon.assert.match(response[1].status, RequestStatus.RequestCancelled);
          return response;
        });

      return sinon.assert.match(requests.length, 2);
    });

    it('Should return one request, with status 100', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);

      const requests = await request(app)
        .get('/v1/requests?status=100')
        .set('host', domain.rider)
        .set('X-Mobile-Os', 'Android')
        .set('X-App-Version', '1.0.0')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${rider1Token}`)
        .send()
        .expect(200)
        .end()
        .get('body')
        .then((response) => {
          sinon.assert.match(response[0].status, RequestStatus.RideRequested);
          return response;
        });

      return sinon.assert.match(requests.length, 1);
    });
  });
});
