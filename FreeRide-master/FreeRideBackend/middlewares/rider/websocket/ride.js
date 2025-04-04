import { Rides, Riders, RideStatus } from '../../../models';
import { validator, wsErrorCatchHandler } from '../../../utils';
import setQueue from '../../../services/queue';

import { updateRouteRide } from '../../../utils/ride';
import { cancelRequestPayment } from '../../../utils/request';
import { checkActiveRideAndRoom } from '../../../utils/websocket';
import { ApplicationError } from '../../../errors';
import { getLocaleFromUser, buildTranslator } from '../../../utils/translation';
import logger from '../../../logger';


const ACTIVE_NO_PICKUP_STATUS = [
  RideStatus.RideInQueue,
  RideStatus.NextInQueue,
  RideStatus.DriverEnRoute,
  RideStatus.DriverArrived
];

const cancel = async (socket, io, data) => {
  logger.info('Received ride-cancel event (rider)');
  try {
    const { ride: rideId } = validator.validate(
      validator.rules.object().keys({
        ride: validator.rules.string().required()
      }),
      data
    );

    const { _id: riderId } = socket.decoded_token.user;
    const ride = await Rides.findById(rideId);

    if (!ride || ride.rider.toString() !== riderId) {
      throw new ApplicationError('Wrong ride id', 500, 'ride.wrongId');
    }

    if (ACTIVE_NO_PICKUP_STATUS.includes(ride.status)) {
      await cancelRequestPayment(ride.request);
    }

    const synced = await checkActiveRideAndRoom(ride, 'rider', 'ride-cancel');

    if (!synced) {
      return;
    }

    // Update Route
    await updateRouteRide(ride, 'cancel');

    const timeNow = Date.now();
    await Riders.updateRider(riderId, { lastCancelTimestamp: timeNow });

    await Rides.updateRide(rideId, {
      cancelTimestamp: timeNow,
      cancelledBy: 'RIDER',
      status: 207
    });

    await setQueue(ride.driver);
  } catch (error) {
    const { _id: riderId } = socket.decoded_token.user;
    const riderLocale = await getLocaleFromUser('rider', riderId);
    const req = await buildTranslator(riderLocale);
    wsErrorCatchHandler(socket, error, 'Something went wrong. Please try again.', req, 'genericFailure', {}, 'ride-cancel (rider)');
  }
};

export default {
  cancel
};
