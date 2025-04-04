/* eslint-disable no-await-in-loop */
import * as Sentry from '@sentry/node';
import moment from 'moment';

import { cloudWatchClient } from '.';
import { metrics } from '../config';
import logger from '../logger';
import websocket from './websocket';
import { dumpRideForDriver } from '../utils/dump';
import { Rides } from '../models';
import { getLocationsInWorkingSet } from '../utils/location';

export class ReBroadcast {
  constructor() {
    this.timeoutInMs = 5 * 60 * 1000; // 5 mins * 60 s * 1000 ms
    this.running = false;
  }

  async broadcastMatches() {
    try {
      const locations = await getLocationsInWorkingSet();
      if (!this.running) {
        this.running = true;
        const rides = await Rides.find({
          createdTimestamp: { $gt: moment().subtract(10, 'minute').toDate() },
          status: { $in: [200, 201, 202] },
          location: { $in: locations },
          ackReceived: { $ne: true }
        }).populate('rider');

        logger.info('RIDES:', rides);
        let ride;
        for (let i = 0; i < rides.length; i += 1) {
          ride = rides[i];
          const driverSocketIds = await websocket.getUserSocketIds(ride.driver, 'driver');
          await websocket.joinSocketToRoom(driverSocketIds, ride._id.toString());

          websocket.emitWebsocketEventToSocketIds(
            'ride-request-received',
            driverSocketIds,
            dumpRideForDriver(ride)
          );

          logger.info(`[ReBroadcast] Driver: ${ride.driver} | Ride: ${ride._id.toString()} | SocketIds: [${driverSocketIds}]`);
        }
        this.running = false;
        const count = rides.length;
        if (metrics.requestProcessor) {
          cloudWatchClient.processReBroadcastCountMetric(count);
        }
        return count;
      }
    } catch (err) {
      logger.info(err);
      Sentry.captureException(err);
      this.running = false;
    }
    return 0;
  }
}

export default new ReBroadcast();
