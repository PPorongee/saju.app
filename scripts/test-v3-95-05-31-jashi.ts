/**
 * 95-05-31 자시 사주로 v3 프롬프트 실측 테스트
 * Prompt1 (섹션 1~4) 호출 + 응답 자동 검증 + 실패 시 1회 재호출
 *
 * 실행: npx tsx --env-file=.env.local scripts/test-v3-95-05-31-jashi.ts
 */

import OpenAI from 'openai';
import * as fs from 'node:fs';
import { calcSaju, getOhCount, calcShinsal } from '../src/lib/saju-calc';
import { buildSajuPrompts } from '../src/lib/saju-prompt-builder';
import { SYSTEM_KO } from '../src/lib/saju-system-prompt';
import { getOpenAIApiKey } from '../src/lib/env';
import type { UserData } from '../src/lib/saju-prompt';

interface ValidationResult {
  pass: boolean;
  scorecard: Record<string, boolean>;
  failures: string[];
}

function validateRound1(text: string, shinsalStr: string): ValidationResult {
  const hasCheoneul = shinsalStr.includes('천을귀인');
  const hasYangin = shinsalStr.includes('양인');
  const hasMunchang = shinsalStr.includes('문창귀인');

  const scorecard: Record<string, boolean> = {
    metaFiveFields: /\[용신:[^\]]+풀이:[^\]]+\]/.test(text),
    cheonEulRarity: !hasCheoneul || /1만 명 중 약 200명/.test(text),
    yanginRarity: !hasYangin || /1만 명 중 약 1500명/.test(text),
    munchangRarity: !hasMunchang || /1만 명 중 약 600명/.test(text),
    sinsalWordAbsent: !/신살에|신살을|신살이|신살로/.test(text),
    noHanja: !/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/.test(text),
    fourSections: /##1\./.test(text) && /##2\./.test(text) && /##3\./.test(text) && /##4\./.test(text),
    noOverflow: !/##5\.|##6\.|##7\.|##8\./.test(text),
    section3Money: /##3\.[^#]{0,400}(돈|재물|재정|커리어|직업|재성|편재|정재|황금|금고|금융|투자|수입|저축|사업|동업)/.test(text),
    section4Love: /##4\.[^#]{0,400}(연애|사랑|인연|결혼|부부|배우자|매력|배우자궁|이성|로맨스)/.test(text),
    fiveLifeStages: /아동기/.test(text) && /청소년기/.test(text) && /성년기/.test(text) && /중년기/.test(text) && /노년기/.test(text),
    noGenericPhrases: !/조화는 너를 특별하게|성장할 수 있어\b|빛날 거야\b|성장하는 시기야\b/.test(text),
    // 1번 레퍼런스 품질 가드레일
    termGloss: /격국[\s\S]{0,30}\([^)]{3,30}\)|구조/.test(text), // 격국 호명 시 괄호 풀이 또는 "구조" 단어로 풀이
    narrativeConnector: /(이러한 해석|이런 해석|여기에|특히|이런 기운을 가진)/.test(text), // 연결어 사용
    weaknessShadow: /(아이콘이지만|이지만|하지만|다만|그런데).{1,100}(놓치|약점|함정|소진|지칠|지치|위축|잃|마무리.{0,3}못|마무리.{0,3}안|늦|흐려|덜|밀려|머물|돌아오|쉬워|쏠리)/.test(text),
    closingPunchline: /([^.\n]{1,40}[해해보봐세요]\.)\s*$/.test(text.trim()), // 마지막 문장이 권유형 격언 (40자 이내)
    noQuestionEnding: !/맞지\?|아니야\?|있지\?|않아\?/.test(text),
  };
  const failures: string[] = [];
  if (!scorecard.metaFiveFields) failures.push('메타 5필드 (용신/기신/희신/근거/풀이) 미완성');
  if (!scorecard.cheonEulRarity) failures.push('천을귀인 1만/200명 표현 누락');
  if (!scorecard.yanginRarity) failures.push('양인 1만/1500명 표현 누락');
  if (!scorecard.munchangRarity) failures.push('문창귀인 1만/600명 표현 누락');
  if (!scorecard.sinsalWordAbsent) failures.push('"신살" 단어 사용 금지 위반');
  if (!scorecard.noHanja) failures.push('한자 표기 위반');
  if (!scorecard.fourSections) failures.push('##1~##4 4섹션 구조 미완');
  if (!scorecard.noOverflow) failures.push('##5+ 섹션 잘못 생성됨 (Part 1은 ##1~##4까지만)');
  if (!scorecard.section3Money) failures.push('##3이 돈·커리어 섹션이 아님');
  if (!scorecard.section4Love) failures.push('##4가 연애·인연 섹션이 아님');
  if (!scorecard.fiveLifeStages) failures.push('##2 인생 로드맵 5단계(아동·청소년·성년·중년·노년) 중 일부 누락');
  if (!scorecard.noGenericPhrases) failures.push('일반론 패턴 발견 (조화는 너를 특별하게 / 성장할 수 있어 / 빛날 거야 등)');
  if (!scorecard.termGloss) failures.push('격국 호명 시 풀이(괄호 또는 "구조" 표현) 누락');
  if (!scorecard.narrativeConnector) failures.push('연결어(이러한 해석/여기에/특히/이런 기운을 가진) 누락');
  if (!scorecard.weaknessShadow) failures.push('약점=강점 그림자 패턴 없음 (이지만/하지만 + 놓치/약점 연결)');
  if (!scorecard.closingPunchline) failures.push('마지막 문장이 권유형 격언이 아님 (해봐/해보세요로 끝나는 짧은 처방)');
  if (!scorecard.noQuestionEnding) failures.push('의문문 마무리 사용');
  return { pass: failures.length === 0, scorecard, failures };
}

async function callGPT(openai: OpenAI, system: string, user: string, temp = 0.4) {
  const start = Date.now();
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: temp,
    max_tokens: 16000,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const out = resp.choices[0].message.content || '';
  return {
    text: out,
    elapsed,
    inTok: resp.usage?.prompt_tokens || 0,
    outTok: resp.usage?.completion_tokens || 0,
  };
}

async function main() {
  const sj = calcSaju(1995, 5, 31, 0);
  const oh = getOhCount(sj);
  const user: UserData = {
    name: '테스트',
    gender: 'm',
    year: 1995, month: 5, day: 31, hour: 0,
    concern: 1, state: 2, personality: [0, 1, 0],
    relationship: 0, wantToKnow: 3,
  };

  const shinsalArr = calcShinsal(sj);
  const shinsalStr = shinsalArr.length > 0 ? shinsalArr.join(', ') : '없음';

  const prompts = buildSajuPrompts(sj, oh, user);
  fs.writeFileSync('test-v3-prompt1.txt', prompts[0], 'utf8');
  console.log(`prompt1 length: ${prompts[0].length} chars`);
  console.log(`사주: ${JSON.stringify(sj)}`);
  console.log(`신살: ${shinsalStr}`);

  const apiKey = getOpenAIApiKey();
  const openai = new OpenAI({ apiKey });

  console.log('\n=== Round 1 호출 ===');
  let r = await callGPT(openai, SYSTEM_KO, prompts[0]);
  console.log(`done in ${r.elapsed}s. in=${r.inTok}, out=${r.outTok}, chars=${r.text.length}`);

  let v = validateRound1(r.text, shinsalStr);
  console.log('\n=== 자동 검증 ===');
  for (const [k, pass] of Object.entries(v.scorecard)) {
    console.log(`  ${pass ? '✅' : '❌'} ${k}`);
  }

  // 재호출 (전체 다시 작성): 첫 호출이 임의 룰 실패할 때만
  let bestResult = r;
  let bestValidation = v;
  if (!v.pass) {
    console.log('\n=== 검증 실패 → 명시적 피드백으로 전체 재작성 요청 ===');
    console.log(`실패 항목: ${v.failures.join(' / ')}`);
    const feedbackUser = prompts[0] +
      '\n\n🚨 이전 응답 검증 실패. 다음 결함을 반드시 고쳐 ##1~##4 전체 4섹션을 처음부터 끝까지 다시 작성. 일부만 짧게 답하지 마:\n' +
      v.failures.map((f, i) => `${i + 1}. ${f}`).join('\n');
    r = await callGPT(openai, SYSTEM_KO, feedbackUser, 0.4);
    console.log(`재호출 done in ${r.elapsed}s. in=${r.inTok}, out=${r.outTok}, chars=${r.text.length}`);
    v = validateRound1(r.text, shinsalStr);
    console.log('\n=== 재호출 후 검증 ===');
    for (const [k, pass] of Object.entries(v.scorecard)) {
      console.log(`  ${pass ? '✅' : '❌'} ${k}`);
    }
    // 더 많이 통과한 쪽 채택
    const firstPass = Object.values(bestValidation.scorecard).filter(x => x).length;
    const secondPass = Object.values(v.scorecard).filter(x => x).length;
    if (secondPass > firstPass || (secondPass === firstPass && v.pass)) {
      bestResult = r;
      bestValidation = v;
      console.log(`재호출 결과 채택 (점수 ${secondPass}/${Object.keys(v.scorecard).length})`);
    } else {
      console.log(`첫 호출 결과 유지 (점수 ${firstPass}/${Object.keys(v.scorecard).length} > 재호출 ${secondPass})`);
    }
  }

  fs.writeFileSync('test-v3-part1-result.txt', bestResult.text, 'utf8');
  console.log(`\nSaved to test-v3-part1-result.txt (${bestResult.text.length} chars)`);
  const finalPass = Object.values(bestValidation.scorecard).filter(x => x).length;
  const finalTotal = Object.keys(bestValidation.scorecard).length;
  console.log(`최종: ${bestValidation.pass ? '✅ ALL PASS' : `⚠️ ${finalPass}/${finalTotal} 통과`}`);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
