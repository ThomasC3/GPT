import { adminEndpoint } from './admin';
import { Locations, Zones } from '../../models';
import logger from '../../logger';

export const createLocation = async (token, app, request, domain, locationInfo) => {
  try {
    const response = await adminEndpoint('/v1/locations', 'post', token, app, request, domain, locationInfo);
    if (response.status === 403) {
      throw new Error('No permission to create location!');
    }

    const location = await Locations.findOne({ name: locationInfo.name });
    if (!location) {
      throw new Error(`Location ${locationInfo.name} could not be created!`);
    }

    return true;
  } catch (error) {
    logger.debug(error);
    return false;
  }
};

export const listLocations = async (token, app, request, domain, options = {}) => {
  try {
    const response = await adminEndpoint('/v1/locations', 'get', token, app, request, domain);
    if (response.status === 403) {
      throw new Error('No permission to get location list!');
    }

    let idList = null;
    if (response.body.items.length) {
      idList = response.body.items.map(item => String(item.id)) || [];
    }

    if (options.checkIfIncludes) {
      if (!idList.includes(String(options.testedLocation._id))) {
        throw new Error('Location not in location list!');
      }
    }

    if (options.checkIfNotIncludes) {
      if (idList.includes(options.testedLocation._id)) {
        throw new Error('Location in location list!');
      }
    }

    if (options.noReturnedLocations) {
      if (idList.length !== options.noReturnedLocations) {
        throw new Error(`Returned ${idList.length} of ${options.noReturnedLocations} expected locations`);
      }
    }

    return true;
  } catch (error) {
    logger.debug(error);
    return false;
  }
};

export const viewLocation = async (token, app, request, domain, location) => {
  try {
    const response = await adminEndpoint(`/v1/locations/${location._id}`, 'get', token, app, request, domain);
    if (response.status === 403) {
      throw new Error('No permission to get specific location!');
    }
    if (!(String(response.body.id) === String(location._id))) {
      throw new Error('Could not get specific location!');
    }

    return true;
  } catch (error) {
    logger.debug(error);
    return false;
  }
};

export const editLocation = async (token, app, request, domain, location) => {
  try {
    const response = await adminEndpoint(`/v1/locations/${location._id}`, 'put', token, app, request, domain, { name: 'Location_altered' });
    if (response.status === 403) {
      throw new Error('No permission to edit!');
    }
    const updatedLocation = await Locations.findOne({ _id: location._id });
    if (!(updatedLocation.name === 'Location_altered')) {
      throw new Error('Could not edit!');
    }
    await Locations.findOneAndUpdate({ _id: updatedLocation._id }, { name: 'Location' });

    return true;
  } catch (error) {
    return false;
  }
};

export const deleteLocation = async (token, app, request, domain, location) => {
  try {
    const response = await adminEndpoint(`/v1/locations/${location._id}`, 'put', token, app, request, domain, { isDeleted: true });
    if (response.status === 403) {
      throw new Error('No permission to DELETE!');
    }

    const deletedLocation = await Locations.findOne({ _id: location._id });
    if (!deletedLocation.isDeleted) {
      // there's no way to delete locations atm in our app
      throw new Error('Could not delete!');
    }

    await Locations.findOneAndUpdate({ _id: deletedLocation._id }, { isDeleted: false });
    return true;
  } catch (error) {
    return false;
  }
};

export const createZone = async (zoneInfo) => {
  const { serviceArea, location } = zoneInfo;
  const zoneData = { ...zoneInfo };
  if (!zoneData.code) {
    zoneData.code = Math.random().toString(36).substring(2, 7);
  }
  if (serviceArea[0].longitude) {
    zoneData.serviceArea = [serviceArea.map(el => [el.longitude, el.latitude])];
  }
  return Zones.createZone(zoneData, location);
};

export const createMultipleZones = async (zoneServiceArea, locationId, zoneData) => {
  const zones = await Promise.all(zoneData.map(async (zone) => {
    const createdZone = await createZone({
      ...zone,
      serviceArea: zoneServiceArea,
      location: locationId
    });
    return createdZone;
  }));
  return zones;
};

export const createScenarioLocation = async (key, locationAttributes = {}) => {
  const commonProperties = {
    isActive: true,
    fleetEnabled: true,
    poolingEnabled: true
  };
  if (key === 'Brooklyn') {
    return Locations.createLocation({
      name: 'Brooklyn',
      ...commonProperties,
      serviceArea: [
        [-73.978573, 40.721239],
        [-73.882936, 40.698337],
        [-73.918642, 40.629585],
        [-73.978573, 40.660845],
        [-73.978573, 40.721239]
      ].map(
        coord => ({ latitude: coord[1], longitude: coord[0] })
      ),
      ...locationAttributes
    });
  }
  if (key === 'San Diego') {
    return Locations.createLocation({
      name: 'San Diego',
      ...commonProperties,
      serviceArea: [
        [-117.1813774, 32.7276531],
        [-117.1750259, 32.7348733],
        [-117.1616364, 32.7240428],
        [-117.1484184, 32.7250537],
        [-117.1405220, 32.7010777],
        [-117.1473885, 32.6925545],
        [-117.1755409, 32.7081556],
        [-117.1815491, 32.7273643],
        [-117.1813774, 32.7276531]
      ].map(
        coord => ({ latitude: coord[1], longitude: coord[0] })
      ),
      ...locationAttributes
    });
  }
  if (key === 'San Diego Extended') {
    return Locations.createLocation({
      name: 'San Diego Extended',
      ...commonProperties,
      serviceArea: [
        [-117.169975, 32.771142],
        [-117.104479, 32.780922],
        [-117.088910, 32.709579],
        [-117.167290, 32.703104],
        [-117.169975, 32.771142]
      ].map(
        coord => ({ latitude: coord[1], longitude: coord[0] })
      ),
      ...locationAttributes
    });
  }
  if (key === 'Coimbra') {
    return Locations.createLocation({
      name: 'Coimbra',
      ...commonProperties,
      serviceArea: [
        [-8.4420742, 40.2246842],
        [-8.3978139, 40.2238472],
        [-8.3972703, 40.1860998],
        [-8.430009, 40.189714],
        [-8.4420742, 40.2246842]
      ].map(
        coord => ({ latitude: coord[1], longitude: coord[0] })
      ),
      ...locationAttributes
    });
  }
  // Default: 'Long Island'
  return Locations.createLocation({
    name: 'Long Island',
    ...commonProperties,
    serviceArea: [
      [-73.5733125, 40.7132646],
      [-73.4730622, 40.7247139],
      [-73.4593293, 40.6627603],
      [-73.5616395, 40.6486955],
      [-73.5733125, 40.7132646]
    ].map(
      coord => ({ latitude: coord[1], longitude: coord[0] })
    ),
    ...locationAttributes
  });
};

export const createScenarioZones = async (key, locationId, zoneAttributes = [{}]) => {
  let zones;
  if (key === 'Long Island') {
    zones.push(createZone({
      location: locationId,
      serviceArea: [[
        [-73.5554945, 40.6902437],
        [-73.4853253, 40.6985013],
        [-73.4744476, 40.6681543],
        [-73.5530249, 40.6623055],
        [-73.5554945, 40.6902437]
      ]],
      name: 'Zone A',
      description: 'Donut zone',
      code: 'ZA',
      ...(zoneAttributes.length ? zoneAttributes[0] : {})
    }));

    zones.push(createZone({
      location: locationId,
      serviceArea: [[
        [-73.5277867, 40.6829105],
        [-73.5072208, 40.683955],
        [-73.5062026, 40.6771378],
        [-73.5259483, 40.6746324],
        [-73.5277867, 40.6829105]
      ]],
      name: 'Zone B',
      description: 'Hole from the donut zone',
      code: 'ZB',
      ...(zoneAttributes.length > 0 ? zoneAttributes[1] : {})
    }));
  }
  return Promise.all(zones);
};

export const listScenarioPoints = (key) => {
  const points = [];
  if (key === 'Brooklyn') {
    points.push([-73.902878, 40.680806]); // '1610 Bushwick Ave, Brooklyn, NY 11207, USA'
    points.push([-73.907704, 40.683619]); // '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'
    points.push([-73.913063, 40.686650]); // '115-57 Eldert St, Brooklyn, NY 11207, USA'
    points.push([-73.920558, 40.690955]); // '1040 Bushwick Ave, Brooklyn, NY 11221, USA'
    points.push([-73.962413, 40.709924]); // '178 Broadway, Brooklyn, NY 11211, USA',
    points.push([-73.963859, 40.710228]);
    points.push([-73.965500, 40.710439]);
    points.push([-73.968472, 40.710821]);
  } else if (key === 'San Diego Extended') {
    points.push([-117.130236, 32.762951]);
    points.push([-117.130236, 32.758361]);
    points.push([-117.130236, 32.755502]);
    points.push([-117.130248, 32.752633]);
    points.push([-117.130180, 32.748964]);
    points.push([-117.130113, 32.744129]);
    points.push([-117.129375, 32.739482]);
  } else if (key === 'Coimbra') {
    points.push([-8.402654, 40.19690]); // 'Sabor & Arte'
    points.push([-8.402655, 40.19689]); // 'Minipreco'
    points.push([-8.404072, 40.2041]); //  'McDonalds'
  } else {
    points.push([-73.5085338, 40.7053987]);
    points.push([-73.5269619, 40.6886314]);
    points.push([-73.5192391, 40.6796784]);
    points.push([-73.5047150, 40.6767325]);
  }
  return points;
};

export default {
  createLocation,
  listLocations,
  viewLocation,
  editLocation,
  deleteLocation,
  createZone,
  createMultipleZones,
  createScenarioLocation,
  listScenarioPoints
};
