import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import { expect } from 'chai';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Locations,
  Drivers,
  MatchingRules
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import {
  createDriverLogin, driverEndpoint, setLocation
} from '../utils/driver';
import { createGEMVehicle } from '../utils/vehicle';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let locationServiceArea;
let location;
let driverSocket;
let driver;
let vehicle;
let drivers;


describe('Drivers', () => {
  before(async () => {
    await emptyAllCollections();

    locationServiceArea = [
      { longitude: -73.978573, latitude: 40.721239 },
      { longitude: -73.882936, latitude: 40.698337 },
      { longitude: -73.918642, latitude: 40.629585 },
      { longitude: -73.978573, latitude: 40.660845 },
      { longitude: -73.978573, latitude: 40.721239 }
    ];
    location = await Locations.createLocation({
      name: 'Location One',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      fleetEnabled: true,
      serviceArea: locationServiceArea
    });

    await MatchingRules.create({
      key: 'shared',
      title: 'Shared',
      description: 'Designated for all requests across all zones'
    });

    vehicle = await createGEMVehicle(false, location._id, { driverDump: true, licensePlate: 'ABC-123' });

    const setActiveLocation = false;
    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    driver = await createDriverLogin({
      locations: [location._id],
      vehicle,
      currentLocation: {
        coordinates: [locationServiceArea[0].latitude, locationServiceArea[0].longitude],
        type: 'Point'
      }
    },
    app, request, domain, driverSocket,
    { setActiveLocation, attachSharedVehicle: false });

    const promises = [];
    for (let i = 0; i < 3; i += 1) {
      promises.push(createDriverLogin(
        {
          email: `driver${i + 1}@mail.com`,
          lastName: `LN${i + 1}`,
          isADA: false,
          vehicle,
          locations: [location._id],
          isAvailable: true,
          currentLocation: {
            coordinates: [
              locationServiceArea[i + 1].latitude,
              locationServiceArea[i + 1].longitude
            ],
            type: 'Point'
          },
          activeLocation: location._id,
          lastActiveLocation: location._id
        },
        app, request, domain, io.connect(`http://localhost:${port}`, ioOptions),
        { setActiveLocation: true, attachSharedVehicle: false }
      ));
    }
    drivers = await Promise.all(promises);
    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Get drivers', () => {
    it('Throws error when getting logged in drivers without having an active location', async () => {
      const response = await driverEndpoint('/v1/drivers/logged-in', 'get', driver.driverToken, app, request, domain, {}, 400);
      sinon.assert.match(response.body.message, 'Active location not available');
    });
    it('Throws error when getting logged out drivers without having an active location', async () => {
      const response = await driverEndpoint('/v1/drivers/logged-out', 'get', driver.driverToken, app, request, domain, {}, 400);
      sinon.assert.match(response.body.message, 'Active location not available');
    });
    it('Gets logged in drivers', async () => {
      const { body: locations } = await driverEndpoint(
        `/v1/locations?latitude=${locationServiceArea[0].latitude}&longitude=${locationServiceArea[0].longitude}`,
        'get', driver.driverToken, app, request, domain
      );

      await setLocation(locations[0].id, driver.driverToken, app, request, domain);
      const response = await driverEndpoint('/v1/drivers/logged-in', 'get', driver.driverToken, app, request, domain);
      sinon.assert.match(response.body.length, 4);
      sinon.assert.match(response.body[0].vehicle.passengerCapacity, vehicle.passengerCapacity);
      sinon.assert.match(response.body[0].vehicle.serviceKey, 'passenger_only');
      sinon.assert.match(response.body[0].vehicle.serviceTitle, 'Passenger Only');
      sinon.assert.match(response.body[0].isOnline, true);
      expect(response.body[0].vehicle).to.have.all.keys([
        'id', 'name', 'publicId',
        'isADAOnly', 'adaCapacity',
        'passengerCapacity', 'type',
        'serviceKey', 'serviceTitle',
        'matchingRule', 'zones', 'licensePlate'
      ]);
      expect(response.body[0].vehicle.licensePlate).to.equal('ABC-123');
    });
    it('Gets logged out drivers', async () => {
      const { body } = await driverEndpoint('/v1/drivers/logged-out', 'get', driver.driverToken, app, request, domain);
      sinon.assert.match(body.total, 0);

      await Drivers.updateDriver(drivers[1].driver.id, { vehicle: null, isAvailable: false });
      await driverEndpoint('/v1/logout', 'post', drivers[1].driverToken, app, request, domain, { deviceToken: '1212' });
      await Drivers.updateDriver(drivers[0].driver.id, { vehicle: null, isAvailable: false });
      await driverEndpoint('/v1/logout', 'post', drivers[0].driverToken, app, request, domain, { deviceToken: '1313' });
      const response = await driverEndpoint('/v1/drivers/logged-out', 'get', driver.driverToken, app, request, domain);
      sinon.assert.match(response.body.total, 2);
      sinon.assert.match(response.body.items[0].lastName, drivers[0].driver.lastName);
      sinon.assert.match(response.body.items[0].vehicle, null);
    });
  });
});
