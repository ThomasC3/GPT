import { ApplicationError } from '.'

class AdminNotFoundError extends ApplicationError {
  constructor(message) {
    super(message || 'Admin not found.', 404);
  }
}

export default AdminNotFoundError;
