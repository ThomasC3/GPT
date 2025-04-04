import { ApplicationError } from '.';

class CancelCooldownError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Please wait a few moments and trying again',
      403,
      message ? errorKey : 'request.cancelCooldownDefault',
      errorParams
    );
  }
}

export default CancelCooldownError;
