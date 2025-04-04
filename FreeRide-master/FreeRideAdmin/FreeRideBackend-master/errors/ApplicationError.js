// ApplicationError.js

class ApplicationError extends Error {
  constructor(message, code, errorKey = null, errorParams = {}) {
    super();

    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;

    // DO NOT TRANSLATE genericFailure - FILTERED BY APP
    this.message = message || 'Something went wrong. Please try again.';

    this.status = code || 500;
    this.code = code || '500';

    this.errorKey = message ? errorKey : 'genericFailure';
    this.errorParams = errorParams;
  }
}

export default ApplicationError;
