// Fortune Questions Verdict V1 — 공용 렌더 (줄글형 "운명 판정 서사").
// report.fortuneVerdict가 있을 때만 렌더. 없으면 null. flag OFF면 데이터 없음 → 기존 화면 동일.
// Q&A 판정표/강도 배지 없음 — 제목 + 도입 + 줄글 섹션 + 운 트이는 시기 + 마무리.

import type { FortuneVerdict, FortuneNarrativeSection } from '@/domain/saju/fortuneVerdict/fortuneVerdictTypes';

const ACCENT = 'var(--orot-accent, #c7b3ff)';

function Section({ sec }: { sec: FortuneNarrativeSection }) {
  const paras = (sec.body ?? []).filter(Boolean);
  if (!paras.length) return null;
  return (
    <div style={{ marginTop: 16 }}>
      {sec.title && (
        <h4 style={{ fontSize: 16.5, fontWeight: 800, margin: '0 0 8px', color: 'var(--text)' }}>{sec.title}</h4>
      )}
      {paras.map((p, i) => (
        <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.95, fontSize: 15.5, color: 'var(--text)' }}>{p}</p>
      ))}
    </div>
  );
}

export function FortuneVerdictSection({ verdict }: { verdict?: FortuneVerdict | null }) {
  if (!verdict) return null;
  const { mode, title, lead, sections, timingSummary, closing, disclaimer } = verdict;
  // 개인사주: 시간표는 "운이 커지는 시기와 대운" 섹션이 담당하므로 별도 "운이 트이는 시기" 블록은 숨김(중복 제거).
  // closing은 "이 사주의 큰 결론"(종합 결론) 헤딩으로 렌더.
  const isPersonal = mode === 'personal';
  const showTiming = !!timingSummary && !isPersonal;
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>✦ 사주가 말하는 큰 운</div>
      <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: 'var(--text)' }}>{title}</h3>
      {lead && <p style={{ margin: '0 0 4px', lineHeight: 1.85, fontSize: 16.5, fontWeight: 600, color: 'var(--text)' }}>{lead}</p>}

      {Array.isArray(sections) && sections.map((sec, i) => <Section key={i} sec={sec} />)}

      {showTiming && (
        <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 16, background: 'rgba(199,179,255,0.06)', border: '1px solid rgba(199,179,255,0.16)' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>운이 트이는 시기</div>
          <p style={{ margin: 0, lineHeight: 1.9, fontSize: 15, color: 'var(--text)' }}>{timingSummary}</p>
        </div>
      )}

      {closing && (
        <div style={{ marginTop: 16 }}>
          {isPersonal && <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>이 사주의 큰 결론</div>}
          <p style={{ margin: 0, lineHeight: 1.95, fontSize: 15.5, fontWeight: 600, color: 'var(--text)' }}>{closing}</p>
        </div>
      )}
      {disclaimer && <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--orot-ink-mute, #9aa)' }}>{disclaimer}</p>}
    </section>
  );
}
