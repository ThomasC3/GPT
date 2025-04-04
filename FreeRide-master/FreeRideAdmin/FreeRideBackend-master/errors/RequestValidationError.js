import { ApplicationError } from '.';

class RequestValidationError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Something went wrong. Please try again.',
      400,
      message ? errorKey : 'genericFailure', // DO NOT TRANSLATE genericFailure - FILTERED BY APP
      errorParams
    );
  }
}

export default RequestValidationError;
