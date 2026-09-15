/**
 * Sliding-window rate limiter.
 *
 * Backed by an in-process Map so it works on a single VPS/dev machine with no
 * Redis. That is deliberately a *soft* defence: behind multiple instances each
 * process keeps its own counters, so the effective limit multiplies by the
 * instance count. Swap `hit()` for a Redis INCR/EXPIRE when the app is scaled
 * horizontally — every caller already goes through this one function.
 */

interface Bucket {
  hits: number[];
  blockedUntil: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

/** Drops idle buckets so a long-running process does not grow unboundedly. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    const newest = b.hits[b.hits.length - 1] ?? 0;
    if (now - newest > 3_600_000 && now > b.blockedUntil) buckets.delete(key);
  }
}

export interface RateLimitRule {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Allowed requests inside the window. */
  max: number;
  /** How long to block once the limit is exceeded (defaults to windowMs). */
  blockMs?: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds the caller should wait before retrying. */
  retryAfter: number;
}

export function rateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [], blockedUntil: 0 };
    buckets.set(key, bucket);
  }

  if (now < bucket.blockedUntil) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000) };
  }

  const windowStart = now - rule.windowMs;
  bucket.hits = bucket.hits.filter((t) => t > windowStart);

  if (bucket.hits.length >= rule.max) {
    bucket.blockedUntil = now + (rule.blockMs ?? rule.windowMs);
    return { ok: false, remaining: 0, retryAfter: Math.ceil((rule.blockMs ?? rule.windowMs) / 1000) };
  }

  bucket.hits.push(now);
  return { ok: true, remaining: rule.max - bucket.hits.length, retryAfter: 0 };
}

/** Clears a bucket — used after a successful login so a valid user isn't punished. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Common presets, so limits stay consistent across routes. */
export const RATE_RULES = {
  /** Login / password reset — strict, blocks for 15 minutes. */
  auth: { windowMs: 10 * 60_000, max: 8, blockMs: 15 * 60_000 } satisfies RateLimitRule,
  /** OTP email sends — protects against mail-provider abuse. */
  otp: { windowMs: 60 * 60_000, max: 5, blockMs: 30 * 60_000 } satisfies RateLimitRule,
  /** Unauthenticated public endpoints (career form, public API). */
  publicWrite: { windowMs: 60 * 60_000, max: 10, blockMs: 60 * 60_000 } satisfies RateLimitRule,
  /** Authenticated writes that should not be spammed (clock-in, submissions). */
  write: { windowMs: 60_000, max: 20 } satisfies RateLimitRule,
  /** Generic authenticated reads. */
  read: { windowMs: 60_000, max: 120 } satisfies RateLimitRule,
} as const;

/**
 * Best-effort client IP. `x-forwarded-for` is only trustworthy behind a proxy
 * that overwrites it (Vercel, nginx with `proxy_set_header`); direct-exposed
 * deployments must not rely on it for anything but rate-limit keying.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
