// Daily Fortune — 검증기 (spec §12.3 / §12.4 / §12.5).
//
// 1) evidence 필수: 모든 visible item에 존재하는 evidenceId가 1개 이상.
// 2) generic phrase guard: 일반론 표현이 본문에 나오면 실패.
// 3) safety: 보장형/확정형(대박·무조건·반드시 + 투자/건강/임신/결혼 확정) 표현 금지.
//
// 본문(summary/goodFor/caution/points/luck)만 스캔한다.
// evidence.detail은 "사주 근거 보기"용이라 십성·일진 용어가 정상적으로 들어가므로 스캔 제외.

import type { DailyFortuneV1 } from './dailyFortuneTypes';

// §12.4 — 반복되면 실패하는 일반론
const GENERIC_PATTERNS: RegExp[] = [
  /신중함이 필요/,
  /소통을 잘하세요/,
  /감정을 조절/,
  /계획적으로 움직이세요/,
  /긍정적으로 생각/,
  /좋은 일이 생길 것/,
  /주변과 조화/,
];

// §12.5 — 보장형/확정형
const SAFETY_PATTERNS: RegExp[] = [
  /대박/,
  /무조건/,
  /반드시/,
  /확실히 (돈|성공|합격|좋아|나아|낫)/,
  /(반드시|꼭|무조건).*(임신|결혼|합격|완치)/,
  /(투자|주식|코인).*(확실|보장|오른다|대박)/,
];

function collectVisibleText(report: DailyFortuneV1): string[] {
  const out: string[] = [];
  out.push(report.summary.headline, report.summary.shortMessage);
  for (const g of report.goodFor) out.push(g.label, g.reason);
  for (const c of report.caution) out.push(c.label, c.reason);
  for (const p of [report.points.work, report.points.money, report.points.relationship]) {
    out.push(p.label, p.message);
  }
  for (const it of report.luck.items) out.push(it.label, it.reason);
  out.push(...report.luck.colors, ...report.luck.places, ...report.luck.routines);
  return out;
}

export interface DailyValidation {
  isValid: boolean;
  issues: string[];
}

export function validateDailyFortune(report: DailyFortuneV1): DailyValidation {
  const issues: string[] = [];
  const texts = collectVisibleText(report);

  // 1) generic phrase
  for (const text of texts) {
    for (const pat of GENERIC_PATTERNS) {
      if (pat.test(text)) issues.push(`generic-phrase: "${text}" matches ${pat}`);
    }
  }

  // 2) safety
  for (const text of texts) {
    for (const pat of SAFETY_PATTERNS) {
      if (pat.test(text)) issues.push(`unsafe-claim: "${text}" matches ${pat}`);
    }
  }

  // 3) evidence 필수 — visible item의 evidenceIds가 모두 존재해야 함
  const validIds = new Set(report.evidence.map(e => e.id));
  const checkRefs = (refs: string[], where: string) => {
    if (!refs || refs.length === 0) {
      issues.push(`missing-evidence: ${where} has no evidenceIds`);
      return;
    }
    for (const id of refs) {
      if (!validIds.has(id)) issues.push(`dangling-evidence: ${where} → ${id}`);
    }
  };

  report.goodFor.forEach((g, i) => checkRefs(g.evidenceIds, `goodFor[${i}]`));
  report.caution.forEach((c, i) => checkRefs(c.evidenceIds, `caution[${i}]`));
  checkRefs(report.points.work.evidenceIds, 'points.work');
  checkRefs(report.points.money.evidenceIds, 'points.money');
  checkRefs(report.points.relationship.evidenceIds, 'points.relationship');
  report.luck.items.forEach((it, i) => checkRefs(it.evidenceIds, `luck.items[${i}]`));

  return { isValid: issues.length === 0, issues };
}
