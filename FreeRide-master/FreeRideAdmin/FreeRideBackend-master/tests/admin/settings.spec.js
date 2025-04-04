import { expect } from 'chai';
import request from 'supertest-promised';
import app from '../../server';
import { domain } from '../../config';
import mongodb from '../../services/mongodb';
import { adminEndpoint, createAdminLogin } from '../utils/admin';

let adminToken;

describe('Global Settings', () => {
  before(async () => {
    await mongodb.connection.dropDatabase();

    ({ adminToken } = await createAdminLogin());
  });

  describe('Update /global-settings', () => {
    it('should update admin global settings', async () => {
      const settings = {
        riderAndroid: '1.0.0',
        smsDisabled: true,
        isDynamicRideSearch: true,
        hideTripAlternativeSurvey: true
      };

      const response = await adminEndpoint('/v1/global-settings', 'put', adminToken, app, request, domain, settings);
      expect(response.status).to.equal(200);
    });
  });
  describe('GET /global-settings', () => {
    it('should get admin global settings', async () => {
      const response = await adminEndpoint('/v1/global-settings', 'get', adminToken, app, request, domain);
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('riderAndroid');
      expect(response.body).to.have.property('smsDisabled');
      expect(response.body).to.have.property('isDynamicRideSearch');
      expect(response.body).to.have.property('hideTripAlternativeSurvey');
    });
  });
});
