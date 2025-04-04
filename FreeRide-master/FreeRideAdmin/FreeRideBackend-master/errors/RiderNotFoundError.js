import { ApplicationError } from '.';

class RiderNotFoundError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Rider not found.',
      404,
      message ? errorKey : 'RiderNotFoundError.default',
      errorParams
    );
  }
}

export default RiderNotFoundError;
