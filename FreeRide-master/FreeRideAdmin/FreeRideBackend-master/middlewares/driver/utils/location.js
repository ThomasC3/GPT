import { Locations } from '../../../models';

export const getDriverLocation = async (driver) => {
  if (driver.activeLocation && driver.locations.includes(driver.activeLocation)) {
    return Locations.findOne({
      _id: driver.activeLocation,
      isActive: true
    });
  }
  if (!driver.currentLocation && driver.locations?.length === 1) {
    return Locations.findOne({
      _id: driver.locations[0],
      isActive: true
    });
  }
  if (!driver.currentLocation) {
    return null;
  }
  const coordinates = {
    longitude: driver.currentLocation.coordinates[0],
    latitude: driver.currentLocation.coordinates[1]
  };
  const locations = await Locations.getNearest(
    coordinates,
    { isActive: true, _id: { $in: driver.locations } }
  );
  return locations.length ? locations[0] : null;
};

export default {
  getDriverLocation
};
