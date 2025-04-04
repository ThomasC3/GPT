import { ApplicationError } from '.';

class FacebookError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Facebook request error',
      500,
      message ? errorKey : 'FacebookError.default',
      errorParams
    );
  }
}

export default FacebookError;
