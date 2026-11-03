import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Redis } from '@reachinbox/shared';

/** Redis-backed so the limit holds across multiple API instances. */
export const createApiRateLimiter = (redis: Redis, perMinute: number, prefix = 'rl:api:') =>
  rateLimit({
    windowMs: 60_000,
    limit: perMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: new RedisStore({
      prefix,
      sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as Promise<RedisReply>,
    }),
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, slow down' } },
  });
