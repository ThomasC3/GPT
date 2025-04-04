import { ApplicationError } from '.';

class FixedStopNotFoundError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Stop not found.',
      404,
      message ? errorKey : 'request.stopOutsideArea',
      errorParams
    );
  }
}

export default FixedStopNotFoundError;
