'use client';

// 개인사주 v4 리포트 화면 (spec §17 구성).
// 1. 기본정보 → 2. 요약 → 3. 평범하지 않은 이유 (SpecialPoint 카드)
// 4. 10문항 아코디언 → 5. 앞 3년 카드 → 6. 좋게 쓰는 방법 → 7. 명리 근거 보기
//
// 디자인은 v3 Orot 시스템(card, orot-eyebrow, orot-coral, var(--orot-*))에 자연스럽게 맞춤.

import React, { useState } from 'react';
import type { ParsedReport } from '@/lib/saju-v4-report-parser';
import { parseNarrativeReport } from '@/lib/saju-v4-narrative-parser';
import { StarShareCardWithDownload } from '@/components/star/StarShareCard';
import { EasyEvidenceView } from '@/components/evidence/EasyEvidenceView';
import { EventForecastSection } from '@/components/EventForecastSection';
import type { EventForecast } from '@/domain/saju/eventForecast/eventForecastTypes';
import type {
  SpecialPoint,
  TenGodAnalysis,
  ElementStrengthAnalysis,
  DayMasterStrengthAnalysis,
  UsefulGodAnalysis,
  CombinationsAndConflicts,
  SpecialStarInfo,
  FortuneCycleInfo,
  IdentityKeyword,
  LifeWeapon,
  LifeTrap,
  FortuneTriggerAnalysis,
} from '@/domain/saju/report/sajuReportSchema';
import Sajupan, { type SajupanChart, type OrotElement } from '@/components/orot/Sajupan';
import WuxingStrip from '@/components/orot/WuxingStrip';

// 한글 → 한자 매핑 (v3 톤 한자 표시용)
const STEM_HANJA: Record<string, string> = {
  갑: '甲', 을: '乙', 병: '丙', 정: '丁', 무: '戊', 기: '己',
  경: '庚', 신: '辛', 임: '壬', 계: '癸',
};
const BRANCH_HANJA: Record<string, string> = {
  자: '子', 축: '丑', 인: '寅', 묘: '卯', 진: '辰', 사: '巳',
  오: '午', 미: '未', 신: '申', 유: '酉', 술: '戌', 해: '亥',
};
const STEM_EL: Record<string, OrotElement> = {
  갑: 'wood', 을: 'wood', 병: 'fire', 정: 'fire', 무: 'earth', 기: 'earth',
  경: 'metal', 신: 'metal', 임: 'water', 계: 'water',
};
const BRANCH_EL: Record<string, OrotElement> = {
  자: 'water', 축: 'earth', 인: 'wood', 묘: 'wood', 진: 'earth', 사: 'fire',
  오: 'fire', 미: 'earth', 신: 'metal', 유: 'metal', 술: 'earth', 해: 'water',
};
const EL_KO: Record<OrotElement, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };

/** v4 birthChart pillar 문자열("을해") → SajupanPillar */
function toSajupanPillar(pillarKo: string | undefined): SajupanChart['year'] {
  if (!pillarKo || pillarKo.length < 2) {
    return { stem: '?', stemEl: 'earth', branch: '?', branchEl: 'earth' };
  }
  const s = pillarKo[0];
  const b = pillarKo[1];
  return {
    stem: STEM_HANJA[s] ?? s,
    stemEl: STEM_EL[s] ?? 'earth',
    branch: BRANCH_HANJA[b] ?? b,
    branchEl: BRANCH_EL[b] ?? 'earth',
  };
}

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
  identityKeywords: IdentityKeyword[];
  lifeWeapons: LifeWeapon[];
  lifeTraps: LifeTrap[];
  fortuneTriggers: FortuneTriggerAnalysis;
  fortune: FortuneCycleInfo;
  reportText: string;
  validation: { isValid: boolean; issues: Array<{ type: string; sentence: string; reason: string }> };
  attempts: number;
  // 2026-05: 별빛 키워드 카드
  starKeywordCard?: {
    serviceName: string;
    label: string;
    titleLead: string;
    displayTitle: string;
    shortDescription: string;
    brightSide: string;
    shadowSide: string;
    keywords: string[];
    hashtag: string;
  };
  /** Event Forecast V1 — flag ON일 때만 응답에 포함. 없으면 미렌더. */
  eventForecast?: EventForecast;
}

export interface Props {
  api: SajuV4ApiResponse;
  /** @deprecated narrative 모드에서는 사용하지 않음 — api.reportText에서 직접 파싱 */
  parsed?: ParsedReport;
  birthSummary: string;  // 표시용 — "1995년 7월 6일 오시 (양력)"
}

export function SajuV4Report({ api, birthSummary }: Props) {
  // narrative 모드 — 7섹션 줄글
  const narrative = api.reportText ? parseNarrativeReport(api.reportText) : null;
  return (
    <div className="inner orot-root" style={{ paddingTop: 16, paddingBottom: 32 }}>
      {/* ── 1. 사주 원국 카드 (표지) ── */}
      <SectionPalja api={api} birthSummary={birthSummary} />

      {/* ── 1.5 별빛 키워드 카드 (SNS 공유용 + 저장 버튼) ── */}
      {api.starKeywordCard && (
        <div style={{ marginTop: 20, marginBottom: 8 }}>
          <StarShareCardWithDownload
            serviceName={api.starKeywordCard.serviceName}
            label={api.starKeywordCard.label}
            titleLead={api.starKeywordCard.titleLead}
            archetypeTitle={api.starKeywordCard.displayTitle}
            shortDescription={api.starKeywordCard.shortDescription}
            brightSide={api.starKeywordCard.brightSide}
            shadowSide={api.starKeywordCard.shadowSide}
            keywords={api.starKeywordCard.keywords}
            hashtag={api.starKeywordCard.hashtag}
            theme="midnight"
            ratio="feed"
          />
        </div>
      )}

      {/* ── 본문: GPT narrative 7섹션(+ 옵션 미래). reportText 없으면 로딩.
            2026-05 hotfix: parser가 헤더를 못 잡았으면(7섹션 모두 비어있음)
            reportText 원문을 fallback으로 보여줘 사용자에 빈 화면 노출 방지. ── */}
      {!api.reportText ? (
        <SectionAiLoading />
      ) : narrative && hasAnyNarrativeBody(narrative) ? (
        <div style={{ marginTop: 18 }}>
          <NarrativeSection
            title="이 사주를 한 문장으로 말하면"
            body={narrative.openingDefinition}
            eyebrow="✦ 시작"
          />
          <NarrativeSection
            title="당신이 이런 방식으로 살아온 이유"
            body={narrative.lifeStructureNarrative}
            eyebrow="✦ 기질과 내면"
          />
          <NarrativeSection
            title="반복해서 찾아오는 삶의 패턴"
            body={narrative.repeatedPatternNarrative}
            eyebrow="✦ 반복되는 결"
          />
          <NarrativeSection
            title="일과 재능: 어떤 역할에서 실력이 살아나는가"
            body={narrative.careerTalentNarrative}
            eyebrow="✦ 일과 재능"
          />
          <NarrativeSection
            title="돈과 수익화: 어떤 방식으로 돈이 붙는가"
            body={narrative.moneyMonetizationNarrative}
            eyebrow="✦ 돈과 수익화"
          />
          <NarrativeSection
            title="관계와 연애: 어떤 사람에게 마음이 열리고 닫히는가"
            body={narrative.relationshipLoveNarrative}
            eyebrow="✦ 관계와 연애"
          />
          {narrative.futureFlowNarrative && (
            <NarrativeFutureFlow data={narrative.futureFlowNarrative} />
          )}
          <NarrativeSection
            title="결국 이 사주는 이렇게 써야 해요"
            body={narrative.finalStrategyNarrative}
            eyebrow="✦ 결론"
          />
        </div>
      ) : (
        // parser가 7섹션 헤더를 못 잡았으면 fallback — 원문 그대로 한 덩어리로
        <div style={{ marginTop: 18, padding: '20px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 15, color: 'var(--text)' }}>
          {api.reportText}
        </div>
      )}

      {/* ── Event Forecast V1 (flag ON일 때만 응답에 포함; 없으면 미렌더) ── */}
      <EventForecastSection forecast={api.eventForecast} />

      {/* ── 명리 근거 보기 — 2026-05: 쉬운 설명형으로 재구성 ── */}
      <details className="card" style={{ marginTop: 18, padding: 14 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'var(--orot-ink-mute)' }}>
          📜 명리 근거 보기
        </summary>
        <div style={{ marginTop: 14 }}>
          <EasyEvidenceView
            dayMaster={api.birthChart.dayMaster}
            elementStrength={api.coreAnalysis.elementStrength}
            tenGods={api.coreAnalysis.tenGods}
            dayMasterStrength={api.coreAnalysis.dayMasterStrength}
            usefulGod={api.coreAnalysis.usefulGod}
            combinationsAndConflicts={api.coreAnalysis.combinationsAndConflicts}
            specialStars={api.coreAnalysis.specialStars}
            rawDataChildren={(
              <>
                <SectionCoreOverview api={api} />
                <SectionWuxing elements={api.coreAnalysis.elementStrength} />
                <SectionUsefulGodDetail useful={api.coreAnalysis.usefulGod} />
                <SectionStructure api={api} />
                <SectionDayMasterStrengthCard dm={api.coreAnalysis.dayMasterStrength} />
                <SectionSpecialStarsDetail stars={api.coreAnalysis.specialStars} />
                <SectionCombConflictDetail cc={api.coreAnalysis.combinationsAndConflicts} />
              </>
            )}
          />
        </div>
      </details>

      {/* 2026-05: validation 로그는 사용자에게 절대 노출하지 않는다 (내부 repair 전용). */}
    </div>
  );
}

// ============================================================
// Narrative 섹션 — 책 챕터처럼 큰 제목 + 줄글 본문
// ============================================================
// 2026-05 hotfix: 7섹션 모두 비어있는지 검사 — parser가 헤더를 못 잡았으면 fallback 트리거
function hasAnyNarrativeBody(narrative: ReturnType<typeof parseNarrativeReport>): boolean {
  return !!(
    narrative.openingDefinition?.trim() ||
    narrative.lifeStructureNarrative?.trim() ||
    narrative.repeatedPatternNarrative?.trim() ||
    narrative.careerTalentNarrative?.trim() ||
    narrative.moneyMonetizationNarrative?.trim() ||
    narrative.relationshipLoveNarrative?.trim() ||
    narrative.finalStrategyNarrative?.trim()
  );
}

function NarrativeSection({ title, body, eyebrow }: { title: string; body: string; eyebrow?: string }) {
  if (!body || !body.trim()) return null;
  return (
    <section style={{ marginTop: 24 }}>
      {eyebrow && (
        <div className="orot-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>
      )}
      <h2 style={{
        fontSize: 22, fontWeight: 800, color: 'var(--orot-coral)',
        margin: '0 0 16px', letterSpacing: '-0.01em', lineHeight: 1.35,
        fontFamily: 'var(--orot-font)',
      }}>{title}</h2>
      <NarrativeBody text={body} />
    </section>
  );
}

function NarrativeFutureFlow({ data }: { data: { intro: string; years: Array<{ year: number; body: string }> } }) {
  if (!data.intro && data.years.length === 0) return null;
  return (
    <section style={{ marginTop: 24 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 8 }}>✦ 앞으로</div>
      <h2 style={{
        fontSize: 22, fontWeight: 800, color: 'var(--orot-coral)',
        margin: '0 0 16px', letterSpacing: '-0.01em', lineHeight: 1.35,
        fontFamily: 'var(--orot-font)',
      }}>앞으로 3년, 어떤 판이 열릴까</h2>
      {data.intro && <NarrativeBody text={data.intro} />}
      <div style={{ marginTop: 16 }}>
        {data.years.map(y => (
          <div key={y.year} style={{ marginTop: 18 }}>
            <h3 style={{
              fontSize: 17, fontWeight: 700, color: 'var(--orot-ink)',
              margin: '0 0 10px', display: 'inline-block',
              paddingBottom: 4, borderBottom: '2px solid var(--orot-coral-faint)',
              fontFamily: 'var(--orot-font)',
            }}>{y.year}</h3>
            <NarrativeBody text={y.body} />
          </div>
        ))}
      </div>
    </section>
  );
}

function NarrativeFinalLine({ text }: { text: string }) {
  return (
    <section style={{ marginTop: 28, marginBottom: 12 }}>
      <div className="card" style={{
        padding: '20px 18px',
        background: 'linear-gradient(135deg, rgba(243,160,146,0.10), rgba(240,199,94,0.05))',
        border: '1px solid var(--orot-coral-faint)',
        textAlign: 'center',
      }}>
        <div className="orot-eyebrow" style={{ marginBottom: 8 }}>마지막 한 문장</div>
        <NarrativeBody text={text} />
      </div>
    </section>
  );
}

// 본문 — 줄글 위주 렌더 (단락·짧은 하위 헤더·간단 리스트만 처리)
function NarrativeBody({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactElement[] = [];
  let para: string[] = [];
  const flush = (k: string) => {
    if (para.length === 0) return;
    out.push(
      <p key={k} style={{ margin: '10px 0', fontSize: 15, lineHeight: 1.85, color: 'var(--orot-ink)' }}>
        {para.join(' ')}
      </p>
    );
    para = [];
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flush('p-' + i); return; }
    if (/^#{3,4}\s+/.test(trimmed)) {
      flush('p-' + i);
      out.push(<div key={'h-' + i} style={{
        fontSize: 14, fontWeight: 700, color: 'var(--orot-coral)',
        marginTop: 14, marginBottom: 4, fontFamily: 'var(--orot-font)',
      }}>{trimmed.replace(/^#+\s+/, '')}</div>);
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flush('p-' + i);
      out.push(<div key={'li-' + i} style={{
        fontSize: 15, lineHeight: 1.85, marginLeft: 12, color: 'var(--orot-ink)',
      }}>· {trimmed.replace(/^[-*]\s+/, '')}</div>);
      return;
    }
    para.push(trimmed);
  });
  flush('p-final');
  return <>{out}</>;
}

// ============================================================
// AI 분석 로딩 카드 (GPT 응답 대기)
// ============================================================
function SectionAiLoading() {
  return (
    <div className="card" style={{
      padding: 24, marginTop: 20, marginBottom: 16, textAlign: 'center',
      background: 'linear-gradient(135deg, rgba(243,160,146,0.08), rgba(240,199,94,0.04))',
      border: '1px solid var(--orot-coral-faint)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--orot-coral)', fontWeight: 600, marginBottom: 8 }}>✦ AI 사주 풀이</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--orot-ink)', marginBottom: 10 }}>
        분석을 작성하고 있어요...
      </div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', lineHeight: 1.6 }}>
        GPT가 위 명리 데이터를 바탕으로<br/>
        키워드·무기·함정·운 트리거·10문항·3년 흐름을 풀어내고 있습니다.<br/>
        <span style={{ color: 'var(--orot-ink-mute)' }}>(약 30~60초 소요)</span>
      </div>
      <div style={{
        marginTop: 14, height: 4, borderRadius: 2, overflow: 'hidden',
        background: 'rgba(243,160,146,0.12)', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%', width: '30%',
          background: 'var(--orot-coral)',
          animation: 'aiLoadingBar 1.6s ease-in-out infinite',
        }} />
      </div>
      <style>{`
        @keyframes aiLoadingBar {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// 사주팔자 (Sajupan 활용)
// ============================================================
function SectionPalja({ api, birthSummary }: { api: SajuV4ApiResponse; birthSummary: string }) {
  const chart: SajupanChart = {
    year:  toSajupanPillar(api.birthChart.year),
    month: toSajupanPillar(api.birthChart.month),
    day:   toSajupanPillar(api.birthChart.day),
    hour:  toSajupanPillar(api.birthChart.hour),
  };
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 6 }}>사주 원국</div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-mute)', marginBottom: 14 }}>{birthSummary}</div>
      <Sajupan chart={chart} />
      {api.birthChart.isHourEstimated && (
        <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 10, textAlign: 'center' }}>
          ⓘ 시간 미상 — 시주는 추정값 (말년/시주 관련 해석은 보수적)
        </div>
      )}
    </div>
  );
}

// ============================================================
// 핵심 요약 — 일간·격국·신강신약·용신·기신 한 눈에
// ============================================================
function SectionCoreOverview({ api }: { api: SajuV4ApiResponse }) {
  const dm = api.coreAnalysis.dayMasterStrength;
  const ug = api.coreAnalysis.usefulGod;
  const dmStem = api.birthChart.dayMaster;
  const dmEl = STEM_EL[dmStem] ?? 'earth';
  const levelKo: Record<string, string> = {
    'very-strong': '매우 강',
    'strong': '강',
    'balanced': '중화',
    'weak': '약',
    'very-weak': '매우 약',
  };
  return (
    <div className="card" style={{
      padding: 16, marginBottom: 14,
      background: 'linear-gradient(135deg, rgba(240,199,94,0.08), rgba(243,160,146,0.04))',
      border: '1px solid var(--orot-coral-faint)',
    }}>
      <div className="orot-eyebrow" style={{ marginBottom: 12 }}>이 사주의 핵심</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13 }}>
        <Field label="일간">
          <b style={{ color: `var(--orot-el-${dmEl})`, fontSize: 16 }}>
            {STEM_HANJA[dmStem] ?? dmStem} ({EL_KO[dmEl]})
          </b>
        </Field>
        <Field label="신강·신약">
          <b>{levelKo[dm.level] ?? dm.level}</b>
          <span style={{ color: 'var(--orot-ink-mute)', marginLeft: 6, fontSize: 12 }}>점수 {dm.score}</span>
        </Field>
        <Field label="용신">
          <b style={{ color: `var(--orot-el-${ug.primaryUseful.value as OrotElement})`, fontSize: 15 }}>
            {EL_KO[ug.primaryUseful.value as OrotElement]} ({ug.primaryUseful.value})
          </b>
        </Field>
        <Field label="기신">
          <b style={{ color: `var(--orot-el-${ug.unfavorable[0] as OrotElement})`, fontSize: 15 }}>
            {EL_KO[ug.unfavorable[0] as OrotElement]} ({ug.unfavorable[0]})
          </b>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginBottom: 4 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

// ============================================================
// 오행 분포 (WuxingStrip)
// ============================================================
function SectionWuxing({ elements }: { elements: ElementStrengthAnalysis }) {
  const total = Object.values(elements.scores).reduce((a, b) => a + b, 0) || 1;
  const dist = {
    wood:  (elements.scores.wood  / total) * 100,
    fire:  (elements.scores.fire  / total) * 100,
    earth: (elements.scores.earth / total) * 100,
    metal: (elements.scores.metal / total) * 100,
    water: (elements.scores.water / total) * 100,
  };
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>오행 분포</div>
      <WuxingStrip distribution={dist} />
      {elements.climate.comment && (
        <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', marginTop: 14, padding: 10, background: 'rgba(243,231,207,0.04)', borderRadius: 6 }}>
          🌡 {elements.climate.comment}
        </div>
      )}
      {(elements.excessive.length > 0 || elements.isolated.length > 0) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {elements.excessive.map(e => (
            <span key={'ex'+e} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: 'rgba(240,140,140,0.12)', color: '#f88' }}>
              {EL_KO[e]} 과다
            </span>
          ))}
          {elements.isolated.map(e => (
            <span key={'is'+e} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: 'rgba(180,180,200,0.1)', color: 'var(--orot-ink-mute)' }}>
              {EL_KO[e]} 고립
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 용신 5관점 자세히
// ============================================================
function SectionUsefulGodDetail({ useful }: { useful: UsefulGodAnalysis }) {
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>용신 풀이</div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <UsefulChip label="용신" value={useful.primaryUseful.value as string} accent />
        {useful.secondaryUseful && <UsefulChip label="희신" value={useful.secondaryUseful.value as string} />}
        <UsefulChip label="기신" value={useful.unfavorable[0] as string} bad />
      </div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-mute)', marginBottom: 8 }}>5관점 신뢰도 (0~1)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
        {Object.entries(useful.methodScores).map(([k, v]) => (
          <div key={k} style={{ textAlign: 'center', fontSize: 11 }}>
            <div style={{ color: 'var(--orot-ink-mute)', marginBottom: 2 }}>{methodKo(k)}</div>
            <div style={{ fontWeight: 700, color: 'var(--orot-ink)' }}>{(v as number).toFixed(1)}</div>
          </div>
        ))}
      </div>
      <details>
        <summary style={{ fontSize: 12, color: 'var(--orot-ink-mute)', cursor: 'pointer' }}>판단 근거 보기</summary>
        <ul style={{ fontSize: 12, color: 'var(--orot-ink-soft)', paddingLeft: 18, marginTop: 6, lineHeight: 1.7 }}>
          {useful.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </details>
    </div>
  );
}

function UsefulChip({ label, value, accent, bad }: { label: string; value: string; accent?: boolean; bad?: boolean }) {
  const el = (value as OrotElement);
  const color = accent ? 'var(--orot-coral)' : bad ? '#f88' : `var(--orot-el-${el})`;
  const bg = accent ? 'rgba(243,160,146,0.12)' : bad ? 'rgba(240,140,140,0.10)' : 'rgba(243,231,207,0.04)';
  return (
    <div style={{ padding: '8px 14px', borderRadius: 8, background: bg, border: `1px solid ${color}40`, minWidth: 64, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--orot-ink-mute)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{EL_KO[el] ?? value}</div>
    </div>
  );
}

function methodKo(k: string): string {
  return ({ climate: '조후', strength: '억부', bridge: '통관', illnessMedicine: '병약', structure: '격국' } as Record<string, string>)[k] ?? k;
}

// ============================================================
// 격국
// ============================================================
function SectionStructure({ api }: { api: SajuV4ApiResponse }) {
  // 격국 정보가 api.coreAnalysis에는 없음 — usefulGod.reasons에서 격국 항목 추출
  const structureLine = api.coreAnalysis.usefulGod.reasons.find(r => r.startsWith('[structure]'));
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 8 }}>격국 (格局)</div>
      <div style={{ fontSize: 13, color: 'var(--orot-ink)', lineHeight: 1.6 }}>
        {structureLine ? structureLine.replace('[structure]', '').trim() : '격국 정보 없음'}
      </div>
    </div>
  );
}

// ============================================================
// 신강·신약 자세히
// ============================================================
function SectionDayMasterStrengthCard({ dm }: { dm: DayMasterStrengthAnalysis }) {
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 8 }}>신강·신약</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{dm.conclusion}</div>
      {dm.supportFactors.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'rgba(120,200,140,0.8)', marginBottom: 4 }}>+ 도움 요인</div>
          <ul style={{ fontSize: 12, color: 'var(--orot-ink-soft)', paddingLeft: 16, lineHeight: 1.7, margin: 0 }}>
            {dm.supportFactors.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      {dm.drainingFactors.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'rgba(240,140,140,0.8)', marginBottom: 4 }}>− 소모 요인</div>
          <ul style={{ fontSize: 12, color: 'var(--orot-ink-soft)', paddingLeft: 16, lineHeight: 1.7, margin: 0 }}>
            {dm.drainingFactors.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 신살 자세히
// ============================================================
function SectionSpecialStarsDetail({ stars }: { stars: SpecialStarInfo[] }) {
  if (stars.length === 0) {
    return (
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="orot-eyebrow" style={{ marginBottom: 8 }}>신살</div>
        <div style={{ fontSize: 13, color: 'var(--orot-ink-mute)' }}>이 사주에 detect된 핵심 신살이 없습니다.</div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>신살 (神煞)</div>
      {stars.map((s, i) => (
        <div key={i} style={{ paddingTop: i === 0 ? 0 : 10, paddingBottom: 10, borderBottom: i < stars.length - 1 ? '1px solid var(--orot-hair)' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--orot-coral)' }}>★ {s.name}</span>
            <span style={{ fontSize: 11, color: 'var(--orot-ink-mute)' }}>{s.positions.join(', ')}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', lineHeight: 1.6 }}>{s.interpretationHint}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 합·충·형·파·해
// ============================================================
function SectionCombConflictDetail({ cc }: { cc: CombinationsAndConflicts }) {
  const all = [
    { label: '합', items: cc.combinations, color: 'rgba(120,200,140,0.8)' },
    { label: '충', items: cc.conflicts,    color: 'rgba(240,140,140,0.8)' },
    { label: '형', items: cc.punishments,  color: 'rgba(240,140,140,0.6)' },
    { label: '파', items: cc.destructions, color: 'rgba(240,180,140,0.6)' },
    { label: '해', items: cc.harms,        color: 'rgba(240,180,140,0.6)' },
  ];
  const hasAny = all.some(g => g.items.length > 0);
  if (!hasAny) return null;
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>합·충·형·파·해</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
        {all.filter(g => g.items.length > 0).map(g => (
          <div key={g.label}>
            <span style={{ color: g.color, fontWeight: 700, marginRight: 8 }}>{g.label}</span>
            <span style={{ color: 'var(--orot-ink-soft)' }}>{g.items.join(', ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 2. 나만의 사주 키워드 5개
// ============================================================
function SectionIdentityKeywords({ keywords, parsedItems }: { keywords: IdentityKeyword[]; parsedItems: Array<{ title: string; body: string }> }) {
  if (keywords.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>나를 설명하는 사주 키워드</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {keywords.map((k, i) => {
          const matched = parsedItems[i];
          return (
            <div key={k.keyword} className="card" style={{ padding: 14 }}>
              <div className="orot-eyebrow" style={{ marginBottom: 4 }}>키워드 {i + 1}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--orot-coral)', marginBottom: 8 }}>{k.keyword}</div>
              {matched?.body
                ? <Body text={matched.body} />
                : <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)' }}>{k.shortDescription}</div>}
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 11, color: 'var(--orot-ink-mute)', cursor: 'pointer' }}>명리 근거</summary>
                <ul style={{ fontSize: 11, color: 'var(--orot-ink-soft)', paddingLeft: 18, marginTop: 4 }}>
                  {k.evidence.map((e, j) => <li key={j}>{e.source}: {e.description}</li>)}
                </ul>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 4. 내 사주의 무기
// ============================================================
function SectionLifeWeapons({ weapons, parsedItems }: { weapons: LifeWeapon[]; parsedItems: Array<{ title: string; body: string }> }) {
  if (weapons.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>내가 잘 쓰면 강해지는 무기</div>
      {weapons.map((w, i) => {
        const matched = parsedItems[i];
        return (
          <div key={w.name} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: '3px solid rgba(120,200,140,0.5)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>⚔ {w.name}</div>
            {matched?.body && <Body text={matched.body} />}
            <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', marginTop: 6 }}>
              <div><b style={{ color: 'var(--orot-ink-mute)' }}>실제 장면:</b> {w.realLifeScene}</div>
              <div style={{ marginTop: 4 }}><b style={{ color: 'var(--orot-ink-mute)' }}>더 강하게:</b> {w.howToUse}</div>
              <div style={{ marginTop: 4 }}><b style={{ color: '#c46' }}>그림자:</b> {w.caution}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 5. 내 사주의 함정
// ============================================================
function SectionLifeTraps({ traps, parsedItems }: { traps: LifeTrap[]; parsedItems: Array<{ title: string; body: string }> }) {
  if (traps.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>반복해서 빠지기 쉬운 함정</div>
      {traps.map((t, i) => {
        const matched = parsedItems[i];
        return (
          <div key={t.name} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: '3px solid rgba(240,140,140,0.5)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>⚠ {t.name}</div>
            {matched?.body && <Body text={matched.body} />}
            <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', marginTop: 6 }}>
              <div><b style={{ color: 'var(--orot-ink-mute)' }}>왜 생기는가:</b> {t.patternDescription}</div>
              <div style={{ marginTop: 4 }}><b style={{ color: 'var(--orot-ink-mute)' }}>실제 장면:</b> {t.realLifeScene}</div>
              <div style={{ marginTop: 4 }}><b style={{ color: '#7c8' }}>벗어나는 방법:</b> {t.escapeStrategy}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 6. 운이 살아나는 / 운을 막는 선택
// ============================================================
function SectionFortuneTriggers({ triggers, parsedAct, parsedBlk }: { triggers: FortuneTriggerAnalysis; parsedAct: Array<{ title: string; body: string }>; parsedBlk: Array<{ title: string; body: string }> }) {
  const a = triggers.fortuneActivatingChoices;
  const b = triggers.fortuneBlockingChoices;
  if (a.length === 0 && b.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-divider" style={{ marginBottom: 12 }}>운을 살리는 선택 · 운을 막는 선택</div>
      {a.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 8 }}>
          <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(120,200,140,0.9)' }}>+ 운이 살아나는 선택</div>
          {a.map((c, i) => (
            <div key={i} style={{ marginBottom: 10, paddingLeft: 8, borderLeft: '2px solid rgba(120,200,140,0.4)' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.title}</div>
              {parsedAct[i]?.body && <Body text={parsedAct[i].body} />}
              <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', marginTop: 4 }}>{c.practicalAction}</div>
            </div>
          ))}
        </div>
      )}
      {b.length > 0 && (
        <div className="card" style={{ padding: 14 }}>
          <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'rgba(240,140,140,0.9)' }}>− 운을 막는 선택</div>
          {b.map((c, i) => (
            <div key={i} style={{ marginBottom: 10, paddingLeft: 8, borderLeft: '2px solid rgba(240,140,140,0.4)' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.title}</div>
              {parsedBlk[i]?.body && <Body text={parsedBlk[i].body} />}
              <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', marginTop: 4 }}><b>교정:</b> {c.correction}</div>
            </div>
          ))}
        </div>
      )}
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
      <div className="orot-eyebrow" style={{ marginBottom: 10 }}>이 사주의 핵심 한눈에 보기</div>
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
      <div className="section-divider" style={{ marginBottom: 12 }}>앞으로 3년, 어떤 판이 열릴까</div>
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
          <div className="orot-eyebrow" style={{ marginBottom: 10 }}>이 사주를 잘 쓰는 현실 전략</div>
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
