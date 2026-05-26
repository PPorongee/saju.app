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
import type { RelationshipYearFlow } from '@/domain/saju/compatibility/compatibilityTypes';

// ============================================================
// API 응답 형태 (route.ts 응답과 정합 — issues는 노출 안 됨)
// ============================================================
export interface CompatNarrativeApiResponse {
  report: CompatibilityNarrativeReport;
  futureFlow: RelationshipYearFlow[];
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
        <ReportBody report={data.report} futureFlow={data.futureFlow} />
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
// 리포트 본문
// ============================================================
function ReportBody({
  report,
  futureFlow,
}: {
  report: CompatibilityNarrativeReport;
  futureFlow: RelationshipYearFlow[];
}) {
  return (
    <div>
      <CompatibilityCardView
        card={report.compatibilityCard}
        relationshipTypeKo={report.evidenceView.relationshipTypeKo}
      />
      <OverviewView overview={report.relationshipOverview} />
      <ProseSection
        title="이 관계가 이렇게 느껴지는 이유"
        eyebrow="✦ 관계의 구조"
        body={report.relationshipMechanism.body}
      />
      <ProseSection
        title="서로에게 끌리는 지점과 엇갈리는 지점"
        eyebrow="✦ 같은 뿌리"
        body={report.attractionAndFriction.body}
      />
      <ProseSection
        title="현실에서 반복되기 쉬운 관계 패턴"
        eyebrow="✦ 반복되는 장면"
        body={report.repeatedPattern.body}
      />
      <ProseSection
        title="이 관계를 좋게 쓰는 방법"
        eyebrow="✦ 관계 가이드"
        body={report.relationshipGuide.body}
      />
      <ProseSection
        title="마지막으로 드리는 조언"
        eyebrow="✦ 정리하며"
        body={report.finalAdvice.body}
      />
      {futureFlow.length > 0 && <FutureFlowView flow={futureFlow} />}
      <EvidenceFold ev={report.evidenceView} />
    </div>
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
          <p>
            <b>합·충·형·파·해</b> {combos.join(' / ')}
          </p>
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
