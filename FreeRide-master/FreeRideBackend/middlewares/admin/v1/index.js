import moment from 'moment-timezone';
import {
  EmailNotSentError
} from '../../../errors';
import { validator } from '../../../utils';
import { adminErrorCatchHandler } from '..';

import analytics from './analytics';
import drivers from './driver';
import riders from './rider';
import settings from './settings';
import locations from './location';
import fixedStops from './fixedStops';
import promocodes from './promocodes';
import rides from './ride';
import requests from './requests';
import events from './event';
import media from './media';
import reports from './report';
import stats from './stats';
import paymentStats from './paymentStats';
import webhooks from './webhooks';
import tips from './tips';
import inspections from './inspections';
import { SesMailer, sns } from '../../../services';
import dashboard from './dashboard';
import { domain } from '../../../config';
import vehicleTypes from './vehicleType';
import vehicles from './vehicle';
import eventStats from './eventStats';
import matchingRules from './matchingRule';
import metrics from './metrics';
import jobs from './job';
import digitalAds from './digitalAds';
import { SnsMessage } from '../../../services/SnsMessage';
import { buildTranslator } from '../../../utils/translation';
import { auth0ClientInstance } from '../utils/Auth0Client';

const passwordValidationRule = validator.rules.string()
  .regex(/^(?=\P{Ll}*\p{Ll})(?=\P{Lu}*\p{Lu})(?=\P{N}*\p{N})(?=[\p{L}\p{N}]*[^\p{L}\p{N}])[\s\S]{8,}$/u)
  .messages({
    'string.pattern.base': 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  });

const addAdmin = async (req, res) => {
  const { body: adminFormData } = req;

  try {
    const validatedData = validator.validate(
      validator.rules.object().keys({
        email: validator.rules.string().email().required(),
        password: passwordValidationRule.required(),
        firstName: validator.rules.string().required(),
        lastName: validator.rules.string().required(),
        role: validator.rules.string().required(),
        locations: validator.rules.array().items(validator.rules.string())
      }),
      adminFormData
    );

    const admin = await auth0ClientInstance.createAdmin(validatedData);
    res.status(200).json(admin);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getAdmin = async (req, res) => {
  const { id } = req.user;

  try {
    const admin = await auth0ClientInstance.getAdmin(id);
    res.status(200).json(admin);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateAdmin = async (req, res) => {
  const { body } = req;

  try {
    validator.validate(
      validator.rules.object().keys({
        firstName: validator.rules.string().allow(''),
        lastName: validator.rules.string().allow(''),
        email: validator.rules.string().email().allow('')
      }),
      body
    );
    const result = await auth0ClientInstance.updateAdmin(req.user.id, body);
    res.status(200).json(result);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getAdmins = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        page: validator.rules.number().integer().min(0).default(0),
        perPage: validator.rules.number().integer().min(1).max(100)
          .default(25),
        q: validator.rules.string().allow(''),
        sort: validator.rules.string().valid('created_at:1', 'created_at:-1', 'name:1', 'name:-1', 'email:1', 'email:-1'),
        fields: validator.rules.string().allow('')
      }),
      req.query,
    );

    const admins = await auth0ClientInstance.getAdmins(filterParams);
    res.status(200).json(admins);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getAdminById = async (req, res) => {
  const {
    params: { id }
  } = req;
  try {
    const admin = await auth0ClientInstance.getAdmin(id);
    res.status(200).json(admin);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateAdminById = async (req, res) => {
  const {
    params: { id },
    body
  } = req;

  try {
    validator.validate(
      validator.rules.object().keys({
        firstName: validator.rules.string().allow(''),
        lastName: validator.rules.string().allow(''),
        email: validator.rules.string().email().allow(''),
        roleChanged: validator.rules.boolean().truthy(1).falsy(0).allow(''),
        role: validator.rules.string().allow(''),
        locations: validator.rules.array().items(validator.rules.string()),
        verifyEmail: validator.rules.boolean().truthy(1).falsy(0).allow('')
      }),
      body
    );
    const result = await auth0ClientInstance.updateAdmin(id, body);

    res.status(200).json(result);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const sendTestEmail = async (req, res) => {
  try {
    const {
      email, locationName, showAd
    } = req.query;

    const encodedRiderEmail = encodeURIComponent(email);

    const result = await SesMailer.send('receipt', email, {
      subject: { role: 'Rider' },
      html: {
        locationName,
        riderFirstName: 'rFirstName',
        requestTime: moment(new Date()).utc().format('lll'),
        passengerNumber: 3,
        driverFirstName: 'dFirstName',
        driverLastName: 'dLastName',
        pickupAddress: 'ride pickupAddress',
        dropoffAddress: 'ride dropoffAddress',
        pickupTime: moment.unix((new Date()) / 1000).utc().format('lll'),
        dropoffTime: moment.unix((new Date()) / 1000).utc().format('lll'),
        adUrl: 'http://thefreeride.com/',
        adImg: 'https://s3.amazonaws.com/images.tfrholdingscorp.com/5d39d192c6e3f913dd6a0675_1564135263532.png',
        showAd,
        unsubscribeUrl: `https://${domain.rider}/v1/unsubscribe?unsubscribe=receipt&email=${encodedRiderEmail}`
      }
    });

    if (!result) {
      throw new EmailNotSentError();
    }

    res.status(200).json(req.query);
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      error.message || 'Emails not sent');
  }
};

export const sendTestMobileNotification = async (req, res) => {
  try {
    const filterParams = validator.validate(
      validator.rules.object().keys({
        userId: validator.rules.string().required(),
        userType: validator.rules.string().valid('RIDER', 'DRIVER').required()
      }),
      req.body
    );
    const { userId, userType } = filterParams;
    await sns.send(
      userType,
      userId,
      new SnsMessage(
        'testMessage',
        {},
        await buildTranslator()
      )
    );

    res.status(200).json({ message: 'Notification sent successfully' });
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      error.message || 'Notification not sent');
  }
};

export const getRoles = async (req, res) => {
  try {
    const roles = await auth0ClientInstance.getRoles();
    res.status(200).json(roles);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const changeAdminPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    validator.validate(
      validator.rules.object().keys({
        password: passwordValidationRule.required()
      }),
      { password }
    );

    await auth0ClientInstance.updateAdmin(id, { password });
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  sendTestMobileNotification,
  addAdmin,
  getAdmin,
  updateAdmin,
  getAdmins,
  updateAdminById,
  getAdminById,
  analytics,
  drivers,
  riders,
  requests,
  settings,
  locations,
  fixedStops,
  promocodes,
  rides,
  events,
  media,
  reports,
  stats,
  paymentStats,
  sendTestEmail,
  webhooks,
  tips,
  dashboard,
  vehicleTypes,
  vehicles,
  inspections,
  eventStats,
  matchingRules,
  metrics,
  jobs,
  getRoles,
  changeAdminPassword,
  digitalAds
};
