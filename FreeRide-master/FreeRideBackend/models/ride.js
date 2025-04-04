import events from 'events';
import moment from 'moment';
import { mongodb } from '../services';
import { updateRouteRide, paymentTotalCount, tipTotalCount } from '../utils/ride';
import { dumpRideUpdateEvent, dumpRideForDriverRideList } from '../utils/dump';
import { buildRatingQuery } from '../utils/query';
import { UserNotFoundError } from '../errors';
import { buildGetRidesQuery } from './utils/rides';
import {
  Locations, Drivers, Riders, PaymentStatus, RideStatus, Rides
} from '.';

export const eventEmitter = new events.EventEmitter();
const { Schema, Types } = mongodb;
export const { ObjectId } = Schema;
export const TypeObjectId = Types.ObjectId;

const emitRideUpdateEvent = data => eventEmitter.emit('ride-updates', data);

export const RIDES_CANCELLATION_SOURCES = {
  DRIVER: 'DRIVER',
  RIDER: 'RIDER',
  ADMIN: 'ADMIN'
};

const cancelledByOptions = {
  values: Object.values(RIDES_CANCELLATION_SOURCES),
  message: 'Value must be either of \'DRIVER\', \'RIDER\', \'ADMIN\''
};

const PAYMENT_SUCCEEDED_STATUS = PaymentStatus.properties[PaymentStatus.succeeded].name;
const PAYMENT_REFUNDED_STATUS = PaymentStatus.properties[PaymentStatus.refunded].name;
const PAYMENT_PENDING_STATUS = PaymentStatus.properties[PaymentStatus.requires_capture].name;
const PAYMENT_CANCELLED_STATUS = PaymentStatus.properties[PaymentStatus.canceled].name;

const INACTIVE_RIDE_STATUS = [
  RideStatus.RequestCancelled,
  RideStatus.CancelledInQueue,
  RideStatus.CancelledEnRoute,
  RideStatus.CancelledNoShow,
  RideStatus.CancelledNotAble,
  RideStatus.RideComplete,
  RideStatus.RandomRideComplete
];

export const PRE_ARRIVED_STATUS = [
  RideStatus.RideInQueue,
  RideStatus.NextInQueue,
  RideStatus.DriverEnRoute
];

export const PRE_PICKUP_STATUS = [
  ...PRE_ARRIVED_STATUS,
  RideStatus.DriverArrived
];

const ACTIVE_RIDE_STATUS = [
  ...PRE_PICKUP_STATUS,
  RideStatus.RideInProgress
];

const zoneSchema = Schema({
  id: {
    type: ObjectId,
    ref: 'Zone'
  },
  name: {
    type: String
  }
}, {
  _id: false,
  versionKey: false
});

const vehicleTypeSchema = Schema({
  id: {
    type: ObjectId,
    ref: 'VehicleType'
  },
  type: {
    type: String
  },
  profile: {
    type: String
  },
  fallbackProfile: {
    type: String
  }
}, {
  _id: false,
  versionKey: false
});

const vehicleSchema = Schema({
  vehicleId: {
    type: ObjectId,
    ref: 'Vehicle',
    required: true
  },
  vehicleName: {
    type: String,
    required: true
  },
  licensePlate: {
    type: String
  },
  vehicleType: {
    type: vehicleTypeSchema
  },
  publicId: {
    type: String,
    required: true
  },
  service: {
    id: {
      type: ObjectId,
      ref: 'Service',
      required: true
    },
    key: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    }
  },
  matchingRule: {
    id: {
      type: ObjectId,
      ref: 'MatchingRule'
    },
    key: {
      type: String
    },
    title: {
      type: String
    }
  },
  zones: {
    type: [zoneSchema],
    default: []
  },
  jobs: [{
    type: ObjectId,
    ref: 'Job'
  }],
  profile: {
    type: String
  }
}, {
  _id: false,
  versionKey: false
});

const RideSchema = Schema({
  requestTimestamp: {
    type: Date
  },
  arrivalTimestamp: {
    type: Date
  },
  cancelledBy: {
    type: String,
    enum: cancelledByOptions
  },
  cancelTimestamp: {
    type: Date
  },
  createdTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  dropoffAddress: {
    type: String
  },
  dropoffLatitude: {
    type: Number
  },
  dropoffLongitude: {
    type: Number
  },
  isDropoffFixedStop: {
    type: Boolean,
    required: true,
    default: false
  },
  dropoffFixedStopId: {
    type: ObjectId,
    ref: 'FixedStop',
    required: false
  },
  dropoffFixedStopName: {
    type: String
  },
  hailedDropoffLatitude: {
    type: Number
  },
  hailedDropoffLongitude: {
    type: Number
  },
  dropoffZone: {
    type: zoneSchema,
    default: {}
  },
  dropoffTimestamp: {
    type: Date
  },
  eta: {
    type: Number
  },
  initialEta: {
    type: Number
  },
  dropoffEta: {
    type: Number
  },
  initialDropoffEta: {
    type: Number
  },
  isOldRecord: {
    type: Boolean,
    required: true,
    default: false
  },
  isADA: {
    type: Boolean,
    required: true
  },
  location: {
    type: ObjectId,
    ref: 'Location',
    required: true
  },
  passengers: {
    type: Number,
    required: true
  },
  pickupAddress: {
    type: String
  },
  pickupLatitude: {
    type: Number
  },
  pickupLongitude: {
    type: Number
  },
  isPickupFixedStop: {
    type: Boolean,
    required: true,
    default: false
  },
  pickupFixedStopId: {
    type: ObjectId,
    ref: 'FixedStop',
    required: false
  },
  pickupFixedStopName: {
    type: String
  },
  pickupZone: {
    type: zoneSchema,
    default: {}
  },
  isFixedStop: {
    type: Boolean,
    required: true,
    default: false
  },
  hailedPickupLatitude: {
    type: Number
  },
  hailedPickupLongitude: {
    type: Number
  },
  pickupTimestamp: {
    type: String
  },
  ratingForRider: {
    type: Number,
    default: null
  },
  feedbackForRider: {
    type: String,
    default: null
  },
  ratingForDriver: {
    type: Number,
    default: null
  },
  feedbackForDriver: {
    type: String,
    default: null
  },
  request: {
    type: ObjectId,
    ref: 'Request'
  },
  requestMessages: {
    type: [ObjectId],
    ref: 'Message'
  },
  rider: {
    type: ObjectId,
    ref: 'Rider'
  },
  riderFirstName: {
    type: String
  },
  riderLastName: {
    type: String
  },
  status: {
    type: Number
  },
  // set by geolocation, when driver-moved for activeRide
  driverArrivingTimestamp: {
    type: Date
  },
  // set by driver btn
  driverArrivedTimestamp: {
    type: Date
  },
  stopsBeforeDropoff: {
    type: Number,
    default: null
  },
  fixedStopsBeforeDropoff: {
    type: Number,
    default: null
  },
  poolingTag: {
    type: Boolean,
    default: null
  },
  poolingLocation: {
    type: Boolean,
    default: false
  },
  ackReceived: {
    type: Boolean,
    default: false
  },
  etaDifference: {
    type: Number,
    default: null
  },
  etaMinutes: {
    type: Number,
    default: null
  },
  // Driver info
  driver: {
    type: ObjectId,
    ref: 'Driver'
  },
  driverFirstName: {
    type: String
  },
  driverLastName: {
    type: String
  },
  driverDisplayName: {
    type: String
  },
  driverProfilePicture: {
    type: String
  },
  driverInitialLatitude: {
    type: Number
  },
  driverInitialLongitude: {
    type: Number
  },
  vehicle: {
    type: vehicleSchema,
    default: {}
  }
}, {
  collection: 'Rides',
  strict: 'throw'
});


RideSchema.virtual('tips', {
  ref: 'Tip',
  localField: '_id',
  foreignField: 'rideId'
});


class Ride {
  /**
   * Search Rides
   * @param {Object} filterParams filter params object
   * @returns {Promise} promise, which will be resolved when rides found
   */
  static getRidesCursor(filterParams = {}, locationTimezone = null) {
    const { query } = buildGetRidesQuery({ ...filterParams, noLimit: true }, locationTimezone);
    return query.cursor();
  }

  static async getRides(filterParams = {}) {
    const locationTimezone = filterParams.location
      ? (await Locations.getLocation(filterParams.location))?.timezone
      : null;

    const { query, skip, limit } = buildGetRidesQuery(filterParams, locationTimezone);
    let paginatedQuery = Rides.find().merge(query);

    if (skip) paginatedQuery = paginatedQuery.skip(skip);
    if (limit) paginatedQuery = paginatedQuery.limit(limit);

    const [items = [], total = []] = await Promise.all([
      paginatedQuery,
      query
    ]);

    const paymentTotal = {
      succeededView:
        paymentTotalCount(items, PAYMENT_SUCCEEDED_STATUS)
        + paymentTotalCount(items, PAYMENT_REFUNDED_STATUS)
        - paymentTotalCount(items, PAYMENT_REFUNDED_STATUS, 'amountRefunded'),
      refundedView: paymentTotalCount(items, PAYMENT_REFUNDED_STATUS, 'amountRefunded'),
      pendingView: paymentTotalCount(items, PAYMENT_PENDING_STATUS),
      cancelledView: paymentTotalCount(items, PAYMENT_CANCELLED_STATUS),
      succeeded:
        paymentTotalCount(total, PAYMENT_SUCCEEDED_STATUS)
        + paymentTotalCount(total, PAYMENT_REFUNDED_STATUS)
        - paymentTotalCount(total, PAYMENT_REFUNDED_STATUS, 'amountRefunded'),
      refunded: paymentTotalCount(total, PAYMENT_REFUNDED_STATUS, 'amountRefunded'),
      pending: paymentTotalCount(total, PAYMENT_PENDING_STATUS),
      cancelled: paymentTotalCount(total, PAYMENT_CANCELLED_STATUS)
    };

    const tipTotal = {
      totalView: tipTotalCount(items, 'total'),
      netView: tipTotalCount(items, 'net'),
      feeView: tipTotalCount(items, 'fee'),
      total: tipTotalCount(total, 'total'),
      net: tipTotalCount(total, 'net'),
      fee: tipTotalCount(total, 'fee')
    };

    return {
      total: total.length, paymentTotal, tipTotal, items, skip, limit
    };
  }

  static async getRide(params) {
    try {
      const ride = await this
        .findOne(params)
        .populate([
          { path: 'driver', select: 'firstName lastName currentLocation' },
          { path: 'rider', select: 'firstName lastName' },
          { path: 'location', select: 'name timezone' },
          { path: 'requestMessages', model: 'Message', sort: { createdTimestamp: 1 } },
          { path: 'request' },
          {
            path: 'tips',
            match: { status: PAYMENT_SUCCEEDED_STATUS },
            select: 'total net fee status createdTimestamp currency'
          }
        ]);
      return ride.toJSON();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Updates a ride record
   * @param {Object} body body of ride record
   * @returns {Promise} Returns promise which will be resolved when record saved
   */
  static async updateRide(id, body, addParams = {}) {
    try {
      let params = { _id: id };

      if (Object.keys(addParams).length) {
        params = { ...params, ...addParams };
      }

      const updatedRide = await this.findOneAndUpdate(
        params,
        body,
        {
          new: true
        }
      ).populate({ path: 'request', select: 'paymentInformation' });

      if (updatedRide) {
        const keys = Object.keys(body);
        const statusUpdated = keys.includes('status') || (keys.includes('$set') && body.$set.status);
        if (statusUpdated) {
          emitRideUpdateEvent(dumpRideUpdateEvent(updatedRide));

          if (INACTIVE_RIDE_STATUS.includes(updatedRide.status)) {
            await Drivers.updateOne(
              { _id: updatedRide.driver },
              {
                $pull: {
                  driverRideList: {
                    rideId: updatedRide._id
                  }
                }
              }
            );
          }
        }
      }

      return updatedRide;
    } catch (err) {
      throw err;
    }
  }

  static async createRide(body, hailed = false) {
    try {
      const createdRide = await this.create(body);

      await Drivers.updateOne(
        { _id: createdRide.driver },
        {
          $addToSet: {
            driverRideList: dumpRideForDriverRideList(createdRide)
          }
        }
      );

      emitRideUpdateEvent({
        ride: createdRide._id.toString(),
        status: createdRide.status,
        message: null,
        createdRide: true,
        hailed,
        driver: createdRide.driver.toString()
      });

      return createdRide;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Cancels rider's ride
   * @param {String} riderId id of rider
   * @returns {Promise} Returns promise which will be resolve when ride cancelled
   */
  static async cancelByRider(request, riderId) {
    try {
      const timeNow = Date.now();
      const ride = await this.findOne({
        rider: riderId,
        request
      });

      if (ride) {
        // Only activate cooldown if a ride/driver is assigned
        await Riders.updateRider(riderId, { lastCancelTimestamp: timeNow });

        ride.status = RideStatus.RequestCancelled;
        ride.cancelTimestamp = timeNow;
        ride.cancelledBy = RIDES_CANCELLATION_SOURCES.RIDER;

        const updatedRide = await ride.save();

        await updateRouteRide(updatedRide, 'cancel');

        await Drivers.updateOne(
          { _id: updatedRide.driver },
          {
            $pull: {
              driverRideList: {
                rideId: updatedRide._id
              }
            }
          }
        );

        emitRideUpdateEvent({
          ride: updatedRide._id,
          status: updatedRide.status,
          message: null
        });

        return updatedRide;
      }

      return null;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Finds history of rides
   * @param {Object} filterParams filter params object
   * @returns {Promise} promise, which will be resolved when rides found
   */
  static async getHistory(filterParams = {}) {
    const findQuery = {};
    const serviceKeys = ['skip', 'limit', 'sort', 'order', 'isActiveOnly', 'populate'];

    if (filterParams.isActiveOnly) {
      findQuery.status = { $in: ACTIVE_RIDE_STATUS };
    }

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key)) {
        findQuery[key] = filterParams[key];
      }
    });

    let populateKeys = filterParams.populate?.split(' ') || ['driver'];
    const addPopulate = [];
    const populateSelectFirst = [];
    if (populateKeys.includes('pickupFixedStopId')) {
      populateKeys = populateKeys.filter(key => key !== 'pickupFixedStopId');
      addPopulate.push({
        $lookup: {
          from: 'FixedStops',
          localField: 'pickupFixedStopId',
          foreignField: '_id',
          as: 'pickupFixedStopId'
        }
      });
      populateSelectFirst.push({
        $addFields: {
          pickupFixedStopId: { $arrayElemAt: ['$pickupFixedStopId', 0] }
        }
      });
    }
    if (populateKeys.includes('dropoffFixedStopId')) {
      populateKeys = populateKeys.filter(key => key !== 'dropoffFixedStopId');
      addPopulate.push({
        $lookup: {
          from: 'FixedStops',
          localField: 'dropoffFixedStopId',
          foreignField: '_id',
          as: 'dropoffFixedStopId'
        }
      });
      populateSelectFirst.push({
        $addFields: {
          dropoffFixedStopId: { $arrayElemAt: ['$dropoffFixedStopId', 0] }
        }
      });
    }

    const key = populateKeys[0] || 'driver';

    const populate = {
      lookup: {
        from: `${key.charAt(0).toUpperCase() + key.slice(1)}s`,
        localField: key,
        foreignField: '_id',
        as: `${key}s`
      },
      addFields: {
        route: { $arrayElemAt: ['$routes', 0] }
      },
      project: { routes: 0 }
    };

    populate.project[`${key}s`] = 0;
    populate.addFields[`${key}`] = { $arrayElemAt: [`$${key}s`, 0] };

    if (findQuery.rider) findQuery.rider = new Types.ObjectId(findQuery.rider);
    if (findQuery.driver) findQuery.driver = new Types.ObjectId(findQuery.driver);
    if (findQuery.location) findQuery.location = new Types.ObjectId(findQuery.location);

    const sort = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit || 30;
    const order = filterParams.order === 'desc' ? -1 : 1;
    sort[filterParams.sort || 'createdTimestamp'] = order;

    const pipeline = [
      { $match: findQuery },
      { $sort: sort },
      { $limit: skip + limit },
      { $skip: skip },
      { $lookup: populate.lookup },
      {
        $lookup: {
          from: 'Messages',
          localField: 'requestMessages',
          foreignField: '_id',
          as: 'requestMessages'
        }
      },
      {
        $lookup: {
          from: 'Routes',
          let: { driver: '$driver' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$driver', '$$driver'] },
                    { $eq: ['$active', true] }
                  ]
                }
              }
            }
          ],
          as: 'routes'
        }
      },
      {
        $lookup: {
          from: 'Requests',
          localField: 'request',
          foreignField: '_id',
          as: 'request'
        }
      },
      ...addPopulate,
      ...populateSelectFirst,
      {
        $addFields: {
          request: { $arrayElemAt: ['$request', 0] },
          ...populate.addFields
        }
      },
      {
        $addFields: {
          paymentInformation: '$request.paymentInformation'
        }
      },
      {
        $lookup: {
          from: 'Tips',
          let: { rideId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$rideId', '$$rideId'] },
                    { $eq: ['$status', PAYMENT_SUCCEEDED_STATUS] }
                  ]
                }
              }
            }
          ],
          as: 'tips'
        }
      },
      {
        $project: {
          request: 0,
          ...populate.project
        }
      }
    ];

    return this.aggregate(pipeline);
  }

  /**
   * Finds active ride for ride or rider
   * @param {String} userType user type 'rider' or 'driver'
   * @param {String} userId user id
   * @returns {Promise} promise, which will be resolved when ride found
   */
  static async findActiveFor(userType, userId) {
    return this.find({
      [userType]: userId,
      status: {
        $in: ACTIVE_RIDE_STATUS
      }
    }).sort({ createdTimestamp: 1 });
  }

  static async getRatingFor(ratingFor, userType, userId, limit = null) {
    let params = buildRatingQuery(userType, userId, limit);

    params = params.concat([
      {
        $group: {
          _id: `$${userType}`,
          avgRating: { $avg: ratingFor },
          allRatings: { $push: ratingFor },
          ratingSum: { $sum: ratingFor }
        }
      }
    ]);

    return this.aggregate(params);
  }

  static async getRatingReceivedFor(userType_, userId, limit = null) {
    const userType = userType_.toLowerCase();

    const ratingFor = (userType === 'driver')
      ? '$ratingForDriver'
      : '$ratingForRider';

    return this.getRatingFor(ratingFor, userType, userId, limit);
  }

  static async getRatingGivenBy(userType_, userId, limit = null) {
    const userType = userType_.toLowerCase();

    const ratingFor = (userType === 'driver')
      ? '$ratingForRider'
      : '$ratingForDriver';

    return this.getRatingFor(ratingFor, userType, userId, limit);
  }

  static async buildRatingInfo(userType, userId) {
    if (!userId) {
      throw new UserNotFoundError(`User of type ${userType} with id of ${userId} not found`);
    }

    const [
      allTimeRating,
      last10Rating,
      allTimeGivenRating
    ] = await Promise.all([
      this.getRatingReceivedFor(userType, userId, null),
      this.getRatingReceivedFor(userType, userId, 10),
      this.getRatingGivenBy(userType, userId, null)
    ]);

    return {
      allTimeRating: allTimeRating.length ? allTimeRating[0].avgRating : null,
      last10Rating: last10Rating.length ? last10Rating[0].avgRating : null,
      allTimeGivenRating: allTimeGivenRating.length ? allTimeGivenRating[0].avgRating : null
    };
  }

  isActive() {
    return ACTIVE_RIDE_STATUS.includes(this.status);
  }

  isAllowedPickup() {
    return PRE_PICKUP_STATUS.includes(this.status);
  }

  isAllowedDropoff() {
    return this.status === RideStatus.RideInProgress;
  }

  isAllowedCancel() {
    return PRE_PICKUP_STATUS.includes(this.status);
  }

  isAllowedDriverArrived() {
    return PRE_ARRIVED_STATUS.includes(this.status);
  }

  async addMessage(messageId) {
    this.requestMessages.push(messageId);

    return this.save();
  }

  static async driverArrived(ride, driverArrivedTimestamp, filterOptions = {}) {
    const updateParams = {
      $set: { driverArrivedTimestamp, status: RideStatus.DriverArrived }
    };
    const addParams = {
      ...filterOptions,
      driverArrivedTimestamp: { $exists: false }
    };
    return this.updateRide(
      ride._id,
      updateParams,
      addParams
    );
  }

  driverArrivedLimitTimestamp() {
    if (this.driverArrivedTimestamp) {
      const driverArrivedLimit = 3;
      return moment(this.driverArrivedTimestamp).utc().add(driverArrivedLimit, 'minutes');
    }

    return null;
  }

  isWithinDriverArrivedTimer(now = null) {
    if (this.driverArrivedTimestamp) {
      const timestampNow = now ? moment(now).utc() : moment().utc();
      return timestampNow.isBefore(this.driverArrivedLimitTimestamp());
    }

    return false;
  }
}

RideSchema.index({ location: 1, createdTimestamp: -1 }, { background: true });
RideSchema.index({ rider: 1, createdTimestamp: -1 }, { background: true });
RideSchema.index({ driver: 1, createdTimestamp: -1 }, { background: true });
RideSchema.index({ location: 1, pickupTimestamp: -1 }, { background: true });

RideSchema.index({ request: 1, rider: 1 }, { background: true });
RideSchema.index({ status: 1, rider: 1 }, { background: true });
RideSchema.index({ status: 1, driver: 1 }, { background: true });
RideSchema.index({ status: 1, location: 1, createdTimestamp: 1 }, { background: true });

RideSchema.loadClass(Ride);

RideSchema.set('toJSON', { getters: true });

export default mongodb.model('Ride', RideSchema);
