'use client';

import React from 'react';

interface Props {
  onClick?: () => void;
  ariaLabel?: string;
}

export default function BackBtn({ onClick, ariaLabel = '뒤로' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 36,
        height: 36,
        border: 0,
        background: 'transparent',
        color: 'var(--orot-ink)',
        cursor: 'pointer',
        fontSize: 22,
        lineHeight: 1,
        padding: 0,
      }}
    >
      ‹
    </button>
  );
}
