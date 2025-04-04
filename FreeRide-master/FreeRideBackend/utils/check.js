import moment from 'moment-timezone';
import {
  Requests, Promocodes,
  Riders, PromocodeStatus, Locations,
  Rides, RideStatus, RequestStatus,
  Vehicles, VehicleTypes, Drivers, Services,
  Zones
} from '../models';
import {
  PromocodeError,
  LocationError, RiderNotFoundError,
  OngoingRideError, OngoingRequestError, ApplicationError
} from '../errors';
import { calculateAge } from './time';
import { deriveVehicleService } from './vehicle';

const RIDE_ACTIVE_STATUS = [
  RideStatus.RideInQueue,
  RideStatus.NextInQueue,
  RideStatus.DriverEnRoute,
  RideStatus.DriverArrived,
  RideStatus.RideInProgress
];

export const promocodeValidity = async (promocodeId, locationId, riderId) => {
  const rider = await Riders.findById(riderId);
  const promocode = await Promocodes.findById(promocodeId);

  let promocodeStatus;
  let promocodeUsesLeft;
  let promocodeUsesMax;
  let promocodeExpiryDate;

  promocodeStatus = PromocodeStatus.valid;
  if (!promocode || promocode.isDeleted || !promocode.isEnabled) {
    promocodeStatus = PromocodeStatus.invalid;
  } else if (String(promocode.location) !== String(locationId)) {
    promocodeStatus = PromocodeStatus.wrong_location;
  }

  if (promocode?.expiryDate) {
    promocodeExpiryDate = promocode.expiryDate;
    const timestampNow = moment().utc();
    const expiryDate = moment(promocode.expiryDate).utc();
    if (promocodeStatus.valid && !timestampNow.isBefore(expiryDate)) {
      promocodeStatus = PromocodeStatus.expired;
    }
  }

  if (rider && promocode?.usageLimit) {
    promocodeUsesMax = promocode.usageLimit;
    const usageCount = await Requests.find(
      { rider, 'paymentInformation.promocodeId': promocode._id, 'paymentInformation.promocodeUsed': true }
    ).countDocuments();
    promocodeUsesLeft = promocode.usageLimit - Math.min(usageCount, promocode.usageLimit);
    if (promocodeStatus.valid && usageCount >= promocode.usageLimit) {
      promocodeStatus = PromocodeStatus.usage_limit;
    }
  }

  return {
    promocodeId: promocode?._id ? promocode._id : null,
    promocodeCode: promocode?.code ? promocode?.code : null,
    promocodeName: promocode?.name ? promocode?.name : null,
    promocodeType: promocode?.type ? promocode?.type : null,
    promocodeValue: promocode?.value ? promocode?.value : null,
    promocodeUsesLeft,
    promocodeUsesMax,
    promocodeExpiryDate,
    ...promocodeStatus
  };
};

export const validatePromocodeObject = (bodyInfo) => {
  const body = bodyInfo;

  if (!body.isEnabled) { body.isEnabled = false; }
  if (!body.isDeleted) { body.isDeleted = false; }

  switch (body.type) {
  case 'percentage':
    body.value = body.value ? Math.max(Math.min(body.value, 100.0), 0.0) : body.value;
    break;
  case 'value':
    body.value = body.value ? Math.max(body.value, 0.0) : body.value;
    break;
  case 'full':
    body.value = null;
    break;
  default:
    throw new PromocodeError('Type must be either \'percentage\', \'value\' or \'full\'');
  }
  const isBeforeNow = moment(body.expiryDate).isBefore(moment().utc());
  if (body.expiryDate && isBeforeNow) {
    body.expiryDate = moment().utc().add(1, 'day').endOf('day');
  }
  return body;
};

export const validateFixedStop = async (body) => {
  const {
    mapLocation: { coordinates },
    location
  } = body;

  const locations = await Locations.find({
    serviceArea: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates
        }
      }
    }
  }).select('_id');

  if (!locations.map(item => String(item._id)).includes(String(location))) {
    throw new LocationError('Fixed stop is not within service area of location');
  }
};

export const meetsAgeRequirement = (location, rider) => {
  if (location?.riderAgeRequirement) {
    const age = calculateAge(rider.dob);
    return age >= location.riderAgeRequirement;
  }
  return true;
};

export const meetsFreeRideAgeRequirement = (location, rider) => {
  if (location?.freeRideAgeRestrictionEnabled) {
    const age = calculateAge(rider.dob);
    let above = true;
    let below = true;
    if (location.freeRideAgeRestrictionInterval?.min) {
      above = age >= location.freeRideAgeRestrictionInterval?.min;
    }
    if (location.freeRideAgeRestrictionInterval?.max) {
      below = age <= location.freeRideAgeRestrictionInterval?.max;
    }
    return above && below;
  }
  return false;
};


export const validateRiderDelete = async (riderId) => {
  const rider = await Riders.getRider({ _id: riderId });
  if (!rider) {
    throw new RiderNotFoundError('We were unable to fetch your account information.', 'riderAccount.infoFetchFail');
  }

  const isExistRide = await Rides.findOne({ rider: riderId, status: { $in: RIDE_ACTIVE_STATUS } });
  if (isExistRide) {
    throw new OngoingRideError('There are ongoing rides.', 'OngoingRideError.default');
  }

  const isExistRequest = await Requests.findOne({
    rider: riderId,
    status: RequestStatus.RideRequested
  });
  if (isExistRequest) {
    throw new OngoingRequestError('There are ongoing requests.', 'OngoingRequestError.default');
  }

  return rider;
};

export const validateVehicleUpdate = async (vehicleId, action = 'UPDATE') => {
  const vehicle = await Vehicles.findOne({ _id: vehicleId });
  if (!vehicle) {
    throw new ApplicationError('Unable to find vehicle data', 404);
  }
  if (vehicle.driverId) {
    throw new ApplicationError(`Unable to ${action.toLowerCase()} vehicle because driver is attached`, 400);
  }
  return vehicle;
};

export const validateVehicleTypesDelete = async (vehicleTypeId) => {
  const vehicleType = await VehicleTypes.getVehicleType({ _id: vehicleTypeId });
  if (!vehicleType) {
    throw new ApplicationError('Unable to find vehicle type data', 404);
  }
  const vehicles = await Vehicles.getVehicles({ isDeleted: false, vehicleType: vehicleType._id });
  if (vehicles && vehicles.total > 0) {
    throw new ApplicationError('Unable to delete - Please remove associated vehicles from type before delete', 400);
  }

  return vehicleType;
};

export const validateMatchingRule = (vehicleData, locationZones) => {
  const { matchingRule, zones } = vehicleData;
  switch (matchingRule) {
  case '':
  case undefined:
  case null:
  case 'shared':
    if (zones?.length) {
      throw new ApplicationError('No zone may be attached for this routing policy', 409);
    }
    break;
  case 'exclusive':
  case 'priority':
  case 'locked': {
    if (!zones?.length) {
      throw new ApplicationError('This routing policy requires at least one zone assigned', 409);
    }
    const correctZoneAssignment = locationZones ? zones.every(
      zone => locationZones.some(locZone => locZone.equals(zone))
    ) : false;
    if (!correctZoneAssignment) {
      throw new ApplicationError('The selected zones may not be assigned within this location', 409);
    }
    break;
  }
  default:
    throw new ApplicationError('Unknown matching rule', 409);
  }
};

export const checkMatchingRule = (vehicleData, locationZones) => {
  const { matchingRule } = vehicleData;
  if (!['shared', 'exclusive', 'priority', 'locked'].includes(matchingRule)) {
    throw new ApplicationError('Unknown matching rule', 409);
  }
  validateMatchingRule(vehicleData, locationZones);
};

export const checkVehicleAvailability = async (vehicleId, locationZones_) => {
  const vehicle = await Vehicles.findOne({ _id: vehicleId })
    .populate('vehicleType')
    .populate('zones', 'name')
    .populate('matchingRuleInfo');

  if (!vehicle) {
    throw new ApplicationError('We were unable to fetch vehicle information.', 404, 'vehicle.infoFetchFail');
  }

  if (!vehicle.isReady || vehicle.isDeleted || vehicle.driverId) {
    throw new ApplicationError('Vehicle is unavailable.', 400, 'vehicle.unavailable');
  }

  const isUnavailable = await Drivers.getDriver({ 'vehicle.vehicleId': vehicleId });
  if (isUnavailable) {
    throw new ApplicationError('Vehicle is unavailable.', 400, 'vehicle.unavailable');
  }

  const { location, matchingRule, zones } = vehicle;
  let locationZones = locationZones_;
  if (!locationZones_) {
    locationZones = await Zones.getZones({ location });
  }
  checkMatchingRule(
    { location, matchingRule, zones: zones.map(zone => zone._id) },
    locationZones
  );

  return vehicle;
};

export const checkServiceAvailability = async (serviceKey, vehicle) => {
  const availableServices = await Services.getServices({ isDeleted: false });
  const services = deriveVehicleService(vehicle, availableServices);

  const service = services.find(item => item.key === serviceKey);

  if (!service) {
    throw new ApplicationError('Service is not available', 400, 'service.unavailable');
  }

  return service;
};

export const validateAllowedToCheckInVehicle = async (driverId) => {
  const driver = await Drivers.getDriver({ _id: driverId });
  if (!driver.vehicle?.vehicleId) {
    throw new ApplicationError('No vehicle attached', 400);
  }

  if (driver.isAvailable) {
    throw new ApplicationError('Unable to check-in vehicle while available to receive rides', 400);
  }

  if (driver.driverRideList.length > 0) {
    throw new ApplicationError('There are active rides', 400);
  }

  return driver;
};

export const monthRangeLimitCheck = (filterParams, param = 'createdTimestamp') => {
  if (filterParams[param]?.start && filterParams[param]?.end) {
    const start = moment(filterParams[param].start);
    const end = moment(filterParams[param].end);
    const dayRange = end.diff(start, 'days');
    if (dayRange > 32) {
      throw new ApplicationError('Maximum date range is 31 days', 406);
    }
  }
};

export const verifyEqualIdArray = (current, updated) => {
  const sameItemCount = current.length === updated.length;
  const isArrayEqual = sameItemCount && current
    ? updated.every(
      updatedId => current.some(currentId => currentId.equals(updatedId))
    ) : false;
  return isArrayEqual;
};

export const checkRunning = (campaign) => {
  const currentDate = moment();
  const {
    campaignStart, campaignEnd,
    isEnabled, isDeleted
  } = campaign;

  if (isDeleted) {
    return false;
  }

  const startDate = campaignStart ? moment(campaignStart).tz('America/New_York', true).startOf('day') : null;
  const endDate = campaignEnd ? moment(campaignEnd).tz('America/New_York', true).endOf('day') : null;

  if (!startDate || !startDate.isValid() || !endDate || !endDate.isValid()) {
    return false;
  }

  return isEnabled && currentDate.isBetween(startDate.startOf('day'), endDate.endOf('day'), null, '[]');
};

export default {
  promocodeValidity,
  validatePromocodeObject,
  validateFixedStop,
  validateRiderDelete,
  meetsAgeRequirement,
  meetsFreeRideAgeRequirement,
  validateVehicleUpdate,
  validateVehicleTypesDelete,
  validateMatchingRule,
  checkMatchingRule,
  checkVehicleAvailability,
  checkServiceAvailability,
  validateAllowedToCheckInVehicle,
  monthRangeLimitCheck
};
