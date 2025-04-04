import passport from 'passport';
import jwt from 'jsonwebtoken';
import uuid from 'uuid/v1';
import {
  Strategy as JWTstrategy,
  ExtractJwt as ExtractJWT
} from 'passport-jwt';

import crypto from 'crypto';
import { captureScopedException } from '../utils/sentry';

import { auth, intercom } from '../config';
import {
  crypto as cryptoUtils,
  errorCatchHandler,
  responseHandler
} from '../utils';
import { Drivers, Riders, Admins } from '../models';
import { ApplicationError } from '../errors';
import logger from '../logger';

class Auth {
  static verification(user, password, done) {
    try {
      if (!user) {
        return done(null, false, { message: 'User not found', translationKey: 'login.userNotFound' });
      }

      const validate = this.isPasswordMatch(user, password);
      if (!validate) {
        return done(null, false, { message: 'Wrong Password', translationKey: 'login.authenticationFailed' });
      }

      const result = this.getToken(user);

      return done(null, result, { message: 'Logged in Successfully', translationKey: 'login.success' });
    } catch (error) {
      return done(error);
    }
  }

  static isPasswordMatch(user, password) {
    return cryptoUtils.compareHashes(password, user.password);
  }

  static getToken(user) {
    const result = user.toJSON();
    const body = { _id: result.id, email: result.email, role: result.role };

    result.accessToken = jwt.sign(
      { jti: uuid(), user: body, userType: user.userType },
      auth.secret,
      { expiresIn: auth.expiresIn }
    );

    if (user.userType === 'rider') {
      const { iosUserIntercomHash, androidUserIntercomHash } = this.generateIntercomHash(user._id);
      result.iosUserIntercomHash = iosUserIntercomHash;
      result.androidUserIntercomHash = androidUserIntercomHash;
    }

    return result;
  }

  static async authCallback(err, user, req, res) {
    if (err || !user) {
      const error = new ApplicationError(
        err?.message ? err.message : 'The email or password you entered is incorrect.',
        err?.code ? err.code : 403,
        'login.authenticationFailed'
      );
      errorCatchHandler(
        res,
        error,
        'Something went wrong. Please try again.',
        req.t,
        'genericFailure'
      );
    } else {
      try {
        req.login(user, { session: false }, async (error) => {
          if (error) {
            // FIXME - Do not replace error
            throw new ApplicationError();
          }
          return responseHandler(user, res);
        });
      } catch (error) {
        // FIXME - Do not replace caught error
        return errorCatchHandler(
          res,
          new ApplicationError('We are unable to process your request at this time.', 403, 'login.requestFail'),
          null,
          req.t
        );
      }
    }
  }

  static async oAuthCallback(err, user, req, res) {
    try {
      if (err) {
        throw err;
      }
      if (!user) {
        throw new Error('User not found during OAuth callback.');
      }
      return responseHandler(user, res);
    } catch (error) {
      return errorCatchHandler(
        res,
        error,
        'We were unable to fetch your account information.',
        req.t,
        'riderAccount.infoFetchFail'
      );
    }
  }

  static async logoutCallback(err, user, req, res) {
    if (err || !user || !user.accessToken) {
      // FIXME - Do not replace caught error
      return errorCatchHandler(
        res,
        new ApplicationError('Unable to log you out at this time.', 400, 'logout.fail'),
        null,
        req.t
      );
    }

    return responseHandler(
      {},
      res,
      'You\'ve been successfully logged out.',
      req.t,
      'logout.successful'
    );
  }

  static async authCallbackRegister(
    err, user, req, res, registrationType
  ) {
    if (user) {
      return responseHandler(user, res);
    }

    if (err?.errors?.email) {
      const {
        message,
        translationKey
      } = Auth.registerTypeError(registrationType, err);
      return errorCatchHandler(
        res,
        new ApplicationError(message, 400, translationKey),
        null,
        req.t
      );
    }

    return errorCatchHandler(
      res,
      new ApplicationError('Unable to create rider', 400, 'rider.unableToCreate'),
      null,
      req.t
    );
  }

  // FIXME: handle specific validation error
  static registerTypeError(registrationType, error = null) {
    const errorResponse = {
      facebook: {
        message: 'An account already exists for this email, phone or Facebook id.',
        translationKey: 'registration.facebook'
      },
      google: {
        message: 'An account already exists for this email, phone or Google id.',
        translationKey: 'registration.google'
      },
      email: {
        message: 'An account already exists for this email or phone',
        translationKey: 'registration.email'
      }
    }[registrationType] || {};

    return {
      message: errorResponse.message || 'An account already exists for this email',
      translationKey: errorResponse.translationKey || 'registration.other'
    };
  }

  static generateIntercomHash(userId) {
    const iosUserIntercomHash = crypto.createHmac('sha256', intercom.ios_secret)
      .update(userId.toString())
      .digest('hex');

    const androidUserIntercomHash = crypto.createHmac('sha256', intercom.android_secret)
      .update(userId.toString())
      .digest('hex');

    return { iosUserIntercomHash, androidUserIntercomHash };
  }
}

passport.use(new JWTstrategy({
  secretOrKey: auth.secret,
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken()
}, async (token, done) => {
  try {
    const { user } = token;
    let userModel;

    // eslint-disable-next-line
    switch (token.userType) {
    case 'driver':
      userModel = await Drivers.findById(user._id);
      break;
    case 'rider':
      userModel = await Riders.findById(user._id);
      break;
    case 'admin':
      userModel = await Admins.findById(user._id);
      break;
    default:
      throw new ApplicationError(`Unknown userType Token "${token.userType}"`, 500, 'login.unknownUserType', { userType: token.userType });
    }

    if (userModel && userModel.isBanned) {
      const error = new ApplicationError('Your account has been suspended.', 403, 'login.suspendedAccount');
      error.code = 403;

      throw error;
    }
    if (userModel && userModel.isDeleted) {
      const error = new ApplicationError('This account is no longer active.', 401, 'login.inactiveAccount');
      error.code = 403;

      throw error;
    }

    delete token.user;
    user.accessToken = token;

    return done(null, user);
  } catch (error) {
    logger.info('DECODING AUTH TOKEN ERROR', error);
    return done(error, false);
  }
}));

export const jwtAuthentification = (req, res, next) => {
  passport.authenticate(
    'jwt',
    { session: false },
    (error, user, info) => {
      let err = error;

      if (err || !user) {
        const token = req.get('Authorization');
        let tokenLength = 0;
        if (token) {
          tokenLength = token.length;
        }
        logger.info(`[ERROR] jwtAuthentication failed err=${err} user=${user} info=${JSON.stringify(info)} token_length=${tokenLength}`);
        if (!err || (err && !(err instanceof Error))) {
          err = new ApplicationError('Authentication Failed', 401, 'login.genericFailure');
        }
        captureScopedException(err,
          {
            tag: 'Auth',
            type: 'API',
            info: {
              errorName: info ? info.name : '',
              errorMessage: info ? info.message : ''
            },
            level: 'warning'
          });
        logger.error(err);

        if (err.code && (err.code < 400 || err.code > 500)) {
          err.code = 500;
        }

        errorCatchHandler(
          res,
          err,
          'Something went wrong. Please try again.',
          req.t,
          'genericFailure'
        );
      } else {
        req.user = user;
        next();
      }
    }
  )(req, res, next);
};

export default Auth;
