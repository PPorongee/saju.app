// All-mode Action Guide V1 — 공용 렌더 컴포넌트.
//
// report.actionGuideV1 (ActionGuide)가 있을 때만 렌더. 없으면 null → 아무것도 그리지 않음.
// flag OFF면 데이터 자체가 없으므로 기존 화면과 동일.
// API/도메인 데이터 구조 변경 없음 — 렌더 전용.

import type { ActionGuide } from '@/domain/saju/actionGuide/actionGuideTypes';

const CARD: React.CSSProperties = {
  marginTop: 12,
  padding: '14px 16px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
};

const LABEL: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--orot-ink-mute, #9aa)',
  letterSpacing: '0.02em',
};

function Bullets({ items }: { items?: string[] }) {
  const list = (items ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.75, fontSize: 14, color: 'var(--text)' }}>
      {list.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function MiniList({ label, items }: { label: string; items?: string[] }) {
  const list = (items ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={LABEL}>{label}</div>
      <Bullets items={list} />
    </div>
  );
}

export function ActionGuideSection({ guide }: { guide?: ActionGuide | null }) {
  if (!guide) return null;
  const { title, overview, domainFlows, decisionGuide, remedyRoutines, partnerNotes, immediateActions, disclaimer } = guide;
  // 임산부는 성취/점검 톤 대신 차분한 톤으로 라벨링.
  const isPreg = guide.mode === 'pregnancy';
  const oppLabel = isPreg ? '도움' : '기회';
  const cauLabel = isPreg ? '살펴두기' : '점검';

  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orot-accent, #c7b3ff)', marginBottom: 4 }}>
        ✦ 실천 가이드
      </div>
      <h3 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 6px', color: 'var(--text)' }}>
        {title}
      </h3>
      {overview && (
        <p style={{ margin: '0 0 4px', lineHeight: 1.8, fontSize: 15, color: 'var(--text)' }}>{overview}</p>
      )}

      {/* 영역별 흐름 */}
      {Array.isArray(domainFlows) && domainFlows.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {domainFlows.map((d, i) => (
            <div key={i} style={CARD}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{d.domain}</div>
              {d.flow && <p style={{ margin: '0 0 6px', lineHeight: 1.7, fontSize: 14, color: 'var(--text)' }}>{d.flow}</p>}
              {d.opportunity && <p style={{ margin: '0 0 4px', fontSize: 13.5, color: 'var(--text)' }}><b style={{ color: 'var(--orot-accent, #c7b3ff)' }}>{oppLabel}</b> · {d.opportunity}</p>}
              {d.caution && <p style={{ margin: '0 0 4px', fontSize: 13.5, color: 'var(--text)' }}><b style={{ color: '#e7b37a' }}>{cauLabel}</b> · {d.caution}</p>}
              {d.suggestedAction && <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}><b style={{ color: 'var(--orot-accent, #c7b3ff)' }}>해보기</b> · {d.suggestedAction}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 중요한 결정 가이드 */}
      {decisionGuide && (
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>중요한 결정 가이드</div>
          <MiniList label="추진하기 좋은 흐름" items={decisionGuide.goodFor} />
          <MiniList label="점검이 필요한 흐름" items={decisionGuide.beCarefulWith} />
          <MiniList label="작게 시작하거나 미루면 좋은 흐름" items={decisionGuide.postponeOrScaleDown} />
          <MiniList label="결정 전 체크리스트" items={decisionGuide.checklist} />
        </div>
      )}

      {/* 궁합 전용 — A/B 개인 조언 + 함께 */}
      {partnerNotes && (partnerNotes.aAdvice || partnerNotes.bAdvice || (partnerNotes.together?.length ?? 0) > 0) && (
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>두 사람을 위한 조언</div>
          {partnerNotes.aAdvice && (
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}><b>A</b> · {partnerNotes.aAdvice}</p>
          )}
          {partnerNotes.bAdvice && (
            <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}><b>B</b> · {partnerNotes.bAdvice}</p>
          )}
          <MiniList label="함께 해볼 것" items={partnerNotes.together} />
        </div>
      )}

      {/* 개운 루틴 */}
      {remedyRoutines && (
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>개운 루틴</div>
          <MiniList label="매일" items={remedyRoutines.daily} />
          <MiniList label="주간" items={remedyRoutines.weekly} />
          <MiniList label="월간" items={remedyRoutines.monthly} />
          <MiniList label="환경·공간·관계" items={remedyRoutines.environment} />
          <MiniList label="피해야 할 패턴" items={remedyRoutines.avoidPatterns} />
        </div>
      )}

      {/* 지금 당장 할 일 — 강조 */}
      {Array.isArray(immediateActions) && immediateActions.length > 0 && (
        <div style={{ ...CARD, background: 'rgba(199,179,255,0.08)', border: '1px solid rgba(199,179,255,0.18)' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>지금 당장 할 일</div>
          <ol style={{ margin: '4px 0 0', paddingLeft: 20, lineHeight: 1.8, fontSize: 14.5, color: 'var(--text)' }}>
            {immediateActions.filter(Boolean).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </div>
      )}

      {disclaimer && (
        <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--orot-ink-mute, #9aa)' }}>{disclaimer}</p>
      )}
    </section>
  );
}
