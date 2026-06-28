/**
 * sanitizeUnsupportedUserContext — 자녀 단정 치환의 합성어 false-positive 회귀 가드.
 * "받아들이는"의 "아들"이 자녀 표현으로 오치환되던 버그(2026-06) 방지.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeUnsupportedUserContext } from '@/domain/saju/narrative/narrativeSanitizer';

const NO_KIDS = { relationshipStatus: 'single', hasChildren: 'unknown' as const };

describe('sanitizeUnsupportedUserContext 합성어 false-positive', () => {
  it('"받아들이는"을 깨뜨리지 않는다', () => {
    const out = sanitizeUnsupportedUserContext('당신은 책임을 기꺼이 받아들이는 사람이에요.', NO_KIDS);
    expect(out).toContain('받아들이는');
    expect(out).not.toContain('돌봄이 필요한 대상');
  });

  it('"얻어들이고", "물려받아들" 같은 합성어도 안전', () => {
    const out = sanitizeUnsupportedUserContext('조언을 얻어들이고 결정을 받아들였어요.', NO_KIDS);
    expect(out).toContain('받아들');
    expect(out).not.toContain('돌봄이 필요한 대상');
  });

  it('진짜 "아들이/딸이/자녀가"는 여전히 중립 치환된다', () => {
    const out = sanitizeUnsupportedUserContext('내 아들이 자랑스럽고, 딸은 영리하며, 자녀가 둘이에요.', NO_KIDS);
    expect(out).not.toContain('아들이');
    expect(out).toContain('돌봄이 필요한 대상');
  });
});
