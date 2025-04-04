/* eslint-disable no-await-in-loop */
import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import driverSearcher from '../../services/driverSearch';
import { createRequest, createRiderLogin } from '../utils/rider';
import { createDriverLogin } from '../utils/driver';
import {
  Locations, Requests, Rides, Routes, Drivers, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;
let driver;
let driverSocket;
let riderSocket;
let riderToken;
let location;

const keyLoc = {
  p1: [40.6810937, -73.9078617, 'Address'],
  d1: [40.6851291, -73.9148140, 'Address']
};

describe('Location defaults in pooling', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();

    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isADA: true,
      isUsingServiceTimes: false,
      isActive: true,
      poolingEnabled: true,
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ],
      cancelTime: null,
      queueTimeLimit: null,
      inversionRangeFeet: null,
      etaIncreaseLimit: null,
      concurrentRideLimit: null
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

    ({ driver, driverSocket } = await createDriverLogin(
      {
        ...driverInfo, email: 'driver1@mail.com', isADA: false
      },
      app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
    ));

    ({ riderSocket, riderToken } = await createRiderLogin(
      { location: location._id, email: 'rider1@mail.com' },
      app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
    ));
  });

  describe('Location with some keys present but empty', () => {
    beforeEach(async () => {
      sandbox.restore();
      await Requests.deleteMany();
      await Rides.deleteMany();
      await Routes.deleteMany();

      await Drivers.updateOne(
        { _id: driver._id },
        { $set: { driverRideList: [], isOnline: true, isAvailable: true } }
      );

      driverSocket.removeAllListeners();
      riderSocket.removeAllListeners();

      await Drivers.syncIndexes();
      await Locations.syncIndexes();
    });

    it('Should match pooling rider successfully', async () => {
      await createRequest(
        riderToken, keyLoc.p1, keyLoc.d1, location, app, request, domain, false, 1
      );
      await driverSearcher.search();

      const reqs = await Requests.find({});
      const rides = await Rides.find({});

      sinon.assert.match(reqs.length, 1);
      return sinon.assert.match(rides.length, 1);
    });
  });
});
