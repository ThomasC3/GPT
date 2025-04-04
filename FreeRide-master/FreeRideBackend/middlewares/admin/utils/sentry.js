import * as Sentry from '@sentry/node';

export const captureAdminException = (error, user = {}) => {
  Sentry.withScope((scope) => {
    scope.setTag('Admin', true);
    scope.setExtra('Type', 'Admin API');

    scope.setUser({
      id: user.id,
      email: user.email
    });

    // This will contain all scope info from before
    Sentry.captureException(error);
  });
};

export default { captureAdminException };
