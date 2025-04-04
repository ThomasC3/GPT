import { Constants } from '../../../models';
import { dumpConstantsForDriver } from '../../../utils/dump';

export const getUnavailabilityReasons = async (location) => {
  const constantFetch = await Constants.getConstant({ key: 'unavailability_reasons' });
  const unavailabilityReasons = dumpConstantsForDriver(constantFetch);
  const locationUnavailabilityReasons = location?.unavailabilityReasons || [];
  return [...unavailabilityReasons, ...locationUnavailabilityReasons];
};

export default {
  getUnavailabilityReasons
};
