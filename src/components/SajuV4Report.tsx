'use client';

// 개인사주 v4 리포트 화면 (spec §17 구성).
// 1. 기본정보 → 2. 요약 → 3. 평범하지 않은 이유 (SpecialPoint 카드)
// 4. 10문항 아코디언 → 5. 앞 3년 카드 → 6. 좋게 쓰는 방법 → 7. 명리 근거 보기
//
// 디자인은 v3 Orot 시스템(card, orot-eyebrow, orot-coral, var(--orot-*))에 자연스럽게 맞춤.

import { useState } from 'react';
import type { ParsedReport } from '@/lib/saju-v4-report-parser';
import type {
  SpecialPoint,
  TenGodAnalysis,
  ElementStrengthAnalysis,
  DayMasterStrengthAnalysis,
  UsefulGodAnalysis,
  CombinationsAndConflicts,
  SpecialStarInfo,
  FortuneCycleInfo,
} from '@/domain/saju/report/sajuReportSchema';

export interface SajuV4ApiResponse {
  ruleVersion: string;
  birthChart: {
    year: string; month: string; day: string; hour?: string;
    dayMaster: string; isHourEstimated: boolean;
  };
  coreAnalysis: {
    elementStrength: ElementStrengthAnalysis;
    tenGods: TenGodAnalysis;
    dayMasterStrength: DayMasterStrengthAnalysis;
    usefulGod: UsefulGodAnalysis;
    combinationsAndConflicts: CombinationsAndConflicts;
    specialStars: SpecialStarInfo[];
  };
  specialPoints: SpecialPoint[];
  fortune: FortuneCycleInfo;
  reportText: string;
  validation: { isValid: boolean; issues: Array<{ type: string; sentence: string; reason: string }> };
  attempts: number;
}

export interface Props {
  api: SajuV4ApiResponse;
  parsed: ParsedReport;
  birthSummary: string;  // 표시용 — "1995년 7월 6일 오시 (양력)"
}

export function SajuV4Report({ api, parsed, birthSummary }: Props) {
  return (
    <div className="inner orot-root" style={{ paddingTop: 16, paddingBottom: 32 }}>
      <SectionBasicInfo api={api} birthSummary={birthSummary} />
      <SectionSummary text={parsed.summary} />
      <SectionSpecialPoints points={api.specialPoints} parsedReasons={parsed.specialReasons} />
      <SectionQuestions questions={parsed.questions} />
      <SectionNextYears fortune={api.fortune} parsedYears={parsed.nextThreeYears} />
      <SectionPracticalGuide text={parsed.practicalGuide} finalMessage={parsed.finalMessage} />
      <SectionEvidence api={api} />
      {!api.validation.isValid && <SectionValidationWarning issues={api.validation.issues} />}
    </div>
  );
}

// ============================================================
// 1. 기본 정보 카드
// ============================================================
function SectionBasicInfo({ api, birthSummary }: { api: SajuV4ApiResponse; birthSummary: string }) {
  const cd = api.fortune.currentDaewoon;
  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 8 }}>사주 원국</div>
      <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', marginBottom: 12 }}>{birthSummary}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        <Pillar label="년주" v={api.birthChart.year} />
        <Pillar label="월주" v={api.birthChart.month} />
        <Pillar label="일주" v={api.birthChart.day} starred />
        <Pillar label="시주" v={api.birthChart.hour ?? '미상'} />
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
        <div><span style={{ color: 'var(--orot-ink-mute)' }}>일간 </span><b style={{ color: 'var(--orot-coral)' }}>{api.birthChart.dayMaster}</b></div>
        <div><span style={{ color: 'var(--orot-ink-mute)' }}>현재 대운 </span><b>{cd.pillar}</b> <span style={{ color: 'var(--orot-ink-mute)' }}>({cd.ageRange})</span></div>
      </div>
    </div>
  );
}

function Pillar({ label, v, starred }: { label: string; v: string; starred?: boolean }) {
  return (
    <div style={{
      border: '1px solid var(--orot-hair)',
      borderRadius: 'var(--orot-r-md)',
      padding: '10px 6px', textAlign: 'center',
      background: starred ? 'rgba(240,199,94,0.08)' : 'transparent',
    }}>
      <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)' }}>{label}{starred ? ' ★' : ''}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{v}</div>
    </div>
  );
}

// ============================================================
// 2. 전체 요약
// ============================================================
function SectionSummary({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>전체 요약</div>
      <Body text={text} />
    </div>
  );
}

// ============================================================
// 3. SpecialPoint 카드 (이 사주가 평범하지 않은 이유)
// ============================================================
function SectionSpecialPoints({ points, parsedReasons }: { points: SpecialPoint[]; parsedReasons: ParsedReport['specialReasons'] }) {
  if (points.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>이 사주가 평범하지 않은 이유</div>
      {points.map((p, i) => {
        const matched = parsedReasons[i];
        return (
          <div key={p.id} className="card" style={{ padding: 16, marginBottom: 10 }}>
            <div className="orot-eyebrow" style={{ marginBottom: 4 }}>{p.shortLabel}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{p.title}</div>
            {matched?.body ? <Body text={matched.body} /> : <Body text={p.narrative.coreMeaning} />}
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 12, color: 'var(--orot-ink-mute)', cursor: 'pointer' }}>명리 근거 보기</summary>
              <ul style={{ fontSize: 12, color: 'var(--orot-ink-soft)', paddingLeft: 18, marginTop: 6 }}>
                {p.evidence.map((e, k) => <li key={k}>{e.source}: {e.description}</li>)}
              </ul>
            </details>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 4. 10문항 아코디언
// ============================================================
function SectionQuestions({ questions }: { questions: ParsedReport['questions'] }) {
  if (questions.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>10가지 질문 상세 풀이</div>
      {questions.map(q => (
        <details key={q.number} className="card" style={{ padding: 12, marginBottom: 6 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
            <span style={{ color: 'var(--orot-coral)', marginRight: 8 }}>{q.number}.</span>{q.title}
          </summary>
          <div style={{ marginTop: 10 }}><Body text={q.body} /></div>
        </details>
      ))}
    </div>
  );
}

// ============================================================
// 5. 앞 3년 흐름
// ============================================================
function SectionNextYears({ fortune, parsedYears }: { fortune: FortuneCycleInfo; parsedYears: ParsedReport['nextThreeYears'] }) {
  if (fortune.nextThreeYears.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>앞으로 3년의 흐름</div>
      {fortune.nextThreeYears.map((y, i) => {
        const parsed = parsedYears[i];
        return (
          <div key={y.year} className="card" style={{ padding: 14, marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {y.year} {y.pillar} <span style={{ color: 'var(--orot-ink-mute)', fontWeight: 400, fontSize: 12 }}>· {y.theme}</span>
            </div>
            {parsed?.body && <div style={{ marginTop: 8 }}><Body text={parsed.body} /></div>}
            {(y.opportunities.length > 0 || y.risks.length > 0) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {y.opportunities.map((o, k) => <Tag key={'o' + k} kind="ok" text={o} />)}
                {y.risks.map((r, k) => <Tag key={'r' + k} kind="warn" text={r} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Tag({ kind, text }: { kind: 'ok' | 'warn'; text: string }) {
  const color = kind === 'ok' ? 'rgba(120,200,140,0.18)' : 'rgba(240,140,140,0.18)';
  const border = kind === 'ok' ? 'rgba(120,200,140,0.4)' : 'rgba(240,140,140,0.4)';
  return (
    <span style={{
      fontSize: 11, padding: '4px 8px', borderRadius: 'var(--orot-r-sm)',
      background: color, border: `1px solid ${border}`,
    }}>{kind === 'ok' ? '+ ' : '⚠ '}{text}</span>
  );
}

// ============================================================
// 6. 좋게 쓰는 방법 + 마지막 한 문장
// ============================================================
function SectionPracticalGuide({ text, finalMessage }: { text: string; finalMessage: string }) {
  if (!text && !finalMessage) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      {text && (
        <div className="card" style={{ padding: 16, marginBottom: 10 }}>
          <div className="orot-eyebrow" style={{ marginBottom: 10 }}>사주를 좋게 쓰는 방법</div>
          <Body text={text} />
        </div>
      )}
      {finalMessage && (
        <div className="card" style={{ padding: 18, textAlign: 'center', background: 'rgba(240,199,94,0.08)' }}>
          <div style={{ fontSize: 13, color: 'var(--orot-coral)', marginBottom: 6 }}>마지막 한 문장</div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6 }}>{finalMessage.trim()}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 7. 명리 근거 보기 (펼치면 상세 데이터)
// ============================================================
function SectionEvidence({ api }: { api: SajuV4ApiResponse }) {
  return (
    <details className="card" style={{ padding: 14, marginBottom: 16 }}>
      <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--orot-ink-mute)' }}>명리 근거 데이터 보기 (rule {api.ruleVersion})</summary>
      <div style={{ fontSize: 12, marginTop: 10, lineHeight: 1.7 }}>
        <p><b>용신</b> {api.coreAnalysis.usefulGod.primaryUseful.value}
          (secondary {api.coreAnalysis.usefulGod.secondaryUseful?.value ?? '-'})
          / 기신 {api.coreAnalysis.usefulGod.unfavorable.join(', ')}
          / confidence {api.coreAnalysis.usefulGod.confidence}</p>
        <p><b>신강</b> {api.coreAnalysis.dayMasterStrength.level} (score {api.coreAnalysis.dayMasterStrength.score})</p>
        <p><b>오행</b> {Object.entries(api.coreAnalysis.elementStrength.scores).map(([k, v]) => `${k}:${v.toFixed(1)}`).join(' / ')}</p>
        <p><b>강한 십성</b> {api.coreAnalysis.tenGods.strongest.join(', ')}</p>
        <p><b>신살</b> {api.coreAnalysis.specialStars.map(s => `${s.name}(${s.positions.join(',')})`).join(', ') || '-'}</p>
        <p><b>합/충/형/파/해</b>
          {' '}합: {api.coreAnalysis.combinationsAndConflicts.combinations.join(',') || '-'}
          {' '}/ 충: {api.coreAnalysis.combinationsAndConflicts.conflicts.join(',') || '-'}
          {' '}/ 형: {api.coreAnalysis.combinationsAndConflicts.punishments.join(',') || '-'}
        </p>
      </div>
    </details>
  );
}

// ============================================================
// validation 경고 (사용자에게 알림)
// ============================================================
function SectionValidationWarning({ issues }: { issues: SajuV4ApiResponse['validation']['issues'] }) {
  return (
    <div className="card" style={{ padding: 12, marginBottom: 16, background: 'rgba(240,140,140,0.08)', borderColor: 'rgba(240,140,140,0.3)' }}>
      <div style={{ fontSize: 12, color: '#c46', fontWeight: 600 }}>응답 검증 — 일부 문장이 우리 품질 기준에 못 미칩니다 ({issues.length}건)</div>
      <ul style={{ fontSize: 11, color: 'var(--orot-ink-soft)', paddingLeft: 18, marginTop: 6 }}>
        {issues.slice(0, 5).map((iss, k) => <li key={k}>[{iss.type}] {iss.reason}</li>)}
      </ul>
    </div>
  );
}

// ============================================================
// 본문 — 줄바꿈만 살리는 단순 렌더
// ============================================================
function Body({ text }: { text: string }) {
  const paras = text.split(/\n{2,}/).filter(p => p.trim());
  return (
    <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--orot-ink)' }}>
      {paras.map((p, i) => <p key={i} style={{ margin: '0 0 10px' }}>{p.trim()}</p>)}
    </div>
  );
}
