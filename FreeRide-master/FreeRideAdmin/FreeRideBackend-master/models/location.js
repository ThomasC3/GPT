import * as Sentry from '@sentry/node';

import { mongodb } from '../services';
import TimeSlot from './timeslot';
import { ApplicationError } from '../errors';
import { isPaymentInformationValid, isPwywInformationValid, isTipInformationValid } from '../utils/location';
import { createDefaultZone } from '../utils/zone';
import { FixedStops } from '.';

const { Schema, Types } = mongodb;

export const { ObjectId } = Schema;

const polygonSchema = Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    required: true
  },
  coordinates: {
    type: [[[Number]]],
    required: true
  }
}, {
  versionKey: false
});

const alertSchema = Schema({
  title: {
    type: String,
    default: 'Location Closed'
  },
  copy: {
    type: String,
    default: ''
  }
}, {
  _id: false,
  versionKey: false
});

const failedAgeRequirementAlertSchema = Schema({
  title: {
    type: String,
    default: 'Location unavailable'
  },
  copy: {
    type: String,
    default: 'You did not meet the age requirement for this location'
  }
}, {
  _id: false,
  versionKey: false
});

const advertisementSchema = Schema({
  imageUrl: {
    type: String
  },
  url: {
    type: String
  },
  ageRestriction: {
    type: Number,
    default: null
  }
}, {
  _id: false,
  versionKey: false
});

const copySchema = Schema({
  locale: {
    type: String,
    required: true
  },
  localeName: {
    type: String,
    required: true
  },
  closedCopy: {
    type: String
  },
  suspendedCopy: {
    type: String
  },
  suspendedTitle: {
    type: String
  },
  alert: {
    type: alertSchema,
    default: {}
  },
  failedAgeRequirementAlert: {
    type: failedAgeRequirementAlertSchema,
    default: {}
  },
  pwywCopy: {
    type: String
  },
  ridesFareCopy: {
    type: String
  }
}, {
  _id: false,
  versionKey: false
});

const paymentInformationSchema = Schema({
  ridePrice: {
    type: Number,
    default: null
  },
  capEnabled: {
    type: Boolean,
    default: false
  },
  priceCap: {
    type: Number,
    default: null
  },
  pricePerHead: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'usd'
  }
}, {
  _id: false,
  versionKey: false
});

const pwywInformationSchema = Schema({
  pwywOptions: {
    type: [Number],
    default: []
  },
  maxCustomValue: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'usd'
  }
}, {
  _id: false,
  versionKey: false
});

const tipInformationSchema = Schema({
  tipOptions: {
    type: [Number],
    default: []
  },
  maxCustomValue: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'usd'
  }
}, {
  _id: false,
  versionKey: false
});

const numberRangeSchema = Schema({
  min: {
    type: Number,
    default: null
  },
  max: {
    type: Number,
    default: null
  }
}, {
  _id: false,
  versionKey: false
});

const LocationSchema = Schema({
  isOpen: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean
  },
  hasAppService: {
    type: Boolean,
    default: true
  },
  organization: {
    type: String,
    default: null
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  // legacy field to suspendedCopy
  inactiveCopy: {
    type: String
  },
  closedCopy: {
    type: String,
    default: 'Circuit service is currently unavailable at this location.'
  },
  suspendedCopy: {
    type: String,
    default: 'Service is closed. Check our Service Information in the menu for details.'
  },
  suspendedTitle: {
    type: String,
    default: 'Suspended'
  },
  pwywCopy: {
    type: String,
    default: ''
  },
  showAlert: {
    type: Boolean,
    default: false
  },
  alert: {
    type: alertSchema,
    default: {}
  },
  copyData: {
    type: [copySchema],
    default: []
  },
  isADA: {
    type: Boolean
  },
  isAvailablilityOverlayActive: {
    type: Boolean
  },
  isUsingServiceTimes: {
    type: Boolean
  },
  poolingEnabled: {
    type: Boolean,
    default: false
  },
  cancelTime: {
    type: Number,
    default: 10
  },
  arrivedRangeFeet: {
    type: Number,
    default: 500
  },
  inversionRangeFeet: {
    type: Number,
    default: 2300
  },
  advertisement: {
    type: advertisementSchema,
    default: {}
  },
  name: {
    type: String
  },
  serviceHours: {
    type: [TimeSlot],
    default: []
  },
  breakDurations: {
    type: [Number],
    default: []
  },
  queueTimeLimit: {
    type: Number,
    default: 30
  },
  timezone: {
    type: String,
    default: 'America/New_York'
  },
  etaIncreaseLimit: {
    type: Number,
    default: 15
  },
  passengerLimit: {
    type: Number,
    default: 5
  },
  paymentEnabled: {
    type: Boolean,
    default: false
  },
  paymentInformation: {
    type: paymentInformationSchema,
    default: null,
    required: false
  },
  pwywEnabled: {
    type: Boolean,
    default: false
  },
  pwywInformation: {
    type: pwywInformationSchema,
    default: null,
    required: false
  },
  tipEnabled: {
    type: Boolean,
    default: false
  },
  tipInformation: {
    type: tipInformationSchema,
    default: null,
    required: false
  },
  concurrentRideLimit: {
    type: Number,
    default: 3
  },
  serviceArea: {
    type: polygonSchema,
    set: value => ({
      type: 'Polygon',
      coordinates: [value.map(el => [el.longitude, el.latitude])]
    }),
    get: value => value
  },
  fixedStopEnabled: {
    type: Boolean,
    default: false
  },
  riderPickupDirections: {
    type: Boolean,
    default: false
  },
  riderAgeRequirement: {
    type: Number,
    default: null
  },
  failedAgeRequirementAlert: {
    type: failedAgeRequirementAlertSchema,
    default: {}
  },
  driverLocationUpdateInterval: {
    type: Number,
    default: 10
  },
  blockLiveDriverLocation: {
    type: Boolean,
    default: true
  },
  fleetEnabled: {
    type: Boolean,
    default: false
  },
  unavailabilityReasons: {
    type: [String],
    default: []
  },
  cronWorkingSet: {
    type: String,
    default: 'ws_0'
  },
  freeRideAgeRestrictionEnabled: {
    type: Boolean,
    default: false
  },
  freeRideAgeRestrictionInterval: {
    type: numberRangeSchema,
    default: {}
  },
  // Data query helpers
  locationCode: {
    type: String,
    default: ''
  },
  stateCode: {
    type: String,
    default: ''
  },
  zones: {
    type: [Types.ObjectId],
    default: []
  },
  routingArea: {
    type: polygonSchema,
    set: value => ({
      type: 'Polygon',
      coordinates: [value.map(el => [el.longitude, el.latitude])]
    }),
    get: value => value
  },
  routingAreaUpdatedAt: {
    type: Date
  },
  poweredBy: {
    type: String,
    default: ''
  },
  ridesFareCopy: {
    type: String
  },
  hideFlux: {
    type: Boolean
  }
}, {
  versionKey: false,
  collection: 'Locations',
  strict: 'throw'
});

LocationSchema
  .virtual('pwywBasePrice')
  .get(function () {
    return this.pwywInformation?.pwywOptions[0];
  });

LocationSchema
  .virtual('tipBaseValue')
  .get(function () {
    return this.tipInformation?.tipOptions[0];
  });

LocationSchema
  .virtual('tipMaxValue')
  .get(function () {
    return this.tipInformation?.maxCustomValue;
  });

class Location {
  static async getNearest(coordinates, filters = null) {
    try {
      const pipeline = [];

      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [coordinates.longitude, coordinates.latitude] },
          spherical: true,
          distanceMultiplier: 1 / 1000,
          distanceField: 'distanceFromCurrentLocation'
        }
      });

      if (filters) {
        pipeline.push({
          $match: filters
        });
      }

      const locations = await this.aggregate(pipeline);

      return locations;
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  static async withinServiceArea(coordinates, locationId) {
    try {
      const serviceAreas = await this.find({
        serviceArea: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates
            }
          }
        }
      });
      if (!serviceAreas.length) {
        return false;
      }
      if (serviceAreas.map(item => String(item._id)).includes(String(locationId))) {
        return true;
      }
      return false;
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  static async getLocation(id) {
    return this.findById(id).catch((err) => {
      Sentry.captureException(err);
      throw err;
    });
  }

  static async getLocations(filterParams = {}) {
    const serviceKeys = ['skip', 'limit', 'sort', 'order'];

    const findQuery = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit ?? 30;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'name']: filterParams.order ? parseInt(filterParams.order, 10) : 1
    };

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key) && filterParams[key]) {
        findQuery[key] = filterParams[key];
      }
    });

    if (findQuery.name) findQuery.name = new RegExp(findQuery.name, 'i');

    try {
      const [locations = [], total = 0] = await Promise.all([
        this.find(findQuery).sort(sort).skip(skip).limit(limit),
        this.countDocuments(findQuery)
      ]);
      return {
        skip, limit, total, items: locations
      };
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  static async createLocation(_body) {
    const body = _body;

    isPaymentInformationValid(body);
    isPwywInformationValid(body);
    isTipInformationValid(body);

    if (body.stateCode) { body.stateCode = body.stateCode.toUpperCase(); }
    if (body.locationCode) { body.locationCode = body.locationCode.toUpperCase(); }

    let location;

    try {
      location = await this.create(body);
    } catch (err) {
      if (err.name === 'MongoServerError' && err.code === 16755) {
        throw new ApplicationError(
          'The service area you are provide is not properly fenced, please make sure it is closed (starts where it finishes).'
        );
      } else {
        Sentry.captureException(err);
        throw err;
      }
    }
    try {
      await createDefaultZone(location);
    } catch (err) {
      Sentry.captureException(err);
    }

    return location;
  }

  static async updateLocation(id, bodyParam) {
    const body = bodyParam;

    try {
      if (body.serviceArea) {
        body.serviceArea = {
          type: 'Polygon',
          coordinates: [body.serviceArea.map(el => [el.longitude, el.latitude])]
        };
      }
      if (body.routingArea) {
        body.routingArea = {
          type: 'Polygon',
          coordinates: [body.routingArea.map(el => [el.longitude, el.latitude])]
        };
      }

      isPaymentInformationValid(body);
      isPwywInformationValid(body);
      isTipInformationValid(body);

      if (body.stateCode) { body.stateCode = body.stateCode.toUpperCase(); }
      if (body.locationCode) { body.locationCode = body.locationCode.toUpperCase(); }

      const location = await this.findByIdAndUpdate(id, body, { new: true });
      return location;
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  static async getFixedStops(id, filterParams) {
    const serviceKeys = [
      'skip', 'limit', 'sort', 'order',
      'locationId', 'fixedStops', 'latitude',
      'longitude'
    ];

    const match = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit || 30;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'name']: filterParams.order ? parseInt(filterParams.order, 10) : 1
    };

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key) && filterParams[key]) {
        match[key] = filterParams[key];
      }
    });

    if (match.name) match.name = new RegExp(filterParams.name, 'i');
    if (filterParams.fixedStops) {
      match._id = { $nin: filterParams.fixedStops.map(item => new Types.ObjectId(item)) };
    }

    match.location = id;
    match.isDeleted = false;

    const pipeline = [];

    if (filterParams.latitude && filterParams.longitude) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [filterParams.longitude, filterParams.latitude] },
          spherical: true,
          distanceMultiplier: 1 / 1000,
          distanceField: 'distanceFromRider'
        }
      });
    }

    pipeline.push({ $match: match });
    pipeline.push({ $sort: sort });

    const pipelineResult = [...pipeline];
    pipeline.push({ $count: 'countDocuments' });

    pipelineResult.push({ $skip: skip });
    pipelineResult.push({ $limit: limit });

    try {
      const [fixedStops = [], total = 0] = await Promise.all([
        FixedStops.aggregate(pipelineResult),
        FixedStops.aggregate(pipeline).countDocuments
      ]);

      return {
        skip, limit, total, items: fixedStops
      };
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }
}

LocationSchema.loadClass(Location);

LocationSchema.set('toJSON', {
  getters: true,
  transform: (_doc, ret) => {
    const result = ret;

    result.id = result._id.toString();
    delete result._id;
    // eslint-disable-next-line no-underscore-dangle
    delete result.__v;

    return result;
  }
});

LocationSchema.index({ serviceArea: '2dsphere' });
LocationSchema.index({ organization: 1 });

export default mongodb.model('Location', LocationSchema);
