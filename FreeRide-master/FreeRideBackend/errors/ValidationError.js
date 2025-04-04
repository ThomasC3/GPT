import { ApplicationError } from '.';

class ValidationError extends ApplicationError {
  constructor(message) {
    super(message || 'Validation Error', 400);
  }
}

export default ValidationError;
