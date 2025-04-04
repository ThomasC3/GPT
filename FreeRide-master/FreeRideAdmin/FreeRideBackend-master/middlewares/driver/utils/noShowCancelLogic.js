import moment from 'moment-timezone';
import { ForbiddenError } from '../../../errors';
import { getTimeLeft } from '../../../utils/time';
import { checkDriverNearPickup } from '../../../utils/ride';
import { feetToMeter } from '../../../utils/transformations';
import { validator } from '../../../utils';
import { Drivers } from '../../../models';

export const noShowRideCancelCheck = async (ride, data = null) => {
  if (!ride.driverArrivingTimestamp) {
    if (data?.latitude && data?.longitude) {
      const { latitude, longitude } = validator.validate(
        validator.rules.object().keys({
          ride: validator.rules.string(),
          latitude: validator.rules.number().min(-90).max(90).required(),
          longitude: validator.rules.number().min(-180).max(180).required()
        }),
        data
      );
      await Drivers.updateDriver(
        ride.driver,
        {
          currentLocation: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        }
      );

      const { arrivedRangeFeet } = ride.location;
      const arrivedRangeMeters = feetToMeter(arrivedRangeFeet || 500);

      const driverIsNear = checkDriverNearPickup(
        ride.driver, ride, arrivedRangeMeters
      );

      return !!driverIsNear;
    }
    throw new ForbiddenError('You must arrive at your pickup location first!');
  }
  const waitingTime = 3;
  const waitingTimestamp = moment(ride.driverArrivedTimestamp).utc().add(waitingTime, 'minutes');
  const timestampNow = moment().utc();

  if (waitingTimestamp && timestampNow.isBefore(waitingTimestamp)) {
    const msg = getTimeLeft(timestampNow, waitingTimestamp);
    throw new ForbiddenError(`You'll only be able to cancel the ride ${msg}.`);
  }

  return true;
};

export default {
  noShowRideCancelCheck
};
