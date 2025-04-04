import { Settings } from '../../../models';
import { adminErrorCatchHandler } from '..';
import { ApplicationError } from '../../../errors';
import { commonAttributeObj } from '../../../utils/transformations';

const ALLOWED_ATTRIBUTES = [
  'rideriOS',
  'riderAndroid',
  'driveriOS',
  'blockNumberPatterns',
  'driverLimitSort',
  'initialDriverLimit',
  'skipDistanceTSP',
  'finalDriverLimit',
  'smsDisabled',
  'isDynamicRideSearch',
  'hideFlux',
  'hideTripAlternativeSurvey'
];

const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    if (!settings) { throw new ApplicationError('No settings available!'); }

    res.status(200).json(settings);
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      error.message || 'We were unable to fetch these settings at this time.',);
  }
};

const updateSettings = async (req, res) => {
  const {
    body: settingsFormData
  } = req;

  try {
    const settingsData = commonAttributeObj(ALLOWED_ATTRIBUTES, settingsFormData);

    const settings = await Settings.getSettings() === null
      ? await Settings.createSettings(settingsData)
      : await Settings.updateSettings(settingsData);

    res.status(200).json(settings);
  } catch (error) {
    adminErrorCatchHandler(res, error, req,
      error.message || 'We were unable to update these settings at this time.');
  }
};

export default {
  getSettings,
  updateSettings
};
