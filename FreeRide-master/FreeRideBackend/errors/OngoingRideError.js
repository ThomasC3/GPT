import { ApplicationError } from '.';

class OngoingRideError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'There are ongoing rides.',
      400,
      message ? errorKey : 'OngoingRideError.default',
      errorParams
    );
  }
}

export default OngoingRideError;
