// Paid Report Productization V1 — CARD-FIRST 렌더러.
//
// 설계: api.paidReport 가 present일 때만 마운트된다 (SajuV4Report.tsx에서 가드).
// 첫 화면은 판정형/카드형 모듈(아키타입 → 핵심키워드 → 무기 → 함정 → 사람/돈/타이밍/행운/직업/관계),
// 기존 긴 줄글은 맨 아래 "📖 상세 해설 더 보기" accordion으로 강등.
//
// 모든 verdict 카드는 "근거 보기" 펼침 → evidenceIds를 evidenceMap[id].label로 표시 (근거 없는 verdict 노출 방지).
// 디자인: 기존 Orot 시스템(card, orot-eyebrow, orot-coral, var(--orot-*)) + EasyEvidenceView 톤 재사용.
// 모바일 우선: 단일 컬럼, 넉넉한 탭 타겟, 반응형 grid(auto-fit, minmax).

'use client';

import React, { useState } from 'react';
import type {
  PaidSajuReportV1,
  PaidEvidenceMap,
  PaidVerdictItem,
  PaidArchetypeCard,
  PaidCoreSummary,
  PaidWeaponItem,
  PaidTrapItem,
  PaidPeopleGuide,
  PaidMoneyGuide,
  PaidTimingGuide,
  PaidTimingYear,
  PaidLuckGuide,
  PaidCareerGuide,
  PaidCareerFit,
  PaidRelationshipGuide,
  PaidDetailedNarrative,
} from '@/domain/saju/paidReport/paidReportTypes';

// ============================================================
// 메인 — 카드 순서대로 렌더
// ============================================================
export interface PaidReportViewProps {
  report: PaidSajuReportV1;
}

export function PaidReportView({ report }: PaidReportViewProps) {
  const ev = report.evidenceMap;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
      {/* 1. 아키타입 카드 */}
      <ArchetypeCard data={report.archetypeCard} ev={ev} />

      {/* 2. 핵심 키워드 5개 */}
      <CoreSummaryCard data={report.coreSummary} ev={ev} />

      {/* 3. 무기 */}
      <WeaponsSection items={report.weapons} ev={ev} />

      {/* 4. 함정 */}
      <TrapsSection items={report.traps} ev={ev} />

      {/* 5. 사람 가이드 */}
      <PeopleGuideCard data={report.peopleGuide} ev={ev} />

      {/* 6. 돈 가이드 */}
      <MoneyGuideCard data={report.moneyGuide} ev={ev} />

      {/* 7. 타이밍 가이드 */}
      <TimingGuideCard data={report.timingGuide} ev={ev} />

      {/* 8. 행운 가이드 */}
      <LuckGuideCard data={report.luckGuide} ev={ev} />

      {/* 9. 직업 가이드 */}
      <CareerGuideCard data={report.careerGuide} ev={ev} />

      {/* 10. 관계 가이드 */}
      <RelationshipGuideCard data={report.relationshipGuide} ev={ev} />
    </div>
  );
}

// ============================================================
// 공통 UI primitives — Orot 톤 재사용
// ============================================================

/** 섹션 헤더 — 큰 제목 + 서브타이틀 + verdict 한 줄(판정형). */
function ModuleHeader({
  eyebrow, title, subtitle, verdict,
}: { eyebrow: string; title: string; subtitle?: string; verdict?: string }) {
  return (
    <header style={{ marginBottom: 14 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 4, fontSize: 15 }}>{eyebrow}</div>
      <h2 style={{
        fontSize: 21, fontWeight: 800, color: 'var(--orot-coral)',
        margin: '0 0 6px', letterSpacing: '-0.01em', lineHeight: 1.3,
        fontFamily: 'var(--orot-font)', wordBreak: 'keep-all',
      }}>{title}</h2>
      {subtitle && (
        <div style={{ fontSize: 12.5, color: 'var(--orot-ink-mute)', lineHeight: 1.55, marginBottom: verdict ? 10 : 0 }}>
          {subtitle}
        </div>
      )}
      {verdict && (
        <div style={{
          fontSize: 15.5, fontWeight: 700, color: 'var(--orot-ink)',
          lineHeight: 1.6, wordBreak: 'keep-all',
          padding: '10px 14px', borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(243,160,146,0.12), rgba(240,199,94,0.05))',
          border: '1px solid var(--orot-coral-faint)',
        }}>{verdict}</div>
      )}
    </header>
  );
}

/** 근거 보기 — evidenceIds → evidenceMap[id].label 칩. id가 map에 없으면 skip. */
function EvidenceToggle({ ids, ev }: { ids: string[]; ev: PaidEvidenceMap }) {
  const labels = Array.from(new Set(
    (ids ?? [])
      .map(id => ev[id]?.label)
      .filter((l): l is string => !!l && !!l.trim()),
  ));
  if (labels.length === 0) return null;
  return (
    <details style={{ marginTop: 10 }}>
      <summary style={{
        cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
        color: 'var(--orot-ink-mute)', listStyle: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 10px', borderRadius: 999,
        border: '1px solid var(--orot-hair)',
      }}>
        🔎 근거 보기 ({labels.length})
      </summary>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {labels.map((label, i) => (
          <span key={i} style={{
            fontSize: 11, fontWeight: 600, color: 'var(--orot-ink-soft)',
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(159, 122, 234, 0.08)',
            border: '1px solid rgba(159, 122, 234, 0.22)',
            wordBreak: 'keep-all',
          }}>✦ {label}</span>
        ))}
      </div>
    </details>
  );
}

/** PaidVerdictItem 리스트 — text(판정) + why(부연) + 항목별 근거 칩. */
function VerdictItemList({
  items, accent = 'var(--orot-coral)', ev,
}: { items: PaidVerdictItem[]; accent?: string; ev: PaidEvidenceMap }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ paddingLeft: 12, borderLeft: `2px solid ${accent}55` }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--orot-ink)', lineHeight: 1.55, wordBreak: 'keep-all' }}>
            {it.text}
          </div>
          {it.why && (
            <div style={{ fontSize: 12.5, color: 'var(--orot-ink-soft)', lineHeight: 1.6, marginTop: 4, wordBreak: 'keep-all' }}>
              {it.why}
            </div>
          )}
          <EvidenceToggle ids={it.evidenceIds} ev={ev} />
        </div>
      ))}
    </div>
  );
}

/** 4분면/2분면 라벨 그룹 (사람·돈 가이드에서 +/− 대비). */
function GuideQuadrant({
  label, tone, items, ev,
}: { label: string; tone: 'good' | 'caution'; items: PaidVerdictItem[]; ev: PaidEvidenceMap }) {
  if (!items || items.length === 0) return null;
  const color = tone === 'good' ? '#6EE7B7' : '#F0C75E';
  const bg = tone === 'good' ? 'rgba(110, 231, 183, 0.05)' : 'rgba(240, 199, 94, 0.05)';
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: bg, border: `1px solid ${color}33`,
    }}>
      <div style={{ fontSize: 11.5, color, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 10 }}>
        {tone === 'good' ? '✦ ' : '⌖ '}{label}
      </div>
      <VerdictItemList items={items} accent={color} ev={ev} />
    </div>
  );
}

/** 칩 묶음 (키워드/색/장소/루틴 등 단순 string[]). */
function ChipRow({ values, tone = 'neutral' }: { values: string[]; tone?: 'accent' | 'neutral' | 'warn' }) {
  if (!values || values.length === 0) return null;
  const styles =
    tone === 'accent'
      ? { color: 'var(--orot-coral)', bg: 'rgba(243,160,146,0.10)', border: 'var(--orot-coral-faint)' }
      : tone === 'warn'
      ? { color: '#F0C75E', bg: 'rgba(240,199,94,0.08)', border: 'rgba(240,199,94,0.28)' }
      : { color: 'var(--orot-ink-soft)', bg: 'rgba(255,255,255,0.04)', border: 'var(--orot-hair)' };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {values.map((v, i) => (
        <span key={i} style={{
          fontSize: 12.5, fontWeight: 600, color: styles.color,
          padding: '6px 12px', borderRadius: 999,
          background: styles.bg, border: `1px solid ${styles.border}`,
          wordBreak: 'keep-all',
        }}>{v}</span>
      ))}
    </div>
  );
}

/** 미니 섹션 라벨 (카드 내부 하위 구획). */
function MiniLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 800, color: 'var(--orot-ink-mute)',
      letterSpacing: '0.03em', margin: '0 0 8px',
    }}>{children}</div>
  );
}

// ============================================================
// 1. 아키타입 카드
// ============================================================
function ArchetypeCard({ data, ev }: { data: PaidArchetypeCard; ev: PaidEvidenceMap }) {
  if (!data) return null;
  return (
    <div className="card" style={{
      padding: 22,
      background: 'radial-gradient(circle at top right, rgba(159,122,234,0.14), transparent 55%), linear-gradient(180deg, var(--orot-card-purple) 0%, var(--orot-card-purple-2) 100%)',
      border: '1px solid var(--orot-hair-strong)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div aria-hidden style={{ position: 'absolute', top: 18, right: 22, width: 5, height: 5, borderRadius: 999, background: 'var(--orot-coral)', boxShadow: '0 0 10px var(--orot-coral)', opacity: 0.8 }} />
      <div className="orot-eyebrow" style={{ marginBottom: 8, fontSize: 14, letterSpacing: '0.06em' }}>
        ✦ 나의 별 아키타입
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 800, color: 'var(--orot-coral)',
        margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.25,
        fontFamily: 'var(--orot-font)', wordBreak: 'keep-all',
      }}>{data.nickname}</h1>
      {data.oneLiner && (
        <p style={{ fontSize: 15, color: 'var(--orot-ink)', lineHeight: 1.65, margin: '0 0 16px', wordBreak: 'keep-all' }}>
          {data.oneLiner}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {data.brightSide && (
          <div style={{ borderTop: '1px solid var(--orot-hair)', paddingTop: 12 }}>
            <div style={{ fontSize: 11.5, color: '#F6D58A', fontWeight: 700, marginBottom: 4, letterSpacing: '0.04em' }}>
              ✦ 이 별이 빛나는 순간
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--orot-ink)', lineHeight: 1.6, wordBreak: 'keep-all' }}>
              {data.brightSide}
            </div>
          </div>
        )}
        {data.shadowSide && (
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--orot-ink-mute)', fontWeight: 700, marginBottom: 4, letterSpacing: '0.04em' }}>
              ⌖ 이 별이 지치는 순간
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--orot-ink-soft)', lineHeight: 1.6, wordBreak: 'keep-all' }}>
              {data.shadowSide}
            </div>
          </div>
        )}
      </div>

      {data.keywords?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--orot-hair)', paddingTop: 14 }}>
          <ChipRow values={data.keywords} tone="accent" />
        </div>
      )}
      <EvidenceToggle ids={data.evidenceIds} ev={ev} />
    </div>
  );
}

// ============================================================
// 2. 핵심 키워드 5개
// ============================================================
function CoreSummaryCard({ data, ev }: { data: PaidCoreSummary; ev: PaidEvidenceMap }) {
  if (!data || (!data.keywords?.length && !data.oneLiner)) return null;
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 12, fontSize: 15 }}>나를 설명하는 핵심 키워드</div>
      {data.keywords?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: data.oneLiner ? 14 : 0 }}>
          {data.keywords.map((kw, i) => (
            <span key={i} style={{
              fontSize: 14, fontWeight: 800, color: 'var(--orot-ink-on-pink)',
              padding: '8px 16px', borderRadius: 999,
              background: 'linear-gradient(135deg, var(--orot-card-pink), var(--orot-card-pink-2))',
              wordBreak: 'keep-all',
            }}>{kw}</span>
          ))}
        </div>
      )}
      {data.oneLiner && (
        <div style={{ fontSize: 14.5, color: 'var(--orot-ink)', lineHeight: 1.65, fontWeight: 600, wordBreak: 'keep-all' }}>
          “{data.oneLiner}”
        </div>
      )}
      <EvidenceToggle ids={data.evidenceIds} ev={ev} />
    </div>
  );
}

// ============================================================
// 3. 무기
// ============================================================
function WeaponsSection({ items, ev }: { items: PaidWeaponItem[]; ev: PaidEvidenceMap }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card" style={{ padding: 18 }}>
      <ModuleHeader eyebrow="⚔ 이 사주의 무기" title="잘 쓰면 강해지는 무기" subtitle="당신이 가진 힘과, 그 힘이 실제로 살아나는 장면" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((w, i) => (
          <div key={w.id ?? i} style={{
            padding: 14, borderRadius: 14,
            background: 'rgba(110, 231, 183, 0.05)',
            border: '1px solid rgba(110, 231, 183, 0.22)',
            borderLeft: '3px solid #6EE7B7',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--orot-ink)', marginBottom: 4, wordBreak: 'keep-all' }}>
              {w.title}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#6EE7B7', lineHeight: 1.55, marginBottom: 10, wordBreak: 'keep-all' }}>
              {w.verdict}
            </div>
            {w.scene && (
              <div style={{ marginBottom: 8 }}>
                <MiniLabel>실제 장면</MiniLabel>
                <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6, wordBreak: 'keep-all' }}>{w.scene}</div>
              </div>
            )}
            {w.howToUse && (
              <div>
                <MiniLabel>더 강하게 쓰는 법</MiniLabel>
                <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6, wordBreak: 'keep-all' }}>{w.howToUse}</div>
              </div>
            )}
            <EvidenceToggle ids={w.evidenceIds} ev={ev} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 4. 함정
// ============================================================
function TrapsSection({ items, ev }: { items: PaidTrapItem[]; ev: PaidEvidenceMap }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card" style={{ padding: 18 }}>
      <ModuleHeader eyebrow="⚠ 이 사주의 함정" title="반복해서 빠지기 쉬운 함정" subtitle="자주 걸려 넘어지는 패턴과, 거기서 빠져나오는 법" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((t, i) => (
          <div key={t.id ?? i} style={{
            padding: 14, borderRadius: 14,
            background: 'rgba(240, 140, 140, 0.05)',
            border: '1px solid rgba(240, 140, 140, 0.22)',
            borderLeft: '3px solid #F08C8C',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--orot-ink)', marginBottom: 4, wordBreak: 'keep-all' }}>
              {t.title}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#F0A0A0', lineHeight: 1.55, marginBottom: 10, wordBreak: 'keep-all' }}>
              {t.verdict}
            </div>
            {t.pattern && (
              <div style={{ marginBottom: 8 }}>
                <MiniLabel>반복되는 패턴</MiniLabel>
                <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6, wordBreak: 'keep-all' }}>{t.pattern}</div>
              </div>
            )}
            {t.escape && (
              <div>
                <MiniLabel><span style={{ color: '#6EE7B7' }}>빠져나오는 법</span></MiniLabel>
                <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6, wordBreak: 'keep-all' }}>{t.escape}</div>
              </div>
            )}
            <EvidenceToggle ids={t.evidenceIds} ev={ev} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 5. 사람 가이드
// ============================================================
function PeopleGuideCard({ data, ev }: { data: PaidPeopleGuide; ev: PaidEvidenceMap }) {
  if (!data) return null;
  return (
    <div className="card" style={{ padding: 18 }}>
      <ModuleHeader eyebrow="🤝 사람 가이드" title={data.title || '곁에 두면 좋은 사람, 멀리할 사람'} subtitle={data.subtitle} verdict={data.verdict} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
        <GuideQuadrant label="가까이하면 좋은 사람" tone="good" items={data.closer} ev={ev} />
        <GuideQuadrant label="멀리하는 게 나은 사람" tone="caution" items={data.avoid} ev={ev} />
        <GuideQuadrant label="같이 일하면 좋은 사람" tone="good" items={data.goodCollaborator} ev={ev} />
        <GuideQuadrant label="피해야 할 관계 패턴" tone="caution" items={data.avoidPattern} ev={ev} />
      </div>
      <EvidenceToggle ids={data.evidenceIds} ev={ev} />
    </div>
  );
}

// ============================================================
// 6. 돈 가이드
// ============================================================
function MoneyGuideCard({ data, ev }: { data: PaidMoneyGuide; ev: PaidEvidenceMap }) {
  if (!data) return null;
  return (
    <div className="card" style={{ padding: 18 }}>
      <ModuleHeader eyebrow="💰 돈 가이드" title={data.title || '돈이 붙는 길, 돈이 새는 길'} subtitle={data.subtitle} verdict={data.verdict} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
        <GuideQuadrant label="돈이 붙는 루트" tone="good" items={data.earnRoutes} ev={ev} />
        <GuideQuadrant label="돈이 새는 루트" tone="caution" items={data.leakRoutes} ev={ev} />
        <GuideQuadrant label="맞는 수익화 방식" tone="good" items={data.fitMonetization} ev={ev} />
        <GuideQuadrant label="피해야 할 돈 방식" tone="caution" items={data.avoidMoneyStyle} ev={ev} />
      </div>
      <EvidenceToggle ids={data.evidenceIds} ev={ev} />
    </div>
  );
}

// ============================================================
// 7. 타이밍 가이드
// ============================================================
function TimingYearRow({ y, tone, ev }: { y: PaidTimingYear; tone: 'good' | 'caution'; ev: PaidEvidenceMap }) {
  const color = tone === 'good' ? '#6EE7B7' : '#F0C75E';
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingLeft: 12, borderLeft: `2px solid ${color}55` }}>
      <div style={{
        flexShrink: 0, minWidth: 52, textAlign: 'center',
        fontSize: 17, fontWeight: 800, color,
        fontFamily: 'var(--orot-font)',
      }}>
        {y.year}
        {typeof y.age === 'number' && (
          <div style={{ fontSize: 10, color: 'var(--orot-ink-mute)', fontWeight: 600 }}>{y.age}세</div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orot-ink)', lineHeight: 1.5, wordBreak: 'keep-all' }}>{y.label}</div>
        {y.why && (
          <div style={{ fontSize: 12.5, color: 'var(--orot-ink-soft)', lineHeight: 1.6, marginTop: 3, wordBreak: 'keep-all' }}>{y.why}</div>
        )}
        <EvidenceToggle ids={y.evidenceIds} ev={ev} />
      </div>
    </div>
  );
}

function TimingGuideCard({ data, ev }: { data: PaidTimingGuide; ev: PaidEvidenceMap }) {
  if (!data) return null;
  const hasOpening = data.openingYears?.length > 0;
  const hasCaution = data.cautionYears?.length > 0;
  if (!hasOpening && !hasCaution && !data.verdict) return null;
  return (
    <div className="card" style={{ padding: 18 }}>
      <ModuleHeader eyebrow="⏳ 타이밍 가이드" title={data.title || '언제 밀고, 언제 조심할까'} subtitle={data.subtitle} verdict={data.verdict} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {hasOpening && (
          <div>
            <div style={{ fontSize: 11.5, color: '#6EE7B7', fontWeight: 800, letterSpacing: '0.04em', marginBottom: 10 }}>✦ 운이 열리는 해</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.openingYears.map((y, i) => <TimingYearRow key={i} y={y} tone="good" ev={ev} />)}
            </div>
          </div>
        )}
        {hasCaution && (
          <div>
            <div style={{ fontSize: 11.5, color: '#F0C75E', fontWeight: 800, letterSpacing: '0.04em', marginBottom: 10 }}>⌖ 조심할 해</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.cautionYears.map((y, i) => <TimingYearRow key={i} y={y} tone="caution" ev={ev} />)}
            </div>
          </div>
        )}
      </div>
      <EvidenceToggle ids={data.evidenceIds} ev={ev} />
    </div>
  );
}

// ============================================================
// 8. 행운 가이드
// ============================================================
function LuckGuideCard({ data, ev }: { data: PaidLuckGuide; ev: PaidEvidenceMap }) {
  if (!data) return null;
  const allGroups: Array<{ label: string; values: string[]; tone: 'accent' | 'neutral' }> = [
    { label: '행운의 색', values: data.colors, tone: 'accent' },
    { label: '잘 맞는 장소', values: data.places, tone: 'neutral' },
    { label: '운을 올리는 루틴', values: data.routines, tone: 'neutral' },
    { label: '손이 가면 좋은 아이템', values: data.items, tone: 'neutral' },
  ];
  const groups = allGroups.filter(g => g.values?.length > 0);
  if (groups.length === 0 && !(data.blockingEnvironments?.length) && !data.verdict) return null;
  return (
    <div className="card" style={{ padding: 18 }}>
      <ModuleHeader eyebrow="🍀 행운 가이드" title={data.title || '운을 올리는 색·장소·루틴'} subtitle={data.subtitle} verdict={data.verdict} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {groups.map((g, i) => (
          <div key={i}>
            <MiniLabel>{g.label}</MiniLabel>
            <ChipRow values={g.values} tone={g.tone} />
          </div>
        ))}
        {data.blockingEnvironments?.length > 0 && (
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--orot-hair)' }}>
            <MiniLabel><span style={{ color: '#F0C75E' }}>운을 막는 환경</span></MiniLabel>
            <ChipRow values={data.blockingEnvironments} tone="warn" />
          </div>
        )}
      </div>
      <EvidenceToggle ids={data.evidenceIds} ev={ev} />
    </div>
  );
}

// ============================================================
// 9. 직업 가이드
// ============================================================
function CareerFitCard({ fit, conditional, ev }: { fit: PaidCareerFit; conditional?: boolean; ev: PaidEvidenceMap }) {
  const accent = conditional ? '#7DD3FC' : '#6EE7B7';
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: conditional ? 'rgba(125, 211, 252, 0.05)' : 'rgba(110, 231, 183, 0.05)',
      border: `1px solid ${accent}33`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--orot-ink)', wordBreak: 'keep-all' }}>{fit.industry}</span>
        {typeof fit.fitScore === 'number' && (
          <span style={{ fontSize: 11, fontWeight: 700, color: accent, marginLeft: 'auto' }}>
            적합도 {Math.round(fit.fitScore * (fit.fitScore <= 1 ? 100 : 1))}
          </span>
        )}
      </div>
      {fit.roles?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <ChipRow values={fit.roles} tone="neutral" />
        </div>
      )}
      {fit.why && (
        <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6, wordBreak: 'keep-all' }}>{fit.why}</div>
      )}
      <EvidenceToggle ids={fit.evidenceIds} ev={ev} />
    </div>
  );
}

function CareerGuideCard({ data, ev }: { data: PaidCareerGuide; ev: PaidEvidenceMap }) {
  if (!data) return null;
  const hasTop = data.topFits?.length > 0;
  const hasCond = data.conditionalFits?.length > 0;
  return (
    <div className="card" style={{ padding: 18 }}>
      <ModuleHeader eyebrow="🧭 직업 가이드" title={data.title || '실력이 살아나는 일의 결'} subtitle={data.subtitle} verdict={data.verdict} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {hasTop && (
          <div>
            <div style={{ fontSize: 11.5, color: '#6EE7B7', fontWeight: 800, letterSpacing: '0.04em', marginBottom: 10 }}>✦ 가장 잘 맞는 분야</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              {data.topFits.map((f, i) => <CareerFitCard key={i} fit={f} ev={ev} />)}
            </div>
          </div>
        )}
        {hasCond && (
          <div>
            <div style={{ fontSize: 11.5, color: '#7DD3FC', fontWeight: 800, letterSpacing: '0.04em', marginBottom: 10 }}>◇ 조건이 맞으면 좋은 분야</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              {data.conditionalFits.map((f, i) => <CareerFitCard key={i} fit={f} conditional ev={ev} />)}
            </div>
          </div>
        )}
        {data.avoidEnvironments?.length > 0 && (
          <GuideQuadrant label="피해야 할 환경" tone="caution" items={data.avoidEnvironments} ev={ev} />
        )}
        {data.bestWorkStyle?.length > 0 && (
          <div>
            <MiniLabel><span style={{ color: 'var(--orot-coral)' }}>실력이 살아나는 일 방식</span></MiniLabel>
            <VerdictItemList items={data.bestWorkStyle} accent="var(--orot-coral)" ev={ev} />
          </div>
        )}
      </div>
      <EvidenceToggle ids={data.evidenceIds} ev={ev} />
    </div>
  );
}

// ============================================================
// 10. 관계 가이드
// ============================================================
function RelationshipGuideCard({ data, ev }: { data: PaidRelationshipGuide; ev: PaidEvidenceMap }) {
  if (!data) return null;
  return (
    <div className="card" style={{ padding: 18 }}>
      <ModuleHeader eyebrow="💗 관계 가이드" title={data.title || '마음이 열리고 닫히는 결'} subtitle={data.subtitle} verdict={data.verdict} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {data.attractionStyle?.length > 0 && (
          <div>
            <MiniLabel><span style={{ color: 'var(--orot-coral)' }}>끌림 · 매력의 결</span></MiniLabel>
            <VerdictItemList items={data.attractionStyle} accent="var(--orot-coral)" ev={ev} />
          </div>
        )}
        {data.relationshipPattern?.length > 0 && (
          <div>
            <MiniLabel><span style={{ color: 'var(--orot-coral)' }}>반복되는 관계 패턴</span></MiniLabel>
            <VerdictItemList items={data.relationshipPattern} accent="var(--orot-coral)" ev={ev} />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          <GuideQuadrant label="관계가 좋아지는 조건" tone="good" items={data.whatHelps} ev={ev} />
          <GuideQuadrant label="관계를 해치는 패턴" tone="caution" items={data.whatHurts} ev={ev} />
        </div>
      </div>
      <EvidenceToggle ids={data.evidenceIds} ev={ev} />
    </div>
  );
}

// ============================================================
// 강등된 상세 해설 accordion — SajuV4Report에서 호출
// ============================================================
export function PaidDetailedNarrativeAccordion({
  narrative, fallback,
}: { narrative?: PaidDetailedNarrative; fallback?: React.ReactNode }) {
  const sections = narrative?.sections?.filter(s => s.body?.trim()) ?? [];
  const hasSections = sections.length > 0;
  if (!hasSections && !fallback) return null;
  return (
    <details className="card" style={{ marginTop: 18, padding: 16 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--orot-ink-soft)' }}>
        📖 상세 해설 더 보기
      </summary>
      <div style={{ marginTop: 14 }}>
        {hasSections ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {sections.map((s) => (
              <section key={s.id}>
                <h3 style={{
                  fontSize: 18, fontWeight: 800, color: 'var(--orot-coral)',
                  margin: '0 0 12px', letterSpacing: '-0.01em', lineHeight: 1.35,
                  fontFamily: 'var(--orot-font)', wordBreak: 'keep-all',
                }}>{s.title}</h3>
                <NarrativeBody text={s.body} />
              </section>
            ))}
          </div>
        ) : (
          fallback
        )}
      </div>
    </details>
  );
}

// 줄글 렌더 — 단락/하위헤더/리스트만 처리 (SajuV4Report.NarrativeBody와 동일 톤).
function NarrativeBody({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactElement[] = [];
  let para: string[] = [];
  const flush = (k: string) => {
    if (para.length === 0) return;
    out.push(
      <p key={k} style={{ margin: '10px 0', fontSize: 14.5, lineHeight: 1.85, color: 'var(--orot-ink)' }}>
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
        fontSize: 14.5, lineHeight: 1.85, marginLeft: 12, color: 'var(--orot-ink)',
      }}>· {trimmed.replace(/^[-*]\s+/, '')}</div>);
      return;
    }
    para.push(trimmed);
  });
  flush('p-final');
  return <>{out}</>;
}
