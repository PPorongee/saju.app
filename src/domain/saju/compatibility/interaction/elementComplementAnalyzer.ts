// 오행 보완 — A에게 부족한 오행을 B가 가졌는가, 그 반대도 검사.

import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';
import type { ElementComplementAnalysis } from '../compatibilityTypes';
import { ELEMENT_KO, type Element } from '../../rules/elements';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
}

export function analyzeElementComplement({ personA, personB }: Args): ElementComplementAnalysis {
  const aScores = personA.coreAnalysis.elementStrength.scores;
  const bScores = personB.coreAnalysis.elementStrength.scores;
  const aDeficient = personA.coreAnalysis.elementStrength.deficient;
  const bDeficient = personB.coreAnalysis.elementStrength.deficient;

  // B가 가진 강한 오행 중 A가 결핍인 것 — A가 필요로 하는 결
  const bStrong = personB.coreAnalysis.elementStrength.strongest;
  const aStrong = personA.coreAnalysis.elementStrength.strongest;

  const aNeedsFromB: Element[] = aDeficient.filter(el => bStrong.includes(el) || bScores[el] >= 1.5);
  const bNeedsFromA: Element[] = bDeficient.filter(el => aStrong.includes(el) || aScores[el] >= 1.5);

  let mutualComplement: ElementComplementAnalysis['mutualComplement'];
  if (aNeedsFromB.length >= 1 && bNeedsFromA.length >= 1) {
    mutualComplement = aNeedsFromB.length + bNeedsFromA.length >= 3 ? 'strong' : 'moderate';
  } else if (aNeedsFromB.length >= 1 || bNeedsFromA.length >= 1) {
    mutualComplement = 'one-sided';
  } else {
    mutualComplement = 'weak';
  }

  const oneSidednessRisk: string[] = [];
  if (mutualComplement === 'one-sided') {
    if (aNeedsFromB.length > 0) {
      oneSidednessRisk.push(`A가 B에게서 보완을 주로 받는 구조 — B가 일방적으로 채워주면 피로가 누적될 수 있어요.`);
    } else {
      oneSidednessRisk.push(`B가 A에게서 보완을 주로 받는 구조 — A가 일방적으로 채워주면 피로가 누적될 수 있어요.`);
    }
  }

  // 용신 자극도 보조 신호로
  const aUseful = personA.coreAnalysis.usefulGod.primaryUseful.value as Element;
  const bUseful = personB.coreAnalysis.usefulGod.primaryUseful.value as Element;
  const evidence: string[] = [];
  evidence.push(`A 강 ${aStrong.map(e => ELEMENT_KO[e]).join('·') || '-'}, 결핍 ${aDeficient.map(e => ELEMENT_KO[e]).join('·') || '-'}`);
  evidence.push(`B 강 ${bStrong.map(e => ELEMENT_KO[e]).join('·') || '-'}, 결핍 ${bDeficient.map(e => ELEMENT_KO[e]).join('·') || '-'}`);
  if (aUseful) evidence.push(`A 용신 ${ELEMENT_KO[aUseful]}`);
  if (bUseful) evidence.push(`B 용신 ${ELEMENT_KO[bUseful]}`);
  if (aNeedsFromB.length > 0) evidence.push(`A가 필요로 하는 결: ${aNeedsFromB.map(e => ELEMENT_KO[e]).join('·')} ← B가 가짐`);
  if (bNeedsFromA.length > 0) evidence.push(`B가 필요로 하는 결: ${bNeedsFromA.map(e => ELEMENT_KO[e]).join('·')} ← A가 가짐`);

  return {
    aNeedsFromB,
    bNeedsFromA,
    mutualComplement,
    oneSidednessRisk,
    evidence,
  };
}
