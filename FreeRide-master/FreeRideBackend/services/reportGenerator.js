import csv from 'csv';
import AWS from 'aws-sdk';
import * as Sentry from '@sentry/node';

import { Rides, Locations } from '../models';
import { RideSerializer } from '../utils';
import { aws as awsConfig } from '../config';
import logger from '../logger';

async function uploadToS3Bucket(data, date, location) {
  const config = awsConfig;
  const s3 = new AWS.S3({
    accessKeyId: config.access_key_id,
    secretAccessKey: config.access_key_secret
  });
  const s3params = {
    Bucket: config.s3.ridereports_bucket_name,
    Key: `${date.getFullYear()}/${date.getMonth()}/${location.name}.csv`,
    Body: data,
    ContentType: 'text/csv'
  };

  return s3.upload(s3params).promise();
}

class ReportGeneratorService {
  static async perform() {
    try {
      this.date = new Date();
      this.startDate = new Date(this.date.getFullYear(), this.date.getMonth() - 1, 1)
        .toISOString()
        .substring(0, 19);
      this.endDate = new Date(this.date.getFullYear(), this.date.getMonth(), 0, 23, 59, 59)
        .toISOString()
        .substring(0, 19);

      const cronWorkingSet = process.env.LOCATION_WORKING_SET;
      if (!cronWorkingSet) {
        this.locations = await Locations.getLocations({ limit: 0 });
      } else {
        this.locations = await Locations.getLocations({ cronWorkingSet, limit: 0 });
      }

      await Promise.all(this.locations.items.map(async (location) => {
        const filterParams = {
          location: location._id,
          createdTimestamp: {
            start: this.startDate,
            end: this.endDate
          }
        };
        const cursor = Rides.getRidesCursor(filterParams, location.timezone);
        const transformer = RideSerializer.adminRideToCsv;
        const columns = RideSerializer.csvColumns();

        const pipeStream = cursor
          .pipe(csv.transform(transformer))
          .pipe(csv.stringify({
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
          }));

        await uploadToS3Bucket(pipeStream, this.date, location);
      }));
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
    }
  }
}

export default ReportGeneratorService;
