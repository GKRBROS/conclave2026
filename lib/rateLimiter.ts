type RateLimitState = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, RateLimitState>();

export type RateLimitConfig = {
  windowMs: number;
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs?: number;
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.windowStart + config.windowMs <= now) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (existing.count < config.max) {
    existing.count += 1;
    return { allowed: true };
  }

  const retryAfterMs =
    existing.windowStart + config.windowMs - now > 0
      ? existing.windowStart + config.windowMs - now
      : 0;

  return {
    allowed: false,
    retryAfterMs,
  };
}

