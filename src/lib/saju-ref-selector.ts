import { SAJU_REFS } from './saju-references';

type SajuRefTopic = keyof typeof SAJU_REFS;

const DAY_MASTER_NAMES = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;

export function getRelevantRefs(options: {
  dayMaster: number;
  topics: string[];
  maxRefs?: number;
}): string {
  const { dayMaster, topics, maxRefs = 15 } = options;
  const dmName = DAY_MASTER_NAMES[dayMaster] || '';

  const collected: string[] = [];

  for (const topic of topics) {
    const refs = SAJU_REFS[topic as SajuRefTopic];
    if (!refs) continue;

    // Prioritize day-master-specific references
    const dmSpecific: string[] = [];
    const generic: string[] = [];

    for (const ref of refs) {
      if (dmName && ref.includes(dmName)) {
        dmSpecific.push(ref);
      } else {
        generic.push(ref);
      }
    }

    // Add day-master-specific refs first, then generic
    for (const r of dmSpecific) {
      if (!collected.includes(r)) collected.push(r);
    }
    for (const r of generic) {
      if (!collected.includes(r)) collected.push(r);
    }
  }

  // Limit to maxRefs
  const selected = collected.slice(0, maxRefs);

  if (selected.length === 0) return '';

  let result = '=== 참고 명리학 지식 (반드시 각 섹션에서 2-4회 인용!) ===\n' +
    '인용법: "적천수에 이르길 \'원문 내용\'이라 했는데, 이걸 너한테 적용하면~" 형식으로.\n' +
    '주의: 원문을 정확히 인용해. 없는 구절을 지어내면 안 돼! 아래 참고문헌에서 골라서 써.\n';
  for (let i = 0; i < selected.length; i++) {
    result += (i + 1) + '. ' + selected[i] + '\n';
  }
  result += '\n';

  return result;
}
