import { AdminSentry } from '..';
import { jsonLogger } from '../../../logger';

export default function adminErrorCatchHandler(res, error, req, message) {
  jsonLogger.error(error);

  let statusCode = error.code || 500;
  if (Number.isNaN(Number(statusCode)) || statusCode < 400 || statusCode > 500) {
    statusCode = 500;
  }

  if (statusCode === 500) {
    AdminSentry.captureAdminException(error, req.user);
  }

  res.status(statusCode).json({
    code: statusCode,
    message: message || error.message
  });
}
