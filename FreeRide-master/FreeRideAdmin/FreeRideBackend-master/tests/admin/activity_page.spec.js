import sinon from 'sinon';
import { expect } from 'chai';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Locations, Settings, Rides, Services, InspectionForms, Drivers, MatchingRules
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import driverSearcher from '../../services/driverSearch';
import { createAdminLogin, adminEndpoint } from '../utils/admin';
import { createDriverLogin, driverEndpoint } from '../utils/driver';
import { createRiderLogin, createRequest } from '../utils/rider';
import { createGEMVehicle } from '../utils/vehicle';
import { createZone } from '../utils/location';

let sandbox;

let developerToken;

let location1;
let location2;
let location3;
let defaultLocationInfo;

let driverId;
let driverSocket;

let riderId;
let riderSocket;
let riderToken;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

const keyLoc = {
  // Driver 1
  d1a: [40.194478, -8.404691, 'Leroy Merlin'],
  // Request 1
  req1p: [40.19689, -8.402655, 'Minipreco'],
  req1d: [40.2041, -8.404072, 'McDonalds']
};

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

describe('Dashboard activity page', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    defaultLocationInfo = { name: 'Location', ...locationInfo };
    location1 = await Locations.createLocation(defaultLocationInfo);
    location2 = await Locations.createLocation({ name: 'Location 2', ...locationInfo });
    location3 = await Locations.createLocation({ name: 'Location 3', ...locationInfo });

    ({ adminToken: developerToken } = await createAdminLogin());

    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    const driverSocket2 = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    const driverInfo = {
      isOnline: true,
      isAvailable: true,
      locations: [location1._id, location2._id],
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      },
      activeLocation: location1._id
    };

    const riderInfo = {
      location: location1._id
    };

    ({ driver: { _id: driverId } } = await createDriverLogin(
      driverInfo, app, request, domain, driverSocket
    ));

    await Services.create({
      key: 'passenger_only',
      title: 'Passenger Only',
      desc: 'Passenger Cap only'
    });

    const checkOutForm = await InspectionForms.createInspectionForm({
      name: 'GEM check-out form',
      inspectionType: 'check-out',
      questionList: []
    });

    const zoneA = await createZone({
      name: 'Zone A',
      description: 'Zone in Loc 3',
      serviceArea: location3.serviceArea.coordinates,
      location: location3._id
    });

    await MatchingRules.create({
      key: 'priority',
      title: 'Priority',
      description: 'Designated for requests to or from specific zones but available for all requests if needed'
    });

    const vehicle = await createGEMVehicle(
      false, location3._id, { checkOutFormId: checkOutForm._id, matchingRule: 'priority', zones: [zoneA._id] }
    );

    const { driverToken: driverToken2 } = await createDriverLogin(
      {
        ...driverInfo,
        isAvailable: false,
        locations: [location3._id],
        activeLocation: location3._id,
        email: 'driver@mail.com'
      }, app, request, domain, driverSocket2,
      { attachSharedVehicle: false }
    );

    const payload = {
      service: 'passenger_only',
      inspectionForm: {
        id: checkOutForm._id,
        responses: [
        ]
      }
    };

    await driverEndpoint(`/v1/vehicle/${vehicle.vehicleId}/check-out`, 'post', driverToken2, app, request, domain, payload);
    await Drivers.findOneAndUpdate(
      { activeLocation: location3._id },
      { $set: { isAvailable: false } }
    );

    ({ rider: { _id: riderId }, riderSocket, riderToken } = await createRiderLogin(
      riderInfo, app, request, domain, riderSocket
    ));


    await createRequest(
      riderToken, keyLoc.req1p, keyLoc.req1d, location1, app, request, domain
    );
    await driverSearcher.search();

    const ride1 = await Rides.findOne({ rider: riderId });
    sinon.assert.match(String(ride1.driver), String(driverId));
  });

  beforeEach(async () => {
    sandbox.restore();

    await Locations.syncIndexes();
  });

  describe('Dashboard GET', () => {
    it('200 OK with driver action count', async () => {
      let response = {};
      response = await adminEndpoint(`/v1/dashboard/drivers?isOnline=true&activeLocation=${location1._id}`, 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get dashboard driver info!');
      }

      const result = [
        response.body[0].rideCount,
        response.body[0].actionCount,
        response.body[0].id
      ];
      return sinon.assert.match(result, [1, 2, `${driverId}`]);
    });
    it('should only show drivers in their active locations', async () => {
      const response = await adminEndpoint(`/v1/dashboard/drivers?isOnline=true&activeLocation=${location2._id}`, 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get dashboard driver info!');
      }
      sinon.assert.match(response.body.length, 0);
    });
    it('should show all required info for driver tooltip', async () => {
      const response = await adminEndpoint(`/v1/dashboard/drivers?isOnline=true&activeLocation=${location3._id}`, 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get dashboard driver info!');
      }
      expect(response.body).to.have.lengthOf(1);
      expect(response.body[0]).to.have.all.keys([
        'id', 'firstName', 'lastName', 'vehicle',
        'isAvailable', 'status', 'currentLocation',
        'rideCount', 'actionCount'
      ]);
      expect(response.body[0].vehicle).to.have.all.keys([
        'id', 'name', 'publicId', 'adaCapacity',
        'passengerCapacity', 'matchingRule',
        'zones', 'type', 'service'
      ]);
      expect(response.body[0].vehicle.matchingRule).to.have.all.keys(['key', 'title']);
      expect(response.body[0].vehicle.zones[0]).to.have.all.keys(['id', 'name']);
    });
    it('should show all required info for ride tooltip', async () => {
      const ride = await Rides.findOne({ rider: riderId });
      const response = await adminEndpoint(
        `/v1/dashboard/rides/${ride._id}`,
        'get', developerToken, app, request, domain
      );
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get dashboard ride info!');
      }

      expect(response.body).to.have.property('pickupZone');
      expect(response.body.pickupZone.name).to.equal('Default');
      expect(response.body).to.have.property('dropoffZone');
      expect(response.body.dropoffZone.name).to.equal('Default');
      expect(response.body).to.have.property('vehicle');
      expect(response.body.vehicle).to.have.keys([
        'publicId', 'vehicleName', 'vehicleId',
        'service', 'zones', 'matchingRule', 'jobs',
        'vehicleType', 'profile'
      ]);
    });
  });
});
