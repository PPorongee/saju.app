'use client';

import React from 'react';
import BleedCard from './BleedCard';

interface FeatureCardProps {
  image?: string;
  framingId?: string;
  emoji?: string;
  title: string;
  sub?: string;
  onClick?: () => void;
  minHeight?: number;
  ariaLabel?: string;
}

/**
 * 홈 2×2 그리드의 미니 카드. 우하단 › 글리프 + 풀블리드 배경.
 */
export default function FeatureCard({
  image,
  framingId,
  emoji,
  title,
  sub,
  onClick,
  minHeight = 178,
  ariaLabel,
}: FeatureCardProps) {
  return (
    <BleedCard
      image={image}
      framingId={framingId}
      veil="bottom"
      minHeight={minHeight}
      next={!!onClick}
      onClick={onClick}
      role="button"
      ariaLabel={ariaLabel ?? title}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', minHeight: minHeight - 48 }}>
        {emoji && <div style={{ fontSize: 22, marginBottom: 8 }}>{emoji}</div>}
        <h3 style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--orot-coral)',
          letterSpacing: '-0.012em',
          lineHeight: 1.3,
        }}>
          {title}
        </h3>
        {sub && (
          <p style={{
            margin: '6px 0 0',
            fontSize: 11.5,
            color: 'var(--orot-ink-soft)',
            lineHeight: 1.55,
            maxWidth: '90%',
          }}>
            {sub}
          </p>
        )}
      </div>
    </BleedCard>
  );
}
