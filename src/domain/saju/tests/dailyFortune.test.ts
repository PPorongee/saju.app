// Daily Fortune V1 — 빌더/검증/안전성 테스트 (spec §12).

import { describe, it, expect } from 'vitest';
import { buildDailyFortune, todayInSeoul } from '../daily/buildDailyFortune';
import { validateDailyFortune } from '../daily/dailyFortuneValidator';
import type { BirthInput } from '../calendar/normalizeBirthInput';
import type { DailyFlowLabel, DailyFortuneV1 } from '../daily/dailyFortuneTypes';

const BIRTH: BirthInput = {
  name: '테스트',
  gender: 'male',
  calendarType: 'solar',
  birthDate: '1990-05-15',
  birthTime: '10:30',
  birthTimeConfidence: 'exact',
  timezone: 'Asia/Seoul',
};

const FLOW_LABELS: DailyFlowLabel[] = [
  '흐름 좋음', '정리 필요한 날', '무리 금지', '관계 조심',
  '돈 관리 유리', '움직이면 풀리는 날', '집중력 좋은 날', '속도 조절',
];

/** 2026년 한 달치 날짜 풀 (커버리지·중복확인용). */
function monthDates(ym: string): string[] {
  return Array.from({ length: 28 }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
}

function visibleText(r: DailyFortuneV1): string[] {
  const out = [r.summary.headline, r.summary.shortMessage];
  r.goodFor.forEach(g => out.push(g.label, g.reason));
  r.caution.forEach(c => out.push(c.label, c.reason));
  [r.points.work, r.points.money, r.points.relationship].forEach(p => out.push(p.label, p.message));
  r.luck.items.forEach(it => out.push(it.label, it.reason));
  out.push(...r.luck.colors, ...r.luck.places, ...r.luck.routines);
  return out;
}

describe('daily fortune — 일진/결정론', () => {
  it('고정 targetDate → 안정적 일진/십성 (golden)', () => {
    const r = buildDailyFortune({ birth: BIRTH, targetDate: '2026-06-23' });
    expect(r.meta.dayStemBranch).toBe('무진');
    expect(r.meta.userDayMaster).toBe('경');
    expect(r.meta.dayTenGod).toBe('편인');
    expect(r.meta.date).toBe('2026-06-23');
    expect(r.meta.timezone).toBe('Asia/Seoul');
    expect(r.meta.version).toBe('daily-fortune-v1');
  });

  it('같은 입력 + 같은 날짜 → 완전히 동일한 결과 (deterministic)', () => {
    const a = buildDailyFortune({ birth: BIRTH, targetDate: '2026-06-23' });
    const b = buildDailyFortune({ birth: BIRTH, targetDate: '2026-06-23' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('targetDate가 바뀌면 결과가 바뀐다 (인접일 차별화)', () => {
    const d1 = buildDailyFortune({ birth: BIRTH, targetDate: '2026-06-23' });
    const d2 = buildDailyFortune({ birth: BIRTH, targetDate: '2026-06-24' });
    expect(d1.meta.dayStemBranch).not.toBe(d2.meta.dayStemBranch);
    expect(d1.meta.dayTenGod).not.toBe(d2.meta.dayTenGod);
    // 본문(goodFor)도 달라야 함
    expect(d1.goodFor.map(g => g.label).join()).not.toBe(d2.goodFor.map(g => g.label).join());
  });

  it('한 달 연속 — 어떤 인접 두 날도 본문이 동일하지 않다', () => {
    const reports = monthDates('2026-06').map(t => buildDailyFortune({ birth: BIRTH, targetDate: t }));
    for (let i = 1; i < reports.length; i++) {
      const prev = reports[i - 1].goodFor.map(g => g.label).join('|');
      const cur = reports[i].goodFor.map(g => g.label).join('|');
      expect(cur).not.toBe(prev);
    }
  });

  it('todayInSeoul은 YYYY-MM-DD 포맷', () => {
    expect(todayInSeoul(new Date('2026-06-23T20:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('daily fortune — birthTime 정책', () => {
  it('birthTime unknown이어도 결과 생성 + valid', () => {
    const r = buildDailyFortune({
      birth: { gender: 'female', calendarType: 'solar', birthDate: '1995-11-02', birthTimeConfidence: 'unknown', timezone: 'Asia/Seoul' },
      targetDate: '2026-06-23',
    });
    expect(FLOW_LABELS).toContain(r.summary.flowLabel);
    expect(r.validation.isValid).toBe(true);
  });

  it('exact / approximate 모두 생성 가능', () => {
    for (const conf of ['exact', 'approximate'] as const) {
      const r = buildDailyFortune({
        birth: { ...BIRTH, birthTimeConfidence: conf },
        targetDate: '2026-06-23',
      });
      expect(r.validation.isValid).toBe(true);
    }
  });
});

describe('daily fortune — evidence 필수', () => {
  it('모든 visible item에 존재하는 evidenceId가 1개 이상', () => {
    for (const t of monthDates('2026-06')) {
      const r = buildDailyFortune({ birth: BIRTH, targetDate: t });
      const ids = new Set(r.evidence.map(e => e.id));
      const checkAll = (refs: string[]) => {
        expect(refs.length).toBeGreaterThan(0);
        refs.forEach(id => expect(ids.has(id)).toBe(true));
      };
      r.goodFor.forEach(g => checkAll(g.evidenceIds));
      r.caution.forEach(c => checkAll(c.evidenceIds));
      checkAll(r.points.work.evidenceIds);
      checkAll(r.points.money.evidenceIds);
      checkAll(r.points.relationship.evidenceIds);
      r.luck.items.forEach(it => checkAll(it.evidenceIds));
    }
  });
});

describe('daily fortune — generic phrase guard (§12.4)', () => {
  const BANNED = ['신중함이 필요', '소통을 잘하세요', '감정을 조절', '계획적으로 움직이세요', '긍정적으로 생각', '좋은 일이 생길 것'];
  it('본문에 일반론 표현이 없다 (여러 날짜)', () => {
    for (const t of monthDates('2026-06')) {
      const r = buildDailyFortune({ birth: BIRTH, targetDate: t });
      for (const text of visibleText(r)) {
        for (const bad of BANNED) expect(text.includes(bad)).toBe(false);
      }
      expect(r.validation.isValid).toBe(true);
    }
  });

  it('validator는 주입된 일반론을 잡아낸다', () => {
    const r = buildDailyFortune({ birth: BIRTH, targetDate: '2026-06-23' });
    r.summary.shortMessage = '오늘은 신중함이 필요합니다.';
    const v = validateDailyFortune(r);
    expect(v.isValid).toBe(false);
    expect(v.issues.some(i => i.startsWith('generic-phrase'))).toBe(true);
  });
});

describe('daily fortune — safety (§12.5)', () => {
  const UNSAFE = ['대박', '무조건', '반드시'];
  it('본문에 보장형 표현이 없다 (여러 날짜)', () => {
    for (const t of monthDates('2026-06')) {
      const r = buildDailyFortune({ birth: BIRTH, targetDate: t });
      for (const text of visibleText(r)) {
        for (const bad of UNSAFE) expect(text.includes(bad)).toBe(false);
      }
    }
  });

  it('validator는 주입된 보장형 표현을 잡아낸다', () => {
    const r = buildDailyFortune({ birth: BIRTH, targetDate: '2026-06-23' });
    r.goodFor[0].label = '오늘은 무조건 대박나는 투자';
    const v = validateDailyFortune(r);
    expect(v.isValid).toBe(false);
    expect(v.issues.some(i => i.startsWith('unsafe-claim'))).toBe(true);
  });
});

describe('daily fortune — 영어(en) 출력', () => {
  it('lang=en이면 본문이 영어, flowLabel은 한글 enum 유지', () => {
    const ko = buildDailyFortune({ birth: BIRTH, targetDate: '2026-06-23' });
    const en = buildDailyFortune({ birth: BIRTH, targetDate: '2026-06-23', lang: 'en' });
    // flowLabel(키)은 양쪽 동일한 한글 enum
    expect(en.summary.flowLabel).toBe(ko.summary.flowLabel);
    expect(FLOW_LABELS).toContain(en.summary.flowLabel);
    // 표시 텍스트는 달라야(번역)
    expect(en.summary.headline).not.toBe(ko.summary.headline);
    // 영어 본문엔 한글이 없어야 함 (헤드라인/포인트)
    expect(/[가-힣]/.test(en.summary.headline)).toBe(false);
    expect(/[가-힣]/.test(en.points.work.message)).toBe(false);
    // 결정론 + 유효성 유지
    expect(en.validation.isValid).toBe(true);
    expect(JSON.stringify(en)).toBe(JSON.stringify(buildDailyFortune({ birth: BIRTH, targetDate: '2026-06-23', lang: 'en' })));
  });
});

describe('daily fortune — flowLabel', () => {
  it('flowLabel은 항상 8종 enum 중 하나', () => {
    const seen = new Set<string>();
    // 여러 사주 × 여러 날짜로 다양한 라벨 커버
    const births: BirthInput[] = [
      BIRTH,
      { gender: 'female', calendarType: 'solar', birthDate: '1988-02-20', birthTime: '04:10', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
      { gender: 'male', calendarType: 'lunar', birthDate: '2001-07-07', birthTimeConfidence: 'unknown', timezone: 'Asia/Seoul' },
    ];
    for (const b of births) {
      for (const t of monthDates('2026-06')) {
        const r = buildDailyFortune({ birth: b, targetDate: t });
        expect(FLOW_LABELS).toContain(r.summary.flowLabel);
        seen.add(r.summary.flowLabel);
      }
    }
    // 다양성 — 최소 3종 이상 라벨이 등장해야 매핑이 살아있다고 본다
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});
