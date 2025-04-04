import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import { expect } from 'chai';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Riders, Rides, Drivers, Locations, Reports, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import {
  adminEndpoint,
  createAdminLogin
} from '../utils/admin';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;

let adminSessionResponse;

let driver1;
let driver1Socket;

let developerToken;

let rider1;
let rider1Socket;

let rider2;
let rider2Socket;

let location1;

let report1;
let report2;

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
const adminInfo = {
  firstName: 'Admin',
  zip: 10001,
  phone: 123456789,
  dob: '2000-12-11'
};

describe('Rider page info', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    defaultLocationInfo = { name: 'Location', ...locationInfo };
    location1 = await Locations.createLocation(defaultLocationInfo);

    defaultDriverInfo = {
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      locations: [location1._id],
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      }
    };
    defaultRiderInfo = {
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      location: location1._id,
      dob: '2000-12-11'
    };

    driver1 = await Drivers.createDriver(defaultDriverInfo);
    rider1 = await new Riders({ email: 'rider1@mail.com', password: 'Password1', ...defaultRiderInfo }).save();
    rider2 = await new Riders({ email: 'rider2@mail.com', password: 'Password2', ...defaultRiderInfo }).save();

    adminSessionResponse = await createAdminLogin({ locations: [location1._id] });
    developerToken = adminSessionResponse.adminToken;

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

    const ride1 = await Rides.create({
      ...defaultRide,
      createdTimestamp: new Date(2019, 1, 4, 0, 0),
      ratingForRider: 5,
      ratingForDriver: 2
    });

    const ride2 = await Rides.create({
      ...defaultRide,
      createdTimestamp: new Date(2019, 1, 4, 0, 0),
      ratingForRider: 1,
      ratingForDriver: 2
    });

    const ride3 = await Rides.create({
      ...defaultRide,
      createdTimestamp: new Date(2019, 1, 4, 0, 0),
      ratingForRider: 3,
      ratingForDriver: 2
    });

    for (let i = 0; i < 7; i += 1) {
      promises.push(Rides.create({
        ...defaultRide,
        createdTimestamp: new Date(2019, 1, 4, 0, 0),
        ratingForRider: 3
      }));
    }

    for (let i = 0; i < 10; i += 1) {
      promises.push(Rides.create({
        ...defaultRide,
        createdTimestamp: new Date(2018, 1, 1, 0, 0),
        ratingForRider: 5
      }));
    }

    // Rider 2
    const ride4 = await Rides.create({
      location: location1._id,
      createdTimestamp: new Date(2018, 1, 1, 0, 0),
      ratingForRider: 1,
      passengers: 1,
      isADA: false,
      rider: rider2._id,
      driver: driver1._id,
      status: 700,
      vehicle: driver1.vehicle
    });

    await Promise.all(promises);

    const defaultReportInfo = {
      reason: 'Purposefully created an inaccurate ride request',
      reporterReason: 'Purposefully created an inaccurate ride request',
      reporter: driver1._id,
      reportee: rider1._id
    };

    report1 = await Reports.createByDriver(
      { ...defaultReportInfo, ride: ride1._id, createdTimestamp: new Date(2019, 1, 3, 0, 0) }
    );
    await Reports.createByDriver(
      { ...defaultReportInfo, ride: ride2._id, createdTimestamp: new Date(2019, 1, 2, 0, 0) }
    );
    await Reports.createByDriver(
      { ...defaultReportInfo, ride: ride3._id, createdTimestamp: new Date(2019, 1, 1, 0, 0) }
    );

    report2 = await Reports.createByDriver({
      reason: 'Purposefully created an inaccurate ride request',
      reporterReason: 'Purposefully created an inaccurate ride request',
      reporter: driver1._id,
      reportee: rider2._id,
      ride: ride4._id,
      createdTimestamp: new Date(2019, 1, 1, 0, 0)
    });
  });

  beforeEach(async () => {
    sandbox.restore();

    driver1Socket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Rider Page', () => {
    it('Rider rating', async () => {
      let response = {};
      response = await adminEndpoint(`/v1/riders/${rider1._id}`, 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get rider page!');
      }

      const result = [
        response.body.firstName,
        response.body.lastName,
        response.body.allTimeRating,
        response.body.last10Rating,
        response.body.allTimeGivenRating
      ];
      return sinon.assert.match(result, ['Rider FN', 'Rider LN', 4, 3, 2]);
    });
    it('Rider reports', async () => {
      let response = {};
      response = await adminEndpoint(`/v1/reports?reportee=${rider1._id}`, 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get rider reports!');
      }

      const result = [
        response.body.items.length,
        String(response.body.items[0].id)
      ];
      return sinon.assert.match(result, [3, String(report1._id)]);
    });
    it('Rider reports', async () => {
      let response = {};
      response = await adminEndpoint(`/v1/reports?reportee=${rider2._id}`, 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get rider reports!');
      }

      const result = [
        response.body.items.length,
        String(response.body.items[0].id)
      ];
      return sinon.assert.match(result, [1, String(report2._id)]);
    });
  });
  describe('Get riders', () => {
    it('should get riders', async () => {
      const response = await adminEndpoint(
        '/v1/riders',
        'get',
        developerToken,
        app,
        request,
        domain
      );
      expect(response.body.total).to.equal(2);
      expect(response.body.items).to.be.an('array');
      expect(response.body.items.length).to.equal(2);
      expect(response.body.items[0]).to.have.property('email');
      expect(response.body.items[0]).to.have.property('firstName');
      expect(response.body.items[0]).to.have.property('lastName');
    });
    it('should get riders with query', async () => {
      const response = await adminEndpoint(
        '/v1/riders?email=rider1@mail.com',
        'get',
        developerToken,
        app,
        request,
        domain
      );
      expect(response.body.total).to.equal(1);
      expect(response.body.items[0].email).to.equal('rider1@mail.com');
    });
  });
  describe('Update riders', () => {
    it('should update a rider and only allow updating of allowed attributes', async () => {
      const newRiderInfo = {
        firstName: 'NewFirst',
        lastName: 'NewLast',
        dob: '1984-01-02'
      };
      const response = await adminEndpoint(
        `/v1/riders/${rider1._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        newRiderInfo
      );
      expect(response.body.email).to.equal('rider1@mail.com');
      expect(response.body.dob).to.equal(newRiderInfo.dob);
      expect(response.body.firstName).to.equal(defaultRiderInfo.firstName);
      expect(response.body.lastName).to.equal(defaultRiderInfo.lastName);
    });
  });
  describe('Delete riders', () => {
    it('should delete a rider', async () => {
      const response = await adminEndpoint(
        `/v1/riders/${rider1._id}`,
        'delete',
        developerToken,
        app,
        request,
        domain
      );
      expect(response.status).to.equal(200);

      const foundRider = await Riders.findOne({ _id: rider1._id });
      expect(foundRider.isDeleted).to.equal(true);
      expect(foundRider.email).to.equal(`${rider1._id}_${rider1.email}`);
    });
  });
});
