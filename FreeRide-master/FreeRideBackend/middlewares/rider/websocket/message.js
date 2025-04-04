import { Messages, Rides } from '../../../models';
import { validator, dump, wsErrorCatchHandler } from '../../../utils';
import { mongodb, sns, websocket } from '../../../services';
import { SnsMessage } from '../../../services/SnsMessage';
import { ApplicationError } from '../../../errors';
import logger from '../../../logger';
import { checkActiveRideAndRoom } from '../../../utils/websocket';
import { buildTranslator, getLocaleFromUser } from '../../../utils/translation';

const send = async (socket, io, data) => {
  logger.info('Received ride-message event');
  try {
    const { ride: rideId, message } = validator.validate(
      validator.rules.object().keys({
        message: validator.rules.string().required(),
        ride: validator.rules.string().required()
      }),
      data
    );

    const { _id: riderId } = socket.decoded_token.user;
    const ride = await Rides.findById(rideId).populate('rider');

    if (!ride || ride.rider._id.toString() !== riderId) {
      throw new ApplicationError('Wrong ride id', 500, 'ride.wrongId');
    }

    const synced = await checkActiveRideAndRoom(ride, 'rider', 'ride-message');

    if (!synced) {
      return;
    }

    const newMessage = await Messages.createByRider({
      owner: new mongodb.Types.ObjectId(riderId),
      ride: new mongodb.Types.ObjectId(rideId),
      message
    });

    await ride.addMessage(newMessage._id);

    websocket.emitWebsocketEventToRoom(
      rideId,
      'ride-message-received',
      dump.dumpMessage(newMessage),
    );

    await sns.send(
      'DRIVER',
      ride.driver.toString(),
      new SnsMessage(
        'riderSentMessage',
        {
          riderFirstName: ride.rider.firstName,
          riderLastName: ride.rider.lastName,
          message
        },
        await buildTranslator()
      )
    );
  } catch (error) {
    const { _id: riderId } = socket.decoded_token.user;
    const riderLocale = await getLocaleFromUser('rider', riderId);
    const req = await buildTranslator(riderLocale);
    wsErrorCatchHandler(socket, error, 'Something went wrong. Please try again.', req, 'genericFailure', {}, 'ride-message');
  }
};

export default {
  send
};
