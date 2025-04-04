import { ApplicationError } from '.';

class InvalidPinCodeNumber extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}) {
    super(
      message || 'Wrong pincode',
      400,
      message ? errorKey : 'InvalidPinCodeNumber.default',
      errorParams
    );
  }
}

export default InvalidPinCodeNumber;
