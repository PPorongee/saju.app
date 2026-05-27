'use client';

// 임산부 모드 V4 줄글(narrative) 리포트 화면 (Phase 8 — UI wiring).
//
// ─────────────────────────────────────────────────────────────────────────
// 안전 / 통합 메모 (PRODUCTION SAFETY)
// ─────────────────────────────────────────────────────────────────────────
// 이 컴포넌트는 NEXT_PUBLIC_PREGNANCY_NARRATIVE_UI_ENABLED === 'true' 일 때만
// SajuApp.tsx에서 렌더된다. 플래그가 꺼져 있으면(default) SajuApp은 기존
// 임산부 모드(점수 카드 + /api/saju 스트리밍 13섹션)를 그대로 사용한다.
//
// 이 컴포넌트는 자체적으로 POST /api/pregnancy-narrative 를 호출한다 (기존 /api/saju 미사용).
// body: { momInput, babyDueInput, maxRepairAttempts? }
// 응답: { report, validation, attempts, repairedSections }
//
// 렌더 정책:
//   - 고정 안내문 배너 상시 노출.
//   - motherBabyCard(한마디+SNS+키워드+태교 방향) 상단 카드.
//   - 본문은 7개 줄글 섹션(prose).
//   - 태명 후보 카드 + 후보일 비교 CTA(텍스트만, 기능 분리).
//   - evidenceView는 <details> 접힘.
//   - 내부 토큰(sectionId/fact id/validation.issues) 절대 노출 금지.
//   - 톤: 존댓말. 디자인: 기존 임산부 핑크 테마.

import React, { useEffect, useRef, useState } from 'react';
import type { BirthInput } from '@/domain/saju/calendar/normalizeBirthInput';
import type {
  PregnancyNarrativeReport as PregnancyReport,
  PregnancyNarrativeSectionId,
} from '@/domain/saju/pregnancy/narrative/pregnancyNarrativeTypes';
import {
  PREGNANCY_NARRATIVE_SECTION_TITLES,
  PREGNANCY_CANDIDATE_CTA_TEXT,
} from '@/domain/saju/pregnancy/narrative/pregnancyNarrativeTypes';

const PINK = '#E91E8C';
const PINK_SOFT = 'rgba(233,30,140,0.15)';

export interface PregnancyNarrativeApiResponse {
  report: PregnancyReport;
  validation: { isValid: boolean; highCount: number; mediumCount: number };
  attempts: number;
  repairedSections: string[];
}

export interface PregnancyNarrativeReportProps {
  momInput: BirthInput;
  babyDueInput: BirthInput;
  lang?: 'ko' | 'en';
  onRestart?: () => void;
  maxRepairAttempts?: number;
}

export async function fetchPregnancyNarrativeReport(
  momInput: BirthInput,
  babyDueInput: BirthInput,
  opts?: { signal?: AbortSignal; maxRepairAttempts?: number },
): Promise<PregnancyNarrativeApiResponse> {
  const res = await fetch('/api/pregnancy-narrative', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      momInput,
      babyDueInput,
      ...(opts?.maxRepairAttempts !== undefined ? { maxRepairAttempts: opts.maxRepairAttempts } : {}),
    }),
    signal: opts?.signal,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({} as Record<string, unknown>));
    throw new Error(
      `pregnancy-narrative 오류 (${res.status}): ${(detail as { detail?: string; error?: string }).detail || (detail as { error?: string }).error || ''}`,
    );
  }
  return (await res.json()) as PregnancyNarrativeApiResponse;
}

// ============================================================
// 메인
// ============================================================
export default function PregnancyNarrativeReport({
  momInput,
  babyDueInput,
  onRestart,
  maxRepairAttempts,
}: PregnancyNarrativeReportProps) {
  const [data, setData] = useState<PregnancyNarrativeApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    setData(null);
    setError(null);
    fetchPregnancyNarrativeReport(momInput, babyDueInput, {
      signal: controller.signal,
      maxRepairAttempts,
    })
      .then((resp) => { if (!controller.signal.aborted) setData(resp); })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 났어요.');
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momInput.birthDate, momInput.birthTime, babyDueInput.birthDate, babyDueInput.birthTime, maxRepairAttempts]);

  return (
    <div style={{ marginTop: 4 }}>
      {error ? (
        <ErrorCard message={error} />
      ) : !data ? (
        <LoadingCard />
      ) : (
        <ReportBody report={data.report} />
      )}

      {onRestart && data && (
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          <button
            onClick={onRestart}
            className="btn"
            style={{ flex: 1, minWidth: 140, background: PINK_SOFT, border: `1px solid rgba(233,30,140,0.3)`, color: 'var(--text)', fontSize: 14, padding: 12, borderRadius: 12 }}
          >
            처음으로
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 로딩 / 에러
// ============================================================
function LoadingCard() {
  return (
    <div className="card" style={{ marginTop: 16, textAlign: 'center', padding: '48px 24px', background: 'rgba(233,30,140,0.06)', border: `1px solid ${PINK_SOFT}`, borderRadius: 20 }}>
      <div style={{ fontSize: 44, animation: 'float 2s ease-in-out infinite', marginBottom: 16 }}>🌙✨</div>
      <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>엄마와 아이의 별빛 이야기를 줄글로 풀어보는 중이에요.</p>
      <p style={{ fontSize: 12, opacity: 0.5 }}>잠시만 기다려 주세요</p>
      <div style={{ width: '60%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, margin: '16px auto 0', overflow: 'hidden' }}>
        <div style={{ width: '50%', height: '100%', background: `linear-gradient(90deg, ${PINK}, #FF6FB7)`, borderRadius: 3, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="card" style={{ marginTop: 16, padding: 24, background: 'rgba(233,30,140,0.06)', border: `1px solid ${PINK_SOFT}`, borderRadius: 20 }}>
      <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>지금은 리포트를 불러오지 못했어요.</p>
      <p style={{ fontSize: 12, opacity: 0.6 }}>{message}</p>
      <p style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>잠시 후 다시 시도해 주세요.</p>
    </div>
  );
}

// ============================================================
// 안내문 배너 (상시)
// ============================================================
function DisclaimerBanner({ text }: { text: string }) {
  return (
    <div style={{ marginTop: 12, marginBottom: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
      <p style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-dim)', margin: 0 }}>ℹ️ {text}</p>
    </div>
  );
}

// ============================================================
// 별빛 카드
// ============================================================
function MotherBabyCardView({ report }: { report: PregnancyReport }) {
  const c = report.motherBabyCard;
  return (
    <div className="card" style={{ background: 'rgba(255,240,245,0.08)', border: `1px solid ${PINK_SOFT}`, borderRadius: 20, padding: 24, marginBottom: 16 }}>
      <div className="orot-eyebrow" style={{ color: PINK }}>엄마와 아이의 별빛 카드</div>
      <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', lineHeight: 1.4, margin: '8px 0 6px' }}>{c.title}</h2>
      {c.snsPhrase && <p style={{ fontSize: 13, color: PINK, fontWeight: 700, margin: '0 0 12px' }}>#{c.snsPhrase}</p>}
      {c.keywords?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {c.keywords.map((k, i) => (
            <span key={i} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: PINK_SOFT, color: 'var(--text)' }}>{k}</span>
          ))}
        </div>
      )}
      {c.taegyoDirection && (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>🌿 {c.taegyoDirection}</p>
      )}
    </div>
  );
}

// ============================================================
// 줄글 섹션
// ============================================================
function ProseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card" style={{ background: 'rgba(255,240,245,0.06)', border: `1px solid ${PINK_SOFT}`, borderRadius: 20, padding: 24, marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>{title}</h3>
      {children}
    </section>
  );
}

function Paragraphs({ text }: { text: string }) {
  const paras = (text ?? '').split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const list = paras.length > 0 ? paras : [text];
  return (
    <>
      {list.map((p, i) => (
        <p key={i} style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--text)', margin: i === 0 ? 0 : '12px 0 0' }}>{p}</p>
      ))}
    </>
  );
}

// ============================================================
// 태명 후보
// ============================================================
function BabyNamesView({ report }: { report: PregnancyReport }) {
  const cands = report.babyNames?.candidates ?? [];
  if (cands.length === 0) return null;
  return (
    <ProseSection title={`${PREGNANCY_NARRATIVE_SECTION_TITLES.babyNames}`}>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 14px', lineHeight: 1.6 }}>
        아래는 엄마와 아이의 기운에 어울리는 가벼운 태명 후보예요. 공식 이름이 아니라 부르기 편한 애칭이에요.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cands.map((c, i) => (
          <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{c.name}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: PINK_SOFT, color: PINK, fontWeight: 700 }}>{c.elementKo}</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{c.image}</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6, margin: '6px 0 0' }}>{c.reason}</p>
          </div>
        ))}
      </div>
    </ProseSection>
  );
}

// ============================================================
// 후보일 비교 CTA (기능 분리 — 텍스트만)
// ============================================================
function CandidateDateCta() {
  return (
    <div style={{ marginBottom: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(233,30,140,0.25)', borderRadius: 14 }}>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>🗓️ {PREGNANCY_CANDIDATE_CTA_TEXT}</p>
    </div>
  );
}

// ============================================================
// 명리 근거 보기 (접힘)
// ============================================================
function EvidenceFold({ report }: { report: PregnancyReport }) {
  const ev = report.evidenceView;
  if (!ev) return null;
  const distLine = (dist: Record<string, number>) => ['목', '화', '토', '금', '수'].map(k => `${k} ${dist?.[k] ?? 0}`).join(' · ');
  return (
    <details className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 18px', marginBottom: 16 }}>
      <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{PREGNANCY_NARRATIVE_SECTION_TITLES.evidenceView}</summary>
      <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
        <p style={{ margin: '0 0 8px' }}><b>엄마 사주</b> — 일간 {ev.mother.dayMaster}({ev.mother.dayMasterElementKo}) · {ev.mother.strengthLevel} · 용신 {ev.mother.usefulGodKo}</p>
        <p style={{ margin: '0 0 8px' }}>오행 분포: {distLine(ev.mother.elementDistributionKo)}</p>
        <p style={{ margin: '0 0 8px' }}><b>아이 ({ev.baby.dueDateLabel} 예정)</b> — 일간 {ev.baby.dayMaster}({ev.baby.dayMasterElementKo}){ev.baby.threeWeekBasis ? ' · 예정시간 미입력(출생예정일 기준 참고)' : ' · 예정시간 기준 참고'}</p>
        <p style={{ margin: '0 0 8px' }}>오행 분포: {distLine(ev.baby.elementDistributionKo)}</p>
        <p style={{ margin: '0 0 8px' }}><b>엄마-아이 연결</b> — {ev.connection.dayMasterRelation.plain}</p>
        {ev.connection.elementComplement.motherNeedsFromBaby.length > 0 && (
          <p style={{ margin: '0 0 8px' }}>엄마에게 더해지는 결: {ev.connection.elementComplement.motherNeedsFromBaby.join('·')}</p>
        )}
        {ev.recommendationBasis.taegyoElements.length > 0 && (
          <p style={{ margin: '0 0 8px' }}>태교 참고 기운: {ev.recommendationBasis.taegyoElements.join('·')}</p>
        )}
        {ev.recommendationBasis.babyNameElements.length > 0 && (
          <p style={{ margin: 0 }}>태명 참고 기운: {ev.recommendationBasis.babyNameElements.join('·')}</p>
        )}
      </div>
    </details>
  );
}

// ============================================================
// 본문 조립
// ============================================================
function ReportBody({ report }: { report: PregnancyReport }) {
  const T = PREGNANCY_NARRATIVE_SECTION_TITLES;
  const sectionText = (id: PregnancyNarrativeSectionId): string => {
    switch (id) {
      case 'openingConnection': return report.openingConnection?.body ?? '';
      case 'motherChildMechanism': return report.motherChildMechanism?.body ?? '';
      case 'motherComfortRhythm': return report.motherComfortRhythm?.body ?? '';
      case 'babyEnergyAndFit': return report.babyEnergyAndFit?.body ?? '';
      case 'taegyoGuide': return report.taegyoGuide?.body ?? '';
      case 'motherFortuneRoutine': return report.motherFortuneRoutine?.body ?? '';
      default: return '';
    }
  };
  const proseOrder: PregnancyNarrativeSectionId[] = [
    'openingConnection', 'motherChildMechanism', 'motherComfortRhythm',
    'babyEnergyAndFit', 'taegyoGuide', 'motherFortuneRoutine',
  ];

  return (
    <div>
      <DisclaimerBanner text={report.disclaimer} />
      <MotherBabyCardView report={report} />

      {/* openingConnection oneLine 강조 */}
      {report.openingConnection?.oneLine && (
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 16px', padding: '0 4px' }}>
          “{report.openingConnection.oneLine}”
        </p>
      )}

      {proseOrder.map((id) => {
        const txt = sectionText(id);
        if (!txt) return null;
        return (
          <ProseSection key={id} title={T[id]}>
            <Paragraphs text={txt} />
          </ProseSection>
        );
      })}

      {/* 가족 + 마지막 한 문장 */}
      {report.familySupportAndFinalMessage?.body && (
        <ProseSection title={T.familySupportAndFinalMessage}>
          <Paragraphs text={report.familySupportAndFinalMessage.body} />
          {report.familySupportAndFinalMessage.finalMessage && (
            <p style={{ fontSize: 14.5, fontWeight: 700, color: PINK, lineHeight: 1.7, margin: '16px 0 0', padding: '14px', background: 'rgba(233,30,140,0.06)', borderRadius: 12 }}>
              💫 {report.familySupportAndFinalMessage.finalMessage}
            </p>
          )}
        </ProseSection>
      )}

      <BabyNamesView report={report} />
      {/* 후보일 비교 CTA: 미구현 기능 노출로 인한 혼란 방지 위해 숨김 (P10+ 실제 구현 시 재노출) */}
      <EvidenceFold report={report} />
    </div>
  );
}
