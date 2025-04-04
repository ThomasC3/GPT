import { createLogger, format, transports } from 'winston';
import { SPLAT } from 'triple-beam';
import { isObject, trimEnd } from 'lodash';

import { logger as loggerLevelFromConfig, env } from './config';

const {
  combine, colorize, align, printf
} = format;

const loggerLevel = (['development', 'local', 'test'].includes(env) ? 'debug' : 'info');

function formatObject(param) {
  if (isObject(param)) {
    return JSON.stringify(param);
  }
  return param;
}

const all = format((info) => {
  const splat = info[SPLAT] || [];

  const isSplatTypeMessage = (
    typeof info.message === 'string'
    && (
      info.message.includes('%s') || info.message.includes('%d') || info.message.includes('%j')
    )
  );
  if (isSplatTypeMessage) {
    return info;
  }
  const message = formatObject(info.message);
  const rest = splat
    .map(formatObject)
    .join(' ');

  // eslint-disable-next-line no-param-reassign
  info.message = trimEnd(`${message} ${rest}`);

  return info;
});

const logger = createLogger({
  level: loggerLevelFromConfig || loggerLevel,
  format: combine(
    all(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    align(),
    printf(info => `[${info.timestamp}] [${info.level}] ${info.message}`)
  ),
  transports: [
    new transports.Console()
  ]
});

export const jsonLogger = createLogger({
  level: loggerLevelFromConfig || loggerLevel,
  format: combine(
    all(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    printf(info => `[${info.timestamp}] [${info.level}] ${info.message}`)
  ),
  transports: [
    new transports.Console()
  ]
});

export default logger;
