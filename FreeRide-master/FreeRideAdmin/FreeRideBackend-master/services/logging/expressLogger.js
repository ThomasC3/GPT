import { createLogger, format, transports } from 'winston';
import { env, logger as loggerLevel } from '../../config';

const {
  combine, timestamp, colorize
} = format;

const level = (['development', 'local'].includes(env) ? 'debug' : 'info');

const expressWinstonLogger = createLogger({
  level: loggerLevel || level,
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console({
      format: combine(
        timestamp(),
        colorize({ all: true }),
        format.printf(
          info => `[${info.timestamp}] [${info.level}] ${info.message}`
        )
      )
    })
  ]
});

const expressLogger = (req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    const loggerMessage = ['stage', 'production'].includes(process.env.NODE_ENV)
      ? `HOST ${req.headers.host} [${req.method}] ${req.originalUrl} ${JSON.stringify(req.query)}`
      : `HOST ${req.headers.host} [${req.method}] ${req.originalUrl} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;

    expressWinstonLogger.info(loggerMessage);
  }

  next();
};

export default expressLogger;
