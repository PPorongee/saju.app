// Event Forecast V1 — 생성 오케스트레이터. 단일 GPT 호출, 실패해도 null(메인 리포트 무영향).
import { buildEventForecastPrompt } from './eventForecastPromptBuilder';
// 모드 sanitizer가 못 잡는 의료/공포/금융을 한 번 더(검증된 sanitizer 재사용, defense in depth).
// 주의: sanitizeDeterministicFuture는 "~수 있어요"로 문장을 흐리게 만들어 사건 예보의 선명도를 떨어뜨리므로
//       전체 적용하지 않고, 단정 부사만 제거(softenAbsolutes)한다. (사건 단정 동사는 모드 sanitizer가 처리.)
import { sanitizeMedicalAdvice, sanitizeFearBased } from '../yearly/yearlySanitizer';
import { sanitizeFinancialAdviceRisk } from '../narrative/narrativeSanitizer';
import type {
  EventForecast, EventForecastEvidence, EventCard, TimingMap, EventType, EventLikelihood,
} from './eventForecastTypes';

export type EventForecastTextCaller = (system: string, user: string, maxTokens: number) => Promise<string>;
export interface GenerateEventForecastOptions {
  sanitize?: (text: string) => string;
  disclaimer?: string;
}

const EVENT_TYPES: EventType[] = ['relationship', 'career', 'money', 'business', 'study', 'family', 'move', 'health_rhythm', 'collaboration', 'decision'];
const LIKELIHOODS: EventLikelihood[] = ['strong', 'moderate', 'subtle'];

function parseJson(raw: string): any | null {
  if (!raw) return null;
  const s = raw.trim().replace(/```(?:json)?/gi, '').trim();
  const first = s.indexOf('{'), last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}

export async function generateEventForecast(
  ev: EventForecastEvidence,
  callText: EventForecastTextCaller,
  opts: GenerateEventForecastOptions = {},
): Promise<EventForecast | null> {
  const sanitize = opts.sanitize ?? ((t: string) => t);
  const scrub = (t: string) => {
    // 1) 단정 부사만 제거(개념·선명도 보존). 2) 공포·의료. 3) 금융(전 모드 공통 sanitizer + 투자/펀드 잔여).
    let o = t.replace(/(반드시|무조건|틀림없이|100\s*%|필연적으로|분명히|꼭)\s*/g, '').replace(/ {2,}/g, ' ');
    o = sanitizeFearBased(sanitizeMedicalAdvice(o));
    o = sanitizeFinancialAdviceRisk(o);
    o = o.replace(/투자\s*수익(률)?/g, '수익 구조')
         .replace(/투자자/g, '재정·사업 파트너').replace(/투자처/g, '거래처')
         .replace(/재투자/g, '자금 재투입').replace(/투자/g, '자금 운용').replace(/펀드/g, '자금 운용');
    return o;
  };
  const s = (v: any): string => (typeof v === 'string' && v.trim() ? scrub(sanitize(v)).trim() : '');
  const sArr = (v: any): string[] => (Array.isArray(v) ? v : []).map(s).filter(Boolean);

  const prompt = buildEventForecastPrompt(ev);
  let raw = '';
  try { raw = await callText(prompt.system, prompt.user, prompt.maxTokens); } catch { return null; }
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== 'object') return null;

  let summary = s(parsed.summary);
  const cardsRaw = Array.isArray(parsed.eventCards) ? parsed.eventCards : [];
  let eventCards: EventCard[] = cardsRaw.map((c: any) => {
    const type: EventType = EVENT_TYPES.includes(c?.type) ? c.type : 'decision';
    const likelihood: EventLikelihood = LIKELIHOODS.includes(c?.likelihood) ? c.likelihood : 'subtle';
    const card: EventCard = {
      type, likelihood,
      title: s(c?.title),
      timeWindow: s(c?.timeWindow),
      eventScene: s(c?.eventScene),
      whyThisAppears: s(c?.whyThisAppears),
      goodIf: sArr(c?.goodIf),
      carefulIf: sArr(c?.carefulIf),
      howToUse: s(c?.howToUse),
    };
    const person = s(c?.personOrSituation);
    if (person) card.personOrSituation = person;
    return card;
  }).filter((c: EventCard) => c.title || c.eventScene);

  // 임산부: 출산/택일/건강·성별 "예측" 결이 든 카드만 제거(전체 폐기 대신 카드 단위), summary 위험 시 비움.
  if (ev.mode === 'pregnancy') {
    const RISKY = /출산일|출산\s*시간|택일|순산|난산|조산|유산|남아|여아|남자아이|여자아이|공주님?|왕자님?|(?:딸|아들)\s*(?:입니다|이에요|예요|일|느낌|기운|같|쪽)|성별(?:은|는|을|를|이|\s)|(?:건강|순조|무사)(?:하게|롭게)?\s*(?:태어|출산|분만|자랄)/;
    eventCards = eventCards.filter(c => !RISKY.test(JSON.stringify(c)));
    if (RISKY.test(summary)) summary = '';
  }

  // 최소 품질 게이트: summary + 카드 1개 이상 없으면 부착 안 함.
  if (!summary || eventCards.length === 0) return null;

  // timingMap window는 실제 계산된 signal window에 속한 것만 허용(환각 시기 차단).
  const sigWindows = ev.signals.map(x => x.window).filter(Boolean);
  const sigYears = new Set(sigWindows.flatMap(w => w.match(/\d{4}/g) ?? []));
  const okWindow = (w: string): boolean => {
    if (!w) return false;
    const wy = w.match(/\d{4}/g) ?? [];
    if (wy.length) return wy.some(y => sigYears.has(y));
    return sigWindows.some(sw => sw.includes(w) || w.includes(sw));
  };
  const winArr = (v: any): string[] => sArr(v).filter(okWindow);

  let timingMap: TimingMap | undefined;
  if (parsed.timingMap && typeof parsed.timingMap === 'object') {
    const t = parsed.timingMap;
    timingMap = {
      pushWindows: winArr(t.pushWindows), cautionWindows: winArr(t.cautionWindows), preparationWindows: winArr(t.preparationWindows),
    };
    const rel = winArr(t.relationshipWindows); if (rel.length) timingMap.relationshipWindows = rel;
    const mon = winArr(t.moneyWindows); if (mon.length) timingMap.moneyWindows = mon;
    const car = winArr(t.careerWindows); if (car.length) timingMap.careerWindows = car;
    // 전부 비면 생략
    if (!timingMap.pushWindows.length && !timingMap.cautionWindows.length && !timingMap.preparationWindows.length
      && !timingMap.relationshipWindows && !timingMap.moneyWindows && !timingMap.careerWindows) timingMap = undefined;
  }

  const forecast: EventForecast = {
    mode: ev.mode,
    headline: s(parsed.headline) || defaultHeadline(ev.mode),
    summary,
    eventCards,
    watchSigns: sArr(parsed.watchSigns),
    avoidPatterns: sArr(parsed.avoidPatterns),
  };
  if (timingMap) forecast.timingMap = timingMap;
  if (opts.disclaimer) forecast.disclaimer = opts.disclaimer;

  return forecast;
}

function defaultHeadline(mode: EventForecastMode): string {
  switch (mode) {
    case 'personal': return '운의 사건 예보';
    case 'yearly': return '올해의 사건 타이밍';
    case 'compat': return '관계의 전개 포인트';
    case 'pregnancy': return '엄마를 편하게 하는 흐름';
  }
}

type EventForecastMode = EventForecastEvidence['mode'];
