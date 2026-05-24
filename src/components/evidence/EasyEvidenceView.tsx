// 명리 근거 보기 — 쉬운 설명형 (2026-05).
// 기존 V4 계산 데이터를 사용자가 "왜 이런 풀이가 나왔는지" 납득할 수 있게 재구성.
// 카드 + 바 그래프 + 짧은 설명. raw data는 맨 아래 접힘.

'use client';

import React from 'react';
import type {
  ElementStrengthAnalysis, TenGodAnalysis, DayMasterStrengthAnalysis,
  UsefulGodAnalysis, CombinationsAndConflicts, SpecialStarInfo,
} from '@/domain/saju/report/sajuReportSchema';

// ============================================================
// 쉬운 용어 dictionary (Korean only)
// ============================================================
const EASY_ELEMENTS: Record<string, { label: string; icon: string; description: string; color: string }> = {
  '목': { label: '목', icon: '🌿', description: '성장·방향성·시작하는 힘', color: '#81C784' },
  '화': { label: '화', icon: '🔥', description: '표현·열기·드러나는 에너지', color: '#EF7C6E' },
  '토': { label: '토', icon: '🪨', description: '중심·안정·책임감', color: '#E6B764' },
  '금': { label: '금', icon: '⚙️', description: '판단·정리·기준을 세우는 힘', color: '#B0BEC5' },
  '수': { label: '수', icon: '💧', description: '생각·흐름·지혜·유연함', color: '#64B5F6' },
};

const DAY_MASTER_EASY: Record<string, string> = {
  '갑': '곧게 자라는 큰 나무처럼 추진하고 성장하려는 기운',
  '을': '풀이나 덩굴처럼 유연하게 환경에 적응하는 기운',
  '병': '한낮의 태양처럼 밝고 선명하게 드러내는 기운',
  '정': '촛불·등불처럼 따뜻하고 섬세하게 비추는 기운',
  '무': '큰 산이나 넓은 땅처럼 중심을 잡으려는 기운',
  '기': '경작지·정원의 흙처럼 관계를 부드럽게 다듬는 기운',
  '경': '단단한 금속처럼 결정하고 끊는 추진 기운',
  '신': '날카로운 칼·보석처럼 세밀하고 예리한 기운',
  '임': '큰 강이나 바다처럼 깊고 멀리 보는 흐름의 기운',
  '계': '비나 이슬처럼 부드럽게 스며들어 자라게 하는 기운',
};

const TEN_GOD_EASY: Record<string, string> = {
  '비견': '같은 결의 동료·자기 힘', '겁재': '같은 결인데 더 공격적인 힘',
  '식신': '꾸준히 만들어내는 결과물·표현', '상관': '자유롭게 표현하는 재능·기획',
  '편재': '큰돈·유동성·기회 흐름', '정재': '꾸준한 수입·계획적 자원',
  '편관': '강한 책임·시험·무거운 자리', '정관': '안정적인 책임·직책',
  '편인': '독특한 학습·통찰·직관', '정인': '안정적인 학습·보호·도움',
};

const SPECIAL_STAR_EASY: Record<string, string> = {
  '천을귀인': '중요한 순간에 도움·정보·조언이 붙기 쉬운 별',
  '문창귀인': '학문·문서·표현이 잘 통하는 별',
  '학당귀인': '배움이 자산이 되는 별',
  '월덕귀인': '주변에서 따뜻하게 받쳐주는 별',
  '천덕귀인': '하늘의 덕처럼 위기에서 풀리는 별',
  '태극귀인': '큰 흐름 안에서 길이 열리는 별',
  '양인': '위기에서 밀리지 않고 버티는 승부의 별',
  '괴강': '기준이 강하게 서는 별',
  '백호': '강한 돌파력과 추진력의 별',
  '도화': '사람들의 시선과 존재감이 모이는 별',
  '홍염': '분위기와 말투에서 매력이 드러나는 별',
  '화개': '혼자 정리하고 몰입할 때 깊어지는 별',
  '역마': '이동·변화·확장에서 운이 살아나는 별',
};

function easyDescOfStem(stem: string): string {
  const head = stem[0] ?? '';
  return DAY_MASTER_EASY[head] ?? '나 자신을 나타내는 중심 기운';
}

// ============================================================
// 메인 컴포넌트
// ============================================================
export interface EasyEvidenceViewProps {
  dayMaster: string;
  elementStrength: ElementStrengthAnalysis;
  tenGods: TenGodAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  usefulGod: UsefulGodAnalysis;
  combinationsAndConflicts: CombinationsAndConflicts;
  specialStars: SpecialStarInfo[];
  /** raw data section을 위한 자식 (기존 카드들 그대로 재사용) */
  rawDataChildren?: React.ReactNode;
}

export function EasyEvidenceView(props: EasyEvidenceViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <EvidenceIntro />
      <CoreEvidenceSummary {...props} />
      <ElementDistributionBarChart elements={props.elementStrength} />
      <UsefulGodCards usefulGod={props.usefulGod} />
      <ClimateBalanceCard elementStrength={props.elementStrength} />
      <JudgementConfidenceBars usefulGod={props.usefulGod} />
      <PatternBasisCards
        dayMasterStrength={props.dayMasterStrength}
        tenGods={props.tenGods}
      />
      <SpecialStarCards stars={props.specialStars} />
      <RelationCards combinationsAndConflicts={props.combinationsAndConflicts} />
      {props.rawDataChildren && (
        <details className="card" style={{ padding: 14, marginTop: 4 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'var(--orot-ink-mute)' }}>
            🛠 계산 데이터 자세히 보기
          </summary>
          <div style={{ marginTop: 14 }}>{props.rawDataChildren}</div>
        </details>
      )}
    </div>
  );
}

// ============================================================
// 1. EvidenceIntro
// ============================================================
function EvidenceIntro() {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 14,
      background: 'rgba(143, 122, 234, 0.06)',
      border: '1px solid rgba(143, 122, 234, 0.2)',
      color: 'var(--orot-ink-soft)',
      fontSize: 13, lineHeight: 1.65,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orot-coral)', marginBottom: 6 }}>📜 명리 근거는 이렇게 읽으면 좋아요</div>
      사주는 어려운 한자를 외우는 것이 아니라, 내가 어떤 기운을 강하게 쓰고, 어떤 상황에서 힘이 나고, 어떤 패턴에서 막히는지를 보는 도구예요.
      아래 근거는 "왜 이런 풀이가 나왔는지"를 쉽게 풀어쓴 설명입니다.
    </div>
  );
}

// ============================================================
// 2. CoreEvidenceSummary — 일간/신강신약/용신/희신/기신
// ============================================================
function CoreEvidenceSummary({
  dayMaster, dayMasterStrength, usefulGod,
}: EasyEvidenceViewProps) {
  const strengthLabel = labelOfStrength(dayMasterStrength.level);
  const primaryUseful = usefulGod.primaryUseful?.value;
  const secondaryUseful = usefulGod.secondaryUseful?.value;
  const unfavorable = usefulGod.unfavorable?.[0];

  return (
    <section>
      <SectionTitle>이 사주의 핵심</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <CoreCard
          eyebrow="일간"
          title={dayMaster}
          body={easyDescOfStem(dayMaster)}
        />
        <CoreCard
          eyebrow="신강·신약"
          title={`${strengthLabel} ${dayMasterStrength.score.toFixed(2)}`}
          body={strengthLabel === '신약'
            ? '내 기운이 약한 편이라, 환경과 도움의 영향을 크게 받는 구조'
            : strengthLabel === '신강'
            ? '내 기운이 강한 편이라, 스스로 밀고 나가는 힘이 잘 발휘되는 구조'
            : '균형이 잘 잡힌 편으로, 상황에 따라 유연하게 움직이는 구조'}
          note={strengthLabel === '신약' ? '※ 신약은 사람이 약하다는 뜻이 아닙니다.' : undefined}
        />
        {primaryUseful && (
          <CoreCard
            eyebrow="용신"
            title={`${iconOf(String(primaryUseful))} ${primaryUseful}`}
            body="이 사주를 가장 편하게 살려주는 균형의 기운"
          />
        )}
        {secondaryUseful && (
          <CoreCard
            eyebrow="희신"
            title={`${iconOf(String(secondaryUseful))} ${secondaryUseful}`}
            body="용신을 도와주는 보조 기운"
          />
        )}
        {unfavorable && (
          <CoreCard
            eyebrow="기신"
            title={`${iconOf(String(unfavorable))} ${unfavorable}`}
            body="과하면 부담과 소모를 키울 수 있는 기운"
          />
        )}
      </div>
    </section>
  );
}

// ============================================================
// 3. ElementDistributionBarChart
// ============================================================
function ElementDistributionBarChart({ elements }: { elements: ElementStrengthAnalysis }) {
  // 2026-05 fix: elements.scores의 key는 영문(wood/fire/earth/metal/water)임.
  // 한글로 직접 접근하면 전부 undefined → 0% 버그. 영문 → 한글 매핑으로 수정.
  const ENG_TO_KO: Record<string, string> = {
    wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
  };
  const rawTotal = Object.values(elements.scores).reduce((a, b) => a + Math.max(0, b), 0) || 1;
  // 5오행 합이 100%가 되도록 정수 반올림 + 잔여 조정
  const raw = (['wood', 'fire', 'earth', 'metal', 'water'] as const).map(engKey => ({
    el: ENG_TO_KO[engKey],
    rawPct: Math.max(0, (elements.scores[engKey] ?? 0)) / rawTotal * 100,
  }));
  let rounded = raw.map(r => ({ el: r.el, percent: Math.floor(r.rawPct) }));
  // 잔여 percent 분배 (가장 큰 소수점부터)
  const used = rounded.reduce((a, b) => a + b.percent, 0);
  let remainder = 100 - used;
  const residuals = raw
    .map((r, i) => ({ i, frac: r.rawPct - Math.floor(r.rawPct) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < residuals.length && remainder > 0; k++, remainder--) {
    rounded[residuals[k].i] = { ...rounded[residuals[k].i], percent: rounded[residuals[k].i].percent + 1 };
  }
  const items = rounded.sort((a, b) => b.percent - a.percent);
  const max = items[0]?.percent ?? 0;

  return (
    <section>
      <SectionTitle>오행 분포</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(({ el, percent }) => {
          const meta = EASY_ELEMENTS[el];
          const isMax = percent === max;
          return (
            <div key={el} style={{
              padding: '10px 12px', borderRadius: 12,
              background: isMax ? `${meta.color}18` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isMax ? meta.color + '55' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{meta.icon}</span>
                <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{meta.label}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 800, color: meta.color, fontSize: 14 }}>{percent}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{
                  width: `${percent}%`, height: '100%',
                  background: meta.color, opacity: 0.85,
                  transition: 'width 0.6s ease-out',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 6 }}>{meta.description}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// 4. UsefulGodCards
// ============================================================
function UsefulGodCards({ usefulGod }: { usefulGod: UsefulGodAnalysis }) {
  const cards: Array<{ label: string; el: string; desc: string; tone: 'good' | 'helper' | 'caution' }> = [];
  if (usefulGod.primaryUseful) cards.push({
    label: '용신', el: String(usefulGod.primaryUseful.value),
    desc: '이 사주를 가장 편하게 살려주는 균형의 기운입니다. 과열을 식히거나, 부족을 채워주는 방향으로 작동합니다.',
    tone: 'good',
  });
  if (usefulGod.secondaryUseful) cards.push({
    label: '희신', el: String(usefulGod.secondaryUseful.value),
    desc: '용신을 도와주는 보조 기운입니다. 균형을 함께 만들어가는 역할입니다.',
    tone: 'helper',
  });
  if (usefulGod.unfavorable?.[0]) cards.push({
    label: '기신', el: String(usefulGod.unfavorable[0]),
    desc: '과하면 부담이 커질 수 있는 기운입니다. 완전히 나쁘다는 뜻이 아니라, 너무 강하게 쓰면 소모와 압박으로 이어질 수 있는 결입니다.',
    tone: 'caution',
  });

  if (cards.length === 0) return null;

  return (
    <section>
      <SectionTitle>용신 풀이</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cards.map((c, i) => {
          const meta = EASY_ELEMENTS[c.el] ?? { icon: '✦', color: '#9F7AEA', label: c.el, description: '' };
          const toneColor = c.tone === 'good' ? '#6EE7B7' : c.tone === 'helper' ? '#7DD3FC' : '#F0C75E';
          return (
            <div key={i} style={{
              padding: 14, borderRadius: 14,
              background: `${meta.color}10`,
              border: `1px solid ${meta.color}40`,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ fontSize: 22 }}>{meta.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: toneColor, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 2 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{meta.label}</div>
                <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// 5. ClimateBalanceCard (조후)
// ============================================================
function ClimateBalanceCard({ elementStrength }: { elementStrength: ElementStrengthAnalysis }) {
  const climate = elementStrength.climate;
  if (!climate) return null;
  const tempLabel = ({
    'too-cold': '많이 차가운 편', 'cold': '차가운 편', 'balanced': '균형 잡힌 편',
    'hot': '뜨거운 편', 'too-hot': '많이 뜨거운 편',
  } as const)[climate.coldHot];
  const dryLabel = ({
    'too-dry': '많이 건조한 편', 'dry': '건조한 편', 'balanced': '균형',
    'wet': '습한 편', 'too-wet': '많이 습한 편',
  } as const)[climate.dryWet];

  return (
    <section>
      <SectionTitle>계절 균형 (조후)</SectionTitle>
      <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>🌡</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontSize: 12, fontWeight: 600 }}>{tempLabel}</span>
            <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontSize: 12, fontWeight: 600 }}>{dryLabel}</span>
          </div>
        </div>
        {climate.comment && (
          <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.65 }}>{climate.comment}</div>
        )}
        <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 8 }}>
          조후는 사주의 온도·계절 균형을 보는 관점입니다. 너무 뜨거우면 식혀주고, 너무 차가우면 데워주는 식으로 봐요.
        </div>
      </div>
    </section>
  );
}

// ============================================================
// 6. JudgementConfidenceBars — 5가지 기준
// ============================================================
function JudgementConfidenceBars({ usefulGod }: { usefulGod: UsefulGodAnalysis }) {
  const items = [
    { key: 'climate', label: '조후', score: usefulGod.methodScores.climate, desc: '사주의 온도와 계절 균형을 보는 기준' },
    { key: 'strength', label: '억부', score: usefulGod.methodScores.strength, desc: '내 기운이 강한지 약한지를 보는 기준' },
    { key: 'structure', label: '격국', score: usefulGod.methodScores.structure, desc: '사주의 큰 구조와 방향을 보는 기준' },
    { key: 'bridge', label: '통관', score: usefulGod.methodScores.bridge, desc: '막힌 흐름을 이어주는 기운을 보는 기준' },
    { key: 'illnessMedicine', label: '병약', score: usefulGod.methodScores.illnessMedicine, desc: '문제되는 기운과 처방을 보는 기준' },
  ].sort((a, b) => b.score - a.score);

  return (
    <section>
      <SectionTitle>판단에 반영한 5가지 기준</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(it => {
          const pct = Math.round(it.score * 100);
          return (
            <div key={it.key} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{it.label}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 800, color: '#9F7AEA', fontSize: 13 }}>{pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#9F7AEA', opacity: 0.85 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)' }}>{it.desc}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// 7. PatternBasisCards — 신강신약 + 도움/소모 요인
// ============================================================
function PatternBasisCards({
  dayMasterStrength, tenGods,
}: { dayMasterStrength: DayMasterStrengthAnalysis; tenGods: TenGodAnalysis }) {
  const strengthLabel = labelOfStrength(dayMasterStrength.level);
  return (
    <section>
      <SectionTitle>신강·신약과 도움/소모 요인</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, color: 'var(--orot-coral)', fontWeight: 700, marginBottom: 4 }}>신강·신약</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{strengthLabel} ({dayMasterStrength.score.toFixed(2)})</div>
          <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6 }}>
            {dayMasterStrength.conclusion}
          </div>
          {strengthLabel === '신약' && (
            <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 8 }}>
              ※ 신약은 사람이 약하다는 뜻이 아닙니다. 사주 안에서 나를 직접 도와주는 힘이 상대적으로 부족하다는 뜻이에요.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {dayMasterStrength.supportFactors.length > 0 && (
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(110, 231, 183, 0.06)', border: '1px solid rgba(110, 231, 183, 0.2)' }}>
              <div style={{ fontSize: 11, color: '#6EE7B7', fontWeight: 700, marginBottom: 6 }}>✦ 도움 요인</div>
              {dayMasterStrength.supportFactors.slice(0, 5).map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text)', marginBottom: 4, lineHeight: 1.55 }}>{f}</div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 6 }}>
                {topGodHint(tenGods.strongest)}
              </div>
            </div>
          )}
          {dayMasterStrength.drainingFactors.length > 0 && (
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(240, 199, 94, 0.06)', border: '1px solid rgba(240, 199, 94, 0.2)' }}>
              <div style={{ fontSize: 11, color: '#F0C75E', fontWeight: 700, marginBottom: 6 }}>⌖ 소모 요인</div>
              {dayMasterStrength.drainingFactors.slice(0, 5).map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text)', marginBottom: 4, lineHeight: 1.55 }}>{f}</div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 6 }}>
                과하면 에너지를 쓰게 하지만, 적절히 쓰면 현실감과 결과로 이어지는 결이에요.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function topGodHint(strongest: string[]): string {
  const first = strongest[0];
  if (!first) return '';
  return `${first}: ${TEN_GOD_EASY[first] ?? '주요 결 중 하나'}`;
}

// ============================================================
// 8. SpecialStarCards
// ============================================================
function SpecialStarCards({ stars }: { stars: SpecialStarInfo[] }) {
  if (stars.length === 0) return null;
  return (
    <section>
      <SectionTitle>신살 (별의 결)</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stars.map((s, i) => {
          const easy = SPECIAL_STAR_EASY[s.name] ?? '주요 결 중 하나로 작용하는 별';
          return (
            <div key={i} style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(159, 122, 234, 0.06)',
              border: '1px solid rgba(159, 122, 234, 0.18)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 14, color: '#F6D58A', marginTop: 1 }}>★</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{s.name}</span>
                  {s.positions?.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--orot-ink-mute)' }}>· {s.positions.join(', ')}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', lineHeight: 1.55, marginTop: 2 }}>{easy}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// 9. RelationCards — 합·충·형·파·해
// ============================================================
function RelationCards({ combinationsAndConflicts: cc }: { combinationsAndConflicts: CombinationsAndConflicts }) {
  const items: Array<{ type: string; label: string; desc: string; color: string }> = [];
  for (const c of cc.combinations) items.push({ type: '합', label: c, desc: '서로 어울리며 새로운 결을 만들어내는 흐름', color: '#6EE7B7' });
  for (const c of cc.conflicts) items.push({ type: '충', label: c, desc: '서로 다른 기운이 부딪히며 변화와 이동을 만드는 구조', color: '#7DD3FC' });
  for (const c of cc.punishments) items.push({ type: '형', label: c, desc: '같은 기운이 반복되며 내면 압박이나 생각의 꼬임이 생기기 쉬운 구조', color: '#F0C75E' });
  for (const c of cc.harms) items.push({ type: '해', label: c, desc: '관계 안에서 어긋남이 생기기 쉬운 결', color: '#C4B5FD' });
  for (const c of cc.destructions) items.push({ type: '파', label: c, desc: '기존 흐름이 부서지며 방향 전환이 필요한 신호', color: '#F687B3' });
  if (items.length === 0) return null;

  return (
    <section>
      <SectionTitle>합·충·형·파·해 (관계 구조)</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 10,
            background: `${it.color}10`, border: `1px solid ${it.color}30`,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: it.color }}>{it.type}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{it.label}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', lineHeight: 1.55 }}>{it.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 8, lineHeight: 1.6 }}>
        ※ 충·형은 무조건 나쁜 뜻이 아니에요. 어떤 기운이 부딪히거나 반복되면서 변화·압박·전환점이 생기기 쉬운 신호로 보시면 됩니다.
      </div>
    </section>
  );
}

// ============================================================
// 공통 UI 헬퍼
// ============================================================
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 14, fontWeight: 800, color: 'var(--orot-coral)',
      margin: '0 0 10px', letterSpacing: '-0.01em',
    }}>{children}</h3>
  );
}

function CoreCard({ eyebrow, title, body, note }: { eyebrow: string; title: string; body: string; note?: string }) {
  return (
    <div style={{
      padding: 12, borderRadius: 12,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--orot-coral)', fontWeight: 700, marginBottom: 4 }}>{eyebrow}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', lineHeight: 1.55 }}>{body}</div>
      {note && <div style={{ fontSize: 10, color: 'var(--orot-ink-mute)', marginTop: 6 }}>{note}</div>}
    </div>
  );
}

function labelOfStrength(level: string): '신강' | '신약' | '중화' {
  if (level === 'very-strong' || level === 'strong') return '신강';
  if (level === 'very-weak' || level === 'weak') return '신약';
  return '중화';
}

function iconOf(el: string): string {
  return EASY_ELEMENTS[el]?.icon ?? '✦';
}
