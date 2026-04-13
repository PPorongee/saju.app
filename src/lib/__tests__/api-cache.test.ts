import { describe, it, expect, beforeEach } from 'vitest';
import { getCacheKey, getFromCache, setInCache, clearCache, getCacheSize } from '../api-cache';

describe('API Cache', () => {
  beforeEach(() => clearCache());

  it('returns null on cache miss', () => {
    expect(getFromCache('nonexistent')).toBeNull();
  });

  it('returns value on cache hit', () => {
    setInCache('key1', 'value1');
    expect(getFromCache('key1')).toBe('value1');
  });

  it('expires entries after TTL', async () => {
    setInCache('key2', 'value2', 1); // 1ms TTL
    await new Promise(r => setTimeout(r, 10));
    expect(getFromCache('key2')).toBeNull();
  });

  it('generates deterministic cache keys regardless of key order', () => {
    const k1 = getCacheKey({ a: 1, b: 2 });
    const k2 = getCacheKey({ b: 2, a: 1 });
    expect(k1).toBe(k2);
  });

  it('generates different keys for different input', () => {
    const k1 = getCacheKey({ name: 'Alice' });
    const k2 = getCacheKey({ name: 'Bob' });
    expect(k1).not.toBe(k2);
  });

  it('evicts oldest when exceeding max entries', () => {
    for (let i = 0; i < 501; i++) setInCache(`k${i}`, `v${i}`);
    expect(getCacheSize()).toBeLessThanOrEqual(500);
  });

  it('tracks cache size', () => {
    setInCache('a', '1');
    setInCache('b', '2');
    expect(getCacheSize()).toBe(2);
    clearCache();
    expect(getCacheSize()).toBe(0);
  });
});
