import { ApplicationError } from '.'

class UserNotFoundError extends ApplicationError {
  constructor(message) {
    super(message || 'User not found.', 404);
  }
}

export default UserNotFoundError;
