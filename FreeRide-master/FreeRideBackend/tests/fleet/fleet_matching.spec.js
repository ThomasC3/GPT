import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import driverSearcher from '../../services/driverSearch';
import { createRequest, createRiderLogin } from '../utils/rider';
import { createDriverLogin } from '../utils/driver';
import { createGEMVehicle } from '../utils/vehicle';
import {
  Riders, Locations, Requests, Rides, Routes, Drivers, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;
const drivers = [];
const riders = [];
let location;

const keyLoc = {
  p1: [40.6810937, -73.9078617, 'Address'],
  d1: [40.6851291, -73.9148140, 'Address']
};

describe('Service matching non-pooling', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();

    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: true,
      isUsingServiceTimes: false,
      isActive: true,
      fleetEnabled: true,
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ]
    });

    const driverInfo = {
      // Leroy Merlin
      currentLocation: {
        coordinates: [keyLoc.p1[1], keyLoc.p1[0]],
        type: 'Point'
      },
      isOnline: true,
      isAvailable: true,
      locations: [location._id]
    };

    const services = ['ada_only', 'mixed_service', 'passenger_only'];

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      drivers.push(await createDriverLogin(
        {
          // eslint-disable-next-line no-await-in-loop
          ...driverInfo, email: `driver${i + 1}@mail.com`, isADA: i < 2, vehicle: await createGEMVehicle(i < 2, location._id, { driverDump: true })
        },
        app, request, domain, io.connect(`http://localhost:${port}`, ioOptions),
        { setActiveLocation: true, attachSharedVehicle: false }
      ));
      // eslint-disable-next-line no-await-in-loop
      drivers[i].driver = await Drivers.findOneAndUpdate(
        { _id: drivers[i].driver._id },
        { $set: { 'vehicle.service.key': services[i] } },
        { new: true, upsert: false }
      );
      // eslint-disable-next-line no-await-in-loop
      riders.push(await createRiderLogin(
        { location: location._id, email: `rider${i + 1}@mail.com` },
        app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
      ));
    }
  });

  describe('Create 3 non-ADA requests', () => {
    beforeEach(async () => {
      sandbox.restore();
      await Requests.deleteMany();
      await Rides.deleteMany();
      await Routes.deleteMany();

      for (let i = 0; i < 3; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await Drivers.updateOne(
          { _id: drivers[i].driver._id },
          { $set: { driverRideList: [], isAvailable: true } }
        );
        // eslint-disable-next-line no-await-in-loop
        await Riders.updateOne(
          { _id: riders[i].rider._id },
          { $set: { lastCancelTimestamp: null } }
        );
        drivers[i].driverSocket.removeAllListeners();
        riders[i].riderSocket.removeAllListeners();
      }

      await Drivers.syncIndexes();
      await Locations.syncIndexes();
    });

    it('Should route 3 non-ADA requests to mixed_service and passenger_only drivers', async () => {
      const promises = [];
      for (let i = 0; i < 3; i += 1) {
        promises.push(createRequest(
          riders[i].riderToken, keyLoc.p1, keyLoc.d1, location, app, request, domain, false, 1
        ));
      }
      await Promise.all(promises);
      await driverSearcher.search();

      const reqs = await Requests.find({});
      const rides = await Rides.find({});

      sinon.assert.match(reqs.length, 3);
      sinon.assert.match(rides.length, 3);

      const driverIds = rides.map(ride => ride.driver);
      const driverData = await Drivers.find({ _id: { $in: driverIds } });
      const services = Array.from(
        new Set(driverData.map(driver => driver.vehicle.service.key))
      ).sort();

      return sinon.assert.match(services, ['mixed_service', 'passenger_only']);
    });

    it('Should route 2 non-ADA requests to the passenger_only driver', async () => {
      // Remove mixed_service driver
      await Drivers.updateOne({ _id: drivers[1].driver._id }, { $set: { isAvailable: false } });

      const promises = [];
      for (let i = 0; i < 3; i += 1) {
        promises.push(createRequest(
          riders[i].riderToken, keyLoc.p1, keyLoc.d1, location, app, request, domain, false, 1
        ));
      }
      await Promise.all(promises);
      await driverSearcher.search();

      const reqs = await Requests.find({});
      const rides = await Rides.find({});

      sinon.assert.match(reqs.length, 3);
      sinon.assert.match(rides.length, 2);

      const driverIds = rides.map(ride => ride.driver);
      const driverData = await Drivers.find({ _id: { $in: driverIds } });
      const services = Array.from(
        new Set(driverData.map(driver => driver.vehicle.service.key))
      ).sort();

      return sinon.assert.match(services, ['passenger_only']);
    });

    it('Should not route any non-ADA requests to ada_only driver', async () => {
      // Remove mixed_service driver
      await Drivers.updateOne({ _id: drivers[1].driver._id }, { $set: { isAvailable: false } });
      // Remove passenger_only driver
      await Drivers.updateOne({ _id: drivers[2].driver._id }, { $set: { isAvailable: false } });

      const promises = [];
      for (let i = 0; i < 3; i += 1) {
        promises.push(createRequest(
          riders[i].riderToken, keyLoc.p1, keyLoc.d1, location, app, request, domain, false, 1
        ));
      }
      await Promise.all(promises);
      await driverSearcher.search();

      const reqs = await Requests.find({});
      const rides = await Rides.find({});

      sinon.assert.match(reqs.length, 3);
      return sinon.assert.match(rides.length, 0);
    });
  });
  describe('Create 3 ADA requests', () => {
    beforeEach(async () => {
      sandbox.restore();
      await Requests.deleteMany();
      await Rides.deleteMany();
      await Routes.deleteMany();

      for (let i = 0; i < 3; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await Drivers.updateOne(
          { _id: drivers[i].driver._id },
          { $set: { driverRideList: [], isAvailable: true } }
        );
        // eslint-disable-next-line no-await-in-loop
        await Riders.updateOne(
          { _id: riders[i].rider._id },
          { $set: { lastCancelTimestamp: null } }
        );
        drivers[i].driverSocket.removeAllListeners();
        riders[i].riderSocket.removeAllListeners();
      }

      await Drivers.syncIndexes();
      await Locations.syncIndexes();
    });

    it('Should route 3 non-ADA requests to mixed_service and ada_only drivers', async () => {
      const promises = [];
      for (let i = 0; i < 3; i += 1) {
        promises.push(createRequest(
          riders[i].riderToken, keyLoc.p1, keyLoc.d1, location, app, request, domain, true, 3
        ));
      }
      await Promise.all(promises);
      await driverSearcher.search();

      const reqs = await Requests.find({});
      const rides = await Rides.find({});

      sinon.assert.match(reqs.length, 3);
      sinon.assert.match(rides.length, 3);

      const driverIds = rides.map(ride => ride.driver);
      const driverData = await Drivers.find({ _id: { $in: driverIds } });
      const services = Array.from(
        new Set(driverData.map(driver => driver.vehicle.service.key))
      ).sort();

      return sinon.assert.match(services, ['ada_only', 'mixed_service']);
    });

    it('Should route 2 non-ADA requests to the ada_only driver', async () => {
      // Remove mixed_service driver
      await Drivers.updateOne({ _id: drivers[1].driver._id }, { $set: { isAvailable: false } });

      const promises = [];
      for (let i = 0; i < 3; i += 1) {
        promises.push(createRequest(
          riders[i].riderToken, keyLoc.p1, keyLoc.d1, location, app, request, domain, true, 3
        ));
      }
      await Promise.all(promises);
      await driverSearcher.search();

      const reqs = await Requests.find({});
      const rides = await Rides.find({});

      sinon.assert.match(reqs.length, 3);
      sinon.assert.match(rides.length, 2);

      const driverIds = rides.map(ride => ride.driver);
      const driverData = await Drivers.find({ _id: { $in: driverIds } });
      const services = Array.from(
        new Set(driverData.map(driver => driver.vehicle.service.key))
      ).sort();

      return sinon.assert.match(services, ['ada_only']);
    });

    it('Should not route any non-ADA requests to ada_only driver', async () => {
      // Remove ada_only driver
      await Drivers.updateOne({ _id: drivers[0].driver._id }, { $set: { isAvailable: false } });
      // Remove mixed_service driver
      await Drivers.updateOne({ _id: drivers[1].driver._id }, { $set: { isAvailable: false } });

      const promises = [];
      for (let i = 0; i < 3; i += 1) {
        promises.push(createRequest(
          riders[i].riderToken, keyLoc.p1, keyLoc.d1, location, app, request, domain, true, 3
        ));
      }
      await Promise.all(promises);
      await driverSearcher.search();

      const reqs = await Requests.find({});
      const rides = await Rides.find({});

      sinon.assert.match(reqs.length, 3);
      return sinon.assert.match(rides.length, 0);
    });
  });
});
