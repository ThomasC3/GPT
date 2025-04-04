import * as Sentry from '@sentry/node';
import logger from '../logger';
import { translator } from './translation';

const WS_FILTERED_TRANSLATION_KEYS = [
  'genericFailure',
  'ride.noActiveRidesForRider',
  'noDriversAvailable'
];

export default function wsErrorCatchHandler(
  socket, error, defaultMessage, { t, lng }, errorKey = null, errorParams = {}, event = ''
) {
  const plainErrorMessage = error.message;

  logger.error(event, error);
  Sentry.captureException(error);

  let message = translator(
    t,
    error.errorKey || errorKey,
    error.errorParams || errorParams,
    WS_FILTERED_TRANSLATION_KEYS.includes(error.errorKey || errorKey) ? 'en' : lng
  );

  message = message || defaultMessage || plainErrorMessage;

  socket.emit('wserror', {
    message
  });
}
