import { ApplicationError } from '.'

class RequestNotFoundError extends ApplicationError {
  constructor(message) {
    super(message || 'Request not found.', 404);
  }
}

export default RequestNotFoundError;
