// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import { Constants } from '../models';
import logger from '../logger';

const createUnavailabilityReasonsConstant = async () => {
  logger.info('Creating unavailability constants...');
  await Constants.create({
    topic: 'Unavailability reasons',
    key: 'unavailability_reasons',
    values: [
      'Swapping cars',
      'Emergency exit'
    ]
  });
  logger.info('Created unavailability reasons');
  process.exit(0);
};

createUnavailabilityReasonsConstant();
