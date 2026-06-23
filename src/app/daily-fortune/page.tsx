'use client';

import React, { useEffect, useState } from 'react';
import type { DailyFortuneV1, DailyLang } from '@/domain/saju/daily/dailyFortuneTypes';
import { FLOW_LABEL_EN } from '@/domain/saju/daily/dailyTemplates';
import PlaceSelect, { birthPlacePayloadPatch } from '@/components/PlaceSelect';

// ── 입력 상수 (SajuApp 입력 화면과 동일한 12시진 그리드) ──────────────────────
const TIMES = [
  { h: 0, hangul: '자시', en: 'Ja', range: '23:00~01:00' },
  { h: 1, hangul: '축시', en: 'Chuk', range: '01:00~03:00' },
  { h: 2, hangul: '인시', en: 'In', range: '03:00~05:00' },
  { h: 3, hangul: '묘시', en: 'Myo', range: '05:00~07:00' },
  { h: 4, hangul: '진시', en: 'Jin', range: '07:00~09:00' },
  { h: 5, hangul: '사시', en: 'Sa', range: '09:00~11:00' },
  { h: 6, hangul: '오시', en: 'O', range: '11:00~13:00' },
  { h: 7, hangul: '미시', en: 'Mi', range: '13:00~15:00' },
  { h: 8, hangul: '신시', en: 'Sin', range: '15:00~17:00' },
  { h: 9, hangul: '유시', en: 'Yu', range: '17:00~19:00' },
  { h: 10, hangul: '술시', en: 'Sul', range: '19:00~21:00' },
  { h: 11, hangul: '해시', en: 'Hae', range: '21:00~23:00' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const thisYear = new Date().getFullYear();

const PROFILE_KEY = 'saju-profiles';

interface FormState {
  name: string;
  gender: 'm' | 'f' | '';
  calendarType: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  hour: number; // 시진 index 0~11, -1 = 시간 모름
}

interface Profile { name: string; gender: string; year: number; month: number; day: number; hour: number }

type PageStatus = 'idle' | 'loading' | 'result' | 'disabled' | 'error';

// ── i18n ─────────────────────────────────────────────────────────────────────
const STR = {
  ko: {
    home: '홈으로', eyebrow: '오늘의 흐름',
    title: '오늘 내 사주에 들어오는\n기운을 짧게 확인해요',
    subtitle: '생년월일시를 입력하면 오늘의 별빛을 읽어드려요.',
    savedProfiles: '저장된 프로필', name: '이름', namePh: '이름 (선택)',
    gender: '성별', male: '남자', female: '여자', cal: '달력', solar: '양력', lunar: '음력',
    birth: '생년월일', time: '태어난 시간', unknownTime: '시간 모름',
    saveProfile: '이 정보 저장하기', privacy: '입력하신 정보는 오늘의 풀이에만 사용되며 저장되지 않아요.',
    submit: '오늘 운세 보기', loading: '오늘의 별빛을 읽는 중…',
    disabled: '오늘의 별빛은 지금 준비 중이에요. 잠시 후 다시 찾아주세요.',
    today: '오늘 일진', sGood: '잘 풀리는 일', sCaution: '조심할 일', sPoints: '일 · 돈 · 관계', sLuck: '오늘의 행운',
    evidence: '사주 근거 보기', share: '링크 공유', save: '결과 저장', restart: '처음으로',
    ctaLead: '내 사주의 전체 구조가 궁금하다면', cta: '개인사주 리포트 보기',
    past: '지난 오늘의 별빛', saved: '저장됐어요', copied: '링크가 복사됐어요', profileSaved: '프로필을 저장했어요',
    yearU: '년', monthU: '월', dayU: '일',
  },
  en: {
    home: 'Home', eyebrow: "Today's flow",
    title: 'A quick look at the energy\nentering your chart today',
    subtitle: "Enter your birth details and we'll read today's starlight.",
    savedProfiles: 'Saved profiles', name: 'Name', namePh: 'Name (optional)',
    gender: 'Gender', male: 'Male', female: 'Female', cal: 'Calendar', solar: 'Solar', lunar: 'Lunar',
    birth: 'Birth date', time: 'Birth time', unknownTime: "Don't know",
    saveProfile: 'Save this profile', privacy: 'Your details are used only for today’s reading and are not stored.',
    submit: "See today's fortune", loading: "Reading today's starlight…",
    disabled: "Today's Starlight is being prepared. Please check back soon.",
    today: 'Day pillar', sGood: 'Goes well today', sCaution: 'Go easy on', sPoints: 'Work · Money · People', sLuck: "Today's luck",
    evidence: 'See the saju basis', share: 'Share link', save: 'Save', restart: 'Start over',
    ctaLead: 'Curious about your full chart?', cta: 'See your full reading',
    past: 'Past readings', saved: 'Saved', copied: 'Link copied', profileSaved: 'Profile saved',
    yearU: '', monthU: '', dayU: '',
  },
} as const;

// ── prose 조립 ────────────────────────────────────────────────────────────────
function buildProse(data: DailyFortuneV1, lang: DailyLang) {
  const j = (a: string[]) => a.join(', ');
  const good = data.goodFor.map(g => g.label);
  const caut = data.caution.map(c => c.label);
  const goodP = good.length
    ? (lang === 'en' ? `Today flows well for things like ${j(good)}.` : `오늘은 ${j(good)} 같은 일에 흐름이 잘 붙어요.`)
    : '';
  const cautP = caut.length
    ? (lang === 'en' ? `On the flip side, ease off on things like ${j(caut)}.` : `반대로 ${j(caut)} 같은 건 한 박자 늦추는 편이 좋아요.`)
    : '';
  const pointsP = [data.points.work.message, data.points.money.message, data.points.relationship.message].filter(Boolean).join(' ');
  const luck = data.luck;
  const luckParts: string[] = [];
  if (lang === 'en') {
    if (luck.colors.length) luckParts.push(`Keep ${j(luck.colors)} tones close.`);
    if (luck.places.length) luckParts.push(`${luck.places[0]} suits you well,`);
    if (luck.routines.length) luckParts.push(`and routines like ${j(luck.routines.slice(0, 3))} help you settle the day.`);
    if (luck.items.length) luckParts.push(`Handy items: ${j(luck.items.map(i => i.label))}.`);
  } else {
    if (luck.colors.length) luckParts.push(`오늘은 ${j(luck.colors)} 계열을 가까이 두면 기운이 맞아요.`);
    if (luck.places.length) luckParts.push(`${luck.places[0]} 같은 공간이 잘 어울리고,`);
    if (luck.routines.length) luckParts.push(`${j(luck.routines.slice(0, 3))} 같은 루틴으로 하루를 정리해보세요.`);
    if (luck.items.length) luckParts.push(`손에 두기 좋은 건 ${j(luck.items.map(i => i.label))} 같은 것들이에요.`);
  }
  return { goodP, cautP, pointsP, luckP: luckParts.join(' ') };
}

function buildShareText(data: DailyFortuneV1, lang: DailyLang): string {
  const flow = lang === 'en' ? (FLOW_LABEL_EN[data.summary.flowLabel] ?? data.summary.flowLabel) : data.summary.flowLabel;
  const p = buildProse(data, lang);
  const head = lang === 'en' ? '✦ Today’s Starlight' : '✦ 오늘의 별빛';
  return [
    `${head} (${data.meta.date})`,
    `[${flow}] ${data.summary.headline}`,
    data.summary.shortMessage,
    p.goodP, p.cautP, p.pointsP, p.luckP,
  ].filter(Boolean).join('\n\n');
}

// ── 결과 표시 ────────────────────────────────────────────────────────────────
function FortuneResult({ data, lang, userName, notice, onShare, onReset }: {
  data: DailyFortuneV1; lang: DailyLang; userName?: string; notice: string;
  onShare: () => void; onReset: () => void;
}) {
  const L = STR[lang];
  const { meta, summary, evidence } = data;
  const flowDisplay = lang === 'en' ? (FLOW_LABEL_EN[summary.flowLabel] ?? summary.flowLabel) : summary.flowLabel;
  const prose = buildProse(data, lang);

  const formattedDate = (() => {
    const [y, m, d] = meta.date.split('-');
    return lang === 'en'
      ? new Date(meta.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
  })();

  const bodyP: React.CSSProperties = { fontSize: 15, color: 'var(--orot-ink-soft)', lineHeight: 1.8, margin: 0, wordBreak: 'keep-all', fontFamily: 'var(--orot-font)' };
  const subLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--orot-coral)', letterSpacing: '0.02em', margin: '0 0 4px', fontFamily: 'var(--orot-font)' };
  const block: React.CSSProperties = { marginTop: 16 };

  return (
    <div className="screen-enter orot-root" style={{ paddingBottom: 8 }}>
      {/* 헤더 */}
      <div className="orot-card" style={{ marginBottom: 14, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--orot-ink-mute)', margin: '0 0 10px', fontFamily: 'var(--orot-font)' }}>
          {userName ? `${userName} · ` : ''}{formattedDate} · {L.today} {meta.dayStemBranch}
        </p>
        <span style={{
          display: 'inline-block', padding: '5px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
          background: 'rgba(243,160,146,0.10)', border: '1px solid var(--orot-coral-faint)', color: 'var(--orot-coral)',
          marginBottom: 14, fontFamily: 'var(--orot-font)',
        }}>
          {flowDisplay}
        </span>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--orot-ink)', lineHeight: 1.4, margin: '0 0 12px', letterSpacing: '-0.015em', wordBreak: 'keep-all', fontFamily: 'var(--orot-font)' }}>
          {summary.headline}
        </h1>
        <p style={bodyP}>{summary.shortMessage}</p>
      </div>

      {/* 본문 — 한 카드 줄글 */}
      <div className="orot-card" style={{ marginBottom: 14 }}>
        {prose.goodP && (<div><p style={subLabel}>{L.sGood}</p><p style={bodyP}>{prose.goodP}</p></div>)}
        {prose.cautP && (<div style={block}><p style={subLabel}>{L.sCaution}</p><p style={bodyP}>{prose.cautP}</p></div>)}
        {prose.pointsP && (<div style={block}><p style={subLabel}>{L.sPoints}</p><p style={bodyP}>{prose.pointsP}</p></div>)}
        {prose.luckP && (<div style={block}><p style={subLabel}>{L.sLuck}</p><p style={bodyP}>{prose.luckP}</p></div>)}
      </div>

      {/* 사주 근거 — 접힘 */}
      {evidence.length > 0 && (
        <details className="orot-card" style={{ marginBottom: 14 }}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--orot-ink-soft)', fontFamily: 'var(--orot-font)' }}>
            <span>📖</span> {L.evidence}
          </summary>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {evidence.map(ev => (
              <div key={ev.id} style={{ padding: '10px 12px', background: 'rgba(243,231,207,0.04)', borderRadius: 'var(--orot-r-md)', border: '1px solid var(--orot-hair)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--orot-ink)', margin: '0 0 3px', fontFamily: 'var(--orot-font)' }}>{ev.label}</p>
                <p style={{ fontSize: 12.5, color: 'var(--orot-ink-mute)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--orot-font)' }}>{ev.detail}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 액션 */}
      {notice && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--orot-coral)', margin: '0 0 10px', fontFamily: 'var(--orot-font)' }}>{notice}</p>
      )}
      <button className="orot-btn orot-btn--ghost orot-btn--full" style={{ marginBottom: 14 }} onClick={onShare}>🔗 {STR[lang].share}</button>

      {/* 개인사주 CTA */}
      <div className="orot-card orot-card--pink" style={{ marginBottom: 14, textAlign: 'center' }}>
        <p style={{ fontSize: 14, margin: '0 0 14px', lineHeight: 1.6, wordBreak: 'keep-all', fontFamily: 'var(--orot-font)' }}>{L.ctaLead}</p>
        <a href="/" className="orot-btn orot-btn--full" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', background: 'var(--orot-ink-on-pink)', color: 'var(--orot-coral)' }}>
          {L.cta} ›
        </a>
      </div>

      <button className="orot-btn orot-btn--ghost orot-btn--full" onClick={onReset}>{L.restart}</button>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function DailyFortunePage() {
  const [lang, setLang] = useState<DailyLang>('ko');
  const [form, setForm] = useState<FormState>({ name: '', gender: '', calendarType: 'solar', year: 1995, month: 1, day: 1, hour: -1 });
  const [status, setStatus] = useState<PageStatus>('idle');
  const [result, setResult] = useState<DailyFortuneV1 | null>(null);
  const [resultName, setResultName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [birthPlaceId, setBirthPlaceId] = useState('');

  const L = STR[lang];

  useEffect(() => {
    try { setProfiles(JSON.parse(localStorage.getItem(PROFILE_KEY) || '[]')); } catch { /* ignore */ }
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(prev => ({ ...prev, [k]: v }));

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 2500); };

  const applyProfile = (p: Profile) => {
    setForm({
      name: p.name || '', gender: p.gender === 'm' ? 'm' : p.gender === 'f' ? 'f' : '',
      calendarType: 'solar', year: p.year, month: p.month, day: p.day, hour: typeof p.hour === 'number' ? p.hour : -1,
    });
  };

  const saveProfile = () => {
    const entry = {
      name: form.name || (lang === 'en' ? 'Me' : '나'), gender: form.gender || 'm',
      year: form.year, month: form.month, day: form.day, hour: form.hour,
      concern: -1, state: -1, personality: [], relationship: -1, wantToKnow: -1,
    };
    try {
      const list: Profile[] = JSON.parse(localStorage.getItem(PROFILE_KEY) || '[]');
      list.push(entry as unknown as Profile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(list));
      setProfiles(list);
      flash(L.profileSaved);
    } catch { /* quota / private */ }
  };

  const handleSubmit = async () => {
    setStatus('loading');
    setErrorMsg('');
    const birthDate = `${form.year}-${pad2(form.month)}-${pad2(form.day)}`;
    const body: Record<string, unknown> = {
      birthDate, calendarType: form.calendarType,
      birthTimeConfidence: form.hour === -1 ? 'unknown' : 'approximate', lang,
    };
    if (form.hour !== -1) body.birthTime = `${pad2(form.hour * 2)}:00`;
    if (form.gender) body.gender = form.gender === 'm' ? 'male' : 'female';
    Object.assign(body, birthPlacePayloadPatch(true, birthPlaceId));

    try {
      const res = await fetch('/api/saju-v4/daily-fortune', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const dataRes = await res.json();
      if (!res.ok) {
        if (dataRes?.error === 'daily_fortune_disabled') { setStatus('disabled'); return; }
        setErrorMsg(dataRes?.detail ?? (lang === 'en' ? 'Something went wrong.' : '알 수 없는 오류가 발생했어요.'));
        setStatus('error');
        return;
      }
      if (dataRes?.ok && dataRes?.dailyFortune) {
        setResult(dataRes.dailyFortune as DailyFortuneV1);
        setResultName(form.name.trim());
        setStatus('result');
      } else { setErrorMsg(lang === 'en' ? 'No result.' : '결과를 받지 못했어요.'); setStatus('error'); }
    } catch { setErrorMsg(lang === 'en' ? 'Network error.' : '네트워크 오류가 발생했어요.'); setStatus('error'); }
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const text = buildShareText(result, lang);
      const res = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, title: lang === 'en' ? "Today's Starlight" : '오늘의 별빛', lang }) });
      const data = await res.json();
      if (data?.slug) {
        const url = `${window.location.origin}/share?code=${data.slug}`;
        try { await navigator.clipboard.writeText(url); flash(L.copied); }
        catch { window.prompt(L.copied, url); }
      } else { flash(lang === 'en' ? 'Share failed.' : '공유에 실패했어요.'); }
    } catch { flash(lang === 'en' ? 'Share failed.' : '공유에 실패했어요.'); }
  };

  const reset = () => { setStatus('idle'); setResult(null); setErrorMsg(''); setNotice(''); };

  const LangToggle = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
      <div className="pill-toggle" style={{ width: 'auto', display: 'inline-flex' }}>
        <button className={lang === 'ko' ? 'active' : ''} onClick={() => setLang('ko')} aria-pressed={lang === 'ko'} style={{ minWidth: 48 }}>한국어</button>
        <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'} style={{ minWidth: 48 }}>EN</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      <div className="app-container">

        {status === 'result' && result ? (
          <div className="inner" style={{ paddingTop: 16, paddingBottom: 32 }}>
            {LangToggle}
            <FortuneResult data={result} lang={lang} userName={resultName} notice={notice}
              onShare={handleShare} onReset={reset} />
          </div>
        ) : (
          <div className="inner screen-enter orot-root orot-form-screen" style={{ paddingTop: 16, paddingBottom: 32 }}>
            {LangToggle}

            <button onClick={() => { window.location.href = '/'; }} aria-label={L.home}
              style={{ background: 'transparent', border: 0, color: 'var(--orot-ink)', fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12, fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {L.home}
            </button>

            {/* 헤더 */}
            <div style={{ marginBottom: 18 }}>
              <div className="orot-eyebrow">{L.eyebrow}</div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--orot-ink)', letterSpacing: '-0.015em', lineHeight: 1.35, margin: '10px 0 6px', fontFamily: 'var(--orot-font)', whiteSpace: 'pre-line' }}>
                {L.title}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--orot-ink-mute)', margin: 0, lineHeight: 1.6, fontFamily: 'var(--orot-font)' }}>{L.subtitle}</p>
            </div>

            {/* 저장된 프로필 */}
            {profiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--orot-ink-mute)', marginBottom: 8, fontFamily: 'var(--orot-font)' }}>{L.savedProfiles}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {profiles.map((p, i) => (
                    <button key={i} onClick={() => applyProfile(p)} style={{
                      padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                      background: 'rgba(243, 160, 146, 0.06)', border: '1px solid var(--orot-coral-faint)',
                      color: 'var(--orot-coral)', cursor: 'pointer', fontFamily: 'var(--orot-font)',
                    }}>
                      {p.name || (lang === 'en' ? 'Profile' : '프로필')} ({p.year}.{p.month}.{p.day})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 입력 카드 */}
            <div className="orot-card" style={{ marginBottom: 16 }}>
              <div className="input-group">
                <label htmlFor="d-name">{L.name}</label>
                <input id="d-name" type="text" maxLength={50} placeholder={L.namePh} value={form.name} onChange={e => set('name', e.target.value)} aria-label={L.name} />
              </div>
              <div className="input-group">
                <label id="d-gender-label">{L.gender}</label>
                <div className="pill-toggle" role="group" aria-labelledby="d-gender-label">
                  <button className={form.gender === 'm' ? 'active' : ''} onClick={() => set('gender', 'm')} aria-pressed={form.gender === 'm'}>{L.male}</button>
                  <button className={form.gender === 'f' ? 'active' : ''} onClick={() => set('gender', 'f')} aria-pressed={form.gender === 'f'}>{L.female}</button>
                </div>
              </div>
              <div className="input-group">
                <label id="d-cal-label">{L.cal}</label>
                <div className="pill-toggle" role="group" aria-labelledby="d-cal-label">
                  <button className={form.calendarType === 'solar' ? 'active' : ''} onClick={() => set('calendarType', 'solar')} aria-pressed={form.calendarType === 'solar'}>{L.solar}</button>
                  <button className={form.calendarType === 'lunar' ? 'active' : ''} onClick={() => set('calendarType', 'lunar')} aria-pressed={form.calendarType === 'lunar'}>{L.lunar}</button>
                </div>
              </div>
              <div className="input-group">
                <label id="d-birthday-label">{L.birth}</label>
                <div className="select-row" role="group" aria-labelledby="d-birthday-label">
                  <div className="input-group">
                    <select value={form.year} onChange={e => set('year', parseInt(e.target.value, 10))} aria-label="year">
                      {Array.from({ length: 86 }, (_, i) => thisYear - i).map(y => <option key={y} value={y}>{y}{L.yearU}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <select value={form.month} onChange={e => set('month', parseInt(e.target.value, 10))} aria-label="month">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}{L.monthU}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <select value={form.day} onChange={e => set('day', parseInt(e.target.value, 10))} aria-label="day">
                      {Array.from({ length: daysInMonth(form.year, form.month) }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}{L.dayU}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="input-group">
                <label id="d-time-label">{L.time}</label>
                <div className="time-grid" role="radiogroup" aria-labelledby="d-time-label">
                  {TIMES.map(ti => (
                    <div key={ti.h} role="radio" aria-checked={form.hour === ti.h} tabIndex={0}
                      className={'time-option' + (form.hour === ti.h ? ' selected' : '')}
                      onClick={() => set('hour', ti.h)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('hour', ti.h); } }}>
                      <div className="time-range">{ti.range}</div>
                      <div className="time-hangul">{lang === 'en' ? ti.en : ti.hangul}</div>
                    </div>
                  ))}
                  <div role="radio" aria-checked={form.hour === -1} tabIndex={0}
                    className={'time-option unknown-time' + (form.hour === -1 ? ' selected' : '')}
                    onClick={() => set('hour', -1)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('hour', -1); } }}>
                    {L.unknownTime}
                  </div>
                </div>
              </div>
              <PlaceSelect value={birthPlaceId} onChange={setBirthPlaceId} lang={lang} id="d-place-select" />
              <button onClick={saveProfile} className="orot-btn orot-btn--ghost orot-btn--full" style={{ marginTop: 4 }}>
                ＋ {L.saveProfile}
              </button>
            </div>

            <div style={{ background: 'rgba(243, 160, 146, 0.06)', border: '1px solid var(--orot-coral-faint)', borderRadius: 'var(--orot-r-md)', padding: '12px 14px', marginBottom: 16, color: 'var(--orot-ink-soft)', fontSize: 12, lineHeight: 1.6, fontFamily: 'var(--orot-font)' }}>
              {L.privacy}
            </div>

            {notice && <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--orot-coral)', margin: '0 0 12px', fontFamily: 'var(--orot-font)' }}>{notice}</p>}
            {status === 'error' && (
              <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 'var(--orot-r-md)', padding: '12px 14px', marginBottom: 16, color: '#FF8A8A', fontSize: 13, lineHeight: 1.6, textAlign: 'center', fontFamily: 'var(--orot-font)' }}>{errorMsg}</div>
            )}
            {status === 'disabled' && (
              <div style={{ background: 'rgba(243,231,207,0.05)', border: '1px solid var(--orot-hair)', borderRadius: 'var(--orot-r-md)', padding: 14, marginBottom: 16, color: 'var(--orot-ink-soft)', fontSize: 13, lineHeight: 1.6, textAlign: 'center', fontFamily: 'var(--orot-font)' }}>{L.disabled}</div>
            )}

            <button className="orot-btn orot-btn--primary orot-btn--full" onClick={handleSubmit} disabled={status === 'loading'} style={{ opacity: status === 'loading' ? 0.6 : 1 }}>
              {status === 'loading' ? L.loading : L.submit}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
