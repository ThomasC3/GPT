import mongoose from 'mongoose';
import {
  VehicleTypes, Vehicles, Services, MatchingRules
} from '../../models';

const createVehicle = async (vehicleTypeParams, vehicleParams) => {
  let vehicleType = vehicleTypeParams;
  if (!vehicleType._id) {
    vehicleType = await VehicleTypes.createVehicleType(vehicleTypeParams, vehicleParams);
  }
  const vehicle = await Vehicles.createVehicle({
    vehicleType: vehicleType._id,
    matchingRule: 'shared',
    zones: [],
    ...vehicleParams
  });
  return { vehicle, vehicleType };
};

export const createGEMVehicle = async (isADA, locationId, options = {}) => {
  const gemVehicleTypeParams = {
    type: `GEM ${new mongoose.Types.ObjectId()}`,
    passengerCapacity: isADA ? 2 : 5,
    adaCapacity: isADA ? 1 : 0,
    checkInForm: options.checkInForm ? options.checkInForm : null,
    checkOutForm: options.checkOutForm ? options.checkOutForm : null,
    profile: options.profile ? options.profile : null,
    fallbackProfile: options.fallbackProfile ? options.fallbackProfile : null
  };

  let { matchingRule, zones } = options;
  if (!matchingRule) {
    matchingRule = await MatchingRules.findOne({ key: 'shared' });
    if (!matchingRule) {
      matchingRule = await MatchingRules.create({
        key: 'shared',
        title: 'Shared',
        description: 'Designated for all requests across all zones'
      });
    }
  } else if (!Object.keys(matchingRule).includes('key')) {
    const createdMatchingRule = await MatchingRules.findOne({ key: matchingRule });
    if (!createdMatchingRule) {
      matchingRule = await MatchingRules.create({
        key: matchingRule,
        title: matchingRule,
        description: matchingRule
      });
    } else {
      matchingRule = createdMatchingRule;
    }
  }
  if (zones?.length > 0 && Object.keys(zones[0]).includes('name')) {
    zones = zones.map(zone => zone.id || zone._id);
  }

  const gemVehicleParams = {
    name: `GEM ${new mongoose.Types.ObjectId()}`,
    location: locationId || new mongoose.Types.ObjectId(),
    publicId: `${new mongoose.Types.ObjectId()}`,
    passengerCapacity: gemVehicleTypeParams.passengerCapacity,
    adaCapacity: gemVehicleTypeParams.adaCapacity,
    matchingRule: matchingRule.key,
    zones: zones?.length > 0 ? zones : [],
    licensePlate: options.licensePlate,
    jobs: options.jobs || []
  };

  const { vehicle, vehicleType } = await createVehicle(gemVehicleTypeParams, gemVehicleParams);
  const serviceKey = isADA ? 'ada_only' : 'passenger_only';
  const {
    _id: serviceId = new mongoose.Types.ObjectId(),
    title: serviceTitle = isADA ? 'ADA Only' : 'Passenger Only'
  } = await Services.findOne({ key: serviceKey }) || {};

  return {
    vehicleId: vehicle._id,
    vehicleName: vehicle.name,
    vehicleType: {
      id: vehicleType.id,
      type: vehicleType.type,
      profile: vehicleType.profile,
      fallbackProfile: vehicleType.fallbackProfile
    },
    passengerCapacity: vehicle.passengerCapacity,
    adaCapacity: vehicle.adaCapacity,
    publicId: vehicle.publicId,
    service: {
      id: serviceId,
      key: serviceKey,
      title: serviceTitle
    },
    matchingRule: options.driverDump ? matchingRule : matchingRule.key,
    zones: options.driverDump ? (
      (options.zones || []).map(zone => ({ id: zone._id || zone.id, name: zone.name }))
    ) : zones,
    licensePlate: vehicle.licensePlate,
    jobs: vehicle.jobs || []
  };
};

export const createMatchingRules = async () => Promise.all([
  MatchingRules.create({
    key: 'shared',
    title: 'Shared',
    description: 'Designated for all requests across all zones'
  }),
  MatchingRules.create({
    key: 'priority',
    title: 'Priority',
    description: 'Designated for requests to or from specific zones but available for all requests if needed'
  }),
  MatchingRules.create({
    key: 'exclusive',
    title: 'Exclusive',
    description: 'Only designated for requests to or from specific zones'
  }),
  MatchingRules.create({
    key: 'locked',
    title: 'Locked',
    description: 'Only designated for requests that begin and end inside specific zones'
  })
]);

export default {
  createGEMVehicle,
  createMatchingRules
};
