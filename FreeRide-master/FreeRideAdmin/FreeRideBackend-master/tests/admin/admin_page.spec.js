import sinon from 'sinon';
import request from 'supertest-promised';
import { expect } from 'chai';

import app from '../../server';
import { domain } from '../../config';
import { emptyAllCollections } from '../utils/helper';
import { adminEndpoint, createAdminLogin } from '../utils/admin';
import Auth0Client from '../../middlewares/admin/utils/Auth0Client';

let adminToken;
let sandbox;
let auth0ClientStub;

describe('Admin CRUD Operations', () => {
  before(async () => {
    sandbox = sinon.createSandbox();
    await emptyAllCollections();

    const { adminToken: token } = await createAdminLogin({
      role: 'Developer'
    });
    adminToken = token;

    auth0ClientStub = {
      getAdmins: sandbox.stub(),
      getAdmin: sandbox.stub(),
      createAdmin: sandbox.stub(),
      updateAdmin: sandbox.stub()
    };
    sandbox.stub(Auth0Client.prototype, 'getAdmins').callsFake(auth0ClientStub.getAdmins);
    sandbox.stub(Auth0Client.prototype, 'getAdmin').callsFake(auth0ClientStub.getAdmin);
    sandbox.stub(Auth0Client.prototype, 'createAdmin').callsFake(auth0ClientStub.createAdmin);
    sandbox.stub(Auth0Client.prototype, 'updateAdmin').callsFake(auth0ClientStub.updateAdmin);
  });

  after(() => {
    sandbox.restore();
  });

  describe('GET /admins', () => {
    it('should fetch all admins', async () => {
      const mockAdmins = [
        {
          user_id: '1', firstName: 'Admin', lastName: '1', email: 'admin1@example.com'
        },
        {
          user_id: '2', firstName: 'Admin', lastName: '2', email: 'admin2@example.com'
        }
      ];
      auth0ClientStub.getAdmins.resolves({ users: mockAdmins, total: 2 });

      const response = await adminEndpoint(
        '/v1/admins', 'get',
        adminToken, app, request, domain,
        {}
      );

      expect(response.status).to.equal(200);
      expect(response.body.users).to.deep.equal(mockAdmins);
      expect(response.body.total).to.equal(2);
      sinon.assert.calledOnce(auth0ClientStub.getAdmins);
    });
  });

  describe('GET /admins/:user_id', () => {
    it('should fetch a specific admin', async () => {
      const mockAdmin = {
        user_id: '1', firstName: 'Admin', lastName: '1', email: 'admin1@example.com'
      };
      auth0ClientStub.getAdmin.resolves(mockAdmin);

      const response = await adminEndpoint(
        '/v1/admins/1', 'get',
        adminToken, app, request, domain,
        {},
        200
      );

      expect(response.body).to.deep.equal(mockAdmin);
      sinon.assert.calledWith(auth0ClientStub.getAdmin, '1');
    });
  });

  describe('POST /admins', () => {
    it('should create a new admin', async () => {
      const newAdminData = {
        email: 'newadmin@example.com',
        firstName: 'New',
        lastName: 'Admin',
        password: 'NewPassword1#',
        role: 'admin',
        locations: []
      };
      const mockCreatedAdmin = { user_id: '3', ...newAdminData };
      auth0ClientStub.createAdmin.resolves(mockCreatedAdmin);

      const response = await adminEndpoint(
        '/v1/admins', 'post',
        adminToken, app, request, domain,
        newAdminData,
        200
      );

      expect(response.body).to.deep.equal(mockCreatedAdmin);
      sinon.assert.calledWith(auth0ClientStub.createAdmin, sinon.match(newAdminData));
    });
  });

  describe('PUT /admins/:user_id', () => {
    it('should update an existing admin', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Admin',
        email: 'updatedadmin@example.com'
      };
      const mockUpdatedAdmin = { user_id: '1', ...updateData };
      auth0ClientStub.updateAdmin.resolves(mockUpdatedAdmin);

      const response = await adminEndpoint(
        '/v1/admins/1', 'put',
        adminToken, app, request, domain,
        updateData,
        200
      );

      expect(response.body).to.deep.equal(mockUpdatedAdmin);
      sinon.assert.calledWith(auth0ClientStub.updateAdmin, '1', sinon.match(updateData));
    });
  });
  describe('PUT /admins/:id/password', () => {
    it('should update an admin\'s password', async () => {
      const userId = '1';
      const newPassword = 'NewPassword123#_';
      const updateData = { password: newPassword };

      auth0ClientStub.updateAdmin.resolves({ message: 'Password updated successfully' });

      const response = await adminEndpoint(
        `/v1/admins/${userId}/password`, 'put',
        adminToken, app, request, domain,
        updateData,
        200
      );

      expect(response.body).to.deep.equal({ message: 'Password updated successfully' });
      sinon.assert.calledWith(auth0ClientStub.updateAdmin, userId, sinon.match({ password: newPassword }));
    });

    it('should return 400 for invalid password', async () => {
      const userId = '1';
      const invalidPassword = 'weak';
      const updateData = { password: invalidPassword };

      const response = await adminEndpoint(
        `/v1/admins/${userId}/password`, 'put',
        adminToken, app, request, domain,
        updateData,
        400
      );

      expect(response.body.message).to.include('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    });
  });
});
