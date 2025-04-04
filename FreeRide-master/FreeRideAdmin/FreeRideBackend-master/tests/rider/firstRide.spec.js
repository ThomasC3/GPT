/* eslint-disable no-undef */
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import {
  Drivers, Locations,
  Requests, Rides, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

import { createRiderLogin, riderEndpoint, createRequest } from '../utils/rider';
import { createDriverLogin, pickUp, dropOff } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver;
let driverSocket;
let rider;
let riderSocket;
let sandbox;
let location;

const keyLoc = {
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Ad age restriction', () => {
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
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ],
      advertisement: {
        imageUrl: 'https://example.com/a.jpg',
        url: 'https://www.ridecircuit.com',
        ageRestriction: 21
      },
      serviceHours: []
    });

    driver = await createDriverLogin({
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      },
      locations: [location._id]
    }, app, request, domain, driverSocket);

    rider = await createRiderLogin({
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      location: location._id,
      dob: '2000-12-11',
      email: 'rider1@mail.com',
      password: 'Password1'
    }, app, request, domain, riderSocket);
  });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();

    await Drivers.updateOne({ _id: driver.driver._id }, { $set: { driverRideList: [] } });

    driver.driverSocket.removeAllListeners();
    rider.riderSocket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Get first ride check', () => {
    it('Should show it is first ride if rider never finished a ride', async () => {
      const response = await riderEndpoint('/v1/rides?limit=1', 'get', rider.riderToken, app, request, domain);
      return sinon.assert.match(response.body.length, 0);
    });
    it('Should show it is not first ride if rider already finished a ride', async () => {
      await createRequest(
        rider.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();
      const ride1 = await Rides.findOne({ rider: rider.rider._id });
      await pickUp(driver.driverToken, ride1, app, request, domain);
      await dropOff(driver.driverToken, ride1, app, request, domain);
      const response = await riderEndpoint('/v1/rides?limit=1', 'get', rider.riderToken, app, request, domain);
      return sinon.assert.match(response.body.length, 1);
    });
  });
});
