import * as Sentry from '@sentry/node';

export const captureScopedException = (
  error,
  {
    type = 'Scoped',
    info = {},
    tag = 'scoped',
    level = 'error'
  }
) => {
  Sentry.withScope((scope) => {
    scope.setTag(`${tag}`, true);
    scope.setExtra('Type', type);
    scope.setExtra('Info', info);
    scope.setLevel(level);

    // This will contain all scope info from before
    Sentry.captureException(error);
  });
};

export default { captureScopedException };
