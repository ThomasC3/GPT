import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import moment from 'moment';
import app from '../../server';
import { port, domain } from '../../config';
import { emptyAllCollections } from '../utils/helper';
import driverSearcher from '../../services/driverSearch';
import { createRequest, createRiderLogin } from '../utils/rider';
import {
  createDriverLogin, driverArrived, driverCancel, driverMoved, dropOff, noShowCancel, pickUp
} from '../utils/driver';
import {
  Drivers, Locations, Requests, Riders, Rides, ridesCancellationSources, Routes, Settings
} from '../../models';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;
let location;
let driver;
let rider;
let riderToken;
let driverToken;
let driverSocket;
let ride;
let riderSocket;

const keyLoc = {
  d1a: [40.680806, -73.902878, '1610 Bushwick Ave, Brooklyn, NY 11207, USA'],
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Driver Ride actions', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
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

    ({ rider, riderToken, riderSocket } = await createRiderLogin({ email: 'rider@mail.com', password: 'Password1' }, app, request, domain, riderSocket));

    ({ driver, driverToken, driverSocket } = await createDriverLogin({
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      locations: [location._id],
      email: 'driver@mail.com',
      password: 'Password1',
      isOnline: true
    }, app, request, domain, driverSocket));
  });

  beforeEach(async () => {
    sandbox.restore();
    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
    await Riders.updateRider(rider._id, { lastCancelTimestamp: null });
  });

  describe('PUT /cancel ride', () => {
    it('should cancel a request successfully', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(String(ride.driver), String(driver._id));

      const response = await driverCancel(driverToken, ride._id, app, request, domain);
      sinon.assert.match(response.body.success, true);
      sinon.assert.match(response.body.message, 'Ride cancelled successfully');
      sinon.assert.match(response.body.data.status, 205);
      sinon.assert.match(response.body.data.cancelledBy, ridesCancellationSources.DRIVER);

      ride = await Rides.findOne({ rider: rider._id });
      return sinon.assert.match(ride.status, 205);
    });
    it('should not be able to cancel an after pickup request', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });

      await pickUp(driverToken, ride, app, request, domain);

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(ride.status, 300);

      const response = await driverCancel(driverToken, ride._id, app, request, domain, 400);
      sinon.assert.match(response.body.code, 400);
      sinon.assert.match(response.body.message, 'Unable to cancel ride');

      ride = await Rides.findOne({ rider: rider._id });
      return sinon.assert.match(ride.status, 300);
    });
    it('should not be able to cancel a no show when not close to pickup location', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(String(ride.driver), String(driver._id));

      const response = await noShowCancel(driverToken, { ride }, app, request, domain, 400);
      sinon.assert.match(response.body.code, 400);
      sinon.assert.match(response.body.message, 'You must arrive at your pickup location first!');
    });
    it('should not be able to cancel a no Show when time is not up', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();
      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(String(ride.driver), String(driver._id));

      await driverMoved(driverSocket, keyLoc.req1p[0], keyLoc.req1p[1]);
      await driverArrived(driverToken, ride, app, request, domain);

      const response = await noShowCancel(driverToken, { ride }, app, request, domain, 400);
      sinon.assert.match(response.body.code, 400);
      sinon.assert.match(response.body.message, 'You\'ll only be able to cancel the ride in 3 minutes.');
    });
    it('should be able to to cancel a no show', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(String(ride.driver), String(driver._id));


      await driverMoved(driverSocket, keyLoc.req1p[0], keyLoc.req1p[1]);
      await driverArrived(driverToken, ride, app, request, domain);
      const driverArrivedTimestamp = moment(ride.driverArrivedTimestamp).subtract(3, 'm').toDate();
      await Rides.updateRide(ride._id, { driverArrivedTimestamp });

      const response = await noShowCancel(driverToken, { ride }, app, request, domain);
      sinon.assert.match(response.body.success, true);
      sinon.assert.match(response.body.message, 'Ride cancelled successfully');
      sinon.assert.match(response.body.data.status, 206);
    });
  });

  describe('PUT /complete', () => {
    it('should not allow drop off when ride is not in progress', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(String(ride.driver), String(driver._id));

      const response = await dropOff(driverToken, ride, app, request, domain, 400);
      sinon.assert.match(response.body.code, 400);
      sinon.assert.match(response.body.message, 'We were unable to complete this ride at this time.');
    });
    it('should allow drop off when ride is in progress', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(String(ride.driver), String(driver._id));

      await pickUp(driverToken, ride, app, request, domain);

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(ride.status, 300);

      const response = await dropOff(driverToken, ride, app, request, domain);
      sinon.assert.match(response.body.success, true);
      sinon.assert.match(response.body.message, 'Ride completed successfully');
      sinon.assert.match(response.body.data.status, 700);
    });
  });
});
