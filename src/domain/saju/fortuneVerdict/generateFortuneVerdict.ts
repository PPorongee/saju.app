// Fortune Questions Verdict V1 — 생성 오케스트레이터 (줄글형). 단일 GPT 호출, 실패해도 null.
import { buildFortuneVerdictPrompt } from './fortuneVerdictPromptBuilder';
import { sanitizeMedicalAdvice, sanitizeFearBased } from '../yearly/yearlySanitizer';
import { sanitizeFinancialAdviceRisk } from '../narrative/narrativeSanitizer';
import type { FortuneVerdict, FortuneVerdictEvidence, FortuneNarrativeSection } from './fortuneVerdictTypes';

export type FortuneVerdictTextCaller = (system: string, user: string, maxTokens: number) => Promise<string>;
export interface GenerateFortuneVerdictOptions { sanitize?: (text: string) => string; disclaimer?: string; }

const NEW_ROMANCE = /새(로운)?\s*(인연|사람|연애|이성)|새로운\s*만남|연애운|이성과의\s*만남|썸|소개팅/;
const PREG_RISKY = /출산일|출산\s*시간|택일|순산|난산|조산|유산|남아|여아|남자아이|여자아이|공주님?|왕자님?|(?:딸|아들)\s*(?:입니다|이에요|예요|일|느낌|기운|같|쪽)|성별(?:은|는|을|를|이|\s)|(?:건강|순조|무사)(?:하게|롭게)?\s*(?:태어|출산|분만|자랄)|아이가\s*\d|자녀가\s*\d|\d\s*명(?:의\s*자녀)?/;

// 판정표 라벨이 본문에 새어나오면 제거(줄글만 남김).
function stripLabels(t: string): string {
  return t
    .replace(/(^|[\s.!?])Q\s*\.\s*/g, '$1')
    .replace(/판정\s*[:：]\s*(강함|보통|약함|두드러지지\s*않음|강하다|약하다)\s*[.。·]?\s*/g, '')
    .replace(/(^|\n|[.!?]\s*)근거\s*[·:：]\s*/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function cleanFiller(t: string): string {
  let o = t
    .replace(/가능성이\s*(큽니다|높습니다|많습니다|큼|높음)/g, '흐름이 뚜렷합니다')
    .replace(/가능성이\s*(높|크|커|많)\S*/g, '흐름이 뚜렷합니다')
    .replace(/가능성이\s*있/g, '흐름이 있');
  // 중요/필요/필수 단정명사 → 동의어 회전(반복 단조로움 완화)
  let i = 0; const syn = ['관건입니다', '핵심입니다', '갈림이 됩니다', '승부처입니다'];
  o = o.replace(/(중요|필요|필수적|필수)합니다/g, () => syn[i++ % syn.length]);
  o = o
    .replace(/(중요|필요)해요/g, '관건이에요').replace(/(중요|필요|필수적)(하며|하고|이며|이고)/g, '핵심$2')
    .replace(/(중요|필요)한\s/g, '핵심 ').replace(/필수적인/g, '핵심')
    .replace(/신중하게\s*(결정|접근|다루|다뤄)\S*/g, '조건을 따져 결정').replace(/신중한\s*결정/g, '조건을 따진 결정').replace(/주의하세요/g, '눈여겨봐야 합니다');
  return o
    .replace(/신중하게\s*결정\S*/g, '조건을 따져 결정').replace(/주의하세요/g, '눈여겨봐야 합니다')
    .replace(/소통이?\s*원활\S*/g, '역할이 정리되어야').replace(/소통을?\s*(늘리세요|늘려야|강화\S*)/g, '역할을 다시 정해야').replace(/소통하세요/g, '역할을 다시 정하세요')
    .replace(/(공부\s*)?목표를?\s*명확히\S*/g, '방향을 좁히는 흐름').replace(/문서를?\s*꼼꼼히\s*확인\S*/g, '조건을 따지는 흐름')
    .replace(/생활\s*패턴을?\s*점검\S*/g, '동선을 다시 짜는 흐름').replace(/점검하세요/g, '다시 따지세요').replace(/점검하는\s*것이/g, '다시 따지는 것이')
    .replace(/긍정적으로\s*대응\S*/g, '차분히 대응').replace(/활용해\s*보세요/g, '써 보세요').replace(/잘\s*활용하면/g, '잘 살리면').replace(/활용하면/g, '살리면').replace(/활용하세요/g, '써야 합니다')
    .replace(/무리하지\s*마세요/g, '속도를 늦추세요').replace(/스트레칭/g, '가벼운 산책').replace(/명상/g, '호흡 정리')
    .replace(/ {2,}/g, ' ').trim();
}

function parseJson(raw: string): any | null {
  if (!raw) return null;
  const s = raw.trim().replace(/```(?:json)?/gi, '').trim();
  const first = s.indexOf('{'), last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}

export async function generateFortuneVerdict(
  ev: FortuneVerdictEvidence,
  callText: FortuneVerdictTextCaller,
  opts: GenerateFortuneVerdictOptions = {},
): Promise<FortuneVerdict | null> {
  const sanitize = opts.sanitize ?? ((t: string) => t);
  const scrub = (t: string) => {
    let o = t.replace(/(반드시|무조건|틀림없이|100\s*%|필연적으로|분명히)\s*/g, '').replace(/ {2,}/g, ' ');
    o = sanitizeFearBased(sanitizeMedicalAdvice(o));
    o = sanitizeFinancialAdviceRisk(o);
    o = o.replace(/투자\s*수익(률)?/g, '수익 구조').replace(/투자를/g, '자금 운용을').replace(/투자나/g, '자금 운용이나').replace(/펀드/g, '자금 운용');
    o = stripLabels(cleanFiller(o));
    return o;
  };
  const s = (v: any): string => (typeof v === 'string' && v.trim() ? scrub(sanitize(v)).trim() : '');
  const sArr = (v: any): string[] => (Array.isArray(v) ? v : []).map(s).filter(Boolean);

  const prompt = buildFortuneVerdictPrompt(ev);
  let raw = '';
  try { raw = await callText(prompt.system, prompt.user, prompt.maxTokens); } catch { return null; }
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== 'object') return null;

  const lead = s(parsed.lead);
  const married = ev.relationshipStatus === 'married';
  const preg = ev.mode === 'pregnancy';
  const paraOk = (p: string) => !(married && NEW_ROMANCE.test(p)) && !(preg && PREG_RISKY.test(p));

  let sections: FortuneNarrativeSection[] = (Array.isArray(parsed.sections) ? parsed.sections : [])
    .map((sec: any) => ({ title: s(sec?.title), body: sArr(sec?.body).filter(paraOk) }))
    .filter((sec: FortuneNarrativeSection) => sec.body.length > 0)
    .slice(0, 8);

  const totalParas = sections.reduce((a, sec) => a + sec.body.length, 0);
  if (!lead || sections.length < 2 || totalParas < 3) return null;

  const out: FortuneVerdict = {
    mode: ev.mode,
    title: s(parsed.title) || defaultTitle(ev.mode),
    lead,
    sections,
    closing: s(parsed.closing),
  };
  const ts = s(parsed.timingSummary);
  if (ts) out.timingSummary = ts;
  if (opts.disclaimer) out.disclaimer = opts.disclaimer;
  return out;
}

function defaultTitle(mode: FortuneVerdictMode): string {
  switch (mode) {
    case 'personal': return '사주가 말하는 당신의 큰 운';
    case 'yearly': return '올해, 사주가 말하는 것';
    case 'compat': return '두 사람, 사주가 말하는 것';
    case 'pregnancy': return '엄마와 아이, 사주가 말하는 것';
  }
}
type FortuneVerdictMode = FortuneVerdictEvidence['mode'];
