import { domain } from '../config';

import Admin from './admin';
import Driver from './driver';
import Rider from './rider';

import logger from '../logger';

const virtualHosts = (req, res, next) => {
  let middleware = null;
  const {
    admin, driver, rider
  } = domain;

  const host = req.headers.host.split(':')[0];

  switch (host) {
  case admin:
    middleware = Admin(req, res, next);
    break;
  case driver:
    middleware = Driver(req, res, next);
    break;
  case rider:
    middleware = Rider(req, res, next);
    break;
  default:
    logger.error(`unauthorized request from ${host}`);
    break;
  }

  if (middleware) return middleware;
  return next;
};

export default virtualHosts;
