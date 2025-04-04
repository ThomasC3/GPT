import sinon from 'sinon';
import request from 'supertest-promised';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import app from '../../server';
import { domain } from '../../config';
import {
  Locations, Settings
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createAdminLogin } from '../utils/admin';
import {
  createLocation, listLocations,
  viewLocation, editLocation
} from '../utils/location';
import { isForbiddenLocation, locationValidator } from '../../middlewares/admin/utils/location';
import { LocationNotFoundError, ForbiddenError } from '../../errors';

chai.use(chaiAsPromised);

let sandbox;
let location1;
let location2;
let defaultLocationInfo;

const locationInfo = {
  isUsingServiceTimes: false,
  isActive: true,
  serviceArea: [
    { latitude: 40.2246842, longitude: -8.4420742 },
    { latitude: 40.2238472, longitude: -8.3978139 },
    { latitude: 40.1860998, longitude: -8.3972703 },
    { latitude: 40.189714, longitude: -8.430009 },
    { latitude: 40.2246842, longitude: -8.4420742 }
  ]
};

describe('Admin permissions and location access', () => {
  before(async () => {
    sandbox = sinon.createSandbox();
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
  });

  beforeEach(async () => {
    sandbox.restore();
    await Locations.deleteMany();

    defaultLocationInfo = { name: 'Location', ...locationInfo };

    location1 = await Locations.createLocation(defaultLocationInfo);
    location2 = await Locations.createLocation(defaultLocationInfo);
  });

  describe('isForbiddenLocation function', () => {
    it('should return false for admin with all:locations permission', () => {
      const admin = { permissions: ['all:locations'], locations: [] };
      const result = isForbiddenLocation(location1._id, admin);
      expect(result).to.equal(false);
    });

    it('should return false for admin with assigned location', () => {
      const admin = { permissions: [], locations: [location1._id] };
      const result = isForbiddenLocation(location1._id, admin);
      expect(result).to.equal(false);
    });

    it('should return true for admin without all:locations permission and unassigned location', () => {
      const admin = { permissions: [], locations: [location2._id] };
      const result = isForbiddenLocation(location1._id, admin);
      expect(result).to.equal(true);
    });
  });

  describe('locationValidator function', () => {
    it('should throw LocationNotFoundError for non-existent location', async () => {
      const admin = { permissions: ['all:locations'], locations: [] };
      const nonExistentId = '5f5e7fdfb1f3d43e9c1e9e9e';
      await expect(locationValidator(nonExistentId, admin))
        .to.be.rejectedWith(LocationNotFoundError);
    });

    it('should throw ForbiddenError for forbidden location', async () => {
      const admin = { permissions: [], locations: [location2._id] };
      await expect(locationValidator(location1._id, admin)).to.be.rejectedWith(ForbiddenError);
    });

    it('should return location for allowed access', async () => {
      const admin = { permissions: ['all:locations'], locations: [] };
      const result = await locationValidator(location1._id, admin);
      expect(result._id).to.deep.equal(location1._id);
    });
  });

  describe('Resource access based on permissions and assigned locations', () => {
    it('should allow viewing all locations with all:locations permission', async () => {
      const { adminToken } = await createAdminLogin({ permissions: ['view:locations', 'all:locations'] });
      const response = await listLocations(adminToken, app, request, domain);
      expect(response).to.equal(true);
    });

    it('should allow viewing assigned locations without all:locations permission', async () => {
      const { adminToken } = await createAdminLogin({
        permissions: ['view:locations'],
        locations: [location1._id]
      });
      const response = await listLocations(adminToken, app, request, domain, {
        checkIfIncludes: true,
        testedLocation: location1
      });
      expect(response).to.equal(true);
    });

    it('should allow viewing a specific assigned location', async () => {
      const { adminToken } = await createAdminLogin({
        permissions: ['view:locations'],
        locations: [location1._id]
      });
      const response = await viewLocation(adminToken, app, request, domain, location1);
      expect(response).to.equal(true);
    });

    it('should deny viewing a specific unassigned location', async () => {
      const { adminToken } = await createAdminLogin({
        permissions: ['view:locations'],
        locations: [location2._id]
      });
      const response = await viewLocation(adminToken, app, request, domain, location1);
      expect(response).to.equal(false);
    });

    it('should allow editing an assigned location with update:location permission', async () => {
      const { adminToken } = await createAdminLogin({
        permissions: ['update:locations'],
        locations: [location1._id]
      });
      const response = await editLocation(adminToken, app, request, domain, location1);
      expect(response).to.equal(true);
    });

    it('should deny editing an unassigned location with update:location permission', async () => {
      const { adminToken } = await createAdminLogin({
        permissions: ['update:locations'],
        locations: [location2._id]
      });
      const response = await editLocation(adminToken, app, request, domain, location1);
      expect(response).to.equal(false);
    });

    it('should allow creating a location with create:location permission', async () => {
      const { adminToken } = await createAdminLogin({ permissions: ['create:locations'] });
      const response = await createLocation(adminToken, app, request, domain, defaultLocationInfo);
      expect(response).to.equal(true);
    });

    it('should deny creating a location without create:location permission', async () => {
      const { adminToken } = await createAdminLogin({ permissions: ['view:locations'] });
      const response = await createLocation(adminToken, app, request, domain, defaultLocationInfo);
      expect(response).to.equal(false);
    });
  });
});
