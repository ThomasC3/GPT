import sinon from 'sinon';
import { expect } from 'chai';
import request from 'supertest-promised';
import app from '../../server';
import { domain } from '../../config';
import {
  Locations, Settings, Zones
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { adminEndpoint, createAdminLogin } from '../utils/admin';

let sandbox;

let adminSessionResponse;

let developerToken;

let location1;
let zoneA;

const locationInfo = {
  isUsingServiceTimes: false,
  isActive: true,
  poolingEnabled: true,
  timezone: 'Europe/Lisbon',
  stateCode: 'NY',
  locationCode: 'NY0001',
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
  ],
  advertisement: {
    ageRestriction: 80,
    imageUrl: 'image.png',
    url: 'http://www.ridecircuit.com'
  }
};

const zoneServiceArea = [[
  [40.6902437, -73.5554945],
  [40.6985013, -73.4853253],
  [40.6681543, -73.4744476],
  [40.6623055, -73.5530249],
  [40.6902437, -73.5554945]
]];

const defaultZoneInfo = {
  description: 'My test zone',
  serviceArea: zoneServiceArea
};

describe('Zones Payment', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    adminSessionResponse = await createAdminLogin();
    developerToken = adminSessionResponse.adminToken;
  });

  beforeEach(async () => {
    sandbox.restore();

    await Locations.syncIndexes();
  });

  describe('Add payment to zones creation /locations/:id/zones ', () => {
    beforeEach(async () => {
      await Zones.deleteMany({});
      await Locations.deleteMany({});
      location1 = await Locations.createLocation({
        name: 'Location',
        ...locationInfo
      });
    });
    it('should accept payment information during zone creation', async () => {
      const res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones`,
        'post',
        developerToken,
        app,
        request,
        domain,
        {
          ...defaultZoneInfo,
          name: 'Test Zone 1',
          code: 'RANDOM_CODE_1',
          paymentEnabled: true,
          paymentInformation: {
            ridePrice: 100,
            currency: 'usd',
            capEnabled: true,
            priceCap: 200,
            pricePerHead: 12
          }
        }
      );
      expect(res.status).to.equal(200);
      expect(res.body.paymentEnabled).to.equal(true);
      expect(res.body.paymentInformation).to.deep.equal({
        ridePrice: 100,
        currency: 'usd',
        capEnabled: true,
        priceCap: 200,
        pricePerHead: 12
      });
    });
    it('should accept pwyw information during zone creation', async () => {
      const res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones`,
        'post',
        developerToken,
        app,
        request,
        domain,
        {
          ...defaultZoneInfo,
          name: 'Test Zone 2',
          code: 'RANDOM_CODE_2',
          pwywEnabled: true,
          pwywInformation: {
            pwywOptions: [0, 100, '200'],
            maxCustomValue: 1000,
            currency: 'usd'
          }
        }
      );
      expect(res.status).to.equal(200);
      expect(res.body.pwywEnabled).to.equal(true);
      expect(res.body.pwywInformation).to.deep.equal({
        pwywOptions: [0, 100, 200],
        maxCustomValue: 1000,
        currency: 'usd'
      });
    });
    it('should accept no payment info during zone creation', async () => {
      const res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones`,
        'post',
        developerToken,
        app,
        request,
        domain,
        {
          ...defaultZoneInfo,
          name: 'Test Zone 2',
          code: 'RANDOM_CODE_2'
        }
      );
      expect(res.status).to.equal(200);
      expect(res.body.paymentEnabled).to.equal(false);
    });
  });

  describe('Add payment information to zones update', () => {
    before(async () => {
      await Zones.deleteMany({});
      await Locations.deleteMany({});
      location1 = await Locations.createLocation({
        name: 'Location',
        ...locationInfo
      });
      zoneA = await Zones.createZone(
        {
          ...defaultZoneInfo,
          name: 'Test Zone 1',
          code: 'RANDOM_CODE_1'
        },
        location1._id
      );
    });
    it('should not be able to add payment information to default zone', async () => {
      const defaultZone = await Zones.createZone(
        {
          ...defaultZoneInfo,
          code: 'DEFAULT',
          name: 'Default',
          isDefault: true
        },
        location1._id
      );
      expect(defaultZone.isDefault).to.equal(true);
      const res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${defaultZone._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          paymentEnabled: true,
          paymentInformation: {
            ridePrice: 100,
            currency: 'usd',
            capEnabled: 'true',
            priceCap: 200,
            pricePerHead: 12
          }
        }
      );
      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal('Default zone cannot be updated');
    });
    it('400 "ridePrice" must be a number', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zoneA._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          paymentEnabled: true,
          paymentInformation: {
            ridePrice: 'null'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(
        response.body.message,
        '"ridePrice" must be a number'
      );
    });

    it('400 "currency" with value "eur" fails to match the required pattern: /^usd$/', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zoneA._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          paymentEnabled: true,
          paymentInformation: {
            ridePrice: 1,
            currency: 'eur'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(
        response.body.message,
        '"currency" with value "eur" fails to match the required pattern: /^usd$/'
      );
    });

    it('400 "capEnabled" missing required peer "priceCap"', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zoneA._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          paymentEnabled: true,
          paymentInformation: {
            ridePrice: 100,
            currency: 'usd',
            capEnabled: 'true'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(
        response.body.message,
        '"capEnabled" missing required peer "priceCap"'
      );
    });

    it('200 OK with paymentInfo', async () => {
      let response = {};
      const paymentInfo = {
        ridePrice: 100,
        currency: 'usd',
        capEnabled: true,
        priceCap: 200,
        pricePerHead: 12
      };
      response = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zoneA._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          paymentEnabled: true,
          paymentInformation: paymentInfo
        }
      );
      expect(response.status).to.equal(200);
      expect(response.body.name).to.equal(zoneA.name);
      expect(response.body.paymentEnabled).to.equal(true);
      expect(response.body.paymentInformation).to.deep.equal(paymentInfo);
    });
    it('200 OK with pwywInfo', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zoneA._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          pwywEnabled: true,
          pwywInformation: {
            pwywOptions: [0, 100, '200'],
            maxCustomValue: 1000,
            currency: 'usd'
          }
        }
      );

      sinon.assert.match(response.status, 200);
      const result = [
        response.body.name,
        response.body.pwywEnabled,
        response.body.pwywInformation.pwywOptions,
        response.body.pwywInformation.maxCustomValue
      ];
      return sinon.assert.match(result, [
        zoneA.name,
        true,
        [0, 100, 200],
        1000
      ]);
    });

    it('200 OK with pwywInfo and max as string', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zoneA._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          pwywEnabled: true,
          pwywInformation: {
            pwywOptions: [0, 100, '200'],
            maxCustomValue: '1000',
            currency: 'usd'
          }
        }
      );

      sinon.assert.match(response.status, 200);
      const result = [
        response.body.name,
        response.body.timezone,
        response.body.pwywEnabled,
        response.body.pwywInformation.pwywOptions,
        response.body.pwywInformation.maxCustomValue
      ];
      return sinon.assert.match(result, [
        zoneA.name,
        zoneA.timezone,
        true,
        [0, 100, 200],
        1000
      ]);
    });

    it('400 - without pwyw info but enabled - "pwywOptions" must contain at least 3 items', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zoneA._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          pwywEnabled: true
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(
        response.body.message,
        '"pwywOptions" must contain at least 3 items'
      );
    });

    it('400 - only 3 values - "pwywOptions" must contain at least 3 items', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zoneA._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          pwywEnabled: true,
          pwywInformation: {
            pwywOptions: [200, 100],
            maxCustomValue: 1000,
            currency: 'usd'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(
        response.body.message,
        '"pwywOptions" must contain at least 3 items'
      );
    });
    it('400 - last value as empty string - "pwywOptions[2]" must be a number', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zoneA._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          pwywEnabled: true,
          pwywInformation: {
            pwywOptions: [100, 300, ''],
            maxCustomValue: 1000,
            currency: 'usd'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(
        response.body.message,
        '"pwywOptions[2]" must be a number'
      );
    });
    it('400 - 2nd value < 1st value - "pwywOptions" must be sorted in ascending order by value', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          pwywEnabled: true,
          pwywInformation: {
            pwywOptions: [100, 300, 200],
            maxCustomValue: 1000,
            currency: 'usd'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(
        response.body.message,
        '"pwywOptions" must be sorted in ascending order by value'
      );
    });
  });
});
