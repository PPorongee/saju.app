// Fortune Questions Verdict V1 — 공용 렌더 (인생 큰 질문 판정서).
// report.fortuneVerdict가 있을 때만 렌더. 없으면 null. flag OFF면 데이터 없음 → 기존 화면 동일.

import type { FortuneVerdict, Verdict, VerdictStrength } from '@/domain/saju/fortuneVerdict/fortuneVerdictTypes';

const ACCENT = 'var(--orot-accent, #c7b3ff)';
const ST_LABEL: Record<VerdictStrength, string> = { strong: '강함', moderate: '보통', weak: '약함', not_prominent: '두드러지지 않음' };
const ST_COLOR: Record<VerdictStrength, string> = { strong: '#c7b3ff', moderate: '#86c5e0', weak: '#9aa', not_prominent: '#9aa' };

const CARD: React.CSSProperties = { marginTop: 12, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

function VerdictBlock({ v }: { v: Verdict }) {
  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: ST_COLOR[v.strength] }}>판정: {ST_LABEL[v.strength]}</span>
        {v.timing && <span style={{ fontSize: 12.5, fontWeight: 700, color: ACCENT }}>{v.timing}</span>}
      </div>
      {v.question && <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--orot-ink-mute, #9aa)', marginBottom: 4 }}>Q. {v.question}</div>}
      {v.verdict && <p style={{ margin: '0 0 7px', lineHeight: 1.8, fontSize: 15.5, fontWeight: 600, color: 'var(--text)' }}>{v.verdict}</p>}
      {v.whatItLooksLike && <p style={{ margin: '0 0 6px', lineHeight: 1.75, fontSize: 14, color: 'var(--text)', opacity: 0.92 }}>{v.whatItLooksLike}</p>}
      {v.basis && <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--orot-ink-mute, #9aa)' }}>근거 · {v.basis}</p>}
      {v.caution && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#e7b37a' }}>{v.caution}</p>}
    </div>
  );
}

export function FortuneVerdictSection({ verdict }: { verdict?: FortuneVerdict | null }) {
  if (!verdict) return null;
  const { title, lead, verdicts, breakthroughTiming, closing, disclaimer } = verdict;
  const bt = breakthroughTiming;
  const hasBT = bt && (bt.summary || bt.accumulationPhase || bt.expansionPhase || bt.cautionPhase);
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>✦ 사주로 보는 큰 결정운</div>
      <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: 'var(--text)' }}>{title}</h3>
      {lead && <p style={{ margin: '0 0 10px', lineHeight: 1.8, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{lead}</p>}

      {Array.isArray(verdicts) && verdicts.map((v, i) => <VerdictBlock key={i} v={v} />)}

      {hasBT && (
        <div style={{ ...CARD, background: 'rgba(199,179,255,0.06)', border: '1px solid rgba(199,179,255,0.16)' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>운이 터지는 시기</div>
          {bt.summary && <p style={{ margin: '0 0 6px', lineHeight: 1.75, fontSize: 14.5, color: 'var(--text)' }}>{bt.summary}</p>}
          {bt.accumulationPhase && <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text)' }}><b style={{ color: ACCENT }}>축적기</b> · {bt.accumulationPhase}</p>}
          {bt.expansionPhase && <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text)' }}><b style={{ color: '#7fd4a8' }}>확장기</b> · {bt.expansionPhase}</p>}
          {bt.cautionPhase && <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text)' }}><b style={{ color: '#e7b37a' }}>주의기</b> · {bt.cautionPhase}</p>}
        </div>
      )}

      {closing && <p style={{ margin: '12px 0 0', lineHeight: 1.85, fontSize: 15, color: 'var(--text)' }}>{closing}</p>}
      {disclaimer && <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--orot-ink-mute, #9aa)' }}>{disclaimer}</p>}
    </section>
  );
}
