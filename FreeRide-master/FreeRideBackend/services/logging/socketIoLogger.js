import { Decoder, PacketType } from 'socket.io-parser';
import { createLogger, format, transports } from 'winston';

const socketIoLogger = (socket, next) => {
  const consoleTransport = new transports.Console();
  const logStream = createLogger({
    transports: [consoleTransport],
    format: format.combine(
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      format.printf(info => `[${info.timestamp}] [socket.io] ${info.message}`)
    )
  });

  const decoder = new Decoder();
  decoder.on('decoded', (decodedPacket) => {
    try {
      if (decodedPacket.type === PacketType.EVENT && decodedPacket.data?.length >= 1) {
        logStream.info(`[${decodedPacket.data.shift()}] [${socket.id}] ${JSON.stringify(decodedPacket.data)}`);
      }
    } catch (TypeError) {
      try {
        console.error(`TypeError parsing ${decodedPacket}.`);
      } catch (error) {
        console.error('TypeError parsing websocket message.');
      }
    }
  });

  const selector = ({ type, data }) => {
    switch (type) {
    case 'message':
      decoder.add(data);
      break;
    default: // Do nothing
    }
  };

  socket.conn.on('packet', selector);

  socket.conn.on('packetCreate', selector);

  next();
};

export default socketIoLogger;
