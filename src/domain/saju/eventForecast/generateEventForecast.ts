// Life Event Forecast V1 — 생성 오케스트레이터. 단일 GPT 호출, 실패해도 null(메인 리포트 무영향).
import { buildEventForecastPrompt } from './eventForecastPromptBuilder';
import { sanitizeMedicalAdvice, sanitizeFearBased } from '../yearly/yearlySanitizer';
import { sanitizeFinancialAdviceRisk } from '../narrative/narrativeSanitizer';
import type {
  EventForecast, EventForecastEvidence, MajorEvent, LifeEventType,
} from './eventForecastTypes';

export type EventForecastTextCaller = (system: string, user: string, maxTokens: number) => Promise<string>;
export interface GenerateEventForecastOptions {
  sanitize?: (text: string) => string;
  disclaimer?: string;
}

const EVENT_TYPES: LifeEventType[] = ['move', 'work_change', 'money', 'contract', 'real_estate', 'relationship', 'family_child', 'business', 'study_document', 'health_rhythm', 'legal_admin', 'other'];

// 기혼자에게 금지되는 신규 연애 표현.
const NEW_ROMANCE = /새(로운)?\s*(인연|사람|연애|이성)|새로운\s*만남|연애운|이성과의\s*만남|썸|소개팅/;
// 무료 운세/자기계발 필러를 "문법 보존" 치환으로 제거(문장 자르기 금지 — 깨짐 방지).
function cleanFiller(t: string): string {
  return t
    .replace(/가능성이\s*있/g, '수 있')
    .replace(/가능성이\s*(높|크|커|많)\S*/g, '흐름이 뚜렷합니다')
    .replace(/(중요|필요)합니다/g, '관건입니다')
    .replace(/(중요|필요)해요/g, '관건이에요')
    .replace(/(중요|필요)하며/g, '관건이며')
    .replace(/(중요|필요)한\s/g, '핵심 ')
    .replace(/무리하지\s*마세요/g, '속도를 늦추세요')
    .replace(/소통을?\s*(늘리세요|늘려야|강화하세요|강화해야|강조해야)/g, '역할을 다시 정해야')
    .replace(/소통하세요/g, '역할을 다시 정하세요')
    .replace(/생활\s*패턴을?\s*점검\S*/g, '동선을 다시 짜세요')
    .replace(/점검하세요/g, '다시 따지세요')
    .replace(/점검하는\s*것이/g, '다시 따지는 것이')
    .replace(/활용해\s*보세요/g, '써 보세요')
    .replace(/(기회를?\s*잘\s*)?활용하세요/g, '써야 합니다')
    .replace(/잘\s*활용하면/g, '잘 살리면').replace(/활용하면/g, '살리면').replace(/활용하여/g, '살려').replace(/활용하는\s*것이/g, '살리는 것이')
    .replace(/소통을?\s*(늘리면|늘려야|늘리는)/g, '연락 주기를 정하면')
    .replace(/작은\s*합의를/g, '생활 기준을').replace(/작은\s*합의들?이/g, '생활 기준이').replace(/작은\s*합의/g, '생활 기준')
    .replace(/긍정적으로\s*대응/g, '차분히 대응')
    .replace(/열린\s*마음으로/g, '담담하게')
    .replace(/팀워크/g, '역할 분담')
    .replace(/커뮤니케이션을?\s*늘\S*/g, '역할을 다시 정해야')
    .replace(/스트레칭/g, '가벼운 산책')
    .replace(/명상/g, '호흡 정리')
    .replace(/하루\s*목표를?\s*세우\S*/g, '하루 우선순위를 정하기')
    .replace(/ {2,}/g, ' ')
    .trim();
}

// 임산부 위험(출산 시기/건강/성별 예측).
const PREG_RISKY =/출산일|출산\s*시간|택일|순산|난산|조산|유산|남아|여아|남자아이|여자아이|공주님?|왕자님?|(?:딸|아들)\s*(?:입니다|이에요|예요|일|느낌|기운|같|쪽)|성별(?:은|는|을|를|이|\s)|(?:건강|순조|무사)(?:하게|롭게)?\s*(?:태어|출산|분만|자랄)/;

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
    // 단정 부사만 제거(선명도 보존) → 공포·의료 → 금융(전 모드 공통 + 투자/펀드 잔여).
    let o = t.replace(/(반드시|무조건|틀림없이|100\s*%|필연적으로|분명히|꼭)\s*/g, '').replace(/ {2,}/g, ' ');
    o = sanitizeFearBased(sanitizeMedicalAdvice(o));
    o = sanitizeFinancialAdviceRisk(o);
    o = o.replace(/투자\s*수익(률)?/g, '수익 구조')
         .replace(/투자자/g, '재정·사업 파트너').replace(/투자처/g, '거래처').replace(/재투자/g, '자금 재투입')
         .replace(/투자를/g, '자금 운용을').replace(/투자나/g, '자금 운용이나').replace(/투자가/g, '자금 운용이')
         .replace(/투자/g, '자금 운용').replace(/펀드/g, '자금 운용');
    o = cleanFiller(o); // 무료운세/자기계발 필러 문법 보존 치환(품질 백스톱)
    return o;
  };
  const s = (v: any): string => (typeof v === 'string' && v.trim() ? scrub(sanitize(v)).trim() : '');
  const sArr = (v: any): string[] => (Array.isArray(v) ? v : []).map(s).filter(Boolean);

  const prompt = buildEventForecastPrompt(ev);
  let raw = '';
  try { raw = await callText(prompt.system, prompt.user, prompt.maxTokens); } catch { return null; }
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== 'object') return null;

  const lead = s(parsed.lead);
  const eventNarrative = sArr(parsed.eventNarrative);

  let majorEvents: MajorEvent[] = (Array.isArray(parsed.majorEvents) ? parsed.majorEvents : []).map((m: any) => {
    const eventType: LifeEventType = EVENT_TYPES.includes(m?.eventType) ? m.eventType : 'other';
    return {
      timeWindow: s(m?.timeWindow),
      title: s(m?.title),
      eventType,
      forecast: s(m?.forecast),
      scene: s(m?.scene),
      signalBasis: s(m?.signalBasis),
      decisionAdvice: s(m?.decisionAdvice),
    };
  }).filter((m: MajorEvent) => m.title || m.forecast);

  // 기혼: 신규 연애 사건 카드 제거(배우자/가족만 허용).
  if (ev.relationshipStatus === 'married') {
    majorEvents = majorEvents.filter(m => !NEW_ROMANCE.test(`${m.title} ${m.forecast} ${m.scene}`));
  }
  // 임산부: 출산 시기/건강/성별 예측 카드 제거.
  if (ev.mode === 'pregnancy') {
    majorEvents = majorEvents.filter(m => !PREG_RISKY.test(JSON.stringify(m)));
  }
  // 최대 5개로 제한(올해운세 3~5 허용).
  majorEvents = majorEvents.slice(0, 5);

  // 최소 품질 게이트: lead + majorEvent 1개 이상.
  if (!lead || majorEvents.length === 0) return null;

  const forecast: EventForecast = {
    mode: ev.mode,
    title: s(parsed.title) || defaultTitle(ev.mode),
    lead,
    eventNarrative,
    majorEvents,
    closing: s(parsed.closing),
  };
  if (opts.disclaimer) forecast.disclaimer = opts.disclaimer;
  return forecast;
}

function defaultTitle(mode: EventForecastMode): string {
  switch (mode) {
    case 'personal': return '앞으로 들어올 큰 변화';
    case 'yearly': return '올해의 사건 타이밍';
    case 'compat': return '이 관계에서 들어올 사건들';
    case 'pregnancy': return '엄마를 편하게 하는 흐름';
  }
}

type EventForecastMode = EventForecastEvidence['mode'];
