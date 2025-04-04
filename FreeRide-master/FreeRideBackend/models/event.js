import { mongodb } from '../services';
import { transformations } from '../utils';
import { buildGetEventsPipeline } from './utils/event';
import { Locations } from '.';

const { Schema } = mongodb;

export const { ObjectId } = Schema;

const sourceTypes = {
  values: ['Driver', 'Rider', 'Admin', 'Vehicle', 'Location', 'Job'],
  message: 'Value must be either of \'Driver\', \'Rider\', \'Admin\', \'Vehicle\', \'Location\' or \'Job\''
};

const EventSchema = Schema({
  sourceType: {
    type: String,
    enum: sourceTypes,
    required: true
  },
  sourceId: {
    type: String,
    required: true
  },
  sourceName: {
    type: String
  },
  eventType: {
    type: String,
    required: true
  },
  eventData: {
    type: Object,
    required: false
  },
  targetType: {
    type: String,
    enum: sourceTypes,
    required: false
  },
  targetId: {
    type: String,
    required: false
  },
  targetName: {
    type: String
  },
  createdTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  versionKey: false,
  collection: 'Events'
});

class Event {
  static async createByDriver(body) {
    let targetData = {};

    switch (body.targetType) {
    case 'Vehicle':
      targetData = {
        targetId: body.vehicle._id,
        targetType: 'Vehicle',
        targetName: body.vehicle.name
      };
      break;
    case 'Driver':
      targetData = {
        targetId: body.driver._id,
        targetType: 'Driver',
        targetName: body.driver.displayName
      };
      break;
    default:
      throw new Error(`Unsupported target type: ${body.targetType}`);
    }

    const event = await this.create({
      sourceType: 'Driver',
      sourceId: body.driver._id,
      sourceName: body.driver.displayName,
      eventType: body.eventType,
      eventData: body.eventData,
      ...targetData
    });

    return event;
  }

  static async createByAdmin(body) {
    let targetData = {};

    switch (body.targetType) {
    case 'Vehicle':
      targetData = {
        targetId: body.vehicle._id,
        targetType: 'Vehicle',
        targetName: body.vehicle.name
      };
      break;
    case 'Driver':
      targetData = {
        targetId: body.driver._id,
        targetType: 'Driver',
        targetName: body.driver.displayName
      };
      break;
    default:
      throw new Error(`Unsupported target type: ${body.targetType}`);
    }

    const event = await this.create({
      sourceType: 'Admin',
      sourceId: body.admin.id,
      sourceName: body.admin.name,
      eventType: body.eventType,
      eventData: body.eventData,
      ...targetData
    });

    return event;
  }

  static async createByLocation(body) {
    const event = await this.create({
      sourceType: 'Location',
      sourceId: body.location._id,
      sourceName: body.location.name,
      eventType: body.eventType,
      targetType: 'Location',
      targetId: body.location._id,
      targetName: body.location.name,
      eventData: body.eventData
    });

    return event;
  }

  static async createByLocationOnJob(body) {
    const event = await this.create({
      sourceType: 'Location',
      sourceId: body.location._id,
      sourceName: body.location.name,
      eventType: body.eventType,
      targetType: 'Job',
      targetId: body.job._id,
      targetName: body.job.code,
      eventData: body.eventData
    });

    return event;
  }

  static async createByJobOnVehicle(body) {
    const event = await this.create({
      sourceType: 'Job',
      sourceId: body.job._id,
      sourceName: body.job.code,
      eventType: body.eventType,
      targetType: 'Vehicle',
      targetId: body.vehicle._id,
      targetName: body.vehicle.name,
      eventData: body.eventData
    });

    return event;
  }

  static async createByVehicleOnJob(body) {
    const event = await this.create({
      sourceType: 'Vehicle',
      sourceId: body.vehicle._id,
      sourceName: body.vehicle.name,
      eventType: body.eventType,
      targetType: 'Job',
      targetId: body.job._id,
      targetName: body.job.code,
      eventData: body.eventData
    });

    return event;
  }

  static async createByJob(body) {
    const event = await this.create({
      sourceType: 'Job',
      sourceId: body.job._id,
      sourceName: body.job.code,
      eventType: body.eventType,
      targetType: 'Job',
      targetId: body.job._id,
      targetName: body.job.code
    });

    return event;
  }

  /**
   * Search Events
   * @param {Object} filterParams filter params object
   * @returns {Object} Matching documents and the skip and limit that was applied to the query
   */
  static async getEvents(filterParams = {}) {
    const serviceKeys = ['skip', 'limit', 'sort', 'order', 'location', 'createdTimestamp'];
    const findQuery = {};
    const skip = filterParams.skip || 0;
    const { limit } = filterParams;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'createdTimestamp']: filterParams.order ? parseInt(filterParams.order, 10) : -1
    };

    let locationTimezone = null;

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key) && filterParams[key]) {
        findQuery[key] = filterParams[key];
      }
    });

    if (findQuery.sourceId) {
      findQuery.sourceId = findQuery.sourceId.toString();
    }
    if (findQuery.targetId) {
      findQuery.targetId = findQuery.targetId.toString();
    }

    if (filterParams.location) {
      const location = await Locations.getLocation(filterParams.location);
      if (location) {
        locationTimezone = location.timezone;
      }
    }

    if (filterParams.createdTimestamp?.start && filterParams.createdTimestamp?.end) {
      findQuery.createdTimestamp = transformations.mapDateSearchAggregate(
        filterParams.createdTimestamp, locationTimezone
      );
    }

    const pipeline = buildGetEventsPipeline(findQuery, sort, skip, limit);

    const results = await this.aggregate(pipeline);
    const data = (results && results[0]) || {};

    return {
      total: 0,
      skip,
      limit,
      ...data,
      locationTimezone
    };
  }
}

EventSchema.set('toJSON', { getters: true });
EventSchema.index({
  eventType: 1,
  'eventData.location': 1,
  createdTimestamp: 1
});
EventSchema.index({ sourceId: 1, createdTimestamp: -1 }, { background: true });
EventSchema.index({ targetId: 1, createdTimestamp: -1 }, { background: true });
EventSchema.loadClass(Event);

export default mongodb.model('Event', EventSchema);
