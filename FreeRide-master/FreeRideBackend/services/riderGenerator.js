import csv from 'csv';
import * as Sentry from '@sentry/node';

import { Locations, Requests } from '../models';
import { transformations } from '../utils';
import logger from '../logger';
import RiderSerializer from '../middlewares/admin/utils/RiderSerializer';
import s3 from './s3';
import { aws as awsConfig } from '../config';

class RiderGeneratorService {
  static async perform() {
    try {
      this.date = new Date();
      this.startDate = new Date(
        this.date.getFullYear(),
        this.date.getMonth() - 1,
        1
      )
        .toISOString()
        .substring(0, 19);
      this.endDate = new Date(
        this.date.getFullYear(),
        this.date.getMonth(),
        0,
        23,
        59,
        59
      )
        .toISOString()
        .substring(0, 19);

      const cronWorkingSet = process.env.LOCATION_WORKING_SET;
      if (!cronWorkingSet) {
        this.locations = await Locations.find({});
      } else {
        this.locations = await Locations.find({ cronWorkingSet });
      }

      await Promise.all(
        this.locations.map(async (location) => {
          let requestTimestamp = {
            start: this.startDate,
            end: this.endDate
          };
          requestTimestamp = transformations.mapDateSearch(
            requestTimestamp,
            location.timezone
          );
          const requestPipeline = [
            {
              $match: {
                location: location._id,
                requestTimestamp: {
                  $gte: new Date(requestTimestamp.$gte),
                  $lt: new Date(requestTimestamp.$lt)
                }
              }
            },
            {
              $group: {
                _id: '$rider'
              }
            },
            {
              $lookup: {
                from: 'Riders',
                localField: '_id',
                foreignField: '_id',
                as: 'rider'
              }
            },
            {
              $unwind: '$rider'
            },
            {
              $replaceRoot: {
                newRoot: '$rider'
              }
            }
          ];
          const cursor = Requests.aggregate(requestPipeline).cursor();
          const transformer = RiderSerializer.adminRiderToCsv;
          const columns = RiderSerializer.csvColumns();

          const pipeStream = cursor.pipe(csv.transform(transformer)).pipe(
            csv.stringify({
              header: true,
              columns,
              cast: {
                boolean: (value, context) => {
                  if (context.column === 'index') {
                    return String(context.records + 1);
                  }
                  if (value) {
                    return 'True';
                  }
                  return 'False';
                }
              }
            })
          );
          const s3params = {
            Bucket: awsConfig.s3.rider_exports_bucket_name,
            Key: `${this.date.getFullYear()}/${this.date.getMonth()}/${
              location.name
            }.csv`,
            Body: pipeStream,
            ContentType: 'text/csv'
          };
          await s3.upload(s3params);
        })
      );
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
    }
  }
}

export default RiderGeneratorService;
