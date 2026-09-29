interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Fixed-window in-memory limiter; adequate for a single-instance deployment. */
export function hitRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
