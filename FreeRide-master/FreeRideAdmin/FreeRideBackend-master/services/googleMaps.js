import GoogleMapsClient from '@google/maps';
import * as Sentry from '@sentry/node';
import { google as config } from '../config';

import logger from '../logger';

const googleMapsClient = GoogleMapsClient.createClient({
  key: config.apiKey,
  Promise
});

export class GoogleMapsService {
  constructor() {
    this.googleMapsClient = googleMapsClient;
  }

  get client() {
    return this.googleMapsClient;
  }

  /**
   * Calculates distance between locations
   * @param {String} origins origin location
   * @param {String} destinations destination location
   * @returns {Promise} promise wich will be resolved when result received
   */
  async calculateDistance(origins, destinations) {
    try {
      const response = await this.googleMapsClient.distanceMatrix({
        origins,
        destinations,
        units: 'imperial'
      }).asPromise();
      if (response.status !== 200 || !response.json
        || response.json.status !== 'OK' || response.json.rows[0].elements[0].status === 'ZERO_RESULTS') {
        logger.info('GMaps ERROR: ZERO_RESULTS');
        return false;
      }

      return response;
    } catch (err) {
      logger.error('GMaps ERROR: ', err);
      Sentry.captureException(err);
      return false;
    }
  }
}

export default new GoogleMapsService();
