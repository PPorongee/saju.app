import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../saju-v4/daily-fortune/route';

function makeRequest(body: unknown, raw = false): Request {
  return new Request('http://localhost/api/saju-v4/daily-fortune', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

const VALID_BODY = {
  birthDate: '1990-05-15',
  birthTime: '10:30',
  birthTimeConfidence: 'exact',
  gender: 'male',
  calendarType: 'solar',
  targetDate: '2026-06-23',
};

const prev = process.env.SAJU_DAILY_FORTUNE_ENABLED;
afterEach(() => { process.env.SAJU_DAILY_FORTUNE_ENABLED = prev; });

describe('/api/saju-v4/daily-fortune', () => {
  it('flag OFF → 503 daily_fortune_disabled', async () => {
    delete process.env.SAJU_DAILY_FORTUNE_ENABLED;
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('daily_fortune_disabled');
  });

  describe('flag ON', () => {
    beforeEach(() => { process.env.SAJU_DAILY_FORTUNE_ENABLED = 'true'; });

    it('정상 body → 200 + ok:true + dailyFortune', async () => {
      const res = await POST(makeRequest(VALID_BODY));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.dailyFortune.meta.version).toBe('daily-fortune-v1');
      expect(json.dailyFortune.meta.dayStemBranch).toBe('무진');
      expect(json.dailyFortune.validation.isValid).toBe(true);
    });

    it('birthDate 누락/형식오류 → 400 invalid_input', async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, birthDate: 'nope' }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('invalid_input');
    });

    it('비-JSON body → 400 invalid_json', async () => {
      const res = await POST(makeRequest('{not json', true));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('invalid_json');
    });

    it('birthTime 없이 unknown confidence도 200', async () => {
      const res = await POST(makeRequest({ birthDate: '1995-11-02', birthTimeConfidence: 'unknown', calendarType: 'solar', gender: 'female', targetDate: '2026-06-23' }));
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });
  });
});
