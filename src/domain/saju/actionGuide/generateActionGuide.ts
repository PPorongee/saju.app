// All-mode Action Guide V1 — 생성 오케스트레이터.
//
// 단일 GPT 호출로 ActionGuide를 만든다. 실패해도 메인 리포트를 깨지 않도록 null을 반환한다.
//   - 입력: evidence + 정규화된 텍스트 caller(system,user,maxTokens) + 모드별 sanitizer.
//   - 출력: ActionGuide | null (null이면 호출부에서 actionGuideV1 미부착 → byte-identical).
//   - 모든 문자열 필드는 모드별 sanitizer를 통과시켜 안전 표현으로 정리.

import { buildActionGuidePrompt } from './actionGuidePromptBuilder';
// 모드별 sanitizer가 의료/공포/단정을 모두 커버하지 못하는 경우(개인/궁합)를 대비한 공통 안전 스크럽.
// 올해운세에서 검증된 순수 sanitizer를 재사용 (모든 모드 출력에 한 번 더 적용 — defense in depth).
import { sanitizeDeterministicFuture, sanitizeMedicalAdvice, sanitizeFearBased } from '../yearly/yearlySanitizer';
import type {
  ActionGuide, ActionGuideEvidence, ActionGuideDomainFlow,
  ActionGuideDecisionGuide, ActionGuideRemedyRoutines, ActionGuidePartnerNotes,
} from './actionGuideTypes';

/** 모드 generator가 자기 callGpt를 감싸 넘기는 정규화 caller. */
export type ActionGuideTextCaller = (system: string, user: string, maxTokens: number) => Promise<string>;

export interface GenerateActionGuideOptions {
  /** 모드별 final sanitizer (영문 오행 key/금융/의료 위험 표현 정리). */
  sanitize?: (text: string) => string;
  /** 코드가 강제하는 고정 안내문 (임산부 의료 면책 등). */
  disclaimer?: string;
}

// ── robust JSON 파서 (섹션 파서와 동일 정책) ──
function parseJson(raw: string): any | null {
  if (!raw) return null;
  const s = raw.trim().replace(/```(?:json)?/gi, '').trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}

export async function generateActionGuide(
  ev: ActionGuideEvidence,
  callText: ActionGuideTextCaller,
  opts: GenerateActionGuideOptions = {},
): Promise<ActionGuide | null> {
  const sanitize = opts.sanitize ?? ((t: string) => t);
  // 공통 안전 스크럽: 단정 미래 → 의료 → 공포 표현을 모든 모드 출력에 적용 (모드 sanitizer 위에 한 번 더).
  const safetyScrub = (t: string) => sanitizeFearBased(sanitizeMedicalAdvice(sanitizeDeterministicFuture(t)));
  const s = (v: any): string => (typeof v === 'string' && v.trim() ? safetyScrub(sanitize(v)).trim() : '');
  const sArr = (v: any): string[] =>
    (Array.isArray(v) ? v : []).map(s).filter(Boolean);

  const prompt = buildActionGuidePrompt(ev);
  let raw = '';
  try {
    raw = await callText(prompt.system, prompt.user, prompt.maxTokens);
  } catch {
    return null;
  }
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== 'object') return null;

  const overview = s(parsed.overview);
  const immediateActions = sArr(parsed.immediateActions);
  // 최소 품질 게이트 — overview + 즉시 행동이 비면 부착하지 않는다.
  if (!overview || immediateActions.length === 0) return null;

  const domainFlows: ActionGuideDomainFlow[] = (Array.isArray(parsed.domainFlows) ? parsed.domainFlows : [])
    .map((d: any) => ({
      domain: s(d?.domain),
      flow: s(d?.flow),
      opportunity: s(d?.opportunity),
      caution: s(d?.caution),
      suggestedAction: s(d?.suggestedAction),
    }))
    .filter((d: ActionGuideDomainFlow) => d.domain || d.flow);

  let decisionGuide: ActionGuideDecisionGuide | undefined;
  if (parsed.decisionGuide && typeof parsed.decisionGuide === 'object') {
    const dg = parsed.decisionGuide;
    decisionGuide = {
      goodFor: sArr(dg.goodFor),
      beCarefulWith: sArr(dg.beCarefulWith),
      postponeOrScaleDown: sArr(dg.postponeOrScaleDown),
      checklist: sArr(dg.checklist),
    };
  }

  let remedyRoutines: ActionGuideRemedyRoutines | undefined;
  if (parsed.remedyRoutines && typeof parsed.remedyRoutines === 'object') {
    const rr = parsed.remedyRoutines;
    remedyRoutines = {
      daily: sArr(rr.daily),
      weekly: sArr(rr.weekly),
      avoidPatterns: sArr(rr.avoidPatterns),
    };
    const monthly = sArr(rr.monthly);
    if (monthly.length) remedyRoutines.monthly = monthly;
    const environment = sArr(rr.environment);
    if (environment.length) remedyRoutines.environment = environment;
  }

  let partnerNotes: ActionGuidePartnerNotes | undefined;
  if (ev.mode === 'compat' && parsed.partnerNotes && typeof parsed.partnerNotes === 'object') {
    const pn = parsed.partnerNotes;
    const aAdvice = s(pn.aAdvice);
    const bAdvice = s(pn.bAdvice);
    const together = sArr(pn.together);
    partnerNotes = {};
    if (aAdvice) partnerNotes.aAdvice = aAdvice;
    if (bAdvice) partnerNotes.bAdvice = bAdvice;
    if (together.length) partnerNotes.together = together;
    if (!aAdvice && !bAdvice && !together.length) partnerNotes = undefined;
  }

  const guide: ActionGuide = {
    mode: ev.mode,
    title: s(parsed.title) || defaultTitle(ev.mode),
    overview,
    immediateActions,
  };
  if (domainFlows.length) guide.domainFlows = domainFlows;
  if (decisionGuide) guide.decisionGuide = decisionGuide;
  if (remedyRoutines) guide.remedyRoutines = remedyRoutines;
  if (partnerNotes) guide.partnerNotes = partnerNotes;
  if (opts.disclaimer) guide.disclaimer = opts.disclaimer;

  // 임산부: 출력에 출산 시기/택일/건강·성별 예측 결이 남아 있으면 통째로 폐기(null) — 부착 안 함.
  // (메인 리포트 validator가 actionGuideV1을 검사하지 않으므로 여기서 belt-and-suspenders.)
  if (ev.mode === 'pregnancy') {
    const serialized = JSON.stringify(guide);
    if (/출산일|출산\s*시간|택일|순산|난산|조산|유산|성별|남아|여아/.test(serialized)) {
      return null;
    }
  }

  return guide;
}

function defaultTitle(mode: ActionGuideEvidence['mode']): string {
  switch (mode) {
    case 'personal': return '지금 운을 쓰는 법';
    case 'yearly': return '올해 운을 쓰는 법';
    case 'compat': return '이 관계를 좋게 쓰는 법';
    case 'pregnancy': return '엄마가 편안해지는 생활 가이드';
  }
}
