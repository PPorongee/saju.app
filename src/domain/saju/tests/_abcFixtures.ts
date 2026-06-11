// A/B/C 공유 픽스처 (Narrative Differentiation Safety Net V1)
// .test.ts 아님 → vitest가 테스트로 수집하지 않음(헬퍼 전용).
// 컨텍스트는 neutral 동일 → 출력 차이는 오직 원국 차트에서만. GPT 호출 0.
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { buildNarrativePlans } from '../narrative/narrativePlanBuilder';
import { buildLifeSceneHints } from '../narrative/lifeSceneHintBuilder';
import { DEFAULT_NARRATIVE_DEPTH_OPTIONS } from '../narrative/narrativeTypes';
import { extractChartSignals, type ChartSignals } from '../narrative/convergenceGuard';
import type { BirthInput } from '../calendar/normalizeBirthInput';

export type SampleId = 'A' | 'B' | 'C';
export const NOW = new Date('2026-06-06T12:00:00+09:00');

const base = {
  calendarType: 'solar' as const, birthTimeConfidence: 'exact' as const, timezone: 'Asia/Seoul',
  relationshipStatus: 'unknown' as const, hasChildren: 'unknown' as const, currentConcerns: [] as any[],
};
export const SAMPLES: Record<SampleId, BirthInput> = {
  A: { ...base, gender: 'female', birthDate: '1995-06-22', birthTime: '17:30', birthPlace: '대전' },
  B: { ...base, gender: 'female', birthDate: '1995-07-06', birthTime: '11:49', birthPlace: '서울' },
  C: { ...base, gender: 'male', birthDate: '1995-05-31', birthTime: '00:30', birthPlace: '경기' },
};

export function gptOf(id: SampleId): any {
  return calculateAnalysisOnly(SAMPLES[id], NOW, { forceAttachDiagnostic: true });
}
export function plansOf(id: SampleId): any[] {
  const gpt = gptOf(id);
  const hints = buildLifeSceneHints(gpt);
  return buildNarrativePlans(gpt, hints, { includeFutureFlow: false, depthOptions: DEFAULT_NARRATIVE_DEPTH_OPTIONS }) as any[];
}
export function signalsOf(id: SampleId): ChartSignals {
  return extractChartSignals(gptOf(id));
}

export interface CoreSummary {
  dayMaster: string; level: string; dominantTenGod: string;
  stars: Set<string>; usefulPrimary: string; age: number;
}
export function coreOf(id: SampleId): CoreSummary {
  const gpt = gptOf(id);
  const core: any = gpt.coreAnalysis ?? {};
  const totals: Record<string, number> = core.tenGods?.totals ?? {};
  const dominantTenGod = Object.entries(totals)
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? '';
  return {
    dayMaster: gpt.birthChart?.dayMaster ?? '',
    level: core.dayMasterStrength?.level ?? '',
    dominantTenGod,
    stars: new Set<string>((core.specialStars ?? []).map((s: any) => String(s?.name ?? s))),
    usefulPrimary: core.usefulGod?.primaryUseful?.value ?? core.usefulGod?.primary?.value ?? '',
    age: gpt.userContext?.age,
  };
}

const sec = (plans: any[], sectionId: string) => plans.find(p => p.sectionId === sectionId);

/** 섹션 mustUseFacts의 plainMeaning 문자열들(강제 주입되는 "결" 문장). */
export function forcedMeanings(plans: any[], sectionId: string): string[] {
  return (sec(plans, sectionId)?.mustUseFacts ?? []).map((f: any) => String(f.plainMeaning ?? ''));
}
/** 섹션 mustUseFacts 전체 텍스트(fact+plainMeaning+matchTokens) 합본. */
export function sectionForcedText(plans: any[], sectionId: string): string {
  const facts = sec(plans, sectionId)?.mustUseFacts ?? [];
  return facts.map((f: any) =>
    [f.fact, f.plainMeaning, ...(f.matchTokens ?? [])].join(' ')).join(' \n ');
}
/** plan 전체(모든 섹션 mustUseFacts) 합본 텍스트. */
export function allForcedText(plans: any[]): string {
  return plans.map(p => sectionForcedText(plans, p.sectionId)).join(' \n ');
}
/** 섹션 styleExamples.goodExample(GOLD) 텍스트. */
export function goldText(plans: any[], sectionId: string): string {
  return String(sec(plans, sectionId)?.styleExamples?.goodExample ?? '');
}
