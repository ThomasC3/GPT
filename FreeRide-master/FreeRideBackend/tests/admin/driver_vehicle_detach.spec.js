import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Rides, Drivers, Locations,
  Settings, Vehicles, Questions,
  InspectionForms,
  Services,
  Events
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import {
  adminEndpoint,
  createAdminLogin
} from '../utils/admin';
import { createGEMVehicle } from '../utils/vehicle';
import { createDriverLogin, driverEndpoint } from '../utils/driver';
import driverSearcher from '../../services/driverSearch';
import { createRequest, createRiderLogin } from '../utils/rider';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;

let driver;
let driverSocket;

let rider;
let riderSocket;

let location;

let adminToken;

let driverId;

let vehicle;

let checkOutForm;
let question;
let admin;

const keyLoc = {
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds']
};

let defaultDriverInfo;
let defaultLocationInfo;

const locationInfo = {
  isUsingServiceTimes: false,
  isActive: true,
  timezone: 'Europe/Lisbon',
  fleetEnabled: true,
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

describe('Admin Detach Vehicle from Driver', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    defaultLocationInfo = { name: 'Location', ...locationInfo };

    location = await Locations.createLocation(defaultLocationInfo);

    defaultDriverInfo = {
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isAvailable: false,
      isTemporaryPassword: false,
      locations: [location._id],
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      }
    };

    question = await Questions.createQuestion({
      questionString: 'What is the current battery level?',
      questionKey: 'battery',
      responseType: 'number'
    });

    checkOutForm = await InspectionForms.createInspectionForm({
      name: 'GEM check-out form',
      inspectionType: 'check-out',
      questionList: [question._id]
    });
    await Services.create({
      key: 'passenger_only',
      title: 'Passenger Only',
      desc: 'Passenger Cap only'
    });
    vehicle = await createGEMVehicle(false, location._id, { checkOutForm });

    driver = await createDriverLogin(
      { ...defaultDriverInfo }, app, request, domain, driverSocket, { attachSharedVehicle: false }
    );
    driverId = driver.driver._id;
    rider = await createRiderLogin(
      { location: location._id },
      app, request, domain, riderSocket
    );

    ({ adminToken, ...admin } = await createAdminLogin());
  });
  beforeEach(async () => {
    sandbox.restore();
    driver.driverSocket.removeAllListeners();
    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });
  it('should throw error when no vehicle is attached', async () => {
    const response = await adminEndpoint(`/v1/drivers/${driverId}/vehicle/detach`, 'post', adminToken, app, request, domain);
    sinon.assert.match(response.status, 400);
    sinon.assert.match(response.body.message, 'No vehicle attached');
  });
  it('should throw error when driver is available to receive rides', async () => {
    const payload = {
      service: 'passenger_only',
      inspectionForm: {
        id: checkOutForm._id,
        responses: [
          {
            questionId: question._id,
            response: '5'
          }
        ]
      }
    };
    await driverEndpoint(
      `/v1/vehicle/${vehicle.vehicleId}/check-out`, 'post', driver.driverToken, app, request, domain, payload
    );
    const response = await adminEndpoint(`/v1/drivers/${driverId}/vehicle/detach`, 'post', adminToken, app, request, domain);
    sinon.assert.match(response.status, 400);
    sinon.assert.match(response.body.message, 'Unable to check-in vehicle while available to receive rides');
  });
  it('should throw error when there are active rides', async () => {
    await createRequest(
      rider.riderToken,
      keyLoc.req1p, keyLoc.req1d, location, app, request, domain
    );
    await driverSearcher.search();
    await adminEndpoint(`/v1/drivers/${driverId}`, 'put', adminToken, app, request, domain, { isAvailable: false });
    const response = await adminEndpoint(`/v1/drivers/${driverId}/vehicle/detach`, 'post', adminToken, app, request, domain);
    sinon.assert.match(response.status, 400);
    sinon.assert.match(response.body.message, 'There are active rides');
  });
  it('should detach vehicle from driver successfully', async () => {
    await Rides.deleteMany();
    await Drivers.updateOne({ _id: driverId }, { $set: { driverRideList: [] } });

    const response = await adminEndpoint(`/v1/drivers/${driverId}/vehicle/detach`, 'post', adminToken, app, request, domain);
    sinon.assert.match(response.status, 200);

    const events = await Events.getEvents({ sourceId: admin.id, eventType: 'ADMIN CHECK-IN' });
    const checkInEvent = events.items[0];
    const detachedVehicle = await Vehicles.findById(checkInEvent.targetId);
    sinon.assert.match(events.items.length, 1);
    sinon.assert.match(checkInEvent.eventData, { driverId });
    sinon.assert.match(detachedVehicle.name.substring(0, 4), 'GEM ');

    const foundDriver = await Drivers.findById(driverId);
    sinon.assert.match(foundDriver.vehicle, null);
    sinon.assert.match(foundDriver.isAvailable, false);

    const foundVehicle = await Vehicles.findById(vehicle.vehicleId);
    sinon.assert.match(foundVehicle.driverId, null);
  });
});
