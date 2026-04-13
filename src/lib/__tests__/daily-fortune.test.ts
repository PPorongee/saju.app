import { describe, it, expect } from 'vitest';
import { getDailyFortune } from '../daily-fortune';

describe('Daily Fortune', () => {
  it('returns deterministic fortune for same day', () => {
    const f1 = getDailyFortune('ko');
    const f2 = getDailyFortune('ko');
    expect(f1).toEqual(f2);
  });

  it('includes all required fields', () => {
    const f = getDailyFortune('ko');
    expect(f.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(f.dayStem).toBeTruthy();
    expect(f.dayBranch).toBeTruthy();
    expect(f.element).toBeTruthy();
    expect(f.elementIcon).toBeTruthy();
    expect(f.fortune).toBeTruthy();
    expect(f.luckyColor).toBeTruthy();
    expect(f.luckyDirection).toBeTruthy();
    expect(f.score).toBeGreaterThanOrEqual(1);
    expect(f.score).toBeLessThanOrEqual(5);
  });

  it('returns English fortune when lang=en', () => {
    const f = getDailyFortune('en');
    expect(f.fortune).toMatch(/^[A-Z]/);
  });

  it('returns Korean fortune when lang=ko', () => {
    const f = getDailyFortune('ko');
    expect(f.fortune).toMatch(/[가-힣]/);
  });

  it('is stable across 10 calls', () => {
    const results = Array.from({ length: 10 }, () => getDailyFortune('ko'));
    results.forEach(r => expect(r).toEqual(results[0]));
  });

  it('score is between 1 and 5', () => {
    const f = getDailyFortune();
    expect(f.score).toBeGreaterThanOrEqual(1);
    expect(f.score).toBeLessThanOrEqual(5);
  });
});
