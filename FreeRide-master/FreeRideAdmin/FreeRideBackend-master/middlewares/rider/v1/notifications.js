import path from 'path';
import {
  validator,
  errorCatchHandler,
  responseHandler
} from '../../../utils';
import { sns } from '../../../services';
import { Riders } from '../../../models';

const unsubscribeEmail = async (req, res) => {
  try {
    const { email } = validator.validate(
      validator.rules.object().keys({
        email: validator.rules.string().required(),
        unsubscribe: validator.rules.string().allow('receipt').required()
      }),
      req.query
    );

    // TODO: requires adaptation for different unsubs
    const rider = await Riders.getRider({ email });
    if (rider) {
      const subscriptions = (rider.subscriptions || {});
      subscriptions.receipt = false;

      await Riders.updateRider(rider._id, { subscriptions });
    }

    // Default response to avoid knowing if email exists in case of attack
    res.sendFile(path.join(global.basedir, 'pages/unsubscribe.html'));
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

const subscribePushNotifications = async (req, res) => {
  try {
    const { deviceToken, platform, environment } = validator.validate(
      validator.rules.object().keys({
        deviceToken: validator.rules.string().required(),
        platform: validator.rules.string().valid('ios', 'android').required(),
        environment: validator.rules.string().valid('release', 'debug', 'release_2', 'staging', 'release_3').required()
      }),
      req.body
    );
    const { _id: riderId } = req.user;

    await sns.createSnsEndpoint('RIDER', riderId, deviceToken, platform, environment);
    responseHandler(
      { code: 200 },
      res,
      'Successfully subscribed',
      req.t,
      'notifications.successfullySubscribed'
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
  subscribePushNotifications,
  unsubscribeEmail
};
