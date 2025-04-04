import AWS from 'aws-sdk';
import * as Sentry from '@sentry/node';
import { aws as awsConfig } from '../config';
import { SnsArns } from '../models';
import logger from '../logger';

export class SnsService {
  constructor(config) {
    this.config = config;
    this.sns = new AWS.SNS({
      accessKeyId: this.config.access_key_id,
      secretAccessKey: this.config.access_key_secret,
      region: this.config.region
    });
  }

  async createSnsEndpoint(userType, userId, deviceToken, platform, environment) {
    try {
      const type = userType.toLowerCase();
      platform = platform.toLowerCase();

      const endpointGen = env => this.sns.createPlatformEndpoint({
        PlatformApplicationArn: this.config.app_arn[`${platform}_${type}_${env}`],
        Token: deviceToken
      }).promise().then(endPoint => SnsArns.updateMany({
        userId,
        env,
        platform,
        deviceToken
      }, {
        $set: {
          userType,
          userId,
          endpointArn: endPoint.EndpointArn,
          deviceToken
        }
      }, { upsert: true }));


      const requests = [
        endpointGen(environment)
      ];

      await Promise.all(requests);
    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
    }
  }

  async deleteEndpointByDeviceToken(deviceToken) {
    const userEndpointArns = await SnsArns.find({ deviceToken });

    if (userEndpointArns) {
      await Promise.all(
        userEndpointArns.map(
          arn => this.sns.deleteEndpoint({ EndpointArn: arn.endpointArn }).promise(),
        ),
      );

      await SnsArns.deleteMany({ deviceToken });
    }
  }

  async deleteEndpointsByUser(userType, userId) {
    const userEndpointArns = await SnsArns.find({ userType, userId });

    if (userEndpointArns) {
      await Promise.all(
        userEndpointArns.map(
          arn => this.sns.deleteEndpoint({ EndpointArn: arn.endpointArn }).promise(),
        ),
      );

      await SnsArns.deleteMany({ userType, userId });
    }
  }

  async send(userType, userId, SnsMessageObject) {
    const userArns = await SnsArns.find({
      userType,
      userId
    });

    try {
      await Promise.all(userArns.map((userArn) => {
        const message = SnsMessageObject.mapNotificationToPlatform(userArn.platform, userArn.env);
        return this.sns.publish({
          ...message,
          TargetArn: userArn.endpointArn
        }).promise().catch((error) => {
          logger.warn('ERRORED ARN', userArn.endpointArn, error.message);
          if (error.code === 'EndpointDisabled') {
            this.deleteEndpointByDeviceToken(userArn.deviceToken);
          }
          return null;
        });
      }));
    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
    }
  }
}

export default new SnsService(awsConfig);
