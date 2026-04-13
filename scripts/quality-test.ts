/**
 * Saju Reading Quality Test Script
 *
 * Generates a real saju reading via the local API, evaluates quality,
 * and saves results for iterative improvement.
 *
 * Usage: npx tsx scripts/quality-test.ts [iteration_number]
 */

import { calcSaju, getOhCount, CG, JJ, OH_CG, OH_JJ } from '../src/lib/saju-calc';
import { buildSajuPrompts } from '../src/lib/saju-prompt-builder';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000/api/saju';
const RESULTS_DIR = path.join(__dirname, '..', '.quality-tests');

// Test profiles for diverse testing
const TEST_PROFILES = [
  { // Profile 0: 심정우, 1995-05-31 00:15, male, solar
    name: '심정우', gender: '남', year: 1995, month: 5, day: 31, hour: 0,
    isLunar: false, useExactTime: true, exactHour: 0, exactMinute: 15,
    concern: 1, state: 1, personality: [0, 1, 0], relationship: 0, wantToKnow: 0, lang: 'ko' as const,
  },
  { // Profile 1: 김지은, 1988-11-22 14:30, female, married
    name: '김지은', gender: '여', year: 1988, month: 11, day: 22, hour: 7,
    isLunar: false, useExactTime: true, exactHour: 14, exactMinute: 30,
    concern: 0, state: 2, personality: [1, 0, 1], relationship: 3, wantToKnow: 2, lang: 'ko' as const,
  },
  { // Profile 2: 박민수, 2001-03-08, male, no birth time
    name: '박민수', gender: '남', year: 2001, month: 3, day: 8, hour: -1,
    isLunar: false, useExactTime: false, exactHour: -1, exactMinute: 0,
    concern: 3, state: 0, personality: [0, 0, 1], relationship: 1, wantToKnow: 1, lang: 'ko' as const,
  },
  { // Profile 3: English mode test
    name: 'Sarah Kim', gender: 'f', year: 1992, month: 7, day: 15, hour: 5,
    isLunar: false, useExactTime: true, exactHour: 10, exactMinute: 0,
    concern: 2, state: 1, personality: [1, 1, 0], relationship: 0, wantToKnow: 3, lang: 'en' as const,
  },
];

const profileIdx = parseInt(process.argv[3] || '0');
const TEST_USER = TEST_PROFILES[profileIdx % TEST_PROFILES.length];

// Quality evaluation criteria (scored 1-10)
interface QualityScore {
  iteration: number;
  timestamp: string;
  scores: {
    // Content depth
    classicalCitations: number;     // References to 적천수/자평진전/궁통보감 etc
    saju_specificity: number;       // Uses actual pillar data, not generic
    metaphorDensity: number;        // Vivid comparisons every 2-3 sentences
    emotionalImpact: number;        // "뼈를 때리는" feeling, personal
    actionableAdvice: number;       // Concrete, specific recommendations
    // Structure
    sectionCompleteness: number;    // All 10 sections present and full
    sectionLength: number;          // Each section 10-20+ lines
    // Doctrinal quality
    格局analysis: number;           // Proper 격국 identification
    用神reasoning: number;          // Clear 용신/기신 logic
    通變application: number;        // 대운/세운 interaction analysis
    // Engagement
    casualTone: number;             // 반말, friendly, like chatting
    readability: number;            // Easy to understand for non-experts
  };
  totalScore: number;
  maxScore: number;
  percentage: number;
  issues: string[];
  strengths: string[];
  promptLength: number;
  responseLength: number;
  responseTime: number;
}

function evaluateQuality(text: string, iteration: number, promptLen: number, responseTime: number): QualityScore {
  const scores: QualityScore['scores'] = {
    classicalCitations: 0,
    saju_specificity: 0,
    metaphorDensity: 0,
    emotionalImpact: 0,
    actionableAdvice: 0,
    sectionCompleteness: 0,
    sectionLength: 0,
    格局analysis: 0,
    用神reasoning: 0,
    通變application: 0,
    casualTone: 0,
    readability: 0,
  };

  const issues: string[] = [];
  const strengths: string[] = [];

  // 1. Classical citations check
  const classicalRefs = ['적천수', '자평진전', '궁통보감', '연해자평', '삼명통회', '명리정종', '적천수징의', '궁통보감'];
  const citationCount = classicalRefs.reduce((sum, ref) => sum + (text.match(new RegExp(ref, 'g'))?.length || 0), 0);
  scores.classicalCitations = Math.min(10, Math.round(citationCount * 1.5));
  if (citationCount < 3) issues.push(`Classical citations too few: ${citationCount} (need 6+)`);
  else if (citationCount >= 6) strengths.push(`Good citation density: ${citationCount} references`);

  // 2. Saju specificity - uses actual pillar characters
  const pillarTerms = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계',
    '자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  const pillarMentions = pillarTerms.reduce((sum, t) => sum + (text.match(new RegExp(t + '[목화토금수]|' + t + '\\(', 'g'))?.length || 0), 0);
  scores.saju_specificity = Math.min(10, Math.round(pillarMentions / 3));
  if (pillarMentions < 15) issues.push(`Saju specificity low: ${pillarMentions} pillar references`);

  // 3. Metaphor density
  const metaphorIndicators = ['처럼', '같은', '마치', '비유하면', '느낌', 'ㅋㅋ', 'ㅎㅎ', '레전드', '대박', '실화', '것처럼', '듯이', '느낌이야', '같아서', '비슷해'];
  const metaphorCount = metaphorIndicators.reduce((sum, m) => sum + (text.match(new RegExp(m, 'g'))?.length || 0), 0);
  scores.metaphorDensity = Math.min(10, Math.round(metaphorCount / 2));
  if (metaphorCount < 8) issues.push(`Metaphor density low: ${metaphorCount} (need 15+)`);
  else strengths.push(`Good metaphor usage: ${metaphorCount}`);

  // 4. Emotional impact - personal address, vivid language
  const emotionalMarkers = ['너', '네가', '너의', '솔직히', '진짜', '확실히', '대박인 게', '이건 좀'];
  const emotionalCount = emotionalMarkers.reduce((sum, m) => sum + (text.match(new RegExp(m, 'g'))?.length || 0), 0);
  scores.emotionalImpact = Math.min(10, Math.round(emotionalCount / 5));
  if (emotionalCount < 20) issues.push(`Emotional engagement low: ${emotionalCount} personal address markers`);

  // 5. Actionable advice - specific numbers, frequencies, colors
  const actionMarkers = ['매일', '매주', '주 \\d회', '매달', '\\d%', '\\d분', '\\d잔', '초록', '파랑', '빨강', '노랑', '검정', '동쪽', '서쪽', '남쪽', '북쪽'];
  const actionCount = actionMarkers.reduce((sum, m) => sum + (text.match(new RegExp(m, 'g'))?.length || 0), 0);
  scores.actionableAdvice = Math.min(10, Math.round(actionCount));
  if (actionCount < 5) issues.push(`Actionable advice sparse: ${actionCount} concrete recommendations`);

  // 6. Section completeness
  const sectionHeaders = text.match(/##\d+\./g) || [];
  scores.sectionCompleteness = Math.min(10, sectionHeaders.length);
  if (sectionHeaders.length < 10) issues.push(`Missing sections: found ${sectionHeaders.length}/10`);
  else strengths.push(`All ${sectionHeaders.length} sections present`);

  // 7. Section length
  const sections = text.split(/##\d+\./).filter(s => s.trim().length > 0);
  const avgSectionLen = sections.length > 0 ? sections.reduce((sum, s) => sum + s.length, 0) / sections.length : 0;
  scores.sectionLength = Math.min(10, Math.round(avgSectionLen / 200));
  if (avgSectionLen < 500) issues.push(`Sections too short: avg ${Math.round(avgSectionLen)} chars (need 800+)`);

  // 8. 격국 analysis
  const 격국terms = ['격국', '격', '식신격', '상관격', '정관격', '편관격', '정재격', '편재격', '인수격', '편인격'];
  const 격국count = 격국terms.reduce((sum, t) => sum + (text.match(new RegExp(t, 'g'))?.length || 0), 0);
  scores.格局analysis = Math.min(10, Math.round(격국count * 2));
  if (격국count < 2) issues.push('격국 analysis missing or shallow');

  // 9. 용신 reasoning
  const 용신terms = ['용신', '기신', '희신', '구신', '한신'];
  const 용신count = 용신terms.reduce((sum, t) => sum + (text.match(new RegExp(t, 'g'))?.length || 0), 0);
  scores.用神reasoning = Math.min(10, Math.round(용신count));
  if (용신count < 3) issues.push('용신/기신 reasoning insufficient');
  else strengths.push(`Good 용신 analysis: ${용신count} mentions`);

  // 10. 통변 application
  const 통변terms = ['대운', '세운', '2026', '2027', '2028', '합이', '충이', '형이'];
  const 통변count = 통변terms.reduce((sum, t) => sum + (text.match(new RegExp(t, 'g'))?.length || 0), 0);
  scores.通變application = Math.min(10, Math.round(통변count));
  if (통변count < 5) issues.push('대운/세운 통변 analysis weak');

  // 11. Casual tone (반말)
  const formalEndings = text.match(/습니다|입니다|세요|하세요|됩니다|합니다|십시오/g) || [];
  const casualEndings = text.match(/야\.|거야|이야|해\.|돼\.|인데|거든|잖아|같아|이야|할게/g) || [];
  scores.casualTone = formalEndings.length === 0 ? 10 : Math.max(1, 10 - formalEndings.length);
  if (formalEndings.length > 3) issues.push(`Formal speech detected: ${formalEndings.length} formal endings`);

  // 12. Readability
  const avgSentenceLen = text.length / (text.split(/[.!?]\s/).length || 1);
  scores.readability = avgSentenceLen < 80 ? 10 : avgSentenceLen < 120 ? 7 : 4;

  // Total
  const scoreValues = Object.values(scores);
  const totalScore = scoreValues.reduce((a, b) => a + b, 0);
  const maxScore = scoreValues.length * 10;

  return {
    iteration,
    timestamp: new Date().toISOString(),
    scores,
    totalScore,
    maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
    issues,
    strengths,
    promptLength: promptLen,
    responseLength: text.length,
    responseTime,
  };
}

async function fetchReading(prompt: string): Promise<{ text: string; time: number }> {
  const start = Date.now();
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      maxTokens: 4096,
      lang: 'ko',
      type: 'default',
    }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${await res.text()}`);
  }

  const text = await res.text();
  return { text, time: Date.now() - start };
}

async function main() {
  const iteration = parseInt(process.argv[2] || '1');

  // Ensure results directory exists
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  console.log(`\n=== Quality Test Iteration ${iteration} ===\n`);

  // Calculate saju
  const sj = calcSaju(TEST_USER.year, TEST_USER.month, TEST_USER.day, TEST_USER.hour);
  const oh = getOhCount(sj);

  console.log(`Pillars: ${CG[sj.yStem]}${JJ[sj.yBranch]} ${CG[sj.mStem]}${JJ[sj.mBranch]} ${CG[sj.dStem]}${JJ[sj.dBranch]} ${sj.hStem >= 0 ? CG[sj.hStem]+JJ[sj.hBranch] : 'N/A'}`);
  console.log(`五行: 목=${oh['목']} 화=${oh['화']} 토=${oh['토']} 금=${oh['금']} 수=${oh['수']}`);

  // Build prompts
  const prompts = buildSajuPrompts(sj, oh, TEST_USER);
  for (let i = 0; i < prompts.length; i++) {
    console.log(`\nPrompt ${i + 1} length: ${prompts[i].length} chars`);
  }

  // Save prompt for reference
  const promptDump = prompts.map((p, i) => `=== PROMPT ${i + 1} ===\n${p}`).join('\n\n');
  fs.writeFileSync(path.join(RESULTS_DIR, `prompt-${iteration}.txt`), promptDump);

  // Add cache-busting suffix to prompts
  const cacheBust = '\n<!-- test-run:' + iteration + '-' + Date.now() + ' -->';
  for (let i = 0; i < prompts.length; i++) {
    prompts[i] += cacheBust;
  }

  // Fetch all parts
  let fullText = '';
  let totalTime = 0;
  let totalPromptLen = 0;
  for (let i = 0; i < prompts.length; i++) {
    console.log(`\nFetching Part ${i + 1}/${prompts.length}...`);
    const result = await fetchReading(prompts[i]);
    console.log(`Part ${i + 1}: ${result.text.length} chars in ${result.time}ms`);
    fullText += (i > 0 ? '\n\n' : '') + result.text;
    totalTime += result.time;
    totalPromptLen += prompts[i].length;
  }

  // Save raw response
  fs.writeFileSync(
    path.join(RESULTS_DIR, `response-${iteration}.txt`),
    fullText
  );

  // Evaluate quality
  const score = evaluateQuality(
    fullText,
    iteration,
    totalPromptLen,
    totalTime,
  );

  // Save score
  fs.writeFileSync(
    path.join(RESULTS_DIR, `score-${iteration}.json`),
    JSON.stringify(score, null, 2)
  );

  // Print report
  console.log('\n' + '='.repeat(60));
  console.log(`QUALITY SCORE: ${score.totalScore}/${score.maxScore} (${score.percentage}%)`);
  console.log('='.repeat(60));
  console.log('\nScores by dimension:');
  for (const [key, val] of Object.entries(score.scores)) {
    const bar = '█'.repeat(val) + '░'.repeat(10 - val);
    console.log(`  ${key.padEnd(25)} ${bar} ${val}/10`);
  }

  if (score.issues.length > 0) {
    console.log('\n🔴 Issues to fix:');
    score.issues.forEach(i => console.log(`  - ${i}`));
  }

  if (score.strengths.length > 0) {
    console.log('\n🟢 Strengths:');
    score.strengths.forEach(s => console.log(`  + ${s}`));
  }

  console.log(`\nResponse time: ${score.responseTime}ms`);
  console.log(`Response length: ${score.responseLength} chars`);
  console.log(`Files saved to: ${RESULTS_DIR}/`);

  // Append to history
  const historyPath = path.join(RESULTS_DIR, 'history.json');
  let history: QualityScore[] = [];
  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }
  history.push(score);
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  if (history.length > 1) {
    const prev = history[history.length - 2];
    const diff = score.percentage - prev.percentage;
    console.log(`\n${diff >= 0 ? '📈' : '📉'} vs previous: ${diff >= 0 ? '+' : ''}${diff}% (${prev.percentage}% → ${score.percentage}%)`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
