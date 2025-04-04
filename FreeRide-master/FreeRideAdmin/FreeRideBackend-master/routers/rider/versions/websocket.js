import { websocket } from '../../../middlewares/rider';

export default {
  'ride-message': websocket.message.send,
  'rider-request-call': websocket.requestedCall,
  'ride-cancel': websocket.ride.cancel
};
