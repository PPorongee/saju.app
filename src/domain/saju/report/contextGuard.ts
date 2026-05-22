// 컨텍스트 가드 (spec §14)
// 나이·혼인상태·자녀 여부·시간미상에 따라 허용/제한 주제를 산출한다.
// 결과는 (1) GPT 프롬프트의 constraint 섹션 + (2) genericSentenceFilter 의 규칙으로 사용.

import type { ContextGuardResult } from './sajuReportSchema';
import type { UserContext } from '../calendar/normalizeBirthInput';

export function buildContextGuard(ctx: UserContext, hourUnknown: boolean): ContextGuardResult {
  const allowed: string[] = [];
  const restricted: string[] = [];
  const warnings: string[] = [];

  // 기본 허용
  allowed.push('성격·기질', '인생 패턴', '돈을 버는 방식', '직업 환경', '인간관계 문제', '가족·초년운', '앞으로 3년 흐름', '실용 사용법');

  // 혼인 상태
  switch (ctx.relationshipStatus) {
    case 'married':
      restricted.push('새로운 인연/연애가 들어온다 단정');
      allowed.push('배우자와의 관계 패턴', '관계 안 소통 방식', '함께 돈·책임 다루는 방식');
      break;
    case 'single':
    case 'dating':
      restricted.push('결혼 전제의 단정');
      allowed.push('연애·관계에서 반복되는 패턴');
      break;
    case 'divorced':
    case 'widowed':
      restricted.push('새 인연 가볍게 추천');
      allowed.push('관계 회복력', '거리감', '관계 재정립');
      break;
    case 'unknown':
      warnings.push('혼인상태 미상 — 관계 주제는 보수적으로 표현');
      break;
  }

  // 자녀 여부
  if (ctx.hasChildren === false) {
    restricted.push('"자녀 때문에..." 식 단정');
  }
  if (ctx.hasChildren === 'unknown') {
    warnings.push('자녀 여부 미상 — 자녀 단정 금지');
  }

  // 나이대
  if (ctx.ageYears >= 50) {
    restricted.push('출산 시기 추천', '첫 취업·수능·사회 초년생 표현');
    allowed.push('자녀와의 관계 (성인)', '손주', '돌봄·창작·후배 양성');
  }
  if (ctx.ageYears >= 40) {
    restricted.push('수능·첫 취업 단정');
  }
  if (ctx.ageYears <= 19) {
    restricted.push('이혼·부동산 투자·노후 준비 단정');
  }
  if (ctx.ageYears <= 12) {
    restricted.push('결혼·연애·투자·직장 단정');
    allowed.push('성격·재능·학업·부모/친구 관계');
  }

  // 출생시간 미상
  if (hourUnknown) {
    restricted.push('시주 기반 단정');
    warnings.push('시간 미상 — 말년운/자녀운/내면 세부는 보수적으로');
  }

  // 항상 금지
  restricted.push(
    '건강·수명·사망·질병 단정',
    '투자 수익률·법률 결과 단정',
    '공포 마케팅',
    '과장된 희소성 (estimatedPer10000 없이 "만 명 중 n명")',
  );

  return { allowedTopics: allowed, restrictedTopics: restricted, warnings };
}
