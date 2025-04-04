import sinon from 'sinon';
import { expect } from 'chai';
import request from 'supertest-promised';
import mongoose from 'mongoose';
import app from '../../server';
import { domain } from '../../config';
import {
  Locations, Settings, Zones, PaymentPolicies
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import {
  adminEndpoint,
  createAdminLogin
} from '../utils/admin';
import { sleep } from '../../utils/ride';
import { createGEMVehicle } from '../utils/vehicle';
import { createMultipleZones } from '../utils/location';
import { getAdminLocations } from '../../middlewares/admin/utils/location';
import { auth0ClientInstance } from '../../middlewares/admin/utils/Auth0Client';

let sandbox;

let adminSessionResponse;

let developerToken;

let location1;
let location2;
let location3;
let location4;

let zoneA;
let zoneB;
let zoneC;

let defaultLocationInfo;
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
  ]
};

const testZoneServiceArea = [[[0, 1], [0, 2], [1, 1], [0, 1]]];
const updatedTestZoneServiceArea = [[[0, 2], [0, 3], [1, 2], [0, 2]]];
const zoneInfo1 = {
  name: 'Test Zone', description: 'My test zone', code: 'NRKEJN43', serviceArea: testZoneServiceArea
};
const zoneInfo2 = {
  name: 'Test Zone 2', description: 'My test zone', code: 'JNCKOIAO23', serviceArea: testZoneServiceArea
};

describe('getAdminLocations', () => {
  let findStub;
  let selectStub;
  sandbox = sinon.createSandbox();

  beforeEach(() => {
    selectStub = sandbox.stub();
    findStub = sandbox.stub(Locations, 'find').returns({ select: selectStub });
  });

  afterEach(() => {
    sandbox.restore();
  });

  const mockLocations = [
    { _id: new mongoose.Types.ObjectId(), name: 'Location 1', timezone: 'UTC' },
    { _id: new mongoose.Types.ObjectId(), name: 'Location 2', timezone: 'EST' }
  ];

  it('should return all requested locations for admin with all:locations permission', async () => {
    const admin = {
      permissions: ['all:locations'],
      locations: []
    };
    const requestedLocations = [mockLocations[0]._id, mockLocations[1]._id];

    selectStub.resolves(mockLocations);

    const result = await getAdminLocations(admin, requestedLocations);

    expect(findStub.calledOnceWith({ _id: { $in: requestedLocations } })).to.equal(true);
    expect(result).to.deep.equal(mockLocations);
  });

  it('should return only permitted requested locations for admin without all:locations permission', async () => {
    const admin = {
      permissions: [],
      locations: [mockLocations[0]._id.toString()]
    };
    const requestedLocations = [mockLocations[0]._id, mockLocations[1]._id];

    selectStub.resolves([mockLocations[0]]);

    const result = await getAdminLocations(admin, requestedLocations);

    expect(findStub.calledOnceWith({ _id: { $in: [mockLocations[0]._id] } })).to.equal(true);
    expect(result).to.deep.equal([mockLocations[0]]);
  });

  it('should return all admin locations when no locations are requested and admin does not have all:locations permission', async () => {
    const admin = {
      permissions: [],
      locations: [mockLocations[0]._id.toString(), mockLocations[1]._id.toString()]
    };

    selectStub.resolves(mockLocations);

    const result = await getAdminLocations(admin);

    expect(findStub.calledOnceWith({ _id: { $in: admin.locations } })).to.equal(true);
    expect(result).to.deep.equal(mockLocations);
  });

  it('should return an empty array when admin has no permissions and no locations', async () => {
    const admin = {
      permissions: [],
      locations: []
    };

    selectStub.resolves([]);

    const result = await getAdminLocations(admin);

    expect(findStub.calledOnceWith({ _id: { $in: [] } })).to.equal(true);
    expect(result).to.deep.equal([]);
  });

  it('should return all locations when admin has all:locations permission and no locations are requested', async () => {
    const admin = {
      permissions: ['all:locations'],
      locations: []
    };

    selectStub.resolves(mockLocations);

    const result = await getAdminLocations(admin);

    expect(findStub.calledOnceWith({})).to.equal(true);
    expect(result).to.deep.equal(mockLocations);
  });
});

describe('Location page info', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    defaultLocationInfo = { name: 'Location', ...locationInfo };
    location1 = await Locations.createLocation(defaultLocationInfo);
    location2 = await Locations.createLocation(defaultLocationInfo);
    location3 = await Locations.createLocation(defaultLocationInfo);
    location4 = await Locations.createLocation(defaultLocationInfo);

    adminSessionResponse = await createAdminLogin();
    developerToken = adminSessionResponse.adminToken;
  });

  after(async () => {
    sandbox.restore();
  });

  describe('Location Creation', () => {
    let adminWithAllLocations;
    let adminWithLimitedAccess;
    let updateAdminStub;

    before(async () => {
      adminWithAllLocations = await createAdminLogin({
        permissions: ['create:locations', 'all:locations']
      });

      adminWithLimitedAccess = await createAdminLogin({
        permissions: ['create:locations']
      });

      updateAdminStub = sandbox.stub(auth0ClientInstance, 'updateAdmin').resolves();
    });

    const locationData = {
      name: 'Test Location',
      isActive: true,
      timezone: 'America/New_York',
      stateCode: 'NY',
      locationCode: 'NY0001',
      serviceArea: [
        { latitude: 40.7128, longitude: -74.0060 },
        { latitude: 40.7129, longitude: -74.0061 },
        { latitude: 40.7130, longitude: -74.0062 },
        { latitude: 40.7128, longitude: -74.0060 }
      ]
    };

    it('should create a location successfully for admin with all:locations permission', async () => {
      const response = await adminEndpoint('/v1/locations', 'post', adminWithAllLocations.adminToken, app, request, domain, locationData);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('name', locationData.name);
      expect(response.body).to.have.property('isActive', locationData.isActive);
      expect(response.body).to.have.property('timezone', locationData.timezone);
      expect(response.body).to.have.property('stateCode', locationData.stateCode);
      expect(response.body).to.have.property('locationCode', locationData.locationCode);

      sinon.assert.notCalled(updateAdminStub);
    });

    it('should create a location successfully for admin without all:locations permission and update their app_metadata', async () => {
      const response = await adminEndpoint('/v1/locations', 'post', adminWithLimitedAccess.adminToken, app, request, domain, locationData);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('name', locationData.name);

      sinon.assert.calledOnce(updateAdminStub);

      const updateCall = updateAdminStub.getCall(0);
      const [calledAdminId, updateData] = updateCall.args;

      expect(calledAdminId).to.equal(adminWithLimitedAccess.id);

      expect(updateData).to.deep.equal({
        locations: [new mongoose.Types.ObjectId(response.body.id)]
      });
    });

    it('should return 400 if FreeRide age restriction is invalid', async () => {
      const invalidAgeData = {
        ...locationData,
        freeRideAgeRestrictionInterval: {
          min: 15,
          max: 20
        }
      };
      const response = await adminEndpoint('/v1/locations', 'post', adminWithAllLocations.adminToken, app, request, domain, invalidAgeData);

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('message').that.includes('Invalid minimum age: 15 is below 16.');
    });
  });

  describe('Location GET', () => {
    let adminWithLimitedAccess;
    let locationAttached;
    let locationNotAttached;

    before(async () => {
      locationAttached = await Locations.createLocation({
        ...locationInfo,
        name: 'Attached Location',
        stateCode: 'NY',
        locationCode: 'NY0001'
      });

      locationNotAttached = await Locations.createLocation({
        ...locationInfo,
        name: 'Unattached Location',
        stateCode: 'CA',
        locationCode: 'CA0001'
      });

      adminWithLimitedAccess = await createAdminLogin({
        permissions: ['view:locations'],
        locations: [locationAttached._id]
      });
    });

    it('should fetch only the locations attached to the admin', async () => {
      const response = await adminEndpoint('/v1/locations', 'get', adminWithLimitedAccess.adminToken, app, request, domain);

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 1);
      sinon.assert.match(response.body.items[0].name, 'Attached Location');
      sinon.assert.match(response.body.items[0].stateCode, 'NY');
      sinon.assert.match(response.body.items[0].locationCode, 'NY0001');
    });

    it('should fetch a specific location attached to the admin', async () => {
      const response = await adminEndpoint(`/v1/locations/${locationAttached._id}`, 'get', adminWithLimitedAccess.adminToken, app, request, domain);

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.name, locationAttached.name);
    });

    it('should not fetch a location not attached to the admin', async () => {
      const response = await adminEndpoint(`/v1/locations/${locationNotAttached._id}`, 'get', adminWithLimitedAccess.adminToken, app, request, domain);

      sinon.assert.match(response.status, 403);
      sinon.assert.match(response.body.message, 'Location is not allowed');
    });

    it('should not list locations not attached to the admin', async () => {
      const response = await adminEndpoint('/v1/locations', 'get', adminWithLimitedAccess.adminToken, app, request, domain);

      sinon.assert.match(response.status, 200);
      const unattachedLocation = response.body.items.find(item => item.name === 'Unattached Location');
      sinon.assert.match(unattachedLocation, undefined);
    });

    it('200 OK with driver moved settings', async () => {
      let response = {};
      response = await adminEndpoint(`/v1/locations/${location1._id}`, 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get location page!');
      }

      const {
        driverLocationUpdateInterval,
        blockLiveDriverLocation,
        stateCode, locationCode
      } = response.body;

      const result = [
        driverLocationUpdateInterval,
        blockLiveDriverLocation,
        stateCode, locationCode
      ];
      return sinon.assert.match(result, [10, true, 'NY', 'NY0001']);
    });
    it('should get location routing area and zones when available', async () => {
      const location = await Locations.createLocation({
        ...locationInfo,
        name: 'Location with routing area and zones',
        routingArea: [
          {
            latitude: 40.2246842,
            longitude: -8.4420742
          },
          {
            latitude: 40.2238472,
            longitude: -8.3978139
          }
        ]
      });
      await Zones.createZone({
        name: 'Zone 1',
        code: '8239H3BJHB2',
        serviceArea: testZoneServiceArea
      }, location._id);

      const response = await adminEndpoint(`/v1/locations/${location._id}`, 'get', developerToken, app, request, domain);
      expect(response.body.routingArea).to.be.an('array');
      expect(response.body.zones).to.be.an('array');
      expect(response.body.zones[1].name).to.equal('Zone 1');
      expect(response.body.hideFlux).to.equal(false);
    });
  });

  describe('Location Update', () => {
    it('200 OK with no paymentInfo', async () => {
      let response = {};
      response = await adminEndpoint(`/v1/locations/${location1._id}`, 'get', developerToken, app, request, domain);
      if (response.status === 404 || response.status === 500 || response.status === 403) {
        throw new Error('Could not get location page!');
      }

      const result = [response.body.name, response.body.timezone];
      return sinon.assert.match(result, ['Location', 'Europe/Lisbon']);
    });

    it('400 "ridePrice" must be a number', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          paymentEnabled: true,
          paymentInformation: {
            ridePrice: 'null'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(response.body.message, '"ridePrice" must be a number');
    });

    it('400 "currency" with value "eur" fails to match the required pattern: /^usd$/', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          paymentEnabled: true,
          paymentInformation: {
            ridePrice: 1,
            currency: 'eur'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(response.body.message, '"currency" with value "eur" fails to match the required pattern: /^usd$/');
    });

    it('400 "capEnabled" missing required peer "priceCap"', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
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
      return sinon.assert.match(response.body.message, '"capEnabled" missing required peer "priceCap"');
    });

    it('200 OK with paymentInfo', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
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


      sinon.assert.match(response.status, 200);
      const result = [response.body.name, response.body.timezone];
      return sinon.assert.match(result, ['Location', 'Europe/Lisbon']);
    });
    it('200 OK with pwywInfo', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
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
        response.body.timezone,
        response.body.pwywEnabled,
        response.body.pwywInformation.pwywOptions,
        response.body.pwywInformation.maxCustomValue
      ];
      return sinon.assert.match(result, ['Location', 'Europe/Lisbon', true, [0, 100, 200], 1000]);
    });

    it('200 OK with pwywInfo and max as string', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
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
      return sinon.assert.match(result, ['Location', 'Europe/Lisbon', true, [0, 100, 200], 1000]);
    });

    it('400 - without pwyw info but enabled - "pwywOptions" must contain at least 3 items', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          pwywEnabled: true
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(response.body.message, '"pwywOptions" must contain at least 3 items');
    });

    it('400 - only 3 values - "pwywOptions" must contain at least 3 items', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
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
      return sinon.assert.match(response.body.message, '"pwywOptions" must contain at least 3 items');
    });
    it('400 - last value as empty string - "pwywOptions[2]" must be a number', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
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
      return sinon.assert.match(response.body.message, '"pwywOptions[2]" must be a number');
    });
    it('400 - 2nd value < 1st value - "pwywOptions" must be sorted in ascending order by value', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
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
      return sinon.assert.match(response.body.message, '"pwywOptions" must be sorted in ascending order by value');
    });
    it('200 OK with tipInfo', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          tipEnabled: true,
          tipInformation: {
            tipOptions: [0, 100, '200'],
            maxCustomValue: 1000,
            currency: 'usd'
          }
        }
      );

      sinon.assert.match(response.status, 200);
      const result = [
        response.body.name,
        response.body.timezone,
        response.body.tipEnabled,
        response.body.tipInformation.tipOptions,
        response.body.tipInformation.maxCustomValue
      ];
      return sinon.assert.match(result, ['Location', 'Europe/Lisbon', true, [0, 100, 200], 1000]);
    });
    it('200 OK with tipInfo and max as string', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          tipEnabled: true,
          tipInformation: {
            tipOptions: [0, 100, '200'],
            maxCustomValue: '1000',
            currency: 'usd'
          }
        }
      );

      sinon.assert.match(response.status, 200);
      const result = [
        response.body.name,
        response.body.timezone,
        response.body.tipEnabled,
        response.body.tipInformation.tipOptions,
        response.body.tipInformation.maxCustomValue
      ];
      return sinon.assert.match(result, ['Location', 'Europe/Lisbon', true, [0, 100, 200], 1000]);
    });
    it('400 - only 3 values - "tipOptions" must contain at least 3 items', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          tipEnabled: true,
          tipInformation: {
            tipOptions: [200, 100],
            maxCustomValue: 1000,
            currency: 'usd'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(response.body.message, '"tipOptions" must contain at least 3 items');
    });
    it('400 - last value as empty string - "tipOptions[2]" must be a number', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          tipEnabled: true,
          tipInformation: {
            tipOptions: [100, 300, ''],
            maxCustomValue: 1000,
            currency: 'usd'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(response.body.message, '"tipOptions[2]" must be a number');
    });
    it('400 - 2nd value < 1st value - "tipOptions" must be sorted in ascending order by value', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          tipEnabled: true,
          tipInformation: {
            tipOptions: [100, 300, 200],
            maxCustomValue: 1000,
            currency: 'usd'
          }
        }
      );

      sinon.assert.match(response.status, 400);
      return sinon.assert.match(response.body.message, '"tipOptions" must be sorted in ascending order by value');
    });
    it('200 OK with riderAgeRequirement', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          riderAgeRequirement: 60
        }
      );

      sinon.assert.match(response.status, 200);
      return sinon.assert.match(response.body.riderAgeRequirement, 60);
    });

    it('200 OK with riderAgeRequirementAlert copy', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          failedAgeRequirementAlert: {
            title: 'Location unavailable',
            copy: 'Age requirement not met'
          }
        }
      );

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.failedAgeRequirementAlert.copy, 'Age requirement not met');
      return sinon.assert.match(response.body.failedAgeRequirementAlert.title, 'Location unavailable');
    });

    it('200 OK with break durations update', async () => {
      const response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          breakDurations: [5, 10, 15]
        }
      );

      sinon.assert.match(response.status, 200);
      return sinon.assert.match(response.body.breakDurations.length, 3);
    });

    it('200 OK with state and location codes', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          stateCode: 'FL',
          locationCode: 'FL0001'
        }
      );

      const { stateCode, locationCode } = response.body;

      sinon.assert.match(response.status, 200);
      const result = [stateCode, locationCode];
      return sinon.assert.match(result, ['FL', 'FL0001']);
    });
    it('200 OK with routing area update', async () => {
      let response = {};
      const testRoutingArea = [
        {
          latitude: 40.3246842,
          longitude: -8.4420742
        },
        {
          latitude: 40.2238472,
          longitude: -8.3978139
        }
      ];
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          routingArea: testRoutingArea
        }
      );

      const { routingArea } = response.body;

      let location = await Locations.findOne({ _id: location1._id });
      sinon.assert.match(response.status, 200);
      sinon.assert.match(routingArea, testRoutingArea);
      sinon.assert.match(location.routingAreaUpdatedAt, sinon.match.date);

      const prevUpdatedAt = location.routingAreaUpdatedAt;
      await sleep(1000);

      // Test that the routing area updatedAt value is not updated if it is the same
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          routingArea: testRoutingArea
        }
      );
      location = await Locations.findOne({ _id: location1._id });
      sinon.assert.match(response.status, 200);
      expect(prevUpdatedAt).to.deep.equal(location.routingAreaUpdatedAt);
    });
    it('200 OK with poweredBy', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          poweredBy: 'Test'
        }
      );

      const { poweredBy } = response.body;

      sinon.assert.match(response.status, 200);
      return sinon.assert.match(poweredBy, 'Test');
    });
    it('200 OK with ridesFareCopy', async () => {
      let response = {};
      response = await adminEndpoint(
        `/v1/locations/${location1._id}`,
        'put', developerToken, app, request, domain,
        {
          ridesFareCopy: 'Cost of ride is $1-$10'
        }
      );

      const { ridesFareCopy } = response.body;

      sinon.assert.match(response.status, 200);
      return sinon.assert.match(ridesFareCopy, 'Cost of ride is $1-$10');
    });
    it('should return zones during location update when available', async () => {
      const location5 = await Locations.createLocation({
        ...locationInfo,
        name: 'Location with zones'
      });

      await Zones.createZone({
        name: 'Zone 1',
        code: '8239H3BJHB2',
        serviceArea: testZoneServiceArea
      }, location5._id);

      const response = await adminEndpoint(
        `/v1/locations/${location5._id}`,
        'put', developerToken, app, request, domain,
        {
          isActive: true
        }
      );
      expect(response.body.zones).to.be.an('array');
      expect(response.body.zones[0]).have.property('name');
      expect(response.body.zones[0]).have.property('code');
      expect(response.body.zones[0]).have.property('serviceArea');
    });
  });

  describe('createZone', () => {
    it('should check that a default zone is created when a location without a default zone is fetched', async () => {
      const { body: locationA } = await adminEndpoint('/v1/locations', 'post', developerToken, app, request, domain, { ...defaultLocationInfo, name: 'Test Location' });
      const { body: fetchedLocation } = await adminEndpoint(`/v1/locations/${locationA.id}`, 'get', developerToken, app, request, domain);

      const defaultZone = await Zones.findOne({ location: fetchedLocation.id, isDefault: true });
      expect(defaultZone.name).to.equal('Default');
      expect(defaultZone.isDefault).to.equal(true);
      expect(defaultZone.code).to.equal('0101010101');
      expect(defaultZone.serviceArea.coordinates).to.deep.equal([
        fetchedLocation.serviceArea.map(el => [el.longitude, el.latitude])
      ]);
    });
    it('should update the default zones serviceArea when the location serviceArea is updated', async () => {
      const { body: locationB } = await adminEndpoint('/v1/locations', 'post', developerToken, app, request, domain, { ...defaultLocationInfo, name: 'Test Location 3' });
      const { body: fetchedLocation } = await adminEndpoint(`/v1/locations/${locationB.id}`, 'get', developerToken, app, request, domain);

      let defaultZone = await Zones.findOne({ location: fetchedLocation.id, isDefault: true });
      expect(defaultZone).to.not.equal(null);
      const newServiceArea = [
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
      ];
      const res = await adminEndpoint(
        `/v1/locations/${locationB.id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        {
          ...defaultLocationInfo,
          serviceArea: newServiceArea
        }
      );

      // check that the default zone is created
      defaultZone = await Zones.findOne({ location: fetchedLocation.id, isDefault: true });
      expect(defaultZone.serviceArea.coordinates).to.deep.equal([
        res.body.serviceArea.map(el => [el.longitude, el.latitude])
      ]);
      expect(defaultZone.serviceArea.coordinates).to.deep.equal([
        newServiceArea.map(el => [el.longitude, el.latitude])
      ]);
      expect(defaultZone.name).to.equal('Default');

      // check that the zone.toJSON() is correct
      const zoneData = defaultZone.toJSON();
      expect(zoneData).to.include.all.keys([
        'name', 'description', 'polygonFeatureId', 'code',
        'serviceArea', 'isDeleted', 'isDefault',
        'location', 'id'
      ]);
    });
    it('should create a new zone and add it to the location', async () => {
      const res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones`,
        'post',
        developerToken,
        app,
        request,
        domain,
        zoneInfo1
      );

      expect(res.status).to.equal(200);

      const updatedLocation = await Locations.getLocation({
        _id: location1._id
      });
      expect(updatedLocation.zones).to.contain(res.body.id);

      // check that the zone was created with the correct data
      const zone = await Zones.findOne({ _id: res.body.id });
      expect(zone.name).to.equal('Test Zone');
      expect(zone.description).to.equal('My test zone');
      expect(zone.serviceArea.coordinates).to.deep.equal(zoneInfo1.serviceArea);
    });
    it('should throw an error when you try to create a zone with a code that already exists', async () => {
      const res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones`,
        'post',
        developerToken,
        app,
        request,
        domain,
        zoneInfo2
      );

      expect(res.status).to.equal(200);

      const res2 = await adminEndpoint(
        `/v1/locations/${location1._id}/zones`,
        'post',
        developerToken,
        app,
        request,
        domain,
        zoneInfo2
      );

      expect(res2.status).to.equal(409);
      expect(res2.body.message).to.equal(`Zone with internal zone code ${zoneInfo2.code} already exists`);
    });

    it('should return an error if the location does not exist', async () => {
      // make a request to create a new zone with an invalid location id
      const randomObjectId = new mongoose.Types.ObjectId();
      const res = await adminEndpoint(
        `/v1/locations/${randomObjectId}/zones`,
        'post',
        developerToken,
        app,
        request,
        domain,
        zoneInfo1
      );

      expect(res.status).to.equal(404);
      expect(res.body.message).to.equal('Location not found');
    });

    it('should throw error when zone name or code is not provided', async () => {
      let res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones`,
        'post',
        developerToken,
        app,
        request,
        domain,
        { serviceArea: testZoneServiceArea }
      );
      expect(res.status).to.equal(400);

      res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones`,
        'post',
        developerToken,
        app,
        request,
        domain,
        { name: 'TestZone', serviceArea: updatedTestZoneServiceArea }
      );
      expect(res.status).to.equal(400);
    });
  });

  describe('updateZone', () => {
    it('should update an existing zone', async () => {
      const zoneData = {
        name: 'Test Zone',
        code: 'sjdnjwedw',
        serviceArea: testZoneServiceArea
      };
      const zoneUpdate = {
        name: 'Updated Zone',
        serviceArea: updatedTestZoneServiceArea
      };
      const zone = await Zones.createZone(zoneData, location1._id);
      await createGEMVehicle(
        false, location1._id, { matchingRule: 'priority', zones: [zone] }
      );
      const res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zone._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        zoneUpdate
      );
      expect(res.status).to.equal(200);
      expect(res.body.vehicles).to.have.lengthOf(1);
      expect(res.body.vehicles[0].matchingRule).to.equal('priority');
      expect(res.body.vehicles[0].zones).to.eql([`${zone._id}`]);

      const updatedZone = await Zones.getZoneById(zone._id);
      expect(updatedZone.name).to.equal(zoneUpdate.name);
      expect(updatedZone.serviceArea.coordinates).to.deep.equal(zoneUpdate.serviceArea);
    });
    it('should throw an error when you try to update the code to one that already exists', async () => {
      const zoneData1 = {
        name: 'Test Zone 1',
        code: 'NIEUNR8923',
        serviceArea: testZoneServiceArea
      };
      const zoneData2 = {
        name: 'Test Zone 2',
        code: 'ERNIJNER832923',
        serviceArea: testZoneServiceArea
      };
      const zone1 = await Zones.createZone(zoneData1, location1._id);
      await Zones.createZone(zoneData2, location1._id);
      const res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zone1._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        { code: zoneData2.code }
      );

      expect(res.status).to.equal(409);
      expect(res.body.message).to.equal(`Zone with internal zone code ${zoneData2.code} already exists`);
    });

    it('should return an error if the location does not exist', async () => {
      const zone = await Zones.findOne();
      const randomObjectId = new mongoose.Types.ObjectId();
      const res = await adminEndpoint(
        `/v1/locations/${randomObjectId}/zones/${zone._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        { name: 'Updated Zone', serviceArea: updatedTestZoneServiceArea }
      );

      expect(res.status).to.equal(404);
      expect(res.body.message).to.equal('Location not found');
    });

    it('should return an error if the zone does not exist', async () => {
      const randomObjectId = new mongoose.Types.ObjectId();
      const res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${randomObjectId}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        { name: 'Updated Zone', serviceArea: updatedTestZoneServiceArea }
      );
      expect(res.status).to.equal(404);
      expect(res.body.message).to.equal('Zone not found');
    });
    it('should not be able to update a default zone', async () => {
      const zone = await Zones.findOne({ isDefault: true });
      const res = await adminEndpoint(
        `/v1/locations/${location1._id}/zones/${zone._id}`,
        'put',
        developerToken,
        app,
        request,
        domain,
        { name: 'Updated Zone', serviceArea: updatedTestZoneServiceArea }
      );
      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal('Default zone cannot be updated');
    });
  });
  describe('getZones', () => {
    it('should get an existing zone with vehicles', async () => {
      const zoneData = {
        name: 'Test Zone with vehicles',
        serviceArea: testZoneServiceArea,
        code: 'IUFNEU83912'
      };
      const zone = await Zones.createZone(zoneData, location2._id);
      await createGEMVehicle(
        false, location2._id, { matchingRule: 'priority', zones: [zone] }
      );
      const res = await adminEndpoint(
        `/v1/locations/${location2._id}/zones`,
        'get',
        developerToken,
        app,
        request,
        domain
      );
      expect(res.status).to.equal(200);
      expect(res.body[1].vehicles).to.have.lengthOf(1);
      expect(res.body[1].name).to.equal('Test Zone with vehicles');
      expect(res.body[1].vehicles).to.have.lengthOf(1);
      expect(res.body[1].vehicles[0].matchingRule).to.equal('priority');
      expect(res.body[1].vehicles[0].zones).to.eql([`${zone._id}`]);
    });
    it('should get an existing zone with vehicles if default', async () => {
      await createGEMVehicle(
        false, location3._id, { matchingRule: 'shared', zones: [] }
      );
      const res = await adminEndpoint(
        `/v1/locations/${location3._id}/zones`,
        'get',
        developerToken,
        app,
        request,
        domain
      );
      expect(res.status).to.equal(200);
      expect(res.body[0].vehicles).to.have.lengthOf(1);
      expect(res.body[0].name).to.equal('Default');
      expect(res.body[0].vehicles).to.have.lengthOf(1);
      expect(res.body[0].vehicles[0].matchingRule).to.equal('shared');
      expect(res.body[0].vehicles[0].zones).to.eql([]);
    });
  });
  describe('deleteZones', () => {
    before(async () => {
      // Zone A  - Default zone
      zoneA = await Zones.createZone({
        serviceArea: testZoneServiceArea, name: 'Zone A', isDefault: true, code: '1212893232'
      }, location4._id);
      // Zone B with vehicles
      zoneB = await Zones.createZone({ serviceArea: testZoneServiceArea, name: 'Zone B', code: 'WDNI2U382' }, location4._id);
      await createGEMVehicle(
        false, location4._id, { matchingRule: 'priority', zones: [zoneB] }
      );
      // Zone C without vehicles
      zoneC = await Zones.createZone({ serviceArea: testZoneServiceArea, name: 'Zone C', code: 'JWHDEIU283' }, location4._id);
    });
    it('should not delete default zone', async () => {
      const res = await adminEndpoint(
        `/v1/locations/${location4._id}/zones/${zoneA._id}`,
        'delete',
        developerToken,
        app,
        request,
        domain
      );
      expect(res.status).to.equal(409);
      expect(res.body.message).to.equal('Cannot delete default zone');
    });
    it('should not delete zone with vehicles', async () => {
      const res = await adminEndpoint(
        `/v1/locations/${location4._id}/zones/${zoneB._id}`,
        'delete',
        developerToken,
        app,
        request,
        domain
      );
      expect(res.status).to.equal(409);
      expect(res.body.message).to.equal('Cannot delete zone with vehicles attached');
    });
    it('should delete zone without vehicles', async () => {
      const res = await adminEndpoint(
        `/v1/locations/${location4._id}/zones/${zoneC._id}`,
        'delete',
        developerToken,
        app,
        request,
        domain
      );
      expect(res.status).to.equal(200);
    });
    it('should remove payment policy for deleted zones', async () => {
      await Zones.deleteMany({});
      await Locations.updateOne(
        { _id: location4._id },
        { $set: { zones: [] } }
      );
      const zoneData = [
        { code: 'A', name: 'Zone A' },
        { code: 'B', name: 'Zone B' },
        { code: 'C', name: 'Zone C' }
      ];
      [zoneA, zoneB, zoneC] = await createMultipleZones(
        testZoneServiceArea,
        location4._id,
        zoneData
      );
      const policies = [
        {
          originZone: zoneA._id,
          destinationZone: zoneB._id,
          value: 'destination'
        },
        {
          originZone: zoneB._id,
          destinationZone: zoneA._id,
          value: 'destination'
        },
        {
          originZone: zoneA._id,
          destinationZone: zoneC._id,
          value: 'destination'
        },
        {
          originZone: zoneC._id,
          destinationZone: zoneA._id,
          value: 'destination'
        }
      ];
      await Promise.all(
        policies.map(async (policy) => {
          await PaymentPolicies.createPaymentPolicy({
            ...policy,
            location: location4._id
          });
        })
      );
      let paymentPolicies = await PaymentPolicies.getPaymentPolicies({
        $or: [{ originZone: zoneB._id }, { destinationZone: zoneB._id }]
      });
      expect(paymentPolicies).to.have.lengthOf(2);

      await adminEndpoint(
        `/v1/locations/${location4._id}/zones/${zoneB._id}`,
        'delete',
        developerToken,
        app,
        request,
        domain
      );
      paymentPolicies = await PaymentPolicies.getPaymentPolicies({
        $or: [{ originZone: zoneB._id }, { destinationZone: zoneB._id }]
      });
      expect(paymentPolicies).to.have.lengthOf(0);
    });
  });
});
