// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import { Vehicles } from '../models';
import logger from '../logger';

const reindexVehiclePublicId = async () => {
  logger.info('Reindexing vehicle publicId...');
  await Vehicles.collection.dropIndex('publicId_1');
  await Vehicles.collection.createIndex({ publicId: 1 });
  process.exit(0);
};

const env = process.env.npm_config_env || process.env.NODE_ENV || 'local';

if (env === 'production') {
  logger.info(`Unable to run vehicle reindexing in env ${env}`);
} else {
  logger.info(`Running for env ${env}`);
  reindexVehiclePublicId();
}
