/* eslint-disable no-await-in-loop */
import * as Sentry from '@sentry/node';
import moment from 'moment';

import logger from '../logger';
import websocket from './websocket';
import sns from './sns';
import setQueue from './queue';

import { createRideForMatch, findDriver, findDriverPooling } from './matching';
import { dumpRideForRider, dumpRideForDriver } from '../utils/dump';
import {
  Requests, Riders,
  Routes, Drivers, Rides
} from '../models';
import {
  getDriverArrivedTimestampFromFs,
  getActiveRideId, updateRideEta,
  isPoolingEnabled, setNonPoolingEtasWithNewRide
} from '../utils/ride';
import { requestAlreadyProcessed, requestCancelled } from '../utils/request';
import { SnsMessage } from './SnsMessage';
import { getLocaleFromUser, buildTranslator, translator } from '../utils/translation';
import { statistics as timeStatistics } from '../tests/utils/timeHelper';
import { getTimeLeft } from '../utils/time';

import { env, logger as loggerLevel } from '../config';
import { getLocationsInWorkingSet } from '../utils/location';

export class DriverSearcher {
  constructor() {
    this.timeoutInMs = 3 * 60 * 1000; // 3 mins * 60 s * 1000 ms
    this.running = false;
    this.runLoadTest = (env === 'stage' && loggerLevel === 'debug');
  }

  async search() {
    let hrCronStart;
    if (this.runLoadTest) {
      hrCronStart = process.hrtime();
    }
    const hrIterArray = [];

    const hasRequestId = async (driveInfoStop, ride, eta) => new Promise((res) => {
      const stop = driveInfoStop;

      stop.ride = ride._id;
      stop.initialEta = eta;

      res(stop);
    });

    const promifyStop = async driveInfoStop => new Promise((res) => {
      res(driveInfoStop);
    });

    const getActualRide = async (driveInfoStop) => {
      const stop = driveInfoStop;
      const actualRide = await Rides.findOne({ _id: stop.ride });
      stop.ride = actualRide._id;

      return stop;
    };

    try {
      const locations = await getLocationsInWorkingSet();
      if (!this.running) {
        this.running = true;
        // websocket.init();
        const locationsQuery = { $in: locations };
        const requests = await Requests.findWithoutDriver(locationsQuery);

        logger.info('REQUESTS:', requests);
        let withPooling;
        let driverInfo; let driver; let riderInfo; let ride; let stops; let vehicleProfile;
        let requestStatus;
        let request;
        let hrIterStart;
        logger.debug(`[LT] Cron processing ${requests.length} requests`);
        for (let i = 0; i < requests.length; i += 1) {
          hrIterStart = process.hrtime();
          requestStatus = await requestAlreadyProcessed(requests[i]);
          if (requestStatus.alreadyProcessed) {
            if (this.runLoadTest) { hrIterArray.push(process.hrtime(hrIterStart)); }
            // eslint-disable-next-line no-continue
            continue;
          }

          request = requestStatus.updatedRequest;
          withPooling = await isPoolingEnabled(request);
          if (withPooling) {
            driverInfo = await findDriverPooling(request);
            // eslint-disable-next-line prefer-destructuring
            driver = driverInfo.driver;
            // eslint-disable-next-line prefer-destructuring
            vehicleProfile = driverInfo.vehicleProfile;
          } else {
            driver = await findDriver(request);
          }

          const riderId = request.rider.toString();

          if (!driver) {
            request = await Requests.findOneAndUpdate(
              { _id: request._id, processing: true },
              {
                $set: {
                  processing: false,
                  status: 100,
                  searchRetries: request.searchRetries + 1,
                  lastRetryTimestamp: Date.now()
                }
              },
              { new: true, upsert: false }
            );

            const wasRequested3minAgo = request
              && (Date.now() - request.requestTimestamp) >= this.timeoutInMs;

            if (wasRequested3minAgo) {
              await request.cancel();

              const riderSocketIds = await websocket.getUserSocketIds(riderId, 'rider');

              const { t } = await buildTranslator('en');
              websocket.emitWebsocketEventToSocketIds(
                'request-completed',
                riderSocketIds,
                {
                  // DO NOT TRANSLATE - FILTERED BY APP
                  message: translator(t, 'noDriversAvailable') || 'No drivers are available at this time.'
                }
              );

              const riderLocale = await getLocaleFromUser('rider', riderId);
              await sns.send(
                'RIDER',
                riderId,
                new SnsMessage(
                  'noDriversAvailable',
                  {},
                  await buildTranslator(riderLocale)
                )
              );
            }
          } else {
            const driverId = driver._id.toString();

            if (withPooling) {
              const driverInfoStop = driverInfo.stops.find(stop => stop.request_id && !stop.ride);
              const dropoffStop = driverInfo.stops.find(stop => stop.request_id && !stop.ride && stop.stopType === 'dropoff');
              const eta = driverInfoStop ? driverInfoStop.cost : 0;
              const dropoffEta = dropoffStop ? dropoffStop.cost : 0;

              const requestIsCancelled = await requestCancelled(requests[i]);
              if (requestIsCancelled) {
                if (this.runLoadTest) { hrIterArray.push(process.hrtime(hrIterStart)); }
                // eslint-disable-next-line no-continue
                continue;
              }
              ride = await createRideForMatch({
                poolingLocation: true,
                initialEta: eta,
                eta,
                initialDropoffEta: dropoffEta,
                dropoffEta,
                ...request.rideInfo(),
                vehicleProfile
              }, driver);

              // eslint-disable-next-line no-loop-func
              const stopPromises = driverInfo.stops.map((stop) => {
                if (stop.request_id && !stop.ride) { return hasRequestId(stop, ride, eta); }
                if (stop.ride) { return getActualRide(stop); }
                return promifyStop(stop);
              });
              stops = await Promise.all(stopPromises);

              const params = { driver, active: true };
              let route;
              const activeRideId = getActiveRideId(stops);

              route = await Routes.lock(params);
              if (route) {
                logger.info('UPDATING ROUTE');
                route = await Routes.updateRoute(route.id, {
                  stops,
                  activeRideId,
                  lastUpdate: new Date()
                });
              } else {
                logger.info('CREATING ROUTE');
                route = await Routes.createRoute({
                  driver,
                  stops,
                  firstRequestTimestamp: new Date(),
                  active: true,
                  activeRideId: ride._id,
                  lastUpdate: new Date()
                });
              }
              await Routes.release(params);
              riderInfo = await Riders.findById(riderId);
            } else {
              driver = await Drivers.findById(driverId);
              const requestIsCancelled = await requestCancelled(requests[i]);
              if (requestIsCancelled) {
                if (this.runLoadTest) { hrIterArray.push(process.hrtime(hrIterStart)); }
                // eslint-disable-next-line no-continue
                continue;
              }

              const rideData = request.rideInfo();
              const etas = await setNonPoolingEtasWithNewRide(rideData, driver);
              ride = await createRideForMatch({ ...rideData, ...etas }, driver);
              riderInfo = await Riders.findById(riderId);
            }

            const driverSocketIds = await websocket.getUserSocketIds(driverId, 'driver');
            await websocket.joinSocketToRoom(driverSocketIds, ride._id.toString());
            const riderSocketIds = await websocket.getUserSocketIds(riderId, 'rider');
            await websocket.joinSocketToRoom(riderSocketIds, ride._id.toString());

            ride.driver = driver;
            ride.rider = riderInfo;

            websocket.emitWebsocketEventToSocketIds(
              'request-completed',
              riderSocketIds,
              dumpRideForRider(ride)
            );

            websocket.emitWebsocketEventToSocketIds(
              'ride-request-received',
              driverSocketIds,
              dumpRideForDriver(ride)
            );

            if (withPooling) {
              await updateRideEta(stops);
              // If fixed-stop ride and driver already arrived at fixed-stop
              if (ride.pickupFixedStopId) {
                const driverArrivedTimestamp = await getDriverArrivedTimestampFromFs(ride);
                // Update ride state
                if (driverArrivedTimestamp) {
                  const updatedRide = await Rides.driverArrived(ride, driverArrivedTimestamp);
                  // and notify rider
                  if (updatedRide) {
                    const riderLocale = await getLocaleFromUser('rider', riderInfo._id);
                    let timeString;
                    let outOfTime;
                    if (updatedRide.isWithinDriverArrivedTimer()) {
                      const timeNow = moment();
                      timeString = getTimeLeft(
                        timeNow, updatedRide.driverArrivedLimitTimestamp(), riderLocale, true
                      );
                    } else {
                      outOfTime = true;
                    }
                    await sns.send(
                      'RIDER',
                      riderInfo._id.toString(),
                      new SnsMessage(
                        'driverArrived',
                        {
                          driverDisplayName: driver.displayName,
                          timeString,
                          outOfTime
                        },
                        await buildTranslator(riderLocale)
                      )
                    );
                  }
                }
              }
            }
            await setQueue(driverId);

            // Get ETA
            const matchedRide = await Rides.findOne({ _id: ride._id });
            const rideEta = moment.utc(matchedRide.eta * 1000);
            const eta = (!rideEta || rideEta < moment.utc()) ? moment.utc().add(1, 'minutes') : rideEta;

            // Ensure ETA
            await Rides.updateRide(matchedRide._id, { eta: eta / 1000 });
            const riderLocale = await getLocaleFromUser('rider', matchedRide.rider);

            // Send ride match push notification
            await sns.send(
              'RIDER',
              matchedRide.rider.toString(),
              new SnsMessage(
                'rideConfirmed',
                {
                  eta
                },
                await buildTranslator(riderLocale)
              )
            );
          }
          if (this.runLoadTest) { hrIterArray.push(process.hrtime(hrIterStart)); }
        }
      }

      this.running = false;
      if (this.runLoadTest) {
        const hrCronEnd = process.hrtime(hrCronStart);
        logger.debug(`[LT] Cron end: ${hrCronEnd[0] + hrCronEnd[1] / (10 ** 9)}s (${hrIterArray.length} requests)`);
        const statistics = timeStatistics(hrIterArray);
        logger.debug(`[LT]\tMin: ${statistics.min}s`);
        logger.debug(`[LT]\tMax: ${statistics.max}s`);
        logger.debug(`[LT]\tAVG: ${statistics.avg}s`);
        logger.debug(`[LT]\tP95: ${statistics.p95}s`);
        logger.debug(`[LT]\tP99: ${statistics.p99}s`);
      }
    } catch (err) {
      if (this.runLoadTest) {
        const hrCronEnd = process.hrtime(hrCronStart);
        logger.debug(`[LT] Cron end w/ error: ${hrCronEnd[0] + hrCronEnd[1] / (10 ** 9)}s (${hrIterArray.length} requests)`);
        const statistics = timeStatistics(hrIterArray);
        logger.debug(`[LT]\tMin: ${statistics.min}s`);
        logger.debug(`[LT]\tMax: ${statistics.max}s`);
        logger.debug(`[LT]\tAVG: ${statistics.avg}s`);
        logger.debug(`[LT]\tP95: ${statistics.p95}s`);
        logger.debug(`[LT]\tP99: ${statistics.p99}s`);
      }
      logger.info(err);
      Sentry.captureException(err);

      this.running = false;
    }
  }
}

export default new DriverSearcher();
