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
import { pickUp, dropOff, createDriverLogin } from '../utils/driver';

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
let ride1;
let ride2;

const keyLoc = {
  d1a: [40.192642, -8.413896, 'IPN'],

  req1p: [40.205074, -8.407353, 'Alma shopping'],
  req1d: [40.216346, -8.412707, 'Celas'],

  req2p: [40.207479, -8.429915, 'Largo da portagem'],
  req2d: [40.185202, -8.398171, 'Portela do mondego'],

  req3p: [40.199436, -8.408408, 'Bairro Norton de Matos'],
  req3d: [40.358727, -8.540138, 'Ourenta']
};

describe('Queue time limit driver filter', () => {
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
          latitude: 40.373031,
          longitude: -8.562575
        },
        {
          latitude: 40.383216,
          longitude: -8.300574
        },
        {
          latitude: 40.154377,
          longitude: -8.333683
        },
        {
          latitude: 40.167740,
          longitude: -8.568762
        },
        {
          latitude: 40.373031,
          longitude: -8.562575
        }
      ]
    });

    const driverInfo = {
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      email: 'driver@mail.com',
      locations: [location._id]
    };

    ({ driver, driverSocket, driverToken } = await createDriverLogin(
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

    await Locations.updateOne({ _id: location._id }, { $unset: { queueTimeLimit: '' } });

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
  });

  describe('Queue time limit', () => {
    it('Should add ride if limit not exceeded', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.rider), String(rider1._id));

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      ride2 = await Rides.findOne({ rider: rider2 });

      return sinon.assert.match(String(ride2.rider), String(rider2._id));
    });

    it('Should not add ride if 30 minute travel time exceeded', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.rider), String(rider1._id));

      await pickUp(driverToken, ride1, app, request, domain);

      await createRequest(rider2Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain);
      await driverSearcher.search();
      ride2 = await Rides.findOne({ rider: rider2 });

      return sinon.assert.match(ride2, null);
    });
    it('Should not add ride if location travel limit exceeded', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.rider), String(rider1._id));

      await Locations.findOneAndUpdate({ _id: location._id }, { queueTimeLimit: 1 }, { new: true });
      location = await Locations.findOne({ _id: location._id });

      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();
      ride2 = await Rides.findOne({ rider: rider2 });

      return sinon.assert.match(ride2, null);
    });
    it('Should add ride if limit exceeded but no route', async () => {
      location.queueTimeLimit = 5;
      await location.save();
      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });

      return sinon.assert.match(String(ride2.rider), String(rider2._id));
    });
    it('Should add ride if limit exceeded but previous route complete', async () => {
      await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();
      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.rider), String(rider1._id));
      await pickUp(driverToken, ride1, app, request, domain);
      await dropOff(driverToken, ride1, app, request, domain);

      location.queueTimeLimit = 5;
      await location.save();
      await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });

      return sinon.assert.match(String(ride2.rider), String(rider2._id));
    });
  });
});
