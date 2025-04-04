module.exports = {
  apps: [{
    name: 'The Free Ride',
    script: './build/server.js',
    cwd: '../../current',
    append_env_to_name: true,
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    exec_mode: 'cluster',
    instances: 'max',
    env: {
      NODE_ENV: 'development',
      APP_MODE: 'AdminBackend'
    },
    env_stage: {
      NODE_ENV: 'stage',
      APP_MODE: 'AdminBackend'
    },
    env_production: {
      NODE_ENV: 'production',
      APP_MODE: 'AdminBackend'
    }
  }]
};
