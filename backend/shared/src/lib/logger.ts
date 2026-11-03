import pino, { Logger } from 'pino';
import { env } from '../config/env';

export function createLogger(service: string): Logger {
  return pino({
    name: service,
    level: env.LOG_LEVEL,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.smtpPass', '*.webhookUrl'],
      censor: '[redacted]',
    },
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
        : undefined,
  });
}

export type { Logger };
