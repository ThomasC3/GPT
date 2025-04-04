import { ApplicationError } from '.';

class SessionExpiredError extends ApplicationError {
  constructor(message) {
    let errorMesage = 'Your session has expired. Please log out and then log back in.';
    if (message) {
      errorMesage = `${message} ${errorMesage}`;
    }
    super(errorMesage, 403);
  }
}

export default SessionExpiredError;
