import { describe, it, expect } from 'vitest';
import { generateApiToken, validateApiToken } from '../api-token';

describe('API Token (HMAC)', () => {
  it('generates a valid token', () => {
    const token = generateApiToken();
    expect(validateApiToken(token)).toBe(true);
  });

  it('rejects empty token', () => {
    expect(validateApiToken('')).toBe(false);
  });

  it('rejects malformed token (no period)', () => {
    expect(validateApiToken('noperiod')).toBe(false);
  });

  it('rejects malformed token (multiple periods)', () => {
    expect(validateApiToken('a.b.c')).toBe(false);
  });

  it('rejects expired token (timestamp 0)', () => {
    expect(validateApiToken('0.deadbeef')).toBe(false);
  });

  it('rejects tampered HMAC', () => {
    const token = generateApiToken();
    const [ts] = token.split('.');
    expect(validateApiToken(`${ts}.0000000000000000000000000000000000000000000000000000000000000000`)).toBe(false);
  });

  it('generates valid tokens on consecutive calls', () => {
    const t1 = generateApiToken();
    const t2 = generateApiToken();
    // Both should be independently valid
    expect(validateApiToken(t1)).toBe(true);
    expect(validateApiToken(t2)).toBe(true);
  });
});
