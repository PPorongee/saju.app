'use client';

import React from 'react';

export type OrotElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export interface SajupanPillar {
  stem: string;        // 천간 한자 (예: '戊')
  stemEl: OrotElement;
  branch: string;      // 지지 한자 (예: '辰')
  branchEl: OrotElement;
}

export interface SajupanChart {
  year: SajupanPillar;
  month: SajupanPillar;
  day: SajupanPillar;
  hour: SajupanPillar;
}

const EL_VAR: Record<OrotElement, string> = {
  wood: 'var(--orot-el-wood)',
  fire: 'var(--orot-el-fire)',
  earth: 'var(--orot-el-earth)',
  metal: 'var(--orot-el-metal)',
  water: 'var(--orot-el-water)',
};

interface Props {
  chart: SajupanChart;
  compact?: boolean;
  labels?: { year: string; month: string; day: string; hour: string };
}

/**
 * 4 columns × 2 rows: 시주(hour) → 일주(day) → 월주(month) → 연주(year),  right-to-left.
 * 천간 위 / 지지 아래, 각 한자가 오행 컬러로 칠해진 라운드 셀.
 */
export default function Sajupan({
  chart,
  compact = false,
  labels = { year: '연주', month: '월주', day: '일주', hour: '시주' },
}: Props) {
  const order: Array<keyof SajupanChart> = ['hour', 'day', 'month', 'year'];
  const cell = compact ? 56 : 70;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: compact ? 8 : 10 }}>
      {order.map((c) => {
        const p = chart[c];
        return (
          <div key={c} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 11,
              color: 'var(--orot-ink-mute)',
              marginBottom: 8,
              letterSpacing: '0.04em',
              fontWeight: 500,
            }}>
              {labels[c]}
            </div>
            <PCell ch={p.stem} el={p.stemEl} h={cell} />
            <div style={{ height: 6 }} />
            <PCell ch={p.branch} el={p.branchEl} h={cell} />
          </div>
        );
      })}
    </div>
  );
}

function PCell({ ch, el, h }: { ch: string; el: OrotElement; h: number }) {
  const color = EL_VAR[el];
  return (
    <div style={{
      height: h,
      borderRadius: 10,
      background: 'rgba(243, 231, 207, 0.04)',
      border: `1px solid color-mix(in oklab, ${color} 40%, var(--orot-hair))`,
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 500,
      fontSize: 26,
    }}>
      {ch}
    </div>
  );
}
