'use client';

// 올해운세 V4 리포트 화면 (Y9 — UI wiring).
//
// ─────────────────────────────────────────────────────────────────────────
// 안전 / 통합 메모 (PRODUCTION SAFETY)
// ─────────────────────────────────────────────────────────────────────────
// 이 컴포넌트는 NEXT_PUBLIC_YEARLY_FORTUNE_UI_ENABLED === 'true' 일 때만
// SajuApp.tsx에서 렌더된다. 플래그가 꺼져 있으면(default) SajuApp은 기존 v3
// 인라인 yearly 경로(fetchYearlyReading + renderYearlyFortune 본문)를 그대로
// 사용하므로 프로덕션 동작은 byte-identical 하다.
//
// SajuApp.tsx 통합 지점 (이미 적용됨 — renderYearlyFortune() 상단):
//   const yearlyV4On = process.env.NEXT_PUBLIC_YEARLY_FORTUNE_UI_ENABLED === 'true';
//   if (yearlyV4On && appMode === 'yearly' && sajuResult) {
//     return <YearlyV4Report input={buildYearlyV4Input()} lang={lang} onRestart={...} />;
//   }
//   // ...아래는 기존 v3 경로 그대로...
//
// 이 컴포넌트는 자체적으로 POST /api/yearly-fortune (Y7) 를 호출한다.
// body: { input: YearlyFortuneInput, maxRepairAttempts? }
// 응답: { analysisCore, report: YearlyFortuneReport, validation, attempts, repairedSections }
//
// 디자인: v3 Orot 시스템(card, orot-eyebrow, orot-coral, var(--orot-*))에 맞춤.
// 톤: 친근 존댓말 (yearly UI 주변 톤과 일치).

import React, { useEffect, useRef, useState } from 'react';
import type { BirthInput } from '@/domain/saju/calendar/normalizeBirthInput';
import { FortuneVerdictSection } from '@/components/FortuneVerdictSection';
import { usefulGodRelationLabel } from '@/components/evidence/notationGloss';
import type {
  YearlyFortuneReport,
  YearlyRelationshipStatus,
} from '@/domain/saju/yearly/yearlyTypes';

// ============================================================
// 입력 — 호출자(SajuApp)가 만들어 넘기는 client용 input
// ============================================================
export interface YearlyV4Input {
  birth: BirthInput;
  /** YYYY-MM-DD (생성 기준일). */
  currentDate: string;
  targetYear?: number;
  relationshipStatus?: YearlyRelationshipStatus;
  userContext?: Record<string, unknown>;
}

export interface YearlyV4ApiResponse {
  analysisCore: unknown;
  report: YearlyFortuneReport;
  validation: { isValid: boolean; issues: Array<{ type: string; reason: string }> };
  attempts: number;
  repairedSections: string[];
}

export interface YearlyV4ReportProps {
  input: YearlyV4Input;
  /** UI 언어 (현재는 한국어 본문만 — 향후 확장 자리) */
  lang?: 'ko' | 'en';
  /** 처음으로 돌아가기 버튼 핸들러 */
  onRestart?: () => void;
  /** repair 시도 횟수 (기본 0 — 단일 wave로 maxDuration 90s 예산 보호; route live 기본값과 일치).
   *  repair 2nd wave는 무거운 remainingMonths 섹션과 겹치면 90s 초과 → 504 위험. */
  maxRepairAttempts?: number;
  /** 공유/저장 기능 — SajuApp에서 주입 */
  userName?: string;
  isSharing?: boolean;
  onShareText?: (text: string, title: string) => void;
  onSaveText?: (text: string, title: string) => void;
}

// ============================================================
// 마크다운 직렬화 — 저장/공유용. renderTOC가 ##N.제목## 패턴으로 파싱한다.
// 제목 안에 '#' 미포함, 닫는 ## 동일 줄. 섹션 번호는 1부터 순차.
// ============================================================
export function buildYearlyMarkdown(report: YearlyFortuneReport): string {
  const lines: string[] = [];
  let n = 0;
  const sec = (title: string, body: string) => {
    n += 1;
    lines.push(`##${n}.${title}##`, '', body.trim(), '');
  };

  // 1. 올해의 별빛 흐름 (yearFlowCard + yearlyOverview)
  const card = report.yearFlowCard;
  const ov = report.yearlyOverview;
  const cardBody = [
    card.title,
    card.subtitle ? card.subtitle : '',
    card.keywords.length ? card.keywords.map((k) => `#${k}`).join(' ') : '',
    card.summary ? card.summary : '',
    ov.oneLine ? `"${ov.oneLine}"` : '',
    ov.body ? ov.body : '',
  ].filter(Boolean).join('\n\n');
  sec('올해의 별빛 흐름', cardBody);

  // 2. 올해 운이 움직이는 방식 (yearlyMechanism)
  if (report.yearlyMechanism.body) {
    sec('올해 운이 움직이는 방식', report.yearlyMechanism.body);
  }

  // 3. 남은 올해 월별 흐름 (remainingMonths)
  if (report.remainingMonths.length > 0) {
    const monthBody = report.remainingMonths.map((m) => {
      const parts = [
        `${m.monthLabel}${m.periodLabel ? ' (' + m.periodLabel + ')' : ''}${m.keyword ? ' — ' + m.keyword : ''}`,
        m.body ? m.body : '',
        m.work ? `일: ${m.work}` : '',
        m.money ? `돈: ${m.money}` : '',
        m.relationship ? `관계: ${m.relationship}` : '',
        m.goodChoice ? `좋은 선택: ${m.goodChoice}` : '',
        m.caution ? `주의: ${m.caution}` : '',
      ].filter(Boolean);
      return parts.join('\n');
    }).join('\n\n');
    sec('남은 올해 월별 흐름', monthBody);
  }

  // 4. 주제별 흐름 (topicFortunes)
  const tf = report.topicFortunes;
  const topicBody = [
    tf.career ? `일·커리어\n${tf.career}` : '',
    tf.money ? `돈\n${tf.money}` : '',
    tf.relationship ? `관계·연애\n${tf.relationship}` : '',
    tf.rhythm ? `리듬·컨디션\n${tf.rhythm}` : '',
  ].filter(Boolean).join('\n\n');
  if (topicBody) sec('일·돈·관계·리듬에서 들어오는 변화', topicBody);

  // 5. 올해의 선택 가이드 (actionGuide)
  const ag = report.actionGuide;
  const agParts: string[] = [];
  if (ag.mustCatch.length) agParts.push(`꼭 잡으면 좋은 결\n${ag.mustCatch.map((c) => `- ${c}`).join('\n')}`);
  if (ag.betterAvoid.length) agParts.push(`잠깐 멈춰서 볼 결\n${ag.betterAvoid.map((c) => `- ${c}`).join('\n')}`);
  if (ag.bestStrategy) agParts.push(`올해의 한 수\n${ag.bestStrategy}`);
  if (agParts.length) sec('올해의 선택 가이드', agParts.join('\n\n'));

  // 6. 이후 2년 큰 흐름 (nextTwoYears)
  if (report.nextTwoYears.length > 0) {
    const nextBody = report.nextTwoYears.map((y) => {
      const parts = [
        `${y.year}${y.keyword ? ' — ' + y.keyword : ''}`,
        y.summary ? y.summary : '',
        y.opportunity ? `잡으면 좋은 결: ${y.opportunity}` : '',
        y.caution ? `주의할 결: ${y.caution}` : '',
      ].filter(Boolean);
      return parts.join('\n');
    }).join('\n\n');
    sec('이후 2년 큰 흐름', nextBody);
  }

  // 7. fortuneVerdict (flag ON일 때만 present)
  if (report.fortuneVerdict) {
    const fv = report.fortuneVerdict;
    const fvParts: string[] = [];
    if (fv.lead) fvParts.push(fv.lead);
    fv.sections.forEach((s) => {
      fvParts.push(s.title);
      fvParts.push(s.body.join('\n\n'));
    });
    if (fv.timingSummary) fvParts.push(fv.timingSummary);
    if (fv.closing) fvParts.push(fv.closing);
    sec(fv.title, fvParts.join('\n\n'));
  }

  // 8. 명리 근거 (evidenceView)
  const ev = report.evidenceView;
  const evParts: string[] = [
    `세운 간지: ${ev.yearGanji.display} / 현재 대운: ${ev.currentDaewoonPillar}`,
    `세운 십성: 천간 ${ev.yearStemTenGod} · 지지 ${ev.yearBranchTenGod} / 세운 오행: ${ev.yearElement}`,
  ];
  if (ev.natalSewoonInteractions.length) {
    evParts.push(`세운-원국 작용: ${ev.natalSewoonInteractions.map((it) => `${it.pillar} ${it.kind}: ${it.plain}`).join(' / ')}`);
  }
  if (ev.daewoonSewoonInteractions.length) {
    evParts.push(`대운-세운 작용: ${ev.daewoonSewoonInteractions.map((it) => `${it.kind}: ${it.plain}`).join(' / ')}`);
  }
  if (ev.monthlySummary.length) {
    evParts.push(`월별 요약: ${ev.monthlySummary.map((m) => `${m.monthLabel}(${m.ganji}) ${m.keyword}`).join(' / ')}`);
  }
  if (ev.activatedSpecialStars.length) {
    evParts.push(`활성 신살: ${ev.activatedSpecialStars.map((s) => `${s.name}(${s.source}): ${s.plain}`).join(' / ')}`);
  }
  sec('명리 근거', evParts.join('\n'));

  return lines.join('\n');
}

// ============================================================
// 클라이언트 fetch 헬퍼 — POST /api/yearly-fortune
// ============================================================
export async function fetchYearlyV4Report(
  input: YearlyV4Input,
  opts?: { signal?: AbortSignal; maxRepairAttempts?: number },
): Promise<YearlyV4ApiResponse> {
  const res = await fetch('/api/yearly-fortune', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      input,
      ...(opts?.maxRepairAttempts !== undefined ? { maxRepairAttempts: opts.maxRepairAttempts } : {}),
    }),
    signal: opts?.signal,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({} as Record<string, unknown>));
    throw new Error(
      `yearly-fortune 오류 (${res.status}): ${(detail as { detail?: string; error?: string }).detail || (detail as { error?: string }).error || ''}`,
    );
  }
  return (await res.json()) as YearlyV4ApiResponse;
}

// ============================================================
// 메인 컴포넌트
// ============================================================
export default function YearlyV4Report({
  input, onRestart, maxRepairAttempts = 0,
  lang, userName, isSharing, onShareText, onSaveText,
}: YearlyV4ReportProps) {
  const [data, setData] = useState<YearlyV4ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    setData(null);
    setError(null);
    fetchYearlyV4Report(input, { signal: controller.signal, maxRepairAttempts })
      .then((resp) => {
        if (!controller.signal.aborted) setData(resp);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 났어요.');
      });
    return () => controller.abort();
    // input은 객체지만 호출 시점에 새로 만들어지므로 birthDate/currentDate를 키로 사용.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.birth.birthDate, input.currentDate, input.targetYear, maxRepairAttempts]);

  return (
    <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: 24, paddingBottom: 32 }}>
      {onRestart && (
        <button
          onClick={onRestart}
          aria-label="처음으로"
          style={{
            background: 'transparent', border: 0, color: 'var(--orot-ink)',
            fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
            fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> 처음으로
        </button>
      )}

      {error ? (
        <ErrorCard message={error} />
      ) : !data ? (
        <LoadingCard />
      ) : (
        <ReportBody report={data.report} />
      )}

      {/* 공유 / 저장 / 처음으로 — 결과 로드 완료 시에만 표시 */}
      {data && (
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          {onShareText && (
            <button
              className="orot-btn orot-btn--ghost"
              style={{ flex: 1, height: 44, fontSize: 13 }}
              disabled={isSharing}
              onClick={() => {
                const title = (userName || '') + (lang === 'en' ? "'s 2026 Fortune" : '의 2026 운세');
                onShareText(buildYearlyMarkdown(data.report), title);
              }}
            >
              {isSharing ? '🔗 생성 중...' : '🔗 링크 공유'}
            </button>
          )}
          {onSaveText && (
            <button
              className="orot-btn orot-btn--ghost"
              style={{ flex: 1, height: 44, fontSize: 13 }}
              onClick={() => {
                const title = (userName || '') + (lang === 'en' ? "'s 2026 Fortune" : '의 2026 운세');
                onSaveText(buildYearlyMarkdown(data.report), title);
              }}
            >
              💾 {lang === 'en' ? 'Save Result' : '결과 저장'}
            </button>
          )}
          {onRestart && (
            <button
              className="orot-btn orot-btn--ghost"
              style={{ flex: 1, height: 44, fontSize: 13 }}
              onClick={onRestart}
            >
              {lang === 'en' ? 'Restart' : '처음으로'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// sv4 night-sky 아코디언 — 섹션별 악센트/아이콘. (SajuV4Report.SECTION_ACCENTS 미러)
// ============================================================
type SectionAccent = { icon: string; accent: string };
const YEARLY_ACCENTS: Record<string, SectionAccent> = {
  mechanism: { icon: '🌙', accent: '#b9a7ef' },
  months:    { icon: '🗓️', accent: '#7fc6c0' },
  topics:    { icon: '🧭', accent: 'var(--orot-coral)' },
  action:    { icon: '⭐', accent: 'var(--primary,#f0c75e)' },
  next:      { icon: '🌠', accent: '#8aa1c4' },
  evidence:  { icon: '📜', accent: 'var(--orot-ink-mute)' },
};

// ✦ 디바이더 — SajuV4Report / CompatV4Report와 동일 모티프.
function YearlyStarDivider() {
  return (
    <div className="sv4-divider" aria-hidden>
      <span className="sv4-divider-line" />
      <span className="sv4-divider-star">✦</span>
      <span className="sv4-divider-line" />
    </div>
  );
}

// 본문 첫 비어있지 않은 줄을 티저로 — summary 한 줄 미리보기.
function extractTeaser(body: string, maxLen = 60): string {
  const first = (body ?? '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !/^#{1,4}\s/.test(l) && !/^[-*]\s/.test(l));
  if (!first) return '';
  return first.length > maxLen ? first.slice(0, maxLen).trimEnd() + '…' : first;
}

// 줄글/구조 콘텐츠를 감싸는 sv4-accordion 섹션 하나. 기본 접힘(no open).
// teaser가 없으면(구조형 섹션) teaserText로 직접 한 줄 미리보기를 넣는다.
function AccordionSection({
  title,
  eyebrow,
  accent,
  showDivider,
  teaserText,
  children,
}: {
  title: string;
  eyebrow: string;
  accent: SectionAccent;
  showDivider: boolean;
  teaserText?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {showDivider && <YearlyStarDivider />}
      <details className="sv4-accordion sv4-reveal" style={{ marginTop: showDivider ? 6 : 4 }}>
        <summary className="sv4-accordion-summary" style={{ '--sv4-accent': accent.accent } as React.CSSProperties}>
          <span className="sv4-accordion-icon" aria-hidden>{accent.icon}</span>
          <span className="sv4-accordion-header">
            <span className="sv4-accordion-eyebrow" style={{ color: accent.accent }}>{eyebrow}</span>
            <span className="sv4-accordion-title" style={{ color: accent.accent }}>{title}</span>
            {teaserText && <span className="sv4-accordion-teaser">{teaserText}</span>}
          </span>
          <span className="sv4-chevron" aria-hidden style={{ color: accent.accent }}>▾</span>
        </summary>
        <div className="sv4-accordion-body">{children}</div>
      </details>
    </>
  );
}

// ============================================================
// 리포트 본문 — 리드 카드 + sv4 아코디언(모두 기본 접힘)
// ============================================================
function ReportBody({ report }: { report: YearlyFortuneReport }) {
  return (
    <div style={{ marginTop: 4 }}>
      {/* 리드 카드 — 항상 펼쳐진 hero (아코디언 아님) */}
      <YearFlowCardView card={report.yearFlowCard} overview={report.yearlyOverview} />

      {/* 이후 섹션은 night-sky 아코디언, 모두 기본 접힘 */}
      <MechanismView body={report.yearlyMechanism.body} />
      {report.remainingMonths.length > 0 && <RemainingMonthsView months={report.remainingMonths} />}
      <TopicFortunesView topics={report.topicFortunes} />
      <ActionGuideView guide={report.actionGuide} />
      {report.nextTwoYears.length > 0 && <NextTwoYearsView years={report.nextTwoYears} />}

      <FortuneVerdictSection verdict={report.fortuneVerdict} />
      <EvidenceView ev={report.evidenceView} />
    </div>
  );
}

// ── yearFlowCard + yearlyOverview ──
function YearFlowCardView({
  card,
  overview,
}: {
  card: YearlyFortuneReport['yearFlowCard'];
  overview: YearlyFortuneReport['yearlyOverview'];
}) {
  return (
    <div
      className="card"
      style={{
        padding: 20, marginBottom: 16,
        background: 'linear-gradient(135deg, rgba(240,199,94,0.10), rgba(243,160,146,0.05))',
        border: '1px solid var(--orot-coral-faint)',
      }}
    >
      <div className="orot-eyebrow" style={{ marginBottom: 8 }}>✦ 올해의 별빛 흐름</div>
      <h1
        style={{
          fontSize: 24, fontWeight: 800, color: 'var(--orot-coral)',
          margin: '0 0 6px', letterSpacing: '-0.015em', lineHeight: 1.3,
          fontFamily: 'var(--orot-font)',
          background: 'none', WebkitTextFillColor: 'var(--orot-coral)',
        }}
      >
        {card.title}
      </h1>
      {card.subtitle && (
        <div style={{ fontSize: 14, color: 'var(--orot-ink-soft)', marginBottom: 12 }}>{card.subtitle}</div>
      )}
      {card.keywords.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {card.keywords.map((k, i) => (
            <span
              key={i}
              style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 'var(--orot-r-sm)',
                background: 'rgba(243,160,146,0.12)', border: '1px solid var(--orot-coral-faint)',
                color: 'var(--orot-coral)', fontWeight: 600,
              }}
            >
              #{k}
            </span>
          ))}
        </div>
      )}
      {card.summary && <Body text={card.summary} />}
      {overview.oneLine && (
        <div
          style={{
            marginTop: 14, padding: '12px 14px', borderRadius: 'var(--orot-r-md)',
            background: 'rgba(255,255,255,0.04)', fontSize: 15, fontWeight: 700,
            color: 'var(--orot-ink)', lineHeight: 1.6,
          }}
        >
          {overview.oneLine}
        </div>
      )}
      {overview.body && (
        <div style={{ marginTop: 12 }}>
          <Body text={overview.body} />
        </div>
      )}
    </div>
  );
}

// ── yearlyMechanism (줄글) ──
function MechanismView({ body }: { body: string }) {
  if (!body) return null;
  const a = YEARLY_ACCENTS.mechanism;
  return (
    <AccordionSection title="올해 운이 움직이는 방식" eyebrow="흐름의 구조" accent={a} showDivider={false} teaserText={extractTeaser(body)}>
      <Body text={body} lead accent={a.accent} />
    </AccordionSection>
  );
}

// ── remainingMonths (월별 구조 카드) ──
function RemainingMonthsView({ months }: { months: YearlyFortuneReport['remainingMonths'] }) {
  const a = YEARLY_ACCENTS.months;
  const teaser = months[0] ? `${months[0].monthLabel}${months[0].keyword ? ' · ' + months[0].keyword : ''}` : '';
  return (
    <AccordionSection title="남은 올해 월별 흐름" eyebrow="달마다 달라지는 결" accent={a} showDivider teaserText={teaser}>
      {months.map((m, i) => {
        // 카드·라벨 없이 줄글로: 본문 + 일/돈/관계를 한 문단으로, 선택/주의를 마무리 문단으로 엮는다.
        const prose = [
          m.body,
          [m.work, m.money, m.relationship].map((s) => (s || '').trim()).filter(Boolean).join(' '),
          [m.goodChoice, m.caution].map((s) => (s || '').trim()).filter(Boolean).join(' '),
        ].filter(Boolean).join('\n\n');
        return (
          <div key={i} style={{ marginBottom: i < months.length - 1 ? 20 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: m.periodLabel ? 2 : 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: a.accent, fontFamily: 'var(--orot-font)' }}>{m.monthLabel}</span>
              {m.keyword && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--orot-ink-soft)' }}>· {m.keyword}</span>}
            </div>
            {m.periodLabel && <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginBottom: 6 }}>{m.periodLabel}</div>}
            <Body text={prose} />
          </div>
        );
      })}
    </AccordionSection>
  );
}

// ── topicFortunes (주제별 줄글) ──
function TopicFortunesView({ topics }: { topics: YearlyFortuneReport['topicFortunes'] }) {
  const a = YEARLY_ACCENTS.topics;
  const rows: Array<{ label: string; value: string }> = [
    { label: '일·커리어', value: topics.career },
    { label: '돈', value: topics.money },
    { label: '관계·연애', value: topics.relationship },
    { label: '리듬·컨디션', value: topics.rhythm },
  ];
  const visible = rows.filter((r) => r.value);
  return (
    <AccordionSection title="일·돈·관계·리듬에서 들어오는 변화" eyebrow="주제별 흐름" accent={a} showDivider teaserText={visible.map((r) => r.label).join(' · ')}>
      {visible.map((r, i) => (
        <div key={i} style={{ marginBottom: i < visible.length - 1 ? 20 : 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: a.accent, marginBottom: 4, fontFamily: 'var(--orot-font)' }}>{r.label}</div>
          <Body text={r.value} />
        </div>
      ))}
    </AccordionSection>
  );
}

// ── actionGuide ──
function ActionGuideView({ guide }: { guide: YearlyFortuneReport['actionGuide'] }) {
  const a = YEARLY_ACCENTS.action;
  const teaser = guide.mustCatch[0] ?? guide.bestStrategy?.split('\n').find((l) => l.trim()) ?? '올해의 한 수';
  return (
    <AccordionSection title="올해의 선택 가이드" eyebrow="무엇을 잡고 무엇을 놓을까" accent={a} showDivider teaserText={teaser}>
      {guide.mustCatch.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(120,200,140,0.95)', marginBottom: 4, fontFamily: 'var(--orot-font)' }}>
            꼭 잡으면 좋은 결
          </div>
          <Body text={guide.mustCatch.map((c) => c.trim()).filter(Boolean).join('\n\n')} />
        </div>
      )}
      {guide.betterAvoid.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(240,140,140,0.95)', marginBottom: 4, fontFamily: 'var(--orot-font)' }}>
            잠깐 멈춰서 볼 결
          </div>
          <Body text={guide.betterAvoid.map((c) => c.trim()).filter(Boolean).join('\n\n')} />
        </div>
      )}
      {guide.bestStrategy && (
        <div style={{ marginTop: 4 }}>
          <div className="orot-eyebrow" style={{ marginBottom: 6, color: a.accent }}>올해의 한 수</div>
          <Body text={guide.bestStrategy} lead accent={a.accent} />
        </div>
      )}
    </AccordionSection>
  );
}

// ── nextTwoYears ──
function NextTwoYearsView({ years }: { years: YearlyFortuneReport['nextTwoYears'] }) {
  const a = YEARLY_ACCENTS.next;
  const teaser = years[0] ? `${years[0].year}${years[0].keyword ? ' · ' + years[0].keyword : ''}` : '';
  return (
    <AccordionSection title="이후 2년 큰 흐름" eyebrow="앞으로" accent={a} showDivider teaserText={teaser}>
      {years.map((y, i) => {
        const prose = [
          y.summary,
          [y.opportunity, y.caution].map((s) => (s || '').trim()).filter(Boolean).join(' '),
        ].filter(Boolean).join('\n\n');
        return (
          <div key={i} style={{ marginBottom: i < years.length - 1 ? 20 : 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: a.accent, marginBottom: 4, fontFamily: 'var(--orot-font)' }}>
              {y.year}
              {y.keyword && (
                <span style={{ color: 'var(--orot-ink-soft)', fontWeight: 600, fontSize: 13, marginLeft: 8 }}>
                  · {y.keyword}
                </span>
              )}
            </div>
            <Body text={prose} />
          </div>
        );
      })}
    </AccordionSection>
  );
}

// ── evidenceView (deterministic — sv4 아코디언, 차분한 ink-mute 톤) ──
function EvidenceView({ ev }: { ev: YearlyFortuneReport['evidenceView'] }) {
  const a = YEARLY_ACCENTS.evidence;
  return (
    <>
      <YearlyStarDivider />
      <details className="sv4-accordion sv4-reveal" style={{ marginTop: 6 }}>
        <summary className="sv4-accordion-summary" style={{ '--sv4-accent': 'var(--orot-hair-strong)' } as React.CSSProperties}>
          <span className="sv4-accordion-icon" aria-hidden>{a.icon}</span>
          <span className="sv4-accordion-header">
            <span className="sv4-accordion-eyebrow" style={{ color: a.accent }}>근거</span>
            <span className="sv4-accordion-title" style={{ color: 'var(--orot-ink-soft)', fontSize: 15 }}>명리 근거 보기</span>
          </span>
          <span className="sv4-chevron" aria-hidden style={{ color: a.accent }}>▾</span>
        </summary>
        <div className="sv4-accordion-body" style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--orot-ink-soft)' }}>
        <p>
          <b>세운 간지</b> {ev.yearGanji.display} / <b>현재 대운</b> {ev.currentDaewoonPillar}
        </p>
        <p>
          <b>세운 십성</b> 천간 {ev.yearStemTenGod} · 지지 {ev.yearBranchTenGod} / <b>세운 오행</b> {ev.yearElement} (용신 관계: {usefulGodRelationLabel(ev.usefulGodRelation)})
        </p>
        {ev.natalSewoonInteractions.length > 0 && (
          <p>
            <b>세운–원국 작용</b>{' '}
            {ev.natalSewoonInteractions.map((it) => `${it.pillar} ${it.kind}: ${it.plain}`).join(' / ')}
          </p>
        )}
        {ev.daewoonSewoonInteractions.length > 0 && (
          <p>
            <b>대운–세운 작용</b>{' '}
            {ev.daewoonSewoonInteractions.map((it) => `${it.kind}: ${it.plain}`).join(' / ')}
          </p>
        )}
        {ev.monthlySummary.length > 0 && (
          <p>
            <b>월별 요약</b>{' '}
            {ev.monthlySummary.map((m) => `${m.monthLabel}(${m.ganji}) ${m.keyword}`).join(' / ')}
          </p>
        )}
        {ev.activatedSpecialStars.length > 0 && (
          <p>
            <b>활성 신살</b>{' '}
            {ev.activatedSpecialStars.map((s) => `${s.name}(${s.source}): ${s.plain}`).join(' / ')}
          </p>
        )}
        </div>
      </details>
    </>
  );
}

// ============================================================
// 공통 UI helper
// ============================================================
// 줄글 본문. lead=true면 첫 단락을 리드인(sv4-lead, 크게/진하게)으로 렌더.
function Body({ text, lead = false, accent }: { text: string; lead?: boolean; accent?: string }) {
  if (!text) return null;
  const paras = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--orot-ink)' }}>
      {paras.map((p, i) => {
        const isLead = lead && i === 0;
        return (
          <p
            key={i}
            className={isLead ? 'sv4-lead' : undefined}
            style={{
              margin: '0 0 10px',
              fontSize: isLead ? 16.5 : 15,
              fontWeight: isLead ? 600 : 400,
              color: isLead ? 'var(--orot-ink-soft)' : 'var(--orot-ink)',
              letterSpacing: isLead ? '-0.005em' : undefined,
              wordBreak: 'keep-all',
            }}
          >
            {p.trim()}
          </p>
        );
      })}
    </div>
  );
}

function LoadingCard() {
  return (
    <div
      className="card"
      style={{
        padding: 24, marginTop: 8, marginBottom: 16, textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(243,160,146,0.08), rgba(240,199,94,0.04))',
        border: '1px solid var(--orot-coral-faint)',
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--orot-coral)', fontWeight: 600, marginBottom: 8 }}>✦ 올해운세 분석</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--orot-ink)', marginBottom: 10 }}>
        올해의 흐름을 읽고 있어요...
      </div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', lineHeight: 1.6 }}>
        세운·대운·월운의 결을 코드로 계산하고<br />
        그 위에 올해의 타이밍과 선택 가이드를 풀어내는 중입니다.<br />
        <span style={{ color: 'var(--orot-ink-mute)' }}>(약 30~60초 소요)</span>
      </div>
      <div style={{ marginTop: 14, height: 4, borderRadius: 2, overflow: 'hidden', background: 'rgba(243,160,146,0.12)', position: 'relative' }}>
        <div
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: '30%',
            background: 'var(--orot-coral)', animation: 'yearlyLoadingBar 1.6s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes yearlyLoadingBar {
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
      style={{ padding: 16, marginTop: 8, marginBottom: 16, background: 'rgba(240,140,140,0.08)', borderColor: 'rgba(240,140,140,0.3)' }}
    >
      <div style={{ fontSize: 14, color: '#c46', fontWeight: 700, marginBottom: 6 }}>올해운세를 불러오지 못했어요</div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}
