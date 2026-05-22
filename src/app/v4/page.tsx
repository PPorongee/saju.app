'use client';

// v4 베타 페이지 — 본인 테스트 전용.
// 메인 페이지에는 노출 안 됨. starlight-saju.com/v4 직접 접속.
// 생년월일시 입력 → /api/saju-v4 호출 → SajuV4Report 렌더.

import { useState } from 'react';
import { SajuV4Report, type SajuV4ApiResponse } from '@/components/SajuV4Report';
import { parseSajuReport } from '@/lib/saju-v4-report-parser';
import type { BirthInput, ConcernTopic } from '@/domain/saju/calendar/normalizeBirthInput';

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

export default function V4Page() {
  const [form, setForm] = useState({
    gender: 'female' as BirthInput['gender'],
    calendarType: 'solar' as BirthInput['calendarType'],
    isLeapMonth: false,
    birthDate: '1995-07-06',
    birthTime: '12:00',
    birthTimeConfidence: 'exact' as BirthInput['birthTimeConfidence'],
    relationshipStatus: 'single' as NonNullable<BirthInput['relationshipStatus']>,
    hasChildren: 'unknown' as 'true' | 'false' | 'unknown',
    occupation: '',
    concerns: [] as ConcernTopic[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<SajuV4ApiResponse | null>(null);

  function toggleConcern(c: ConcernTopic) {
    setForm(f => ({
      ...f,
      concerns: f.concerns.includes(c) ? f.concerns.filter(x => x !== c) : [...f.concerns, c],
    }));
  }

  async function submit() {
    setLoading(true);
    setError(null);
    setApi(null);
    try {
      const input: BirthInput = {
        gender: form.gender,
        calendarType: form.calendarType,
        isLeapMonth: form.calendarType === 'lunar' ? form.isLeapMonth : undefined,
        birthDate: form.birthDate,
        birthTime: form.birthTimeConfidence === 'unknown' ? undefined : form.birthTime,
        birthTimeConfidence: form.birthTimeConfidence,
        timezone: 'Asia/Seoul',
        relationshipStatus: form.relationshipStatus,
        hasChildren: form.hasChildren === 'true' ? true : form.hasChildren === 'false' ? false : 'unknown',
        occupation: form.occupation || undefined,
        currentConcerns: form.concerns,
      };
      const res = await fetch('/api/saju-v4', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, maxRepairAttempts: 1 }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(`서버 오류 (${res.status}): ${detail?.detail || detail?.error || '알 수 없는 오류'}`);
      }
      const data = (await res.json()) as SajuV4ApiResponse;
      setApi(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }

  const birthSummary = `${form.birthDate}${form.birthTimeConfidence !== 'unknown' ? ' ' + form.birthTime : ' 시간미상'} (${form.calendarType === 'solar' ? '양력' : '음력'})`;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <header style={{ marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--orot-hair)' }}>
        <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 4, background: '#F0C75E', color: '#0A0E2A', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>BETA v4</div>
        <h1 style={{ fontSize: 22, margin: 0 }}>개인사주 v4 (베타)</h1>
        <p style={{ fontSize: 13, color: 'var(--orot-ink-mute)', marginTop: 4 }}>
          결정론적 명리 계산 + GPT 해석 분리. 본인 테스트 전용.
        </p>
      </header>

      {!api && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <Field label="달력">
            <div style={{ display: 'flex', gap: 12 }}>
              <Radio name="cal" value="solar" checked={form.calendarType === 'solar'} onChange={() => setForm(f => ({ ...f, calendarType: 'solar' }))} label="양력" />
              <Radio name="cal" value="lunar" checked={form.calendarType === 'lunar'} onChange={() => setForm(f => ({ ...f, calendarType: 'lunar' }))} label="음력" />
              {form.calendarType === 'lunar' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <input type="checkbox" checked={form.isLeapMonth} onChange={e => setForm(f => ({ ...f, isLeapMonth: e.target.checked }))} />윤달
                </label>
              )}
            </div>
          </Field>

          <Field label="생년월일">
            <input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
              style={inputStyle} />
          </Field>

          <Field label="시간 정확도">
            <select value={form.birthTimeConfidence} onChange={e => setForm(f => ({ ...f, birthTimeConfidence: e.target.value as BirthInput['birthTimeConfidence'] }))}
              style={inputStyle}>
              <option value="exact">정확</option>
              <option value="approximate">대략</option>
              <option value="unknown">미상</option>
            </select>
          </Field>

          {form.birthTimeConfidence !== 'unknown' && (
            <Field label="출생 시간">
              <input type="time" value={form.birthTime} onChange={e => setForm(f => ({ ...f, birthTime: e.target.value }))}
                style={inputStyle} />
            </Field>
          )}

          <Field label="성별">
            <div style={{ display: 'flex', gap: 12 }}>
              <Radio name="g" value="female" checked={form.gender === 'female'} onChange={() => setForm(f => ({ ...f, gender: 'female' }))} label="여" />
              <Radio name="g" value="male" checked={form.gender === 'male'} onChange={() => setForm(f => ({ ...f, gender: 'male' }))} label="남" />
              <Radio name="g" value="unknown" checked={form.gender === 'unknown'} onChange={() => setForm(f => ({ ...f, gender: 'unknown' }))} label="미상" />
            </div>
          </Field>

          <Field label="혼인 상태">
            <select value={form.relationshipStatus} onChange={e => setForm(f => ({ ...f, relationshipStatus: e.target.value as NonNullable<BirthInput['relationshipStatus']> }))}
              style={inputStyle}>
              <option value="single">미혼/싱글</option>
              <option value="dating">연애 중</option>
              <option value="married">기혼</option>
              <option value="divorced">이혼</option>
              <option value="widowed">사별</option>
              <option value="unknown">선택 안 함</option>
            </select>
          </Field>

          <Field label="자녀">
            <select value={form.hasChildren} onChange={e => setForm(f => ({ ...f, hasChildren: e.target.value as 'true' | 'false' | 'unknown' }))}
              style={inputStyle}>
              <option value="unknown">선택 안 함</option>
              <option value="false">없음</option>
              <option value="true">있음</option>
            </select>
          </Field>

          <Field label="직업 (선택)">
            <input type="text" value={form.occupation} placeholder="예: 디자이너" onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
              style={inputStyle} />
          </Field>

          <Field label="현재 관심사 (다중 선택)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CONCERN_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => toggleConcern(o.value)}
                  style={{
                    padding: '6px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                    border: '1px solid ' + (form.concerns.includes(o.value) ? 'var(--orot-coral)' : 'var(--orot-hair)'),
                    background: form.concerns.includes(o.value) ? 'rgba(240,199,94,0.12)' : 'transparent',
                    color: 'var(--orot-ink)',
                  }}>{o.label}</button>
              ))}
            </div>
          </Field>

          <button onClick={submit} disabled={loading}
            style={{
              marginTop: 16, width: '100%', padding: 14, fontSize: 15, fontWeight: 700,
              borderRadius: 'var(--orot-r-md)', border: 'none', cursor: loading ? 'wait' : 'pointer',
              background: 'var(--orot-coral)', color: '#0A0E2A',
              opacity: loading ? 0.6 : 1,
            }}>
            {loading ? '풀이 생성 중... (약 30~60초)' : '사주 풀이 생성하기'}
          </button>
          {error && (
            <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: '#c46', background: 'rgba(240,140,140,0.08)', borderRadius: 6 }}>
              ⚠ {error}
            </div>
          )}
        </div>
      )}

      {api && (
        <>
          <button onClick={() => setApi(null)}
            style={{ marginBottom: 8, padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid var(--orot-hair)', background: 'transparent', color: 'var(--orot-ink-soft)', cursor: 'pointer' }}>
            ← 새 사주 풀이
          </button>
          <SajuV4Report api={api} parsed={parseSajuReport(api.reportText)} birthSummary={birthSummary} />
        </>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 14,
  borderRadius: 6, border: '1px solid var(--orot-hair)',
  background: 'transparent', color: 'var(--orot-ink)',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--orot-ink-mute)', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Radio({ name, value, checked, onChange, label }: { name: string; value: string; checked: boolean; onChange: () => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />{label}
    </label>
  );
}
