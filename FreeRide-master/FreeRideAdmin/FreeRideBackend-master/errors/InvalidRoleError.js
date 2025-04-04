import { ApplicationError } from '.'

class InvalidRoleError extends ApplicationError {
  constructor(role) {
    super(`Invalid role "${role}"`, 400);
  }
}

export default InvalidRoleError;
