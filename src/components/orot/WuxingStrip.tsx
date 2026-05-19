'use client';

import React from 'react';
import type { OrotElement } from './Sajupan';

const EL_VAR: Record<OrotElement, string> = {
  wood: 'var(--orot-el-wood)',
  fire: 'var(--orot-el-fire)',
  earth: 'var(--orot-el-earth)',
  metal: 'var(--orot-el-metal)',
  water: 'var(--orot-el-water)',
};

const EL_EMOJI: Record<OrotElement, string> = {
  wood: '🌿',
  fire: '🔥',
  earth: '🪨',
  metal: '⚙️',
  water: '💧',
};

interface Props {
  /** 각 오행의 백분율 (합이 100이 안 돼도 자동 정규화) */
  distribution: Record<OrotElement, number>;
  labels?: Record<OrotElement, string>;
}

export default function WuxingStrip({
  distribution,
  labels = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' },
}: Props) {
  const order: OrotElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  const total = order.reduce((a, k) => a + (distribution[k] || 0), 0) || 100;

  return (
    <div>
      <div style={{
        display: 'flex',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid var(--orot-hair)',
      }}>
        {order.map((k) => (
          <div
            key={k}
            style={{
              width: `${(distribution[k] / total) * 100}%`,
              background: EL_VAR[k],
              opacity: 0.85,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        {order.map((k) => (
          <div key={k} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{EL_EMOJI[k]}</div>
            <div style={{ fontSize: 13, color: EL_VAR[k], fontWeight: 600 }}>{labels[k]}</div>
            <div style={{ fontSize: 10, color: 'var(--orot-ink-mute)', marginTop: 2 }}>
              {Math.round((distribution[k] / total) * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
