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
import { FortuneVerdictSection } from '@/components/FortuneVerdictSection';
import type { FortuneVerdict } from '@/domain/saju/fortuneVerdict/fortuneVerdictTypes';
import { PaidReportProse } from '@/components/paidReport/PaidReportProse';
import type { PaidSajuReportV1 } from '@/domain/saju/paidReport/paidReportTypes';
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
  CareerSpecificAnalysis,
} from '@/domain/saju/report/sajuReportSchema';
import { GlanceCard } from '@/components/orot/GlanceCard';
import { TermExplainer } from '@/components/ui/TermExplainer';
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
  careerSpecificAnalysis?: CareerSpecificAnalysis;
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
    /** 개인 변주 — 일간 비유 리드("큰 나무 같은 당신은"). KO 전용, 없으면 기본 titleLead. */
    personalLead?: string;
  };
  /** Fortune Questions Verdict V1 — flag ON일 때만 응답에 포함. 없으면 미렌더. */
  fortuneVerdict?: FortuneVerdict;
  /** Paid Report Productization V1 — 있으면 메인 narrative(줄글) 아래에 prose "실전 가이드"를 덧붙인다.
      메인 narrative는 paidReport 유무와 무관하게 항상 FULL/FIRST로 렌더. 없으면 기존과 byte-identical. */
  paidReport?: PaidSajuReportV1;
}

export interface Props {
  api: SajuV4ApiResponse;
  /** @deprecated narrative 모드에서는 사용하지 않음 — api.reportText에서 직접 파싱 */
  parsed?: ParsedReport;
  birthSummary: string;  // 표시용 — "1995년 7월 6일 오시 (양력)"
  /** 결과 언어. 'en'이면 섹션 제목/헤딩을 영어로 (본문은 API가 번역해 옴). */
  lang?: 'ko' | 'en';
}

// 섹션별 악센트 팔레트 — 다크 테마에 맞춘 절제된 톤(전부 coral 대신 테마 코딩).
// icon: 섹션 무드를 잡는 이모지. accent: heading/eyebrow/좌측 보더 색. glow: 히어로/리드용 미세 글로우.
type SectionAccent = { icon: string; accent: string; glow: string };
const SECTION_ACCENTS: Record<string, SectionAccent> = {
  opening:   { icon: '✦', accent: 'var(--orot-coral)', glow: 'rgba(243,160,146,0.16)' },
  structure: { icon: '✦', accent: '#b9a7ef',           glow: 'rgba(185,167,239,0.14)' },
  repeated:  { icon: '✦', accent: '#7fc6c0',           glow: 'rgba(127,198,192,0.14)' },
  career:    { icon: '✦', accent: 'var(--orot-el-earth)', glow: 'rgba(211,184,122,0.14)' },
  money:     { icon: '✦', accent: '#9cc99a',           glow: 'rgba(156,201,154,0.14)' },
  love:      { icon: '✦', accent: '#e899ad',           glow: 'rgba(232,153,173,0.14)' },
  future:    { icon: '✦', accent: '#8aa1c4',           glow: 'rgba(138,161,196,0.14)' },
  final:     { icon: '✦', accent: 'var(--orot-primary, #f0c75e)', glow: 'rgba(240,199,94,0.16)' },
  guide:     { icon: '✦', accent: 'var(--orot-coral)', glow: 'rgba(243,160,146,0.14)' },
};

// 7섹션 narrative 제목 — 언어별. (본문 reportText는 API가 lang=en이면 영어로 번역해 전달.)
// eyebrow는 ✦ 없이 라벨만 — 아이콘은 SECTION_ACCENTS.icon이 별도로 렌더한다(이중 ✦ 방지).
const NARRATIVE_TITLES = {
  ko: {
    opening:   { eyebrow: '시작',    title: '당신을 한마디로 담으면' },
    structure: { eyebrow: '기질',    title: '타고난 기질, 그 결' },
    repeated:  { eyebrow: '패턴',    title: '자꾸 돌아오는 삶의 흐름' },
    career:    { eyebrow: '일·재능', title: '당신이 가장 빛나는 자리' },
    money:     { eyebrow: '돈',      title: '돈이 당신에게 흐르는 길' },
    love:      { eyebrow: '관계',    title: '마음이 열리고 닫히는 순간' },
    future:    { eyebrow: '앞으로',  title: '앞으로 3년, 열리는 흐름' },
    final:     { eyebrow: '결론',    title: '당신에게 건네는 한마디' },
    chartToggle: '사주 원국 보기',
    guideEyebrow: '오늘부터 곁에 두면 좋은 것',
    guideSub: '사람·돈·타이밍·행운 — 위 풀이를 실제 삶에서 쓰는 법',
    guideSectionEyebrow: '실전',
    star: { serviceName: '별빛 사주', label: '별빛 키워드', titleLead: '당신은', hashtag: '#별빛사주' },
  },
  en: {
    opening:   { eyebrow: 'Opening',       title: 'You, in one line' },
    structure: { eyebrow: 'Temperament',   title: 'Your nature, at the core' },
    repeated:  { eyebrow: 'Patterns',      title: 'The flow that keeps coming back' },
    career:    { eyebrow: 'Work',          title: 'Where you shine brightest' },
    money:     { eyebrow: 'Money',         title: 'How money flows to you' },
    love:      { eyebrow: 'Relationships', title: 'When your heart opens and closes' },
    future:    { eyebrow: 'Ahead',         title: 'The next 3 years, unfolding' },
    final:     { eyebrow: 'Conclusion',    title: 'A word for you' },
    chartToggle: 'View birth chart',
    guideEyebrow: 'Worth keeping close, starting today',
    guideSub: 'People · Money · Timing · Luck — how to use this reading in real life',
    guideSectionEyebrow: 'In practice',
    star: { serviceName: 'Starlight Saju', label: 'Starlight Keyword', titleLead: 'You are', hashtag: '#StarlightSaju' },
  },
} as const;

export function SajuV4Report({ api, birthSummary, lang = 'ko' }: Props) {
  const T = NARRATIVE_TITLES[lang === 'en' ? 'en' : 'ko'];
  // narrative 모드 — 7섹션 줄글
  const narrative = api.reportText ? parseNarrativeReport(api.reportText) : null;
  return (
    <div className="inner orot-root sv4" style={{ paddingTop: 16, paddingBottom: 32 }}>
      {/* sv4-* accordion/editorial CSS now lives in globals.css (shared source of truth). */}

      {/* ── 1. 정체성 히어로 (첫 화면) — 별빛 아키타입을 가장 먼저 보여준다.
            starKeywordCard 없으면(일부 flag 기본값) 통째로 스킵하고 바로 챕터로 넘어간다. ── */}
      {api.starKeywordCard && (
        <SectionIdentityHero card={api.starKeywordCard} T={T} lang={lang === 'en' ? 'en' : 'ko'} />
      )}

      {/* ── 사주 원국 & 명리 근거 종합 카드 — 원국 펼침 + 용신·신살·합충형파해·오행밸런스 + 용어 ⓘ ── */}
      <SectionChartEvidence api={api} birthSummary={birthSummary} lang={lang === 'en' ? 'en' : 'ko'} />

      {/* ── 통합 요약 "당신을 한마디로" — 줄글 요약본. ── */}
      <SectionOneLineSummary api={api} lang={lang} />

      {/* ── 본문: GPT narrative 7섹션(+ 옵션 미래). reportText 없으면 로딩.
            2026-05 hotfix: parser가 헤더를 못 잡았으면(7섹션 모두 비어있음)
            reportText 원문을 fallback으로 보여줘 사용자에 빈 화면 노출 방지.
            줄글-first 전환(2026-06): paidReport 유무와 무관하게 메인 narrative를 FULL/FIRST로 렌더.
            paidReport.prose가 있으면 narrative 아래에 "실전 가이드"로 덧붙인다(아래 별도 블록). ── */}
      {!api.reportText ? (
        <SectionAiLoading />
      ) : narrative && hasAnyNarrativeBody(narrative) ? (
        <div style={{ marginTop: 8 }}>
          <NarrativeSection title={T.opening.title} body={narrative.openingDefinition} eyebrow={T.opening.eyebrow} accent={SECTION_ACCENTS.opening} index={0} lead defaultOpen />
          <NarrativeSection title={T.structure.title} body={narrative.lifeStructureNarrative} eyebrow={T.structure.eyebrow} accent={SECTION_ACCENTS.structure} index={1} lead />
          <NarrativeSection title={T.repeated.title} body={narrative.repeatedPatternNarrative} eyebrow={T.repeated.eyebrow} accent={SECTION_ACCENTS.repeated} index={2} lead />
          <NarrativeSection title={T.career.title} body={narrative.careerTalentNarrative} eyebrow={T.career.eyebrow} accent={SECTION_ACCENTS.career} index={3} lead />
          <NarrativeSection title={T.money.title} body={narrative.moneyMonetizationNarrative} eyebrow={T.money.eyebrow} accent={SECTION_ACCENTS.money} index={4} lead />
          <NarrativeSection title={T.love.title} body={narrative.relationshipLoveNarrative} eyebrow={T.love.eyebrow} accent={SECTION_ACCENTS.love} index={5} lead />
          {narrative.futureFlowNarrative && (
            <NarrativeFutureFlow data={narrative.futureFlowNarrative} title={T.future.title} eyebrow={T.future.eyebrow} />
          )}
          <NarrativeSection title={T.final.title} body={narrative.finalStrategyNarrative} eyebrow={T.final.eyebrow} accent={SECTION_ACCENTS.final} index={7} lead />
        </div>
      ) : (
        // parser가 7섹션 헤더를 못 잡았으면 fallback — 원문 그대로 한 덩어리로
        <div style={{ marginTop: 18, padding: '20px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 15, color: 'var(--text)' }}>
          {api.reportText}
        </div>
      )}

      {/* ── Paid Report Productization V1 — prose "실전 가이드".
            paidReport.prose가 present일 때만 메인 narrative 아래에 줄글 톤으로 덧붙인다.
            paidReport(또는 prose) 없으면 전부 건너뛰어 기존 동작과 byte-identical 유지. ── */}
      {api.paidReport?.prose?.length ? (
        <section className="sv4-reveal" style={{ marginTop: 40 }}>
          <SectionStarDivider />
          <div className="sv4-eyebrow" style={{ color: SECTION_ACCENTS.guide.accent }}>
            <span aria-hidden>{SECTION_ACCENTS.guide.icon}</span>
            <span>{T.guideSub}</span>
          </div>
          <h2 style={{
            fontSize: 24, fontWeight: 800, color: SECTION_ACCENTS.guide.accent,
            margin: '6px 0 4px', letterSpacing: '-0.01em', lineHeight: 1.3,
            fontFamily: 'var(--orot-font)',
          }}>{T.guideEyebrow}</h2>
          <PaidReportProse
            sections={api.paidReport.prose}
            evidenceMap={api.paidReport.evidenceMap}
            eyebrowLabel={T.guideSectionEyebrow}
          />
        </section>
      ) : null}

      {/* ── Fortune Questions Verdict V1 (flag ON일 때만 응답에 포함; 없으면 미렌더) ── */}
      <FortuneVerdictSection verdict={api.fortuneVerdict} />

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
// 차별화 포인트 카드 — 이 사주만의 두드러진 명리 구조를 강조
//   · 본문 줄글 전에 상위 3개를 카드로 보여줘 "나만의 특별함"으로 후킹.
//   · 용어(name)를 드러내되 바로 coreMeaning으로 풀이(de-jargon 일관).
//   · 희귀도는 level 라벨만 — "만 명 중 n명" 통계는 절대 표기 안 함
//     (estimatedPer10000 null 가드 + 과거 "1만명중 200명" 클리셰 회귀 방지).
//   · 카탈로그가 한국어라 V1은 KO 전용 렌더(EN은 본문 번역으로 커버, EN 카탈로그는 후속).
// ============================================================
const SP_RARITY_LABEL: Record<string, string> = {
  noticeable: '눈에 띄는 결',
  uncommon: '드문 결',
  rare: '귀한 결',
  'very-rare': '아주 귀한 결',
};

export function SectionDiffPoints({ points, lang }: { points: SpecialPoint[]; lang: 'ko' | 'en' }) {
  if (lang === 'en') return null;              // 카탈로그 한국어 — EN 후속
  const top = [...(points ?? [])]
    .sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0))
    .slice(0, 3);
  if (top.length === 0) return null;            // 차별점 없으면 통째 스킵(기존과 byte-identical)
  const accent = { accent: '#e6b450', glow: 'rgba(230,180,80,0.14)' };  // 차별화=골드(희소·특별)
  return (
    <GlanceCard icon="🔮" accent={accent.accent} title="이 사주만의 차별화 포인트">
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--orot-ink-mute)', lineHeight: 1.6 }}>
        수많은 사주 중에서 이 사주를 눈에 띄게 만드는 결입니다.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {top.map((p) => {
          // "만 명 중 N명"은 estimatedPer10000 있을 때만(validator fake-rarity 규칙 준수). 없으면 정성 라벨.
          const per = p.rarity?.estimatedPer10000;
          const hasPer = typeof per === 'number' && per > 0;
          const rarityText = hasPer ? `만 명 중 약 ${Math.round(per as number)}명` : (SP_RARITY_LABEL[p.rarity?.level] ?? '');
          return (
            <div key={p.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${accent.accent}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: accent.accent, background: accent.glow, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--orot-ink-soft)', letterSpacing: '-0.01em' }}>
                  {p.title}
                </span>
                {rarityText && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', borderRadius: 999,
                    color: hasPer ? 'var(--orot-coral)' : 'var(--orot-ink-mute)',
                    background: hasPer ? 'rgba(243,160,146,0.10)' : 'transparent',
                    border: hasPer ? '1px solid var(--orot-coral-faint)' : 'none',
                    padding: hasPer ? '3px 9px' : 0,
                  }}>
                    {hasPer ? `✨ ${rarityText}` : rarityText}
                  </span>
                )}
              </div>
              {p.narrative?.coreMeaning && (
                <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.72, color: 'var(--orot-ink-soft)' }}>
                  {p.narrative.coreMeaning}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </GlanceCard>
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

// 별빛 정체성 히어로 — 첫 화면. 큰 아키타입 닉네임 + 한 줄 + 키워드 칩 + 야경 글로우.
// 기존 공유/저장 카드(StarShareCardWithDownload)도 접근 가능하게 함께 둔다.
function SectionIdentityHero({
  card,
  T,
  lang,
}: {
  card: NonNullable<SajuV4ApiResponse['starKeywordCard']>;
  T: (typeof NARRATIVE_TITLES)['ko'] | (typeof NARRATIVE_TITLES)['en'];
  lang: 'ko' | 'en';
}) {
  const keywords = (card.keywords ?? []).filter((k) => k && k.trim()).slice(0, 6);
  // 개인 변주(C): KO일 때만 일간 비유 리드("큰 나무 같은 당신은")로 titleLead 대체.
  const titleLead = lang === 'ko' && card.personalLead ? card.personalLead : T.star.titleLead;
  return (
    <section className="sv4-reveal" style={{ marginBottom: 4 }}>
      {/* 별 정체성 = 공유 카드 디자인 하나만 (바깥 히어로 텍스트 중첩 제거) */}
      <div>
        <StarShareCardWithDownload
          serviceName={T.star.serviceName}
          label={T.star.label}
          titleLead={titleLead}
          archetypeTitle={card.displayTitle}
          shortDescription={card.shortDescription}
          brightSide={card.brightSide}
          shadowSide={card.shadowSide}
          keywords={card.keywords}
          hashtag={T.star.hashtag}
          theme="midnight"
          ratio="feed"
        />
      </div>
    </section>
  );
}

// ── 무기 vs 함정 카드 (궁합 밝은면/그림자의 개인판) — 결정론, GPT 0회. KO 전용. ──
export function SectionWeaponTrap({ weapons, traps, lang }: { weapons?: LifeWeapon[]; traps?: LifeTrap[]; lang: 'ko' | 'en' }) {
  if (lang === 'en') return null;
  const w = [...(weapons ?? [])].sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0))[0];
  const t = [...(traps ?? [])].sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0))[0];
  if (!w && !t) return null;
  return (
    <GlanceCard icon="⚔️" accent="#79b3a0" title="나의 무기와 함정">
      {w && (
        <div style={{ marginBottom: t ? 14 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--orot-coral)', background: 'rgba(243,160,146,0.10)', border: '1px solid var(--orot-coral-faint)', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>⚔️ 무기</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--orot-ink)', letterSpacing: '-0.01em' }}>{w.name}</span>
          </div>
          {w.howToUse && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'var(--orot-ink-soft)' }}>{w.howToUse}</p>}
        </div>
      )}
      {t && (
        <div style={{ paddingTop: w ? 12 : 0, borderTop: w ? '1px solid var(--orot-hair)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#d8b24a', background: 'rgba(216,178,74,0.12)', border: '1px solid rgba(216,178,74,0.3)', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>⚠ 함정</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--orot-ink)', letterSpacing: '-0.01em' }}>{t.name}</span>
          </div>
          {t.patternDescription && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'var(--orot-ink-soft)' }}>{t.patternDescription}</p>}
        </div>
      )}
    </GlanceCard>
  );
}

// ── 오행 밸런스 카드 (한눈 막대) — 결정론, GPT 0회. 상세 SectionWuxing은 명리 근거 안에 별도. ──
const EL_COLOR: Record<OrotElement, string> = { wood: '#94b88f', fire: '#e88578', earth: '#d3b87a', metal: '#b5b7c7', water: '#8aa1c4' };
const EL_BAR_ORDER: OrotElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];

export function SectionWuxingGlance({ elements }: { elements?: ElementStrengthAnalysis }) {
  const scores = elements?.scores;
  if (!scores) return null;
  const total = EL_BAR_ORDER.reduce((s, e) => s + (scores[e] ?? 0), 0) || 1;
  const seg = EL_BAR_ORDER.map((e) => ({ e, pct: Math.round(((scores[e] ?? 0) / total) * 100) }));
  const strong = elements?.strongest?.[0] as OrotElement | undefined;
  const weak = elements?.weakest?.[0] as OrotElement | undefined;
  return (
    <GlanceCard icon="⚖️" accent="#8aa1c4" title="오행 밸런스">
      {/* 100% 단일 스택 막대 */}
      <div style={{ display: 'flex', height: 16, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        {seg.map(({ e, pct }) => pct > 0 ? (
          <div key={e} title={`${EL_KO[e]} ${pct}%`} style={{ width: `${pct}%`, background: EL_COLOR[e] }} />
        ) : null)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12 }}>
        {seg.map(({ e, pct }) => (
          <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--orot-ink-soft)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: EL_COLOR[e], flexShrink: 0 }} />{EL_KO[e]} {pct}%
          </span>
        ))}
      </div>
      {(strong || weak) && (
        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--orot-ink-mute)' }}>
          {strong && `강한 ${EL_KO[strong]}`}{strong && weak && ' · '}{weak && `약한 ${EL_KO[weak]}`}
        </p>
      )}
    </GlanceCard>
  );
}

// ── 어울리는 일 카드 (업계 + 직무 칩) — 결정론, GPT 0회. KO 전용. ──
export function SectionCareerGlance({ career, lang }: { career?: CareerSpecificAnalysis; lang: 'ko' | 'en' }) {
  if (lang === 'en') return null;
  const top = career?.topCareerMatches?.[0];
  if (!top) return null;
  const roles = (top.roles ?? []).map((r) => r.trim()).filter(Boolean).slice(0, 4);
  return (
    <GlanceCard icon="🎯" accent="#5fb6c9" title="어울리는 일">
      <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--orot-ink)', letterSpacing: '-0.01em' }}>{top.industry}</p>
      {roles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {roles.map((r, i) => (
            <span key={i} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--orot-coral)', background: 'rgba(243,160,146,0.08)', border: '1px solid var(--orot-coral-faint)', borderRadius: 999, padding: '5px 11px' }}>{r}</span>
          ))}
        </div>
      )}
    </GlanceCard>
  );
}

// ── 사주 원국 & 명리 근거 종합 카드 (#12) — 원국 펼침 + 용신·신살·합충형파해·오행밸런스 요약 + 용어 ⓘ 토글.
function MyeongriRow({ label, value, termKey, lang }: { label: string; value: string; termKey: string; lang: 'ko' | 'en' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0' }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--orot-ink)', flexShrink: 0, minWidth: 70 }}>
        {label}<TermExplainer termKey={termKey} lang={lang} />
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--orot-ink-soft)', lineHeight: 1.55, wordBreak: 'keep-all' }}>{value}</span>
    </div>
  );
}

export function SectionChartEvidence({ api, birthSummary, lang }: { api: SajuV4ApiResponse; birthSummary: string; lang: 'ko' | 'en' }) {
  const ca = api.coreAnalysis;
  if (!ca || lang === 'en') {
    // EN은 원국만 (명리 요약은 KO 카탈로그) — 원국 카드만 펼쳐 보여준다.
    return ca ? (
      <GlanceCard icon="🪐" accent="#8a9bc4" title={lang === 'en' ? 'Your chart' : '사주 원국'}>
        <SectionPalja api={api} birthSummary={birthSummary} />
      </GlanceCard>
    ) : null;
  }
  const elLabel = (v: unknown) => TEMP_ELEMENT_LABEL[String(v)]?.ko ?? String(v);
  const level = ca.dayMasterStrength?.level;
  const strengthKo = level ? (TEMP_STRENGTH_LABEL[level]?.ko ?? level) : '';
  const strengthTerm = (level === 'very-weak' || level === 'weak') ? '신약' : '신강';
  const ug = ca.usefulGod;
  const yongsin = ug?.primaryUseful ? (ug.primaryUseful.type === 'element' ? elLabel(ug.primaryUseful.value) : String(ug.primaryUseful.value)) : '';
  const gisin = ug?.unfavorable?.[0] != null ? elLabel(ug.unfavorable[0]) : '';
  const shinsal = (ca.specialStars ?? []).map((s) => s.name).filter(Boolean).slice(0, 6).join(', ');
  const cc = ca.combinationsAndConflicts;
  const ccParts: string[] = [];
  if (cc?.combinations?.length) ccParts.push(`합 ${cc.combinations.join('·')}`);
  if (cc?.conflicts?.length) ccParts.push(`충 ${cc.conflicts.join('·')}`);
  if (cc?.punishments?.length) ccParts.push(`형 ${cc.punishments.join('·')}`);
  if (cc?.harms?.length) ccParts.push(`해 ${cc.harms.join('·')}`);
  if (cc?.destructions?.length) ccParts.push(`파 ${cc.destructions.join('·')}`);
  const scores = ca.elementStrength?.scores;
  const total = scores ? (EL_BAR_ORDER.reduce((s, e) => s + (scores[e] ?? 0), 0) || 1) : 1;
  const seg = scores ? EL_BAR_ORDER.map((e) => ({ e, pct: Math.round(((scores[e] ?? 0) / total) * 100) })) : [];

  return (
    <GlanceCard icon="🪐" accent="#8a9bc4" title="사주 원국 & 명리 근거">
      <SectionPalja api={api} birthSummary={birthSummary} />
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--orot-hair)' }}>
        {strengthKo && <MyeongriRow label="신강·신약" value={strengthKo} termKey={strengthTerm} lang={lang} />}
        {yongsin && <MyeongriRow label="용신" value={gisin ? `${yongsin}  ·  기신 ${gisin}` : yongsin} termKey="용신" lang={lang} />}
        {shinsal && <MyeongriRow label="신살" value={shinsal} termKey="신살" lang={lang} />}
        {ccParts.length > 0 && <MyeongriRow label="합충형파해" value={ccParts.join('   ')} termKey="합" lang={lang} />}
        {scores && (
          <div style={{ padding: '9px 0 2px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--orot-ink)', marginBottom: 9 }}>오행 밸런스<TermExplainer termKey="오행" lang={lang} /></div>
            <div style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
              {seg.map(({ e, pct }) => pct > 0 ? <div key={e} title={`${EL_KO[e]} ${pct}%`} style={{ width: `${pct}%`, background: EL_COLOR[e] }} /> : null)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 12px', marginTop: 9 }}>
              {seg.map(({ e, pct }) => (
                <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--orot-ink-soft)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: EL_COLOR[e], flexShrink: 0 }} />{EL_KO[e]} {pct}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlanceCard>
  );
}

// ── 통합 요약 카드 "당신을 한마디로 나타내면" — 기질·차별화·무기/함정·어울리는 일을 한 카드로.
//    뒤에 이어질 줄글의 요약본 역할. GPT 0회. 글씨 작게 통일. KO 전용.
export function SectionOneLineSummary({ api, lang }: { api: SajuV4ApiResponse; lang: 'ko' | 'en' }) {
  if (lang === 'en') return null;
  const dm = api.birthChart?.dayMaster;
  const ca = api.coreAnalysis;
  const meta = dm ? TEMPERAMENT_METAPHOR[dm] : undefined;
  const hanja = dm ? (STEM_HANJA[dm] ?? '') : '';
  const dmEl = dm ? TEMP_ELEMENT_LABEL[STEM_EL[dm] ?? 'earth'] : undefined;
  const strongest = ca?.elementStrength?.strongest?.[0];
  const weakest = ca?.elementStrength?.weakest?.[0];
  const level = ca?.dayMasterStrength?.level;
  const kwRaw = (api.identityKeywords?.[0]?.keyword || '').trim();
  const kwCore = kwRaw.replace(/\s*(사람|타입|스타일)$/, '').trim();
  const headline = meta ? (kwCore ? `${kwCore}, ${meta.ko} 같은 사람` : `${meta.ko} 같은 사람`) : kwRaw;

  const chips: string[] = [];
  if (dm && dmEl) chips.push(`${hanja} ${dm}${dmEl.ko}`);
  if (level && TEMP_STRENGTH_LABEL[level]) chips.push(TEMP_STRENGTH_LABEL[level].ko);
  if (strongest && TEMP_ELEMENT_LABEL[strongest]) chips.push(`강한 ${TEMP_ELEMENT_LABEL[strongest].ko}`);
  if (weakest && TEMP_ELEMENT_LABEL[weakest]) chips.push(`약한 ${TEMP_ELEMENT_LABEL[weakest].ko}`);

  const sp = [...(api.specialPoints ?? [])].sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0))[0];
  const spPer = sp?.rarity?.estimatedPer10000;
  const w = [...(api.lifeWeapons ?? [])].sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0))[0];
  const t = [...(api.lifeTraps ?? [])].sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0))[0];
  const career = api.careerSpecificAnalysis?.topCareerMatches?.[0];

  const rows: Array<{ icon: string; label: string; value: string; vColor?: string }> = [];
  if (sp) rows.push({ icon: '🔮', label: sp.name, value: (typeof spPer === 'number' && spPer > 0) ? `만 명 중 약 ${Math.round(spPer)}명` : '특별한 결', vColor: 'var(--orot-coral)' });
  if (w) rows.push({ icon: '⚔️', label: '무기', value: w.name });
  if (t) rows.push({ icon: '⚠️', label: '함정', value: t.name });
  if (career) rows.push({ icon: '🎯', label: '어울리는 일', value: career.industry });

  if (!headline && rows.length === 0) return null;
  const F = 13;
  return (
    <GlanceCard icon="✦" accent="#e0a96d" title="당신을 한마디로 나타내면">
      {headline && (
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800, lineHeight: 1.45, color: 'var(--orot-ink)', letterSpacing: '-0.01em' }}>“{headline}”</p>
      )}
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {chips.map((c, i) => (
            <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--orot-ink-soft)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '4px 10px' }}>{c}</span>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 12, borderTop: '1px solid var(--orot-hair)' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span aria-hidden style={{ fontSize: 12.5, flexShrink: 0 }}>{r.icon}</span>
              <span style={{ fontSize: F, fontWeight: 700, color: 'var(--orot-ink)', flexShrink: 0 }}>{r.label}</span>
              {r.value && <span style={{ fontSize: F, color: r.vColor ?? 'var(--orot-ink-soft)', fontWeight: r.vColor ? 700 : 400, lineHeight: 1.5 }}>· {r.value}</span>}
            </div>
          ))}
        </div>
      )}
      <p style={{ margin: '13px 0 0', fontSize: 11.5, color: 'var(--orot-ink-mute)' }}>아래에서 하나씩 자세히 풀어드릴게요.</p>
    </GlanceCard>
  );
}

// ── 기질 한 컷 카드 (한 줄 요약 + 스탯 칩) ──
// 정체성 히어로 아래, 긴 줄글 전. GPT 0회 — api(birthChart·coreAnalysis·identityKeywords)만 사용.
const TEMPERAMENT_METAPHOR: Record<string, { ko: string; en: string }> = {
  갑: { ko: '큰 나무', en: 'a tall tree' },
  을: { ko: '여린 화초', en: 'a tender plant' },
  병: { ko: '한낮의 태양', en: 'the midday sun' },
  정: { ko: '은은한 촛불', en: 'a steady candle' },
  무: { ko: '큰 산', en: 'a great mountain' },
  기: { ko: '기름진 논밭', en: 'fertile fields' },
  경: { ko: '잘 벼린 칼', en: 'a sharpened blade' },
  신: { ko: '세공된 보석', en: 'a cut jewel' },
  임: { ko: '큰 강과 바다', en: 'a great river' },
  계: { ko: '이슬과 시냇물', en: 'dew and streams' },
};
const TEMP_ELEMENT_LABEL: Record<string, { ko: string; en: string }> = {
  wood: { ko: '목', en: 'Wood' }, fire: { ko: '화', en: 'Fire' }, earth: { ko: '토', en: 'Earth' },
  metal: { ko: '금', en: 'Metal' }, water: { ko: '수', en: 'Water' },
};
const TEMP_STRENGTH_LABEL: Record<string, { ko: string; en: string }> = {
  'very-strong': { ko: '매우 신강', en: 'Very strong' }, strong: { ko: '신강', en: 'Strong' },
  balanced: { ko: '중화', en: 'Balanced' }, weak: { ko: '신약', en: 'Weak' }, 'very-weak': { ko: '매우 신약', en: 'Very weak' },
};

export function SectionTemperamentCard({ api, lang }: { api: SajuV4ApiResponse; lang: 'ko' | 'en' }) {
  const en = lang === 'en';
  const dm = api.birthChart?.dayMaster;
  const ca = api.coreAnalysis;
  const meta = dm ? TEMPERAMENT_METAPHOR[dm] : undefined;
  if (!dm || !ca || !meta) return null;

  const hanja = STEM_HANJA[dm] ?? '';
  const dmElKey = STEM_EL[dm] ?? 'earth';
  const dmEl = TEMP_ELEMENT_LABEL[dmElKey];
  const strongest = ca.elementStrength?.strongest?.[0];
  const weakest = ca.elementStrength?.weakest?.[0];
  const level = ca.dayMasterStrength?.level;
  const metaphor = en ? meta.en : meta.ko;

  // 헤드라인: 핵심 키워드 + 일간 비유(KO). EN은 키워드가 미번역이라 비유 중심으로.
  const kwRaw = (api.identityKeywords?.[0]?.keyword || '').trim();
  const kwCore = kwRaw.replace(/\s*(사람|타입|스타일)$/, '').trim();
  const headline = en
    ? `Like ${metaphor}`
    : (kwCore ? `${kwCore}, ${metaphor} 같은 사람` : `${metaphor} 같은 사람`);

  const chips: string[] = [];
  chips.push(en ? `${hanja} · ${dmEl?.en ?? ''}` : `${hanja} ${dm}${dmEl?.ko ?? ''}`);
  if (level && TEMP_STRENGTH_LABEL[level]) chips.push(en ? TEMP_STRENGTH_LABEL[level].en : TEMP_STRENGTH_LABEL[level].ko);
  if (strongest && TEMP_ELEMENT_LABEL[strongest]) chips.push(en ? `Strong ${TEMP_ELEMENT_LABEL[strongest].en} ▲` : `강한 ${TEMP_ELEMENT_LABEL[strongest].ko} ▲`);
  if (weakest && TEMP_ELEMENT_LABEL[weakest]) chips.push(en ? `Weak ${TEMP_ELEMENT_LABEL[weakest].en} ▽` : `약한 ${TEMP_ELEMENT_LABEL[weakest].ko} ▽`);

  return (
    <GlanceCard icon="🧭" accent="#b79bf5" title={en ? 'YOU IN ONE LINE' : '한 줄로 보는 나'}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1.45, color: 'var(--orot-ink)', letterSpacing: '-0.01em' }}>
        {en ? headline : `“${headline}”`}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {chips.map((c, i) => (
          <span key={i} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--orot-ink-soft)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '5px 11px' }}>{c}</span>
        ))}
      </div>
    </GlanceCard>
  );
}

// 섹션 사이 ✦ 모티프 디바이더 — 잡지 호흡.
function SectionStarDivider() {
  return (
    <div className="sv4-divider" aria-hidden>
      <span className="sv4-divider-line" />
      <span className="sv4-divider-star">✦</span>
      <span className="sv4-divider-line" />
    </div>
  );
}

// 본문 첫 문장을 티저 텍스트로 추출 — <summary> 안의 한 줄 미리보기용.
// 마크다운 헤더/불릿 제거 후 첫 비어있지 않은 줄을 사용.
function extractTeaser(body: string, maxLen = 60): string {
  const first = body
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !/^#{1,4}\s/.test(l) && !/^[-*]\s/.test(l));
  if (!first) return '';
  return first.length > maxLen ? first.slice(0, maxLen).trimEnd() + '…' : first;
}

function NarrativeSection({
  title,
  body,
  eyebrow,
  accent,
  index = 0,
  lead = false,
  defaultOpen = false,
}: {
  title: string;
  body: string;
  eyebrow?: string;
  accent?: SectionAccent;
  index?: number;
  lead?: boolean;
  defaultOpen?: boolean;
}) {
  if (!body || !body.trim()) return null;
  const a = accent ?? SECTION_ACCENTS.opening;
  const teaser = defaultOpen ? '' : extractTeaser(body);
  return (
    <>
      {index > 0 && <SectionStarDivider />}
      <details
        className="sv4-accordion sv4-reveal"
        style={{ marginTop: index > 0 ? 6 : 24 }}
        {...(defaultOpen ? { open: true } : {})}
      >
        <summary className="sv4-accordion-summary" style={{ '--sv4-accent': a.accent } as React.CSSProperties}>
          <span className="sv4-accordion-icon" aria-hidden>{a.icon}</span>
          <span className="sv4-accordion-header">
            {eyebrow && (
              <span className="sv4-accordion-eyebrow" style={{ color: a.accent }}>{eyebrow}</span>
            )}
            <span className="sv4-accordion-title" style={{ color: a.accent }}>{title}</span>
            {teaser && (
              <span className="sv4-accordion-teaser">{teaser}</span>
            )}
          </span>
          <span className="sv4-chevron" aria-hidden style={{ color: a.accent }}>▾</span>
        </summary>
        <div className="sv4-accordion-body">
          <NarrativeBody text={body} accent={a.accent} lead={lead} />
        </div>
      </details>
    </>
  );
}

function NarrativeFutureFlow({
  data,
  title,
  eyebrow,
}: {
  data: { intro: string; years: Array<{ year: number; body: string }> };
  title: string;
  eyebrow: string;
}) {
  if (!data.intro && data.years.length === 0) return null;
  const a = SECTION_ACCENTS.future;
  const teaser = extractTeaser(data.intro || (data.years[0]?.body ?? ''));
  return (
    <>
      <SectionStarDivider />
      <details className="sv4-accordion sv4-reveal" style={{ marginTop: 6 }}>
        <summary className="sv4-accordion-summary" style={{ '--sv4-accent': a.accent } as React.CSSProperties}>
          <span className="sv4-accordion-icon" aria-hidden>{a.icon}</span>
          <span className="sv4-accordion-header">
            <span className="sv4-accordion-eyebrow" style={{ color: a.accent }}>{eyebrow}</span>
            <span className="sv4-accordion-title" style={{ color: a.accent }}>{title}</span>
            {teaser && <span className="sv4-accordion-teaser">{teaser}</span>}
          </span>
          <span className="sv4-chevron" aria-hidden style={{ color: a.accent }}>▾</span>
        </summary>
        <div className="sv4-accordion-body">
          {data.intro && <NarrativeBody text={data.intro} accent={a.accent} lead />}
          <div style={{ marginTop: 16 }}>
            {data.years.map((y) => (
              <div key={y.year} style={{ marginTop: 18 }}>
                <h3 style={{
                  fontSize: 17, fontWeight: 700, color: 'var(--orot-ink)',
                  margin: '0 0 10px', display: 'inline-block',
                  paddingBottom: 4, borderBottom: `2px solid ${a.accent}`,
                  fontFamily: 'var(--orot-font)',
                }}>{y.year}</h3>
                <NarrativeBody text={y.body} accent={a.accent} />
              </div>
            ))}
          </div>
        </div>
      </details>
    </>
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

// 본문 — 줄글 위주 렌더 (단락·짧은 하위 헤더·간단 리스트만 처리).
// lead=true면 첫 단락을 살짝 크게/진하게 리드인으로 렌더(잡지 호흡, 콘텐츠 비의존).
// accent는 하위 헤더(### …) 색에만 쓰여 섹션 톤을 본문까지 잇는다.
function NarrativeBody({ text, accent, lead = false }: { text: string; accent?: string; lead?: boolean }) {
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
        margin: '10px 0',
        fontSize: isLead ? 16.5 : 15,
        lineHeight: 1.85,
        fontWeight: isLead ? 600 : 400,
        color: isLead ? 'var(--orot-ink-soft)' : 'var(--orot-ink)',
        letterSpacing: isLead ? '-0.005em' : undefined,
      }}>
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
        fontSize: 14, fontWeight: 700, color: headColor,
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
