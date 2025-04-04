import lodash from 'lodash';
import { ForbiddenError, LocationNotFoundError } from '../../../errors';
import {
  Locations, Zones
} from '../../../models';

export const hasAccessToAllLocations = admin => admin.permissions.includes('all:locations');

export const isForbiddenLocation = (locationId, admin) => {
  const adminLocations = (admin.locations || []).map(id => id.toString());
  if (hasAccessToAllLocations(admin) || adminLocations.includes(locationId.toString())) {
    return false;
  }
  return true;
};

export const locationValidator = async (locationId, admin) => {
  const location = await Locations.findById(locationId);
  if (!location) {
    throw new LocationNotFoundError(`Location with id of ${locationId} not found`);
  }
  if (isForbiddenLocation(location._id, admin)) {
    throw new ForbiddenError('Location is not allowed');
  }
  return location;
};

const buildAdminLocationsQuery = (
  requestedLocations,
  adminLocations, hasAllLocationsPermission
) => {
  if (requestedLocations.length > 0) {
    return hasAllLocationsPermission
      ? { _id: { $in: requestedLocations } }
      : { _id: { $in: requestedLocations.filter(id => adminLocations.includes(id.toString())) } };
  }

  return hasAllLocationsPermission ? {} : { _id: { $in: adminLocations } };
};

export const getAdminLocations = async (admin, requestedLocations = []) => {
  const adminLocations = admin.locations || [];
  const hasAllLocationsPermission = hasAccessToAllLocations(admin);

  const locationQuery = buildAdminLocationsQuery(
    requestedLocations,
    adminLocations,
    hasAllLocationsPermission
  );

  return Locations.find(locationQuery).select('id name timezone');
};

export const updateDefaultZoneCoordinates = async (location) => {
  const defaultZone = await Zones.getZone({
    location: location._id,
    isDefault: true
  });
  if (
    defaultZone
    && !lodash.isEqual(
      location.serviceArea.coordinates,
      defaultZone.serviceArea.coordinates
    )
  ) {
    await Zones.updateZone(
      { _id: defaultZone._id },
      { serviceArea: location.serviceArea.coordinates }
    );
  }
};

export default {
  locationValidator,
  isForbiddenLocation,
  getAdminLocations,
  updateDefaultZoneCoordinates
};
