import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
// eslint-disable-next-line no-unused-vars
import app from '../server';
import { Locations, Zones, FixedStops } from '../models';
import { createZone } from './utils/location';
import { emptyAllCollections } from './utils/helper';
import { FixedStopNotFoundError } from '../errors';

chai.use(chaiAsPromised);
const { expect } = chai;

let location;
let defaultZone;
let zoneA;
let zoneB;
let zoneC;
let fixedStopDefaultZone;
let fixedStopZoneA;
let fixedStopZoneB;

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

const fixedStopInDefaultZone = { name: 'FS Default', lng: 3.3555508, lat: 6.6560824 };
const fixedStopInZoneA = { name: 'FS Zone A', lng: 3.3673096, lat: 6.6351952 };
const fixedStopInZoneB = { name: 'FS Zone B', lng: 3.3852924, lat: 6.6454724 };

describe('Zones model', () => {
  before(async () => {
    await emptyAllCollections();
    location = await Locations.createLocation({
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
      fixedStopDefaultZone, fixedStopZoneA, fixedStopZoneB
    ] = await Promise.all([
      FixedStops.createFixedStop({ ...fixedStopInDefaultZone, ...fixedStopData }),
      FixedStops.createFixedStop({ ...fixedStopInZoneA, ...fixedStopData }),
      FixedStops.createFixedStop({ ...fixedStopInZoneB, ...fixedStopData })
    ]));

    defaultZone = await Zones.findOne({ location: location._id, isDefault: true });
    await createZone({
      location: location._id,
      serviceArea: zoneAServiceArea,
      name: 'Zone A',
      code: 'ZA',
      description: 'A zone that snaps to the location service area',
      fixedStopEnabled: true
    });
    zoneA = await Zones.findOne({ location: location._id, name: 'Zone A' });
    await createZone({
      location: location._id,
      serviceArea: zoneBServiceArea,
      name: 'Zone B',
      code: 'ZB',
      description: 'A zone completely in zone A',
      fixedStopEnabled: true
    });
    zoneB = await Zones.findOne({ location: location._id, name: 'Zone B' });
    await createZone({
      location: location._id,
      serviceArea: zoneCServiceArea,
      name: 'Zone C',
      code: 'ZC',
      description: 'A zone completely in the location service area',
      fixedStopEnabled: false
    });
    zoneC = await Zones.findOne({ location: location._id, name: 'Zone C' });
  });
  describe('Zone detection - detectZone', () => {
    it('detects point within Default Zone', async () => {
      const zone = await Zones.detectZone(
        location._id,
        { latitude: pointDefaultZone[1], longitude: pointDefaultZone[0] }
      );
      expect(`${zone.name}`).to.equal(`${defaultZone.name}`);
      expect(`${zone._id}`).to.equal(`${defaultZone._id}`);
    });
    it('detects point within Zone A', async () => {
      const zone = await Zones.detectZone(
        location._id,
        { latitude: pointZoneA[1], longitude: pointZoneA[0] }
      );
      expect(`${zone.name}`).to.equal(`${zoneA.name}`);
      expect(`${zone._id}`).to.equal(`${zoneA._id}`);
    });
    it('detects point within Zone B', async () => {
      const zone = await Zones.detectZone(
        location._id,
        { latitude: pointZoneB[1], longitude: pointZoneB[0] }
      );
      expect(`${zone.name}`).to.equal(`${zoneB.name}`);
      expect(`${zone._id}`).to.equal(`${zoneB._id}`);
    });
    it('detects point within Zone C', async () => {
      const zone = await Zones.detectZone(
        location._id,
        { latitude: pointZoneC[1], longitude: pointZoneC[0] }
      );
      expect(`${zone.name}`).to.equal(`${zoneC.name}`);
      expect(`${zone._id}`).to.equal(`${zoneC._id}`);
    });
  });
  describe('Closest fixed-stop - getClosestFixedStop', () => {
    it('returns a fixed-stop inside Default zone', async () => {
      const stop = await Zones.getClosestFixedStop(
        defaultZone._id,
        { latitude: pointDefaultZone[1], longitude: pointDefaultZone[0] }
      );
      expect(stop.name).to.equal(fixedStopDefaultZone.name);
    });
    it('returns a fixed-stop inside Zone A', async () => {
      const stop = await Zones.getClosestFixedStop(
        zoneA._id,
        { latitude: pointZoneA[1], longitude: pointZoneA[0] }
      );
      expect(stop.name).to.equal(fixedStopZoneA.name);
    });
    it('returns a fixed-stop inside Zone B', async () => {
      const stop = await Zones.getClosestFixedStop(
        zoneB._id,
        { latitude: pointZoneB[1], longitude: pointZoneB[0] }
      );
      expect(stop.name).to.equal(fixedStopZoneB.name);
    });
    it('returns an error for no fixed-stops in Zone C', async () => {
      await expect(Zones.getClosestFixedStop(
        zoneC._id,
        { latitude: pointZoneC[1], longitude: pointZoneC[0] }
      )).to.be.rejectedWith(FixedStopNotFoundError, 'Stop not found.');
    });
  });
});
