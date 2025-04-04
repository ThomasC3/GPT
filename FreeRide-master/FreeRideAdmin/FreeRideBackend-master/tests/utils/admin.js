import jwt from 'jsonwebtoken';
import { login, useEndpoint } from './ride';
import { populateParams } from './object';
import { auth as authConfig, auth0 as auth0Config } from '../../config';

export const adminLogin = async (
  email, password, app, request, domain
) => login(email, password, app, request, domain.admin);

export const AdminRoles = {
  DEVELOPER: 'Developer',
  LOCATION_MANAGER: 'LocationManager',
  LOCATION_VIEWER: 'LocationViewer'
};

const DEFAULT_ADMIN_INFO = {
  email: 'admin@mail.com',
  firstName: 'FN',
  lastName: 'LN',
  password: 'Password0',
  role: AdminRoles.DEVELOPER
};

export function generateMockJWT(payload) {
  const { secret } = authConfig;
  return jwt.sign(payload, secret);
}

const getPermissionsForRole = (role) => {
  const permissions = {
    [AdminRoles.DEVELOPER]: [
      'update:locations', 'view:locations', 'create:locations', 'view:global-settings',
      'update:global-settings', 'view:admins', 'create:admins', 'update:admins', 'view:roles',
      'view:riders', 'update:riders', 'delete:riders', 'view:rides',
      'update:rides', 'view:requests', 'update:requests', 'view:activities', 'view:drivers',
      'create:drivers', 'update:drivers', 'delete:drivers', 'view:reports', 'create:reports',
      'update:reports', 'delete:reports', 'view:stats', 'view:tips', 'view:fleet', 'create:fleet', 'update:fleet',
      'delete:fleet', 'view:jobs', 'create:jobs', 'update:jobs', 'delete:jobs', 'view:inspections',
      'create:inspections', 'update:inspections', 'delete:inspections', 'all:locations', 'view:payment-stats',
      'view:ads', 'create:ads', 'update:ads', 'delete:ads',
      'view:media', 'create:media', 'update:media', 'delete:media'
    ],
    [AdminRoles.LOCATION_MANAGER]: [
      'view:locations', 'create:locations', 'update:locations', 'delete:locations',
      'view:drivers', 'delete:drivers', 'update:drivers', 'create:drivers',
      'view:fleet', 'create:fleet', 'update:fleet'
    ]
  };
  return permissions[role] || [];
};

export const createAdminLogin = async (adminParams) => {
  const params = populateParams(adminParams, DEFAULT_ADMIN_INFO);
  const {
    email, firstName, lastName, role, locations = [], permissions = null
  } = params;

  if (!Object.values(AdminRoles).includes(role)) {
    throw new Error(`Invalid role: ${role}. Valid roles are: ${Object.values(AdminRoles).join(', ')}`);
  }

  const userId = `auth0|${Math.random().toString(36).substr(2, 9)}`;
  const payload = {
    id: userId,
    email,
    firstName,
    lastName,
    permissions: permissions || getPermissionsForRole(role),
    [auth0Config.claimNamespace]: {
      user_id: userId,
      name: `${firstName} ${lastName}`,
      app_metadata: {
        role, locations
      }
    }
  };

  const adminToken = generateMockJWT(payload);
  payload.adminToken = adminToken;
  return payload;
};

export const adminEndpoint = async (
  url, requestType, adminToken, app, request, domain, payload = {}
) => useEndpoint(url, requestType, adminToken, app, request, domain.admin, payload);

export default {
  createAdminLogin
};
