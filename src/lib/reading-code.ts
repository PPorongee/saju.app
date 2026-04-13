import crypto from 'crypto';

// Format: SAJU-YYYY-XXXXXXXXXX (e.g., SAJU-2026-A7K9M2B3Q5)
export function generateReadingCode(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/1/I confusion
  const bytes = crypto.randomBytes(10);
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `SAJU-${year}-${code}`;
}
