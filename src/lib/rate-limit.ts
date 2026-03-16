/**
 * Simple in-memory rate limiter.
 *
 * Each unique key (typically an IP address) is limited to `maxRequests`
 * within a rolling `windowMs` millisecond window.  Suitable for
 * serverless / Edge environments where a shared Map lives in the same
 * process; for multi-instance deployments, replace with a Redis-backed
 * solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Remove entries whose window has already expired.
 * Called on every write to bound memory usage without a background timer.
 *
 * NOTE: This implementation uses a single in-process Map, which is suitable
 * for single-instance deployments.  In a multi-instance or serverless
 * environment (where each request may land on a different instance) replace
 * this with a shared, distributed store such as Redis or Upstash.
 */
function evictExpired(now: number): void {
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed per window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
}

/**
 * Check whether `key` has exceeded the rate limit.
 *
 * @example
 * const result = rateLimit(ip, { maxRequests: 10, windowMs: 60_000 });
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 */
export function rateLimit(
  key: string,
  { maxRequests, windowMs }: RateLimitOptions
): RateLimitResult {
  const now = Date.now();

  evictExpired(now);

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // Start a fresh window
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}
