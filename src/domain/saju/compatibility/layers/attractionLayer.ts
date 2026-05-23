// 끌림 레이어 — 왜 서로에게 끌리는가.

import type {
  AttractionAnalysis, DayMasterRelationAnalysis, SpousePalaceRelationAnalysis,
  ElementComplementAnalysis, TenGodInteractionAnalysis, UsefulGodInteractionAnalysis,
  RelationshipType,
} from '../compatibilityTypes';
import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
  dayMasterRelation: DayMasterRelationAnalysis;
  spousePalaceRelation: SpousePalaceRelationAnalysis;
  elementComplement: ElementComplementAnalysis;
  tenGodInteraction: TenGodInteractionAnalysis;
  usefulGodInteraction: UsefulGodInteractionAnalysis;
  relationshipType: RelationshipType;
}

export function analyzeAttraction(args: Args): AttractionAnalysis {
  const {
    spousePalaceRelation, elementComplement, tenGodInteraction,
    usefulGodInteraction, personA, personB,
  } = args;

  const mainAttraction: string[] = [];
  const evidence: string[] = [];

  // 일지 합/충
  if (spousePalaceRelation.relationTypes.includes('six-harmony') ||
      spousePalaceRelation.relationTypes.includes('three-harmony')) {
    mainAttraction.push('가까이 있으면 자연스럽게 자리잡히는 익숙한 끌림');
    evidence.push('일지 합');
  }
  if (spousePalaceRelation.relationTypes.includes('conflict')) {
    mainAttraction.push('자극적이고 의식되는 끌림 — 처음부터 강하게 신경 쓰이는 결');
    evidence.push('일지 충');
  }

  // 오행 보완
  if (elementComplement.mutualComplement === 'strong' || elementComplement.mutualComplement === 'moderate') {
    mainAttraction.push('상대가 내게 없는 결을 채워준다는 보완적 끌림');
    evidence.push(`오행 보완 ${elementComplement.mutualComplement}`);
  }

  // 용신 자극
  if (usefulGodInteraction.aUsefulTouchedByB.length > 0 || usefulGodInteraction.bUsefulTouchedByA.length > 0) {
    mainAttraction.push('상대가 내 결핍 또는 욕구를 본능적으로 건드리는 끌림');
    evidence.push('상호 용신 자극');
  }

  // 매력 포인트 — 십성
  for (const pt of tenGodInteraction.attractionPoints.slice(0, 2)) {
    mainAttraction.push(pt);
  }

  // 도화/홍염 같은 매력 신살이 있다면 가산
  const aHasCharm = personA.specialPoints.some(p => p.id === 'peachBlossomExpression' || p.id === 'hongyeomCharm');
  const bHasCharm = personB.specialPoints.some(p => p.id === 'peachBlossomExpression' || p.id === 'hongyeomCharm');
  if (aHasCharm) { mainAttraction.push('A의 표현·매력 포인트가 자연스럽게 눈에 들어옴'); evidence.push('A 매력 신살'); }
  if (bHasCharm) { mainAttraction.push('B의 표현·매력 포인트가 자연스럽게 눈에 들어옴'); evidence.push('B 매력 신살'); }

  // initialChemistry 결정
  let initialChemistry: AttractionAnalysis['initialChemistry'] = 'soft';
  const palaceHasHard = spousePalaceRelation.relationTypes.includes('conflict') || spousePalaceRelation.relationTypes.includes('punishment');
  const palaceHasSoft = spousePalaceRelation.relationTypes.includes('six-harmony') || spousePalaceRelation.relationTypes.includes('three-harmony');
  if (palaceHasHard && palaceHasSoft) initialChemistry = 'unstable';
  else if (palaceHasHard) initialChemistry = 'strong';
  else if (palaceHasSoft && elementComplement.mutualComplement !== 'weak') initialChemistry = 'slow-burn';
  else if (elementComplement.mutualComplement === 'strong') initialChemistry = 'practical';

  const why = (() => {
    if (initialChemistry === 'strong') return '편안해서 끌린다기보다, 신경 쓰여서 끌리는 쪽에 가까운 결이에요.';
    if (initialChemistry === 'slow-burn') return '처음부터 강한 자극은 아니지만, 같이 있을수록 자연스럽게 자리잡히는 결이에요.';
    if (initialChemistry === 'practical') return '서로 부족한 부분을 채워주는 보완감이 끌림으로 작용하는 결이에요.';
    if (initialChemistry === 'unstable') return '끌림과 충돌이 같이 따라오는 결 — 좋을 땐 강하게 빠지고, 어긋날 땐 격해질 수 있어요.';
    return '강한 즉시 끌림보다, 시간·맥락에 따라 자연스럽게 결이 형성되는 관계예요.';
  })();

  return {
    mainAttraction: dedupe(mainAttraction).slice(0, 5),
    whyTheyNoticeEachOther: why,
    initialChemistry,
    evidence,
  };
}

function dedupe<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }
