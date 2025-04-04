module.exports = {
  apps: [{
    name: `The Free Ride CronJob`,
    script: `./build/cronjobs.js`,
    append_env_to_name: true,
    log_date_format: `YYYY-MM-DD HH:mm Z`,
    env: {
      NODE_ENV: `development`,
    },
    env_stage: {
      NODE_ENV: `stage`,
    },
    env_production: {
      NODE_ENV: `production`,
    },
  }]
};
