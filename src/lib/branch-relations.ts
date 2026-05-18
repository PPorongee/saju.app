/**
 * 지지/천간 관계 계산 모듈
 *
 * 합/충/형/파/해/반합/방합/육합/천라지망/원진을 결정론적으로 분석한다.
 * 모든 관계는 학파별 차이가 있을 수 있으며 본 모듈은 가장 보편적인 표준을 따른다.
 *
 * Reference: 연해자평, 자평진전, 삼명통회
 */

import { SajuResult, CG, JJ } from './saju-calc';

const CHEONGAN_HAP_PAIRS: Array<[number, number, string, string]> = [
  [0, 5, '토', '갑기합화토'],
  [1, 6, '금', '을경합화금'],
  [2, 7, '수', '병신합화수'],
  [3, 8, '목', '정임합화목'],
  [4, 9, '화', '무계합화화'],
];

const YUKHAP_PAIRS: Array<[number, number, string, string]> = [
  [0, 1, '토', '자축합'],
  [2, 11, '목', '인해합'],
  [3, 10, '화', '묘술합'],
  [4, 9, '금', '진유합'],
  [5, 8, '수', '사신합'],
  [6, 7, '화', '오미합'],
];

const SAMHAP_SETS: Array<[number, number, number, string]> = [
  [8, 0, 4, '수'],
  [2, 6, 10, '화'],
  [5, 9, 1, '금'],
  [11, 3, 7, '목'],
];

const BANHAP_PAIRS: Array<[number, number, string]> = [
  [8, 0, '수'], [0, 4, '수'],
  [2, 6, '화'], [6, 10, '화'],
  [5, 9, '금'], [9, 1, '금'],
  [11, 3, '목'], [3, 7, '목'],
];

const BANGHAP_SETS: Array<[number, number, number, string, string]> = [
  [2, 3, 4, '목', '동방 인묘진'],
  [5, 6, 7, '화', '남방 사오미'],
  [8, 9, 10, '금', '서방 신유술'],
  [11, 0, 1, '수', '북방 해자축'],
];

const CHUNG_PAIRS: Array<[number, number]> = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
];

const SAMHYUNG_SETS: Array<[number, number, number, string]> = [
  [2, 5, 8, '인사신 무은지형'],
  [1, 10, 7, '축술미 지세지형'],
];

const SANGHYUNG_PAIR: [number, number, string] = [0, 3, '자묘 무례지형'];

const JAHYUNG_SELF: number[] = [4, 6, 9, 11];

const PA_PAIRS: Array<[number, number]> = [
  [0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [7, 10],
];

const HAE_PAIRS: Array<[number, number]> = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
];

const WONJIN_PAIRS: Array<[number, number]> = [
  [0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10],
];

const CHEONRA_BRANCHES: [number, number] = [10, 11];
const JIMANG_BRANCHES: [number, number] = [4, 5];

export interface RelationItem {
  type: '천간합' | '육합' | '삼합' | '반합' | '방합' | '충' | '형' | '파' | '해' | '원진' | '천라' | '지망';
  subtype?: '삼형' | '상형' | '자형';
  positions: string[];
  characters: string[];
  element?: string;
  description: string;
}

export interface BranchRelationsResult {
  items: RelationItem[];
  promptBlock: string;
}

interface StemSlot { pos: string; stem: number; }
interface BranchSlot { pos: string; branch: number; }

function getStemSlots(sj: SajuResult): StemSlot[] {
  const out: StemSlot[] = [
    { pos: '년간', stem: sj.yStem },
    { pos: '월간', stem: sj.mStem },
    { pos: '일간', stem: sj.dStem },
  ];
  if (sj.hStem >= 0) out.push({ pos: '시간', stem: sj.hStem });
  return out;
}

function getBranchSlots(sj: SajuResult): BranchSlot[] {
  const out: BranchSlot[] = [
    { pos: '년지', branch: sj.yBranch },
    { pos: '월지', branch: sj.mBranch },
    { pos: '일지', branch: sj.dBranch },
  ];
  if (sj.hBranch >= 0) out.push({ pos: '시지', branch: sj.hBranch });
  return out;
}

function findBranchSlots(slots: BranchSlot[], target: number): BranchSlot[] {
  return slots.filter(s => s.branch === target);
}

export function analyzeBranchRelations(sj: SajuResult): BranchRelationsResult {
  const items: RelationItem[] = [];
  const stemSlots = getStemSlots(sj);
  const branchSlots = getBranchSlots(sj);

  // 1. 천간합
  for (let i = 0; i < stemSlots.length; i++) {
    for (let j = i + 1; j < stemSlots.length; j++) {
      const a = stemSlots[i].stem, b = stemSlots[j].stem;
      for (const [s1, s2, elem, name] of CHEONGAN_HAP_PAIRS) {
        if ((a === s1 && b === s2) || (a === s2 && b === s1)) {
          items.push({
            type: '천간합',
            positions: [stemSlots[i].pos, stemSlots[j].pos],
            characters: [CG[a], CG[b]],
            element: elem,
            description: `${name} (${stemSlots[i].pos}-${stemSlots[j].pos}) → ${elem} 기운 강화`,
          });
        }
      }
    }
  }

  // 2. 삼합 (먼저 검사 — 삼합 글자는 반합에서 제외)
  const samhapMembers = new Set<number>();
  for (const [b1, b2, b3, elem] of SAMHAP_SETS) {
    const s1 = findBranchSlots(branchSlots, b1)[0];
    const s2 = findBranchSlots(branchSlots, b2)[0];
    const s3 = findBranchSlots(branchSlots, b3)[0];
    if (s1 && s2 && s3) {
      items.push({
        type: '삼합',
        positions: [s1.pos, s2.pos, s3.pos],
        characters: [JJ[b1], JJ[b2], JJ[b3]],
        element: elem,
        description: `${JJ[b1]}${JJ[b2]}${JJ[b3]} 삼합 → ${elem}국 형성 (강력한 ${elem} 기운)`,
      });
      samhapMembers.add(b1); samhapMembers.add(b2); samhapMembers.add(b3);
    }
  }

  // 3. 방합
  for (const [b1, b2, b3, elem, name] of BANGHAP_SETS) {
    const s1 = findBranchSlots(branchSlots, b1)[0];
    const s2 = findBranchSlots(branchSlots, b2)[0];
    const s3 = findBranchSlots(branchSlots, b3)[0];
    if (s1 && s2 && s3) {
      items.push({
        type: '방합',
        positions: [s1.pos, s2.pos, s3.pos],
        characters: [JJ[b1], JJ[b2], JJ[b3]],
        element: elem,
        description: `${name} → ${elem} 기운 극대화 (계절 방위 결집)`,
      });
    }
  }

  // 4. 반합 (삼합에 들어간 두 글자는 제외)
  const seenBanhap = new Set<string>();
  for (let i = 0; i < branchSlots.length; i++) {
    for (let j = i + 1; j < branchSlots.length; j++) {
      const a = branchSlots[i].branch, b = branchSlots[j].branch;
      if (samhapMembers.has(a) && samhapMembers.has(b)) continue;
      for (const [b1, b2, elem] of BANHAP_PAIRS) {
        if ((a === b1 && b === b2) || (a === b2 && b === b1)) {
          const key = `${Math.min(a, b)}-${Math.max(a, b)}-${branchSlots[i].pos}-${branchSlots[j].pos}`;
          if (seenBanhap.has(key)) continue;
          seenBanhap.add(key);
          items.push({
            type: '반합',
            positions: [branchSlots[i].pos, branchSlots[j].pos],
            characters: [JJ[a], JJ[b]],
            element: elem,
            description: `${JJ[a]}${JJ[b]} 반합 → ${elem} 기운 강화`,
          });
        }
      }
    }
  }

  // 5. 육합
  for (let i = 0; i < branchSlots.length; i++) {
    for (let j = i + 1; j < branchSlots.length; j++) {
      const a = branchSlots[i].branch, b = branchSlots[j].branch;
      for (const [b1, b2, elem, name] of YUKHAP_PAIRS) {
        if ((a === b1 && b === b2) || (a === b2 && b === b1)) {
          items.push({
            type: '육합',
            positions: [branchSlots[i].pos, branchSlots[j].pos],
            characters: [JJ[a], JJ[b]],
            element: elem,
            description: `${name} (${branchSlots[i].pos}-${branchSlots[j].pos}) → ${elem} 합화`,
          });
        }
      }
    }
  }

  // 6. 충
  for (let i = 0; i < branchSlots.length; i++) {
    for (let j = i + 1; j < branchSlots.length; j++) {
      const a = branchSlots[i].branch, b = branchSlots[j].branch;
      for (const [b1, b2] of CHUNG_PAIRS) {
        if ((a === b1 && b === b2) || (a === b2 && b === b1)) {
          items.push({
            type: '충',
            positions: [branchSlots[i].pos, branchSlots[j].pos],
            characters: [JJ[a], JJ[b]],
            description: `${JJ[a]}${JJ[b]}충 (${branchSlots[i].pos}-${branchSlots[j].pos}) → 변화·이동·갈등 에너지`,
          });
        }
      }
    }
  }

  // 7-A. 삼형
  for (const [b1, b2, b3, name] of SAMHYUNG_SETS) {
    const s1 = findBranchSlots(branchSlots, b1)[0];
    const s2 = findBranchSlots(branchSlots, b2)[0];
    const s3 = findBranchSlots(branchSlots, b3)[0];
    if (s1 && s2 && s3) {
      items.push({
        type: '형',
        subtype: '삼형',
        positions: [s1.pos, s2.pos, s3.pos],
        characters: [JJ[b1], JJ[b2], JJ[b3]],
        description: `${name} → 송사·관재·수술 등 강한 마찰`,
      });
    }
  }

  // 7-B. 상형 (자묘)
  {
    const [b1, b2, name] = SANGHYUNG_PAIR;
    const s1 = findBranchSlots(branchSlots, b1)[0];
    const s2 = findBranchSlots(branchSlots, b2)[0];
    if (s1 && s2) {
      items.push({
        type: '형',
        subtype: '상형',
        positions: [s1.pos, s2.pos],
        characters: [JJ[b1], JJ[b2]],
        description: `${name} → 무례·갈등의 형`,
      });
    }
  }

  // 7-C. 자형 (같은 글자 2개)
  for (const b of JAHYUNG_SELF) {
    const matches = findBranchSlots(branchSlots, b);
    if (matches.length >= 2) {
      items.push({
        type: '형',
        subtype: '자형',
        positions: matches.map(m => m.pos),
        characters: matches.map(() => JJ[b]),
        description: `${JJ[b]}${JJ[b]} 자형 → 스스로 자초하는 갈등`,
      });
    }
  }

  // 8. 파
  for (let i = 0; i < branchSlots.length; i++) {
    for (let j = i + 1; j < branchSlots.length; j++) {
      const a = branchSlots[i].branch, b = branchSlots[j].branch;
      for (const [b1, b2] of PA_PAIRS) {
        if ((a === b1 && b === b2) || (a === b2 && b === b1)) {
          items.push({
            type: '파',
            positions: [branchSlots[i].pos, branchSlots[j].pos],
            characters: [JJ[a], JJ[b]],
            description: `${JJ[a]}${JJ[b]}파 (${branchSlots[i].pos}-${branchSlots[j].pos}) → 깨짐·분리 작용`,
          });
        }
      }
    }
  }

  // 9. 해
  for (let i = 0; i < branchSlots.length; i++) {
    for (let j = i + 1; j < branchSlots.length; j++) {
      const a = branchSlots[i].branch, b = branchSlots[j].branch;
      for (const [b1, b2] of HAE_PAIRS) {
        if ((a === b1 && b === b2) || (a === b2 && b === b1)) {
          items.push({
            type: '해',
            positions: [branchSlots[i].pos, branchSlots[j].pos],
            characters: [JJ[a], JJ[b]],
            description: `${JJ[a]}${JJ[b]}해 (${branchSlots[i].pos}-${branchSlots[j].pos}) → 은근한 방해·시기`,
          });
        }
      }
    }
  }

  // 10. 원진
  for (let i = 0; i < branchSlots.length; i++) {
    for (let j = i + 1; j < branchSlots.length; j++) {
      const a = branchSlots[i].branch, b = branchSlots[j].branch;
      for (const [b1, b2] of WONJIN_PAIRS) {
        if ((a === b1 && b === b2) || (a === b2 && b === b1)) {
          items.push({
            type: '원진',
            positions: [branchSlots[i].pos, branchSlots[j].pos],
            characters: [JJ[a], JJ[b]],
            description: `${JJ[a]}${JJ[b]} 원진 → 미운정·애증 패턴`,
          });
        }
      }
    }
  }

  // 11. 천라
  {
    const s1 = findBranchSlots(branchSlots, CHEONRA_BRANCHES[0])[0];
    const s2 = findBranchSlots(branchSlots, CHEONRA_BRANCHES[1])[0];
    if (s1 && s2) {
      items.push({
        type: '천라',
        positions: [s1.pos, s2.pos],
        characters: [JJ[CHEONRA_BRANCHES[0]], JJ[CHEONRA_BRANCHES[1]]],
        description: '천라(戌亥) → 활인업(의료/법조/종교)에 길, 일반 직장은 답답함',
      });
    }
  }

  // 12. 지망
  {
    const s1 = findBranchSlots(branchSlots, JIMANG_BRANCHES[0])[0];
    const s2 = findBranchSlots(branchSlots, JIMANG_BRANCHES[1])[0];
    if (s1 && s2) {
      items.push({
        type: '지망',
        positions: [s1.pos, s2.pos],
        characters: [JJ[JIMANG_BRANCHES[0]], JJ[JIMANG_BRANCHES[1]]],
        description: '지망(辰巳) → 여성에게 더 영향, 활인업 종사 시 길',
      });
    }
  }

  return { items, promptBlock: buildPromptBlock(items) };
}

function buildPromptBlock(items: RelationItem[]): string {
  if (items.length === 0) {
    return '지지/천간 관계: 특별한 합·충·형 등 없음 (관계가 단순한 안정적 구조)';
  }
  const order: RelationItem['type'][] = [
    '천간합', '삼합', '방합', '반합', '육합',
    '충', '형', '파', '해', '원진', '천라', '지망',
  ];
  const lines: string[] = ['지지/천간 관계 분석 (시스템 사전 계산, 이 결과를 기반으로 해석):'];
  for (const t of order) {
    const group = items.filter(i => i.type === t);
    for (const item of group) {
      lines.push(`  - ${item.description}`);
    }
  }
  return lines.join('\n');
}
