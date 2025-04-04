import * as Sentry from '@sentry/node';

import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';
import { InvalidPhoneNumberFormatError } from '../../../errors';
import { Settings } from '../../../models';

const phoneUtil = PhoneNumberUtil.getInstance();

export const validate = (phoneNumber) => {
  if (!phoneUtil.isValidNumber(phoneNumber)) {
    throw new InvalidPhoneNumberFormatError('Invalid phone format', 'InvalidPhoneNumberFormatError.phoneParseFail');
  }

  return true;
};

export const format = phoneNumber => phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);

export const parse = (phone, countryCode = 'US') => {
  const number = phoneUtil.parse(phone, countryCode);
  validate(number);

  return format(number);
};

export const isAllowed = async (phone) => {
  try {
    const settings = await Settings.getSettings();

    if (settings && settings.blockNumberPatterns) {
      const patterns = settings.blockNumberPatterns.split(',');
      const testedPatterns = patterns.map((pattern) => {
        try {
          return (new RegExp(pattern.trim())).test(phone);
        } catch (err) {
          Sentry.captureException(err);
          return true;
        }
      });

      return !testedPatterns.includes(true);
    }

    return true;
  } catch (err) {
    // If we made a mistake, we let them in :shrug:
    Sentry.captureException(err);
    return true;
  }
};

export default {
  validate,
  format,
  parse,
  isAllowed
};
