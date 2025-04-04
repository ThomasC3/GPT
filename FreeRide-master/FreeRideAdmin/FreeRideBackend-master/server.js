/* eslint-disable import/first */
// eslint-disable-next-line no-unused-vars
import datadog from './datadog';

import { port, env } from './config';
import app from './app';
import websocket from './services/websocket';
import logger from './logger';

const server = app.listen(port);

websocket.init(server);

logger.info(`App running on port ${port} in ${env}`);

module.exports = app;
