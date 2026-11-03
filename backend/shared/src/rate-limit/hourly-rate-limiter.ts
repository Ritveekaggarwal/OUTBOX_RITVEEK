import { Redis } from 'ioredis';

export const HOUR_MS = 60 * 60 * 1000;

export type QuotaScopeType = 'global' | 'sender' | 'campaign';

export interface QuotaScope {
  type: QuotaScopeType;
  /** Identifier inside the scope (sender id, campaign id, "all"). */
  id: string;
  /** Max sends inside one clock hour. 0 disables the scope. */
  limit: number;
}

export type QuotaDecision =
  | { allowed: true }
  | { allowed: false; exceeded: QuotaScope; windowStart: number; nextWindowStart: number };

/**
 * Atomically checks every scope and only increments when ALL have capacity,
 * so a rejected send never burns quota. Runs as one Lua script, which makes it
 * safe across any number of workers / instances.
 * KEYS = counter keys, ARGV = limits..., ttlSeconds
 */
const CONSUME_SCRIPT = `
local n = #KEYS
local ttl = tonumber(ARGV[n + 1])
for i = 1, n do
  local limit = tonumber(ARGV[i])
  if limit > 0 then
    local current = tonumber(redis.call('GET', KEYS[i]) or '0')
    if current >= limit then
      return i
    end
  end
end
for i = 1, n do
  local count = redis.call('INCR', KEYS[i])
  if count == 1 then
    redis.call('EXPIRE', KEYS[i], ttl)
  end
end
return 0
`;

export class HourlyRateLimiter {
  constructor(private readonly redis: Redis) {}

  static windowOf(timestamp: number): number {
    return Math.floor(timestamp / HOUR_MS);
  }

  private counterKey(scope: QuotaScope, window: number): string {
    return `rl:count:${scope.type}:${scope.id}:${window}`;
  }

  async tryConsume(scopes: QuotaScope[], now = Date.now()): Promise<QuotaDecision> {
    const window = HourlyRateLimiter.windowOf(now);
    const keys = scopes.map((scope) => this.counterKey(scope, window));
    const limits = scopes.map((scope) => String(scope.limit));
    const ttlSeconds = String(2 * 60 * 60);

    const result = (await this.redis.eval(CONSUME_SCRIPT, keys.length, ...keys, ...limits, ttlSeconds)) as number;
    if (result === 0) return { allowed: true };

    return {
      allowed: false,
      exceeded: scopes[result - 1]!,
      windowStart: window * HOUR_MS,
      nextWindowStart: (window + 1) * HOUR_MS,
    };
  }

  /**
   * Hands out FIFO slots in the next window so deferred jobs keep their
   * relative order and stay spaced by the provider throttle delay.
   */
  async reserveNextWindowSlot(orderingKey: string, nextWindowStart: number, spacingMs: number): Promise<number> {
    const key = `rl:overflow:${orderingKey}:${HourlyRateLimiter.windowOf(nextWindowStart)}`;
    const position = await this.redis.incr(key);
    if (position === 1) await this.redis.expire(key, 3 * 60 * 60);
    return nextWindowStart + (position - 1) * Math.max(spacingMs, 1);
  }

  /** Returns true only the first time it is called for a key in the window (used to dedupe alerts). */
  async markOnce(key: string, ttlSeconds = 2 * 60 * 60): Promise<boolean> {
    const result = await this.redis.set(`rl:once:${key}`, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async usage(scope: QuotaScope, now = Date.now()): Promise<number> {
    const value = await this.redis.get(this.counterKey(scope, HourlyRateLimiter.windowOf(now)));
    return Number(value ?? 0);
  }
}
