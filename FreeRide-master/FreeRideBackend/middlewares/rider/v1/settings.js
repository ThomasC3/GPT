import { Settings } from '../../../models';
import { errorCatchHandler, responseHandler } from '../../../utils';
import { ApplicationError } from '../../../errors';
import { dumpSettingsForRider } from '../../../utils/dump';

const getGlobalSetting = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    if (!settings) {
      throw new ApplicationError('Error fetching global settings', 500, 'globalSettings.fetchFail');
    }

    responseHandler(
      dumpSettingsForRider(settings),
      res
    );
  } catch (error) {
    errorCatchHandler(
      res, error,
      'We were unable to fetch these settings at this time.',
      req.t,
      'globalSettings.fetchUnexpectedFail'
    );
  }
};

export default {
  getGlobalSetting
};
