'use client';

import React from 'react';

export type TabKey = 'home' | 'history' | 'profile';

interface Item {
  key: TabKey;
  glyph: string;
  label: string;
  onClick?: () => void;
}

interface Props {
  active: TabKey;
  items?: Item[];
}

const DEFAULT_ITEMS: Item[] = [
  { key: 'home', glyph: '✦', label: '홈' },
  { key: 'history', glyph: '記', label: '기록' },
  { key: 'profile', glyph: '○', label: '내 정보' },
];

export default function TabBar({ active, items = DEFAULT_ITEMS }: Props) {
  return (
    <div className="orot-tabbar" role="tablist">
      {items.map((it) => (
        <button
          key={it.key}
          aria-current={active === it.key ? 'true' : undefined}
          onClick={it.onClick}
          type="button"
        >
          <span style={{ fontSize: 14 }}>{it.glyph}</span>
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
