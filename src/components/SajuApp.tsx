'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  calcSaju, getOhCount, CG, JJ, CG_HANJA, JJ_HANJA,
  OH_CG, OH_JJ, OH_EN, OH_ICON, PROFILES,
  getSipsung, calcShinsal, get12Unsung,
  SajuResult
} from '@/lib/saju-calc';
import { buildSajuPrompts } from '@/lib/saju-prompt-builder';
import type { UserData } from '@/lib/saju-prompt';
import { getRelevantRefs } from '@/lib/saju-ref-selector';
import { lunarToSolar } from '@/lib/lunar-solar';
import { t, Lang } from '@/lib/i18n';
import { saveReadingToSession, loadReadingFromSession, clearReadingFromSession } from '@/lib/reading-storage';
import { generateOrderId } from '@/lib/payment-config';
import { formatLLMText } from '@/lib/format-llm';
import Footer from '@/components/ui/Footer';
import { SectionExplainer, getShinsalExplanation, getSingangExplanation, getOhInterpretation, UNSUNG_EXPLAIN } from '@/components/ui/TermExplainer';
import ConsentModal from '@/components/ui/ConsentModal';
import OhaengChart from '@/components/ui/OhaengChart';
import PillarDisplay, { type Pillar } from '@/components/ui/PillarDisplay';

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
  concern: number;
  state: number;
  personality: number[];
  relationship: number;
  wantToKnow: number;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/* ===== Main Component ===== */
export default function SajuApp() {
  const [lang, setLang] = useState<Lang>('ko');
  const [currentScreen, setCurrentScreen] = useState(0);

  /* PWA service worker registration */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
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
  const [isLoading, setIsLoading] = useState(false);
  const [readingSaveStatus, setReadingSaveStatus] = useState<'saving' | 'saved' | 'failed' | null>(null);
  const [pendingPersist, setPendingPersist] = useState<{ readingCode: string; orderId: string; body: object } | null>(null);
  const [questionStep, setQuestionStep] = useState(0);
  const [teaserUnlocked, setTeaserUnlocked] = useState(false);
  const [compatUnlocked, setCompatUnlocked] = useState(false);
  const [isLunar, setIsLunar] = useState(false);

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


  /* Compat state */
  const [compatPerson1, setCompatPerson1] = useState({ name: '', year: 1995, month: 1, day: 1, hour: -1, isLunar: false });
  const [compatPerson2, setCompatPerson2] = useState({ name: '', year: 1995, month: 1, day: 1, hour: -1, isLunar: false });
  const [compatExact1, setCompatExact1] = useState({ use: false, hour: -1, min: 0 });
  const [compatExact2, setCompatExact2] = useState({ use: false, hour: -1, min: 0 });

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

  /* Loading screen state */
  const [loadingStep, setLoadingStep] = useState(0);
  useEffect(() => {
    if (currentScreen !== 3) return;
    setLoadingStep(0);
    const t1 = setTimeout(() => setLoadingStep(1), 1500);
    const t2 = setTimeout(() => setLoadingStep(2), 3000);
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

  // Reset compat results when inputs change (requires re-payment)
  function resetCompatResult() {
    if (compatResult || compatAiText) {
      setCompatResult(null);
      setCompatAiText('');
      setCompatPaywall(false);
    }
  }
  // Auto-reset when person info or relationship type changes (useEffect to avoid render-time setState)
  const compatKey = [compatPerson1.name, compatPerson1.year, compatPerson1.month, compatPerson1.day, compatPerson1.hour, compatPerson1.isLunar,
    compatPerson2.name, compatPerson2.year, compatPerson2.month, compatPerson2.day, compatPerson2.hour, compatPerson2.isLunar, compatRelType].join('|');
  useEffect(() => {
    resetCompatResult();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compatKey]);
  const [pregResult, setPregResult] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  function safeSetItem(key: string, value: string) {
    if (storageConsent) localStorage.setItem(key, value);
  }

  const [isCapturing, setIsCapturing] = useState(false);

  async function captureElement() {
    const el = (document.querySelector('.inner.screen-enter') || document.querySelector('.app-container')) as HTMLElement;
    if (!el) return null;
    const fixedEls = document.querySelectorAll('.back-btn, [style*="position:fixed"], [style*="position: fixed"]');
    const origDisplay: string[] = [];
    fixedEls.forEach((fe, i) => { origDisplay[i] = (fe as HTMLElement).style.display; (fe as HTMLElement).style.display = 'none'; });
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, {
      backgroundColor: '#0A0E2A', scale: 1.5, useCORS: true, logging: false,
      scrollY: -window.scrollY, windowHeight: el.scrollHeight, height: el.scrollHeight,
    });
    fixedEls.forEach((fe, i) => { (fe as HTMLElement).style.display = origDisplay[i]; });
    return canvas;
  }

  async function shareResult(_text: string, title: string) {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const canvas = await captureElement();
      if (!canvas) { setIsCapturing(false); return; }
      canvas.toBlob(async (blob) => {
        if (!blob) { setIsCapturing(false); return; }
        const file = new File([blob], 'saju-result.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ title, files: [file] }); setIsCapturing(false); return; } catch {}
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'saju-result.png'; a.click();
        URL.revokeObjectURL(url);
        alert(lang === 'en' ? 'Image saved!' : '이미지가 저장되었어!');
        setIsCapturing(false);
      }, 'image/png');
    } catch {
      alert(lang === 'en' ? 'Failed to capture image' : '이미지 캡처에 실패했어');
      setIsCapturing(false);
    }
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
    let fullText = '';
    const decoder = new TextDecoder();

    try {
      for (let pi = 0; pi < prompts.length; pi++) {
        if (signal?.aborted) return;
        setGeneratingProgress(pi);
        setLoadingProgress(t('genAnalyzing', lang) + ' (' + (pi + 1) + t('genOf', lang) + prompts.length + ')');
        const res = await fetch('/api/saju', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompts[pi], lang }),
          signal,
        });
        if (!res.ok) throw new Error('API error: ' + res.status);
        if (!res.body) throw new Error('No response body');
        const reader = res.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }
      }
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

    const prompt = (lang === 'en' ? '🚨 CRITICAL LANGUAGE INSTRUCTION 🚨\nYou MUST write EVERYTHING in English. EVERY sentence, EVERY section title, EVERY explanation — ALL in English.\nDo NOT write Korean sentences. Translate Korean section titles to English.\nExample: Write ##1.What does 2026 mean for my life?## NOT ##1.2026 병오년, 내 인생에서 어떤 해인가?##\nSaju terms like Gap(甲) can appear with English meaning, but ALL text must be English.\nUse warm, casual, friendly tone. IF YOU WRITE IN KOREAN, THE RESPONSE WILL BE REJECTED.\n\n' : '') +
      '너는 적천수(滴天髓)와 자평진전(子平眞詮)을 달달 외우고, 궁통보감(窮通寶鑑)으로 조후를 잡는 40년 경력의 명리학 대가야. 반말만 써. 존댓말 금지.\n' +
      '고전 인용 필수: 각 섹션마다 적천수/자평진전/궁통보감 중 1-2회 인용. "적천수에 이르길 \'...\'라 했는데, 너한테 적용하면~" 형식으로.\n' +
      '"너 혹시 이런 경험 있지?" "이런 적 없어?" 같은 찔림 질문을 섹션마다 넣어.\n' +
      '"결론적으로" "정리하면" 패턴 절대 금지!\n\n' +
      '【분석 대상 - 전체 사주 원국】\n' +
      '이름: ' + (userData.name || '익명') + ' / 성별: ' + (userData.gender === 'm' ? '남' : '여') + ' / 나이: 만 ' + (2026 - userData.year) + '세\n' +
      '⚠️ 나이 맞춤 해석: ' +
      ((2026 - userData.year) <= 19 ? '10대이므로 학업/시험/진로/교우관계에 비중을 크게 두고, 결혼/부동산/투자는 "먼 미래에~" 정도로만.' :
       (2026 - userData.year) <= 29 ? '20대이므로 취업/커리어/연애/자기계발에 비중을 두고, 결혼은 가능성으로, 자녀/노후는 가볍게만.' :
       (2026 - userData.year) <= 39 ? '30대이므로 커리어 성장/결혼생활/재테크/내집마련/자녀계획에 맞는 현실적 조언을.' :
       (2026 - userData.year) <= 49 ? '40대이므로 커리어 전성기/자녀교육/건강관리/재산관리에 비중을 둬.' :
       (2026 - userData.year) <= 59 ? '50대이므로 인생 2막/건강/은퇴준비/자녀독립에 초점.' :
       '60대 이상이므로 건강/노후생활/가족관계/취미에 초점. 취업/수능 등 젊은 시절 이야기는 안 해.') +
      ' 나이와 동떨어진 조언은 절대 금지!\n\n' +
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
      '각 섹션은 고유한 역할이 있어. 이전 섹션에서 이미 말한 내용을 다른 섹션에서 반복하지 마!\n' +
      '- 섹션1(올해 큰 그림)에서 한 분석을 섹션3(총평)에서 다시 하지 마\n' +
      '- 섹션2(월별 운세)에서 말한 개운법/조심할 점을 섹션5(TO-DO)/섹션6(조심할 것)에서 똑같이 반복하지 마\n' +
      '- 섹션2(월별 운세)에서 언급한 색상/방향/아이템을 섹션7(행운 아이템)에서 그대로 반복하지 마\n' +
      '같은 사주 근거를 다뤄도 반드시 다른 각도/다른 깊이로 써야 해. 문장을 베껴쓰듯 반복하면 절대 안 돼!\n\n' +

      '##1.2026 병오년, 내 인생에서 어떤 해인가?##\n' +
      '병오년(丙午)이 이 사주의 큰 흐름에서 어떤 의미를 가지는지 깊이 있게 분석해줘:\n' +
      '- 현재 대운(大運): 지금 몇 번째 대운을 지나고 있는지, 대운 천간지지가 뭔지, 이 대운이 내 원국에 어떤 영향을 주는지. 대운 전환이 가까우면 그것도 알려줘.\n' +
      '- 병오 세운과 원국의 관계: 병오(丙午)의 화(火) 기운이 내 일간/용신/기신과 어떤 관계인지. 용신이 활성화되는 해인지 기신이 강해지는 해인지. 세운 천간(丙)과 지지(午) 각각이 원국의 어떤 글자와 합/충/형/파를 이루는지 구체적으로 밝혀.\n' +
      '- 삼재(三災) 여부: 내 년지 기준으로 올해가 삼재에 해당하는지 (들삼재/눌삼재/날삼재). 해당하면 어떻게 대비하면 좋은지 구체적으로. 해당 안 하면 "올해는 삼재에서 벗어난 해"라고 알려줘.\n' +
      '- 12운성 관점: 병오년이 내 일간에게 12운성으로 어떤 에너지 상태인지 (장생? 건록? 쇠?)\n' +
      '- 올해 가장 강하게 작용하는 십성: 병오년의 천간/지지가 내 일간 기준으로 어떤 십성인지, 그 십성이 올 한 해 어떤 테마를 만드는지 (예: 편재운이면 사업/투자의 해, 정관운이면 승진/안정의 해)\n' +
      '- 올해 오행 밸런스 변화: 원국의 오행 분포에 병오(화화)가 더해지면 어떤 오행이 과다/부족해지는지, 그 불균형이 삶에 어떤 영향을 미치는지\n' +
      '- 한 줄 정리: "2026년은 너에게 OOO한 해야!" 같은 핵심 메시지\n' +
      '최소 15줄. 비유를 넣어서 읽기 쉽게!\n' +
      '[이 섹션의 역할: 올해의 사주적 의미와 대운/세운 큰 그림. 월별 상세나 총평 키워드는 여기서 쓰지 마.]\n\n' +

      '현재 ' + currentMonth + '월이야. ' + (currentMonth > 1 ? currentMonth + '월 이전의 달(1~' + (currentMonth - 1) + '월)은 이미 지나갔으니 쓰지 마. ' : '') + currentMonth + '월부터 12월까지만 써줘.\n' +
      '##2.2026 월별 상세 운세##\n' +
      '!!! 형식 규칙: 절대로 💰재물: / 💕연애: / 💼직장: / 🏥건강: 카테고리로 나누지 마! 이모티콘+카테고리+콜론 형식 금지!\n' +
      '반드시 하나의 자연스러운 이야기 문단으로 써. 돈/사람/일/건강을 자연스럽게 엮어서.\n' +
      '사주 용어는 괄호로 쉽게 풀어서: 묘목(봄 새싹 에너지), 목생화(나무가 불을 키워줌), 충(부딪히는 변화 기운)\n' +
      currentMonth + '월~12월 각 월별로 다음을 포함해서 이야기체로:\n' +
      '- 그 달의 월운 천간지지와 내 일간의 관계 (상생/상극/합/충/형) 분석을 명리학적 근거와 함께\n' +
      '- 그 달의 십성 작용과 예상 사건 (어떤 십성이 작동해서 어떤 일이 생기는지 구체적으로)\n' +
      '- 그 달의 12운성 에너지 상태\n' +
      '- 월운이 세운(병오)과 겹쳐서 만드는 복합 작용 분석 (예: 이번 달 월운+세운이 합쳐져서 화 기운이 극대화된다 등)\n' +
      '- 재물/연애/직장/건강 흐름을 하나의 이야기로 자연스럽게 엮어서\n' +
      '- 그 달에 특히 좋은 날짜대/시기가 있다면 언급 (상순/중순/하순 구분)\n' +
      '각 월 최소 6줄 이상 풍성하게! 비유를 반드시 넣어서 읽는 재미를 줘.\n' +
      '⚠️ 말투 금지: "X월은 ~~달이야!" "X월은 ~~하는 달이야!" 식의 한줄 정리/마무리 문장을 쓰지 마. 그냥 자연스러운 이야기 흐름으로 마무리해.\n' +
      '[이 섹션의 역할: 월별 운세 흐름과 사건 예측에만 집중. 개운법/TO-DO/조심할 것/행운 아이템은 뒤 섹션에서 다루니까 여기서는 쓰지 마!]\n\n' +

      '##3.2026년 총평##\n' +
      '[중복 금지: 섹션1에서 이미 분석한 대운/세운/삼재/12운성 내용을 반복하지 마!]\n' +
      '섹션1과 다른 각도로 분석:\n' +
      '- 올해를 한 단어로 표현하면?\n' +
      '- 상반기(1~6월) vs 하반기(7~12월) 에너지 흐름 차이: 구체적으로 몇 월 기준으로 흐름이 바뀌는지, 왜 바뀌는지 명리학적 근거와 함께\n' +
      '- 올해가 인생 전체에서 어떤 위치인지 (씨앗 뿌리는 해? 수확하는 해? 충전하는 해? 도약 준비의 해?)\n' +
      '- 올해 가장 빛나는 시기 vs 숨 고르기 시기\n' +
      '- 2025년과 비교했을 때 달라지는 점, 2027년으로 이어지는 흐름\n' +
      '- 올해 반드시 기억할 한마디\n' +
      '최소 8줄. 비유를 넣어서!\n\n' +

      '##4.올해의 핵심 미션##\n' +
      '[중복 금지: 섹션1의 큰 그림이나 섹션3의 총평과 겹치지 마!]\n' +
      '올해 사주가 너에게 주는 구체적인 성장 과제와 미션:\n' +
      '- 올해 세운의 십성이 요구하는 핵심 과제 (예: 식상운이면 표현/창작에 도전, 관성운이면 체계/규율 세우기)\n' +
      '- 용신 강화 관점에서 올해 집중할 영역 (커리어/관계/건강/자기계발/재테크 중 구체적으로)\n' +
      '- "올해는 반드시 OO을 해야 하는 해" 같은 구체적 행동 지침 3가지\n' +
      '- 올해 버려야 할 습관/태도 1가지 (기신과 연결해서)\n' +
      '추상적 격려가 아니라 실행 가능한 미션으로! 최소 8줄.\n\n' +

      '##5.올해 월별 TO-DO##\n' +
      '[중복 금지: 섹션2의 월별 운세에서 이미 말한 내용을 그대로 옮기지 마! 섹션2가 "어떤 일이 생길지"라면, 여기는 "그래서 뭘 해야 하는지" 행동 중심으로!]\n' +
      currentMonth + '~12월 각각 그 달에 꼭 실천할 구체적 행동을 1-2줄로. 반말로! "~해봐/~하는 게 좋아/~해!" 톤으로.\n\n' +

      '##6.올해 꼭 조심할 3가지##\n' +
      '[중복 금지: 섹션2 월별 운세에서 언급한 주의사항을 그대로 반복하지 마! 여기서는 올해 전체를 관통하는 큰 주의사항 3가지를 깊이 있게 다뤄.]\n' +
      '각 항목 5줄 이상:\n' +
      '- 왜 조심해야 하는지 사주 근거(어떤 충/형/기신 때문인지)\n' +
      '- 언제(몇 월) 특히 조심해야 하는지\n' +
      '- 구체적으로 어떤 상황/행동을 피해야 하는지\n' +
      '- 대신 어떻게 하면 좋은지 개운법 포함\n\n' +

      '##7.올해 나의 행운 아이템##\n' +
      '[중복 금지: 앞 섹션에서 이미 언급한 색상/방향/행동을 여기서 똑같이 반복하지 마! 여기서만 다루는 새로운 구체적 아이템 위주로!]\n' +
      '이 사주의 오행 균형과 2026 병오년 기운을 고려해서:\n' +
      '- 🎨 행운의 색 2가지 (오행 근거)\n' +
      '- 🔢 행운의 숫자 2가지 (오행-숫자 대응 근거)\n' +
      '- 📍 행운의 방향 1가지 (오행-방위 근거)\n' +
      '- 💎 럭키 아이템 2가지 (일상에서 쓸 수 있는 것)\n' +
      '- ✨ 행운의 행동: 매일 하면 좋은 습관 2가지\n' +
      '- 🍀 행운의 요일 1가지\n' +
      '- 🌸 행운의 계절 1가지\n' +
      '각각 오행 근거를 괄호로 설명. 5줄 이상.\n\n' +

      '중요: 각 섹션 번호를 ##숫자.제목## 형식으로 반드시 써줘.\n' +
      '비유적 표현을 적극 사용해! 일상적인 것(음식/영화/게임/카페/날씨/SNS)에 빗대면 읽는 사람이 재밌어해.\n' +
      '각 섹션마다 고전 명리학 원문을 2-4회 인용해서 권위를 높여. 형식: "적천수에 이런 말이 있어: \"갑목이 하늘까지 뻗으려면 화의 도움이 필요하다(甲木參天, 脫胎要火).\" 네 사주가 딱 이 경우야." 인용 후 반드시 사용자 사주에 어떻게 적용되는지 연결해. 섹션 끝에 [근거: 출전명] 표시.\n' +
      '해석의 여지가 있을 때는 긍정적으로. 흥미 유발 포인트를 매 섹션 1개 이상 넣어.\n' +
      '개인사주 해설과 동등한 퀄리티로! 격국/용신/조후/통변/12운성을 적극 활용해. 피상적 해석 금지!\n\n' +
      (lang === 'en' ? '🚨 FINAL REMINDER — MOST IMPORTANT INSTRUCTION 🚨\nWrite EVERYTHING in English. EVERY section title must be in English.\nExample: ##1.What does 2026 mean for my life?## NOT ##1.2026 병오년, 내 인생에서 어떤 해인가?##\nExample: ##2.2026 Monthly Fortune## NOT ##2.2026 월별 상세 운세##\nALL text in English. Korean ONLY for Saju terms in parentheses.\nIF ANY KOREAN SENTENCE APPEARS, THE RESPONSE WILL BE REJECTED.\n\n' : '') +
      getRelevantRefs({ dayMaster: sj.dStem, topics: ['timing', 'health', 'wealth', 'general'] });

    try {
      setLoadingProgress(t('yearlyAnalyzingMsg', lang) + ' (1/1)');
      const res = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 4096, lang }),
        signal,
      });
      if (!res.ok) throw new Error('API error: ' + res.status);
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }
      // Detect stream error sentinel from server
      const STREAM_ERR = '[응답이 중단되었습니다. 다시 시도해 주세요.]';
      if (fullText.endsWith(STREAM_ERR)) {
        fullText = fullText.slice(0, -STREAM_ERR.length).trimEnd();
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
        fetchYearlyReading(sj, controller.signal);
      } else {
        setCurrentScreen(8); // Go to teaser/paywall first
        const ohCount = getOhCount(sj);
        const prompts = buildSajuPrompts(sj, ohCount, { ...userData, isLunar, lang, useExactTime, exactHour, exactMinute });
        fetchSajuReading(prompts, controller.signal);
      }
    }, 4500);
  }

  /* ===== SCREEN 0: Intro ===== */
  function renderIntro() {
    return (
      <div className="inner screen-enter" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div style={{ fontSize: '72px', animation: 'float 3s ease-in-out infinite', marginBottom: '16px', filter: 'drop-shadow(0 0 24px rgba(240,199,94,0.5))' }}>
          🔮
        </div>
        <h1 className="gradient-text" style={{ marginBottom: '8px' }}>{t('appTitle', lang)}</h1>
        <p className="intro-subtitle">{t('appSubtitle', lang)}</p>
        {savedResults.length > 0 && (
          <div style={{ width: '100%', maxWidth: '340px', margin: '0 auto 20px' }}>
            <button style={{
              width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(240,199,94,0.3)',
              background: 'linear-gradient(135deg, rgba(240,199,94,0.12), rgba(255,208,128,0.08))',
              color: '#F0C75E', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: 'inherit',               boxShadow: '0 2px 12px rgba(240,199,94,0.15)'
            }} onClick={() => setShowSavedResults(!showSavedResults)}>
              <span>📂</span> {t('prevResults', lang)} <span style={{ background: 'rgba(240,199,94,0.2)', borderRadius: '10px', padding: '2px 10px', fontSize: '13px', fontWeight: 800, color: '#FFD080' }}>{savedResults.length}</span>
            </button>
            {showSavedResults && (
              <div style={{ marginTop: '8px', maxHeight: '240px', overflowY: 'auto', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', padding: '8px', border: '1px solid rgba(240,199,94,0.1)' }}>
                {savedResults.map((r: { name: string; date: string; type: string; text: string }, i: number) => (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: '12px', marginBottom: '6px', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s' }} onClick={() => {
                    setAiText(r.text);
                    setCurrentScreen(r.type === '2026 운세' || r.type === '2026 Fortune' ? 7 : 4);
                    setShowSavedResults(false);
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{r.name} - {r.type}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{r.date}</span>
                    </div>
                  </div>
                ))}
                <button style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,100,100,0.2)', background: 'rgba(255,100,100,0.08)', color: '#FF8A8A', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '4px', fontFamily: 'inherit', minHeight: '44px' }} onClick={() => {
                  try { localStorage.removeItem('saju-saved-results'); } catch { /* private browsing */ }
                  setSavedResults([]);
                  setShowSavedResults(false);
                }}>{t('deleteAll', lang)}</button>
              </div>
            )}
          </div>
        )}
        <div className="feature-grid">
          <div
            className="feature-card"
            role="button"
            tabIndex={0}
            style={{ background: 'linear-gradient(135deg, #1E1060, #4C2889, #7C3AED)', boxShadow: '0 8px 30px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}
            onClick={() => { setAppMode('saju'); setCurrentScreen(1); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAppMode('saju'); setCurrentScreen(1); } }}
          >
            <span style={{ position: 'absolute', top: '8px', right: '10px', fontSize: '10px', opacity: 0.5 }}>✨</span>
            <span className="feature-icon">🔮</span>
            <span className="feature-title">{t('sajuTitle', lang)}</span>
            <span className="feature-desc">{t('sajuDesc', lang)}</span>
          </div>
          <div
            className="feature-card"
            role="button"
            tabIndex={0}
            style={{ background: 'linear-gradient(135deg, #7A1F40, #FF6B9D, #FF8A8A)', boxShadow: '0 8px 30px rgba(255,107,157,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}
            onClick={() => { setAppMode('compat'); setCurrentScreen(5); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAppMode('compat'); setCurrentScreen(5); } }}
          >
            <span style={{ position: 'absolute', top: '8px', right: '10px', fontSize: '10px', opacity: 0.5 }}>💫</span>
            <span className="feature-icon">💑</span>
            <span className="feature-title">{t('compatTitle', lang)}</span>
            <span className="feature-desc">{t('compatDesc', lang)}</span>
          </div>
          <div
            className="feature-card"
            role="button"
            tabIndex={0}
            style={{ background: 'linear-gradient(135deg, #7A5B1E, #F0C75E, #FFD080)', boxShadow: '0 8px 30px rgba(240,199,94,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}
            onClick={() => { setAppMode('yearly'); setCurrentScreen(1); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAppMode('yearly'); setCurrentScreen(1); } }}
          >
            <span style={{ position: 'absolute', top: '8px', right: '10px', fontSize: '10px', opacity: 0.5 }}>⭐</span>
            <span className="feature-icon">📅</span>
            <span className="feature-title">{t('yearlyTitle', lang)}</span>
            <span className="feature-desc">{t('yearlyDesc', lang)}</span>
          </div>
          <div
            className="feature-card"
            role="button"
            tabIndex={0}
            style={{ background: 'linear-gradient(135deg, #0A4A3A, #14B8A6, #6EE7B7)', boxShadow: '0 8px 30px rgba(20,184,166,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}
            onClick={() => { setAppMode('pregnancy'); setCurrentScreen(6); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAppMode('pregnancy'); setCurrentScreen(6); } }}
          >
            <span style={{ position: 'absolute', top: '8px', right: '10px', fontSize: '10px', opacity: 0.5 }}>🌿</span>
            <span className="feature-icon">🤰</span>
            <span className="feature-title">{t('pregTitle', lang)}</span>
            <span className="feature-desc">{t('pregDesc', lang)}</span>
          </div>
        </div>
        {/* 이전 결과 보기 - moved to top */}
      </div>
    );
  }

  /* ===== SCREEN 1: Birth Input ===== */
  function renderBirthInput() {
    return (
      <div className="inner screen-enter" style={{ paddingTop: '40px' }}>
        <button className="back-btn" onClick={() => setCurrentScreen(0)}>{t('backBtn', lang)}</button>
        <h2 className="gradient-text" style={{ textAlign: 'center', marginBottom: '24px' }}>{t('enterBirthday', lang)}</h2>
        {profiles.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textAlign: 'center' }}>{t('savedProfiles', lang)}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {profiles.map((p, i) => (
                <button key={i} style={{
                  padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                  background: 'rgba(159,122,234,0.12)', border: '1px solid rgba(159,122,234,0.3)',
                  color: 'var(--text)', cursor: 'pointer'
                }} onClick={() => {
                  setUserData({ name: p.name, gender: p.gender, year: p.year, month: p.month, day: p.day, hour: p.hour, concern: p.concern, state: p.state, personality: [...p.personality], relationship: p.relationship, wantToKnow: p.wantToKnow });
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
                        fetchSajuReading(buildSajuPrompts(sj, oh, { name: p.name, gender: p.gender, year: p.year, month: p.month, day: p.day, hour: p.hour, concern: p.concern, state: p.state, personality: p.personality, relationship: p.relationship, wantToKnow: p.wantToKnow, lang }));
                      }
                    }, 4500);
                  }
                }}>
                  {p.name} ({p.year}.{p.month}.{p.day})
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="card card-glow">
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
                  {Array.from({ length: 86 }, (_, i) => 2025 - i).map(y => (
                    <option key={y} value={y}>{y}{t('yearUnit', lang)}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <select value={userData.month} onChange={e => updateUser('month', parseInt(e.target.value))} aria-label={lang === 'en' ? 'Birth month' : '출생 월'} aria-required="true">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}{t('monthUnit', lang)}</option>
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
                  <div className="time-hanja">{lang === 'en' ? ti.hanja.replace('시', '') : ti.hanja}</div>
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
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button className="btn btn-primary btn-full" style={{ flex: 1 }} onClick={() => {
            if (!userData.name) updateUser('name', t('anonymous', lang));
            setCurrentScreen(2); setQuestionStep(0);
          }}>
            {t('next', lang)}
          </button>
        </div>
      </div>
    );
  }

  /* ===== SCREEN 2: Questions ===== */
  function renderQuestions() {
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
      <div className="inner screen-enter" style={{ paddingTop: '40px' }}>
        <button className="back-btn" onClick={() => setCurrentScreen((appMode === 'saju' || appMode === 'yearly') ? 1 : 0)}>{t('backBtn', lang)}</button>
        <div className="progress-dots">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={'dot' + (i < questionStep ? ' done' : '') + (i === questionStep ? ' active' : '')} />
          ))}
        </div>
        <div className="card card-glow" style={{ animation: 'fadeInUp 0.4s ease' }}>
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
              <h3>{t('q3Title', lang)}<br /><span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 400 }}>{t('q3Sub', lang)}</span></h3>
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
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          {questionStep > 0 && (
            <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: 'var(--text)' }} onClick={() => setQuestionStep(questionStep - 1)}>
              {t('prev', lang)}
            </button>
          )}
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
            if (questionStep < 3) setQuestionStep(questionStep + 1);
            else {
              /* 프로필 자동 저장 */
              const exists = profiles.find(pr => pr.name === userData.name && pr.year === userData.year && pr.month === userData.month && pr.day === userData.day);
              if (!exists && userData.name) {
                const newProfile: SavedProfile = {
                  name: userData.name, gender: userData.gender, year: userData.year, month: userData.month, day: userData.day, hour: userData.hour,
                  concern: userData.concern, state: userData.state, personality: [...userData.personality], relationship: userData.relationship, wantToKnow: userData.wantToKnow
                };
                const updated = [...profiles, newProfile].slice(-10);
                saveProfiles(updated);
              } else if (exists) {
                const updated = profiles.map(pr =>
                  (pr.name === userData.name && pr.year === userData.year && pr.month === userData.month && pr.day === userData.day)
                  ? { ...pr, concern: userData.concern, state: userData.state, personality: [...userData.personality], relationship: userData.relationship, wantToKnow: userData.wantToKnow, hour: userData.hour, gender: userData.gender }
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

  /* ===== SCREEN 3: Loading ===== */
  function renderLoading() {
    const steps = [t('loading1', lang), t('loading2', lang), t('loading3', lang)];
    return (
      <div className="inner screen-enter" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <button className="back-btn" onClick={() => { cancelLoading(); setIsLoading(false); setIsGenerating(false); setCurrentScreen(2); }}>{t('backBtn', lang)}</button>
        <div style={{ fontSize: '48px', animation: 'float 2s ease-in-out infinite', marginBottom: '32px' }}>🔮</div>
        {steps.map((step, i) => (
          <div key={i} className={'loading-step' + (i <= loadingStep ? (i < loadingStep ? ' done' : ' active') : '')}>
            <div className="spinner" />
            <div className="check">✓</div>
            <span>{step}</span>
          </div>
        ))}
      </div>
    );
  }

  /* ===== SCREEN 4: Results ===== */
  function renderResults() {
    if (!sajuResult) {
      // Saved result view — no saju calc data, just AI text
      if (aiText) {
        return (
          <div className="inner screen-enter">
            <button className="back-btn" onClick={() => { setCurrentScreen(0); setAiText(''); }}>{t('backBtn', lang)}</button>
            <div className="result-header">
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📂</div>
              <div className="name gradient-text">{lang === 'en' ? 'Saved Result' : '저장된 결과'}</div>
            </div>
            <div className="section-divider">{t('aiReading', lang)}</div>
            <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(aiText, lang) }} />
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

    const ohColors: Record<string, string> = {'목':'#22C55E','화':'#EF4444','토':'#EAB308','금':'#94A3B8','수':'#3B82F6'};

    return (
      <div className="inner screen-enter">
        <button className="back-btn" onClick={() => setCurrentScreen(0)}>{t('backBtn', lang)}</button>
        {/* Reading save status indicator */}
        {readingSaveStatus === 'saving' && (
          <div role="status" aria-live="polite" style={{ textAlign: 'center', fontSize: 13, color: 'rgba(245,240,232,0.5)', marginBottom: 8 }}>
            {t('savingStatus', lang)}
          </div>
        )}
        {readingSaveStatus === 'saved' && (
          <div role="status" aria-live="polite" style={{ textAlign: 'center', fontSize: 13, color: '#50C878', marginBottom: 8 }}>
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
        {/* Result Header */}
        <div className="result-header">
          <div className="name gradient-text">{userData.name || t('anonymous', lang)}{t('sajuAnalysisOf', lang)}</div>
          <div className="sub">{userData.year}{t('yearUnit', lang)} {userData.month}{t('monthUnit', lang)} {userData.day}{t('dayUnit', lang)} {t('born', lang)}</div>
        </div>

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
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: isGwiin ? 'rgba(240,199,94,0.15)' : isGil ? 'rgba(110,231,183,0.12)' : 'rgba(251,191,36,0.10)',
                    border: isGwiin ? '1px solid rgba(240,199,94,0.4)' : isGil ? '1px solid rgba(110,231,183,0.3)' : '1px solid rgba(251,191,36,0.25)',
                    color: isGwiin ? '#F0C75E' : isGil ? '#6EE7B7' : '#FBBF24'
                  }}>
                    {isGwiin ? '⭐ ' : ''}{shinsalDisplay[s] || s}
                  </span>
                );
              })}
            </div>
            {/* 개별 신살 설명 */}
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {shinsal.map((s, i) => {
                const explain = shinsalExplain[s];
                if (!explain) return null;
                const isGwiinItem = gwiin.includes(s);
                return (
                  <div key={i} style={{ fontSize: '12px', lineHeight: 1.5, color: 'rgba(245,240,232,0.65)', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                    <strong style={{ color: isGwiinItem ? '#F0C75E' : '#FBBF24' }}>{shinsalDisplay[s] || s}</strong>
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

        {/* Life Energy Curve */}
        <div className="section-divider">{t('lifeEnergyFlow', lang)}</div>
        <div className="card" style={{ padding: '16px' }}>
          <svg viewBox="0 0 320 165" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <linearGradient id="energyGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#F0C75E" />
                <stop offset="100%" stopColor="#F687B3" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0,2,4,6,8,10].map(v => {
              const gy = 110 - (v / 10) * 90;
              return <line key={v} x1="40" y1={gy} x2="300" y2={gy} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
            })}
            {/* Y-axis labels */}
            {[0,5,10].map(v => {
              const gy = 110 - (v / 10) * 90;
              return <text key={v} x="30" y={gy + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{v}</text>;
            })}
            {/* Line */}
            {(() => {
              const xs = [75, 140, 205, 270];
              const pts = energyPoints.map((p, i) => ({ x: xs[i], y: 110 - (p.value / 10) * 90 }));
              const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ');
              return (
                <>
                  <polyline points={pts.map(p => p.x + ',' + p.y).join(' ')} fill="none" stroke="url(#energyGrad)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  {pts.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill={i === 2 ? '#F0C75E' : '#F687B3'} stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
                      <text x={p.x} y={p.y - 10} fill="rgba(255,255,255,0.8)" fontSize="10" textAnchor="middle" fontWeight="700">
                        {energyPoints[i].value}
                      </text>
                    </g>
                  ))}
                  {energyPoints.map((ep, i) => (
                    <g key={'lbl'+i}>
                      <text x={xs[i]} y="125" fill="rgba(255,255,255,0.7)" fontSize="10" textAnchor="middle" fontWeight="600">
                        {ep.label.split('\n')[0]}
                      </text>
                      <text x={xs[i]} y="137" fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle">
                        {ep.label.split('\n')[1] || ''}
                      </text>
                      <text x={xs[i]} y="150" fill="#7DD3FC" fontSize="9" textAnchor="middle" fontWeight="600">
                        {[unsung['년지'], unsung['월지'], unsung['일지'], unsung['시지'] || '?'][i]}
                      </text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
          {/* Energy curve interpretation */}
          <div style={{ marginTop: '12px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text)' }}>
            {(() => {
              const dayE = energyMap[unsung['일지']] || 5;
              const dayStage = unsung['일지'] || '';
              // 쉬운 이름 + 비유 + 상세 설명
              const stageEasy: Record<string, { emoji: string; name: string; analogy: string; desc: string }> = {
                '장생': { emoji: '🌱', name: t('stage_jangsaeng_name', lang), analogy: t('stage_jangsaeng_analogy', lang), desc: t('stage_jangsaeng_desc', lang) },
                '목욕': { emoji: '🌊', name: t('stage_mokyok_name', lang), analogy: t('stage_mokyok_analogy', lang), desc: t('stage_mokyok_desc', lang) },
                '관대': { emoji: '🎓', name: t('stage_gwandae_name', lang), analogy: t('stage_gwandae_analogy', lang), desc: t('stage_gwandae_desc', lang) },
                '건록': { emoji: '💪', name: t('stage_geonrok_name', lang), analogy: t('stage_geonrok_analogy', lang), desc: t('stage_geonrok_desc', lang) },
                '제왕': { emoji: '👑', name: t('stage_jewang_name', lang), analogy: t('stage_jewang_analogy', lang), desc: t('stage_jewang_desc', lang) },
                '쇠': { emoji: '📚', name: t('stage_soe_name', lang), analogy: t('stage_soe_analogy', lang), desc: t('stage_soe_desc', lang) },
                '병': { emoji: '🧘', name: t('stage_byeong_name', lang), analogy: t('stage_byeong_analogy', lang), desc: t('stage_byeong_desc', lang) },
                '사': { emoji: '🔄', name: t('stage_sa_name', lang), analogy: t('stage_sa_analogy', lang), desc: t('stage_sa_desc', lang) },
                '묘': { emoji: '💎', name: t('stage_myo_name', lang), analogy: t('stage_myo_analogy', lang), desc: t('stage_myo_desc', lang) },
                '절': { emoji: '✨', name: t('stage_jeol_name', lang), analogy: t('stage_jeol_analogy', lang), desc: t('stage_jeol_desc', lang) },
                '태': { emoji: '🥚', name: t('stage_tae_name', lang), analogy: t('stage_tae_analogy', lang), desc: t('stage_tae_desc', lang) },
                '양': { emoji: '🍼', name: t('stage_yang_name', lang), analogy: t('stage_yang_analogy', lang), desc: t('stage_yang_desc', lang) }
              };
              const highPoint = energyPoints.reduce((max, p) => p.value > max.value ? p : max, energyPoints[0]);
              const lowPoint = energyPoints.reduce((min, p) => p.value < min.value ? p : min, energyPoints[0]);
              const dayInfo = stageEasy[dayStage] || { emoji: '🔮', name: dayStage, analogy: '', desc: '' };

              // 4주 해설
              const pillarNames = [t('pillarYearAncestor', lang), t('pillarMonthParent', lang), t('pillarDaySelf', lang), t('pillarHourChild', lang)];
              const pillarStages = [unsung['년지'], unsung['월지'], unsung['일지'], unsung['시지'] || '?'];

              return (
                <div style={{ background: 'rgba(240,199,94,0.05)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(240,199,94,0.1)' }}>
                  {/* 나의 핵심 에너지 */}
                  <div style={{ fontWeight: 700, color: '#F0C75E', marginBottom: '4px', fontSize: '15px' }}>
                    {dayInfo.emoji} {t('myEnergy', lang)} {dayInfo.name} ({dayE}/10)
                  </div>
                  <div style={{ fontSize: '12px', color: '#FFD080', marginBottom: '8px', fontStyle: 'italic' }}>
                    "{dayInfo.analogy}"
                  </div>
                  <div style={{ marginBottom: '12px', fontSize: '13px', lineHeight: '1.6' }}>{dayInfo.desc}</div>

                  {/* 에너지 최고/최저 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ background: 'rgba(110,231,183,0.08)', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#6EE7B7', fontWeight: 600 }}>{t('energyHighPoint', lang)}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{highPoint.label.replace('\n', ' ')}</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#6EE7B7' }}>{highPoint.value}/10</div>
                    </div>
                    <div style={{ background: 'rgba(248,113,113,0.08)', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#F87171', fontWeight: 600 }}>{t('energyLowPoint', lang)}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{lowPoint.label.replace('\n', ' ')}</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#F87171' }}>{lowPoint.value}/10</div>
                    </div>
                  </div>

                  {/* 4주별 해설 */}
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>{t('periodEnergyDesc', lang)}</div>
                  {pillarStages.map((stage, idx) => {
                    const info = stageEasy[stage];
                    if (!info) return (
                      <div key={idx} style={{ padding: '6px 0', fontSize: '12px', color: 'var(--text-dim)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {pillarNames[idx]}: {t('birthTimeNotEntered', lang)}
                      </div>
                    );
                    return (
                      <div key={idx} style={{ padding: '8px 0', borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: idx === 2 ? '#F0C75E' : 'var(--text)' }}>
                            {info.emoji} {pillarNames[idx]}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#7DD3FC' }}>
                            {info.name} ({energyMap[stage]}/10)
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                          {info.analogy} — {info.desc.split('.')[0]}.
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* 신강/신약 & 용신 Panel */}
        <div className="section-divider">{t('sajuConstitution', lang)}</div>
        <div className="card" style={{ padding: '16px' }}>
          {(() => {
            const ys = calcYongsin(sj);
            const { yongsin, gisin, isStrong, isExtremeSeason, season, johuYongsin, eokbuType, strengthPct, deukryung, tonggeunCount, bigyupCount } = ys;
            const ohSaeng: Record<string, string> = { '목':'수', '화':'목', '토':'화', '금':'토', '수':'금' };
            const heesin = ohSaeng[yongsin] || '';
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
                {/* 신강/신약 게이지 */}
                <div style={{ marginBottom: '16px' }}>
                  <SectionExplainer text={getSingangExplanation(isStrong, lang)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{t('singangSinyak', lang)}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: isStrong ? '#F0C75E' : '#7DD3FC' }}>
                      {isStrong ? t('singangFull', lang) : t('sinyakFull', lang)}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: strengthPct + '%',
                      height: '100%',
                      background: isStrong
                        ? 'linear-gradient(90deg, #F0C75E, #FF6B9D)'
                        : 'linear-gradient(90deg, #7DD3FC, #C4B5FD)',
                      borderRadius: '12px',
                      transition: 'width 1s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px'
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#0A0E2A' }}>{Math.round(strengthPct)}%</span>
                    </div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                      {t('weakStrong', lang)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    <span>{t('deukryungLabel', lang)}: {deukryung ? '✓' : '✗'} | {t('tonggeunLabel', lang)}: {tonggeunCount}{t('countUnit', lang)} | {t('bigyupLabel', lang)}: {bigyupCount}{t('countUnit', lang)}</span>
                  </div>
                  <p style={{ fontSize: '12px', marginTop: '8px', lineHeight: '1.5', color: 'var(--text-dim)' }}>
                    {isStrong ? t('singangDesc', lang) : t('sinyakDesc', lang)}
                  </p>
                </div>

                {/* 용신/희신/기신 카드 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#6EE7B7', fontWeight: 700, marginBottom: '4px' }}>{t('yongsinLabel', lang)}</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: yongsinColor }}>{OH_ICON[yongsin]} {lang === 'en' ? OH_EN_CAP[yongsin] : yongsin}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      {t('johuYongsin', lang)}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#F87171', fontWeight: 700, marginBottom: '4px' }}>{t('gisinLabel', lang)}</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: gisinColor }}>{OH_ICON[gisin]} {lang === 'en' ? OH_EN_CAP[gisin] : gisin}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      {t('gisinWarning', lang)}
                    </div>
                  </div>
                </div>
                {/* 희신/구신 서브 라벨 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  {heesin && (
                    <div style={{ background: 'rgba(125,211,252,0.06)', border: '1px solid rgba(125,211,252,0.12)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#7DD3FC', fontWeight: 600 }}>{t('heesinLabel', lang)}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: heesinColor }}>{OH_ICON[heesin]} {heesin}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{t('heesinDesc', lang)}</span>
                    </div>
                  )}
                  {gusin && (
                    <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#FBBF24', fontWeight: 600 }}>{t('gusinLabel', lang)}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: ohColors[gusin] || '#FBBF24' }}>{OH_ICON[gusin]} {gusin}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{t('gusinDesc', lang)}</span>
                    </div>
                  )}
                </div>
                {tongguanNote && (
                  <div style={{ fontSize: '12px', color: '#C4B5FD', marginBottom: '12px', padding: '8px 12px', background: 'rgba(196,181,253,0.06)', borderRadius: '10px', border: '1px solid rgba(196,181,253,0.12)' }}>
                    {t('tongguanLabel', lang)}{tongguanNote}
                  </div>
                )}

                {/* 조후 */}
                <div style={{ background: 'rgba(125,211,252,0.06)', border: '1px solid rgba(125,211,252,0.15)', borderRadius: '14px', padding: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#7DD3FC', marginBottom: '6px' }}>
                    {t('johuTitle', lang)} — {season} {t('bornInSeason', lang)}
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
                    {johu}
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                    {t('johuYongsinLabel', lang)}<strong style={{ color: ohColors[johuYongsin] || '#7DD3FC' }}>{OH_ICON[johuYongsin]} {johuYongsin}</strong>
                    {johuYongsin !== yongsin && <span style={{ color: 'var(--text-dim)' }}> ({lang === 'en' ? OH_EN_CAP[yongsin] : yongsin}{t('eokbuDiff', lang)})</span>}
                    {johuYongsin === yongsin && <span style={{ color: '#6EE7B7' }}>{t('eokbuMatch', lang)}</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    {t('gaewunTip', lang)}{yongsin === '화' || johuYongsin === '화' ? t('gaewun_fire', lang) :
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
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(159,122,234,0.08)', border: '1px solid rgba(159,122,234,0.2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '64px', animation: 'float 2s ease-in-out infinite', marginBottom: '20px' }}>
              {generatingProgress === 0 ? '\uD83D\uDD2E' : generatingProgress === 1 ? '\u2728' : '\uD83C\uDF1F'}
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
              {generatingProgress === 0 && t('genStep0Msg', lang)}
              {generatingProgress === 1 && t('genStep1Msg', lang)}
              {generatingProgress === 2 && t('genStep2Msg', lang)}
            </p>
            <div style={{ width: '100%', maxWidth: '280px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', margin: '0 auto 16px', overflow: 'hidden' }}>
              <div style={{
                width: ((generatingProgress + 1) / 3 * 100) + '%',
                height: '100%',
                background: 'linear-gradient(90deg, #9F7AEA, #F687B3)',
                borderRadius: '4px',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '4px' }}>
              {loadingProgress || t('preparing', lang)}
            </p>
            <p style={{ fontSize: '12px', opacity: 0.4 }}>
              {generatingProgress === 0 ? t('genTime0', lang) : generatingProgress === 1 ? t('genTime1', lang) : t('genTime2', lang)}
            </p>
          </div>
        )}
        {!isGenerating && aiText && (
          <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(aiText, lang) }} />
        )}

        {/* Share + Save + Restart */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
          {aiText && !isGenerating && (
            <button className="btn" style={{ flex: 1, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--text)', fontSize: '13px' }}
              disabled={isCapturing}
              onClick={() => shareResult(aiText, (userData.name || '') + (lang === 'en' ? "'s Saju Reading" : '의 사주 해설'))}>
              {isCapturing ? (lang === 'en' ? '📸 Capturing...' : '📸 캡처 중...') : (lang === 'en' ? '📸 Share Image' : '📸 이미지 공유')}
            </button>
          )}
          {aiText && !isGenerating && (
            <button className="btn" style={{ flex: 1, background: 'rgba(159,122,234,0.15)', border: '1px solid rgba(159,122,234,0.3)', color: 'var(--text)', fontSize: '13px' }} onClick={() => {
              try {
                const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                const entry = { name: userData.name, date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'), type: currentScreen === 7 ? (lang === 'en' ? '2026 Fortune' : '2026 운세') : (lang === 'en' ? 'Saju Reading' : '사주 해설'), text: aiText };
                const updated = [entry, ...results].slice(0, 10);
                safeSetItem('saju-saved-results', JSON.stringify(updated));
                alert(t('resultSaved', lang));
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
        <p style={{ textAlign: 'center', fontSize: '11px', marginTop: '24px', opacity: 0.3 }}>
          {t('disclaimer', lang)}
        </p>
      </div>
    );
  }

  /* ===== SCREEN 5: Compatibility ===== */
  function renderCompat() {

    function runCompatAnalysis() {
      const mySaju = sajuResult || (() => {
        let y = compatPerson1.year, m = compatPerson1.month, d = compatPerson1.day;
        if (compatPerson1.isLunar) { const s = lunarToSolar(y, m, d); y = s.year; m = s.month; d = s.day; }
        return calcSaju(y, m, d, compatPerson1.hour);
      })();
      const myName = sajuResult ? (userData.name || (lang === 'en' ? 'Me' : '나')) : (compatPerson1.name || (lang === 'en' ? 'Person 1' : '첫 번째'));
      const cName = compatPerson2.name || (lang === 'en' ? 'Partner' : '상대방');
      let cy = compatPerson2.year, cm = compatPerson2.month, cd = compatPerson2.day;
      if (compatPerson2.isLunar) { const s = lunarToSolar(cy, cm, cd); cy = s.year; cm = s.month; cd = s.day; }
      const cSaju = calcSaju(cy, cm, cd, compatPerson2.hour);

      const myDS = mySaju.dStem;
      const theirDS = cSaju.dStem;
      const myDB = mySaju.dBranch;
      const cDB = cSaju.dBranch;

      const hapPairs = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]];
      let hasHap = false;
      for (const hp of hapPairs) {
        if ((myDS === hp[0] && theirDS === hp[1]) || (myDS === hp[1] && theirDS === hp[0])) {
          hasHap = true; break;
        }
      }

      // Deterministic score based on birth data
      const seed = (myDS * 13 + theirDS * 7 + myDB * 11 + cDB * 5) % 15;
      let baseScore = 55 + seed;
      if (hasHap) baseScore += 20;
      const myElem = OH_CG[myDS];
      const theirElem = OH_CG[theirDS];
      const generating: Record<string, string> = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
      if (generating[myElem] === theirElem || generating[theirElem] === myElem) baseScore += 8;
      if (baseScore > 98) baseScore = 98;

      const pScore = Math.min(99, Math.max(30, baseScore + ((myDS + theirDS) % 6) - 3));
      const lScore = Math.min(99, Math.max(30, baseScore + ((myDB + cDB) % 10) - 5));
      const mScore = Math.min(99, Math.max(30, baseScore + ((myDS + cDB) % 8) - 4));
      const cScore = Math.min(99, Math.max(30, baseScore + ((theirDS + myDB) % 6) - 2));

      setCompatResult({
        html: JSON.stringify({ myName, cName, myDS, theirDS, baseScore, pScore, lScore, mScore, cScore, hasHap })
      });

      /* AI compat analysis - accumulate silently, reveal when done */
      setCompatLoading(true);
      setCompatAiText('');

      /* 두 사람의 사주 전체 데이터 구성 */
      const myOh = getOhCount(mySaju);
      const cOh = getOhCount(cSaju);
      const mySipsung = getSipsung(mySaju);
      const cSipsung = getSipsung(cSaju);
      const myShinsal = calcShinsal(mySaju);
      const cShinsal = calcShinsal(cSaju);
      let mySipsungStr = ''; for (const k in mySipsung) { mySipsungStr += k + ':' + mySipsung[k] + ' '; }
      let cSipsungStr = ''; for (const k in cSipsung) { cSipsungStr += k + ':' + cSipsung[k] + ' '; }

      /* 용신/기신 계산 */
      const myYs = calcYongsin(mySaju);
      const cYs = calcYongsin(cSaju);

      /* 일지 관계 분석 */
      const yukHapPairs = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
      let hasYukHap = false;
      for (const yh of yukHapPairs) { if ((myDB===yh[0]&&cDB===yh[1])||(myDB===yh[1]&&cDB===yh[0])) { hasYukHap=true; break; } }
      const chungPairsC = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
      let hasChung = false;
      for (const cp of chungPairsC) { if ((myDB===cp[0]&&cDB===cp[1])||(myDB===cp[1]&&cDB===cp[0])) { hasChung=true; break; } }

      const exact1Str = compatExact1.use && compatExact1.hour >= 0 ? '정확한 출생시간: ' + String(compatExact1.hour).padStart(2, '0') + '시 ' + String(compatExact1.min).padStart(2, '0') + '분\n' : '';
      const exact2Str = compatExact2.use && compatExact2.hour >= 0 ? '정확한 출생시간: ' + String(compatExact2.hour).padStart(2, '0') + '시 ' + String(compatExact2.min).padStart(2, '0') + '분\n' : '';

      const myAge = 2026 - compatPerson1.year;
      const partnerAge = 2026 - compatPerson2.year;
      const agePairNote = '⚠️ 나이 맞춤 해석: ' + myName + ' 만 ' + myAge + '세, ' + cName + ' 만 ' + partnerAge + '세. ' +
        (myAge <= 19 || partnerAge <= 19 ? '10대가 포함되어 있으므로 성적/결혼/부동산/투자 등 성인 주제는 "먼 미래에~" 정도로만 가볍게 언급하고 학교생활/진로/교우관계에 집중해.' :
         myAge <= 29 || partnerAge <= 29 ? '20대이므로 연애/자기계발/커리어 시작에 비중을 두고, 결혼은 가능성으로, 자녀/노후는 가볍게만.' :
         myAge <= 39 || partnerAge <= 39 ? '30대이므로 커리어 성장/결혼(또는 결혼생활)/재테크/자녀계획에 맞는 현실적 조언을.' :
         myAge <= 49 || partnerAge <= 49 ? '40대이므로 커리어 전성기/자녀교육/부부관계/건강에 비중을 둬.' :
         myAge <= 59 || partnerAge <= 59 ? '50대이므로 인생 2막/건강/은퇴준비/부부관계재정립에 초점.' :
         '60대 이상이므로 건강/노후/가족관계에 초점. 취업/수능 등 젊은 시절 이야기는 안 해.') +
        ' 두 사람의 나이에 동떨어진 조언은 절대 금지!\n\n';

      const prompt = (lang === 'en' ? '🚨 CRITICAL LANGUAGE INSTRUCTION 🚨\nYou MUST write EVERYTHING in English. EVERY sentence, EVERY section title, EVERY explanation — ALL in English.\nDo NOT write Korean sentences. Translate Korean section titles to English.\nExample: Write ##1.How to read compatibility## NOT ##1.궁합 읽는 법##\nSaju terms like Gap(甲) can appear with English meaning, but ALL text must be English.\nUse warm, casual, friendly tone. IF YOU WRITE IN KOREAN, THE RESPONSE WILL BE REJECTED.\n\n' : '') +
        agePairNote +
        '너는 적천수(滴天髓)와 자평진전(子平眞詮)을 달달 외운 30년 경력 사주 궁합 전문가야. 반말만 써. 존댓말 금지.\n' +
        '궁합 분석 시 반드시 일간 관계(천간합/상생/상극), 일지 관계(육합/삼합/충/형/파/해), 오행 균형 보완성, 용신 궁합, 십성 궁합(재성/관성/식상/인성 구조 비교)을 모두 근거로 활용해.\n' +
        '모든 주장에는 반드시 구체적 사주 근거를 붙여: 어떤 천간/지지/십성이 어떤 관계이기 때문에 그런 결론이 나오는지 명시해.\n' +
        '고전 인용 필수: 각 섹션마다 적천수/자평진전/궁통보감/연해자평 중 1-2회 인용해. 형식: "적천수에 이르길 \'...\'라 했는데, 이 커플한테 적용하면~"\n' +
        '"너희 혹시 이런 경험 있지?" "이런 적 없어?" 같은 찔림 질문을 섹션마다 1-2개씩 넣어.\n' +
        '"결론적으로" "정리하면" 패턴 절대 금지! 다음 섹션이 궁금해지는 떡밥으로 끝내.\n\n' +
        '=== ' + myName + '의 사주 원국 ===\n' +
        exact1Str +
        '일간: ' + CG[mySaju.dStem] + '(' + OH_CG[mySaju.dStem] + ') 일지: ' + JJ[mySaju.dBranch] + '(' + OH_JJ[mySaju.dBranch] + ')\n' +
        '년주: ' + CG[mySaju.yStem] + JJ[mySaju.yBranch] + ' 월주: ' + CG[mySaju.mStem] + JJ[mySaju.mBranch] + ' 일주: ' + CG[mySaju.dStem] + JJ[mySaju.dBranch] + (mySaju.hStem>=0?' 시주: '+CG[mySaju.hStem]+JJ[mySaju.hBranch]:'') + '\n' +
        '오행: 목' + myOh['목'] + ' 화' + myOh['화'] + ' 토' + myOh['토'] + ' 금' + myOh['금'] + ' 수' + myOh['수'] + '\n' +
        '십성: ' + mySipsungStr + '\n' +
        '신살: ' + (myShinsal.length>0?myShinsal.join(','):'없음') + '\n' +
        '신강/신약: ' + (myYs.isStrong ? '신강 (' + myYs.strengthPct.toFixed(0) + '%)' : '신약 (' + myYs.strengthPct.toFixed(0) + '%)') + '\n' +
        '용신: ' + myYs.yongsin + ' (' + myYs.type + ')' + '\n' +
        '기신: ' + myYs.gisin + '\n\n' +
        '=== ' + cName + '의 사주 원국 ===\n' +
        exact2Str +
        '일간: ' + CG[cSaju.dStem] + '(' + OH_CG[cSaju.dStem] + ') 일지: ' + JJ[cSaju.dBranch] + '(' + OH_JJ[cSaju.dBranch] + ')\n' +
        '년주: ' + CG[cSaju.yStem] + JJ[cSaju.yBranch] + ' 월주: ' + CG[cSaju.mStem] + JJ[cSaju.mBranch] + ' 일주: ' + CG[cSaju.dStem] + JJ[cSaju.dBranch] + (cSaju.hStem>=0?' 시주: '+CG[cSaju.hStem]+JJ[cSaju.hBranch]:'') + '\n' +
        '오행: 목' + cOh['목'] + ' 화' + cOh['화'] + ' 토' + cOh['토'] + ' 금' + cOh['금'] + ' 수' + cOh['수'] + '\n' +
        '십성: ' + cSipsungStr + '\n' +
        '신살: ' + (cShinsal.length>0?cShinsal.join(','):'없음') + '\n' +
        '신강/신약: ' + (cYs.isStrong ? '신강 (' + cYs.strengthPct.toFixed(0) + '%)' : '신약 (' + cYs.strengthPct.toFixed(0) + '%)') + '\n' +
        '용신: ' + cYs.yongsin + ' (' + cYs.type + ')' + '\n' +
        '기신: ' + cYs.gisin + '\n\n' +
        '=== 두 사주 관계 분석 데이터 ===\n' +
        '일간 관계: ' + CG[myDS] + '(' + OH_CG[myDS] + ') vs ' + CG[theirDS] + '(' + OH_CG[theirDS] + ')\n' +
        '천간합: ' + (hasHap ? '있음! (' + CG[myDS] + '+' + CG[theirDS] + ')' : '없음') + '\n' +
        '일지 관계: ' + JJ[myDB] + ' vs ' + JJ[cDB] + ' → ' + (hasYukHap?'육합(六合)! 깊은 인연':'') + (hasChung?'충(冲)! 갈등/변화 요소':'') + (!hasYukHap&&!hasChung?'중립':'') + '\n' +
        '용신 궁합 팩트:\n' +
        '  ' + myName + ' 용신: ' + myYs.yongsin + ' / 기신: ' + myYs.gisin + '\n' +
        '  ' + cName + ' 용신: ' + cYs.yongsin + ' / 기신: ' + cYs.gisin + '\n' +
        '  ' + cName + ' 일간 오행: ' + OH_CG[cSaju.dStem] + (OH_CG[cSaju.dStem] === myYs.yongsin ? ' → ' + myName + '의 용신과 일치!' : ' → ' + myName + '의 용신(' + myYs.yongsin + ')과 불일치') + '\n' +
        '  ' + myName + ' 일간 오행: ' + OH_CG[mySaju.dStem] + (OH_CG[mySaju.dStem] === cYs.yongsin ? ' → ' + cName + '의 용신과 일치!' : ' → ' + cName + '의 용신(' + cYs.yongsin + ')과 불일치') + '\n' +
        '  ⚠️ 위 팩트를 정확히 반영하여 용신 궁합을 분석해. 일치하지 않는 경우 "서로의 용신을 가지고 있다"고 거짓 주장하지 마.\n' +
        '오행 보완: ' + myName + '에게 부족한 오행을 ' + cName + '이 가지고 있는지 분석 필요\n' +
        '총점: ' + baseScore + '점\n\n' +
        '=== 중복 금지 규칙 (매우 중요!) ===\n' +
        '각 섹션은 고유한 역할이 있어. 이전 섹션에서 말한 내용을 다른 섹션에서 반복하지 마!\n' +
        '- ##2/##3(개인 사주 특성)에서 분석한 성격/격국/용신을 ##4(케미) 이후 섹션에서 처음부터 다시 설명하지 마. "앞서 분석한 것처럼" 정도로 언급하고 새로운 분석에 집중해.\n' +
        '- ##4(케미)에서 다룬 성격 비교를 ##5 이후에서 똑같이 반복하지 마. 각 섹션은 자기만의 새로운 관점을 가져야 해.\n' +
        '- 같은 사주 근거(예: 천간합, 일지 충)를 여러 섹션에서 반복 언급하지 마. 한 번 설명한 근거는 이후에 "앞서 말한 천간합 덕분에" 정도로 짧게 참조만 해.\n' +
        '- 각 섹션의 결론/조언이 다른 섹션과 겹치면 안 돼. 섹션마다 새로운 인사이트를 줘야 해.\n\n' +
        '=== 분석 지시 ===\n' +
        '##1.궁합 읽는 법## 다음에 바로 ##2.' + myName + '의 사주적 특성## 과 ##3.' + cName + '의 사주적 특성## 으로 나눠서 넣어줘.\n' +
        '- ##2/##3: 각각 상세하게 분석해줘(각 10줄 이상):\n' +
        '  · 격국(格局) 판별과 용신(用神)/기신 분석\n' +
        '  · 성격 핵심 키워드 3가지 (일간+일지+십성 기반) + 각 키워드 설명\n' +
        '  · 연애/관계 스타일 (재성/관성/식상 구조 기반)\n' +
        '  · 감정 표현 방식과 갈등 대처 패턴\n' +
        '  · 이 사람의 연애에서 가장 큰 강점과 약점\n' +
        '  여기서 한 분석은 이후 섹션에서 반복 금지!\n' +
        '- ##4부터: 두 사람의 "관계"에 집중. 개인 특성 재설명 금지, 오직 두 사람이 만났을 때 생기는 새로운 역학만 분석.\n' +
        '- 모든 해석에 사주 근거를 구체적으로 붙이되, 같은 근거를 여러 섹션에서 반복하지 마.\n\n' +
        '관계 유형: ' + ['연애 중', '혼인 관계', '우정 관계', '동료 사이', '재회/이별', '짝사랑/썸'][compatRelType] + '\n\n' +
        '##1.궁합 읽는 법## 궁합 점수가 어떤 기준(일간 관계, 일지 관계, 오행 보완)으로 나왔는지 일반인도 이해할 수 있게 2-3줄로 간결하게.\n' +
        '##4.두 사람의 케미## [중복 금지: ##2/##3에서 이미 분석한 개인 성격을 다시 나열하지 마!] 두 사람이 "만났을 때" 생기는 시너지와 갈등에만 집중. 구체적 시나리오: "A의 X가 B의 Y와 만나면 이런 상황이 생긴다". 잘 맞는 점 2가지, 주의점 1가지.\n' +
        (compatRelType === 0 ? '##5.연애 궁합## 연애 스타일 비교, 설렘 포인트, 갈등 포인트. 두 사람의 사랑 언어(식상/재성/관성 구조 기반)가 어떻게 다른지.\n' +
          '##6.누가 더 좋아하는 궁합?## 두 사주의 재성/관성 힘을 비교해서 누가 더 상대에게 끌리는 구조인지, 감정 온도 차이가 있는지 분석\n' +
          '##7.권태기 극복요령## 두 사주의 식상/인성/비겁 구조로 권태기가 오는 시기와 패턴을 분석. 이 커플만의 권태기 탈출법을 사주 근거와 함께 구체적으로(오행별 활동 추천, 함께하면 좋은 것 등).\n' +
          '##8.이 사람과 계속 만나도 될까?## 두 사주의 장기적 궁합을 보고 이 관계가 시간이 갈수록 좋아지는지 아니면 갈등이 커지는지 판단. 사주적 근거와 함께\n' +
          '##9.결혼 가능성## 이 커플이 결혼까지 갈 수 있는지, 결혼하면 어떤 부부가 될지. 결혼하기 좋은 시기도 알려줘.\n' +
          '##10.이 인연에게 보내는 한마디## 두 사주의 구조를 바탕으로 이 커플에게 보내는 따뜻한 응원과 현실적 조언. 비유를 써서 감동적으로.\n' :
        compatRelType === 5 ? '##5.이 사람과 연애로 발전할 가능성## 두 사주의 일간/일지 관계와 천간합/육합 여부를 근거로 연애로 발전할 확률을 분석.\n' +
          '##6.상대가 나를 어떻게 보는 성향인지## 상대 사주의 재성/관성/식상 구조를 분석해서 상대가 이성을 대하는 패턴.\n' +
          '##7.누가 먼저 다가가는 게 좋을까?## 두 사주의 식상/관성/비겁 구조를 비교해서 누가 먼저 다가가면 성공 확률이 높은지.\n' +
          '##8.고백 타이밍## 2026~2028년 세운과 월운 분석으로 고백 성공 확률이 높은 시기.\n' +
          '##9.이 관계가 오래 끌 가능성## 두 사주 구조상 썸이 길어지기 쉬운 관계인지 분석.\n' +
          '##10.이 인연의 결론## 이 썸/짝사랑이 결국 어떻게 될지 사주적 전망.\n' :
        compatRelType === 1 ? '##5.부부 조화도## 결혼 생활 안정성, 역할 분담, 서로에게 필요한 것\n' +
          '##6.돈 문제로 갈등이 생길까?## 두 사주의 재성 구조를 비교해서 소비패턴/저축관 차이, 갈등 요소와 해결법\n' +
          '##7.배우자 운이 좋은 편인가?## 각자의 배우자궁(일지) 상태와 배우자성의 힘을 분석.\n' +
          '##8.이혼 가능성 분석## 두 일지의 충/형/해 여부와 대운 흐름상 위기 시기. 부드럽게 돌려서.\n' +
          '##9.누가 집안 주도권을 잡나?## 두 사주의 관성/비겁/인성 힘 비교로 누가 리드하는 구조인지.\n' +
          '##10.권태기 극복법## 부부 관계에서 위기가 오는 시기와 극복 방법\n' +
          '##11.자녀운## 자녀복, 자녀 시기, 아이 성향, 양육 궁합.\n' :
        compatRelType === 2 ? '##5.우정 케미## 비견/겁재/식상 관계를 근거로 어떤 친구 사이인지 분석.\n' +
          '##6.오래갈 인연인가?## 두 일지의 합/충/형을 근거로 이 우정이 평생 갈 인연인지.\n' +
          '##7.동업/금전/비밀공유## 재성과 비겁 관계를 근거로 돈/비밀 관련 분석.\n' +
          '##8.감정 소모 체크## 이 관계에서 에너지를 얻는지 빼앗기는지.\n' +
          '##9.이 관계에서 조심할 점## 충/형/겁재가 있다면 어떤 상황에서 갈등이 터질 수 있는지.\n' +
          '##10.함께하면 좋은 활동## 두 사람의 오행 조합으로 시너지 나는 활동 추천.\n' :
        compatRelType === 3 ? '##5.업무 시너지## 일할 때 시너지가 나는지, 역할 분담이 잘 맞는지\n' +
          '##6.사업 파트너 가능성## 같이 사업하면 성공할 수 있는지, 주의점\n' +
          '##7.직장에서 주의할 점## 갈등이 생길 수 있는 상황과 대처법\n' :
        '##5.재회 가능성## 사주적으로 다시 만날 인연인지, 재회 확률과 시기\n' +
          '##6.상대방의 마음## 상대가 아직 미련이 있는지, 연락이 올 가능성\n' +
          '##7.잡아야 할까 놓아야 할까## 지금 이 관계를 붙잡는 게 맞는지 사주적 근거\n') +
        (compatRelType <= 1 || compatRelType === 5 ? '' :
          '##' + (compatRelType === 2 ? '11' : compatRelType === 3 ? '8' : '8') + '.주의할 점## 갈등 요인과 극복 조언 (부드럽게 돌려서)\n') +
        (compatRelType === 4 ?
          '##8.새로운 인연 시기## 새로운 사람이 들어오는 시기, 어떤 사람을 만나면 좋을지\n' +
          '##9.마음 회복 조언## 지금 감정을 정리하는 데 도움이 되는 사주적 조언\n' +
          '##10.함께하면 좋은 활동 & 따로 하면 좋은 활동## 함께 하면 시너지 나는 취미 3가지, 따로 하는 게 좋은 활동 2가지 (오행 근거).\n' +
          '##11.종합 한마디## 이 관계를 한 문장으로\n' :
        compatRelType === 3 ?
          '##9.함께하면 좋은 활동 & 따로 하면 좋은 활동## 함께 하면 시너지 나는 취미 3가지, 따로 하는 게 좋은 활동 2가지 (오행 근거).\n' +
          '##10.종합 한마디## 이 관계를 한 문장으로\n' :
          '') +
        '5. 용신 궁합 분석: 두 사람 각각의 용신/기신을 밝히고, 상대방 사주에 내 용신 오행이 있는지 확인. 서로의 용신이 상대에게 있으면 최고의 궁합, 서로의 기신이 있으면 에너지 소모.\n' +
        '6. 오행 보완성: 두 사주의 오행을 합산했을 때 균형이 맞는지. A에게 부족한 오행을 B가 채워주는지 구체적으로.\n' +
        '7. 12운성 궁합: 두 사람의 일지 12운성을 비교해서 에너지 밸런스가 맞는지. 한쪽이 제왕이고 한쪽이 쇠면 에너지 차이가 있을 수 있어.\n' +
        '8. 격국 궁합: 두 사람의 격국이 서로 어울리는지 분석. 식신격+정관격은 조화롭고, 상관격+정관격은 충돌 가능.\n' +
        '9. 조후 궁합: 둘 다 겨울 태생이면 함께 있으면 더 차갑고, 화+수 조합이면 서로 조후를 맞춰주는 좋은 궁합.\n\n' +
        '\n각 섹션 최소 20-25줄. 짧으면 안 돼! 풍성하고 깊이 있게 써! 반말만. 부정적 내용은 부드럽게 돌려서. 사주 용어는 괄호로 쉽게 풀어서.\n' +
        '비유적 표현을 적극 사용해! 매 섹션마다 최소 3개 이상의 재미있는 비유/은유를 넣어줘. 일상적인 것(음식/영화/게임/카페/날씨)에 빗대면 더 좋아.\n' +
        '갈등이 언급될 때마다 반드시 구체적 개운법/조율팁/관계회복팁을 함께 제시해! "조심하세요" 같은 추상적 조언 금지.\n' +
        '예시: "갈등이 생기면 함께 동쪽 방향으로 산책가봐. 두 사람 모두 목(木) 기운이 부족해서 자연 속에서 에너지를 채우면 화해가 빨라져" 이런 식으로 구체적 행동+오행 근거.\n' +
        '각 섹션마다 최소 2개 이상의 구체적 사주 근거(천간/지지/오행/십성 관계)를 반드시 포함해.\n' +
        '근거 없이 "잘 맞아/안 맞아" 같은 말 금지. 반드시 "A의 일간 X가 B의 일간 Y를 생(生)/극(剋)하므로..." 형태로 증거를 제시해.\n' +
        '중요: 시기를 언급할 때 반드시 구체적인 년도와 월을 명시해줘!\n' +
        '예시: "2026년 하반기", "2027년 3~4월", "2028년", "올해 가을쯤" 이런 식으로.\n' +
        '"언젠가", "조만간", "머지않아" 같은 모호한 표현 금지! 두 사람의 세운/대운 흐름을 2026~2030년까지 분석해서 구체적 년도를 제시해.\n' +
        '결혼 적기, 위기 시기, 재회 가능 시기, 자녀 시기, 이직 시기 등 모든 타이밍에 년도를 넣어줘.\n\n' +
        '가장 중요한 규칙: 모든 해석에 반드시 사주 명리학적 근거를 구체적으로 밝혀!\n' +
        '나쁜 예: "두 사람은 잘 맞아" (근거 없음)\n' +
        '좋은 예: "' + myName + '의 일간 ' + CG[myDS] + '(' + OH_CG[myDS] + ')이 ' + cName + '의 일간 ' + CG[theirDS] + '(' + OH_CG[theirDS] + ')을 생(生)해주는 관계야. ' + OH_CG[myDS] + '이 ' + OH_CG[theirDS] + '을 키워주는 구조라서 자연스럽게 ' + myName + '이 돌봐주는 역할을 하게 돼."\n' +
        '이런 식으로 일간/일지/오행/십성/충합 관계를 구체적으로 언급하면서 설명해. 매 문단마다 사주 근거 1개 이상 필수!\n\n' +
        '각 섹션마다 고전 명리학 원문을 2-4회 인용해서 권위를 높여. 형식: "적천수에 이런 말이 있어: \"갑목이 하늘까지 뻗으려면 화의 도움이 필요하다(甲木參天, 脫胎要火).\" 네 사주가 딱 이 경우야." 인용 후 반드시 사용자 사주에 어떻게 적용되는지 연결해. 섹션 끝에 [근거: 출전명] 표시.\n' +
        '해석의 여지가 있을 때는 반드시 긍정적으로 해석해. 충(冲)도 "정체를 깨는 기회의 문"으로, 기신도 "이겨내면 더 강해지는 시련"으로.\n' +
        '흥미 유발 포인트를 매 섹션 1개 이상: "사실 이 조합은 100쌍 중 5쌍만 가진 희귀한 구조야!" 같은 훅.\n\n' +
        getRelevantRefs({ dayMaster: myDS, topics: ['compatibility', 'love', 'general'] });

      fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, lang })
      }).then(async (res) => {
        if (!res.ok || !res.body) {
          setCompatLoading(false);
          setCompatAiText(t('compatAiError', lang));
          return;
        }
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
      }).catch(() => {
        setCompatLoading(false);
        setCompatAiText(t('compatAiError', lang));
      });
    }

    const data = compatResult ? (() => { try { return JSON.parse(compatResult.html); } catch { return null; } })() : null;

    return (
      <div className="inner screen-enter" style={{ paddingTop: '56px' }}>
        <button className="back-btn" onClick={() => setCurrentScreen(0)}>{t('backBtn', lang)}</button>
        <h2 className="gradient-text" style={{ textAlign: 'center', marginBottom: '24px' }}>{t('compatAnalysis', lang)}</h2>

        {!sajuResult && (
          <div className="card card-glow">
            <h3>{t('person1', lang)}</h3>
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
              <label id="compat1-birthday-label">{t('birthday', lang)}</label>
              <div className="select-row" role="group" aria-labelledby="compat1-birthday-label">
                <div className="input-group">
                  <select value={compatPerson1.year} onChange={e => setCompatPerson1(p => ({ ...p, year: parseInt(e.target.value) }))} aria-label={lang === 'en' ? 'Person 1 birth year' : '첫 번째 사람 출생 연도'}>
                    {Array.from({ length: 86 }, (_, i) => 2025 - i).map(y => <option key={y} value={y}>{y}{t('yearUnit', lang)}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <select value={compatPerson1.month} onChange={e => setCompatPerson1(p => ({ ...p, month: parseInt(e.target.value) }))} aria-label={lang === 'en' ? 'Person 1 birth month' : '첫 번째 사람 출생 월'}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}{t('monthUnit', lang)}</option>)}
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
                    <div className="time-hanja">{lang === 'en' ? ti.hanja.replace('시', '') : ti.hanja}</div>
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
          </div>
        )}

        <div className="card card-glow">
          <h3>{t('person2', lang)}</h3>
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
            <label id="compat2-birthday-label">{t('birthday', lang)}</label>
            <div className="select-row" role="group" aria-labelledby="compat2-birthday-label">
              <div className="input-group">
                <select value={compatPerson2.year} onChange={e => setCompatPerson2(p => ({ ...p, year: parseInt(e.target.value) }))} aria-label={lang === 'en' ? 'Person 2 birth year' : '두 번째 사람 출생 연도'}>
                  {Array.from({ length: 86 }, (_, i) => 2025 - i).map(y => <option key={y} value={y}>{y}{t('yearUnit', lang)}</option>)}
                </select>
              </div>
              <div className="input-group">
                <select value={compatPerson2.month} onChange={e => setCompatPerson2(p => ({ ...p, month: parseInt(e.target.value) }))} aria-label={lang === 'en' ? 'Person 2 birth month' : '두 번째 사람 출생 월'}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}{t('monthUnit', lang)}</option>)}
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
                  <div className="time-hanja">{lang === 'en' ? ti.hanja.replace('시', '') : ti.hanja}</div>
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
        </div>

        <div className="card" style={{ marginTop: '12px', padding: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>{t('relTypeTitle', lang)}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: t('relDating', lang), idx: 0 },
              { label: t('relMarried', lang), idx: 1 },
              { label: t('relFriends', lang), idx: 2 },
              { label: t('relColleagues', lang), idx: 3 },
              { label: t('relBreakup', lang), idx: 4 },
              { label: t('relCrush', lang), idx: 5 },
            ].map(r => (
              <div key={r.idx}
                className={'option-card' + (compatRelType === r.idx ? ' selected' : '')}
                onClick={() => { setCompatRelType(r.idx); resetCompatResult(); }}
              >{r.label}</div>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-full" style={{ marginTop: '12px' }} onClick={() => setCompatPaywall(true)}>
          {t('analyzeCompat', lang)}
        </button>

        {compatPaywall && !compatResult && (() => {
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
            { icon: '💍', title: lang === 'en' ? 'Spouse Fortune' : '배우자 운' },
            { icon: '⚡', title: lang === 'en' ? 'Who Leads the Household?' : '누가 집안 주도권을 잡나?' },
            { icon: '👶', title: lang === 'en' ? 'Children Fortune' : '자녀운' },
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

            {/* Pricing CTA */}
            <div className="card" style={{
              marginTop: '12px', textAlign: 'center', padding: '28px 20px',
              background: 'linear-gradient(135deg, rgba(246,135,179,0.12), rgba(159,122,234,0.08))',
              border: '1px solid rgba(246,135,179,0.3)'
            }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.7, marginBottom: '16px' }}>
                {lang === 'en' ? 'Unlock the full compatibility reading\nand discover your connection' : '두 사람의 인연을 깊이 들여다보고\n궁합의 비밀을 확인해볼래?'}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#F687B3' }}>₩990</span>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '6px' }}>{lang === 'en' ? 'One-time payment' : '한번 결제, 영구 열람'}</div>
              </div>
              <a href="/payment" className="paywall-cta" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: 'linear-gradient(135deg, #F687B3, #9F7AEA)' }}>
                {lang === 'en' ? 'Unlock Full Reading — ₩990' : '전체 결과 보기 — ₩990'}
              </a>
              {process.env.NEXT_PUBLIC_ENABLE_FREE_PREVIEW === 'true' && (
                <p style={{ marginTop: '12px', fontSize: '11px', opacity: 0.4, cursor: 'pointer' }} onClick={() => {
                  setCompatPaywall(false);
                  runCompatAnalysis();
                }}>
                  {t('freePreview', lang)}
                </p>
              )}
            </div>
          </div>
          );
        })()}

        {data && (
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
              <div className="compat-score gradient-text">{data.baseScore}<span style={{ fontSize: '24px' }}>{t('scoreUnit', lang)}</span></div>
              <div style={{ margin: '12px 0 16px' }}>
                {[
                  { min: 90, label: '💑 ' + t('tierSoulmate', lang), color: '#FFD700', desc: t('tierSoulmateDesc', lang) },
                  { min: 80, label: '💍 ' + t('tierMarriage', lang), color: '#2ED573', desc: t('tierMarriageDesc', lang) },
                  { min: 70, label: '💕 ' + t('tierGood', lang), color: '#4299E1', desc: t('tierGoodDesc', lang) },
                  { min: 55, label: '🤝 ' + t('tierGrowth', lang), color: '#FF9F43', desc: t('tierGrowthDesc', lang) },
                  { min: 0, label: '🌱 ' + t('tierChallenge', lang), color: '#9F7AEA', desc: t('tierChallengeDesc', lang) },
                ].map((tier, i) => {
                  const isActive = (i === 0 && data.baseScore >= 90) ||
                    (i === 1 && data.baseScore >= 80 && data.baseScore < 90) ||
                    (i === 2 && data.baseScore >= 70 && data.baseScore < 80) ||
                    (i === 3 && data.baseScore >= 55 && data.baseScore < 70) ||
                    (i === 4 && data.baseScore < 55);
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', borderRadius: '10px', marginBottom: '4px',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: isActive ? '1px solid ' + tier.color : '1px solid transparent',
                      opacity: isActive ? 1 : 0.4,
                      transition: 'all 0.3s'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: tier.color, minWidth: '110px' }}>{tier.label}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{tier.desc}</span>
                      {isActive && <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 800, color: tier.color }}>{t('tierHere', lang)}</span>}
                    </div>
                  );
                })}
              </div>
              {data.hasHap && (
                <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.15)', borderRadius: '12px', fontSize: '13px', marginBottom: '12px' }}>
                  ✨ {t('hapFound', lang)}
                </div>
              )}
              {/* 카테고리별 점수 생략 - AI가 상세 분석 제공 */}
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
              const ohColors: Record<string, string> = {'목':'#22C55E','화':'#EF4444','토':'#EAB308','금':'#94A3B8','수':'#3B82F6'};
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

            {compatLoading && (
              <div className="card" style={{ marginTop: '12px', textAlign: 'center', padding: '48px 24px', background: 'rgba(246,135,179,0.08)', border: '1px solid rgba(246,135,179,0.2)', borderRadius: '20px' }}>
                <div style={{ fontSize: '56px', animation: 'float 2s ease-in-out infinite', marginBottom: '16px' }}>💕</div>
                <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{t('compatReading', lang)}</p>
                <p style={{ fontSize: '13px', opacity: 0.5 }}>{t('compatTime', lang)}</p>
                <div style={{ width: '80%', maxWidth: '200px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', margin: '16px auto 0', overflow: 'hidden' }}>
                  <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, #F687B3, #9F7AEA)', borderRadius: '3px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              </div>
            )}
            {!compatLoading && compatAiText && (
              <div className="card" style={{ marginTop: '12px' }}>
                <h3>{t('aiCompatTitle', lang)}</h3>
                <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(compatAiText, lang) }} />
                <button className="btn" style={{ width: '100%', marginTop: '16px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--text)', fontSize: '13px', padding: '10px' }}
                  disabled={isCapturing}
                  onClick={() => shareResult(compatAiText, (userData.name || '') + ' & ' + (compatPerson2.name || '') + (lang === 'en' ? "'s Compatibility" : '의 궁합'))}>
                  {isCapturing ? (lang === 'en' ? '📸 Capturing...' : '📸 캡처 중...') : (lang === 'en' ? '📸 Share Image' : '📸 이미지 공유')}
                </button>
                <button className="btn" style={{ width: '100%', marginTop: '8px', background: 'rgba(159,122,234,0.15)', border: '1px solid rgba(159,122,234,0.3)', color: 'var(--text)', fontSize: '13px', padding: '10px' }} onClick={() => {
                  try {
                    const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                    const entry = { name: (userData.name || (lang === 'en' ? 'Me' : '나')) + ' & ' + (compatPerson2.name || (lang === 'en' ? 'Partner' : '상대')), date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'), type: lang === 'en' ? 'Compatibility' : '궁합 분석', text: compatAiText };
                    const updated = [entry, ...results].slice(0, 10);
                    safeSetItem('saju-saved-results', JSON.stringify(updated));
                    alert(t('compatSaved', lang));
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
        '너는 적천수(滴天髓)와 궁통보감(窮通寶鑑)을 섭렵한 사주 명리학 기반 태아 궁합 전문가야. 존댓말로 따뜻하게 써줘. 부정적 표현 금지 - 모든 내용을 따뜻하고 희망적으로.\n' +
        '고전 인용 필수: 2-3번 적천수/궁통보감 구절을 인용해서 권위 있게. "궁통보감에 이르길 \'...\'라 했는데, 이 아기에게 적용하면~" 형식으로.\n\n' +
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
        '##5.아이가 크면서 빛나는 시기## 아기 사주의 대운 흐름상 어떤 나이대에 가장 빛날지 예측. 학업/재능/인간관계. 5줄.\n' +
        '##6.기운 합 분석 & 맞춤 태교## 엄마와 아기의 오행 상생/상극 관계를 명리학적으로 깊이 있게 분석해줘:\n' +
        '- 엄마 일간(' + CG[momSaju.dStem] + '/' + OH_CG[momSaju.dStem] + ')과 아기 일간(' + CG[babySaju.dStem] + '/' + OH_CG[babySaju.dStem] + ')의 오행 관계가 상생인지 상극인지, 그게 육아에서 어떻게 나타나는지 명리학 근거와 함께\n' +
        '- 두 사주의 용신/기신이 서로에게 어떤 영향을 주는지\n' +
        '- 엄마-아기 오행 조합에 맞는 태교 방법 추천:\n' +
        '  · 태교 음악 (오행별 음계/장르 근거로 구체적 추천)\n' +
        '  · 태교 활동 (산책 방향, 색상 테라피, 명상법, 그림/독서 등)\n' +
        '  · 태교 음식 (엄마와 아기 오행을 보충하는 음식)\n' +
        '  · 태교할 때 피해야 할 것 (기신 오행 관련)\n' +
        '모든 추천에 명리학적 근거를 반드시 함께. 10줄 이상.\n' +
        '##7.행운 아이템 & 개운법## 엄마와 아기의 사주를 함께 고려한 맞춤 추천:\n' +
        '- 🎨 행운의 색 2가지 (엄마+아기 오행 보완 근거)\n' +
        '- 💎 럭키 아이템 3가지 (일상에서 쓸 수 있는 것, 오행 근거)\n' +
        '- 📍 행운의 방향 (산책/외출 시 좋은 방위)\n' +
        '- 🏠 아기방 인테리어 추천 (오행 기반 색상/방향/소품)\n' +
        '- 👶 사주로 보는 추천 육아법 (아기 일간 성격에 맞는 양육 접근법 3가지)\n' +
        '- 🎯 엄마의 취미 추천 (임신 중 + 출산 후, 용신 오행 보충하는 활동 3가지)\n' +
        '각각 명리학적 근거를 괄호로 설명. 8줄 이상.\n' +
        '##8.아기가 가져올 가정의 변화## 아기의 사주가 가정 전체의 에너지를 어떻게 바꾸는지. 부부 관계에 미치는 영향, 재물운 변화, 가족 분위기 변화를 사주적 근거로. 아기가 태어난 후 가정이 어떻게 달라지는지 구체적으로. 5줄.\n' +
        '##9.엄마에게 보내는 편지## 사주를 바탕으로 예비 엄마에게 보내는 따뜻한 응원 편지. 반드시 존댓말(합니다/습니다/세요 체)로 작성하세요. "어머니의 사주를 보니 이런 멋진 엄마가 되실 거예요"라는 느낌으로 감동적이고 진심을 담아서. 비유를 많이 써서 가슴에 와닿게. 절대 반말 금지. 5줄.\n\n' +
        '비유적 표현을 적극 사용해! 매 섹션마다 최소 2개의 재미있고 따뜻한 비유를 넣어줘.\n' +
        '예시: "엄마가 따뜻한 볕이라면 아기는 그 볕을 받아 피어나는 꽃이야", "이 아기는 엄마 인생에 떨어진 행운의 별똥별 같은 존재야", "엄마의 부족한 수(水) 기운을 아기가 촉촉한 빗물처럼 채워주는 구조야"\n' +
        '각 섹션마다 고전 명리학 원문을 2-4회 인용해서 권위를 높여. 형식: "적천수에 이런 말이 있어: \"갑목이 하늘까지 뻗으려면 화의 도움이 필요하다(甲木參天, 脫胎要火).\" 네 사주가 딱 이 경우야." 인용 후 반드시 사용자 사주에 어떻게 적용되는지 연결해. 섹션 끝에 [근거: 출전명] 표시.\n' +
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

    return (
      <div className="inner screen-enter" style={{ paddingTop: '56px' }}>
        <button className="back-btn" onClick={() => setCurrentScreen(0)}>{t('backBtn', lang)}</button>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', background: 'linear-gradient(135deg,#E91E8C,#FF6FB7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {t('pregGuide', lang)}
        </h2>
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
                  {Array.from({ length: 86 }, (_, i) => 2025 - i).map(y => <option key={y} value={y}>{y}{t('yearUnit', lang)}</option>)}
                </select>
              </div>
              <div className="input-group">
                <select value={pregData.month} onChange={e => setPregData(p => ({ ...p, month: parseInt(e.target.value) }))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}{t('monthUnit', lang)}</option>)}
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
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}{t('monthUnit', lang)}</option>)}
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

        <div style={{ marginTop: '20px' }}>
          <button className="btn btn-glow btn-full" style={{ background: 'linear-gradient(135deg,#E91E8C,#FF6FB7)', boxShadow: '0 4px 20px rgba(233,30,140,0.3)' }} onClick={runPregnancyCompat}>
            {t('energyAnalysis', lang)}
          </button>
        </div>

        {data && !data.type && (
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
                <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(compatAiText, lang) }} />
                <button className="btn" style={{ width: '100%', marginTop: '16px', background: 'rgba(233,30,140,0.12)', border: '1px solid rgba(233,30,140,0.3)', color: 'var(--text)', fontSize: '13px', padding: '10px' }} onClick={() => {
                  try {
                    const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                    const entry = { name: (pregData.name || (lang === 'en' ? 'Mom' : '산모')) + (lang === 'en' ? ' & Baby' : ' & 아기'), date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'), type: lang === 'en' ? 'Pregnancy Compatibility' : '임산부 궁합', text: compatAiText };
                    const updated = [entry, ...results].slice(0, 10);
                    safeSetItem('saju-saved-results', JSON.stringify(updated));
                    alert(t('pregSaved', lang));
                  } catch { /* ignore corrupted storage */ }
                }}>{t('pregSaveResult', lang)}</button>
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
    if (!sajuResult) {
      // Saved result view — no saju calc data, just AI text
      if (aiText) {
        return (
          <div className="inner screen-enter">
            <button className="back-btn" onClick={() => { setCurrentScreen(0); setAiText(''); }}>{t('backBtn', lang)}</button>
            <div className="result-header">
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📅</div>
              <div className="name" style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {lang === 'en' ? 'Saved Fortune' : '저장된 운세'}
              </div>
            </div>
            <div className="section-divider">{t('aiReading', lang)}</div>
            <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(aiText, lang) }} />
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
      <div className="inner screen-enter">
        <button className="back-btn" onClick={() => { setCurrentScreen(0); setAiText(''); setSajuResult(null); }}>{t('backBtn', lang)}</button>

        {/* Header */}
        <div className="result-header">
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>📅</div>
          <div className="name" style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {userData.name || t('anonymous', lang)}{t('yearlyFortuneOf', lang)}
          </div>
          <div className="sub">{userData.year}{t('yearUnit', lang)} {userData.month}{t('monthUnit', lang)} {userData.day}{t('dayUnit', lang)} {t('born', lang)}</div>
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
        {!isGenerating && aiText && (
          <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(aiText, lang) }} />
        )}

        {/* Share + Save + Restart */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
          {aiText && !isGenerating && (
            <button className="btn" style={{ flex: 1, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--text)', fontSize: '13px' }}
              disabled={isCapturing}
              onClick={() => shareResult(aiText, (userData.name || '') + (lang === 'en' ? "'s Saju Reading" : '의 사주 해설'))}>
              {isCapturing ? (lang === 'en' ? '📸 Capturing...' : '📸 캡처 중...') : (lang === 'en' ? '📸 Share Image' : '📸 이미지 공유')}
            </button>
          )}
          {aiText && !isGenerating && (
            <button className="btn" style={{ flex: 1, background: 'rgba(159,122,234,0.15)', border: '1px solid rgba(159,122,234,0.3)', color: 'var(--text)', fontSize: '13px' }} onClick={() => {
              try {
                const results = JSON.parse(localStorage.getItem('saju-saved-results') || '[]');
                const entry = { name: userData.name, date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR'), type: currentScreen === 7 ? (lang === 'en' ? '2026 Fortune' : '2026 운세') : (lang === 'en' ? 'Saju Reading' : '사주 해설'), text: aiText };
                const updated = [entry, ...results].slice(0, 10);
                safeSetItem('saju-saved-results', JSON.stringify(updated));
                alert(t('resultSaved', lang));
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
        <p style={{ textAlign: 'center', fontSize: '11px', marginTop: '24px', opacity: 0.3 }}>
          {t('disclaimer', lang)}
        </p>
      </div>
    );
  }

  /* ===== SCREEN 8: Teaser / Paywall ===== */
  function renderTeaser() {
    if (!sajuResult) return null;
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
      t('yrSecTitle4', lang), t('yrSecTitle5', lang), t('yrSecTitle6', lang), t('yrSecTitle7', lang)
    ];
    const yearlySectionHints = [
      t('yrSecHint1', lang), t('yrSecHint2', lang), t('yrSecHint3', lang),
      t('yrSecHint4', lang), t('yrSecHint5', lang), t('yrSecHint6', lang), t('yrSecHint7', lang)
    ];
    const yearlyIcons = ['🔮', '📅', '📊', '🎯', '📋', '🛡', '🍀'];

    const isMarriedUser = userData.relationship === 3;
    const title5 = isMarriedUser ? (lang === 'en' ? 'Marriage & Spouse Analysis' : '부부 관계 & 배우자 분석') : t('secTitle5', lang);
    const hint5 = isMarriedUser ? (lang === 'en' ? 'Spouse compatibility & relationship dynamics...' : '배우자 궁합과 부부 관계 역학...') : t('secHint5', lang);
    const title13 = isMarriedUser ? (lang === 'en' ? 'Marriage Future & Crisis Management' : '부부의 미래 & 위기 관리') : t('secTitle13', lang);
    const hint13 = isMarriedUser ? (lang === 'en' ? 'Couple timeline & crisis recovery...' : '부부 관계 타임라인과 위기 극복법...') : t('secHint13', lang);

    const sectionTitles = isYearly ? yearlySectionTitles : [
      t('secTitle1', lang), t('secTitle2', lang), t('secTitle3', lang), t('secTitle4', lang),
      title5, t('secTitle6', lang), t('secTitle7', lang), t('secTitle8', lang),
      t('secTitle9', lang), t('secTitle10', lang), t('secTitle11', lang), t('secTitle12', lang),
      title13, t('secTitle14', lang), t('secTitle15', lang), t('secTitle16', lang),
      t('secTitle17', lang)
    ];

    const sectionHints = isYearly ? yearlySectionHints : [
      t('secHint1', lang), t('secHint2', lang), t('secHint3', lang), t('secHint4', lang),
      hint5, t('secHint6', lang), t('secHint7', lang), t('secHint8', lang),
      t('secHint9', lang), t('secHint10', lang), t('secHint11', lang), t('secHint12', lang),
      hint13, t('secHint14', lang), t('secHint15', lang), t('secHint16', lang),
      t('secHint17', lang)
    ];

    const icons = isYearly ? yearlyIcons : ['🎯', '🧠', '💰', '💼', '💕', '👥', '🏥', '👨‍👩‍👧', '👶', '🛤', '🔭', '🗺', '💍', '🏠', '🍀', '✨', '💌'];

    return (
      <div className="inner screen-enter">
        <button className="back-btn" onClick={() => setCurrentScreen(0)}>{t('backBtn', lang)}</button>

        {/* Result Header */}
        <div className="result-header">
          {isYearly && <div style={{ fontSize: '48px', marginBottom: '8px' }}>📅</div>}
          <div className="name gradient-text" style={isYearly ? { background: 'linear-gradient(135deg,#F59E0B,#EF4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } : undefined}>
            {isYearly ? (userData.name || t('anonymous', lang)) + t('yearlyFortuneOf', lang) : (userData.name || t('anonymous', lang)) + t('sajuAnalysisOf', lang)}
          </div>
          <div className="sub">{userData.year}{t('yearUnit', lang)} {userData.month}{t('monthUnit', lang)} {userData.day}{t('dayUnit', lang)} {t('born', lang)}</div>
          {isYearly && (
            <div style={{ marginTop: '8px', display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}>
              {t('yearlyBadge', lang)}
            </div>
          )}
        </div>

        {/* Section A: Four Pillars (free preview) */}
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
                    <div className="elem" style={{ opacity: 0.3 }}>{t('unknown', lang)}</div>
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

        {/* Ohaeng Bar Chart (free preview) */}
        <div className="section-divider">{t('ohBalance', lang)}</div>
        <div className="card">
          <div className="bar-chart">
            {ohKeys.map(k => {
              const pct = Math.round(ohCount[k] / total * 100);
              return (
                <div key={k} className="bar-row">
                  <div className="bar-label">{OH_ICON[k]} {lang === 'en' ? OH_EN_CAP[k] : k}</div>
                  <div className="bar-track">
                    <div className={'bar-fill ' + getElemClass(k)} style={{ width: pct + '%' }}>
                      {ohCount[k]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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

        {/* Second CTA above locked items */}
        {(() => {
          
          return (
            <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
              <a
                href="/payment"
                className="paywall-cta"
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
                onClick={async (e) => {
                  e.preventDefault();
                  if (isGenerating) return; // Prevent payment with partial AI text
                  const pendingOrderId = generateOrderId();
                  saveReadingToSession({ aiText, sajuResult, userData, appMode, timestamp: Date.now() });
                  fetch('/api/readings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true,
                    body: JSON.stringify({ orderId: pendingOrderId, type: appMode === 'yearly' ? 'yearly' : 'saju', inputData: userData ?? null, chartData: sajuResult ?? null, resultText: aiText, lang: 'ko', pending: true }),
                  }).catch(() => {/* fire-and-forget */});
                  window.location.href = '/payment?pendingOrderId=' + pendingOrderId;
                }}
              >
                전체 사주 해석 보기 ₩990
              </a>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px', opacity: 0.7 }}>
                적천수 · 자평진전 · 궁통보감 기반 전통 명리학 분석
              </div>
            </div>
          );
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

        {/* Section E: Pricing CTA */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(246,196,67,0.12), rgba(245,158,11,0.08))',
          border: '1px solid rgba(246,196,67,0.3)',
          textAlign: 'center',
          padding: '32px 24px'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>
            <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>전문가 대면 상담 ₩50,000+</span>
            {' → AI 사주 해석'}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.7, marginBottom: '20px' }}>
            {isYearly
              ? t('paywallMsgYearly', lang)
              : t('paywallMsgSaju', lang)}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#F6C443' }}>₩990</span>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '6px' }}>{lang === 'en' ? 'One-time payment' : '한번 결제, 영구 열람'}</div>
            {isYearly && (
              <div style={{ fontSize: '12px', color: '#F59E0B', marginTop: '4px', fontWeight: 600 }}>
                {t('currentMonthNoteLabel', lang)}
              </div>
            )}
          </div>

          <a
            href="/payment"
            className="paywall-cta"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
            onClick={async (e) => {
              e.preventDefault();
              if (isGenerating) return; // Prevent payment with partial AI text
              const pendingOrderId = generateOrderId();
              saveReadingToSession({ aiText, sajuResult, userData, appMode, timestamp: Date.now() });
              fetch('/api/readings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: true,
                body: JSON.stringify({ orderId: pendingOrderId, type: appMode === 'yearly' ? 'yearly' : 'saju', inputData: userData ?? null, chartData: sajuResult ?? null, resultText: aiText, lang: 'ko', pending: true }),
              }).catch(() => {/* fire-and-forget */});
              window.location.href = '/payment?pendingOrderId=' + pendingOrderId;
            }}
          >
            {lang === 'en'
              ? (isYearly ? 'Unlock Full Yearly Reading — ₩990' : 'Unlock Full Reading — ₩990')
              : (isYearly ? '연간 운세 전체 보기 — ₩990' : '전체 결과 보기 — ₩990')}
          </a>

        </div>

        {/* Section F: Free unlock (testing) */}
        {process.env.NEXT_PUBLIC_ENABLE_FREE_PREVIEW === 'true' && (
          <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '40px' }}>
            <span
              style={{ fontSize: '13px', color: 'var(--text-dim)', cursor: 'pointer', textDecoration: 'underline', opacity: 0.5 }}
              onClick={() => { setTeaserUnlocked(true); setCurrentScreen(isYearly ? 7 : 4); }}
            >
              {t('freePreview', lang)}
            </span>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '11px', marginTop: '8px', opacity: 0.3 }}>
          {t('disclaimer', lang)}
        </p>

        {/* Spacer for sticky CTA bar on mobile */}
        <div style={{ height: 80 }} />

        {/* Sticky CTA bar (mobile only) */}
        <div className="sticky-cta-bar">
          <span style={{ fontSize: '13px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>₩990 · 한번 결제</span>
          <a
            href="/payment"
            className="paywall-cta"
            style={{ flex: 1, maxWidth: '240px', display: 'block', textAlign: 'center', textDecoration: 'none', fontSize: '15px', padding: '12px 16px' }}
            onClick={async (e) => {
              e.preventDefault();
              if (isGenerating) return; // Prevent payment with partial AI text
              const pendingOrderId = generateOrderId();
              saveReadingToSession({ aiText, sajuResult, userData, appMode, timestamp: Date.now() });
              fetch('/api/readings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: true,
                body: JSON.stringify({ orderId: pendingOrderId, type: appMode === 'yearly' ? 'yearly' : 'saju', inputData: userData ?? null, chartData: sajuResult ?? null, resultText: aiText, lang: 'ko', pending: true }),
              }).catch(() => {/* fire-and-forget */});
              window.location.href = '/payment?pendingOrderId=' + pendingOrderId;
            }}
          >
            전체 사주 해석 보기
          </a>
        </div>
      </div>
    );
  }

  /* ===== SCREEN 9: Star Charging ===== */
  const [chargeStep, setChargeStep] = useState<'select' | 'confirm'>('select');
  const [selectedCharge, setSelectedCharge] = useState<{ name: string; price: string; priceNum: number; stars: number; bonus: number } | null>(null);
  const [payChecks, setPayChecks] = useState([false, false, false]);
  const allChecked = payChecks.every(Boolean);

  function renderChargeScreen() {
    // Star charging is coming soon — redirect users to direct payment
    return (
      <div className="inner screen-enter" style={{ paddingTop: '60px', paddingBottom: '40px', textAlign: 'center' }}>
        <button className="back-btn" onClick={() => setCurrentScreen(0)}>{t('backBtn', lang)}</button>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>⭐</div>
        <h2 className="gradient-text" style={{ marginBottom: '12px' }}>
          {lang === 'en' ? 'Star Shop — Coming Soon' : '별빛 충전소 — 준비 중'}
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: '32px' }}>
          {lang === 'en'
            ? 'The star-based system is currently being updated.\nUse direct payment to unlock your full reading now.'
            : '별빛 충전 시스템은 현재 업데이트 중입니다.\n지금은 직접 결제로 전체 결과를 확인해 보세요.'}
        </p>
        <a
          href="/payment"
          className="btn btn-primary btn-full"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none', maxWidth: '320px', margin: '0 auto' }}
        >
          {lang === 'en' ? 'Go to Payment — ₩990' : '결제하기 — ₩990'}
        </a>
      </div>
    );

    /* eslint-disable no-unreachable */
    const chargeOpts = [
      { name: t('chargeLabelLight', lang), price: lang === 'en' ? '$1' : '1,000원', priceNum: 1000, stars: 10, bonus: 0, note: t('chargeDescSaju1', lang), popular: false, best: false },
      { name: t('chargeLabelPopular', lang), price: lang === 'en' ? '$2' : '2,000원', priceNum: 2000, stars: 25, bonus: 5, note: t('chargeDescBestValue', lang), popular: true, best: true },
    ];

    const businessInfo = {
      companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || '상호명을 입력하세요',
      ceoName: process.env.NEXT_PUBLIC_CEO_NAME || '대표자명',
      businessNumber: process.env.NEXT_PUBLIC_BUSINESS_NUMBER || '000-00-00000',
      salesNumber: process.env.NEXT_PUBLIC_SALES_NUMBER || '제0000-서울XX-0000호',
      address: process.env.NEXT_PUBLIC_ADDRESS || '사업장 주소를 입력하세요',
      phone: process.env.NEXT_PUBLIC_CS_PHONE || '000-0000-0000',
      email: process.env.NEXT_PUBLIC_CS_EMAIL || 'support@example.com',
    };

    /* ----- Confirm step (결제 확인) ----- */
    if (chargeStep === 'confirm' && selectedCharge) {
      const totalStars = selectedCharge.stars + selectedCharge.bonus;
      return (
        <div className="inner screen-enter" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
          <button className="back-btn" onClick={() => { setChargeStep('select'); setPayChecks([false, false, false]); }}>{t('payBack', lang)}</button>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>💳</div>
            <h2 className="gradient-text" style={{ marginBottom: '4px' }}>{t('payConfirmTitle', lang)}</h2>
          </div>

          {/* Product card */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>⭐ {selectedCharge.name}</h3>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
                {selectedCharge.price}
              </div>
            </div>

            <div style={{ fontSize: '13px', lineHeight: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '4px 0' }}>
                <span style={{ color: 'rgba(245,240,232,0.5)' }}>{t('payProductName', lang)}</span>
                <span style={{ color: 'var(--text)' }}>별빛 ⭐{selectedCharge.stars}{selectedCharge.bonus > 0 ? '+' + selectedCharge.bonus : ''}{t('starUnit', lang)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '4px 0' }}>
                <span style={{ color: 'rgba(245,240,232,0.5)' }}>{t('payPrice', lang)}</span>
                <span style={{ color: 'var(--text)' }}>{selectedCharge.price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '4px 0' }}>
                <span style={{ color: 'rgba(245,240,232,0.5)' }}>{t('payDelivery', lang)}</span>
                <span style={{ color: 'var(--text)' }}>{t('payDeliveryValue', lang)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: 'rgba(245,240,232,0.5)' }}>{t('payTiming', lang)}</span>
                <span style={{ color: 'var(--text)' }}>{t('payTimingValue', lang)}</span>
              </div>
            </div>

            <div style={{ fontSize: '12px', lineHeight: 1.7, color: 'rgba(245,240,232,0.45)', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {t('payServiceDesc', lang)}
            </div>
          </div>

          {/* Refund policy */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px 0' }}>{t('payRefundTitle', lang)}</h4>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              {['payRefund1', 'payRefund2', 'payRefund3', 'payRefund4'].map(k => (
                <li key={k} style={{ fontSize: '11.5px', lineHeight: 1.7, color: 'rgba(245,240,232,0.5)', marginBottom: '2px' }}>{t(k, lang)}</li>
              ))}
            </ul>
          </div>

          {/* Checkboxes */}
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            {/* Select all */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
              onClick={() => { const next = !allChecked; setPayChecks([next, next, next]); }}>
              <div style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '5px', border: allChecked ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.25)', background: allChecked ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                {allChecked && <span style={{ color: '#0A0E2A', fontSize: '14px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{t('payCheckAll', lang)}</span>
            </div>
            {['payCheck1', 'payCheck2', 'payCheck3'].map((k, i) => (
              <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                onClick={() => { const next = [...payChecks]; next[i] = !next[i]; setPayChecks(next); }}>
                <div style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '5px', border: payChecks[i] ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.25)', background: payChecks[i] ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', marginTop: '1px' }}>
                  {payChecks[i] && <span style={{ color: '#0A0E2A', fontSize: '14px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'rgba(245,240,232,0.75)' }}>{t(k, lang)}</span>
              </div>
            ))}
          </div>

          {/* Pay button */}
          <button
            disabled={!allChecked}
            onClick={() => {
              saveReadingToSession({ aiText, sajuResult, userData, appMode, timestamp: Date.now() });
              // TODO: 토스페이먼츠 연동 시 여기서 requestPayment 호출
              // 현재는 테스트 모드로 바로 별 충전
              updateStarBalance(starBalance + totalStars);
              setChargeStep('select');
              setPayChecks([false, false, false]);
              setSelectedCharge(null);
              alert(t('paySuccess', lang) + ' ⭐' + totalStars + t('payStarsAdded', lang));
            }}
            style={{
              width: '100%', padding: '16px', border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: '17px', fontWeight: 700, cursor: allChecked ? 'pointer' : 'not-allowed',
              background: allChecked ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'rgba(255,255,255,0.08)',
              color: allChecked ? '#0A0E2A' : 'rgba(245,240,232,0.3)',
              transition: 'all 0.2s', fontFamily: 'inherit', minHeight: '52px',
            }}
          >
            {selectedCharge.price + ' ' + t('payTestBtn', lang)}
          </button>

          <p style={{ textAlign: 'center', fontSize: '11.5px', color: 'rgba(245,240,232,0.4)', marginTop: '12px', lineHeight: 1.5 }}>
            {t('payNotice', lang)}
          </p>

          {/* Business info footer */}
          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', lineHeight: 1.8, color: 'rgba(245,240,232,0.25)' }}>
            <div style={{ fontWeight: 700, color: 'rgba(245,240,232,0.4)', marginBottom: '4px' }}>{t('payBusinessInfo', lang)}</div>
            <div>{businessInfo.companyName} | {lang === 'ko' ? '대표' : 'CEO'}: {businessInfo.ceoName}</div>
            <div>{lang === 'ko' ? '사업자등록번호' : 'Business No'}: {businessInfo.businessNumber}</div>
            <div>{lang === 'ko' ? '통신판매업' : 'Sales No'}: {businessInfo.salesNumber}</div>
            <div>{businessInfo.address}</div>
            <div>{lang === 'ko' ? '고객센터' : 'Support'}: {businessInfo.phone} | {businessInfo.email}</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(245,240,232,0.35)', textDecoration: 'underline', cursor: 'pointer' }}>{lang === 'ko' ? '이용약관' : 'Terms'}</a>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(245,240,232,0.35)', textDecoration: 'underline', cursor: 'pointer' }}>{lang === 'ko' ? '개인정보처리방침' : 'Privacy'}</a>
              <a href="/refund" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(245,240,232,0.35)', textDecoration: 'underline', cursor: 'pointer' }}>{lang === 'ko' ? '환불정책' : 'Refund'}</a>
            </div>
          </div>
        </div>
      );
    }

    /* ----- Select step (충전 옵션 선택) ----- */
    return (
      <div className="inner screen-enter" style={{ paddingTop: '40px' }}>
        <button className="back-btn" onClick={() => setCurrentScreen(0)}>{t('backBtn', lang)}</button>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px', animation: 'float 3s ease-in-out infinite' }}>⭐</div>
          <h2 className="gradient-text" style={{ marginBottom: '8px' }}>{t('starShopTitle', lang)}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)' }}>{t('starShopSubtitle', lang)}</p>
        </div>
        <div className="card card-glow" style={{ textAlign: 'center', marginBottom: '16px', padding: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '4px' }}>{t('currentStarsLabel', lang)}</p>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#F6C443' }}>⭐ {starBalance}{t('starUnit', lang)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {chargeOpts.map((opt, i) => (
            <div key={i} className="card" style={{
              padding: '20px', position: 'relative',
              border: opt.popular ? '2px solid rgba(240,199,94,0.5)' : opt.best ? '2px solid rgba(159,122,234,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: opt.popular ? 'linear-gradient(135deg, rgba(240,199,94,0.1), rgba(255,208,128,0.05))' : opt.best ? 'linear-gradient(135deg, rgba(159,122,234,0.1), rgba(196,181,253,0.05))' : undefined,
            }}>
              {opt.popular && (
                <div style={{ position: 'absolute', top: '-10px', right: '16px', background: 'linear-gradient(135deg, #F0C75E, #E8B030)', color: '#0A0E2A', fontSize: '11px', fontWeight: 800, padding: '3px 12px', borderRadius: '10px' }}>BEST</div>
              )}
              {opt.best && (
                <div style={{ position: 'absolute', top: '-10px', right: '16px', background: 'linear-gradient(135deg, #9F7AEA, #7C3AED)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 12px', borderRadius: '10px' }}>PREMIUM</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '2px' }}>{opt.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{opt.note}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#F6C443' }}>⭐ {opt.stars}{t('starUnit', lang)}</div>
                  {opt.bonus > 0 && <div style={{ fontSize: '12px', color: '#2ED573', fontWeight: 700 }}>+{opt.bonus} {t('bonusLabel', lang)}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{opt.price}</span>
                <button className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '15px' }} onClick={() => {
                  setSelectedCharge(opt);
                  setPayChecks([false, false, false]);
                  setChargeStep('confirm');
                }}>{t('chargeBtn', lang)}</button>
              </div>
              <div style={{ textAlign: 'right', marginTop: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>{t('starPrice', lang)}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: '8px', fontWeight: 700, color: 'var(--text)' }}>{t('starShopInfo1', lang)}</p>
          <p style={{ marginBottom: '8px' }}>{t('starShopInfo2', lang)}</p>
          <p style={{ fontSize: '11px', opacity: 0.5 }}>{t('testVersionNotice', lang)}</p>
        </div>
      </div>
    );
  }

  /* ===== RENDER ===== */
  return (
    <>
      <StarsBackground />
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100, display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Star charge nav hidden — coming soon */}
        <button
          onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
          aria-label={lang === 'ko' ? 'Switch to English' : '한국어로 전환'}
          style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px', padding: '10px 14px', fontSize: '13px', fontWeight: 700,
            color: 'var(--text)', cursor: 'pointer', minHeight: '44px'
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
        <Footer />
      </div>
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
