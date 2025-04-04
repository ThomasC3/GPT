import fs from 'fs';

import path from 'path';
import { decrypt } from './utils/decrypt';

const env = process.env.npm_config_env || process.env.NODE_ENV || 'local';

if (!global.gconfig) {
  console.log(`Going to load config file for ${env}!`);

  // Babel puts all code in a build/ folder inside project root
  // global.basedir will be the true root directory to fetch static files
  // eg: email templates, unsubscribe html response
  const envRequiringBuild = ['development', 'stage', 'production'];
  if (envRequiringBuild.includes(env)) {
    global.basedir = path.join(__dirname, '..');
  } else {
    global.basedir = __dirname;
  }

  try {
    decrypt();

    const configFile = fs.readFileSync(`./config_files/${env}_config.json`);
    global.gconfig = JSON.parse(configFile);
  } catch (error) {
    console.log(error);
    throw new Error('Error loading config file');
  }
}

const {
  port, domain, redis, mongodb,
  session, auth, google, twilio,
  aws, facebook, sentry, lambda,
  logger, stripe, metrics, sendgrid, auth0,
  intercom
} = global.gconfig;

export {
  port, domain, redis, mongodb,
  session, auth, google, twilio,
  aws, facebook, sentry, lambda,
  logger, env, stripe, metrics, sendgrid, auth0,
  intercom
};

export default global.gconfig;
