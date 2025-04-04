import express from 'express';
import { auth, claimIncludes } from 'express-oauth2-jwt-bearer';
import jwt from 'jsonwebtoken';
import { bodyParserJson, enableCORS } from '../../../middlewares';
import { v1 as middlewareV1 } from '../../../middlewares/admin';
import { auth0 as auth0Config, auth as authConfig } from '../../../config';
import ForbiddenError from '../../../errors/ForbiddenError';
import adminErrorCatchHandler from '../../../middlewares/admin/utils/adminErrorCatchHandler';

const router = express.Router();

export const authRequiredPermissions = permissions => (req, res, next) => {
  try {
    claimIncludes('permissions', ...permissions)(req, res, (err) => {
      if (err) throw err;
    });
    next();
  } catch (error) {
    adminErrorCatchHandler(res, new ForbiddenError(), req);
  }
};

const jwtCheck = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test_docker'
  ? (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    try {
      const decoded = jwt.verify(token, authConfig.secret);
      req.auth = { payload: decoded };
      return next();
    } catch (error) {
      return res.status(401).json({ message: error.message || 'Invalid token' });
    }
  }
  : auth({
    audience: auth0Config.apiAudience,
    issuerBaseURL: auth0Config.domain,
    tokenSigningAlg: 'RS256'
  });

const attachUser = (req, res, next) => {
  if (req.auth && req.auth.payload) {
    const { payload } = req.auth;
    const namespaceData = payload[auth0Config.claimNamespace];
    req.user = {
      permissions: payload.permissions,
      id: namespaceData.user_id,
      name: namespaceData.name,
      locations: namespaceData.app_metadata?.locations || [],
      ...namespaceData.app_metadata
    };
  }
  next();
};

// Config
router.use(bodyParserJson);
router.use(enableCORS);

// - - - - - #STRIPE-WEBHOOK - - - - -
router.post('/payments/webhook', middlewareV1.webhooks.paymentEvents);

router.use(jwtCheck);
router.use(attachUser);

router.get('/admin', middlewareV1.getAdmin);

router.get('/sendTestEmail', middlewareV1.sendTestEmail);

router.post('/sendTestMobileNotification', middlewareV1.sendTestMobileNotification);

// - - - - - #DIGITAL ADS - - - - -
router.get('/digital-ads/advertisers', authRequiredPermissions(['view:ads']), middlewareV1.digitalAds.getAdvertisers);
router.get('/digital-ads/advertisers/:id', authRequiredPermissions(['view:ads']), middlewareV1.digitalAds.getAdvertiser);
router.post('/digital-ads/advertisers', authRequiredPermissions(['create:ads']), middlewareV1.digitalAds.createAdvertiser);
router.put('/digital-ads/advertisers/:id', authRequiredPermissions(['update:ads']), middlewareV1.digitalAds.updateAdvertiser);
router.delete('/digital-ads/advertisers/:id', authRequiredPermissions(['delete:ads']), middlewareV1.digitalAds.deleteAdvertiser);

router.get('/digital-ads/campaigns', authRequiredPermissions(['view:ads']), middlewareV1.digitalAds.getCampaigns);
router.get('/digital-ads/campaigns/:id', authRequiredPermissions(['view:ads']), middlewareV1.digitalAds.getCampaign);
router.post('/digital-ads/campaigns', authRequiredPermissions(['create:ads']), middlewareV1.digitalAds.createCampaign);
router.put('/digital-ads/campaigns/:id', authRequiredPermissions(['update:ads']), middlewareV1.digitalAds.updateCampaign);
router.delete('/digital-ads/campaigns/:id', authRequiredPermissions(['delete:ads']), middlewareV1.digitalAds.deleteCampaign);

// - - - - - #MEDIA - - - - -
router.get('/media', authRequiredPermissions(['view:media']), middlewareV1.media.getMediaList);
router.get('/media/:id', authRequiredPermissions(['view:media']), middlewareV1.media.getMedia);
router.post('/media', authRequiredPermissions(['create:media']), middlewareV1.media.createMedia);
router.put('/media/:id', authRequiredPermissions(['update:media']), middlewareV1.media.updateMedia);
router.post('/media/:id/upload', authRequiredPermissions(['update:media']), middlewareV1.media.upload);
router.delete('/media/:id', authRequiredPermissions(['delete:media']), middlewareV1.media.deleteMedia);

// - - - - - #LOCATIONS - - - - -
router.get('/locations', authRequiredPermissions(['view:locations']), middlewareV1.locations.getLocations);
router.get('/locations/:id', authRequiredPermissions(['view:locations']), middlewareV1.locations.getLocation);
router.post('/locations', authRequiredPermissions(['create:locations']), middlewareV1.locations.createLocation);
router.put('/locations/:id', authRequiredPermissions(['update:locations']), middlewareV1.locations.updateLocation);
router.get('/locations/:id/fixed-stops', authRequiredPermissions(['view:locations']), middlewareV1.fixedStops.getFixedStops);
router.get('/locations/:id/zones', authRequiredPermissions(['view:locations']), middlewareV1.locations.getZones);
router.post('/locations/:id/zones', authRequiredPermissions(['update:locations']), middlewareV1.locations.createZone);
router.put('/locations/:id/zones/:zoneId', authRequiredPermissions(['update:locations']), middlewareV1.locations.updateZone);
router.delete('/locations/:id/zones/:zoneId', authRequiredPermissions(['update:locations']), middlewareV1.locations.deleteZone);
router.post('/locations/:id/payment-policies', authRequiredPermissions(['update:locations']), middlewareV1.locations.updateLocationPaymentPolicies);
router.get('/locations/:id/payment-policies', authRequiredPermissions(['update:locations']), middlewareV1.locations.getLocationPaymentPolicies);

// - - - - - #FIXED STOPS - - - - -
router.post('/fixed-stops', authRequiredPermissions(['update:locations']), middlewareV1.fixedStops.createFixedStop);
router.put('/fixed-stops/:id', authRequiredPermissions(['update:locations']), middlewareV1.fixedStops.updateFixedStop);
router.delete('/fixed-stops/:id', authRequiredPermissions(['update:locations']), middlewareV1.fixedStops.deleteFixedStop);

// - - - - - #PROMOCODES - - - - -
router.get('/promocodes', authRequiredPermissions(['update:locations']), middlewareV1.promocodes.getPromocodes);
router.get('/promocodes/:id', authRequiredPermissions(['update:locations']), middlewareV1.promocodes.getPromocode);
router.post('/promocodes', authRequiredPermissions(['update:locations']), middlewareV1.promocodes.createPromocode);
router.put('/promocodes/:id', authRequiredPermissions(['update:locations']), middlewareV1.promocodes.updatePromocode);

// - - - - - #GLOBAL SETTINGS - - - - -
router.get('/global-settings', authRequiredPermissions(['view:global-settings']), middlewareV1.settings.getSettings);
router.put('/global-settings', authRequiredPermissions(['update:global-settings']), middlewareV1.settings.updateSettings);

// - - - - - #ADMINS - - - - -
router.get('/admins', authRequiredPermissions(['view:admins']), middlewareV1.getAdmins);
router.get('/admins/:id', authRequiredPermissions(['view:admins']), middlewareV1.getAdminById);
router.post('/admins', authRequiredPermissions(['create:admins']), middlewareV1.addAdmin);
router.put('/admins/:id', authRequiredPermissions(['update:admins']), middlewareV1.updateAdminById);
router.get('/roles', authRequiredPermissions(['view:roles']), middlewareV1.getRoles);
router.put('/admins/:id/password', authRequiredPermissions(['update:admins']), middlewareV1.changeAdminPassword);

// - - - - - #RIDERS - - - - -
router.get('/riders', authRequiredPermissions(['view:riders']), middlewareV1.riders.getRiders);
router.get('/riders/:id', authRequiredPermissions(['view:riders']), middlewareV1.riders.getRider);
router.put('/riders/:id', authRequiredPermissions(['update:riders']), middlewareV1.riders.updateRider);
router.delete('/riders/:id', authRequiredPermissions(['delete:riders']), middlewareV1.riders.deleteRider);
router.get('/csvriders', authRequiredPermissions(['view:riders']), middlewareV1.riders.getCsvRiders);

// - - - - - #RIDES - - - - -
router.get('/csvrides', authRequiredPermissions(['view:rides']), middlewareV1.rides.getCsvRides);
router.get('/csvfeedback', authRequiredPermissions(['view:rides']), middlewareV1.rides.getCsvRideFeedback);
router.get('/rides', authRequiredPermissions(['view:rides']), middlewareV1.rides.getRides);
router.get('/rides/:id', authRequiredPermissions(['view:rides']), middlewareV1.rides.getRide);
router.get('/rides/:id/polyline', authRequiredPermissions(['view:rides']), middlewareV1.rides.getPolyline);
router.put('/rides/:id/complete', authRequiredPermissions(['update:rides']), middlewareV1.rides.completeRide);
router.put('/rides/:id/cancel', authRequiredPermissions(['update:rides']), middlewareV1.rides.cancelRide);

// - - - - - #REQUESTS #LIVE/HEATMAP - - - - -
router.get('/csvrequests', authRequiredPermissions(['view:rides']), middlewareV1.requests.getCsvRequests);
router.get('/requests', authRequiredPermissions(['view:rides']), middlewareV1.requests.getRequests);
router.get('/requests/:id', authRequiredPermissions(['view:rides']), middlewareV1.requests.getRequest);
router.post('/requests/clearZombies', authRequiredPermissions(['update:rides']), middlewareV1.requests.cleanZombieRequests);
router.get('/zombies', authRequiredPermissions(['view:activities']), middlewareV1.requests.getZombieRequests);

// - - - - - #ANALYTICS #LIVE/HEATMAP - - - - -
router.get('/analytics', authRequiredPermissions(['view:activities']), middlewareV1.analytics.getRides);

router.get('/dashboard/requests', authRequiredPermissions(['view:activities']), middlewareV1.dashboard.getRequests);
router.get('/dashboard/requests/:id', authRequiredPermissions(['view:activities']), middlewareV1.dashboard.getRequest);
router.get('/dashboard/drivers', authRequiredPermissions(['view:activities']), middlewareV1.dashboard.getDrivers);
router.get('/dashboard/rides', authRequiredPermissions(['view:activities']), middlewareV1.dashboard.getRides);
router.get('/dashboard/rides/:id', authRequiredPermissions(['view:activities']), middlewareV1.dashboard.getRide);

// - - - - - #METRICS #LIVE - - - - -
router.get('/metrics', authRequiredPermissions(['view:activities']), middlewareV1.metrics.getMetric);
router.get('/metrics/chart', authRequiredPermissions(['view:activities']), middlewareV1.metrics.getChart);

// - - - - - #DRIVERS - - - - -
router.get('/drivers', authRequiredPermissions(['view:drivers']), middlewareV1.drivers.getDrivers);
router.get('/drivers/:id', authRequiredPermissions(['view:drivers']), middlewareV1.drivers.getDriver);
router.post('/drivers', authRequiredPermissions(['create:drivers']), middlewareV1.drivers.addDriver);
router.put('/drivers/:id', authRequiredPermissions(['update:drivers']), middlewareV1.drivers.updateDriver);
router.delete('/drivers/:id', authRequiredPermissions(['delete:drivers']), middlewareV1.drivers.deleteDriver);
router.post('/drivers/:id/picture', authRequiredPermissions(['update:drivers']), middlewareV1.drivers.uploadProfilePicture);
router.delete('/drivers/:id/picture', authRequiredPermissions(['update:drivers']), middlewareV1.drivers.removeProfilePicture);
router.get('/drivers/:id/fixroute', authRequiredPermissions(['update:drivers']), middlewareV1.drivers.getFixRoute);
router.get('/drivers/:id/resetroute', authRequiredPermissions(['view:drivers']), middlewareV1.drivers.getResetRoute);
router.post('/drivers/:id/vehicle/detach', authRequiredPermissions(['update:drivers']), middlewareV1.drivers.detachVehicle);

// - - - - - #REPORTS - - - - -
router.get('/reports', authRequiredPermissions(['view:reports']), middlewareV1.reports.getReports);
router.get('/reports/:id', authRequiredPermissions(['view:reports']), middlewareV1.reports.getReport);
router.post('/reports', authRequiredPermissions(['create:reports']), middlewareV1.reports.createReport);
router.post('/reports/signS3', authRequiredPermissions(['create:reports']), middlewareV1.reports.signS3);
router.post('/reports/:id/docs', authRequiredPermissions(['create:reports']), middlewareV1.reports.createDoc);
router.put('/reports/:id', authRequiredPermissions(['update:reports']), middlewareV1.reports.updateReport);
router.delete('/reports/:id', authRequiredPermissions(['delete:reports']), middlewareV1.reports.deleteReport);

// - - - - - #STATS - - - - -
router.get('/stats/wait-times', authRequiredPermissions(['view:stats']), middlewareV1.stats.getWaitTimes);
router.get('/stats/riders', authRequiredPermissions(['view:stats']), middlewareV1.stats.getRiderStats);
router.get('/stats/rides', authRequiredPermissions(['view:stats']), middlewareV1.stats.getRideStats);
router.get('/stats/rating', authRequiredPermissions(['view:stats']), middlewareV1.stats.getRatingStats);
router.get('/stats/miles', authRequiredPermissions(['view:stats']), middlewareV1.stats.getMileStats);
router.get('/stats/experience', authRequiredPermissions(['view:stats']), middlewareV1.stats.getExperienceStats);
router.get('/stats/pooling', authRequiredPermissions(['view:stats']), middlewareV1.stats.getPoolingStats);
router.get('/stats/payment', authRequiredPermissions(['view:payment-stats']), middlewareV1.paymentStats.getPaymentStats);
router.get('/stats/promocode', authRequiredPermissions(['view:payment-stats']), middlewareV1.paymentStats.getPromocodeStats);
router.get('/stats/tips', authRequiredPermissions(['view:payment-stats']), middlewareV1.paymentStats.getTipStats);
router.get('/stats/driver-hours', authRequiredPermissions(['view:stats']), middlewareV1.eventStats.getDriverHourStats);
router.get('/stats/vehicles', authRequiredPermissions(['view:stats']), middlewareV1.eventStats.getVehicleStats);

// - - - - - #EVENTS - - - - -
router.get('/events', authRequiredPermissions(['view:drivers']), middlewareV1.events.getEvents);
router.get('/events/login-hours', authRequiredPermissions(['view:drivers']), middlewareV1.events.getLoginHours);
router.get('/events/available-hours', authRequiredPermissions(['view:drivers']), middlewareV1.events.getAvailableHours);

// - - - - - #TIPS - - - - -
router.get('/tips', authRequiredPermissions(['view:tips']), middlewareV1.tips.getTips);
router.get('/csvtips', authRequiredPermissions(['view:tips']), middlewareV1.tips.getCsvTips);

// - - - - - #VEHICLE TYPE - - - - -
router.get('/vehicles/types', authRequiredPermissions(['view:fleet']), middlewareV1.vehicleTypes.getVehicleTypes);
router.get('/vehicles/types/:id', authRequiredPermissions(['view:fleet']), middlewareV1.vehicleTypes.getVehicleType);
router.post('/vehicles/types', authRequiredPermissions(['create:fleet']), middlewareV1.vehicleTypes.createVehicleType);
router.put('/vehicles/types/:id', authRequiredPermissions(['update:fleet']), middlewareV1.vehicleTypes.updateVehicleType);
router.delete('/vehicles/types/:id', authRequiredPermissions(['delete:fleet']), middlewareV1.vehicleTypes.deleteVehicleType);

// - - - - - #VEHICLE - - - - -
router.get('/vehicles', authRequiredPermissions(['view:fleet']), middlewareV1.vehicles.getVehicles);
router.get('/vehicles/:id', authRequiredPermissions(['view:fleet']), middlewareV1.vehicles.getVehicle);
router.post('/vehicles', authRequiredPermissions(['create:fleet']), middlewareV1.vehicles.createVehicle);
router.put('/vehicles/:id', authRequiredPermissions(['update:fleet']), middlewareV1.vehicles.updateVehicle);
router.delete('/vehicles/:id', authRequiredPermissions(['delete:fleet']), middlewareV1.vehicles.deleteVehicle);
router.post('/vehicles/:id/inspection', authRequiredPermissions(['update:fleet']), middlewareV1.vehicles.vehicleInspection);
router.get('/vehicles/:id/stats', authRequiredPermissions(['view:fleet']), middlewareV1.vehicles.getVehicleStats);

// - - - - - #VEHICLE JOB IDS - - - - -
router.get('/jobs', authRequiredPermissions(['view:jobs']), middlewareV1.jobs.getJobs);
router.post('/jobs', authRequiredPermissions(['create:jobs']), middlewareV1.jobs.createJob);
router.get('/jobs/:id', authRequiredPermissions(['view:jobs']), middlewareV1.jobs.getJob);
router.put('/jobs/:id', authRequiredPermissions(['update:jobs']), middlewareV1.jobs.updateJob);
router.delete('/jobs/:id', authRequiredPermissions(['delete:jobs']), middlewareV1.jobs.removeJob);

// - - - - - #INSPECTION - - - - -
router.get('/questions', authRequiredPermissions(['view:inspections']), middlewareV1.inspections.getQuestions);
router.get('/questions/:id', authRequiredPermissions(['view:inspections']), middlewareV1.inspections.getQuestion);
router.put('/questions/:id', authRequiredPermissions(['update:inspections']), middlewareV1.inspections.updateQuestion);
router.post('/questions', authRequiredPermissions(['create:inspections']), middlewareV1.inspections.createQuestion);
router.delete('/questions/:id', authRequiredPermissions(['delete:inspections']), middlewareV1.inspections.deleteQuestion);

router.get('/inspection-forms', authRequiredPermissions(['view:inspections']), middlewareV1.inspections.getInspectionForms);
router.get('/inspection-forms/:id', authRequiredPermissions(['view:inspections']), middlewareV1.inspections.getInspectionForm);
router.put('/inspection-forms/:id', authRequiredPermissions(['update:inspections']), middlewareV1.inspections.updateInspectionForm);
router.post('/inspection-forms', authRequiredPermissions(['create:inspections']), middlewareV1.inspections.createInspectionForm);
router.delete('/inspection-forms/:id', authRequiredPermissions(['delete:inspections']), middlewareV1.inspections.deleteInspectionForm);

// - - - - - #MATCHING RULES - - - - -
router.get('/matching-rules', authRequiredPermissions(['view:fleet']), middlewareV1.matchingRules.getMatchingRules);
router.get('/matching-rules/:id', authRequiredPermissions(['view:fleet']), middlewareV1.matchingRules.getMatchingRule);

export default router;
