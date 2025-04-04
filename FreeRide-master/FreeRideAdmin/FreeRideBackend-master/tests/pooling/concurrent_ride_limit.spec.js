import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import { createRiderLogin, createRequest } from '../utils/rider';
import { createDriverLogin, pickUp } from '../utils/driver';
import {
  Locations, Requests, Rides, Routes, Settings, Drivers
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let result;
const riderTokens = [];
const riders = [];
let driver;
let driverSocket;
let rider1Socket;
let driverToken;
let rider2Socket;
let rider3Socket;
let sandbox;
let location;

const keyLoc = {
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req2p: [40.683719, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req3p: [40.683819, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Concurrent ride limit', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      passengerLimit: 3,
      poolingEnabled: true,
      concurrentRideLimit: 2,
      queueTimeLimit: 60,
      etaIncreaseLimit: 30,
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

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);

    ({ driver, driverToken } = await createDriverLogin({
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      },
      locations: [location._id],
      email: 'driver1@mail.com',
      password: 'Password1',
      isOnline: true
    }, app, request, domain, driverSocket));

    result = await createRiderLogin({ email: 'rider1@mail.com', password: 'Password1' }, app, request, domain, rider1Socket);
    riderTokens.push(result.riderToken);
    riders.push(result.rider);

    result = await createRiderLogin({ email: 'rider2@mail.com', password: 'Password2' }, app, request, domain, rider2Socket);
    riderTokens.push(result.riderToken);
    riders.push(result.rider);

    result = await createRiderLogin({ email: 'rider3@mail.com', password: 'Password3' }, app, request, domain, rider3Socket);
    riderTokens.push(result.riderToken);
    riders.push(result.rider);
  });

  after(async () => { });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });
  });

  describe('Concurrent ride limit', () => {
    it('With a limit of 2 rides at a time, 3rd rider will appear earlier', async () => {
      location.concurrentRideLimit = 3;
      location = await location.save();

      await createRequest(
        riderTokens[0], keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      await createRequest(
        riderTokens[1], keyLoc.req2p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      await createRequest(
        riderTokens[2], keyLoc.req3p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: riders[0] });
      const ride2 = await Rides.findOne({ rider: riders[1] });
      const ride3 = await Rides.findOne({ rider: riders[2] });

      const rideDict = {};
      rideDict[String(ride1._id)] = 'Ride1';
      rideDict[String(ride2._id)] = 'Ride2';
      rideDict[String(ride3._id)] = 'Ride3';

      const route1 = await Routes.findOne({ driver: driver._id });
      const routeA = route1.stops.map((stop) => {
        if (stop.ride) {
          return [rideDict[String(stop.ride)], stop.stopType, stop.status];
        }
        return [-1, stop.stopType, stop.status];
      });

      const routeB = [
        [-1, 'current_location', 'done'],
        [-1, 'current_location', 'done'],
        [-1, 'current_location', 'done'],
        [rideDict[String(ride1._id)], 'pickup', 'waiting'],
        [rideDict[String(ride2._id)], 'pickup', 'waiting'],
        [rideDict[String(ride3._id)], 'pickup', 'waiting'],
        [rideDict[String(ride1._id)], 'dropoff', 'waiting'],
        [rideDict[String(ride2._id)], 'dropoff', 'waiting'],
        [rideDict[String(ride3._id)], 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });
    it('With a limit of 2 rides at a time and 2 rides picked up 3rd rider will appear earlier', async () => {
      location.concurrentRideLimit = 3;
      location = await location.save();

      await createRequest(
        riderTokens[0], keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      await createRequest(
        riderTokens[1], keyLoc.req2p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: riders[0] });
      const ride2 = await Rides.findOne({ rider: riders[1] });
      await pickUp(driverToken, ride1, app, request, domain);
      await pickUp(driverToken, ride2, app, request, domain);

      await createRequest(
        riderTokens[2], keyLoc.req3p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      const ride3 = await Rides.findOne({ rider: riders[2] });

      const rideDict = {};
      rideDict[String(ride1._id)] = 'Ride1';
      rideDict[String(ride2._id)] = 'Ride2';
      rideDict[String(ride3._id)] = 'Ride3';

      const route1 = await Routes.findOne({ driver: driver._id });
      const routeA = route1.stops.map((stop) => {
        if (stop.ride) {
          return [rideDict[String(stop.ride)], stop.stopType, stop.status];
        }
        return [-1, stop.stopType, stop.status];
      });

      const routeB = [
        [-1, 'current_location', 'done'],
        [-1, 'current_location', 'done'],
        [rideDict[String(ride1._id)], 'pickup', 'done'],
        [rideDict[String(ride2._id)], 'pickup', 'done'],
        [-1, 'current_location', 'done'],
        [rideDict[String(ride3._id)], 'pickup', 'waiting'],
        [rideDict[String(ride1._id)], 'dropoff', 'waiting'],
        [rideDict[String(ride2._id)], 'dropoff', 'waiting'],
        [rideDict[String(ride3._id)], 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });
    it('With a limit of 3 rides at a time, 3rd rider will appear later', async () => {
      location.concurrentRideLimit = 2;
      location = await location.save();

      await createRequest(
        riderTokens[0], keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      await createRequest(
        riderTokens[1], keyLoc.req2p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      await createRequest(
        riderTokens[2], keyLoc.req3p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: riders[0] });
      const ride2 = await Rides.findOne({ rider: riders[1] });
      const ride3 = await Rides.findOne({ rider: riders[2] });

      const rideDict = {};
      rideDict[String(ride1._id)] = 'Ride1';
      rideDict[String(ride2._id)] = 'Ride2';
      rideDict[String(ride3._id)] = 'Ride3';

      const route1 = await Routes.findOne({ driver: driver._id });
      const routeA = route1.stops.map((stop) => {
        if (stop.ride) {
          return [rideDict[String(stop.ride)], stop.stopType, stop.status];
        }
        return [-1, stop.stopType, stop.status];
      });

      const routeB = [
        [-1, 'current_location', 'done'],
        [-1, 'current_location', 'done'],
        [-1, 'current_location', 'done'],
        [rideDict[String(ride1._id)], 'pickup', 'waiting'],
        [rideDict[String(ride2._id)], 'pickup', 'waiting'],
        [rideDict[String(ride1._id)], 'dropoff', 'waiting'],
        [rideDict[String(ride2._id)], 'dropoff', 'waiting'],
        [rideDict[String(ride3._id)], 'pickup', 'waiting'],
        [rideDict[String(ride3._id)], 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });
    it('With a limit of 3 rides at a time and 2 rides picked up, 3rd rider will appear later', async () => {
      location.concurrentRideLimit = 2;
      location = await location.save();

      await createRequest(
        riderTokens[0], keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      await createRequest(
        riderTokens[1], keyLoc.req2p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      const ride1 = await Rides.findOne({ rider: riders[0] });
      const ride2 = await Rides.findOne({ rider: riders[1] });
      await pickUp(driverToken, ride1, app, request, domain);
      await pickUp(driverToken, ride2, app, request, domain);

      await createRequest(
        riderTokens[2], keyLoc.req3p, keyLoc.req1d, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      const ride3 = await Rides.findOne({ rider: riders[2] });

      const rideDict = {};
      rideDict[String(ride1._id)] = 'Ride1';
      rideDict[String(ride2._id)] = 'Ride2';
      rideDict[String(ride3._id)] = 'Ride3';

      const route1 = await Routes.findOne({ driver: driver._id });
      const routeA = route1.stops.map((stop) => {
        if (stop.ride) {
          return [rideDict[String(stop.ride)], stop.stopType, stop.status];
        }
        return [-1, stop.stopType, stop.status];
      });

      const routeB = [
        [-1, 'current_location', 'done'],
        [-1, 'current_location', 'done'],
        [rideDict[String(ride1._id)], 'pickup', 'done'],
        [rideDict[String(ride2._id)], 'pickup', 'done'],
        [-1, 'current_location', 'done'],
        [rideDict[String(ride1._id)], 'dropoff', 'waiting'],
        [rideDict[String(ride2._id)], 'dropoff', 'waiting'],
        [rideDict[String(ride3._id)], 'pickup', 'waiting'],
        [rideDict[String(ride3._id)], 'dropoff', 'waiting']
      ];

      const spy = sinon.spy();
      spy(routeB);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(routeA));
    });
  });
});
