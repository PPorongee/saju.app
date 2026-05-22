// lifeTopicAnalyzer — 10문항(spec §10)에 어떤 사주 분석 결과를 묶을지 매핑.
// GPT 프롬프트가 각 문항의 evidence 묶음을 인용해서 답하도록.

import type {
  TenGodAnalysis, ElementStrengthAnalysis, DayMasterStrengthAnalysis,
  UsefulGodAnalysis, SpecialStarInfo, SpecialPoint, FortuneCycleInfo,
  TenGod,
} from '../report/sajuReportSchema';
import type { FourPillars } from '../calendar/pillarCalculator';
import type { StructureAnalysis } from './structureAnalyzer';

export interface LifeTopicEvidence {
  questionNumber: number;
  question: string;
  evidenceKeys: string[];      // 어떤 분석 카테고리를 참조할지
  evidenceSummary: string[];   // 짧은 인용용 텍스트
}

const QUESTIONS: Record<number, string> = {
  1:  '나는 어떤 기질을 타고났는가?',
  2:  '남들이 보는 나와 실제 내면은 어떻게 다른가?',
  3:  '내 인생에서 반복되는 패턴은 무엇인가?',
  4:  '나는 어떤 방식으로 돈을 벌 때 강한가?',
  5:  '직업적으로 어떤 환경에서 실력이 터지는가?',
  6:  '인간관계에서 내가 자주 겪는 문제는 무엇인가?',
  7:  '연애·결혼에서 나의 강점과 약점은 무엇인가?',
  8:  '가족·초년운은 내 성격에 어떤 흔적을 남겼는가?',
  9:  '앞으로 3년간 특히 주의하거나 잡아야 할 운은 무엇인가?',
  10: '내 사주를 좋게 쓰는 현실적 방법은 무엇인가?',
};

export function analyzeLifeTopics(args: {
  pillars: FourPillars;
  tenGods: TenGodAnalysis;
  elements: ElementStrengthAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  structure: StructureAnalysis;
  usefulGod: UsefulGodAnalysis;
  specialStars: SpecialStarInfo[];
  specialPoints: SpecialPoint[];
  fortune: FortuneCycleInfo;
}): LifeTopicEvidence[] {
  const { pillars, tenGods, elements, dayMasterStrength: dm, structure, usefulGod, specialStars, specialPoints, fortune } = args;

  const out: LifeTopicEvidence[] = [];

  // Q1 — 기질 (일간 + 격국 + 일간 강약 + 양인/괴강)
  out.push({
    questionNumber: 1,
    question: QUESTIONS[1],
    evidenceKeys: ['pillars.dayMaster', 'structure', 'dayMasterStrength', 'specialStars'],
    evidenceSummary: [
      `일간 ${pillars.dayMaster}(${pillars.day.stemElement})`,
      `${structure.name} — ${structure.notes[0] ?? ''}`,
      dm.conclusion,
      ...specialStars.filter(s => s.name === '양인' || s.name === '괴강').map(s => `${s.name} (${s.interpretationHint})`),
    ],
  });

  // Q2 — 겉/속 차이 (반전 구조 SpecialPoint + 천간/지장간 카테고리)
  const inner = specialPoints.find(p => p.id === 'innerOuterContrast');
  out.push({
    questionNumber: 2,
    question: QUESTIONS[2],
    evidenceKeys: ['specialPoints.innerOuterContrast', 'tenGods.visible vs hidden'],
    evidenceSummary: [
      inner ? `반전 구조 — ${inner.narrative.coreMeaning}` : '겉/속 차이 크지 않음 — 일관된 표현',
      `천간 십성: ${tenGods.visible.map(v => v.tenGod).join(', ')}`,
      `지장간(본기): ${tenGods.hidden.filter(h => h.weight >= 0.6).map(h => h.tenGod).join(', ')}`,
    ],
  });

  // Q3 — 반복 패턴 (대운 흐름 + 강한 십성)
  out.push({
    questionNumber: 3,
    question: QUESTIONS[3],
    evidenceKeys: ['tenGods.strongest', 'fortune.currentDaewoon'],
    evidenceSummary: [
      `강한 십성: ${tenGods.strongest.join(', ')}`,
      `현 대운 ${fortune.currentDaewoon.pillar} (${fortune.currentDaewoon.theme})`,
      ...elements.excessive.map(e => `${e} 과다 패턴`),
    ],
  });

  // Q4 — 돈 버는 방식 (재성/식상 + 식상생재 SpecialPoint)
  const money = specialPoints.find(p => p.category === 'money-talent');
  out.push({
    questionNumber: 4,
    question: QUESTIONS[4],
    evidenceKeys: ['tenGods.재성', 'specialPoints.money-talent'],
    evidenceSummary: [
      `재성 합: 편재 ${tenGods.totals['편재'].toFixed(2)}, 정재 ${tenGods.totals['정재'].toFixed(2)}`,
      `식상 합: 식신 ${tenGods.totals['식신'].toFixed(2)}, 상관 ${tenGods.totals['상관'].toFixed(2)}`,
      money ? `${money.title}` : '특별한 재물 구조 없음 — 안정 누적형',
    ],
  });

  // Q5 — 직업 환경 (격국 + 관성·인성 + career SpecialPoint)
  const career = specialPoints.find(p => p.category === 'career-authority');
  out.push({
    questionNumber: 5,
    question: QUESTIONS[5],
    evidenceKeys: ['structure', 'tenGods.관성', 'specialPoints.career-authority'],
    evidenceSummary: [
      `격: ${structure.name}`,
      `관성 합: ${(tenGods.totals['정관'] + tenGods.totals['편관']).toFixed(2)}`,
      career ? career.title : '특별한 권위 구조 없음 — 자율 환경 적합',
    ],
  });

  // Q6 — 인간관계 문제 (충/형 + 비겁 강약)
  out.push({
    questionNumber: 6,
    question: QUESTIONS[6],
    evidenceKeys: ['conflicts', 'tenGods.비겁'],
    evidenceSummary: [
      `비겁 합: ${(tenGods.totals['비견'] + tenGods.totals['겁재']).toFixed(2)}`,
      ...specialStars.filter(s => s.name === '도화' || s.name === '홍염').map(s => `${s.name} — 관계 자극`),
    ],
  });

  // Q7 — 연애·결혼 (배우자궁 + 도화 + relationship SpecialPoint)
  out.push({
    questionNumber: 7,
    question: QUESTIONS[7],
    evidenceKeys: ['pillars.day.branch', 'specialStars.도화/홍염'],
    evidenceSummary: [
      `배우자궁 (일지): ${pillars.day.branch}`,
      ...specialStars.filter(s => s.name === '도화' || s.name === '홍염').map(s => s.interpretationHint),
    ],
  });

  // Q8 — 가족·초년 (년주 + 월주)
  out.push({
    questionNumber: 8,
    question: QUESTIONS[8],
    evidenceKeys: ['pillars.year', 'pillars.month', 'fortune.daewoonList[0-1]'],
    evidenceSummary: [
      `년주 ${pillars.year.stem}${pillars.year.branch} (조상·환경)`,
      `월주 ${pillars.month.stem}${pillars.month.branch} (부모·형제)`,
      `첫 대운 ${fortune.currentDaewoon.pillar.startsWith(pillars.month.stem) ? '시작' : '진행 중'}`,
    ],
  });

  // Q9 — 향후 3년 운 (fortune.nextThreeYears + 용신 활성화)
  out.push({
    questionNumber: 9,
    question: QUESTIONS[9],
    evidenceKeys: ['fortune.nextThreeYears', 'usefulGod'],
    evidenceSummary: fortune.nextThreeYears.map(y =>
      `${y.year}(${y.pillar}): ${y.theme}, 기회 ${y.opportunities.length}건/위험 ${y.risks.length}건`
    ),
  });

  // Q10 — 사주를 좋게 쓰는 방법 (용신 + specialPoints + 격국 권장)
  out.push({
    questionNumber: 10,
    question: QUESTIONS[10],
    evidenceKeys: ['usefulGod', 'specialPoints', 'structure'],
    evidenceSummary: [
      `용신 ${usefulGod.primaryUseful.value}, 기신 ${usefulGod.unfavorable[0]}`,
      `${structure.name}의 잘 쓰는 방향`,
      ...specialPoints.slice(0, 3).map(p => `${p.shortLabel} — ${p.narrative.goodUse}`),
    ],
  });

  return out;
}

void {} as TenGod; // suppress unused
