import { ApplicationError } from '.';

class InvalidPhoneNumberError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Invalid phone number',
      404,
      message ? errorKey : 'InvalidPhoneNumberFormatError.default',
      errorParams
    );
  }
}

export default InvalidPhoneNumberError;
