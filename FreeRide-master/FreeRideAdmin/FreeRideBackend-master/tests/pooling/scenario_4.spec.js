/* eslint-disable no-await-in-loop */

import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import {
  Locations, Requests, Rides, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createRequest, createRiderLogin } from '../utils/rider';
import { pickUp, dropOff, createDriverLogin } from '../utils/driver';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};
let driver1Socket;
let driver2Socket;
let rider1Socket;
let rider2Socket;
let rider3Socket;
let rider4Socket;
let rider5Socket;
let driver1Token;
let sandbox;
let driver1;
let driver2;
let rider1;
let rider2;
let rider3;
let rider4;
let rider5;
let rider1Token;
let rider2Token;
let rider3Token;
let rider4Token;
let rider5Token;
let location;
let ride1;
let ride2;
let ride3;
let ride4;
let ride5;
let route1;

const keyLoc = {
  // Driver 1
  d1a: [32.717447, -117.168309, 'Museum of Contemporary Art San Diego'],
  d1b: [32.718814, -117.168293, 'Driver 1 position 2'],
  d1c: [32.72298, -117.169185, 'Driver 1 position 3'],
  d1d: [32.721955, -117.167384, 'Driver 1 position 4'],
  // Driver 2
  d2a: [32.720378, -117.158605, 'Holiday Inn Express San Diego Downtown'],
  d2b: [32.72195, -117.1665, 'Driver 2 position 2'],
  // Request 1
  req1p: [32.723304, -117.167313, 'Vantaggio Suites'],
  req1d: [32.716992, -117.159011, 'Stafford House San Diego'],
  // Request 2
  req2p: [32.723304, -117.167313, 'Vantaggio Suites'],
  req2d: [32.716992, -117.159011, 'Stafford House San Diego'],
  // Request 3
  req3p: [32.723304, -117.167313, 'Vantaggio Suites'],
  req3d: [32.716992, -117.159011, 'Stafford House San Diego'],
  // Request 4
  req4p: [32.723304, -117.167313, 'Vantaggio Suites'],
  req4d: [32.716992, -117.159011, 'Stafford House San Diego'],
  // Request 5
  req5p: [32.723304, -117.167313, 'Vantaggio Suites'],
  req5d: [32.716992, -117.159011, 'Stafford House San Diego']
};

describe('Scenario #4', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driver1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    driver2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider1Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider2Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider3Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider4Socket = io.connect(`http://localhost:${port}`, ioOptions);
    rider5Socket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'SD',
      poolingEnabled: true,
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        {
          latitude: 33.123204,
          longitude: -117.427767
        },
        {
          latitude: 33.138359,
          longitude: -116.837406
        },
        {
          latitude: 32.655365,
          longitude: -116.795193
        },
        {
          latitude: 32.619951,
          longitude: -117.378216
        },
        {
          latitude: 33.123204,
          longitude: -117.427767
        }
      ]
    });

    const driver1Info = {
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      email: 'driver1@mail.com',
      locations: [location._id]
    };

    ({
      driver: driver1, driverSocket: driver1Socket, driverToken: driver1Token
    } = await createDriverLogin(
      driver1Info, app, request, domain, driver1Socket
    ));

    const driver2Info = {
      currentLocation: {
        coordinates: [keyLoc.d2a[1], keyLoc.d2a[0]],
        type: 'Point'
      },
      email: 'driver2@mail.com',
      locations: [location._id]
    };

    ({
      driver: driver2, driverSocket: driver2Socket
    } = await createDriverLogin(
      driver2Info, app, request, domain, driver2Socket
    ));

    const riders = [];
    const riderSockets = [rider1Socket, rider2Socket, rider3Socket, rider4Socket, rider5Socket];
    for (let i = 0; i < 5; i += 1) {
      riders.push(
        createRiderLogin({
          email: `rider${i + 1}@mail.com`,
          firstName: 'Rider',
          lastName: `${i + 1}`,
          password: `Password${i + 1}`,
          location: location._id,
          dob: '2000-12-11'
        }, app, request, domain, riderSockets[i])
      );
    }
    ([
      { rider: rider1, riderToken: rider1Token },
      { rider: rider2, riderToken: rider2Token },
      { rider: rider3, riderToken: rider3Token },
      { rider: rider4, riderToken: rider4Token },
      { rider: rider5, riderToken: rider5Token }
    ] = await Promise.all(riders));
  });

  before(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    driver1Socket.removeAllListeners();
    driver2Socket.removeAllListeners();
    rider1Socket.removeAllListeners();
    rider2Socket.removeAllListeners();
    rider3Socket.removeAllListeners();
    rider4Socket.removeAllListeners();
    rider5Socket.removeAllListeners();

    // Request 1 created
    await createRequest(rider1Token, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
    await driverSearcher.search();

    // Driver 1 moves to second position
    driver1.currentLocation.coordinates = [keyLoc.d1b[1], keyLoc.d1b[0]];
    await driver1.save();

    // Request 2 created
    await createRequest(rider2Token, keyLoc.req2p, keyLoc.req2d, location, app, request, domain);
    await driverSearcher.search();

    // Driver 1 moves to second position
    driver1.currentLocation.coordinates = [keyLoc.d1c[1], keyLoc.d1c[0]];
    await driver1.save();

    // Request 3 created
    await createRequest(rider3Token, keyLoc.req3p, keyLoc.req3d, location, app, request, domain);
    await driverSearcher.search();

    ride1 = await Rides.findOne({ rider: rider1 });
    ride2 = await Rides.findOne({ rider: rider2 });
    ride3 = await Rides.findOne({ rider: rider3 });

    for (let i = 0; i < 3; i += 1) {
      route1 = await Routes.findOne({ driver: driver1._id, active: true });
      if (String(route1.activeRideId) === String(ride1._id)) {
        await pickUp(driver1Token, ride1, app, request, domain);
      } else if (String(route1.activeRideId) === String(ride2._id)) {
        await pickUp(driver1Token, ride2, app, request, domain);
      } else if (String(route1.activeRideId) === String(ride3._id)) {
        await pickUp(driver1Token, ride3, app, request, domain);
      }
    }

    // Driver 1 moves to third position
    driver1.currentLocation.coordinates = [keyLoc.d1d[1], keyLoc.d1d[0]];
    await driver1.save();

    // Request 4 created
    await createRequest(rider4Token, keyLoc.req4p, keyLoc.req4d, location, app, request, domain);
    await driverSearcher.search();

    for (let i = 0; i < 3; i += 1) {
      route1 = await Routes.findOne({ driver: driver1._id, active: true });
      if (String(route1.activeRideId) === String(ride1._id)) {
        await dropOff(driver1Token, ride1, app, request, domain);
      } else if (String(route1.activeRideId) === String(ride2._id)) {
        await dropOff(driver1Token, ride2, app, request, domain);
      } else if (String(route1.activeRideId) === String(ride3._id)) {
        await dropOff(driver1Token, ride3, app, request, domain);
      }
    }

    // Driver 1 moves to third position
    driver1.currentLocation.coordinates = [keyLoc.req1d[1], keyLoc.req1d[0]];
    await driver1.save();

    // Driver 2 moves to second position
    driver2.currentLocation.coordinates = [keyLoc.d2b[1], keyLoc.d2b[0]];
    await driver2.save();

    // Request 5 created
    await createRequest(rider5Token, keyLoc.req5p, keyLoc.req5d, location, app, request, domain);
    await driverSearcher.search();
  });

  describe('Scenario #4', () => {
    it('Should assign driver 1 to ride request 1 and pickup', async () => {
      ride1 = await Rides.findOne({ rider: rider1 });
      return sinon.assert.match(String(ride1.driver), String(driver1._id));
    });

    it('Should assign driver 1 to ride request 2', async () => {
      ride2 = await Rides.findOne({ rider: rider2 });
      return sinon.assert.match(String(ride2.driver), String(driver1._id));
    });

    it('Should assign driver 1 to ride request 3', async () => {
      ride3 = await Rides.findOne({ rider: rider3 });
      return sinon.assert.match(String(ride3.driver), String(driver1._id));
    });

    it('Should dropoff rider 1, 2 and 3 by driver 1', async () => {
      ride1 = await Rides.findOne({ rider: rider1 });
      ride2 = await Rides.findOne({ rider: rider2 });
      ride3 = await Rides.findOne({ rider: rider3 });

      const statusAct = [ride1.status, ride2.status, ride3.status];
      const statusExp = [700, 700, 700];

      const spy = sinon.spy();
      spy(statusAct);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(statusExp));
    });

    it('Should assign rider 4 and 5 to driver 2', async () => {
      ride4 = await Rides.findOne({ rider: rider4 });
      ride5 = await Rides.findOne({ rider: rider5 });

      const statusAct = [String(ride4.driver), String(ride5.driver)];
      const statusExp = [String(driver2._id), String(driver2._id)];

      const spy = sinon.spy();
      spy(statusAct);
      return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(statusExp));
    });
  });
});
