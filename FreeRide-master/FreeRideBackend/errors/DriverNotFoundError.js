import { ApplicationError } from '.'

class DriverNotFoundError extends ApplicationError {
  constructor(message) {
    super(message || 'Driver not found.', 404);
  }
}

export default DriverNotFoundError;
