import { ApplicationError } from '.';

class InvalidPromocodeError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Invalid promocode',
      400,
      message ? errorKey : 'promocode.invalid',
      errorParams
    );
  }
}

export default InvalidPromocodeError;
