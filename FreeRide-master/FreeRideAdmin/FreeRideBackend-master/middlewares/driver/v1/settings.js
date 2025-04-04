import { Settings } from '../../../models';
import { errorCatchHandler } from '../../../utils';
import { ApplicationError } from '../../../errors';

const getGlobalSetting = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    if (!settings) {
      throw new ApplicationError('Uh-oh an error has occured! Please try again or contact support.');
    }
    res.status(200).json(settings);
  } catch (err) {
    errorCatchHandler(res, err);
  }
};

export default {
  getGlobalSetting
};
