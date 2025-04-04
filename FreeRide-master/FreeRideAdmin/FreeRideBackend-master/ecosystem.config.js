module.exports = {
  apps: [{
    name: `The Free Ride`,
    script: `./build/server.js`,
    append_env_to_name: true,
    log_date_format: `YYYY-MM-DD HH:mm Z`,
    exec_mode: `cluster`,
    instances: `max`,
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
