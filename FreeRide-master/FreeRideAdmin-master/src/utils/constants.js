import moment from 'moment-timezone';

export const PAYMENT_STATUS_TAG_CONFIG = {
  requires_payment_method: {
    text: 'Requires Payment Method',
    color: 'red'
  },
  requires_confirmation: {
    text: 'Pending Confirmation',
    color: 'yellow'
  },
  requires_action: {
    text: 'Requires Action',
    color: 'red'
  },
  processing: {
    text: 'Processing',
    color: 'yellow'
  },
  succeeded: {
    text: 'Captured',
    color: 'green'
  },
  requires_capture: {
    text: 'Pending Capture',
    color: 'cyan'
  },
  canceled: {
    text: 'Cancelled',
    color: 'red'
  },
  refunded: {
    text: 'Refunded',
    color: 'purple'
  }
};

export const PAYMENT_STATUS_TAG_DEFAULT_CONFIG = {
  text: 'Unknown status',
  color: 'grey'
};

export const paymentStatusFilter = () => Object.keys(PAYMENT_STATUS_TAG_CONFIG)
  .map(item => ({ value: item, name: PAYMENT_STATUS_TAG_CONFIG[item].text }));

export const paymentStatusLesserFilter = () => ['requires_confirmation', 'succeeded', 'canceled', 'refunded']
  .map(item => ({ value: item, name: PAYMENT_STATUS_TAG_CONFIG[item].text }));

export const RANGES = {
  'Last Hour': [moment().startOf('hour'), moment().endOf('hour')],
  Today: [moment().startOf('day'), moment().endOf('day')],
  'Last 12 Hours': [moment().subtract('12', 'hour'), moment()],
  Yesterday: [moment().subtract('1', 'day').startOf('day'), moment().subtract('1', 'day').endOf('day')],
  'Last 2 days': [moment().subtract('1', 'day').startOf('day'), moment().endOf('day')],
  'This Week': [moment().startOf('week'), moment().endOf('week')],
  'This Month': [moment().startOf('month'), moment().endOf('month')],
  'Last Month': [
    moment().startOf('month').subtract('1', 'day').startOf('month'),
    moment().startOf('month').subtract('1', 'day').endOf('month')
  ],
  'This Year': [moment().startOf('year'), moment().endOf('year')]
};

export const RANGES_SIMPLE = {
  'Last Hour': RANGES['Last Hour'],
  Today: RANGES.Today,
  'Last 12 Hours': RANGES['Last 12 Hours'],
  'Last 2 days': RANGES['Last 2 days'],
  'This Week': RANGES['This Week'],
  'This Month': RANGES['This Month']
};

export const RANGES_EXTENDED = {
  'Last Hour': RANGES['Last Hour'],
  Yesterday: RANGES.Yesterday,
  Today: RANGES.Today,
  'This Week': RANGES['This Week'],
  'This Month': RANGES['This Month'],
  'Last Month': RANGES['Last Month'],
  'This Year': RANGES['This Year']
};

export const AUTH0_RESOURCE_TYPES = {
  INSPECTIONS: 'inspections',
  RIDES: 'rides',
  FLEET: 'fleet',
  DRIVERS: 'drivers',
  RIDERS: 'riders',
  ADMINS: 'admins',
  LOCATIONS: 'locations',
  JOBS: 'jobs',
  REPORTS: 'reports',
  TIPS: 'tips',
  PAYMENT_STATS: 'payment-stats',
  GENERAL_STATS: 'stats',
  SETTINGS: 'global-settings',
  ACTIVITIES: 'activities',
  ADVERTISEMENTS: 'ads',
  MEDIA: 'media'
};

export const ENDPOINTS = {
  ADVERTISERS: '/v1/digital-ads/advertisers',
  CAMPAIGNS: '/v1/digital-ads/campaigns',
  MEDIA: '/v1/media',
  MEDIA_UPLOAD: mediaId => `/v1/media/${mediaId}/upload`
};

export const ROUTES = {
  DIGITAL_ADS: '/digital-ads',
  ADVERTISERS: '/digital-ads/advertisers',
  CAMPAIGNS: '/digital-ads/campaigns',
  ADVERTISEMENTS: '/digital-ads/media',
  MEDIA: '/media'
};

export const MEDIA_TYPES = {
  ADVERTISEMENT: 'ADVERTISEMENT'
};

export const TIMEZONES = [
  { name: 'America/New_York', value: 'America/New_York' },
  { name: 'America/Chicago', value: 'America/Chicago' },
  { name: 'America/Denver', value: 'America/Denver' },
  { name: 'America/Phoenix', value: 'America/Phoenix' },
  { name: 'America/Los_Angeles', value: 'America/Los_Angeles' },
  { name: 'America/Anchorage', value: 'America/Anchorage' },
  { name: 'America/Adak', value: 'America/Adak' },
  { name: 'Pacific/Honolulu', value: 'Pacific/Honolulu' }
];

export default {
  PAYMENT_STATUS_TAG_CONFIG,
  PAYMENT_STATUS_TAG_DEFAULT_CONFIG,
  paymentStatusFilter,
  paymentStatusLesserFilter,
  RANGES,
  RANGES_SIMPLE,
  RANGES_EXTENDED,
  ENDPOINTS,
  ROUTES
};
