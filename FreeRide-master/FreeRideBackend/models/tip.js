import _ from 'lodash';
import { mongodb } from '../services';
import { createTipPayment } from '../utils/tip';
import { dumpTipPayment } from '../utils/dump';
import { transformations } from '../utils';
import { sum } from '../utils/math';
import { Locations } from '.';
import { buildGetTipsPipeline, buildGetTipsQuery } from './utils/tip';

const { Schema } = mongodb;

export const { ObjectId } = Schema;

const TipSchema = Schema({
  paymentIntentId: {
    type: String
  },
  balanceTransactionId: {
    type: String
  },
  clientSecret: {
    type: String
  },
  status: {
    type: String
  },
  currency: {
    type: String,
    required: true,
    default: 'usd'
  },
  total: {
    type: Number
  },
  net: {
    type: Number
  },
  fee: {
    type: Number
  },
  amountRefunded: {
    type: Number
  },
  // Actors
  rideId: {
    type: ObjectId,
    ref: 'Ride'
  },
  ridePassengers: {
    type: Number
  },
  riderId: {
    type: ObjectId,
    ref: 'Rider'
  },
  riderFirstName: {
    type: String
  },
  riderLastName: {
    type: String
  },
  driverId: {
    type: ObjectId,
    ref: 'Driver',
    default: null,
    required: true
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
  locationId: {
    type: ObjectId,
    ref: 'Location'
  },
  locationName: {
    type: String
  },
  timezone: {
    type: String
  },
  rideTimestamp: {
    type: Date
  },
  createdTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  waitingPaymentConfirmation: {
    type: Boolean,
    default: false
  }
}, {
  versionKey: false,
  collection: 'Tips',
  strict: 'throw'
});

class Tip {
  static async createTip(tipData) {
    const {
      stripeCustomerId,
      tipAmount,
      currency,
      statetement,
      ride = null,
      rider = null,
      driver = null,
      location = null
    } = tipData;

    const metadata = { paymentIntentType: 'tip' };
    if (driver) { metadata.driverId = `${driver._id}`; }
    if (rider) { metadata.riderId = `${rider._id}`; }
    if (ride) { metadata.rideId = `${ride._id}`; }

    const paymentIntentInfo = await createTipPayment(
      stripeCustomerId, tipAmount, currency, statetement, metadata
    );

    return this.create({
      ...dumpTipPayment(paymentIntentInfo),
      total: tipAmount,
      currency,
      waitingPaymentConfirmation: true,

      rideId: ride._id,
      rideTimestamp: ride.createdTimestamp,
      ridePassengers: ride.passengers,

      riderId: rider._id,
      riderFirstName: rider.firstName,
      riderLastName: rider.lastName,

      driverId: driver._id,
      driverFirstName: driver.firstName,
      driverLastName: driver.lastName,
      driverDisplayName: driver.displayName,

      locationId: location._id,
      locationName: location.name,
      timezone: location.timezone
    });
  }

  static async updateTip(params, set) {
    return this.findOneAndUpdate(
      params,
      { $set: set },
      { new: true, upsert: false }
    );
  }

  static async getTips(filterParams = {}) {
    const serviceKeys = ['skip', 'limit', 'sort', 'order'];
    const findQuery = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit || 30;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'createdTimestamp']: filterParams.order ? parseInt(filterParams.order, 10) : -1
    };
    let locationTimezone = null;

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key) && filterParams[key]) {
        findQuery[key] = filterParams[key];
      }
    });


    if (findQuery.locationId) {
      const location = await Locations.getLocation(findQuery.locationId);
      if (location) {
        locationTimezone = location.timezone;
      }
    }

    if (findQuery.createdTimestamp) {
      if (findQuery.createdTimestamp.start && findQuery.createdTimestamp.end) {
        findQuery.createdTimestamp = transformations.mapDateSearchAggregate(
          findQuery.createdTimestamp, locationTimezone
        );
      } else {
        delete findQuery.createdTimestamp;
      }
    }

    const pipeline = buildGetTipsPipeline(findQuery, sort, skip, limit);

    const results = await this.aggregate(pipeline);
    const data = (results && results[0]) || {};

    data.totals = _.sortBy(data.totals.map(item => ({
      driverFirstName: item.driverFirstName,
      driverLastName: item.driverLastName,
      driverId: item._id,
      total: sum(item.total || []),
      totalCount: (item.total?.filter(i => i || i === 0) || []).length,
      net: sum(item.netTotal || []),
      netCount: (item.netTotal?.filter(i => i || i === 0) || []).length,
      fee: sum(item.feeTotal || []),
      feeCount: (item.feeTotal?.filter(i => i || i === 0) || []).length
    })), ['driverFirstName', 'driverLastName']);

    return {
      total: 0,
      skip,
      limit,
      ...data,
      locationTimezone
    };
  }

  static getTipsCursor(filterParams = {}, locationTimezone = null) {
    const { query } = buildGetTipsQuery({ ...filterParams, noLimit: true }, locationTimezone);
    return query.cursor();
  }
}

TipSchema.set('toJSON', {
  getters: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

// Tip statistics / Ride page / Ride history
TipSchema.index({ rideId: 1, status: 1 }, { background: true });
// Tip sum driver app
TipSchema.index({ driverId: 1, status: 1, createdTimestamp: 1 }, { background: true });
// Tip list
TipSchema.index({ locationId: 1, createdTimestamp: -1 }, { background: true });
TipSchema.index({ locationId: 1, driverId: 1, createdTimestamp: -1 }, { background: true });
TipSchema.index(
  {
    locationId: 1, status: 1, driverId: 1, createdTimestamp: -1
  },
  { background: true }
);
TipSchema.index({ locationId: 1, status: 1, rideTimestamp: 1 }, { background: true });
TipSchema.index({ paymentIntentId: 1, status: 1 }, { background: true });

TipSchema.loadClass(Tip);

export default mongodb.model('Tip', TipSchema);
