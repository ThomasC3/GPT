import { ApplicationError } from '.';

class RideNotFoundError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Ride not found',
      404,
      message ? errorKey : 'ride.notFoundSimple',
      errorParams
    );
  }
}

export default RideNotFoundError;
