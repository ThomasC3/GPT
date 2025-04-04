import * as Sentry from '@sentry/node';

import { addCurrentReadings } from './timeseries';

import logger from '../logger';
import { getLocationsInWorkingSet } from '../utils/location';

export class MetricsService {
  constructor() {
    this.running = false;
  }

  async update() {
    try {
      logger.info('Running metrics update');
      const locations = await getLocationsInWorkingSet();
      if (!this.running) {
        this.running = true;
        const values = await Promise.all(
          locations.map(location => addCurrentReadings(location._id))
        );
        for (let i = 0; i < values.length; i += 1) {
          const {
            granularityReadings,
            instantaneousReadings,
            historicReadings,
            range
          } = values[i];

          logger.info(`Metrics for ${locations[i].name} (${range.start.format()}, ${range.end.format()}): ${granularityReadings.length}, ${instantaneousReadings.length}, ${historicReadings.length}`);
        }

        this.running = false;
      }
    } catch (err) {
      logger.info(err);
      Sentry.captureException(err);

      this.running = false;
    }
  }
}

export default new MetricsService();
