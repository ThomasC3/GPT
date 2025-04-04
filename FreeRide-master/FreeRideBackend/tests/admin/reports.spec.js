import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import { expect } from 'chai';
import mongoose from 'mongoose';
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
import * as reportModule from '../../utils/report';
import { SesMailer } from '../../services';
import { driverEndpoint, driverLogin } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;

let adminSessionResponse;

let driver1;
let driver1Socket;
let driver1Token;

let developerToken;

let rider1;
let rider1Socket;

let rider2;
let rider2Socket;

let location1;

let report1;
let defaultReportInfo;

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
let defaultRide;

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

describe('Report list', () => {
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
    const driver1SessionResponse = await driverLogin(driver1.email, 'Password1', app, request, domain);
    driver1Token = driver1SessionResponse.accessToken;

    rider1 = await new Riders({
      email: 'rider1@mail.com',
      password: 'Password1',
      ...defaultRiderInfo
    }).save();
    rider2 = await new Riders({
      email: 'rider2@mail.com',
      password: 'Password2',
      ...defaultRiderInfo
    }).save();

    adminSessionResponse = await createAdminLogin({ locations: [location1._id] });
    developerToken = adminSessionResponse.adminToken;

    const promises = [];

    defaultRide = {
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
      promises.push(
        Rides.create({
          ...defaultRide,
          createdTimestamp: new Date(2019, 1, 4, 0, 0),
          ratingForRider: 3
        })
      );
    }

    for (let i = 0; i < 10; i += 1) {
      promises.push(
        Rides.create({
          ...defaultRide,
          createdTimestamp: new Date(2018, 1, 1, 0, 0),
          ratingForRider: 5
        })
      );
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

    defaultReportInfo = {
      reason: 'Purposefully created an inaccurate ride request',
      reporterReason: 'Purposefully created an inaccurate ride request',
      reporter: driver1._id,
      reportee: rider1._id
    };

    report1 = await Reports.createByDriver({
      ...defaultReportInfo,
      ride: ride1._id,
      createdTimestamp: new Date(2019, 1, 3, 0, 0)
    });
    await Reports.createByDriver({
      ...defaultReportInfo,
      ride: ride2._id,
      createdTimestamp: new Date(2019, 1, 2, 0, 0)
    });
    await Reports.createByDriver({
      ...defaultReportInfo,
      ride: ride3._id,
      createdTimestamp: new Date(2019, 1, 1, 0, 0)
    });

    await Reports.createByDriver({
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

  describe('GET Reports', () => {
    it('should return all reports', async () => {
      let response = {};
      response = await adminEndpoint(
        '/v1/reports',
        'get',
        developerToken,
        app,
        request,
        domain
      );
      if (
        response.status === 404
        || response.status === 500
        || response.status === 403
      ) {
        throw new Error('Could not get rider reports!');
      }

      const reportItem1 = response.body.items[0];

      expect(response.body.items.length).to.equal(4);
      expect(reportItem1).to.have.property('reporter');
      expect(reportItem1).to.have.property('reportee');
      expect(reportItem1).to.have.property('reason');
      expect(reportItem1.reporter).to.include({
        userType: 'Driver',
        firstName: 'Driver FN',
        lastName: 'Driver LN'
      });
      expect(reportItem1.reportee).to.include({
        userType: 'Rider',
        firstName: 'Rider FN',
        lastName: 'Rider LN'
      });
    });

    it('should return only for given createdTimestamp', async () => {
      let response = {};
      response = await adminEndpoint(
        '/v1/reports?createdTimestamp[start]=2019-02-03 00:00&createdTimestamp[end]=2019-02-04 00:00',
        'get',
        developerToken,
        app,
        request,
        domain
      );

      if (
        response.status === 404
        || response.status === 500
        || response.status === 403
      ) {
        throw new Error('Could not get rider reports!');
      }

      const result = [
        response.body.items.length,
        String(response.body.items[0].id)
      ];
      return sinon.assert.match(result, [1, String(report1._id)]);
    });

    it('should only return for a given ride location', async () => {
      const location = await Locations.createLocation({
        ...locationInfo,
        name: 'Location 2'
      });
      const ride = await Rides.create({
        ...defaultRide,
        location: location._id
      });

      const report = await Reports.createByDriver({
        ...defaultReportInfo,
        ride: ride._id,
        createdTimestamp: new Date(2019, 1, 3, 0, 0)
      });

      let response = {};
      response = await adminEndpoint(
        `/v1/reports?location=${location._id}`,
        'get',
        developerToken,
        app,
        request,
        domain
      );
      if (
        response.status === 404
        || response.status === 500
        || response.status === 403
      ) {
        throw new Error('Could not get rider reports!');
      }

      const result = [
        response.body.items.length,
        String(response.body.items[0].id)
      ];
      return sinon.assert.match(result, [1, String(report._id)]);
    });
  });
  describe('Get Report', () => {
    let report;
    let ride;

    before(async () => {
      ride = await Rides.create({
        ...defaultRide,
        createdTimestamp: new Date(2019, 1, 4, 0, 0)
      });

      report = await Reports.createByDriver({
        ...defaultReportInfo,
        ride: ride._id
      });
    });

    it('should get report by id', async () => {
      const response = await adminEndpoint(
        `/v1/reports/${report._id}`,
        'get',
        developerToken,
        app,
        request,
        domain
      );

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('_id', String(report._id));
    });

    it('should return 404 if report not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await adminEndpoint(
        `/v1/reports/${fakeId}`,
        'get',
        developerToken,
        app,
        request,
        domain
      );

      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal('Report not found');
    });
  });
  describe('Create and Update Report', () => {
    let sendNewReportEmailSpy;
    let checkStrikeBanSpy;
    let ride;
    before(async () => {
      ride = await Rides.create({
        ...defaultRide,
        createdTimestamp: new Date(2019, 1, 4, 0, 0)
      });
    });
    beforeEach(() => {
      sendNewReportEmailSpy = sinon.spy(SesMailer, 'sendNewRiderReport');
      checkStrikeBanSpy = sinon.spy(reportModule, 'checkStrikeBan');
    });
    afterEach(async () => {
      sendNewReportEmailSpy.restore();
      checkStrikeBanSpy.restore();
      await Reports.deleteMany({});
    });
    it('creates a pending report', async () => {
      const payload = {
        reason: 'Directed inappropriate speech and/or behavior toward a driver',
        status: 'Pending',
        ride: ride._id
      };
      const report = await adminEndpoint('/v1/reports', 'post', developerToken, app, request, domain, payload);
      expect(report.body).to.have.property('status', 'Pending');
      expect(sendNewReportEmailSpy.called).to.equal(true);
      expect(checkStrikeBanSpy.called).to.equal(false);
    });

    it('creates a confirmed report', async () => {
      const payload = {
        reason: 'Directed inappropriate speech and/or behavior toward a driver',
        status: 'Confirmed',
        ride: ride._id
      };
      const report = await adminEndpoint('/v1/reports', 'post', developerToken, app, request, domain, payload);
      expect(report.body).to.have.property('status', 'Confirmed');
      expect(sendNewReportEmailSpy.called).to.equal(true);
      expect(checkStrikeBanSpy.called).to.equal(true);
    });
    it('updates a pending report by admin to confirmed', async () => {
      const payload = {
        reason: 'Directed inappropriate speech and/or behavior toward a driver',
        status: 'Pending',
        ride: ride._id
      };
      const report = await adminEndpoint('/v1/reports', 'post', developerToken, app, request, domain, payload);
      const payload2 = {
        status: 'Confirmed'
      };
      expect(sendNewReportEmailSpy.called).to.equal(true);
      expect(checkStrikeBanSpy.called).to.equal(false);

      const report2 = await adminEndpoint(`/v1/reports/${report.body.id}`, 'put', developerToken, app, request, domain, payload2);
      expect(report2.body).to.have.property('status', 'Confirmed');
      expect(checkStrikeBanSpy.called).to.equal(true);
    });
    it('updates a pending report by driver to confirmed', async () => {
      const payload = {
        reason: 'Directed inappropriate speech and/or behavior toward a driver',
        ride: ride._id
      };
      await driverEndpoint('/v1/report', 'post', driver1Token, app, request, domain, payload);

      const report = await Reports.findOne({});
      expect(report).to.have.property('status', 'Pending');

      const payload2 = {
        status: 'Confirmed'
      };
      expect(sendNewReportEmailSpy.called).to.equal(true);
      expect(checkStrikeBanSpy.called).to.equal(false);

      const report2 = await adminEndpoint(`/v1/reports/${report._id}`, 'put', developerToken, app, request, domain, payload2);
      expect(report2.body).to.have.property('status', 'Confirmed');
      expect(checkStrikeBanSpy.called).to.equal(true);
    });
  });

  describe('Delete Report', () => {
    let reportToDelete;

    let ride;
    before(async () => {
      ride = await Rides.create({
        ...defaultRide,
        createdTimestamp: new Date(2019, 1, 4, 0, 0)
      });
      const payload = {
        reason: 'Test report for deletion',
        status: 'Pending',
        ride: ride._id
      };
      const response = await adminEndpoint('/v1/reports', 'post', developerToken, app, request, domain, payload);
      reportToDelete = response.body;
    });

    it('deletes a report successfully', async () => {
      const response = await adminEndpoint(`/v1/reports/${reportToDelete.id}`, 'delete', developerToken, app, request, domain);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('message', 'Report deleted successfully');

      const deletedReport = await Reports.findOne({ _id: reportToDelete.id, isDeleted: false });
      expect(deletedReport).to.be.equal(null);
    });

    it('returns 404 when trying to delete a non-existent report', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await adminEndpoint(`/v1/reports/${nonExistentId}`, 'delete', developerToken, app, request, domain);

      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Report not found');
    });

    it('returns 403 when trying to delete a report without proper permissions', async () => {
      const insufficientToken = await createAdminLogin({ permissions: ['view:reports'] });

      const response = await adminEndpoint(`/v1/reports/${reportToDelete.id}`, 'delete', insufficientToken.adminToken, app, request, domain);

      expect(response.status).to.equal(403);
    });
  });
});
