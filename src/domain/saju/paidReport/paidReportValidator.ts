// Paid Report Productization V1 — validator.
//
// 정책(사용자 spec): 사용자에게 보이는 모든 verdict는 명리 근거(evidenceIds)에 연결돼야 하고,
//   범용 코칭 클리셰·보장/단정·의료/투자/결혼/임신 확정·모듈 간 수렴·신강신약 충돌은 잡아낸다.
//
// severity 정책:
//   high   — 사용자 노출 위험 / 정확성 / 안전 (missing-evidence, evidence-id-dangling,
//            accuracy-conflict, unsafe-claim)
//   medium — 품질 (forbidden-generic-phrase, guarantee-claim, duplicate-across-modules)
//   low    — 스타일 (현재 없음 — 예약)
//
// 이 validator는 PaidSajuReportV1(단, validation 제외) 하나만 받아 자기 완결적으로 검사한다.
// gptInput / 내부 분석 스키마에 의존하지 않는다.

import type {
  PaidSajuReportV1,
  PaidReportValidation,
  PaidValidationIssue,
  PaidVerdictItem,
} from './paidReportTypes';
import { ELEMENT_KO } from '../rules/elements';
import type { Element } from '../rules/elements';
import { FAVORABLE_ELEMENT_SYMBOLS, BLOCKING_ELEMENT_ENVIRONMENTS } from './elementSymbols';

// ============================================================
// 금지 범용 문구 (forbidden generic phrases) — 단일 출처.
// 테스트 + builder가 이 배열 하나만 공유한다.
// "<오행>" 토큰은 5오행 한글로 확장하여 등록한다.
// ============================================================

interface ForbiddenPhrase {
  pattern: RegExp;
  label: string;
}

const ELEMENT_KO_VALUES = Object.values(ELEMENT_KO); // ['목','화','토','금','수']

// "<오행> 기운을 가까이 두" 류를 5오행으로 확장 (목 기운을 가까이 두 / 화 기운을 가까이 두 ...)
const ELEMENT_PROXIMITY_PHRASES: ForbiddenPhrase[] = ELEMENT_KO_VALUES.map(ko => ({
  pattern: new RegExp(`${ko}\\s*기운을\\s*가까이\\s*두`),
  label: `generic-element-proximity(${ko})`,
}));

export const FORBIDDEN_GENERIC_PHRASES: ForbiddenPhrase[] = [
  { pattern: /기준을\s*(세워|잡)/, label: 'set-criteria' },
  { pattern: /역할을\s*(나눠|분담)/, label: 'split-roles' },
  { pattern: /작업\s*범위/, label: 'work-scope' },
  { pattern: /보상\s*기준/, label: 'reward-criteria' },
  { pattern: /혼자\s*(모든\s*것을\s*)?감당하지\s*(마|말)/, label: 'dont-bear-alone' },
  { pattern: /중간\s*단계에서\s*신호/, label: 'mid-stage-signal' },
  { pattern: /가까운\s*사람에게\s*솔직히\s*열어둬/, label: 'open-honestly-to-close-people' },
  { pattern: /겉과\s*속이\s*다른/, label: 'outside-inside-different' },
  { pattern: /입체적인\s*(사람|성향)/, label: 'multidimensional-person' },
  { pattern: /반전/, label: 'plot-twist' },
  { pattern: /혼자\s*버티는\s*힘/, label: 'endure-alone-strength' },
  ...ELEMENT_PROXIMITY_PHRASES,
];

// ============================================================
// guarantee / unsafe 표현
// ============================================================

const GUARANTEE_PATTERNS: ForbiddenPhrase[] = [
  { pattern: /대박/, label: 'jackpot' },
  { pattern: /확실히\s*[^.。\n]*된다/, label: 'surely-happens' },
  { pattern: /반드시\s*[^.。\n]*한다/, label: 'must-do' },
  { pattern: /보장/, label: 'guarantee' },
];

const UNSAFE_PATTERNS: ForbiddenPhrase[] = [
  { pattern: /꼭\s*결혼/, label: 'must-marry' },
  { pattern: /임신\s*[^.。\n]*된다/, label: 'pregnancy-certain' },
  // "이 약을/약이/약 먹…"(약=medicine)만 잡는다. "재성이 약해/약한"(약=weak)·"약속"은 제외.
  { pattern: /이\s*약(을|를|이|은|도|으로|\s+(먹|복용|처방|드시))/, label: 'this-medicine' },
  // "이 투자를/투자에/투자 해…"(this investment)만. "X이 투자한다" 류 주어형은 제외.
  { pattern: /이\s*투자(를|을|에|는|로|만|\s+(해|하|추천))/, label: 'this-investment' },
  { pattern: /반드시\s*낫는다/, label: 'surely-cured' },
];

// 신강 충돌 토큰 — 신약/매우신약인데 "혼자 버티는 힘" 류가 나오면 충돌.
const STRENGTH_CONFLICT_PATTERNS: RegExp[] = [
  /혼자\s*버티는\s*힘/,
  /버티는\s*힘/,
  /신강/,
];

// ============================================================
// 헬퍼
// ============================================================

/** 모듈 verdict 한 줄 + 모든 PaidVerdictItem.text를 (moduleId, text, evidenceIds)로 평탄화. */
interface VisibleVerdict {
  moduleId: string;
  text: string;
  evidenceIds: string[];
  /** 모듈 본문(verdict)인지 리스트 아이템인지 */
  kind: 'module' | 'item';
}

/** PaidVerdictItem[] 안전 추출. */
function items(arr: PaidVerdictItem[] | undefined): PaidVerdictItem[] {
  return Array.isArray(arr) ? arr : [];
}

/** 한 모듈에서 PaidVerdictItem[] 필드들을 모두 모은다. */
function collectModuleItems(moduleId: string, lists: (PaidVerdictItem[] | undefined)[]): VisibleVerdict[] {
  const out: VisibleVerdict[] = [];
  for (const list of lists) {
    for (const it of items(list)) {
      out.push({ moduleId, text: it.text ?? '', evidenceIds: it.evidenceIds ?? [], kind: 'item' });
    }
  }
  return out;
}

/** 리포트에서 사용자에게 보이는 모든 verdict/item을 평탄화. */
function collectVisibleVerdicts(report: Omit<PaidSajuReportV1, 'validation'>): VisibleVerdict[] {
  const out: VisibleVerdict[] = [];

  const pushModule = (m: { id: string; verdict?: string; evidenceIds?: string[] } | undefined) => {
    if (!m) return;
    out.push({ moduleId: m.id, text: m.verdict ?? '', evidenceIds: m.evidenceIds ?? [], kind: 'module' });
  };

  // PaidModuleBase 계열 (verdict + evidenceIds)
  pushModule(report.archetypeCard);
  for (const w of report.weapons ?? []) pushModule(w);
  for (const t of report.traps ?? []) pushModule(t);
  pushModule(report.peopleGuide);
  pushModule(report.moneyGuide);
  pushModule(report.timingGuide);
  pushModule(report.luckGuide);
  pushModule(report.careerGuide);
  pushModule(report.relationshipGuide);

  // 모듈 내부 PaidVerdictItem 리스트
  const pg = report.peopleGuide;
  if (pg) out.push(...collectModuleItems(pg.id, [pg.closer, pg.avoid, pg.goodCollaborator, pg.avoidPattern]));
  const mg = report.moneyGuide;
  if (mg) out.push(...collectModuleItems(mg.id, [mg.earnRoutes, mg.leakRoutes, mg.fitMonetization, mg.avoidMoneyStyle]));
  const cg = report.careerGuide;
  if (cg) out.push(...collectModuleItems(cg.id, [cg.avoidEnvironments, cg.bestWorkStyle]));
  const rg = report.relationshipGuide;
  if (rg) out.push(...collectModuleItems(rg.id, [rg.attractionStyle, rg.relationshipPattern, rg.whatHelps, rg.whatHurts]));

  // 줄글 prose 본문 — 품질/안전 검사 대상(evidence 검사는 제외, prose-* moduleId로 스킵).
  for (const ps of report.prose ?? []) {
    if (ps?.body) out.push({ moduleId: ps.id, text: ps.body, evidenceIds: ps.evidenceIds ?? [], kind: 'item' });
  }

  return out;
}

/** 모듈 간 중복 검사용 — 모든 verdict 문장을 (moduleId, text)로 수집(timingYear 라벨 포함). */
function collectAllSentencesForDuplicate(report: Omit<PaidSajuReportV1, 'validation'>): { moduleId: string; text: string }[] {
  const base = collectVisibleVerdicts(report).map(v => ({ moduleId: v.moduleId, text: v.text }));
  // coreSummary.oneLiner / archetype.oneLiner 도 사용자 노출 → 포함
  if (report.coreSummary?.oneLiner) base.push({ moduleId: 'coreSummary', text: report.coreSummary.oneLiner });
  if (report.archetypeCard?.oneLiner) base.push({ moduleId: report.archetypeCard.id, text: report.archetypeCard.oneLiner });
  return base;
}

/** 문장 정규화 — 공백/문장부호 제거 후 비교. */
function normalizeSentence(s: string): string {
  return (s ?? '')
    .replace(/\s+/g, '')
    .replace(/[.,!?·…"'`「」『』()【】\-~]/g, '')
    .trim();
}

/** ELEMENT_KO 역 — '목'→'wood' */
const KO_TO_ELEMENT_LOCAL: Record<string, Element> = Object.entries(ELEMENT_KO)
  .reduce((acc, [el, ko]) => { acc[ko] = el as Element; return acc; }, {} as Record<string, Element>);

// ============================================================
// 메인 validator
// ============================================================

export function validatePaidReportV1(
  report: Omit<PaidSajuReportV1, 'validation'>,
): PaidReportValidation {
  const issues: PaidValidationIssue[] = [];

  const visible = collectVisibleVerdicts(report);
  const evidenceMap = report.evidenceMap ?? {};

  // ── 1. missing-evidence (high) + 2. evidence-id-dangling (high) ──
  for (const v of visible) {
    const text = (v.text ?? '').trim();
    if (text === '') continue; // 빈 텍스트(placeholder)는 evidence 검사 대상 아님
    if (v.moduleId.startsWith('prose')) continue; // prose는 이미 검증된 문구의 재조합 → evidence 필수 검사 제외
    if (!v.evidenceIds || v.evidenceIds.length === 0) {
      issues.push({
        type: 'missing-evidence',
        moduleId: v.moduleId,
        text,
        reason: `${v.kind === 'module' ? '모듈 verdict' : '판정 항목'}에 evidenceIds가 비어 있음 (근거 없는 verdict 금지).`,
        severity: 'high',
      });
    }
    for (const id of v.evidenceIds ?? []) {
      if (!evidenceMap[id]) {
        issues.push({
          type: 'evidence-id-dangling',
          moduleId: v.moduleId,
          text,
          reason: `evidenceId "${id}"가 evidenceMap에 존재하지 않음.`,
          severity: 'high',
        });
      }
    }
  }

  // ── 3. forbidden-generic-phrase (medium) ──
  for (const v of visible) {
    const text = v.text ?? '';
    if (!text) continue;
    for (const fp of FORBIDDEN_GENERIC_PHRASES) {
      if (fp.pattern.test(text)) {
        issues.push({
          type: 'forbidden-generic-phrase',
          moduleId: v.moduleId,
          text,
          reason: `범용 코칭 클리셰 감지 (${fp.label}: ${fp.pattern}).`,
          severity: 'medium',
        });
      }
    }
  }

  // ── 4. accuracy-conflict (high) ──
  const strength = (report.meta?.strength ?? '').toLowerCase();
  const isWeak = strength === 'weak' || strength === 'very-weak'
    || strength.includes('신약') || strength.includes('매우');
  if (isWeak) {
    for (const v of visible) {
      const text = v.text ?? '';
      if (!text) continue;
      for (const pat of STRENGTH_CONFLICT_PATTERNS) {
        if (pat.test(text)) {
          issues.push({
            type: 'accuracy-conflict',
            moduleId: v.moduleId,
            text,
            reason: `신약/매우신약(strength="${report.meta?.strength}") 차트에 신강 결("${pat}")이 등장 — 충돌.`,
            severity: 'high',
          });
          break;
        }
      }
    }
  }

  // luckGuide 용신 sanity: blockingEnvironments가 favorable 환경과 동일하면 충돌.
  const luck = report.luckGuide;
  if (luck) {
    const fav = luckFavorableElement(report);
    if (fav) {
      const favEnvSet = new Set([
        ...(FAVORABLE_ELEMENT_SYMBOLS[fav]?.colors ?? []),
        ...(FAVORABLE_ELEMENT_SYMBOLS[fav]?.places ?? []),
        ...(FAVORABLE_ELEMENT_SYMBOLS[fav]?.routines ?? []),
        ...(FAVORABLE_ELEMENT_SYMBOLS[fav]?.items ?? []),
      ]);
      // blockingEnvironments는 기신 환경이어야 한다. favorable 권장값과 겹치면 충돌.
      for (const env of luck.blockingEnvironments ?? []) {
        if (favEnvSet.has(env)) {
          issues.push({
            type: 'accuracy-conflict',
            moduleId: luck.id,
            text: env,
            reason: `luckGuide.blockingEnvironments가 용신 오행(${ELEMENT_KO[fav]})의 권장 환경과 동일 — 운을 막는 환경이 권장 환경일 수 없음.`,
            severity: 'high',
          });
        }
      }
    }
  }

  // ── 5. guarantee-claim (medium) ──
  for (const v of visible) {
    const text = v.text ?? '';
    if (!text) continue;
    for (const gp of GUARANTEE_PATTERNS) {
      if (gp.pattern.test(text)) {
        issues.push({
          type: 'guarantee-claim',
          moduleId: v.moduleId,
          text,
          reason: `보장/단정 표현 감지 (${gp.label}).`,
          severity: 'medium',
        });
      }
    }
  }

  // ── 6. unsafe-claim (high) ──
  for (const v of visible) {
    const text = v.text ?? '';
    if (!text) continue;
    for (const up of UNSAFE_PATTERNS) {
      if (up.pattern.test(text)) {
        issues.push({
          type: 'unsafe-claim',
          moduleId: v.moduleId,
          text,
          reason: `의료/투자/결혼/임신 확정 표현 감지 (${up.label}).`,
          severity: 'high',
        });
      }
    }
  }

  // ── 7. duplicate-across-modules (medium) ──
  // 정규화 문장이 ≥12자이고 서로 다른 모듈 2곳 이상에서 등장하면 충돌.
  const sentences = collectAllSentencesForDuplicate(report);
  const byNorm = new Map<string, { raw: string; modules: Set<string> }>();
  for (const s of sentences) {
    const norm = normalizeSentence(s.text);
    if (norm.length < 12) continue;
    const entry = byNorm.get(norm) ?? { raw: s.text, modules: new Set<string>() };
    entry.modules.add(s.moduleId);
    byNorm.set(norm, entry);
  }
  for (const [, entry] of byNorm) {
    if (entry.modules.size >= 2) {
      issues.push({
        type: 'duplicate-across-modules',
        moduleId: Array.from(entry.modules).join(','),
        text: entry.raw,
        reason: `동일 verdict 문장이 ${entry.modules.size}개 모듈(${Array.from(entry.modules).join(', ')})에서 중복 등장.`,
        severity: 'medium',
      });
    }
  }

  // ── 집계 ──
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;

  return {
    isValid: highCount === 0,
    issues,
    highCount,
    mediumCount,
    lowCount,
  };
}

/**
 * luckGuide가 표현하는 favorable 오행을 추론.
 * luckGuide.colors가 어떤 오행의 권장 색상 집합에 ⊆ 인지로 역추정한다.
 * 추정 실패(애매) 시 undefined → blocking sanity 검사를 건너뛴다(보수적).
 */
function luckFavorableElement(report: Omit<PaidSajuReportV1, 'validation'>): Element | undefined {
  const colors = report.luckGuide?.colors ?? [];
  if (colors.length === 0) return undefined;
  for (const el of Object.keys(FAVORABLE_ELEMENT_SYMBOLS) as Element[]) {
    const palette = new Set(FAVORABLE_ELEMENT_SYMBOLS[el].colors);
    if (colors.every(c => palette.has(c))) return el;
  }
  return undefined;
}

export { KO_TO_ELEMENT_LOCAL, BLOCKING_ELEMENT_ENVIRONMENTS };
