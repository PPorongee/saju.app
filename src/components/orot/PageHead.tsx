'use client';

import React from 'react';
import BackBtn from './BackBtn';

interface Props {
  title?: string;
  sub?: string;
  onBack?: () => void;
  /** false 면 BackBtn 자리는 빈 공간(레이아웃 유지) */
  showBack?: boolean;
  right?: React.ReactNode;
}

export default function PageHead({
  title,
  sub,
  onBack,
  showBack = true,
  right,
}: Props) {
  return (
    <div style={{
      padding: '8px 20px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    }}>
      {showBack ? <BackBtn onClick={onBack} /> : <span style={{ width: 36, height: 36 }} />}
      <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontSize: 15, color: 'var(--orot-ink)', fontWeight: 600 }}>{title}</div>
        )}
        {sub && (
          <div style={{ fontSize: 10, color: 'var(--orot-ink-mute)', marginTop: 2 }}>{sub}</div>
        )}
      </div>
      <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {right ?? <span style={{ width: 36 }} />}
      </div>
    </div>
  );
}
