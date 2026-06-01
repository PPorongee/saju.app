// Fortune Questions Verdict V1 — 생성 오케스트레이터. 단일 GPT 호출, 실패해도 null(메인 리포트 무영향).
import { buildFortuneVerdictPrompt } from './fortuneVerdictPromptBuilder';
import { sanitizeMedicalAdvice, sanitizeFearBased } from '../yearly/yearlySanitizer';
import { sanitizeFinancialAdviceRisk } from '../narrative/narrativeSanitizer';
import type {
  FortuneVerdict, FortuneVerdictEvidence, Verdict, VerdictStrength, BreakthroughTiming,
} from './fortuneVerdictTypes';

export type FortuneVerdictTextCaller = (system: string, user: string, maxTokens: number) => Promise<string>;
export interface GenerateFortuneVerdictOptions { sanitize?: (text: string) => string; disclaimer?: string; }

const STRENGTHS: VerdictStrength[] = ['strong', 'moderate', 'weak', 'not_prominent'];
const NEW_ROMANCE = /새(로운)?\s*(인연|사람|연애|이성)|새로운\s*만남|연애운|이성과의\s*만남|썸|소개팅/;
const PREG_RISKY = /출산일|출산\s*시간|택일|순산|난산|조산|유산|남아|여아|남자아이|여자아이|공주님?|왕자님?|(?:딸|아들)\s*(?:입니다|이에요|예요|일|느낌|기운|같|쪽)|성별(?:은|는|을|를|이|\s)|(?:건강|순조|무사)(?:하게|롭게)?\s*(?:태어|출산|분만|자랄)|아이가\s*\d|자녀가\s*\d|\d\s*명(?:의\s*자녀)?/;

function cleanFiller(t: string): string {
  return t
    .replace(/가능성이\s*(큽니다|높습니다|많습니다|큼|높음)/g, '흐름이 뚜렷합니다')
    .replace(/가능성이\s*(높|크|커|많)\S*/g, '흐름이 뚜렷합니다')
    .replace(/가능성이\s*있/g, '흐름이 있')
    .replace(/(중요|필요)합니다/g, '관건입니다').replace(/(중요|필요)해요/g, '관건이에요').replace(/(중요|필요)하며/g, '관건이며').replace(/(중요|필요)한\s/g, '핵심 ')
    .replace(/필수적입니다|필수입니다/g, '관건입니다').replace(/필수적인/g, '핵심').replace(/절실(하|한)/g, '꼭 필요$1')
    .replace(/공부\s*목표를?\s*명확히\S*/g, '방향을 좁히는 흐름').replace(/문서를?\s*꼼꼼히\s*확인\S*/g, '조건을 따지는 흐름')
    .replace(/소통을?\s*(원활히|늘리세요|늘려야|강화하세요|강화해야)/g, '역할을 다시 정해야').replace(/소통하세요/g, '역할을 다시 정하세요')
    .replace(/생활\s*패턴을?\s*점검\S*/g, '동선을 다시 짜는 흐름').replace(/점검하세요/g, '다시 따지세요').replace(/점검하는\s*것이/g, '다시 따지는 것이')
    .replace(/긍정적으로\s*대응\S*/g, '차분히 대응').replace(/(기회를?\s*잘\s*)?활용해\s*보세요/g, '써 보세요').replace(/잘\s*활용하면/g, '잘 살리면').replace(/활용하면/g, '살리면').replace(/활용하세요/g, '써야 합니다')
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
    o = cleanFiller(o);
    return o;
  };
  // 주의: 재물·투자 "성향 판정"은 살려야 하므로 '투자' 단어 자체는 보존(매수/매도 지시만 financial sanitizer가 처리).
  const s = (v: any): string => (typeof v === 'string' && v.trim() ? scrub(sanitize(v)).trim() : '');
  const sArr = (v: any): string[] => (Array.isArray(v) ? v : []).map(s).filter(Boolean);

  const prompt = buildFortuneVerdictPrompt(ev);
  let raw = '';
  try { raw = await callText(prompt.system, prompt.user, prompt.maxTokens); } catch { return null; }
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== 'object') return null;

  const lead = s(parsed.lead);
  let verdicts: Verdict[] = (Array.isArray(parsed.verdicts) ? parsed.verdicts : []).map((v: any) => ({
    question: s(v?.question),
    verdict: s(v?.verdict),
    strength: STRENGTHS.includes(v?.strength) ? v.strength : 'moderate',
    timing: s(v?.timing),
    basis: s(v?.basis),
    whatItLooksLike: s(v?.whatItLooksLike),
    caution: s(v?.caution),
  })).filter((v: Verdict) => v.question || v.verdict);

  // 기혼: 신규 연애 판정 제거. 임산부: 출산/성별/수 예측 판정 제거.
  if (ev.relationshipStatus === 'married') verdicts = verdicts.filter(v => !NEW_ROMANCE.test(`${v.question} ${v.verdict} ${v.whatItLooksLike}`));
  if (ev.mode === 'pregnancy') verdicts = verdicts.filter(v => !PREG_RISKY.test(JSON.stringify(v)));
  verdicts = verdicts.slice(0, 10);

  if (!lead || verdicts.length < 2) return null;

  let bt: BreakthroughTiming = { summary: '' };
  if (parsed.breakthroughTiming && typeof parsed.breakthroughTiming === 'object') {
    const b = parsed.breakthroughTiming;
    bt = { summary: s(b.summary) };
    const acc = s(b.accumulationPhase); if (acc) bt.accumulationPhase = acc;
    const exp = s(b.expansionPhase); if (exp) bt.expansionPhase = exp;
    const cau = s(b.cautionPhase); if (cau) bt.cautionPhase = cau;
  }

  const out: FortuneVerdict = {
    mode: ev.mode,
    title: s(parsed.title) || defaultTitle(ev.mode),
    lead,
    verdicts,
    breakthroughTiming: bt,
    closing: s(parsed.closing),
  };
  if (opts.disclaimer) out.disclaimer = opts.disclaimer;
  return out;
}

function defaultTitle(mode: FortuneVerdictMode): string {
  switch (mode) {
    case 'personal': return '인생 큰 질문 판정서';
    case 'yearly': return '올해 큰 질문 판정';
    case 'compat': return '이 관계, 어디까지 가는가';
    case 'pregnancy': return '자녀·가족운 판정';
  }
}
type FortuneVerdictMode = FortuneVerdictEvidence['mode'];
