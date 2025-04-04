import { ApplicationError } from '.';

class BadRequestError extends ApplicationError {
  constructor(message) {
    super(message || 'Request Malformed.', 400);
  }
}

export default BadRequestError;
