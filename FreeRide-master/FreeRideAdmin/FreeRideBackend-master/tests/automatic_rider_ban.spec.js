/* eslint-disable no-await-in-loop */
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../server';
import { port, domain } from '../config';
import {
  Riders, Rides, Drivers, Locations, Reports, Settings
} from '../models';
import { emptyAllCollections } from './utils/helper';
import { driverEndpoint, driverLogin } from './utils/driver';
import { adminEndpoint, createAdminLogin } from './utils/admin';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;

let adminSessionResponse;
let developerToken;

let driver1;
let driver1Socket;
let driver1Token;

let rider1;
let rider2;
let rider3;
let rider4;
let rider5;
let rider6;

let rider1Socket;
let rider2Socket;
let rider3Socket;
let rider4Socket;
let rider5Socket;
let rider6Socket;

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

describe('Automatic rider ban', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider4Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider5Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider6Socket = io.connect(`http://localhost:${port}`, ioOptions);

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
    const driver1SessionResponse = await driverLogin('some@mail.com', 'Password1', app, request, domain);
    driver1Token = driver1SessionResponse.accessToken;

    rider1 = await new Riders({ email: 'rider1@mail.com', password: 'Password1', ...defaultRiderInfo }).save();
    rider2 = await new Riders({ email: 'rider2@mail.com', password: 'Password2', ...defaultRiderInfo }).save();
    rider3 = await new Riders({ email: 'rider3@mail.com', password: 'Password3', ...defaultRiderInfo }).save();
    rider4 = await new Riders({ email: 'rider4@mail.com', password: 'Password4', ...defaultRiderInfo }).save();
    rider5 = await new Riders({ email: 'rider5@mail.com', password: 'Password5', ...defaultRiderInfo }).save();
    rider6 = await new Riders({ email: 'rider6@mail.com', password: 'Password6', ...defaultRiderInfo }).save();

    adminSessionResponse = await createAdminLogin();
    developerToken = adminSessionResponse.adminToken;

    const promises = [];

    const defaultRide = {
      createdTimestamp: new Date(2019, 1, 1, 0, 0),
      location: location1._id,
      passengers: 1,
      isADA: false,
      driver: driver1._id,
      status: 700,
      vehicle: null
    };

    for (let i = 0; i < 3; i += 1) {
      promises.push(Rides.create({
        ...defaultRide,
        rider: rider1._id,
        ratingForRider: 5
      }));
    }

    for (let i = 0; i < 2; i += 1) {
      promises.push(Rides.create({
        ...defaultRide,
        rider: rider2._id,
        ratingForRider: 5
      }));
      promises.push(Rides.create({
        ...defaultRide,
        rider: rider5._id,
        ratingForRider: 5
      }));
      promises.push(Rides.create({
        ...defaultRide,
        rider: rider6._id
      }));
    }

    promises.push(Rides.create({
      ...defaultRide,
      rider: rider3._id,
      ratingForRider: 5
    }));

    promises.push(Rides.create({
      ...defaultRide,
      rider: rider4._id,
      ratingForRider: 5
    }));

    await Promise.all(promises);
  });

  beforeEach(async () => {
    sandbox.restore();

    driver1Socket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
    rider3Socket.removeAllListeners();
    rider4Socket.removeAllListeners();
    rider5Socket.removeAllListeners();
    rider6Socket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Rider strikes', () => {
    it('Should ban ride if rider has 3 strikes', async () => {
      const rideList = await Rides.find({ rider: rider1._id });
      const rideIds = rideList.map(item => item._id);

      rider1 = await Riders.findOne({ _id: rider1._id });
      sinon.assert.match(rider1.strikeCount, 0);
      sinon.assert.match(rider1.isBanned, false);

      let payload = {};
      let response = {};

      for (let i = 0; i < 3; i += 1) {
        payload = {
          ride: rideIds[i],
          reason: 'Purposefully created an inaccurate ride request',
          feedback: 'Wrong pickup location'
        };
        response = await driverEndpoint('/v1/report', 'post', driver1Token, app, request, domain, payload);
        if (response.status === 404 || response.status === 500 || response.status === 403) {
          throw new Error('Could not create report!');
        }
      }

      const reports = await Reports.find({ 'reportee.id': rider1._id });
      let report;
      for (let i = 0; i < reports.length; i += 1) {
        report = reports[i];
        report.status = 'Confirmed';
        payload = report.toJSON();
        response = await adminEndpoint(`/v1/reports/${report._id}`, 'put', developerToken, app, request, domain, payload);
        if (response.status === 404 || response.status === 500 || response.status === 403) {
          throw new Error('Could not update report!');
        }
        rider1 = await Riders.findOne({ _id: rider1._id });
        sinon.assert.match(rider1.strikeCount, i + 1);
      }

      rider1 = await Riders.findOne({ _id: rider1._id });
      sinon.assert.match(rider1.strikeCount, 3);
      return sinon.assert.match(rider1.isBanned, true);
    });
    it('Should ban ride if rider has 2 strikes and a rating strike', async () => {
      const rideList = await Rides.find({ rider: rider2._id });
      const rideIds = rideList.map(item => item._id);

      let payload = {};
      let response = {};

      for (let i = 0; i < 2; i += 1) {
        payload = {
          ride: rideIds[i],
          reason: 'Directed inappropriate speech and/or behavior toward a driver',
          feedback: 'Said a bad word'
        };
        response = await driverEndpoint('/v1/report', 'post', driver1Token, app, request, domain, payload);
        if (response.status === 404 || response.status === 500 || response.status === 403) {
          throw new Error('Could not create report!');
        }
      }

      const reports = await Reports.find({ 'reportee.id': rider2._id });
      let report;
      for (let i = 0; i < reports.length; i += 1) {
        report = reports[i];
        report.status = 'Confirmed';
        payload = report.toJSON();
        response = await adminEndpoint(`/v1/reports/${report._id}`, 'put', developerToken, app, request, domain, payload);
        if (response.status === 404 || response.status === 500 || response.status === 403) {
          throw new Error('Could not update report!');
        }
      }

      let ride;
      for (let i = 0; i < reports.length; i += 1) {
        ride = rideList[i];
        payload = {
          ride: ride._id,
          feedback: 'Bad rider',
          rating: 1
        };
        response = await driverEndpoint('/v1/ride/rating', 'post', driver1Token, app, request, domain, payload);
        if (response.status === 404 || response.status === 500 || response.status === 403) {
          throw new Error('Could not rate ride!');
        }
      }

      rider2 = await Riders.findOne({ _id: rider2._id });
      sinon.assert.match(rider2.strikeCount, 2);
      return sinon.assert.match(rider2.isBanned, true);
    });
    it('Should ban rider with a serious report', async () => {
      const ride = await Rides.findOne({ rider: rider3._id });

      let payload = {};
      let response = {};

      payload = {
        ride: ride._id,
        reason: 'Caused the police to be called for a non-emergency related event',
        feedback: 'Faked a twisted ankle'
      };
      response = await driverEndpoint('/v1/report', 'post', driver1Token, app, request, domain, payload);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not create report!');
      }

      const reports = await Reports.find({ 'reportee.id': rider3._id });
      let report;
      for (let i = 0; i < reports.length; i += 1) {
        report = reports[i];
        report.status = 'Confirmed';
        payload = report.toJSON();
        response = await adminEndpoint(`/v1/reports/${report._id}`, 'put', developerToken, app, request, domain, payload);
        if (response.status === 404 || response.status === 500 || response.status === 403) {
          throw new Error('Could not update report!');
        }
      }

      rider3 = await Riders.findOne({ _id: rider3._id });
      sinon.assert.match(rider3.strikeCount, 1);
      return sinon.assert.match(rider3.isBanned, true);
    });
    it('Should not ban rider if only one report was made', async () => {
      const ride = await Rides.findOne({ rider: rider4._id });

      let payload = {
        ride: ride._id,
        reason: 'Directed inappropriate speech and/or behavior toward a driver',
        feedback: 'Called the driver ugly'
      };
      let response = await driverEndpoint('/v1/report', 'post', driver1Token, app, request, domain, payload);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not create report!');
      }

      const reports = await Reports.find({ 'reportee.id': rider4._id });
      let report;
      for (let i = 0; i < reports.length; i += 1) {
        report = reports[i];
        report.status = 'Confirmed';
        payload = report.toJSON();
        response = await adminEndpoint(`/v1/reports/${report._id}`, 'put', developerToken, app, request, domain, payload);
        if (response.status === 404 || response.status === 500 || response.status === 403) {
          throw new Error('Could not update report!');
        }
      }

      rider4 = await Riders.findOne({ _id: rider4._id });
      sinon.assert.match(rider4.strikeCount, 1);
      return sinon.assert.match(rider4.isBanned, false);
    });
    it('Should not ban rider if two reports were made and rating is good', async () => {
      const rides = await Rides.find({ rider: rider5._id });

      let payload = {
        ride: rides[0]._id,
        reason: 'Directed inappropriate speech and/or behavior toward a driver',
        feedback: 'Called the driver ugly'
      };
      let response = await driverEndpoint('/v1/report', 'post', driver1Token, app, request, domain, payload);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not create report!');
      }

      payload = {
        ride: rides[1]._id,
        reason: 'Directed inappropriate speech and/or behavior toward a driver',
        feedback: 'Called the driver ugly'
      };
      response = await driverEndpoint('/v1/report', 'post', driver1Token, app, request, domain, payload);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not create report!');
      }

      const reports = await Reports.find({ 'reportee.id': rider5._id });
      let report;
      for (let i = 0; i < reports.length; i += 1) {
        report = reports[i];
        report.status = 'Confirmed';
        payload = report.toJSON();
        response = await adminEndpoint(`/v1/reports/${report._id}`, 'put', developerToken, app, request, domain, payload);
        if (response.status === 404 || response.status === 500 || response.status === 403) {
          throw new Error('Could not update report!');
        }
      }

      rider5 = await Riders.findOne({ _id: rider5._id });
      sinon.assert.match(rider5.strikeCount, 2);
      return sinon.assert.match(rider5.isBanned, false);
    });
    it('Should not ban rider if two reports were made but rider has no rating', async () => {
      const rides = await Rides.find({ rider: rider6._id });

      let payload = {
        ride: rides[0]._id,
        reason: 'Directed inappropriate speech and/or behavior toward a driver',
        feedback: 'Called the driver ugly'
      };
      let response = await driverEndpoint('/v1/report', 'post', driver1Token, app, request, domain, payload);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not create report!');
      }

      payload = {
        ride: rides[1]._id,
        reason: 'Directed inappropriate speech and/or behavior toward a driver',
        feedback: 'Called the driver ugly'
      };
      response = await driverEndpoint('/v1/report', 'post', driver1Token, app, request, domain, payload);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not create report!');
      }

      const reports = await Reports.find({ 'reportee.id': rider6._id });
      let report;
      for (let i = 0; i < reports.length; i += 1) {
        report = reports[i];
        report.status = 'Confirmed';
        payload = report.toJSON();
        response = await adminEndpoint(`/v1/reports/${report._id}`, 'put', developerToken, app, request, domain, payload);
        if (response.status === 404 || response.status === 500 || response.status === 403) {
          throw new Error('Could not update report!');
        }
      }

      rider6 = await Riders.findOne({ _id: rider6._id });
      sinon.assert.match(rider6.strikeCount, 2);
      return sinon.assert.match(rider6.isBanned, false);
    });
  });
});
