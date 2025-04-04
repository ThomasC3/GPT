import { ApplicationError } from '.';

class InvalidPhoneNumberFormatError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Invalid phone format',
      400,
      message ? errorKey : 'InvalidPhoneNumberFormatError.phoneParseFail',
      errorParams
    );
  }
}

export default InvalidPhoneNumberFormatError;
