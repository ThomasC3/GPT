import sinon from 'sinon';
import mongoose from 'mongoose';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Riders, Rides, Drivers, Locations,
  Settings, Vehicles, Questions,
  InspectionForms
} from '../../models';
import { emptyAllCollections, emptyCollection } from '../utils/helper';
import {
  adminEndpoint,
  createAdminLogin,
  AdminRoles
} from '../utils/admin';
import { createGEMVehicle } from '../utils/vehicle';
import { createDriverLogin, driverEndpoint } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;

let driver1;
let driver1Socket;

let developerToken;

let rider1;
let rider1Socket;

let location1;

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  d1b: [40.198857, -8.40275, 'Via lusitania'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds']
};

let defaultDriverInfo;
let defaultRiderInfo;
let defaultLocationInfo;
let response;
let events;

const locationInfo = {
  isUsingServiceTimes: false,
  isActive: true,
  poolingEnabled: true,
  timezone: 'Europe/Lisbon',
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
};

describe('Driver page info', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    defaultLocationInfo = { name: 'Location', ...locationInfo };
    location1 = await Locations.createLocation(defaultLocationInfo);

    defaultDriverInfo = {
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      displayName: 'Driver DN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isAvailable: false,
      isTemporaryPassword: false,
      locations: [location1._id],
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      employeeId: 'D0001'
    };
    defaultRiderInfo = {
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      location: location1._id,
      dob: '2000-12-11'
    };

    const question = await Questions.createQuestion({
      questionString: 'What is the current battery level?',
      questionKey: 'battery',
      responseType: 'number'
    });
    const checkInForm = await InspectionForms.createInspectionForm({
      name: 'GEM check-in form',
      inspectionType: 'check-in',
      questionList: [question._id]
    });
    const vehicle = await createGEMVehicle(false, location1._id, { checkInForm, driverDump: true });

    const { driverToken: driver1Token } = await createDriverLogin(
      { ...defaultDriverInfo, vehicle }, app, request, domain, driver1Socket
    );

    const payload = {
      inspectionForm: {
        id: checkInForm._id,
        responses: [
          {
            questionId: question._id,
            response: '5'
          }
        ]
      }
    };
    await driverEndpoint(
      '/v1/vehicle/check-in', 'post', driver1Token, app, request, domain, payload
    );

    driver1 = await new Drivers({ ...defaultDriverInfo, vehicle, email: 'some10@mail.com' }).save();
    rider1 = await new Riders({ email: 'rider1@mail.com', password: 'Password1', ...defaultRiderInfo }).save();

    const admin = await createAdminLogin();
    developerToken = admin.adminToken;

    const promises = [];

    const defaultRide = {
      location: location1._id,
      passengers: 1,
      isADA: false,
      rider: rider1._id,
      driver: driver1._id,
      status: 700,
      vehicle: driver1.vehicle
    };

    for (let i = 0; i < 3; i += 1) {
      promises.push(Rides.create({
        ...defaultRide,
        createdTimestamp: new Date(2019, 1, 4, 0, 0),
        ratingForDriver: 3,
        ratingForRider: 2
      }));
    }

    for (let i = 0; i < 7; i += 1) {
      promises.push(Rides.create({
        ...defaultRide,
        createdTimestamp: new Date(2019, 1, 4, 0, 0),
        ratingForDriver: 3
      }));
    }

    for (let i = 0; i < 10; i += 1) {
      promises.push(Rides.create({
        ...defaultRide,
        createdTimestamp: new Date(2018, 1, 1, 0, 0),
        ratingForDriver: 5
      }));
    }
    await Promise.all(promises);
  });

  beforeEach(async () => {
    sandbox.restore();

    driver1Socket.removeAllListeners();
    rider1Socket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });
  describe('Driver Page', () => {
    beforeEach(async () => {
      response = await adminEndpoint(`/v1/drivers/${driver1._id}`, 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get driver page!');
      }
      events = await adminEndpoint(
        '/v1/events', 'get', developerToken, app, request, domain, { sourceId: driver1._id, sourceType: 'Driver' }
      );
      if (events.status === 404 || events.status === 500 || events.status === 403) {
        throw new Error('Could not get events!');
      }
    });
    it('Driver rating', async () => {
      const result = [
        response.body.firstName,
        response.body.lastName,
        response.body.displayName,
        response.body.allTimeRating,
        response.body.last10Rating,
        response.body.allTimeGivenRating,
        response.body.employeeId
      ];
      return sinon.assert.match(result, ['Driver FN', 'Driver LN', 'Driver DN', 4, 3, 2, 'D0001']);
    });
    it('Driver vehicle', async () => {
      const { body: { vehicle: driverVehicle } } = response;
      const vehicle = await Vehicles.findOne({});

      sinon.assert.match(driverVehicle.vehicleName, vehicle.name);
      return sinon.assert.match(`${driverVehicle.vehicleId}`, `${vehicle._id}`);
    });
    it('Driver events', async () => {
      const { body: { items: eventsList } } = events;
      sinon.assert.match(eventsList.length, 3);

      sinon.assert.match(eventsList[0].source.type, 'Driver');
      sinon.assert.match(eventsList[0].target.type, 'Vehicle');
      sinon.assert.match(eventsList[0].eventType, 'CHECK-IN');
      sinon.assert.match(eventsList[0].eventData, { responses: { battery: 5 } });

      sinon.assert.match(eventsList[1].source.type, 'Driver');
      sinon.assert.match(eventsList[1].target.type, 'Driver');
      sinon.assert.match(eventsList[1].eventType, 'LOCATION SET');
      sinon.assert.match(eventsList[1].eventData, { location: `${location1._id}` });

      sinon.assert.match(eventsList[2].source.type, 'Driver');
      sinon.assert.match(eventsList[2].target.type, 'Driver');
      return sinon.assert.match(eventsList[2].eventType, 'LOGIN');
    });
    it('Driver employee id', async () => sinon.assert.match(response.body.employeeId, 'D0001'));
  });
  describe('Drivers active location', () => {
    let location2;
    let location3;
    let driverWithoutActiveLocation;
    let driverWithActiveLocation;
    before(async () => {
      location2 = await Locations.createLocation({ name: 'Location 2', ...locationInfo });
      location3 = await Locations.createLocation({ name: 'Location 3', ...locationInfo });
      driverWithActiveLocation = await Drivers.createDriver(
        {
          ...defaultDriverInfo,
          email: 'some3@mail.com',
          locations: [location2._id, location3._id],
          activeLocation: location2._id,
          lastActiveLocation: location2._id
        }
      );
      driverWithoutActiveLocation = await Drivers.createDriver(
        {
          ...defaultDriverInfo,
          email: 'some4@mail.com',
          isOnline: false,
          locations: [location2._id, location3._id],
          currentLocation: null
        }
      );
    });
    beforeEach(async () => {
      await Drivers.updateDriver(driverWithActiveLocation._id, { isOnline: true });
    });
    it('Show active drivers in only active location', async () => {
      response = await adminEndpoint(`/v1/drivers?locations[]=${location2._id}`, 'get', developerToken, app, request, domain);
      sinon.assert.match(response.body.items.length, 2);
      sinon.assert.match(response.body.items[0].employeeId, 'D0001');

      response = await adminEndpoint(`/v1/drivers?locations[]=${location3._id}`, 'get', developerToken, app, request, domain);
      sinon.assert.match(response.body.items.length, 1);
      sinon.assert.match(response.body.items[0].email, driverWithoutActiveLocation.email);
      sinon.assert.match(response.body.items[0].employeeId, 'D0001');
    });
    it('does not remove driver active location during driver update when location is still attached', async () => {
      let foundDriver = await Drivers.findById(driverWithActiveLocation._id);
      sinon.assert.match(foundDriver.activeLocation, location2._id);

      response = await adminEndpoint(`/v1/drivers/${driverWithActiveLocation._id}`, 'put', developerToken, app, request, domain, { locations: [location2._id] });
      foundDriver = await Drivers.findById(driverWithActiveLocation._id);
      sinon.assert.match(!!(response.body.activeLocation), true);
      sinon.assert.match(!!(foundDriver.activeLocation), true);
    });
    it('removes active location when location is detached from driver', async () => {
      let foundDriver = await Drivers.updateDriver(
        driverWithActiveLocation._id, { isOnline: false }
      );
      sinon.assert.match(foundDriver.activeLocation, location2._id);

      response = await adminEndpoint(`/v1/drivers/${driverWithActiveLocation._id}`, 'put', developerToken, app, request, domain, { locations: [location3._id] });
      foundDriver = await Drivers.findById(driverWithActiveLocation._id);
      sinon.assert.match(response.body.activeLocation, null);
      sinon.assert.match(foundDriver.activeLocation, null);
    });
  });
  describe('Driver display name', () => {
    let driver3;
    it('Creates default driver display name during driver creation', async () => {
      driver3 = await adminEndpoint(
        '/v1/drivers', 'post', developerToken, app, request, domain, {
          firstName: 'Driver',
          lastName: '3',
          email: 'driver3@mail.com',
          password: 'secret99',
          gender: 'Male',
          dob: '2022-05-16',
          phone: '0000000000'
        },
      );
      sinon.assert.match(driver3.body.firstName, 'Driver');
      sinon.assert.match(driver3.body.lastName, '3');
      sinon.assert.match(driver3.body.displayName, 'Driver 3');
    });
    it('200 OK with displayName update', async () => {
      sinon.assert.match(driver3.body.displayName, 'Driver 3');
      const updatedDriver = await adminEndpoint(
        `/v1/drivers/${driver3.body.id}`, 'put', developerToken, app, request, domain, { displayName: 'New DN' }
      );

      sinon.assert.match(updatedDriver.body.displayName, 'New DN');
    });
  });

  describe('Driver update', () => {
    it('200 OK with employee id', async () => {
      response = await adminEndpoint(
        `/v1/drivers/${driver1._id}`,
        'put', developerToken, app, request, domain,
        { employeeId: 'D0002' }
      );

      const { employeeId } = response.body;

      sinon.assert.match(response.status, 200);
      return sinon.assert.match(employeeId, 'D0002');
    });
  });

  describe('Driver list', () => {
    it('Employee id in driver list', async () => {
      response = await adminEndpoint('/v1/drivers?email=some%40mail.com', 'get', developerToken, app, request, domain);

      const { employeeId } = response.body.items[0];

      sinon.assert.match(response.status, 200);
      return sinon.assert.match(employeeId, 'D0001');
    });
  });

  describe('Driver deletion', () => {
    let driverWithRides;
    let driverToDelete;

    before(async () => {
      driverWithRides = await Drivers.createDriver({
        ...defaultDriverInfo,
        email: 'driver_with_rides@mail.com',
        locations: [location1._id],
        activeLocation: location1._id
      });

      await Drivers.updateOne(
        { _id: driverWithRides._id },
        { $set: { driverRideList: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()] } }
      );

      driverToDelete = await Drivers.createDriver({
        ...defaultDriverInfo,
        email: 'driver_to_delete@mail.com',
        currentLocation: null
      });
    });

    it('Should not delete driver with rides attached', async () => {
      response = await adminEndpoint(
        `/v1/drivers/${driverWithRides._id}`,
        'delete', developerToken, app, request, domain, {},
        400
      );

      sinon.assert.match(response.status, 400);
      sinon.assert.match(response.body.message, 'Unable to delete driver because driver has ongoing rides');

      const driverAfterDeleteAttempt = await Drivers.findById(driverWithRides._id);
      sinon.assert.match(driverAfterDeleteAttempt.isDeleted, false);
    });

    it('Should delete driver successfully', async () => {
      const deleteResponse = await adminEndpoint(
        `/v1/drivers/${driverToDelete._id}`, 'delete', developerToken, app, request, domain
      );

      sinon.assert.match(`${deleteResponse.body.id}`, `${driverToDelete._id}`);
      sinon.assert.match(deleteResponse.body.isDeleted, true);

      const deletedDriver = await Drivers.findOne({ _id: driverToDelete._id });
      sinon.assert.match(deletedDriver.isDeleted, true);
    });
  });

  describe('Driver list with location permissions', () => {
    let locationManagerToken;
    let location4;
    let location5;
    let driverInLocation4;
    let driverInLocation5;

    before(async () => {
      location4 = await Locations.createLocation({ name: 'Location 4', ...locationInfo });
      location5 = await Locations.createLocation({ name: 'Location 5', ...locationInfo });
      await emptyCollection('Drivers');

      driverInLocation4 = await Drivers.createDriver({
        ...defaultDriverInfo,
        email: 'driver4@mail.com',
        locations: [location4._id],
        activeLocation: location4._id
      });

      driverInLocation5 = await Drivers.createDriver({
        ...defaultDriverInfo,
        email: 'driver5@mail.com',
        locations: [location5._id],
        activeLocation: location5._id
      });

      const locationManager = await createAdminLogin({
        role: AdminRoles.LOCATION_MANAGER,
        locations: [location4._id.toString()]
      });
      locationManagerToken = locationManager.adminToken;
    });

    it('Location manager can only see drivers in their assigned locations', async () => {
      response = await adminEndpoint('/v1/drivers', 'get', locationManagerToken, app, request, domain);

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 1);
      sinon.assert.match(response.body.items[0].email, driverInLocation4.email);
    });

    it('Location manager cannot see drivers in unassigned locations and receives empty list', async () => {
      response = await adminEndpoint(`/v1/drivers?locations[]=${location5._id}`, 'get', locationManagerToken, app, request, domain);

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 0);
    });

    it('Developer can see drivers in all locations', async () => {
      response = await adminEndpoint('/v1/drivers', 'get', developerToken, app, request, domain);

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 2);
    });

    it('Location manager can filter drivers within their assigned locations', async () => {
      response = await adminEndpoint(`/v1/drivers?locations[]=${location4._id}`, 'get', locationManagerToken, app, request, domain);

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 1);
      sinon.assert.match(response.body.items[0].email, driverInLocation4.email);
    });

    it('Developer can filter drivers by any location', async () => {
      response = await adminEndpoint(`/v1/drivers?locations[]=${location5._id}`, 'get', developerToken, app, request, domain);

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 1);
      sinon.assert.match(response.body.items[0].email, driverInLocation5.email);
    });
  });
});
