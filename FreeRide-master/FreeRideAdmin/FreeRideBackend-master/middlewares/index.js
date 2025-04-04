import store from 'connect-mongo';
import express from 'express';
import expressSession from 'express-session';

import { session } from '../config';
import { mongodb } from '../services';

export const bodyParserJson = express.json({
  inflate: true,
  type: 'application/json',
  limit: '100mb',
  // verify due to issue: https://github.com/stripe/stripe-node/issues/341#issuecomment-304733080
  verify(req, res, buf) {
    const url = req.originalUrl;
    if (url.endsWith('/payments/webhook')) {
      req.rawBody = buf.toString();
    }
  }
});

export const bodyParser = express.urlencoded({ extended: true });

export const sessions = expressSession({
  name: session.name,
  secret: session.secret,
  resave: session.resave,
  saveUninitialized: session.saveUninitialized,
  store: new (store(expressSession))({
    mongooseConnection: mongodb.connection
  })
});

export const enableCORS = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Token, Content-Length, X-Requested-With');
  next();
};

export const allowMethods = (req, res, next) => {
  switch (req.method) {
  case 'OPTIONS':
    res.end();
    break;
  default:
    next();
    break;
  }
};
