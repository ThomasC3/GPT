import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import { createDriverLogin, driverEndpoint } from '../utils/driver';
import { createGEMVehicle } from '../utils/vehicle';
import {
  Locations, Drivers, Settings, Services
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;
let fleetDrivers;
let noFleetDrivers;
let location;
let fleetLocation;
let vehicle;

const keyLoc = {
  l1: [40.6984703, -73.9306068, 'Address'],
  l2: [40.6574619, -73.9309502, 'Address'],
  serviceArea1: [
    { longitude: -73.9785730, latitude: 40.7212390 },
    { longitude: -73.9785730, latitude: 40.6747034 },
    { longitude: -73.8835971, latitude: 40.6747034 },
    { longitude: -73.8829360, latitude: 40.7212390 },
    { longitude: -73.9785730, latitude: 40.7212390 }
  ],
  serviceArea2: [
    { longitude: -73.9780565, latitude: 40.6412001 },
    { longitude: -73.8836011, latitude: 40.6412001 },
    { longitude: -73.8836011, latitude: 40.6747034 },
    { longitude: -73.9785730, latitude: 40.6747034 },
    { longitude: -73.9780565, latitude: 40.6412001 }
  ]
};

describe('Driver availability status change', () => {
  before(async () => {
    sandbox = sinon.createSandbox();
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    await Services.create({
      key: 'passenger_only',
      title: 'Passenger Only',
      desc: 'Passenger Cap only'
    });
  });

  after(async () => {
    sandbox.restore();
  });

  describe('With feature flag enabled', () => {
    before(async () => {
      fleetLocation = await Locations.createLocation({
        name: 'Fleet location',
        isActive: true,
        fleetEnabled: true,
        serviceArea: keyLoc.serviceArea1
      });

      const driverInfo = {
        currentLocation: {
          coordinates: [keyLoc.l1[1], keyLoc.l1[0]],
          type: 'Point'
        },
        isOnline: true
      };

      vehicle = await createGEMVehicle(false, fleetLocation._id, { driverDump: true });

      const services = [null, null, 'passenger_only'];
      const promises = [];
      let setActiveLocation;
      for (let i = 0; i < 3; i += 1) {
        setActiveLocation = i !== 0;
        promises.push(createDriverLogin(
          {
            ...driverInfo,
            email: `driver${i + 1}@mail.com`,
            isADA: false,
            vehicle: services[i] ? vehicle : null,
            locations: i === 0 ? [] : [fleetLocation._id],
            isAvailable: false
          },
          app, request, domain, io.connect(`http://localhost:${port}`, ioOptions),
          { setActiveLocation, attachSharedVehicle: false }
        ));
      }
      fleetDrivers = await Promise.all(promises);

      await Drivers.syncIndexes();
      await Locations.syncIndexes();
    });

    beforeEach(async () => {
      await Drivers.updateMany(
        {
          _id: {
            $in: fleetDrivers.map(driver => driver.driver._id)
          }
        },
        { isAvailable: false }
      );
    });

    it('Should not change state for driver with no active location', async () => {
      const driverWithoutLocations = fleetDrivers[0];

      // No active location
      const driverInfo = await Drivers.findOne({ _id: driverWithoutLocations.driver._id });
      sinon.assert.match(driverInfo.activeLocation, null);

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithoutLocations.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(status.vehicle, null);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverWithoutLocations.driverToken, app, request, domain, payload, 400
      );
      return sinon.assert.match(statusChange.message, 'Unable to update your availability because you have not set location');
    });
    it('Should not change state to available for driver without vehicle', async () => {
      const driverWithoutVehicle = fleetDrivers[1];

      // With one location associated
      const driverInfo = await Drivers.findOne({ _id: driverWithoutVehicle.driver._id });
      sinon.assert.match(driverInfo.locations.length, 1);

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithoutVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(!!status.vehicleId, false);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverWithoutVehicle.driverToken, app, request, domain, payload, 400
      );
      return sinon.assert.match(statusChange.message, 'Unable to update your availability because you are not attached to a vehicle');
    });
    it('Should change state to unavailable for driver without vehicle', async () => {
      const driverWithoutVehicle = fleetDrivers[1];

      // With one location associated
      const driverInfo = await Drivers.findOne({ _id: driverWithoutVehicle.driver._id });
      sinon.assert.match(driverInfo.locations.length, 1);

      // Get status
      await Drivers.updateOne({ _id: driverWithoutVehicle.driver._id }, { isAvailable: true });
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithoutVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, true);
      sinon.assert.match(!!status.vehicleId, false);

      // Update status
      const payload = { isAvailable: false };
      const { body: statusChange } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverWithoutVehicle.driverToken, app, request, domain, payload
      );
      sinon.assert.match(statusChange.isAvailable, false);

      const updatedDriverInfo = await Drivers.findOne({ _id: driverWithoutVehicle.driver._id });
      return sinon.assert.match(updatedDriverInfo.isAvailable, false);
    });
    it('Should change state for driver with vehicle', async () => {
      const driverWithVehicle = fleetDrivers[2];

      // With one location associated
      const driverInfo = await Drivers.findOne({ _id: driverWithVehicle.driver._id });
      sinon.assert.match(driverInfo.locations.length, 1);

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(!!status.vehicle, true);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverWithVehicle.driverToken, app, request, domain, payload
      );
      sinon.assert.match(statusChange.isAvailable, true);

      const updatedDriverInfo = await Drivers.findOne({ _id: driverWithVehicle.driver._id });
      return sinon.assert.match(updatedDriverInfo.isAvailable, true);
    });
    it('should not allow logout while vehicle attached', async () => {
      const driverWithVehicle = fleetDrivers[2];

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(!!status.vehicle, true);

      const response = await driverEndpoint(
        '/v1/logout', 'post',
        driverWithVehicle.driverToken, app, request, domain,
        { deviceToken: driverWithVehicle.driverToken },
        400
      );

      sinon.assert.match(response.body.code, 400);
      return sinon.assert.match(response.body.message, 'Cannot log out with a vehicle attached');
    });
    it('should not allow logout while available', async () => {
      const driverWithoutVehicle = fleetDrivers[1];

      // Force available
      await Drivers.updateOne({ _id: driverWithoutVehicle.driver._id }, { isAvailable: true });

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithoutVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, true);
      sinon.assert.match(!!status.vehicle, false);

      const response = await driverEndpoint(
        '/v1/logout', 'post',
        driverWithoutVehicle.driverToken, app, request, domain,
        { deviceToken: driverWithoutVehicle.driverToken },
        400
      );

      // Reset availability
      await Drivers.updateOne({ _id: driverWithoutVehicle.driver._id }, { isAvailable: false });

      sinon.assert.match(response.body.code, 400);
      return sinon.assert.match(response.body.message, 'Cannot log out while available');
    });
    it('should allow logout if vehicle not associated and unavailable', async () => {
      const driverWithVehicle = fleetDrivers[1];

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(!!status.vehicle, false);

      const response = await driverEndpoint(
        '/v1/logout', 'post',
        driverWithVehicle.driverToken, app, request, domain,
        { deviceToken: driverWithVehicle.driverToken },
        200
      );

      return sinon.assert.match(response.body.message, 'You\'ve been successfully logged out.');
    });
  });
  describe('Without feature flag enabled', () => {
    before(async () => {
      location = await Locations.createLocation({
        name: 'Fleet location',
        isActive: true,
        fleetEnabled: false,
        serviceArea: keyLoc.serviceArea2
      });

      const driverInfo = {
        currentLocation: {
          coordinates: [keyLoc.l2[1], keyLoc.l2[0]],
          type: 'Point'
        },
        isOnline: true
      };

      const services = [null, null, 'passenger_only'];
      const promises = [];
      for (let i = 0; i < 3; i += 1) {
        promises.push(createDriverLogin(
          {
            ...driverInfo,
            email: `driver_no_fleet_${i + 1}@mail.com`,
            isADA: false,
            vehicle: services[i] ? vehicle : null,
            locations: i === 0 ? [] : [location._id],
            isAvailable: false
          },
          app, request, domain, io.connect(`http://localhost:${port}`, ioOptions),
          { setActiveLocation: true, attachSharedVehicle: false }
        ));
      }
      noFleetDrivers = await Promise.all(promises);

      await Drivers.syncIndexes();
      await Locations.syncIndexes();
    });

    beforeEach(async () => {
      await Drivers.updateMany(
        {
          _id: {
            $in: noFleetDrivers.map(driver => driver.driver._id)
          }
        },
        { isAvailable: false, isOnline: true }
      );
    });

    it('Should not change to available if logged out', async () => {
      const driverWithoutVehicle = noFleetDrivers[1];

      // With one location associated
      const driverInfo = await Drivers.findOne({ _id: driverWithoutVehicle.driver._id });
      sinon.assert.match(driverInfo.locations.length, 1);

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithoutVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(!!status.vehicleId, false);

      // Become offline
      await Drivers.findOneAndUpdate(
        { _id: driverWithoutVehicle.driver._id },
        { $set: { isOnline: false, isAvailable: true } }
      );
      const offlineDriver = await Drivers.findOne({ _id: driverWithoutVehicle.driver._id });
      sinon.assert.match(offlineDriver.isOnline, false);
      sinon.assert.match(offlineDriver.isAvailable, true);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverWithoutVehicle.driverToken, app, request, domain, payload, 403
      );

      const updatedDriverInfo = await Drivers.findOne({ _id: driverWithoutVehicle.driver._id });
      sinon.assert.match(updatedDriverInfo.isOnline, false);
      sinon.assert.match(updatedDriverInfo.isAvailable, true);
      return sinon.assert.match(
        statusChange.message,
        'Unable to update availability. Your session has expired. Please log out and then log back in.'
      );
    });

    it('Should not change state for driver with no active location', async () => {
      const driverWithoutLocations = noFleetDrivers[0];

      // No active location
      const driverInfo = await Drivers.findOne({ _id: driverWithoutLocations.driver._id });
      sinon.assert.match(driverInfo.activeLocation, null);

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithoutLocations.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(status.vehicle, null);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverWithoutLocations.driverToken, app, request, domain, payload, 400
      );
      return sinon.assert.match(statusChange.message, 'Unable to update your availability because you have not set location');
    });
    it('Should change state for driver without vehicle', async () => {
      const driverWithoutVehicle = noFleetDrivers[1];

      // With one location associated
      const driverInfo = await Drivers.findOne({ _id: driverWithoutVehicle.driver._id });
      sinon.assert.match(driverInfo.locations.length, 1);

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithoutVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(!!status.vehicleId, false);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverWithoutVehicle.driverToken, app, request, domain, payload
      );
      sinon.assert.match(statusChange.isAvailable, true);

      const updatedDriverInfo = await Drivers.findOne({ _id: driverWithoutVehicle.driver._id });
      return sinon.assert.match(updatedDriverInfo.isAvailable, true);
    });
    it('Should change state for driver with vehicle', async () => {
      const driverWithVehicle = noFleetDrivers[2];

      // With one location associated
      const driverInfo = await Drivers.findOne({ _id: driverWithVehicle.driver._id }).populate('vehicle.service.id');
      sinon.assert.match(driverInfo.locations.length, 1);
      sinon.assert.match(driverInfo.vehicle.service.id.key, 'passenger_only');
      sinon.assert.match(Object.keys(driverInfo.vehicle).includes('_id'), false);

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(!!status.vehicle, true);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await driverEndpoint(
        '/v1/driver/status/', 'post', driverWithVehicle.driverToken, app, request, domain, payload
      );
      sinon.assert.match(statusChange.isAvailable, true);

      const updatedDriverInfo = await Drivers.findOne({ _id: driverWithVehicle.driver._id });
      return sinon.assert.match(updatedDriverInfo.isAvailable, true);
    });
    it('should not allow logout while vehicle attached', async () => {
      const driverWithVehicle = noFleetDrivers[2];

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(!!status.vehicle, true);

      const response = await driverEndpoint(
        '/v1/logout', 'post',
        driverWithVehicle.driverToken, app, request, domain,
        { deviceToken: driverWithVehicle.driverToken },
        400
      );

      return sinon.assert.match(response.body.message, 'Cannot log out with a vehicle attached');
    });
    it('should not allow logout while available', async () => {
      const driverWithoutVehicle = noFleetDrivers[1];

      // Force available
      await Drivers.updateOne({ _id: driverWithoutVehicle.driver._id }, { isAvailable: true });

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithoutVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, true);
      sinon.assert.match(!!status.vehicle, false);

      const response = await driverEndpoint(
        '/v1/logout', 'post',
        driverWithoutVehicle.driverToken, app, request, domain,
        { deviceToken: driverWithoutVehicle.driverToken },
        400
      );

      // Reset availability
      await Drivers.updateOne({ _id: driverWithoutVehicle.driver._id }, { isAvailable: false });

      return sinon.assert.match(response.body.message, 'Cannot log out while available');
    });
    it('should allow logout if vehicle not associated and unavailable', async () => {
      const driverWithoutVehicle = noFleetDrivers[1];

      // Get status
      const { body: status } = await driverEndpoint(
        '/v1/driver/status/', 'get', driverWithoutVehicle.driverToken, app, request, domain
      );
      sinon.assert.match(status.isAvailable, false);
      sinon.assert.match(!!status.vehicle, false);

      const response = await driverEndpoint(
        '/v1/logout', 'post',
        driverWithoutVehicle.driverToken, app, request, domain,
        { deviceToken: driverWithoutVehicle.driverToken },
        200
      );

      return sinon.assert.match(response.body.message, 'You\'ve been successfully logged out.');
    });
  });
});
