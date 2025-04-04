import sinon from 'sinon';
import io from 'socket.io-client';
import { expect } from 'chai';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Locations, Settings, Zones, Requests
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createAdminLogin, adminEndpoint } from '../utils/admin';
import { createZone } from '../utils/location';
import { createRequest, createRiderLogin } from '../utils/rider';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;

let location;
let defaultZone;
let zoneA;
let zoneB;

let riderToken;

const locationServiceArea = [[
  [40.7132646, -73.5733125],
  [40.7247139, -73.4730622],
  [40.6627603, -73.4593293],
  [40.6486955, -73.5616395],
  [40.7132646, -73.5733125]
]];
const zoneAServiceArea = [[
  [40.6902437, -73.5554945],
  [40.6985013, -73.4853253],
  [40.6681543, -73.4744476],
  [40.6623055, -73.5530249],
  [40.6902437, -73.5554945]
]];
const zoneBServiceArea = [[
  [40.6829105, -73.5277867],
  [40.6839550, -73.5072208],
  [40.6771378, -73.5062026],
  [40.6746324, -73.5259483],
  [40.6829105, -73.5277867]
]];

const pointDefaultZone = [-73.5085338, 40.7053987, 'Default Zone St'];
const pointZoneA = [-73.5269619, 40.6886314, 'Zone A St'];
const pointZoneB = [-73.5192391, 40.6796784, 'Zone B St'];

describe('Zone detection in request', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    const riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    location = await Locations.createLocation({
      isActive: true,
      poolingEnabled: false,
      timezone: 'Europe/Lisbon',
      serviceArea: locationServiceArea[0].map(
        coord => ({ latitude: coord[1], longitude: coord[0] })
      )
    });
    await createZone({
      location: location._id,
      serviceArea: zoneAServiceArea,
      name: 'Zone A',
      description: 'Donut zone'
    });
    zoneA = await Zones.findOne({ location: location._id, name: 'Zone A' });
    await createZone({
      location: location._id,
      serviceArea: zoneBServiceArea,
      name: 'Zone B',
      code: 'ZB',
      description: 'Hole from the donut zone'
    });
    zoneB = await Zones.findOne({ location: location._id, name: 'Zone B' });

    const { adminToken } = await createAdminLogin(
      { locations: [location._id] }
    );

    // Create default zone
    await adminEndpoint(`/v1/locations/${location._id}`, 'get', adminToken, app, request, domain);
    defaultZone = await Zones.findOne({ location: location._id, isDefault: true });

    ({ riderToken } = await createRiderLogin(
      {}, app, request, domain, riderSocket
    ));
  });
  describe('Zones ride request', () => {
    beforeEach(async () => {
      sandbox.restore();

      await Locations.syncIndexes();
      await Zones.syncIndexes();
      await Requests.deleteMany();
    });
    describe('detectZone', () => {
      it('Creates request with pickup in Default Zone and dropoff in Zone A', async () => {
        await createRequest(
          riderToken, pointDefaultZone, pointZoneA, location._id, app, request, domain
        );
        const requestInfo = await Requests.findOne({});
        expect(requestInfo.pickupZone.name).to.equal(defaultZone.name);
        expect(`${requestInfo.pickupZone.id}`).to.equal(`${defaultZone._id}`);
        expect(requestInfo.dropoffZone.name).to.equal(zoneA.name);
        expect(`${requestInfo.dropoffZone.id}`).to.equal(`${zoneA._id}`);
      });
      it('Creates request with pickup in Zone A and dropoff in Zone B', async () => {
        await createRequest(
          riderToken, pointZoneA, pointZoneB, location._id, app, request, domain
        );
        const requestInfo = await Requests.findOne({});
        expect(requestInfo.pickupZone.name).to.equal(zoneA.name);
        expect(`${requestInfo.pickupZone.id}`).to.equal(`${zoneA._id}`);
        expect(requestInfo.dropoffZone.name).to.equal(zoneB.name);
        expect(`${requestInfo.dropoffZone.id}`).to.equal(`${zoneB._id}`);
      });
      it('Creates request with pickup and dropoff in Zone A', async () => {
        await createRequest(
          riderToken, pointZoneA, pointZoneA, location._id, app, request, domain
        );
        const requestInfo = await Requests.findOne({});
        expect(requestInfo.pickupZone.name).to.equal(zoneA.name);
        expect(`${requestInfo.pickupZone.id}`).to.equal(`${zoneA._id}`);
        expect(requestInfo.dropoffZone.name).to.equal(zoneA.name);
        expect(`${requestInfo.dropoffZone.id}`).to.equal(`${zoneA._id}`);
      });
      it('Creates request with pickup and dropoff in Zone B', async () => {
        await createRequest(
          riderToken, pointZoneB, pointZoneB, location._id, app, request, domain
        );
        const requestInfo = await Requests.findOne({});
        expect(requestInfo.pickupZone.name).to.equal(zoneB.name);
        expect(`${requestInfo.pickupZone.id}`).to.equal(`${zoneB._id}`);
        expect(requestInfo.dropoffZone.name).to.equal(zoneB.name);
        expect(`${requestInfo.dropoffZone.id}`).to.equal(`${zoneB._id}`);
      });
    });
  });
});
