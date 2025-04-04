import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import { createDriverLogin } from '../utils/driver';
import { createAdminLogin, adminEndpoint } from '../utils/admin';
import { createGEMVehicle } from '../utils/vehicle';
import {
  Locations, Drivers, Settings, Events
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
let admin;

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

describe('Admin driver page availability status change', () => {
  before(async () => {
    sandbox = sinon.createSandbox();
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    admin = await createAdminLogin();
  });

  after(async () => {
    sandbox.restore();
  });

  describe('An Admin with feature flag enabled', () => {
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

      const vehicle = await createGEMVehicle(false, fleetLocation._id, { driverDump: true });

      const services = [null, null, 'passenger_only'];
      const promises = [];
      for (let i = 0; i < 3; i += 1) {
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
          { setActiveLocation: false, attachSharedVehicle: false }
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
        { isAvailable: false, isDeleted: false, isOnline: true }
      );
    });

    it('Should not change state for logged out driver', async () => {
      const driverWithoutLocations = fleetDrivers[0];

      await Drivers.updateOne({ _id: driverWithoutLocations.driver._id }, { isOnline: false });

      // Get driver info
      const { body: driverInfo } = await adminEndpoint(
        `/v1/drivers/${driverWithoutLocations.driver._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(driverInfo.locations.length, 0);
      sinon.assert.match(driverInfo.isAvailable, false);
      sinon.assert.match(driverInfo.isOnline, false);
      sinon.assert.match(driverInfo.vehicle, null);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await adminEndpoint(
        `/v1/drivers/${driverWithoutLocations.driver._id}`,
        'put', admin.adminToken, app, request, domain, payload, 404
      );
      return sinon.assert.match(statusChange.message, 'Unable to update availability because driver is logged out');
    });

    it('Should not change state for driver without vehicle', async () => {
      const driverWithoutVehicle = fleetDrivers[1];

      // Get driver info
      const { body: driverInfo } = await adminEndpoint(
        `/v1/drivers/${driverWithoutVehicle.driver._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(driverInfo.locations.length, 1);
      sinon.assert.match(driverInfo.isAvailable, false);
      sinon.assert.match(driverInfo.vehicle, null);

      // Update status
      let payload = { isOnline: false };
      await adminEndpoint(
        `/v1/drivers/${driverWithoutVehicle.driver._id}`,
        'put', admin.adminToken, app, request, domain, payload,
        400
      );

      // Update status
      payload = { isAvailable: true };
      const { body: statusChange } = await adminEndpoint(
        `/v1/drivers/${driverWithoutVehicle.driver._id}`,
        'put', admin.adminToken, app, request, domain, payload
      );
      return sinon.assert.match(statusChange.message, 'Unable to update availability because no vehicle is attached');
    });
    it('Should change state for driver with vehicle', async () => {
      const driverWithVehicle = fleetDrivers[2];

      // Get driver info
      const { body: driverInfo } = await adminEndpoint(
        `/v1/drivers/${driverWithVehicle.driver._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(driverInfo.locations.length, 1);
      sinon.assert.match(driverInfo.isAvailable, false);
      sinon.assert.match(!!driverInfo.vehicle, true);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await adminEndpoint(
        `/v1/drivers/${driverWithVehicle.driver._id}`,
        'put', admin.adminToken, app, request, domain, payload
      );
      sinon.assert.match(statusChange.isAvailable, true);

      const updatedDriverInfo = await Drivers.findOne({ _id: driverWithVehicle.driver._id });
      return sinon.assert.match(updatedDriverInfo.isAvailable, true);
    });
    it('Should not be able to log out driver', async () => {
      const driverWithVehicle = fleetDrivers[2];

      // Get driver info
      const { body: driverInfo } = await adminEndpoint(
        `/v1/drivers/${driverWithVehicle.driver._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(driverInfo.isDeleted, false);
      sinon.assert.match(driverInfo.isAvailable, false);
      sinon.assert.match(!!driverInfo.vehicle, true);

      // Update status
      const payload = { isOnline: false };
      const { body: statusChange } = await adminEndpoint(
        `/v1/drivers/${driverWithVehicle.driver._id}`,
        'put', admin.adminToken, app, request, domain, payload,
        400
      );

      return sinon.assert.match(statusChange.isOnline, driverInfo.isOnline);
    });
    it('Should not delete driver with vehicle', async () => {
      const driverWithVehicle = fleetDrivers[2];

      // Get driver info
      const { body: driverInfo } = await adminEndpoint(
        `/v1/drivers/${driverWithVehicle.driver._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(driverInfo.isDeleted, false);
      sinon.assert.match(driverInfo.isAvailable, false);
      sinon.assert.match(!!driverInfo.vehicle, true);

      const { body: statusChange } = await adminEndpoint(
        `/v1/drivers/${driverWithVehicle.driver._id}`,
        'delete', admin.adminToken, app, request, domain, {},
        400
      );

      return sinon.assert.match(statusChange.message, 'Unable to delete driver because vehicle is attached');
    });
  });
  describe('An Admin without feature flag enabled', () => {
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

      const vehicle = await createGEMVehicle(false, location._id, { driverDump: true });

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
          { setActiveLocation: false, attachSharedVehicle: false }
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
        { isAvailable: false, isDeleted: false, isOnline: true }
      );
    });

    it('Should not change state for logged out driver', async () => {
      const driverWithoutLocations = noFleetDrivers[0];

      await Drivers.updateOne({ _id: driverWithoutLocations.driver._id }, { isOnline: false });

      // Get driver info
      const { body: driverInfo } = await adminEndpoint(
        `/v1/drivers/${driverWithoutLocations.driver._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(driverInfo.locations.length, 0);
      sinon.assert.match(driverInfo.isAvailable, false);
      sinon.assert.match(driverInfo.isOnline, false);
      sinon.assert.match(driverInfo.vehicle, null);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await adminEndpoint(
        `/v1/drivers/${driverWithoutLocations.driver._id}`,
        'put', admin.adminToken, app, request, domain, payload, 404
      );
      return sinon.assert.match(statusChange.message, 'Unable to update availability because driver is logged out');
    });
    it('Should change state for driver without vehicle', async () => {
      const driverWithoutVehicle = noFleetDrivers[1];

      // Get driver info
      const { body: driverInfo } = await adminEndpoint(
        `/v1/drivers/${driverWithoutVehicle.driver._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(driverInfo.locations.length, 1);
      sinon.assert.match(driverInfo.isAvailable, false);
      sinon.assert.match(driverInfo.vehicle, null);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await adminEndpoint(
        `/v1/drivers/${driverWithoutVehicle.driver._id}`,
        'put', admin.adminToken, app, request, domain, payload
      );
      sinon.assert.match(statusChange.isAvailable, true);

      const updatedDriverInfo = await Drivers.findOne({ _id: driverWithoutVehicle.driver._id });
      return sinon.assert.match(updatedDriverInfo.isAvailable, true);
    });
    it('Should change state for driver with vehicle', async () => {
      const driverWithVehicle = noFleetDrivers[2];

      // Get driver info
      const { body: driverInfo } = await adminEndpoint(
        `/v1/drivers/${driverWithVehicle.driver._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(driverInfo.locations.length, 1);
      sinon.assert.match(driverInfo.isAvailable, false);
      sinon.assert.match(!!driverInfo.vehicle, true);

      // Update status
      const payload = { isAvailable: true };
      const { body: statusChange } = await adminEndpoint(
        `/v1/drivers/${driverWithVehicle.driver._id}`,
        'put', admin.adminToken, app, request, domain, payload
      );
      sinon.assert.match(statusChange.isAvailable, true);

      const updatedDriverInfo = await Drivers.findOne({ _id: driverWithVehicle.driver._id });
      return sinon.assert.match(updatedDriverInfo.isAvailable, true);
    });
    it('Should delete driver without vehicle and trigger events', async () => {
      const driverWithoutVehicle = noFleetDrivers[1];

      // Update status
      const payload = { isAvailable: true };
      let statusChange;
      ({ body: statusChange } = await adminEndpoint(
        `/v1/drivers/${driverWithoutVehicle.driver._id}`,
        'put', admin.adminToken, app, request, domain, payload
      ));
      sinon.assert.match(statusChange.isAvailable, true);

      // Get driver info
      const { body: driverInfo } = await adminEndpoint(
        `/v1/drivers/${driverWithoutVehicle.driver._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(driverInfo.isAvailable, true);
      sinon.assert.match(driverInfo.vehicle, null);

      await Events.deleteMany();

      // Update status
      ({ body: statusChange } = await adminEndpoint(
        `/v1/drivers/${driverWithoutVehicle.driver._id}`,
        'put', admin.adminToken, app, request, domain, { isOnline: false, isAvailable: false }
      ));
      sinon.assert.match(statusChange.isAvailable, false);

      // Delete Driver
      await adminEndpoint(
        `/v1/drivers/${driverWithoutVehicle.driver._id}`,
        'delete', admin.adminToken, app, request, domain
      );

      const updatedDriverInfo = await Drivers.findOne({ _id: driverWithoutVehicle.driver._id });
      sinon.assert.match(updatedDriverInfo.isDeleted, true);
      sinon.assert.match(updatedDriverInfo.activeLocation, null);

      // Events
      const events = await Events.find({ sourceId: admin.id });
      const eventTypes = events.map(event => event.eventType);

      sinon.assert.match(eventTypes.includes('LOGOUT'), true);
      sinon.assert.match(eventTypes.includes('UNAVAILABLE'), true);
      sinon.assert.match(eventTypes.includes('DELETE'), true);
    });
  });
});
