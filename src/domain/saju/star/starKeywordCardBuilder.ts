// 별빛 사주 — Star Keyword Card builder (2026-05).
// PersonalSajuGptInput → 선택된 archetype → 사용자에게 보여줄 카드 데이터.
// LLM 호출 없음 (template 방식). 추후 LLM polishing 가능하나 우선 카탈로그 텍스트 사용.

import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type { StarKeywordCardData } from './starArchetypeTypes';
import { selectStarArchetype } from './starArchetypeSelector';

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
    keywords: archetype.keywords.slice(0, 5),
    hashtag: '#별빛사주',
  };
}
