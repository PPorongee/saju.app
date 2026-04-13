import { NextRequest, NextResponse } from 'next/server';

function getIP(req: NextRequest): string {
  // On Vercel, req.ip is set by the platform and cannot be spoofed
  // Fall back to x-real-ip (also set by Vercel), then x-forwarded-for
  return (req as any).ip ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
}

/** In-process fallback rate limiter for when Redis is unavailable */
const fallbackCounts = new Map<string, { count: number; resetAt: number }>();

function inProcessRateLimit(req: NextRequest, config: RateLimitConfig): NextResponse | null {
  const ip = getIP(req);
  const now = Date.now();
  // Evict expired entries to prevent memory leak
  if (fallbackCounts.size > 200) {
    for (const [k, v] of fallbackCounts) {
      if (now > v.resetAt) fallbackCounts.delete(k);
    }
  }
  const entry = fallbackCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    fallbackCounts.set(ip, { count: 1, resetAt: now + config.windowSecs * 1000 });
    return null;
  }
  if (entry.count >= config.limit) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(config.windowSecs) } }
    );
  }
  entry.count++;
  return null;
}

type RateLimitConfig = {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSecs: number;
};

/**
 * Check rate limit for a request.
 * Returns null if the request is allowed, or a 429 NextResponse if rate limited.
 * Fails open — if Upstash env vars are absent or Redis throws, the request is allowed through.
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[rate-limit] Redis not configured — using in-process fallback');
    return inProcessRateLimit(req, config);
  }

  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    const redis = new Redis({ url, token });
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSecs} s`),
      analytics: false,
    });

    const ip = getIP(req);
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: '요청이 너무 많아. 잠시 후 다시 시도해줘! / Too many requests. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter > 0 ? retryAfter : 60),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
          },
        }
      );
    }

    return null;
  } catch (err) {
    // Fall back to in-process limiter on Redis errors
    console.error('[rate-limit] Redis error (falling back to in-process):', err);
    return inProcessRateLimit(req, config);
  }
}

export const RATE_LIMITS = {
  saju: { limit: 5, windowSecs: 60 } satisfies RateLimitConfig,
  paymentConfirm: { limit: 10, windowSecs: 60 } satisfies RateLimitConfig,
  refund: { limit: 3, windowSecs: 3600 } satisfies RateLimitConfig,
  readingsGet: { limit: 10, windowSecs: 60 } satisfies RateLimitConfig,
} as const;
