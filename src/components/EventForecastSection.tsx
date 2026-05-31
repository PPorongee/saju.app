// Life Event Forecast V1 — 공용 렌더 (줄글/타임라인형, 큰 사건 예보).
// report.eventForecast가 있을 때만 렌더. 없으면 null. flag OFF면 데이터 없음 → 기존 화면 동일.
// 카드 그리드/카테고리 badge/"기회·점검·해보기" 포맷 제거 — 문단형 + 세로 타임라인.

import type { EventForecast, MajorEvent } from '@/domain/saju/eventForecast/eventForecastTypes';

const ACCENT = 'var(--orot-accent, #c7b3ff)';

function TimelineItem({ ev, last }: { ev: MajorEvent; last: boolean }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 22, paddingBottom: last ? 0 : 20 }}>
      {/* 세로 라인 */}
      {!last && <span style={{ position: 'absolute', left: 5, top: 16, bottom: 0, width: 2, background: 'rgba(199,179,255,0.25)' }} />}
      {/* 점 */}
      <span style={{ position: 'absolute', left: 0, top: 5, width: 12, height: 12, borderRadius: 999, background: ACCENT, boxShadow: '0 0 0 3px rgba(199,179,255,0.15)' }} />
      {ev.timeWindow && <div style={{ fontSize: 12.5, fontWeight: 700, color: ACCENT, marginBottom: 2 }}>{ev.timeWindow}</div>}
      {ev.title && <div style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{ev.title}</div>}
      {ev.forecast && <p style={{ margin: '0 0 7px', lineHeight: 1.8, fontSize: 15, color: 'var(--text)' }}>{ev.forecast}</p>}
      {ev.scene && <p style={{ margin: '0 0 7px', lineHeight: 1.75, fontSize: 14, color: 'var(--text)', opacity: 0.92 }}>{ev.scene}</p>}
      {ev.decisionAdvice && (
        <p style={{ margin: '0 0 4px', lineHeight: 1.7, fontSize: 14, color: 'var(--text)' }}>
          <b style={{ color: ACCENT }}>여기서 갈리는 지점</b> · {ev.decisionAdvice}
        </p>
      )}
      {ev.signalBasis && (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--orot-ink-mute, #9aa)' }}>근거 · {ev.signalBasis}</p>
      )}
    </div>
  );
}

export function EventForecastSection({ forecast }: { forecast?: EventForecast | null }) {
  if (!forecast) return null;
  const { title, lead, eventNarrative, majorEvents, closing, disclaimer } = forecast;
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>✦ 운에서 먼저 움직이는 사건들</div>
      <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: 'var(--text)' }}>{title}</h3>
      {lead && <p style={{ margin: '0 0 10px', lineHeight: 1.8, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{lead}</p>}

      {Array.isArray(eventNarrative) && eventNarrative.filter(Boolean).map((p, i) => (
        <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.85, fontSize: 15, color: 'var(--text)' }}>{p}</p>
      ))}

      {Array.isArray(majorEvents) && majorEvents.length > 0 && (
        <div style={{ marginTop: 14, padding: '16px 16px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {majorEvents.map((ev, i) => (
            <TimelineItem key={i} ev={ev} last={i === majorEvents.length - 1} />
          ))}
        </div>
      )}

      {closing && <p style={{ margin: '12px 0 0', lineHeight: 1.85, fontSize: 15, color: 'var(--text)' }}>{closing}</p>}
      {disclaimer && <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--orot-ink-mute, #9aa)' }}>{disclaimer}</p>}
    </section>
  );
}
