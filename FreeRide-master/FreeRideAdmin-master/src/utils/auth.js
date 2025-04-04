import axios from 'axios';
import { message } from 'antd';

export const allowDelete = (resourceType, permissions = []) => {
  const deletePermission = `delete:${resourceType.toLowerCase()}`;
  return permissions.includes(deletePermission);
};

export const allowUpdate = (resourceType, permissions = []) => {
  const updatePermission = `update:${resourceType.toLowerCase()}`;
  return permissions.includes(updatePermission);
};

export const allowView = (resourceType, permissions = []) => {
  const viewPermission = `view:${resourceType.toLowerCase()}`;
  return permissions.includes(viewPermission);
};

export const setupAxiosInterceptors = (logout) => {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        message.error('Your session has expired. Please log in again.');
        logout();
      }
      return Promise.reject(error);
    }
  );
};

export default {
  allowDelete,
  allowUpdate,
  setupAxiosInterceptors
};
