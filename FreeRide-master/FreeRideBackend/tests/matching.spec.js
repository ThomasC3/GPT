import { expect } from 'chai';
import request from 'supertest-promised';
import io from 'socket.io-client';
// eslint-disable-next-line no-unused-vars
import app from '../server';
import { domain, port } from '../config';
import { emptyAllCollections } from './utils/helper';
import {
  Locations, Zones, Requests, Rides, Drivers, Routes, Settings, Jobs
} from '../models';
import { createZone } from './utils/location';
import { createDriverLogin } from './utils/driver';
import { createGEMVehicle, createMatchingRules } from './utils/vehicle';
import { createRiderLogin, createRequest } from './utils/rider';
import driverSearcher from '../services/driverSearch';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let location;
let defaultZone;
let zoneA;
let zoneB;
let drivers;
let rider;
let job;

const locationServiceArea = [[
  [-73.5733125, 40.7132646],
  [-73.4730622, 40.7247139],
  [-73.4593293, 40.6627603],
  [-73.5616395, 40.6486955],
  [-73.5733125, 40.7132646]
]];
const zoneAServiceArea = [[
  [-73.5554945, 40.6902437],
  [-73.4853253, 40.6985013],
  [-73.4744476, 40.6681543],
  [-73.5530249, 40.6623055],
  [-73.5554945, 40.6902437]
]];
const zoneBServiceArea = [[
  [-73.5277867, 40.6829105],
  [-73.5072208, 40.683955],
  [-73.5062026, 40.6771378],
  [-73.5259483, 40.6746324],
  [-73.5277867, 40.6829105]
]];

const pointDefaultZone = [-73.5085338, 40.7053987].slice().reverse();
const pointZoneA = [-73.5269619, 40.6886314].slice().reverse();
const pointZoneB = [-73.5192391, 40.6796784].slice().reverse();

describe('Matching', () => {
  before(async () => {
    await emptyAllCollections();

    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await Locations.createLocation({
      name: 'Zone location',
      isActive: true,
      fleetEnabled: true,
      poolingEnabled: false,
      timezone: 'Europe/Lisbon',
      locationCode: 'LC001',
      serviceArea: locationServiceArea[0].map(
        coord => ({ latitude: coord[1], longitude: coord[0] })
      )
    });
    defaultZone = await Zones.findOne({ location: location._id, isDefault: true });
    await createZone({
      location: location._id,
      serviceArea: zoneAServiceArea,
      name: 'Zone A',
      description: 'Donut zone',
      code: 'ZA'
    });
    zoneA = await Zones.findOne({ location: location._id, name: 'Zone A' });
    await createZone({
      location: location._id,
      serviceArea: zoneBServiceArea,
      name: 'Zone B',
      description: 'Hole from the donut zone',
      code: 'ZB'
    });
    zoneB = await Zones.findOne({ location: location._id, name: 'Zone B' });

    await createMatchingRules();

    const isADA = false;
    const matchingRules = [
      { matchingRule: 'locked', zones: [zoneA] },
      { matchingRule: 'locked', zones: [zoneB] },
      { matchingRule: 'locked', zones: [zoneA, defaultZone] },
      { matchingRule: 'locked', zones: [defaultZone] },
      { matchingRule: 'priority', zones: [zoneA] },
      { matchingRule: 'priority', zones: [zoneB] },
      { matchingRule: 'priority', zones: [defaultZone] },
      { matchingRule: 'exclusive', zones: [zoneA] },
      { matchingRule: 'exclusive', zones: [zoneB] },
      { matchingRule: 'exclusive', zones: [defaultZone] },
      { matchingRule: 'shared', zones: [] }
    ];

    job = await Jobs.createJob({
      code: 'LC001-ABCT',
      location: `${location._id}`,
      locationCode: location.locationCode,
      clientCode: 'ABC',
      typeCode: 'T',
      active: true
    });

    const profile = 'gem';
    const fallbackProfile = 'gem_sa';

    const vehicles = await Promise.all(
      matchingRules.map(matchingRule => createGEMVehicle(
        isADA, location._id, {
          ...matchingRule,
          driverDump: true,
          jobs: [job._id],
          profile,
          fallbackProfile
        }
      ))
    );

    const driverInfo = {
      isOnline: true,
      isAvailable: true,
      locations: [location._id],
      currentLocation: {
        coordinates: pointDefaultZone.slice().reverse(),
        type: 'Point'
      },
      activeLocation: location._id
    };

    const driverDisplayNames = [
      'Locked with origin',
      'Locked with destination',
      'Locked with origin and destination',
      'Locked with neither',
      'Priority with origin',
      'Priority with destination',
      'Priority with neither',
      'Exclusive with origin',
      'Exclusive with destination',
      'Exclusive with neither',
      'Shared'
    ];

    drivers = await Promise.all(
      vehicles.map((vehicle, idx) => createDriverLogin(
        {
          ...driverInfo, email: `driver_${idx + 1}@mail.com`, displayName: driverDisplayNames[idx], vehicle
        },
        app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)
      ))
    );

    rider = await createRiderLogin({}, app, request, domain, io.connect(`http://localhost:${port}`, ioOptions));
  });
  beforeEach(async () => {
    await Requests.deleteMany();
    await Rides.deleteMany();
    await Routes.deleteMany();
    await Rides.deleteMany();

    await Drivers.updateMany(
      { _id: { $in: drivers.map(item => item.driver._id) } },
      {
        $set: {
          driverRideList: [],
          isAvailable: true,
          currentLocation: {
            coordinates: pointDefaultZone.slice().reverse(),
            type: 'Point'
          }
        }
      }
    );
  });
  describe('Without pooling', () => {
    before(async () => {
      await Locations.findOneAndUpdate({ }, { $set: { poolingEnabled: false } });
    });
    it('Should create ride with correct format', async () => {
      await createRequest(
        rider.riderToken, pointZoneA, pointZoneA, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(ride.vehicle.jobs).to.have.lengthOf(1);
      expect(`${ride.vehicle.jobs[0]}`).to.equal(`${job._id}`);
    });
    it('Should match with first bucket (locked) if request is in same zone', async () => {
      await Drivers.findOneAndUpdate({ displayName: 'Locked with origin and destination' }, { $set: { isAvailable: false } });
      await createRequest(
        rider.riderToken, pointZoneA, pointZoneA, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(ride.driverDisplayName).to.equal('Locked with origin');
    });
    it('Should match with first bucket (locked) if request is in two zones assigned to locked', async () => {
      await createRequest(
        rider.riderToken, pointZoneA, pointDefaultZone, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(ride.driverDisplayName).to.equal('Locked with origin and destination');
    });
    describe('Should match with second bucket (priority/exclusive with origin) if request is not in the same zone', () => {
      it('with an exclusive vehicle if no priority vehicles are available', async () => {
        await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
        await createRequest(
          rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
        );
        await driverSearcher.search();
        const ride = await Rides.findOne({});
        expect(ride.driverDisplayName).to.equal('Exclusive with origin');
      });
      it('with a priority vehicle if no exclusive vehicles are available', async () => {
        await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
        await createRequest(
          rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
        );
        await driverSearcher.search();
        const ride = await Rides.findOne({});
        expect(ride.driverDisplayName).to.equal('Priority with origin');
      });
    });
    describe('Should match with third bucket (priority/exclusive with destination) if previous not available', () => {
      it('with an exclusive vehicle if no priority vehicles are available', async () => {
        await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
        await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
        await Drivers.findOneAndUpdate({ displayName: 'Priority with destination' }, { $set: { isAvailable: false } });
        await createRequest(
          rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
        );
        await driverSearcher.search();
        const ride = await Rides.findOne({});
        expect(ride.driverDisplayName).to.equal('Exclusive with destination');
      });
      it('with a priority vehicle if no exclusive vehicles are available', async () => {
        await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
        await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
        await Drivers.findOneAndUpdate({ displayName: 'Exclusive with destination' }, { $set: { isAvailable: false } });
        await createRequest(
          rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
        );
        await driverSearcher.search();
        const ride = await Rides.findOne({});
        expect(ride.driverDisplayName).to.equal('Priority with destination');
      });
    });
    it('Should match with fourth bucket (shared) if previous not available', async () => {
      await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Priority with destination' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with destination' }, { $set: { isAvailable: false } });
      await createRequest(
        rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(ride.driverDisplayName).to.equal('Shared');
    });
    it('Should match with fifth bucket (priority with neither) if previous not available', async () => {
      await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Priority with destination' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with destination' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Shared' }, { $set: { isAvailable: false } });
      await createRequest(
        rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(ride.driverDisplayName).to.equal('Priority with neither');
    });
    it('Should be missed if no drivers that fit vehicle call order are available', async () => {
      await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Priority with destination' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with destination' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Shared' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Priority with neither' }, { $set: { isAvailable: false } });
      const availableDriverCount = await Drivers.find({ isAvailable: true }).countDocuments();
      await createRequest(
        rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(availableDriverCount).to.equal(5);
      expect(ride).to.equal(null);
    });
  });
  describe('With pooling', () => {
    before(async () => {
      await Locations.findOneAndUpdate({}, { $set: { poolingEnabled: true } });
    });
    it('Should match with first bucket (locked) if request is in same zone', async () => {
      await Drivers.findOneAndUpdate({ displayName: 'Locked with origin and destination' }, { $set: { isAvailable: false } });
      await createRequest(
        rider.riderToken, pointZoneA, pointZoneA, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(ride.driverDisplayName).to.equal('Locked with origin');
      expect(ride.vehicle.profile).to.equal('euclidean');
    });
    it('Should match with first bucket (locked) if request is in two zones assigned to locked', async () => {
      await createRequest(
        rider.riderToken, pointZoneA, pointDefaultZone, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(ride.driverDisplayName).to.equal('Locked with origin and destination');
    });
    describe('Should match with second bucket (priority/exclusive with origin) if request is not in the same zone', () => {
      it('with an exclusive vehicle if no priority vehicles are available', async () => {
        await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
        await createRequest(
          rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
        );
        await driverSearcher.search();
        const ride = await Rides.findOne({});
        expect(ride.driverDisplayName).to.equal('Exclusive with origin');
      });
      it('with a priority vehicle if no exclusive vehicles are available', async () => {
        await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
        await createRequest(
          rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
        );
        await driverSearcher.search();
        const ride = await Rides.findOne({});
        expect(ride.driverDisplayName).to.equal('Priority with origin');
      });
    });
    describe('Should match with third bucket (priority/exclusive with destination) if previous not available', () => {
      it('with an exclusive vehicle if no priority vehicles are available', async () => {
        await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
        await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
        await Drivers.findOneAndUpdate({ displayName: 'Priority with destination' }, { $set: { isAvailable: false } });
        await createRequest(
          rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
        );
        await driverSearcher.search();
        const ride = await Rides.findOne({});
        expect(ride.driverDisplayName).to.equal('Exclusive with destination');
      });
      it('with a priority vehicle if no exclusive vehicles are available', async () => {
        await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
        await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
        await Drivers.findOneAndUpdate({ displayName: 'Exclusive with destination' }, { $set: { isAvailable: false } });
        await createRequest(
          rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
        );
        await driverSearcher.search();
        const ride = await Rides.findOne({});
        expect(ride.driverDisplayName).to.equal('Priority with destination');
      });
    });
    it('Should match with fourth bucket (shared) if previous not available', async () => {
      await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Priority with destination' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with destination' }, { $set: { isAvailable: false } });
      await createRequest(
        rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(ride.driverDisplayName).to.equal('Shared');
    });
    it('Should match with fifth bucket (priority with neither) if previous not available', async () => {
      await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Priority with destination' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with destination' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Shared' }, { $set: { isAvailable: false } });
      await createRequest(
        rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(ride.driverDisplayName).to.equal('Priority with neither');
    });
    it('Should be missed if no drivers that fit vehicle call order are available', async () => {
      await Drivers.findOneAndUpdate({ displayName: 'Priority with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with origin' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Priority with destination' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Exclusive with destination' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Shared' }, { $set: { isAvailable: false } });
      await Drivers.findOneAndUpdate({ displayName: 'Priority with neither' }, { $set: { isAvailable: false } });
      const availableDriverCount = await Drivers.find({ isAvailable: true }).countDocuments();
      await createRequest(
        rider.riderToken, pointZoneA, pointZoneB, location, app, request, domain
      );
      await driverSearcher.search();
      const ride = await Rides.findOne({});
      expect(availableDriverCount).to.equal(5);
      expect(ride).to.equal(null);
    });
  });
});
