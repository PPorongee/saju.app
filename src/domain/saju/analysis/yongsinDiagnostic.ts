// Module 11-D — 용신 고도화 V1 "diagnostic layer" (타입/상수 선언만 — P1).
//
// 목적:
//   analyzeUsefulGod(Module 11)이 산출한 최종 용신을 **변경하지 않고**,
//   동일한 중간 분석(elements / tenGods / dayMasterStrength / structure)을 읽어
//   "관점별 보조 후보 + 패턴 플래그 + 충돌 + 시주경계 민감도"를 부가 진단한다.
//
// 불변식 (P1~P6 전 구간):
//   - analyzeUsefulGod 의 입력/출력/반환을 절대 수정하지 않는다.
//   - production 결과(JSON/UI/프롬프트)에 영향 없다. 본 모듈은 아직 어디서도 호출되지 않는다.
//   - currentFinalYongsin 은 기존 엔진 결과의 read-only 미러일 뿐, 새 용신을 만들지 않는다.
//
// 설계 원칙:
//   - 특정 케이스(예: 대전 1995-06-22)를 위한 하드코딩 금지. 모든 판정은 임계값 기반 일반 규칙이어야 한다.
//   - 보조 후보(火/土 등)는 "대체/운용/개운 후보"로만 진단하며, 최종 용신을 그 값으로 바꾸지 않는다.
//
// V1 범위 (구현은 P2):
//   insung_excess / mo_da_myeol_ja / bigeop_excess /
//   climate_vs_excess_pattern / final_vs_remedy / strength_method_vs_insung_excess /
//   climate_vs_drain / boundarySensitivity
//
// V2 backlog (V1 제외 — 근거: 28개 합성 실측에서 structureAnalyzer 의 jongGyeok 신호가 0회 발화.
//             현 구조로 V1에 넣으면 저신뢰 신호가 됨):
//   - jong_wang_suspect / 從旺(종왕) / 從兒(종아) / 從格(종격) 자동 판정
//   - 위 판정은 structureAnalyzer.source 의존을 버리고 독자 휴리스틱으로 재설계 후 도입한다.

import { STEM_ELEMENT, PRODUCES, RESTRAINS, ELEMENT_KO, type Element } from '../rules/elements';
import type {
  UsefulGodAnalysis, TenGodAnalysis, ElementStrengthAnalysis, DayMasterStrengthAnalysis,
} from '../report/sajuReportSchema';
import type { StructureAnalysis } from './structureAnalyzer';
import type { FourPillars } from '../calendar/pillarCalculator';
import type { CalculationMeta } from '../calendar/calculationMeta';

// ============================================================
// 보조 enum
// ============================================================

/** 후보가 도출된 관점. */
export type DiagnosticPerspective =
  | 'climate'    // 조후
  | 'strength'   // 억부(신강/신약)
  | 'structure'  // 격국
  | 'excess'     // 과다 오행 제어(설/극)
  | 'drain'      // 식상(설기) — 印重/比劫과다 배출구
  | 'control';   // 財/官(극제) — 財破印 등

/** 패턴/후보 강도. */
export type DiagnosticIntensity = 'strong' | 'mild';

// ============================================================
// 관점별 후보
// ============================================================

export interface ElementCandidate {
  /** 후보 오행. */
  element: Element;
  /** 어느 관점에서 도출됐는가. */
  perspective: DiagnosticPerspective;
  /** 한 줄 명리 근거 (사람이 읽는 설명, 하드코딩된 케이스 문구 금지). */
  rationale: string;
  /** 관점 내부 점수(설명용, 선택). */
  localScore?: number;
  /** 최종 용신(currentFinalYongsin)과 방향이 충돌하는가. 예: 火 drain 후보는 기신이라 true. */
  conflictsWithFinal: boolean;
  /** 후보 강도(선택). */
  intensity?: DiagnosticIntensity;
}

// ============================================================
// 패턴 플래그
// ============================================================

export interface PatternFlags {
  /** 印星(편인+정인) 과다. tenGod 합 기준. strong ≥ 3.5 / mild ≥ 3.0. element 레벨로는 탐지 불가. */
  insungExcess: 'strong' | 'mild' | null;
  /** 比劫(비견+겁재) 과다. tenGod 합 ≥ 3.5 (신약 제외 게이트는 P2 로직에서). */
  bigeopExcess: boolean;
  /** 母多滅子 — 신약 + 印過多 + 印이 比劫을 압도. */
  moDaMyeolJa: boolean;
  // V2 backlog: jongWangSuspect — 위 헤더 주석 참조. V1에서 의도적으로 제외.
}

// ============================================================
// 충돌 플래그
// ============================================================

export type ConflictFlag =
  /** 조후가 추천하는 오행이 이미 과다(印/比劫/element) — 더 주면 역효과. */
  | 'climate_vs_excess_pattern'
  /** 최종 용신이 印인데 母多滅子 — 용신 방향과 구제 방향이 정반대. */
  | 'final_vs_remedy'
  /** 억부 method가 "신약→印 생조"를 추천하나 그 印이 이미 과다 — 엔진 내부 자기모순. */
  | 'strength_method_vs_insung_excess'
  /** 조후상 흉(기신)인 오행을 drain 후보로 올림 — 火 drain 의 이중성. */
  | 'climate_vs_drain';

// ============================================================
// 시주 경계 민감도
// ============================================================

export interface BoundarySensitivity {
  /** 시주(또는 일주) 경계 ±BOUNDARY_SENSITIVITY_MINUTES 분 이내라 1분차로 결과가 갈릴 수 있는가. */
  sensitive: boolean;
  /** 경계에 걸린 기둥. */
  pillarAtRisk?: 'hour' | 'day';
  /** 태양시 보정 후 시각 기준, 지지 경계까지 남은 분. */
  minutesToBoundary?: number;
  /** 경계를 넘을 때 바뀌는 값들 (예: 印합 강도 STRONG↔MILD 토글). */
  deltaOnCross?: {
    insungSum?: number;
    metal?: number;
    dryWet?: string;
  };
  /** 사람이 읽는 한 줄 메모. */
  note?: string;
}

// ============================================================
// 진단 결과 (최상위)
// ============================================================

export interface YongsinDiagnostic {
  /** 기존 analyzeUsefulGod 결과의 read-only 미러. 절대 새 용신을 만들지 않는다. */
  currentFinalYongsin: {
    primary: Element;
    secondary?: Element;
    unfavorable: Element;
    confidence: UsefulGodAnalysis['confidence'];
  };

  patternFlags: PatternFlags;

  /** 조후 관점 1순위 후보. */
  climateCandidate: ElementCandidate | null;
  /** 억부 관점 후보(인성/비겁 or 식상/재성/관성). insungExcess 시 印 후보는 conflictsWithFinal=true. */
  strengthCandidate: ElementCandidate[];
  /** 격국 관점 후보. */
  structureCandidate: ElementCandidate | null;
  /** 과다 오행을 설/극하는 후보. */
  excessPatternCandidate: ElementCandidate | null;
  /** 식상(설기) 후보 — 母多滅子/比劫과다 배출구. 火의 경우 조후 충돌 동반. */
  drainCandidate: ElementCandidate | null;
  /** 財/官(극제) 후보 — 財破印 등. 결핍 시 "개운 포인트". */
  controlCandidate: ElementCandidate | null;
  /** primary 외 양(+)점수 후보 랭킹. */
  alternativeCandidates: ElementCandidate[];

  conflictFlags: ConflictFlag[];
  boundarySensitivity: BoundarySensitivity;
  /** 자유 텍스트 진단 메모(단정 금지, 운용 관점). */
  confidenceNotes: string[];
}

// ============================================================
// threshold 상수 (튜닝 단일 지점) — 28개 합성 실측 캘리브레이션
// ============================================================

export const YONGSIN_DIAGNOSTIC_THRESHOLDS = {
  /** 印星 합(편인+정인) 강한 과다. TEN_GOD_EXCESSIVE_THRESHOLD(3.5)와 정합. */
  INSUNG_EXCESS_STRONG: 3.5,
  /** 印星 합 경계 과다. 시주 경계 토글을 STRONG↔MILD 로 흡수하기 위한 하한. */
  INSUNG_EXCESS_MILD: 3.0,
  /** 比劫 합(비견+겁재) 과다. */
  BIGEOP_EXCESS_THRESHOLD: 3.5,
  /** 母多滅子 성립 최소 印星 합. */
  MODA_MIN_INSUNG_SUM: 3.0,
  /** 母多滅子 성립 印:比劫 비율 (印 ≥ 比劫 × 이 값). */
  MODA_INSUNG_TO_BIGEOP_RATIO: 2.0,
  /** 시주 경계 민감 판정 폭(분). 태양시 보정 후 시각이 지지 경계 ±이 분 이내면 sensitive. */
  BOUNDARY_SENSITIVITY_MINUTES: 5,
} as const;

export type YongsinDiagnosticThresholdKey = keyof typeof YONGSIN_DIAGNOSTIC_THRESHOLDS;

// ============================================================
// P2 — 순수 진단 함수
// ============================================================
//
// 불변식: usefulGod 인자를 읽기만 하고 절대 수정하지 않는다. 새 용신을 만들지 않는다.
// 모든 판정은 임계값 기반 일반 규칙 — 특정 사주를 위한 하드코딩 없음.

const T = YONGSIN_DIAGNOSTIC_THRESHOLDS;

/** target 오행을 생하는 오행(=인성 방향) 역탐색. */
function inverseProduces(target: Element): Element {
  return (Object.keys(PRODUCES) as Element[]).find(k => PRODUCES[k] === target)!;
}

export function analyzeYongsinDiagnostic(args: {
  usefulGod: UsefulGodAnalysis;
  tenGods: TenGodAnalysis;
  elements: ElementStrengthAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  structure: StructureAnalysis;
  pillars: FourPillars;
  calculationMeta?: CalculationMeta;
}): YongsinDiagnostic {
  const { usefulGod, tenGods, elements, dayMasterStrength: dm, structure, pillars, calculationMeta } = args;

  // 일간 기준 오행 관계
  const myEl = STEM_ELEMENT[pillars.dayMaster];
  const insEl = inverseProduces(myEl);   // 印 (나를 생하는 오행)
  const bigeopEl = myEl;                  // 比劫 (자기 오행)
  const drainEl = PRODUCES[myEl];         // 식상 (내가 생하는 오행)
  const controlEl = RESTRAINS[myEl];      // 財 (내가 극하는 오행)

  // 십성 합
  const tot = tenGods.totals;
  const insungSum = (tot['정인'] ?? 0) + (tot['편인'] ?? 0);
  const bigeopSum = (tot['비견'] ?? 0) + (tot['겁재'] ?? 0);

  const dmWeak = dm.level === 'weak' || dm.level === 'very-weak';
  const dmVeryWeak = dm.level === 'very-weak';
  const dmStrong = dm.level === 'strong' || dm.level === 'very-strong';

  // ── patternFlags ──
  const insungExcess: 'strong' | 'mild' | null =
    insungSum >= T.INSUNG_EXCESS_STRONG ? 'strong'
    : insungSum >= T.INSUNG_EXCESS_MILD ? 'mild'
    : null;
  const bigeopExcess = bigeopSum >= T.BIGEOP_EXCESS_THRESHOLD && !dmVeryWeak;
  const moDaMyeolJa =
    dmWeak && insungSum >= T.MODA_MIN_INSUNG_SUM && insungSum >= bigeopSum * T.MODA_INSUNG_TO_BIGEOP_RATIO;
  const hasInsungPattern = insungExcess !== null || moDaMyeolJa;

  // ── 최종 용신 read-only 미러 ──
  const finalPrimary = usefulGod.primaryUseful.value as Element;
  const finalSecondary = usefulGod.secondaryUseful?.value as Element | undefined;
  const finalUnfavorable = (usefulGod.unfavorable[0] ?? finalPrimary) as Element;
  const unfavSet = new Set(usefulGod.unfavorable as Element[]);
  const finalIsInsung = finalPrimary === insEl;

  // ── climateCandidate (월지 계절 기반 보수적 도출) ──
  const mb = pillars.month.branch;
  let climateEl: Element | null = null;
  if (['사', '오', '미'].includes(mb)) climateEl = 'water';
  else if (['해', '자', '축'].includes(mb)) climateEl = 'fire';
  const climateCandidate: ElementCandidate | null = climateEl
    ? {
        element: climateEl,
        perspective: 'climate',
        rationale: `월지 ${mb} 계절 조후 관점 후보`,
        localScore: elements.scores[climateEl],
        conflictsWithFinal: insungExcess !== null && climateEl === insEl,
      }
    : null;

  // ── strengthCandidate ──
  const strengthCandidate: ElementCandidate[] = [];
  if (dmWeak) {
    strengthCandidate.push({
      element: insEl,
      perspective: 'strength',
      rationale: `신약(${dm.level}) → 인성 생조 후보${insungExcess ? ' (단 印 이미 과다 — 충돌)' : ''}`,
      localScore: elements.scores[insEl],
      conflictsWithFinal: insungExcess !== null,
    });
    strengthCandidate.push({
      element: bigeopEl,
      perspective: 'strength',
      rationale: `신약(${dm.level}) → 비겁 부신 후보`,
      localScore: elements.scores[bigeopEl],
      conflictsWithFinal: false,
    });
  } else if (dmStrong) {
    strengthCandidate.push(
      { element: drainEl, perspective: 'strength', rationale: `신강(${dm.level}) → 식상 설기 후보`, localScore: elements.scores[drainEl], conflictsWithFinal: false },
      { element: controlEl, perspective: 'strength', rationale: `신강(${dm.level}) → 재성 극제 후보`, localScore: elements.scores[controlEl], conflictsWithFinal: false },
    );
  }

  // ── structureCandidate (P2 보수적: 격 기반 전용 오행 산정은 P3로 보류) ──
  const structureCandidate: ElementCandidate | null = null;

  // ── excessPatternCandidate ──
  let excessPatternCandidate: ElementCandidate | null = null;
  if (hasInsungPattern) {
    excessPatternCandidate = {
      element: bigeopEl,
      perspective: 'excess',
      rationale: `印星 과다 완화 — 比劫(${ELEMENT_KO[bigeopEl]})로 印 설기 + 일간 부조`,
      localScore: elements.scores[bigeopEl],
      conflictsWithFinal: bigeopEl === finalPrimary,
      intensity: insungExcess ?? undefined,
    };
  } else if (bigeopExcess) {
    excessPatternCandidate = {
      element: drainEl,
      perspective: 'excess',
      rationale: `比劫 과다 완화 — 식상(${ELEMENT_KO[drainEl]})로 설기`,
      localScore: elements.scores[drainEl],
      conflictsWithFinal: unfavSet.has(drainEl),
    };
  }

  // ── drainCandidate (식상) ──
  const drainCandidate: ElementCandidate | null = hasInsungPattern
    ? {
        element: drainEl,
        perspective: 'drain',
        rationale: `印重 배출구 — 식상(${ELEMENT_KO[drainEl]}). 조후상 기신일 수 있음`,
        localScore: elements.scores[drainEl],
        conflictsWithFinal: unfavSet.has(drainEl),
      }
    : null;

  // ── controlCandidate (財破印) ──
  const controlDeficient = elements.deficient.includes(controlEl);
  const controlCandidate: ElementCandidate | null = hasInsungPattern
    ? {
        element: controlEl,
        perspective: 'control',
        rationale: `財破印 — 재성(${ELEMENT_KO[controlEl]})로 印 제압${controlDeficient ? ' (현재 결핍 → 개운 포인트)' : ''}`,
        localScore: elements.scores[controlEl],
        conflictsWithFinal: unfavSet.has(controlEl),
      }
    : null;

  // ── alternativeCandidates (중복 제거, final.primary 제외) ──
  const altPool = [excessPatternCandidate, drainCandidate, controlCandidate].filter(Boolean) as ElementCandidate[];
  const seen = new Set<Element>();
  const alternativeCandidates: ElementCandidate[] = [];
  for (const c of altPool) {
    if (c.element === finalPrimary) continue;
    if (seen.has(c.element)) continue;
    seen.add(c.element);
    alternativeCandidates.push(c);
  }

  // ── conflictFlags ──
  const conflictFlags: ConflictFlag[] = [];
  if (finalIsInsung && hasInsungPattern) conflictFlags.push('climate_vs_excess_pattern');
  if (finalIsInsung && moDaMyeolJa) conflictFlags.push('final_vs_remedy');
  if (dmWeak && finalIsInsung && insungExcess !== null) conflictFlags.push('strength_method_vs_insung_excess');
  if (drainCandidate && unfavSet.has(drainCandidate.element)) conflictFlags.push('climate_vs_drain');

  // ── boundarySensitivity (보수적 — note 중심, 정밀 delta는 P3) ──
  const boundarySensitivity = computeBoundarySensitivity(calculationMeta);

  // ── confidenceNotes ──
  const confidenceNotes: string[] = [];
  if (insungExcess) confidenceNotes.push(`印星 과다(${insungExcess}) — 인성 합 ${insungSum.toFixed(2)} / 격 ${structure.name}`);
  if (moDaMyeolJa) confidenceNotes.push('母多滅子 — 신약 + 印 과다로 일간이 묻힐 수 있음 (印을 더 키우면 역효과)');
  confidenceNotes.push(`최종 용신(${ELEMENT_KO[finalPrimary]})은 기존 엔진 값 그대로 유지 — 본 진단은 보조 후보만 제시하며 용신을 변경하지 않음`);
  if (drainCandidate || controlCandidate) {
    const aux = [drainCandidate, controlCandidate].filter(Boolean).map(c => ELEMENT_KO[(c as ElementCandidate).element]);
    confidenceNotes.push(`${aux.join('·')}은(는) 최종 용신 변경이 아니라 운용·개운 보조 후보`);
  }
  if (conflictFlags.includes('climate_vs_drain')) {
    confidenceNotes.push(`${ELEMENT_KO[drainEl]}(식상)은 조후상 기신과 충돌할 수 있어 단정 금지`);
  }

  return {
    currentFinalYongsin: {
      primary: finalPrimary,
      secondary: finalSecondary,
      unfavorable: finalUnfavorable,
      confidence: usefulGod.confidence,
    },
    patternFlags: { insungExcess, bigeopExcess, moDaMyeolJa },
    climateCandidate,
    strengthCandidate,
    structureCandidate,
    excessPatternCandidate,
    drainCandidate,
    controlCandidate,
    alternativeCandidates,
    conflictFlags,
    boundarySensitivity,
    confidenceNotes,
  };
}

/** 시주 경계 민감도 — P2 보수적 버전. 정밀 ±분 판정은 보정 후 시각 필요(P3). */
function computeBoundarySensitivity(meta?: CalculationMeta): BoundarySensitivity {
  if (!meta) return { sensitive: false };
  const adj = meta.solarTimeAdjustmentMinutes ?? 0;
  if (!meta.solarTimeAdjustmentApplied || adj === 0) {
    return { sensitive: false, note: '태양시 보정 미적용 — 시주 경계 영향 없음' };
  }
  return {
    sensitive: true,
    pillarAtRisk: 'hour',
    note: `태양시 ${adj}분 보정 적용 — 출생 시각이 2시간 지지 경계 근처면 시주가 1분차로 갈릴 수 있음 (정밀 ±${T.BOUNDARY_SENSITIVITY_MINUTES}분 판정은 보정 후 시각 필요 — P3)`,
  };
}
