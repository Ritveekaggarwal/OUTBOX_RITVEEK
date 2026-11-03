import IORedis, { Redis } from 'ioredis';
import { env } from '../config/env';

/**
 * BullMQ requires `maxRetriesPerRequest: null` on connections used by workers
 * (blocking commands). We use the same settings everywhere for consistency.
 */
export function createRedisConnection(): Redis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

let shared: Redis | undefined;

/** Shared non-blocking connection for counters, locks and caches. */
export function getRedis(): Redis {
  if (!shared) shared = createRedisConnection();
  return shared;
}

export async function disconnectRedis(): Promise<void> {
  if (shared) {
    await shared.quit();
    shared = undefined;
  }
}
