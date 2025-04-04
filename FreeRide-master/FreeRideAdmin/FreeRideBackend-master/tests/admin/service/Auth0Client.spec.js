import sinon from 'sinon';
import { expect } from 'chai';
import nock from 'nock';
import Auth0Client from '../../../middlewares/admin/utils/Auth0Client';
import { Locations } from '../../../models';

let sandbox;

describe('Auth0Client', () => {
  let auth0Client;
  const baseUrl = 'https://example.auth0.com';
  const clientId = 'test-client-id';
  const clientSecret = 'test-client-secret';
  let interceptors = [];

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    auth0Client = new Auth0Client(baseUrl, clientId, clientSecret);
  });

  afterEach(() => {
    interceptors.forEach(interceptor => nock.removeInterceptor(interceptor));
    interceptors = [];
    sandbox.restore();
  });

  const createNockInterceptor = (method, path) => {
    const interceptor = nock(baseUrl)[method](path);
    interceptors.push(interceptor);
    return interceptor;
  };

  describe('getManagementAccessToken', () => {
    it('should fetch a new token when none exists', async () => {
      const mockToken = 'mock-token';
      createNockInterceptor('post', '/oauth/token')
        .reply(200, { access_token: mockToken, expires_in: 86400 });

      const token = await auth0Client.getManagementAccessToken();
      expect(token).to.equal(mockToken);
    });

    it('should return existing token if not expired', async () => {
      const mockToken = 'mock-token';
      auth0Client.managementAccessToken = mockToken;
      auth0Client.managementAccessTokenExpiry = new Date(Date.now() + 3600000);

      const token = await auth0Client.getManagementAccessToken();
      expect(token).to.equal(mockToken);
    });
  });

  describe('updateAdmin', () => {
    let requestWithTokenStub;

    beforeEach(() => {
      requestWithTokenStub = sandbox.stub(auth0Client, 'requestWithToken').resolves({});
      sandbox.stub(auth0Client, 'getManagementAccessToken').resolves('mock-token');
      sandbox.stub(auth0Client, 'setAdminRole').resolves();
    });

    it('should update admin data and set role if changed', async () => {
      const userId = 'user123';
      const updateData = {
        role: 'admin',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'newpassword',
        roleChanged: true,
        locations: ['loc1', 'loc2']
      };

      await auth0Client.updateAdmin(userId, updateData);

      const expectedPatchData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'newpassword',
        given_name: 'John',
        family_name: 'Doe',
        app_metadata: {
          role: 'admin',
          locations: ['loc1', 'loc2']
        }
      };

      sinon.assert.calledWith(requestWithTokenStub, sinon.match({
        method: 'PATCH',
        url: `/api/v2/users/${userId}`,
        data: expectedPatchData
      }));
      sinon.assert.calledOnce(auth0Client.setAdminRole);
    });

    it('should not set role if role not changed', async () => {
      const userId = 'user123';
      const updateData = {
        role: 'admin',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'newpassword',
        roleChanged: false
      };

      await auth0Client.updateAdmin(userId, updateData);

      const expectedPatchData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'newpassword',
        given_name: 'John',
        family_name: 'Doe'
      };

      sinon.assert.calledWith(requestWithTokenStub, sinon.match({
        method: 'PATCH',
        url: `/api/v2/users/${userId}`,
        data: expectedPatchData
      }));
      sinon.assert.notCalled(auth0Client.setAdminRole);
    });

    it('should update password only without affecting other fields', async () => {
      const userId = 'user123';
      const updateData = {
        password: 'newpassword'
      };

      await auth0Client.updateAdmin(userId, updateData);

      const expectedPatchData = {
        password: 'newpassword'
      };

      sinon.assert.calledWith(requestWithTokenStub, sinon.match({
        method: 'PATCH',
        url: `/api/v2/users/${userId}`,
        data: expectedPatchData
      }));
    });

    it('should update app_metadata with role only', async () => {
      const userId = 'user123';
      const updateData = {
        role: 'manager',
        roleChanged: true
      };

      await auth0Client.updateAdmin(userId, updateData);

      const expectedPatchData = {
        app_metadata: {
          role: 'manager'
        }
      };

      sinon.assert.calledWith(requestWithTokenStub, sinon.match({
        method: 'PATCH',
        url: `/api/v2/users/${userId}`,
        data: expectedPatchData
      }));
    });

    it('should update app_metadata with locations only', async () => {
      const userId = 'user123';
      const updateData = {
        locations: ['loc1', 'loc2']
      };

      await auth0Client.updateAdmin(userId, updateData);

      const expectedPatchData = {
        app_metadata: {
          locations: ['loc1', 'loc2']
        }
      };

      sinon.assert.calledWith(requestWithTokenStub, sinon.match({
        method: 'PATCH',
        url: `/api/v2/users/${userId}`,
        data: expectedPatchData
      }));
    });

    it('should not include app_metadata if role and locations are undefined', async () => {
      const userId = 'user123';
      const updateData = {
        firstName: 'John',
        lastName: 'Doe'
      };

      await auth0Client.updateAdmin(userId, updateData);

      const expectedPatchData = {
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe'
      };

      sinon.assert.calledWith(requestWithTokenStub, sinon.match({
        method: 'PATCH',
        url: `/api/v2/users/${userId}`,
        data: expectedPatchData
      }));
    });
  });

  describe('setAdminRole', () => {
    it('should remove current roles and set new admin role', async () => {
      const userId = 'user123';
      const role = 'admin';
      const mockToken = 'mock-token';
      sandbox.stub(auth0Client, 'getManagementAccessToken').resolves(mockToken);
      sandbox.stub(auth0Client, 'removeCurrentRole').resolves();

      createNockInterceptor('post', `/api/v2/users/${userId}/roles`)
        .reply(200, { role });

      const result = await auth0Client.setAdminRole(userId, role);
      expect(result).to.deep.equal({ role });
      sinon.assert.calledOnce(auth0Client.removeCurrentRole);
    });
  });

  describe('getAdmins', () => {
    it('should fetch admins with correct parameters', async () => {
      const mockToken = 'mock-token';
      const params = {
        q: 'search',
        page: 1,
        perPage: 10,
        sort: 'name:1',
        fields: 'user_id,firstName,lastName,email'
      };
      const mockResponse = { users: [], total: 0 };

      sandbox.stub(auth0Client, 'getManagementAccessToken').resolves(mockToken);

      createNockInterceptor('get', '/api/v2/users')
        .query(true)
        .reply(200, mockResponse);

      const result = await auth0Client.getAdmins(params);
      expect(result).to.deep.equal(mockResponse);
    });
  });

  describe('getAdmin', () => {
    it('should fetch admin and include location data', async () => {
      const userId = 'user123';
      const mockToken = 'mock-token';
      const mockAdmin = {
        user_id: userId,
        firstName: 'John',
        lastName: 'Doe',
        app_metadata: { locations: ['loc1', 'loc2'] }
      };
      const mockLocations = [
        { _id: 'loc1', name: 'Location 1' },
        { _id: 'loc2', name: 'Location 2' }
      ];

      sandbox.stub(auth0Client, 'getManagementAccessToken').resolves(mockToken);
      sandbox.stub(Locations, 'find').returns({
        select: sandbox.stub().resolves(mockLocations)
      });

      createNockInterceptor('get', `/api/v2/users/${userId}`)
        .query(true)
        .reply(200, mockAdmin);

      const result = await auth0Client.getAdmin(userId);
      expect(result.app_metadata.locations).to.deep.equal(mockLocations);
    });
  });

  describe('createAdmin', () => {
    it('should create admin and set role', async () => {
      const mockToken = 'mock-token';
      const newUser = {
        email: 'new@example.com',
        password: 'password',
        firstName: 'New',
        lastName: 'User',
        role: 'admin'
      };
      const mockResponse = { user_id: 'newuser123', ...newUser };

      sandbox.stub(auth0Client, 'getManagementAccessToken').resolves(mockToken);
      sandbox.stub(auth0Client, 'setAdminRole').resolves();

      createNockInterceptor('post', '/api/v2/users')
        .reply(200, mockResponse);

      const result = await auth0Client.createAdmin(newUser);
      expect(result).to.deep.equal(mockResponse);
      sinon.assert.calledWith(auth0Client.setAdminRole, mockResponse.user_id, newUser.role);
    });
  });
});
