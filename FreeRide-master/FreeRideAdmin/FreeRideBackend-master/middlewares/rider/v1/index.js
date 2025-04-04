import * as Sentry from '@sentry/node';
import Cryptr from 'cryptr';
import momentTimezone from 'moment-timezone';
import { parse as parsePhone, isAllowed } from '../utils/phoneNumber';
import { Riders as Model, Settings } from '../../../models';
import ride from './ride';
import requests from './request';
import settings from './settings';
import locations from './location';
import stops from './stops';
import auth from './auth';
import { generateNumber } from '../../../utils/crypto';
import {
  auth as Auth, stripe, SesMailer, SendGridMailer
} from '../../../services';
import addresses from './address';
import notifications from './notifications';
import report from './report';
import payment from './payment';
import tip from './tip';
import metrics from './metrics';
import media from './media';
import SMSService from '../../../services/sms';
import { sentry as sentryConfig } from '../../../config';
import {
  InvalidPhoneNumberError,
  EmailNotSentError,
  ApplicationError,
  RiderNotFoundError,
  InvalidPinCodeNumber
} from '../../../errors';
import { translator } from '../../../utils/translation';
import { emailVerificationDeadline, riderDeleteHelper } from '../../../utils/rider';
import { errorCatchHandler, responseHandler } from '../../../utils';
import { validateRiderDelete } from '../../../utils/check';

const changePassword = async (req, res) => {
  const {
    body: { password }
  } = req;

  try {
    const { _id } = req.user;
    await Model.updateRider(_id, { password });
    responseHandler(
      {},
      res,
      'Your password has been successfully updated.',
      req.t,
      'riderPassword.updateSuccess'
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'We were unable to fetch these settings at this time.',
      req.t,
      'riderPassword.updateFail'
    );
  }
};

const getRider = async (req, res) => {
  const { _id } = req.user;

  try {
    const rider = await Model.getRider({ _id });
    if (!rider) {
      throw new RiderNotFoundError(
        'We were unable to fetch your account information.',
        'riderAccount.infoFetchFail'
      );
    }

    const riderUpdate = { lastSeen: momentTimezone() };
    if (!rider.isEmailVerified && !rider.emailVerificationDeadline) {
      riderUpdate.emailVerificationDeadline = emailVerificationDeadline();
    }
    const updatedRider = await Model.updateRider({ _id }, riderUpdate);
    const intercomHashedSecrets = Auth.generateIntercomHash(rider._id);

    responseHandler(
      {
        ...updatedRider.toJSON(),
        ...intercomHashedSecrets,
        isPastEmailVerificationDeadline:
          updatedRider.isPastEmailVerificationDeadline()
      },
      res
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'Something went wrong. Please try again.',
      req.t,
      'genericFailure'
    );
  }
};

const updateRider = async (req, res) => {
  const {
    body: rider
  } = req;
  try {
    const { _id } = req.user;

    const result = await Model.updateRider(_id, rider);
    const intercomHashedSecrets = Auth.generateIntercomHash(result._id);

    responseHandler(
      {
        ...result.toJSON(),
        ...intercomHashedSecrets,
        isPastEmailVerificationDeadline:
          result.isPastEmailVerificationDeadline()
      },
      res
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'We were unable to update your account information.',
      req.t,
      'riderAccount.updateFail'
    );
  }
};

const deleteRider = async (req, res) => {
  const { _id } = req.user;

  try {
    const rider = await validateRiderDelete(_id);

    await riderDeleteHelper(rider);

    responseHandler(
      { message: 'We\'ve deleted your account successfully.' },
      res,
      'We\'ve deleted your account successfully.',
      req.t,
      'riderAccount.deleteSuccess'
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'We were unable to delete your account.',
      req.t,
      'riderAccount.deleteFail'
    );
  }
};

const phoneVerify = async (req, res) => {
  const { phone, code } = req.body;
  const countryCode = req.body.countryCode || 'US';

  try {
    const { _id } = req.user;

    const phoneParsed = parsePhone(phone, countryCode);

    const rider = await Model.getRider({ _id, phone: phoneParsed });
    if (!rider) {
      throw new InvalidPhoneNumberError();
    }

    if (parseInt(rider.phoneCode, 10) !== parseInt(code, 10)) {
      throw new InvalidPinCodeNumber(
        'The pincode you entered is invalid.',
        'riderPhoneVerification.wrongPinCodeEntered'
      );
    }

    await Model.updateRider(rider._id, {
      phoneCode: null,
      isPhoneVerified: true
    });

    return responseHandler(
      {
        phone: rider.phone,
        code
      },
      res,
      'Your phone number has been successfully verified.',
      req.t,
      'riderPhoneVerification.pinCodeVerifySuccess'
    );
  } catch (error) {
    return errorCatchHandler(
      res,
      error,
      error.message || 'Something went wrong!',
      req.t,
      error.keyError ? error.keyError : 'riderPhoneVerification.pinCodeVerifyUnexpectedFail'
    );
  }
};

const sendEmailVerificationCode = async (req, res) => {
  try {
    const {
      user: { _id },
      body: { email, password }
    } = req;
    const rider = await Model.getRider({ _id });
    const emailCode = generateNumber(1000, 9999);

    const updateData = { emailCode };
    if (email && email !== rider.email) {
      if (!Auth.isPasswordMatch(rider, password)) {
        throw new ApplicationError('Wrong password', 400, 'riderEmailPinCodeRequest.wrongPassword');
      }

      const existingEmail = await Model.getRider({ email, isDeleted: false });
      if (existingEmail) {
        throw new ApplicationError(
          'The email address you provided already exists for another user. Please enter a different email address to proceed with the verification process',
          400,
          'riderEmailPinCodeRequest.emailExists'
        );
      }
      updateData.tempEmail = email;
    } else if (rider.isEmailVerified) {
      throw new ApplicationError(
        'The email address for this account is already verified',
        400,
        'riderEmailPinCodeRequest.emailAlreadyVerified'
      );
    }

    SendGridMailer.sendVerificationCode({
      email: email || rider.email,
      pinCode: emailCode,
      locale: rider.locale,
      riderFirstName: rider.firstName
    }).catch((err) => {
      throw new EmailNotSentError(
        err,
        'riderEmailPinCodeRequest.emailSendFail'
      );
    });

    await Model.updateRider(rider._id, updateData);

    responseHandler(
      {},
      res,
      'Please check your email for a PIN code to verify your email address.',
      req.t,
      'riderEmailPinCodeRequest.emailSendSuccess'
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'Something went wrong',
      req.t,
      'genericFailure'
    );
  }
};

const phonePincode = async (req, res) => {
  const { phone } = req.body;
  const pincode = generateNumber(1000, 9999);
  const countryCode = req.body.countryCode || 'US';

  try {
    const globalSettings = await Settings.getSettings();
    if (globalSettings?.smsDisabled) {
      throw new ApplicationError(
        'Unable to send SMS at this time, please try again later.',
        400,
        'riderPhonePinCodeRequest.smsDisabled'
      );
    }

    const { _id } = req.user;

    const phoneParsed = parsePhone(phone, countryCode);

    let rider = await Model.getRider({ _id });
    if (!rider) {
      throw new InvalidPhoneNumberError();
    }

    rider = await Model.updateRider(
      rider._id,
      {
        phone: phoneParsed,
        phoneCode: pincode,
        isPhoneVerified: false
      }
    );

    // FIXME: !Dangerous¡ refactor specs to mock sms.send
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'stage') {
      if (await isAllowed(phoneParsed)) {
        const smsMessage = translator(req.t, 'riderPhonePinCodeRequest.sms', { pincode });
        const SMS = new SMSService();
        const result = await SMS.send(
          phoneParsed,
          smsMessage || `Circuit phone verification PIN-code: ${pincode}`
        );
        if (!result) {
          throw new ApplicationError(
            'We were unable to send a pincode to this number.',
            500,
            'riderPhonePinCodeRequest.smsSendFail'
          );
        }
      } else {
        const cryptr = new Cryptr(sentryConfig.piiHash);
        Sentry.withScope((scope) => {
          scope.setLevel('info');
          scope.setUser({
            id: rider._id,
            phone: cryptr.encrypt(rider.phone),
            email: cryptr.encrypt(rider.email)
          });
          scope.setExtra('ip', req.headers['x-forwarded-for']);
          Sentry.captureMessage('Phone pattern not allowed');
        });
      }
    }

    return responseHandler(
      {
        phone: rider.phone
      },
      res,
      'Please check your text messages for a PIN code to verify your phone number.',
      req.t,
      'riderPhonePinCodeRequest.smsSendSuccess'
    );
  } catch (error) {
    return errorCatchHandler(
      res,
      error,
      'Something went wrong',
      req.t,
      'riderPhonePinCodeRequest.smsSendUnexpectedFail'
    );
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const emailCode = generateNumber(1000, 9999);

  try {
    if (!email) {
      throw new EmailNotSentError(null, null, null, 406);
    }
    const rider = await Model.getRider({ email });
    if (!rider) {
      throw new EmailNotSentError(null, null, null, 400);
    }

    await Model.updateRider(rider._id, {
      emailCode,
      isEmailVerified: false
    });

    const riderLocale = await rider.locale || 'en';
    const result = await SesMailer.send(
      'forgotPassword',
      email,
      {
        subject: { role: 'Rider' },
        html: { pincode: emailCode }
      },
      riderLocale.split('-')[0]
    );

    if (!result) {
      throw new EmailNotSentError();
    }

    responseHandler(
      { email },
      res,
      'Please check your email inbox for a PIN code to verify your account.',
      req.t,
      'riderForgotPasswordRequest.emailSendSuccess'
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'We were unable to send a pincode to the email you provided.',
      req.t,
      'riderForgotPasswordRequest.emailSendUnexpectedFail'
    );
  }
};

const emailVerify = async (req, res) => {
  const {
    user: { _id },
    body: { email, code }
  } = req;
  try {
    const rider = await Model.getRider({ _id });
    if (!rider) {
      throw new RiderNotFoundError(
        'No rider found',
        'riderEmailVerification.riderNotFound'
      );
    }

    const updateData = { emailCode: null, isEmailVerified: true };
    if (email && email !== rider.email) {
      if (email !== rider.tempEmail) {
        throw new ApplicationError(
          'Invalid email provided',
          400,
          'riderEmailVerification.invalidEmail'
        );
      }
      updateData.email = rider.tempEmail;
      updateData.tempEmail = null;
    } else if (rider.isEmailVerified) {
      throw new ApplicationError(
        'The email address for this account is already verified',
        400,
        'riderEmailVerification.emailAlreadyVerified'
      );
    }

    if (parseInt(rider.emailCode, 10) !== parseInt(code, 10)) {
      throw new InvalidPinCodeNumber(
        'The pincode you entered is invalid.',
        'riderEmailVerification.wrongPinCodeEntered'
      );
    }

    const updatedRider = await Model.findByIdAndUpdate(rider._id, updateData, {
      new: true
    });

    if (rider.email !== updatedRider.email && updatedRider.stripeCustomerId) {
      try {
        await stripe.updateCustomer(updatedRider);
      } catch (error) {
        Sentry.captureException(error);
      }
    }

    SendGridMailer.sendEmailVerifiedMessage({
      email: updatedRider.email,
      riderFirstName: updatedRider.firstName,
      locale: updatedRider.locale
    }).catch((err) => {
      Sentry.captureException(err);
    });

    responseHandler(
      { email: updatedRider.email },
      res,
      'Your email has been successfully verified - enjoy your next ride with Circuit.',
      req.t,
      'riderEmailVerification.emailVerificationSuccess'
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'Something went wrong. Please try again.',
      req.t,
      'genericFailure'
    );
  }
};

const forgotPasswordEmailVerify = async (req, res) => {
  const { email, code } = req.body;
  try {
    const rider = await Model.getRider({ email });
    if (!rider) {
      throw new RiderNotFoundError('No rider with such email', 'riderEmailVerification.riderNotFound');
    }
    if (parseInt(rider.emailCode, 10) !== parseInt(code, 10)) {
      throw new InvalidPinCodeNumber('The pincode you entered is invalid.', 'riderEmailVerification.wrongPinCodeEntered');
    }

    await Model.updateRider(rider._id, {
      emailCode: null,
      isEmailVerified: true
    });
    const user = Auth.getToken(rider);

    responseHandler(
      { email, code, accessToken: user.accessToken },
      res
    );
  } catch (error) {
    errorCatchHandler(
      res,
      error,
      'Something went wrong. Please try again.',
      req.t,
      'genericFailure'
    );
  }
};

export default {
  changePassword,
  getRider,
  updateRider,
  deleteRider,
  ride,
  requests,
  settings,
  locations,
  stops,
  forgotPassword,
  forgotPasswordEmailVerify,
  addresses,
  notifications,
  phoneVerify,
  phonePincode,
  auth,
  report,
  payment,
  tip,
  emailVerify,
  sendEmailVerificationCode,
  metrics,
  media
};
