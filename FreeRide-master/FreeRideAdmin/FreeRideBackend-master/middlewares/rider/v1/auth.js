import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { google as googleapis } from 'googleapis';
import * as Sentry from '@sentry/node';

import CustomStrategy from 'passport-custom';
import { Facebook } from 'fb';

import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';
import { Riders as Model } from '../../../models';
import { facebook as fbConfig } from '../../../config';
import { auth as Auth, sns } from '../../../services';
import { errorCatchHandler } from '../../../utils';
import {
  UnprocessableError,
  InvalidAccessTokenError,
  FacebookError,
  ForbiddenError,
  ApplicationError
} from '../../../errors';
import logger from '../../../logger';
import { emailVerificationDeadline } from '../../../utils/rider';
import { isEmailBlacklisted } from '../utils/email';

const fbClient = new Facebook({ appId: fbConfig.appId, appSecret: fbConfig.appSecret });

const getApplePublicKey = async kid => jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys'
}).getSigningKey(kid).then(key => key.getPublicKey());

passport.use('register', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, email, password, done) => {
  try {
    const {
      dob,
      firstName,
      gender,
      lastName,
      phone,
      zip,
      facebook,
      google,
      location
    } = req.body;

    const isBlacklisted = await isEmailBlacklisted(email);

    if (isBlacklisted) {
      throw new ApplicationError('Invalid email', 400);
    }

    const rider = await Model.createRider({
      dob,
      email: email ? email.toLowerCase() : email,
      firstName,
      gender,
      lastName,
      location,
      phone,
      facebook,
      google,
      zip,
      password,
      emailVerificationDeadline: emailVerificationDeadline()
    });

    Sentry.withScope((scope) => {
      scope.setLevel('info');
      scope.setUser({ id: rider._id, phone: rider.phone });
      scope.setExtra('ip', req.headers['x-forwarded-for']);
      scope.setExtra('strategy', 'local');
      Sentry.captureMessage('New Registered User');
    });

    const user = Auth.getToken(rider);
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.use('riderLogin', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const rider = await Model.getRider({ email });
    if (rider) {
      if (rider.isDeleted) {
        throw new ApplicationError('User not found', 400, 'login.userNotFound');
      } else if (!rider.password) {
        throw new UnprocessableError(
          'Hey Rider, welcome back! Before we can log you in, we need you to update your password. Check your account\'s email inbox for a PIN code which you can enter here so that we can verify your account.',
          'emailLogin.emptyPassword'
        );
      }
    }

    return Auth.verification(rider, password, done);
  } catch (error) {
    return done(error);
  }
}));


passport.use('facebook', new CustomStrategy(
  async (req, done) => {
    try {
      if (!req.body.accessToken) {
        throw new InvalidAccessTokenError('Access token is required', 'facebookLogin.accessTokenMissing');
      }
      const { accessToken } = req.body;
      fbClient.setAccessToken(accessToken);
      const response = await fbClient.api(
        '/me',
        'GET',
        {
          fields: 'email,first_name,last_name,birthday,gender,location{location}'
        },
      );
      if (!response || response.error) {
        throw new FacebookError('Facebook request error', 'FacebookError.default');
      }
      const rider = await Model.upsertFbUser(response);
      if (rider.isExistingUser) {
        return done(
          null,
          Auth.getToken(rider),
          {
            message: 'Logged in Successfully',
            translationKey: 'facebookLogin.success'
          }
        );
      }
      return done(
        null,
        rider,
      );
    } catch (err) {
      return done(err);
    }
  },
));

passport.use('google', new CustomStrategy(
  async (req, done) => {
    try {
      if (!req.body.accessToken) {
        throw new InvalidAccessTokenError('Access token is required', 'googleLogin.accessTokenMissing');
      }

      const { accessToken } = req.body;

      const oauth2Client = new googleapis.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const oauth2 = googleapis.oauth2({
        auth: oauth2Client,
        version: 'v2'
      });

      const payload = await new Promise((resolve, reject) => oauth2.userinfo.get(
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.data);
          }
        },
      ));

      if (!payload) {
        throw new ApplicationError('Unable to retrieve user information from Google. Please try again later.', 400, 'googleLogin.userNotFound');
      }

      const rider = await Model.upsertGoogleUser(payload);

      return done(null, Auth.getToken(rider));
    } catch (err) {
      logger.info(err);
      return done(err);
    }
  },
));

passport.use('apple', new CustomStrategy(
  async (req, done) => {
    try {
      const { identityToken, firstName, lastName } = req.body;
      if (!identityToken) {
        throw new InvalidAccessTokenError('Identity token is required', 'appleLogin.identityTokenMissing');
      }

      const decodedHeader = jwt.decode(identityToken, { complete: true });
      const { kid } = decodedHeader.header;

      const publicKey = await getApplePublicKey(kid);
      const decoded = jwt.verify(identityToken, publicKey, { algorithms: ['RS256'] });

      if (!decoded.sub) {
        throw new Error('Invalid identity token');
      }
      const rider = await Model.upsertAppleUser({
        id: decoded.sub, email: decoded.email, firstName, lastName
      });
      return done(null, Auth.getToken(rider));
    } catch (err) {
      return done(err);
    }
  },
));

const login = async (req, res, next) => {
  passport.authenticate('riderLogin', { session: false }, async (err, user) => {
    let loginError = err;
    if (!loginError && user && user.isBanned) {
      loginError = new ForbiddenError('Your account has been suspended.', 'login.suspendedAccount');
    }
    Auth.authCallback(loginError, user, req, res);
  })(req, res, next);
};

const logout = async (req, res, next) => {
  passport.authenticate(
    'jwt',
    { session: false },
    async (err, user) => {
      if (!req.body.deviceToken) {
        return errorCatchHandler(
          res,
          new ApplicationError('Device token is required', 400, 'logout.deviceTokenMissing'),
          null,
          req.t
        );
      }

      await sns.deleteEndpointByDeviceToken(
        req.body.deviceToken,
      );

      return Auth.logoutCallback(err, user, req, res);
    },
  )(req, res, next);
};

export default {
  login,
  logout
};
