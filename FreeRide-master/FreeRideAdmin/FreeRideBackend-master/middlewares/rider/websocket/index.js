import message from './message';
import ride from './ride';
import { Rides } from '../../../models';

import { validator, wsErrorCatchHandler } from '../../../utils';
import { sns, websocket } from '../../../services';
import { SnsMessage } from '../../../services/SnsMessage';
import { checkActiveRideAndRoom } from '../../../utils/websocket';
import { buildTranslator, getLocaleFromUser } from '../../../utils/translation';
import logger from '../../../logger';

const requestedCall = async (socket, io, data) => {
  logger.info('Received rider-request-call event');
  try {
    const { ride: rideId } = validator.validate(
      validator.rules.object().keys({
        ride: validator.rules.string().required()
      }),
      data
    );

    const rideObj = await Rides.findById(rideId).populate('rider');

    const synced = await checkActiveRideAndRoom(rideObj, 'rider', 'rider-request-call');

    if (!synced) {
      return;
    }

    const driverId = rideObj.driver.toString();

    websocket.emitWebsocketEventToRoom(
      rideId,
      'ride-call-requested',
      { ride: rideId }
    );

    await sns.send(
      'DRIVER',
      driverId,
      new SnsMessage(
        'riderRequestedCall',
        {
          riderFirstName: rideObj.rider.firstName,
          riderLastName: rideObj.rider.lastName
        },
        await buildTranslator()
      )
    );
  } catch (error) {
    const { _id: riderId } = socket.decoded_token.user;
    const riderLocale = await getLocaleFromUser('rider', riderId);
    const req = await buildTranslator(riderLocale);
    wsErrorCatchHandler(socket, error, 'Something went wrong. Please try again.', req, 'genericFailure', {}, 'rider-request-call');
  }
};

export default {
  message,
  requestedCall,
  ride
};
