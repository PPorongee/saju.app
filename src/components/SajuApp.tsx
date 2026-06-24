'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  calcSaju, getOhCount, CG, JJ, CG_HANJA, JJ_HANJA,
  OH_CG, OH_JJ, OH_EN, OH_ICON, PROFILES,
  getSipsung, calcShinsal, get12Unsung,
  SajuResult
} from '@/lib/saju-calc';
import { buildSajuPrompts, parseYongsinMeta, stripYongsinMeta, getCachedYongsin, setCachedYongsin, type YongsinMeta } from '@/lib/saju-prompt-builder';
import type { UserData } from '@/lib/saju-prompt';
import { getRelevantRefs } from '@/lib/saju-ref-selector';
import { buildCompatPrompt } from '@/lib/compatibility-prompt-builder';
import { REL_TYPE_BY_IDX, type RelationType } from '@/lib/compatibility-analyzer';
import CompatV4Report, { type CompatV4ResultApi } from '@/components/CompatV4Report';
import PlaceSelect, { birthPlacePayloadPatch } from '@/components/PlaceSelect';
import CompatPreviewTeaser, { type CompatPreviewData } from '@/components/CompatPreviewTeaser';
import PersonalPreviewTeaser, { type PersonalPreviewData } from '@/components/PersonalPreviewTeaser';
import YearlyPreviewTeaser, { type YearlyPreviewData } from '@/components/YearlyPreviewTeaser';
import { resolveBirthTimeFields, pregnancyMomBirthTimeFields } from '@/lib/birthTimePayload';
import type { BirthInput as CompatBirthInputV4 } from '@/domain/saju/calendar/normalizeBirthInput';
import type { RelationshipType as RelationshipTypeV4 } from '@/domain/saju/compatibility/compatibilityTypes';
import PregnancyNarrativeReport from '@/components/PregnancyNarrativeReport';
import { lunarToSolar } from '@/lib/lunar-solar';
import { t, Lang, getTodayHeroLine } from '@/lib/i18n';
import { saveReadingToSession, loadReadingFromSession, clearReadingFromSession } from '@/lib/reading-storage';
import { generateOrderId } from '@/lib/payment-config';
import { formatLLMText } from '@/lib/format-llm';
import Footer from '@/components/ui/Footer';
import { SectionExplainer, getShinsalExplanation, getSingangExplanation, getOhInterpretation, UNSUNG_EXPLAIN } from '@/components/ui/TermExplainer';
import ConsentModal from '@/components/ui/ConsentModal';
import OhaengChart from '@/components/ui/OhaengChart';
import PillarDisplay, { type Pillar } from '@/components/ui/PillarDisplay';
import { BleedCard, FeatureCard } from '@/components/orot';
import { SajuV4Report, type SajuV4ApiResponse as _SajuV4ApiResponseType } from '@/components/SajuV4Report';
import { parseSajuReport } from '@/lib/saju-v4-report-parser';
// Y9: 올해운세 V4 컴포넌트 — NEXT_PUBLIC_YEARLY_FORTUNE_UI_ENABLED==='true'일 때만 렌더.
import YearlyV4Report, { type YearlyV4Input } from '@/components/YearlyV4Report';
// Phase 6: 궁합 줄글(narrative) V4 — NEXT_PUBLIC_COMPAT_NARRATIVE_UI_ENABLED==='true'일 때만 렌더.
import CompatNarrativeReport from '@/components/CompatNarrativeReport';

/* ===== Stars Background - SVG Star Illustrations ===== */
const STAR_COLORS = ['#F0C75E', '#FFD080', '#FF6B9D', '#7DD3FC', '#C4B5FD', '#6EE7B7', '#FF8A8A', '#FFF0C8'];

interface StarElement {
  type: string;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  delay: number;
  duration: number;
  opacity: number;
}

function star4Path(s: number): string {
  const h = s / 2;
  const n = s * 0.15;
  return 'M' + h + ',0 L' + (h + n) + ',' + (h - n) + ' L' + s + ',' + h + ' L' + (h + n) + ',' + (h + n) + ' L' + h + ',' + s + ' L' + (h - n) + ',' + (h + n) + ' L0,' + h + ' L' + (h - n) + ',' + (h - n) + 'Z';
}

function star5Path(s: number): string {
  let path = '';
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * Math.PI / 180;
    const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
    const ox = s / 2 + s / 2 * Math.cos(outerAngle);
    const oy = s / 2 + s / 2 * Math.sin(outerAngle);
    const ix = s / 2 + s / 5 * Math.cos(innerAngle);
    const iy = s / 2 + s / 5 * Math.sin(innerAngle);
    path += (i === 0 ? 'M' : 'L') + ox.toFixed(1) + ',' + oy.toFixed(1) + ' L' + ix.toFixed(1) + ',' + iy.toFixed(1) + ' ';
  }
  return path + 'Z';
}

function star6Path(s: number): string {
  let path = '';
  for (let i = 0; i < 6; i++) {
    const outerAngle = (i * 60 - 90) * Math.PI / 180;
    const innerAngle = ((i * 60) + 30 - 90) * Math.PI / 180;
    const ox = s / 2 + s / 2 * Math.cos(outerAngle);
    const oy = s / 2 + s / 2 * Math.sin(outerAngle);
    const ix = s / 2 + s / 4 * Math.cos(innerAngle);
    const iy = s / 2 + s / 4 * Math.sin(innerAngle);
    path += (i === 0 ? 'M' : 'L') + ox.toFixed(1) + ',' + oy.toFixed(1) + ' L' + ix.toFixed(1) + ',' + iy.toFixed(1) + ' ';
  }
  return path + 'Z';
}

function star8Path(s: number): string {
  let path = '';
  for (let i = 0; i < 8; i++) {
    const outerAngle = (i * 45 - 90) * Math.PI / 180;
    const innerAngle = ((i * 45) + 22.5 - 90) * Math.PI / 180;
    const ox = s / 2 + s / 2 * Math.cos(outerAngle);
    const oy = s / 2 + s / 2 * Math.sin(outerAngle);
    const ix = s / 2 + s / 5 * Math.cos(innerAngle);
    const iy = s / 2 + s / 5 * Math.sin(innerAngle);
    path += (i === 0 ? 'M' : 'L') + ox.toFixed(1) + ',' + oy.toFixed(1) + ' L' + ix.toFixed(1) + ',' + iy.toFixed(1) + ' ';
  }
  return path + 'Z';
}

function getStarPath(type: string, size: number): string {
  if (type === 'star4' || type === 'sparkle4') return star4Path(size);
  if (type === 'star5') return star5Path(size);
  if (type === 'star6') return star6Path(size);
  return star8Path(size);
}

const StarsBackground = React.memo(function StarsBackground() {
  const [elements, setElements] = useState<StarElement[]>([]);

  useEffect(() => {
    const items: StarElement[] = [];

    // Big decorative stars (10 of them)
    for (let i = 0; i < 10; i++) {
      const types = ['star4', 'star6', 'star8', 'star5'];
      items.push({
        type: types[Math.floor(Math.random() * types.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 30 + Math.random() * 50,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        rotation: Math.random() * 360,
        delay: Math.random() * 5,
        duration: 6 + Math.random() * 8,
        opacity: 0.08 + Math.random() * 0.12,
      });
    }

    // Small sparkle dots (40 of them)
    for (let i = 0; i < 40; i++) {
      items.push({
        type: 'dot',
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 4,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        rotation: 0,
        delay: Math.random() * 4,
        duration: 3 + Math.random() * 4,
        opacity: 0.2 + Math.random() * 0.5,
      });
    }

    // Medium 4-pointed sparkles (15 of them)
    for (let i = 0; i < 15; i++) {
      items.push({
        type: 'sparkle4',
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 8 + Math.random() * 16,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        rotation: Math.random() * 45,
        delay: Math.random() * 6,
        duration: 4 + Math.random() * 6,
        opacity: 0.12 + Math.random() * 0.2,
      });
    }

    setElements(items);
  }, []);

  return (
    <div aria-hidden="true" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {elements.map((el, i) => {
        if (el.type === 'dot') {
          return (
            <div key={i} style={{
              position: 'absolute',
              left: el.x + '%',
              top: el.y + '%',
              width: el.size + 'px',
              height: el.size + 'px',
              borderRadius: '50%',
              background: el.color,
              opacity: el.opacity,
              boxShadow: '0 0 ' + (el.size * 2) + 'px ' + el.size + 'px ' + el.color + '40',
              animation: 'twinkle ' + el.duration + 's ease-in-out ' + el.delay + 's infinite',
            }} />
          );
        }

        const path = getStarPath(el.type, el.size);

        return (
          <div key={i} style={{
            position: 'absolute',
            left: el.x + '%',
            top: el.y + '%',
            width: el.size + 'px',
            height: el.size + 'px',
            opacity: el.opacity,
            transform: 'rotate(' + el.rotation + 'deg)',
            animation: 'floatStar ' + el.duration + 's ease-in-out ' + el.delay + 's infinite',
            filter: 'drop-shadow(0 0 ' + (el.size * 0.3) + 'px ' + el.color + '60)',
          }}>
            <svg viewBox={'0 0 ' + el.size + ' ' + el.size} width={el.size} height={el.size}>
              <path d={path} fill={el.color} />
            </svg>
          </div>
        );
      })}
    </div>
  );
});

/* ===== Helper Data ===== */
const TIMES = [
  { h: 0, hanja: '子시', hangul: '(자시)', range: '23:00~01:00' },
  { h: 1, hanja: '丑시', hangul: '(축시)', range: '01:00~03:00' },
  { h: 2, hanja: '寅시', hangul: '(인시)', range: '03:00~05:00' },
  { h: 3, hanja: '卯시', hangul: '(묘시)', range: '05:00~07:00' },
  { h: 4, hanja: '辰시', hangul: '(진시)', range: '07:00~09:00' },
  { h: 5, hanja: '巳시', hangul: '(사시)', range: '09:00~11:00' },
  { h: 6, hanja: '午시', hangul: '(오시)', range: '11:00~13:00' },
  { h: 7, hanja: '未시', hangul: '(미시)', range: '13:00~15:00' },
  { h: 8, hanja: '申시', hangul: '(신시)', range: '15:00~17:00' },
  { h: 9, hanja: '酉시', hangul: '(유시)', range: '17:00~19:00' },
  { h: 10, hanja: '戌시', hangul: '(술시)', range: '19:00~21:00' },
  { h: 11, hanja: '亥시', hangul: '(해시)', range: '21:00~23:00' },
];

const TIME_I18N_KEYS = ['timeJa','timeChuk','timeIn','timeMyo','timeJin','timeSa','timeO','timeMi','timeSin','timeYu','timeSul','timeHae'];

function getElemColor(oh: string): string {
  const c: Record<string, string> = { '목': '#81C784', '화': '#EF5350', '토': '#FFD54F', '금': '#E0E0E0', '수': '#64B5F6' };
  return c[oh] || '#E0E0E0';
}

function getElemClass(oh: string): string {
  return OH_EN[oh] || 'earth';
}

const OH_EN_CAP: Record<string, string> = {'목':'Wood','화':'Fire','토':'Earth','금':'Metal','수':'Water'};

/* ===== Saved Profile System ===== */
interface SavedProfile {
  name: string;
  gender: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  /** precision-v1 출생지역 id. 미선택이면 생략. */
  birthPlaceId?: string;
  concern: number;
  state: number;
  personality: number[];
  relationship: number;
  wantToKnow: number;
  // v4 컨텍스트 — V4 모드에서 저장 시에만 채워짐. 로드 시 V4면 이걸로 v4Ctx 복원.
  v4?: {
    relationshipStatus: 'single' | 'dating' | 'married' | 'divorced' | 'widowed' | 'unknown';
    hasChildren: 'true' | 'false' | 'unknown';
    occupation: string;
    concerns: Array<'career' | 'money' | 'relationship' | 'marriage' | 'family' | 'health' | 'study' | 'business' | 'personality' | 'future'>;
  };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/* ===== Main Component ===== */
export interface SajuAppProps {
  /** 'v4' = saju mode에서 v4 명리 엔진·차별화 4섹션·새 질문 사용. default 'v3'. */
  version?: 'v3' | 'v4';
}

export default function SajuApp({ version = 'v3' }: SajuAppProps = {}) {
  // saju mode에서 v4 분기 활성화 여부
  const isV4 = version === 'v4';
  void isV4; // Step 2/3에서 질문·fetch·결과 분기에 사용 예정
  const [lang, setLang] = useState<Lang>('ko');
  const [currentScreen, setCurrentScreen] = useState(0);

  /* PWA service worker — register self-destruct sw.js + 안전망으로 모든 SW unregister.
     이전 sw.js 캐싱 버그로 옛 번들이 박혀 있던 사용자도 sw.js 받자마자 자가 unregister 됨. */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    (async () => {
      try {
        // register는 새 sw.js를 가져오게 함 — 새 sw.js가 self-destruct
        await navigator.serviceWorker.register('/sw.js').catch(() => {});
        // 안전망: 어떤 이유로 새 sw.js가 활성화 안 되었더라도 클라이언트 측에서 모두 unregister
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister().catch(() => false)));
        // 모든 캐시도 비우기
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k).catch(() => false)));
        }
      } catch { /* swallow */ }
    })();
  }, []);

  /* Privacy consent */
  const [storageConsent, setStorageConsent] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
    try {
      if (localStorage.getItem('saju-storage-consent') === 'yes') {
        setStorageConsent(true);
      }
    } catch { /* Private browsing or restricted WebView */ }
  }, []);
  const [appMode, setAppMode] = useState<'saju' | 'compat' | 'pregnancy' | 'yearly'>('saju');
  const [userData, setUserData] = useState<UserData>({
    name: '', gender: 'm',
    year: 1995, month: 1, day: 1,
    hour: -1,
    concern: 0, state: 0,
    personality: [0, 0, 0],
    relationship: 0, wantToKnow: 0
  });
  const [sajuResult, setSajuResult] = useState<SajuResult | null>(null);
  const [aiText, setAiText] = useState('');
  const [llmYongsin, setLlmYongsin] = useState<YongsinMeta | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [readingSaveStatus, setReadingSaveStatus] = useState<'saving' | 'saved' | 'failed' | null>(null);
  const [pendingPersist, setPendingPersist] = useState<{ readingCode: string; orderId: string; body: object } | null>(null);
  const [questionStep, setQuestionStep] = useState(0);
  const [teaserUnlocked, setTeaserUnlocked] = useState(false);
  const [compatUnlocked, setCompatUnlocked] = useState(false);
  const [isLunar, setIsLunar] = useState(false);

  // ── v4 전용 컨텍스트 (saju mode + version='v4'일 때만 사용) ──
  type V4RelStatus = 'single' | 'dating' | 'married' | 'divorced' | 'widowed' | 'unknown';
  type V4HasChildren = 'true' | 'false' | 'unknown';
  type V4Concern = 'career' | 'money' | 'relationship' | 'marriage' | 'family' | 'health' | 'study' | 'business' | 'personality' | 'future';
  const [v4Ctx, setV4Ctx] = useState<{
    relationshipStatus: V4RelStatus;
    hasChildren: V4HasChildren;
    occupation: string;
    concerns: V4Concern[];
  }>({ relationshipStatus: 'unknown', hasChildren: 'unknown', occupation: '', concerns: [] });
  const updateV4Ctx = <K extends keyof typeof v4Ctx>(k: K, v: typeof v4Ctx[K]) => setV4Ctx(c => ({ ...c, [k]: v }));
  const toggleV4Concern = (c: V4Concern) => setV4Ctx(prev => ({
    ...prev, concerns: prev.concerns.includes(c) ? prev.concerns.filter(x => x !== c) : [...prev.concerns, c],
  }));
  // v4 API 응답
  type V4ApiResp = import('./SajuV4Report').SajuV4ApiResponse;
  const [v4Resp, setV4Resp] = useState<V4ApiResp | null>(null);

  /* Refs for cleanup on navigation */
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /* Restore reading after payment return */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnOrderId = params.get('returnOrderId');
    const readingCode = params.get('readingCode');
    if (!returnOrderId) return;

    function restoreFromData(saved: { userData?: unknown; sajuResult?: unknown; aiText?: string; appMode?: string }) {
      if (saved.userData) setUserData(saved.userData as UserData);
      if (saved.sajuResult) setSajuResult(saved.sajuResult as SajuResult);
      if (saved.aiText) setAiText(saved.aiText);
      if (saved.appMode) setAppMode(saved.appMode as 'saju' | 'compat' | 'pregnancy' | 'yearly');
      setTeaserUnlocked(true);
      if (saved.appMode === 'compat') setCompatUnlocked(true);
      setCurrentScreen(saved.appMode === 'yearly' ? 7 : saved.appMode === 'compat' ? 5 : 4);
      clearReadingFromSession();
      // Persist reading to DB for permanent retrieval via reading code
      if (readingCode && saved.aiText) {
        const body = {
          readingCode,
          orderId: returnOrderId,
          type: saved.appMode === 'yearly' ? 'yearly' : 'saju',
          inputData: saved.userData ?? null,
          chartData: saved.sajuResult ?? null,
          resultText: saved.aiText,
          lang: 'ko',
        };
        setPendingPersist({ readingCode, orderId: returnOrderId, body });
      }
      window.history.replaceState({}, '', '/');
    }

    // Fast path: sessionStorage (works on most browsers)
    const saved = loadReadingFromSession();
    if (saved) {
      restoreFromData(saved);
      return;
    }

    // Fallback: server-side pending reading (Safari ITP / cross-origin redirect)
    fetch('/api/readings?orderId=' + encodeURIComponent(returnOrderId))
      .then(res => res.json())
      .then((data: { success: boolean; reading?: { inputData?: unknown; chartData?: unknown; resultText?: string; type?: string } }) => {
        if (data.success && data.reading) {
          const r = data.reading;
          restoreFromData({
            userData: r.inputData,
            sajuResult: r.chartData,
            aiText: r.resultText,
            appMode: r.type,
          });
        } else {
          // Both paths failed — return to intro screen
          setCurrentScreen(0);
          window.history.replaceState({}, '', '/');
        }
      })
      .catch(() => {
        setCurrentScreen(0);
        window.history.replaceState({}, '', '/');
      });
  }, []);

  /* Persist reading with retry logic */
  useEffect(() => {
    if (!pendingPersist) return;
    let cancelled = false;

    async function persistReading() {
      setReadingSaveStatus('saving');
      const delays = [1000, 2000, 4000];
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          const res = await fetch('/api/readings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingPersist!.body),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          if (!cancelled) {
            setReadingSaveStatus('saved');
            setTimeout(() => setReadingSaveStatus(null), 3000);
          }
          return;
        } catch (err) {
          console.error(`[SajuApp] persist attempt ${attempt + 1} failed:`, err);
          if (attempt < delays.length) {
            await new Promise(r => setTimeout(r, delays[attempt]));
          }
        }
      }
      if (!cancelled) setReadingSaveStatus('failed');
    }

    persistReading();
    return () => { cancelled = true; };
  }, [pendingPersist]);

  /* Exact birth time */
  const [useExactTime, setUseExactTime] = useState(false);
  const [exactHour, setExactHour] = useState(-1);
  const [exactMinute, setExactMinute] = useState(0);

  /* Precision V1 (P7) — 출생지역. '' = 지역 모름. flag off면 UI 미노출 + payload 미포함. */
  const [birthPlaceId, setBirthPlaceId] = useState<string>('');

  /**
   * Maps exact birth time to 시주 branch index (0-11).
   * Standard Korean 만세력 convention: each 시 is exactly 2 hours.
   * 자시 23:00-00:59, 축시 01:00-02:59, 인시 03:00-04:59, ...
   * 해시 21:00-22:59.
   */
  function exactTimeToSiju(h: number, m: number): number {
    const total = h * 60 + m;
    if (total >= 1380 || total < 60) return 0;   // 자시 23:00-00:59
    if (total < 180) return 1;                     // 축시 01:00-02:59
    if (total < 300) return 2;                     // 인시 03:00-04:59
    if (total < 420) return 3;                     // 묘시 05:00-06:59
    if (total < 540) return 4;                     // 진시 07:00-08:59
    if (total < 660) return 5;                     // 사시 09:00-10:59
    if (total < 780) return 6;                     // 오시 11:00-12:59
    if (total < 900) return 7;                     // 미시 13:00-14:59
    if (total < 1020) return 8;                    // 신시 15:00-16:59
    if (total < 1140) return 9;                    // 유시 17:00-18:59
    if (total < 1260) return 10;                   // 술시 19:00-20:59
    return 11;                                      // 해시 21:00-22:59
  }

  /* Star balance system - free 10 stars on first visit */
  const [starBalance, setStarBalance] = useState(0);
  const [compatPaywall, setCompatPaywall] = useState(false);
  // 궁합 결제 전 미리보기(결정론 bundle) — GPT 없음. paywall 열릴 때 /api/compat-v4/preview로 1회 fetch.
  const [compatPreview, setCompatPreview] = useState<CompatPreviewData | null>(null);
  const [compatPreviewLoading, setCompatPreviewLoading] = useState(false);
  // 올해운세 결제 전 미리보기(결정론). teaser(screen 8) 진입 시 /api/yearly-fortune/preview로 1회 fetch.
  const [yearlyPreview, setYearlyPreview] = useState<YearlyPreviewData | null>(null);
  const [yearlyPreviewLoading, setYearlyPreviewLoading] = useState(false);
  useEffect(() => {
    if (!storageConsent) return;
    try {
      const saved = localStorage.getItem('saju-stars');
      if (saved !== null) {
        setStarBalance(parseInt(saved) || 0);
      } else {
        setStarBalance(10);
        localStorage.setItem('saju-stars', '10');
      }
    } catch { /* private browsing / storage restricted */ }
  }, [storageConsent]);
  function updateStarBalance(newBalance: number) {
    setStarBalance(newBalance);
    safeSetItem('saju-stars', String(newBalance));
  }

  // 인앱 토스트 — 네이티브 alert() 대체. 2.6초 후 자동 소멸.
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, kind: 'success' | 'error' = 'success') => setToast({ msg, kind });
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);


  /* Compat state */
  const [compatPerson1, setCompatPerson1] = useState<{ name: string; year: number; month: number; day: number; hour: number; isLunar: boolean; gender: 'm' | 'f' | '' }>({ name: '', year: 1995, month: 1, day: 1, hour: -1, isLunar: false, gender: '' });
  const [compatPerson2, setCompatPerson2] = useState<{ name: string; year: number; month: number; day: number; hour: number; isLunar: boolean; gender: 'm' | 'f' | '' }>({ name: '', year: 1995, month: 1, day: 1, hour: -1, isLunar: false, gender: '' });
  const [compatExact1, setCompatExact1] = useState({ use: false, hour: -1, min: 0 });
  const [compatExact2, setCompatExact2] = useState({ use: false, hour: -1, min: 0 });
  // P7.3: 궁합 A/B 출생지역. '' = 지역 모름. flag off면 미사용 + payload/compatKey 무변경.
  const [compatPlaceId1, setCompatPlaceId1] = useState<string>('');
  const [compatPlaceId2, setCompatPlaceId2] = useState<string>('');

  /* Pregnancy state */
  const [pregData, setPregData] = useState({ name: '', year: 1995, month: 1, day: 1, hour: -1, dueYear: new Date().getFullYear(), dueMonth: 1, dueDay: 1 });

  /* Profile system state */
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [showSavedResults, setShowSavedResults] = useState(false);
  useEffect(() => {
    if (!storageConsent) return;
    try {
      const saved = localStorage.getItem('saju-profiles');
      if (saved) { setProfiles(JSON.parse(saved)); }
    } catch { /* private browsing / corrupted data */ }
  }, [storageConsent]);

  const updateUser = useCallback((field: string, value: unknown) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  }, []);

  /* Saved results loaded from localStorage */
  const [savedResults, setSavedResults] = useState<{name: string; date: string; type: string; text: string}[]>([]);
  useEffect(() => {
    try { setSavedResults(JSON.parse(localStorage.getItem('saju-saved-results') || '[]')); } catch { /* ignore */ }
  }, [currentScreen]);

  /* Clamp day when month/year changes */
  useEffect(() => {
    const max = getDaysInMonth(userData.year, userData.month);
    if (userData.day > max) updateUser('day', max);
  }, [userData.year, userData.month]);
  useEffect(() => {
    const max = getDaysInMonth(compatPerson1.year, compatPerson1.month);
    if (compatPerson1.day > max) setCompatPerson1(p => ({ ...p, day: max }));
  }, [compatPerson1.year, compatPerson1.month]);
  useEffect(() => {
    const max = getDaysInMonth(compatPerson2.year, compatPerson2.month);
    if (compatPerson2.day > max) setCompatPerson2(p => ({ ...p, day: max }));
  }, [compatPerson2.year, compatPerson2.month]);
  useEffect(() => {
    const max = getDaysInMonth(pregData.year, pregData.month);
    if (pregData.day > max) setPregData(p => ({ ...p, day: max }));
  }, [pregData.year, pregData.month]);
  useEffect(() => {
    const max = getDaysInMonth(pregData.dueYear, pregData.dueMonth);
    if (pregData.dueDay > max) setPregData(p => ({ ...p, dueDay: max }));
  }, [pregData.dueYear, pregData.dueMonth]);

  function saveProfiles(updated: SavedProfile[]) {
    setProfiles(updated);
    safeSetItem('saju-profiles', JSON.stringify(updated));
  }

  const [loadingProgress, setLoadingProgress] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [aiTextTranslated, setAiTextTranslated] = useState(false);
  const [compatAiTranslated, setCompatAiTranslated] = useState(false);
  const [pregAiTranslated, setPregAiTranslated] = useState(false);

  /* Loading screen state */
  const [loadingStep, setLoadingStep] = useState(0);
  useEffect(() => {
    if (currentScreen !== 3) return;
    setLoadingStep(0);
    const t1 = setTimeout(() => setLoadingStep(1), 900);
    const t2 = setTimeout(() => setLoadingStep(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [currentScreen]);

  /* Accessibility: scroll to top and move focus on screen transitions */
  useEffect(() => {
    window.scrollTo(0, 0);
    const heading = document.querySelector('h1, h2, [role="heading"]') as HTMLElement | null;
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, [currentScreen]);

  /* Compat analysis state */
  const [compatResult, setCompatResult] = useState<{ html: string } | null>(null);
  const [compatAiText, setCompatAiText] = useState('');
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatRelType, setCompatRelType] = useState(0); // 0=연애, 1=혼인, 2=우정, 3=동료, 4=재회/이별, 5=짝사랑/썸
  const [compatV4Resp, setCompatV4Resp] = useState<CompatV4ResultApi | null>(null);
  // Phase 6.5: 궁합 줄글(narrative) V4 UI — flag ON일 때 제출 신호. true가 되면 renderCompat가
  // 기존 /api/compat-v4 카드 경로를 건너뛰고 CompatNarrativeReport(자체 /api/compat-narrative fetch)만 렌더.
  const [compatNarrativeRequested, setCompatNarrativeRequested] = useState(false);

  // Reset compat results when inputs change (requires re-payment)
  function resetCompatResult() {
    if (compatResult || compatAiText || compatV4Resp || compatNarrativeRequested) {
      setCompatResult(null);
      setCompatAiText('');
      setCompatV4Resp(null);
      setCompatNarrativeRequested(false);
      setCompatPaywall(false);
    }
  }
  // Auto-reset when person info or relationship type changes (useEffect to avoid render-time setState)
  const compatKey = [compatPerson1.name, compatPerson1.year, compatPerson1.month, compatPerson1.day, compatPerson1.hour, compatPerson1.isLunar,
    compatPerson2.name, compatPerson2.year, compatPerson2.month, compatPerson2.day, compatPerson2.hour, compatPerson2.isLunar, compatRelType].join('|')
    // P7.3: flag on일 때만 placeId를 키에 반영(지역 변경 시 결과 재생성). flag off면 suffix '' → 기존 키와 byte-identical.
    // (SAJU_PRECISION_INPUTS_ENABLED const는 이 지점보다 뒤에 선언되어 TDZ가 되므로 env를 직접 읽는다.)
    + (process.env.NEXT_PUBLIC_SAJU_PRECISION_INPUTS_ENABLED === 'true' ? `|${compatPlaceId1}|${compatPlaceId2}` : '');
  useEffect(() => {
    resetCompatResult();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compatKey]);

  // 궁합 paywall이 열리면 결정론 미리보기(GPT 없음)를 1회 가져온다. narrative UI 경로에서만.
  useEffect(() => {
    if (!compatPaywall) return;
    if (process.env.NEXT_PUBLIC_COMPAT_NARRATIVE_UI_ENABLED !== 'true' || appMode !== 'compat') return;
    const typeArr = ['dating', 'married', 'friendship', 'coworker', 'reunion_or_breakup', 'crush_or_something'] as const;
    const relType = typeArr[compatRelType] || 'dating';
    const precision = process.env.NEXT_PUBLIC_SAJU_PRECISION_INPUTS_ENABLED === 'true';
    const pad = (n: number) => String(n).padStart(2, '0');
    const mk = (p: typeof compatPerson1, exact: typeof compatExact1, placeId: string, fb: string) => ({
      name: p.name || fb,
      gender: p.gender === 'm' ? 'male' : p.gender === 'f' ? 'female' : 'unknown',
      calendarType: p.isLunar ? 'lunar' : 'solar',
      birthDate: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
      ...resolveBirthTimeFields({ sijuIndex: p.hour, exact }),
      timezone: 'Asia/Seoul',
      ...birthPlacePayloadPatch(precision, placeId),
    });
    const inputA = mk(compatPerson1, compatExact1, compatPlaceId1, lang === 'en' ? 'Person 1' : '첫 번째');
    const inputB = mk(compatPerson2, compatExact2, compatPlaceId2, lang === 'en' ? 'Partner' : '상대');
    let aborted = false;
    setCompatPreview(null);
    setCompatPreviewLoading(true);
    fetch('/api/compat-v4/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputA, inputB, relationshipType: relType }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!aborted) { setCompatPreview(d as CompatPreviewData | null); setCompatPreviewLoading(false); } })
      .catch(() => { if (!aborted) setCompatPreviewLoading(false); });
    return () => { aborted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compatPaywall, compatKey]);

  // 올해운세 teaser(screen 8) 진입 시 결정론 미리보기를 1회 가져온다. V4 UI 경로에서만.
  useEffect(() => {
    if (currentScreen !== 8 || appMode !== 'yearly') return;
    if (process.env.NEXT_PUBLIC_YEARLY_FORTUNE_UI_ENABLED !== 'true') return;
    const precision = process.env.NEXT_PUBLIC_SAJU_PRECISION_INPUTS_ENABLED === 'true';
    const { birthTime, birthTimeConfidence } = resolveBirthTimeFields({
      sijuIndex: userData.hour, exact: { use: useExactTime, hour: exactHour, min: exactMinute },
    });
    const input = {
      birth: {
        name: userData.name || '익명',
        gender: userData.gender === 'm' ? 'male' : userData.gender === 'f' ? 'female' : 'unknown',
        calendarType: isLunar ? 'lunar' : 'solar',
        birthDate: `${userData.year}-${String(userData.month).padStart(2, '0')}-${String(userData.day).padStart(2, '0')}`,
        birthTime, birthTimeConfidence, timezone: 'Asia/Seoul',
        ...birthPlacePayloadPatch(precision, birthPlaceId),
      },
      currentDate: new Date().toISOString().slice(0, 10),
    };
    let aborted = false;
    setYearlyPreview(null);
    setYearlyPreviewLoading(true);
    fetch('/api/yearly-fortune/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!aborted) { setYearlyPreview(d as YearlyPreviewData | null); setYearlyPreviewLoading(false); } })
      .catch(() => { if (!aborted) setYearlyPreviewLoading(false); });
    return () => { aborted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, appMode]);
  const [pregResult, setPregResult] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  // 임산부 narrative V4 — flag on일 때만 새 경로(기존 /api/saju·점수카드 미사용). 기본 off → 기존 모드 그대로.
  const PREGNANCY_NARRATIVE_UI_ENABLED = process.env.NEXT_PUBLIC_PREGNANCY_NARRATIVE_UI_ENABLED === 'true';
  // Precision V1 (P7) — 출생지역 입력 UI. flag off(기본) → 기존 입력 폼/페이로드 그대로(byte-identical).
  const SAJU_PRECISION_INPUTS_ENABLED = process.env.NEXT_PUBLIC_SAJU_PRECISION_INPUTS_ENABLED === 'true';
  // Y9: 올해운세 V4 입력/결과 흐름 게이트. on이면 v3 질문/fetchYearlyReading(/api/saju) 우회 → teaser→YearlyV4Report.
  const YEARLY_FORTUNE_UI_ENABLED = process.env.NEXT_PUBLIC_YEARLY_FORTUNE_UI_ENABLED === 'true';
  // 오늘의 별빛(Daily Fortune) — 기본 ON. 홈 '오늘의 흐름' 히어로가 /daily-fortune로 진입.
  // 끄려면 NEXT_PUBLIC_SAJU_DAILY_FORTUNE_UI_ENABLED='false'. (런칭 전 기본 OFF였음.)
  const DAILY_FORTUNE_UI_ENABLED = process.env.NEXT_PUBLIC_SAJU_DAILY_FORTUNE_UI_ENABLED !== 'false';
  const [pregNarrativeRequested, setPregNarrativeRequested] = useState(false);
  // P7.4-fix: 엄마(실제 출생자) 정확입력(시/분) 상태 — 개인사주/궁합과 동일 정책. 아기 예정시간은 V1에서 제거.
  const [pregMomExact, setPregMomExact] = useState({ use: false, hour: -1, min: 0 });
  // P7.4: 임산부 엄마 출생지역. '' = 지역 모름. 아기 예정엔 미적용. flag off면 미사용 + payload 무변경.
  const [pregMomPlaceId, setPregMomPlaceId] = useState<string>('');

  function safeSetItem(key: string, value: string) {
    if (storageConsent) localStorage.setItem(key, value);
  }

  const [isSharingLink, setIsSharingLink] = useState(false);

  async function shareLink(text: string, title: string, chartDataOverride?: unknown) {
    if (!text || isSharingLink) return;
    setIsSharingLink(true);
    try {
      const chartData = chartDataOverride || (sajuResult ? { saju: sajuResult, user: { name: userData.name, year: userData.year, month: userData.month, day: userData.day, gender: userData.gender, concern: userData.concern, state: userData.state } } : null);
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title, lang, chartData }),
      });
      if (!res.ok) throw new Error('share api failed');
      const { slug } = await res.json();
      const url = window.location.origin + '/share?code=' + slug;

      // 모바일: Web Share API
      if (navigator.share) {
        try { await navigator.share({ title, url }); setIsSharingLink(false); return; }
        catch { /* 사용자 취소 시 클립보드 fallback */ }
      }
      // 클립보드 복사
      try {
        await navigator.clipboard.writeText(url);
        showToast(lang === 'en' ? 'Link copied! 🔗' : '공유 링크를 복사했어요 🔗');
      } catch {
        prompt(lang === 'en' ? 'Copy this link:' : '이 링크를 복사해줘:', url);
      }
    } catch (err) {
      console.error('[shareLink]', err);
      showToast(lang === 'en' ? 'Failed to create share link.' : '공유 링크 생성에 실패했어요.', 'error');
    }
    setIsSharingLink(false);
  }

  function renderTOC(text: string) {
    // 모든 ##N.제목## 매치를 찾아 시작·끝 위치를 기록
    const matches: { num: number; title: string; start: number; end: number }[] = [];
    const regex = /##\s*(\d+)\.\s*([^#\n]+?)##/g;
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.push({
        num: parseInt(m[1]),
        title: m[2].trim(),
        start: m.index,
        end: m.index + m[0].length,
      });
    }
    if (matches.length < 2) return null;
    // 각 섹션의 본문 추출 (현재 헤더 끝 ~ 다음 헤더 시작)
    const sections = matches.map((cur, i) => ({
      num: cur.num,
      title: cur.title,
      body: text.slice(cur.end, i + 1 < matches.length ? matches[i + 1].start : text.length).trim(),
    }));
    const tocIcons: Record<number, string> = { 1:'🪞',2:'🗺️',3:'💰',4:'💕',5:'🎯',6:'👥',7:'👨‍👩‍👧',8:'🏥',9:'📍',10:'🍀',11:'💌',12:'💌' };
    // night-sky 악센트 팔레트 — 섹션 번호로 로테이션(SajuV4Report SECTION_ACCENTS 톤과 동일 계열).
    const tocAccents = ['var(--orot-coral)', '#b9a7ef', '#7fc6c0', '#d3b87a', '#9cc99a', '#e899ad', '#8aa1c4', 'var(--primary, #f0c75e)'];
    // collapsed 상태에서 보여줄 한 줄 티저 — 마크다운 헤더/불릿/별표 제거 후 첫 문장.
    const tocTeaser = (body: string, maxLen = 60): string => {
      const first = body
        .split('\n')
        .map(l => l.trim())
        .find(l => l && !/^#{1,4}\s/.test(l) && !/^[-*]\s/.test(l) && !/^##/.test(l));
      if (!first) return '';
      const clean = first.replace(/[*#`]/g, '').trim();
      return clean.length > maxLen ? clean.slice(0, maxLen).trimEnd() + '…' : clean;
    };
    return (
      <div style={{ marginBottom: '16px' }}>
        <div className="sv4-eyebrow" style={{ color: 'var(--orot-coral)', marginBottom: '10px' }}>
          <span aria-hidden>✦</span>
          <span>{lang === 'en' ? 'Table of Contents' : '목차 · 탭하면 펼쳐져요'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sections.map((s, i) => {
            const isExpanded = expandedSections.has(s.num);
            const accent = tocAccents[(s.num - 1) % tocAccents.length] || tocAccents[i % tocAccents.length];
            const teaser = tocTeaser(s.body);
            return (
              <React.Fragment key={s.num}>
                {i > 0 && (
                  <div className="sv4-divider" aria-hidden style={{ margin: '6px 0' }}>
                    <span className="sv4-divider-line" />
                    <span className="sv4-divider-star">✦</span>
                    <span className="sv4-divider-line" />
                  </div>
                )}
                <div
                  className={'sv4-accordion sv4-reveal' + (isExpanded ? ' is-open' : '')}
                  style={{ ['--sv4-accent' as string]: accent } as React.CSSProperties}
                >
                  <button
                    className="sv4-accordion-trigger sv4-accordion-summary"
                    onClick={() => {
                      setExpandedSections(prev => {
                        const next = new Set(prev);
                        if (next.has(s.num)) next.delete(s.num); else next.add(s.num);
                        return next;
                      });
                    }}
                    aria-expanded={isExpanded}
                    aria-controls={'saju-sec-body-' + s.num}
                  >
                    <span className="sv4-accordion-icon" aria-hidden>{tocIcons[s.num] || '📌'}</span>
                    <span className="sv4-accordion-header">
                      <span className="sv4-accordion-eyebrow" style={{ color: accent }}>{lang === 'en' ? `Part ${s.num}` : `${s.num}장`}</span>
                      <span className="sv4-accordion-title" style={{ color: accent }}>{s.title}</span>
                      {!isExpanded && teaser && <span className="sv4-accordion-teaser">{teaser}</span>}
                    </span>
                    <span className="sv4-chevron" aria-hidden style={{ color: accent }}>▾</span>
                  </button>
                  {isExpanded && (
                    <div className="sv4-accordion-body" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                      <div
                        id={'saju-sec-body-' + s.num}
                        className="llm-text sv4-lead-body"
                        dangerouslySetInnerHTML={{ __html: formatLLMText(s.body, lang) }}
                      />
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }



  async function translateAiText(text: string, targetLang: 'en' | 'ko', setter: (t: string) => void) {
    if (!text || isTranslating) return;
    setIsTranslating(true);
    try {
      const translatePrompt = targetLang === 'en'
        ? 'Translate the following Korean Saju reading into natural, fluent English. Keep all section markers (##N.Title##) format intact but translate the titles too. Keep emojis. Maintain the warm casual tone. Do NOT add or remove content — translate faithfully:\n\n' + text
        : '다음 영어 사주 해설을 자연스럽고 유창한 한국어로 번역해줘. 섹션 마커(##N.제목##) 형식은 유지하되 제목도 한국어로. 이모지 유지. 따뜻한 반말 톤 유지. 내용을 추가하거나 빼지 마 — 충실하게 번역:\n\n' + text;
      const res = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: translatePrompt, lang: targetLang, maxTokens: 8000 })
      });
      if (!res.ok) throw new Error('Translation failed');
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let translated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        translated += decoder.decode(value, { stream: true });
        setter(translated);
      }
      setter(translated);
    } catch (err) {
      console.error('Translation error:', err);
    }
    setIsTranslating(false);
  }

  /* ===== 용신 계산 (억부 + 조후 + 통관 종합) ===== */
  function calcYongsin(sj: SajuResult): { yongsin: string; gisin: string; isStrong: boolean; type: string; johuYongsin: string; eokbuYongsin: string; eokbuType: string; season: string; isExtremeSeason: boolean; strengthPct: number; deukryung: boolean; tonggeunCount: number; bigyupCount: number } {
    const ds = sj.dStem;
    const dayOh = OH_CG[ds];
    const mBranchOh = OH_JJ[sj.mBranch];
    const sangSaeng: Record<string, string> = { '목':'수', '화':'목', '토':'화', '금':'토', '수':'금' };
    const ohGeuk: Record<string, string> = { '목':'금', '화':'수', '토':'목', '금':'화', '수':'토' };
    const ohSetgi: Record<string, string> = { '목':'화', '화':'토', '토':'금', '금':'수', '수':'목' };
    const ohJeGeuk: Record<string, string> = { '목':'토', '화':'금', '토':'수', '금':'목', '수':'화' };

    const deukryung = mBranchOh === dayOh || sangSaeng[dayOh] === mBranchOh;
    const allBranches = [sj.yBranch, sj.mBranch, sj.dBranch];
    if (sj.hBranch >= 0) allBranches.push(sj.hBranch);
    const tonggeunCount = allBranches.filter(b => OH_JJ[b] === dayOh).length;
    const allStems = [sj.yStem, sj.mStem, sj.dStem];
    if (sj.hStem >= 0) allStems.push(sj.hStem);
    const bigyupCount = allStems.filter(s => OH_CG[s] === dayOh).length;
    const totalSupport = (deukryung ? 2 : 0) + tonggeunCount + bigyupCount;
    const isStrong = totalSupport >= 4;
    const strengthPct = Math.min(100, Math.max(10, (totalSupport / 8) * 100));

    // 조후
    const seasonMonth = sj.mBranch;
    const seasonMap: Record<number, string> = { 0:'겨울',1:'겨울',2:'봄',3:'봄',4:'봄',5:'여름',6:'여름',7:'여름',8:'가을',9:'가을',10:'가을',11:'겨울' };
    const season = seasonMap[seasonMonth] || '';
    const johuTable: Record<string, Record<string, string>> = {
      '겨울': { '목':'화', '화':'목', '토':'화', '금':'화', '수':'화' },
      '여름': { '목':'수', '화':'수', '토':'수', '금':'수', '수':'금' },
      '봄':   { '목':'화', '화':'토', '토':'금', '금':'수', '수':'금' },
      '가을': { '목':'수', '화':'목', '토':'화', '금':'수', '수':'목' },
    };
    const johuYongsin = season && johuTable[season] ? johuTable[season][dayOh] : '';

    // 억부
    let eokbuYongsin = '';
    let eokbuType = '';
    if (isStrong) {
      const sipsungVals = Object.values(getSipsung(sj));
      const hasManyBigyup = sipsungVals.filter(v => v === '비견' || v === '겁재').length >= 2;
      const hasManyInsung = sipsungVals.filter(v => v === '정인' || v === '편인').length >= 2;
      if (hasManyBigyup) { eokbuYongsin = ohGeuk[dayOh]; eokbuType = '비겁이 많아 관성으로 제어'; }
      else if (hasManyInsung) { eokbuYongsin = ohJeGeuk[dayOh]; eokbuType = '인성이 많아 재성으로 균형'; }
      else { eokbuYongsin = ohSetgi[dayOh]; eokbuType = '설기로 에너지 발산'; }
    } else {
      eokbuYongsin = sangSaeng[dayOh];
      eokbuType = '인성으로 힘을 보충';
    }

    const isExtremeSeason = season === '겨울' || season === '여름';
    const yongsin = isExtremeSeason ? (johuYongsin || eokbuYongsin) : (eokbuYongsin || johuYongsin);
    const gisin = isStrong ? sangSaeng[dayOh] : ohGeuk[dayOh];

    return { yongsin, gisin, isStrong, type: isExtremeSeason ? '조후용신 (계절 균형)' : '억부용신 (' + eokbuType + ')', johuYongsin, eokbuYongsin, eokbuType, season, isExtremeSeason, strengthPct, deukryung, tonggeunCount, bigyupCount };
  }

  /* ===== AI Streaming ===== */
  async function fetchSajuReading(prompts: string[], signal?: AbortSignal) {
    setIsLoading(true);
    setIsGenerating(true);
    setGeneratingProgress(0);
    setAiText('');
    setLlmYongsin(null);
    let fullText = '';
    const decoder = new TextDecoder();

    try {
      for (let pi = 0; pi < prompts.length; pi++) {
        if (signal?.aborted) return;
        setGeneratingProgress(pi);
        setLoadingProgress(t('genAnalyzing', lang) + ' (' + (pi + 1) + t('genOf', lang) + prompts.length + ')');
        let partText = '';
        for (let retry = 0; retry < 3; retry++) {
          try {
            if (signal?.aborted) return;
            const res = await fetch('/api/saju', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: prompts[pi], lang }),
              signal,
            });
            if (!res.ok) {
              if (retry < 2) { await new Promise(r => setTimeout(r, 2000 * (retry + 1))); continue; }
              throw new Error('API error: ' + res.status);
            }
            if (!res.body) throw new Error('No response body');
            const reader = res.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              partText += decoder.decode(value, { stream: true });
            }
            break; // success
          } catch (retryErr) {
            if (signal?.aborted) return;
            if (retry < 2) { await new Promise(r => setTimeout(r, 2000 * (retry + 1))); continue; }
            throw retryErr;
          }
        }
        if (fullText && partText && !fullText.endsWith('\n')) fullText += '\n\n';
        fullText += partText;
      }
      // Parse yongsin meta + apply cache for consistency (same saju = same yongsin)
      try {
        const meta = parseYongsinMeta(fullText);
        if (meta && sajuResult) {
          const cached = getCachedYongsin(sajuResult);
          if (cached) {
            // 이미 캐시가 있으면 캐시값 사용 — 같은 사주 다시 풀어도 일관성 유지
            setLlmYongsin(cached);
            if (typeof console !== 'undefined' && console.info) {
              console.info('[yongsin] cache HIT:', cached.yongsin, '(LLM said:', meta.yongsin, ')');
            }
          } else {
            // 첫 풀이 — LLM 결과를 캐시에 저장
            setCachedYongsin(sajuResult, meta);
            setLlmYongsin(meta);
            if (typeof console !== 'undefined' && console.info) {
              console.info('[yongsin] cache MISS → saved:', meta.yongsin, '/ 기신:', meta.gisin, '/ 근거:', meta.reason);
            }
          }
        } else if (meta) {
          // sajuResult 없으면 캐싱만 스킵
          setLlmYongsin(meta);
        }
      } catch { /* graceful: yongsin parsing failure does not break body display */ }
      // Strip yongsin meta line from body so it's not shown to user
      fullText = stripYongsinMeta(fullText);

      // Detect stream error sentinel from server
      const STREAM_ERROR_SENTINEL = '[응답이 중단되었습니다. 다시 시도해 주세요.]';
      if (fullText.endsWith(STREAM_ERROR_SENTINEL)) {
        fullText = fullText.slice(0, -STREAM_ERROR_SENTINEL.length).trimEnd();
        if (!fullText) { setAiText(t('aiError', lang)); } else { setAiText(fullText + '\n\n⚠️ ' + (lang === 'en' ? 'Response was interrupted. Some content may be missing.' : '응답이 중단되었습니다. 일부 내용이 누락되었을 수 있습니다.')); }
      } else {
        setAiText(fullText);
      }
    } catch (err) {
      if (signal?.aborted) return;
      if (!fullText) {
        setAiText(t('aiError', lang));
      } else {
        setAiText(fullText);
      }
    }
    setLoadingProgress('');
    setIsGenerating(false);
    setIsLoading(false);
  }

  /* ===== v4 호출 — preview(즉시 명리 데이터) + report(GPT 해석) 두 단계
     2026-05: 저장 프로필 클릭 같은 비동기 진입점은 setUserData 직후 4.5s 뒤에
     이 함수를 호출하는데, 함수가 캡처한 userData가 stale일 수 있다(closure 시점).
     → 호출자가 v4Input을 직접 전달할 수 있도록 override 인자 추가. ===== */
  type V4InputShape = {
    name: string; gender: 'male' | 'female' | 'unknown';
    calendarType: 'lunar' | 'solar'; birthDate: string;
    birthTime: string | undefined;
    birthTimeConfidence: 'exact' | 'approximate' | 'unknown';
    timezone: 'Asia/Seoul'; relationshipStatus: typeof v4Ctx.relationshipStatus;
    hasChildren: boolean | 'unknown'; occupation: string | undefined;
    currentConcerns: typeof v4Ctx.concerns;
    // Precision V1 (P7) — optional. flag off면 키 자체가 없음(기존과 동일). 서버가 SAJU_CALC_MODE로 소비.
    birthPlaceId?: string;
  };
  async function fetchSajuReadingV4(signal?: AbortSignal, overrideInput?: V4InputShape) {
    setIsLoading(true);
    setIsGenerating(true);
    setAiText('');
    setV4Resp(null);
    let v4Input: V4InputShape;
    if (overrideInput) {
      v4Input = overrideInput;
    } else {
      // 출생시간 payload 통일 헬퍼 (정확입력→"HH:mm"+exact / 시진→대표값+approximate / 모름→undefined+unknown).
      const { birthTime, birthTimeConfidence } = resolveBirthTimeFields({
        sijuIndex: userData.hour,
        exact: { use: useExactTime, hour: exactHour, min: exactMinute },
      });
      v4Input = {
        name: userData.name || '익명',
        gender: (userData.gender === 'm' ? 'male' : userData.gender === 'f' ? 'female' : 'unknown') as 'male' | 'female' | 'unknown',
        calendarType: (isLunar ? 'lunar' : 'solar') as 'lunar' | 'solar',
        birthDate: `${userData.year}-${String(userData.month).padStart(2, '0')}-${String(userData.day).padStart(2, '0')}`,
        birthTime,
        birthTimeConfidence,
        timezone: 'Asia/Seoul' as const,
        relationshipStatus: v4Ctx.relationshipStatus,
        hasChildren: (v4Ctx.hasChildren === 'true' ? true : v4Ctx.hasChildren === 'false' ? false : 'unknown') as boolean | 'unknown',
        occupation: v4Ctx.occupation || undefined,
        currentConcerns: v4Ctx.concerns,
        // flag off OR 지역 미선택이면 {} → 키 미포함(기존 payload와 byte-identical).
        ...birthPlacePayloadPatch(SAJU_PRECISION_INPUTS_ENABLED, birthPlaceId),
      };
    }

    // ── Phase 1: preview (즉시) ──
    try {
      const previewRes = await fetch('/api/saju-v4/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: v4Input }),
        signal,
      });
      if (!previewRes.ok) {
        const detail = await previewRes.json().catch(() => ({}));
        throw new Error(`preview 오류 (${previewRes.status}): ${detail?.detail || ''}`);
      }
      const preview = await previewRes.json();
      // reportText 빈 문자열 + validation·attempts 기본값으로 v4Resp 즉시 세팅 (UI는 AI 카드 영역에 로딩 표시)
      setV4Resp({ ...preview, reportText: '', validation: { isValid: true, issues: [] }, attempts: 0 } as _SajuV4ApiResponseType);
    } catch (err) {
      if (signal?.aborted) { setIsGenerating(false); setIsLoading(false); return; }
      setAiText(t('aiError', lang));
      console.error('[v4 preview] error:', err);
      setIsGenerating(false); setIsLoading(false);
      return;
    }

    // ── Phase 2: report (GPT 해석) — preview 응답 후 즉시 호출 ──
    try {
      const reportRes = await fetch('/api/saju-v4', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: v4Input, maxRepairAttempts: 1, lang }),
        signal,
      });
      if (!reportRes.ok) {
        const detail = await reportRes.json().catch(() => ({}));
        throw new Error(`서버 오류 (${reportRes.status}): ${detail?.detail || detail?.error || ''}`);
      }
      const data = await reportRes.json() as _SajuV4ApiResponseType;
      setV4Resp(data);
      setAiText(data.reportText);
    } catch (err) {
      if (signal?.aborted) return;
      setAiText(t('aiError', lang));
      console.error('[v4 report] error:', err);
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  }

  /* ===== Yearly Fortune Fetch ===== */
  async function fetchYearlyReading(sj: SajuResult, signal?: AbortSignal) {
    setIsLoading(true);
    setIsGenerating(true);
    setGeneratingProgress(0);
    setAiText('');
    let fullText = '';
    const decoder = new TextDecoder();

    const ohCount = getOhCount(sj);
    const ds = sj.dStem;
    const profile = PROFILES[ds];
    const ohKeys = ['목', '화', '토', '금', '수'];
    let total = 0;
    ohKeys.forEach(k => { total += ohCount[k]; });
    if (total === 0) total = 1;

    const ohStr = ohKeys.map(k => k + ':' + ohCount[k] + '(' + Math.round(ohCount[k] / total * 100) + '%)').join(', ');

    const monthlyGanji = [
      '1월(경인월/庚寅)', '2월(신묘월/辛卯)', '3월(임진월/壬辰)',
      '4월(계사월/癸巳)', '5월(갑오월/甲午)', '6월(을미월/乙未)',
      '7월(병신월/丙申)', '8월(정유월/丁酉)', '9월(무술월/戊戌)',
      '10월(기해월/己亥)', '11월(경자월/庚子)', '12월(신축월/辛丑)'
    ];

    const currentMonth = new Date().getMonth() + 1;
    const sipsung = getSipsung(sj);
    let sipsungStr = ''; for (const k in sipsung) { sipsungStr += k + ':' + sipsung[k] + ' '; }
    const shinsal = calcShinsal(sj);
    const unsung12 = get12Unsung(sj);
    const ysPrompt = calcYongsin(sj);
    const isStrongY = ysPrompt.isStrong;
    const yongsinOhY = ysPrompt.yongsin;

    const engReminderYearly = lang === 'en' ? '🚨 FINAL REMINDER — MOST IMPORTANT INSTRUCTION 🚨\nWrite EVERYTHING in English. EVERY section title must be in English.\nALL text in English. Korean ONLY for Saju terms in parentheses.\nIF ANY KOREAN SENTENCE APPEARS, THE RESPONSE WILL BE REJECTED.\n\n' : '';
    const yearlyRules = '중요: 각 섹션 번호를 ##숫자.제목## 형식으로 반드시 써줘.\n' +
      '비유적 표현을 적극 사용해! 한자 절대 금지! 고전 문헌 인용 금지!\n' +
      '개인사주 해설과 동등한 퀄리티로! 격국/용신/조후/통변/12운성을 적극 활용해.\n' +
      '섹션 끝에 의문문으로 끝내지 마. "~하지 않을까?", "~일까요?", "~어떨까?" 같은 물음표 문장 절대 금지. 단정적이고 자신감 있는 문장으로 마무리해.\n\n';

    const promptBase = (lang === 'en' ? '🚨 CRITICAL LANGUAGE INSTRUCTION 🚨\nYou MUST write EVERYTHING in English. Translate Korean section titles to English.\nSaju terms like Gap(甲) can appear with English meaning, but ALL text must be English.\nIF YOU WRITE IN KOREAN, THE RESPONSE WILL BE REJECTED.\n\n' : '') +
      '너는 20년 경력의 사주명리학 전문가이자 솔직하고 재치있는 운세 상담가야. 전문가답게 단정적으로 말해. 한자 절대 쓰지 마. 괄호 안에 한자 넣기 금지. 고전 문헌 인용 금지. 어려운 용어는 재밌는 비유로 풀어서 설명해. 반말만 써. 존댓말 금지.\n' +
      '"결론적으로" "정리하면" 패턴 절대 금지!\n\n' +
      '=== 팩트폭행 규칙 (올해운세도 솔직해야 신뢰!) ===\n' +
      '좋은 내용만 나열하면 990원 가치 없어. 각 섹션에서 성격 약점이 올해 운에 미치는 리스크를 솔직��게:\n' +
      '- "너 이런 성격이라 이 달에 이런 실수할 가능성 높아" 식 직구\n' +
      '- "솔직히 이거 너 맞지?" 식 찔리는 멘트 각 섹션 1-2개\n' +
      '- 돌려 말하기 금지. "약간의 어려움이 있을 수 있어" (X) → "이건 진짜 조심해야 해" (O)\n' +
      '- 팩트폭행 후 반드시 구체적 해결책 제시\n' +
      '- 콘텐츠 비율: 좋은 흐름 55% + 솔직한 경고/단점 25% + 해결책 20%\n\n' +
      '=== AI 패턴 금지 ===\n' +
      '⚠��� "이건 마치 ~처럼", "마치 ~와 같아" 패턴 절대 사용 금지! "마치" 단어를 한 번이라도 쓰면 탈락!\n' +
      '비유는 직접 대입: "이 달은 주식 상한가야" (O) / "이건 마치 주식 상한가와 같아" (X)\n\n' +
      '=== 재미 요소 규칙 (필수!) ===\n' +
      '- 족집게 멘트: 일간 성격을 기반으로 "너 혹시 이런 사람 아니야?" 식의 찔리는 멘트를 섹션마다 1~2개씩 넣어. 예: "갑목 일간이라 겉으론 쿨한 척하지만 속으로 다 계산하고 있지? ㅋㅋ"\n' +
      '- 트렌디한 표현: MZ세대가 쓰는 자연스러운 표현을 섞어 (예: "이 달은 갓생 살기 딱 좋은 타이밍", "주식 올인은 좀 빌런 무브야", "이건 찐으로 중요한 시기야"). 단, 과하게 쓰지 말고 자연스럽게!\n' +
      '- 유머: 무거운 내용 뒤에 가볍게 웃길 수 있는 한마디를 넣어. 예: "7월에 충이 오는데... 솔직히 이 달은 이불 속에서 넷플릭스가 답일 수도 있어 😂"\n' +
      '- 공감 포인트: "이거 읽으면서 고개 끄덕이고 있지?" 같은 공감형 멘트로 독자와 소통하는 느낌\n' +
      '- 성격 저격: 일간의 장단점을 콕 찍어서 "너는 이런 상황에서 분명 이렇게 반응할 텐데..." 식으로 예측해줘. 맞으면 소름끼치게!\n' +
      '이 재미 요소들은 올해운세 전체 10개 섹션 모두에 적용해!\n\n' +
      '【분석 대상 - 전체 사주 원국】\n' +
      '이름: ' + (userData.name || '익명') + ' / 성별: ' + (userData.gender === 'm' ? '남' : '여') + ' / 나이: 만 ' + (new Date().getFullYear() - userData.year) + '세\n' +
      '⚠️ 나이 맞춤 해석: ' +
      ((new Date().getFullYear() - userData.year) <= 19 ? '10대이므로 학업/시험/진로/교우관계에 비중을 크게 두고, 결혼/부동산/투자는 "먼 미래에~" 정도로만.' :
       (new Date().getFullYear() - userData.year) <= 29 ? '20대이므로 취업/커리어/연애/자기계발에 비중을 두고, 결혼은 가능성으로, 자녀/노후는 가볍게만.' :
       (new Date().getFullYear() - userData.year) <= 39 ? '30대이므로 커리어 성장/결혼생활/재테크/내집마련/자녀계획에 맞는 현실적 조언을.' :
       (new Date().getFullYear() - userData.year) <= 49 ? '40대이므로 커리어 전성기/자녀교육/건강관리/재산관리에 비중을 둬.' :
       (new Date().getFullYear() - userData.year) <= 59 ? '50대이므로 인생 2막/건강/은퇴준비/자녀독립에 초점.' :
       '60대 이상이므로 건강/노후생활/가족관계/취미에 초점. 취업/수능 등 젊은 시절 이야기는 안 해.') +
      ' 나이와 동떨어진 조언은 절대 금지!\n' +
      '현재 상태: ' + (['안정적이고 평화로움', '변화의 흐름 속', '스트레스가 많음', '도전 중', '잘 모르겠음'][userData.state] || '미선택') + '\n' +
      '주요 관심사: ' + (['연애/관계', '커리어/진로', '돈/재정', '인간관계', '건강', '학업/시험'][userData.concern] || '미선택') + '\n' +
      '⚠️ 위 현재 상태와 관심사를 올해 운세 전체에 반영해줘. 특히 섹션9(연애운)에서는 현재 상태를 고려해서 솔로/커플 맞춤 조언을 해줘.\n\n' +
      '생년월일: ' + userData.year + '년 ' + userData.month + '월 ' + userData.day + '일 (' + (isLunar ? '음력 입력 -> 양력 변환됨' : '양력') + ')\n' +
      (useExactTime && exactHour >= 0 ? '정확한 출생시간: ' + String(exactHour).padStart(2, '0') + '시 ' + String(exactMinute).padStart(2, '0') + '분 (' + TIMES[exactTimeToSiju(exactHour, exactMinute)].hangul.replace(/[()]/g, '') + ' 해당)\n' : '') +
      '일간(Day Master): ' + CG[ds] + ' ' + CG_HANJA[ds] + ' (' + OH_CG[ds] + ') - ' + profile.short + '\n' +
      '사주 명식: 년주(' + CG[sj.yStem] + JJ[sj.yBranch] + ') 월주(' + CG[sj.mStem] + JJ[sj.mBranch] + ') 일주(' + CG[sj.dStem] + JJ[sj.dBranch] + ')' + (sj.hStem >= 0 ? ' 시주(' + CG[sj.hStem] + JJ[sj.hBranch] + ')' : '') + '\n' +
      '오행 분포: ' + ohStr + '\n' +
      '십성: ' + sipsungStr + '\n' +
      '신살: ' + (shinsal.length > 0 ? shinsal.join(', ') : '없음') + '\n' +
      '12운성: 년지(' + unsung12['년지'] + ') 월지(' + unsung12['월지'] + ') 일지(' + unsung12['일지'] + ')' + (unsung12['시지'] ? ' 시지(' + unsung12['시지'] + ')' : '') + '\n' +
      '신강/신약: ' + (isStrongY ? '신강(身强) - 일간 힘이 강함' : '신약(身弱) - 일간 힘이 부드러움') + '\n' +
      '용신: ' + yongsinOhY + ' / 기신: ' + ysPrompt.gisin + '\n\n' +
      '【심화 분석 지침】\n' +
      '- 격국(格局)을 먼저 판별하고, 격국에 맞는 올해 운의 흐름을 설명해\n' +
      '- 용신/기신과 병오년 세운의 관계를 반드시 분석: 용신이 활성화되는지 기신이 강해지는지\n' +
      '- 조후(調候): ' + (sj.mBranch >= 11 || sj.mBranch <= 1 ? '겨울 태생 → 화(火) 필요' : sj.mBranch >= 5 && sj.mBranch <= 7 ? '여름 태생 → 수(水) 필요' : '봄/가을 태생') + '. 병오년(화 기운)이 조후에 어떤 영향을 주는지\n' +
      '- 통변(通變): 세운/월운이 원국과 합/충/형할 때 어떤 사건이 생기는지 구체적으로 예측\n' +
      '- 십성별 사건 해석: 재성운이면 돈/이성, 관성운이면 직장/시험, 인성운이면 학업/자격증, 식상운이면 표현/창작, 비겁운이면 경쟁/협력\n' +
      '- 12운성 변화: 각 월의 12운성이 일간에게 어떤 에너지 상태를 주는지\n' +
      '- 비유를 2-3문장마다 반드시 넣어! 읽는 재미가 있어야 해\n' +
      '- 모든 해석에 사주 근거를 구체적으로: "네 일간 X가 이번 달 월지 Y와 Z 관계이므로..." 이런 식으로\n\n' +
      '【2026년 병오년(丙午年) - 화(火) 기운의 해】\n' +
      '2026년 월별 간지:\n' + monthlyGanji.join('\n') + '\n\n' +
      '아래 섹션을 순서대로 작성해줘. 다른 섹션은 절대 쓰지 마.\n\n' +
      '=== 중복 금지 규칙 (매우 중요!) ===\n' +
      '10개 섹션 각각 고유한 역할이 있어. 이전 섹션에서 이미 말한 내용을 다른 섹션에서 반복하지 마!\n' +
      '- 섹션1(큰그림+미션)과 섹션10(총평)은 각도가 달라야 해. 1은 올해 의미+해야할것, 10은 종합 평가+하반기 전략\n' +
      '- 섹션2(월별)의 내용을 섹션4(재물)/5(연애)/6(직장건강)에서 똑같이 반복 금지\n' +
      '- 섹션4(재물)과 섹션6(직장건강)은 돈 vs 커리어+건강으로 구분\n' +
      '- 섹션5(연애)와 섹션7(대인관계)은 로맨스 vs 사회적 인연으로 완전 구분\n' +
      '- 섹션2(월별)에서 연애 이야기 금지! 연애는 오직 섹션5에서만 다뤄\n' +
      '같은 사주 근거를 다뤄도 반드시 다른 각도/다른 깊이로 써야 해. 문장을 베껴쓰듯 반복하면 절대 안 돼!\n\n' +
      '=== 서사적 흐름 규칙 ===\n' +
      '읽는 사람이 한 편의 이야기를 읽는 느낌으로 써줘:\n' +
      '- 각 섹션 시작할 때 이전 섹션과 자연스럽게 연결하는 한 문장을 넣어 (예: "재물운을 봤으니 이제 연애운을 볼게!")\n\n' +
      '=== 명리학적 근거 규칙 (신뢰성 필수!) ===\n' +
      '모든 해석에 반드시 사주 근거를 함께 써줘. 근거 없는 뜬구름 해석 금지!\n' +
      '- 조언 → 왜?(명리 근거) → 쉬운 비유 3단계를 지켜\n' +
      '- 예: "4월에 투자하면 좋아" (X) → "4월 월운 경진(금토)이 네 재성을 강화시켜서, 봄비가 밭에 내리듯 재물이 자라나는 달이야" (O)\n' +
      '- 어려운 용어는 반드시 괄호 안에 비유로 풀어: 편재(큰돈의 별), 정관(직장 안정의 별), 식신(표현력의 별)\n\n';

    const sectionsP1 =
      '=== 아래 2개 항목(1~2번)만 써줘. 3번 이후는 절대 쓰지 마! ===\n' +
      '[팩트폭행 리마인더] 모든 섹션에서 좋은 흐름 55% + 솔직한 경고/단점 25% + 해결책 20% 비율 지켜! 칭찬만 가득한 섹션은 탈락!\n\n' +
      '=== 올해 운 에너지 점수 (반드시 첫 줄에!) ===\n' +
      '아래 5가지 영역을 10점 만점으로 평가해서 반드시 첫 줄에 이 형식으로 써줘:\n' +
      '[운세점수: 재물=X, 연애=X, 직장=X, 건강=X, 대인=X]\n' +
      '점수 기준: 병오년 세운이 각 영역의 십성/오행에 얼마나 유리한지 기반. 용신 활성화=높은 점수, 기신 강화=낮은 점수.\n\n' +

      '##1.2026 병오년, 올해의 큰 그림 & 핵심 미션##\n' +
      '병오년(丙午)이 이 사주에서 어떤 의미인지 + 올해 반드시 해야 할 미션을 하나로 풀어줘:\n' +
      '- 현재 대운(大運)과 병오 세운의 관계: 대운 천간지지가 뭔지, 병오와 합/충/형 관계\n' +
      '- 병오(丙午) 화(火) 기운이 내 일간/용신/기신에 미치는 영향\n' +
      '- 삼재(三災) 여부: 해당 여부 + 대비법 or "벗어난 해"\n' +
      '- 올해 가장 강한 십성이 만드는 테마 (편재운=투자, 정관운=안정 등)\n' +
      '- 오행 밸런스 변화와 삶에 미치는 영향\n' +
      '- 올해 핵심 미션 3가지: "반드시 OO해야 하는 해" 식 구체적 행동 지침\n' +
      '- 올해 버려야 할 습관/태도 1가지 (기신 연결)\n' +
      '- 한 줄 정리: "2026년은 너에게 OOO한 해야!"\n' +
      '최소 35줄. 디테일이 충분하면 더 깊게. 올해 테마 = 이 사주 + 2026 세운 결합에서 나오는 고유한 디테일로.\n\n' +

      '현재 ' + currentMonth + '월이야. 1월부터 12월까지 전체 다 써줘. 단, 이미 지난 달(1~' + (currentMonth - 1) + '월)은 "지나간 달 돌아보기" 느낌으로 짧게(5~6줄), 현재 달(' + currentMonth + '월)부터는 상세하게(10줄 이상) 써줘.\n' +
      '##2.2026 월별 상세 운세##\n' +
      '!!! 형식 규칙: 절대로 💰재물: / 💕연애: / 💼직장: / 🏥건강: 카테고리로 나누지 마! 이모티콘+카테고리+콜론 형식 금지!\n' +
      '반드시 하나의 자연스러운 이야기 문단으로 써. 돈/사람/일/건강을 자연스럽게 엮어서.\n' +
      '사주 용어는 괄호로 쉽게 풀어서: 묘목(봄 새싹 에너지), 목생화(나무가 불을 키워줌), 충(부딪히는 변화 기운)\n' +
      currentMonth + '월~12월 각 월별로 다음을 포함해서 이야기체로:\n' +
      '- 그 달의 월운 천간지지와 내 일간의 관계 (상생/상극/합/충/형) 분석을 명리학적 근거와 함께\n' +
      '- 그 달의 십성 작용과 예상 사건\n' +
      '- 그 달의 12운성 에너지 상태\n' +
      '- 월운이 세운(병오)과 겹쳐서 만드는 복합 작용 분석\n' +
      '- 재물/직장/건강 흐름을 하나의 이야기로 (⚠️ 연애는 섹션5에서 전담하니까 여기서 쓰지 마!)\n' +
      '- 그 달에 특히 좋은 날짜대/시기 (상순/중순/하순)\n' +
      '- 상생 관계 원리를 재미있게 풀어줘\n' +
      '- ⚠️ 긍정:주의 = 6:4 비율. 조심할 것, 힘든 부분도 반드시 포함!\n' +
      '- 일간 성격 특성 고려한 맞춤 경고\n' +
      '- 충/형/파 달은 갈등/손실/건강 문제 솔직하게 알려줘\n' +
      '각 월 최소 15줄 이상! 월별 운세는 이 서비스의 핵심이야. 각 달마다 하나의 짧은 에세이처럼 풍성하게 써줘.\n' +
      '\n=== 월별 운세 필수 구성 (매 달마다 이 구조를 따라!) ===\n' +
      '① 그 달의 한 줄 키워드/테마 (예: "변화의 바람이 부는 달")\n' +
      '② 명리학적 분석: 월운 천간지지 + 일간/세운과의 관계 (3~4줄)\n' +
      '③ 예상 사건/기회: 구체적 상황 묘사 (3~4줄)\n' +
      '④ ⚠️ 주의할 점/팩트폭행: 성격 때문에 이 달에 저지를 실수, 조심할 것 (2~3줄)\n' +
      '⑤ 실천 팁: 이 달에 해야 할 것 1가지, 하지 말아야 할 것 1가지 (2줄)\n' +
      '이 5단계 구조를 12개월 모두 지켜! 특히 ④번 주의점을 빼먹으면 탈락!\n\n' +
      '=== 월별 운세 품질 규칙 (필수!) ===\n' +
      '- 문장 시작 패턴 다양하게. "이 달은" 반복 금지\n' +
      '- 단어 반복 금지: 같은 형용사 2개월 연속 사용 금지\n' +
      '- 비유 퀄리티: 식상한 비유 금지! 게임/주식/드라마/SNS 등 현대적 비유\n' +
      '- 구체적 장면 묘사: "좋은 달이야" (X) → 구체적 상황 (O)\n' +
      '- 운의 강도 표현: 소소~대박예감🔥까지, 찝찝~빨간불🚨까지 강도 차이 분명히\n' +
      '- 오행 원리 스토리텔링으로 설명\n' +
      '⚠️ "X월은 ~~달이야!" 식 마무리 문장 금지.\n' +
      '[이 섹션의 역할: 월별 운세 흐름과 사건 예측에만 집중. 개운법/행운 아이템은 뒤에서!]\n\n' +

      yearlyRules +
      (lang === 'en' ? engReminderYearly : '') +
      getRelevantRefs({ dayMaster: sj.dStem, topics: ['timing', 'general'] });

    const promptPart1 = promptBase + sectionsP1;

    const prompt2Yearly = promptBase +
      '=== 아래 8개 항목을 써줘 (3~10번). 반드시 8개 모두 빠짐없이! ===\n' +
      '[중복 금지] 이전 파트(1~2번: 큰그림, 월별운세)에서 이미 다룬 내용을 절대 반복하지 마!\n' +
      '[⚠️ "마치" 단어 사용 절대 금지! 한 번이라도 쓰면 탈락!]\n' +
      '[명리학 근거 필수] 모든 해석에 "왜?"를 명리학적으로 설명해.\n' +
      '[출력형식 필수] 반드시 ##번호.제목## 형태로 각 섹션을 시작해!\n' +
      '[팩트폭행 리마인더] 모든 섹션에서 좋은 흐름 55% + 솔직한 경고/단점 25% + 해결책 20% 비율 지켜! 칭찬만 가득한 섹션은 탈락!\n\n' +

      '##3.올해 분기별 에너지 리듬##\n' +
      '1분기(1~3월), 2분기(4~6월), 3분기(7~9월), 4분기(10~12월)의 에너지를 10점 만점으로.\n' +
      '반드시 첫 줄에: [에너지점수: Q1=X, Q2=X, Q3=X, Q4=X]\n' +
      '각 분기별로:\n' +
      '- 월운 천간지지와 원국의 합/충/형 관계\n' +
      '- 에너지가 높은/낮은 이유 명리학적 근거\n' +
      '- 집중할 영역 vs 쉬어야 할 영역\n' +
      '- ⚠️ 에너지 낮은 분기는 왜 힘든지, 성격상 어떤 실수를 저지르기 쉬운지 직구로 써!\n' +
      '최소 15줄.\n\n' +

      '##4.올해 재물운 & 투자 타이밍##\n' +
      '올해 재성(정재/편재)의 힘과 흐름 분석:\n' +
      '- 월별 재물 에너지 강한 달/약한 달\n' +
      '- 투자 OK 시기 vs NG 시기 (구체적 월 + 명리 근거)\n' +
      '- 사주 체질에 맞는 재테크 방식 (저축형/투자형/사업형)\n' +
      '- ⚠️ 돈과 관련된 성격 약점도 솔직하게!\n' +
      '최소 12줄.\n\n' +

      '##5.올해 연애운 & 인연 캘린더##\n' +
      '[⚠️ 중복 금지] 섹션2에서 연애 이야기를 안 썼으니 여기서 처음 다루는 것처럼 깊이 있게.\n' +
      '① 올해 연애 체질 진단 (3줄)\n' +
      '② 인연 키워드: 잘 맞는 상대 오행/띠/성격 (3줄)\n' +
      '③ 연애 에너지 TOP 3 시기\n' +
      '④ 주의할 감정 시기 + 대처법\n' +
      '⑤ 솔로 vs 커플 맞춤 조언\n' +
      '- ⚠️ 연애 반복 실수 패턴 팩트폭행 필수!\n' +
      '최소 15줄.\n\n' +

      '##6.올해 직장/건강 종합##\n' +
      '직장운과 건강운을 하나의 섹션에서 깊이 있게:\n' +
      '[직장/사업]\n' +
      '- 관성/식상/재성의 올해 흐름으로 승진/이직/사업 시작 적기\n' +
      '- 직장인: 상사/동료 관계 변화. 사업자: 확장/축소 타이밍\n' +
      '- ⚠️ 직장에서 성격 때문에 손해보는 패턴도 직구로!\n' +
      '[건강]\n' +
      '- 병오년 화(火) 기운이 오행 균형에 미치는 건강 영향\n' +
      '- 월별 컨디션 변화, 취약 장기 관리법, 맞는 운동/음식\n' +
      '- ⚠️ 건강 관련 나쁜 습관도 지적해줘!\n' +
      '[끝에 "※ 명리학적 관점의 건강 경향성이며 의학적 조언이 아닙니다" 포함]\n' +
      '최소 18줄.\n\n' +

      '##7.올해 대인관계 & 귀인 캘린더##\n' +
      '[⚠️ 연애/로맨스 절대 금지! 친구/동료/상사/멘토/가족 등 비연애 관계 전용. 연애는 섹션5에서 이미 다뤘어.]\n' +
      '- 올해 귀인이 나타나는 달 + 어떤 띠/성격의 사람이 귀인인지\n' +
      '- 갈등 조심할 달 + 새로운 사회적 인연 들어오는 시기\n' +
      '- 관계 에너지 강한 달 vs 혼자 충전할 달\n' +
      '- ⚠️ 대인관계에서 반복하는 실수도 직구로! "너는 이런 성격이라 사람들이 이렇게 느껴" 식 팩트폭행\n' +
      '최소 20줄. 귀인/갈등 시기를 구체적으로!\n\n' +

      '##8.조심할 것 & 중요한 결정 타이밍##\n' +
      '올해 전체를 관통하는 주의사항 + 큰 결정 타이밍을 함께:\n' +
      '[조심할 것 TOP 3]\n' +
      '각 항목 5줄 이상: 사주 근거(충/형/기신) + 몇 월에 특히 조심 + 구체적 상황 + 개운법\n' +
      '- ⚠️ "조심해"로 끝내지 마! 왜 위험한지 + 네 성격 때문에 어떻게 더 악화되는지 + 구체적 회피법까지 3단계로!\n' +
      '[결정 타이밍]\n' +
      '- 계약/이직/결혼/이사 등 큰 결정 좋은 달 TOP 3 (세운+월운 근거)\n' +
      '- 피해야 할 달 1개\n' +
      '최소 20줄.\n\n' +

      '##9.행운 아이템 & 개운 루틴##\n' +
      '행운 아이템 + 방위/여행 + 일상 루틴을 한 섹션에:\n' +
      '[행운 아이템]\n' +
      '- 🎨 행운의 색 2가지 + 🔢 숫자 2가지 + 💎 럭키 아이템 2가지 (각각 오행 근거)\n' +
      '[유리한 방위 & 여행]\n' +
      '- 📍 용신 기반 유리한 방위 + 여행 좋은 방향/계절 + 구체적 도시 추천\n' +
      '[개운 루틴]\n' +
      '- 용신 오행에 맞는 아침/저녁 습관 + 요일별 팁 + 매일 실천할 개운법 5가지 (구체적 시간/빈도)\n' +
      '- ⚠️ 반대로 절대 하지 말아야 할 습관/행동 2가지도 경고해줘! (기신 오행 기반)\n' +
      '최소 18줄.\n\n' +

      '##10.2026 총평 & 하반기 전략##\n' +
      '[앞 9개 섹션 종합하되 반복 금지!]\n' +
      '- 올해를 한 단어/문장으로 정의\n' +
      '- 상반기 vs 하반기 운세 흐름 차이, 하반기 반전 계기와 집중 전략\n' +
      '- 2025년(을사년)과 비교: 에너지 차이를 명리 근거로\n' +
      '- 2027년(정미년) 미리보기: 올해가 내년으로 어떻게 이어지는지\n' +
      '- 올해 인생 전체에서의 위치\n' +
      '- ⚠️ 올해 가장 경계해야 할 것 1가지를 최종 경고로 남겨줘\n' +
      '- 나에게 보내는 따뜻하지만 솔직한 한마디\n' +
      '최소 18줄. 진심이 느껴지는 편지로. 비유는 이 사주 고유 디테일에 연결.\n\n' +

      yearlyRules +
      (lang === 'en' ? engReminderYearly : '') +
      getRelevantRefs({ dayMaster: sj.dStem, topics: ['timing', 'health', 'wealth', 'general'] });

    const yearlyPrompts = [promptPart1, prompt2Yearly];

    // Expected section numbers per part for validation
    const expectedSectionNums = [
      [1, 2],                          // Part 1: sections 1-2 (heavy: monthly fortune)
      [3, 4, 5, 6, 7, 8, 9, 10],      // Part 2: sections 3-10
    ];

    // Flexible section marker check: ##N. or **N. or ###N. or ## N. etc
    const hasSectionMarker = (text: string, num: number): boolean => {
      const patterns = [
        '##' + num + '.', '## ' + num + '.', '###' + num + '.', '### ' + num + '.',
        '**' + num + '.', '## ' + num + ' ', '##' + num + ' ',
      ];
      return patterns.some(p => text.includes(p));
    };

    // Fetch a single part with retry logic
    const fetchPart = async (prompt: string, partIdx: number, maxRetries: number): Promise<string> => {
      for (let retry = 0; retry < maxRetries; retry++) {
        try {
          if (signal?.aborted) return '';
          const res = await fetch('/api/saju', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, lang, noCache: retry > 0 }),
            signal,
          });
          if (!res.ok) {
            if (retry < maxRetries - 1) { await new Promise(r => setTimeout(r, 2000 * (retry + 1))); continue; }
            throw new Error('API error: ' + res.status);
          }
          if (!res.body) throw new Error('No response body');
          const reader = res.body.getReader();
          let text = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
          }
          // Validate section markers
          const expected = expectedSectionNums[partIdx] || [];
          const missing = expected.filter(n => !hasSectionMarker(text, n));
          if (missing.length > 0 && retry < maxRetries - 1) {
            console.warn('[Yearly Part ' + (partIdx + 1) + '] Missing sections: ' + missing.join(', ') + ' (attempt ' + (retry + 1) + '). Retrying...');
            await new Promise(r => setTimeout(r, 2000 * (retry + 1)));
            continue;
          }
          if (missing.length > 0) {
            console.error('[Yearly Part ' + (partIdx + 1) + '] Still missing after ' + maxRetries + ' attempts: ' + missing.join(', '));
          }
          return text;
        } catch (retryErr) {
          if (signal?.aborted) return '';
          if (retry < maxRetries - 1) { await new Promise(r => setTimeout(r, 2000 * (retry + 1))); continue; }
          throw retryErr;
        }
      }
      return '';
    };

    try {
      const partTexts: string[] = ['', ''];
      for (let pi = 0; pi < yearlyPrompts.length; pi++) {
        if (signal?.aborted) return;
        setLoadingProgress(t('yearlyAnalyzingMsg', lang) + ' (' + (pi + 1) + '/2)');
        // Each part is independent — one failure must not block others
        try {
          const text = await fetchPart(yearlyPrompts[pi], pi, 3);
          partTexts[pi] = text;
        } catch (partErr) {
          console.error('[Yearly Part ' + (pi + 1) + '] Failed after all retries:', partErr);
          partTexts[pi] = '';
        }
        // Update display progressively
        fullText = partTexts.filter(Boolean).join('\n\n');
        if (fullText) setAiText(fullText);
        // Small delay between parts to avoid rate limiting
        if (pi < yearlyPrompts.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Keep retrying missing parts until all 10 sections exist (max 5 rounds)
      for (let round = 0; round < 5; round++) {
        if (signal?.aborted) return;
        const missing: number[] = [];
        for (let n = 1; n <= 10; n++) {
          if (!hasSectionMarker(fullText, n)) missing.push(n);
        }
        if (missing.length === 0) break; // All sections present!
        console.warn('[Yearly] Round ' + (round + 1) + ': missing sections ' + missing.join(', '));
        setLoadingProgress((lang === 'en' ? 'Checking & regenerating...' : '검토 및 재생성 중...') + ' (' + (round + 1) + ')');
        for (let pi = 0; pi < yearlyPrompts.length; pi++) {
          const expected = expectedSectionNums[pi] || [];
          const stillMissing = expected.filter(n => missing.includes(n));
          if (stillMissing.length > 0) {
            try {
              const retryText = await fetchPart(yearlyPrompts[pi], pi, 2);
              if (retryText) {
                partTexts[pi] = retryText;
                fullText = partTexts.filter(Boolean).join('\n\n');
                if (fullText) setAiText(fullText);
              }
            } catch { /* continue to next round */ }
          }
        }
      }

      // Clean up stream error sentinel
      const STREAM_ERR = '[응답이 중단되었습니다. 다시 시도해 주세요.]';
      if (fullText.endsWith(STREAM_ERR)) {
        fullText = fullText.slice(0, -STREAM_ERR.length).trimEnd();
      }

      if (!fullText) {
        setAiText(t('aiError', lang));
      } else {
        setAiText(fullText);
      }
    } catch (err) {
      if (signal?.aborted) return;
      if (!fullText) {
        setAiText(t('aiError', lang));
      } else {
        setAiText(fullText);
      }
    }
    setLoadingProgress('');
    setIsGenerating(false);
    setIsLoading(false);
  }

  /* ===== Calculation + Loading ===== */
  /** Cancel any in-flight loading timeout + API fetch */
  function cancelLoading() {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }

  function doCalculation() {
    let calcYear = userData.year;
    let calcMonth = userData.month;
    let calcDay = userData.day;

    if (isLunar) {
      const solar = lunarToSolar(userData.year, userData.month, userData.day);
      calcYear = solar.year;
      calcMonth = solar.month;
      calcDay = solar.day;
    }

    const sj = calcSaju(calcYear, calcMonth, calcDay, userData.hour);
    setSajuResult(sj);
    setCurrentScreen(3);

    // Cancel any previous in-flight request
    cancelLoading();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    loadingTimeoutRef.current = setTimeout(() => {
      loadingTimeoutRef.current = null;
      if (controller.signal.aborted) return;
      if (appMode === 'yearly') {
        setCurrentScreen(8); // Go to teaser/paywall first
        // 올해운세 V4(flag on)는 questions를 건너뛰어 이 경로에 도달하지 않지만, 방어적으로
        // V4에서는 v3 fetchYearlyReading(/api/saju)을 호출하지 않는다. (결과는 YearlyV4Report가 생성)
        if (!YEARLY_FORTUNE_UI_ENABLED) fetchYearlyReading(sj, controller.signal);
      } else if (isV4 && appMode === 'saju') {
        // v4 분기: server에서 사주 재계산 + 차별화 분석 + GPT 해석 통합
        setCurrentScreen(8); // teaser/paywall first (v3와 동일)
        fetchSajuReadingV4(controller.signal);
      } else {
        setCurrentScreen(8); // Go to teaser/paywall first
        const ohCount = getOhCount(sj);
        const cachedYs = getCachedYongsin(sj) || undefined;
        const prompts = buildSajuPrompts(sj, ohCount, { ...userData, isLunar, lang, useExactTime, exactHour, exactMinute }, cachedYs);
        if (cachedYs) setLlmYongsin(cachedYs);
        fetchSajuReading(prompts, controller.signal);
      }
    }, 2600);
  }

  /* ===== SCREEN 0: Intro ===== */
  function renderIntro() {
    const isEn = lang === 'en';
    return (
      <div className="inner screen-enter orot-root" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        {/* Logo banner — lang-aware (ko/en) */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <img
            src={isEn ? '/images/orot/logo-en.png' : '/images/orot/logo-ko.png'}
            alt={isEn ? 'Starlight Saju' : '별빛 사주'}
            style={{ width: '100%', maxWidth: 220, display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Welcome block */}
        <div style={{ padding: '0 4px 18px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--orot-coral)',
            letterSpacing: '-0.012em',
            lineHeight: 1.3,
            margin: 0,
            background: 'none',
            WebkitTextFillColor: 'var(--orot-coral)',
          }}>
            {isEn ? 'Welcome' : '오신 걸 환영해요'}
          </h1>
          <p style={{
            fontSize: 14,
            color: 'var(--orot-ink-soft)',
            lineHeight: 1.6,
            margin: '6px 0 0',
          }}>
            {isEn
              ? 'Understanding yourself brings clarity to your path.'
              : '나를 이해하면, 삶의 방향이 선명해져요.'}
          </p>
        </div>

        {/* Hero BleedCard — 오늘의 흐름. flag on이면 /daily-fortune 진입점. */}
        <BleedCard
          image="/images/orot/home-hero-character.webp"
          framingId="home-hero-character"
          veil="left"
          minHeight={300}
          style={{ marginBottom: 16, cursor: DAILY_FORTUNE_UI_ENABLED ? 'pointer' : undefined }}
          {...(DAILY_FORTUNE_UI_ENABLED ? {
            onClick: () => { window.location.href = '/daily-fortune'; },
            role: 'button',
            ariaLabel: isEn ? "Today's flow" : '오늘의 흐름 보기',
          } : {})}
        >
          <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '62%' }}>
            <div className="orot-eyebrow" style={{ marginBottom: 14 }}>
              {isEn ? "Today's flow" : '오늘의 흐름'}
            </div>
            <h2 style={{
              fontSize: 26, fontWeight: 700, color: 'var(--orot-ink)',
              letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0,
              whiteSpace: 'pre-line', fontFamily: 'var(--orot-font)',
            }} suppressHydrationWarning>
              {hasMounted ? getTodayHeroLine(lang) : (lang === 'en' ? 'A new day begins\nwith small steps' : '오늘도 작은 걸음으로\n좋은 흐름을 만들어요')}
            </h2>
            {DAILY_FORTUNE_UI_ENABLED && (
              <>
                <p style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6, margin: '10px 0 0' }}>
                  {isEn ? 'See the energy entering your chart today.' : '오늘 내 사주에 들어오는 기운을 짧게 확인해보세요.'}
                </p>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--orot-coral)',
                }}>
                  {isEn ? 'See today’s fortune' : '오늘 운세 보기'} →
                </span>
              </>
            )}
          </div>
        </BleedCard>

        {/* 2×2 Feature Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <FeatureCard
            image="/images/orot/home-feat-saju.webp"
            framingId="home-feat-saju"
            emoji="📜"
            title={t('sajuTitle', lang)}
            sub={t('sajuDesc', lang)}
            onClick={() => { setAppMode('saju'); setCurrentScreen(1); }}
          />
          <FeatureCard
            image="/images/orot/home-feat-compat.webp"
            framingId="home-feat-compat"
            emoji="💞"
            title={t('compatTitle', lang)}
            sub={t('compatDesc', lang)}
            onClick={() => { setAppMode('compat'); setCurrentScreen(5); }}
          />
          <FeatureCard
            image="/images/orot/home-feat-year.webp"
            framingId="home-feat-year"
            emoji="🗓️"
            title={t('yearlyTitle', lang)}
            sub={t('yearlyDesc', lang)}
            onClick={() => { setAppMode('yearly'); setCurrentScreen(1); }}
          />
          <FeatureCard
            image="/images/orot/home-feat-baby.webp"
            framingId="home-feat-baby"
            emoji="👶"
            title={t('pregTitle', lang)}
            sub={t('pregDesc', lang)}
            onClick={() => { setAppMode('pregnancy'); setCurrentScreen(6); }}
          />
        </div>

        {/* History BleedCard — 지난 해석 보기 (savedResults가 있을 때만) */}
        {savedResults.length > 0 && (
          <>
            <BleedCard
              image="/images/orot/home-history-character.webp"
              framingId="home-history-character"
              veil="left"
              minHeight={180}
              next
              onClick={() => setShowSavedResults(!showSavedResults)}
              style={{ marginBottom: showSavedResults ? 12 : 24, cursor: 'pointer' }}
              role="button"
              ariaLabel={t('prevResults', lang)}
            >
              <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '70%' }}>
                <div className="orot-eyebrow" style={{ marginBottom: 12 }}>
                  📚 {t('prevResults', lang)}
                </div>
                <h3 style={{
                  fontSize: 21, fontWeight: 700, color: 'var(--orot-coral)',
                  letterSpacing: '-0.012em', lineHeight: 1.3, margin: 0,
                }}>
                  {isEn ? 'Past readings' : '지난 풀이를 모아뒀어요'}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--orot-ink-soft)', margin: '8px 0 0', lineHeight: 1.6 }}>
                  {savedResults.length}{isEn ? ' saved reading(s)' : '개의 저장된 해석'}
                </p>
              </div>
            </BleedCard>

            {showSavedResults && (
              <div style={{
                marginBottom: 24,
                borderRadius: 'var(--orot-r-lg)',
                background: 'rgba(243, 231, 207, 0.04)',
                border: '1px solid var(--orot-hair)',
                padding: 12,
                maxHeight: 280,
                overflowY: 'auto',
              }}>
                {savedResults.map((r: { name: string; date: string; type: string; text: string; saju?: unknown; user?: unknown; v4Api?: unknown }, i: number) => (
                  <div
                    key={i}
                    onClick={() => {
                      setAiText(r.text);
                      if (r.saju) setSajuResult(r.saju as SajuResult);
                      if (r.user) setUserData(r.user as typeof userData);
                      if (r.v4Api) setV4Resp(r.v4Api as _SajuV4ApiResponseType);
                      setCurrentScreen(r.type === '2026 운세' || r.type === '2026 Fortune' ? 7 : 4);
                      setShowSavedResults(false);
                    }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--orot-r-md)',
                      marginBottom: 6,
                      background: 'rgba(243, 231, 207, 0.04)',
                      cursor: 'pointer',
                      border: '1px solid var(--orot-hair)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--orot-ink)' }}>{r.name} · {r.type}</span>
                      <span style={{ fontSize: 11, color: 'var(--orot-ink-mute)', whiteSpace: 'nowrap' }}>{r.date}</span>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    try { localStorage.removeItem('saju-saved-results'); } catch { /* private browsing */ }
                    setSavedResults([]);
                    setShowSavedResults(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--orot-r-md)',
                    border: '1px solid rgba(255,100,100,0.2)',
                    background: 'rgba(255,100,100,0.06)',
                    color: '#FF8A8A',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginTop: 8,
                    fontFamily: 'inherit',
                    minHeight: 44,
                  }}
                >
                  {t('deleteAll', lang)}
                </button>
              </div>
            )}
          </>
        )}

        {/* Tagline */}
        <p style={{
          fontSize: 12,
          color: 'var(--orot-ink-mute)',
          textAlign: 'center',
          margin: '24px 22px 0',
          lineHeight: 1.6,
        }}>
          {isEn
            ? 'Starlight Saju reads your texture through Korean cosmology.'
            : '별빛 사주는 당신의 결을 명리학으로 다시 읽어드립니다.'}
        </p>
      </div>
    );
  }

  /* ===== SCREEN 1: Birth Input ===== */
  function renderBirthInput() {
    const isEn = lang === 'en';
    const isYearly = appMode === 'yearly';
    const eyebrowTitle = t(isYearly ? 'yearlyTitle' : 'sajuTitle', lang);
    const eyebrowDesc = t(isYearly ? 'yearlyDesc' : 'sajuDesc', lang);
    const heroImage = isYearly ? '/images/orot/home-feat-year.webp' : '/images/orot/home-feat-saju.webp';
    const heroFramingId = isYearly ? 'home-feat-year-hero' : 'home-feat-saju-hero';
    const heroTitle = isYearly
      ? (isEn ? 'A look ahead at the flow\nthis year brings' : '올해 내게 올 흐름을\n미리 살펴봐요')
      : (isEn ? 'Through your birth chart,\nlook within' : '태어난 날의 사주로\n나를 들여다봐요');
    const ctaLabel = appMode === 'yearly'
      ? (isEn ? 'Read my 2026 ›' : '2026 풀이 시작 ›')
      : (isEn ? 'Start my reading ›' : '내 사주 풀이 시작 ›');

    return (
      <div className="inner screen-enter orot-root orot-form-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        <button
          onClick={() => setCurrentScreen(0)}
          aria-label={t('backBtn', lang)}
          style={{
            background: 'transparent', border: 0, color: 'var(--orot-ink)',
            fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
            fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
        </button>

        {/* Hero BleedCard */}
        <BleedCard
          image={heroImage}
          framingId={heroFramingId}
          veil="left"
          minHeight={220}
          style={{ marginBottom: 20 }}
        >
          <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '62%' }}>
            <div style={{ marginBottom: 14 }}>
              <div className="orot-eyebrow">{eyebrowTitle}</div>
              <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 4, marginLeft: 21, fontFamily: 'var(--orot-font)', letterSpacing: '0.01em' }}>{eyebrowDesc}</div>
            </div>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: 'var(--orot-ink)',
              letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0,
              whiteSpace: 'pre-line', fontFamily: 'var(--orot-font)',
              background: 'none', WebkitTextFillColor: 'var(--orot-ink)',
            }}>
              {heroTitle}
            </h1>
          </div>
        </BleedCard>

        {profiles.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--orot-ink-mute)', marginBottom: 8, fontFamily: 'var(--orot-font)' }}>{t('savedProfiles', lang)}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {profiles.map((p, i) => (
                <span key={i} style={{
                  position: 'relative', display: 'inline-flex', alignItems: 'stretch',
                }}>
                <button style={{
                  padding: '8px 28px 8px 14px', borderRadius: '999px', fontSize: 13, fontWeight: 500,
                  background: 'rgba(243, 160, 146, 0.06)', border: '1px solid var(--orot-coral-faint)',
                  color: 'var(--orot-coral)', cursor: 'pointer', fontFamily: 'var(--orot-font)',
                }} onClick={() => {
                  // 2026-05: V4 분기 추가. 기존엔 항상 V3 흐름으로 떨어져서 저장된 프로필 클릭 시
                  // V4 모드여도 V3 결과 페이지가 나오는 버그가 있었음. isV4면 v4Ctx 복원 후 V4 fetch.
                  setUserData({ name: p.name, gender: p.gender, year: p.year, month: p.month, day: p.day, hour: p.hour, concern: p.concern, state: p.state, personality: [...p.personality], relationship: p.relationship, wantToKnow: p.wantToKnow });
                  setBirthPlaceId(p.birthPlaceId ?? '');
                  if (isV4 && appMode === 'saju') {
                    // V4 컨텍스트 복원 (저장돼 있으면 그대로, 없으면 'unknown' 기본값 유지)
                    if (p.v4) {
                      setV4Ctx({
                        relationshipStatus: p.v4.relationshipStatus,
                        hasChildren: p.v4.hasChildren,
                        occupation: p.v4.occupation,
                        concerns: [...p.v4.concerns],
                      });
                    }
                    const sj = calcSaju(p.year, p.month, p.day, p.hour);
                    setSajuResult(sj);
                    setCurrentScreen(3);
                    cancelLoading();
                    // 2026-05: stale closure 방지를 위해 v4Input을 프로필 데이터로
                    // 직접 빌드해서 override로 전달. setUserData가 비동기라
                    // setTimeout 4.5s 뒤에도 fetchSajuReadingV4 closure가 OLD userData를
                    // 읽어 hour=-1로 들어가는 버그 차단.
                    const profileBirthTime = p.hour >= 0
                      ? `${String((p.hour * 2) || 0).padStart(2, '0')}:00`
                      : undefined;
                    const profileV4Input: V4InputShape = {
                      name: p.name || '익명',
                      gender: (p.gender === 'm' ? 'male' : p.gender === 'f' ? 'female' : 'unknown'),
                      calendarType: 'solar' as const, // 저장 프로필은 양력으로 들어왔다 가정
                      birthDate: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`,
                      birthTime: profileBirthTime,
                      birthTimeConfidence: p.hour >= 0 ? 'approximate' : 'unknown',
                      timezone: 'Asia/Seoul' as const,
                      relationshipStatus: p.v4?.relationshipStatus ?? 'unknown',
                      hasChildren: p.v4 ? (p.v4.hasChildren === 'true' ? true : p.v4.hasChildren === 'false' ? false : 'unknown') : 'unknown',
                      occupation: p.v4?.occupation || undefined,
                      currentConcerns: p.v4?.concerns ?? [],
                    };
                    const controller = new AbortController();
                    abortControllerRef.current = controller;
                    loadingTimeoutRef.current = setTimeout(() => {
                      loadingTimeoutRef.current = null;
                      if (controller.signal.aborted) return;
                      setCurrentScreen(8); // teaser/paywall first
                      fetchSajuReadingV4(controller.signal, profileV4Input);
                    }, 2600);
                    return;
                  }
                  if (YEARLY_FORTUNE_UI_ENABLED && appMode === 'yearly') {
                    // 올해운세 V4: 저장 프로필 클릭도 v3 질문/fetch 우회 → teaser(8) 직행 (concern/state 불필요).
                    setSajuResult(calcSaju(p.year, p.month, p.day, p.hour));
                    setCurrentScreen(8);
                    return;
                  }
                  if (p.concern >= 0 && p.state >= 0) {
                    const sj = calcSaju(p.year, p.month, p.day, p.hour);
                    setSajuResult(sj);
                    setCurrentScreen(3);
                    setTimeout(() => {
                      if (appMode === 'yearly') {
                        setCurrentScreen(8); // Go to teaser/paywall first
                        fetchYearlyReading(sj);
                      } else {
                        setCurrentScreen(8); // Go to teaser/paywall first
                        const oh = getOhCount(sj);
                        const cachedYs2 = getCachedYongsin(sj) || undefined;
                        if (cachedYs2) setLlmYongsin(cachedYs2);
                        fetchSajuReading(buildSajuPrompts(sj, oh, { name: p.name, gender: p.gender, year: p.year, month: p.month, day: p.day, hour: p.hour, concern: p.concern, state: p.state, personality: p.personality, relationship: p.relationship, wantToKnow: p.wantToKnow, lang }, cachedYs2));
                      }
                    }, 2600);
                  }
                }}>
                  {p.name} ({p.year}.{p.month}.{p.day})
                </button>
                <button
                  type="button"
                  aria-label={`${p.name} 프로필 삭제`}
                  title="프로필 삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!confirm(`${p.name} 프로필을 삭제할까?`)) return;
                    const next = profiles.filter((_, idx) => idx !== i);
                    saveProfiles(next);
                  }}
                  style={{
                    position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)',
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(243, 160, 146, 0.15)',
                    border: '1px solid var(--orot-coral-faint)',
                    color: 'var(--orot-coral)',
                    fontSize: 11, lineHeight: 1, fontWeight: 700,
                    cursor: 'pointer', padding: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="orot-card" style={{ marginBottom: 16 }}>
          <div className="input-group">
            <label htmlFor="input-name">{t('name', lang)}</label>
            <input id="input-name" type="text" maxLength={50} placeholder={t('namePlaceholder', lang)} value={userData.name} onChange={e => updateUser('name', e.target.value)} aria-label={t('name', lang)} />
          </div>
          <div className="input-group">
            <label id="gender-label">{t('gender', lang)}</label>
            <div className="pill-toggle" role="group" aria-labelledby="gender-label">
              <button className={userData.gender === 'm' ? 'active' : ''} onClick={() => updateUser('gender', 'm')} aria-pressed={userData.gender === 'm'}>{t('male', lang)}</button>
              <button className={userData.gender === 'f' ? 'active' : ''} onClick={() => updateUser('gender', 'f')} aria-pressed={userData.gender === 'f'}>{t('female', lang)}</button>
            </div>
          </div>
          <div className="input-group">
            <label id="calendar-label">{t('calendarType', lang)}</label>
            <div className="pill-toggle" role="group" aria-labelledby="calendar-label">
              <button className={!isLunar ? 'active' : ''} onClick={() => setIsLunar(false)} aria-pressed={!isLunar}>{t('solar', lang)}</button>
              <button className={isLunar ? 'active' : ''} onClick={() => setIsLunar(true)} aria-pressed={isLunar}>{t('lunar', lang)}</button>
            </div>
          </div>
          <div className="input-group">
            <label id="birthday-label">{t('birthday', lang)}</label>
            <div className="select-row" role="group" aria-labelledby="birthday-label">
              <div className="input-group">
                <select value={userData.year} onChange={e => updateUser('year', parseInt(e.target.value))} aria-label={lang === 'en' ? 'Birth year' : '출생 연도'} aria-required="true">
                  {Array.from({ length: 86 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}{t('yearUnit', lang)}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <select value={userData.month} onChange={e => updateUser('month', parseInt(e.target.value))} aria-label={lang === 'en' ? 'Birth month' : '출생 월'} aria-required="true">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{t('monthName' + m as any, lang)}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <select value={userData.day} onChange={e => updateUser('day', parseInt(e.target.value))} aria-label={lang === 'en' ? 'Birth day' : '출생 일'} aria-required="true">
                  {Array.from({ length: getDaysInMonth(userData.year, userData.month) }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}{t('dayUnit', lang)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="input-group">
            <label id="birthtime-label">{t('birthTime', lang)}</label>
            <div className="time-grid" role="radiogroup" aria-labelledby="birthtime-label">
              {TIMES.map(ti => (
                <div key={ti.h} role="radio" aria-checked={userData.hour === ti.h} tabIndex={0}
                  className={'time-option' + (userData.hour === ti.h ? ' selected' : '')}
                  onClick={() => updateUser('hour', ti.h)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateUser('hour', ti.h); } }}>
                  <div className="time-range">{ti.range}</div>
                                    <div className="time-hangul">{t(TIME_I18N_KEYS[ti.h], lang)}</div>
                </div>
              ))}
              <div role="radio" aria-checked={userData.hour === -1} tabIndex={0}
                className={'time-option unknown-time' + (userData.hour === -1 ? ' selected' : '')}
                onClick={() => { updateUser('hour', -1); setUseExactTime(false); setExactHour(-1); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateUser('hour', -1); setUseExactTime(false); setExactHour(-1); } }}>
                {t('unknownTime', lang)}
              </div>
            </div>
            <div className="exact-time-section">
              <label className="exact-time-toggle" onClick={() => {
                const next = !useExactTime;
                setUseExactTime(next);
                if (!next) { setExactHour(-1); setExactMinute(0); }
                else if (exactHour < 0) { setExactHour(0); setExactMinute(0); updateUser('hour', exactTimeToSiju(0, 0)); }
              }}>
                <span className={'exact-time-checkbox' + (useExactTime ? ' checked' : '')}>{useExactTime ? '✓' : ''}</span>
                {t('knowExactTime', lang)}
              </label>
              {useExactTime && (
                <div className="exact-time-inputs">
                  <select className="exact-time-select" value={exactHour} onChange={e => {
                    const h = parseInt(e.target.value);
                    setExactHour(h);
                    updateUser('hour', exactTimeToSiju(h, exactMinute));
                  }}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}{t('hourUnit', lang)}</option>
                    ))}
                  </select>
                  <select className="exact-time-select" value={exactMinute} onChange={e => {
                    const m = parseInt(e.target.value);
                    setExactMinute(m);
                    updateUser('hour', exactTimeToSiju(exactHour, m));
                  }}>
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}{t('minuteUnit', lang)}</option>
                    ))}
                  </select>
                  <span className="exact-time-siju">{'→ ' + (lang === 'en' ? TIMES[exactTimeToSiju(exactHour < 0 ? 0 : exactHour, exactMinute)].hanja.replace('시', '') : TIMES[exactTimeToSiju(exactHour < 0 ? 0 : exactHour, exactMinute)].hanja)}</span>
                </div>
              )}
              <p className="exact-time-note">{t('exactTimeNote', lang)}</p>
            </div>
          </div>
          {SAJU_PRECISION_INPUTS_ENABLED && (
            <PlaceSelect value={birthPlaceId} onChange={setBirthPlaceId} lang={lang === 'en' ? 'en' : 'ko'} />
          )}
        </div>
        <div style={{
          background: 'rgba(243, 160, 146, 0.06)',
          border: '1px solid var(--orot-coral-faint)',
          borderRadius: 'var(--orot-r-md)',
          padding: '12px 14px',
          marginBottom: 16,
          color: 'var(--orot-ink-soft)',
          fontSize: 12,
          lineHeight: 1.6,
          fontFamily: 'var(--orot-font)',
        }}>
          {isEn
            ? 'Your info is used only for the reading and can be deleted anytime.'
            : '입력하신 정보는 풀이에만 사용되며 언제든 삭제하실 수 있어요.'}
        </div>
        <button
          className="orot-btn orot-btn--primary orot-btn--full"
          onClick={() => {
            if (!userData.name) updateUser('name', t('anonymous', lang));
            // 올해운세 V4도 개인사주 v4와 동일하게 screen 2(질문)로 진행. screen 2가 v4 질문(renderV4Questions)을 렌더.
            setCurrentScreen(2); setQuestionStep(0);
          }}
        >
          {ctaLabel}
        </button>
      </div>
    );
  }

  /* ===== SCREEN 2: Questions ===== */
  function renderQuestions() {
    // v4 분기: 개인사주 v4 + 올해운세 V4(flag on) 모두 동일한 v4 질문(혼인/자녀/직업/관심사) 흐름 사용.
    //   → v3 질문/프로필 저장 흐름과 분리(v4 프로필로 저장). flag off 올해운세는 아래 기존 v3 질문 유지.
    if ((isV4 && appMode === 'saju') || (YEARLY_FORTUNE_UI_ENABLED && appMode === 'yearly')) return renderV4Questions();

    const concernKeys = ['concern_love', 'concern_career', 'concern_money', 'concern_social', 'concern_health', 'concern_study'];
    const stateKeys = ['state_stable', 'state_change', 'state_stress', 'state_challenge', 'state_unknown'];
    const relKeys = ['rel_single', 'rel_talking', 'rel_dating', 'rel_married', 'rel_brokeup'];
    const interestKeys = ['interest_yearly', 'interest_love', 'interest_money', 'interest_career', 'interest_timing'];
    const persKeys = [['pers_introvert', 'pers_extrovert'], ['pers_emotional', 'pers_logical'], ['pers_planner', 'pers_spontaneous']];
    const localConcernLabels = concernKeys.map(k => t(k, lang));
    const localStateLabels = stateKeys.map(k => t(k, lang));
    const localRelLabels = relKeys.map(k => t(k, lang));
    const localInterestLabels = interestKeys.map(k => t(k, lang));

    const renderGrid = (labels: string[], field: string, currentVal: number, cols?: string) => (
      <div className="option-grid" role="radiogroup" style={cols ? { gridTemplateColumns: cols } : undefined}>
        {labels.map((label, i) => {
          const parts = label.split(' ');
          const hasIcon = parts[0].length <= 2;
          return (
            <div key={i} role="radio" aria-checked={currentVal === i} tabIndex={0}
              className={'option-card' + (currentVal === i ? ' selected' : '')}
              onClick={() => updateUser(field, i)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateUser(field, i); } }}>
              {hasIcon && <span className="icon">{parts[0]}</span>}
              {hasIcon ? parts.slice(1).join(' ') : label}
            </div>
          );
        })}
      </div>
    );

    return (
      <div className="inner screen-enter orot-root orot-form-screen" style={{ paddingTop: '24px' }}>
        <button
          onClick={() => setCurrentScreen((appMode === 'saju' || appMode === 'yearly') ? 1 : 0)}
          aria-label={t('backBtn', lang)}
          style={{
            background: 'transparent', border: 0, color: 'var(--orot-ink)',
            fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
            fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
        </button>
        <div style={{ marginBottom: 16 }}>
          <div className="orot-eyebrow" style={{ marginBottom: 10 }}>
            {lang === 'en' ? `Question ${questionStep + 1} of 4` : `질문 ${questionStep + 1} / 4`}
          </div>
          <div className="progress-dots" style={{ marginTop: 0, marginBottom: 0 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={'dot' + (i < questionStep ? ' done' : '') + (i === questionStep ? ' active' : '')} />
            ))}
          </div>
        </div>
        <div className="orot-card" style={{ animation: 'fadeInUp 0.4s ease' }}>
          {questionStep === 0 && (
            <>
              <h3>{t('q1Title', lang)}</h3>
              {renderGrid(localConcernLabels, 'concern', userData.concern)}
            </>
          )}
          {questionStep === 1 && (
            <>
              <h3>{t('q2Title', lang)}</h3>
              {renderGrid(localStateLabels, 'state', userData.state, '1fr')}
            </>
          )}
          {questionStep === 2 && (
            <>
              <h3>{t('q3Title', lang)}<br /><span style={{ fontSize: 13, color: 'var(--orot-ink-soft)', fontWeight: 400, fontFamily: 'var(--orot-font)' }}>{t('q3Sub', lang)}</span></h3>
              {persKeys.map((pairKeys, pi) => [t(pairKeys[0], lang), t(pairKeys[1], lang)]).map((pair, pi) => (
                <div key={pi} className="pair-toggle" role="group">
                  <div role="radio" aria-checked={userData.personality[pi] === 0} tabIndex={0}
                    className={'pair-btn' + (userData.personality[pi] === 0 ? ' active' : '')}
                    onClick={() => { const newP = [...userData.personality]; newP[pi] = 0; updateUser('personality', newP); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const newP = [...userData.personality]; newP[pi] = 0; updateUser('personality', newP); } }}>{pair[0]}</div>
                  <div className="vs" aria-hidden="true">↔</div>
                  <div role="radio" aria-checked={userData.personality[pi] === 1} tabIndex={0}
                    className={'pair-btn' + (userData.personality[pi] === 1 ? ' active' : '')}
                    onClick={() => { const newP = [...userData.personality]; newP[pi] = 1; updateUser('personality', newP); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const newP = [...userData.personality]; newP[pi] = 1; updateUser('personality', newP); } }}>{pair[1]}</div>
                </div>
              ))}
            </>
          )}
          {questionStep === 3 && (
            <>
              <h3>{t('q4Title', lang)}</h3>
              {renderGrid(localRelLabels, 'relationship', userData.relationship, '1fr')}
            </>
          )}
          {/* 5번째 질문 삭제됨 */}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {questionStep > 0 && (
            <button className="orot-btn orot-btn--ghost" style={{ flex: 1 }} onClick={() => setQuestionStep(questionStep - 1)}>
              {t('prev', lang)}
            </button>
          )}
          <button className="orot-btn orot-btn--primary" style={{ flex: 1 }} onClick={() => {
            if (questionStep < 3) setQuestionStep(questionStep + 1);
            else {
              /* 프로필 자동 저장 */
              const exists = profiles.find(pr => pr.name === userData.name && pr.year === userData.year && pr.month === userData.month && pr.day === userData.day);
              if (!exists && userData.name) {
                const newProfile: SavedProfile = {
                  name: userData.name, gender: userData.gender, year: userData.year, month: userData.month, day: userData.day, hour: userData.hour,
                  concern: userData.concern, state: userData.state, personality: [...userData.personality], relationship: userData.relationship, wantToKnow: userData.wantToKnow,
                  ...(birthPlaceId ? { birthPlaceId } : {}),
                };
                const updated = [...profiles, newProfile].slice(-10);
                saveProfiles(updated);
              } else if (exists) {
                const updated = profiles.map(pr =>
                  (pr.name === userData.name && pr.year === userData.year && pr.month === userData.month && pr.day === userData.day)
                  ? { ...pr, concern: userData.concern, state: userData.state, personality: [...userData.personality], relationship: userData.relationship, wantToKnow: userData.wantToKnow, hour: userData.hour, gender: userData.gender, birthPlaceId: birthPlaceId || pr.birthPlaceId }
                  : pr
                );
                saveProfiles(updated);
              }
              doCalculation();
            }
          }}>
            {questionStep < 3 ? t('next', lang) : t('viewResults', lang)}
          </button>
        </div>
      </div>
    );
  }

  /* ===== SCREEN 2 (v4): Questions — 혼인/자녀/직업/관심사 (v3 디자인 fork) ===== */
  function renderV4Questions() {
    const isEn = lang === 'en';
    const relOptions: Array<{ v: V4RelStatus; label: string }> = [
      { v: 'single',   label: isEn ? 'Single' : '미혼/싱글' },
      { v: 'dating',   label: isEn ? 'Dating' : '연애 중' },
      { v: 'married',  label: isEn ? 'Married' : '기혼' },
      { v: 'divorced', label: isEn ? 'Divorced' : '이혼' },
      { v: 'widowed',  label: isEn ? 'Widowed' : '사별' },
      { v: 'unknown',  label: isEn ? 'Skip' : '선택 안 함' },
    ];
    const childOptions: Array<{ v: V4HasChildren; label: string }> = [
      { v: 'unknown', label: isEn ? 'Skip' : '선택 안 함' },
      { v: 'false',   label: isEn ? 'No children' : '없음' },
      { v: 'true',    label: isEn ? 'Have children' : '있음' },
    ];
    const concernOptions: Array<{ v: V4Concern; label: string }> = [
      { v: 'career',       label: isEn ? 'Career' : '직업/커리어' },
      { v: 'money',        label: isEn ? 'Money' : '돈/재물' },
      { v: 'relationship', label: isEn ? 'Relationship' : '인간관계' },
      { v: 'marriage',     label: isEn ? 'Marriage' : '결혼' },
      { v: 'family',       label: isEn ? 'Family' : '가족' },
      { v: 'health',       label: isEn ? 'Health' : '건강' },
      { v: 'study',        label: isEn ? 'Study' : '학업' },
      { v: 'business',     label: isEn ? 'Business' : '사업' },
      { v: 'personality',  label: isEn ? 'Personality' : '성격' },
      { v: 'future',       label: isEn ? 'Future' : '미래' },
    ];
    return (
      <div className="inner screen-enter orot-root orot-form-screen" style={{ paddingTop: '24px' }}>
        <button onClick={() => setCurrentScreen(1)} aria-label={t('backBtn', lang)}
          style={{ background: 'transparent', border: 0, color: 'var(--orot-ink)', fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12, fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
        </button>
        <div style={{ marginBottom: 16 }}>
          <div className="orot-eyebrow" style={{ marginBottom: 10 }}>
            {isEn ? `Question ${questionStep + 1} of 4` : `질문 ${questionStep + 1} / 4`}
          </div>
          <div className="progress-dots" style={{ marginTop: 0, marginBottom: 0 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={'dot' + (i < questionStep ? ' done' : '') + (i === questionStep ? ' active' : '')} />
            ))}
          </div>
        </div>
        <div className="orot-card" style={{ animation: 'fadeInUp 0.4s ease' }}>
          {questionStep === 0 && (
            <>
              <h3>{isEn ? 'What is your current relationship status?' : '현재 혼인 상태가 어떻게 되세요?'}</h3>
              <div className="option-grid" role="radiogroup" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {relOptions.map(o => (
                  <div key={o.v} role="radio" aria-checked={v4Ctx.relationshipStatus === o.v} tabIndex={0}
                    className={'option-card' + (v4Ctx.relationshipStatus === o.v ? ' selected' : '')}
                    onClick={() => updateV4Ctx('relationshipStatus', o.v)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateV4Ctx('relationshipStatus', o.v); } }}>
                    {o.label}
                  </div>
                ))}
              </div>
            </>
          )}
          {questionStep === 1 && (
            <>
              <h3>{isEn ? 'Do you have children?' : '자녀가 있으신가요?'}</h3>
              <div className="option-grid" role="radiogroup" style={{ gridTemplateColumns: '1fr' }}>
                {childOptions.map(o => (
                  <div key={o.v} role="radio" aria-checked={v4Ctx.hasChildren === o.v} tabIndex={0}
                    className={'option-card' + (v4Ctx.hasChildren === o.v ? ' selected' : '')}
                    onClick={() => updateV4Ctx('hasChildren', o.v)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateV4Ctx('hasChildren', o.v); } }}>
                    {o.label}
                  </div>
                ))}
              </div>
            </>
          )}
          {questionStep === 2 && (
            <>
              <h3>{isEn ? 'What is your occupation?' : '직업이 어떻게 되세요?'}<br />
                <span style={{ fontSize: 13, color: 'var(--orot-ink-soft)', fontWeight: 400, fontFamily: 'var(--orot-font)' }}>
                  {isEn ? 'Optional — feel free to skip' : '선택 사항 — 비워두셔도 됩니다'}
                </span>
              </h3>
              <input type="text" value={v4Ctx.occupation}
                onChange={e => updateV4Ctx('occupation', e.target.value)}
                placeholder={isEn ? 'e.g. Designer, Student, Developer' : '예: 디자이너, 학생, 개발자'}
                style={{ width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 8, border: '1px solid var(--orot-hair)', background: 'rgba(243,231,207,0.04)', color: 'var(--orot-ink)', boxSizing: 'border-box' }} />
            </>
          )}
          {questionStep === 3 && (
            <>
              <h3>{isEn ? 'What are you curious about lately?' : '요즘 어떤 게 궁금하세요?'}<br />
                <span style={{ fontSize: 13, color: 'var(--orot-ink-soft)', fontWeight: 400, fontFamily: 'var(--orot-font)' }}>
                  {isEn ? 'Choose any that apply' : '여러 개 선택 가능'}
                </span>
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {concernOptions.map(o => {
                  const active = v4Ctx.concerns.includes(o.v);
                  return (
                    <button key={o.v} type="button" onClick={() => toggleV4Concern(o.v)}
                      style={{
                        padding: '10px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
                        border: '1px solid ' + (active ? 'var(--orot-coral)' : 'var(--orot-hair)'),
                        background: active ? 'rgba(243,160,146,0.12)' : 'transparent',
                        color: active ? 'var(--orot-coral)' : 'var(--orot-ink)',
                        fontWeight: active ? 700 : 400,
                        fontFamily: 'var(--orot-font)',
                      }}>{o.label}</button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {questionStep > 0 && (
            <button className="orot-btn orot-btn--ghost" style={{ flex: 1 }} onClick={() => setQuestionStep(questionStep - 1)}>
              {t('prev', lang)}
            </button>
          )}
          <button className="orot-btn orot-btn--primary" style={{ flex: 1 }} onClick={() => {
            if (questionStep < 3) {
              setQuestionStep(questionStep + 1);
              return;
            }
            // v4 프로필 자동 저장 — 이름이 있는 경우만, 동일 키 존재 시 업데이트
            // 2026-05: v4Ctx도 저장해서 다음에 같은 프로필 클릭 시 V4 결과로 복원되도록
            try {
              const v4Snapshot = {
                relationshipStatus: v4Ctx.relationshipStatus,
                hasChildren: v4Ctx.hasChildren,
                occupation: v4Ctx.occupation,
                concerns: [...v4Ctx.concerns],
              };
              const exists = profiles.find(pr => pr.name === userData.name && pr.year === userData.year && pr.month === userData.month && pr.day === userData.day);
              if (userData.name) {
                if (!exists) {
                  const newProfile: SavedProfile = {
                    name: userData.name, gender: userData.gender,
                    year: userData.year, month: userData.month, day: userData.day, hour: userData.hour,
                    concern: userData.concern, state: userData.state,
                    personality: [...userData.personality], relationship: userData.relationship, wantToKnow: userData.wantToKnow,
                    ...(birthPlaceId ? { birthPlaceId } : {}),
                    v4: v4Snapshot,
                  };
                  const updated = [...profiles, newProfile].slice(-10);
                  saveProfiles(updated);
                } else {
                  const updated = profiles.map(pr =>
                    (pr.name === userData.name && pr.year === userData.year && pr.month === userData.month && pr.day === userData.day)
                      ? { ...pr, hour: userData.hour, gender: userData.gender, birthPlaceId: birthPlaceId || pr.birthPlaceId, v4: v4Snapshot }
                      : pr
                  );
                  saveProfiles(updated);
                }
              }
            } catch { /* ignore */ }
            doCalculation();  // Step 3에서 isV4 분기로 v4 fetch 호출 예정
          }}>
            {questionStep < 3 ? t('next', lang) : t('viewResults', lang)}
          </button>
        </div>
      </div>
    );
  }

  /* ===== SCREEN 3: Loading ===== */
  function renderLoading() {
    const isEn = lang === 'en';
    const steps = [t('loading1', lang), t('loading2', lang), t('loading3', lang)];
    return (
      <div className="inner screen-enter orot-root" style={{
        paddingTop: '24px', paddingBottom: 32, textAlign: 'center',
        minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      }}>
        <button
          onClick={() => { cancelLoading(); setIsLoading(false); setIsGenerating(false); setCurrentScreen(2); }}
          aria-label={t('backBtn', lang)}
          style={{
            alignSelf: 'flex-start',
            background: 'transparent', border: 0, color: 'var(--orot-ink)',
            fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
            fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <div className="orot-moon orot-breathe" style={{ width: 64, height: 64, marginBottom: 28 }} aria-hidden="true" />

          <h2 style={{
            fontSize: 22, fontWeight: 700, color: 'var(--orot-ink)',
            letterSpacing: '-0.012em', margin: '0 0 8px', fontFamily: 'var(--orot-font)',
          }}>
            {isEn ? 'Reading your texture' : '결을 살펴보는 중'}
          </h2>
          <p style={{
            fontSize: 14, color: 'var(--orot-ink-soft)',
            lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line', fontFamily: 'var(--orot-font)',
          }}>
            {isEn ? 'Just a moment, please.\nStarlight is settling into place.' : '잠시만 기다려 주세요.\n별빛이 자리를 잡고 있어요.'}
          </p>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 32 }} aria-hidden="true">
            {steps.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i <= loadingStep ? 'var(--orot-coral)' : 'var(--orot-hair-strong)',
                opacity: i === loadingStep ? 1 : (i < loadingStep ? 0.7 : 0.4),
                transition: 'all 240ms ease',
              }} />
            ))}
          </div>

          <div role="status" aria-live="polite" style={{
            marginTop: 18, fontSize: 12, color: 'var(--orot-ink-mute)', fontFamily: 'var(--orot-font)',
            minHeight: 18,
          }}>
            {steps[loadingStep] || ''}
          </div>

          {/* 기다리는 동안 읽을거리 — 이미 계산된 사주 원국(결정론) 노출 */}
          {sajuResult && (
            <div className="orot-card" style={{ marginTop: 30, padding: '16px 16px', width: '100%', maxWidth: 360 }}>
              <div style={{ fontSize: 11, color: 'var(--orot-coral)', fontWeight: 700, marginBottom: 12, fontFamily: 'var(--orot-font)', letterSpacing: '0.05em' }}>
                {isEn ? 'YOUR CHART' : '당신의 사주 원국'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                  { l: isEn ? 'Hour' : '시', s: sajuResult.hStem, b: sajuResult.hBranch },
                  { l: isEn ? 'Day' : '일', s: sajuResult.dStem, b: sajuResult.dBranch },
                  { l: isEn ? 'Month' : '월', s: sajuResult.mStem, b: sajuResult.mBranch },
                  { l: isEn ? 'Year' : '년', s: sajuResult.yStem, b: sajuResult.yBranch },
                ].map((p, i) => (
                  <div key={i} style={{ textAlign: 'center', borderRadius: 10, border: '1px solid var(--orot-hair)', background: 'rgba(255,255,255,0.02)', padding: '10px 4px' }}>
                    <div style={{ fontSize: 10, color: 'var(--orot-ink-mute)', marginBottom: 6, fontFamily: 'var(--orot-font)' }}>{p.l}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--orot-ink)', fontFamily: 'var(--orot-font)', lineHeight: 1.25 }}>{CG[p.s] ?? '–'}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--orot-ink-soft)', fontFamily: 'var(--orot-font)', lineHeight: 1.25 }}>{JJ[p.b] ?? '–'}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--orot-ink-soft)', marginTop: 12, fontFamily: 'var(--orot-font)', textAlign: 'center', wordBreak: 'keep-all' }}>
                {isEn ? `Your day master is ${CG[sajuResult.dStem] ?? ''}.` : `당신의 일간은 ${CG[sajuResult.dStem] ?? ''}이에요. 이 한 글자에서 해석이 시작돼요.`}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ===== SCREEN 4: Results ===== */
  function renderResults() {
    // v4 결과가 복원되어 있으면 (현재 풀이 또는 저장된 v4 결과 클릭) v4 화면.
    // isV4 prop과 무관 — 메인 페이지에서 저장된 v4 결과 클릭해도 표시됨.
    if (v4Resp) {
      const isEnV4 = lang === 'en';
      const userName = userData.name || t('anonymous', lang);
      const birthSummary = `${userData.year}년 ${userData.month}월 ${userData.day}일${userData.hour >= 0 ? ' ' + ['자','축','인','묘','진','사','오','미','신','유','술','해'][userData.hour] + '시' : ' (시간미상)'} (${isLunar ? '음력' : '양력'})`;
      const teaserBirthLine = isEnV4
        ? `${userData.year}-${String(userData.month).padStart(2,'0')}-${String(userData.day).padStart(2,'0')}`
        : `${userData.year}년 ${userData.month}월 ${userData.day}일`;
      return (
        <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: 24, paddingBottom: 32 }}>
          <button onClick={() => { setCurrentScreen(0); setAiText(''); setV4Resp(null); }}
            aria-label={t('backBtn', lang)}
            style={{ background: 'transparent', border: 0, color: 'var(--orot-ink)', fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12, fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
          </button>

          <BleedCard
            image="/images/orot/saju-in-character.webp"
            framingId="saju-in-character"
            veil="left"
            minHeight={240}
            style={{ marginBottom: 20 }}
          >
            <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '70%' }}>
              <div className="orot-eyebrow" style={{ marginBottom: 12 }}>{isEnV4 ? 'My reading' : '나의 풀이'}</div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--orot-ink)', letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0, fontFamily: 'var(--orot-font)' }}>
                {userName}{t('sajuAnalysisOf', lang)}
              </h1>
              <p style={{ fontSize: 12, color: 'var(--orot-ink-mute)', margin: '10px 0 0', fontFamily: 'var(--orot-font)' }}>
                {teaserBirthLine} {t('born', lang)}
              </p>
            </div>
          </BleedCard>

          {/* v4 본문 — Sajupan 명리 카드 + 차별화 4섹션 등 (자체 wrapper 포함) */}
          <SajuV4Report api={v4Resp} parsed={parseSajuReport(v4Resp.reportText)} birthSummary={birthSummary} lang={lang} />

          {/* v3 톤 공유/저장/재시작 */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <button className="orot-btn orot-btn--ghost" style={{ flex: 1, height: 44, fontSize: 13 }}
              disabled={isSharingLink}
              onClick={() => shareLink(aiText, userName + (isEnV4 ? "'s Saju Reading" : '의 사주 해설'))}>
              {t('share', lang)}
            </button>
            <button className="orot-btn orot-btn--ghost" style={{ flex: 1, height: 44, fontSize: 13 }}
              onClick={() => {
                try {
                  const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                  const newResult = { name: userName, date: new Date().toLocaleDateString(), type: isEnV4 ? 'Saju (v4)' : '개인사주 v4', text: aiText, v4Api: v4Resp, user: userData };
                  const updated = [newResult, ...results].slice(0, 20);
                  try { localStorage.setItem('saju-saved-results', JSON.stringify(updated)); setSavedResults(updated); } catch { /* quota */ }
                } catch { /* ignore */ }
              }}>{t('saveResult', lang)}</button>
            <button className="orot-btn orot-btn--ghost" style={{ flex: 1, height: 44, fontSize: 13 }}
              onClick={() => { setCurrentScreen(0); setAiText(''); setV4Resp(null); }}>{t('restart', lang)}</button>
          </div>
        </div>
      );
    }
    if (!sajuResult) {
      // Saved result view — no saju calc data, just AI text
      if (aiText) {
        const isEn = lang === 'en';
        return (
          <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
            <button
              onClick={() => { setCurrentScreen(0); setAiText(''); }}
              aria-label={t('backBtn', lang)}
              style={{
                background: 'transparent', border: 0, color: 'var(--orot-ink)',
                fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
                fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
            </button>
            <BleedCard veil="soft" minHeight={160} style={{ marginBottom: 20 }}>
              <div style={{ paddingTop: 6, paddingBottom: 6 }}>
                <div className="orot-eyebrow" style={{ marginBottom: 10 }}>
                  📂 {isEn ? 'Saved reading' : '저장된 해석'}
                </div>
                <h1 style={{
                  fontSize: 24, fontWeight: 700, color: 'var(--orot-ink)',
                  letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0,
                  fontFamily: 'var(--orot-font)',
                  background: 'none', WebkitTextFillColor: 'var(--orot-ink)',
                }}>
                  {isEn ? 'A reading you saved' : '내가 저장해 둔 해석'}
                </h1>
              </div>
            </BleedCard>
            <div className="section-divider">{t('aiReading', lang)}</div>
            {renderTOC(aiText)}
            <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
              <button className="orot-btn orot-btn--ghost" style={{ flex: 1, height: 44, fontSize: 13 }}
                disabled={isSharingLink}
                onClick={() => shareLink(aiText, isEn ? 'Saved Result' : '저장된 결과')}>
                {isSharingLink ? (isEn ? '🔗 Creating...' : '🔗 생성 중...') : (isEn ? '🔗 Share Link' : '🔗 링크 공유')}
              </button>
              <button className="orot-btn orot-btn--ghost" style={{ flex: 1, height: 44, fontSize: 13 }}
                disabled={isTranslating}
                onClick={() => {
                  const targetLang = aiTextTranslated ? (lang === 'ko' ? 'ko' : 'en') : (lang === 'ko' ? 'en' : 'ko');
                  translateAiText(aiText, targetLang, (translated) => { setAiText(translated); setAiTextTranslated(!aiTextTranslated); });
                }}>
                {isTranslating ? t('translating', lang) : (aiTextTranslated ? (lang === 'ko' ? t('translateToKo', lang) : t('translateToEn', lang)) : (lang === 'ko' ? t('translateToEn', lang) : t('translateToKo', lang)))}
              </button>
              <button className="orot-btn orot-btn--ghost" style={{ flex: 1, height: 44, fontSize: 13 }}
                onClick={() => { setCurrentScreen(0); setAiText(''); }}>
                {t('restart', lang)}
              </button>
            </div>
          </div>
        );
      }
      return null;
    }
    const sj = sajuResult;
    const ds = sj.dStem;
    const profile = PROFILES[ds];
    const ohCount = getOhCount(sj);
    const ohKeys = ['목', '화', '토', '금', '수'];
    let total = 0;
    ohKeys.forEach(k => { total += ohCount[k]; });
    if (total === 0) total = 1;

    const pillarDesc: Record<string, { ko: string; en: string }> = {
      '시주': { ko: '자녀·말년운', en: 'Children·Later life' },
      '일주': { ko: '나 자신·배우자', en: 'Self·Spouse' },
      '월주': { ko: '부모·사회운', en: 'Parents·Social' },
      '년주': { ko: '조상·초년운', en: 'Ancestors·Early life' },
    };
    const pillars = [
      { key: '시주', label: t('pillarHour', lang), desc: pillarDesc['시주'][lang], stem: sj.hStem, branch: sj.hBranch },
      { key: '일주', label: t('pillarDay', lang), desc: pillarDesc['일주'][lang], stem: sj.dStem, branch: sj.dBranch },
      { key: '월주', label: t('pillarMonth', lang), desc: pillarDesc['월주'][lang], stem: sj.mStem, branch: sj.mBranch },
      { key: '년주', label: t('pillarYear', lang), desc: pillarDesc['년주'][lang], stem: sj.yStem, branch: sj.yBranch }
    ];

    const sipsung = getSipsung(sj);
    const sipsungMap: Record<string, string> = { '시주': sipsung['시간'] || '', '일주': '', '월주': sipsung['월간'] || '', '년주': sipsung['년간'] || '' };
    const unsung = get12Unsung(sj);
    const unsungMap: Record<string, string> = { '시주': unsung['시지'] || '', '일주': unsung['일지'] || '', '월주': unsung['월지'] || '', '년주': unsung['년지'] || '' };
    const shinsal = calcShinsal(sj);

    const gilShin = ['천을귀인', '문창귀인', '학당귀인', '천주귀인', '복성귀인', '장성살', '천의성', '금여록', '암록'];
    const gwiin = ['천을귀인', '문창귀인', '학당귀인', '천주귀인', '복성귀인'];
    const shinsalDisplay: Record<string, string> = lang === 'en' ? {
      '천을귀인': 'Noble Star', '문창귀인': 'Literary Star', '장성살': 'General Star',
      '역마살': 'Travel Star', '도화살': 'Charm Star', '화개살': 'Artistic Star',
      '백호살': 'White Tiger', '양인살': 'Blade Star', '귀문관살': 'Ghost Gate',
      '천의성': 'Healer Star', '학당귀인': 'Scholar Star', '천주귀인': 'Heavenly Star',
      '금여록': 'Golden Carriage', '암록': 'Hidden Fortune', '복성귀인': 'Fortune Star',
      '홍염살': 'Romance Star', '괴강살': 'Iron Will', '고진살': 'Solitude Star', '과숙살': 'Inner Depth'
    } : {};
    const shinsalExplain: Record<string, { ko: string; en: string }> = {
      // 귀인 (Noble Helpers)
      '천을귀인': { ko: '어려울 때 귀인이 나타나 도와주는 길한 기운이에요. 가장 강력한 귀인으로, 위기 때 누군가의 도움을 자연스럽게 받게 돼요.', en: 'The most powerful noble helper — people naturally come to your aid in times of crisis' },
      '문창귀인': { ko: '학문, 글쓰기, 시험에 특별한 재능이 있다는 표시예요. 공부, 자격증, 창작 활동에서 빛을 발해요.', en: 'Special talent in studies, writing, and exams — excels in academics and creative work' },
      '학당귀인': { ko: '배움에 대한 타고난 열정이 있어요. 평생 학습하며 성장하는 타입이에요.', en: 'Natural passion for lifelong learning — grows through continuous study' },
      '천주귀인': { ko: '하늘의 도움으로 위기를 넘기는 수호 기운이에요. 큰 사고나 어려움을 무사히 넘기는 경우가 많아요.', en: 'Heavenly protection — tends to safely overcome major crises and difficulties' },
      '복성귀인': { ko: '타고난 복이 많아 자연스럽게 좋은 일이 따르는 기운이에요. 주변에서 부러워하는 복을 가졌어요.', en: 'Born lucky — good fortune naturally follows, envied by others' },
      // 살 (Star Markers)
      '장성살': { ko: '리더십과 추진력이 강한 장군의 기운이에요. 조직에서 자연스럽게 리더 역할을 맡게 돼요.', en: 'General energy — naturally assumes leadership roles in organizations' },
      '역마살': { ko: '활동적이고 변화를 좋아하며, 여행·이동·해외와 인연이 깊어요. 한 곳에 오래 머물기보다 움직일 때 운이 트여요.', en: 'Deep connection with travel and change — fortune opens through movement, not staying still' },
      '도화살': { ko: '매력이 넘치고 이성에게 인기가 많은 기운이에요. 대인관계가 넓고 첫인상이 좋아요.', en: 'Overflowing charm — popular with others, wide social circle, great first impressions' },
      '화개살': { ko: '예술적 감각과 영적 감수성이 뛰어나요. 종교, 철학, 예술, 명상 분야에서 재능을 발휘해요.', en: 'Exceptional artistic and spiritual sensitivity — talents in art, philosophy, and meditation' },
      '백호살': { ko: '강한 결단력과 용기가 있어요. 수술, 사고 등 갑작스러운 변화에 주의하되, 용기를 살리면 큰 성취를 이뤄요.', en: 'Strong decisiveness and courage — watch for sudden changes, but bravery leads to great achievement' },
      '양인살': { ko: '에너지가 매우 강하고 승부욕이 있어요. 잘 조절하면 큰 힘이 되지만, 성급한 판단은 조심해야 해요.', en: 'Very high energy and competitive — great power when channeled, but watch for impulsive decisions' },
      '귀문관살': { ko: '직감이 예리하고 영감이 뛰어나요. 심리학, 상담, 명상, 창작 분야에서 남다른 통찰력을 발휘해요.', en: 'Sharp intuition — extraordinary insight in psychology, counseling, meditation, and creative fields' },
      '홍염살': { ko: '이성에 대한 관심이 많고 감성이 풍부해요. 연애운이 강하지만 감정에 휘둘리지 않도록 주의해요.', en: 'Rich in romance and emotion — strong love fortune, but be careful not to be swayed by feelings' },
      '괴강살': { ko: '성격이 강하고 자존심이 높아요. 독립심과 결단력이 뛰어나 큰일을 해내는 타입이에요.', en: 'Strong personality with high self-esteem — independence and decisiveness for big achievements' },
      '고진살': { ko: '혼자만의 시간을 즐기고 독립적인 성향이 있어요. 고독을 성장의 기회로 활용하면 좋아요.', en: 'Enjoys solitude and independence — use alone time as an opportunity for personal growth' },
      '과숙살': { ko: '감성이 섬세하고 혼자 있는 시간이 많을 수 있어요. 내면의 성숙함이 빛나는 타입이에요.', en: 'Delicate sensibility with much time alone — inner maturity shines through' },
      '천의성': { ko: '치유와 돌봄에 타고난 재능이 있어요. 의료, 간호, 상담, 복지 분야에서 능력을 발휘해요.', en: 'Natural healing talent — excels in medicine, nursing, counseling, and welfare' },
      '금여록': { ko: '물질적 풍요와 안정을 누릴 수 있는 기운이에요. 재정적으로 안정된 삶을 살 가능성이 높아요.', en: 'Energy for material abundance — high likelihood of financial stability' },
      '암록': { ko: '겉으로 안 보이지만 숨겨진 복과 재능이 있어요. 나이 들수록 진가가 드러나는 타입이에요.', en: 'Hidden blessings and talents — true value reveals itself with age' },
    };

    const energyMap: Record<string, number> = {
      '절': 1, '태': 2, '양': 3, '장생': 5, '목욕': 4, '관대': 7,
      '건록': 9, '제왕': 10, '쇠': 6, '병': 4, '사': 2, '묘': 3
    };
    const energyPoints = [
      { label: t('pillarYear', lang) + '\n' + t('ancestorLabel', lang), value: energyMap[unsung['년지']] || 5 },
      { label: t('pillarMonth', lang) + '\n' + t('parentLabel', lang), value: energyMap[unsung['월지']] || 5 },
      { label: t('pillarDay', lang) + '\n' + t('selfLabel', lang), value: energyMap[unsung['일지']] || 5 },
      { label: t('pillarHour', lang) + '\n' + t('lateYearsLabel', lang), value: unsung['시지'] ? (energyMap[unsung['시지']] || 5) : 5 },
    ];

    const ohColors: Record<string, string> = {'목':'#94b88f','화':'#e88578','토':'#d3b87a','금':'#b5b7c7','수':'#8aa1c4'};

    const isEn = lang === 'en';
    const heroBirthLine = isEn
      ? `${t(('monthName' + userData.month) as any, lang)} ${userData.day}, ${userData.year}`
      : `${userData.year}${t('yearUnit', lang)} ${userData.month}${t('monthUnit', lang)} ${userData.day}${t('dayUnit', lang)}`;
    return (
      <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        <button
          onClick={() => setCurrentScreen(0)}
          aria-label={t('backBtn', lang)}
          style={{
            background: 'transparent', border: 0, color: 'var(--orot-ink)',
            fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
            fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
        </button>
        {/* Reading save status indicator */}
        {readingSaveStatus === 'saving' && (
          <div role="status" aria-live="polite" style={{ textAlign: 'center', fontSize: 13, color: 'var(--orot-ink-mute)', marginBottom: 8 }}>
            {t('savingStatus', lang)}
          </div>
        )}
        {readingSaveStatus === 'saved' && (
          <div role="status" aria-live="polite" style={{ textAlign: 'center', fontSize: 13, color: 'var(--orot-el-wood)', marginBottom: 8 }}>
            {t('savedStatus', lang)}
          </div>
        )}
        {readingSaveStatus === 'failed' && (
          <div role="alert" aria-live="assertive" style={{ textAlign: 'center', fontSize: 13, color: '#EF4444', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {t('saveFailedStatus', lang)}
            {pendingPersist && (
              <button
                onClick={() => setPendingPersist({ ...pendingPersist })}
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, color: '#EF4444', fontSize: 12, cursor: 'pointer', padding: '2px 10px', fontFamily: 'inherit' }}
              >
                {t('retryBtn', lang)}
              </button>
            )}
          </div>
        )}
        {/* Hero BleedCard */}
        <BleedCard veil="left" minHeight={240} style={{ marginBottom: 20 }}>
          <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '80%' }}>
            <div className="orot-eyebrow" style={{ marginBottom: 12 }}>
              {isEn ? 'My reading' : '나의 풀이'}
            </div>
            <p style={{
              fontSize: 13, color: 'var(--orot-ink-soft)', margin: 0,
              fontFamily: 'var(--orot-font)',
            }}>
              {(userData.name || t('anonymous', lang))}{isEn ? '' : ' 님은'}
            </p>
            <h1 style={{
              fontSize: 26, fontWeight: 700, color: 'var(--orot-ink)',
              letterSpacing: '-0.015em', lineHeight: 1.3, margin: '8px 0 0',
              fontFamily: 'var(--orot-font)',
              background: 'none', WebkitTextFillColor: 'var(--orot-ink)',
            }}>
              {userData.name || t('anonymous', lang)}{t('sajuAnalysisOf', lang)}
            </h1>
            <p style={{
              fontSize: 12, color: 'var(--orot-ink-mute)', margin: '10px 0 0',
              fontFamily: 'var(--orot-font)',
            }}>
              {heroBirthLine} {t('born', lang)}
            </p>
          </div>
        </BleedCard>

        {/* Four Pillars - Enhanced */}
        <div className="section-divider">{t('sajuMyeongsik', lang)}</div>
        <PillarDisplay
          pillars={pillars}
          sipsungMap={sipsungMap}
          unsungMap={unsungMap}
          dayMasterStem={ds}
          lang={lang}
        />

        {/* 신살 & 귀인 Badges */}
        {shinsal.length > 0 && (
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: 'var(--text)' }}>{t('shinsalTitle', lang)}</div>
            <SectionExplainer text={getShinsalExplanation(lang)} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {shinsal.map((s, i) => {
                const isGwiin = gwiin.includes(s);
                const isGil = gilShin.includes(s);
                return (
                  <span key={i} style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--orot-font)',
                    background: isGwiin ? 'rgba(243, 160, 146, 0.10)' : isGil ? 'rgba(148, 184, 143, 0.10)' : 'rgba(211, 184, 122, 0.08)',
                    border: isGwiin ? '1px solid var(--orot-coral-faint)' : isGil ? '1px solid rgba(148, 184, 143, 0.30)' : '1px solid rgba(211, 184, 122, 0.25)',
                    color: isGwiin ? 'var(--orot-coral)' : isGil ? 'var(--orot-el-wood)' : 'var(--orot-el-earth)'
                  }}>
                    {isGwiin ? '✦ ' : ''}{shinsalDisplay[s] || s}
                  </span>
                );
              })}
            </div>
            {/* 개별 신살 설명 */}
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shinsal.map((s, i) => {
                const explain = shinsalExplain[s];
                if (!explain) return null;
                const isGwiinItem = gwiin.includes(s);
                return (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--orot-ink-soft)', padding: '6px 10px', borderRadius: 8, background: 'rgba(243, 231, 207, 0.04)', fontFamily: 'var(--orot-font)' }}>
                    <strong style={{ color: isGwiinItem ? 'var(--orot-coral)' : 'var(--orot-el-earth)' }}>{shinsalDisplay[s] || s}</strong>
                    {' — '}{lang === 'en' ? explain.en : explain.ko}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ohaeng Bar Chart - Visual */}
        <div className="section-divider">{t('ohBalance', lang)}</div>
        <OhaengChart ohCount={ohCount} lang={lang} />


        {/* 용신 풀이 카드 — 메인 시각 강조 + 명리학 용어 병기 */}
        {llmYongsin && llmYongsin.explanation && (
          <div className="orot-card" style={{
            padding: 20, marginTop: 24, marginBottom: 16,
            background: 'linear-gradient(180deg, rgba(243,160,146,0.12), rgba(243,160,146,0.03))',
            border: '1px solid var(--orot-coral-faint)',
            borderRadius: 'var(--orot-r-lg)',
          }}>
            <div style={{ fontSize: 14, color: 'var(--orot-coral)', fontWeight: 700, marginBottom: 18, letterSpacing: '0.02em', fontFamily: 'var(--orot-font)', textAlign: 'center' }}>
              ✦ {lang === 'en' ? 'Your saju’s core energy' : '너의 사주 핵심 기운'}
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {/* 가까이 둘 기운 (용신) */}
              <div style={{ flex: 1, padding: '18px 12px', background: 'rgba(243,160,146,0.12)', borderRadius: 16, border: '1.5px solid var(--orot-coral-faint)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginBottom: 10, fontFamily: 'var(--orot-font)', letterSpacing: '0.02em' }}>
                  💎 {lang === 'en' ? 'Keep close' : '가까이 둘 기운'} <span style={{ opacity: 0.65 }}>({lang === 'en' ? 'yongsin' : '용신'})</span>
                </div>
                <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 6 }}>
                  {OH_ICON[llmYongsin.yongsin] || '✦'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--orot-coral)', fontFamily: 'var(--orot-font)' }}>
                  {lang === 'en' ? OH_EN_CAP[llmYongsin.yongsin] : llmYongsin.yongsin}
                </div>
              </div>
              {/* 멀리할 기운 (기신) */}
              <div style={{ flex: 1, padding: '18px 12px', background: 'rgba(138,161,196,0.10)', borderRadius: 16, border: '1.5px solid rgba(138,161,196,0.30)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginBottom: 10, fontFamily: 'var(--orot-font)', letterSpacing: '0.02em' }}>
                  ⚠️ {lang === 'en' ? 'Keep distance' : '멀리할 기운'} <span style={{ opacity: 0.65 }}>({lang === 'en' ? 'gisin' : '기신'})</span>
                </div>
                <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 6 }}>
                  {OH_ICON[llmYongsin.gisin] || '✦'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--orot-el-water)', fontFamily: 'var(--orot-font)' }}>
                  {lang === 'en' ? OH_EN_CAP[llmYongsin.gisin] : llmYongsin.gisin}
                </div>
              </div>
            </div>
            <div style={{ paddingTop: 14, borderTop: '1px solid var(--orot-hair)', fontSize: 13, lineHeight: 1.75, color: 'var(--orot-ink-soft)', fontFamily: 'var(--orot-font)' }}>
              {llmYongsin.explanation}
            </div>
            {llmYongsin.reason && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--orot-ink-mute)', fontFamily: 'var(--orot-font)', textAlign: 'right' }}>
                {lang === 'en' ? 'Based on: ' : '근거: '}{llmYongsin.reason}
              </div>
            )}
          </div>
        )}

        {/* 사주의 다른 결 — 친근한 라벨 + 충돌 안내 */}
        <div className="section-divider">{lang === 'en' ? 'More about your saju' : '사주의 다른 결'}</div>
        <div className="card" style={{ padding: '16px' }}>
          {(() => {
            const ysBase = calcYongsin(sj);
            // LLM이 판정한 용신이 있으면 우선 사용 (검증 통과한 경우만). 없으면 calc 결과 폴백.
            const ys = llmYongsin
              ? { ...ysBase, yongsin: llmYongsin.yongsin, gisin: llmYongsin.gisin, eokbuType: llmYongsin.reason }
              : ysBase;
            const { yongsin, gisin, isStrong, isExtremeSeason, season, johuYongsin, eokbuType, strengthPct, deukryung, tonggeunCount, bigyupCount } = ys;
            const ohSaeng: Record<string, string> = { '목':'수', '화':'목', '토':'화', '금':'토', '수':'금' };
            const heesin = llmYongsin?.heesin || ohSaeng[yongsin] || '';
            const gusin = ohSaeng[gisin] || '';

            // 통관용신
            let tongguanNote = '';
            if (ohCount['목'] >= 2 && ohCount['토'] >= 2) tongguanNote = t('tongguan_wood_earth', lang);
            else if (ohCount['토'] >= 2 && ohCount['수'] >= 2) tongguanNote = t('tongguan_earth_water', lang);
            else if (ohCount['수'] >= 2 && ohCount['화'] >= 2) tongguanNote = t('tongguan_water_fire', lang);
            else if (ohCount['화'] >= 2 && ohCount['금'] >= 2) tongguanNote = t('tongguan_fire_metal', lang);
            else if (ohCount['금'] >= 2 && ohCount['목'] >= 2) tongguanNote = t('tongguan_metal_wood', lang);

            const yongsinColor = ohColors[yongsin] || '#F0C75E';
            const gisinColor = ohColors[gisin] || '#EF4444';
            const heesinColor = ohColors[heesin] || '#6EE7B7';
            const johuDesc: Record<string, string> = {
              '겨울': t('johu_winter', lang),
              '여름': t('johu_summer', lang),
              '봄': t('johu_spring', lang),
              '가을': t('johu_autumn', lang),
            };
            const johu = johuDesc[season] || '';

            return (
              <>
                {/* ⚖️ 타고난 기운의 강약 (신강·신약) */}
                <div style={{ marginBottom: '16px' }}>
                  <SectionExplainer text={getSingangExplanation(isStrong, lang)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--orot-ink)', fontFamily: 'var(--orot-font)' }}>
                      ⚖️ {lang === 'en' ? 'Inner strength' : '타고난 기운의 강약'} <span style={{ fontSize: 11, color: 'var(--orot-ink-mute)', fontWeight: 500 }}>({lang === 'en' ? 'singang/sinyak' : '신강·신약'})</span>
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isStrong ? 'var(--orot-coral)' : 'var(--orot-el-water)', fontFamily: 'var(--orot-font)' }}>
                      {isStrong ? t('singangFull', lang) : t('sinyakFull', lang)}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 24, background: 'rgba(243, 231, 207, 0.06)', borderRadius: 12, overflow: 'hidden', position: 'relative', border: '1px solid var(--orot-hair)' }}>
                    <div style={{
                      width: strengthPct + '%',
                      height: '100%',
                      background: isStrong ? 'var(--orot-coral)' : 'var(--orot-el-water)',
                      borderRadius: 12,
                      transition: 'width 1s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orot-ink-on-pink)', fontFamily: 'var(--orot-font)' }}>{Math.round(strengthPct)}%</span>
                    </div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 10, color: 'var(--orot-ink-mute)', fontWeight: 500, fontFamily: 'var(--orot-font)' }}>
                      {t('weakStrong', lang)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 4, fontFamily: 'var(--orot-font)' }}>
                    <span>{t('deukryungLabel', lang)}: {deukryung ? '✓' : '✗'} | {t('tonggeunLabel', lang)}: {tonggeunCount}{t('countUnit', lang)} | {t('bigyupLabel', lang)}: {bigyupCount}{t('countUnit', lang)}</span>
                  </div>
                  <p style={{ fontSize: 12, marginTop: 8, lineHeight: 1.5, color: 'var(--orot-ink-soft)', fontFamily: 'var(--orot-font)' }}>
                    {isStrong ? t('singangDesc', lang) : t('sinyakDesc', lang)}
                  </p>
                </div>

                {/* 용신/희신/기신 큰 카드 — 위쪽 풀이 카드가 표시될 때는 중복이라 숨김 */}
                {!(llmYongsin && llmYongsin.explanation) && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div style={{ background: 'rgba(148, 184, 143, 0.08)', border: '1px solid rgba(148, 184, 143, 0.25)', borderRadius: 14, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--orot-el-wood)', fontWeight: 700, marginBottom: 4, fontFamily: 'var(--orot-font)' }}>{t('yongsinLabel', lang)}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: yongsinColor, fontFamily: 'var(--orot-font)' }}>{OH_ICON[yongsin]} {lang === 'en' ? OH_EN_CAP[yongsin] : yongsin}</div>
                        <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 4, fontFamily: 'var(--orot-font)' }}>
                          {t('johuYongsin', lang)}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(243, 160, 146, 0.06)', border: '1px solid var(--orot-coral-faint)', borderRadius: 14, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--orot-coral)', fontWeight: 700, marginBottom: 4, fontFamily: 'var(--orot-font)' }}>{t('gisinLabel', lang)}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: gisinColor, fontFamily: 'var(--orot-font)' }}>{OH_ICON[gisin]} {lang === 'en' ? OH_EN_CAP[gisin] : gisin}</div>
                        <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 4, fontFamily: 'var(--orot-font)' }}>
                          {t('gisinWarning', lang)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                      {heesin && (
                        <div style={{ background: 'rgba(138, 161, 196, 0.06)', border: '1px solid rgba(138, 161, 196, 0.20)', borderRadius: 10, padding: 8, textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--orot-el-water)', fontWeight: 600, fontFamily: 'var(--orot-font)' }}>{t('heesinLabel', lang)}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: heesinColor, marginLeft: 6, fontFamily: 'var(--orot-font)' }}>{OH_ICON[heesin]} {heesin}</span>
                          <span style={{ fontSize: 10, color: 'var(--orot-ink-mute)', display: 'block', marginTop: 2, fontFamily: 'var(--orot-font)' }}>{t('heesinDesc', lang)}</span>
                        </div>
                      )}
                      {gusin && (
                        <div style={{ background: 'rgba(211, 184, 122, 0.06)', border: '1px solid rgba(211, 184, 122, 0.20)', borderRadius: 10, padding: 8, textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--orot-el-earth)', fontWeight: 600, fontFamily: 'var(--orot-font)' }}>{t('gusinLabel', lang)}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: ohColors[gusin] || 'var(--orot-el-earth)', marginLeft: 6, fontFamily: 'var(--orot-font)' }}>{OH_ICON[gusin]} {gusin}</span>
                          <span style={{ fontSize: 10, color: 'var(--orot-ink-mute)', display: 'block', marginTop: 2, fontFamily: 'var(--orot-font)' }}>{t('gusinDesc', lang)}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {tongguanNote && (
                  <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', marginBottom: 12, padding: '12px 14px', background: 'rgba(243, 231, 207, 0.05)', borderRadius: 12, border: '1px solid var(--orot-hair-strong)', fontFamily: 'var(--orot-font)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orot-ink)', marginBottom: 6 }}>
                      🌉 {lang === 'en' ? 'Bridging clashing energies' : '충돌하는 기운 사이를 잇기'} <span style={{ fontSize: 11, color: 'var(--orot-ink-mute)', fontWeight: 500 }}>({lang === 'en' ? 'tongguan' : '통관용신'})</span>
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>{tongguanNote}</div>
                  </div>
                )}

                {/* 🌡️ 계절이 필요로 하는 기운 (조후용신) — 충돌 자동 감지 */}
                {(() => {
                  let conflictMsg = '';
                  let conflictColor = 'var(--orot-ink-mute)';
                  let conflictIcon = '🔅';
                  if (llmYongsin) {
                    if (johuYongsin === llmYongsin.yongsin) {
                      conflictIcon = '✓'; conflictColor = 'var(--orot-el-wood)';
                      conflictMsg = lang === 'en'
                        ? `Your saju aligns with the season's natural character — keep ${OH_EN_CAP[johuYongsin]} energy close.`
                        : `너의 사주는 계절의 본래 성질과 잘 맞아. ${johuYongsin} 기운을 가까이 두면 그대로 좋아.`;
                    } else if (johuYongsin === llmYongsin.gisin) {
                      conflictIcon = '⚡'; conflictColor = 'var(--orot-coral)';
                      conflictMsg = lang === 'en'
                        ? `You're a special case. ${season} sajus usually like ${OH_EN_CAP[johuYongsin]}, but it doesn't suit you. Follow the 'core energy (yongsin)' above instead.`
                        : `너는 좀 특별한 케이스야. 보통 ${season} 사주는 ${johuYongsin} 기운이 좋다지만 너에겐 그게 안 맞아. 위 '핵심 기운(용신)'을 우선해.`;
                    } else if (johuYongsin === llmYongsin.heesin) {
                      conflictIcon = '🌿'; conflictColor = 'var(--orot-el-wood)';
                      conflictMsg = lang === 'en'
                        ? `The season's natural character also helps you. Keep core energy as main, ${OH_EN_CAP[johuYongsin]} as support.`
                        : `계절의 본래 성질도 너에게 도움 돼. 위 '핵심 기운(용신)'이 메인, ${johuYongsin} 기운은 보조로.`;
                    } else {
                      conflictIcon = '🔅'; conflictColor = 'var(--orot-ink-mute)';
                      conflictMsg = lang === 'en'
                        ? `The season's natural character doesn't strongly affect you. Focus on the core energy above.`
                        : `계절의 본래 성질은 너에게 큰 영향 없어. 위 '핵심 기운(용신)'만 신경 써도 충분해.`;
                    }
                  }
                  return (
                    <div style={{ background: 'rgba(138, 161, 196, 0.08)', border: '1px solid rgba(138, 161, 196, 0.25)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orot-el-water)', marginBottom: 10, fontFamily: 'var(--orot-font)' }}>
                        🌡️ {lang === 'en' ? 'What this season needs' : '계절이 필요로 하는 기운'} <span style={{ fontSize: 11, color: 'var(--orot-ink-mute)', fontWeight: 500 }}>({lang === 'en' ? 'johu yongsin' : '조후용신'})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '8px 12px', background: 'rgba(243, 231, 207, 0.04)', borderRadius: 10 }}>
                        <div style={{ fontSize: 28, lineHeight: 1 }}>{OH_ICON[johuYongsin]}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', fontFamily: 'var(--orot-font)' }}>
                            {season} {lang === 'en' ? 'born — typically needs' : '태생 — 보통 필요한 기운'}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: ohColors[johuYongsin] || 'var(--orot-el-water)', fontFamily: 'var(--orot-font)' }}>
                            {lang === 'en' ? OH_EN_CAP[johuYongsin] : johuYongsin}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--orot-ink-soft)', fontFamily: 'var(--orot-font)', marginBottom: conflictMsg ? 10 : 0 }}>
                        {johu}
                      </div>
                      {conflictMsg && (
                        <div style={{ fontSize: 12, lineHeight: 1.65, color: conflictColor, fontWeight: 500, padding: '10px 12px', background: 'rgba(243, 231, 207, 0.05)', borderRadius: 10, fontFamily: 'var(--orot-font)', borderLeft: `3px solid ${conflictColor}` }}>
                          <span style={{ marginRight: 6 }}>{conflictIcon}</span>{conflictMsg}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ✨ 운을 도와주는 일상 (개운법) */}
                <div style={{ background: 'rgba(243, 231, 207, 0.05)', border: '1px solid var(--orot-hair)', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orot-coral)', marginBottom: 8, fontFamily: 'var(--orot-font)' }}>
                    ✨ {lang === 'en' ? 'Daily habits that lift your luck' : '운을 도와주는 일상'} <span style={{ fontSize: 11, color: 'var(--orot-ink-mute)', fontWeight: 500 }}>({lang === 'en' ? 'gaewun' : '개운법'})</span>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--orot-ink-soft)', fontFamily: 'var(--orot-font)' }}>
                    {yongsin === '화' || johuYongsin === '화' ? t('gaewun_fire', lang) :
                    yongsin === '수' || johuYongsin === '수' ? t('gaewun_water', lang) :
                    yongsin === '목' || johuYongsin === '목' ? t('gaewun_wood', lang) :
                    yongsin === '금' || johuYongsin === '금' ? t('gaewun_metal', lang) :
                    t('gaewun_earth', lang)}
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* AI Reading */}
        <div className="section-divider">{t('aiReading', lang)}</div>
        {isGenerating && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px', background: 'linear-gradient(180deg, rgba(243,160,146,0.10), rgba(243,160,146,0.04))', border: '1px solid var(--orot-coral-faint)', borderRadius: 'var(--orot-r-lg)' }}>
            <div className="orot-moon orot-breathe" style={{ width: 56, height: 56, display: 'inline-block', marginBottom: 20 }} aria-hidden="true" />
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--orot-ink)', marginBottom: 12, fontFamily: 'var(--orot-font)' }}>
              {generatingProgress === 0 && t('genStep0Msg', lang)}
              {generatingProgress === 1 && t('genStep1Msg', lang)}
              {generatingProgress === 2 && t('genStep2Msg', lang)}
            </p>
            <div style={{ width: '100%', maxWidth: 280, height: 8, background: 'rgba(243, 231, 207, 0.08)', borderRadius: 4, margin: '0 auto 16px', overflow: 'hidden' }}>
              <div style={{
                width: ((generatingProgress + 1) / 3 * 100) + '%',
                height: '100%',
                background: 'var(--orot-coral)',
                borderRadius: 4,
                transition: 'width 0.5s ease'
              }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--orot-ink-soft)', marginBottom: 4, fontFamily: 'var(--orot-font)' }}>
              {loadingProgress || t('preparing', lang)}
            </p>
            <p style={{ fontSize: 12, color: 'var(--orot-ink-mute)', fontFamily: 'var(--orot-font)' }}>
              {generatingProgress === 0 ? t('genTime0', lang) : generatingProgress === 1 ? t('genTime1', lang) : t('genTime2', lang)}
            </p>
          </div>
        )}
        {!isGenerating && aiText && renderTOC(aiText)}

        {/* Share + Save + Restart */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          {aiText && !isGenerating && (
            <button className="orot-btn orot-btn--ghost" style={{ flex: 1, minWidth: 120, height: 44, fontSize: 13 }}
              disabled={isSharingLink}
              onClick={() => shareLink(aiText, (userData.name || '') + (lang === 'en' ? "'s Saju Reading" : '의 사주 해설'))}>
              {isSharingLink ? (lang === 'en' ? '🔗 Creating...' : '🔗 생성 중...') : (lang === 'en' ? '🔗 Share Link' : '🔗 링크 공유')}
            </button>
          )}
          {aiText && !isGenerating && (
            <button className="orot-btn orot-btn--primary" style={{ flex: 1, minWidth: 120, height: 44, fontSize: 13 }} onClick={() => {
              try {
                const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                const entry = { name: userData.name, date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'), type: currentScreen === 7 ? (lang === 'en' ? '2026 Fortune' : '2026 운세') : (lang === 'en' ? 'Saju Reading' : '사주 해설'), text: aiText, saju: sajuResult, user: userData };
                const updated = [entry, ...results].slice(0, 10);
                safeSetItem('saju-saved-results', JSON.stringify(updated));
                showToast(t('resultSaved', lang));
              } catch { /* ignore corrupted storage */ }
            }}>{t('saveResult', lang)}</button>
          )}
          {aiText && !isGenerating && (
            <button className="orot-btn orot-btn--ghost" style={{ flex: 1, minWidth: 120, height: 44, fontSize: 13 }}
              disabled={isTranslating}
              onClick={() => {
                const targetLang = aiTextTranslated ? (lang === 'ko' ? 'ko' : 'en') : (lang === 'ko' ? 'en' : 'ko');
                translateAiText(aiText, targetLang, (t) => { setAiText(t); setAiTextTranslated(!aiTextTranslated); });
              }}>
              {isTranslating ? t('translating', lang) : (aiTextTranslated ? (lang === 'ko' ? t('translateToKo', lang) : t('translateToEn', lang)) : (lang === 'ko' ? t('translateToEn', lang) : t('translateToKo', lang)))}
            </button>
          )}
          <button className="orot-btn orot-btn--ghost" style={{ flex: 1, minWidth: 120, height: 44, fontSize: 13 }} onClick={() => { setCurrentScreen(0); setAiText(''); setSajuResult(null); }}>
            {t('restart', lang)}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, marginTop: 24, padding: '12px 16px', color: 'var(--orot-ink-mute)', background: 'rgba(243, 231, 207, 0.04)', border: '1px solid var(--orot-hair)', borderRadius: 12, lineHeight: 1.6 }}>
          {t('disclaimer', lang)}
        </p>
      </div>
    );
  }

  /* ===== SCREEN 5: Compatibility ===== */
  function renderCompat() {
    // ── Phase 6: 궁합 줄글(narrative) V4 분기 (가드 OFF가 기본 — 프로덕션 동작 byte-identical) ──
    // NEXT_PUBLIC_COMPAT_NARRATIVE_UI_ENABLED==='true' + compat 모드 + 제출 신호(compatNarrativeRequested)
    // 일 때만 새 줄글 컴포넌트(POST /api/compat-narrative)로 렌더하고 early-return 한다. 즉 이 분기가
    // 켜지면 아래 기존 카드형 경로(runCompatAnalysis / /api/compat-v4 / CompatV4Report)는 절대 도달하지
    // 않아 더블 생성/구카드 노출이 없다. flag OFF면 compatNarrativeRequested는 영원히 false → byte-identical.
    // compatAiText/compatLoading/태교 분기는 일절 건드리지 않는다.
    if (
      process.env.NEXT_PUBLIC_COMPAT_NARRATIVE_UI_ENABLED === 'true' &&
      appMode === 'compat' &&
      compatNarrativeRequested
    ) {
      // 기존 compat 경로(runCompatAnalysis)와 동일한 state에서 입력 재구성.
      const cnTypeMap: Record<number, RelationshipTypeV4> = {
        0: 'dating', 1: 'married', 2: 'friendship',
        3: 'coworker', 4: 'reunion_or_breakup', 5: 'crush_or_something',
      };
      const cnInputA: CompatBirthInputV4 = {
        name: compatPerson1.name || (lang === 'en' ? 'Person 1' : '첫 번째'),
        gender: compatPerson1.gender === 'm' ? 'male' : compatPerson1.gender === 'f' ? 'female' : 'unknown',
        calendarType: compatPerson1.isLunar ? 'lunar' : 'solar',
        birthDate: `${compatPerson1.year}-${String(compatPerson1.month).padStart(2,'0')}-${String(compatPerson1.day).padStart(2,'0')}`,
        // 시진 인덱스를 HH로 직접 쓰지 않음: 정확입력→"HH:mm"+exact / 시진→대표값+approximate / 모름→unknown
        ...resolveBirthTimeFields({ sijuIndex: compatPerson1.hour, exact: compatExact1 }),
        timezone: 'Asia/Seoul',
        // P7.3: flag off OR 지역 미선택이면 {} → 키 미포함(기존 payload byte-identical). calculationMode 미주입.
        ...birthPlacePayloadPatch(SAJU_PRECISION_INPUTS_ENABLED, compatPlaceId1),
      };
      const cnInputB: CompatBirthInputV4 = {
        name: compatPerson2.name || (lang === 'en' ? 'Partner' : '상대'),
        gender: compatPerson2.gender === 'm' ? 'male' : compatPerson2.gender === 'f' ? 'female' : 'unknown',
        calendarType: compatPerson2.isLunar ? 'lunar' : 'solar',
        birthDate: `${compatPerson2.year}-${String(compatPerson2.month).padStart(2,'0')}-${String(compatPerson2.day).padStart(2,'0')}`,
        // 시진 인덱스를 HH로 직접 쓰지 않음: 정확입력→"HH:mm"+exact / 시진→대표값+approximate / 모름→unknown
        ...resolveBirthTimeFields({ sijuIndex: compatPerson2.hour, exact: compatExact2 }),
        timezone: 'Asia/Seoul',
        // P7.3: flag off OR 지역 미선택이면 {} → 키 미포함(기존 payload byte-identical). calculationMode 미주입.
        ...birthPlacePayloadPatch(SAJU_PRECISION_INPUTS_ENABLED, compatPlaceId2),
      };
      const cnRelType = cnTypeMap[compatRelType] || 'dating';
      return (
        <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
          <button
            onClick={() => { setCompatNarrativeRequested(false); setCurrentScreen(0); }}
            aria-label={t('backBtn', lang)}
            style={{
              background: 'transparent', border: 0, color: 'var(--orot-ink)',
              fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
              fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
          </button>
          <CompatNarrativeReport
            inputA={cnInputA}
            inputB={cnInputB}
            relationshipType={cnRelType}
            lang={lang}
            onRestart={() => { setCompatNarrativeRequested(false); setCurrentScreen(0); }}
            isSharing={isSharingLink}
            onShareText={(text, title) => shareLink(text, title)}
            onSaveText={(text, title) => {
              try {
                const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                const entry = {
                  name: title,
                  date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'),
                  type: lang === 'en' ? 'Compatibility' : '궁합',
                  text,
                };
                const updated = [entry, ...results].slice(0, 20);
                localStorage.setItem('saju-saved-results', JSON.stringify(updated));
                setSavedResults(updated);
                showToast(t('resultSaved', lang));
              } catch { /* quota or parse error */ }
            }}
          />
        </div>
      );
    }

    async function runCompatAnalysis() {
      // ── v4 compat 흐름 ──
      // 1. preview 호출(즉시) → 명리 카드 노출
      // 2. report 호출(GPT) → AI 카드 채움
      const v4TypeMap: Record<number, RelationshipTypeV4> = {
        0: 'dating', 1: 'married', 2: 'friendship',
        3: 'coworker', 4: 'reunion_or_breakup', 5: 'crush_or_something',
      };
      const inputA: CompatBirthInputV4 = {
        name: compatPerson1.name || (lang === 'en' ? 'Person 1' : '첫 번째'),
        gender: compatPerson1.gender === 'm' ? 'male' : compatPerson1.gender === 'f' ? 'female' : 'unknown',
        calendarType: compatPerson1.isLunar ? 'lunar' : 'solar',
        birthDate: `${compatPerson1.year}-${String(compatPerson1.month).padStart(2,'0')}-${String(compatPerson1.day).padStart(2,'0')}`,
        // 시진 인덱스를 HH로 직접 쓰지 않음: 정확입력→"HH:mm"+exact / 시진→대표값+approximate / 모름→unknown
        ...resolveBirthTimeFields({ sijuIndex: compatPerson1.hour, exact: compatExact1 }),
        timezone: 'Asia/Seoul',
        // P7.3: flag off OR 지역 미선택이면 {} → 키 미포함(기존 payload byte-identical). calculationMode 미주입.
        ...birthPlacePayloadPatch(SAJU_PRECISION_INPUTS_ENABLED, compatPlaceId1),
      };
      const inputB: CompatBirthInputV4 = {
        name: compatPerson2.name || (lang === 'en' ? 'Partner' : '상대'),
        gender: compatPerson2.gender === 'm' ? 'male' : compatPerson2.gender === 'f' ? 'female' : 'unknown',
        calendarType: compatPerson2.isLunar ? 'lunar' : 'solar',
        birthDate: `${compatPerson2.year}-${String(compatPerson2.month).padStart(2,'0')}-${String(compatPerson2.day).padStart(2,'0')}`,
        // 시진 인덱스를 HH로 직접 쓰지 않음: 정확입력→"HH:mm"+exact / 시진→대표값+approximate / 모름→unknown
        ...resolveBirthTimeFields({ sijuIndex: compatPerson2.hour, exact: compatExact2 }),
        timezone: 'Asia/Seoul',
        // P7.3: flag off OR 지역 미선택이면 {} → 키 미포함(기존 payload byte-identical). calculationMode 미주입.
        ...birthPlacePayloadPatch(SAJU_PRECISION_INPUTS_ENABLED, compatPlaceId2),
      };
      const relationshipType = v4TypeMap[compatRelType] || 'dating';

      // v4 흐름 — compatResult(v3 키)는 건드리지 않음. v4 result는 compatV4Resp로만 게이트.
      setCompatLoading(true);
      setCompatAiText('');
      setCompatV4Resp(null);

      // 결과 영역이 페이지 하단이라 자동 스크롤 — 사용자가 분석 시작 인지 가능
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
      }, 80);

      // Phase 1 — preview (즉시)
      try {
        const previewRes = await fetch('/api/compat-v4/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputA, inputB, relationshipType }),
        });
        if (!previewRes.ok) {
          const detail = await previewRes.text().catch(() => '');
          throw new Error(`preview ${previewRes.status}: ${detail.slice(0, 200)}`);
        }
        const preview = await previewRes.json();
        if (!preview?.compatibilityAnalysis) {
          throw new Error('preview missing compatibilityAnalysis: ' + JSON.stringify(preview).slice(0, 200));
        }
        setCompatV4Resp({
          relationshipType: preview.relationshipType,
          personA: preview.personA,
          personB: preview.personB,
          compatibilityAnalysis: preview.compatibilityAnalysis,
          relationshipQuestions: preview.relationshipQuestions,
          reportText: '',
        });
        // 마운트 후 결과 위치로 부드러운 스크롤
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            const el = document.querySelector('[data-compat-v4-result]') as HTMLElement | null;
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } catch (err) {
        console.error('[compat v4 preview]', err);
        setCompatLoading(false);
        setCompatAiText('⚠ 궁합 분석을 시작할 수 없어요. 잠시 후 다시 시도해주세요.\n\n에러: ' + (err instanceof Error ? err.message : String(err)));
        return;
      }

      // Phase 2 — report (GPT)
      try {
        const reportRes = await fetch('/api/compat-v4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputA, inputB, relationshipType, lang }),
        });
        if (!reportRes.ok) throw new Error('report failed: ' + reportRes.status);
        const report = await reportRes.json();
        setCompatV4Resp({
          relationshipType: report.relationshipType,
          personA: report.personA,
          personB: report.personB,
          compatibilityAnalysis: report.compatibilityAnalysis,
          relationshipQuestions: report.relationshipQuestions,
          reportText: report.reportText,
        });
        setCompatLoading(false);
      } catch (err) {
        console.error('compat v4 report error:', err);
        setCompatLoading(false);
        setCompatAiText(t('compatAiError', lang));
      }
      // v3 폐기 — 미사용 import 회피
      void buildCompatPrompt; void REL_TYPE_BY_IDX; void calcSaju; void lunarToSolar; void sajuResult; void userData;
    }

    const data = compatResult ? (() => { try { return JSON.parse(compatResult.html); } catch { return null; } })() : null;

    return (
      <div className="inner screen-enter orot-root orot-form-screen orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        <button
          onClick={() => setCurrentScreen(0)}
          aria-label={t('backBtn', lang)}
          style={{
            background: 'transparent', border: 0, color: 'var(--orot-ink)',
            fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
            fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
        </button>

        {/* 분석 진행 상태 배너 — 사용자가 결과 영역을 못 봐도 인지 */}
        {(compatLoading || compatV4Resp || (compatAiText && !compatV4Resp)) && (
          <div style={{
            position: 'sticky', top: 8, zIndex: 50, marginBottom: 12,
            padding: '12px 16px', borderRadius: 12,
            background: compatV4Resp ? 'linear-gradient(135deg, rgba(120,200,140,0.18), rgba(80,180,120,0.10))'
              : compatLoading ? 'linear-gradient(135deg, rgba(246,135,179,0.18), rgba(159,122,234,0.10))'
              : 'linear-gradient(135deg, rgba(255,140,140,0.18), rgba(255,100,100,0.10))',
            border: '1px solid ' + (compatV4Resp ? 'rgba(120,200,140,0.4)' : compatLoading ? 'rgba(246,135,179,0.4)' : 'rgba(255,140,140,0.4)'),
            fontSize: 13, color: 'var(--text)', textAlign: 'center', fontFamily: 'var(--orot-font)',
            cursor: compatV4Resp ? 'pointer' : 'default',
          }}
          onClick={() => {
            if (compatV4Resp && typeof window !== 'undefined') {
              const el = document.querySelector('[data-compat-v4-result]') as HTMLElement | null;
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}>
            {compatV4Resp ? (compatV4Resp.reportText
              ? '✅ 궁합 분석 완료! 탭하면 결과로 이동 →'
              : '✨ 명리 카드 준비 완료 · AI 풀이 작성 중... 탭하면 결과로 이동 →')
              : compatLoading ? '⏳ 궁합 분석 중... 잠시만 기다려주세요'
              : '⚠ ' + compatAiText.slice(0, 200)}
          </div>
        )}

        <BleedCard
          image="/images/orot/home-feat-compat.webp"
          framingId="home-feat-compat-hero"
          veil="left"
          minHeight={220}
          style={{ marginBottom: 20 }}
        >
          <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '62%' }}>
            <div style={{ marginBottom: 12 }}>
              <div className="orot-eyebrow">{t('compatTitle', lang)}</div>
              <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 4, marginLeft: 21, fontFamily: 'var(--orot-font)', letterSpacing: '0.01em' }}>{t('compatDesc', lang)}</div>
            </div>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: 'var(--orot-ink)',
              letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0,
              whiteSpace: 'pre-line', fontFamily: 'var(--orot-font)',
              background: 'none', WebkitTextFillColor: 'var(--orot-ink)',
            }}>
              {lang === 'en' ? "When two charts meet,\nwhat shape do they form" : '두 사주가 만나면\n어떤 모습일까요'}
            </h1>
          </div>
        </BleedCard>

        {!sajuResult && (
          <div className="orot-card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: 'var(--orot-coral)', margin: '0 0 16px', letterSpacing: '-0.012em', fontFamily: 'var(--orot-font)' }}>
              <span style={{ fontSize: 12, marginRight: 8 }}>✦</span>{t('person1', lang)}
            </h3>
            {profiles.length > 0 && (
              <div className="input-group">
                <label>{t('loadProfileSaved', lang)}</label>
                <select style={{ width: '100%' }} onChange={e => {
                  const p = profiles[parseInt(e.target.value)];
                  if (p) setCompatPerson1(prev => ({ ...prev, name: p.name, year: p.year, month: p.month, day: p.day, hour: p.hour }));
                  e.target.value = '';
                }} defaultValue="">
                  <option value="" disabled>{t('profileSelect', lang)}</option>
                  {profiles.map((p, i) => <option key={i} value={i}>{p.name} ({p.year}.{p.month}.{p.day})</option>)}
                </select>
              </div>
            )}
            <div className="input-group">
              <label htmlFor="compat1-name">{t('name', lang)}</label>
              <input id="compat1-name" type="text" placeholder={t('name', lang)} value={compatPerson1.name} onChange={e => setCompatPerson1(p => ({ ...p, name: e.target.value }))} aria-label={lang === 'en' ? 'Person 1 name' : '첫 번째 사람 이름'} />
            </div>
            <div className="input-group">
              <label id="compat1-gender-label">{lang === 'en' ? 'Gender' : '성별'}</label>
              <div role="radiogroup" aria-labelledby="compat1-gender-label" style={{ display: 'flex', gap: 8 }}>
                {[
                  { v: 'm' as const, label: lang === 'en' ? 'Male' : '남자' },
                  { v: 'f' as const, label: lang === 'en' ? 'Female' : '여자' },
                ].map(opt => {
                  const selected = compatPerson1.gender === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => { setCompatPerson1(p => ({ ...p, gender: opt.v })); resetCompatResult(); }}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: 10,
                        background: selected ? 'rgba(243,160,146,0.18)' : 'rgba(243,231,207,0.04)',
                        border: '1px solid ' + (selected ? 'var(--orot-coral)' : 'var(--orot-hair)'),
                        color: selected ? 'var(--orot-coral)' : 'var(--orot-ink)',
                        fontWeight: selected ? 700 : 500, fontSize: 14, cursor: 'pointer',
                        fontFamily: 'var(--orot-font)',
                      }}
                    >{opt.label}</button>
                  );
                })}
              </div>
            </div>
            <div className="input-group">
              <label id="compat1-birthday-label">{t('birthday', lang)}</label>
              <div className="select-row" role="group" aria-labelledby="compat1-birthday-label">
                <div className="input-group">
                  <select value={compatPerson1.year} onChange={e => setCompatPerson1(p => ({ ...p, year: parseInt(e.target.value) }))} aria-label={lang === 'en' ? 'Person 1 birth year' : '첫 번째 사람 출생 연도'}>
                    {Array.from({ length: 86 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}{t('yearUnit', lang)}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <select value={compatPerson1.month} onChange={e => setCompatPerson1(p => ({ ...p, month: parseInt(e.target.value) }))} aria-label={lang === 'en' ? 'Person 1 birth month' : '첫 번째 사람 출생 월'}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{t('monthName' + m as any, lang)}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <select value={compatPerson1.day} onChange={e => setCompatPerson1(p => ({ ...p, day: parseInt(e.target.value) }))} aria-label={lang === 'en' ? 'Person 1 birth day' : '첫 번째 사람 출생 일'}>
                    {Array.from({ length: getDaysInMonth(compatPerson1.year, compatPerson1.month) }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}{t('dayUnit', lang)}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="input-group">
              <label id="compat1-calendar-label">{t('calendarLabel', lang)}</label>
              <div className="pill-toggle" role="group" aria-labelledby="compat1-calendar-label">
                <button className={!compatPerson1.isLunar ? 'active' : ''} onClick={() => setCompatPerson1(p => ({ ...p, isLunar: false }))} aria-pressed={!compatPerson1.isLunar}>
                  {t('solarCal', lang)}
                </button>
                <button className={compatPerson1.isLunar ? 'active' : ''} onClick={() => setCompatPerson1(p => ({ ...p, isLunar: true }))} aria-pressed={compatPerson1.isLunar}>
                  {t('lunarCal', lang)}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label id="compat1-birthtime-label">{t('birthTimeLabel', lang)}</label>
              <div className="time-grid" role="radiogroup" aria-labelledby="compat1-birthtime-label">
                {TIMES.map(ti => (
                  <div key={ti.h} role="radio" aria-checked={compatPerson1.hour === ti.h} tabIndex={0}
                       className={'time-option' + (compatPerson1.hour === ti.h ? ' selected' : '')}
                       onClick={() => setCompatPerson1(p => ({ ...p, hour: ti.h }))}
                       onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCompatPerson1(p => ({ ...p, hour: ti.h })); } }}>
                    <div className="time-range">{ti.range}</div>
                                        <div className="time-hangul">{t(TIME_I18N_KEYS[ti.h], lang)}</div>
                  </div>
                ))}
                <div role="radio" aria-checked={compatPerson1.hour === -1} tabIndex={0}
                     className={'time-option unknown-time' + (compatPerson1.hour === -1 ? ' selected' : '')}
                     onClick={() => { setCompatPerson1(p => ({ ...p, hour: -1 })); setCompatExact1({ use: false, hour: -1, min: 0 }); }}
                     onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCompatPerson1(p => ({ ...p, hour: -1 })); setCompatExact1({ use: false, hour: -1, min: 0 }); } }}>
                  {t('dontKnowTime', lang)}
                </div>
              </div>
              <div className="exact-time-section">
                <label className="exact-time-toggle" onClick={() => {
                  const next = !compatExact1.use;
                  if (!next) { setCompatExact1({ use: false, hour: -1, min: 0 }); }
                  else { const h = compatExact1.hour < 0 ? 0 : compatExact1.hour; setCompatExact1({ use: true, hour: h, min: compatExact1.min }); setCompatPerson1(p => ({ ...p, hour: exactTimeToSiju(h, compatExact1.min) })); }
                }}>
                  <span className={'exact-time-checkbox' + (compatExact1.use ? ' checked' : '')}>{compatExact1.use ? '✓' : ''}</span>
                  {t('knowExactTime', lang)}
                </label>
                {compatExact1.use && (
                  <div className="exact-time-inputs">
                    <select className="exact-time-select" value={compatExact1.hour} onChange={e => {
                      const h = parseInt(e.target.value);
                      setCompatExact1(p => ({ ...p, hour: h }));
                      setCompatPerson1(p => ({ ...p, hour: exactTimeToSiju(h, compatExact1.min) }));
                    }}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}{t('hourUnit', lang)}</option>
                      ))}
                    </select>
                    <select className="exact-time-select" value={compatExact1.min} onChange={e => {
                      const m = parseInt(e.target.value);
                      setCompatExact1(p => ({ ...p, min: m }));
                      setCompatPerson1(p => ({ ...p, hour: exactTimeToSiju(compatExact1.hour, m) }));
                    }}>
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}{t('minuteUnit', lang)}</option>
                      ))}
                    </select>
                    <span className="exact-time-siju">{'→ ' + (lang === 'en' ? TIMES[exactTimeToSiju(compatExact1.hour < 0 ? 0 : compatExact1.hour, compatExact1.min)].hanja.replace('시', '') : TIMES[exactTimeToSiju(compatExact1.hour < 0 ? 0 : compatExact1.hour, compatExact1.min)].hanja)}</span>
                  </div>
                )}
                <p className="exact-time-note">{t('exactTimeNote', lang)}</p>
              </div>
            </div>
            {SAJU_PRECISION_INPUTS_ENABLED && (
              <PlaceSelect value={compatPlaceId1} onChange={setCompatPlaceId1} lang={lang === 'en' ? 'en' : 'ko'} id="compat1-place-select" />
            )}
          </div>
        )}

        <div className="orot-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: 'var(--orot-coral)', margin: '0 0 16px', letterSpacing: '-0.012em', fontFamily: 'var(--orot-font)' }}>
            <span style={{ fontSize: 12, marginRight: 8 }}>✦</span>{t('person2', lang)}
          </h3>
          {profiles.length > 0 && (
            <div className="input-group">
              <label>{t('loadProfileLabel', lang)}</label>
              <select style={{ width: '100%' }} onChange={e => {
                const p = profiles[parseInt(e.target.value)];
                if (p) setCompatPerson2(prev => ({ ...prev, name: p.name, year: p.year, month: p.month, day: p.day, hour: p.hour }));
                e.target.value = '';
              }} defaultValue="">
                <option value="" disabled>{t('profileSelectPlaceholder', lang)}</option>
                {profiles.map((p, i) => <option key={i} value={i}>{p.name} ({p.year}.{p.month}.{p.day})</option>)}
              </select>
            </div>
          )}
          <div className="input-group">
            <label htmlFor="compat2-name">{t('name', lang)}</label>
            <input id="compat2-name" type="text" placeholder={t('name', lang)} value={compatPerson2.name} onChange={e => setCompatPerson2(p => ({ ...p, name: e.target.value }))} aria-label={lang === 'en' ? 'Person 2 name' : '두 번째 사람 이름'} />
          </div>
          <div className="input-group">
            <label id="compat2-gender-label">{lang === 'en' ? 'Gender' : '성별'}</label>
            <div role="radiogroup" aria-labelledby="compat2-gender-label" style={{ display: 'flex', gap: 8 }}>
              {[
                { v: 'm' as const, label: lang === 'en' ? 'Male' : '남자' },
                { v: 'f' as const, label: lang === 'en' ? 'Female' : '여자' },
              ].map(opt => {
                const selected = compatPerson2.gender === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => { setCompatPerson2(p => ({ ...p, gender: opt.v })); resetCompatResult(); }}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 10,
                      background: selected ? 'rgba(243,160,146,0.18)' : 'rgba(243,231,207,0.04)',
                      border: '1px solid ' + (selected ? 'var(--orot-coral)' : 'var(--orot-hair)'),
                      color: selected ? 'var(--orot-coral)' : 'var(--orot-ink)',
                      fontWeight: selected ? 700 : 500, fontSize: 14, cursor: 'pointer',
                      fontFamily: 'var(--orot-font)',
                    }}
                  >{opt.label}</button>
                );
              })}
            </div>
          </div>
          <div className="input-group">
            <label id="compat2-birthday-label">{t('birthday', lang)}</label>
            <div className="select-row" role="group" aria-labelledby="compat2-birthday-label">
              <div className="input-group">
                <select value={compatPerson2.year} onChange={e => setCompatPerson2(p => ({ ...p, year: parseInt(e.target.value) }))} aria-label={lang === 'en' ? 'Person 2 birth year' : '두 번째 사람 출생 연도'}>
                  {Array.from({ length: 86 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}{t('yearUnit', lang)}</option>)}
                </select>
              </div>
              <div className="input-group">
                <select value={compatPerson2.month} onChange={e => setCompatPerson2(p => ({ ...p, month: parseInt(e.target.value) }))} aria-label={lang === 'en' ? 'Person 2 birth month' : '두 번째 사람 출생 월'}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{t('monthName' + m as any, lang)}</option>)}
                </select>
              </div>
              <div className="input-group">
                <select value={compatPerson2.day} onChange={e => setCompatPerson2(p => ({ ...p, day: parseInt(e.target.value) }))} aria-label={lang === 'en' ? 'Person 2 birth day' : '두 번째 사람 출생 일'}>
                  {Array.from({ length: getDaysInMonth(compatPerson2.year, compatPerson2.month) }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}{t('dayUnit', lang)}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="input-group">
            <label id="compat2-calendar-label">{t('calendarLabel', lang)}</label>
            <div className="pill-toggle" role="group" aria-labelledby="compat2-calendar-label">
              <button className={!compatPerson2.isLunar ? 'active' : ''} onClick={() => setCompatPerson2(p => ({ ...p, isLunar: false }))} aria-pressed={!compatPerson2.isLunar}>
                {t('solarCal', lang)}
              </button>
              <button className={compatPerson2.isLunar ? 'active' : ''} onClick={() => setCompatPerson2(p => ({ ...p, isLunar: true }))} aria-pressed={compatPerson2.isLunar}>
                {t('lunarCal', lang)}
              </button>
            </div>
          </div>
          <div className="input-group">
            <label id="compat2-birthtime-label">{t('birthTimeLabel', lang)}</label>
            <div className="time-grid" role="radiogroup" aria-labelledby="compat2-birthtime-label">
              {TIMES.map(ti => (
                <div key={ti.h} role="radio" aria-checked={compatPerson2.hour === ti.h} tabIndex={0}
                     className={'time-option' + (compatPerson2.hour === ti.h ? ' selected' : '')}
                     onClick={() => setCompatPerson2(p => ({ ...p, hour: ti.h }))}
                     onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCompatPerson2(p => ({ ...p, hour: ti.h })); } }}>
                  <div className="time-range">{ti.range}</div>
                                    <div className="time-hangul">{t(TIME_I18N_KEYS[ti.h], lang)}</div>
                </div>
              ))}
              <div role="radio" aria-checked={compatPerson2.hour === -1} tabIndex={0}
                   className={'time-option unknown-time' + (compatPerson2.hour === -1 ? ' selected' : '')}
                   onClick={() => { setCompatPerson2(p => ({ ...p, hour: -1 })); setCompatExact2({ use: false, hour: -1, min: 0 }); }}
                   onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCompatPerson2(p => ({ ...p, hour: -1 })); setCompatExact2({ use: false, hour: -1, min: 0 }); } }}>
                {t('dontKnowTime', lang)}
              </div>
            </div>
            <div className="exact-time-section">
              <label className="exact-time-toggle" onClick={() => {
                const next = !compatExact2.use;
                if (!next) { setCompatExact2({ use: false, hour: -1, min: 0 }); }
                else { const h = compatExact2.hour < 0 ? 0 : compatExact2.hour; setCompatExact2({ use: true, hour: h, min: compatExact2.min }); setCompatPerson2(p => ({ ...p, hour: exactTimeToSiju(h, compatExact2.min) })); }
              }}>
                <span className={'exact-time-checkbox' + (compatExact2.use ? ' checked' : '')}>{compatExact2.use ? '✓' : ''}</span>
                {t('knowExactTime', lang)}
              </label>
              {compatExact2.use && (
                <div className="exact-time-inputs">
                  <select className="exact-time-select" value={compatExact2.hour} onChange={e => {
                    const h = parseInt(e.target.value);
                    setCompatExact2(p => ({ ...p, hour: h }));
                    setCompatPerson2(p => ({ ...p, hour: exactTimeToSiju(h, compatExact2.min) }));
                  }}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}{t('hourUnit', lang)}</option>
                    ))}
                  </select>
                  <select className="exact-time-select" value={compatExact2.min} onChange={e => {
                    const m = parseInt(e.target.value);
                    setCompatExact2(p => ({ ...p, min: m }));
                    setCompatPerson2(p => ({ ...p, hour: exactTimeToSiju(compatExact2.hour, m) }));
                  }}>
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}{t('minuteUnit', lang)}</option>
                    ))}
                  </select>
                  <span className="exact-time-siju">{'→ ' + (lang === 'en' ? TIMES[exactTimeToSiju(compatExact2.hour < 0 ? 0 : compatExact2.hour, compatExact2.min)].hanja.replace('시', '') : TIMES[exactTimeToSiju(compatExact2.hour < 0 ? 0 : compatExact2.hour, compatExact2.min)].hanja)}</span>
                </div>
              )}
              <p className="exact-time-note">{t('exactTimeNote', lang)}</p>
            </div>
          </div>
          {SAJU_PRECISION_INPUTS_ENABLED && (
            <PlaceSelect value={compatPlaceId2} onChange={setCompatPlaceId2} lang={lang === 'en' ? 'en' : 'ko'} id="compat2-place-select" />
          )}
        </div>

        <div className="orot-card" style={{ marginTop: 12, marginBottom: 12, padding: 22 }}>
          <h3>{t('relTypeTitle', lang)}</h3>
          <div className="option-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: t('relDating', lang), idx: 0 },
              { label: t('relMarried', lang), idx: 1 },
              { label: t('relFriends', lang), idx: 2 },
              { label: t('relColleagues', lang), idx: 3 },
              { label: t('relBreakup', lang), idx: 4 },
              { label: t('relCrush', lang), idx: 5 },
            ].map(r => (
              <div key={r.idx}
                role="radio"
                aria-checked={compatRelType === r.idx}
                tabIndex={0}
                className={'option-card' + (compatRelType === r.idx ? ' selected' : '')}
                onClick={() => { setCompatRelType(r.idx); resetCompatResult(); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCompatRelType(r.idx); resetCompatResult(); } }}
              >{r.label}</div>
            ))}
          </div>
        </div>

        <div style={{
          background: 'rgba(243, 160, 146, 0.06)',
          border: '1px solid var(--orot-coral-faint)',
          borderRadius: 'var(--orot-r-md)',
          padding: '12px 14px',
          marginTop: 12,
          marginBottom: 12,
          color: 'var(--orot-ink-soft)',
          fontSize: 12,
          lineHeight: 1.6,
          fontFamily: 'var(--orot-font)',
        }}>
          {lang === 'en'
            ? 'Your info is used only for the reading and can be deleted anytime.'
            : '입력하신 정보는 풀이에만 사용되며 언제든 삭제하실 수 있어요.'}
        </div>
        <button className="orot-btn orot-btn--primary orot-btn--full" onClick={() => setCompatPaywall(true)}>
          {t('analyzeCompat', lang)} ›
        </button>

        {compatPaywall && !compatResult && (
          process.env.NEXT_PUBLIC_COMPAT_NARRATIVE_UI_ENABLED === 'true' && appMode === 'compat' ? (
            <CompatPreviewTeaser
              preview={compatPreview}
              loading={compatPreviewLoading}
              relationshipType={(['dating', 'married', 'friendship', 'coworker', 'reunion_or_breakup', 'crush_or_something'][compatRelType] || 'dating') as RelationshipTypeV4}
              nameA={compatPerson1.name || (lang === 'en' ? 'Person 1' : '첫 번째')}
              nameB={compatPerson2.name || (lang === 'en' ? 'Partner' : '상대')}
              lang={lang}
              starBalance={starBalance}
              cost={5}
              onUnlock={() => { updateStarBalance(starBalance - 5); setCompatPaywall(false); setCompatNarrativeRequested(true); }}
              onCharge={() => setCurrentScreen(9)}
            />
          ) : (() => {
          const compatSectionItems = compatRelType === 0 ? [
            { icon: '📖', title: lang === 'en' ? 'How to Read Compatibility' : '궁합 읽는 법' },
            { icon: '🔮', title: (compatPerson1.name || (lang === 'en' ? 'Person 1' : '첫 번째')) + (lang === 'en' ? "'s Saju Profile" : '의 사주적 특성') },
            { icon: '✨', title: (compatPerson2.name || (lang === 'en' ? 'Person 2' : '상대방')) + (lang === 'en' ? "'s Saju Profile" : '의 사주적 특성') },
            { icon: '💕', title: lang === 'en' ? 'Chemistry Between You Two' : '두 사람의 케미' },
            { icon: '❤️‍🔥', title: lang === 'en' ? 'Romance Compatibility' : '연애 궁합' },
            { icon: '💘', title: lang === 'en' ? 'Who Likes Who More?' : '누가 더 좋아하는 궁합?' },
            { icon: '🔄', title: lang === 'en' ? 'Overcoming Relationship Fatigue' : '권태기 극복요령' },
            { icon: '🔗', title: lang === 'en' ? 'Should I Keep Seeing Them?' : '이 사람과 계속 만나도 될까?' },
            { icon: '💍', title: lang === 'en' ? 'Marriage Potential' : '결혼 가능성' },
            { icon: '💌', title: lang === 'en' ? 'A Message for This Couple' : '이 인연에게 보내는 한마디' },
          ] : compatRelType === 5 ? [
            { icon: '📖', title: lang === 'en' ? 'How to Read Compatibility' : '궁합 읽는 법' },
            { icon: '🔮', title: lang === 'en' ? 'Individual Saju Profiles' : '개인 사주 특성' },
            { icon: '💕', title: lang === 'en' ? 'Chemistry' : '두 사람의 케미' },
            { icon: '💘', title: lang === 'en' ? 'Chance of Becoming a Couple' : '연애로 발전할 가능성' },
            { icon: '👀', title: lang === 'en' ? "How They See You" : '상대가 나를 어떻게 보는지' },
            { icon: '🏹', title: lang === 'en' ? 'Who Should Make the First Move?' : '누가 먼저 다가갈까?' },
            { icon: '📅', title: lang === 'en' ? 'Best Confession Timing' : '고백 타이밍' },
            { icon: '🔮', title: lang === 'en' ? 'Conclusion of This Connection' : '이 인연의 결론' },
          ] : compatRelType === 1 ? [
            { icon: '📖', title: lang === 'en' ? 'How to Read Compatibility' : '궁합 읽는 법' },
            { icon: '🔮', title: lang === 'en' ? 'Individual Saju Profiles' : '개인 사주 특성' },
            { icon: '💕', title: lang === 'en' ? 'Chemistry' : '두 사람의 케미' },
            { icon: '🏠', title: lang === 'en' ? 'Marital Harmony' : '부부 조화도' },
            { icon: '💰', title: lang === 'en' ? 'Financial Conflicts?' : '돈 문제로 갈등이 생길까?' },
            { icon: '💍', title: lang === 'en' ? 'Spouse Fortune' : '배우자 운이 좋은 편인가?' },
            { icon: '⚠️', title: lang === 'en' ? 'Divorce Risk Analysis' : '이혼 가능성 분석' },
            { icon: '⚡', title: lang === 'en' ? 'Who Leads the Household?' : '누가 집안 주도권을 잡나?' },
            { icon: '🔄', title: lang === 'en' ? 'Overcoming Relationship Fatigue' : '권태기 극복법' },
            { icon: '👶', title: lang === 'en' ? 'Children Fortune' : '자녀운' },
          ] : compatRelType === 2 ? [
            { icon: '📖', title: lang === 'en' ? 'How to Read Compatibility' : '궁합 읽는 법' },
            { icon: '🔮', title: lang === 'en' ? 'Individual Saju Profiles' : '개인 사주 특성' },
            { icon: '💕', title: lang === 'en' ? 'Friendship Chemistry' : '우정 케미' },
            { icon: '🔗', title: lang === 'en' ? 'Will This Last Forever?' : '오래갈 인연인가?' },
            { icon: '💭', title: lang === 'en' ? "Friend's True Feelings" : '이 친구의 진짜 속마음' },
            { icon: '🍻', title: lang === 'en' ? 'Drinks/Travel/Crisis Behavior' : '술자리/여행/위기 때 이 친구는?' },
            { icon: '💰', title: lang === 'en' ? 'Money & Secrets' : '돈 문제 & 비밀 공유' },
            { icon: '🔋', title: lang === 'en' ? 'Emotional Energy Check' : '감정 소모 체크' },
            { icon: '🎯', title: lang === 'en' ? 'How to Get Closer' : '이 친구와 더 가까워지는 법' },
            { icon: '📅', title: lang === 'en' ? 'Friendship Timeline 2026~2030' : '우정 타임라인 2026~2030' },
            { icon: '💌', title: lang === 'en' ? 'A Message for This Friendship' : '이 인연에게 보내는 한마디' },
          ] : compatRelType === 3 ? [
            { icon: '📖', title: lang === 'en' ? 'How to Read Compatibility' : '궁합 읽는 법' },
            { icon: '🔮', title: lang === 'en' ? 'Individual Saju Profiles' : '개인 사주 특성' },
            { icon: '💕', title: lang === 'en' ? 'Chemistry' : '두 사람의 케미' },
            { icon: '🤝', title: lang === 'en' ? 'Work Synergy' : '업무 시너지' },
            { icon: '💼', title: lang === 'en' ? 'Business Partner Potential' : '사업 파트너 가능성' },
            { icon: '⚠️', title: lang === 'en' ? 'Things to Watch Out For' : '직장에서 주의할 점' },
            { icon: '🎯', title: lang === 'en' ? 'Best Activities Together' : '함께하면 좋은 활동' },
            { icon: '💌', title: lang === 'en' ? 'Final Word' : '종합 한마디' },
          ] : compatRelType === 4 ? [
            { icon: '📖', title: lang === 'en' ? 'How to Read Compatibility' : '궁합 읽는 법' },
            { icon: '🔮', title: lang === 'en' ? 'Individual Saju Profiles' : '개인 사주 특성' },
            { icon: '💕', title: lang === 'en' ? 'Chemistry' : '두 사람의 케미' },
            { icon: '🔄', title: lang === 'en' ? 'Reunion Possibility' : '재회 가능성' },
            { icon: '💭', title: lang === 'en' ? "Partner's Feelings" : '상대방의 마음' },
            { icon: '🤔', title: lang === 'en' ? 'Hold On or Let Go?' : '잡아야 할까 놓아야 할까' },
            { icon: '🌟', title: lang === 'en' ? 'New Connection Timing' : '새로운 인연 시기' },
            { icon: '💊', title: lang === 'en' ? 'Heart Recovery Advice' : '마음 회복 조언' },
            { icon: '🎯', title: lang === 'en' ? 'Activities Together & Apart' : '함께/따로 좋은 활동' },
            { icon: '💌', title: lang === 'en' ? 'Final Word' : '종합 한마디' },
          ] : [
            { icon: '📖', title: lang === 'en' ? 'How to Read Compatibility' : '궁합 읽는 법' },
            { icon: '🔮', title: lang === 'en' ? 'Individual Saju Profiles' : '개인 사주 특성' },
            { icon: '💕', title: lang === 'en' ? 'Chemistry' : '두 사람의 케미' },
            { icon: '🤝', title: lang === 'en' ? 'Relationship Dynamics' : '관계 역학' },
            { icon: '📅', title: lang === 'en' ? 'Timing Analysis 2026~2030' : '시기 분석 2026~2030' },
            { icon: '⚠️', title: lang === 'en' ? 'Things to Watch Out For' : '주의할 점' },
          ];

          return (
          <div style={{ marginTop: '16px' }}>
            {/* Teaser header */}
            <div className="card card-glow" style={{ textAlign: 'center', padding: '28px 20px', background: 'linear-gradient(135deg, rgba(246,135,179,0.1), rgba(159,122,234,0.08))', border: '1px solid rgba(246,135,179,0.2)' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>💕</div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
                {compatRelType === 0 ? t('compatPayQ0', lang) :
                 compatRelType === 1 ? t('compatPayQ1', lang) :
                 compatRelType === 2 ? t('compatPayQ2', lang) :
                 compatRelType === 3 ? t('compatPayQ3', lang) :
                 compatRelType === 4 ? t('compatPayQ4', lang) :
                 t('compatPayQ5', lang)}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-dim)', margin: 0 }}>
                {lang === 'en' ? 'AI deep compatibility analysis powered by Four Pillars astrology' : 'AI가 사주명리학으로 분석하는 심층 궁합 해설'}
              </p>
            </div>

            {/* Analysis items preview */}
            <div className="card" style={{ marginTop: '12px', padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text)', textAlign: 'center' }}>
                {lang === 'en' ? '🔍 Analysis Items (' + compatSectionItems.length + ')' : '🔍 분석 항목 (' + compatSectionItems.length + '개)'}
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                {compatSectionItems.map((item, i) => (
                  <div key={i} className="locked-item">
                    <span className="lock-icon">🔒</span>
                    <span className="item-title">{item.icon} {i + 1}. {item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Blurred preview teaser */}
            <div className="card" style={{ marginTop: '12px', position: 'relative', overflow: 'hidden', padding: '20px' }}>
              <div style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>
                <div style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--text-dim)' }}>
                  {lang === 'en'
                    ? "The connection between these two Day Masters creates a fascinating dynamic. One person's energy naturally flows toward the other, creating a magnetic pull that both can feel from the first meeting..."
                    : '두 사람의 일간이 만들어내는 관계는 매우 흥미로운 역학을 가지고 있어. 한 사람의 기운이 자연스럽게 상대방에게 흘러가면서 처음 만난 순간부터 서로가 느낄 수 있는 자석 같은 끌림이 생기는데...'}
                </div>
              </div>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '32px' }}>🔒</span>
              </div>
            </div>

            {/* Pricing CTA — Star-based */}
            <div className="card" style={{
              marginTop: '12px', textAlign: 'center', padding: '28px 20px',
              background: 'linear-gradient(135deg, rgba(246,135,179,0.12), rgba(159,122,234,0.08))',
              border: '1px solid rgba(246,135,179,0.3)'
            }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.7, marginBottom: '16px' }}>
                {lang === 'en' ? 'Unlock the full compatibility reading\nand discover your connection' : '두 사람의 인연을 깊이 들여다보고\n궁합의 비밀을 확인해볼래?'}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#F687B3' }}>⭐ 5 {lang === 'en' ? 'Stars' : '별빛'}</span>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '6px' }}>
                  {lang === 'en' ? 'Your balance: ' : '보유 별빛: '}⭐ {starBalance}{lang === 'en' ? '' : '개'}
                </div>
              </div>
              {starBalance >= 5 ? (
                <button
                  className="paywall-cta"
                  style={{ display: 'block', width: '100%', textAlign: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '16px', background: 'linear-gradient(135deg, #F687B3, #9F7AEA)' }}
                  onClick={() => {
                    console.log('[compat v4] paywall unlocked, starting analysis');
                    updateStarBalance(starBalance - 5);
                    setCompatPaywall(false);
                    // Phase 6.5: flag ON + compat → 기존 /api/compat-v4 경로(runCompatAnalysis)를 완전히 우회하고
                    // 줄글 분기 신호만 세팅. CompatNarrativeReport가 자체적으로 /api/compat-narrative를 fetch한다.
                    // flag OFF면 기존 동작 그대로 runCompatAnalysis 호출(byte-identical).
                    if (
                      process.env.NEXT_PUBLIC_COMPAT_NARRATIVE_UI_ENABLED === 'true' &&
                      appMode === 'compat'
                    ) {
                      setCompatNarrativeRequested(true);
                    } else {
                      runCompatAnalysis().catch(err => {
                        console.error('[compat v4] runCompatAnalysis threw:', err);
                        setCompatLoading(false);
                        setCompatAiText('⚠ 시작 실패: ' + (err instanceof Error ? err.message : String(err)));
                      });
                    }
                  }}
                >
                  {lang === 'en' ? 'Unlock with 5 Stars ⭐' : '별빛 5개로 열기 ⭐'}
                </button>
              ) : (
                <button
                  className="paywall-cta"
                  style={{ display: 'block', width: '100%', textAlign: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '16px', background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
                  onClick={() => setCurrentScreen(9)}
                >
                  {lang === 'en' ? 'Not enough stars! Go charge ⭐' : '별빛이 부족해요! 충전하러 가기 ⭐'}
                </button>
              )}
            </div>
          </div>
          );
          })()
        )}

        {data && !compatV4Resp && data.myDS !== undefined && data.theirDS !== undefined && PROFILES[data.myDS] && PROFILES[data.theirDS] && (
          <>
            <div className="card card-glow" style={{ marginTop: '20px', textAlign: 'center' }}>
              <div className="side-by-side">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{data.myName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{CG_HANJA[data.myDS]} {CG[data.myDS]} {PROFILES[data.myDS].short}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{data.cName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{CG_HANJA[data.theirDS]} {CG[data.theirDS]} {PROFILES[data.theirDS].short}</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '24px 0 12px', fontWeight: 600, letterSpacing: '1px' }}>
                {lang === 'en' ? 'YOUR RELATIONSHIP' : '두 사람의 관계 정의'}
              </div>
              {data.summaryCards && data.summaryCards.length > 0 ? (() => {
                const card = data.summaryCards[0];
                const colors = ((cat: string) => {
                  switch (cat) {
                    case '운명형': return { primary: '#A78BFA', bg: 'linear-gradient(135deg, rgba(167,139,250,0.28), rgba(139,92,246,0.14))', border: 'rgba(167,139,250,0.45)' };
                    case '보완형': return { primary: '#22D3EE', bg: 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(16,185,129,0.12))', border: 'rgba(34,211,238,0.45)' };
                    case '역할형': return { primary: '#F472B6', bg: 'linear-gradient(135deg, rgba(244,114,182,0.25), rgba(236,72,153,0.12))', border: 'rgba(244,114,182,0.45)' };
                    case '도전형': return { primary: '#FB923C', bg: 'linear-gradient(135deg, rgba(251,146,60,0.25), rgba(245,158,11,0.12))', border: 'rgba(251,146,60,0.45)' };
                    case '다이내믹형': return { primary: '#F87171', bg: 'linear-gradient(135deg, rgba(248,113,113,0.25), rgba(239,68,68,0.12))', border: 'rgba(248,113,113,0.45)' };
                    case '안정형': return { primary: '#FCD34D', bg: 'linear-gradient(135deg, rgba(252,211,77,0.25), rgba(245,158,11,0.12))', border: 'rgba(252,211,77,0.45)' };
                    case '주의형': return { primary: '#94A3B8', bg: 'linear-gradient(135deg, rgba(148,163,184,0.25), rgba(100,116,139,0.12))', border: 'rgba(148,163,184,0.45)' };
                    case '성장형': return { primary: '#4ADE80', bg: 'linear-gradient(135deg, rgba(74,222,128,0.25), rgba(34,197,94,0.12))', border: 'rgba(74,222,128,0.45)' };
                    default: return { primary: '#A78BFA', bg: 'linear-gradient(135deg, rgba(167,139,250,0.22), rgba(139,92,246,0.10))', border: 'rgba(167,139,250,0.4)' };
                  }
                })(card.category);
                return (
                  <div style={{
                    padding: '32px 22px 26px',
                    borderRadius: '22px',
                    background: colors.bg,
                    border: '1.5px solid ' + colors.border,
                    textAlign: 'center',
                    margin: '4px 0 8px',
                    boxShadow: `0 8px 32px ${colors.border}`,
                  }}>
                    <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '14px' }}>{card.emoji}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: colors.primary, marginBottom: '10px', letterSpacing: '2px' }}>
                      {card.category}
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text)', marginBottom: '14px', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '18px', fontStyle: 'italic', lineHeight: 1.55, padding: '0 8px' }}>
                      "{card.tagline}"
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', padding: '14px 0', borderTop: '1px solid ' + colors.border, borderBottom: '1px solid ' + colors.border, letterSpacing: '0.5px' }}>
                      {data.myName} <span style={{ color: colors.primary, margin: '0 6px' }}>+</span> {data.cName}
                    </div>
                    {card.reasons && card.reasons.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '14px', opacity: 0.75, lineHeight: 1.5 }}>
                        {(lang === 'en' ? 'Why: ' : '매칭 근거: ') + card.reasons.slice(0, 3).join(' · ')}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', padding: '20px', textAlign: 'center' }}>
                  {lang === 'en' ? 'Calm chemistry — neither dramatic clashes nor dramatic attraction.' : '잔잔한 케미 — 큰 충돌도 큰 끌림도 없는 평이한 인연'}
                </div>
              )}
            </div>

            {/* Visual Comparison Charts - separate cards matching AI section style */}
            {(() => {
              const p1 = compatPerson1;
              const p2 = compatPerson2;
              let y1 = p1.year, m1 = p1.month, d1 = p1.day;
              if (p1.isLunar) { const s = lunarToSolar(y1, m1, d1); y1 = s.year; m1 = s.month; d1 = s.day; }
              let y2 = p2.year, m2 = p2.month, d2 = p2.day;
              if (p2.isLunar) { const s = lunarToSolar(y2, m2, d2); y2 = s.year; m2 = s.month; d2 = s.day; }
              const s1 = sajuResult || calcSaju(y1, m1, d1, p1.hour);
              const s2 = calcSaju(y2, m2, d2, p2.hour);
              const oh1 = getOhCount(s1);
              const oh2 = getOhCount(s2);
              const ohKeys = ['목','화','토','금','수'] as const;
              const ohColors: Record<string, string> = {'목':'#94b88f','화':'#e88578','토':'#d3b87a','금':'#b5b7c7','수':'#8aa1c4'};
              const maxOh = Math.max(...ohKeys.map(k => Math.max(oh1[k], oh2[k])), 1);

              // Day master relationship
              const dm1 = s1.dStem;
              const dm2 = s2.dStem;
              const el1 = OH_CG[dm1];
              const el2 = OH_CG[dm2];
              const genMap: Record<string, string> = {'목':'화','화':'토','토':'금','금':'수','수':'목'};
              const cgHapPairsV = [[0,5],[1,6],[2,7],[3,8],[4,9]];
              let dmRel = t('bihwa', lang);
              let dmRelDesc = t('bihwaDesc', lang);
              let dmRelArrow = '↔';
              if (el1 === el2) { dmRel = t('bihwa', lang); dmRelArrow = '↔'; dmRelDesc = t('bihwaDesc', lang); }
              else if (genMap[el1] === el2) { dmRel = t('saeng', lang); dmRelArrow = '→'; dmRelDesc = lang === 'en' ? el1 + ' nurtures ' + el2 + '! Naturally transferring energy' : el1 + '이 ' + el2 + '를 키워주는 관계! 자연스럽게 에너지를 전달해주는 구조'; }
              else if (genMap[el2] === el1) { dmRel = t('saeng', lang); dmRelArrow = '←'; dmRelDesc = lang === 'en' ? el2 + ' nurtures ' + el1 + '! Naturally receiving energy' : el2 + '이 ' + el1 + '를 키워주는 관계! 자연스럽게 에너지를 받는 구조'; }
              else if (genMap[genMap[el1]] === el2) { dmRel = t('geuk', lang); dmRelArrow = '→'; dmRelDesc = lang === 'en' ? el1 + ' controls ' + el2 + '. Tension exists but drives growth!' : el1 + '이 ' + el2 + '를 제어하는 관계. 긴장감이 있지만 성장의 원동력!'; }
              else if (genMap[genMap[el2]] === el1) { dmRel = t('geuk', lang); dmRelArrow = '←'; dmRelDesc = lang === 'en' ? el2 + ' controls ' + el1 + '. Tension exists but drives growth!' : el2 + '이 ' + el1 + '를 제어하는 관계. 긴장감이 있지만 성장의 원동력!'; }
              let hasCgHap = false;
              for (const hp of cgHapPairsV) { if ((dm1===hp[0]&&dm2===hp[1])||(dm1===hp[1]&&dm2===hp[0])) { hasCgHap=true; break; } }
              if (hasCgHap) { dmRel = t('cheonganHap', lang); dmRelArrow = '♥'; dmRelDesc = t('cheonganHapDesc', lang); }

              // Yongshin calculation (using shared calcYongsin for consistency with personal saju)
              const ys1 = calcYongsin(s1);
              const ys2 = calcYongsin(s2);
              const yong1 = ys1.yongsin;
              const yong2 = ys2.yongsin;
              const isStrong1 = ys1.isStrong;
              const isStrong2 = ys2.isStrong;

              // Check if partner has my yongshin — 명리학 기준:
              // 1순위: 상대 일간 오행이 내 용신과 같은가 (가장 강력한 보완)
              // 2순위: 상대 월지 오행이 내 용신과 같은가 (득령한 기운)
              // 3순위: 상대 사주에 용신 오행이 풍부한가 (3개 이상이어야 유의미)
              const el2DayStem = OH_CG[dm2];
              const el1DayStem = OH_CG[dm1];
              const el2MonthBranch = OH_JJ[s2.mBranch];
              const el1MonthBranch = OH_JJ[s1.mBranch];
              const partner2HasYong1 = el2DayStem === yong1 || (el2MonthBranch === yong1 && oh2[yong1] >= 2);
              const partner1HasYong2 = el1DayStem === yong2 || (el1MonthBranch === yong2 && oh1[yong2] >= 2);
              let yongDesc = '';
              if (partner2HasYong1 && partner1HasYong2) yongDesc = lang === 'en' ? 'Both have each other\'s yongsin! Perfect complementary match' : '서로의 용신을 가지고 있어! 최고의 보완 궁합';
              else if (partner2HasYong1) yongDesc = lang === 'en' ? data.cName + '\'s day master (' + el2DayStem + ') is the energy ' + data.myName + ' needs' : data.cName + '의 일간(' + el2DayStem + ')이 ' + data.myName + '에게 필요한 용신 기운이야';
              else if (partner1HasYong2) yongDesc = lang === 'en' ? data.myName + '\'s day master (' + el1DayStem + ') is the energy ' + data.cName + ' needs' : data.myName + '의 일간(' + el1DayStem + ')이 ' + data.cName + '에게 필요한 용신 기운이야';
              else if (oh2[yong1] >= 2 || oh1[yong2] >= 2) yongDesc = lang === 'en' ? 'Some complementary energy exists, but not in key positions' : '보완 기운이 있지만 핵심 위치(일간/월지)에는 없어. 함께 노력하면 채울 수 있는 관계';
              else yongDesc = lang === 'en' ? 'Different yongsin — a relationship where both grow by seeking balance together' : '서로의 용신이 다른 구조야. 함께 부족한 기운을 채워가며 성장하는 관계';

              const ohIconMap: Record<string, string> = {'목':'🌲','화':'☀️','토':'⛰️','금':'⚔️','수':'💧'};

              return (
                <>
                  {/* 일간 관계 */}
                  <div className="card" style={{ marginTop: '12px' }}>
                    <h3>{t('ilganRel', lang)}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '10px' }}>
                      <div style={{ background: 'rgba(240,199,94,0.06)', borderRadius: '14px', padding: '10px 16px', border: '1px solid rgba(240,199,94,0.15)' }}>
                        <div style={{ fontSize: '24px', marginBottom: '2px' }}>{ohIconMap[el1] || '✨'}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{CG[dm1]}({lang === 'en' ? OH_EN_CAP[OH_CG[dm1]] : OH_CG[dm1]})</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{data.myName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#F0C75E' }}>{dmRelArrow}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#F0C75E' }}>{dmRel}</div>
                      </div>
                      <div style={{ background: 'rgba(246,135,179,0.06)', borderRadius: '14px', padding: '10px 16px', border: '1px solid rgba(246,135,179,0.15)' }}>
                        <div style={{ fontSize: '24px', marginBottom: '2px' }}>{ohIconMap[el2] || '✨'}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{CG[dm2]}({lang === 'en' ? OH_EN_CAP[OH_CG[dm2]] : OH_CG[dm2]})</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{data.cName}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>{dmRelDesc}</p>
                  </div>

                  {/* 오행 비교 */}
                  <div className="card" style={{ marginTop: '12px' }}>
                    <h3>{t('ohCompare', lang)}</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '10px', fontSize: '11px', color: 'var(--text-dim)' }}>
                      <span style={{ color: '#F0C75E' }}>← {data.myName}</span>
                      <span style={{ color: '#F687B3' }}>{data.cName} →</span>
                    </div>
                    {ohKeys.map(k => {
                      const w1 = Math.max((oh1[k] / maxOh) * 100, 10);
                      const w2 = Math.max((oh2[k] / maxOh) * 100, 10);
                      return (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', gap: '4px' }}>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: w1 + '%', height: '18px', background: ohColors[k], borderRadius: '4px 0 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '5px', fontSize: '10px', fontWeight: 700, color: '#000', minWidth: '20px', opacity: 0.85 }}>
                              {oh1[k]}
                            </div>
                          </div>
                          <div style={{ width: '44px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: ohColors[k], flexShrink: 0 }}>{lang === 'en' ? OH_EN_CAP[k] : k}</div>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{ width: w2 + '%', height: '18px', background: ohColors[k], borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', paddingLeft: '5px', fontSize: '10px', fontWeight: 700, color: '#000', minWidth: '20px', opacity: 0.85 }}>
                              {oh2[k]}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 용신 궁합 */}
                  <div className="card" style={{ marginTop: '12px', textAlign: 'center' }}>
                    <h3>{t('yongsinCompat', lang)}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ background: 'rgba(240,199,94,0.06)', borderRadius: '12px', padding: '8px 14px', border: '1px solid rgba(240,199,94,0.15)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{data.myName}</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: ohColors[yong1] }}>{ohIconMap[yong1]} {lang === 'en' ? OH_EN_CAP[yong1] : yong1}</div>
                        <div style={{ fontSize: '10px', color: isStrong1 ? '#F0C75E' : '#7DD3FC' }}>{isStrong1 ? t('singang', lang) : t('sinyak', lang)}</div>
                      </div>
                      <div style={{ fontSize: '16px', color: '#F0C75E' }}>↔</div>
                      <div style={{ background: 'rgba(246,135,179,0.06)', borderRadius: '12px', padding: '8px 14px', border: '1px solid rgba(246,135,179,0.15)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{data.cName}</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: ohColors[yong2] }}>{ohIconMap[yong2]} {lang === 'en' ? OH_EN_CAP[yong2] : yong2}</div>
                        <div style={{ fontSize: '10px', color: isStrong2 ? '#F0C75E' : '#7DD3FC' }}>{isStrong2 ? t('singang', lang) : t('sinyak', lang)}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5, background: 'rgba(240,199,94,0.05)', borderRadius: '10px', padding: '8px 12px', margin: 0 }}>{yongDesc}</p>
                  </div>
                </>
              );
            })()}

            {/* v4 compat 결과 — preview 카드 즉시, AI 카드는 reportText 도착 후 자동 표시 */}
            {compatV4Resp && (
              <div data-compat-v4-result style={{ marginTop: 12 }}>
                <CompatV4Report api={compatV4Resp} lang={lang} />
              </div>
            )}
            {!compatV4Resp && compatLoading && (
              <div className="card" style={{ marginTop: '12px', textAlign: 'center', padding: '48px 24px', background: 'rgba(246,135,179,0.08)', border: '1px solid rgba(246,135,179,0.2)', borderRadius: '20px' }}>
                <div style={{ fontSize: '56px', animation: 'float 2s ease-in-out infinite', marginBottom: '16px' }}>💕</div>
                <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{t('compatReading', lang)}</p>
                <p style={{ fontSize: '13px', opacity: 0.5 }}>{t('compatTime', lang)}</p>
                <div style={{ width: '80%', maxWidth: '200px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', margin: '16px auto 0', overflow: 'hidden' }}>
                  <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, #F687B3, #9F7AEA)', borderRadius: '3px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              </div>
            )}
            {!compatV4Resp && !compatLoading && compatAiText && (
              <div className="card" style={{ marginTop: '12px' }}>
                <h3>{t('aiCompatTitle', lang)}</h3>
                {renderTOC(compatAiText)}
                <button className="btn" style={{ width: '100%', marginTop: '16px', background: 'rgba(240,199,94,0.18)', border: '1px solid rgba(240,199,94,0.35)', color: 'var(--text)', fontSize: '13px', padding: '10px' }}
                  disabled={isSharingLink}
                  onClick={() => shareLink(compatAiText, (userData.name || '') + ' & ' + (compatPerson2.name || '') + (lang === 'en' ? "'s Compatibility" : '의 궁합'))}>
                  {isSharingLink ? (lang === 'en' ? '🔗 Creating...' : '🔗 생성 중...') : (lang === 'en' ? '🔗 Share Link' : '🔗 링크 공유')}
                </button>
                <button className="btn" style={{ width: '100%', marginTop: '8px', background: 'rgba(159,122,234,0.15)', border: '1px solid rgba(159,122,234,0.3)', color: 'var(--text)', fontSize: '13px', padding: '10px' }} onClick={() => {
                  try {
                    const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                    const entry = { name: (userData.name || (lang === 'en' ? 'Me' : '나')) + ' & ' + (compatPerson2.name || (lang === 'en' ? 'Partner' : '상대')), date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'), type: lang === 'en' ? 'Compatibility' : '궁합 분석', text: compatAiText };
                    const updated = [entry, ...results].slice(0, 10);
                    safeSetItem('saju-saved-results', JSON.stringify(updated));
                    showToast(t('compatSaved', lang));
                  } catch { /* ignore corrupted storage */ }
                }}>{t('compatSaveResult', lang)}</button>
                <button className="btn" style={{ width: '100%', marginTop: '8px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--text)', fontSize: '13px', padding: '10px' }}
                  disabled={isTranslating}
                  onClick={() => {
                    const targetLang = compatAiTranslated ? (lang === 'ko' ? 'ko' : 'en') : (lang === 'ko' ? 'en' : 'ko');
                    translateAiText(compatAiText, targetLang, (t) => { setCompatAiText(t); setCompatAiTranslated(!compatAiTranslated); });
                  }}>
                  {isTranslating ? t('translating', lang) : (compatAiTranslated ? (lang === 'ko' ? t('translateToKo', lang) : t('translateToEn', lang)) : (lang === 'ko' ? t('translateToEn', lang) : t('translateToKo', lang)))}
                </button>
              </div>
            )}
          </>
        )}

        {/* ⭐ v4 compat 결과 — 부모 `{data && ...}` 조건과 무관하게 항상 그려진다.
            이전엔 부모 조건(data && !compatV4Resp)에 갇혀 compatV4Resp set 시 unmount됐음. */}
        {compatV4Resp && (
          <div data-compat-v4-result style={{ marginTop: 16 }}>
            <CompatV4Report api={compatV4Resp} lang={lang} />
          </div>
        )}
        {!compatV4Resp && compatLoading && (
          <div className="card" style={{ marginTop: 12, textAlign: 'center', padding: '48px 24px', background: 'rgba(246,135,179,0.08)', border: '1px solid rgba(246,135,179,0.2)', borderRadius: 20 }}>
            <div style={{ fontSize: 56, animation: 'float 2s ease-in-out infinite', marginBottom: 16 }}>💕</div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{t('compatReading', lang)}</p>
            <p style={{ fontSize: 13, opacity: 0.5 }}>{t('compatTime', lang)}</p>
          </div>
        )}
        {!compatV4Resp && !compatLoading && compatAiText && (
          <div className="card" style={{ marginTop: 12, padding: 16, background: 'rgba(255,140,140,0.06)', border: '1px solid rgba(255,140,140,0.25)', borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orot-coral)', marginBottom: 6 }}>⚠ 안내</div>
            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{compatAiText}</div>
          </div>
        )}
      </div>
    );
  }

  /* ===== SCREEN 6: Pregnancy ===== */
  function renderPregnancy() {

    function runPregnancyCompat() {
      const momSaju = calcSaju(pregData.year, pregData.month, pregData.day, pregData.hour);
      const babySaju = calcSaju(pregData.dueYear, pregData.dueMonth, pregData.dueDay, -1);
      const momOh = getOhCount(momSaju);
      const babyOh = getOhCount(babySaju);
      const ohKeys = ['목', '화', '토', '금', '수'];

      let momMin = 99;
      const momWeak: string[] = [];
      let babyMax = 0;
      const babyStrong: string[] = [];
      ohKeys.forEach(k => {
        if (momOh[k] < momMin) momMin = momOh[k];
        if (babyOh[k] > babyMax) babyMax = babyOh[k];
      });
      ohKeys.forEach(k => {
        if (momOh[k] === momMin) momWeak.push(k);
        if (babyOh[k] === babyMax) babyStrong.push(k);
      });

      let score = 72;
      const momDayEl = OH_CG[momSaju.dStem];
      const babyDayEl = OH_CG[babySaju.dStem];
      const sangMap: Record<string, string> = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
      if (sangMap[momDayEl] === babyDayEl || sangMap[babyDayEl] === momDayEl) score += 12;
      momWeak.forEach(w => { babyStrong.forEach(s => { if (w === s) score += 8; }); });
      const cgHapPairs = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]];
      for (const hp of cgHapPairs) {
        if ((momSaju.dStem === hp[0] && babySaju.dStem === hp[1]) || (momSaju.dStem === hp[1] && babySaju.dStem === hp[0])) {
          score += 7; break;
        }
      }
      if (score > 99) score = 99;
      if (score < 60) score = 60;

      let tierLabel = '';
      if (score >= 95) tierLabel = t('pregTier95', lang);
      else if (score >= 85) tierLabel = t('pregTier85', lang);
      else if (score >= 75) tierLabel = t('pregTier75', lang);
      else tierLabel = t('pregTierDefault', lang);

      const momTotal = Math.max(1, ohKeys.reduce((a, k) => a + momOh[k], 0));
      const babyTotal = Math.max(1, ohKeys.reduce((a, k) => a + babyOh[k], 0));

      setPregResult(JSON.stringify({ score, tierLabel, momOh, babyOh, momTotal, babyTotal, momWeak, babyStrong, ohKeys, name: pregData.name || '산모' }));

      /* AI 엄마-아기 궁합 해설 */
      setCompatLoading(true);
      setCompatAiText('');
      const momName = pregData.name || '산모';
      const prompt = (lang === 'en' ? '🚨 CRITICAL LANGUAGE INSTRUCTION 🚨\nYou MUST write EVERYTHING in English. EVERY sentence, EVERY section — ALL in English.\nDo NOT write Korean. Use warm, casual, friendly tone.\nSaju terms like Gap(甲) can appear with English meaning, but ALL text must be English.\nIF YOU WRITE IN KOREAN, THE RESPONSE WILL BE REJECTED.\n\n' : '') +
        '너는 사주명리학을 완벽하게 마스터한 따뜻하고 친근한 태아 궁합 상담가야. 한자 절대 쓰지 마. 고전 문헌 인용 금지. 존댓말로 따뜻하게 써줘. 부정적 표현 금지 - 모든 내용을 따뜻하고 희망적으로.\n' +
        '어려운 사주 개념을 쉽고 따뜻한 비유로 풀어서 설명해. 예비 엄마가 읽으면 마음이 따뜻해지게.\n\n' +
        '엄마 사주: 일간=' + CG[momSaju.dStem] + '(' + OH_CG[momSaju.dStem] + '), 년주=' + CG[momSaju.yStem] + JJ[momSaju.yBranch] + ', 월주=' + CG[momSaju.mStem] + JJ[momSaju.mBranch] + ', 일주=' + CG[momSaju.dStem] + JJ[momSaju.dBranch] + '\n' +
        '아기 예정일 사주: 일간=' + CG[babySaju.dStem] + '(' + OH_CG[babySaju.dStem] + '), 년주=' + CG[babySaju.yStem] + JJ[babySaju.yBranch] + ', 월주=' + CG[babySaju.mStem] + JJ[babySaju.mBranch] + ', 일주=' + CG[babySaju.dStem] + JJ[babySaju.dBranch] + '\n' +
        '엄마 오행: 목' + momOh['목'] + ' 화' + momOh['화'] + ' 토' + momOh['토'] + ' 금' + momOh['금'] + ' 수' + momOh['수'] + '\n' +
        '아기 오행: 목' + babyOh['목'] + ' 화' + babyOh['화'] + ' 토' + babyOh['토'] + ' 금' + babyOh['금'] + ' 수' + babyOh['수'] + '\n' +
        '궁합점수: ' + score + '점\n\n' +
        '아래 내용을 자연스러운 이야기체로 써줘. 사주 용어는 괄호로 쉽게 풀어서.\n\n' +
        '##1.엄마와 아기의 인연## 두 사주의 천간합/지지합 관계, 오행 상생관계를 근거로 둘의 인연이 얼마나 깊은지. 아기가 엄마를 선택한 이유를 사주적으로 풀어서. 5줄 이상.\n' +
        '##2.아기가 엄마에게 주는 선물## 엄마에게 부족한 오행(' + momWeak.join(',') + ')을 아기가 채워주는지, 아기가 가져다주는 기운이 엄마 인생에 어떤 변화를 만드는지. 5줄.\n' +
        '##3.아기의 타고난 기질## 아기 일간(' + CG[babySaju.dStem] + '/' + OH_CG[babySaju.dStem] + ')의 성격, 잘하는 것, 좋아할 것 예측. 시주가 없어도 일주와 월주로 추론. 5줄.\n' +
        '##4.엄마의 양육 스타일 궁합## 엄마 일간(' + CG[momSaju.dStem] + ')과 아기 일간(' + CG[babySaju.dStem] + ')의 관계가 육아에서 어떻게 나타나는지. 잘 맞는 점, 주의할 점(부드럽게). 5줄.\n' +
        '##5.아이에게 추천하는 교육 방향## 아기 일간(' + CG[babySaju.dStem] + '/' + OH_CG[babySaju.dStem] + ')의 오행 특성을 기반으로:\n' +
        '- 예체능 vs 학문 중 어디에 재능이 있는지 (오행 근거로)\n' +
        '- 구체적 추천 분야 3가지 (예: 목 기운 강하면 글쓰기/음악, 금 기운 강하면 수학/코딩)\n' +
        '- 학습 스타일 예측 (혼자 집중형 vs 함께하는 토론형 등)\n' +
        '- 피해야 할 교육 방식 (아기 기신 오행과 연결해서 부드럽게)\n' +
        '모든 추천에 명리학적 근거 필수. 5줄 이상.\n' +
        '##6.부모와 아이의 기질 궁합## 엄마 일간(' + CG[momSaju.dStem] + ')과 아기 일간(' + CG[babySaju.dStem] + ')의 오행 관계를 깊이 분석:\n' +
        '- 두 사람의 상생/상극 관계가 일상에서 어떻게 나타나는지 (예: 엄마가 화, 아기가 금이면 엄마의 열정이 아기를 단련시키는 관계)\n' +
        '- 아기가 커서 반항기가 올 때 엄마가 대처하는 법\n' +
        '- 아빠 역할에 대한 조언 (아기 오행 기준으로 아빠에게 필요한 양육 에너지)\n' +
        '부정적 내용도 부드럽고 희망적으로. 5줄 이상.\n' +
        '##7.사주로 보는 아이의 취미/활동 추천## 아기의 오행 균형과 일간 성격을 기반으로:\n' +
        '- 🎨 창작 활동 (그림/음악/글쓰기 중 뭐가 맞는지)\n' +
        '- ⚽ 운동 (팀스포츠 vs 개인운동, 구체적 종목 추천)\n' +
        '- 🌿 자연 활동 (어떤 환경에서 에너지 충전되는지)\n' +
        '- 🎮 놀이 스타일 (어떤 장난감/놀이를 좋아할지)\n' +
        '- 👫 사회 활동 (리더형 vs 참모형 vs 자유형)\n' +
        '각각 오행 근거를 재미있는 비유와 함께. 5줄 이상.\n' +
        '##8.아이에게 유리한 방위 & 이름 오행## 아기 사주의 용신 오행을 기반으로:\n' +
        '- 📍 아기방 방위 추천 (용신 방위와 이유)\n' +
        '- 🔤 이름에 좋은 오행 글자 (용신 오행과 상생하는 한글 자음/획수 가이드)\n' +
        '- 🎨 아기방 컬러 추천 (용신 오행 색상)\n' +
        '- 🏠 집안에서 아기에게 좋은 위치/방향\n' +
        '명리학적 근거 필수. 5줄 이상.\n' +
        '##9.아이의 멘탈 강점 & 약점## 아기 일간과 사주 구조로 보는 심리적 특성:\n' +
        '- 💪 타고난 멘탈 강점 (어떤 상황에서 강한지)\n' +
        '- 😢 스트레스 받는 포인트 (어떤 상황이 힘든지)\n' +
        '- 🤗 부모가 도와줄 수 있는 구체적 방법 3가지\n' +
        '- 성장하면서 변화하는 멘탈 패턴 예측\n' +
        '부정적 내용도 "이런 부분을 도와주시면 돼요" 식으로 따뜻하게. 5줄 이상.\n' +
        '##10.기운 합 분석 & 맞춤 태교## 엄마와 아기의 오행 상생/상극 관계를 명리학적으로 깊이 있게 분석해줘:\n' +
        '- 엄마 일간(' + CG[momSaju.dStem] + '/' + OH_CG[momSaju.dStem] + ')과 아기 일간(' + CG[babySaju.dStem] + '/' + OH_CG[babySaju.dStem] + ')의 오행 관계가 상생인지 상극인지, 그게 육아에서 어떻게 나타나는지 명리학 근거와 함께\n' +
        '- 두 사주의 용신/기신이 서로에게 어떤 영향을 주는지\n' +
        '- 엄마-아기 오행 조합에 맞는 태교 방법 추천:\n' +
        '  · 태교 음악 (오행별 음계/장르 근거로 구체적 추천)\n' +
        '  · 태교 활동 (산책 방향, 색상 테라피, 명상법, 그림/독서 등)\n' +
        '  · 태교 음식 (엄마와 아기 오행을 보충하는 음식)\n' +
        '  · 태교할 때 피해야 할 것 (기신 오행 관련)\n' +
        '모든 추천에 명리학적 근거를 반드시 함께. 10줄 이상.\n' +
        '##11.행운 아이템 & 개운법## 엄마와 아기의 사주를 함께 고려한 맞춤 추천:\n' +
        '- 🎨 행운의 색 2가지 (엄마+아기 오행 보완 근거)\n' +
        '- 💎 럭키 아이템 3가지 (일상에서 쓸 수 있는 것, 오행 근거)\n' +
        '- 📍 행운의 방향 (산책/외출 시 좋은 방위)\n' +
        '- 🏠 아기방 인테리어 추천 (오행 기반 색상/방향/소품)\n' +
        '- 👶 사주로 보는 추천 육아법 (아기 일간 성격에 맞는 양육 접근법 3가지)\n' +
        '- 🎯 엄마의 취미 추천 (임신 중 + 출산 후, 용신 오행 보충하는 활동 3가지)\n' +
        '각각 명리학적 근거를 괄호로 설명. 8줄 이상.\n' +
        '##12.아기가 가져올 가정의 변화## 아기의 사주가 가정 전체의 에너지를 어떻게 바꾸는지. 부부 관계에 미치는 영향, 재물운 변화, 가족 분위기 변화를 사주적 근거로. 아기가 태어난 후 가정이 어떻게 달라지는지 구체적으로. 5줄.\n' +
        '##13.엄마에게 보내는 편지## 사주를 바탕으로 예비 엄마에게 보내는 따뜻한 응원 편지. 반드시 존댓말(합니다/습니다/세요 체)로 작성하세요. "어머니의 사주를 보니 이런 멋진 엄마가 되실 거예요"라는 느낌으로 감동적이고 진심을 담아서. 비유를 많이 써서 가슴에 와닿게. 절대 반말 금지. 5줄.\n\n' +
        '=== 중복 금지 규칙 ===\n' +
        '13개 섹션 각각 고유한 역할이 있어. 이전 섹션에서 다룬 내용을 다른 섹션에서 반복하지 마!\n' +
        '- 섹션3(기질)과 섹션9(멘탈)은 성격 vs 심리적 강약점으로 구분\n' +
        '- 섹션4(양육궁합)과 섹션6(기질궁합)은 일상 양육 vs 오행 관계 분석으로 구분\n' +
        '- 섹션5(교육)과 섹션7(취미)은 학습 방향 vs 놀이/활동으로 구분\n' +
        '- 섹션8(방위/이름)과 섹션11(행운아이템)은 공간/이름 vs 물건/습관으로 구분\n\n' +
        '비유적 표현을 적극 사용해! 매 섹션마다 최소 2개의 재미있고 따뜻한 비유를 넣어줘.\n' +
        '예시: "엄마가 따뜻한 볕이라면 아기는 그 볕을 받아 피어나는 꽃이야", "이 아기는 엄마 인생에 떨어진 행운의 별똥별 같은 존재야", "엄마의 부족한 수(水) 기운을 아기가 촉촉한 빗물처럼 채워주는 구조야"\n' +
        '한자 절대 금지! 괄호 안 한자 금지! 고전 문헌 인용 금지! 대신 어려운 개념은 재밌는 비유로 풀어서 친근하게 조언해.\n' +
        '해석의 여지가 있을 때는 반드시 긍정적으로. 흥미 유발 포인트도 매 섹션 1개 이상.\n\n' +
        getRelevantRefs({ dayMaster: momSaju.dStem, topics: ['compatibility', 'health', 'general'] });

      fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, lang })
      }).then(async (res) => {
        if (!res.ok || !res.body) { setCompatLoading(false); setCompatAiText(t('pregAiError', lang)); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
        }
        setCompatAiText(full);
        setCompatLoading(false);
      }).catch(() => { setCompatLoading(false); setCompatAiText(t('pregAiError', lang)); });
    }

    function runDailyGuide() {
      const now = new Date();
      const todaySaju = calcSaju(now.getFullYear(), now.getMonth() + 1, now.getDate(), -1);
      const todayEl = OH_CG[todaySaju.dStem];
      const dailyGuide: Record<string, { color: string; food: string; activity: string; music: string; mood: string }> = {
        '목': { color: t('daily_wood_color', lang), food: t('daily_wood_food', lang), activity: t('daily_wood_activity', lang), music: t('daily_wood_music', lang), mood: t('daily_wood_mood', lang) },
        '화': { color: t('daily_fire_color', lang), food: t('daily_fire_food', lang), activity: t('daily_fire_activity', lang), music: t('daily_fire_music', lang), mood: t('daily_fire_mood', lang) },
        '토': { color: t('daily_earth_color', lang), food: t('daily_earth_food', lang), activity: t('daily_earth_activity', lang), music: t('daily_earth_music', lang), mood: t('daily_earth_mood', lang) },
        '금': { color: t('daily_metal_color', lang), food: t('daily_metal_food', lang), activity: t('daily_metal_activity', lang), music: t('daily_metal_music', lang), mood: t('daily_metal_mood', lang) },
        '수': { color: t('daily_water_color', lang), food: t('daily_water_food', lang), activity: t('daily_water_activity', lang), music: t('daily_water_music', lang), mood: t('daily_water_mood', lang) }
      };
      const guide = dailyGuide[todayEl] || dailyGuide['목'];
      const dayPillar = CG[todaySaju.dStem] + JJ[todaySaju.dBranch];

      setPregResult(JSON.stringify({
        type: 'daily',
        todayY: now.getFullYear(), todayM: now.getMonth() + 1, todayD: now.getDate(),
        dayPillar, todayEl, guide
      }));
    }

    const data = pregResult ? (() => { try { return JSON.parse(pregResult); } catch { return null; } })() : null;

    // 임산부 narrative V4 입력 (flag on 경로 전용 — 기존 calcSaju/pregResult와 완전 분리)
    // 엄마: pregData.hour(시진 인덱스) + pregMomExact(정확입력) → pregnancyMomBirthTimeFields.
    //   시진 grid는 대표시각(자시 0 → 00:30, 그 외 k → 2k:00)으로 왕복 일치 보장.
    // 아기(예정): P7.4-fix로 예정시간 입력 제거 → 항상 birthTimeConfidence 'unknown' (birthTime 미전송).
    const _pad2 = (n: number) => String(n).padStart(2, '0');
    const momInputV4: CompatBirthInputV4 = {
      name: pregData.name || '엄마', gender: 'female', calendarType: 'solar',
      birthDate: `${pregData.year}-${_pad2(pregData.month)}-${_pad2(pregData.day)}`,
      // 엄마(실제 출생자): 정확입력(HH:mm)→exact / 시진→대표값+approximate / 모름→unknown
      ...pregnancyMomBirthTimeFields(pregData.hour, pregMomExact),
      timezone: 'Asia/Seoul',
      // P7.4: flag off OR 지역 미선택이면 {} → 키 미포함(기존 payload byte-identical). calculationMode 미주입.
      ...birthPlacePayloadPatch(SAJU_PRECISION_INPUTS_ENABLED, pregMomPlaceId),
    };
    const babyDueInputV4: CompatBirthInputV4 = {
      name: '아기', gender: 'unknown', calendarType: 'solar',
      birthDate: `${pregData.dueYear}-${_pad2(pregData.dueMonth)}-${_pad2(pregData.dueDay)}`,
      // P7.4-fix: 아기는 미출생 → 예정시간 입력 제거. birthTime 미전송, 항상 unknown.
      //   narrative 파이프라인: babyHourKnown=false → "예정시간 표현 0건, 출생예정일 기준 3주 참고".
      birthTimeConfidence: 'unknown',
      timezone: 'Asia/Seoul',
    };

    return (
      <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        <button
          onClick={() => setCurrentScreen(0)}
          aria-label={t('backBtn', lang)}
          style={{
            background: 'transparent', border: 0, color: 'var(--orot-ink)',
            fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
            fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
        </button>
        <BleedCard
          image="/images/orot/home-feat-baby.webp"
          framingId="home-feat-baby-hero"
          veil="left"
          minHeight={220}
          style={{ marginBottom: 20 }}
        >
          <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '62%' }}>
            <div style={{ marginBottom: 12 }}>
              <div className="orot-eyebrow">{t('pregTitle', lang)}</div>
              <div style={{ fontSize: 11, color: 'var(--orot-ink-mute)', marginTop: 4, marginLeft: 21, fontFamily: 'var(--orot-font)', letterSpacing: '0.01em' }}>{t('pregDesc', lang)}</div>
            </div>
            <h1 style={{
              fontSize: 20, fontWeight: 700, color: 'var(--orot-ink)',
              letterSpacing: '-0.015em', lineHeight: 1.4, margin: 0,
              whiteSpace: 'pre-line', fontFamily: 'var(--orot-font)',
            }}>
              {lang === 'en' ? "A bond from a past life —\nmother and child, together" : '전생부터 이어진 인연,\n엄마와 아기의 사주를 함께 풀어드려요'}
            </h1>
          </div>
        </BleedCard>
        <p style={{ textAlign: 'center', marginBottom: '24px', fontSize: '14px', color: 'var(--text-dim)' }}>
          {t('pregSubtitle', lang)}
        </p>

        <div className="card" style={{ background: 'rgba(255,240,245,0.08)', border: '1px solid rgba(233,30,140,0.2)', borderRadius: '20px', padding: '24px' }}>
          <div className="input-group">
            <label>{t('momName', lang)}</label>
            <input type="text" placeholder={t('momNamePlaceholder', lang)} value={pregData.name} onChange={e => setPregData(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="input-group">
            <label>{t('momBirthday', lang)}</label>
            <div className="select-row">
              <div className="input-group">
                <select value={pregData.year} onChange={e => setPregData(p => ({ ...p, year: parseInt(e.target.value) }))}>
                  {Array.from({ length: 86 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}{t('yearUnit', lang)}</option>)}
                </select>
              </div>
              <div className="input-group">
                <select value={pregData.month} onChange={e => setPregData(p => ({ ...p, month: parseInt(e.target.value) }))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{t('monthName' + m as any, lang)}</option>)}
                </select>
              </div>
              <div className="input-group">
                <select value={pregData.day} onChange={e => setPregData(p => ({ ...p, day: parseInt(e.target.value) }))}>
                  {Array.from({ length: getDaysInMonth(pregData.year, pregData.month) }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}{t('dayUnit', lang)}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="input-group">
            <label>{t('dueDate', lang)}</label>
            <div className="select-row">
              <div className="input-group">
                <select value={pregData.dueYear} onChange={e => setPregData(p => ({ ...p, dueYear: parseInt(e.target.value) }))}>
                  {[new Date().getFullYear() + 1, new Date().getFullYear()].map(y => <option key={y} value={y}>{y}{t('yearUnit', lang)}</option>)}
                </select>
              </div>
              <div className="input-group">
                <select value={pregData.dueMonth} onChange={e => setPregData(p => ({ ...p, dueMonth: parseInt(e.target.value) }))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{t('monthName' + m as any, lang)}</option>)}
                </select>
              </div>
              <div className="input-group">
                <select value={pregData.dueDay} onChange={e => setPregData(p => ({ ...p, dueDay: parseInt(e.target.value) }))}>
                  {Array.from({ length: getDaysInMonth(pregData.dueYear, pregData.dueMonth) }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}{t('dayUnit', lang)}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 임산부 narrative V4 — 선택 시간 입력 (flag on일 때만 노출, 기존 폼 불변).
            개인사주/올해운세와 동일한 시진(時辰) time-grid + "시간 모름" 방식. */}
        {PREGNANCY_NARRATIVE_UI_ENABLED && !pregNarrativeRequested && (
          <div className="card" style={{ background: 'rgba(255,240,245,0.08)', border: '1px solid rgba(233,30,140,0.2)', borderRadius: '20px', padding: '20px', marginTop: '16px' }}>
            <div className="input-group">
              <label id="preg-mom-time-label">엄마 출생시간 (선택 · 모르면 비워두세요)</label>
              <div className="time-grid" role="radiogroup" aria-labelledby="preg-mom-time-label">
                {TIMES.map(ti => (
                  <div key={ti.h} role="radio" aria-checked={pregData.hour === ti.h} tabIndex={0}
                    className={'time-option' + (pregData.hour === ti.h ? ' selected' : '')}
                    onClick={() => setPregData(p => ({ ...p, hour: ti.h }))}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPregData(p => ({ ...p, hour: ti.h })); } }}>
                    <div className="time-range">{ti.range}</div>
                    <div className="time-hangul">{t(TIME_I18N_KEYS[ti.h], lang)}</div>
                  </div>
                ))}
                <div role="radio" aria-checked={pregData.hour === -1} tabIndex={0}
                  className={'time-option unknown-time' + (pregData.hour === -1 ? ' selected' : '')}
                  onClick={() => { setPregData(p => ({ ...p, hour: -1 })); setPregMomExact({ use: false, hour: -1, min: 0 }); }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPregData(p => ({ ...p, hour: -1 })); setPregMomExact({ use: false, hour: -1, min: 0 }); } }}>
                  {t('unknownTime', lang)}
                </div>
              </div>
              {/* P7.4-fix: 엄마(실제 출생자) 정확입력(HH:mm) — 개인사주와 동일. 시진 grid와 동기화. */}
              <div className="exact-time-section">
                <label className="exact-time-toggle" onClick={() => {
                  const next = !pregMomExact.use;
                  if (!next) { setPregMomExact({ use: false, hour: -1, min: 0 }); }
                  else { const h = pregMomExact.hour < 0 ? 0 : pregMomExact.hour; setPregMomExact({ use: true, hour: h, min: pregMomExact.min }); setPregData(p => ({ ...p, hour: exactTimeToSiju(h, pregMomExact.min) })); }
                }}>
                  <span className={'exact-time-checkbox' + (pregMomExact.use ? ' checked' : '')}>{pregMomExact.use ? '✓' : ''}</span>
                  {t('knowExactTime', lang)}
                </label>
                {pregMomExact.use && (
                  <div className="exact-time-inputs">
                    <select className="exact-time-select" value={pregMomExact.hour} onChange={e => {
                      const h = parseInt(e.target.value);
                      setPregMomExact(p => ({ ...p, hour: h }));
                      setPregData(p => ({ ...p, hour: exactTimeToSiju(h, pregMomExact.min) }));
                    }}>
                      {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}{t('hourUnit', lang)}</option>)}
                    </select>
                    <select className="exact-time-select" value={pregMomExact.min} onChange={e => {
                      const m = parseInt(e.target.value);
                      setPregMomExact(p => ({ ...p, min: m }));
                      setPregData(p => ({ ...p, hour: exactTimeToSiju(pregMomExact.hour, m) }));
                    }}>
                      {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}{t('minuteUnit', lang)}</option>)}
                    </select>
                    <span className="exact-time-siju">{'→ ' + (lang === 'en' ? TIMES[exactTimeToSiju(pregMomExact.hour < 0 ? 0 : pregMomExact.hour, pregMomExact.min)].hanja.replace('시', '') : TIMES[exactTimeToSiju(pregMomExact.hour < 0 ? 0 : pregMomExact.hour, pregMomExact.min)].hanja)}</span>
                  </div>
                )}
                <p className="exact-time-note">{t('exactTimeNote', lang)}</p>
              </div>
            </div>
            {/* P7.4: 엄마 출생지역 (flag on일 때만). 아기 예정 영역엔 추가하지 않음. */}
            {SAJU_PRECISION_INPUTS_ENABLED && (
              <PlaceSelect value={pregMomPlaceId} onChange={setPregMomPlaceId} lang={lang === 'en' ? 'en' : 'ko'} id="preg-mom-place-select" />
            )}
            {/* P7.4-fix: 아기 예정시간 입력 제거 (미출생·불확실 → birthTime 미전송, unknown).
                출생예정일만 받고, 실제 출생일/시간에 따라 달라질 수 있다는 안내만 유지. 출산시간 추천 뉘앙스 금지. */}
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px', lineHeight: 1.5 }}>아기는 출생예정일 기준으로만 봐요. 실제 출생일과 시간에 따라 결과가 달라질 수 있어요.</p>
          </div>
        )}

        {!pregNarrativeRequested && (
          <div style={{ marginTop: '20px' }}>
            <button className="btn btn-glow btn-full" style={{ background: 'linear-gradient(135deg,#E91E8C,#FF6FB7)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }} onClick={() => { if (PREGNANCY_NARRATIVE_UI_ENABLED) { setPregNarrativeRequested(true); } else { runPregnancyCompat(); } }}>
              {t('energyAnalysis', lang)}
            </button>
          </div>
        )}

        {/* flag on: 새 narrative 경로만 렌더 (기존 /api/saju·점수카드 미사용) */}
        {PREGNANCY_NARRATIVE_UI_ENABLED && pregNarrativeRequested && (
          <PregnancyNarrativeReport
            momInput={momInputV4}
            babyDueInput={babyDueInputV4}
            lang={lang === 'en' ? 'en' : 'ko'}
            onRestart={() => { setPregNarrativeRequested(false); }}
            userName={userData.name || (lang === 'en' ? 'You' : '당신')}
            isSharing={isSharingLink}
            onShareText={(text, title) => shareLink(text, title)}
            onSaveText={(text, title) => {
              try {
                const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                const entry = {
                  name: userData.name || (lang === 'en' ? 'You' : '익명'),
                  date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'),
                  type: lang === 'en' ? 'Pregnancy' : '태교 궁합',
                  text,
                  user: userData,
                };
                const updated = [entry, ...results].slice(0, 20);
                localStorage.setItem('saju-saved-results', JSON.stringify(updated));
                setSavedResults(updated);
                showToast(t('resultSaved', lang));
              } catch { /* quota or parse error */ }
            }}
          />
        )}

        {/* 기존 모드 결과 (flag off 경로) — flag on narrative 요청 시 숨김 */}
        {!(PREGNANCY_NARRATIVE_UI_ENABLED && pregNarrativeRequested) && data && !data.type && (
          <>
            <div className="card" style={{ background: 'rgba(255,240,245,0.08)', border: '1px solid rgba(233,30,140,0.15)', borderRadius: '20px', marginTop: '20px', padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>{t('pregMomBabyScore', lang)}</p>
              <div style={{ fontSize: '64px', fontWeight: 800, background: 'linear-gradient(135deg,#E91E8C,#FF6FB7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', padding: '8px 0' }}>
                {data.score}{t('scoreUnit', lang)}
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>{data.tierLabel}</p>
              <div style={{ marginTop: '16px', textAlign: 'left', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                {[
                  { min: 95, emoji: '🌟', label: lang === 'en' ? '95~100: Destined Bond' : '95~100점: 천생의 인연', desc: lang === 'en' ? 'Heavenly stems harmonize perfectly. Baby chose you — a once-in-a-lifetime connection.' : '천간합이 완벽하게 이루어진 관계. 아기가 엄마를 선택한 거야 — 전생의 인연이야.' },
                  { min: 85, emoji: '💕', label: lang === 'en' ? '85~94: Perfect Match' : '85~94점: 찰떡궁합', desc: lang === 'en' ? 'Five elements complement each other beautifully. Natural synergy between mom and baby.' : '오행이 서로를 아름답게 보완하는 구조. 엄마와 아기가 자연스럽게 시너지를 내.' },
                  { min: 75, emoji: '🌸', label: lang === 'en' ? '75~84: Helping Bond' : '75~84점: 서로 돕는 관계', desc: lang === 'en' ? 'Some elements support each other. Growing stronger together through mutual nurturing.' : '일부 오행이 상생 관계. 서로를 키워주며 함께 성장하는 아름다운 인연이야.' },
                  { min: 0, emoji: '🤗', label: lang === 'en' ? '60~74: Warm Harmony' : '60~74점: 따뜻한 조화', desc: lang === 'en' ? 'Different energies create balance. Love fills every gap — differences become strengths.' : '다른 기운이 오히려 균형을 만들어. 사랑이 모든 빈자리를 채워주는 관계야.' },
                ].map((tier, i) => {
                  const isActive = (i === 0 && data.score >= 95) || (i === 1 && data.score >= 85 && data.score < 95) || (i === 2 && data.score >= 75 && data.score < 85) || (i === 3 && data.score < 75);
                  return (
                    <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', marginBottom: '6px', background: isActive ? 'rgba(233,30,140,0.1)' : 'transparent', border: isActive ? '1px solid rgba(233,30,140,0.3)' : '1px solid transparent', opacity: isActive ? 1 : 0.5 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{tier.emoji} {tier.label} {isActive && '← ✨'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{tier.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(255,240,245,0.08)', border: '1px solid rgba(233,30,140,0.15)', borderRadius: '20px', padding: '24px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '16px' }}>🌟 {data.name} {t('pregMomBabyOh', lang)}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>{t('pregMomLabel', lang)}</p>
                  {data.ohKeys.map((k: string) => {
                    const pct = Math.round(data.momOh[k] / data.momTotal * 100);
                    return (
                      <div key={k} className="bar-row">
                        <div className="bar-label">{lang === 'en' ? OH_EN_CAP[k] : k}</div>
                        <div className="bar-track">
                          <div className={'bar-fill ' + getElemClass(k)} style={{ width: pct + '%' }}>{pct}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <p style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>{t('pregBabyLabel', lang)}</p>
                  {data.ohKeys.map((k: string) => {
                    const pct = Math.round(data.babyOh[k] / data.babyTotal * 100);
                    return (
                      <div key={k} className="bar-row">
                        <div className="bar-label">{lang === 'en' ? OH_EN_CAP[k] : k}</div>
                        <div className="bar-track">
                          <div className={'bar-fill ' + getElemClass(k)} style={{ width: pct + '%' }}>{pct}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI 엄마-아기 궁합 해설 */}
            {compatLoading && (
              <div className="card" style={{ marginTop: '16px', textAlign: 'center', padding: '48px 24px', background: 'rgba(233,30,140,0.06)', border: '1px solid rgba(233,30,140,0.15)', borderRadius: '20px' }}>
                <div style={{ fontSize: '48px', animation: 'float 2s ease-in-out infinite', marginBottom: '16px' }}>👶✨</div>
                <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>{t('readingMomBaby', lang)}</p>
                <p style={{ fontSize: '12px', opacity: 0.5 }}>{t('readingTime30', lang)}</p>
                <div style={{ width: '60%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', margin: '16px auto 0', overflow: 'hidden' }}>
                  <div style={{ width: '50%', height: '100%', background: 'linear-gradient(90deg, #E91E8C, #FF6FB7)', borderRadius: '3px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              </div>
            )}
            {!compatLoading && compatAiText && (
              <div className="card" style={{ marginTop: '16px', background: 'rgba(255,240,245,0.06)', border: '1px solid rgba(233,30,140,0.15)', borderRadius: '20px', padding: '24px' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '16px' }}>{t('momBabyReading', lang)}</h3>
                {renderTOC(compatAiText) || (
                  <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(compatAiText, lang) }} />
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button className="btn" style={{ flex: 1, background: 'rgba(233,30,140,0.12)', border: '1px solid rgba(233,30,140,0.3)', color: 'var(--text)', fontSize: '13px', padding: '10px' }} disabled={isTranslating} onClick={() => {
                    const targetLang = pregAiTranslated ? (lang === 'ko' ? 'ko' : 'en') : (lang === 'ko' ? 'en' : 'ko');
                    translateAiText(compatAiText, targetLang, (val) => { setCompatAiText(val); setPregAiTranslated(!pregAiTranslated); });
                  }}>
                    {isTranslating ? t('translating', lang) : (pregAiTranslated ? (lang === 'ko' ? t('translateToKo', lang) : t('translateToEn', lang)) : (lang === 'ko' ? t('translateToEn', lang) : t('translateToKo', lang)))}
                  </button>
                  <button className="btn" style={{ flex: 1, background: 'rgba(233,30,140,0.12)', border: '1px solid rgba(233,30,140,0.3)', color: 'var(--text)', fontSize: '13px', padding: '10px' }} onClick={() => {
                    try {
                      const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                      const entry = { name: (pregData.name || (lang === 'en' ? 'Mom' : '산모')) + (lang === 'en' ? ' & Baby' : ' & 아기'), date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'), type: lang === 'en' ? 'Pregnancy Compatibility' : '임산부 궁합', text: compatAiText };
                      const updated = [entry, ...results].slice(0, 10);
                      safeSetItem('saju-saved-results', JSON.stringify(updated));
                      showToast(t('pregSaved', lang));
                    } catch { /* ignore corrupted storage */ }
                  }}>{t('pregSaveResult', lang)}</button>
                </div>
              </div>
            )}
          </>
        )}

        {data && data.type === 'daily' && (
          <>
            <div className="card" style={{ background: 'rgba(255,240,245,0.08)', border: '1px solid rgba(233,30,140,0.15)', borderRadius: '20px', marginTop: '20px', padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>{t('dailyTodayDate', lang)}</p>
              <p style={{ fontSize: '15px', color: 'var(--text)' }}>{data.todayY}{t('yearSuffix', lang)}{data.todayM}{t('monthSuffix', lang)}{data.todayD}{t('daySuffix', lang)}</p>
              <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>{t('dailyIljin', lang)}{data.dayPillar} ({data.todayEl}{t('dailyEnergyDay', lang)})</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
              {[
                { icon: '🎨', title: t('dailyLuckyColor', lang), value: data.guide.color },
                { icon: '🍽️', title: t('dailyFood', lang), value: data.guide.food },
                { icon: '🧘', title: t('dailyActivity', lang), value: data.guide.activity },
                { icon: '🎵', title: t('dailyMusic', lang), value: data.guide.music },
                { icon: '💬', title: t('dailyMessage', lang), value: data.guide.mood },
              ].map((card, i, arr) => (
                <div key={i} className="card" style={{
                  ...(i === arr.length - 1 ? { gridColumn: '1/-1' } : {}),
                  background: 'rgba(255,240,245,0.08)', border: '1px solid rgba(233,30,140,0.15)', borderRadius: '20px', padding: '20px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{card.icon}</div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{card.title}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6 }}>{card.value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '40px' }}>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 32px', borderRadius: '12px' }} onClick={() => setCurrentScreen(0)}>
            {t('backToStart', lang)}
          </button>
        </div>
      </div>
    );
  }

  /* ===== SCREEN 7: Yearly Fortune ===== */
  function renderYearlyFortune() {
    // ── Y9: 올해운세 V4 분기 (가드 OFF가 기본 — 프로덕션 동작 byte-identical) ──
    // NEXT_PUBLIC_YEARLY_FORTUNE_UI_ENABLED==='true' + yearly 모드 + 사주 계산 완료일 때만
    // 새 V4 컴포넌트(POST /api/yearly-fortune)로 렌더. 그 외에는 아래 기존 v3 경로 그대로.
    if (
      process.env.NEXT_PUBLIC_YEARLY_FORTUNE_UI_ENABLED === 'true' &&
      appMode === 'yearly' &&
      sajuResult
    ) {
      const { birthTime: birthTimeV4, birthTimeConfidence: birthTimeConfidenceV4 } = resolveBirthTimeFields({
        sijuIndex: userData.hour,
        exact: { use: useExactTime, hour: exactHour, min: exactMinute },
      });
      const yearlyV4Input: YearlyV4Input = {
        birth: {
          name: userData.name || '익명',
          gender: (userData.gender === 'm' ? 'male' : userData.gender === 'f' ? 'female' : 'unknown'),
          calendarType: isLunar ? 'lunar' : 'solar',
          birthDate: `${userData.year}-${String(userData.month).padStart(2, '0')}-${String(userData.day).padStart(2, '0')}`,
          birthTime: birthTimeV4,
          birthTimeConfidence: birthTimeConfidenceV4,
          timezone: 'Asia/Seoul',
          // P7.2: flag off OR 지역 미선택이면 {} → 키 미포함(기존 yearly payload와 byte-identical).
          // precision 적용 여부는 서버 env SAJU_CALC_MODE 소관 (UI는 calculationMode 미주입).
          ...birthPlacePayloadPatch(SAJU_PRECISION_INPUTS_ENABLED, birthPlaceId),
        },
        currentDate: new Date().toISOString().slice(0, 10),
        // 질문화면(v4Ctx)에서 받은 연애상태·관심사·나이를 올해운세에 전달 → 엔진 맞춤 로직 활성화.
        relationshipStatus: (({ single: 'single', dating: 'dating', married: 'married', divorced: 'divorced', widowed: 'unknown', unknown: 'unknown' } as const)[v4Ctx.relationshipStatus] ?? 'unknown'),
        userContext: {
          age: userData.year ? (new Date().getFullYear() - userData.year) : undefined,
          relationshipStatus: v4Ctx.relationshipStatus,
          currentConcerns: v4Ctx.concerns,
          ...(v4Ctx.occupation ? { occupation: v4Ctx.occupation } : {}),
        },
      };
      return (
        <YearlyV4Report
          input={yearlyV4Input}
          lang={lang}
          onRestart={() => { setCurrentScreen(0); setAiText(''); setSajuResult(null); }}
          userName={userData.name || (lang === 'en' ? 'You' : '당신')}
          isSharing={isSharingLink}
          onShareText={(text, title) => shareLink(text, title)}
          onSaveText={(text, title) => {
            try {
              const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
              const entry = {
                name: userData.name || (lang === 'en' ? 'You' : '익명'),
                date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'),
                type: lang === 'en' ? '2026 Fortune' : '2026 운세',
                text,
                user: userData,
              };
              const updated = [entry, ...results].slice(0, 20);
              localStorage.setItem('saju-saved-results', JSON.stringify(updated));
              setSavedResults(updated);
              showToast(t('resultSaved', lang));
            } catch { /* quota or parse error */ }
          }}
        />
      );
    }

    if (!sajuResult) {
      // Saved result view — no saju calc data, just AI text
      if (aiText) {
        return (
          <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
            <button
              onClick={() => { setCurrentScreen(0); setAiText(''); }}
              aria-label={t('backBtn', lang)}
              style={{
                background: 'transparent', border: 0, color: 'var(--orot-ink)',
                fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
                fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
            </button>
            <BleedCard
              image="/images/orot/year-character.webp"
              framingId="year-character"
              veil="left"
              minHeight={180}
              style={{ marginBottom: 20 }}
            >
              <div style={{ paddingTop: 6, paddingBottom: 6, maxWidth: '70%' }}>
                <div className="orot-eyebrow" style={{ marginBottom: 12 }}>
                  📅 {lang === 'en' ? 'Saved fortune' : '저장된 운세'}
                </div>
                <h1 style={{
                  fontSize: 22, fontWeight: 700, color: 'var(--orot-ink)',
                  letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0,
                  fontFamily: 'var(--orot-font)',
                  background: 'none', WebkitTextFillColor: 'var(--orot-ink)',
                }}>
                {lang === 'en' ? 'Saved Fortune' : '저장된 운세'}
              </h1>
            </div>
            </BleedCard>
            <div className="section-divider">{t('aiReading', lang)}</div>
            {renderTOC(aiText) || (
              <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(aiText, lang) }} />
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
              <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: 'var(--text)', fontSize: '13px' }} onClick={() => { setCurrentScreen(0); setAiText(''); }}>
                {t('restart', lang)}
              </button>
            </div>
          </div>
        );
      }
      return null;
    }
    const sj = sajuResult;
    const ds = sj.dStem;
    const profile = PROFILES[ds];
    const ohCount = getOhCount(sj);
    const ohKeys = ['목', '화', '토', '금', '수'];
    let total = 0;
    ohKeys.forEach(k => { total += ohCount[k]; });
    if (total === 0) total = 1;

    const pillars = [
      { label: t('pillarHour', lang), stem: sj.hStem, branch: sj.hBranch },
      { label: t('pillarDay', lang), stem: sj.dStem, branch: sj.dBranch },
      { label: t('pillarMonth', lang), stem: sj.mStem, branch: sj.mBranch },
      { label: t('pillarYear', lang), stem: sj.yStem, branch: sj.yBranch }
    ];

    return (
      <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        <button
          onClick={() => { setCurrentScreen(0); setAiText(''); setSajuResult(null); }}
          aria-label={t('backBtn', lang)}
          style={{
            background: 'transparent', border: 0, color: 'var(--orot-ink)',
            fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
            fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
        </button>
        <BleedCard
          image="/images/orot/year-character.webp"
          framingId="year-character"
          veil="left"
          minHeight={240}
          style={{ marginBottom: 20 }}
        >
          <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '70%' }}>
            <div className="orot-eyebrow" style={{ marginBottom: 12 }}>
              {lang === 'en' ? '◇ 2026 ◇' : '◇ 2026 나의 한 해 ◇'}
            </div>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: 'var(--orot-ink)',
              letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0,
              fontFamily: 'var(--orot-font)',
              background: 'none', WebkitTextFillColor: 'var(--orot-ink)',
            }}>
              {(userData.name || t('anonymous', lang)) + t('yearlyFortuneOf', lang)}
            </h1>
            <p style={{
              fontSize: 12, color: 'var(--orot-ink-mute)', margin: '10px 0 0',
              fontFamily: 'var(--orot-font)',
            }}>
              {lang === 'en' ? `${t(('monthName' + userData.month) as any, lang)} ${userData.day}, ${userData.year}` : `${userData.year}${t('yearUnit', lang)} ${userData.month}${t('monthUnit', lang)} ${userData.day}${t('dayUnit', lang)}`} {t('born', lang)}
            </p>
          </div>
        </BleedCard>

        {/* Header (hidden, replaced by hero) */}
        <div className="result-header">
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>📅</div>
          <div className="name" style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {userData.name || t('anonymous', lang)}{t('yearlyFortuneOf', lang)}
          </div>
          <div className="sub">{lang === 'en' ? `${t('monthName' + userData.month as any, lang)} ${userData.day}, ${userData.year}` : `${userData.year}${t('yearUnit', lang)} ${userData.month}${t('monthUnit', lang)} ${userData.day}${t('dayUnit', lang)}`} {t('born', lang)}</div>
          <div style={{ marginTop: '8px', display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}>
            {t('yearlyBadgeLabel', lang)}
          </div>
        </div>

        {/* Four Pillars Summary */}
        <div className="section-divider">{t('sajuMyeongsik', lang)}</div>
        <div className="card">
          <div className="pillar-grid">
            {pillars.map((pp, pi) => (
              <div key={pi} className="pillar">
                <div className="pillar-label">{pp.label}</div>
                {pp.stem < 0 ? (
                  <>
                    <div className="stem" style={{ color: 'var(--text-dim)' }}>?</div>
                    <div className="branch" style={{ color: 'var(--text-dim)' }}>?</div>
                    <div className="elem" style={{ opacity: 0.3 }}>?</div>
                  </>
                ) : (
                  <>
                    <div className="stem" style={{ color: getElemColor(OH_CG[pp.stem]) }}>
                      <span style={{ fontSize: '28px' }}>{CG_HANJA[pp.stem]}</span><br />
                      <span style={{ fontSize: '12px', opacity: 0.7 }}>{CG[pp.stem]}({lang === 'en' ? OH_EN_CAP[OH_CG[pp.stem]] : OH_CG[pp.stem]})</span>
                    </div>
                    <div className="branch" style={{ color: getElemColor(OH_JJ[pp.branch]) }}>
                      <span style={{ fontSize: '28px' }}>{JJ_HANJA[pp.branch]}</span><br />
                      <span style={{ fontSize: '12px', opacity: 0.7 }}>{JJ[pp.branch]}({OH_JJ[pp.branch]})</span>
                    </div>
                    <span className={'elem elem-' + getElemClass(OH_CG[pp.stem])}>{lang === 'en' ? OH_EN_CAP[OH_CG[pp.stem]] : OH_CG[pp.stem]}</span>{' '}
                    <span className={'elem elem-' + getElemClass(OH_JJ[pp.branch])}>{OH_JJ[pp.branch]}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '8px' }}>
            {t('dayMasterLabel', lang)}: <strong style={{ color: getElemColor(OH_CG[ds]) }}>{CG[ds]} {profile.short}</strong>
          </p>
        </div>

        {/* 신살 & 귀인 Badges */}
        {(() => {
          const yShinsal = calcShinsal(sj);
          if (yShinsal.length === 0) return null;
          const yGilShin = ['천을귀인', '문창귀인', '학당귀인', '천주귀인', '복성귀인', '장성살', '천의성', '금여록', '암록'];
          const yGwiin = ['천을귀인', '문창귀인', '학당귀인', '천주귀인', '복성귀인'];
          return (
            <div className="card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>{t('shinsalTitle', lang)}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {yShinsal.map((s, i) => {
                  const isGw = yGwiin.includes(s);
                  const isGl = yGilShin.includes(s);
                  return (
                    <span key={i} style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                      background: isGw ? 'rgba(240,199,94,0.15)' : isGl ? 'rgba(110,231,183,0.12)' : 'rgba(251,191,36,0.10)',
                      border: isGw ? '1px solid rgba(240,199,94,0.4)' : isGl ? '1px solid rgba(110,231,183,0.3)' : '1px solid rgba(251,191,36,0.25)',
                      color: isGw ? '#F0C75E' : isGl ? '#6EE7B7' : '#FBBF24'
                    }}>
                      {isGw ? '⭐ ' : ''}{s}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 오행 밸런스 */}
        <div className="section-divider">{t('ohBalance', lang)}</div>
        <OhaengChart ohCount={ohCount} lang={lang} />

        {/* 사주 체질 (용신/기신) */}
        {(() => {
          const ys = calcYongsin(sj);
          const ohIcon: Record<string, string> = { '목': '🌳', '화': '🔥', '토': '⛰️', '금': '⚔️', '수': '💧' };
          return (
            <>
              <div className="section-divider">{t('sajuConstitution', lang)}</div>
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: ys.isStrong ? '#F0C75E' : '#7DD3FC' }}>
                    {ys.isStrong ? (lang === 'en' ? 'Strong Type' : '신강 (에너지 강한 타입)') : (lang === 'en' ? 'Gentle Type' : '신약 (에너지 부드러운 타입)')}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#6EE7B7', fontWeight: 700, marginBottom: '4px' }}>{lang === 'en' ? 'Yongsin (Needed)' : '용신 (필요한 기운)'}</div>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{ohIcon[ys.yongsin]} {ys.yongsin}</div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#F87171', fontWeight: 700, marginBottom: '4px' }}>{lang === 'en' ? 'Gisin (Avoid)' : '기신 (피할 기운)'}</div>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{ohIcon[ys.gisin]} {ys.gisin}</div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* AI Yearly Reading */}
        <div className="section-divider">{t('yearlyFortuneTitle', lang)}</div>
        {isGenerating && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '64px', animation: 'float 2s ease-in-out infinite', marginBottom: '20px' }}>📅</div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
              {t('yearlyAnalyzing', lang)}
            </p>
            <div style={{ width: '100%', maxWidth: '280px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', margin: '0 auto 16px', overflow: 'hidden' }}>
              <div style={{
                width: '60%',
                height: '100%',
                background: 'linear-gradient(90deg, #F59E0B, #EF4444)',
                borderRadius: '4px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '4px' }}>
              {loadingProgress || t('preparing', lang)}
            </p>
            <p style={{ fontSize: '12px', opacity: 0.4 }}>{t('yearlyTime', lang)}</p>
          </div>
        )}

        {/* 올해 운 에너지 레이더 차트 */}
        {!isGenerating && aiText && (() => {
          const fMatch = aiText.match(/\[운세점수:\s*재물=(\d+),\s*연애=(\d+),\s*직장=(\d+),\s*건강=(\d+),\s*대인=(\d+)\]/);
          const fScores = fMatch ? [parseInt(fMatch[1]), parseInt(fMatch[2]), parseInt(fMatch[3]), parseInt(fMatch[4]), parseInt(fMatch[5])] : [7, 6, 7, 5, 8];
          const fLabels = lang === 'en' ? ['Wealth', 'Love', 'Career', 'Health', 'Social'] : ['재물운', '연애운', '직장운', '건강운', '대인운'];
          const fIcons = ['💰', '💕', '💼', '🏥', '👥'];
          const fColors = ['#F0C75E', '#F687B3', '#7DD3FC', '#6EE7B7', '#9F7AEA'];
          const cx = 120, cy = 120, r = 90;
          const angles = fScores.map((_: number, i: number) => (Math.PI * 2 * i / 5) - Math.PI / 2);
          const toXY = (angle: number, val: number) => ({ x: cx + Math.cos(angle) * (val / 10) * r, y: cy + Math.sin(angle) * (val / 10) * r });
          const pts = fScores.map((s: number, i: number) => toXY(angles[i], s));
          const polyPoints = pts.map((p: {x: number; y: number}) => `${p.x},${p.y}`).join(' ');
          const gridLevels = [2, 4, 6, 8, 10];

          return (
            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginBottom: '12px', textAlign: 'center' }}>
                {lang === 'en' ? '2026 Fortune Energy' : '2026 올해 운 에너지'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <svg viewBox="0 0 240 240" width="240" height="240">
                  {gridLevels.map(lv => (
                    <polygon key={lv} points={angles.map((a: number) => { const p = toXY(a, lv); return `${p.x},${p.y}`; }).join(' ')}
                      fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  ))}
                  {angles.map((a: number, i: number) => {
                    const end = toXY(a, 10);
                    return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
                  })}
                  <polygon points={polyPoints} fill="rgba(240,199,94,0.15)" stroke="#F0C75E" strokeWidth="2" />
                  {pts.map((p: {x: number; y: number}, i: number) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill={fColors[i]} stroke="#fff" strokeWidth="1" />
                  ))}
                  {angles.map((a: number, i: number) => {
                    const lp = toXY(a, 12.5);
                    return (
                      <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fill={fColors[i]} fontSize="11" fontWeight="700">
                        {fIcons[i]} {fLabels[i]}
                      </text>
                    );
                  })}
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                {fScores.map((s: number, i: number) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: '50px' }}>
                    <div style={{ fontSize: '11px', color: fColors[i], fontWeight: 700 }}>{fIcons[i]} {fLabels[i]}</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: fColors[i] }}>{s}<span style={{ fontSize: '10px', opacity: 0.5 }}>/10</span></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 분기별 에너지 그래프 — TOC 위에 별도 표시 */}
        {!isGenerating && aiText && (() => {
          const qMatch = aiText.match(/\[에너지점수:\s*Q1=(\d+),\s*Q2=(\d+),\s*Q3=(\d+),\s*Q4=(\d+)\]/);
          const qScores = qMatch
            ? [parseInt(qMatch[1]), parseInt(qMatch[2]), parseInt(qMatch[3]), parseInt(qMatch[4])]
            : [6, 7, 5, 8];
          const qLabels = lang === 'en' ? ['Q1\nJan-Mar', 'Q2\nApr-Jun', 'Q3\nJul-Sep', 'Q4\nOct-Dec'] : ['1분기\n1~3월', '2분기\n4~6월', '3분기\n7~9월', '4분기\n10~12월'];
          const qColors = ['#7DD3FC', '#6EE7B7', '#F0C75E', '#F687B3'];
          const maxQ = Math.max(...qScores);

          return (
            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '12px', textAlign: 'center' }}>
                ⚡ {lang === 'en' ? 'Quarterly Energy Graph' : '분기별 에너지 그래프'}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', height: '140px', marginBottom: '8px', padding: '0 8px' }}>
                {qScores.map((score, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: qColors[i], marginBottom: '6px' }}>{score}<span style={{ fontSize: '11px', opacity: 0.5 }}>/10</span></div>
                    <div style={{
                      width: '100%', maxWidth: '52px',
                      height: Math.max(12, (score / 10) * 110) + 'px',
                      background: `linear-gradient(180deg, ${qColors[i]}, ${qColors[i]}33)`,
                      borderRadius: '10px 10px 4px 4px',
                      boxShadow: score === maxQ ? `0 0 16px ${qColors[i]}55` : 'none',
                      border: score === maxQ ? `2px solid ${qColors[i]}` : '1px solid rgba(255,255,255,0.08)'
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '0 8px' }}>
                {qLabels.map((label, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: qColors[i], fontWeight: 600, whiteSpace: 'pre-line', lineHeight: '1.3' }}>{label}</div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--text-dim)' }}>
                {lang === 'en' ? 'Highest energy: ' : '에너지 최고 분기: '}<strong style={{ color: qColors[qScores.indexOf(maxQ)] }}>{qLabels[qScores.indexOf(maxQ)].split('\n')[0]}</strong>
              </div>
            </div>
          );
        })()}

        {/* 사주 해설 본문 — 목차 아코디언 */}
        {!isGenerating && aiText && renderTOC(aiText)}

        {/* Share + Save + Restart */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
          {aiText && !isGenerating && (
            <button className="btn" style={{ flex: 1, background: 'rgba(240,199,94,0.18)', border: '1px solid rgba(240,199,94,0.35)', color: 'var(--text)', fontSize: '13px' }}
              disabled={isSharingLink}
              onClick={() => shareLink(aiText, (userData.name || '') + (lang === 'en' ? "'s Saju Reading" : '의 사주 해설'))}>
              {isSharingLink ? (lang === 'en' ? '🔗 Creating...' : '🔗 생성 중...') : (lang === 'en' ? '🔗 Share Link' : '🔗 링크 공유')}
            </button>
          )}
          {aiText && !isGenerating && (
            <button className="btn" style={{ flex: 1, background: 'rgba(159,122,234,0.15)', border: '1px solid rgba(159,122,234,0.3)', color: 'var(--text)', fontSize: '13px' }} onClick={() => {
              try {
                const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                const entry = { name: userData.name, date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'), type: currentScreen === 7 ? (lang === 'en' ? '2026 Fortune' : '2026 운세') : (lang === 'en' ? 'Saju Reading' : '사주 해설'), text: aiText, saju: sajuResult, user: userData };
                const updated = [entry, ...results].slice(0, 10);
                safeSetItem('saju-saved-results', JSON.stringify(updated));
                showToast(t('resultSaved', lang));
              } catch { /* ignore corrupted storage */ }
            }}>{t('saveResult', lang)}</button>
          )}
          {aiText && !isGenerating && (
            <button className="btn" style={{ flex: 1, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--text)', fontSize: '13px' }}
              disabled={isTranslating}
              onClick={() => {
                const targetLang = aiTextTranslated ? (lang === 'ko' ? 'ko' : 'en') : (lang === 'ko' ? 'en' : 'ko');
                translateAiText(aiText, targetLang, (t) => { setAiText(t); setAiTextTranslated(!aiTextTranslated); });
              }}>
              {isTranslating ? t('translating', lang) : (aiTextTranslated ? (lang === 'ko' ? t('translateToKo', lang) : t('translateToEn', lang)) : (lang === 'ko' ? t('translateToEn', lang) : t('translateToKo', lang)))}
            </button>
          )}
          <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: 'var(--text)', fontSize: '13px' }} onClick={() => { setCurrentScreen(0); setAiText(''); setSajuResult(null); }}>
            {t('restart', lang)}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '24px', padding: '12px 16px', color: 'var(--orot-ink-mute)', background: 'rgba(243, 231, 207, 0.04)', border: '1px solid var(--orot-hair)', borderRadius: 12, lineHeight: 1.6 }}>
          {t('disclaimer', lang)}
        </p>
      </div>
    );
  }

  /* ===== SCREEN 8: Teaser / Paywall ===== */
  function renderTeaser() {
    if (!sajuResult) return null;

    // 개인사주 v4 — 새 호기심형 미리보기(PersonalPreviewTeaser). 결정론 v4Resp만 사용(GPT 전).
    // 올해/v3는 아래 기존 teaser 유지.
    if (isV4 && appMode === 'saju') {
      const pv = v4Resp as unknown as PersonalPreviewData | null;
      return (
        <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
          <button
            onClick={() => setCurrentScreen(0)}
            aria-label={t('backBtn', lang)}
            style={{ background: 'transparent', border: 0, color: 'var(--orot-ink)', fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12, fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
          </button>
          <PersonalPreviewTeaser
            preview={pv}
            loading={!pv?.coreAnalysis}
            userName={userData.name || t('anonymous', lang)}
            lang={lang}
            starBalance={starBalance}
            cost={10}
            onUnlock={() => { updateStarBalance(starBalance - 10); setTeaserUnlocked(true); setCurrentScreen(4); }}
            onCharge={() => setCurrentScreen(9)}
          />
        </div>
      );
    }

    // 올해사주 v4 — 새 호기심형 미리보기(YearlyPreviewTeaser). 결정론 preview만 사용(GPT 전).
    if (appMode === 'yearly' && YEARLY_FORTUNE_UI_ENABLED) {
      return (
        <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
          <button
            onClick={() => setCurrentScreen(0)}
            aria-label={t('backBtn', lang)}
            style={{ background: 'transparent', border: 0, color: 'var(--orot-ink)', fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12, fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
          </button>
          <YearlyPreviewTeaser
            preview={yearlyPreview}
            loading={yearlyPreviewLoading}
            userName={userData.name || t('anonymous', lang)}
            lang={lang}
            starBalance={starBalance}
            cost={10}
            onUnlock={() => { updateStarBalance(starBalance - 10); setTeaserUnlocked(true); setCurrentScreen(7); }}
            onCharge={() => setCurrentScreen(9)}
          />
        </div>
      );
    }

    const sj = sajuResult;
    const ds = sj.dStem;
    const profile = PROFILES[ds];
    const ohCount = getOhCount(sj);
    const ohKeys = ['목', '화', '토', '금', '수'];
    let total = 0;
    ohKeys.forEach(k => { total += ohCount[k]; });
    if (total === 0) total = 1;

    const pillars = [
      { label: t('pillarHour', lang), stem: sj.hStem, branch: sj.hBranch },
      { label: t('pillarDay', lang), stem: sj.dStem, branch: sj.dBranch },
      { label: t('pillarMonth', lang), stem: sj.mStem, branch: sj.mBranch },
      { label: t('pillarYear', lang), stem: sj.yStem, branch: sj.yBranch }
    ];

    const sipsung = getSipsung(sj);
    const sipsungValues = Object.values(sipsung);
    const hasPyunjae = sipsungValues.includes('편재');
    const hasJunggwan = sipsungValues.includes('정관');
    const hasSiksang = sipsungValues.includes('식신') || sipsungValues.includes('상관');

    const isYearly = appMode === 'yearly';

    const yearlySectionTitles = [
      t('yrSecTitle1', lang), t('yrSecTitle2', lang), t('yrSecTitle3', lang),
      t('yrSecTitle4', lang), t('yrSecTitle5', lang), t('yrSecTitle6', lang),
      t('yrSecTitle7', lang), t('yrSecTitle8', lang), t('yrSecTitle9', lang), t('yrSecTitle10', lang)
    ];
    const yearlySectionHints = [
      t('yrSecHint1', lang), t('yrSecHint2', lang), t('yrSecHint3', lang),
      t('yrSecHint4', lang), t('yrSecHint5', lang), t('yrSecHint6', lang),
      t('yrSecHint7', lang), t('yrSecHint8', lang), t('yrSecHint9', lang), t('yrSecHint10', lang)
    ];
    const yearlyIcons = ['🔮', '📅', '⚡', '💰', '💕', '💼', '👥', '🛡', '🍀', '📊'];

    const isMarriedUser = userData.relationship === 3;
    const title4 = isMarriedUser ? (lang === 'en' ? 'Marriage & Spouse Analysis' : '부부 관계 & 배우자 분석') : t('secTitle4', lang);
    const hint4 = isMarriedUser ? (lang === 'en' ? 'Spouse compatibility & relationship dynamics...' : '배우자 궁합과 부부 관계 역학...') : t('secHint4', lang);

    const sectionTitles = isYearly ? yearlySectionTitles : [
      t('secTitle1', lang), t('secTitle2', lang), t('secTitle3', lang), title4,
      t('secTitle5', lang), t('secTitle6', lang), t('secTitle7', lang), t('secTitle8', lang),
      t('secTitle9', lang), t('secTitle10', lang), t('secTitle11', lang)
    ];

    const sectionHints = isYearly ? yearlySectionHints : [
      t('secHint1', lang), t('secHint2', lang), t('secHint3', lang), hint4,
      t('secHint5', lang), t('secHint6', lang), t('secHint7', lang), t('secHint8', lang),
      t('secHint9', lang), t('secHint10', lang), t('secHint11', lang)
    ];

    const icons = isYearly ? yearlyIcons : ['🎯', '🗺', '💰', '💕', '🔍', '👥', '👨‍👩‍👧', '🏥', '📍', '🍀', '💌'];

    const isEn = lang === 'en';
    const teaserBirthLine = isEn
      ? `${t(('monthName' + userData.month) as any, lang)} ${userData.day}, ${userData.year}`
      : `${userData.year}${t('yearUnit', lang)} ${userData.month}${t('monthUnit', lang)} ${userData.day}${t('dayUnit', lang)}`;
    return (
      <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        <button
          onClick={() => setCurrentScreen(0)}
          aria-label={t('backBtn', lang)}
          style={{
            background: 'transparent', border: 0, color: 'var(--orot-ink)',
            fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
            fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
        </button>

        {/* Hero BleedCard */}
        <BleedCard
          image={isYearly ? '/images/orot/year-character.webp' : '/images/orot/saju-in-character.webp'}
          framingId={isYearly ? 'year-character' : 'saju-in-character'}
          veil="left"
          minHeight={240}
          style={{ marginBottom: 20 }}
        >
          <div style={{ paddingTop: 8, paddingBottom: 8, maxWidth: '70%' }}>
            <div className="orot-eyebrow" style={{ marginBottom: 12 }}>
              {isYearly ? (isEn ? '◇ 2026 ◇' : '◇ 2026 나의 한 해 ◇') : (isEn ? 'My reading' : '나의 풀이')}
            </div>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: 'var(--orot-ink)',
              letterSpacing: '-0.015em', lineHeight: 1.3, margin: 0,
              fontFamily: 'var(--orot-font)',
              background: 'none', WebkitTextFillColor: 'var(--orot-ink)',
            }}>
              {isYearly ? (userData.name || t('anonymous', lang)) + t('yearlyFortuneOf', lang) : (userData.name || t('anonymous', lang)) + t('sajuAnalysisOf', lang)}
            </h1>
            <p style={{
              fontSize: 12, color: 'var(--orot-ink-mute)', margin: '10px 0 0',
              fontFamily: 'var(--orot-font)',
            }}>
              {teaserBirthLine} {t('born', lang)}
            </p>
            {isYearly && (
              <div style={{ marginTop: 12, display: 'inline-block', padding: '4px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: 'rgba(243, 160, 146, 0.10)', border: '1px solid var(--orot-coral-faint)', color: 'var(--orot-coral)' }}>
                {t('yearlyBadge', lang)}
              </div>
            )}
          </div>
        </BleedCard>

        {/* Section B: Spoiler Cards - personalized teasers */}
        <div className="section-divider">{isYearly ? t('teaserFortune', lang) : t('teaserSaju', lang)}</div>
        {(() => {
          const dayName = CG[ds];
          const branchName = JJ[sj.dBranch];
          const sipsungValues = Object.values(sipsung);
          const hasJeongjae = sipsungValues.includes('정재');
          const monthNow = new Date().getMonth() + 1;
          const spoilerMonths = [3, 6, 9, 11];
          const keyMonth = spoilerMonths.find(m => m > monthNow) || spoilerMonths[0]; // In Dec, wraps to 3 (next year's first key month)
          const quarterMap: Record<number, string> = { 3: t('quarter1', lang), 6: t('quarter2', lang), 9: t('quarter3', lang), 11: t('quarter4', lang) };
          const keyQuarter = quarterMap[keyMonth] || t('secondHalf', lang);

          const sajuSpoilers = [
            {
              icon: '🔮',
              visible: dayName + t('spoilerGyeokguk', lang),
              blurred: t('spoilerGyeokgukBlur', lang),
              hint: hasPyunjae ? t('hint_pyunjae', lang) : hasJunggwan ? t('hint_junggwan', lang) : hasJeongjae ? t('hint_jeongjae', lang) : hasSiksang ? t('hint_siksang', lang) : t('hint_bigyup', lang),
              gradient: 'linear-gradient(135deg, rgba(192,132,252,0.12), rgba(139,92,246,0.06))',
              border: 'rgba(192,132,252,0.25)'
            },
            {
              icon: '💰',
              visible: t('spoilerWealth', lang),
              blurred: t('spoilerWealthBlur', lang),
              hint: hasPyunjae ? t('spoilerWealthHint_jackpot', lang) : hasJeongjae ? t('spoilerWealthHint_salary', lang) : t('spoilerWealthHint_selfmade', lang),
              gradient: 'linear-gradient(135deg, rgba(246,196,67,0.12), rgba(245,158,11,0.06))',
              border: 'rgba(246,196,67,0.25)'
            },
            {
              icon: '💕',
              visible: t('spoilerLoveVisible', lang),
              blurred: t('spoilerLoveBlur', lang),
              hint: branchName + '(' + OH_JJ[sj.dBranch] + ')',
              gradient: 'linear-gradient(135deg, rgba(255,107,157,0.12), rgba(239,68,68,0.06))',
              border: 'rgba(255,107,157,0.25)'
            },
            {
              icon: '⚡',
              visible: t('spoilerKeyMonth', lang),
              blurred: t('spoilerKeyMonthBlur', lang),
              hint: keyMonth + (lang === 'en' ? '' : t('monthUnit2', lang)),
              gradient: 'linear-gradient(135deg, rgba(125,211,252,0.12), rgba(56,189,248,0.06))',
              border: 'rgba(125,211,252,0.25)'
            }
          ];

          const yearlySpoilers = [
            {
              icon: '📅',
              visible: t('spoilerThisMonth', lang).replace('M', String(monthNow)),
              blurred: t('spoilerThisMonthBlur', lang),
              hint: '████',
              gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.06))',
              border: 'rgba(245,158,11,0.25)'
            },
            {
              icon: '⚠️',
              visible: t('spoilerCaution', lang),
              blurred: t('spoilerCautionBlur', lang),
              hint: keyMonth + (lang === 'en' ? '' : t('monthUnit2', lang)),
              gradient: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))',
              border: 'rgba(239,68,68,0.25)'
            },
            {
              icon: '🍀',
              visible: t('spoilerOpportunity', lang) + keyQuarter + t('spoilerOpportunityIn', lang),
              blurred: t('spoilerOpportunityBlur', lang),
              hint: '███',
              gradient: 'linear-gradient(135deg, rgba(110,231,183,0.12), rgba(52,211,153,0.06))',
              border: 'rgba(110,231,183,0.25)'
            }
          ];

          const spoilers = isYearly ? yearlySpoilers : sajuSpoilers;

          return spoilers.map((sp, i) => (
            <div key={i} className="card" style={{
              background: sp.gradient,
              border: '1px solid ' + sp.border,
              padding: '18px 16px',
              marginBottom: '10px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '22px', flexShrink: 0, marginTop: '2px' }}>{sp.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.6, marginBottom: '6px' }}>
                    {sp.visible}
                    <span style={{
                      display: 'inline-block',
                      padding: '1px 8px',
                      borderRadius: '6px',
                      background: 'rgba(246,196,67,0.2)',
                      color: '#F6C443',
                      fontWeight: 800,
                      fontSize: '13px'
                    }}>
                      {sp.hint}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--text)',
                    lineHeight: 1.5,
                    opacity: 0.6
                  }}>
                    {sp.blurred}
                  </div>
                </div>
              </div>
            </div>
          ));
        })()}

        {/* Section C: Locked Section List */}
        <div className="section-divider">{isYearly ? t('yearlyItems', lang) : t('allItems', lang)}</div>
        <div className="card" style={{ padding: '16px' }}>
          {isGenerating && (
            <div style={{ textAlign: 'center', padding: '8px 0 16px', fontSize: '13px', color: '#F6C443', fontWeight: 700 }}>
              {t('analysisInProgressN', lang)} ({generatingProgress + 1}/3)
            </div>
          )}
          {!isGenerating && aiText && (
            <div style={{ textAlign: 'center', padding: '8px 0 16px', fontSize: '13px', color: '#2ED573', fontWeight: 700 }}>
              {t('analysisComplete', lang)}
            </div>
          )}
          <div style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
            {sectionTitles.map((title, i) => (
              <div key={i} className="locked-item">
                <span className="lock-icon">🔒</span>
                <span className="item-title">{icons[i]} {i + 1}. {title}</span>
                <span className="item-hint">{sectionHints[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section E: Star-based Unlock CTA */}
        <div className="card" style={{
          background: 'linear-gradient(180deg, rgba(243,160,146,0.10), rgba(243,160,146,0.04))',
          border: '1px solid var(--orot-coral-faint)',
          borderRadius: 'var(--orot-r-lg)',
          textAlign: 'center',
          padding: '32px 24px'
        }}>
          <div style={{ fontSize: 13, color: 'var(--orot-ink-mute)', marginBottom: 12, fontFamily: 'var(--orot-font)' }}>
            <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{lang === 'en' ? 'In-person reading ₩50,000+' : '전문가 대면 상담 ₩50,000+'}</span>
            {' → '}{lang === 'en' ? 'AI Saju reading' : 'AI 사주 해석'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--orot-ink)', lineHeight: 1.7, marginBottom: 20, fontFamily: 'var(--orot-font)' }}>
            {isYearly
              ? t('paywallMsgYearly', lang)
              : t('paywallMsgSaju', lang)}
          </div>

          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 31, fontWeight: 700, color: 'var(--orot-coral)', fontFamily: 'var(--orot-font)' }}>⭐ 10 {lang === 'en' ? 'Stars' : '별빛'}</span>
            <div style={{ fontSize: 13, color: 'var(--orot-ink-mute)', marginTop: 6, fontFamily: 'var(--orot-font)' }}>
              {lang === 'en' ? 'Your balance: ' : '보유 별빛: '}⭐ {starBalance}{lang === 'en' ? '' : '개'}
            </div>
            {isYearly && (
              <div style={{ fontSize: 13, color: 'var(--orot-coral-deep)', marginTop: 4, fontWeight: 600, fontFamily: 'var(--orot-font)' }}>
                {t('currentMonthNoteLabel', lang)}
              </div>
            )}
          </div>

          {starBalance >= 10 ? (
            <button
              className="paywall-cta"
              style={{ display: 'block', width: '100%', textAlign: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '16px' }}
              onClick={() => {
                updateStarBalance(starBalance - 10);
                setTeaserUnlocked(true);
                setCurrentScreen(isYearly ? 7 : 4);
              }}
            >
              {lang === 'en'
                ? (isYearly ? 'Unlock with 10 Stars ⭐' : 'Unlock with 10 Stars ⭐')
                : (isYearly ? '별빛 10개로 열기 ⭐' : '별빛 10개로 열기 ⭐')}
            </button>
          ) : (
            <button
              className="paywall-cta"
              style={{ display: 'block', width: '100%', textAlign: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '16px', background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
              onClick={() => setCurrentScreen(9)}
            >
              {lang === 'en' ? 'Not enough stars! Go charge ⭐' : '별빛이 부족해요! 충전하러 가기 ⭐'}
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '8px', padding: '12px 16px', color: 'var(--orot-ink-mute)', background: 'rgba(243, 231, 207, 0.04)', border: '1px solid var(--orot-hair)', borderRadius: 12, lineHeight: 1.6 }}>
          {t('disclaimer', lang)}
        </p>
      </div>
    );
  }

  /* ===== SCREEN 9: Star Charging ===== */
  function renderChargeScreen() {
    const isEn = lang === 'en';
    const packages = [
      { stars: 10, price: 990,  readings: 1, unit: 990, badge: null as null | 'popular' | 'best', highlight: false },
      { stars: 20, price: 1900, readings: 2, unit: 950, badge: 'popular' as null | 'popular' | 'best', highlight: true },
      { stars: 30, price: 2700, readings: 3, unit: 900, badge: 'best' as null | 'popular' | 'best', highlight: false },
    ];
    return (
      <div className="inner screen-enter orot-root orot-results-screen" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        <button
          onClick={() => setCurrentScreen(0)}
          aria-label={t('backBtn', lang)}
          style={{
            background: 'transparent', border: 0, color: 'var(--orot-ink)',
            fontSize: 15, cursor: 'pointer', padding: '6px 4px', marginBottom: 12,
            fontFamily: 'var(--orot-font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span> {t('backBtn', lang)}
        </button>

        {/* Hero — sv4 night sky (결제 흐름 전체 톤 통일) */}
        <section className="sv4-hero sv4-reveal" style={{ marginBottom: 16 }}>
          <div className="sv4-hero-glow" aria-hidden />
          <div className="sv4-hero-inner">
            <div className="sv4-hero-eyebrow"><span aria-hidden>✦</span><span>{isEn ? 'Star shop' : '별빛 충전소'}</span></div>
            <h1 className="sv4-hero-title">{isEn ? 'Light up your reading' : '별빛으로 사주를 열어요'}</h1>
            <p className="sv4-hero-desc" style={{ marginBottom: 16 }}>
              <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{isEn ? 'In-person ₩50,000+' : '전문가 대면 상담 ₩50,000+'}</span>
              {'  →  '}{isEn ? 'from ₩990' : '₩990부터'}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderRadius: 999, background: 'rgba(243,160,146,0.14)', border: '1px solid var(--orot-coral-faint)' }}>
              <span style={{ fontSize: 13, color: 'var(--orot-ink-soft)', fontFamily: 'var(--orot-font)' }}>{isEn ? 'My stars' : '보유 별빛'}</span>
              <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--orot-coral)', fontFamily: 'var(--orot-font)', lineHeight: 1 }}>⭐ {starBalance}{isEn ? '' : '개'}</span>
            </div>
          </div>
        </section>

        {/* 별빛으로 할 수 있는 것 — 가치 한눈에 */}
        <div className="orot-card" style={{ padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--orot-coral)', marginBottom: 10, fontFamily: 'var(--orot-font)' }}>
            {isEn ? 'What stars unlock' : '별빛으로 열 수 있어요'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { icon: '🔮', label: isEn ? 'Personal saju' : '개인사주', cost: '⭐10' },
              { icon: '📅', label: isEn ? '2026 fortune' : '올해운세', cost: '⭐10' },
              { icon: '💕', label: isEn ? 'Compatibility' : '궁합', cost: '⭐5' },
              { icon: '🤰', label: isEn ? 'Pregnancy' : '태교', cost: isEn ? 'Free' : '무료' },
            ].map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--orot-hair)', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>{v.icon}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--orot-ink)', fontFamily: 'var(--orot-font)', wordBreak: 'keep-all' }}>{v.label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: v.cost === '무료' || v.cost === 'Free' ? '#7fc6a0' : 'var(--orot-coral)', fontFamily: 'var(--orot-font)', flexShrink: 0 }}>{v.cost}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section-divider">{isEn ? 'Choose a pack' : '충전 패키지'}</div>

        {/* Charge packages */}
        {packages.map((pkg, i) => {
          const discount = Math.round((1 - pkg.unit / 990) * 100);
          return (
          <div
            key={i}
            className="orot-card"
            style={{
              padding: '18px 18px',
              marginBottom: 12,
              position: 'relative',
              border: pkg.highlight ? '1.5px solid var(--orot-coral)' : '1px solid var(--orot-hair)',
              background: pkg.highlight
                ? 'linear-gradient(180deg, rgba(243,160,146,0.12), rgba(243,160,146,0.04))'
                : undefined,
              boxShadow: pkg.highlight ? '0 6px 24px rgba(243,160,146,0.14)' : undefined,
            }}
          >
            {pkg.badge && (
              <div style={{
                position: 'absolute', top: -10, right: 16,
                background: pkg.badge === 'popular' ? 'var(--orot-coral)' : 'var(--orot-ink-soft)',
                color: '#fff', fontSize: 10, fontWeight: 800,
                padding: '3px 12px', borderRadius: 999, letterSpacing: '0.04em', fontFamily: 'var(--orot-font)',
              }}>
                {pkg.badge === 'popular' ? (isEn ? '★ POPULAR' : '★ 인기') : (isEn ? 'BEST VALUE' : '✦ 최대 혜택')}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orot-ink)', fontFamily: 'var(--orot-font)' }}>
                  ⭐ {pkg.stars}{isEn ? ' Stars' : '개'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', marginTop: 5, fontFamily: 'var(--orot-font)', wordBreak: 'keep-all' }}>
                  {isEn ? `Unlock ${pkg.readings} reading${pkg.readings > 1 ? 's' : ''}` : `전체 해석 ${pkg.readings}회`}
                  {isEn ? ` · or ${pkg.stars / 5} compat` : ` · 또는 궁합 ${pkg.stars / 5}회`}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orot-coral)', fontFamily: 'var(--orot-font)' }}>₩{pkg.price.toLocaleString()}</div>
                <div style={{ fontSize: 11.5, color: 'var(--orot-ink-mute)', marginTop: 3, fontFamily: 'var(--orot-font)' }}>
                  {isEn ? `₩${pkg.unit}/reading` : `1회당 ₩${pkg.unit}`}{discount > 0 ? ` · ${discount}%${isEn ? ' off' : ' 할인'}` : ''}
                </div>
              </div>
            </div>
            <a
              href="/payment"
              className={pkg.highlight ? 'orot-btn orot-btn--primary orot-btn--full' : 'orot-btn orot-btn--ghost orot-btn--full'}
              style={{ textDecoration: 'none', fontSize: 15 }}
            >
              {isEn ? 'Charge now' : '충전하기'} ›
            </a>
          </div>
          );
        })}

        {/* Trust / info */}
        <div className="orot-card" style={{ padding: '15px 18px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--orot-ink-soft)', fontFamily: 'var(--orot-font)', lineHeight: 1.6 }}>
            <span style={{ flexShrink: 0 }}>🔒</span>
            <span>{isEn ? 'Secure payment by Toss · prices include VAT' : '토스로 안전하게 결제 · 모든 금액 부가세(VAT) 포함'}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 11, fontSize: 12, fontFamily: 'var(--orot-font)' }}>
            <a href="/refund" style={{ color: 'var(--orot-ink-mute)' }}>{isEn ? 'Refund policy' : '환불 안내'}</a>
            <a href="/terms" style={{ color: 'var(--orot-ink-mute)' }}>{isEn ? 'Terms' : '이용약관'}</a>
            <a href="/privacy" style={{ color: 'var(--orot-ink-mute)' }}>{isEn ? 'Privacy' : '개인정보'}</a>
          </div>
        </div>

        {/* Free charge button for testing */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={() => {
              const pw = prompt(isEn ? 'Enter code:' : '코드를 입력해주세요:');
              if (!pw || pw !== '5386') return;
              updateStarBalance(starBalance + 10);
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--orot-hair-strong)',
              borderRadius: 999,
              padding: '10px 18px',
              fontSize: 12,
              color: 'var(--orot-ink-mute)',
              cursor: 'pointer',
              fontFamily: 'var(--orot-font)',
              transition: 'opacity 160ms ease',
            }}
          >
            {isEn ? '🎁 Add 10 Free Stars (Testing)' : '🎁 무료 별빛 10개 충전 (테스트용)'}
          </button>
        </div>
      </div>
    );
  }

  /* ===== RENDER ===== */
  return (
    <>
      <StarsBackground />
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentScreen(9)}
          aria-label={lang === 'ko' ? '별빛 충전소' : 'Star Shop'}
          style={{
            background: 'rgba(16, 20, 44, 0.55)',
            border: '1px solid var(--orot-coral-faint)',
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--orot-coral)',
            fontFamily: 'var(--orot-font)',
            cursor: 'pointer', minHeight: 36,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            animation: starBalance === 0 ? 'pulse 2s ease-in-out infinite' : 'none'
          }}
        >
          <span style={{ fontSize: 14 }}>⭐</span>
          <span>{starBalance}</span>
          <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2, color: 'var(--orot-ink-mute)' }}>{lang === 'en' ? 'CHARGE' : '충전'}</span>
        </button>
        <button
          onClick={() => { const next = lang === 'ko' ? 'en' : 'ko'; setLang(next); try { localStorage.setItem('saju-lang', next); } catch {} }}
          aria-label={lang === 'ko' ? 'Switch to English' : '한국어로 전환'}
          style={{
            background: 'rgba(16, 20, 44, 0.55)',
            border: '1px solid var(--orot-hair-strong)',
            borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 600,
            color: 'var(--orot-ink-soft)', cursor: 'pointer', minHeight: 36,
            fontFamily: 'var(--orot-font)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {t('langToggle', lang)}
        </button>
      </div>
      <div className="app-container">
        {currentScreen === 0 && renderIntro()}
        {currentScreen === 1 && renderBirthInput()}
        {currentScreen === 2 && renderQuestions()}
        {currentScreen === 3 && renderLoading()}
        {currentScreen === 4 && renderResults()}
        {currentScreen === 5 && renderCompat()}
        {currentScreen === 6 && renderPregnancy()}
        {currentScreen === 7 && renderYearlyFortune()}
        {currentScreen === 8 && renderTeaser()}
        {currentScreen === 9 && renderChargeScreen()}
        {/* 사업자 정보 푸터 */}
        <Footer lang={lang} />
      </div>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', left: '50%', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
            transform: 'translateX(-50%)', zIndex: 200, maxWidth: 'min(92vw, 420px)',
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '13px 18px', borderRadius: 14,
            background: 'rgba(16,20,44,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid ' + (toast.kind === 'error' ? 'rgba(239,68,68,0.5)' : 'var(--orot-coral-faint)'),
            boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
            color: 'var(--orot-ink)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--orot-font)',
            lineHeight: 1.5, whiteSpace: 'pre-line',
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{toast.kind === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
      {hasMounted && !storageConsent && (
        <ConsentModal
          lang={lang}
          onAccept={() => {
            try { localStorage.setItem('saju-storage-consent', 'yes'); } catch { /* private browsing or storage full */ }
            setStorageConsent(true);
          }}
          onDecline={() => setStorageConsent(true)}
        />
      )}
    </>
  );
}
