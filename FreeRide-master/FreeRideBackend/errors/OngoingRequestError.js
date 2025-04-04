import { ApplicationError } from '.';

class OngoingRequestError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'There are ongoing requests.',
      400,
      message ? errorKey : 'OngoingRequestError.default',
      errorParams
    );
  }
}

export default OngoingRequestError;
