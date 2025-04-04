import express from 'express';
import passport from 'passport';
import RateLimiter from '../../utils/RateLimiter';
import { bodyParserJson, enableCORS } from '../../../middlewares';
import { v1 as middlewareV1 } from '../../../middlewares/rider';
import Auth, { jwtAuthentification } from '../../../services/auth';
import { riderAppVersionCheck } from '../../../services/versionController';

require('../../../middlewares/rider/v1/auth');

const router = express.Router();

// Config
router.use(bodyParserJson);
router.use(enableCORS);

// Routers
// Passport doesn't provide custom http responses, that's why added closure
router.post('/register', RateLimiter.signupRateLimiterMiddleware(), (req, res, next) => {
  passport.authenticate('register', { session: false },
    async (err, user) => Auth.authCallbackRegister(
      err, user, req, res, 'email'
    ))(req, res, next);
});

router.post('/login', middlewareV1.auth.login);

router.post('/auth/facebook', (req, res, next) => {
  passport.authenticate('facebook', { session: false }, async (err, user) => {
    Auth.oAuthCallback(err, user, req, res);
  })(req, res, next);
});

router.post('/auth/google', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user) => {
    Auth.oAuthCallback(err, user, req, res);
  })(req, res, next);
});

router.post('/auth/apple', (req, res, next) => {
  passport.authenticate('apple', { session: false }, async (err, user) => {
    Auth.oAuthCallback(err, user, req, res);
  })(req, res, next);
});

router.get('/user',
  jwtAuthentification,
  middlewareV1.getRider);

router.delete('/user',
  jwtAuthentification,
  middlewareV1.deleteRider);

router.put('/user',
  jwtAuthentification,
  middlewareV1.updateRider);

router.post('/change-password',
  jwtAuthentification,
  middlewareV1.changePassword);

router.get('/unsubscribe', middlewareV1.notifications.unsubscribeEmail);

router.get('/requests', jwtAuthentification, middlewareV1.requests.getRequests);
router.post('/ride/request', jwtAuthentification, riderAppVersionCheck, middlewareV1.ride.request);
router.post('/ride/request/payment-authorization', jwtAuthentification, middlewareV1.ride.approveRequestPayment);
router.post('/ride/request/confirm', jwtAuthentification, middlewareV1.ride.confirmPayment);
router.post('/ride/request/cancel', jwtAuthentification, middlewareV1.ride.cancel);
router.post('/ride/rating', jwtAuthentification, middlewareV1.ride.rate);
router.get('/rides/:id', jwtAuthentification, middlewareV1.ride.getDetails);
// Legacy for versions below 15.0.0
router.get('/rides/:id/polyline', jwtAuthentification, middlewareV1.ride.getContext);
router.get('/rides/:id/status', jwtAuthentification, middlewareV1.ride.getContext);
router.get('/rides', jwtAuthentification, middlewareV1.ride.getHistory);
router.get('/current-ride', jwtAuthentification, middlewareV1.ride.getCurrentRide);

router.get('/locations/:id', jwtAuthentification, riderAppVersionCheck, middlewareV1.locations.getLocationById);
router.get('/locations', jwtAuthentification, riderAppVersionCheck, middlewareV1.locations.getLocations);
router.get('/location/:id/payment-information', jwtAuthentification, riderAppVersionCheck, middlewareV1.locations.getPaymentOptions);
router.get('/location/:id/flux', jwtAuthentification, middlewareV1.metrics.getFlux);
router.get('/media', jwtAuthentification, middlewareV1.media.getMedia);

router.get('/global-settings', jwtAuthentification, middlewareV1.settings.getGlobalSetting);
router.get('/address', middlewareV1.addresses.search);
router.post('/report', jwtAuthentification, middlewareV1.report.create);
router.post('/send-email-verification',
  jwtAuthentification,
  middlewareV1.sendEmailVerificationCode);
router.post('/email-verify', jwtAuthentification, middlewareV1.emailVerify);
router.post('/phone-pincode',
  jwtAuthentification,
  RateLimiter.pincodeRateLimiterMiddleware(),
  middlewareV1.phonePincode);
router.post('/phone-verify',
  jwtAuthentification,
  middlewareV1.phoneVerify);
router.post('/logout', middlewareV1.auth.logout);

router.post('/forgot-password', middlewareV1.forgotPassword);
router.post('/forgot-password/verify', middlewareV1.forgotPasswordEmailVerify);

router.post('/notifications', jwtAuthentification, middlewareV1.notifications.subscribePushNotifications);

router.get('/payment-settings', jwtAuthentification, middlewareV1.payment.getPaymentSettings);
router.post('/payment-settings/setup', jwtAuthentification, middlewareV1.payment.setupPaymentMethod);
router.delete('/payment-settings/setup', jwtAuthentification, middlewareV1.payment.removePaymentMethod);
router.get('/quote', jwtAuthentification, middlewareV1.payment.getQuote);
router.post('/promocode', jwtAuthentification, middlewareV1.payment.setupPromocode);
router.delete('/promocode', jwtAuthentification, middlewareV1.payment.removePromocode);

router.get('/fixed-stops', jwtAuthentification, middlewareV1.stops.getFixedStops);
router.get('/stop', jwtAuthentification, middlewareV1.stops.getStop);

router.post('/tip', jwtAuthentification, middlewareV1.tip.createTip);
router.post('/tip/confirm', jwtAuthentification, middlewareV1.tip.confirmTip);
router.post('/tip/cancel', jwtAuthentification, middlewareV1.tip.cancelTip);

export default router;
