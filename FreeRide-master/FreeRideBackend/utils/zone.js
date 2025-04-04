import { Zones } from '../models';

export const createDefaultZone = async (location) => {
  const defaultZone = await Zones.getZone({ location: location._id, isDefault: true });
  if (!defaultZone) {
    const defaultZoneData = {
      name: 'Default',
      description: 'Default zone',
      code: '0101010101',
      polygonFeatureId:
        Math.random().toString(36).substring(2, 15)
        + Math.random().toString(36).substring(2, 15),
      serviceArea: location.serviceArea?.coordinates,
      isDefault: true
    };
    return Zones.createZone(defaultZoneData, location._id);
  }
  return defaultZone;
};

export default {
  createDefaultZone
};
