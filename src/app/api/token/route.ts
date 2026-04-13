import { NextRequest, NextResponse } from 'next/server';
import { generateApiToken } from '@/lib/api-token';

/** Rate-limited token issuance — max 10 per minute per IP */
const ipCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_MIN = 10;

function checkTokenRateLimit(req: NextRequest): NextResponse | null {
  const ip = (req as unknown as { ip?: string }).ip
    || req.headers.get('x-real-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  const now = Date.now();
  // Evict expired entries to prevent unbounded growth
  if (ipCounts.size > 100) {
    for (const [k, v] of ipCounts) {
      if (now > v.resetAt) ipCounts.delete(k);
    }
  }
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return null;
  }
  if (entry.count >= MAX_PER_MIN) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  entry.count++;
  return null;
}

export async function GET(req: NextRequest) {
  // Rate limit: 10 tokens per minute per IP
  const limited = checkTokenRateLimit(req);
  if (limited) return limited;

  // Origin check: only allow same-origin requests
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  const host = req.headers.get('host') || '';
  if (origin && !origin.includes(host) && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ token: generateApiToken() });
}
