import { validator, errorCatchHandler } from '../../../utils';
import { sns } from '../../../services';

const subscribePushNotifications = async (req, res) => {
  try {
    const { deviceToken, platform, environment } = validator.validate(
      validator.rules.object().keys({
        deviceToken: validator.rules.string().required(),
        platform: validator.rules.string().valid('ios', 'android').required(),
        environment: validator.rules.string().valid('release', 'debug').required()
      }),
      req.body,
    );
    const { _id: driverId } = req.user;

    await sns.createSnsEndpoint('DRIVER', driverId, deviceToken, platform, environment);
    res.json({
      code: 200,
      message: 'Successfully subscribed'
    });
  } catch (error) {
    error.code = 400;
    errorCatchHandler(res, error);
  }
};

export default {
  subscribePushNotifications
};
