'use client';
// 궁합 v4 결과 컴포넌트.
// preview(명리 카드)를 즉시 표시 + GPT 응답 도착 후 AI 카드 채움.

import React, { useMemo } from 'react';
import type {
  CompatibilityAnalysisBundle, RelationshipType, PersonForCompat,
  RelationshipQuestion,
} from '@/domain/saju/compatibility/compatibilityTypes';
import { RELATIONSHIP_TYPE_KO } from '@/domain/saju/compatibility/compatibilityTypes';
import { parseCompatReport } from '@/lib/compat-v4-report-parser';
import type { Element } from '@/domain/saju/rules/elements';
import { ELEMENT_KO } from '@/domain/saju/rules/elements';

export interface CompatV4ResultApi {
  relationshipType: RelationshipType;
  personA: PersonForCompat;
  personB: PersonForCompat;
  compatibilityAnalysis: CompatibilityAnalysisBundle;
  relationshipQuestions: RelationshipQuestion[];
  reportText: string; // 빈 문자열이면 로딩 상태
}

export default function CompatV4Report({ api }: { api: CompatV4ResultApi }) {
  const parsed = useMemo(() => api.reportText ? parseCompatReport(api.reportText) : null, [api.reportText]);
  const ca = api.compatibilityAnalysis;
  const arch = ca.relationshipArchetype;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* 1. 관계 원국 카드 */}
      <SectionRelationshipCard api={api} />

      {/* 2. 이 관계의 이름 (아키타입) */}
      <SectionArchetype archetype={arch} />

      {/* 3. 관계 키워드 */}
      <SectionKeywords keywords={ca.relationshipKeywords} />

      {/* 4. 일지/오행/십성 명리 카드 (preview 데이터) */}
      <SectionPalaceAndElement api={api} />

      {/* 5. 강점 / 위험 카드 (preview 데이터) */}
      <SectionStrengthsRisks api={api} />

      {/* 6. 살리는/망치는 선택 (preview 데이터) */}
      <SectionChoices api={api} />

      {/* 7. 3년 흐름 카드 (preview 데이터) */}
      <SectionFutureFlow api={api} />

      {/* ── AI 카드들 (GPT 응답 후) ── */}
      {!api.reportText ? (
        <SectionAiLoading />
      ) : parsed ? (
        <>
          <SectionAiOverview body={parsed.overview} />
          <SectionAiAttraction body={parsed.attraction} />
          <SectionAiConflict body={parsed.conflict} />
          <SectionAiQuestions items={parsed.questions} />
          <SectionAiPracticalGuide body={parsed.practicalGuide} />
          <SectionAiEvidence body={parsed.evidence} />
        </>
      ) : null}
    </div>
  );
}

// ============================================================
// 명리 카드 (preview 즉시 표시)
// ============================================================

function SectionRelationshipCard({ api }: { api: CompatV4ResultApi }) {
  const ca = api.compatibilityAnalysis;
  const aSpouse = api.personA.birthChart.day.slice(-1);
  const bSpouse = api.personB.birthChart.day.slice(-1);
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>두 사람의 관계 원국</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <PersonCard label="A" person={api.personA} />
        <PersonCard label="B" person={api.personB} />
      </div>
      <div style={{ marginTop: 12, fontSize: 13, color: 'var(--orot-ink-mute)' }}>
        관계 유형: <strong style={{ color: 'var(--orot-coral)' }}>{RELATIONSHIP_TYPE_KO[api.relationshipType]}</strong>
        &nbsp;·&nbsp;일지 {aSpouse}/{bSpouse} ({ca.spousePalaceRelation.relationTypes.join('·')})
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--orot-ink-mute)' }}>
        끌림 결: {ca.attractionAnalysis.initialChemistry} · 일간 관계: {ca.dayMasterRelation.relation}
      </div>
    </div>
  );
}

function PersonCard({ label, person }: { label: string; person: PersonForCompat }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
        {person.birthChart.year} {person.birthChart.month} {person.birthChart.day}{person.birthChart.hour ?? ''}
      </div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-mute)', marginTop: 4 }}>
        일간 {person.birthChart.dayMaster} · 현재 {person.currentDaewoon.pillar} 대운
      </div>
    </div>
  );
}

function SectionArchetype({ archetype }: { archetype: CompatibilityAnalysisBundle['relationshipArchetype'] }) {
  return (
    <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, rgba(255,160,140,0.08), rgba(255,140,180,0.04))' }}>
      <div className="orot-eyebrow" style={{ marginBottom: 8 }}>이 관계의 이름</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--orot-coral)', marginBottom: 8 }}>{archetype.title}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {archetype.keywords.map(k => (
          <span key={k} style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>#{k}</span>
        ))}
      </div>
      <Field label="✨ 밝은 면" text={archetype.brightSide} />
      <Field label="⚠ 그림자" text={archetype.shadowSide} />
      <Field label="🔑 살리는 한 가지" text={archetype.keyAdvice} />
    </div>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--orot-coral)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function SectionKeywords({ keywords }: { keywords: CompatibilityAnalysisBundle['relationshipKeywords'] }) {
  if (!keywords.length) return null;
  return (
    <div style={{ marginBottom: 0 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>두 사람의 궁합 키워드</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {keywords.map(k => (
          <div key={k.keyword} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>#{k.keyword}</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--orot-ink)' }}>{k.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionPalaceAndElement({ api }: { api: CompatV4ResultApi }) {
  const ca = api.compatibilityAnalysis;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>일지·오행·십성 결</div>
      <Field label="일지 관계" text={`${ca.spousePalaceRelation.attractionEffect} ${ca.spousePalaceRelation.conflictEffect}`} />
      <Field label="오행 보완" text={`보완 정도: ${ca.elementComplement.mutualComplement} — A가 필요로 하는 결 ${(ca.elementComplement.aNeedsFromB as Element[]).map(e => ELEMENT_KO[e]).join('·') || '-'} / B가 필요로 하는 결 ${(ca.elementComplement.bNeedsFromA as Element[]).map(e => ELEMENT_KO[e]).join('·') || '-'}`} />
      <Field label="십성으로 본 결" text={`A→B 매력: ${ca.tenGodInteraction.attractionPoints[0] ?? '-'} / B→A 매력: ${ca.tenGodInteraction.attractionPoints[1] ?? '-'}`} />
      <Field label="용신/기신 자극" text={ca.usefulGodInteraction.interpretation} />
    </div>
  );
}

function SectionStrengthsRisks({ api }: { api: CompatV4ResultApi }) {
  const { relationshipStrengths, relationshipRisks } = api.compatibilityAnalysis;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
      <div className="card" style={{ padding: 14 }}>
        <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(120,200,140,0.9)' }}>✨ 강점</div>
        {relationshipStrengths.map((s, i) => (
          <div key={i} style={{ marginTop: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{s.title}</div>
            <div style={{ color: 'var(--orot-ink-mute)', marginTop: 4 }}>{s.lifeScene}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 14 }}>
        <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(255,140,140,0.9)' }}>⚠ 조심할 패턴</div>
        {relationshipRisks.map((r, i) => (
          <div key={i} style={{ marginTop: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{r.title}</div>
            <div style={{ color: 'var(--orot-ink-mute)', marginTop: 4 }}>{r.likelyScene}</div>
            <div style={{ color: 'var(--orot-coral)', marginTop: 4 }}>→ {r.prevention}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionChoices({ api }: { api: CompatV4ResultApi }) {
  const { helpfulChoices, harmfulChoices } = api.compatibilityAnalysis.relationshipChoices;
  return (
    <div style={{ marginBottom: 0 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>관계를 살리는 선택 · 관계를 망치는 선택</div>
      <div className="card" style={{ padding: 14, marginBottom: 8 }}>
        <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(120,200,140,0.9)' }}>+ 관계를 살리는 선택</div>
        {helpfulChoices.map((c, i) => (
          <div key={i} style={{ marginTop: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{c.title}</div>
            <div style={{ color: 'var(--orot-ink-mute)', marginTop: 4 }}>{c.reason}</div>
            <div style={{ color: 'var(--orot-coral)', marginTop: 4 }}>→ {c.practicalAction}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 14 }}>
        <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(255,140,140,0.9)' }}>- 관계를 망치는 선택</div>
        {harmfulChoices.map((c, i) => (
          <div key={i} style={{ marginTop: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{c.title}</div>
            <div style={{ color: 'var(--orot-ink-mute)', marginTop: 4 }}>{c.reason}</div>
            <div style={{ color: 'var(--orot-coral)', marginTop: 4 }}>↺ {c.correction}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionFutureFlow({ api }: { api: CompatV4ResultApi }) {
  const { futureFlow } = api.compatibilityAnalysis;
  if (!futureFlow.length) return null;
  return (
    <div style={{ marginBottom: 0 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>앞으로 3년, 관계 흐름</div>
      {futureFlow.map((y, i) => (
        <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            <span style={{ color: 'var(--orot-coral)' }}>{y.year}</span> · {y.theme}
          </div>
          <div style={{ fontSize: 12, color: 'var(--orot-ink-mute)', marginTop: 4 }}>주제: {y.relationshipEventTypes.join('·')}</div>
          {y.opportunity && <div style={{ fontSize: 13, marginTop: 6 }}>✨ {y.opportunity}</div>}
          {y.caution && <div style={{ fontSize: 13, marginTop: 4, color: 'rgba(255,140,140,0.9)' }}>⚠ {y.caution}</div>}
          {y.advice && <div style={{ fontSize: 13, marginTop: 4, color: 'var(--orot-coral)' }}>→ {y.advice}</div>}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// AI 카드 — GPT 응답 후
// ============================================================

function SectionAiLoading() {
  return (
    <div className="card" style={{ padding: 18, textAlign: 'center', background: 'rgba(255,160,140,0.04)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orot-coral)', marginBottom: 8 }}>✦ AI 궁합 풀이 분석을 작성하고 있어요</div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-mute)', marginBottom: 12 }}>
        GPT가 위 명리 데이터를 바탕으로 끌림·갈등·회복·10문항을 풀어내고 있습니다.
        <br />(약 30~60초 소요)
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '40%', background: 'var(--orot-coral)', animation: 'compatLoadingBar 1.6s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes compatLoadingBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }`}</style>
    </div>
  );
}

function SectionAiOverview({ body }: { body: string }) {
  if (!body) return null;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>이 관계의 핵심 한눈에 보기</div>
      <Body text={body} />
    </div>
  );
}

function SectionAiAttraction({ body }: { body: string }) {
  if (!body) return null;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>이 관계가 끌리는 이유</div>
      <Body text={body} />
    </div>
  );
}

function SectionAiConflict({ body }: { body: string }) {
  if (!body) return null;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>반복해서 부딪히는 지점</div>
      <Body text={body} />
    </div>
  );
}

function SectionAiQuestions({ items }: { items: Array<{ number: number; title: string; body: string }> }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 0 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>관계 유형별 10가지 질문</div>
      {items.map(q => (
        <details key={q.number} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            <span style={{ color: 'var(--orot-coral)' }}>Q{q.number}.</span> {q.title}
          </summary>
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
            <Body text={q.body} />
          </div>
        </details>
      ))}
    </div>
  );
}

function SectionAiPracticalGuide({ body }: { body: string }) {
  if (!body) return null;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>이 관계를 잘 쓰는 현실 전략</div>
      <Body text={body} />
    </div>
  );
}

function SectionAiEvidence({ body }: { body: string }) {
  if (!body) return null;
  return (
    <details className="card" style={{ padding: 16 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'var(--orot-ink-mute)' }}>📜 명리 근거 보기</summary>
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--orot-ink-mute)' }}>
        <Body text={body} />
      </div>
    </details>
  );
}

function Body({ text }: { text: string }) {
  // 헤더·리스트·문단을 간단히 렌더
  const lines = text.split('\n');
  const out: React.ReactElement[] = [];
  let para: string[] = [];
  const flush = (key: string) => {
    if (para.length === 0) return;
    out.push(
      <p key={key} style={{ margin: '6px 0', fontSize: 13, lineHeight: 1.7 }}>{para.join(' ')}</p>
    );
    para = [];
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flush('p-' + i); return; }
    if (/^#{2,4}\s+/.test(trimmed)) {
      flush('p-' + i);
      out.push(<div key={'h-' + i} style={{ fontSize: 13, fontWeight: 700, color: 'var(--orot-coral)', marginTop: 8 }}>{trimmed.replace(/^#+\s+/, '')}</div>);
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flush('p-' + i);
      out.push(<div key={'li-' + i} style={{ fontSize: 13, lineHeight: 1.7, marginLeft: 10 }}>· {trimmed.replace(/^[-*]\s+/, '')}</div>);
      return;
    }
    para.push(trimmed);
  });
  flush('p-final');
  return <>{out}</>;
}
