// Paid Report — 사람 가이드 deriver (NEW).
//
// 원천: usefulGod.favorable/unfavorable(Element|TenGod) + tenGods.totals(비겁/재성/인성 구조)
//       + specialStars(도화/홍염/양인/괴강/천을귀인).
// 모든 항목은 chart-specific 하게 파생 — A/B/C가 서로 다르게 나와야 한다.
// 결정론·순수.

import type { PersonalSajuGptInput, TenGod } from '../../report/sajuReportSchema';
import type { Element } from '../../rules/elements';
import { ELEMENT_KO } from '../../rules/elements';
import { iGa } from '../koText';
import type { PaidPeopleGuide, PaidVerdictItem } from '../paidReportTypes';
import type { EvidenceCollector } from '../evidenceMap';

const TEN_GOD_ELEMENT_LABEL: Record<Element, string> = {
  wood: '새로 벌이고 키우는',
  fire: '드러내고 표현하는',
  earth: '중심을 잡고 안정시키는',
  metal: '끊고 마무리 짓는',
  water: '차분하게 정리하고 한 박자 늦춰주는',
};

// "어떤 기운이 센 사람 → 그래서 어떤 성격" — 만났을 때 바로 알아볼 수 있게 직관적으로.
const FAVORABLE_PERSON_BY_ELEMENT: Record<Element, string> = {
  wood: '나무 기운이 센 사람 — 추진력 있고 새 일을 겁 없이 벌여서, 망설이는 너의 등을 밀어준다',
  fire: '불 기운이 센 사람 — 밝고 표현이 풍부해서, 가라앉은 너를 밖으로 끌어내 준다',
  earth: '흙 기운이 센 사람 — 듬직하고 잘 흔들리지 않아서, 들뜬 너를 차분히 자리 잡게 해준다',
  metal: '쇠 기운이 센 사람 — 맺고 끊음이 분명해서, 우유부단한 순간에 정리를 도와준다',
  water: '물 기운이 센 사람 — 차분하고 생각이 깊어서, 급한 너를 한 박자 늦춰 균형을 잡아준다',
};

const COLLAB_ROLE_BY_ELEMENT: Record<Element, string> = {
  wood: '새 방향과 아이디어를 던져주는 기획형 동료',
  fire: '밖으로 알리고 띄워주는 홍보·발표형 동료',
  earth: '판을 안정시키고 운영을 맡아주는 살림형 동료',
  metal: '맺고 끊어 마무리를 책임지는 결단형 동료',
  water: '흐름을 정리하고 속도를 조율해주는 조율형 동료',
};

const AVOID_PERSON_BY_ELEMENT: Record<Element, string> = {
  wood: '나무 기운이 센 사람 — 새 일을 자꾸 벌이고 가만있질 못해서, 너까지 끌고 다녀 발을 못 빼게 만든다',
  fire: '불 기운이 센 사람 — 쉽게 달아오르고 감정이 앞서서, 너의 열기까지 더 키운다',
  earth: '흙 기운이 센 사람 — 고집 세고 굼떠서, 결정을 미루며 책임만 너에게 얹어둔다',
  metal: '쇠 기운이 센 사람 — 원칙만 차갑게 따져서, 자꾸 거리를 두게 만든다',
  water: '물 기운이 센 사람 — 생각이 너무 많아서, 불안과 망설임을 너에게 옮긴다',
};

function asElement(v: Element | TenGod): Element | null {
  return (['wood', 'fire', 'earth', 'metal', 'water'] as const).includes(v as Element)
    ? (v as Element)
    : null;
}

function favorableElements(g: PersonalSajuGptInput): Element[] {
  const out: Element[] = [];
  const ug = g.coreAnalysis.usefulGod;
  if (ug.primaryUseful.type === 'element') {
    const e = asElement(ug.primaryUseful.value);
    if (e) out.push(e);
  }
  for (const f of ug.favorable) {
    const e = asElement(f);
    if (e && !out.includes(e)) out.push(e);
  }
  return out;
}

function unfavorableElements(g: PersonalSajuGptInput): Element[] {
  const out: Element[] = [];
  for (const u of g.coreAnalysis.usefulGod.unfavorable) {
    const e = asElement(u);
    if (e && !out.includes(e)) out.push(e);
  }
  return out;
}

function hasStar(g: PersonalSajuGptInput, name: string): boolean {
  return g.coreAnalysis.specialStars.some((s) => s.name === name);
}

function tg(g: PersonalSajuGptInput, name: TenGod): number {
  return g.coreAnalysis.tenGods.totals[name] ?? 0;
}

export function derivePeopleGuide(
  g: PersonalSajuGptInput,
  ev: EvidenceCollector,
): PaidPeopleGuide {
  const fav = favorableElements(g);
  const unfav = unfavorableElements(g);

  const bigeop = tg(g, '비견') + tg(g, '겁재'); // 비겁
  const jaeseong = tg(g, '편재') + tg(g, '정재'); // 재성
  const inseong = tg(g, '편인') + tg(g, '정인'); // 인성

  const closer: PaidVerdictItem[] = [];
  const avoid: PaidVerdictItem[] = [];
  const goodCollaborator: PaidVerdictItem[] = [];
  const avoidPattern: PaidVerdictItem[] = [];

  // ── closer ─────────────────────────────────────────────────
  // 천을귀인 → 위기 때 손 내밀어주는 윗사람 (있으면 전면에 배치 — 강한 귀인형)
  if (hasStar(g, '천을귀인')) {
    const id = ev.add('specialStar', '천을귀인', '천을귀인', '천을귀인 — 위기 때 도움 주는 귀인/윗사람이 붙는 구조');
    closer.push({
      text: '위기 때 먼저 손 내밀어주는 윗사람·귀인',
      why: '천을귀인 — 결정적인 순간에 도와주는 귀인이 붙는 구조라서',
      evidenceIds: [id],
    });
  }

  // 용신/희신 오행을 채워주는 사람
  for (const e of fav.slice(0, 2)) {
    const id = ev.add('usefulGod', `favorable-${e}`, `희신 ${ELEMENT_KO[e]}`, `용신/희신 오행 ${ELEMENT_KO[e]} — ${TEN_GOD_ELEMENT_LABEL[e]} 기운이 균형을 돕는다`);
    closer.push({
      text: FAVORABLE_PERSON_BY_ELEMENT[e],
      why: `당신에게 ${ELEMENT_KO[e]} 기운(${TEN_GOD_ELEMENT_LABEL[e]} 결)이 부족분을 채워주기 때문`,
      evidenceIds: [id],
    });
  }

  // 인성 강함 → 가르쳐주고 챙겨주는 사람
  if (inseong >= 2.0) {
    const id = ev.add('tenGod', '인성강', '인성 강함', `인성 합계 ${inseong.toFixed(2)} — 배움·돌봄을 주는 사람과 잘 맞는다`);
    closer.push({
      text: '아는 것을 차분히 나눠주고 뒤를 받쳐주는 사람',
      why: `인성이 강해(${inseong.toFixed(1)}) 배움과 지지를 주는 관계에서 안정되기 때문`,
      evidenceIds: [id],
    });
  }

  // ── avoid: 기신 오행 + 과다 십성 ───────────────────────────
  for (const e of unfav.slice(0, 1)) {
    const id = ev.add('usefulGod', `unfavorable-${e}`, `기신 ${ELEMENT_KO[e]}`, `기신 오행 ${ELEMENT_KO[e]} — 이 기운을 키우는 사람은 균형을 깬다`);
    avoid.push({
      text: AVOID_PERSON_BY_ELEMENT[e],
      why: `${iGa(ELEMENT_KO[e])} 기신이라, 이 결을 자극하는 사람과 오래 붙으면 균형이 무너지기 때문`,
      evidenceIds: [id],
    });
  }

  // 비겁 과다 → 돈·공을 두고 경쟁하게 되는 사람
  if (bigeop >= 1.2 && bigeop > jaeseong) {
    const id = ev.add('tenGod', '비겁과다', '비겁 강함', `비겁 합계 ${bigeop.toFixed(2)} — 같은 자리를 두고 경쟁이 붙기 쉽다`);
    avoid.push({
      text: '돈과 공을 두고 은근히 경쟁이 붙는 사람',
      why: `비겁이 강해(${bigeop.toFixed(1)}) 내 몫을 나눠 가지려는 관계에서 손해가 누적되기 때문`,
      evidenceIds: [id],
    });
  }

  // 재성 약함 → 끊임없이 비용·부탁만 늘리는 사람
  if (jaeseong < 1.0) {
    const id = ev.add('tenGod', '재성약', '재성 약함', `재성 합계 ${jaeseong.toFixed(2)} — 나가는 비용·부탁에 약하다`);
    avoid.push({
      text: '비용과 부탁만 끊임없이 늘려가는 사람',
      why: `재성이 약해(${jaeseong.toFixed(1)}) 들고 나가는 흐름을 막아내기 어렵기 때문`,
      evidenceIds: [id],
    });
  }

  // ── goodCollaborator ──────────────────────────────────────
  if (fav.length > 0) {
    const e = fav[0];
    const id = ev.add('usefulGod', `favorable-${e}`, `희신 ${ELEMENT_KO[e]}`, `협업 — ${ELEMENT_KO[e]} 기운(${TEN_GOD_ELEMENT_LABEL[e]} 결)을 가진 동료가 약한 고리를 메운다`);
    goodCollaborator.push({
      text: COLLAB_ROLE_BY_ELEMENT[e],
      why: `내 ${ELEMENT_KO[e]} 부족분을 메워주는 결이라 손발이 맞기 때문`,
      evidenceIds: [id],
    });
  }
  if (hasStar(g, '천을귀인')) {
    const id = ev.add('specialStar', '천을귀인', '천을귀인', '천을귀인 — 결정적 순간 길을 열어주는 조력자');
    goodCollaborator.push({
      text: '막힐 때 길을 열어주는 연장자·멘토형 파트너',
      why: '천을귀인 구조라 윗사람의 한마디가 판을 바꾸기 때문',
      evidenceIds: [id],
    });
  }
  if (inseong >= 2.0) {
    const id = ev.add('tenGod', '인성강', '인성 강함', `인성 ${inseong.toFixed(2)} — 자료·근거를 같이 쌓는 동료가 강점을 살린다`);
    goodCollaborator.push({
      text: '자료와 근거를 같이 쌓아가는 분석형 동료',
      why: `인성이 강해(${inseong.toFixed(1)}) 깊이로 가는 협업에서 시너지가 나기 때문`,
      evidenceIds: [id],
    });
  }

  // ── avoidPattern ──────────────────────────────────────────
  if (bigeop >= 1.2 && bigeop > jaeseong) {
    const id = ev.add('tenGod', '비겁과다', '비겁 강함', `비겁 ${bigeop.toFixed(2)} — 주도권 다툼이 반복되기 쉽다`);
    avoidPattern.push({
      text: '둘 다 주도권을 쥐려다 부딪히는 관계',
      why: `비겁이 강한(${bigeop.toFixed(1)}) 사람끼리는 같은 자리를 노려 충돌이 반복되기 때문`,
      evidenceIds: [id],
    });
  }
  if (unfav.length > 0) {
    const e = unfav[0];
    const id = ev.add('usefulGod', `unfavorable-${e}`, `기신 ${ELEMENT_KO[e]}`, `기신 ${ELEMENT_KO[e]} — 이 기운을 부추기는 관계 패턴`);
    avoidPattern.push({
      text: `${ELEMENT_KO[e]} 기운을 계속 키우는 쪽으로 끌려가는 관계`,
      why: `${iGa(ELEMENT_KO[e])} 기신이라, 그 방향으로 끌려가면 판단이 흐려지기 때문`,
      evidenceIds: [id],
    });
  }
  if (jaeseong < 1.0) {
    const id = ev.add('tenGod', '재성약', '재성 약함', `재성 ${jaeseong.toFixed(2)} — 받기만 하는 비대칭 관계`);
    avoidPattern.push({
      text: '주기만 하고 돌아오는 게 없는 일방적 관계',
      why: `재성이 약해(${jaeseong.toFixed(1)}) 비대칭이 길어지면 소진되기 때문`,
      evidenceIds: [id],
    });
  }

  // 모듈 베이스 evidence: usefulGod + dominant tenGod
  const baseEvidence: string[] = [];
  const ugId = ev.add('usefulGod', 'primary', '용신', '사람 가이드의 기준 — 용신/희신·기신 오행과 십성 구조');
  baseEvidence.push(ugId);

  return {
    id: 'peopleGuide',
    title: '사람 가이드',
    subtitle: '가까이할 사람, 거리 둘 사람',
    verdict: closer[0]?.text ?? '나의 부족분을 채워주는 사람과 가까이하면 흐름이 풀린다',
    evidenceIds: baseEvidence,
    confidence: 'medium',
    displayPriority: 50,
    riskLevel: 'low',
    forbiddenClaims: ['이 사람과 만나면 반드시 잘된다', '이 사람은 무조건 피해라'],
    closer,
    avoid,
    goodCollaborator,
    avoidPattern,
  };
}
