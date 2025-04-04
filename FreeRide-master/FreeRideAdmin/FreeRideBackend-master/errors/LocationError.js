import { ApplicationError } from '.';

class LocationError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Location error.',
      400,
      message ? errorKey : 'location.error',
      errorParams
    );
  }
}

export default LocationError;
