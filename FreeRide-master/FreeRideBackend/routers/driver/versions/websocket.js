import { websocket } from '../../../middlewares/driver';

export default {
  'ride-driver-moved': websocket.ride.driverMoved,
  'ride-request-received-ack': websocket.ride.ack
};
