// Paid Report — 줄글(prose) 렌더러.
//
// 결정론 모듈을 "실전 가이드" 줄글 문단으로 푼다. 카드의 짧은 판정·리스트 조각이 아니라
// 연결된 문장으로 읽히게 하는 게 목적. 메인 narrative에 없던 새 콘텐츠(사람·돈루트·타이밍·행운).
//
// 2026-06 변경(사용자 피드백): 명리 근거(why)를 "근거 보기"로 따로 빼지 않고 본문 재료로 포함한다.
//   각 항목을 "판정(근거: …)" 형태로 묶어 GPT 폴리시(renderPaidProse)가 근거를 문장에 녹이고
//   어려운 용어를 쉬운 말로 풀게 한다. GPT off일 때의 결정론 fallback도 근거를 담되 점수 숫자는 뺀다.
//
// 순수·결정론.

import type {
  PaidSajuReportV1,
  PaidProseSection,
  PaidVerdictItem,
} from './paidReportTypes';

type Draft = Omit<PaidSajuReportV1, 'validation' | 'prose'>;

/** "(0.3)", "(1.4)" 같은 점수 숫자 제거 — 사용자에겐 기술적이라 노출하지 않는다. */
function stripScores(s: string): string {
  return (s ?? '').replace(/\s*\(\s*-?\d+(?:\.\d+)?\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
}
/** 항목 끝 종결어미만 가볍게 정리 — 명사구/절이 문장 끝에 올 수 있게. */
function trimEnd(s: string): string {
  return s.replace(/\s*(이|가)?\s*(있어|좋아|생겨|나|돼|이야|야)\.?$/u, '').replace(/[.\s]+$/u, '').trim();
}
/** why에서 "~기 때문"/"~라서" 꼬리를 정리해 근거 핵심만. */
function coreWhy(why: string): string {
  return stripScores(why)
    .replace(/\s*(이기|하기|되기)?\s*때문$/u, '')
    .replace(/[.\s]+$/u, '')
    .trim();
}

/** 항목 → "판정(근거: …)" 묶음. 근거 없으면 판정만. */
function pair(it: PaidVerdictItem): string {
  const text = trimEnd(it.text ?? '');
  const why = coreWhy(it.why ?? '');
  if (!text) return '';
  return why ? `${text} (근거: ${why})` : text;
}

function pairs(items: PaidVerdictItem[] | undefined, n = 3): string[] {
  return Array.from(new Set((items ?? []).slice(0, n).map(pair).filter(Boolean)));
}
function idsOf(items: PaidVerdictItem[] | undefined): string[] {
  return (items ?? []).flatMap((i) => i.evidenceIds ?? []);
}
function lead(intro: string, parts: string[]): string {
  const xs = parts.filter(Boolean);
  if (xs.length === 0) return '';
  return `${intro} — ${xs.join('; ')}.`;
}

export function renderPaidReportProse(report: Draft): PaidProseSection[] {
  const out: PaidProseSection[] = [];
  const push = (id: string, title: string, sentences: string[], evidenceIds: string[]) => {
    const body = sentences.filter(Boolean).join(' ').trim();
    if (body) out.push({ id, title, body, evidenceIds: Array.from(new Set(evidenceIds.filter(Boolean))) });
  };

  // ── 사람 ──
  const pg = report.peopleGuide;
  if (pg) {
    push('prose-people', '가까이할 사람, 거리 둘 사람', [
      lead('가까이 두면 흐름이 풀리는 건', pairs(pg.closer)),
      lead('반대로 거리를 두는 게 나은 건', pairs(pg.avoid)),
      lead('같이 일하면 손발이 맞는 건', pairs(pg.goodCollaborator, 2)),
    ], [...idsOf(pg.closer), ...idsOf(pg.avoid), ...idsOf(pg.goodCollaborator)]);
  }

  // ── 돈 ──
  const mg = report.moneyGuide;
  if (mg) {
    push('prose-money', '돈이 붙는 길, 새는 길', [
      lead('돈이 붙는 길은', pairs(mg.earnRoutes)),
      lead('맞는 수익화 방식은', pairs(mg.fitMonetization, 2)),
      lead('반대로 돈이 새기 쉬운 자리는', pairs(mg.leakRoutes)),
    ], [...idsOf(mg.earnRoutes), ...idsOf(mg.fitMonetization), ...idsOf(mg.leakRoutes)]);
  }

  // ── 타이밍 ──
  const tg = report.timingGuide;
  if (tg) {
    const headline = (why: string) => (why ?? '').split(' — ')[0].trim();
    const open = (tg.openingYears ?? []).slice(0, 3).map((y) => `${y.year}년 ${headline(y.why)}`);
    const caution = (tg.cautionYears ?? []).slice(0, 2).map((y) => `${y.year}년`);
    const sentences: string[] = [];
    if (open.length) sentences.push(lead('운이 강하게 열리는 흐름은', open));
    if (caution.length) sentences.push(`${caution.join(', ')}은 변동이 큰 만큼, 큰 결정은 한 박자 늦추는 게 좋아요.`);
    push('prose-timing', '운이 열리는 시기, 조심할 시기', sentences,
      [...(tg.openingYears ?? []).flatMap((y) => y.evidenceIds ?? []), ...(tg.cautionYears ?? []).flatMap((y) => y.evidenceIds ?? [])]);
  }

  // ── 행운 ──
  const lg = report.luckGuide;
  if (lg) {
    const sentences: string[] = [];
    const env: string[] = [];
    if (lg.colors?.length) env.push(`색은 ${lg.colors.slice(0, 3).join('·')} 계열`);
    if (lg.places?.length) env.push(`${lg.places.slice(0, 3).join('·')} 같은 공간`);
    if (lg.routines?.length) env.push(`${lg.routines.slice(0, 3).join('·')} 같은 루틴`);
    if (env.length) sentences.push(`흐트러진 균형을 잡아주는 건 — ${env.join(', ')}.`);
    if (lg.blockingEnvironments?.length) {
      sentences.push(`반대로 ${lg.blockingEnvironments.slice(0, 2).join('·')} 같은 환경은 운을 막으니 피하는 게 좋아요.`);
    }
    push('prose-luck', '운을 돕는 색·장소·루틴', sentences, lg.evidenceIds ?? []);
  }

  return out;
}
