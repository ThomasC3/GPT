/* eslint-disable camelcase */
import mongoose from 'mongoose';
import { mongodb, env } from '../config';

import logger from '../logger';

const {
  user, password, host, port, db, debug, authSource, cluster_host, replicaSet
} = mongodb;

const encoded_password = encodeURIComponent(password);

let url = '';
const options = {
  authSource: !['local', 'test', 'docker', 'test_docker'].includes(env) ? authSource : undefined
};

if (['local', 'test', 'docker', 'test_docker'].includes(env)) {
  url = `mongodb://${host}:${port}/${db}`;
  logger.info(`\nConnecting to MongoDB:\n\t- db: "${db}"\n\t- host: "${host}"\n\t- no user`);
} else if (cluster_host) {
  url = `mongodb://${user}:${encoded_password}@${cluster_host}/${db}`;
  options.replicaSet = replicaSet;
  options.w = 'majority';
  options.ssl = true;

  logger.info(`\nConnecting to MongoDB:\n\t- db: "${db}"\n\t- host: "${cluster_host}"\n\t- user: "${user}"`);
} else {
  url = `mongodb://${user}:${encoded_password}@${host}:${port}/${db}`;
  logger.info(`\nConnecting to MongoDB:\n\t- db: "${db}"\n\t- host: "${host}"\n\t- user: "${user}"`);
}

logger.info('\nConnecting to MongoDB with following options:\n', options);

mongoose.set('debug', debug);

mongoose.connect(url, options);

mongoose.connection.on('connected', () => {
  logger.info('Connected to MongoDB');
});

mongoose.connection.on('error', (error) => {
  if (['test', 'test_docker'].includes(env)) {
    mongoose.connect(url, options);
  }
  logger.info(`Connection to MongoDB failed: ${error.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.info('Disconnected from MongoDB');
});

mongoose.connection.on('close', () => {
  logger.info('MongoDB connection closed');
});

export default mongoose;
