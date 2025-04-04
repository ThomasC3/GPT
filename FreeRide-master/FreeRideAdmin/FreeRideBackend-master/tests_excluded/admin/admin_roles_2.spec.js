import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import logger from '../../logger';
import {
  Requests, Riders, Rides, Drivers, Locations, Admins, Routes, Settings
} from '../../models';
import { emptyAllCollections } from '../../tests/utils/helper';
import { createRequest, riderLogin } from '../../tests/utils/rider';
import { adminLogin, adminEndpoint } from '../../tests/utils/admin';
import { driverLogin } from '../../tests/utils/driver';
import driverSearcher from '../../services/driverSearch';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;

let adminSessionResponse;

let developerToken;
let superAdminToken;
let adminToken;
let dataAdminToken;
let regionManagerToken;
let managerToken;
let supervisorToken;
let adminTokens;

let driverSocket;
let driverToken;

let rider;
let riderSocket;
let riderToken;
let ride1;

let location;

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  d1b: [40.198857, -8.40275, 'Via lusitania'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds']
};

describe('Admin role endpoint and action access 2', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    // Coimbra-B (SE)
    // Entrada das acacias (SD)
    // Retiro do mondego (ID)
    // Hotel D. Luis (IE)
    location = await Locations.createLocation({
      name: 'Location',
      isUsingServiceTimes: false,
      isActive: true,
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
    });

    await Drivers.createDriver({
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      locations: [location._id],
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      }
    });

    rider = await new Riders({
      email: 'rider1@mail.com',
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      password: 'Password1',
      location: location._id,
      dob: '2000-12-11'
    }).save();

    const adminInfo = {
      firstName: 'Admin',
      locations: [location._id],
      zip: 10001,
      phone: 123456789,
      dob: '2000-12-11'
    };

    await new Admins({
      role: 0, email: 'developer@mail.com', password: 'Password0', lastName: '0', ...adminInfo
    }).save();
    await new Admins({
      role: 1, email: 'super_admin@mail.com', password: 'Password1', lastName: '1', ...adminInfo
    }).save();
    await new Admins({
      role: 2, email: 'admin@mail.com', password: 'Password2', lastName: '2', ...adminInfo
    }).save();
    await new Admins({
      role: 3, email: 'data_admin@mail.com', password: 'Password3', lastName: '3', ...adminInfo
    }).save();
    await new Admins({
      role: 4, email: 'region_manager@mail.com', password: 'Password4', lastName: '4', ...adminInfo
    }).save();
    await new Admins({
      role: 5, email: 'general_manager@mail.com', password: 'Password5', lastName: '5', ...adminInfo
    }).save();
    await new Admins({
      role: 6, email: 'shift_manager@mail.com', password: 'Password6', lastName: '6', ...adminInfo
    }).save();

    adminSessionResponse = await adminLogin('developer@mail.com', 'Password0', app, request, domain);
    developerToken = adminSessionResponse.accessToken;
    adminSessionResponse = await adminLogin('super_admin@mail.com', 'Password1', app, request, domain);
    superAdminToken = adminSessionResponse.accessToken;
    adminSessionResponse = await adminLogin('admin@mail.com', 'Password2', app, request, domain);
    adminToken = adminSessionResponse.accessToken;
    adminSessionResponse = await adminLogin('data_admin@mail.com', 'Password3', app, request, domain);
    dataAdminToken = adminSessionResponse.accessToken;
    adminSessionResponse = await adminLogin('region_manager@mail.com', 'Password4', app, request, domain);
    regionManagerToken = adminSessionResponse.accessToken;
    adminSessionResponse = await adminLogin('general_manager@mail.com', 'Password5', app, request, domain);
    managerToken = adminSessionResponse.accessToken;
    adminSessionResponse = await adminLogin('shift_manager@mail.com', 'Password6', app, request, domain);
    supervisorToken = adminSessionResponse.accessToken;

    adminTokens = [
      developerToken, superAdminToken, adminToken,
      dataAdminToken, regionManagerToken, managerToken,
      supervisorToken
    ];

    const driverSessionResponse = await driverLogin('some@mail.com', 'Password1', app, request, domain);
    driverToken = driverSessionResponse.accessToken;

    const riderSessionResponse = await riderLogin('rider1@mail.com', 'Password1', app, request, domain);
    riderToken = riderSessionResponse.accessToken;

    driverSocket
      .emit('authenticate', { token: driverToken })
      .on('authenticated', () => {
        logger.info('DRIVER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });

    riderSocket
      .emit('authenticate', { token: riderToken })
      .on('authenticated', () => {
        logger.info('RIDER authentiticated through sockets');
      })
      .on('unauthorized', (msg) => {
        throw new Error(msg);
      });
  });

  beforeEach(async () => {
    sandbox.restore();

    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();

    driverSocket.removeAllListeners();
    riderSocket.removeAllListeners();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('Admin role endpoint and action access', () => {
    it('Rides access', async () => {
      await createRequest(riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain);
      await driverSearcher.search();

      ride1 = await Rides.findOne({ rider });

      const riderAccessResult = [];
      const adminTokensResponsesPromises = adminTokens.map(
        async token => adminEndpoint(`/v1/rides/${String(ride1._id)}`, 'get', token, app, request, domain)
      );
      const responses = await Promise.all(adminTokensResponsesPromises);

      responses.forEach((response) => {
        logger.info(response);
        if (response.status === 403 || response.status === 404) {
          riderAccessResult.push(false);
        } else if (!response.body || !response.body._id) {
          riderAccessResult.push(false);
        } else {
          riderAccessResult.push(true);
        }
      });

      return sinon.assert.match(riderAccessResult,
        [
          true, // developer
          true, // superAdmin
          true, // admin
          true, // dataAdmin
          true, // regionManager
          true, // Manager
          true // supervisor
        ]);
    });
  });
});
