'use client';

// 궁합 결제 전 "미리보기(teaser)" — 호기심 자극형.
//
// 설계(2026-06, 사용자 확정):
//   - 결제 전 GPT 호출 없음. /api/compat-v4/preview 의 결정론 bundle만 사용.
//   - 강한 후킹(관계 카드 이름) → 실제 분석된 사실 공개("진짜 내 사주다" 증명)
//     → 첫 섹션 1개 풀 맛보기 → 나머지는 호기심 티저 + 잠금 + 별빛 CTA.
//   - 결과(CompatNarrativeReport)와 같은 sv4 톤. 숫자 점수·운명론 없음.

import React from 'react';
import type {
  CompatibilityAnalysisBundle,
  PersonForCompat,
  RelationshipType,
} from '@/domain/saju/compatibility/compatibilityTypes';
import { buildPersonTrait } from '@/domain/saju/compatibility/compatExtras';

export interface CompatPreviewData {
  relationshipType: RelationshipType;
  personA: PersonForCompat;
  personB: PersonForCompat;
  compatibilityAnalysis: CompatibilityAnalysisBundle;
}

interface Props {
  preview: CompatPreviewData | null;
  loading: boolean;
  relationshipType: RelationshipType;
  nameA: string;
  nameB: string;
  lang: 'ko' | 'en';
  starBalance: number;
  cost: number;
  onUnlock: () => void;
  onCharge: () => void;
}

const CHEM_LABEL: Record<string, { ko: string; en: string }> = {
  strong: { ko: '강하게 끌리는', en: 'strong pull' },
  soft: { ko: '부드럽게 끌리는', en: 'soft pull' },
  practical: { ko: '현실로 맞물리는', en: 'practical fit' },
  'slow-burn': { ko: '서서히 데워지는', en: 'slow burn' },
  unstable: { ko: '온도 차가 있는', en: 'up-and-down' },
};
const COMPLEMENT_LABEL: Record<string, { ko: string; en: string }> = {
  strong: { ko: '아주 좋음', en: 'excellent' },
  moderate: { ko: '보통', en: 'moderate' },
  weak: { ko: '약함', en: 'weak' },
  'one-sided': { ko: '한쪽으로 치우침', en: 'one-sided' },
};

// 결제하면 이어서 볼 섹션 — 결과(CompatNarrativeReport) 구성과 1:1로 맞춤. 호기심 티저.
function lockedSections(type: RelationshipType, lang: 'ko' | 'en') {
  const ko = lang !== 'en';
  const base = [
    { icon: '🌙', title: ko ? '이 관계가 이렇게 느껴지는 이유' : 'Why it feels this way', teaser: ko ? '두 사람의 사주가 만드는 관계의 구조를 한 장면처럼 풀어줘요.' : 'The structure your two charts create.' },
    { icon: '❤️', title: ko ? '끌리는 지점과 엇갈리는 지점' : 'Attraction & friction', teaser: ko ? '왜 자꾸 끌리는지, 정확히 어디서 부딪히는지.' : 'Exactly where you click and clash.' },
    { icon: '💞', title: ko ? '두 사람의 연애 결' : 'Attachment styles', teaser: ko ? '사랑을 표현하고 확인하는 서로 다른 방식.' : 'How each of you loves differently.' },
    { icon: '🔁', title: ko ? '반복되기 쉬운 관계 패턴' : 'Repeating pattern', teaser: ko ? '이 조합에서 자꾸 되풀이되는 장면.' : 'The scene that keeps recurring.' },
    { icon: '⚡', title: ko ? '이렇게 부딪히고, 이렇게 풀려요' : 'Conflict & make-up', teaser: ko ? '싸우는 진짜 이유와, 가장 빨리 푸는 법.' : 'Why you fight and how to recover fastest.' },
    { icon: '💰', title: ko ? '돈과 살림의 결' : 'Money & life fit', teaser: ko ? '함께할 때 돈·생활에서 맞추면 좋은 것.' : 'Aligning money and daily life.' },
    { icon: '🌱', title: ko ? '관계의 다음 단계' : 'The next step', teaser: ko ? '지금에서 한 걸음 더 가려면 무엇이 필요한지.' : 'What it takes to go one step further.' },
  ];
  if (type === 'married') {
    base.push({ icon: '🎁', title: ko ? '두 사람의 자녀운' : 'Children fortune', teaser: ko ? '시기·아이 기질·양육 분담까지.' : 'Timing, temperament, parenting roles.' });
  }
  base.push({ icon: '⭐', title: ko ? '마지막으로 드리는 조언' : 'Final advice', teaser: ko ? '두 사람을 위한 마지막 한마디.' : 'One last word for the two of you.' });
  return base;
}

export default function CompatPreviewTeaser({
  preview, loading, relationshipType, nameA, nameB, lang, starBalance, cost, onUnlock, onCharge,
}: Props) {
  const ko = lang !== 'en';

  const ctaCard = (
    <div className="card" style={{
      marginTop: 14, textAlign: 'center', padding: '30px 22px',
      background: 'linear-gradient(180deg, rgba(243,160,146,0.10), rgba(243,160,146,0.04))',
      border: '1px solid var(--orot-coral-faint)', borderRadius: 'var(--orot-r-lg)',
    }}>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--orot-ink)', lineHeight: 1.7, marginBottom: 18, fontFamily: 'var(--orot-font)', whiteSpace: 'pre-line' }}>
        {ko ? '두 사람의 인연을 깊이 들여다보고\n궁합의 전체 해석을 확인해요' : 'See the full reading of\nyour connection'}
      </div>
      <div style={{ marginBottom: 18 }}>
        <span style={{ fontSize: 29, fontWeight: 700, color: 'var(--orot-coral)', fontFamily: 'var(--orot-font)' }}>⭐ {cost} {ko ? '별빛' : 'Stars'}</span>
        <div style={{ fontSize: 13, color: 'var(--orot-ink-mute)', marginTop: 6, fontFamily: 'var(--orot-font)' }}>
          {ko ? '보유 별빛: ' : 'Your balance: '}⭐ {starBalance}{ko ? '개' : ''}
        </div>
      </div>
      {starBalance >= cost ? (
        <button
          className="paywall-cta"
          style={{ display: 'block', width: '100%', textAlign: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16 }}
          onClick={onUnlock}
        >
          {ko ? `별빛 ${cost}개로 전체 열기 ⭐` : `Unlock with ${cost} Stars ⭐`}
        </button>
      ) : (
        <button
          className="paywall-cta"
          style={{ display: 'block', width: '100%', textAlign: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
          onClick={onCharge}
        >
          {ko ? '별빛이 부족해요! 충전하러 가기 ⭐' : 'Not enough stars! Go charge ⭐'}
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="card" style={{ marginTop: 16, textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
        <div style={{ fontSize: 14, color: 'var(--orot-ink-mute)', fontFamily: 'var(--orot-font)' }}>
          {ko ? '두 사람의 사주를 맞춰보는 중…' : 'Aligning your two charts…'}
        </div>
      </div>
    );
  }

  // 미리보기 데이터 로드 실패 — 결제는 막지 않도록 CTA만 노출.
  if (!preview) {
    return <div style={{ marginTop: 16 }}>{ctaCard}</div>;
  }

  const bd = preview.compatibilityAnalysis;
  const arch = bd.relationshipArchetype;
  const aTrait = buildPersonTrait(nameA, preview.personA?.birthChart?.dayMaster ?? '');
  const bTrait = buildPersonTrait(nameB, preview.personB?.birthChart?.dayMaster ?? '');
  const chem = CHEM_LABEL[bd.attractionAnalysis?.initialChemistry ?? 'soft'] ?? CHEM_LABEL.soft;
  const comp = COMPLEMENT_LABEL[bd.elementComplement?.mutualComplement ?? 'moderate'] ?? COMPLEMENT_LABEL.moderate;
  const chips = (arch?.keywords ?? []).filter((k) => k && k.length <= 8).slice(0, 4);
  const strength = (bd.relationshipStrengths ?? [])[0];

  const facts: { label: string; value: string }[] = [
    { label: ko ? '두 사람 일간' : 'Day masters', value: `${aTrait.dayMasterKo} × ${bTrait.dayMasterKo}` },
    { label: ko ? '관계 유형' : 'Type', value: arch?.shortLabel || '—' },
    { label: ko ? '첫 끌림' : 'First pull', value: ko ? chem.ko : chem.en },
    { label: ko ? '서로 채워줌' : 'Complement', value: ko ? comp.ko : comp.en },
  ];

  const locked = lockedSections(relationshipType, lang);
  const tasteBody = [arch?.summary, strength?.lifeScene].filter(Boolean).join(' ');

  return (
    <div className="sv4" style={{ marginTop: 16 }}>
      {/* HOOK 히어로 — 관계 카드 이름 */}
      <section className="sv4-hero sv4-reveal">
        <div className="sv4-hero-glow" aria-hidden />
        <div className="sv4-hero-inner">
          <div className="sv4-hero-eyebrow">
            <span aria-hidden>✦</span>
            <span>{ko ? '두 사람의 궁합 · 미리보기' : 'Compatibility · Preview'}</span>
          </div>
          {arch?.title && <h1 className="sv4-hero-title">{arch.title}</h1>}
          <p className="sv4-hero-desc">
            {ko
              ? `${nameA} × ${nameB} — ${chem.ko} 사이예요.`
              : `${nameA} × ${nameB} — a ${chem.en} connection.`}
          </p>
          {chips.length > 0 && (
            <div className="sv4-hero-chips">
              {chips.map((k, i) => <span key={i} className="sv4-chip">#{k}</span>)}
            </div>
          )}
        </div>
      </section>

      {/* 사실 공개 — "진짜 내 사주다" 증명 */}
      <div className="card" style={{ marginTop: 14, padding: '18px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orot-coral)', marginBottom: 12, fontFamily: 'var(--orot-font)' }}>
          {ko ? '✓ 두 사람의 사주, 이미 분석을 마쳤어요' : '✓ Your charts are already analyzed'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {facts.map((f, i) => (
            <div key={i} style={{ borderRadius: 12, border: '1px solid var(--orot-hair)', background: 'rgba(255,255,255,0.02)', padding: '12px 14px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--orot-ink-mute)', marginBottom: 4, fontFamily: 'var(--orot-font)' }}>{f.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--orot-ink)', fontFamily: 'var(--orot-font)', wordBreak: 'keep-all' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 무료 맛보기 — 첫 섹션 1개 풀공개 */}
      {tasteBody && (
        <div className="card" style={{ marginTop: 12, padding: '18px 16px', background: 'linear-gradient(180deg, rgba(243,160,146,0.07), rgba(243,160,146,0.02))', border: '1px solid var(--orot-coral-faint)' }}>
          <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'var(--orot-coral)' }}>
            {ko ? '무료 맛보기' : 'Free taste'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--orot-ink)', marginBottom: 8, fontFamily: 'var(--orot-font)' }}>
            {ko ? '두 사람의 핵심 한 컷' : 'The heart of you two'}
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--orot-ink)', margin: 0, fontFamily: 'var(--orot-font)', wordBreak: 'keep-all' }}>
            {tasteBody}
          </p>
        </div>
      )}

      {/* 잠긴 섹션 — 호기심 티저 */}
      <div className="section-divider">{ko ? '별빛으로 열면 이어서 볼 내용' : 'Unlock to continue'}</div>
      <div className="card" style={{ padding: '8px 14px' }}>
        {locked.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 11, padding: '13px 2px',
            borderBottom: i < locked.length - 1 ? '1px solid var(--orot-hair)' : 'none',
          }}>
            <span style={{ fontSize: 19, flexShrink: 0, marginTop: 1, opacity: 0.85 }}>{s.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--orot-ink)', fontFamily: 'var(--orot-font)' }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--orot-ink-mute)', lineHeight: 1.55, marginTop: 3, fontFamily: 'var(--orot-font)', wordBreak: 'keep-all' }}>{s.teaser}</div>
            </div>
            <span style={{ fontSize: 15, flexShrink: 0, marginTop: 2, opacity: 0.5 }}>🔒</span>
          </div>
        ))}
      </div>

      {/* 별빛 CTA */}
      {ctaCard}
    </div>
  );
}
