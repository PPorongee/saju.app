'use client';

import React from 'react';

interface Props {
  tone?: 'cream' | 'dark';
  size?: number;
  onClick?: () => void;
  ariaLabel?: string;
}

export default function NextCircle({
  tone = 'cream',
  size = 36,
  onClick,
  ariaLabel,
}: Props) {
  const color = tone === 'dark' ? '#2a1830' : 'var(--orot-ink-soft)';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? '다음'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1px solid ${color}`,
        background: 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        fontSize: 16,
        lineHeight: 1,
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
      }}
    >
      ›
    </button>
  );
}
