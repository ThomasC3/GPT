import logger from '../logger';
// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import {
  Drivers, Reports, Riders, Rides
} from '../models';

const addUserDataToReports = async () => {
  logger.info('Adding user data to reports');
  const reports = await Reports.find({}).lean();

  const updateOperations = reports.map(async (report) => {
    let reporter;
    let reportee;
    let ride;

    try {
      if (report.sender === 'Rider') {
        reporter = await Riders.findById(report.reporter);
      } else {
        reporter = await Drivers.findById(report.reporter);
      }

      if (report.receiver === 'Driver') {
        reportee = await Drivers.findById(report.reportee);
      } else {
        reportee = await Riders.findById(report.reportee);
      }

      ride = await Rides.findById(report.ride);

      if (!reporter || !reportee || !ride) {
        throw new Error('Missing data for report');
      }

      return Reports.updateOne(
        { _id: report._id },
        {
          $set: {
            reporter: {
              id: reporter._id,
              userType: report.sender,
              firstName: reporter.firstName,
              lastName: reporter.lastName
            },
            reportee: {
              id: reportee._id,
              userType: report.receiver,
              firstName: reportee.firstName,
              lastName: reportee.lastName
            },
            ride: {
              id: ride._id,
              location: ride.location
            }
          }
        }
      );
    } catch (error) {
      logger.error(`Failed to update report with id ${report._id}: ${error}`);
      return null;
    }
  });

  await Promise.all(updateOperations);
  logger.info('Added user data to reports');
};

export default addUserDataToReports;
