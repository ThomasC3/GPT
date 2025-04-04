import { ApplicationError } from '.';

class DuplicatePromocodeError extends ApplicationError {
  constructor(message) {
    super(message || 'Duplicate promocode', 400);
  }
}

export default DuplicatePromocodeError;
