import { lazy } from 'react';
import { withSuspense } from '../components';

const LazyHome = lazy(() => import('./Home'));
const LazyRider = lazy(() => import('./Rider'));
const LazyRiders = lazy(() => import('./Riders'));

const LazyAdmin = lazy(() => import('./Admin'));
const LazyAdmins = lazy(() => import('./Admins'));

const LazyDriver = lazy(() => import('./Driver'));
const LazyDrivers = lazy(() => import('./Drivers'));

const LazyLocation = lazy(() => import('./Location'));
const LazyLocations = lazy(() => import('./Locations'));

const LazyRide = lazy(() => import('./Ride'));
const LazyRides = lazy(() => import('./Rides'));

const LazySettings = lazy(() => import('./Settings'));
const LazyProfilePage = lazy(() => import('./Profile'));
const LazyActivity = lazy(() => import('./Activity'));
const LazyLocationStats = lazy(() => import('./LocationStats'));
const LazyPaymentStats = lazy(() => import('./PaymentStats'));
const LazyTips = lazy(() => import('./Tips'));
const LazyInspection = lazy(() => import('./Inspection'));

const LazyReports = lazy(() => import('./Reports'));
const LazyReport = lazy(() => import('./Report'));

const LazyLogin = lazy(() => import('./Login'));

const LazyVehicles = lazy(() => import('./Vehicles'));
const LazyVehicle = lazy(() => import('./Vehicle'));
const LazyJob = lazy(() => import('./Job'));
const LazyCreateVehicleType = lazy(() => import('./CreateVehicleType'));
const LazyVehicleType = lazy(() => import('./VehicleType'));

const LazyDigitalAds = lazy(() => import('./DigitalAds'));
const LazyAdvertiser = lazy(() => import('./Advertiser'));
const LazyCampaign = lazy(() => import('./Campaign'));
const LazyMedia = lazy(() => import('./Media'));

const LazyForgotPassword = lazy(() => import('./ForgotPassword'));

export default {
  Home: withSuspense(LazyHome),
  Activity: withSuspense(LazyActivity),
  Admins: withSuspense(LazyAdmins),
  Admin: withSuspense(LazyAdmin),
  Drivers: withSuspense(LazyDrivers),
  Driver: withSuspense(LazyDriver),
  Riders: withSuspense(LazyRiders),
  Rider: withSuspense(LazyRider),
  Settings: withSuspense(LazySettings),
  Location: withSuspense(LazyLocation),
  Locations: withSuspense(LazyLocations),
  Ride: withSuspense(LazyRide),
  Rides: withSuspense(LazyRides),
  Profile: withSuspense(LazyProfilePage),
  Login: withSuspense(LazyLogin),
  Reports: withSuspense(LazyReports),
  Report: withSuspense(LazyReport),
  LocationStats: withSuspense(LazyLocationStats),
  PaymentStats: withSuspense(LazyPaymentStats),
  Tips: withSuspense(LazyTips),
  Vehicles: withSuspense(LazyVehicles),
  Vehicle: withSuspense(LazyVehicle),
  Job: withSuspense(LazyJob),
  VehicleType: withSuspense(LazyVehicleType),
  Inspection: withSuspense(LazyInspection),
  CreateVehicleType: withSuspense(LazyCreateVehicleType),
  ForgotPassword: withSuspense(LazyForgotPassword),
  DigitalAds: withSuspense(LazyDigitalAds),
  Advertiser: withSuspense(LazyAdvertiser),
  Campaign: withSuspense(LazyCampaign),
  Media: withSuspense(LazyMedia)
};
