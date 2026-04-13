/**
 * Central environment variable validation.
 * Validation runs at module import time — fails fast on first API call if vars are missing.
 */

function requireEnv(name: string): string {
  const value = (process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set it in your .env.local file or Vercel environment settings.`
    );
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  const value = (process.env[name] ?? '').trim();
  return value || defaultValue;
}

// --- Server-only variables (never exposed to the browser) ---
// These throw at import time if missing; only evaluated in server contexts.

export function getDatabaseUrl(): string | undefined {
  const value = (process.env.DATABASE_URL ?? '').trim();
  if (!value) {
    console.warn(
      '[env] DATABASE_URL is not set. Database operations will be unavailable. ' +
      'Set it in .env.local or Vercel environment settings.'
    );
    return undefined;
  }
  return value;
}

export function getOpenAIApiKey(): string {
  return requireEnv('OPENAI_API_KEY').replace(/[\s\r\n]+/g, '');
}

export function getTossSecretKey(): string {
  return requireEnv('TOSS_SECRET_KEY');
}

// --- Client-safe variables (NEXT_PUBLIC_ prefix) ---

export const NEXT_PUBLIC_TOSS_CLIENT_KEY = optionalEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', '');

// --- Optional vars with defaults (used in payment-config.ts / business info) ---

export const NEXT_PUBLIC_COMPANY_NAME = optionalEnv('NEXT_PUBLIC_COMPANY_NAME', '햄찌사랑');
export const NEXT_PUBLIC_CEO_NAME = optionalEnv('NEXT_PUBLIC_CEO_NAME', '이서은');
export const NEXT_PUBLIC_BUSINESS_NUMBER = optionalEnv('NEXT_PUBLIC_BUSINESS_NUMBER', '197-56-00903');
export const NEXT_PUBLIC_SALES_NUMBER = optionalEnv('NEXT_PUBLIC_SALES_NUMBER', '');
export const NEXT_PUBLIC_ADDRESS = optionalEnv('NEXT_PUBLIC_ADDRESS', '대전광역시 유성구 어은로 57');
export const NEXT_PUBLIC_CS_PHONE = optionalEnv('NEXT_PUBLIC_CS_PHONE', '');
export const NEXT_PUBLIC_CS_EMAIL = optionalEnv('NEXT_PUBLIC_CS_EMAIL', '');
