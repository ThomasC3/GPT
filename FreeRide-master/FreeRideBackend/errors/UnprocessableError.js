import { ApplicationError } from '.';

class UnprocessableError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Unprocessable',
      422,
      message ? errorKey : 'UnprocessableError.default',
      errorParams
    );
  }
}

export default UnprocessableError;
