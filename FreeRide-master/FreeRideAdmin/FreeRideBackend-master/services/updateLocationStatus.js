import * as Sentry from '@sentry/node';

import { Locations, Events } from '../models';
import { location as locationUtil } from '../utils';

import logger from '../logger';
import { getLocationsInWorkingSet } from '../utils/location';

export class LocationStatusUpdater {
  constructor() {
    this.running = false;
  }

  async update() {
    try {
      const locations = await getLocationsInWorkingSet();
      if (!this.running) {
        this.running = true;

        const openedLocations = [];
        const closedLocations = [];
        const locationEvents = [];

        let location;
        for (let i = 0; i < locations.length; i += 1) {
          location = locations[i];
          if (!locationUtil.isLocationClosed(location)) {
            if (!location.isOpen) {
              openedLocations.push(location._id);
              locationEvents.push({
                location,
                eventType: 'OPEN',
                eventData: { reason: 'Service hours' }
              });
            }
          } else if (location.isUsingServiceTimes) {
            if (location.isOpen) {
              closedLocations.push(location._id);
              locationEvents.push({
                location,
                eventType: 'CLOSE',
                eventData: { reason: 'Service hours' }
              });
            }
          // eslint-disable-next-line no-await-in-loop
          } else if (await locationUtil.hasOnlineDrivers(location)) {
            if (!location.isOpen) {
              openedLocations.push(location._id);
              locationEvents.push({
                location,
                eventType: 'OPEN',
                eventData: { reason: 'Online drivers' }
              });
            }
          } else if (location.isOpen) {
            closedLocations.push(location._id);
            locationEvents.push({
              location,
              eventType: 'CLOSE',
              eventData: { reason: 'Online drivers' }
            });
          }
        }

        await Locations.updateMany(
          { _id: { $in: openedLocations } },
          { $set: { isOpen: true } }
        );
        await Locations.updateMany(
          { _id: { $in: closedLocations } },
          { $set: { isOpen: false } }
        );
        await Promise.all(
          locationEvents.map(eventData => Events.createByLocation(eventData))
        );

        this.running = false;
      }
    } catch (err) {
      logger.info(err);
      Sentry.captureException(err);

      this.running = false;
    }
  }
}

export default new LocationStatusUpdater();
