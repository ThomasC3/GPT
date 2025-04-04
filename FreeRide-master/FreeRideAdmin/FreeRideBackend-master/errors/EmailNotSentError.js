import { ApplicationError } from '.';

class EmailNotSentError extends ApplicationError {
  constructor(message, errorKey = null, errorParams = {}, statusCode = 500) {
    super(
      message || 'Email not sent',
      statusCode,
      message ? errorKey : 'EmailNotSentError.default',
      errorParams
    );
  }
}

export default EmailNotSentError;
