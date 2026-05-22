/**
 * 다양한 사주 케이스로 v3.2 일반화 테스트
 * 일간 10종 × 성별 × 나이 × 결혼 상태 매트릭스
 *
 * 실행: npx tsx --env-file=.env.local scripts/test-v3-batch.ts
 */

import OpenAI from 'openai';
import * as fs from 'node:fs';
import { calcSaju, getOhCount, calcShinsal } from '../src/lib/saju-calc';
import { buildSajuPrompts } from '../src/lib/saju-prompt-builder';
import { SYSTEM_KO } from '../src/lib/saju-system-prompt';
import { getOpenAIApiKey } from '../src/lib/env';
import type { UserData } from '../src/lib/saju-prompt';

interface TestCase {
  id: string;
  description: string;
  year: number; month: number; day: number; hour: number;
  userData: Omit<UserData, 'year' | 'month' | 'day' | 'hour'>;
}

const cases: TestCase[] = [
  // 기존 베이스라인
  { id: '95-05-31-자시', description: '임수 일간, 미혼, 30대 남, 커리어',
    year: 1995, month: 5, day: 31, hour: 0,
    userData: { name: '테스트', gender: 'm', concern: 1, state: 2, personality: [0,1,0], relationship: 0, wantToKnow: 3 } },
  // 갑목 미혼 20대
  { id: '02-04-15-인시', description: '갑목 일간, 미혼, 20대 남, 학업',
    year: 2002, month: 4, day: 15, hour: 2,
    userData: { name: '갑목군', gender: 'm', concern: 5, state: 1, personality: [0,0,0], relationship: 0, wantToKnow: 0 } },
  // 을목 기혼 30대 여
  { id: '90-09-08-오시', description: '을목 일간, 기혼, 30대 여, 가정',
    year: 1990, month: 9, day: 8, hour: 6,
    userData: { name: '을목씨', gender: 'f', concern: 3, state: 0, personality: [1,0,1], relationship: 3, wantToKnow: 3 } },
  // 병화 미혼 청소년
  { id: '11-02-22-진시', description: '병화 일간, 청소년 14세 남, 학업',
    year: 2011, month: 2, day: 22, hour: 4,
    userData: { name: '병화군', gender: 'm', concern: 5, state: 3, personality: [1,1,0], relationship: 0, wantToKnow: 0 } },
  // 정화 기혼 40대 여
  { id: '83-11-04-신시', description: '정화 일간, 기혼, 40대 여, 재정',
    year: 1983, month: 11, day: 4, hour: 8,
    userData: { name: '정화씨', gender: 'f', concern: 2, state: 1, personality: [1,0,0], relationship: 3, wantToKnow: 2 } },
  // 무토 미혼 50대 — 1번 레퍼런스 (이서은) 유사 케이스
  { id: '74-07-15-사시', description: '무토 일간, 미혼, 50대 남 (1번 레퍼런스 유사)',
    year: 1974, month: 7, day: 15, hour: 5,
    userData: { name: '무토님', gender: 'm', concern: 2, state: 0, personality: [0,1,0], relationship: 0, wantToKnow: 0 } },
  // 기토 기혼 60대+
  { id: '63-03-10-유시', description: '기토 일간, 기혼, 60대+ 여',
    year: 1963, month: 3, day: 10, hour: 9,
    userData: { name: '기토님', gender: 'f', concern: 4, state: 0, personality: [1,0,1], relationship: 3, wantToKnow: 0 } },
  // 경금 미혼 20대 여
  { id: '99-12-19-자시', description: '경금 일간, 한겨울 출생, 미혼 20대 여',
    year: 1999, month: 12, day: 19, hour: 0,
    userData: { name: '경금씨', gender: 'f', concern: 0, state: 1, personality: [0,1,1], relationship: 1, wantToKnow: 1 } },
  // 신금 미혼 시간 미상
  { id: '93-08-21-시간미상', description: '신금 일간, 시간 미상 미혼 30대 남',
    year: 1993, month: 8, day: 21, hour: -1,
    userData: { name: '신금씨', gender: 'm', concern: 4, state: 1, personality: [0,1,0], relationship: 2, wantToKnow: 4 } },
  // 계수 기혼 40대 남
  { id: '85-06-30-축시', description: '계수 일간, 기혼 40대 남',
    year: 1985, month: 6, day: 30, hour: 1,
    userData: { name: '계수님', gender: 'm', concern: 4, state: 0, personality: [0,0,0], relationship: 3, wantToKnow: 3 } },
];

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
    termGloss: /격국[\s\S]{0,30}\([^)]{3,30}\)|구조/.test(text),
    narrativeConnector: /(이러한 해석|이런 해석|여기에|특히|이런 기운을 가진)/.test(text),
    weaknessShadow: /(아이콘이지만|기운을 가진 분들은[\s\S]{1,80}이지만)/.test(text),
    closingPunchline: /([^.\n]{1,40}[해해보봐세요]\.)\s*$/.test(text.trim()),
    noQuestionEnding: !/맞지\?|아니야\?|있지\?|않아\?/.test(text),
  };
  const failures: string[] = [];
  if (!scorecard.metaFiveFields) failures.push('메타 5필드');
  if (!scorecard.cheonEulRarity) failures.push('천을 1만/200');
  if (!scorecard.yanginRarity) failures.push('양인 1만/1500');
  if (!scorecard.munchangRarity) failures.push('문창 1만/600');
  if (!scorecard.sinsalWordAbsent) failures.push('"신살" 단어 사용');
  if (!scorecard.noHanja) failures.push('한자 사용');
  if (!scorecard.fourSections) failures.push('4섹션 불완전');
  if (!scorecard.noOverflow) failures.push('##5+ 생성');
  if (!scorecard.section3Money) failures.push('##3 돈 키워드 X');
  if (!scorecard.section4Love) failures.push('##4 연애 키워드 X');
  if (!scorecard.fiveLifeStages) failures.push('5단계 불완전');
  if (!scorecard.noGenericPhrases) failures.push('일반론 패턴');
  if (!scorecard.termGloss) failures.push('격국 풀이 X');
  if (!scorecard.narrativeConnector) failures.push('연결어 X');
  if (!scorecard.weaknessShadow) failures.push('약점 그림자 X');
  if (!scorecard.closingPunchline) failures.push('격언 마무리 X');
  if (!scorecard.noQuestionEnding) failures.push('의문문 마무리');
  return { pass: failures.length === 0, scorecard, failures };
}

async function callGPT(openai: OpenAI, system: string, user: string, temp = 0.4) {
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: temp,
    max_tokens: 16000,
  });
  return {
    text: resp.choices[0].message.content || '',
    inTok: resp.usage?.prompt_tokens || 0,
    outTok: resp.usage?.completion_tokens || 0,
  };
}

async function runCase(openai: OpenAI, tc: TestCase): Promise<{
  caseId: string;
  passCount: number;
  totalCount: number;
  failures: string[];
  text: string;
  shinsalStr: string;
}> {
  const sj = calcSaju(tc.year, tc.month, tc.day, tc.hour);
  const oh = getOhCount(sj);
  const shinsalArr = calcShinsal(sj);
  const shinsalStr = shinsalArr.length > 0 ? shinsalArr.join(', ') : '없음';

  const user: UserData = { ...tc.userData, year: tc.year, month: tc.month, day: tc.day, hour: tc.hour };
  const prompts = buildSajuPrompts(sj, oh, user);

  let r = await callGPT(openai, SYSTEM_KO, prompts[0]);
  let v = validateRound1(r.text, shinsalStr);
  let totalCount = Object.keys(v.scorecard).length;
  let passCount = Object.values(v.scorecard).filter(x => x).length;

  // 자동 재호출: 실패 시 명시적 피드백으로 1회 재시도
  if (!v.pass) {
    const feedback = prompts[0] +
      '\n\n🚨 이전 응답 검증 실패. 다음 결함을 반드시 고쳐 ##1~##4 4섹션 모두 다시 작성:\n' +
      v.failures.map((f, i) => `${i + 1}. ${f}`).join('\n') +
      '\n특히 신살 N명 수치 표현 ("1만 명 중 약 200명", "1만 명 중 약 1500명") 정확히 인용 필수.';
    const r2 = await callGPT(openai, SYSTEM_KO, feedback);
    const v2 = validateRound1(r2.text, shinsalStr);
    const pc2 = Object.values(v2.scorecard).filter(x => x).length;
    if (pc2 > passCount || (pc2 === passCount && v2.pass)) {
      r = r2; v = v2; passCount = pc2;
    }
  }
  return { caseId: tc.id, passCount, totalCount, failures: v.failures, text: r.text, shinsalStr };
}

async function main() {
  const apiKey = getOpenAIApiKey();
  const openai = new OpenAI({ apiKey });
  const results: Array<Awaited<ReturnType<typeof runCase>>> = [];

  console.log(`Testing ${cases.length} cases...\n`);
  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    console.log(`[${i + 1}/${cases.length}] ${tc.id} — ${tc.description}`);
    try {
      const r = await runCase(openai, tc);
      results.push(r);
      console.log(`  ${r.passCount === r.totalCount ? '✅' : '⚠️'} ${r.passCount}/${r.totalCount} 통과${r.failures.length > 0 ? ' — 실패: ' + r.failures.join(', ') : ''}`);
      fs.writeFileSync(`batch-result-${tc.id}.txt`, r.text, 'utf8');
    } catch (e) {
      console.log(`  ❌ Error: ${(e as Error).message}`);
    }
  }

  // 종합
  console.log('\n=== 종합 결과 ===');
  let totalPass = 0;
  let totalCheck = 0;
  const failureCounts: Record<string, number> = {};
  for (const r of results) {
    totalPass += r.passCount;
    totalCheck += r.totalCount;
    for (const f of r.failures) {
      failureCounts[f] = (failureCounts[f] || 0) + 1;
    }
  }
  console.log(`전체 케이스: ${results.length}`);
  console.log(`총 검증 통과: ${totalPass}/${totalCheck} (${(totalPass / totalCheck * 100).toFixed(1)}%)`);
  const fullPassCount = results.filter(r => r.passCount === r.totalCount).length;
  console.log(`완전 통과 케이스: ${fullPassCount}/${results.length}`);
  console.log('\n실패 빈도 TOP:');
  Object.entries(failureCounts).sort((a, b) => b[1] - a[1]).forEach(([f, n]) => {
    console.log(`  ${n}회: ${f}`);
  });

  fs.writeFileSync('batch-summary.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\nResults saved to batch-result-*.txt + batch-summary.json');
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
