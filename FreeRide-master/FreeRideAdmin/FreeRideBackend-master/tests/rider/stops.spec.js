import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import jsonSchema from 'chai-json-schema';
import request from 'supertest-promised';
import io from 'socket.io-client';

import app from '../../server';
import { port, domain } from '../../config';
import {
  Locations, Zones, FixedStops, Settings, Rides, Requests
} from '../../models';
import { createZone } from '../utils/location';
import { createRiderLogin, riderEndpoint, createAnyStopRequest } from '../utils/rider';
import { createDriverLogin, pickUp, dropOff } from '../utils/driver';
import { createGEMVehicle } from '../utils/vehicle';
import {
  dumpRequestForRiderSchema, dumpRideForRiderSchema, dumpStopForRiderSchema
} from '../utils/schemas';
import { emptyAllCollections } from '../utils/helper';
import driverSearcher from '../../services/driverSearch';

chai.use(chaiAsPromised);
chai.use(jsonSchema);
const { expect } = chai;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let location;
let fixedStopDefaultZone;
let fixedStopDefaultZoneFar;
let fixedStopZoneA;
let fixedStopZoneB;
let riderToken;
let riderSocket;
let driverToken;
let driverSocket;

const locationServiceArea = [[
  [
    3.4020295258541466,
    6.664068753848554
  ],
  [
    3.339544784643209,
    6.657078139769771
  ],
  [
    3.3362832184810998,
    6.600979128639201
  ],
  [
    3.4099259491939904,
    6.601661221767648
  ],
  [
    3.4020295258541466,
    6.664068753848554
  ]
]];

// Zone A snaps to the location service area
const zoneAServiceArea = [[
  [
    3.4020000191821236,
    6.664065452726506
  ],
  [
    3.366843159769045,
    6.660132203878613
  ],
  [
    3.36252792163293,
    6.623688398456886
  ],
  [
    3.3673837166721086,
    6.601267187431997
  ],
  [
    3.4099133882940382,
    6.601760493897951
  ],
  [
    3.4020000191821236,
    6.664065452726506
  ]
]];

// Zone B is completely in Zone A
const zoneBServiceArea = [[
  [
    3.3885417297269247,
    6.654117053701287
  ],
  [
    3.374722930157658,
    6.652672239698609
  ],
  [
    3.3752588392830605,
    6.641037530017909
  ],
  [
    3.3905322493323933,
    6.641227641864863
  ],
  [
    3.3885417297269247,
    6.654117053701287
  ]
]];

// Zone C is completely in Location service area
const zoneCServiceArea = [[
  [
    3.3600377989428565,
    6.652790133888905
  ],
  [
    3.3507599018922263,
    6.652656091342693
  ],
  [
    3.3501188835504356,
    6.645283694970757
  ],
  [
    3.3612523600112167,
    6.644278359626986
  ],
  [
    3.3600377989428565,
    6.652790133888905
  ]
]];

const pointDefaultZone = [3.353235, 6.632451];
const pointZoneA = [3.3688387, 6.6208209];
const pointZoneB = [3.3819173, 6.6467754];
const pointZoneC = [3.3537977, 6.6491971];
const pointOutside = [4, 6];

const fixedStopInDefaultZone = { name: 'FS Default', lng: 3.3555508, lat: 6.6560824 };
const furthestFixedStopInDefaultZone = { name: 'FS Default', lng: 3.3376976, lat: 6.6020329 };
const fixedStopInZoneA = { name: 'FS Zone A', lng: 3.3673096, lat: 6.6351952 };
const fixedStopInZoneB = { name: 'FS Zone B', lng: 3.3852924, lat: 6.6454724 };

describe('Rider stop validation and ride request', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Location',
      isActive: true,
      poolingEnabled: false,
      timezone: 'Europe/Lisbon',
      serviceArea: locationServiceArea[0].map(
        coord => ({ latitude: coord[1], longitude: coord[0] })
      ),
      fixedStopEnabled: true
    });

    // Create fixed-stops
    const fixedStopData = { status: 1, location: location._id };
    ([
      fixedStopDefaultZone, fixedStopDefaultZoneFar, fixedStopZoneA, fixedStopZoneB
    ] = await Promise.all([
      FixedStops.createFixedStop({ ...fixedStopInDefaultZone, ...fixedStopData }),
      FixedStops.createFixedStop({ ...furthestFixedStopInDefaultZone, ...fixedStopData }),
      FixedStops.createFixedStop({ ...fixedStopInZoneA, ...fixedStopData }),
      FixedStops.createFixedStop({ ...fixedStopInZoneB, ...fixedStopData })
    ]));

    await Zones.findOne({ location: location._id, isDefault: true });
    await createZone({
      location: location._id,
      serviceArea: zoneAServiceArea,
      name: 'Zone A',
      code: 'ZA',
      description: 'A zone that snaps to the location service area',
      fixedStopEnabled: true
    });
    await Zones.findOne({ location: location._id, name: 'Zone A' });
    await createZone({
      location: location._id,
      serviceArea: zoneBServiceArea,
      name: 'Zone B',
      code: 'ZB',
      description: 'A zone completely in zone A',
      fixedStopEnabled: true
    });
    await Zones.findOne({ location: location._id, name: 'Zone B' });
    await createZone({
      location: location._id,
      serviceArea: zoneCServiceArea,
      name: 'Zone C',
      code: 'ZC',
      description: 'A zone completely in the location service area',
      fixedStopEnabled: false
    });
    await Zones.findOne({ location: location._id, name: 'Zone C' });

    ({ riderToken, riderSocket } = await createRiderLogin(
      {}, app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
    ));

    const vehicle = await createGEMVehicle(
      false, location._id, { licensePlate: 'ABC-123', driverDump: true }
    );

    ({ driverToken, driverSocket } = await createDriverLogin(
      {
        locations: [location._id],
        currentLocation: { coordinates: pointDefaultZone.slice().reverse(), type: 'Point' },
        profilePicture: { imageUrl: 'url/driverPhoto.jpg' },
        vehicle
      },
      app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
    ));
  });
  describe('Fixed-stop / Door2door validation', () => {
    it('returns a fixed-stop inside Default zone', async () => {
      const [longitude, latitude] = pointDefaultZone;
      const { body: result } = await riderEndpoint(
        `/v1/stop?locationId=${location._id}&latitude=${latitude}&longitude=${longitude}`,
        'get', riderToken, app, request, domain
      );
      expect(result.isFixedStop).to.equal(true);
      expect(result.stop.latitude).to.not.equal(latitude);
      expect(result.stop.longitude).to.not.equal(longitude);
      expect(`${result.stop.id}`).to.equal(`${fixedStopDefaultZone._id}`);
      expect(result.stop.name).to.equal(fixedStopDefaultZone.name);
    });
    it('returns the furthest fixed-stop inside Default zone when closest already picked', async () => {
      const [longitude, latitude] = pointDefaultZone;
      const { body: result } = await riderEndpoint(
        `/v1/stop?locationId=${location._id}&latitude=${latitude}&longitude=${longitude}&selectedStop=${fixedStopDefaultZone._id}`,
        'get', riderToken, app, request, domain
      );
      expect(result.isFixedStop).to.equal(true);
      expect(result.stop.latitude).to.not.equal(latitude);
      expect(result.stop.longitude).to.not.equal(longitude);
      expect(`${result.stop.id}`).to.equal(`${fixedStopDefaultZoneFar._id}`);
      expect(result.stop.name).to.equal(fixedStopDefaultZoneFar.name);
    });
    it('returns a fixed-stop inside Zone A', async () => {
      const [longitude, latitude] = pointZoneA;
      const { body: result } = await riderEndpoint(
        `/v1/stop?locationId=${location._id}&latitude=${latitude}&longitude=${longitude}`,
        'get', riderToken, app, request, domain
      );
      expect(result.isFixedStop).to.equal(true);
      expect(result.stop.latitude).to.not.equal(latitude);
      expect(result.stop.longitude).to.not.equal(longitude);
      expect(`${result.stop.id}`).to.equal(`${fixedStopZoneA._id}`);
      expect(result.stop.name).to.equal(fixedStopZoneA.name);
    });
    it('returns a fixed-stop inside Zone B', async () => {
      const [longitude, latitude] = pointZoneB;
      const { body: result } = await riderEndpoint(
        `/v1/stop?locationId=${location._id}&latitude=${latitude}&longitude=${longitude}`,
        'get', riderToken, app, request, domain
      );
      expect(result.isFixedStop).to.equal(true);
      expect(result.stop.latitude).to.not.equal(latitude);
      expect(result.stop.longitude).to.not.equal(longitude);
      expect(`${result.stop.id}`).to.equal(`${fixedStopZoneB._id}`);
      expect(result.stop.name).to.equal(fixedStopZoneB.name);
    });
    it('returns door2door stop inside Zone C', async () => {
      const [longitude, latitude] = pointZoneC;
      const { body: result } = await riderEndpoint(
        `/v1/stop?locationId=${location._id}&latitude=${latitude}&longitude=${longitude}`,
        'get', riderToken, app, request, domain
      );
      expect(result.isFixedStop).to.equal(false);
      expect(result.stop.latitude).to.equal(latitude);
      expect(result.stop.longitude).to.equal(longitude);
      expect(result.stop.id).to.equal(undefined);
    });
    it('returns empty stop for coordinates outside location', async () => {
      const [longitude, latitude] = pointOutside;
      const { body: result, status } = await riderEndpoint(
        `/v1/stop?locationId=${location._id}&latitude=${latitude}&longitude=${longitude}`,
        'get', riderToken, app, request, domain
      );
      expect(result).to.eql({});
      expect(status).to.equal(200);
    });
  });
  describe('Mixed stop request', () => {
    it('allows request and completion of ride from Default zone fs to Zone C d2d', async () => {
      // POST /ride/request - creates request with correct stop type info
      const { body: pickupStop } = await riderEndpoint(
        `/v1/stop?locationId=${location._id}&latitude=${pointDefaultZone[1]}&longitude=${pointDefaultZone[0]}`,
        'get', riderToken, app, request, domain
      );
      const pickup = pickupStop.stop;
      expect(pickupStop).to.be.jsonSchema(dumpStopForRiderSchema);

      const { body: dropoffStop } = await riderEndpoint(
        `/v1/stop?locationId=${location._id}&latitude=${pointZoneC[1]}&longitude=${pointZoneC[0]}`,
        'get', riderToken, app, request, domain
      );
      const dropoff = dropoffStop.stop;
      expect(dropoffStop).to.be.jsonSchema(dumpStopForRiderSchema);

      const rideRequest = await createAnyStopRequest(
        riderToken,
        { ...pickup, fixedStopId: pickup.id }, { ...dropoff, fixedStopId: dropoff.id },
        location, app, request, domain
      );
      expect(rideRequest).to.be.jsonSchema(dumpRequestForRiderSchema);
      expect(rideRequest.origin.fixedStopId).to.equal(pickup.id);
      expect(rideRequest.origin.isFixedStop).to.equal(true);
      expect(rideRequest.destination.fixedStopId).to.equal(undefined);
      expect(rideRequest.destination.isFixedStop).to.equal(false);

      const requestData = await Requests.findOne({});
      expect(`${requestData.pickupFixedStopId}`).to.equal(`${fixedStopDefaultZone._id}`);
      expect(requestData.status).to.equal(100);
      expect(requestData.isPickupFixedStop).to.equal(true);
      expect(requestData.dropoffFixedStopId).to.equal(undefined);
      expect(requestData.isDropoffFixedStop).to.equal(false);

      // GET /requests - finds new request
      const { body: [requestInfo] } = await riderEndpoint(
        '/v1/requests',
        'get', riderToken, app, request, domain
      );
      expect(requestInfo).to.be.jsonSchema(dumpRequestForRiderSchema);

      // WS request-completed - matches request and creates ride with correct stop type info
      const wsRequestCompleted = await new Promise((res) => {
        riderSocket.on('request-completed', (newRide) => {
          riderSocket.off('request-completed');
          return res(newRide);
        });
        driverSearcher.search();
      });
      expect(wsRequestCompleted).to.be.jsonSchema(dumpRideForRiderSchema);
      expect(wsRequestCompleted.origin.fixedStopId).to.equal(pickup.id);
      expect(wsRequestCompleted.origin.isFixedStop).to.equal(true);
      expect(wsRequestCompleted.destination.fixedStopId).to.equal(undefined);
      expect(wsRequestCompleted.destination.isFixedStop).to.equal(false);
      expect(wsRequestCompleted.licensePlate).to.equal('ABC-123');
      expect(wsRequestCompleted.driverPhoto).to.equal('url/driverPhoto.jpg');

      // Send message
      await new Promise((res) => {
        driverSocket.on('ride-message-received', () => {
          driverSocket.off('ride-message-received');
          return res();
        });
        riderSocket.emit('ride-message', { ride: `${wsRequestCompleted.id}`, message: 'Ride message' });
      });

      const ride = await Rides.findOne({});
      expect(`${ride.pickupFixedStopId}`).to.equal(`${pickup.id}`);
      expect(ride.isPickupFixedStop).to.equal(true);
      expect(ride.dropoffFixedStopId).to.equal(undefined);
      expect(ride.isDropoffFixedStop).to.equal(false);
      expect(ride.isFixedStop).to.equal(true);
      expect(ride.requestMessages).to.have.lengthOf(1);

      // GET /rides/ride_id - finds new ride
      const { body: singleRideInfo } = await riderEndpoint(
        `/v1/rides/${ride._id}`,
        'get', riderToken, app, request, domain
      );
      expect(singleRideInfo).to.be.jsonSchema(dumpRideForRiderSchema);
      expect(singleRideInfo.origin.fixedStopId).to.equal(pickup.id);
      expect(singleRideInfo.origin.isFixedStop).to.equal(true);
      expect(singleRideInfo.destination.fixedStopId).to.equal(undefined);
      expect(singleRideInfo.destination.isFixedStop).to.equal(false);
      expect(singleRideInfo.requestMessages[0].message).to.equal('Ride message');
      expect(singleRideInfo.licensePlate).to.equal('ABC-123');
      expect(singleRideInfo.driverPhoto).to.equal('url/driverPhoto.jpg');

      // GET /current-ride - recovers ride
      const { body: currentRideInfo } = await riderEndpoint(
        '/v1/current-ride',
        'get', riderToken, app, request, domain
      );
      expect(currentRideInfo).to.be.jsonSchema(dumpRideForRiderSchema);
      expect(currentRideInfo.origin.fixedStopId).to.equal(pickup.id);
      expect(currentRideInfo.origin.isFixedStop).to.equal(true);
      expect(currentRideInfo.destination.fixedStopId).to.equal(undefined);
      expect(currentRideInfo.destination.isFixedStop).to.equal(false);
      expect(currentRideInfo.requestMessages[0].message).to.equal('Ride message');

      // WS ride-updates - gets correct ride updates
      const wsRideUpdates = await new Promise((res) => {
        riderSocket.on('ride-updates', (updatedRide) => {
          riderSocket.off('ride-updates');
          return res(updatedRide);
        });
        pickUp(driverToken, ride, app, request, domain);
      });
      expect(wsRideUpdates.ride).to.equal(`${ride._id}`);
      expect(wsRideUpdates.status).to.equal(300);

      // GET /rides - returns correct ride history
      await dropOff(driverToken, ride, app, request, domain);
      const { body: [rideHistory] } = await riderEndpoint(
        '/v1/rides',
        'get', riderToken, app, request, domain
      );
      expect(rideHistory).to.be.jsonSchema(dumpRideForRiderSchema);
      expect(rideHistory.origin.fixedStopId).to.equal(pickup.id);
      expect(rideHistory.origin.isFixedStop).to.equal(true);
      expect(rideHistory.destination.fixedStopId).to.equal(undefined);
      expect(rideHistory.destination.isFixedStop).to.equal(false);
      expect(rideHistory.requestMessages[0].message).to.equal('Ride message');
    });
  });
});
