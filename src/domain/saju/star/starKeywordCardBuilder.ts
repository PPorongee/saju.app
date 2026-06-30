// 별빛 사주 — Star Keyword Card builder (2026-05).
// PersonalSajuGptInput → 선택된 archetype → 사용자에게 보여줄 카드 데이터.
// LLM 호출 없음 (template 방식). 추후 LLM polishing 가능하나 우선 카탈로그 텍스트 사용.
//
// 2026-06: 개인 변주(C) 주입 — 고정 아키타입은 17→21칸으로 늘렸지만(A),
// 같은 칸이어도 일간 비유·강한 오행을 리드 문구/키워드에 섞어 사람마다 다르게 보이게 한다.
// 전부 결정론(같은 입력 → 같은 카드), GPT 0회.

import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type { StarKeywordCardData } from './starArchetypeTypes';
import { selectStarArchetype } from './starArchetypeSelector';
import { STEM_ELEMENT, ELEMENT_KO } from '../rules/elements';
import type { HeavenlyStem } from '../rules/heavenlyStems';

// 천간(일간) → 짧은 비유 명사. 카드 리드 문구("~ 같은 당신은")에 사용.
const STEM_PERSONA: Record<HeavenlyStem, string> = {
  갑: '큰 나무', 을: '여린 풀과 덩굴',
  병: '한낮의 태양', 정: '은은한 촛불',
  무: '넓은 산과 대지', 기: '기름진 밭',
  경: '잘 벼린 칼', 신: '세공된 보석',
  임: '큰 바다', 계: '촉촉한 단비',
};

/** 일간 천간 글자 추출 (dayMaster가 "갑" 또는 "갑목" 등으로 와도 첫 글자 사용). */
function stemOf(dayMaster: string | undefined | null): HeavenlyStem | undefined {
  const ch = (dayMaster ?? '').trim().charAt(0) as HeavenlyStem;
  return STEM_ELEMENT[ch] ? ch : undefined;
}

/** 일간 비유 기반 리드 문구. 판별 불가 시 undefined(기본 "당신은"). */
function buildPersonalLead(dayMaster: string | undefined | null): string | undefined {
  const stem = stemOf(dayMaster);
  if (!stem) return undefined;
  return `${STEM_PERSONA[stem]} 같은 당신은`;
}

/** 아키타입 키워드 + 개인 키워드(일간·강한 오행)를 섞어 최대 5개, 중복 제거. */
function buildPersonalKeywords(
  archetypeKeywords: string[],
  input: PersonalSajuGptInput,
): string[] {
  const personal: string[] = [];

  // 일간 = 천간 + 오행 (예: "갑목")
  const stem = stemOf(input.birthChart.dayMaster);
  if (stem) {
    const el = STEM_ELEMENT[stem];
    personal.push(`${stem}${ELEMENT_KO[el]}`);
  }

  // 가장 강한 오행 (예: "강한 화")
  const strongest = input.coreAnalysis.elementStrength.strongest?.[0];
  if (strongest && ELEMENT_KO[strongest]) {
    personal.push(`강한 ${ELEMENT_KO[strongest]}`);
  }

  // 개인 키워드 먼저 → 아키타입 키워드. 중복 제거 후 최대 5개.
  const merged: string[] = [];
  for (const kw of [...personal, ...archetypeKeywords]) {
    const k = (kw ?? '').trim();
    if (k && !merged.includes(k)) merged.push(k);
    if (merged.length >= 5) break;
  }
  // validator는 3~5개를 권장 — 부족하면 아키타입 키워드로 보충(위 루프에서 이미 처리됨).
  return merged;
}

export function buildStarKeywordCard(input: PersonalSajuGptInput): StarKeywordCardData {
  const { archetype } = selectStarArchetype(input);
  return {
    serviceName: '별빛 사주',
    label: '별빛 키워드',
    titleLead: '당신은',
    archetype,
    displayTitle: archetype.title,
    shortDescription: archetype.shortDescription,
    brightSide: archetype.brightSide,
    shadowSide: archetype.shadowSide,
    keywords: buildPersonalKeywords(archetype.keywords, input),
    hashtag: '#별빛사주',
    personalLead: buildPersonalLead(input.birthChart.dayMaster),
  };
}
