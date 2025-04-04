/* eslint-disable eqeqeq */
import { ForbiddenError } from '../errors';
import { errorCatchHandler } from '../utils';
import { Settings } from '../models';

const versionCompare = (v1, v2, options) => {
  const lexicographical = options && options.lexicographical;
  const zeroExtend = options && options.zeroExtend;
  let v1parts = v1.split('.');
  let v2parts = v2.split('.');

  function isValidPart(x) {
    return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
  }

  if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
    return NaN;
  }

  if (zeroExtend) {
    while (v1parts.length < v2parts.length) v1parts.push('0');
    while (v2parts.length < v1parts.length) v2parts.push('0');
  }

  if (!lexicographical) {
    v1parts = v1parts.map(Number);
    v2parts = v2parts.map(Number);
  }

  for (let i = 0; i < v1parts.length; i += 1) {
    if (v2parts.length == i) {
      return 1;
    }

    if (v1parts[i] == v2parts[i]) {
      continue;
    } else if (v1parts[i] > v2parts[i]) {
      return 1;
    } else {
      return -1;
    }
  }

  if (v1parts.length != v2parts.length) {
    return -1;
  }

  return 0;
};

export const riderAppVersionCheck = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    const os = req.headers['X-Mobile-Os'] || req.headers['x-mobile-os'] || '';
    const appVersion = req.headers['X-App-Version'] || req.headers['x-app-version'] || '';
    const appMinVersion = settings[`rider${os}`];

    if (appMinVersion && versionCompare(appVersion, appMinVersion) >= 0) {
      return next();
    }
    // DO NOT TRANSLATE - FILTERED BY APP
    throw new ForbiddenError(
      'You need to update Circuit app to the latest version in order to request rides',
      'outdatedApp'
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'Something went wrong. Please try again.',
      req.t,
      'genericFailure'
    );
  }
};

export default { riderAppVersionCheck };
