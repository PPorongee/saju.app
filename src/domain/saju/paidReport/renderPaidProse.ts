// Paid Report — 줄글(prose) GPT 폴리시.
//
// buildPaidReportV1이 만든 결정론 prose 섹션(도입구 — 항목, 항목. 형태)을 GPT가 "흐르는 줄글"로 다시 쓴다.
//   - 사실/근거(사람·장소·연도·오행 등)는 그대로 유지. 새 주장 추가 금지.
//   - 단 한 번의 배치 호출. 섹션별 호출 X.
//   - 다듬은 본문이 금지 클리셰/보장·단정/의료·투자·결혼·임신 확정/신약 신강결을 들이면 그 섹션만 결정론 원문으로 revert.
//   - 적용 후 validatePaidReportV1 재검증: highCount>0면 해당 섹션 revert 후 재검증, 그래도 high면 원본 반환.
//   - callGpt throw / JSON 파싱 실패 → 원본 그대로(never throws).

import type { GptCaller } from '../generatePersonalSajuReport';
import type { PaidSajuReportV1, PaidValidationIssue } from './paidReportTypes';
import { validatePaidReportV1, FORBIDDEN_GENERIC_PHRASES } from './paidReportValidator';

const SYSTEM_PROMPT = `너는 사주 상담 카피라이터다. 아래에 "실전 가이드" 줄글 초안이 key:문장 형태의 JSON으로 주어진다.
각 초안에는 "판정 (근거: …)" 형태로 명리 근거가 붙어 있다. 너의 임무는 각 초안을 자연스럽게 "흐르는 줄글"로 다시 쓰되, 근거를 문장 안에 자연스럽게 녹여 신뢰감 있게 만드는 것이다.

규칙(절대):
1. 반말, 사주 상담 톤(예: "~한 결이야", "~할 때 풀려")으로 2~5문장의 매끄러운 한 단락으로 다듬는다. 나열 대시(—)·세미콜론을 풀어 문장으로 연결한다.
2. "(근거: …)" 괄호는 그대로 두지 말고, 그 내용을 문장 안에 녹여라. "왜 그런지"가 자연스럽게 읽혀야 신뢰감이 생긴다. 예: "위기 때 손 내밀어주는 윗사람이 가까이 두면 좋아. 너는 결정적인 순간에 사람 덕을 보는 기운이 있거든."
3. 어려운 명리 용어는 괄호 없이 "쉬운 말"로 풀어 쓴다(용어 자체를 그대로 나열하지 말 것). 변환 사전:
   - 천을귀인 → 위기 때 돕는 귀인이 붙는 기운 / 결정적 순간에 사람 덕을 보는 기운
   - 재성(약함) → 돈·현실 성과를 거머쥐는 힘이 약한 편 / (강함) → 돈·기회를 굴리는 감각이 좋은 편
   - 비겁(강함)·군겁쟁재 → 같은 걸 두고 경쟁·분배가 생기기 쉬운 구조(돈을 나눠 쓰게 됨)
   - 인성(강함) → 배우고 도움받는 기운이 강한 편
   - 식상 → 표현하고 결과물을 만들어내는 힘
   - 관성 → 책임·체계·자리를 지키는 힘
   - 도화·홍염 → 사람을 끌어당기는 매력
   - 역마 → 옮겨 다니고 변화할 때 풀리는 기운
   - 화개 → 혼자 몰입하고 거리를 두고 싶어지는 기운
   - 용신·희신(오행) → 부족한 균형을 채워주는 기운, 기신(오행) → 균형을 깨뜨리는 기운
   오행은 목·화·토·금·수 또는 쉬운 비유로 풀어도 된다.
4. 점수·숫자(예: 0.3, 1.4)는 절대 쓰지 마라. "약한 편/강한 편"처럼 정도로만 표현.
5. 초안에 있는 사실(사람 유형·장소·색·루틴·연도)은 빠뜨리지 말고, 초안에 없는 새 주장·조언·보장은 추가하지 않는다.
6. 금지 — 보장/단정("대박", "반드시 ~된다", "확실히 ~된다", "보장"), 의료/투자/결혼/임신 확정, 그리고 클리셰: "기준을 세워/잡", "역할을 나눠/분담", "작업 범위", "보상 기준", "혼자 (모든 것을) 감당하지 마", "겉과 속이 다른", "입체적인 사람/성향", "반전", "혼자 버티는 힘".
7. 출력은 STRICT JSON 하나만. 형식: {"<key>": "<다듬은 줄글>", ...}. 입력 key를 그대로 사용한다. 코드블록·설명 없이 JSON 객체만.`;

function buildUserPrompt(drafts: Record<string, string>): string {
  return `다음 초안들을 규칙대로 흐르는 줄글로 다시 써서 같은 key의 JSON으로만 답하라.\n\n${JSON.stringify(drafts, null, 2)}`;
}

function parseJson(raw: string): Record<string, string> | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    const parsed = JSON.parse(text.slice(first, last + 1));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) if (typeof v === 'string') out[k] = v;
    return out;
  } catch {
    return null;
  }
}

function hasForbidden(text: string): boolean {
  return FORBIDDEN_GENERIC_PHRASES.some((fp) => fp.pattern.test(text));
}
function reintroducesWeakConflict(text: string): boolean {
  return /버티는\s*힘/.test(text) || /신강/.test(text);
}
function isWeak(report: PaidSajuReportV1): boolean {
  const s = (report.meta?.strength ?? '').toLowerCase();
  return s === 'weak' || s === 'very-weak' || s.includes('신약') || s.includes('매우');
}

function clone(report: PaidSajuReportV1): PaidSajuReportV1 {
  return JSON.parse(JSON.stringify(report)) as PaidSajuReportV1;
}

export async function renderPaidProse(
  report: PaidSajuReportV1,
  callGpt: GptCaller,
): Promise<PaidSajuReportV1> {
  const sections = (report.prose ?? []).filter((s) => s?.body && s.body.trim());
  if (sections.length === 0) return report;

  const drafts: Record<string, string> = {};
  for (const s of sections) drafts[s.id] = s.body;

  let raw: string;
  try {
    raw = await callGpt({ system: SYSTEM_PROMPT, user: buildUserPrompt(drafts) });
  } catch {
    return report;
  }
  const polishedMap = parseJson(raw);
  if (!polishedMap) return report;

  const weak = isWeak(report);
  const working = clone(report);
  const appliedIds = new Set<string>();

  for (const s of working.prose ?? []) {
    const polished = polishedMap[s.id]?.trim();
    if (!polished) continue;
    if (hasForbidden(polished)) continue;
    if (weak && reintroducesWeakConflict(polished)) continue;
    s.body = polished;
    appliedIds.add(s.id);
  }

  if (appliedIds.size === 0) return report;

  // 재검증 (validator가 prose body도 스캔)
  const { validation: _omit, ...body } = working;
  let validation = validatePaidReportV1(body);

  if (validation.highCount > 0) {
    const offending = new Set(
      validation.issues
        .filter((i: PaidValidationIssue) => i.severity === 'high')
        .map((i) => i.text),
    );
    for (const s of working.prose ?? []) {
      if (!appliedIds.has(s.id)) continue;
      if (offending.has(s.body)) {
        const orig = report.prose?.find((o) => o.id === s.id);
        if (orig) s.body = orig.body; // 결정론 원문 복구
        appliedIds.delete(s.id);
      }
    }
    const { validation: _omit2, ...body2 } = working;
    validation = validatePaidReportV1(body2);
    if (validation.highCount > 0) return report; // 그래도 high면 원본
  }

  return { ...working, validation };
}
