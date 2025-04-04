import { mongodb, SesMailer } from '../services';
import { transformations } from '../utils';
import {
  Drivers, Locations, Riders, Rides
} from '.';
import { ApplicationError } from '../errors';
import { checkStrikeBan } from '../utils/report';
import { buildGetReportsPipeline } from './utils/report';

const { Schema } = mongodb;

export const { ObjectId } = Schema;

const UserType = {
  DRIVER: 'Driver',
  RIDER: 'Rider'
};

const userTypeConfig = {
  values: Object.values(UserType),
  message: 'Value must be either of \'Driver\', \'Rider\''
};

const statuses = {
  values: ['Pending', 'Confirmed', 'Denied'],
  message: 'Value must be either of \'Confirmed\', \'Pending\', \'Denied\''
};

const docSchema = Schema({
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  }
}, {
  _id: false,
  versionKey: false
});

const reportUserSchema = Schema({
  id: {
    type: ObjectId
  },
  userType: {
    type: String,
    enum: userTypeConfig
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  }
}, {
  _id: false
});

const rideSchema = Schema({
  id: {
    type: ObjectId
  },
  location: {
    type: ObjectId
  }
}, {
  _id: false
});

const ReportSchema = Schema({
  reason: {
    type: String,
    required: true
  },
  reporterReason: {
    type: String,
    required: true
  },
  feedback: {
    type: String
  },
  notes: {
    type: String
  },
  reporter: {
    type: reportUserSchema,
    required: true
  },
  reportee: {
    type: reportUserSchema,
    required: true
  },
  ride: {
    type: rideSchema,
    required: true
  },
  createdTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: statuses,
    required: true,
    default: 'Pending'
  },
  docs: {
    type: [docSchema],
    default: []
  }
}, {
  versionKey: false,
  collection: 'Reports',
  strict: 'throw'
});

class Report {
  static async createReport({ body, reporterType, reporteeType }) {
    try {
      const reporterModel = reporterType === UserType.RIDER ? Riders : Drivers;
      const reporteeModel = reporteeType === UserType.RIDER ? Riders : Drivers;

      const reporter = await reporterModel.findById(body.reporter);
      const reportee = await reporteeModel.findById(body.reportee);
      const ride = await Rides.findById(body.ride);

      if (!ride) {
        throw new ApplicationError('Invalid Ride');
      }

      if (!reporter || !reportee) {
        throw new ApplicationError('Invalid Reporter or Reportee');
      }

      const report = await this.create({
        ...body,
        reporterReason: body.reason,
        reporter: {
          id: reporter._id,
          userType: reporterType,
          firstName: reporter.firstName,
          lastName: reporter.lastName
        },
        reportee: {
          id: reportee._id,
          userType: reporteeType,
          firstName: reportee.firstName,
          lastName: reportee.lastName
        },
        ride: {
          id: ride._id,
          location: ride.location
        }
      });

      SesMailer.sendNewRiderReport(report);
      if (reporteeType === UserType.RIDER && report.status === 'Confirmed') {
        await checkStrikeBan(reporteeType, report.reportee.id);
      }

      return report;
    } catch (err) {
      throw err;
    }
  }

  static async createByRider(body) {
    return this.createReport({ body, reporterType: UserType.RIDER, reporteeType: UserType.DRIVER });
  }

  static async createByDriver(body) {
    return this.createReport({ body, reporterType: UserType.DRIVER, reporteeType: UserType.RIDER });
  }

  /**
   * Search Reports
   * @param {Object} filterParams filter params object
   * @returns {Object} Matching documents and the skip and limit that was applied to the query
   */
  static async getReports(filterParams = {}) {
    const serviceKeys = ['skip', 'limit', 'sort', 'order'];
    const findQuery = {};
    const skip = filterParams.skip || 0;
    const limit = filterParams.limit || 30;
    const sort = {
      [filterParams.sort ? filterParams.sort : 'createdTimestamp']:
        filterParams.order ? parseInt(filterParams.order, 10) : -1
    };

    let locationTimezone = null;

    Object.keys(filterParams).forEach((key) => {
      if (!serviceKeys.includes(key) && filterParams[key]) {
        findQuery[key] = filterParams[key];
      }
    });

    if (filterParams.isDeleted !== undefined) {
      findQuery.isDeleted = filterParams.isDeleted;
    }

    if (findQuery.location) {
      const location = await Locations.getLocation(findQuery.location);
      if (location) {
        locationTimezone = location.timezone;
      }
    }

    if (findQuery.createdTimestamp) {
      if (findQuery.createdTimestamp.start && findQuery.createdTimestamp.end) {
        findQuery.createdTimestamp = transformations.mapDateSearchAggregate(
          findQuery.createdTimestamp,
          locationTimezone
        );
      } else {
        delete findQuery.createdTimestamp;
      }
    }

    const pipeline = buildGetReportsPipeline(findQuery, sort, skip, limit);

    const results = await this.aggregate(pipeline);
    const data = (results && results[0]) || {};

    return {
      total: 0,
      skip,
      limit,
      ...data
    };
  }

  /**
   * Get a Single report
   * @param {Object}
   * @returns {Object} Matched document with fields populated
   */
  static async getReport(id) {
    try {
      const report = await this.findById(id);

      return report?.toJSON();
    } catch (err) {
      throw err;
    }
  }

  static async updateReport(id, body) {
    try {
      const report = await this.findByIdAndUpdate(id, body, {
        runValidators: true,
        new: true
      });

      await checkStrikeBan('Rider', report.reportee.id);

      return report;
    } catch (err) {
      throw err;
    }
  }
}

ReportSchema.set('toJSON', { getters: true });

ReportSchema.index({ 'ride.location': 1, createdTimestamp: -1 });
ReportSchema.index({ 'reporter.id': 1, 'ride.location': 1, createdTimestamp: -1 });
ReportSchema.index({ 'reportee.id': 1, 'ride.location': 1, createdTimestamp: -1 });
ReportSchema.loadClass(Report);

export default mongodb.model('Report', ReportSchema);
