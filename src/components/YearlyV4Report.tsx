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
export default function YearlyV4Report({ input, onRestart, maxRepairAttempts = 0 }: YearlyV4ReportProps) {
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

      {onRestart && (
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
// 리포트 본문 — 8개 섹션
// ============================================================
function ReportBody({ report }: { report: YearlyFortuneReport }) {
  return (
    <div style={{ marginTop: 4 }}>
      <YearFlowCardView card={report.yearFlowCard} overview={report.yearlyOverview} />
      <MechanismView body={report.yearlyMechanism.body} />
      {report.remainingMonths.length > 0 && <RemainingMonthsView months={report.remainingMonths} />}
      <TopicFortunesView topics={report.topicFortunes} />
      <ActionGuideView guide={report.actionGuide} />
      {report.nextTwoYears.length > 0 && <NextTwoYearsView years={report.nextTwoYears} />}
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

// ── yearlyMechanism ──
function MechanismView({ body }: { body: string }) {
  if (!body) return null;
  return (
    <Section title="올해 운이 움직이는 방식" eyebrow="✦ 흐름의 구조">
      <Body text={body} />
    </Section>
  );
}

// ── remainingMonths ──
function RemainingMonthsView({ months }: { months: YearlyFortuneReport['remainingMonths'] }) {
  return (
    <Section title="남은 올해 월별 흐름" eyebrow="✦ 달마다 달라지는 결">
      {months.map((m, i) => (
        <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--orot-coral)' }}>{m.monthLabel}</span>
            {m.periodLabel && (
              <span style={{ fontSize: 11, color: 'var(--orot-ink-mute)' }}>{m.periodLabel}</span>
            )}
          </div>
          {m.keyword && (
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--orot-ink)', marginBottom: 8 }}>
              {m.keyword}
            </div>
          )}
          {m.body && <Body text={m.body} />}
          <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', marginTop: 8, lineHeight: 1.7 }}>
            {m.work && <div><b style={{ color: 'var(--orot-ink-mute)' }}>일:</b> {m.work}</div>}
            {m.money && <div style={{ marginTop: 3 }}><b style={{ color: 'var(--orot-ink-mute)' }}>돈:</b> {m.money}</div>}
            {m.relationship && <div style={{ marginTop: 3 }}><b style={{ color: 'var(--orot-ink-mute)' }}>관계:</b> {m.relationship}</div>}
            {m.goodChoice && <div style={{ marginTop: 6 }}><b style={{ color: '#7c8' }}>좋은 선택:</b> {m.goodChoice}</div>}
            {m.caution && <div style={{ marginTop: 3 }}><b style={{ color: '#c46' }}>주의:</b> {m.caution}</div>}
          </div>
        </div>
      ))}
    </Section>
  );
}

// ── topicFortunes ──
function TopicFortunesView({ topics }: { topics: YearlyFortuneReport['topicFortunes'] }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: '일·커리어', value: topics.career },
    { label: '돈', value: topics.money },
    { label: '관계·연애', value: topics.relationship },
    { label: '리듬·컨디션', value: topics.rhythm },
  ];
  return (
    <Section title="일·돈·관계·리듬에서 들어오는 변화" eyebrow="✦ 주제별 흐름">
      {rows.filter((r) => r.value).map((r, i) => (
        <div
          key={i}
          className="card"
          style={{ padding: 14, marginBottom: 8, borderLeft: '3px solid var(--orot-coral-faint)' }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orot-coral)', marginBottom: 6 }}>{r.label}</div>
          <Body text={r.value} />
        </div>
      ))}
    </Section>
  );
}

// ── actionGuide ──
function ActionGuideView({ guide }: { guide: YearlyFortuneReport['actionGuide'] }) {
  return (
    <Section title="올해의 선택 가이드" eyebrow="✦ 무엇을 잡고 무엇을 놓을까">
      {guide.mustCatch.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 8 }}>
          <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(120,200,140,0.9)' }}>
            + 꼭 잡으면 좋은 결
          </div>
          <ul style={{ fontSize: 14, color: 'var(--orot-ink)', paddingLeft: 18, lineHeight: 1.8, margin: 0 }}>
            {guide.mustCatch.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      {guide.betterAvoid.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 8 }}>
          <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(240,140,140,0.9)' }}>
            − 잠깐 멈춰서 볼 결
          </div>
          <ul style={{ fontSize: 14, color: 'var(--orot-ink)', paddingLeft: 18, lineHeight: 1.8, margin: 0 }}>
            {guide.betterAvoid.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      {guide.bestStrategy && (
        <div
          className="card"
          style={{ padding: 16, background: 'rgba(240,199,94,0.08)', border: '1px solid var(--orot-coral-faint)' }}
        >
          <div className="orot-eyebrow" style={{ marginBottom: 6 }}>올해의 한 수</div>
          <Body text={guide.bestStrategy} />
        </div>
      )}
    </Section>
  );
}

// ── nextTwoYears ──
function NextTwoYearsView({ years }: { years: YearlyFortuneReport['nextTwoYears'] }) {
  return (
    <Section title="이후 2년 큰 흐름" eyebrow="✦ 앞으로">
      {years.map((y, i) => (
        <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {y.year}
            {y.keyword && (
              <span style={{ color: 'var(--orot-ink-mute)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                · {y.keyword}
              </span>
            )}
          </div>
          {y.summary && <Body text={y.summary} />}
          <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', marginTop: 6, lineHeight: 1.7 }}>
            {y.opportunity && <div><b style={{ color: '#7c8' }}>잡으면 좋은 결:</b> {y.opportunity}</div>}
            {y.caution && <div style={{ marginTop: 3 }}><b style={{ color: '#c46' }}>주의할 결:</b> {y.caution}</div>}
          </div>
        </div>
      ))}
    </Section>
  );
}

// ── evidenceView (deterministic — 접힘 영역) ──
function EvidenceView({ ev }: { ev: YearlyFortuneReport['evidenceView'] }) {
  return (
    <details className="card" style={{ marginTop: 18, padding: 14 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'var(--orot-ink-mute)' }}>
        📜 명리 근거 보기
      </summary>
      <div style={{ fontSize: 12, marginTop: 12, lineHeight: 1.8, color: 'var(--orot-ink-soft)' }}>
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
  );
}

// ============================================================
// 공통 UI helper
// ============================================================
function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      {eyebrow && <div className="orot-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
      <h2
        style={{
          fontSize: 22, fontWeight: 800, color: 'var(--orot-coral)',
          margin: '0 0 16px', letterSpacing: '-0.01em', lineHeight: 1.35,
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
