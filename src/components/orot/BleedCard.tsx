'use client';

import React from 'react';
import { getFraming } from './framing';

type Veil = 'left' | 'bottom' | 'soft' | 'pink' | 'none';
type Tone = 'navy' | 'purple' | 'pink';

interface BleedCardProps {
  /** 이미지 src (없으면 그냥 그라데이션 카드) */
  image?: string;
  /** 이미지 alt */
  imageAlt?: string;
  /** framing.json 키 (옵션). 있으면 offset/scale 적용. */
  framingId?: string;
  /** 배경 일러스트 불투명도(0~1). 미지정 시 CSS 기본(0.55) 사용. 낮출수록 배경에 은은하게 녹음. */
  imageOpacity?: number;
  veil?: Veil;
  tone?: Tone;
  /** 콘텐츠(자식) 세로 정렬. 기본 'top'(기존 동작). 'bottom'이면 카드 하단에 붙임. */
  contentAlign?: 'top' | 'bottom' | 'center';
  /** 우하단 › 버튼 표시 여부 */
  next?: boolean;
  minHeight?: number | string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  children?: React.ReactNode;
  /** 카드 자체에 role / aria 등 추가용 */
  role?: string;
  ariaLabel?: string;
}

export default function BleedCard({
  image,
  imageAlt = '',
  framingId,
  imageOpacity,
  veil = 'left',
  tone = 'navy',
  contentAlign = 'top',
  next = false,
  minHeight = 220,
  className,
  style,
  onClick,
  children,
  role,
  ariaLabel,
}: BleedCardProps) {
  const toneClass =
    tone === 'pink' ? 'orot-card orot-card--pink'
    : tone === 'purple' ? 'orot-card orot-card--purple'
    : 'orot-card';

  const frame = framingId ? getFraming(framingId) : null;
  const imgStyle: React.CSSProperties = {
    ...(frame
      ? {
          objectPosition: `calc(50% + ${frame.offsetX}px) calc(50% + ${frame.offsetY}px)`,
          transform: frame.scale !== 1 ? `scale(${frame.scale})` : undefined,
          transformOrigin: 'center',
        }
      : {}),
    ...(imageOpacity != null ? { opacity: imageOpacity } : {}),
  };

  return (
    <div
      className={[toneClass, className].filter(Boolean).join(' ')}
      style={{
        minHeight, padding: 0,
        ...(contentAlign !== 'top'
          ? { display: 'flex', flexDirection: 'column', justifyContent: contentAlign === 'bottom' ? 'flex-end' : 'center' }
          : {}),
        ...style,
      }}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
    >
      {image && (
        <div className="orot-bleed" aria-hidden="true">
          <img src={image} alt={imageAlt} style={imgStyle} draggable={false} />
        </div>
      )}
      {veil !== 'none' && <div className={`orot-veil orot-veil--${veil}`} aria-hidden="true" />}
      <div style={{ position: 'relative', zIndex: 2, padding: 24 }}>{children}</div>
      {next && (
        <button
          className="orot-next"
          tabIndex={onClick ? 0 : -1}
          aria-hidden={!onClick}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}
