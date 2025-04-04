import express from 'express';
import { bodyParserJson, enableCORS } from '../../../middlewares';

import { v1 as middlewareV1 } from '../../../middlewares/driver';
import { jwtAuthentification } from '../../../services/auth';

require('../../../middlewares/driver/v1/auth');

const router = express.Router();

// Config
router.use(bodyParserJson);
router.use(enableCORS);

router.get('/ping', middlewareV1.ping);
router.post('/login', middlewareV1.auth.login);

router.post('/forgot-password', middlewareV1.forgotPassword);
router.post('/forgot-password/verify', middlewareV1.emailVerify);
router.post('/change-password', jwtAuthentification, middlewareV1.changePassword);
router.put('/driver', jwtAuthentification, middlewareV1.updateDriver);
router.get('/driver', jwtAuthentification, middlewareV1.getDriver);
router.get('/rides/queue', jwtAuthentification, middlewareV1.ride.getQueue);
router.get('/actions', jwtAuthentification, middlewareV1.ride.getActions);
router.get('/rides/:id', jwtAuthentification, middlewareV1.ride.fetch);
router.get('/rides', jwtAuthentification, middlewareV1.ride.getHistory);
router.post('/ride/hail', jwtAuthentification, middlewareV1.ride.hail);
router.put('/ride/:id/cancel', jwtAuthentification, middlewareV1.ride.cancelRide);
router.put('/ride/:id/complete', jwtAuthentification, middlewareV1.ride.completeRide);
router.put('/ride/:id/arrive', jwtAuthentification, middlewareV1.ride.driverArrived);
router.put('/ride/:id/pickup', jwtAuthentification, middlewareV1.ride.pickUpRide);
router.put('/fixed-stops/:id/complete', jwtAuthentification, middlewareV1.ride.completeFixedStopRides);
router.put('/fixed-stops/:id/cancel', jwtAuthentification, middlewareV1.ride.cancelFixedStopRides);
router.put('/fixed-stops/:id/arrive', jwtAuthentification, middlewareV1.ride.driverArrivedFixedStops);
router.put('/fixed-stops/:id/pickup', jwtAuthentification, middlewareV1.ride.pickUpFixedStops);
router.post('/ride/rating', jwtAuthentification, middlewareV1.ride.rate);
router.put('/ride/:id', jwtAuthentification, middlewareV1.ride.update);
router.get('/driver/status', jwtAuthentification, middlewareV1.getStatus);
router.post('/driver/status', jwtAuthentification, middlewareV1.updateStatus);
router.put('/driver/location', jwtAuthentification, middlewareV1.setLocation);

router.get('/locations', jwtAuthentification, middlewareV1.locations.getLocations);
router.get('/locations/:id', jwtAuthentification, middlewareV1.locations.getLocationById);
router.get('/global-settings', jwtAuthentification, middlewareV1.settings.getGlobalSetting);
router.post('/report', jwtAuthentification, middlewareV1.report.create);
router.post('/logout', middlewareV1.auth.logout);
router.get('/driver/tips', jwtAuthentification, middlewareV1.tip.getTips);

// Vehicle
router.get('/vehicle/:id/check-out', jwtAuthentification, middlewareV1.vehicle.getCheckOutForm);
router.post('/vehicle/:id/check-out', jwtAuthentification, middlewareV1.vehicle.checkOut);
router.get('/vehicle/check-in', jwtAuthentification, middlewareV1.vehicle.getCheckInForm);
router.post('/vehicle/check-in', jwtAuthentification, middlewareV1.vehicle.checkIn);
router.get('/vehicles', jwtAuthentification, middlewareV1.vehicle.getVehicles);

router.post('/notifications', jwtAuthentification, middlewareV1.notifications.subscribePushNotifications);

// Drivers
router.get('/drivers/logged-in', jwtAuthentification, middlewareV1.getLoggedInDrivers);
router.get('/drivers/logged-out', jwtAuthentification, middlewareV1.getLoggedOutDrivers);

export default router;
