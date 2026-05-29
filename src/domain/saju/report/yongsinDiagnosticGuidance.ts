// 용신 diagnostic → curated 해석 지침(시스템 규칙) 공유 렌더러.
//
// 개인사주(P5)에서 시작해 yearly/compat/pregnancy까지 공통 사용.
// 원칙: 최종 용신 변경 금지, 후보는 보조 운용 관점으로만, 기신 겹침 시 단정 금지,
//       raw diagnostic/internal key는 절대 노출하지 않고 자연어 지침으로만 전달.
// element 기반으로 문구를 생성하며 특정 케이스(火/土)를 하드코딩하지 않는다.
//
// ⚠️ ctx 없이 호출하면 개인사주 P5와 byte-identical한 문구를 반환해야 한다(회귀 보호).
//    mode/personLabel은 ctx가 주어졌을 때만 추가 라인을 더한다.

import type { YongsinDiagnostic } from '../analysis/yongsinDiagnostic';

const ELEMENT_KO: Record<string, string> = {
  wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
};

export interface YongsinGuidanceContext {
  /** 모드별 추가 안전지침. 미지정이면 개인사주 기본 문구만(byte-identical). */
  mode?: 'yearly' | 'compat' | 'pregnancy';
  /** 궁합 등에서 어느 인물의 진단인지(A/B 혼동 방지). */
  personLabel?: string;
}

export function renderYongsinDiagnosticGuidance(diag: YongsinDiagnostic, ctx?: YongsinGuidanceContext): string {
  const ko = (e?: string) => (e ? (ELEMENT_KO[e] ?? e) : '');
  const primary = ko(diag.currentFinalYongsin.primary);
  const drainKo = diag.drainCandidate ? ko(diag.drainCandidate.element) : '';
  const controlKo = diag.controlCandidate ? ko(diag.controlCandidate.element) : '';
  const lines: string[] = [];
  lines.push('[보조 용신 진단 — 해석 지침 (최종 용신 변경 금지)]');
  lines.push(`- 이 사주의 최종 용신은 '${primary}'(으)로 이미 확정돼 있다. 어떤 경우에도 용신을 다른 오행으로 바꾸거나 "사실은 ○이 용신"이라고 말하지 마라.`);
  lines.push('- 아래 후보는 용신이 아니라, 용신을 실제로 어떻게 쓰는가(운용)에 대한 보조 관점일 뿐이다.');
  if (diag.drainCandidate) {
    lines.push(`- 배출/표현 후보: ${drainKo} — 과하게 받은 기운을 밖으로 표현·배출하는 운용 관점. '${drainKo}이(가) 용신'이라는 뜻이 절대 아니다.`);
  }
  if (diag.controlCandidate) {
    lines.push(`- 제어/현실화 후보: ${controlKo} — 과한 기운을 현실로 정리·제어하는 관점.`);
  }
  if (diag.drainCandidate?.conflictsWithFinal) {
    lines.push(`- ${drainKo}은(는) 이 사주가 꺼리는 기운(기신)과 겹친다. 그러므로 ${drainKo}을(를) "좋다"고 단정하지 말고, "표현·활동의 관점에서 조건부로 의미가 있다" 정도로만 균형 있게 서술하라.`);
  }
  if (diag.conflictFlags.length > 0) {
    lines.push(`- 기본 기운(용신)과 실제 운용 기운이 다를 수 있다는 점은 설명하되, 불안감을 주는 표현은 쓰지 마라. "용신이 틀렸다/바뀐다"가 아니라 "기본적으로는 ${primary} 기운이 중심이며, 운용에서는 보조 기운도 의미가 있다"로 설명한다.`);
  }
  if (diag.boundarySensitivity?.sensitive) {
    lines.push('- 출생 시각·지역 경계에 민감한 사주다. "시간·지역 경계상 해석이 더 섬세해질 수 있다" 정도로만 완곡히 언급하고, 단정·불안 조성은 금지.');
  }
  lines.push(`- 권장 톤 예: "기본적으로는 ${primary} 기운이 중심이지만, 실제로 운을 쓰는 방식에서는 보조 기운의 역할도 중요합니다."`);
  lines.push(`- 금지 표현: "용신이 사실은 ○입니다" / "${primary}는(은) 틀렸다" / "기신이니 반드시 피해야" / "반드시" / "운명이 바뀐다" / "이 시간 때문에 인생이 달라진다".`);

  // ── ctx 있을 때만 추가 라인 (개인사주 기본 호출은 위까지로 byte-identical) ──
  if (ctx?.personLabel) {
    lines.splice(1, 0, `- 이 진단은 '${ctx.personLabel}' 개인의 운용 후보 설명이다. 다른 사람의 기운과 혼동하지 마라.`);
  }
  if (ctx?.mode === 'yearly') {
    lines.push('- (올해운세) 최종 용신은 그대로 두고, 보조 운용 기운은 "올해 이 기운을 어떻게 쓸지"의 참고로만 다뤄라. "올해 반드시 ○를 써야 한다"·미래 단정·시기 확정 표현 금지.');
  }
  if (ctx?.mode === 'compat') {
    lines.push('- (궁합) 이 진단은 개인의 운용 후보일 뿐, 상대를 용신/기신처럼 단정하지 마라. "상대가 나를 살린다/망친다" 금지. 두 사람 사이의 조율 포인트로만 설명하라.');
  }
  if (ctx?.mode === 'pregnancy') {
    lines.push('- (태교) 이 진단은 엄마(母) 사주 기준이다. 의료·출산·건강 단정 금지. 보조 후보는 엄마가 편안해지는 생활 리듬·태교 환경 조언으로만 풀고, 아기에게 "이 기운이 반드시 필요"하다는 식 표현과 출산/예정 시간 추천은 금지.');
  }

  return lines.join('\n');
}
