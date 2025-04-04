// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import { Locations } from '../models';
import logger from '../logger';

const addWorkingSetToLocations = async () => {
  logger.info('Adding default Cron Working Set to all locations...');
  await Locations.updateMany({}, { cronWorkingSet: 'ws_0' });
  logger.info('Added default Cron Working Set to all locations');
  process.exit(0);
};

addWorkingSetToLocations();
