// markdown 응답 → ParsedReport 검증

import { describe, it, expect } from 'vitest';
import { parseSajuReport } from '@/lib/saju-v4-report-parser';

const SAMPLE = `# 전체 요약
무토 일간이 한여름에 났다. 인성왕 + 통근 + 비견으로 신강. 용신은 수(水).

# 이 사주가 평범하지 않은 이유

## 1. 결정적인 순간에 사람이 붙는 귀인 구조
귀인 본문 1
귀인 본문 2

## 2. 재능과 결과물이 돈으로 이어지는 구조
식상생재 본문

# 10가지 질문별 상세 풀이

## 1. 나는 어떤 기질을 타고났는가?
Q1 본문 — 무토 일간의 묵직함, 한여름의 인성왕.

## 2. 남들이 보는 나와 실제 내면은 어떻게 다른가?
Q2 본문 — 천간 정관·편재, 지장간 식상.

## 3. 내 인생에서 반복되는 패턴은 무엇인가?
Q3 본문.

# 앞으로 3년의 흐름

## 2026년 병오
2026 본문 — 편인 세운, 인성 추가.

## 2027년 정미
2027 본문.

## 2028년 무신
2028 본문.

# 사주를 좋게 쓰는 방법
직업·돈·관계·생활 가이드 본문.

# 마지막 한 문장
이 사주는 메마름 전에 수(水) 한 잔을 챙기는 사람이다.`;

describe('parseSajuReport', () => {
  const r = parseSajuReport(SAMPLE);

  it('summary 추출', () => {
    expect(r.summary).toContain('무토 일간');
    expect(r.summary).toContain('용신은 수');
  });

  it('평범하지 않은 이유 2개', () => {
    expect(r.specialReasons).toHaveLength(2);
    expect(r.specialReasons[0].title).toContain('귀인');
    expect(r.specialReasons[0].body).toContain('귀인 본문 1');
    expect(r.specialReasons[1].title).toContain('재능');
  });

  it('10문항 (샘플은 3개)', () => {
    expect(r.questions).toHaveLength(3);
    expect(r.questions[0].number).toBe(1);
    expect(r.questions[0].title).toContain('기질');
    expect(r.questions[0].body).toContain('무토');
  });

  it('앞 3년 흐름 3개 — 연도 헤더 매칭', () => {
    expect(r.nextThreeYears).toHaveLength(3);
    expect(r.nextThreeYears[0].title).toContain('2026');
    expect(r.nextThreeYears[0].body).toContain('편인 세운');
  });

  it('practicalGuide', () => {
    expect(r.practicalGuide).toContain('직업·돈·관계');
  });

  it('finalMessage', () => {
    expect(r.finalMessage).toContain('메마름 전에');
  });

  it('알 수 없는 헤더가 있어도 깨지지 않음', () => {
    const weird = SAMPLE + '\n\n# 알 수 없는 섹션\n잡담';
    const r2 = parseSajuReport(weird);
    expect(r2.summary).toBeTruthy();
  });
});
