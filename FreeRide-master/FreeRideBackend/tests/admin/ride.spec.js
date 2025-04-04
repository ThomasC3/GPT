import sinon from 'sinon';
import { expect } from 'chai';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import { emptyAllCollections } from '../utils/helper';
import driverSearcher from '../../services/driverSearch';
import { createRequest, createRiderLogin } from '../utils/rider';
import {
  createDriverLogin, pickUp
} from '../utils/driver';
import {
  Drivers, Locations, Requests, ridesCancellationSources, Riders, Rides, Routes, Settings
} from '../../models';
import { adminEndpoint, createAdminLogin } from '../utils/admin';

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
let adminToken;

const keyLoc = {
  d1a: [40.680806, -73.902878, '1610 Bushwick Ave, Brooklyn, NY 11207, USA'],
  // Request 1
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Admin Ride actions', () => {
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
      fleetEnabled: true,
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

    ({ adminToken } = await createAdminLogin());

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

  describe('Fetch correct ride data', () => {
    it('Ride list - GET /v1/rides', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });
      expect(String(ride.driver), String(driver._id));

      const response = await adminEndpoint('/v1/rides/', 'get', adminToken, app, request, domain);
      expect(response.body.items).to.have.lengthOf(1);
      expect(response.body.items[0]).to.have.property('pickupZone');
      expect(response.body.items[0]).to.have.property('pickupZone');
      expect(response.body.items[0].pickupZone.name).to.equal('Default');
      expect(response.body.items[0]).to.have.property('dropoffZone');
      expect(response.body.items[0].dropoffZone.name).to.equal('Default');
      expect(response.body.items[0]).to.have.property('vehicle');
      expect(response.body.items[0].vehicle).to.have.keys([
        'publicId', 'vehicleName', 'vehicleId',
        'service', 'zones', 'matchingRule', 'jobs',
        'vehicleType', 'profile'
      ]);
    });
    it('Ride page - GET /v1/rides/:id', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });
      expect(String(ride.driver), String(driver._id));

      const response = await adminEndpoint(`/v1/rides/${ride._id}`, 'get', adminToken, app, request, domain);
      expect(response.body).to.have.property('pickupZone');
      expect(response.body.pickupZone.name).to.equal('Default');
      expect(response.body).to.have.property('dropoffZone');
      expect(response.body.dropoffZone.name).to.equal('Default');
      expect(response.body).to.have.property('vehicle');
      expect(response.body.vehicle).to.have.keys([
        'publicId', 'vehicleName', 'vehicleId',
        'service', 'zones', 'matchingRule', 'jobs',
        'vehicleType', 'profile'
      ]);
    });
  });

  describe('Cancel a ride /cancel', () => {
    it('should cancel a ride successfully', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(String(ride.driver), String(driver._id));

      const response = await adminEndpoint(`/v1/rides/${ride._id}/cancel`, 'put', adminToken, app, request, domain);
      sinon.assert.match(response.body.status, 205);

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(ride.status, 205);
      return sinon.assert.match(ride.cancelledBy, ridesCancellationSources.ADMIN);
    });
    it('should not be able to cancel an after pickup ride', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain, false, 3
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });

      await pickUp(driverToken, ride, app, request, domain);

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(ride.status, 300);

      const response = await adminEndpoint(`/v1/rides/${ride._id}/cancel`, 'put', adminToken, app, request, domain);
      sinon.assert.match(response.body.code, 400);
      sinon.assert.match(response.body.message, 'Unable to cancel ride');

      ride = await Rides.findOne({ rider: rider._id });
      return sinon.assert.match(ride.status, 300);
    });
  });
  describe('Complete a ride /complete', () => {
    it('should not allow drop off when ride is not in progress', async () => {
      await createRequest(
        riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();

      ride = await Rides.findOne({ rider: rider._id });
      sinon.assert.match(String(ride.driver), String(driver._id));

      const response = await adminEndpoint(`/v1/rides/${ride._id}/complete`, 'put', adminToken, app, request, domain);
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

      const response = await adminEndpoint(`/v1/rides/${ride._id}/complete`, 'put', adminToken, app, request, domain);
      sinon.assert.match(response.body.status, 700);
    });
  });
});
