
import lodash from 'lodash';
import {
  Locations, Zones, Vehicles, PaymentPolicies
} from '../../../models';
import {
  dumpLocationForAdmin, dumpZoneForAdmin, dumpVehicleForAdmin, dumpPaymentPoliciesForAdmin
} from '../../../utils/dump';
import { validator } from '../../../utils';
import { commonAttributeObj } from '../../../utils/transformations';
import { isFreeRideAgeRestrictionValid, handleLocationCodeUpdate } from '../../../utils/location';
import { adminErrorCatchHandler } from '..';
import { ApplicationError, LocationNotFoundError } from '../../../errors';
import { updateDefaultZoneCoordinates, locationValidator, hasAccessToAllLocations } from '../utils/location';
import { createDefaultZone } from '../../../utils/zone';
import { auth0ClientInstance } from '../utils/Auth0Client';


const ALLOWED_ATTRIBUTES = [
  'isOpen',
  'isActive',
  'hasAppService',
  'isSuspended',
  'routingArea',
  // legacy field to suspendedCopy
  'inactiveCopy',
  'closedCopy',
  'suspendedCopy',
  'suspendedTitle',
  'pwywCopy',
  'showAlert',
  'alert',
  'copyData',
  'isADA',
  'isAvailablilityOverlayActive',
  'isUsingServiceTimes',
  'poolingEnabled',
  'cancelTime',
  'arrivedRangeFeet',
  'inversionRangeFeet',
  'name',
  'serviceHours',
  'queueTimeLimit',
  'breakDurations',
  'timezone',
  'etaIncreaseLimit',
  'passengerLimit',
  'paymentEnabled',
  'paymentInformation',
  'pwywEnabled',
  'pwywInformation',
  'tipEnabled',
  'tipInformation',
  'concurrentRideLimit',
  'serviceArea',
  'fixedStopEnabled',
  'riderPickupDirections',
  'riderAgeRequirement',
  'failedAgeRequirementAlert',
  'fleetEnabled',
  'freeRideAgeRestrictionEnabled',
  'freeRideAgeRestrictionInterval',
  'locationCode',
  'stateCode',
  'poweredBy',
  'ridesFareCopy',
  'hideFlux'
];

const createZoneInputValidator = body => validator.partialValidate(
  validator.rules.object().keys({
    name: validator.rules.string().allow('').required(),
    description: validator.rules.string().allow(''),
    code: validator.rules.string().allow('').required(),
    polygonFeatureId: validator.rules.string().allow(''),
    poweredBy: validator.rules.string().allow(''),
    fixedStopEnabled: validator.rules.boolean(),
    serviceArea: validator.rules.array().items(
      validator.rules.array().items(
        validator.rules.array().items(
          validator.rules.number().required()
        ).length(2).required()
      )
    ).required()
  }),
  body
);

const updateZoneInputValidator = body => validator.partialValidate(
  validator.rules.object().keys({
    name: validator.rules.string().allow(''),
    description: validator.rules.string().allow(''),
    code: validator.rules.string().allow(''),
    polygonFeatureId: validator.rules.string().allow(''),
    poweredBy: validator.rules.string().allow(''),
    fixedStopEnabled: validator.rules.boolean(),
    serviceArea: validator.rules.array().items(
      validator.rules.array().items(
        validator.rules.array().items(
          validator.rules.number().required()
        ).length(2).required()
      )
    )
  }),
  body
);

const createLocation = async (req, res) => {
  const {
    body: location,
    user: admin
  } = req;

  try {
    isFreeRideAgeRestrictionValid(location);

    const result = await Locations.createLocation(location);
    if (!hasAccessToAllLocations(admin)) {
      await auth0ClientInstance.updateAdmin(admin.id, {
        locations: [...admin.locations, result._id]
      });
    }
    res.status(200).json(dumpLocationForAdmin(result));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getLocation = async (req, res) => {
  const {
    params: { id },
    user: admin
  } = req;

  try {
    await locationValidator(id, admin);

    const location = await Locations.getLocation({ _id: id });
    await createDefaultZone(location);

    const zones = await Zones.getZones({ location: id });
    res.status(200).json(dumpLocationForAdmin({ ...location.toObject(), zones }));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateLocation = async (req, res) => {
  const {
    params: { id },
    user: admin,
    body: locationFormData
  } = req;

  try {
    isFreeRideAgeRestrictionValid(locationFormData);

    await locationValidator(id, admin);

    const locationData = commonAttributeObj(ALLOWED_ATTRIBUTES, locationFormData);

    const currentLocation = await Locations.getLocation({ _id: id });
    // TODO: The current usage of the coordinates variable can be confusing as its value
    // depends on whether it comes from the frontend or not.
    // Modify all instances where coordinates is received from the
    // frontend to ensure it only accepts an array of numbers instead of longitude/latitude pairs.
    if (locationData.routingArea) {
      const routingAreaCoords = [locationData.routingArea.map(el => [el.longitude, el.latitude])];
      if (
        !lodash.isEqual(currentLocation?.routingArea?.coordinates, routingAreaCoords)
      ) {
        // TODO: Can we find a way to notify the developers that this changed?
        locationData.routingAreaUpdatedAt = new Date();
      }
    }

    const updatedLocation = await Locations.updateLocation(id, locationData);

    if (locationFormData.locationCode !== currentLocation.locationCode) {
      await handleLocationCodeUpdate(updatedLocation);
    }

    await updateDefaultZoneCoordinates(updatedLocation);
    const zones = await Zones.getZones({ location: id });

    res.status(200).json(dumpLocationForAdmin({ ...updatedLocation.toObject(), zones }));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getLocations = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        skip: validator.rules.number().integer().min(0),
        limit: validator.rules.number().integer().min(0),
        name: validator.rules.string().allow(''),
        sort: validator.rules.string().valid('', 'name'),
        order: validator.rules.string().allow('')
      }),
      req.query
    );

    if (!hasAccessToAllLocations(req.user)) {
      filterParams._id = { $in: req.user.locations };
    }

    const locations = await Locations.getLocations(filterParams);
    locations.items = locations.items.map(dumpLocationForAdmin);
    res.status(200).json(locations);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const createZone = async (req, res) => {
  try {
    const zoneData = createZoneInputValidator(req.body);

    const location = await Locations.getLocation({ _id: req.params.id });
    if (!location) {
      throw new LocationNotFoundError('Location not found');
    }
    const zone = await Zones.createZone(zoneData, location._id);

    res.status(200).json(dumpZoneForAdmin(zone));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateZone = async (req, res) => {
  try {
    const { params: { id: locationId, zoneId } } = req;
    const zoneUpdateData = updateZoneInputValidator(req.body);

    const location = await Locations.getLocation({ _id: locationId });
    if (!location) {
      throw new LocationNotFoundError('Location not found');
    }

    const zone = await Zones.updateZone(
      { _id: zoneId, location: location._id },
      zoneUpdateData
    );
    if (!zone) {
      throw new ApplicationError('Zone not found', 404);
    } else if (zone.isDefault) {
      throw new ApplicationError('Default zone cannot be updated', 400);
    }

    const vehicles = await Vehicles.find({
      location: location._id,
      isDeleted: false,
      matchingRule: { $in: ['priority', 'exclusive', 'locked'] },
      zones: zone._id
    }).populate('driverId');

    let defaultZoneVehicles = [];
    if (zone.isDefault) {
      defaultZoneVehicles = await Vehicles.find({
        location: location._id,
        isDeleted: false,
        matchingRule: 'shared'
      }).populate('driverId');
    }

    res.status(200).json({
      ...dumpZoneForAdmin(zone),
      vehicles: [...vehicles, ...defaultZoneVehicles].map(vehicle => dumpVehicleForAdmin(vehicle))
    });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteZone = async (req, res) => {
  try {
    const { params: { id: locationId, zoneId } } = req;
    const location = await Locations.getLocation({ _id: locationId });
    if (!location) {
      throw new LocationNotFoundError('Location not found');
    }

    const zone = await Zones.getZoneById(zoneId);

    if (zone.isDefault) {
      throw new ApplicationError('Cannot delete default zone', 409);
    }

    const vehicles = await Vehicles.find({
      location: location._id,
      isDeleted: false,
      matchingRule: { $in: ['priority', 'exclusive', 'locked'] },
      zones: zone._id
    });

    if (vehicles.length) {
      throw new ApplicationError('Cannot delete zone with vehicles attached', 409);
    }

    const deletedZone = await Zones.deleteZone(zoneId);

    if (!deletedZone) {
      throw new ApplicationError('Zone not found', 404);
    }

    res.status(200).json({ message: 'Zone deleted successfully' });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getZones = async (req, res) => {
  try {
    const { params: { id: locationId } } = req;
    const location = await Locations.getLocation({ _id: locationId });
    if (!location) {
      throw new LocationNotFoundError('Location not found');
    }

    const zones = await Zones.getZones({ location: locationId });
    const vehicles = await Vehicles.find({
      location: location._id,
      isDeleted: false,
      matchingRule: { $in: ['shared', 'priority', 'exclusive', 'locked'] }
    }).populate('driverId');

    const zonesWithVehicles = !(zones?.length) ? [] : zones.map(zone => ({
      ...dumpZoneForAdmin(zone),
      fixedStopEnabled: zone.isDefault ? location.fixedStopEnabled : zone.fixedStopEnabled,
      vehicles: (zone.isDefault ? (
        [
          ...vehicles.filter(vehicle => vehicle.matchingRule === 'shared'),
          ...vehicles.filter(vehicle => vehicle.matchingRule !== 'shared' && vehicle.zones.includes(zone._id))
        ]
      ) : (
        vehicles.filter(vehicle => vehicle.zones.includes(zone._id))
      )).map(vehicle => dumpVehicleForAdmin(vehicle))
    }));

    res.status(200).json(zonesWithVehicles);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateLocationPaymentPolicies = async (req, res) => {
  try {
    const { body, params: { id: locationId } } = req;
    const location = await Locations.getLocation({ _id: locationId });
    if (!location) {
      throw new LocationNotFoundError('Location not found');
    }

    const policies = await Promise.all(body.map(async (policy) => {
      const { originZone, destinationZone, value } = policy;
      const origin = await Zones.getZoneById(originZone);
      const destination = await Zones.getZoneById(destinationZone);
      if (!origin || !destination) {
        throw new ApplicationError('Zone not found', 404);
      }
      const policyObj = await PaymentPolicies.updateOrCreatePaymentPolicy({
        originZone: origin._id,
        destinationZone: destination._id,
        location: location._id,
        value
      });
      return policyObj;
    }));

    res.status(200).json(dumpPaymentPoliciesForAdmin(policies));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getLocationPaymentPolicies = async (req, res) => {
  try {
    const { id: locationId } = req.params;
    const location = await Locations.getLocation({ _id: locationId });
    if (!location) {
      throw new LocationNotFoundError('Location not found');
    }

    const policies = await PaymentPolicies.getPaymentPolicies({ location: locationId });
    res.status(200).json(dumpPaymentPoliciesForAdmin(policies));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  createLocation,
  getLocation,
  updateLocation,
  getLocations,
  createZone,
  updateZone,
  deleteZone,
  getZones,
  updateLocationPaymentPolicies,
  getLocationPaymentPolicies
};
