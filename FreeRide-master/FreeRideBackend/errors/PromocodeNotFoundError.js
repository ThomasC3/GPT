import { ApplicationError } from '.'

class PromocodeNotFoundError extends ApplicationError {
  constructor(message) {
    super(message || 'Promocode not found.', 404);
  }
}

export default PromocodeNotFoundError;
