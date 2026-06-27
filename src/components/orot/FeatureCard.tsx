'use client';

import React from 'react';
import BleedCard from './BleedCard';

interface FeatureCardProps {
  image?: string;
  framingId?: string;
  /** 배경 일러스트 불투명도(0~1). 미지정 시 CSS 기본. */
  imageOpacity?: number;
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
  imageOpacity,
  emoji,
  title,
  sub,
  onClick,
  minHeight = 212,
  ariaLabel,
}: FeatureCardProps) {
  return (
    <BleedCard
      image={image}
      framingId={framingId}
      imageOpacity={imageOpacity}
      veil="bottom"
      contentAlign="bottom"
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
          fontSize: 15.5,
          fontWeight: 700,
          color: 'var(--orot-coral)',
          letterSpacing: '-0.012em',
          lineHeight: 1.3,
          textShadow: '0 1px 4px rgba(16,20,44,0.9)',
        }}>
          {title}
        </h3>
        {sub && (
          <p style={{
            margin: '6px 0 0',
            fontSize: 11.5,
            // 레퍼런스 톤: 부제는 연한 파란색(periwinkle)
            color: '#9bb6e8',
            lineHeight: 1.5,
            maxWidth: '95%',
            textShadow: '0 1px 4px rgba(16,20,44,0.9)',
          }}>
            {sub}
          </p>
        )}
      </div>
    </BleedCard>
  );
}
