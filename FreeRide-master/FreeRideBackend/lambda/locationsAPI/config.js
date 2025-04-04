import mongoose  from 'mongoose';

const env = process.env.npm_config_env || process.env.NODE_ENV || 'local';
const clusterHost = process.env.CLUSTER_HOST;
const replicaSet = process.env.REPLICA_SET;
const db = process.env.DB;
const user = process.env.USER;
const encoded_password = encodeURIComponent(process.env.PASSWORD);
const authSource = process.env.AUTH_SOURCE;
const debug = process.env.DEBUG;
const sentry_dsn = process.env.SENTRY_DSN;

let url = '';
const config = {
  authSource: !['local', 'test', 'docker', 'test_docker'].includes(env) ? authSource : undefined
};

if (['local', 'test', 'docker', 'test_docker'].includes(env)) {
  url = `mongodb://${host}:${port}/${db}`;
} else if (clusterHost) {
  url = `mongodb://${user}:${encoded_password}@${clusterHost}/${db}`;
  config.replicaSet = replicaSet;
  config.w = 'majority';
  config.ssl = true;
} else {
  url = `mongodb://${user}:${encoded_password}@${host}:${port}/${db}`;
}
mongoose.set('debug', debug);
mongoose.set('strictQuery', false);

export { url, config, sentry_dsn };
