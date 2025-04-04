import sgMail from '@sendgrid/mail';
import * as Sentry from '@sentry/node';
import Joi from '@hapi/joi';
import { sendgrid as sengridConfig, domain } from '../../config';
import logger from '../../logger';
import { ApplicationError } from '../../errors';
import { dumpEmailChargeHoldData, dumpEmailTipData } from '../../utils/dump';
import { fetchAllowedAdForEmail } from '../../utils/digitalAds';

export class SendGridMailer {
  constructor() {
    sgMail.setApiKey(sengridConfig.apiKey);
    this.sandbox = sengridConfig.sandbox;
    this.from = sengridConfig.from;
  }

  async sendFromTemplate(templateId, to, dynamicTemplateData, from = this.from) {
    const msg = {
      to,
      from: {
        email: from,
        name: 'Circuit'
      },
      templateId,
      dynamicTemplateData
    };

    return this.send(msg);
  }

  async send(msg) {
    const msgToBeSent = {
      ...msg,
      mail_settings: {
        sandbox_mode: {
          enable: !!this.sandbox
        }
      },
      hideWarnings: sengridConfig.hideWarnings === true
    };

    let response = null;
    try {
      response = await sgMail.send(msgToBeSent);
    } catch (error) {
      Sentry.captureException(error);
      logger.error(error);

      if (error.response) {
        logger.error(error.response.body);
      }

      return { success: false, error };
    }

    return { response, success: true, error: null };
  }

  async sendTipReceipt(data) {
    const { error, value } = Joi.object().keys({
      tip: Joi.required(),
      rider: Joi.required(),
      location: Joi.required(),
      locale: Joi.string().allow('')
    }).validate(data);

    if (error) {
      const errMsg = error.details.map(detail => detail.message).join('. ');
      throw new ApplicationError(errMsg);
    }

    const {
      tip, rider, location, locale
    } = value;

    const language = locale || 'en';

    const advertisement = await fetchAllowedAdForEmail(location, rider);

    const dynamicTemplateData = dumpEmailTipData(
      tip,
      rider,
      advertisement,
      language,
      domain.rider
    );

    const templateId = ({
      'FRED - San Diego': {
        en: 'd-eb776854011f40b8bf9ba99c57bd8970',
        es: 'd-c9601804f96b4826aef26f2939d24217'
      },
      'FRANC - Newport Center': {
        en: 'd-4fc42168af17406ab27708b9c4560957',
        es: 'd-8ea3d8c548f944a58679be00f015cea9'
      }
    }[tip.locationName] || {
      en: 'd-6b0d8cf361954cd8940f87a84560442b',
      es: 'd-b0d4ca7393884b91afb4466f62c54fba'
    })[language];

    // Template requirements:
    // - d-eb776854011f40b8bf9ba99c57bd8970:
    //     riderFirstName, requestTime, passengerNumber, total, driverDisplayName,
    //     showAd, adUrl, adImg, unsubscribeUrl
    // - d-c9601804f96b4826aef26f2939d24217:
    //     riderFirstName, requestTime, passengerNumber, total, driverDisplayName,
    //     showAd, adUrl, adImg, unsubscribeUrl
    // - d-4fc42168af17406ab27708b9c4560957:
    //     riderFirstName, requestTime, passengerNumber,  total, driverDisplayName, unsubscribeUrl
    // - d-8ea3d8c548f944a58679be00f015cea9:
    //     riderFirstName, requestTime, passengerNumber, total, driverDisplayName, unsubscribeUrl
    // - d-6b0d8cf361954cd8940f87a84560442b;
    //     riderFirstName, locationName, requestTime, passengerNumber, total, driverDisplayName,
    //     showAd, adUrl, adImg, unsubscribeUrl
    // - d-b0d4ca7393884b91afb4466f62c54fba:
    //     riderFirstName, locationName, requestTime, passengerNumber, total, driverDisplayName,
    //     showAd, adUrl, adImg, unsubscribeUrl

    return this.sendFromTemplate(templateId, rider.email, dynamicTemplateData);
  }

  async sendVerificationCode(data) {
    const { error, value } = Joi.object().keys({
      email: Joi.string().required(),
      pinCode: Joi.number().required(),
      locale: Joi.string().allow(''),
      riderFirstName: Joi.string().allow('')
    }).validate(data);

    if (error) {
      const errMsg = error.details.map(detail => detail.message).join('. ');
      throw new ApplicationError(errMsg);
    }

    const {
      email, locale, pinCode, riderFirstName
    } = value;

    const language = locale || 'en';
    const templateId = { en: 'd-28b42d371f684eb29ec2131c019c6357', es: 'd-ec0b57fa3bce4b90b516775a9117f3da' };

    // Template requirements:
    // - d-28b42d371f684eb29ec2131c019c6357: riderFirstName, pinCode
    // - d-ec0b57fa3bce4b90b516775a9117f3da: riderFirstName, pinCode

    this.sendFromTemplate(templateId[language], email, { pinCode, riderFirstName });
  }

  async sendEmailVerifiedMessage(data) {
    const { error, value } = Joi.object().keys({
      email: Joi.string().required(),
      locale: Joi.string().allow(''),
      riderFirstName: Joi.string().allow('')
    }).validate(data);

    if (error) {
      const errMsg = error.details.map(detail => detail.message).join('. ');
      throw new ApplicationError(errMsg);
    }

    const { email, locale, riderFirstName } = value;

    const language = locale || 'en';
    const templateId = { en: 'd-c70919170c034843bd0a4b38e3273a72', es: 'd-7e65afe5809d4ba79ffc83111087abe1' };

    // Template requirements:
    // - d-c70919170c034843bd0a4b38e3273a72: riderFirstName, riderEmail
    // - d-7e65afe5809d4ba79ffc83111087abe1: riderFirstName, riderEmail

    this.sendFromTemplate(templateId[language], email, { riderFirstName, riderEmail: email });
  }

  async sendChargeHold(data) {
    const { error, value } = Joi.object().keys({
      paymentInformation: Joi.required(),
      confirmationTimestamp: Joi.required(),
      rider: Joi.required(),
      request: Joi.required(),
      location: Joi.required(),
      locale: Joi.string().allow('')
    }).validate(data);

    if (error) {
      const errMsg = error.details.map(detail => detail.message).join('. ');
      throw new ApplicationError(errMsg);
    }

    const {
      paymentInformation, confirmationTimestamp, rider, request, location, locale
    } = value;

    const advertisement = await fetchAllowedAdForEmail(location, rider);

    const dynamicTemplateData = dumpEmailChargeHoldData(
      paymentInformation,
      confirmationTimestamp,
      rider,
      request,
      location,
      advertisement,
      locale
    );

    const language = locale || 'en';

    const templateId = {
      en: 'd-d474c3139ae74252bc874626f20e56d5',
      es: 'd-f48aca5132b04e2ea7acb60d6bc6ae04'
    }[language];

    // Template requirements:
    // - d-d474c3139ae74252bc874626f20e56d5:
    //     riderFirstName, ridePrice, confirmationTime, ridePrice, passengerNumber, pickupInfo,
    //     dropoffInfo, paymentEnabled, hasDiscount, rideWithoutDiscount, hasPromocode,
    //     promocodeName, rideDiscount, ridePrice, showAd, adUrl, adImg
    // - d-f48aca5132b04e2ea7acb60d6bc6ae04:
    //     riderFirstName, ridePrice, confirmationTime, ridePrice, passengerNumber, pickupInfo,
    //     dropoffInfo, paymentEnabled, hasDiscount, rideWithoutDiscount, hasPromocode,
    //     promocodeName, rideDiscount, ridePrice, showAd, adUrl, adImg

    return this.sendFromTemplate(templateId, rider.email, dynamicTemplateData);
  }
}

export default new SendGridMailer();
