/* eslint-disable no-unused-vars */
import datadog from './datadog';

import { env, metrics, logger as loggerLevel } from './config';
import logger from './logger';
import {
  cloudWatchClient,
  cron,
  driverSearch,
  reBroadcast,
  updateLocationStatus,
  websocket,
  ReportGeneratorService,
  RiderGeneratorService,
  MetricsService
} from './services';

let start = null;
let duration = null;
let timeout = null;

websocket.init();

logger.info(`Current Location Set Env - ${process.env.LOCATION_WORKING_SET}`);

cron.add('0 */15 * * * *', updateLocationStatus.update.bind(updateLocationStatus));
cron.add('0 */15 * * * *', MetricsService.update.bind(MetricsService));
cron.add('0 4-5 1 * *', ReportGeneratorService.perform.bind(ReportGeneratorService));
cron.add('0 8 1 * *', RiderGeneratorService.perform.bind(RiderGeneratorService));

setTimeout(async function runDriverSearch() {
  logger.debug((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'Mb');

  start = new Date();
  await driverSearch.search();
  duration = new Date() - start;

  if (metrics.requestProcessor) {
    cloudWatchClient.processDriverSearchTimingMetric(duration);
  }

  const loopWasShort = duration < 5000;
  timeout = loopWasShort ? 10000 : 5000;
  setTimeout(runDriverSearch, timeout);
}, 5000);


setTimeout(async function runReBroadcastMatch() {
  await reBroadcast.broadcastMatches();

  const loopWasShort = duration < 30 * 1000; // 30 seconds
  timeout = loopWasShort ? 60 * 1000 : 30 * 1000; // 1 minute or 30 seconds
  setTimeout(runReBroadcastMatch, timeout);
}, 30 * 1000);
