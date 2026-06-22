// Paid Report Productization V1 — 줄글(prose) 렌더러.
//
// 설계 전환: 카드-first(PaidReportView)에서 줄글-first로. 메인 narrative(7섹션)가 FULL/FIRST로
// 렌더된 뒤, 이 컴포넌트가 결정론 모듈을 "연결된 문단"으로 푼 prose 섹션들(사람·돈·타이밍·행운)을
// 같은 줄글 톤으로 이어 붙인다. 전체 페이지가 하나의 연속된 줄글 문서처럼 읽히게 한다.
//
// 타이포/간격은 SajuV4Report의 NarrativeSection을 그대로 미러링(orot-eyebrow + var(--orot-coral) h2
// + var(--orot-ink) 본문, line-height 1.85). 카드/불릿이 아닌 흐르는 문단으로 렌더한다.
// body 안의 ' — ' 리스트도 불릿으로 바꾸지 않고 자연스러운 줄글로 둔다.
//
// 각 섹션에 선택적 "근거 보기" <details> — evidenceIds → evidenceMap[id].label 칩(중복 제거).
// 근거가 없으면 toggle 자체를 렌더하지 않는다. 줄글이지 데이터 카드가 아니므로 절제된 톤 유지.

'use client';

import React from 'react';
import type {
  PaidProseSection,
  PaidEvidenceMap,
} from '@/domain/saju/paidReport/paidReportTypes';

export interface PaidReportProseProps {
  sections: PaidProseSection[];
  evidenceMap: PaidEvidenceMap;
}

export function PaidReportProse({ sections, evidenceMap }: PaidReportProseProps) {
  const usable = (sections ?? []).filter((s) => s.body && s.body.trim());
  if (usable.length === 0) return null;
  return (
    <div style={{ marginTop: 18 }}>
      {usable.map((s) => (
        <ProseSection key={s.id} section={s} evidenceMap={evidenceMap} />
      ))}
    </div>
  );
}

// 섹션 하나 — NarrativeSection과 동일 타이포: eyebrow + coral h2 + 줄글 본문.
function ProseSection({
  section,
  evidenceMap,
}: {
  section: PaidProseSection;
  evidenceMap: PaidEvidenceMap;
}) {
  if (!section.body || !section.body.trim()) return null;
  return (
    <section style={{ marginTop: 24 }}>
      <div className="orot-eyebrow" style={{ marginBottom: 8 }}>✦ 실전</div>
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
        {section.title}
      </h2>
      <ProseBody text={section.body} />
    </section>
  );
}

// 본문 — 줄글 위주. 단락은 빈 줄로 나누고, 한 단락 안의 ' — '/', '는 불릿으로 바꾸지 않고
// 흐르는 문장으로 둔다 (NarrativeBody와 같은 line-height/색/사이즈).
function ProseBody({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  // 빈 줄 구분이 전혀 없으면 단일 줄바꿈도 단락 경계로 fallback (한 덩어리 회피).
  const blocks =
    paragraphs.length > 1
      ? paragraphs
      : text
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean);
  return (
    <>
      {blocks.map((p, i) => (
        <p
          key={i}
          style={{
            margin: '10px 0',
            fontSize: 15,
            lineHeight: 1.85,
            color: 'var(--orot-ink)',
            wordBreak: 'keep-all',
          }}
        >
          {p}
        </p>
      ))}
    </>
  );
}

// 절제된 "근거 보기" — 칩으로 evidenceMap label 표시(중복 제거). 없으면 미렌더.
function ProseEvidence({
  ids,
  evidenceMap,
}: {
  ids: string[];
  evidenceMap: PaidEvidenceMap;
}) {
  const labels = Array.from(
    new Set(
      (ids ?? [])
        .map((id) => evidenceMap?.[id]?.label)
        .filter((l): l is string => !!l && !!l.trim()),
    ),
  );
  if (labels.length === 0) return null;
  return (
    <details style={{ marginTop: 12 }}>
      <summary
        style={{
          cursor: 'pointer',
          fontSize: 11.5,
          fontWeight: 700,
          color: 'var(--orot-ink-mute)',
          listStyle: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        근거 보기 ({labels.length})
      </summary>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {labels.map((label, i) => (
          <span
            key={i}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--orot-ink-soft)',
              padding: '3px 9px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--orot-hair)',
              wordBreak: 'keep-all',
            }}
          >
            ✦ {label}
          </span>
        ))}
      </div>
    </details>
  );
}
