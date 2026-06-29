'use client';
import React from 'react';

/**
 * 한눈 카드 공통 래퍼 — 카드별 정체성(아이콘 + 포인트 컬러 + 좌측 보더 + 은은한 틴트).
 * 단조로운 동일 박스 문제 해결용. 개인사주/올해운세 결과의 결정론 요약 카드들이 공유.
 */
export function GlanceCard({
  icon, accent, title, children, style,
}: {
  icon: string;
  accent: string;       // 포인트 컬러 (eyebrow/보더)
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      className="card sv4-reveal"
      style={{
        marginTop: 14,
        padding: '15px 16px 16px 17px',
        borderLeft: `3px solid ${accent}`,
        // 포인트 컬러를 아주 옅게 깔아 카드마다 다른 분위기
        background: `linear-gradient(180deg, ${accent}14 0%, rgba(255,255,255,0.015) 38%, rgba(255,255,255,0.015) 100%)`,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: accent, letterSpacing: '0.04em', fontFamily: 'var(--orot-font)' }}>
          {title}
        </span>
      </div>
      {children}
    </section>
  );
}
