import { ApplicationError } from '.';

class StripeSetupError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Something went wrong. Please try again.',
      500,
      message ? errorKey : 'genericFailure', // DO NOT TRANSLATE genericFailure - FILTERED BY APP
      errorParams
    );
  }
}

export default StripeSetupError;
