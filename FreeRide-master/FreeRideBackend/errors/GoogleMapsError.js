import { ApplicationError } from '.';

class GoogleMapsError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Google Maps request was unsuccessful',
      500,
      message ? errorKey : 'googleMapsClient.default',
      errorParams
    );
  }
}

export default GoogleMapsError;
