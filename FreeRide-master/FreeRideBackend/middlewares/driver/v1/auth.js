import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Drivers as Model, Events } from '../../../models';
import { auth as Auth, sns } from '../../../services';
import { UnprocessableError, ForbiddenError, ApplicationError } from '../../../errors';
import logger from '../../../logger';
import { errorCatchHandler } from '../../../utils';

passport.use('driverLogin', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const driver = await Model.getDriver({ email });
    if (driver && !driver.password) {
      throw new UnprocessableError('Hey Driver, welcome back! Before we can log you in, we need you to update your password. Check your account\'s email inbox for a PIN code which you can enter here so that we can verify your account.');
    }

    return Auth.verification(driver, password, done);
  } catch (error) {
    logger.info(error);
    return done(error);
  }
}));

const login = async (req, res, next) => {
  passport.authenticate(
    'driverLogin',
    { session: false },
    async (err, user) => {
      let loginError = err;
      if (!loginError && user) {
        if (user.isBanned) {
          loginError = new Error('Your account has been suspended.');
          loginError.code = 403;
        } else {
          const driver = await Model.findById(user.id.toString());
          driver.isOnline = true;
          driver.isAvailable = false;
          driver.status = 'Logged in';
          await driver.save();
          logger.info(`Driver ${driver._id} changed status to online`);

          await Events.createByDriver({
            driver,
            eventType: 'LOGIN',
            targetType: 'Driver'
          });
        }
      }

      return Auth.authCallback(loginError, user, req, res);
    }
  )(req, res, next);
};

const logout = async (req, res, next) => {
  passport.authenticate(
    'jwt',
    { session: false },
    async (err, user) => {
      try {
        if (err) {
          throw err;
        }
        if (!user) {
          throw new ForbiddenError();
        }
        const driver = await Model.findById(user._id.toString());

        if (driver.driverRideList.length > 0) {
          throw new ApplicationError('Cannot log out while there are active rides', 400);
        }

        if (driver.isAvailable) {
          throw new ApplicationError('Cannot log out while available', 400);
        }

        if (driver.vehicle?.vehicleId) {
          throw new ApplicationError('Cannot log out with a vehicle attached', 400);
        }

        const { activeLocation } = driver;
        driver.isOnline = false;
        driver.status = 'Logged out';
        driver.loggedOutTimestamp = new Date();
        driver.activeLocation = null;
        await driver.save();
        logger.info(`Driver ${driver._id} changed status to offline`);

        if (req.body.deviceToken) {
          await sns.deleteEndpointByDeviceToken(
            req.body.deviceToken
          );
        }

        await Events.createByDriver({
          driver,
          eventType: 'LOGOUT',
          targetType: 'Driver',
          eventData: {
            location: activeLocation
          }
        });

        return Auth.logoutCallback(err, user, req, res);
      } catch (error) {
        if (!(error instanceof ApplicationError)) {
          error.message = 'Something went wrong. Please try again.';
          error.code = 500;
        }
        return errorCatchHandler(res, error);
      }
    }
  )(req, res, next);
};

export default {
  login,
  logout
};
