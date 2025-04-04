import { ApplicationError } from '.';

class ForbiddenError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Forbidden',
      403,
      message ? errorKey : 'ForbiddenError.default',
      errorParams
    );
  }
}

export default ForbiddenError;
