import io from 'socket.io-client';
import { port } from '../../config';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

export const createWebsockets = (number) => {
  const websockets = [];
  for (let i = 0; i < number; i += 1) {
    websockets.push(io.connect(`http://localhost:${port}`, ioOptions));
  }
  return websockets;
};

export default {
  createWebsockets
};
