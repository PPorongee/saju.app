'use client';

// 궁합 줄글(narrative) V4 리포트 화면 (Phase 6 — UI wiring).
//
// ─────────────────────────────────────────────────────────────────────────
// 안전 / 통합 메모 (PRODUCTION SAFETY)
// ─────────────────────────────────────────────────────────────────────────
// 이 컴포넌트는 NEXT_PUBLIC_COMPAT_NARRATIVE_UI_ENABLED === 'true' 일 때만
// SajuApp.tsx에서 렌더된다. 플래그가 꺼져 있으면(default) SajuApp은 기존
// 카드형 궁합 경로(CompatV4Report)를 그대로 사용하므로 프로덕션 동작은
// byte-identical 하다.
//
// 이 컴포넌트는 자체적으로 POST /api/compat-narrative (Phase 6 route)를 호출한다.
// body: { inputA, inputB, relationshipType, maxRepairAttempts? }
// 응답: { report, futureFlow, validation, attempts, repairedSections }
//
// 렌더 정책:
//   - 본문은 카드 그리드/체크리스트가 아닌 2~5문단 줄글(prose)로.
//   - compatibilityCard(한마디+SNS+키워드)는 상단 카드.
//   - 3년 흐름은 deterministic futureFlow 카드로 유지.
//   - evidenceView는 <details> 접힘.
//   - 내부 토큰(sectionId/fact id/validation.issues) 절대 노출 금지.
//   - 톤: 존댓말.
//   - 디자인: YearlyV4Report와 동일한 Orot 토큰(var(--orot-*), card, orot-eyebrow).

import React, { useEffect, useRef, useState } from 'react';
import type { BirthInput } from '@/domain/saju/calendar/normalizeBirthInput';
import type { RelationshipType } from '@/domain/saju/compatibility/compatibilityTypes';
import type { CompatibilityNarrativeReport } from '@/domain/saju/compatibility/narrative/compatNarrativeTypes';
import { FortuneVerdictSection } from '@/components/FortuneVerdictSection';
import type { RelationshipYearFlow } from '@/domain/saju/compatibility/compatibilityTypes';
import { glossSajuNotations } from '@/components/evidence/notationGloss';
import type { RelationGauge, SharedActivities, PersonTrait, BonusSection } from '@/domain/saju/compatibility/compatExtras';
import { type Element, ELEMENT_KO } from '@/domain/saju/rules/elements';

// /api/compat-narrative 의 extras(평문 필드만)
export interface CompatExtras {
  persons?: PersonTrait[];
  scores: RelationGauge[];
  sharedActivities: SharedActivities | null;
  bonus?: BonusSection | null;
  conflict: { mainConflictTriggers: string[]; repeatedPattern: string; emotionalMismatch: string; recoveryStyleMismatch: string };
  recovery: { likelyRecoveryPattern: string; whatAUsuallyNeeds: string; whatBUsuallyNeeds: string; bestRecoveryRule: string };
  stability: { dailyCompatibility: string; longTermRisk: string; relationshipTypeSpecificStability: string };
  elementComplement: { aNeedsFromB: Element[]; bNeedsFromA: Element[]; mutualComplement: string; oneSidednessRisk: string[] };
}

// ============================================================
// API 응답 형태 (route.ts 응답과 정합 — issues는 노출 안 됨)
// ============================================================
export interface CompatNarrativeApiResponse {
  report: CompatibilityNarrativeReport;
  futureFlow: RelationshipYearFlow[];
  extras?: CompatExtras;
  validation: { isValid: boolean; highCount: number; mediumCount: number };
  attempts: number;
  repairedSections: string[];
}

export interface CompatNarrativeReportProps {
  inputA: BirthInput;
  inputB: BirthInput;
  relationshipType: RelationshipType;
  /** UI 언어 (현재는 한국어 본문만 — 향후 확장 자리) */
  lang?: 'ko' | 'en';
  /** 처음으로 돌아가기 버튼 핸들러 (선택) */
  onRestart?: () => void;
  /** repair 시도 횟수 (기본 0 — live) */
  maxRepairAttempts?: number;
}

// ============================================================
// 클라이언트 fetch 헬퍼 — POST /api/compat-narrative
// ============================================================
export async function fetchCompatNarrativeReport(
  inputA: BirthInput,
  inputB: BirthInput,
  relationshipType: RelationshipType,
  opts?: { signal?: AbortSignal; maxRepairAttempts?: number },
): Promise<CompatNarrativeApiResponse> {
  const res = await fetch('/api/compat-narrative', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      inputA,
      inputB,
      relationshipType,
      ...(opts?.maxRepairAttempts !== undefined ? { maxRepairAttempts: opts.maxRepairAttempts } : {}),
    }),
    signal: opts?.signal,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({} as Record<string, unknown>));
    throw new Error(
      `compat-narrative 오류 (${res.status}): ${(detail as { detail?: string; error?: string }).detail || (detail as { error?: string }).error || ''}`,
    );
  }
  return (await res.json()) as CompatNarrativeApiResponse;
}

// ============================================================
// 메인 컴포넌트
// ============================================================
export default function CompatNarrativeReport({
  inputA,
  inputB,
  relationshipType,
  onRestart,
  maxRepairAttempts,
}: CompatNarrativeReportProps) {
  const [data, setData] = useState<CompatNarrativeApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    setData(null);
    setError(null);
    fetchCompatNarrativeReport(inputA, inputB, relationshipType, {
      signal: controller.signal,
      maxRepairAttempts,
    })
      .then((resp) => {
        if (!controller.signal.aborted) setData(resp);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 났어요.');
      });
    return () => controller.abort();
    // input은 객체지만 호출 시점에 새로 만들어지므로 birthDate/relationshipType을 키로 사용.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputA.birthDate, inputB.birthDate, relationshipType, maxRepairAttempts]);

  return (
    <div style={{ marginTop: 4 }}>
      {error ? (
        <ErrorCard message={error} />
      ) : !data ? (
        <LoadingCard />
      ) : (
        <ReportBody
          report={data.report}
          futureFlow={data.futureFlow}
          extras={data.extras}
          nameA={inputA.name?.trim() || '첫 사람'}
          nameB={inputB.name?.trim() || '두 사람'}
        />
      )}

      {onRestart && data && (
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          <button
            className="btn"
            style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: 'var(--text)', fontSize: 13 }}
            onClick={onRestart}
          >
            처음으로
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 리포트 본문 — 개인사주(SajuV4Report)와 동일한 sv4 night-sky 디자인.
//   히어로(관계 카드) → 줄글 섹션 아코디언(기본 접힘) → 3년흐름 → 근거 접힘.
// ============================================================
type CompatAccent = { icon: string; accent: string };
const ACCENTS = {
  overview:   { icon: '✦', accent: 'var(--orot-coral)' },
  mechanism:  { icon: '🌙', accent: '#b9a7ef' },
  attraction: { icon: '❤️', accent: '#e899ad' },
  repeated:   { icon: '🔁', accent: '#7fc6c0' },
  guide:      { icon: '🧭', accent: '#9cc99a' },
  conflict:   { icon: '⚡', accent: '#e0a86b' },
  complement: { icon: '🌿', accent: '#86c79a' },
  bonus:      { icon: '🎁', accent: '#d6a8e6' },
  final:      { icon: '⭐', accent: 'var(--orot-primary, #f0c75e)' },
  future:     { icon: '🌠', accent: '#8aa1c4' },
} satisfies Record<string, CompatAccent>;

// 본문의 'A'/'B'(사람 지칭)를 실제 이름으로 치환. 단어경계만 — DNA/A4 등은 보존.
// 한글 이름은 \w가 아니라 'A는'/'B에게' 같은 조사 앞에서도 \bA\b가 매칭된다.
function personalize(text: string, nameA: string, nameB: string): string {
  if (!text) return text;
  let t = text;
  if (nameA && nameA !== 'A') t = t.replace(/\bA\b/g, () => nameA);
  if (nameB && nameB !== 'B') t = t.replace(/\bB\b/g, () => nameB);
  return t;
}

function ReportBody({
  report,
  extras,
  nameA,
  nameB,
}: {
  report: CompatibilityNarrativeReport;
  futureFlow: RelationshipYearFlow[];
  extras?: CompatExtras;
  nameA: string;
  nameB: string;
}) {
  const px = (s?: string) => personalize(s ?? '', nameA, nameB);
  const ov = report.relationshipOverview;
  const overviewBody = px([ov.oneLine, ov.body].filter(Boolean).join('\n\n'));
  const card = report.compatibilityCard;
  const heroCard = { ...card, title: px(card.title), snsPhrase: px(card.snsPhrase) };
  return (
    <div className="sv4">
      <CompatHero card={heroCard} relType={report.evidenceView.relationshipTypeKo} />
      {extras?.persons?.length === 2 ? (
        <PersonTraitsCard persons={extras.persons} relationLine={px(report.evidenceView.dayMasterRelation?.plain ?? '')} />
      ) : null}
      {extras?.scores?.length ? <GaugesCard gauges={extras.scores} /> : null}
      <CompatSvSection title="두 사람을 한 문장으로" body={overviewBody} eyebrow="첫인상" accent={ACCENTS.overview} showDivider={false} lead />
      <CompatSvSection title="이 관계가 이렇게 느껴지는 이유" body={px(report.relationshipMechanism.body)} eyebrow="관계의 구조" accent={ACCENTS.mechanism} showDivider lead />
      <CompatSvSection title="서로에게 끌리는 지점과 엇갈리는 지점" body={px(report.attractionAndFriction.body)} eyebrow="끌림과 균열" accent={ACCENTS.attraction} showDivider lead />
      <CompatSvSection title="현실에서 반복되기 쉬운 관계 패턴" body={px(report.repeatedPattern.body)} eyebrow="반복되는 장면" accent={ACCENTS.repeated} showDivider lead />
      <CompatSvSection title="이 관계를 좋게 쓰는 방법" body={px(report.relationshipGuide.body)} eyebrow="관계 가이드" accent={ACCENTS.guide} showDivider lead />
      {extras ? (
        <CompatSvSection title="이렇게 부딪히고, 이렇게 풀려요" body={px(conflictRecoveryBody(extras))} eyebrow="싸움과 화해" accent={ACCENTS.conflict} showDivider />
      ) : null}
      {extras ? <ComplementActivitiesSection ec={extras.elementComplement} act={extras.sharedActivities} nameA={nameA} nameB={nameB} /> : null}
      {extras?.bonus ? (
        <CompatSvSection title={extras.bonus.title} body={px(extras.bonus.body)} eyebrow={extras.bonus.eyebrow} accent={ACCENTS.bonus} showDivider />
      ) : null}
      <CompatSvSection title="마지막으로 드리는 조언" body={px(report.finalAdvice.body)} eyebrow="정리하며" accent={ACCENTS.final} showDivider lead />
      <FortuneVerdictSection verdict={report.fortuneVerdict} />
      <EvidenceFold ev={report.evidenceView} />
    </div>
  );
}

// 두 사람의 기질 — 일간 기반 한눈 카드 ("이름은 ~한 기질").
function PersonTraitsCard({ persons, relationLine }: { persons: PersonTrait[]; relationLine?: string }) {
  return (
    <div className="card sv4-reveal" style={{ padding: 16, marginTop: 14 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 12 }}>✦ 두 사람의 기질</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {persons.map((p, i) => (
          <div key={i} style={{ background: 'rgba(243,231,207,0.04)', border: '1px solid var(--orot-hair)', borderRadius: 'var(--orot-r-md)', padding: '12px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--orot-coral)', fontFamily: 'var(--orot-font)' }}>{p.name}</span>
              {p.dayMasterKo && <span style={{ fontSize: 11.5, color: 'var(--orot-ink-mute)' }}>{p.dayMasterKo} 일간</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6, wordBreak: 'keep-all', fontFamily: 'var(--orot-font)' }}>{p.temperament}</div>
          </div>
        ))}
      </div>
      {relationLine && (
        <p style={{ fontSize: 13.5, color: 'var(--orot-ink)', lineHeight: 1.7, margin: '12px 0 0', wordBreak: 'keep-all', fontFamily: 'var(--orot-font)' }}>{relationLine}</p>
      )}
    </div>
  );
}

// 관계 결 요약 — 정성 레벨 + 막대(숫자 비노출). "점수 회귀 금지" 원칙 존중.
function GaugesCard({ gauges }: { gauges: RelationGauge[] }) {
  const COLOR: Record<string, string> = {
    chemistry: '#e899ad', stability: '#9cc99a', recovery: '#7fc6c0', growth: 'var(--orot-coral)',
  };
  return (
    <div className="card sv4-reveal" style={{ padding: 16, marginTop: 14 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 12 }}>✦ 관계 결 요약</div>
      <div style={{ display: 'grid', gap: 12 }}>
        {gauges.map((g) => (
          <div key={g.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--orot-ink)' }}>{g.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: COLOR[g.key] }}>{g.level}</span>
            </div>
            <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${g.fill}%`, background: COLOR[g.key], borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--orot-ink-mute)', marginTop: 4 }}>{g.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 싸움&화해 본문 조립 — conflict + recovery 평문을 헤더/불릿 마크다운으로.
function conflictRecoveryBody(extras: CompatExtras): string {
  const c = extras.conflict, r = extras.recovery;
  const lines: string[] = [];
  lines.push('## 이렇게 부딪혀요');
  if (c.repeatedPattern) lines.push(c.repeatedPattern, '');
  c.mainConflictTriggers.slice(0, 3).forEach((t) => lines.push(`- ${t}`));
  if (c.mainConflictTriggers.length) lines.push('');
  if (c.emotionalMismatch) lines.push(c.emotionalMismatch, '');
  lines.push('## 이렇게 풀려요');
  if (r.likelyRecoveryPattern) lines.push(r.likelyRecoveryPattern, '');
  if (r.whatAUsuallyNeeds) lines.push(`- 한 사람은 ${r.whatAUsuallyNeeds}`);
  if (r.whatBUsuallyNeeds) lines.push(`- 다른 한 사람은 ${r.whatBUsuallyNeeds}`);
  if (r.whatAUsuallyNeeds || r.whatBUsuallyNeeds) lines.push('');
  if (r.bestRecoveryRule) lines.push(`가장 빠른 화해 길은, ${r.bestRecoveryRule}`);
  return lines.join('\n').trim();
}

// 서로 채워주는 결 + 함께하면 좋은 것 — sv4-accordion(칩 포함).
function ComplementActivitiesSection({ ec, act, nameA, nameB }: { ec: CompatExtras['elementComplement']; act: SharedActivities | null; nameA: string; nameB: string }) {
  const a = ACCENTS.complement;
  const aKo = (ec.aNeedsFromB ?? []).map((e) => ELEMENT_KO[e]).filter(Boolean).join('·');
  const bKo = (ec.bNeedsFromA ?? []).map((e) => ELEMENT_KO[e]).filter(Boolean).join('·');
  const compLines: string[] = [];
  compLines.push(
    `이 관계에선 한 사람이 상대에게서 ${aKo || '안정된'} 기운을, 상대는 ${bKo || '새로운'} 기운을 받아 채워요. ` +
    `서로의 빈 곳을 메워주는 결이라, 곁에 둘수록 균형이 잡히는 사이예요.`,
  );
  if ((ec.oneSidednessRisk ?? []).length) {
    compLines.push('', `다만 ${ec.oneSidednessRisk[0]} — 한쪽으로 기울지 않게 조금만 신경 쓰면 좋아요.`);
  }
  const chipRow = (label: string, items: string[]) =>
    items.length ? (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--orot-ink-mute)', marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((it, i) => (
            <span key={i} style={{ fontSize: 12.5, padding: '5px 11px', borderRadius: 999, background: 'rgba(134,199,154,0.10)', border: '1px solid var(--orot-hair)', color: 'var(--orot-ink-soft)' }}>{it}</span>
          ))}
        </div>
      </div>
    ) : null;
  return (
    <>
      <CompatStarDivider />
      <details className="sv4-accordion sv4-reveal" style={{ marginTop: 6 }}>
        <summary className="sv4-accordion-summary" style={{ '--sv4-accent': a.accent } as React.CSSProperties}>
          <span className="sv4-accordion-icon" aria-hidden>{a.icon}</span>
          <span className="sv4-accordion-header">
            <span className="sv4-accordion-eyebrow" style={{ color: a.accent }}>서로를 채우는 결</span>
            <span className="sv4-accordion-title" style={{ color: a.accent }}>서로 채워주는 점 · 함께하면 좋은 것</span>
          </span>
          <span className="sv4-chevron" aria-hidden style={{ color: a.accent }}>▾</span>
        </summary>
        <div className="sv4-accordion-body">
          <NarrativeBodyView text={personalize(compLines.join('\n'), nameA, nameB)} accent={a.accent} lead />
          {act && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--orot-hair)' }}>
              <p style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--orot-ink)', margin: 0, wordBreak: 'keep-all' }}>{act.intro}</p>
              {chipRow('함께하면 좋은 활동', act.activities)}
              {chipRow('잘 맞는 음식', act.foods)}
              {chipRow('어울리는 장소', act.places)}
            </div>
          )}
        </div>
      </details>
    </>
  );
}

// ✦ 디바이더 (globals.css의 sv4-divider).
function CompatStarDivider() {
  return (
    <div className="sv4-divider" aria-hidden>
      <span className="sv4-divider-line" />
      <span className="sv4-divider-star">✦</span>
      <span className="sv4-divider-line" />
    </div>
  );
}

function compatTeaser(body: string, maxLen = 60): string {
  const first = body.split('\n').map((l) => l.trim()).find((l) => l && !/^#{1,4}\s/.test(l) && !/^[-*]\s/.test(l));
  if (!first) return '';
  return first.length > maxLen ? first.slice(0, maxLen).trimEnd() + '…' : first;
}

// 이 관계의 이름 — 개인사주 SectionIdentityHero(sv4-hero) 미러.
function CompatHero({ card, relType }: { card: CompatibilityNarrativeReport['compatibilityCard']; relType?: string }) {
  const chips = (card.keywords ?? []).filter(Boolean).slice(0, 6);
  return (
    <section className="sv4-hero sv4-reveal">
      <div className="sv4-hero-glow" aria-hidden />
      <div className="sv4-hero-inner">
        <div className="sv4-hero-eyebrow">
          <span aria-hidden>✦</span>
          <span>{relType ? `두 사람의 관계 · ${relType}` : '두 사람의 관계 카드'}</span>
        </div>
        {card.title && <h1 className="sv4-hero-title">{card.title}</h1>}
        {card.snsPhrase && <p className="sv4-hero-desc">{card.snsPhrase}</p>}
        {chips.length > 0 && (
          <div className="sv4-hero-chips">
            {chips.map((k, i) => <span key={i} className="sv4-chip">#{k}</span>)}
          </div>
        )}
      </div>
    </section>
  );
}

// 줄글 섹션 — sv4-accordion(<details>), 기본 접힘. SajuV4Report.NarrativeSection 미러.
function CompatSvSection({
  title, body, eyebrow, accent, showDivider, lead = false,
}: {
  title: string; body: string; eyebrow: string; accent: CompatAccent; showDivider: boolean; lead?: boolean;
}) {
  if (!body || !body.trim()) return null;
  const teaser = compatTeaser(body);
  return (
    <>
      {showDivider && <CompatStarDivider />}
      <details className="sv4-accordion sv4-reveal" style={{ marginTop: showDivider ? 6 : 24 }}>
        <summary className="sv4-accordion-summary" style={{ '--sv4-accent': accent.accent } as React.CSSProperties}>
          <span className="sv4-accordion-icon" aria-hidden>{accent.icon}</span>
          <span className="sv4-accordion-header">
            <span className="sv4-accordion-eyebrow" style={{ color: accent.accent }}>{eyebrow}</span>
            <span className="sv4-accordion-title" style={{ color: accent.accent }}>{title}</span>
            {teaser && <span className="sv4-accordion-teaser">{teaser}</span>}
          </span>
          <span className="sv4-chevron" aria-hidden style={{ color: accent.accent }}>▾</span>
        </summary>
        <div className="sv4-accordion-body">
          <NarrativeBodyView text={body} accent={accent.accent} lead={lead} />
        </div>
      </details>
    </>
  );
}

// 줄글 본문 — 첫 단락 리드인(sv4-lead), 하위 헤더 accent 색, 불릿 처리.
function NarrativeBodyView({ text, accent, lead = false }: { text: string; accent?: string; lead?: boolean }) {
  const headColor = accent ?? 'var(--orot-coral)';
  const lines = text.split('\n');
  const out: React.ReactElement[] = [];
  let para: string[] = [];
  let paraCount = 0;
  const flush = (k: string) => {
    if (para.length === 0) return;
    const isLead = lead && paraCount === 0;
    paraCount += 1;
    out.push(
      <p key={k} className={isLead ? 'sv4-lead' : undefined} style={{
        margin: '10px 0', fontSize: isLead ? 16.5 : 15, lineHeight: 1.85, fontWeight: isLead ? 600 : 400,
        color: isLead ? 'var(--orot-ink-soft)' : 'var(--orot-ink)', letterSpacing: isLead ? '-0.005em' : undefined,
        wordBreak: 'keep-all',
      }}>{para.join(' ')}</p>,
    );
    para = [];
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flush('p-' + i); return; }
    if (/^#{2,4}\s+/.test(trimmed)) {
      flush('p-' + i);
      out.push(<div key={'h-' + i} style={{ fontSize: 14, fontWeight: 700, color: headColor, marginTop: 14, marginBottom: 4, fontFamily: 'var(--orot-font)' }}>{trimmed.replace(/^#+\s+/, '')}</div>);
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flush('p-' + i);
      out.push(<div key={'li-' + i} style={{ fontSize: 15, lineHeight: 1.85, marginLeft: 12, color: 'var(--orot-ink)' }}>· {trimmed.replace(/^[-*]\s+/, '')}</div>);
      return;
    }
    para.push(trimmed);
  });
  flush('p-final');
  return <>{out}</>;
}

// 3년 흐름 — sv4-accordion 안에 연도 카드.
function FutureFlowSection({ flow }: { flow: RelationshipYearFlow[] }) {
  const accent = ACCENTS.future;
  return (
    <>
      <CompatStarDivider />
      <details className="sv4-accordion sv4-reveal" style={{ marginTop: 6 }}>
        <summary className="sv4-accordion-summary" style={{ '--sv4-accent': accent.accent } as React.CSSProperties}>
          <span className="sv4-accordion-icon" aria-hidden>{accent.icon}</span>
          <span className="sv4-accordion-header">
            <span className="sv4-accordion-eyebrow" style={{ color: accent.accent }}>시간의 결</span>
            <span className="sv4-accordion-title" style={{ color: accent.accent }}>앞으로 3년, 관계의 흐름</span>
          </span>
          <span className="sv4-chevron" aria-hidden style={{ color: accent.accent }}>▾</span>
        </summary>
        <div className="sv4-accordion-body" style={{ display: 'grid', gap: 8 }}>
          {flow.map((y, i) => (
            <div key={i} style={{ borderRadius: 10, border: '1px solid var(--orot-hair)', background: 'rgba(255,255,255,0.02)', padding: '12px 14px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: accent.accent, marginBottom: 6 }}>
                {y.year}{y.theme && <span style={{ color: 'var(--orot-ink-mute)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>· {y.theme}</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.7 }}>
                {y.opportunity && <div><b style={{ color: '#7c8' }}>잡으면 좋은 결:</b> {y.opportunity}</div>}
                {y.caution && <div style={{ marginTop: 3 }}><b style={{ color: '#c46' }}>주의할 결:</b> {y.caution}</div>}
                {y.advice && <div style={{ marginTop: 3 }}><b style={{ color: 'var(--orot-ink-mute)' }}>조언:</b> {y.advice}</div>}
              </div>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}

// ── compatibilityCard (결정적: 한마디 + SNS + 키워드) ──
function CompatibilityCardView({
  card,
  relationshipTypeKo,
}: {
  card: CompatibilityNarrativeReport['compatibilityCard'];
  relationshipTypeKo?: string;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 20,
        marginBottom: 16,
        background: 'linear-gradient(135deg, rgba(240,199,94,0.10), rgba(243,160,146,0.05))',
        border: '1px solid var(--orot-coral-faint)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div className="orot-eyebrow">✦ 두 사람의 관계 카드</div>
        {relationshipTypeKo && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--orot-r-sm)',
              background: 'rgba(240,199,94,0.16)',
              border: '1px solid var(--orot-coral-faint)',
              color: 'var(--orot-coral)',
              whiteSpace: 'nowrap',
            }}
          >
            {relationshipTypeKo}
          </span>
        )}
      </div>
      {card.title && (
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--orot-coral)',
            margin: '0 0 6px',
            letterSpacing: '-0.015em',
            lineHeight: 1.3,
            fontFamily: 'var(--orot-font)',
            background: 'none',
            WebkitTextFillColor: 'var(--orot-coral)',
          }}
        >
          {card.title}
        </h1>
      )}
      {card.snsPhrase && (
        <div style={{ fontSize: 14, color: 'var(--orot-ink-soft)', marginBottom: 12, lineHeight: 1.6 }}>
          {card.snsPhrase}
        </div>
      )}
      {card.keywords.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {card.keywords.map((k, i) => (
            <span
              key={i}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 'var(--orot-r-sm)',
                background: 'rgba(243,160,146,0.12)',
                border: '1px solid var(--orot-coral-faint)',
                color: 'var(--orot-coral)',
                fontWeight: 600,
              }}
            >
              #{k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── relationshipOverview (oneLine 강조 + body 줄글) ──
function OverviewView({
  overview,
}: {
  overview: CompatibilityNarrativeReport['relationshipOverview'];
}) {
  if (!overview.oneLine && !overview.body) return null;
  return (
    <Section title="두 사람의 관계를 한 문장으로 말하면" eyebrow="✦ 첫인상">
      {overview.oneLine && (
        <div
          style={{
            marginBottom: 14,
            padding: '12px 14px',
            borderRadius: 'var(--orot-r-md)',
            background: 'rgba(255,255,255,0.04)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--orot-ink)',
            lineHeight: 1.6,
          }}
        >
          {overview.oneLine}
        </div>
      )}
      {overview.body && <Body text={overview.body} />}
    </Section>
  );
}

// ── 공통 prose 섹션 (줄글 body 하나) ──
function ProseSection({ title, eyebrow, body }: { title: string; eyebrow?: string; body: string }) {
  if (!body) return null;
  return (
    <Section title={title} eyebrow={eyebrow}>
      <Body text={body} />
    </Section>
  );
}

// ── futureFlow (deterministic 3년 흐름 카드 — 유지) ──
function FutureFlowView({ flow }: { flow: RelationshipYearFlow[] }) {
  return (
    <Section title="앞으로 3년, 관계의 흐름" eyebrow="✦ 시간의 결">
      {flow.map((y, i) => (
        <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--orot-coral)' }}>
            {y.year}
            {y.theme && (
              <span style={{ color: 'var(--orot-ink-mute)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                · {y.theme}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', lineHeight: 1.7 }}>
            {y.opportunity && (
              <div><b style={{ color: '#7c8' }}>잡으면 좋은 결:</b> {y.opportunity}</div>
            )}
            {y.caution && (
              <div style={{ marginTop: 3 }}><b style={{ color: '#c46' }}>주의할 결:</b> {y.caution}</div>
            )}
            {y.advice && (
              <div style={{ marginTop: 3 }}><b style={{ color: 'var(--orot-ink-mute)' }}>조언:</b> {y.advice}</div>
            )}
          </div>
        </div>
      ))}
    </Section>
  );
}

// ── evidenceView (deterministic — 접힘 영역) ──
function EvidenceFold({ ev }: { ev: CompatibilityNarrativeReport['evidenceView'] }) {
  const cc = ev.combinationConflicts;
  const combos = [
    ...cc.combinations,
    ...cc.conflicts,
    ...cc.punishments,
    ...cc.destructions,
    ...cc.harms,
  ];
  return (
    <details className="card" style={{ marginTop: 18, padding: 14 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'var(--orot-ink-mute)' }}>
        📜 명리 근거 보기
      </summary>
      <div style={{ fontSize: 12, marginTop: 12, lineHeight: 1.8, color: 'var(--orot-ink-soft)' }}>
        <p>
          <b>관계 유형</b> {ev.relationshipTypeKo}
          {ev.archetypeTitle ? ` · ${ev.archetypeTitle}` : ''}
        </p>
        {ev.dayMasterRelation.plain && (
          <p>
            <b>일간 관계</b> {ev.dayMasterRelation.plain}
          </p>
        )}
        {ev.spousePalaceRelation.plain && (
          <p>
            <b>일지(배우자궁) 관계</b> {ev.spousePalaceRelation.plain}
          </p>
        )}
        {ev.elementComplement.mutual && (
          <p>
            <b>오행 보완</b> {ev.elementComplement.mutual}
          </p>
        )}
        {ev.usefulGodInteraction.plain && (
          <p>
            <b>용신 작용</b> {ev.usefulGodInteraction.plain}
          </p>
        )}
        {combos.length > 0 && (
          <div>
            <b>합·충·형·파·해</b>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {glossSajuNotations(combos).map((g, i) => (
                <li key={i} style={{ marginBottom: 2 }}>{g}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

// ============================================================
// 공통 UI helper (YearlyV4Report와 동일 패턴)
// ============================================================
function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      {eyebrow && <div className="orot-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
      <h2
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--orot-coral)',
          margin: '0 0 16px',
          letterSpacing: '-0.01em',
          lineHeight: 1.35,
          fontFamily: 'var(--orot-font)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Body({ text }: { text: string }) {
  if (!text) return null;
  const paras = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--orot-ink)' }}>
      {paras.map((p, i) => (
        <p key={i} style={{ margin: '0 0 10px' }}>
          {p.trim()}
        </p>
      ))}
    </div>
  );
}

function LoadingCard() {
  return (
    <div
      className="card"
      style={{
        padding: 24,
        marginTop: 8,
        marginBottom: 16,
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(243,160,146,0.08), rgba(240,199,94,0.04))',
        border: '1px solid var(--orot-coral-faint)',
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--orot-coral)', fontWeight: 600, marginBottom: 8 }}>✦ 관계의 결을 읽는 중</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--orot-ink)', marginBottom: 10 }}>
        두 사람의 관계 흐름을 줄글로 풀어보는 중이에요.
      </div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', lineHeight: 1.6 }}>
        궁합의 끌림과 엇갈림을 정리하고 있어요.<br />
        관계의 흐름을 차분히 읽어보는 중이에요.<br />
        <span style={{ color: 'var(--orot-ink-mute)' }}>(약 30~60초 소요)</span>
      </div>
      <div
        style={{
          marginTop: 14,
          height: 4,
          borderRadius: 2,
          overflow: 'hidden',
          background: 'rgba(243,160,146,0.12)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '30%',
            background: 'var(--orot-coral)',
            animation: 'compatNarrativeLoadingBar 1.6s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes compatNarrativeLoadingBar {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div
      className="card"
      style={{
        padding: 16,
        marginTop: 8,
        marginBottom: 16,
        background: 'rgba(240,140,140,0.08)',
        borderColor: 'rgba(240,140,140,0.3)',
      }}
    >
      <div style={{ fontSize: 14, color: '#c46', fontWeight: 700, marginBottom: 6 }}>궁합을 불러오지 못했어요</div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}
