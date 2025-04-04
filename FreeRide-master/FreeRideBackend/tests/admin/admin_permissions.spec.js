import { expect } from 'chai';
import request from 'supertest';
import app from '../../server';
import { domain } from '../../config';
import { createAdminLogin, adminEndpoint } from '../utils/admin';
import { createDriver } from '../utils/driver';
import { createScenarioLocation } from '../utils/location';
import { emptyAllCollections } from '../utils/helper';
import { Riders } from '../../models';

describe('Admin Permissions', () => {
  let adminToken;

  before(async () => {
    await emptyAllCollections();
  });

  describe('Location Permissions', () => {
    let response;

    it('should control access to GET /locations based on view:locations permission', async () => {
      ({ adminToken } = await createAdminLogin({ permissions: [] }));
      response = await adminEndpoint('/v1/locations', 'get', adminToken, app, request, domain);
      expect(response.status).to.equal(403);

      ({ adminToken } = await createAdminLogin({ permissions: ['view:locations'] }));
      response = await adminEndpoint('/v1/locations', 'get', adminToken, app, request, domain);
      expect(response.status).to.equal(200);
    });

    it('should allow admin with create:admins to create a location', async () => {
      ({ adminToken } = await createAdminLogin({ permissions: [] }));
      response = await adminEndpoint('/v1/locations', 'post', adminToken, app, request, domain, {
        name: 'New Location'
      });
      expect(response.status).to.equal(403);

      ({ adminToken } = await createAdminLogin({ permissions: ['create:locations', 'all:locations'] }));
      response = await adminEndpoint('/v1/locations', 'post', adminToken, app, request, domain, {
        name: 'New Location'
      });
      expect(response.status).to.equal(200);
    });

    it('should allow admin with update:location to update a location', async () => {
      const location = await createScenarioLocation();
      ({ adminToken } = await createAdminLogin({ permissions: [] }));
      response = await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, {
        name: 'Updated Location'
      });
      expect(response.status).to.equal(403);

      ({ adminToken } = await createAdminLogin({ permissions: ['update:locations', 'all:locations'] }));
      response = await adminEndpoint(`/v1/locations/${location._id}`, 'put', adminToken, app, request, domain, {
        name: 'Updated Location'
      });
      expect(response.status).to.equal(200);
    });
  });

  describe('Driver Permissions', async () => {
    let response;
    let driver;
    before(async () => {
      driver = await createDriver();
    });

    it('should control access to GET /drivers based on view:drivers permission', async () => {
      ({ adminToken } = await createAdminLogin({ permissions: [] }));
      response = await adminEndpoint('/v1/drivers', 'get', adminToken, app, request, domain);
      expect(response.status).to.equal(403);

      ({ adminToken } = await createAdminLogin({ permissions: ['view:drivers'] }));
      response = await adminEndpoint('/v1/drivers', 'get', adminToken, app, request, domain);
      expect(response.status).to.equal(200);
    });

    it('should allow admin with create:driver to create a driver', async () => {
      ({ adminToken } = await createAdminLogin({ permissions: [] }));
      response = await adminEndpoint('/v1/drivers', 'post', adminToken, app, request, domain, {
        email: 'newdriver@example.com',
        firstName: 'New',
        lastName: 'Driver'
      });
      expect(response.status).to.equal(403);

      ({ adminToken } = await createAdminLogin({ permissions: ['create:drivers'] }));
      response = await adminEndpoint('/v1/drivers', 'post', adminToken, app, request, domain, {
        email: 'newdriver@example.com',
        firstName: 'New',
        lastName: 'Driver'
      });
      expect(response.status).to.equal(200);
    });

    it('should allow admin with update:driver to update a driver', async () => {
      ({ adminToken } = await createAdminLogin({ permissions: [] }));
      response = await adminEndpoint(`/v1/drivers/${driver.driver._id}`, 'put', adminToken, app, request, domain, {
        firstName: 'Updated'
      });
      expect(response.status).to.equal(403);

      ({ adminToken } = await createAdminLogin({ permissions: ['update:drivers'] }));
      response = await adminEndpoint(`/v1/drivers/${driver.driver._id}`, 'put', adminToken, app, request, domain, {
        firstName: 'Updated'
      });
      expect(response.status).to.equal(200);
    });

    it('should allow admin with delete:driver to delete a driver', async () => {
      ({ adminToken } = await createAdminLogin({ permissions: [] }));
      response = await adminEndpoint(`/v1/drivers/${driver.driver._id}`, 'delete', adminToken, app, request, domain);
      expect(response.status).to.equal(403);

      ({ adminToken } = await createAdminLogin({ permissions: ['delete:drivers'] }));
      response = await adminEndpoint(`/v1/drivers/${driver.driver._id}`, 'delete', adminToken, app, request, domain);
      expect(response.status).to.equal(200);
    });
  });

  describe('Rider Permissions', () => {
    let response;
    let rider;

    before(async () => {
      rider = await Riders.create({
        email: 'rider@rider.com',
        password: 'rider123',
        firstName: 'Rider',
        lastName: 'FN'
      });
    });

    it('should control access to GET /riders based on view:riders permission', async () => {
      ({ adminToken } = await createAdminLogin({ permissions: [] }));
      response = await adminEndpoint('/v1/riders', 'get', adminToken, app, request, domain);
      expect(response.status).to.equal(403);

      ({ adminToken } = await createAdminLogin({ permissions: ['view:riders'] }));
      response = await adminEndpoint('/v1/riders', 'get', adminToken, app, request, domain);
      expect(response.status).to.equal(200);
    });

    it('should allow admin with update:rider to update a rider', async () => {
      ({ adminToken } = await createAdminLogin({ permissions: [] }));
      response = await adminEndpoint(`/v1/riders/${rider._id}`, 'put', adminToken, app, request, domain, {
        isEmailVerified: true
      });
      expect(response.status).to.equal(403);

      ({ adminToken } = await createAdminLogin({ permissions: ['update:riders'] }));
      response = await adminEndpoint(`/v1/riders/${rider._id}`, 'put', adminToken, app, request, domain, {
        isEmailVerified: true
      });
      expect(response.status).to.equal(200);
    });

    it('should allow admin with delete:rider to delete a rider', async () => {
      ({ adminToken } = await createAdminLogin({ permissions: [] }));
      response = await adminEndpoint(`/v1/riders/${rider._id}`, 'delete', adminToken, app, request, domain);
      expect(response.status).to.equal(403);

      ({ adminToken } = await createAdminLogin({ permissions: ['delete:riders'] }));
      response = await adminEndpoint(`/v1/riders/${rider._id}`, 'delete', adminToken, app, request, domain);
      expect(response.status).to.equal(200);
    });
  });
});
