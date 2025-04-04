import sinon from 'sinon';
import request from 'supertest-promised';
import app from '../../server';
import { domain } from '../../config';
import { createAdminLogin, adminEndpoint } from '../utils/admin';
import {
  Locations, FixedStops
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

let sandbox;
let location;

let fixedStopData;
let developer;

const keyLoc = {
  fs1: { name: 'Fixed stop 1', lat: 40.680806, lng: -73.902878 },
  fs2: { name: 'Fixed stop 2', lat: 42.680806, lng: -73.902878 },
  fs3: { name: 'Fixed stop 3', lat: 40.680806, lng: -73.902878 },
  fs4: { name: 'Fixed stop 4', lat: 40.680806, lng: -73.902878 },
  fs5: { name: 'Fixed stop 5', lat: 40.680807, lng: -73.902879 },
  fs6: { name: 'Fixed stop 6', lat: 40.680806, lng: -73.902878 }
};

describe('Fixed stop requests', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();

    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      serviceArea: [
        {
          longitude: -73.978573,
          latitude: 40.721239
        },
        {
          longitude: -73.882936,
          latitude: 40.698337
        },
        {
          longitude: -73.918642,
          latitude: 40.629585
        },
        {
          longitude: -73.978573,
          latitude: 40.660845
        },
        {
          longitude: -73.978573,
          latitude: 40.721239
        }
      ]
    });

    developer = await createAdminLogin({ role: 'Developer' });

    fixedStopData = {
      status: 1,
      businessName: 'Coca-cola',
      address: 'Here'
    };
  });

  after(async () => { });

  beforeEach(async () => {
    sandbox.restore();

    await FixedStops.deleteMany();
  });

  describe('Admin fixed stops', () => {
    it('Should create a fixed stop', async () => {
      const fixedStopPayload = { location: location._id, ...keyLoc.fs1, ...fixedStopData };
      await adminEndpoint('/v1/fixed-stops', 'post', developer.adminToken, app, request, domain, fixedStopPayload);
      const fixedStop = await FixedStops.findOne({ name: fixedStopPayload.name });

      return sinon.assert.match(fixedStop.name, 'Fixed stop 1');
    });
    it('Should not create a fixed stop if outside service area', async () => {
      const fixedStopPayload = { location: location._id, ...keyLoc.fs2, ...fixedStopData };
      await adminEndpoint('/v1/fixed-stops', 'post', developer.adminToken, app, request, domain, fixedStopPayload);
      const fixedStop = await FixedStops.findOne({ name: fixedStopPayload.name });

      return sinon.assert.match(fixedStop, null);
    });
    it('Should update a fixed stop', async () => {
      const fixedStopPayload = { location: location._id, ...keyLoc.fs3, ...fixedStopData };
      await adminEndpoint('/v1/fixed-stops', 'post', developer.adminToken, app, request, domain, fixedStopPayload);
      let fixedStop = await FixedStops.findOne({ name: 'Fixed stop 3' });

      fixedStopPayload.name = 'Fixed stop 3 updated';
      await adminEndpoint(`/v1/fixed-stops/${fixedStop._id}`, 'put', developer.adminToken, app, request, domain, fixedStopPayload);

      fixedStop = await FixedStops.findOne({ name: 'Fixed stop 3 updated' });

      return sinon.assert.match(!!fixedStop, true);
    });

    it('Should delete a fixed stop', async () => {
      const fixedStopPayload = { location: location._id, ...keyLoc.fs4, ...fixedStopData };
      await adminEndpoint('/v1/fixed-stops', 'post', developer.adminToken, app, request, domain, fixedStopPayload);
      let fixedStop = await FixedStops.findOne({ name: 'Fixed stop 4' });
      sinon.assert.match(fixedStop.isDeleted, false);

      await adminEndpoint(`/v1/fixed-stops/${fixedStop._id}`, 'delete', developer.adminToken, app, request, domain);

      fixedStop = await FixedStops.findOne({ name: 'Fixed stop 4' });

      return sinon.assert.match(fixedStop.isDeleted, true);
    });
    it('Should list fixed stops in a location and sort by name', async () => {
      await FixedStops.createFixedStop({ location: location._id, ...keyLoc.fs6, ...fixedStopData });
      const fs5 = await FixedStops.createFixedStop(
        { location: location._id, ...keyLoc.fs5, ...fixedStopData }
      );
      const {
        body: fixedStopList
      } = await adminEndpoint(`/v1/locations/${location._id}/fixed-stops`, 'get', developer.adminToken, app, request, domain);

      sinon.assert.match(fixedStopList.length, 2);
      sinon.assert.match(fixedStopList[0].name, 'Fixed stop 5');
      sinon.assert.match(fixedStopList[0].lng, -73.902879);
      sinon.assert.match(fixedStopList[0].longitude, undefined);
      sinon.assert.match(fixedStopList[0].lat, 40.680807);
      sinon.assert.match(fixedStopList[0].latitude, undefined);
      sinon.assert.match(fixedStopList[0].status, 1);
      sinon.assert.match(fixedStopList[0].businessName, 'Coca-cola');
      sinon.assert.match(fixedStopList[0].address, 'Here');
      sinon.assert.match(fixedStopList[0].isDeleted, false);
      sinon.assert.match(String(fixedStopList[0].id), String(fs5._id));
      return sinon.assert.match(fixedStopList[1].name, 'Fixed stop 6');
    });
  });
});
