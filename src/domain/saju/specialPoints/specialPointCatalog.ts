// SpecialPoint 카탈로그 (spec §9-2, §9-4).
// 각 카테고리별 제목·라벨 + 5요소 narrative seed.
// detector는 이 카탈로그에서 골라 SpecialPoint 객체를 채운다.

import type { SpecialPointCategory } from '../report/sajuReportSchema';

export interface SpecialPointTemplate {
  category: SpecialPointCategory;
  title: string;
  shortLabel: string;
  /** 5요소 narrative seed — GPT가 풀어쓰는 기반 */
  narrative: {
    coreMeaning: string;
    whySpecial: string;
    lifeScene: string;
    goodUse: string;
    shadowSide: string;
  };
}

export const SPECIAL_POINT_TITLE_TEMPLATES: Record<string, SpecialPointTemplate> = {
  // ============= A. 귀인·보호막 =============
  cheoneulStrong: {
    category: 'noble-help',
    title: '결정적인 순간에 사람이 붙는 귀인 구조',
    shortLabel: '귀인형 사주',
    narrative: {
      coreMeaning: '천을귀인이 사주의 중요한 자리에 박혀 있는 구조.',
      whySpecial: '단순 신살이 아니라, 위기 때 사람·정보·조언·연결이 들어오는 방식으로 작동.',
      lifeScene: '혼자 풀려 했던 문제가 누군가의 한마디로 풀리거나, 우연한 만남이 다음 기회의 문을 여는 식.',
      goodUse: '필요할 때 질문하고 조언을 구하고 연결을 받아들이는 태도. 닫혀 있으면 작동 안 함.',
      shadowSide: '나를 도와줄 사람과 소모시킬 사람을 구분하지 못하면 귀인이 모래에 새는 물이 됨.',
    },
  },
  munchangScholar: {
    category: 'noble-help',
    title: '공부·시험·글로 풀리는 학자형 구조',
    shortLabel: '학당형 사주',
    narrative: {
      coreMeaning: '문창귀인이 박혀 학습·표현·시험으로 길이 풀리는 구조.',
      whySpecial: '같은 노력을 해도 문서·언어·자격으로 정리되는 결과가 더 빛남.',
      lifeScene: '문서·콘텐츠·시험·자격증·기록물에 손이 닿을 때 자신감과 성취가 동시에 오는 흐름.',
      goodUse: '머릿속 생각을 글·자료·강의로 외화. 자격·학위·포트폴리오에 시간 투자.',
      shadowSide: '인풋만 계속하고 아웃풋이 없으면 학당이 잠자는 별로 머묾.',
    },
  },

  // ============= B. 돈 되는 재능 =============
  sikSangSaengJae: {
    category: 'money-talent',
    title: '재능과 결과물이 돈으로 이어지는 구조',
    shortLabel: '돈 되는 재능',
    narrative: {
      coreMeaning: '식신·상관이 재성을 생하는 흐름 — 표현·생산물이 시장으로 연결.',
      whySpecial: '돈이 단순 저축으로 모이는 게 아니라, 내가 만든 결과물이 밖으로 나가면서 흐름이 열림.',
      lifeScene: '머릿속 아이디어를 상품·서비스·콘텐츠·기획서로 바꾸는 순간 재물이 따라옴.',
      goodUse: '작게라도 시장에 내놓는 빈도 늘리기. 생각 → 결과물 변환 사이클을 단축.',
      shadowSide: '결과물 없이 아이디어만 쌓이거나, 잘하는 것을 무료로 써버리면 돈으로 안 이어짐.',
    },
  },
  pyeonjaeStrong: {
    category: 'money-talent',
    title: '큰돈과 기회가 함께 오는 사업형 재성',
    shortLabel: '사업형 재성',
    narrative: {
      coreMeaning: '편재가 강해 큰 흐름·시장·기회를 읽는 감각이 발달.',
      whySpecial: '안정 수익보다 한 번에 크게 움직이는 구조 — 사업·투자·중개·확장에 강함.',
      lifeScene: '동기들이 안정 직장 찾을 때 부업·사이드 프로젝트로 돈줄 만드는 사람.',
      goodUse: '여러 채널 동시 운영, 시장 변화 빨리 잡기, 사람·돈을 연결하는 역할.',
      shadowSide: '관리 약하면 큰돈이 빠르게 빠짐. 한 곳에 집착하면 기회 손실.',
    },
  },

  // ============= C. 직업·권위 =============
  gwanInSangSaeng: {
    category: 'career-authority',
    title: '책임과 전문성이 커질수록 빛나는 구조',
    shortLabel: '전문가형 사주',
    narrative: {
      coreMeaning: '관성과 인성이 서로 생하는 관인상생 — 책임·공부·자격이 함께 커지는 구조.',
      whySpecial: '자유보다 일정한 틀과 직함이 주어졌을 때 실력이 정리되고 성장.',
      lifeScene: '직책·자격증·문서·연구 자리에서 자기 색이 살아남.',
      goodUse: '인정받을 수 있는 틀 안에서 책임을 받아들이고, 자격·자료를 꾸준히 쌓기.',
      shadowSide: '책임이 너무 크면 자기 검열로 실행이 늦어짐. 자격 욕심으로 행동 미루기 주의.',
    },
  },
  sikSinJeSal: {
    category: 'career-authority',
    title: '시련을 베풂으로 풀어내는 식신제살',
    shortLabel: '베풂의 칼',
    narrative: {
      coreMeaning: '편관이 강한데 식신이 그것을 제어 — 위기 상황을 표현·기획·실행으로 푸는 구조.',
      whySpecial: '강한 압박을 받을수록 능력이 올라옴. 위기관리·기획·돌파에 강함.',
      lifeScene: '큰 책임을 맡았을 때 도리어 침착해지고, 어려운 프로젝트에서 두각.',
      goodUse: '책임을 피하지 말고, 동시에 표현·생산 채널을 같이 운영해 압력을 풀어주기.',
      shadowSide: '식상이 약해지면 압박만 남아 번아웃. 자기 표현 채널 꺼지지 않게 유지 필요.',
    },
  },

  // ============= D. 매력·인기 =============
  peachBlossomExpression: {
    category: 'attraction-popularity',
    title: '이상하게 기억에 남는 사람',
    shortLabel: '시선이 붙는 매력',
    narrative: {
      coreMeaning: '도화 + 식상 발달 — 분위기·말맛·표현의 미묘함으로 시선을 끌어모음.',
      whySpecial: '모두에게 친절해서가 아니라, 반응의 타이밍·말투의 결로 기억에 남음.',
      lifeScene: '큰 무대보다 일대일·소그룹에서 강한 인상. SNS·콘텐츠·인터뷰에 강함.',
      goodUse: '말맛·이미지·콘텐츠를 자기 무기로 다듬기. 표현 채널 유지.',
      shadowSide: '관심 받기 위해 자기 색을 흐리면 매력이 약해짐. 진심 없는 표현은 금방 들킴.',
    },
  },
  hongyeomCharm: {
    category: 'attraction-popularity',
    title: '분위기로 사람을 끌어당기는 매력',
    shortLabel: '매력의 별',
    narrative: {
      coreMeaning: '홍염살이 일주·시주에 박혀 분위기·외모·이성 매력이 자연스럽게 드러남.',
      whySpecial: '의도 안 해도 사람이 다가오는 결. 거리감 조절 능력이 곧 무기.',
      lifeScene: '같은 말을 해도 더 부드럽게 들리고, 같은 옷을 입어도 자기 색이 살아남.',
      goodUse: '진심을 담은 표현. 정중함과 매력의 균형.',
      shadowSide: '관계 거리 조절 약하면 오해와 소문이 따라옴.',
    },
  },

  // ============= E. 깊이·고독·몰입 =============
  hwagaeDepth: {
    category: 'inner-depth',
    title: '혼자 있을 때 더 깊어지는 사람',
    shortLabel: '몰입형 사주',
    narrative: {
      coreMeaning: '화개 + 인성 강세 — 사람들 사이에서가 아니라 정리하는 시간 속에서 깊이 형성.',
      whySpecial: '겉으로 화려한 힘이 아니라 안쪽에서 오래 숙성되는 힘.',
      lifeScene: '연구·예술·글·분석·상담 같은 영역에서 다른 사람이 도달 못한 결을 잡음.',
      goodUse: '혼자만의 정리 시간을 일정에 의도적으로 배치. 인풋의 깊이를 자산화.',
      shadowSide: '고립이 깊어지면 생각이 무거워지고 외부 피드백을 잃음. 출구가 필요.',
    },
  },

  // ============= F. 이동·변화 =============
  yeokMaMovement: {
    category: 'movement-change',
    title: '움직일수록 운이 열리는 구조',
    shortLabel: '변화형 사주',
    narrative: {
      coreMeaning: '역마 + 충 구조 — 환경이 바뀌면서 감각이 살아남.',
      whySpecial: '한 자리에 오래 고정되면 답답함. 변화 자체가 능력을 깨우는 자극.',
      lifeScene: '이직·이사·해외·새 프로젝트로 점프하면서 판단력·실행력이 올라감.',
      goodUse: '의도적 변화를 일정에 배치 (분기마다 새 도전·환경 전환).',
      shadowSide: '뿌리 없이 움직임만 반복하면 정리 안 됨. 변화의 목적성을 매번 점검.',
    },
  },

  // ============= G. 버티는 힘·승부성 =============
  strongSurvival: {
    category: 'mental-strength',
    title: '쉽게 꺾이지 않는 버티는 힘',
    shortLabel: '승부형 사주',
    narrative: {
      coreMeaning: '괴강·양인·비겁 강세 — 자기 기준이 분명하고 위기 때 끝까지 버티는 구조.',
      whySpecial: '주변 분위기에 흔들리지 않고 자기 방식으로 결론을 냄.',
      lifeScene: '큰 결정 앞에서 흔들리는 사람들을 잡아주는 자리. 위기 대응·돌파.',
      goodUse: '자기 기준을 자산으로 쓰되, 협업 자리에선 합의 시간을 의도적으로 확보.',
      shadowSide: '타협이 어려워 가까운 관계에 마찰. 긴장 누적되면 본인이 먼저 지침.',
    },
  },

  // ============= H. 반전 구조 (사용자 강조) =============
  innerOuterContrast: {
    category: 'rare-structure',
    title: '겉모습과 실제 내면의 온도 차이',
    shortLabel: '반전형 사주',
    narrative: {
      coreMeaning: '천간(겉)과 지장간(속)의 십성 방향이 달라 사회적 얼굴과 내면이 분리.',
      whySpecial: '겉에서 보이는 모습과 가까운 관계에서의 모습이 다르므로, 본인이 가장 잘 아는 면이 따로 있음.',
      lifeScene: '주변은 차분·이성적으로 보지만, 본인은 말투·거리감을 오래 곱씹는 면이 있음.',
      goodUse: '내면의 결을 외부에 강요하지 않되, 가까운 관계 1~2명에게는 솔직히 열어두기.',
      shadowSide: '속으로 쌓다가 갑자기 관계를 끊는 패턴. 표현 채널 미리 만들어두기.',
    },
  },

  // ============= I. 운의 활성화 =============
  fortuneActivation: {
    category: 'fortune-timing',
    title: '앞으로 3년, 잠재력이 현실로 나오는 구간',
    shortLabel: '운의 활성화',
    narrative: {
      coreMeaning: '원국에 잠재된 강점이 현 대운 또는 향후 3년 세운에서 활성화되는 구간.',
      whySpecial: '평생 발휘되는 게 아니라 이 시기에 특히 결과가 잘 나오는 흐름.',
      lifeScene: '제안서·포트폴리오·이직·자격 취득 같은 결과물 단계에서 평가·보상이 따라옴.',
      goodUse: '머릿속에만 두지 말고 작게라도 밖으로 공개하기. 노출의 빈도가 곧 기회.',
      shadowSide: '준비만 하고 공개 안 하면 좋은 흐름도 체감 없이 지나감.',
    },
  },
};
