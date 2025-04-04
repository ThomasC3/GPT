// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import { Drivers } from '../models';
import logger from '../logger';

const addDefaultDisplayNameToDrivers = async () => {
  logger.info('Adding default display names to drivers without display name');
  await Drivers.updateMany({ $or: [{ displayName: { $exists: false } }, { displayName: '' }] }, [
    { $set: { displayName: { $concat: ['$firstName', ' ', '$lastName'] } } }
  ]);
  logger.info('Added default driver display name');
  process.exit(0);
};

addDefaultDisplayNameToDrivers();
