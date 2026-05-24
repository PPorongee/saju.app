// 별빛 사주 — Star Archetype Validator (2026-05).
// LLM 폴리싱 후/카탈로그 진입 시 카드 데이터의 안전성 검사.
// 사용자 노출 X — 내부 게이트로 활용.

import type {
  StarKeywordCardData, StarValidationResult, StarValidationIssue,
} from './starArchetypeTypes';
import { STAR_ARCHETYPE_CATALOG, STAR_ARCHETYPE_FALLBACK } from './starArchetypeCatalog';

const BANNED_PHRASES = [
  '100년에 한 번',
  '천년에 한 번',
  '선택받은 별',
  '무조건 성공',
  '반드시 부자',
  '타고난 재벌',
  '인생 역전',
  '외로운 별',
  '고집 센 별',
  '사람 못 믿는 별',
  '돈이 새는 별',
  '상위 1%',
  '희귀한 사주',
];

const TITLE_SUFFIX = '별';

function push(issues: StarValidationIssue[], i: StarValidationIssue) { issues.push(i); }

export function validateStarKeywordCard(card: StarKeywordCardData): StarValidationResult {
  const issues: StarValidationIssue[] = [];

  // 1. title "~~~한 별" 형태
  if (!card.displayTitle.endsWith(TITLE_SUFFIX)) {
    push(issues, {
      type: 'title-format-violation',
      field: 'displayTitle',
      reason: `title은 "${TITLE_SUFFIX}"로 끝나야 함 (현재: ${card.displayTitle})`,
      severity: 'high',
    });
  }

  // 2. title이 카탈로그 기반인지 (fallback 포함)
  const knownTitles = new Set<string>([
    ...STAR_ARCHETYPE_CATALOG.map(a => a.title),
    STAR_ARCHETYPE_FALLBACK.title,
  ]);
  if (!knownTitles.has(card.displayTitle)) {
    push(issues, {
      type: 'title-format-violation',
      field: 'displayTitle',
      reason: `카탈로그에 없는 임의 title (현재: ${card.displayTitle})`,
      severity: 'high',
    });
  }

  // 3. 금지 표현
  const fullText = [
    card.displayTitle, card.shortDescription, card.brightSide, card.shadowSide,
    ...card.keywords,
  ].join(' ');
  for (const phrase of BANNED_PHRASES) {
    if (fullText.includes(phrase)) {
      push(issues, {
        type: 'banned-phrase',
        field: 'card',
        reason: `금지 표현 "${phrase}" 발견`,
        severity: 'high',
      });
    }
  }

  // 4. shortDescription 길이
  if (card.shortDescription.length > 240) {
    push(issues, {
      type: 'description-too-long',
      field: 'shortDescription',
      reason: `shortDescription 길이 ${card.shortDescription.length} (240자 이하 권장)`,
      severity: 'medium',
    });
  }
  if (card.shortDescription.length < 40) {
    push(issues, {
      type: 'description-too-short',
      field: 'shortDescription',
      reason: `shortDescription 길이 ${card.shortDescription.length} (40자 이상 권장)`,
      severity: 'medium',
    });
  }

  // 5. keywords 수
  if (card.keywords.length < 3 || card.keywords.length > 5) {
    push(issues, {
      type: 'keyword-count-out-of-range',
      field: 'keywords',
      reason: `keywords ${card.keywords.length}개 (3~5개 권장)`,
      severity: 'low',
    });
  }

  // 6. shadow가 지나치게 부정적인지 (부정 단어 비율)
  const negWords = ['실패', '망', '저주', '불행', '무능', '루저'];
  const negHits = negWords.filter(w => card.shadowSide.includes(w)).length;
  if (negHits >= 2) {
    push(issues, {
      type: 'shadow-too-negative',
      field: 'shadowSide',
      reason: `shadowSide에 부정적 단어 ${negHits}개`,
      severity: 'medium',
    });
  }

  const high = issues.filter(i => i.severity === 'high').length;
  return { isValid: high === 0, issues };
}
