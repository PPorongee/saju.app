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

// 컴포넌트가 직접 그리는 한국어 chrome(섹션 제목·라벨·로딩 문구)의 언어별 사전.
// 본문 reportText는 API가 lang=en이면 영어로 번역해 전달하므로 여기서는 chrome만 영어화한다.
const TITLES = {
  ko: {
    relationshipCard: { eyebrow: '두 사람의 관계 원국', relType: '관계 유형', spousePalace: '일지', chemistry: '끌림 결', dayMaster: '일간 관계' },
    person: { dayMaster: '일간', current: '현재', daewoon: '대운' },
    archetype: { eyebrow: '이 관계의 이름', bright: '✨ 밝은 면', shadow: '⚠ 그림자', key: '🔑 살리는 한 가지' },
    keywords: '두 사람의 궁합 키워드',
    palaceElement: { eyebrow: '일지·오행·십성 결', palace: '일지 관계', element: '오행 보완', elementLevel: '보완 정도', aNeeds: 'A가 필요로 하는 결', bNeeds: 'B가 필요로 하는 결', tenGod: '십성으로 본 결', aToB: 'A→B 매력', bToA: 'B→A 매력', usefulGod: '용신/기신 자극' },
    strengthsRisks: { strengths: '✨ 강점', risks: '⚠ 조심할 패턴' },
    choices: { divider: '관계를 살리는 선택 · 관계를 망치는 선택', helpful: '+ 관계를 살리는 선택', harmful: '- 관계를 망치는 선택' },
    futureFlow: { divider: '앞으로 3년, 관계 흐름', theme: '주제' },
    aiLoading: { title: '✦ AI 궁합 풀이 분석을 작성하고 있어요', body: 'GPT가 위 명리 데이터를 바탕으로 끌림·갈등·회복·10문항을 풀어내고 있습니다.', eta: '(약 30~60초 소요)' },
    aiOverview: '이 관계의 핵심 한눈에 보기',
    aiAttraction: '이 관계가 끌리는 이유',
    aiConflict: '반복해서 부딪히는 지점',
    aiQuestions: '관계 유형별 10가지 질문',
    aiPracticalGuide: '이 관계를 잘 쓰는 현실 전략',
    aiEvidence: '📜 명리 근거 보기',
    relType: RELATIONSHIP_TYPE_KO,
  },
  en: {
    relationshipCard: { eyebrow: 'The two charts in relationship', relType: 'Relationship type', spousePalace: 'Day branch', chemistry: 'Chemistry', dayMaster: 'Day Master relation' },
    person: { dayMaster: 'Day Master', current: 'Now', daewoon: 'Luck cycle' },
    archetype: { eyebrow: 'The name of this relationship', bright: '✨ Bright side', shadow: '⚠ Shadow', key: '🔑 The one thing that makes it work' },
    keywords: 'Your compatibility keywords',
    palaceElement: { eyebrow: 'Day branch · Five Elements · Ten Gods', palace: 'Day branch relation', element: 'Element complement', elementLevel: 'Complement level', aNeeds: 'What A needs from B', bNeeds: 'What B needs from A', tenGod: 'Through the Ten Gods', aToB: 'A→B attraction', bToA: 'B→A attraction', usefulGod: 'Useful / Unfavorable God trigger' },
    strengthsRisks: { strengths: '✨ Strengths', risks: '⚠ Patterns to watch' },
    choices: { divider: 'Choices that build · choices that break this relationship', helpful: '+ Choices that build it', harmful: '- Choices that break it' },
    futureFlow: { divider: 'The next 3 years of this relationship', theme: 'Theme' },
    aiLoading: { title: '✦ Writing your AI compatibility reading', body: 'GPT is working through your attraction, conflict, recovery, and 10 questions from the saju data above.', eta: '(about 30–60 seconds)' },
    aiOverview: 'This relationship at a glance',
    aiAttraction: 'Why you are drawn to each other',
    aiConflict: 'Where you keep clashing',
    aiQuestions: '10 questions for your relationship type',
    aiPracticalGuide: 'A practical strategy for this relationship',
    aiEvidence: '📜 See the saju basis',
    relType: {
      dating: 'Dating',
      married: 'Married',
      friendship: 'Friendship',
      coworker: 'Coworkers',
      reunion_or_breakup: 'Reunion / breakup',
      crush_or_something: 'Crush / situationship',
    } as Record<RelationshipType, string>,
  },
} as const;

// 두 언어 분기를 모두 받을 수 있도록 리터럴 타입을 넓힌다.
type Widen<T> = T extends Record<string, unknown> ? { [K in keyof T]: Widen<T[K]> } : T extends string ? string : T;
type CompatTitles = Widen<typeof TITLES['ko']>;

export default function CompatV4Report({ api, lang = 'ko' }: { api: CompatV4ResultApi; lang?: 'ko' | 'en' }) {
  const T = TITLES[lang === 'en' ? 'en' : 'ko'];
  const parsed = useMemo(() => api.reportText ? parseCompatReport(api.reportText) : null, [api.reportText]);
  const ca = api.compatibilityAnalysis;
  const arch = ca.relationshipArchetype;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* 1. 관계 원국 카드 */}
      <SectionRelationshipCard api={api} T={T} />

      {/* 2. 이 관계의 이름 (아키타입) */}
      <SectionArchetype archetype={arch} T={T} />

      {/* 3. 관계 키워드 */}
      <SectionKeywords keywords={ca.relationshipKeywords} T={T} />

      {/* 4. 일지/오행/십성 명리 카드 (preview 데이터) */}
      <SectionPalaceAndElement api={api} T={T} />

      {/* 5. 강점 / 위험 카드 (preview 데이터) */}
      <SectionStrengthsRisks api={api} T={T} />

      {/* 6. 살리는/망치는 선택 (preview 데이터) */}
      <SectionChoices api={api} T={T} />

      {/* 7. 3년 흐름 카드 (preview 데이터) */}
      <SectionFutureFlow api={api} T={T} />

      {/* ── AI 카드들 (GPT 응답 후) ── */}
      {!api.reportText ? (
        <SectionAiLoading T={T} />
      ) : parsed ? (
        <>
          <SectionAiOverview body={parsed.overview} T={T} />
          <SectionAiAttraction body={parsed.attraction} T={T} />
          <SectionAiConflict body={parsed.conflict} T={T} />
          <SectionAiQuestions items={parsed.questions} T={T} />
          <SectionAiPracticalGuide body={parsed.practicalGuide} T={T} />
          <SectionAiEvidence body={parsed.evidence} T={T} />
        </>
      ) : null}
    </div>
  );
}

// ============================================================
// 명리 카드 (preview 즉시 표시)
// ============================================================

function SectionRelationshipCard({ api, T }: { api: CompatV4ResultApi; T: CompatTitles }) {
  const ca = api.compatibilityAnalysis;
  const aSpouse = api.personA.birthChart.day.slice(-1);
  const bSpouse = api.personB.birthChart.day.slice(-1);
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>{T.relationshipCard.eyebrow}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <PersonCard label="A" person={api.personA} T={T} />
        <PersonCard label="B" person={api.personB} T={T} />
      </div>
      <div style={{ marginTop: 12, fontSize: 13, color: 'var(--orot-ink-mute)' }}>
        {T.relationshipCard.relType}: <strong style={{ color: 'var(--orot-coral)' }}>{T.relType[api.relationshipType]}</strong>
        &nbsp;·&nbsp;{T.relationshipCard.spousePalace} {aSpouse}/{bSpouse} ({ca.spousePalaceRelation.relationTypes.join('·')})
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--orot-ink-mute)' }}>
        {T.relationshipCard.chemistry}: {ca.attractionAnalysis.initialChemistry} · {T.relationshipCard.dayMaster}: {ca.dayMasterRelation.relation}
      </div>
    </div>
  );
}

function PersonCard({ label, person, T }: { label: string; person: PersonForCompat; T: CompatTitles }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
        {person.birthChart.year} {person.birthChart.month} {person.birthChart.day}{person.birthChart.hour ?? ''}
      </div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-mute)', marginTop: 4 }}>
        {T.person.dayMaster} {person.birthChart.dayMaster} · {T.person.current} {person.currentDaewoon.pillar} {T.person.daewoon}
      </div>
    </div>
  );
}

function SectionArchetype({ archetype, T }: { archetype: CompatibilityAnalysisBundle['relationshipArchetype']; T: CompatTitles }) {
  return (
    <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, rgba(255,160,140,0.08), rgba(255,140,180,0.04))' }}>
      <div className="orot-eyebrow" style={{ marginBottom: 8 }}>{T.archetype.eyebrow}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--orot-coral)', marginBottom: 8 }}>{archetype.title}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {archetype.keywords.map(k => (
          <span key={k} style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>#{k}</span>
        ))}
      </div>
      <Field label={T.archetype.bright} text={archetype.brightSide} />
      <Field label={T.archetype.shadow} text={archetype.shadowSide} />
      <Field label={T.archetype.key} text={archetype.keyAdvice} />
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

function SectionKeywords({ keywords, T }: { keywords: CompatibilityAnalysisBundle['relationshipKeywords']; T: CompatTitles }) {
  if (!keywords.length) return null;
  return (
    <div style={{ marginBottom: 0 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>{T.keywords}</div>
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

function SectionPalaceAndElement({ api, T }: { api: CompatV4ResultApi; T: CompatTitles }) {
  const ca = api.compatibilityAnalysis;
  const pe = T.palaceElement;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>{pe.eyebrow}</div>
      <Field label={pe.palace} text={`${ca.spousePalaceRelation.attractionEffect} ${ca.spousePalaceRelation.conflictEffect}`} />
      <Field label={pe.element} text={`${pe.elementLevel}: ${ca.elementComplement.mutualComplement} — ${pe.aNeeds} ${(ca.elementComplement.aNeedsFromB as Element[]).map(e => ELEMENT_KO[e]).join('·') || '-'} / ${pe.bNeeds} ${(ca.elementComplement.bNeedsFromA as Element[]).map(e => ELEMENT_KO[e]).join('·') || '-'}`} />
      <Field label={pe.tenGod} text={`${pe.aToB}: ${ca.tenGodInteraction.attractionPoints[0] ?? '-'} / ${pe.bToA}: ${ca.tenGodInteraction.attractionPoints[1] ?? '-'}`} />
      <Field label={pe.usefulGod} text={ca.usefulGodInteraction.interpretation} />
    </div>
  );
}

function SectionStrengthsRisks({ api, T }: { api: CompatV4ResultApi; T: CompatTitles }) {
  const { relationshipStrengths, relationshipRisks } = api.compatibilityAnalysis;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
      <div className="card" style={{ padding: 14 }}>
        <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(120,200,140,0.9)' }}>{T.strengthsRisks.strengths}</div>
        {relationshipStrengths.map((s, i) => (
          <div key={i} style={{ marginTop: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{s.title}</div>
            <div style={{ color: 'var(--orot-ink-mute)', marginTop: 4 }}>{s.lifeScene}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 14 }}>
        <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(255,140,140,0.9)' }}>{T.strengthsRisks.risks}</div>
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

function SectionChoices({ api, T }: { api: CompatV4ResultApi; T: CompatTitles }) {
  const { helpfulChoices, harmfulChoices } = api.compatibilityAnalysis.relationshipChoices;
  return (
    <div style={{ marginBottom: 0 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>{T.choices.divider}</div>
      <div className="card" style={{ padding: 14, marginBottom: 8 }}>
        <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(120,200,140,0.9)' }}>{T.choices.helpful}</div>
        {helpfulChoices.map((c, i) => (
          <div key={i} style={{ marginTop: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{c.title}</div>
            <div style={{ color: 'var(--orot-ink-mute)', marginTop: 4 }}>{c.reason}</div>
            <div style={{ color: 'var(--orot-coral)', marginTop: 4 }}>→ {c.practicalAction}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 14 }}>
        <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(255,140,140,0.9)' }}>{T.choices.harmful}</div>
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

function SectionFutureFlow({ api, T }: { api: CompatV4ResultApi; T: CompatTitles }) {
  const { futureFlow } = api.compatibilityAnalysis;
  if (!futureFlow.length) return null;
  return (
    <div style={{ marginBottom: 0 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>{T.futureFlow.divider}</div>
      {futureFlow.map((y, i) => (
        <div key={i} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            <span style={{ color: 'var(--orot-coral)' }}>{y.year}</span> · {y.theme}
          </div>
          <div style={{ fontSize: 12, color: 'var(--orot-ink-mute)', marginTop: 4 }}>{T.futureFlow.theme}: {y.relationshipEventTypes.join('·')}</div>
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

function SectionAiLoading({ T }: { T: CompatTitles }) {
  return (
    <div className="card" style={{ padding: 18, textAlign: 'center', background: 'rgba(255,160,140,0.04)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orot-coral)', marginBottom: 8 }}>{T.aiLoading.title}</div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-mute)', marginBottom: 12 }}>
        {T.aiLoading.body}
        <br />{T.aiLoading.eta}
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '40%', background: 'var(--orot-coral)', animation: 'compatLoadingBar 1.6s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes compatLoadingBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }`}</style>
    </div>
  );
}

function SectionAiOverview({ body, T }: { body: string; T: CompatTitles }) {
  if (!body) return null;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>{T.aiOverview}</div>
      <Body text={body} />
    </div>
  );
}

function SectionAiAttraction({ body, T }: { body: string; T: CompatTitles }) {
  if (!body) return null;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>{T.aiAttraction}</div>
      <Body text={body} />
    </div>
  );
}

function SectionAiConflict({ body, T }: { body: string; T: CompatTitles }) {
  if (!body) return null;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>{T.aiConflict}</div>
      <Body text={body} />
    </div>
  );
}

function SectionAiQuestions({ items, T }: { items: Array<{ number: number; title: string; body: string }>; T: CompatTitles }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 0 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>{T.aiQuestions}</div>
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

function SectionAiPracticalGuide({ body, T }: { body: string; T: CompatTitles }) {
  if (!body) return null;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>{T.aiPracticalGuide}</div>
      <Body text={body} />
    </div>
  );
}

function SectionAiEvidence({ body, T }: { body: string; T: CompatTitles }) {
  if (!body) return null;
  return (
    <details className="card" style={{ padding: 16 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'var(--orot-ink-mute)' }}>{T.aiEvidence}</summary>
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
