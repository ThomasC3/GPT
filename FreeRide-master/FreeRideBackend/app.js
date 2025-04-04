// app.js
import { Server } from 'http';
import express from 'express';
import { join } from 'path';
import { readdirSync, lstatSync } from 'fs';

import i18next from 'i18next';
import i18nextHttpMiddleware, { LanguageDetector } from 'i18next-http-middleware';
import i18nextFsBackend from 'i18next-fs-backend';

import * as models from './models';
import sms from './services/sms';
import { SesMailer } from './services/mailers';
import apps from './apps';

import {
  sentry as sentryConfig
} from './config';

const Sentry = require('@sentry/node');

i18next
  .use(i18nextFsBackend)
  .use(LanguageDetector)
  .init({
    preload: readdirSync('locales').filter((fileName) => {
      const joinedPath = join('locales', fileName);
      const isDirectory = lstatSync(joinedPath).isDirectory();
      return isDirectory;
    }),
    // keys or params to lookup language from
    order: ['header', 'path', 'session', 'querystring', 'cookie'],
    lookupQuerystring: 'lng',
    lookupCookie: 'i18next',
    lookupHeader: 'accept-language',
    lookupHeaderRegex: /(([a-z]{2})-?([A-Z]{2})?)\s*;?\s*(q=([0-9.]+))?/gi,
    lookupSession: 'lng',
    lookupPath: 'lng',
    lookupFromPathIndex: 0,
    ns: 'circuit-backend',
    defaultNS: 'circuit-backend',
    backend: {
      loadPath: 'locales/{{lng}}/{{ns}}.json',
      addPath: 'locales/{{lng}}/{{ns}}.missing.json'
    },
    fallbackLng: 'en'
  }, (error) => {
    if (error) console.log(error);
  });

export const i18nextConfig = i18next;

const app = express();

if (sentryConfig.dsn) {
  Sentry.init({ dsn: sentryConfig.dsn });

  // The request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler());
  // The error handler must be before any other error middleware
  app.use(Sentry.Handlers.errorHandler());
}

app.locals.models = models;
app.locals.sms = sms;
app.locals.mailer = SesMailer;

app.use(i18nextHttpMiddleware.handle(i18next));
app.use(express.static(join(__dirname, 'static')));
app.set('views', join(__dirname, 'views/'));
app.set('view engine', 'pug');

app.use(apps);

const server = new Server(app);

export default server;
