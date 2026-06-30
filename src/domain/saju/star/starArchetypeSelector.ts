// 별빛 사주 — StarArchetype Selector (2026-05).
// PersonalSajuGptInput에서 시그널 풀을 추출 → 각 archetype의 triggerSignals와 매칭 점수.
// 가장 높은 점수의 archetype 반환. 동점 시 specialStar > tenGod > lifeWeapon 우선.
// 같은 입력 + 같은 ruleConfig → 같은 결과 (deterministic).

import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type {
  StarArchetype, StarArchetypeScore, StarArchetypeEvidence,
} from './starArchetypeTypes';
import { STAR_ARCHETYPE_CATALOG, selectFallbackArchetype } from './starArchetypeCatalog';

// ============================================================
// 가중치 (사용자 spec)
// ============================================================
const WEIGHTS = {
  dayMaster: 2,
  elementStrength: 2,
  tenGod: 3,
  specialStar: 3,
  lifeWeapon: 2,
  lifeTrap: 1,
  relationshipPattern: 1,
  moneyMakingStyle: 1,
  avoidPenalty: -5,
};

// ============================================================
// PersonalSajuGptInput → 시그널 풀 (소스별로 묶어 출처 가중치 적용 가능)
// ============================================================
interface SignalPool {
  dayMaster: Set<string>;
  elementStrength: Set<string>;
  tenGods: Set<string>;
  specialStars: Set<string>;
  lifeWeapons: Set<string>;
  lifeTraps: Set<string>;
  relationshipPattern: Set<string>;
  moneyMakingStyle: Set<string>;
}

// 텍스트에서 부분 매칭 가능한 토큰 추출 (한국어 chunk + stem 제거)
function tokensFromText(s: string | undefined | null): string[] {
  if (!s) return [];
  const out = new Set<string>();
  const trimmed = s.trim();
  if (!trimmed) return [];
  out.add(trimmed);
  for (const chunk of trimmed.split(/[\s/·,()'"、\-]+/)) {
    if (chunk.length >= 2 && chunk.length <= 12) {
      out.add(chunk);
      if (chunk.length >= 3) {
        const last = chunk.slice(-1);
        if (/[은는이가을를의에서로와과도력성형]/.test(last)) {
          const stem = chunk.slice(0, -1);
          if (stem.length >= 2) out.add(stem);
        }
      }
    }
  }
  return Array.from(out);
}

function buildSignalPool(input: PersonalSajuGptInput): SignalPool {
  const dm = input.birthChart.dayMaster;
  const pool: SignalPool = {
    dayMaster: new Set<string>([dm, dm[0] ?? '']),
    elementStrength: new Set<string>(),
    tenGods: new Set<string>(),
    specialStars: new Set<string>(),
    lifeWeapons: new Set<string>(),
    lifeTraps: new Set<string>(),
    relationshipPattern: new Set<string>(),
    moneyMakingStyle: new Set<string>(),
  };

  // elementStrength: strongest + 기운 라벨
  for (const el of input.coreAnalysis.elementStrength.strongest) {
    pool.elementStrength.add(el);
    pool.elementStrength.add(`${el} 기운`);
    pool.elementStrength.add(`강한 ${el}`);
  }

  // tenGods: visible + strongest. 묶음 라벨도
  const tgs = new Set<string>([
    ...input.coreAnalysis.tenGods.visible.map(v => v.tenGod),
    ...input.coreAnalysis.tenGods.strongest,
  ]);
  for (const tg of tgs) {
    pool.tenGods.add(tg);
    pool.tenGods.add(`${tg} 강함`);
  }
  // 십성 묶음 라벨 (식상, 재성, 관성, 인성, 비겁)
  const tgGroupMap: Record<string, string> = {
    '식신': '식상', '상관': '식상',
    '편재': '재성', '정재': '재성',
    '편관': '관성', '정관': '관성',
    '편인': '인성', '정인': '인성',
    '비견': '비겁', '겁재': '비겁',
  };
  for (const tg of tgs) {
    const grp = tgGroupMap[tg];
    if (grp) {
      pool.tenGods.add(grp);
      pool.tenGods.add(`${grp} 강함`);
    }
  }

  // 신살
  for (const star of input.coreAnalysis.specialStars) {
    if (star.name) pool.specialStars.add(star.name);
  }
  // specialPoints에서도 신살/구조 라벨 추출 (양인/괴강/식상생재 등)
  for (const sp of input.specialPoints) {
    if (sp.name) pool.specialStars.add(sp.name);
  }

  // 강한 일간 (신강 시그널)
  if (input.coreAnalysis.dayMasterStrength.level === 'strong' ||
      input.coreAnalysis.dayMasterStrength.level === 'very-strong') {
    pool.dayMaster.add('강한 일간');
    pool.tenGods.add('강한 비겁');
  }

  // lifeWeapons: name + category + howToUse 토큰
  for (const w of input.lifeWeapons) {
    for (const t of tokensFromText(w.name)) pool.lifeWeapons.add(t);
    pool.lifeWeapons.add(w.category);
    for (const t of tokensFromText(w.howToUse)) pool.lifeWeapons.add(t);
  }
  // lifeTraps
  for (const lt of input.lifeTraps) {
    for (const t of tokensFromText(lt.name)) pool.lifeTraps.add(t);
    pool.lifeTraps.add(lt.category);
  }

  // careerSpecificAnalysis.moneyMakingStyle
  for (const m of input.careerSpecificAnalysis.moneyMakingStyle) {
    pool.moneyMakingStyle.add(m.kind);
    for (const t of tokensFromText(m.title)) pool.moneyMakingStyle.add(t);
  }
  // careerSpecificAnalysis.topCareerMatches roles도 weapon 풀에
  for (const c of input.careerSpecificAnalysis.topCareerMatches) {
    for (const r of c.roles) for (const t of tokensFromText(r)) pool.lifeWeapons.add(t);
  }

  // relationshipPattern은 V4 데이터에 없으므로 시그널 없음 (필요 시 추후 확장)

  return pool;
}

// ============================================================
// 시그널 매칭 — pool의 어떤 set에 signal이 포함되는지 검사하여 출처별 가중치 합산
// ============================================================
interface MatchResult { score: number; matched: string[]; sources: Set<string>; }

function matchSignal(signal: string, pool: SignalPool): { weight: number; source?: string } {
  // 우선순위: specialStar > tenGod > dayMaster > elementStrength > lifeWeapon > lifeTrap > money
  const tests: Array<[keyof SignalPool, number]> = [
    ['specialStars', WEIGHTS.specialStar],
    ['tenGods', WEIGHTS.tenGod],
    ['dayMaster', WEIGHTS.dayMaster],
    ['elementStrength', WEIGHTS.elementStrength],
    ['lifeWeapons', WEIGHTS.lifeWeapon],
    ['lifeTraps', WEIGHTS.lifeTrap],
    ['moneyMakingStyle', WEIGHTS.moneyMakingStyle],
    ['relationshipPattern', WEIGHTS.relationshipPattern],
  ];
  for (const [key, weight] of tests) {
    const set = pool[key];
    // 정확/부분 매칭
    if (set.has(signal)) return { weight, source: key };
    for (const item of set) {
      if (item && signal.length >= 2 && (item.includes(signal) || signal.includes(item))) {
        return { weight, source: key };
      }
    }
  }
  return { weight: 0 };
}

function scoreArchetype(arch: StarArchetype, pool: SignalPool): StarArchetypeScore {
  const matched: string[] = [];
  const blockedBy: string[] = [];
  let score = 0;
  for (const sig of arch.triggerSignals) {
    const m = matchSignal(sig, pool);
    if (m.weight > 0) {
      score += m.weight;
      matched.push(sig);
    }
  }
  if (arch.avoidSignals) {
    for (const sig of arch.avoidSignals) {
      const m = matchSignal(sig, pool);
      if (m.weight > 0) {
        score += WEIGHTS.avoidPenalty;
        blockedBy.push(sig);
      }
    }
  }
  return { archetypeId: arch.id, score, matchedSignals: matched, blockedBy };
}

// ============================================================
// 메인 — 모든 아키타입 점수 계산 → 정렬 → 선택
// ============================================================
export interface StarSelectionResult {
  archetype: StarArchetype;
  score: StarArchetypeScore;
  /** 디버깅용 — 모든 아키타입 점수 (사용자 노출 X) */
  allScores: StarArchetypeScore[];
}

export function selectStarArchetype(input: PersonalSajuGptInput): StarSelectionResult {
  const pool = buildSignalPool(input);
  const allScores = STAR_ARCHETYPE_CATALOG.map(a => scoreArchetype(a, pool));

  // 정렬: score desc, 동점 시 catalog 순서 (deterministic)
  allScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // 동점이면 specialStar/tenGod/lifeWeapon 매칭 수가 많은 쪽 우선
    // (matched 중 source-prefix로 추정하기 어려우니, matched 수로 단순화)
    if (b.matchedSignals.length !== a.matchedSignals.length) {
      return b.matchedSignals.length - a.matchedSignals.length;
    }
    // 마지막으로 catalog 순서 (id 알파벳 stable)
    return a.archetypeId.localeCompare(b.archetypeId);
  });

  const top = allScores[0];
  const topArchetype = STAR_ARCHETYPE_CATALOG.find(a => a.id === top.archetypeId);

  // 점수가 너무 낮으면 fallback — 일간 오행별로 분기(목·화·토·금·수)해서
  // 뚜렷한 시그널이 없는 사주끼리도 같은 한 장으로 몰리지 않게 한다.
  if (!topArchetype || top.score < 3) {
    const fb = selectFallbackArchetype(input.birthChart.dayMaster);
    return {
      archetype: { ...fb, evidence: buildEvidence(fb, [], input) },
      score: { archetypeId: fb.id, score: 0, matchedSignals: [] },
      allScores,
    };
  }

  // evidence 채우기
  const archetype: StarArchetype = {
    ...topArchetype,
    evidence: buildEvidence(topArchetype, top.matchedSignals, input),
  };

  return { archetype, score: top, allScores };
}

function buildEvidence(
  _arch: StarArchetype,
  matched: string[],
  input: PersonalSajuGptInput,
): StarArchetypeEvidence[] {
  const evidence: StarArchetypeEvidence[] = [];
  if (matched.length === 0) return evidence;
  // dayMaster
  const dm = input.birthChart.dayMaster;
  if (matched.some(s => s === dm || s.includes(dm[0] ?? ''))) {
    evidence.push({ source: 'dayMaster', description: `일간이 ${dm}` });
  }
  // tenGods
  const tgStr = input.coreAnalysis.tenGods.strongest.join('·');
  if (tgStr) {
    evidence.push({ source: 'tenGods', description: `강한 십성: ${tgStr}` });
  }
  // specialStars
  const stars = input.coreAnalysis.specialStars.map(s => s.name).filter(Boolean);
  if (stars.length > 0) {
    evidence.push({ source: 'specialStars', description: `주요 신살: ${stars.slice(0, 3).join(', ')}` });
  }
  // lifeWeapons
  if (input.lifeWeapons.length > 0) {
    evidence.push({
      source: 'lifeWeapons',
      description: `강점: ${input.lifeWeapons.slice(0, 2).map(w => w.name).join(', ')}`,
    });
  }
  return evidence;
}
