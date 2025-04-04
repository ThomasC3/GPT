module.exports = {
  apps: [{
    name: 'The Free Ride Cronjob',
    script: './build/cronjobs.js',
    cwd: '../../current',
    append_env_to_name: true,
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    env: {
      NODE_ENV: 'development',
      APP_MODE: 'Cron',
      LOCATION_WORKING_SET: 'ws_0'
    },
    env_stage: {
      NODE_ENV: 'stage',
      APP_MODE: 'Cron',
      LOCATION_WORKING_SET: 'ws_0'
    },
    env_production: {
      NODE_ENV: 'production',
      APP_MODE: 'Cron',
      LOCATION_WORKING_SET: 'ws_0'
    }
  }]
};
