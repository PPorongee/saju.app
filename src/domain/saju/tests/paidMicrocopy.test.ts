// Paid Report Productization V1 — GPT MICROCOPY 렌더러 회귀 테스트.
//
// 정책(절대): 실제 GPT/OpenAI를 호출하지 않는다. MOCK GptCaller만 사용.
// base 리포트는 calculateAnalysisOnly + buildPaidReportV1로 결정론 생성.
//
// 검증:
//   1. happy path — 유효 polished JSON → 구조/evidenceIds/evidenceMap 불변, text 갱신,
//      microcopyApplied true, validation.highCount 0.
//   2. forbidden-phrase 주입 — 그 필드만 결정론 원문으로 revert, 최종 forbidden 없음, highCount 0.
//   3. weak-chart guard — very-weak 차트에 "혼자 버티는 힘" 주입 → revert, accuracy-conflict 없음.
//   4. throw → fallback — 원본 반환, microcopyApplied false, deterministic과 deep-equal(meta flag 제외).
//   5. malformed JSON → fallback.

import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly, type GptCaller } from '../generatePersonalSajuReport';
import { buildPaidReportV1 } from '../paidReport/buildPaidReportV1';
import { renderPaidMicrocopy } from '../paidReport/renderPaidMicrocopy';
import { validatePaidReportV1 } from '../paidReport/paidReportValidator';
import type { BirthInput } from '../calendar/normalizeBirthInput';
import type { PaidSajuReportV1 } from '../paidReport/paidReportTypes';

const NOW = new Date('2026-06-06T12:00:00+09:00');

// sample A — female 1995-06-22 17:30 exact 대전
const SAMPLE_A: BirthInput = {
  gender: 'female',
  calendarType: 'solar',
  birthDate: '1995-06-22',
  birthTime: '17:30',
  birthTimeConfidence: 'exact',
  birthPlace: '대전',
  timezone: 'Asia/Seoul',
};

// sample C — male 1995-05-31 00:30 approximate 경기 (very-weak 기대)
const SAMPLE_C: BirthInput = {
  gender: 'male',
  calendarType: 'solar',
  birthDate: '1995-05-31',
  birthTime: '00:30',
  birthTimeConfidence: 'approximate',
  birthPlace: '경기',
  timezone: 'Asia/Seoul',
};

function buildBase(input: BirthInput): PaidSajuReportV1 {
  const gptInput = calculateAnalysisOnly(input, NOW);
  return buildPaidReportV1(gptInput);
}

/** 리포트에서 (key→original text) 형태로 polish 대상을 똑같이 모은다(테스트용 mirror). */
function collectKeyedOriginals(report: PaidSajuReportV1): Record<string, string> {
  const out: Record<string, string> = {};
  const pushMod = (id: string, verdict?: string) => {
    if (verdict && verdict.trim()) out[`mod:${id}`] = verdict;
  };
  const pushItems = (id: string, listKey: string, list?: { text: string }[]) => {
    (list ?? []).forEach((it, idx) => {
      if (it && typeof it.text === 'string' && it.text.trim()) {
        out[`item:${id}:${listKey}:${idx}`] = it.text;
      }
    });
  };

  pushMod('archetypeCard', report.archetypeCard?.verdict);
  (report.weapons ?? []).forEach((w, i) => pushMod(`weapon-${i}`, w.verdict));
  (report.traps ?? []).forEach((t, i) => pushMod(`trap-${i}`, t.verdict));
  pushMod('peopleGuide', report.peopleGuide?.verdict);
  pushMod('moneyGuide', report.moneyGuide?.verdict);
  pushMod('timingGuide', report.timingGuide?.verdict);
  pushMod('luckGuide', report.luckGuide?.verdict);
  pushMod('careerGuide', report.careerGuide?.verdict);
  pushMod('relationshipGuide', report.relationshipGuide?.verdict);

  const pg = report.peopleGuide;
  pushItems('peopleGuide', 'closer', pg?.closer);
  pushItems('peopleGuide', 'avoid', pg?.avoid);
  pushItems('peopleGuide', 'goodCollaborator', pg?.goodCollaborator);
  pushItems('peopleGuide', 'avoidPattern', pg?.avoidPattern);

  const mg = report.moneyGuide;
  pushItems('moneyGuide', 'earnRoutes', mg?.earnRoutes);
  pushItems('moneyGuide', 'leakRoutes', mg?.leakRoutes);
  pushItems('moneyGuide', 'fitMonetization', mg?.fitMonetization);
  pushItems('moneyGuide', 'avoidMoneyStyle', mg?.avoidMoneyStyle);

  const cg = report.careerGuide;
  pushItems('careerGuide', 'avoidEnvironments', cg?.avoidEnvironments);
  pushItems('careerGuide', 'bestWorkStyle', cg?.bestWorkStyle);

  const rg = report.relationshipGuide;
  pushItems('relationshipGuide', 'attractionStyle', rg?.attractionStyle);
  pushItems('relationshipGuide', 'relationshipPattern', rg?.relationshipPattern);
  pushItems('relationshipGuide', 'whatHelps', rg?.whatHelps);
  pushItems('relationshipGuide', 'whatHurts', rg?.whatHurts);

  if (report.archetypeCard?.oneLiner?.trim()) out['archetype:oneLiner'] = report.archetypeCard.oneLiner;
  if (report.coreSummary?.oneLiner?.trim()) out['coreSummary:oneLiner'] = report.coreSummary.oneLiner;

  return out;
}

/** 모든 polish 대상을 "다듬은" 버전으로 바꾸되 의미는 보존(테스트용 단순 변형). */
function makeValidPolishedJson(report: PaidSajuReportV1): string {
  const originals = collectKeyedOriginals(report);
  const polished: Record<string, string> = {};
  for (const [k, v] of Object.entries(originals)) {
    // forbidden/충돌 단어를 새로 넣지 않는 안전한 변형: 종결을 다듬은 느낌으로.
    polished[k] = `${v} (다듬음)`;
  }
  return JSON.stringify(polished);
}

describe('renderPaidMicrocopy — 단일 GPT 호출 + 안전 폴리시', () => {
  it('1. happy path — text 갱신, 구조/evidenceIds/evidenceMap 불변, microcopyApplied true, highCount 0', async () => {
    const base = buildBase(SAMPLE_A);
    let calls = 0;
    const caller: GptCaller = async () => {
      calls++;
      return makeValidPolishedJson(base);
    };

    const out = await renderPaidMicrocopy(base, caller);

    // 단일 호출
    expect(calls).toBe(1);

    // microcopy 적용
    expect(out.meta.microcopyApplied).toBe(true);
    expect(out.validation.highCount).toBe(0);

    // text가 실제로 다듬어졌다 (archetype verdict 기준)
    expect(out.archetypeCard.verdict).not.toBe(base.archetypeCard.verdict);
    expect(out.archetypeCard.verdict).toContain('다듬음');

    // 구조/근거 불변: evidenceMap deep-equal
    expect(out.evidenceMap).toEqual(base.evidenceMap);
    // 모듈 evidenceIds / displayPriority / confidence / riskLevel 불변
    expect(out.archetypeCard.evidenceIds).toEqual(base.archetypeCard.evidenceIds);
    expect(out.moneyGuide.displayPriority).toBe(base.moneyGuide.displayPriority);
    expect(out.careerGuide.confidence).toBe(base.careerGuide.confidence);
    expect(out.timingGuide.riskLevel).toBe(base.timingGuide.riskLevel);
    // item evidenceIds 불변
    base.moneyGuide.earnRoutes.forEach((it, i) => {
      expect(out.moneyGuide.earnRoutes[i].evidenceIds).toEqual(it.evidenceIds);
    });
    // base는 애초에 valid 했어야 함
    expect(base.validation.highCount).toBe(0);
  });

  it('2. forbidden-phrase 주입 — 그 필드만 결정론 원문으로 revert, forbidden 없음, highCount 0', async () => {
    const base = buildBase(SAMPLE_A);
    const originals = collectKeyedOriginals(base);
    // 첫 모듈 verdict key 하나를 고른다.
    const targetKey = Object.keys(originals).find((k) => k.startsWith('mod:'))!;
    expect(targetKey).toBeTruthy();

    const caller: GptCaller = async () => {
      const polished: Record<string, string> = {};
      for (const [k, v] of Object.entries(originals)) polished[k] = `${v} (다듬음)`;
      // forbidden generic phrase 주입
      polished[targetKey] = '기준을 세워라. 그러면 흐름이 풀린다.';
      return JSON.stringify(polished);
    };

    const out = await renderPaidMicrocopy(base, caller);

    // 주입 필드는 결정론 원문으로 복구 (forbidden phrase 미수용)
    const originalVerdict = originals[targetKey];
    const moduleId = targetKey.slice('mod:'.length);
    const restored = findModuleVerdict(out, moduleId);
    expect(restored).toBe(originalVerdict);
    expect(restored).not.toMatch(/기준을\s*세워/);

    // 다른 필드는 정상 다듬어짐
    expect(out.meta.microcopyApplied).toBe(true);
    expect(out.validation.highCount).toBe(0);

    // 최종 리포트 어디에도 forbidden phrase 없음 (validator forbidden-generic-phrase 0건은 medium이므로
    // 직접 텍스트 검사)
    const flat = JSON.stringify(out);
    expect(flat).not.toMatch(/기준을\\?s\*세워/);
    expect(flat.includes('기준을 세워')).toBe(false);
  });

  it('3. weak-chart guard — very-weak 차트에 "혼자 버티는 힘" 주입 → revert, accuracy-conflict 없음', async () => {
    const base = buildBase(SAMPLE_C);
    // 샘플 C가 weak/very-weak인지 확인 (가드 의미가 있으려면)
    expect(['weak', 'very-weak']).toContain(base.meta.strength);

    const originals = collectKeyedOriginals(base);
    const targetKey = Object.keys(originals).find((k) => k.startsWith('mod:'))!;

    const caller: GptCaller = async () => {
      const polished: Record<string, string> = {};
      for (const [k, v] of Object.entries(originals)) polished[k] = `${v} (다듬음)`;
      // 신약 차트에 신강결 주입
      polished[targetKey] = '결국 혼자 버티는 힘으로 끝까지 간다.';
      return JSON.stringify(polished);
    };

    const out = await renderPaidMicrocopy(base, caller);

    // 주입 필드는 원문으로 복구
    const moduleId = targetKey.slice('mod:'.length);
    expect(findModuleVerdict(out, moduleId)).toBe(originals[targetKey]);

    // accuracy-conflict(신약 vs 신강결) 없음
    const { validation: _v, ...body } = out;
    const reval = validatePaidReportV1(body);
    expect(reval.highCount).toBe(0);
    expect(reval.issues.some((i) => i.type === 'accuracy-conflict')).toBe(false);
    // "혼자 버티는 힘" 텍스트가 최종 리포트에 없음
    expect(JSON.stringify(out).includes('혼자 버티는 힘')).toBe(false);
  });

  it('4. throw → fallback — 원본 반환, microcopyApplied false, deterministic과 deep-equal(meta flag 제외)', async () => {
    const base = buildBase(SAMPLE_A);
    const caller: GptCaller = async () => {
      throw new Error('OpenAI down');
    };

    const out = await renderPaidMicrocopy(base, caller);

    expect(out.meta.microcopyApplied).toBe(false);
    // meta.microcopyApplied만 다르고 나머지는 동일해야 함
    const normalize = (r: PaidSajuReportV1) => ({ ...r, meta: { ...r.meta, microcopyApplied: false } });
    expect(normalize(out)).toEqual(normalize(base));
  });

  it('5. malformed JSON → fallback — 원본 반환, microcopyApplied false', async () => {
    const base = buildBase(SAMPLE_A);
    const caller: GptCaller = async () => 'this is not json at all { broken';

    const out = await renderPaidMicrocopy(base, caller);

    expect(out.meta.microcopyApplied).toBe(false);
    const normalize = (r: PaidSajuReportV1) => ({ ...r, meta: { ...r.meta, microcopyApplied: false } });
    expect(normalize(out)).toEqual(normalize(base));
  });
});

// ───────── helpers ─────────
function findModuleVerdict(report: PaidSajuReportV1, moduleId: string): string | undefined {
  if (moduleId === 'archetypeCard') return report.archetypeCard?.verdict;
  if (moduleId === 'peopleGuide') return report.peopleGuide?.verdict;
  if (moduleId === 'moneyGuide') return report.moneyGuide?.verdict;
  if (moduleId === 'timingGuide') return report.timingGuide?.verdict;
  if (moduleId === 'luckGuide') return report.luckGuide?.verdict;
  if (moduleId === 'careerGuide') return report.careerGuide?.verdict;
  if (moduleId === 'relationshipGuide') return report.relationshipGuide?.verdict;
  const wm = moduleId.match(/^weapon-(\d+)$/);
  if (wm) return report.weapons?.[Number(wm[1])]?.verdict;
  const tm = moduleId.match(/^trap-(\d+)$/);
  if (tm) return report.traps?.[Number(tm[1])]?.verdict;
  return undefined;
}
