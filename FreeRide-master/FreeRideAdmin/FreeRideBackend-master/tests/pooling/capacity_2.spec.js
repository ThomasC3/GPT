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

import { createRequest, createRequestAnyStatus } from '../utils/rider';
import {
  hailRide, createDriverLogin, dropOff
} from '../utils/driver';

import { getUpdatedRoute } from '../../services/matching';

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

describe('Capacity 2', () => {
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
      poolingEnabled: true,
      isUsingServiceTimes: false,
      isActive: true,
      passengerLimit: 5,
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

    await Drivers.syncIndexes();
    await Locations.syncIndexes();

    driverSocket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
  });

  describe('Pooling Capacity without ADA', () => {
    it('Should assign driver 1 to request with 5 passengers without ADA', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 5
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(String(ride1.driver), String(driver._id));
    });

    it('Should not assign driver 1 to request with 6 passengers without ADA', async () => {
      const result = await createRequestAnyStatus(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 6
      );
      sinon.assert.match(result.code, 400);

      const allRequests = await Requests.find({ rider: rider1._id });
      return sinon.assert.match(allRequests.length, 0);
    });

    it('Should assign driver 1 to request with 1 passenger not ADA after 4 passengers without ADA', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 4
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver._id));
    });

    it('Should assign driver 1 to request with 2 passenger not ADA after 4 passengers without ADA', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 4
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, false, 2
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver._id));
    });

    it('Should assign driver 1 to request with 1 passenger not ADA after 5 passengers without ADA', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 5
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver._id));
    });

    it('Should not assign driver 1 to request with 1 passenger not ADA after 5 hailed passengers', async () => {
      await hailRide(driverToken, location, app, request, domain, false, 5);

      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(ride1, null);
    });

    it('Should assign driver 1 to request with 1 passenger not ADA after 4 hailed passengers', async () => {
      await hailRide(driverToken, location, app, request, domain, false, 4);

      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(String(ride1.driver), String(driver._id));
    });

    it('Should be able to update route after 2 rides assigned with 5 passenger and 5 hailed passengers', async () => {
      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 5
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain, false, 5
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(String(ride2.driver), String(driver._id));

      await hailRide(driverToken, location, app, request, domain, false, 5);

      const route = await Routes.findOne({ active: true, driver: driver._id });
      const stops = await getUpdatedRoute(route);

      sinon.assert.match(String(ride1._id), String(route.stops[2].ride));
      sinon.assert.match(String(ride1._id), stops[3].ride);
      return sinon.assert.match(stops[3].cost > route.stops[2].cost, true);
    });

    it('Should be keep 2 rides of 2 passengers sequential after 3 hailed passengers and route update', async () => {
      await hailRide(driverToken, location, app, request, domain, false, 3);

      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 2
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 2
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(String(ride2.driver), String(driver._id));


      const route = await Routes.findOne({ active: true, driver: driver._id });
      const stops = await getUpdatedRoute(route);

      const originalRoute = route.stops.reduce((total, stop) => {
        if (stop.stopType !== 'current_location') {
          total.push([String(stop.ride), stop.stopType]);
        }
        return total;
      }, []);

      const updatedRoute = stops.reduce((total, stop) => {
        if (stop.stopType !== 'current_location') {
          total.push([stop.ride, stop.stopType]);
        }
        return total;
      }, []);

      return sinon.assert.match(originalRoute, updatedRoute);
    });

    it('Should change route for 2 sequential rides of 2 passengers after 3 hailed passengers dropoff', async () => {
      await hailRide(driverToken, location, app, request, domain, false, 3);

      await createRequest(
        rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 2
      );
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider: rider1 });
      sinon.assert.match(String(ride1.driver), String(driver._id));

      await createRequest(
        rider2Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 2
      );
      await driverSearcher.search();

      ride2 = await Rides.findOne({ rider: rider2 });
      sinon.assert.match(String(ride2.driver), String(driver._id));

      const route = await Routes.findOne({ active: true, driver: driver._id });

      const hailedRide = await Rides.findOne({ driver: driver._id, rider: null });
      await dropOff(driverToken, hailedRide, app, request, domain);

      const stops = await getUpdatedRoute(route);

      const originalRoute = route.stops.reduce((total, stop) => {
        if (stop.stopType !== 'current_location') {
          total.push([String(stop.ride), stop.stopType]);
        }
        return total;
      }, []);

      const updatedRoute = stops.reduce((total, stop) => {
        if (stop.stopType !== 'current_location') {
          total.push([stop.ride, stop.stopType]);
        }
        return total;
      }, []);

      sinon.assert.match(originalRoute, [
        [String(ride1._id), 'pickup'],
        [String(ride1._id), 'dropoff'],
        [String(ride2._id), 'pickup'],
        [String(ride2._id), 'dropoff']
      ]);
      return sinon.assert.match(updatedRoute, [
        [String(ride1._id), 'pickup'],
        [String(ride2._id), 'pickup'],
        [String(ride1._id), 'dropoff'],
        [String(ride2._id), 'dropoff']
      ]);
    });
  });
});
