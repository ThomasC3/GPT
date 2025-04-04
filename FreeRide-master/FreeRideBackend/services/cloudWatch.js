import AWS from 'aws-sdk';
import * as Sentry from '@sentry/node';
import { aws as awsConfig } from '../config';
import logger from '../logger';

export class CloudWatchService {
  constructor(config) {
    this.config = config;

    this.cw = new AWS.CloudWatch({
      accessKeyId: this.config.access_key_id,
      secretAccessKey: this.config.access_key_secret,
      region: this.config.region
    });
  }

  async processDriverSearchTimingMetric(duration) {
    const params = {
      MetricData: [
        {
          MetricName: 'driverSearchTimingMetric',
          Dimensions: [
            {
              Name: 'requestProcessorId',
              Value: 'main'
            }
          ],
          StorageResolution: 60,
          Timestamp: (new Date()).toISOString(),
          Unit: 'Milliseconds',
          Value: duration
        }
      ],
      Namespace: `circuit/${process.env.NODE_ENV}/requestProcessor/${process.env.LOCATION_WORKING_SET}`
    };

    return this.submitMetric(params);
  }

  async processReBroadcastCountMetric(count) {
    const params = {
      MetricData: [
        {
          MetricName: 'driverReBroadcastMetric',
          Dimensions: [
            {
              Name: 'requestProcessorId',
              Value: 'main'
            }
          ],
          StorageResolution: 60,
          Timestamp: (new Date()).toISOString(),
          Unit: 'Count',
          Value: count
        }
      ],
      Namespace: `circuit/${process.env.NODE_ENV}/requestProcessor/${process.env.LOCATION_WORKING_SET}`
    };

    return this.submitMetric(params);
  }

  async submitMetric(params) {
    try {
      this.cw.putMetricData(params, (err, data) => {
        if (err) { throw err; }
        logger.debug('Metric sent: ', JSON.stringify(data));
      });
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
    }
  }
}

export default new CloudWatchService(awsConfig);
