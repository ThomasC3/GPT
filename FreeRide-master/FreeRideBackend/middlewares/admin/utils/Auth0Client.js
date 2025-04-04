import axios from 'axios';
import { Locations } from '../../../models';
import { auth0 as auth0Config } from '../../../config';

class Auth0Client {
  constructor(baseUrl, clientId, clientSecret) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: { 'content-type': 'application/json' }
    });
  }

  // Management token is stored in the class instance to avoid multiple calls to Auth0
  // The token is fetched only if it doesn't exist or has expired
  async getManagementAccessToken() {
    if (
      !this.managementAccessToken
      || !this.managementAccessTokenExpiry
      || this.managementAccessTokenExpiry < new Date()
    ) {
      const options = {
        method: 'POST',
        url: '/oauth/token',
        data: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          audience: `${this.baseUrl}/api/v2/`,
          grant_type: 'client_credentials'
        }
      };

      const response = await this.axiosInstance(options);
      this.managementAccessToken = response.data.access_token;
      this.managementAccessTokenExpiry = new Date(
        Date.now() + response.data.expires_in * 1000
      );
    }
    return this.managementAccessToken;
  }

  async requestWithToken(options) {
    const token = await this.getManagementAccessToken();
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    const response = await this.axiosInstance({ ...options, headers });
    return response.data;
  }

  async updateAdmin(userId, data) {
    const {
      firstName,
      lastName,
      role,
      locations,
      email,
      password,
      verifyEmail,
      roleChanged
    } = data;

    const name = firstName && lastName ? `${firstName} ${lastName}` : undefined;

    const updateData = {
      name,
      email,
      password,
      given_name: firstName,
      family_name: lastName,
      verify_email: verifyEmail,
      app_metadata: {}
    };

    const updateRole = role !== undefined && roleChanged;
    // Only include defined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (updateRole) {
      updateData.app_metadata.role = role;
    }
    if (locations !== undefined) {
      updateData.app_metadata.locations = locations;
    }

    if (Object.keys(updateData.app_metadata).length === 0) {
      delete updateData.app_metadata;
    }

    const options = {
      method: 'PATCH',
      url: `/api/v2/users/${userId}`,
      data: updateData
    };

    if (updateRole) {
      await this.setAdminRole(userId, role);
    }

    return this.requestWithToken(options);
  }

  async setAdminRole(userId, roleId) {
    await this.removeCurrentRole(userId);

    const options = {
      method: 'POST',
      url: `/api/v2/users/${userId}/roles`,
      data: { roles: [roleId] }
    };

    return this.requestWithToken(options);
  }

  async getAdmins(params) {
    const options = {
      method: 'GET',
      url: '/api/v2/users',
      params: {
        q: params.q
          ? `given_name:*${params.q}* OR family_name:*${params.q}* OR email:*${params.q}*`
          : undefined,
        page: params.page,
        per_page: params.perPage,
        sort: params.sort,
        search_engine: 'v3',
        include_totals: true,
        fields: params.fields || 'user_id,name,email,app_metadata'
      }
    };

    return this.requestWithToken(options);
  }

  async getAdmin(userId) {
    const options = {
      method: 'GET',
      url: `/api/v2/users/${userId}`
    };

    const admin = await this.requestWithToken(options);
    const adminLocationIds = admin.app_metadata?.locations;
    if (adminLocationIds) {
      const adminLocations = await Locations.find({
        _id: { $in: adminLocationIds }
      }).select('name _id');
      admin.app_metadata.locations = adminLocations;
    }

    return admin;
  }

  async createAdmin(user) {
    const options = {
      method: 'POST',
      url: '/api/v2/users',
      data: {
        email: user.email,
        password: user.password,
        given_name: user.firstName,
        family_name: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        connection: 'Username-Password-Authentication',
        app_metadata: {
          role: user.role,
          locations: user.locations
        },
        verify_email: true
      }
    };

    const response = await this.requestWithToken(options);
    await this.setAdminRole(response.user_id, user.role);
    return response;
  }

  async getRoles() {
    const options = {
      method: 'GET',
      url: '/api/v2/roles'
    };

    return this.requestWithToken(options);
  }

  async getAdminsByRoleAndLocation(roles, locationId) {
    const rolesQuery = roles.map(role => `app_metadata.role:"${role}"`).join(' OR ');
    const query = `(${rolesQuery}) AND app_metadata.locations:"${locationId}"`;

    const options = {
      method: 'GET',
      url: '/api/v2/users',
      params: {
        q: query,
        search_engine: 'v3',
        fields: 'email,app_metadata',
        per_page: 100,
        include_totals: true
      }
    };

    const response = await this.requestWithToken(options);
    return response.users.map(user => ({
      email: user.email,
      role: user.app_metadata.role,
      locations: user.app_metadata.locations
    }));
  }

  async removeCurrentRole(userId) {
    const options = {
      method: 'GET',
      url: `/api/v2/users/${userId}/roles`
    };

    const currentRoles = await this.requestWithToken(options);

    if (currentRoles.length > 0) {
      const roleIds = currentRoles.map(role => role.id);
      const removeOptions = {
        method: 'DELETE',
        url: `/api/v2/users/${userId}/roles`,
        data: { roles: roleIds }
      };

      await this.requestWithToken(removeOptions);
    }
  }
}

export const auth0ClientInstance = new Auth0Client(
  auth0Config.domain,
  auth0Config.clientId,
  auth0Config.clientSecret
);

export default Auth0Client;
