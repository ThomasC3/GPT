import * as Sentry from '@sentry/node';
import {
  Reports, Rides, Riders, Drivers
} from '../models';
import logger from '../logger';
import { SesMailer } from '../services';

const SERIOUS_REPORT_REASON = [
  'Physically assaulted a driver, Circuit staff-member or fellow rider',
  'Caused the police to be called for a non-emergency related event',
  'Under the age of 16'
];

export const checkStrikeStatus = async (userType, userId) => {
  const reports = await Reports.find({
    'reportee.id': userId,
    status: 'Confirmed',
    isDeleted: false
  });
  const strikeCount = reports.length;
  const seriousStrike = reports
    .filter(report => SERIOUS_REPORT_REASON.includes(report.reason)).length > 0;
  const { avgRating } = (await Rides.getRatingReceivedFor(userType, userId, 10))[0] || {};
  const ratingStrike = !!(avgRating && avgRating < 3);

  const toBan = seriousStrike || (strikeCount > 2) || (strikeCount > 1 && ratingStrike);
  return {
    toBan,
    seriousStrike,
    ratingStrike,
    strikeCount
  };
};

const getPreviousStrikeInfo = async (userType, userId) => {
  let strikeCount;
  let isBanned;
  let email;
  let firstName;
  let locale;
  if (userType.toLowerCase() === 'driver') {
    ({
      strikeCount,
      isBanned,
      email,
      firstName,
      locale
    } = await Drivers.findOne({ _id: userId }));
  } else if (userType.toLowerCase() === 'rider') {
    ({
      strikeCount,
      isBanned,
      email,
      firstName,
      locale
    } = await Riders.findOne({ _id: userId }));
  }
  return {
    strikeCount: strikeCount || 0,
    isBanned: isBanned || false,
    userEmail: email || '',
    firstName: firstName || '',
    userLocale: locale || 'en'
  };
};

const sendStrikeEmail = async (strikeInfo, userInfo) => {
  const {
    toBan, isBanned, strikeCount, previousStrikeCount, seriousStrike
  } = strikeInfo;

  const { userEmail, firstName, userLocale } = userInfo;

  let strikeType = '';
  if (toBan && !isBanned) {
    strikeType = seriousStrike ? 'ban' : 'third-strike';
  } else if (!isBanned && strikeCount > previousStrikeCount) {
    strikeType = strikeCount === 1 ? 'first-strike' : 'second-strike';
  }

  if (strikeType) {
    await SesMailer.send(
      'riderStrikeBan',
      userEmail,
      {
        subject: { strikeType },
        html: { firstName, strikeType }
      },
      userLocale.split('-')[0]
    );
  }
};

export const checkStrikeBan = async (userType, userId) => {
  try {
    const {
      toBan,
      strikeCount,
      seriousStrike
    } = await checkStrikeStatus(userType, userId);

    const {
      strikeCount: previousStrikeCount,
      isBanned,
      userEmail,
      firstName,
      userLocale
    } = await getPreviousStrikeInfo(userType, userId);

    const setAttributes = { strikeCount };
    if (toBan) {
      setAttributes.isBanned = true;
    }
    if (userType === 'Rider') {
      await Riders.findOneAndUpdate(
        { _id: userId },
        { $set: setAttributes },
        { new: true, upsert: false }
      );
    } else {
      await Drivers.findOneAndUpdate(
        { _id: userId },
        { $set: setAttributes },
        { new: true, upsert: false }
      );
    }

    await sendStrikeEmail(
      {
        toBan,
        isBanned,
        strikeCount,
        previousStrikeCount,
        seriousStrike
      },
      {
        userEmail,
        firstName,
        userLocale
      }
    );
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
};

export default {
  checkStrikeStatus,
  checkStrikeBan
};
