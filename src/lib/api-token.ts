import 'server-only';
import crypto from 'crypto';

const SECRET = process.env.API_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function generateApiToken(): string {
  const timestamp = Date.now().toString();
  const hmac = crypto.createHmac('sha256', SECRET).update(timestamp).digest('hex');
  return `${timestamp}.${hmac}`;
}

export function validateApiToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [timestamp, providedHmac] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() - ts > TOKEN_TTL_MS) return false;
  const expectedHmac = crypto.createHmac('sha256', SECRET).update(timestamp).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  } catch {
    return false;
  }
}

/** In dev mode with free preview enabled, skip token validation.
 * Uses server-only ENABLE_FREE_PREVIEW (preferred) with NEXT_PUBLIC_ fallback. */
export function shouldSkipTokenValidation(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.ENABLE_FREE_PREVIEW === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_FREE_PREVIEW === 'true';
}
