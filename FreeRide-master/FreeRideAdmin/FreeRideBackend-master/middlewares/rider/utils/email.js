import * as Sentry from '@sentry/node';
import { Settings } from "../../../models";


export const isEmailBlacklisted = async (email) => {
  try {
    const settings = await Settings.getSettings();
    if (settings && settings.blacklistedEmailDomains) {
      const blacklistedDomains = settings.blacklistedEmailDomains.split(',');
      const emailDomain = email.split('@')[1];
      return blacklistedDomains.includes(emailDomain);
    }
    return false;
  } catch (err) {
    Sentry.captureException(err);
    return false;
  }
};

module.exports = {
  isEmailBlacklisted,
}