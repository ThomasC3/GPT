import * as Sentry from '@sentry/node';
import logger from '../logger';
import { translator } from './translation';

const FILTERED_TRANSLATION_KEYS = [
  'genericFailure',
  'ride.noActiveRidesForRider',
  'noDriversAvailable'
];

export default function errorCatchHandler(
  res, error, defaultMessage, t = null, errorKey = null, errorParams = {}
) {
  const plainErrorMessage = error.message;

  logger.error(error);
  logger.debug(error.stack);

  let statusCode = error.code || 400;
  if (Number.isNaN(Number(statusCode)) || statusCode < 400 || statusCode > 500) {
    statusCode = 400;
  }

  if (statusCode === 500) {
    Sentry.captureException(error);
  }

  let message = translator(
    t,
    error.errorKey || errorKey,
    error.errorParams || errorParams,
    FILTERED_TRANSLATION_KEYS.includes(error.errorKey || errorKey) ? 'en' : null
  );

  message = message || defaultMessage || plainErrorMessage;

  res.status(statusCode).json({
    code: statusCode,
    message
  });
}
