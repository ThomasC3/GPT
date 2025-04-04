import { ApplicationError } from '.';

class PromocodeError extends ApplicationError {
  constructor(message) {
    super(message || 'Invalid promocode', 400);
  }
}

export default PromocodeError;
