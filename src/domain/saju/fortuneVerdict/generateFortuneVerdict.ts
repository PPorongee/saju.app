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
  // 확신 강조("~할 가능성이 큽니다" 류) → 동사형 회전. 단일 문구로 collapse하면 새 도장이 되므로 5종 순환.
  // 3차→4차 평가서 "흐름이 뚜렷합니다"가 한 문구 collapse 탓에 케이스마다 2~3회 반복돼 새 클리셰가 됨 → 회전으로 분산.
  // 전부 명사·동사 선행 양쪽에서 자연스러워야 함("게 거의 정해져 있습니다"는 명사 뒤에서 깨져 제외).
  const cap = ['공산이 큽니다', '쪽이 우세합니다', '수순으로 갑니다', '쪽으로 기웁니다', '쪽으로 가닥이 잡힙니다'];
  let k = (t.length >> 1) % cap.length;
  let o = t
    .replace(/가능성이\s*(큽니다|높습니다|많습니다|큼|높음)/g, () => cap[k++ % cap.length])
    .replace(/가능성이\s*(높|크|커|많)[가-힣]*/g, () => cap[k++ % cap.length])
    .replace(/흐름이\s*뚜렷(합니다|해집니다|해졌습니다)/g, () => cap[k++ % cap.length]) // GPT가 직접 쓰거나 이전 변환이 남긴 잔여 도장
    .replace(/가능성이\s*있/g, '흐름이 있');
  // 중요/필요/필수/관건 추상명사 도장 → 동사형 회전(한 형태가 반복돼 새 클리셰가 되지 않게 5종 순환).
  // 1차 평가서 "갈림입니다"가 한 리포트 4회 반복돼 새 노잼이 됨 → 프롬프트가 원천을 줄이고, 여기선 잔량만 변주 제거.
  // 전부 "이게 결정적/먼저다"는 긍정-단정 의미를 보존해야 함("부담이 됩니다" 류는 의미 반전이라 금지).
  const syn = ['먼저입니다', '나중에 표가 납니다', '뒤로 밀수록 비싸집니다', '몇 년을 좌우합니다', '당신 몫입니다'];
  let i = t.length % syn.length; // 필드별 시작 오프셋 + 매칭마다 i++ → 인접 반복 차단
  o = o.replace(/(중요|필요|필수적|필수|관건)합니다/g, () => syn[i++ % syn.length]);
  o = o
    .replace(/(중요|필요|관건)해요/g, '갈림이에요')
    .replace(/(중요|필요|필수적|관건)(하며|이며)/g, '핵심이며').replace(/(중요|필요|필수적|관건)(하고|이고)/g, '핵심이고')
    .replace(/(중요|필요)한\s(?!것|건|게|거)/g, '핵심 ').replace(/필수적인/g, '핵심')
    .replace(/핵심\s+(것은|건)/g, '핵심은').replace(/핵심\s+것이/g, '핵심이').replace(/핵심\s+것을/g, '핵심을')
    // 노잼 표현 펀치 교체
    .replace(/안정적으로\s*쌓이는\s*구조입니다/g, '오래 쥐고 갈 때 붙는 구조입니다')
    .replace(/조율하는\s*것이\s*핵심[가-힣]*/g, '역할을 나누는 데서 갈립니다').replace(/조율이\s*핵심[가-힣]*/g, '역할 배분에서 갈립니다')
    .replace(/전략적으로\s*준비한다면/g, '지금 판을 깔아두면').replace(/전략적으로\s*준비/g, '판을 깔아두는').replace(/전략적으로\s*접근[가-힣]*/g, '먼저 틀을 잡고 들어가야')
    .replace(/종합적으로\s*고려[가-힣]*/g, '함께 보면').replace(/집중할\s*수\s*있는\s*시기입니다/g, '판을 까는 시기입니다')
    .replace(/유리합니다/g, '낫습니다').replace(/유리한\s/g, '나은 ').replace(/유리할\s*것[가-힣]*/g, '나을 것입니다')
    .replace(/유리하며/g, '낫고').replace(/유리하고/g, '낫고').replace(/유리하다/g, '낫다').replace(/유리하게/g, '낫게')
    .replace(/유리하므로/g, '나으므로').replace(/유리하면/g, '나으면').replace(/유리하니까?/g, '나으니').replace(/유리해서/g, '나아서').replace(/유리하지/g, '낫지').replace(/유리해(?![\s가-힣])/g, '낫다')
    // 권유·비교체 잔재 제거(평가서 지적: 현명합니다/바람직합니다)
    .replace(/현명합니다/g, '맞습니다').replace(/현명한\s/g, '맞는 ').replace(/현명하게/g, '확실하게').replace(/현명할/g, '맞을')
    .replace(/바람직합니다/g, '맞습니다').replace(/바람직하며/g, '맞고').replace(/바람직한\s/g, '맞는 ').replace(/바람직하다/g, '맞다')
    // 부사만 치환하고 뒤따르는 동사는 그대로 둔다(어미 잘림 방지: "신중하게 결정해 나가다"→"조건을 따져 결정해 나가다")
    .replace(/신중하게/g, '조건을 따져').replace(/신중히/g, '조건을 따져').replace(/신중한/g, '조건을 따진').replace(/주의하세요/g, '다시 따져야 합니다');
  return o
    .replace(/주의하세요/g, '다시 따져야 합니다')
    .replace(/소통이?\s*원활[가-힣]*/g, '역할이 정리되어야').replace(/소통을?\s*(늘리세요|늘려야|강화[가-힣]*)/g, '역할을 다시 정해야').replace(/소통하세요/g, '역할을 다시 정하세요')
    .replace(/(공부\s*)?목표를?\s*명확히[가-힣]*/g, '방향을 좁히는 흐름').replace(/문서를?\s*꼼꼼히\s*확인[가-힣]*/g, '조건을 따지는 흐름')
    .replace(/생활\s*패턴을?\s*점검[가-힣]*/g, '동선을 다시 짜는 흐름').replace(/점검하세요/g, '다시 따지세요').replace(/점검하는\s*것이/g, '다시 따지는 것이')
    .replace(/긍정적으로\s*대응[가-힣]*/g, '차분히 대응').replace(/활용해\s*보세요/g, '써 보세요').replace(/잘\s*활용하면/g, '잘 살리면').replace(/활용하면/g, '살리면').replace(/활용하세요/g, '써야 합니다')
    .replace(/활용하여/g, '살려').replace(/활용하는/g, '살리는').replace(/활용한\s/g, '살린 ').replace(/활용할/g, '살릴').replace(/활용해서/g, '살려서').replace(/활용해(?![\s가-힣])/g, '살려')
    .replace(/무리하지\s*마세요/g, '속도를 늦추세요').replace(/스트레칭/g, '가벼운 산책').replace(/명상/g, '호흡 정리')
    // Final Polish V1 — 금전 보장·금융 리스크 과격 표현 완화(판정은 유지, 보장/지시 어감만 제거)
    .replace(/통장\s*자릿수를?\s*(한\s*자리\s*)?(바꿔?\s*놓을\s*기회[가-힣]*|바꿉니다|바꿀\s*[가-힣]*|가[릅른][가-힣]*)/g, '자산 구조를 바꿀 기반이 됩니다')
    .replace(/통장\s*자릿수/g, '자산 구조').replace(/연봉\s*앞자리가?\s*바[뀌꿔][가-힣]*/g, '자산의 단위가 달라집니다')
    .replace(/원금을?\s*잃을\s*(공산이\s*큽니다|수\s*있습니다|수도\s*있습니다|것입니다)/g, '오래 버티기 어렵습니다')
    .replace(/원금\s*손실[가-힣]*/g, '흔들림').replace(/투자\s*수익률?/g, '수익 구조')
    // Final Polish V1 — 권유·지시 어미 → 결과·판정형
    .replace(/놓치지\s*마세요/g, '놓치면 그 자리가 다시 오지 않습니다').replace(/소홀히\s*하지\s*마세요/g, '여기서 흐리면 같은 문제가 반복됩니다')
    .replace(/확인하세요/g, '다시 따져야 합니다').replace(/고려하세요/g, '따져봐야 합니다')
    .replace(/준비하세요/g, '지금 판을 깔아야 합니다').replace(/결정하세요/g, '여기서 갈립니다').replace(/조율하세요/g, '역할을 다시 정해야 합니다')
    .replace(/긍정적인\s*결과를?\s*가져올\s*것입니다/g, '여기서 결과가 달라집니다').replace(/긍정적인\s*결과를?\s*가져옵니다/g, '여기서 결과가 달라집니다')
    .replace(/유지할\s*수\s*있습니다/g, '이어집니다')
    // Final Polish V2 — preview에서 발견된 잔여 권유·상담 어미 추가 제거(판정·결과형으로)
    .replace(/수익을?\s*바라보세요/g, '여기서 수익이 남습니다')
    .replace(/집중하는\s*것이\s*(좋|낫)습니다/g, '무게를 실어야 합니다').replace(/에\s*집중하세요/g, '에 무게를 실어야 합니다').replace(/집중하세요/g, '무게를 실어야 합니다')
    .replace(/명확히\s*정리해야\s*합니다/g, '숫자로 못 박아야 합니다').replace(/명확히\s*정리하세요/g, '숫자로 못 박아야 합니다')
    .replace(/명확히\s*판단하세요/g, '분명하게 가려집니다').replace(/명확히\s*해야\s*합니다/g, '숫자로 못 박아야 합니다')
    .replace(/꼼꼼히\s*따져보세요/g, '조건을 따져야 합니다').replace(/꼼꼼히\s*확인하세요/g, '조건을 따져야 합니다').replace(/따져보세요/g, '따져야 합니다')
    .replace(/눈여겨봐야\s*합니다/g, '여기서 갈립니다').replace(/눈여겨보세요/g, '여기서 갈립니다')
    .replace(/는\s*것이\s*좋습니다/g, '는 게 낫습니다')
    // 후처리 치환이 동사형 도장 + 명사("시점/시기")를 충돌시켜 깨진 문장이 되는 경우 교정
    .replace(/갈립니다\s+(시점|시기)입니다/g, '갈리는 $1입니다')
    .replace(/(먼저|핵심)입니다\s+(시점|시기)입니다/g, '$1인 $2입니다')
    .replace(/다시\s+다시/g, '다시').replace(/여기에\s+여기에/g, '여기에')
    // 신종 클리셰(세 샘플 공통 누수) — 구조 먼저 / 맞물릴 때 / 정착형
    .replace(/구조를\s*먼저\s*잡고\s*나서/g, '틀부터 박고').replace(/구조를?\s*먼저/g, '틀부터')
    .replace(/맞물릴\s*때/g, '겹칠 때').replace(/맞물리면/g, '겹치면')
    .replace(/정착형으로/g, '뿌리내리는 쪽으로').replace(/정착형[가-힣]*/g, '뿌리내리는')
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
    .slice(0, 10); // Differentiation V1: 8~10개 섹션 허용

  const totalParas = sections.reduce((a, sec) => a + sec.body.length, 0);
  if (!lead || sections.length < 2 || totalParas < 3) return null;

  const out: FortuneVerdict = {
    mode: ev.mode,
    title: s(parsed.title) || defaultTitle(ev.mode),
    lead,
    sections,
    closing: s(parsed.closing),
  };
  // 개인사주는 timingSummary를 따로 두지 않는다(시간표=대운 섹션, 종합 결론=closing). 데이터 레벨에서 중복 제거.
  const ts = s(parsed.timingSummary);
  if (ts && ev.mode !== 'personal') out.timingSummary = ts;
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
