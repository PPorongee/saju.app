'use client';

// 별빛 사주 v4 — v3 SajuApp.tsx의 디자인 톤(Orot, BleedCard, pill-toggle, time-grid)을
// 자연스럽게 가져온 v4 진입점. /api/saju-v4 호출 + SajuV4Report 렌더.
//
// 화면 흐름: 0=intro → 1=birth-input → 2=questions → 3=loading → 4=teaser → 5=result.
// Slice A: 0, 1만 v3 디자인. 2~5는 stub (다음 슬라이스에서 v3 디자인으로 확장).

import { useState } from 'react';
import { BleedCard } from '@/components/orot';
import { SajuV4Report, type SajuV4ApiResponse } from '@/components/SajuV4Report';
import { parseSajuReport } from '@/lib/saju-v4-report-parser';
import type { BirthInput, ConcernTopic } from '@/domain/saju/calendar/normalizeBirthInput';

// v4 spec 입력 상태
interface FormState {
  name: string;
  gender: BirthInput['gender'];
  calendarType: BirthInput['calendarType'];
  isLeapMonth: boolean;
  year: number;
  month: number;
  day: number;
  // 시진 0=자, 1=축, ..., 11=해, -1=미상
  hourSlot: number;
  useExactTime: boolean;
  exactHour: number;
  exactMinute: number;
  // 컨텍스트
  relationshipStatus: NonNullable<BirthInput['relationshipStatus']>;
  hasChildren: 'true' | 'false' | 'unknown';
  occupation: string;
  concerns: ConcernTopic[];
}

const TIME_SLOTS: Array<{ slot: number; range: string; name: string }> = [
  { slot: 0,  range: '23:00 ~ 00:59', name: '자시' },
  { slot: 1,  range: '01:00 ~ 02:59', name: '축시' },
  { slot: 2,  range: '03:00 ~ 04:59', name: '인시' },
  { slot: 3,  range: '05:00 ~ 06:59', name: '묘시' },
  { slot: 4,  range: '07:00 ~ 08:59', name: '진시' },
  { slot: 5,  range: '09:00 ~ 10:59', name: '사시' },
  { slot: 6,  range: '11:00 ~ 12:59', name: '오시' },
  { slot: 7,  range: '13:00 ~ 14:59', name: '미시' },
  { slot: 8,  range: '15:00 ~ 16:59', name: '신시' },
  { slot: 9,  range: '17:00 ~ 18:59', name: '유시' },
  { slot: 10, range: '19:00 ~ 20:59', name: '술시' },
  { slot: 11, range: '21:00 ~ 22:59', name: '해시' },
];

const CONCERN_OPTIONS: Array<{ value: ConcernTopic; label: string }> = [
  { value: 'career',       label: '직업/커리어' },
  { value: 'money',        label: '돈/재물' },
  { value: 'relationship', label: '인간관계' },
  { value: 'marriage',     label: '결혼' },
  { value: 'family',       label: '가족' },
  { value: 'health',       label: '건강' },
  { value: 'study',        label: '학업' },
  { value: 'business',     label: '사업' },
  { value: 'personality',  label: '성격' },
  { value: 'future',       label: '미래' },
];

/** 시진 slot → HH:mm (시진의 가운데 시각 사용. 자시=00:00) */
function slotToHHmm(slot: number): string {
  if (slot === 0) return '00:00';
  const hour = slot * 2;          // 1→2, 2→4, ..., 11→22 (시진 중앙)
  return `${String(hour).padStart(2, '0')}:00`;
}

/** 정확 시각이 있으면 그것, 아니면 시진 slot의 대표 시각 */
function buildBirthTime(slot: number, useExactTime: boolean, exactHour: number, exactMinute: number): string | undefined {
  if (slot === -1 && !useExactTime) return undefined;
  if (useExactTime && exactHour >= 0) {
    return `${String(exactHour).padStart(2, '0')}:${String(exactMinute).padStart(2, '0')}`;
  }
  return slotToHHmm(slot);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function SajuV4App() {
  const [screen, setScreen] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [form, setForm] = useState<FormState>({
    name: '', gender: 'female',
    calendarType: 'solar', isLeapMonth: false,
    year: 1995, month: 7, day: 6,
    hourSlot: 6, useExactTime: false, exactHour: -1, exactMinute: 0,
    relationshipStatus: 'unknown', hasChildren: 'unknown',
    occupation: '', concerns: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<SajuV4ApiResponse | null>(null);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }
  function toggleConcern(c: ConcernTopic) {
    setForm(f => ({ ...f, concerns: f.concerns.includes(c) ? f.concerns.filter(x => x !== c) : [...f.concerns, c] }));
  }

  const [unlocked, setUnlocked] = useState(false);

  async function submit() {
    setLoading(true); setError(null); setApi(null); setUnlocked(false); setScreen(3);
    try {
      const birthTime = buildBirthTime(form.hourSlot, form.useExactTime, form.exactHour, form.exactMinute);
      const birthTimeConfidence: BirthInput['birthTimeConfidence'] =
        !birthTime ? 'unknown' : form.useExactTime ? 'exact' : 'approximate';

      const input: BirthInput = {
        name: form.name || '익명',
        gender: form.gender,
        calendarType: form.calendarType,
        isLeapMonth: form.calendarType === 'lunar' ? form.isLeapMonth : undefined,
        birthDate: `${form.year}-${String(form.month).padStart(2, '0')}-${String(form.day).padStart(2, '0')}`,
        birthTime, birthTimeConfidence,
        timezone: 'Asia/Seoul',
        relationshipStatus: form.relationshipStatus,
        hasChildren: form.hasChildren === 'true' ? true : form.hasChildren === 'false' ? false : 'unknown',
        occupation: form.occupation || undefined,
        currentConcerns: form.concerns,
      };

      const res = await fetch('/api/saju-v4', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, maxRepairAttempts: 1 }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(`서버 오류 (${res.status}): ${detail?.detail || detail?.error || '알 수 없는 오류'}`);
      }
      setApi(await res.json() as SajuV4ApiResponse);
      setScreen(4);  // → teaser/paywall 먼저
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
      setScreen(1);
    } finally {
      setLoading(false);
    }
  }

  function unlockResult() {
    // TODO 다음 슬라이스: 실제 토스 결제 wire. 지금은 베타라 즉시 unlock.
    setUnlocked(true);
    setScreen(5);
  }

  const birthSummary = `${form.year}년 ${form.month}월 ${form.day}일${form.hourSlot >= 0 ? ' ' + TIME_SLOTS[form.hourSlot].name : ' (시간미상)'} (${form.calendarType === 'solar' ? '양력' : '음력'})`;

  if (screen === 0) return <RenderIntro onStart={() => setScreen(1)} />;
  if (screen === 1) return <RenderBirthInput form={form} update={update} onBack={() => setScreen(0)} onNext={() => setScreen(2)} error={error} />;
  if (screen === 2) return <RenderQuestions form={form} update={update} toggleConcern={toggleConcern} onBack={() => setScreen(1)} onSubmit={submit} loading={loading} />;
  if (screen === 3) return <RenderLoading />;
  if (api && screen === 4) return <RenderTeaser api={api} name={form.name || '익명'} birthSummary={birthSummary} onUnlock={unlockResult} onBack={() => setScreen(0)} />;
  if (api && screen === 5 && unlocked) {
    return (
      <>
        <button onClick={() => { setApi(null); setUnlocked(false); setScreen(0); }}
          style={{ position: 'fixed', top: 10, left: 10, zIndex: 10, padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid var(--orot-hair)', background: 'rgba(10,14,42,0.8)', color: 'var(--orot-ink-soft)', cursor: 'pointer' }}>
          ← 새 풀이
        </button>
        <SajuV4Report api={api} parsed={parseSajuReport(api.reportText)} birthSummary={birthSummary} />
      </>
    );
  }
  return null;
}

// ============================================================
// Screen 4 — Teaser / Paywall (v3 톤: BleedCard hero + blur 스포일러 카드 + CTA)
// ============================================================
function RenderTeaser({ api, name, birthSummary, onUnlock, onBack }: {
  api: SajuV4ApiResponse;
  name: string;
  birthSummary: string;
  onUnlock: () => void;
  onBack: () => void;
}) {
  const sigPoint = api.specialPoints[0];
  const useful = api.coreAnalysis.usefulGod.primaryUseful.value;
  const ki = api.coreAnalysis.usefulGod.unfavorable[0];

  const spoilers = [
    {
      icon: '🪞',
      visible: '나만의 정체성 키워드',
      blurred: api.identityKeywords[0]?.keyword || '키워드',
      hint: `${api.identityKeywords.length}개 도출`,
      gradient: 'linear-gradient(135deg, rgba(192,132,252,0.12), rgba(139,92,246,0.06))',
      border: 'rgba(192,132,252,0.25)',
    },
    {
      icon: '⚔',
      visible: '내 사주의 무기',
      blurred: api.lifeWeapons[0]?.name || '무기',
      hint: `${api.lifeWeapons.length}가지`,
      gradient: 'linear-gradient(135deg, rgba(110,231,183,0.12), rgba(52,211,153,0.06))',
      border: 'rgba(110,231,183,0.25)',
    },
    {
      icon: '⚠',
      visible: '내 사주의 함정',
      blurred: api.lifeTraps[0]?.name || '함정',
      hint: `${api.lifeTraps.length}가지`,
      gradient: 'linear-gradient(135deg, rgba(255,107,157,0.12), rgba(239,68,68,0.06))',
      border: 'rgba(255,107,157,0.25)',
    },
    {
      icon: '🍀',
      visible: '운이 살아나는 / 막는 선택',
      blurred: '구체 행동 전략',
      hint: `용신 ${useful} · 기신 ${ki}`,
      gradient: 'linear-gradient(135deg, rgba(246,196,67,0.12), rgba(245,158,11,0.06))',
      border: 'rgba(246,196,67,0.25)',
    },
  ];

  return (
    <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: 24, paddingBottom: 32 }}>
      <button onClick={onBack}
        style={{ background: 'transparent', border: 0, color: 'var(--orot-ink)', fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> 뒤로
      </button>

      <BleedCard
        image="/images/orot/saju-in-character.webp"
        framingId="saju-in-character"
        veil="left"
        minHeight={240}
        style={{ marginBottom: 20 }}
      >
        <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '70%' }}>
          <div className="orot-eyebrow" style={{ marginBottom: 12 }}>나의 풀이</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--orot-ink)', letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0 }}>
            {name}님의 사주 풀이
          </h1>
          <p style={{ fontSize: 12, color: 'var(--orot-ink-mute)', margin: '10px 0 0' }}>
            {birthSummary} 출생
          </p>
        </div>
      </BleedCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 }}>
        <MiniPillar label="년" v={api.birthChart.year} />
        <MiniPillar label="월" v={api.birthChart.month} />
        <MiniPillar label="일" v={api.birthChart.day} starred />
        <MiniPillar label="시" v={api.birthChart.hour ?? '미상'} />
      </div>

      <div className="section-divider">사주 풀이 미리보기</div>

      {spoilers.map((sp, i) => (
        <div key={i} className="card" style={{ background: sp.gradient, border: '1px solid ' + sp.border, padding: '18px 16px', marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{sp.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orot-ink)', lineHeight: 1.6, marginBottom: 6 }}>{sp.visible}</div>
              <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', filter: 'blur(4px)', userSelect: 'none', lineHeight: 1.5 }}>{sp.blurred}</div>
              <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 6 }}>힌트 · {sp.hint}</div>
            </div>
          </div>
        </div>
      ))}

      {sigPoint && (
        <div className="card" style={{ padding: 16, marginTop: 12, borderLeft: '3px solid var(--orot-coral)' }}>
          <div className="orot-eyebrow" style={{ marginBottom: 6 }}>signature 포인트</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{sigPoint.title}</div>
          <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6 }}>{sigPoint.narrative.coreMeaning}</div>
        </div>
      )}

      <div style={{
        marginTop: 20, padding: 18, borderRadius: 'var(--orot-r-lg)',
        background: 'linear-gradient(135deg, rgba(240,199,94,0.12), rgba(243,160,146,0.08))',
        border: '1px solid var(--orot-coral-faint)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'var(--orot-coral)', fontWeight: 600, marginBottom: 8 }}>전체 리포트 열기</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--orot-ink)', marginBottom: 10 }}>990원</div>
        <div style={{ fontSize: 12, color: 'var(--orot-ink-soft)', marginBottom: 14, lineHeight: 1.6 }}>
          10섹션 전체 풀이 · 정체성 키워드 · 무기 · 함정 · 운 트리거 · 10문항 답 · 3년 흐름
        </div>
        <button onClick={onUnlock} className="orot-btn orot-btn--primary orot-btn--full">
          결제하고 전체 풀이 보기 ›
        </button>
        <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 8 }}>
          ⓘ 베타 기간 — 결제 wire는 다음 업데이트에서 활성화
        </div>
      </div>
    </div>
  );
}

function MiniPillar({ label, v, starred }: { label: string; v: string; starred?: boolean }) {
  return (
    <div style={{
      border: '1px solid var(--orot-hair)', borderRadius: 'var(--orot-r-md)',
      padding: '8px 4px', textAlign: 'center',
      background: starred ? 'rgba(240,199,94,0.08)' : 'transparent',
    }}>
      <div style={{ fontSize: 10, color: 'var(--orot-ink-mute)' }}>{label}{starred ? ' ★' : ''}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{v}</div>
    </div>
  );
}

// ============================================================
// Screen 0 — Intro (v3 디자인 톤)
// ============================================================
function RenderIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="inner screen-enter orot-root" style={{ paddingTop: 24, paddingBottom: 32 }}>
      <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 4, background: '#F0C75E', color: '#0A0E2A', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>BETA v4</div>
      <div style={{ padding: '0 4px 18px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--orot-coral)', letterSpacing: '-0.012em', lineHeight: 1.3, margin: 0, WebkitTextFillColor: 'var(--orot-coral)' }}>
          나만의 사용설명서, 사주
        </h1>
        <p style={{ fontSize: 14, color: 'var(--orot-ink-soft)', lineHeight: 1.6, margin: '6px 0 0' }}>
          정체성·무기·함정·운의 트리거까지 — 코드가 계산하고 GPT가 풀어쓰는 깊이 있는 리포트.
        </p>
      </div>

      <BleedCard
        image="/images/orot/home-hero-character.webp"
        framingId="home-hero-character"
        veil="left"
        minHeight={300}
        style={{ marginBottom: 16 }}
      >
        <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '62%' }}>
          <div className="orot-eyebrow" style={{ marginBottom: 14 }}>v4 베타</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--orot-ink)', letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line', fontFamily: 'var(--orot-font)' }}>
            태어난 날의 사주로{'\n'}나를 깊이 들여다봐요
          </h2>
        </div>
      </BleedCard>

      <button
        className="orot-btn orot-btn--primary orot-btn--full"
        onClick={onStart}
        style={{ marginTop: 8 }}
      >
        내 사주 풀이 시작 ›
      </button>
    </div>
  );
}

// ============================================================
// Screen 1 — Birth Input (v3 디자인 톤)
// ============================================================
function RenderBirthInput(p: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onBack: () => void;
  onNext: () => void;
  error: string | null;
}) {
  const { form, update } = p;
  return (
    <div className="inner screen-enter orot-root orot-form-screen" style={{ paddingTop: 24, paddingBottom: 32 }}>
      <button onClick={p.onBack} aria-label="뒤로"
        style={{ background: 'transparent', border: 0, color: 'var(--orot-ink)', fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> 뒤로
      </button>

      <BleedCard
        image="/images/orot/home-feat-saju.webp"
        framingId="home-feat-saju-hero"
        veil="left"
        minHeight={220}
        style={{ marginBottom: 20 }}
      >
        <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '62%' }}>
          <div style={{ marginBottom: 14 }}>
            <div className="orot-eyebrow">개인사주</div>
            <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 4, marginLeft: 21 }}>나의 사용설명서</div>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--orot-ink)', letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>
            태어난 날의 사주로{'\n'}나를 들여다봐요
          </h1>
        </div>
      </BleedCard>

      <div className="orot-card" style={{ marginBottom: 16 }}>
        <div className="input-group">
          <label htmlFor="input-name">이름</label>
          <input id="input-name" type="text" maxLength={50} placeholder="익명 또는 닉네임"
            value={form.name} onChange={e => update('name', e.target.value)} />
        </div>

        <div className="input-group">
          <label id="gender-label">성별</label>
          <div className="pill-toggle" role="group" aria-labelledby="gender-label">
            <button className={form.gender === 'male' ? 'active' : ''} onClick={() => update('gender', 'male')}>남</button>
            <button className={form.gender === 'female' ? 'active' : ''} onClick={() => update('gender', 'female')}>여</button>
          </div>
        </div>

        <div className="input-group">
          <label id="calendar-label">달력</label>
          <div className="pill-toggle" role="group" aria-labelledby="calendar-label">
            <button className={form.calendarType === 'solar' ? 'active' : ''} onClick={() => update('calendarType', 'solar')}>양력</button>
            <button className={form.calendarType === 'lunar' ? 'active' : ''} onClick={() => update('calendarType', 'lunar')}>음력</button>
          </div>
          {form.calendarType === 'lunar' && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--orot-ink-mute)' }}>
              <input type="checkbox" checked={form.isLeapMonth} onChange={e => update('isLeapMonth', e.target.checked)} />
              윤달
            </label>
          )}
        </div>

        <div className="input-group">
          <label id="birthday-label">생년월일</label>
          <div className="select-row" role="group" aria-labelledby="birthday-label">
            <div className="input-group">
              <select value={form.year} onChange={e => update('year', parseInt(e.target.value))}>
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
            <div className="input-group">
              <select value={form.month} onChange={e => update('month', parseInt(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            </div>
            <div className="input-group">
              <select value={form.day} onChange={e => update('day', parseInt(e.target.value))}>
                {Array.from({ length: getDaysInMonth(form.year, form.month) }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}일</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="input-group">
          <label id="birthtime-label">출생 시간</label>
          <div className="time-grid" role="radiogroup" aria-labelledby="birthtime-label">
            {TIME_SLOTS.map(ti => (
              <div key={ti.slot} role="radio" aria-checked={form.hourSlot === ti.slot} tabIndex={0}
                className={'time-option' + (form.hourSlot === ti.slot ? ' selected' : '')}
                onClick={() => { update('hourSlot', ti.slot); update('useExactTime', false); update('exactHour', -1); }}>
                <div className="time-range">{ti.range}</div>
                <div className="time-hangul">{ti.name}</div>
              </div>
            ))}
            <div role="radio" aria-checked={form.hourSlot === -1} tabIndex={0}
              className={'time-option unknown-time' + (form.hourSlot === -1 ? ' selected' : '')}
              onClick={() => { update('hourSlot', -1); update('useExactTime', false); update('exactHour', -1); }}>
              시간 미상
            </div>
          </div>
          <div className="exact-time-section">
            <label className="exact-time-toggle" onClick={() => {
              const next = !form.useExactTime;
              update('useExactTime', next);
              if (next && form.exactHour < 0) { update('exactHour', 12); update('exactMinute', 0); }
              if (!next) { update('exactHour', -1); update('exactMinute', 0); }
            }}>
              <span className={'exact-time-checkbox' + (form.useExactTime ? ' checked' : '')}>{form.useExactTime ? '✓' : ''}</span>
              정확한 시간 알아요
            </label>
            {form.useExactTime && (
              <div className="exact-time-inputs">
                <select className="exact-time-select" value={form.exactHour} onChange={e => update('exactHour', parseInt(e.target.value))}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}시</option>)}
                </select>
                <select className="exact-time-select" value={form.exactMinute} onChange={e => update('exactMinute', parseInt(e.target.value))}>
                  {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}분</option>)}
                </select>
              </div>
            )}
            <p className="exact-time-note">정확한 시간을 알면 시주가 더 정밀해져요.</p>
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(243, 160, 146, 0.06)',
        border: '1px solid var(--orot-coral-faint)',
        borderRadius: 'var(--orot-r-md)',
        padding: '12px 14px', marginBottom: 16,
        color: 'var(--orot-ink-soft)', fontSize: 12, lineHeight: 1.6,
      }}>
        입력하신 정보는 풀이에만 사용되며 언제든 삭제하실 수 있어요.
      </div>

      {p.error && (
        <div style={{ marginBottom: 12, padding: 10, fontSize: 13, color: '#c46', background: 'rgba(240,140,140,0.08)', borderRadius: 6 }}>
          ⚠ {p.error}
        </div>
      )}

      <button
        className="orot-btn orot-btn--primary orot-btn--full"
        onClick={p.onNext}>
        다음 ›
      </button>
    </div>
  );
}

// ============================================================
// Screen 2 — Questions (stub — 다음 슬라이스에서 v3 디자인으로 확장)
// ============================================================
function RenderQuestions(p: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  toggleConcern: (c: ConcernTopic) => void;
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const { form } = p;
  return (
    <div className="inner screen-enter orot-root orot-form-screen" style={{ paddingTop: 24, paddingBottom: 32 }}>
      <button onClick={p.onBack} style={{ background: 'transparent', border: 0, color: 'var(--orot-ink)', fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> 뒤로
      </button>

      <div style={{ marginBottom: 16, padding: '0 4px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>몇 가지만 알려주세요</h2>
        <p style={{ fontSize: 13, color: 'var(--orot-ink-soft)', marginTop: 6 }}>해석을 더 정확하게 맞춰드릴 수 있어요.</p>
      </div>

      <div className="orot-card" style={{ marginBottom: 16 }}>
        <div className="input-group">
          <label>혼인 상태</label>
          <select value={form.relationshipStatus} onChange={e => p.update('relationshipStatus', e.target.value as FormState['relationshipStatus'])}
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 6, border: '1px solid var(--orot-hair)', background: '#1a1d3a', color: '#e8e8f0' }}>
            <option value="unknown">선택 안 함</option>
            <option value="single">미혼/싱글</option>
            <option value="dating">연애 중</option>
            <option value="married">기혼</option>
            <option value="divorced">이혼</option>
            <option value="widowed">사별</option>
          </select>
        </div>

        <div className="input-group">
          <label>자녀</label>
          <div className="pill-toggle">
            <button className={form.hasChildren === 'unknown' ? 'active' : ''} onClick={() => p.update('hasChildren', 'unknown')}>선택 안 함</button>
            <button className={form.hasChildren === 'false' ? 'active' : ''} onClick={() => p.update('hasChildren', 'false')}>없음</button>
            <button className={form.hasChildren === 'true' ? 'active' : ''} onClick={() => p.update('hasChildren', 'true')}>있음</button>
          </div>
        </div>

        <div className="input-group">
          <label>직업 (선택)</label>
          <input type="text" placeholder="예: 디자이너" value={form.occupation}
            onChange={e => p.update('occupation', e.target.value)} />
        </div>

        <div className="input-group">
          <label>현재 관심사 (여러 개 선택)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CONCERN_OPTIONS.map(o => (
              <button key={o.value} type="button" onClick={() => p.toggleConcern(o.value)}
                style={{
                  padding: '8px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                  border: '1px solid ' + (form.concerns.includes(o.value) ? 'var(--orot-coral)' : 'var(--orot-hair)'),
                  background: form.concerns.includes(o.value) ? 'rgba(243,160,146,0.12)' : 'transparent',
                  color: form.concerns.includes(o.value) ? 'var(--orot-coral)' : 'var(--orot-ink)',
                  fontWeight: form.concerns.includes(o.value) ? 700 : 400,
                }}>{o.label}</button>
            ))}
          </div>
        </div>
      </div>

      <button
        className="orot-btn orot-btn--primary orot-btn--full"
        onClick={p.onSubmit}
        disabled={p.loading}>
        {p.loading ? '풀이 생성 중...' : '사주 풀이 생성하기 ›'}
      </button>
    </div>
  );
}

// ============================================================
// Screen 3 — Loading (단순 — 다음 슬라이스에서 v3 로딩 애니메이션으로)
// ============================================================
function RenderLoading() {
  return (
    <div className="inner screen-enter orot-root" style={{ paddingTop: 80, paddingBottom: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--orot-ink-soft)', marginBottom: 12 }}>사주 원국 계산 중…</div>
      <div style={{ fontSize: 22, color: 'var(--orot-coral)', fontWeight: 700, marginBottom: 12 }}>✦</div>
      <div style={{ fontSize: 13, color: 'var(--orot-ink-mute)' }}>GPT가 30~60초 동안 풀이를 작성합니다.</div>
    </div>
  );
}
