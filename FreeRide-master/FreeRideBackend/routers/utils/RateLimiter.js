import * as Sentry from '@sentry/node';
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import {
  redis as redisConfig
} from '../../config';
import { errorCatchHandler } from '../../utils';
import { ApplicationError } from '../../errors';

class RateLimiter {
  constructor(config) {
    this.redisClient = new Redis({
      port: config.port,
      host: config.host,
      db: config.rateLimiteDb
    });

    this.pincodePrefixer = 'rl_rider_pincode';
    this.rateLimiterRedisPincode = new RateLimiterRedis({
      keyPrefix: this.pincodePrefixer,
      storeClient: this.redisClient,
      points: 60, // Bag of 60 points, 30 consumption for pincode per user
      duration: 60 * 5 // Per 5 minutes
    });

    this.signupPrefixer = 'rl_rider_signup';
    this.rateLimiterRedisSignup = new RateLimiterRedis({
      keyPrefix: this.signupPrefixer,
      storeClient: this.redisClient,
      points: 5,
      duration: 60 * 60 * 1, // Per 1h
      inMemoryBlockOnConsumed: 5,
    });
  }

  signupRateLimiterMiddleware() {
    return (req, res, next) => {
      const key = req.headers['x-forwarded-for']; // ip

      if (!key) return next()

      this.rateLimiterRedisSignup
        .consume(key)
        .then(() => {
          next();
        })
        .catch(() => {
          Sentry.withScope((scope) => {
            scope.setLevel("info");
            scope.setUser({ id: key });
            scope.setExtra("ip", key);
            Sentry.captureMessage("SignUp Rate Limit Exceeded");
          });

          errorCatchHandler(
            res,
            new ApplicationError(
              'Too Many Requests, please wait a few minutes before trying again',
              429,
              'signupLimitExceeded'
            ),
            'Something went wrong. Please try again.',
            req.t,
            'genericFailure'
          );
        });
    };
  }

  pincodeRateLimiterMiddleware() {
    return (req, res, next) => {
      const ip = req.headers['x-forwarded-for'];
      const key = req?.user?._id || ip;

      const creditConsumption = 30;
      this.rateLimiterRedisPincode.consume(key, creditConsumption)
        .then(() => {
          next();
        })
        .catch(() => {
          Sentry.withScope((scope) => {
            scope.setLevel('info');
            scope.setUser({ id: key });
            scope.setExtra('ip', req.headers['x-forwarded-for']);
            Sentry.captureMessage('Pincode Rate Limit Exceeded');
          });

          errorCatchHandler(
            res,
            new ApplicationError(
              'Too Many Requests, please wait a few minutes before trying again',
              429,
              'pincodeLimit'
            ),
            'Something went wrong. Please try again.',
            req.t,
            'genericFailure'
          );
        });
    };
  }
}

export default new RateLimiter(redisConfig);
