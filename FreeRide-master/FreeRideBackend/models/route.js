import * as Sentry from '@sentry/node';
import { mongodb } from '../services';
import { sleep } from '../utils/ride';
import logger from '../logger';

const { Schema } = mongodb;
const { ObjectId } = Schema;

const stopTypes = {
  values: ['current_location', 'pickup', 'dropoff'],
  message: 'Value must be either of \'current_location\', \'stop\''
};

const stopStatuses = {
  values: ['waiting', 'done', 'cancelled'],
  message: 'Value must be either of \'waiting\', \'done\', \'cancelled\''
};

const StopSchema = Schema({
  ride: {
    type: Schema.Types.ObjectId,
    ref: 'Ride'
  },
  cost: {
    type: Number
  },
  stopType: {
    type: String,
    enum: stopTypes,
    required: true
  },
  status: {
    type: String,
    enum: stopStatuses,
    default: 'waiting'
  },
  coordinates: {
    type: [Number],
    default: []
  },
  fixedStopId: {
    type: ObjectId,
    ref: 'FixedStop',
    required: false
  },
  initialEta: {
    type: Number,
    default: null
  },
  passengers: {
    type: Number,
    default: null
  },
  ADApassengers: {
    type: Number,
    default: null
  }
}, {
  _id: false,
  versionKey: false
});

export const RouteSchema = Schema({
  active: {
    type: Boolean,
    required: true,
    default: true
  },
  firstRequestTimestamp: {
    type: Date
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'Driver'
  },
  stops: {
    type: [StopSchema],
    default: []
  },
  activeRideId: {
    type: Schema.Types.ObjectId,
    ref: 'Ride'
  },
  lock: {
    type: Boolean,
    required: true,
    default: false
  },
  lockTimestamp: {
    type: Date
  },
  lastUpdate: {
    type: Date
  }
}, {
  versionKey: false,
  collection: 'Routes',
  strict: 'throw'
});

class Stop { }

class Route {
  static async getRoutes(filterParams = {}) {
    const serviceKeys = ['skip', 'limit', 'sort', 'order'];

    const findQuery = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit || 30;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'firstRequestTimestamp']: filterParams.order ? parseInt(filterParams.order, 10) : -1
    };

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key) && filterParams[key]) {
        findQuery[key] = filterParams[key];
      }
    });

    try {
      const routes = await this
        .aggregate([
          { $match: findQuery },
          { $sort: sort },
          {
            $group: {
              _id: null,
              items: { $push: '$$ROOT' },
              total: { $sum: 1 }
            }
          },
          { $unwind: '$items' },
          { $skip: skip },
          { $limit: limit },
          {
            $group: {
              _id: 0,
              total: {
                $first: '$total'
              },
              items: {
                $push: '$items'
              }
            }
          },
          { $project: { items: 1, total: 1, _id: 0 } }
        ]);

      return {
        total: 0, items: [], skip, limit, ...routes[0]
      };
    } catch (err) {
      throw err;
    }
  }

  static async getRoute(params) {
    try {
      const route = await this.findOne(params);
      return route;
    } catch (err) {
      throw err;
    }
  }

  static async createRoute(body) {
    try {
      const route = await this.create(body);
      return route;
    } catch (err) {
      throw err;
    }
  }

  static async updateRoute(id, body) {
    try {
      const route = await this.findByIdAndUpdate(id, body, { new: true });
      return route;
    } catch (err) {
      throw err;
    }
  }

  static async lock(params) {
    try {
      let route = await this.findOneAndUpdate(
        { ...params, lock: false },
        { $set: { lock: true, lockTimestamp: new Date() } },
        { new: true, upsert: false }
      );

      if (route) {
        return route;
      }
      route = await this.findOne(params);
      if (!route) {
        return null;
      } // else route exists but is locked

      let routeToAcquire;
      let lockTimestampWas10sAgo = false;
      do {
        // eslint-disable-next-line no-await-in-loop
        await sleep(100);
        // eslint-disable-next-line no-await-in-loop
        routeToAcquire = await this.findOne(params);
        if (!routeToAcquire) {
          return null;
        }
        lockTimestampWas10sAgo = (new Date() - routeToAcquire.lockTimestamp) / 1000 >= 10;
        if (lockTimestampWas10sAgo) {
          // eslint-disable-next-line no-await-in-loop
          await this.findOneAndUpdate(
            params,
            { $set: { lock: false, lockTimestamp: null } },
            { new: true, upsert: false }
          );
        }

        // eslint-disable-next-line no-await-in-loop
        route = await this.findOneAndUpdate(
          { ...params, lock: false },
          { $set: { lock: true, lockTimestamp: new Date() } },
          { new: true, upsert: false }
        );
      } while (!route || !route.lock);

      return route;
    } catch (err) {
      logger.info(err);
      Sentry.captureException(err);
      throw err;
    }
  }

  static async release(params) {
    try {
      return await this.findOneAndUpdate(
        params,
        { $set: { lock: false, lockTimestamp: null } }, { new: true, upsert: false }
      );
    } catch (err) {
      throw err;
    }
  }
}

RouteSchema.index({ driver: 1, active: 1 }, { background: true });
RouteSchema.index({ 'stops.ride': 1 }, { background: true });

RouteSchema.loadClass(Route);
RouteSchema.set('toJSON', { getters: true });

StopSchema.loadClass(Stop);
StopSchema.set('toJSON', { getters: true });

export const stop = mongodb.model('Stop', StopSchema);
export default mongodb.model('Route', RouteSchema);
