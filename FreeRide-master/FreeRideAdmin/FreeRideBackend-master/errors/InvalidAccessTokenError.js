import { ApplicationError } from '.';

class InvalidAccessTokenError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Invalid access token',
      403,
      message ? errorKey : 'InvalidAccessTokenError.default',
      errorParams
    );
  }
}

export default InvalidAccessTokenError;
