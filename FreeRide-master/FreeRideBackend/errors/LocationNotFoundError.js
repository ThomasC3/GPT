import { ApplicationError } from '.';

class LocationNotFoundError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Location not found.',
      404,
      message ? errorKey : 'LocationNotFoundError.default',
      errorParams
    );
  }
}

export default LocationNotFoundError;
