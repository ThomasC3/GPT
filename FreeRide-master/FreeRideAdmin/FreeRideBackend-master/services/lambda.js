import * as Sentry from '@sentry/node';
import request from 'request-promise';
import logger from '../logger';
import { lambda as lambdaConfig } from '../config';

export class Lambda {
  constructor() {
    this.apiKey = lambdaConfig.apiKey;
    this.host = lambdaConfig.host;
  }

  async getBestDriver(requestId) {
    try {
      const options = {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey
        },
        json: {
          request_id: requestId,
          debug: true
        }
      };
      const url = `${this.host}`;
      return request(url, options);
    } catch (err) {
      logger.info(err);
      Sentry.captureException(err);
    }
    return null;
  }

  async getRouteUpdate(driverId, routeStops) {
    try {
      const options = {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey
        },
        json: {
          driver_id: driverId,
          route_stops: routeStops,
          debug: true
        }
      };
      const url = `${this.host}`;
      return request(url, options);
    } catch (err) {
      logger.info(err);
      Sentry.captureException(err);
    }
    return null;
  }
}

export default new Lambda();
