import { ApplicationError } from '.';

class ConflictError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'There was a conflict with your request',
      409,
      message ? errorKey : 'ConflictError.default',
      errorParams
    );
  }
}

export default ConflictError;
