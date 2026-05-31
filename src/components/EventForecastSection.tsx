// Event Forecast V1 — 공용 렌더 (운의 사건 예보, 카드형).
// report.eventForecast가 있을 때만 렌더. 없으면 null. flag OFF면 데이터 없음 → 기존 화면 동일.

import type { EventForecast, EventCard, EventType, EventLikelihood } from '@/domain/saju/eventForecast/eventForecastTypes';

const TYPE_KO: Record<EventType, string> = {
  relationship: '관계·인연', career: '커리어', money: '돈·계약', business: '사업',
  study: '공부·문서', family: '가족', move: '이동', health_rhythm: '컨디션',
  collaboration: '협업', decision: '결정',
};
const LK_KO: Record<EventLikelihood, string> = { strong: '신호 강함', moderate: '신호 보통', subtle: '신호 약함' };
const LK_COLOR: Record<EventLikelihood, string> = { strong: '#c7b3ff', moderate: '#86c5e0', subtle: '#9aa' };

const CARD: React.CSSProperties = {
  marginTop: 12, padding: '14px 16px', borderRadius: 16,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
};
const LABEL: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--orot-ink-mute, #9aa)' };

function Chips({ label, items }: { label: string; items?: string[] }) {
  const list = (items ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={LABEL}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {list.map((it, i) => (
          <span key={i} style={{ fontSize: 12.5, padding: '3px 9px', borderRadius: 999, background: 'rgba(199,179,255,0.10)', border: '1px solid rgba(199,179,255,0.16)', color: 'var(--text)' }}>{it}</span>
        ))}
      </div>
    </div>
  );
}

function Bullets({ label, items, color }: { label: string; items?: string[]; color?: string }) {
  const list = (items ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text)' }}>
      <b style={{ color: color ?? 'var(--text)' }}>{label}</b> · {list.join(' · ')}
    </p>
  );
}

function ForecastCard({ c }: { c: EventCard }) {
  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--orot-ink-mute, #9aa)' }}>{TYPE_KO[c.type] ?? '흐름'}</span>
        {c.timeWindow && <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--orot-accent, #c7b3ff)' }}>{c.timeWindow}</span>}
        <span style={{ fontSize: 11.5, color: LK_COLOR[c.likelihood] }}>● {LK_KO[c.likelihood]}</span>
      </div>
      {c.title && <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{c.title}</div>}
      {c.eventScene && <p style={{ margin: '0 0 6px', lineHeight: 1.75, fontSize: 14.5, color: 'var(--text)' }}>{c.eventScene}</p>}
      {c.personOrSituation && <p style={{ margin: '0 0 6px', fontSize: 13.5, color: 'var(--text)' }}><b style={{ color: 'var(--orot-accent, #c7b3ff)' }}>결</b> · {c.personOrSituation}</p>}
      {c.whyThisAppears && <p style={{ margin: '0 0 6px', fontSize: 12.5, color: 'var(--orot-ink-mute, #9aa)' }}>왜 · {c.whyThisAppears}</p>}
      <Bullets label="좋게 풀리는 조건" items={c.goodIf} color="var(--orot-accent, #c7b3ff)" />
      <Bullets label="조심할 조건" items={c.carefulIf} color="#e7b37a" />
      {c.howToUse && <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}><b style={{ color: 'var(--orot-accent, #c7b3ff)' }}>활용</b> · {c.howToUse}</p>}
    </div>
  );
}

export function EventForecastSection({ forecast }: { forecast?: EventForecast | null }) {
  if (!forecast) return null;
  const { headline, summary, eventCards, timingMap, watchSigns, avoidPatterns, disclaimer } = forecast;
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orot-accent, #c7b3ff)', marginBottom: 4 }}>✦ 운의 사건 예보</div>
      <h3 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px', color: 'var(--text)' }}>{headline}</h3>
      {summary && <p style={{ margin: '0 0 4px', lineHeight: 1.8, fontSize: 15, color: 'var(--text)' }}>{summary}</p>}

      {timingMap && (
        <div style={{ ...CARD, background: 'rgba(199,179,255,0.06)', border: '1px solid rgba(199,179,255,0.14)' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>타이밍 맵</div>
          <Chips label="밀어도 되는 구간" items={timingMap.pushWindows} />
          <Chips label="조심할 구간" items={timingMap.cautionWindows} />
          <Chips label="준비하는 구간" items={timingMap.preparationWindows} />
          <Chips label="관계·인연" items={timingMap.relationshipWindows} />
          <Chips label="돈·계약" items={timingMap.moneyWindows} />
          <Chips label="커리어" items={timingMap.careerWindows} />
        </div>
      )}

      {Array.isArray(eventCards) && eventCards.map((c, i) => <ForecastCard key={i} c={c} />)}

      {((watchSigns?.length ?? 0) > 0 || (avoidPatterns?.length ?? 0) > 0) && (
        <div style={{ ...CARD, marginTop: 12 }}>
          <Bullets label="살펴볼 신호" items={watchSigns} />
          <Bullets label="피하면 좋은 패턴" items={avoidPatterns} color="#e7b37a" />
        </div>
      )}

      {disclaimer && <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--orot-ink-mute, #9aa)' }}>{disclaimer}</p>}
    </section>
  );
}
