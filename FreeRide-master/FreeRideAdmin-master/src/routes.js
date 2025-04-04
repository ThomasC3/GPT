import Pages from './pages';
import { AUTH0_RESOURCE_TYPES, ROUTES } from './utils/constants';

const getRoutePermission = resourceType => `view:${resourceType}`;
const routes = [
  {
    path: '/riders',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.RIDERS),
    component: Pages.Riders,
    icon: 'users',
    text: 'Riders',
    showInNav: true
  },
  {
    path: '/riders/:id',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.RIDERS),
    component: Pages.Rider,
    showInNav: false
  },
  {
    path: '/admins',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.ADMINS),
    component: Pages.Admins,
    icon: 'users-cog',
    text: 'Admins',
    showInNav: true
  },
  {
    path: '/admins/:id',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.ADMINS),
    component: Pages.Admin,
    showInNav: false
  },
  {
    path: '/rides',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.RIDES),
    component: Pages.Rides,
    icon: 'car-side',
    text: 'Rides',
    requiresActiveLocation: true,
    showInNav: true
  },
  {
    path: '/rides/:id',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.RIDES),
    component: Pages.Ride,
    requiresActiveLocation: true,
    showInNav: false
  },
  {
    path: '/activity',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.ACTIVITIES),
    component: Pages.Activity,
    icon: 'map',
    text: 'Activity',
    requiresActiveLocation: true,
    showInNav: true
  },
  {
    path: '/reports',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.REPORTS),
    component: Pages.Reports,
    icon: 'flag',
    text: 'Reports',
    requiresActiveLocation: true,
    showInNav: true
  },
  {
    path: '/reports/:id',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.REPORTS),
    component: Pages.Report,
    requiresActiveLocation: true,
    showInNav: false
  },
  {
    path: '/fleet',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.FLEET),
    component: Pages.Vehicles,
    icon: 'car',
    text: 'Fleet',
    showInNav: true
  },
  {
    path: '/vehicles',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.FLEET),
    component: Pages.Vehicle,
    showInNav: false
  },
  {
    path: '/vehicles/:id',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.FLEET),
    component: Pages.Vehicle,
    showInNav: false
  },
  {
    path: '/vehicle_type',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.FLEET),
    component: Pages.CreateVehicleType,
    showInNav: false
  },
  {
    path: '/vehicle_type/:id',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.FLEET),
    component: Pages.VehicleType,
    showInNav: false
  },
  {
    path: '/drivers',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.DRIVERS),
    component: Pages.Drivers,
    icon: 'id-badge',
    text: 'Drivers',
    showInNav: true
  },
  {
    path: '/drivers/:id',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.DRIVERS),
    component: Pages.Driver,
    showInNav: false
  },
  {
    path: '/settings',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.SETTINGS),
    component: Pages.Settings,
    icon: 'cogs',
    text: 'Global Settings',
    showInNav: true
  },
  {
    path: '/locations',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.LOCATIONS),
    component: Pages.Locations,
    icon: 'globe-americas',
    text: 'Locations',
    showInNav: true
  },
  {
    path: '/location/:id?',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.LOCATIONS),
    component: Pages.Location,
    showInNav: false
  },
  {
    path: ROUTES.ADVERTISERS,
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.ADVERTISEMENTS),
    component: Pages.DigitalAds,
    icon: 'palette',
    text: 'Digital Ads',
    showInNav: true,
    props: { tab: 'advertisers' }
  },
  {
    path: `${ROUTES.ADVERTISERS}/:id`,
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.ADVERTISEMENTS),
    component: Pages.Advertiser,
    showInNav: false
  },
  {
    path: `${ROUTES.CAMPAIGNS}/:id`,
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.ADVERTISEMENTS),
    component: Pages.Campaign,
    showInNav: false
  },
  {
    path: ROUTES.CAMPAIGNS,
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.ADVERTISEMENTS),
    component: Pages.DigitalAds,
    showInNav: false,
    props: { tab: 'campaigns' }
  },
  {
    path: `${ROUTES.MEDIA}/:id`,
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.MEDIA),
    component: Pages.Media,
    showInNav: false
  },
  {
    path: ROUTES.ADVERTISEMENTS,
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.MEDIA),
    component: Pages.DigitalAds,
    showInNav: false,
    props: { tab: 'media' }
  },
  {
    path: '/stats',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.GENERAL_STATS),
    component: Pages.LocationStats,
    icon: 'chart-line',
    text: 'Statistics',
    showInNav: true
  },
  {
    path: '/payment-stats',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.PAYMENT_STATS),
    component: Pages.PaymentStats,
    icon: 'search-dollar',
    text: 'Payment statistics',
    showInNav: true
  },
  {
    path: '/tips',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.TIPS),
    component: Pages.Tips,
    icon: 'hand-holding-usd',
    text: 'Tips',
    showInNav: true
  },
  {
    path: '/inspections',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.INSPECTIONS),
    component: Pages.Inspection,
    icon: 'edit',
    text: 'Inspections',
    showInNav: true
  },
  {
    path: '/jobs/:id',
    exact: true,
    permission: getRoutePermission(AUTH0_RESOURCE_TYPES.JOBS),
    component: Pages.Job,
    showInNav: false
  }
];

export default routes;
