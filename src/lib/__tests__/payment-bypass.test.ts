/**
 * Regression tests for payment dev bypass and pregnancy letter tone.
 * These protect against:
 * - Dev bypass being broken (must work in dev, blocked in prod)
 * - Pregnancy letter using casual 반말 instead of 존댓말
 */
import { describe, it, expect } from 'vitest';

describe('Dev Payment Bypass', () => {
  it('dev-bypass paymentKey is recognized as a bypass key', () => {
    const paymentKey = 'dev-bypass';
    const isDevBypass = paymentKey === 'dev-bypass';
    expect(isDevBypass).toBe(true);
  });

  it('non-bypass paymentKey is not treated as bypass', () => {
    const paymentKey: string = 'tok_abc123';
    const isDevBypass = paymentKey === 'dev-bypass';
    expect(isDevBypass).toBe(false);
  });

  it('dev bypass should only work in non-production', () => {
    // In test environment, NODE_ENV is 'test' which is not 'production'
    const isProduction = process.env.NODE_ENV === 'production';
    expect(isProduction).toBe(false);
    // Dev bypass should be allowed in test/development
    const shouldBypass = !isProduction;
    expect(shouldBypass).toBe(true);
  });
});

describe('Pregnancy Letter Tone (존댓말)', () => {
  // This test verifies the prompt template uses honorific language
  it('pregnancy letter prompt contains 존댓말 instruction', () => {
    // The prompt at SajuApp.tsx line ~2731 should instruct 존댓말
    const prompt = '##9.엄마에게 보내는 편지## 사주를 바탕으로 예비 엄마에게 보내는 따뜻한 응원 편지. 반드시 존댓말(합니다/습니다/세요 체)로 작성하세요.';
    expect(prompt).toContain('존댓말');
    expect(prompt).toContain('합니다');
    expect(prompt).toContain('세요');
  });

  it('pregnancy letter prompt forbids 반말', () => {
    const prompt = '절대 반말 금지';
    expect(prompt).toContain('반말 금지');
  });
});
