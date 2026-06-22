// Paid Report Productization V1 — GPT MICROCOPY 렌더러.
//
// 정책(사용자 spec):
//   buildPaidReportV1이 만든 결정론 verdict/PaidVerdictItem.text를 GPT가 "다듬기만" 한다.
//   - 의미·근거(evidenceIds/evidenceMap)·구조(displayPriority/confidence/riskLevel)는 절대 불변.
//   - GPT는 wording만 바꾼다. 새 주장/사실 추가 금지.
//   - 단 한 번의 배치 GPT 호출(레이턴시 예산). 모듈별 호출 X.
//   - 다듬은 문장이 FORBIDDEN_GENERIC_PHRASES / 신약 신강결을 다시 들이면 그 필드만 결정론 원문으로 되돌린다.
//   - 적용 후 validatePaidReportV1으로 재검증: highCount>0면 해당 필드 revert 후 재검증,
//     그래도 high면 원본 리포트를 그대로 반환.
//   - callGpt가 throw하거나 JSON 파싱 실패면 원본을 microcopyApplied=false로 반환. 절대 throw 안 함.

import type { GptCaller } from '../generatePersonalSajuReport';
import type {
  PaidSajuReportV1,
  PaidVerdictItem,
  PaidValidationIssue,
} from './paidReportTypes';
import { validatePaidReportV1, FORBIDDEN_GENERIC_PHRASES } from './paidReportValidator';

// ============================================================
// 1. 폴리시 대상 수집 — 각 polish-target에 안정 key 부여.
//    key 컨벤션:
//      mod:<moduleId>                       — 모듈 verdict
//      item:<moduleId>:<listKey>:<idx>      — PaidVerdictItem.text
//      archetype:oneLiner / coreSummary:oneLiner
// ============================================================

interface PolishTarget {
  key: string;
  original: string;
  /** 다듬은 문장을 리포트에 다시 써넣는다. */
  apply: (report: PaidSajuReportV1, polished: string) => void;
}

/** PaidVerdictItem[] 안전 추출. */
function arr<T>(v: T[] | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

function collectTargets(report: PaidSajuReportV1): PolishTarget[] {
  const targets: PolishTarget[] = [];

  const pushModuleVerdict = (
    moduleId: string,
    get: (r: PaidSajuReportV1) => { verdict: string } | undefined,
  ) => {
    const m = get(report);
    if (!m || typeof m.verdict !== 'string' || m.verdict.trim() === '') return;
    targets.push({
      key: `mod:${moduleId}`,
      original: m.verdict,
      apply: (r, polished) => {
        const target = get(r);
        if (target) target.verdict = polished;
      },
    });
  };

  const pushItems = (
    moduleId: string,
    listKey: string,
    get: (r: PaidSajuReportV1) => PaidVerdictItem[] | undefined,
  ) => {
    arr(get(report)).forEach((item, idx) => {
      if (!item || typeof item.text !== 'string' || item.text.trim() === '') return;
      targets.push({
        key: `item:${moduleId}:${listKey}:${idx}`,
        original: item.text,
        apply: (r, polished) => {
          const list = get(r);
          if (list && list[idx]) list[idx].text = polished;
        },
      });
    });
  };

  // ── 모듈 verdict ──
  pushModuleVerdict('archetypeCard', (r) => r.archetypeCard);
  arr(report.weapons).forEach((_, i) =>
    pushModuleVerdict(`weapon-${i}`, (r) => r.weapons?.[i]),
  );
  arr(report.traps).forEach((_, i) =>
    pushModuleVerdict(`trap-${i}`, (r) => r.traps?.[i]),
  );
  pushModuleVerdict('peopleGuide', (r) => r.peopleGuide);
  pushModuleVerdict('moneyGuide', (r) => r.moneyGuide);
  pushModuleVerdict('timingGuide', (r) => r.timingGuide);
  pushModuleVerdict('luckGuide', (r) => r.luckGuide);
  pushModuleVerdict('careerGuide', (r) => r.careerGuide);
  pushModuleVerdict('relationshipGuide', (r) => r.relationshipGuide);

  // ── PaidVerdictItem.text (peopleGuide/moneyGuide/careerGuide/relationshipGuide) ──
  pushItems('peopleGuide', 'closer', (r) => r.peopleGuide?.closer);
  pushItems('peopleGuide', 'avoid', (r) => r.peopleGuide?.avoid);
  pushItems('peopleGuide', 'goodCollaborator', (r) => r.peopleGuide?.goodCollaborator);
  pushItems('peopleGuide', 'avoidPattern', (r) => r.peopleGuide?.avoidPattern);

  pushItems('moneyGuide', 'earnRoutes', (r) => r.moneyGuide?.earnRoutes);
  pushItems('moneyGuide', 'leakRoutes', (r) => r.moneyGuide?.leakRoutes);
  pushItems('moneyGuide', 'fitMonetization', (r) => r.moneyGuide?.fitMonetization);
  pushItems('moneyGuide', 'avoidMoneyStyle', (r) => r.moneyGuide?.avoidMoneyStyle);

  pushItems('careerGuide', 'avoidEnvironments', (r) => r.careerGuide?.avoidEnvironments);
  pushItems('careerGuide', 'bestWorkStyle', (r) => r.careerGuide?.bestWorkStyle);

  pushItems('relationshipGuide', 'attractionStyle', (r) => r.relationshipGuide?.attractionStyle);
  pushItems('relationshipGuide', 'relationshipPattern', (r) => r.relationshipGuide?.relationshipPattern);
  pushItems('relationshipGuide', 'whatHelps', (r) => r.relationshipGuide?.whatHelps);
  pushItems('relationshipGuide', 'whatHurts', (r) => r.relationshipGuide?.whatHurts);

  // ── oneLiner 두 개 ──
  if (typeof report.archetypeCard?.oneLiner === 'string' && report.archetypeCard.oneLiner.trim() !== '') {
    targets.push({
      key: 'archetype:oneLiner',
      original: report.archetypeCard.oneLiner,
      apply: (r, polished) => { if (r.archetypeCard) r.archetypeCard.oneLiner = polished; },
    });
  }
  if (typeof report.coreSummary?.oneLiner === 'string' && report.coreSummary.oneLiner.trim() !== '') {
    targets.push({
      key: 'coreSummary:oneLiner',
      original: report.coreSummary.oneLiner,
      apply: (r, polished) => { if (r.coreSummary) r.coreSummary.oneLiner = polished; },
    });
  }

  return targets;
}

// ============================================================
// 2. 프롬프트 빌더
// ============================================================

const SYSTEM_PROMPT = `너는 사주 상담 카피라이터다. 아래에 결정론 엔진이 만든 사주 판정 문장들이 key:문장 형태의 JSON으로 주어진다.
너의 유일한 임무는 각 문장을 더 자연스럽고 힘 있는 한국어 마이크로카피로 "다듬는" 것이다.

규칙(절대):
1. 각 문장을 자연스럽고 단단한 1~3문장 한국어로 다듬는다. 반말 톤, 사주 상담 느낌(예: "~한 결이야", "~할 때 풀려").
2. 새로운 사실/주장을 절대 추가하지 않는다. 원문의 의미와 모든 명리 용어(십성·신살·용신·기신·오행·재성 등)를 그대로 유지한다. 없던 결론을 만들지 않는다.
3. 금지 — 보장/단정 표현("대박", "반드시 ~된다", "확실히 ~된다", "보장"), 의료/투자/결혼/임신 확정, 그리고 다음 클리셰: "기준을 세워/잡", "역할을 나눠/분담", "작업 범위", "보상 기준", "혼자 (모든 것을) 감당하지 마", "겉과 속이 다른", "입체적인 사람/성향", "반전", "혼자 버티는 힘". 원문에 이런 표현이 있으면 의미를 살려 다른 말로 바꿔라.
4. 출력은 STRICT JSON 하나만. 형식: {"<key>": "<다듬은 문장>", ...}. 입력에 있던 key를 그대로 사용한다. 코드블록·설명·머리말 없이 JSON 객체만 출력한다.`;

function buildUserPrompt(targets: PolishTarget[]): string {
  const obj: Record<string, string> = {};
  for (const t of targets) obj[t.key] = t.original;
  return `다음 문장들을 규칙대로 다듬어서 같은 key의 JSON으로만 답하라.\n\n${JSON.stringify(obj, null, 2)}`;
}

// ============================================================
// 3. JSON 파싱 — 코드블록/앞뒤 잡음 허용.
// ============================================================

function parsePolishedJson(raw: string): Record<string, string> | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let text = raw.trim();
  // ```json ... ``` 또는 ``` ... ``` 코드블록 벗기기
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // 첫 { 부터 마지막 } 까지만 취함
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const slice = text.slice(first, last + 1);
  try {
    const parsed = JSON.parse(slice);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

// ============================================================
// 4. 필드 단위 수용 게이트
// ============================================================

function hasForbiddenGeneric(text: string): boolean {
  return FORBIDDEN_GENERIC_PHRASES.some((fp) => fp.pattern.test(text));
}

/** 신약/매우신약 차트에서 다시 들이면 안 되는 신강결. */
function reintroducesWeakConflict(text: string): boolean {
  return /버티는\s*힘/.test(text) || /신강/.test(text);
}

function isWeakStrength(report: PaidSajuReportV1): boolean {
  const s = (report.meta?.strength ?? '').toLowerCase();
  return s === 'weak' || s === 'very-weak' || s.includes('신약') || s.includes('매우');
}

/** 다듬은 문장이 수용 가능한지(원문 대신 쓸 수 있는지). */
function acceptPolished(polished: string | undefined, weak: boolean): boolean {
  if (typeof polished !== 'string') return false;
  const trimmed = polished.trim();
  if (trimmed === '') return false;
  if (hasForbiddenGeneric(trimmed)) return false;
  if (weak && reintroducesWeakConflict(trimmed)) return false;
  return true;
}

// ============================================================
// 5. 메인 렌더러
// ============================================================

/** validation을 제외한 리포트 본문을 깊은 복사(구조만 바뀌므로 JSON clone으로 충분). */
function cloneReport(report: PaidSajuReportV1): PaidSajuReportV1 {
  return JSON.parse(JSON.stringify(report)) as PaidSajuReportV1;
}

export async function renderPaidMicrocopy(
  report: PaidSajuReportV1,
  callGpt: GptCaller,
): Promise<PaidSajuReportV1> {
  const targets = collectTargets(report);

  // 폴리시할 게 없으면 microcopyApplied=false 원본 그대로.
  if (targets.length === 0) {
    return { ...report, meta: { ...report.meta, microcopyApplied: false } };
  }

  // ── GPT 단일 호출 (robust) ──
  let raw: string;
  try {
    raw = await callGpt({ system: SYSTEM_PROMPT, user: buildUserPrompt(targets) });
  } catch {
    return { ...report, meta: { ...report.meta, microcopyApplied: false } };
  }

  const polishedMap = parsePolishedJson(raw);
  if (!polishedMap) {
    return { ...report, meta: { ...report.meta, microcopyApplied: false } };
  }

  const weak = isWeakStrength(report);

  // ── 필드별 수용 판정 후 적용 ──
  const working = cloneReport(report);
  const appliedKeys = new Set<string>();
  for (const t of targets) {
    const polished = polishedMap[t.key];
    if (acceptPolished(polished, weak)) {
      t.apply(working, polished.trim());
      appliedKeys.add(t.key);
    }
  }

  // 적용된 게 없으면 원본 그대로(microcopyApplied=false).
  if (appliedKeys.size === 0) {
    return { ...report, meta: { ...report.meta, microcopyApplied: false } };
  }

  // ── 재검증 + revert 루프 ──
  const { validation: _omit, ...workingBody } = working;
  let validation = validatePaidReportV1(workingBody);

  if (validation.highCount > 0) {
    // high 이슈가 가리키는 텍스트와 일치하는 적용 필드를 결정론 원문으로 되돌린다.
    const offendingTexts = new Set(
      validation.issues
        .filter((iss: PaidValidationIssue) => iss.severity === 'high')
        .map((iss) => iss.text),
    );
    for (const t of targets) {
      if (!appliedKeys.has(t.key)) continue;
      const polished = polishedMap[t.key]?.trim() ?? '';
      if (offendingTexts.has(polished)) {
        t.apply(working, t.original); // 결정론 원문 복구
        appliedKeys.delete(t.key);
      }
    }
    const { validation: _omit2, ...revertedBody } = working;
    validation = validatePaidReportV1(revertedBody);

    // revert 후에도 high면 원본 리포트를 그대로 반환(절대 high를 노출하지 않는다).
    if (validation.highCount > 0) {
      return { ...report, meta: { ...report.meta, microcopyApplied: false } };
    }
  }

  // revert로 모든 polish가 사라졌으면 적용 안 한 것으로 처리.
  const microcopyApplied = appliedKeys.size > 0;

  return {
    ...working,
    meta: { ...working.meta, microcopyApplied },
    validation,
  };
}
