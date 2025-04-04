import { Riders, Drivers } from '../models';
import { i18nextConfig } from '../app';

export const translator = (t, translationKey, translationParams, lng) => {
  let message;
  if (translationKey && t) {
    if (lng) {
      message = t(translationKey, { ...translationParams, lng });
    } else {
      message = t(translationKey, translationParams);
    }
  }
  if (message === translationKey || !translationKey) {
    message = null;
  }
  return message;
};

export const getLocaleFromUser = async (userType, userId) => {
  let user;
  switch (userType.toLowerCase()) {
  case 'driver':
    user = await Drivers.findOne({ _id: userId });
    break;
  case 'rider':
    user = await Riders.findOne({ _id: userId });
    break;
  default:
    return 'en';
  }
  return user?.locale || 'en';
};

export const buildTranslator = async lng => ({ lng, t: i18nextConfig.t.bind(i18nextConfig) });

export default {
  translator,
  getLocaleFromUser,
  buildTranslator
};
