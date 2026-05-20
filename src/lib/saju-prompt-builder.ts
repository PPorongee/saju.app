import { SajuResult, CG, JJ, OH_CG, OH_JJ, getSipsung, calcShinsal, get12Unsung } from './saju-calc';
import { analyzeBranchRelations } from './branch-relations';
import { analyzeAdvanced } from './gyeokguk-johoo';
import { getTerminologyPromptBlock } from './saju-terminology';
import type { UserData } from './saju-prompt';

export function buildSajuPrompts(sj: SajuResult, ohCount: Record<string, number>, userData: UserData): string[] {
  const ds = sj.dStem;
  const ohKeys = ['목','화','토','금','수'];
  let ohDist = '';
  for (let i = 0; i < ohKeys.length; i++) {
    ohDist += ohKeys[i] + ':' + (ohCount[ohKeys[i]] || 0) + '개 ';
  }

  const elemNames: Record<number, string> = {
    0:'갑목(큰나무)',1:'을목(꽃풀)',2:'병화(태양)',3:'정화(촛불)',4:'무토(산)',
    5:'기토(들판)',6:'경금(강철)',7:'신금(보석)',8:'임수(바다)',9:'계수(비이슬)'
  };

  const sipsung = getSipsung(sj);
  let sipsungStr = '';
  for (const key in sipsung) { sipsungStr += key + ':' + sipsung[key] + ' '; }

  const shinsal = calcShinsal(sj);
  const shinsalStr = shinsal.length > 0 ? shinsal.join(', ') : '없음';

  const branchRelations = analyzeBranchRelations(sj);
  const advanced = analyzeAdvanced(sj, ohCount);

  const cTexts = ['연애/관계','커리어/진로','돈/재정','인간관계','건강','학업/시험'];
  const sTexts = ['안정적이고 평화로움','변화의 흐름 속','스트레스 많음','도전적인 시기','잘 모르겠음'];
  const rTexts = ['솔로','썸 타는 중','연애 중','기혼','최근 이별'];
  const iTexts = ['올해 전체 운세','연애운/궁합','재물운','직장/사업운','중요 결정 타이밍'];
  const pPairs = [['내향적','외향적'],['감성적','이성적'],['계획적','즉흥적']];

  const concernText = cTexts[userData.concern] || '미입력';
  const stateText = sTexts[userData.state] || '미입력';
  const relText = rTexts[userData.relationship] || '미입력';
  const interestText = iTexts[userData.wantToKnow] || '미입력';
  let persText = '';
  if (userData.personality && userData.personality.length >= 3) {
    persText = pPairs[0][userData.personality[0]] + ', ' + pPairs[1][userData.personality[1]] + ', ' + pPairs[2][userData.personality[2]];
  }

  const userAge = new Date().getFullYear() - userData.year;
  let lifeStage = '';
  let ageGuideline = '';
  if (userAge <= 12) {
    lifeStage = '어린이';
    ageGuideline = '이 사람은 아직 어린아이야. 결혼/연애/부동산/투자/직장 이야기는 "먼 미래에~" 정도로만 가볍게 언급하고, 성격/재능/학업/건강/부모관계/친구관계에 집중해. 어려운 인생 조언 대신 재능 발견과 꿈에 초점을 맞춰. 말투도 아이에게 맞춰서 더 쉽고 재밌게.';
  } else if (userAge <= 19) {
    lifeStage = '청소년';
    ageGuideline = '이 사람은 10대 청소년이야. 학업/시험/진로탐색/교우관계/자아정체성에 비중을 크게 두고, 연애는 가벼운 설렘 정도로, 결혼/부동산/투자는 "나중에 어른이 되면~" 정도로만 언급해. 입시/수능/진로 고민에 실질적 도움이 되게.';
  } else if (userAge <= 29) {
    lifeStage = '20대';
    ageGuideline = '이 사람은 20대야. 취업/커리어 시작/연애/자기계발/독립에 비중을 두고, 결혼은 가능성으로, 자녀/노후는 가볍게만 언급해. 사회 초년생의 고민과 성장에 초점.';
  } else if (userAge <= 39) {
    lifeStage = '30대';
    ageGuideline = '이 사람은 30대야. 커리어 성장/결혼(또는 결혼생활)/재테크/내집마련/자녀계획에 비중을 두고 분석해. 인생의 기반을 다지는 시기에 맞는 조언을 해.';
  } else if (userAge <= 49) {
    lifeStage = '40대';
    ageGuideline = '이 사람은 40대야. 커리어 전성기/자녀교육/부부관계/재산관리/건강관리에 비중을 두고 분석해. 중년의 위기와 기회를 균형있게 다뤄.';
  } else if (userAge <= 59) {
    lifeStage = '50대';
    ageGuideline = '이 사람은 50대야. 인생 2막/건강/은퇴준비/자녀독립/부부관계재정립에 비중을 두고 분석해. 학업/수능/첫 취업 같은 젊은 시절 이야기는 하지 마.';
  } else {
    lifeStage = '60대 이상';
    ageGuideline = '이 사람은 ' + userAge + '세야. 건강관리/노후생활/가족관계/손주/인생정리/취미/여행에 비중을 두고 분석해. 취업/연애시작/수능 같은 이야기는 하지 마. 삶의 지혜와 편안한 노년에 초점.';
  }

  let prompt = '=== 사주 원국 ===\n';
  prompt += '이름: ' + userData.name + ' / 성별: ' + userData.gender + ' / 나이: 만 ' + userAge + '세 (' + lifeStage + ')\n';
  prompt += '\n⚠️ 나이 맞춤 해석 규칙 (최우선!): ' + ageGuideline + '\n' +
    '모든 섹션에서 이 사람의 나이(' + userAge + '세, ' + lifeStage + ')에 맞는 현실적인 이야기를 해.\n' +
    '절대 금지 예시:\n' +
    (userAge >= 50 ? '- 50대 이상에게 "자녀가 들어올 시기", "출산 적기", "첫 연애" 같은 이야기 금지. 대신 자녀와의 관계, 손주, 노후에 초점.\n' : '') +
    (userAge >= 40 ? '- 40대 이상에게 "수능", "첫 취업", "사회 초년생" 이야기 금지.\n' : '') +
    (userAge <= 19 ? '- 10대에게 "이혼", "부동산 투자", "노후 준비" 이야기 금지.\n' : '') +
    '- 현재 연도는 2026년이야. 과거 년도(2025년 이전)에 대한 예측이나 조언 금지! 미래만 다뤄.\n\n';
  prompt += '생년월일: ' + userData.year + '년 ' + userData.month + '월 ' + userData.day + '일 (' + (userData.isLunar ? '음력 입력 -> 양력 변환됨' : '양력') + ')\n';
  if (userData.useExactTime && userData.exactHour != null && userData.exactHour >= 0) {
    const SIJU_NAMES = ['자시', '축시', '인시', '묘시', '진시', '사시', '오시', '미시', '신시', '유시', '술시', '해시'];
    prompt += '정확한 출생시간: ' + String(userData.exactHour).padStart(2, '0') + '시 ' + String(userData.exactMinute ?? 0).padStart(2, '0') + '분 (' + (userData.hour >= 0 ? SIJU_NAMES[userData.hour] : '미상') + ' 해당)\n';
  }
  prompt += '년주: ' + CG[sj.yStem] + JJ[sj.yBranch] + '(' + OH_CG[sj.yStem] + '/' + OH_JJ[sj.yBranch] + ')\n';
  prompt += '월주: ' + CG[sj.mStem] + JJ[sj.mBranch] + '(' + OH_CG[sj.mStem] + '/' + OH_JJ[sj.mBranch] + ')\n';
  prompt += '일주: ' + CG[sj.dStem] + JJ[sj.dBranch] + '(' + OH_CG[sj.dStem] + '/' + OH_JJ[sj.dBranch] + ') ★일간\n';
  if (sj.hStem >= 0) prompt += '시주: ' + CG[sj.hStem] + JJ[sj.hBranch] + '(' + OH_CG[sj.hStem] + '/' + OH_JJ[sj.hBranch] + ')\n';
  prompt += '일간: ' + (elemNames[ds] || CG[ds]) + '\n';
  prompt += '오행분포: ' + ohDist + '\n';
  prompt += '십성: ' + sipsungStr + '\n';

  const unsung = get12Unsung(sj);
  let unsungStr = '년지:' + unsung['년지'] + ' 월지:' + unsung['월지'] + ' 일지:' + unsung['일지'];
  if (unsung['시지']) unsungStr += ' 시지:' + unsung['시지'];
  prompt += '십이운성: ' + unsungStr + '\n';
  prompt += '신살: ' + shinsalStr + '\n';
  prompt += '\n' + advanced.promptBlock + '\n';
  prompt += '\n' + branchRelations.promptBlock + '\n';

  prompt += '\n=== 사용자 질문 답변 ===\n';
  prompt += '① 고민: ' + concernText + '\n② 상태: ' + stateText + '\n③ 성격: ' + (persText || '미입력') + '\n④ 연애: ' + relText + '\n⑤ 관심사: ' + interestText + '\n';
  prompt += '[중요] 위 질문 답변의 집중 분석은 ##5. 섹션에서 해줘. 다른 섹션에서도 관련 내용이 자연스럽게 연결되면 1-2줄 정도 언급해도 OK. 단, 같은 분석을 통째로 반복하지 마.\n';
  prompt += '관심사(' + interestText + ')에 해당하는 섹션은 다른 섹션보다 더 자세히 써줘.\n\n';

  const dayOh = OH_CG[ds];

  const isEn = userData.lang === 'en';
  const isMarried = userData.relationship === 3;

  // 일간별 팩트폭행 멘트 — 사용자 일간에 맞는 것만 골라서 프롬프트에 주입
  const factPunchByStem: Record<number, string> = {
    0: '"겉으론 대범한 척하는데 속으로는 인정욕구 덩어리야. 칭찬 안 해주면 삐지는 거 맞지?"',
    1: '"착한 척하면서 속으로 다 계산하고 있어. 손해 보는 거 진짜 못 참지?"',
    2: '"관심 못 받으면 죽는 성격이야. 모임에서 주인공 아니면 흥미 잃지?"',
    3: '"겉으론 조용한데 뒤에서 분석하고 판단 다 끝내놓고 있어. 내 편 아니면 칼같이 선 긋지?"',
    4: '"고집이 산만큼 센 거 본인도 알지? 한번 아니라고 하면 누가 뭐래도 안 바꿔"',
    5: '"걱정이 너무 많아서 기회를 놓치는 타입이야. 생각만 하다가 타이밍 지나간 적 많지?"',
    6: '"완벽주의 때문에 남한테 맡기는 걸 못해서 혼자 다 하다 번아웃 오는 패턴"',
    7: '"예민한 거 인정해. 사소한 말 하나에 상처받아서 며칠씩 곱씹고 있지?"',
    8: '"아이디어는 넘치는데 실행력이 바닥이야. 시작만 잔뜩 해놓고 마무리 못 짓는 거 맞지?"',
    9: '"눈치가 너무 빨라서 오히려 독이야. 남의 기분 맞추다가 정작 본인이 지쳐"',
  };
  const userFactPunch = factPunchByStem[ds] || '';

  // 용신·필요 오행 기반 구체 명사 사전
  const concreteNounsByOh: Record<string, string> = {
    '목': '동쪽 공원/숲, 그린 인테리어, 시금치·브로콜리, 분당 율동공원, 청량리 일대',
    '화': '남쪽 카페, 따뜻한 조명, 캔들, 강남 일대, 부산 해운대',
    '토': '중부지방, 도예/원예, 황토 마사지, 세종시, 전주',
    '금': '서쪽 도시, 메탈 액세서리·화이트 골드, 헬스/필라테스, 인천, 미국 서부',
    '수': '한강 변(마포·용산·성동), 항구도시(부산·인천), 수영·반신욕, 검정/네이비 옷, 노르웨이',
  };
  const neededOhs = advanced.johoo.needed.length > 0 ? advanced.johoo.needed : [dayOh];
  const concreteNounsList = neededOhs.map(oh => `${oh}: ${concreteNounsByOh[oh] || ''}`).join('\n  - ');

  // ============================================================
  // 공통 규칙 (모든 파트에 들어감)
  // ============================================================
  const commonRules = '=== 공통 규칙 ===\n' +
    '1. 반말만 사용. 친한 친구한테 조언하듯 다정하고 사근사근하게.\n' +
    '2. 너는 20년 경력의 사주 전문가야. 단정적이고 자신감 있는 어조로 말해. "~할 수 있어", "~일 수 있어" 같은 애매한 표현 금지.\n' +
    '3. 명리학 용어(무토/괴강살/군겁쟁재/조열/식상/재고귀인 등)는 자유롭게 사용해. 단 한자 글자(戊土, 軍劫爭財 같은 표기)는 금지 — 한글로만 적어.\n' +
    '4. 고전 문헌 인용 금지! "적천수에~", "자평진전에~", "궁통보감에~" 같은 말 하지 마.\n' +
    '5. 각 섹션은 700~1200자. 임팩트 우선. 길이 채우려고 같은 말 반복 금지!\n' +
    '6. 사주 용어가 나올 때마다 괄호 안에 쉬운 설명을 넣어. 예: 식상(표현/실행 에너지), 재성(돈/결과물).\n' +
    '7. "마치 ~같다", "~라고 할 수 있어" 같은 AI틱한 표현 금지. 단정적으로 "이건 X야"로 말해.\n' +
    '8. "결론적으로", "정리하면" 같은 마무리 패턴 금지. 다음 섹션이 궁금해지게 끝내.\n' +
    '9. 의문문으로 끝내지 마 ("~하지 않았어?", "~한 적 없어?"). 단정 문장으로 마무리.\n' +
    '10. 현재 연도는 2026년. 과거 예측 금지. 미래만 다뤄.\n\n' +

    '=== 명리학적 근거 필수 규칙 ===\n' +
    '시스템이 사전 계산한 다음 값들을 반드시 본문에 명시적으로 활용해:\n' +
    '  - 격국명(' + advanced.gyeokguk.primary + ')은 최소 1회 본문에 자연스럽게 노출\n' +
    '  - 조후(' + advanced.johoo.type + ')는 최소 1회 본문에 자연스럽게 노출\n' +
    '  - 계산된 신살(' + shinsalStr + ')은 관련 섹션에서 최소 1회 인용\n' +
    '  - ★★ 합/충/형/반합 관계는 다음 형태로 본문에 정확히 인용:\n' +
    (branchRelations.items.length > 0
      ? branchRelations.items.slice(0, 5).map(it => '       "' + it.characters.join('') + (it.type === '반합' ? ' 반합으로 ' + (it.element || '') + ' 기운이 강해져' : it.type === '충' ? '충으로 변화/이동의 에너지가' : it.type === '천라' ? '의 천라가 활인업에' : ' ' + it.type + '으로') + '" 같은 식으로 직접 호명').join('\n')
      : '       (이 사주는 합·충 등 큰 관계 없음 → 평이한 구조라고 언급)') + '\n' +
    '근거 제시 방법:\n' +
    '  - "네 일간 무토가 월지 오화에서 정인을 만나니까~" 처럼 어떤 글자끼리 어떤 관계인지 명시\n' +
    '  - "재성(돈)이 강한데 인성(보호막)이 약해서 → 이런 결과" 처럼 인과관계 설명\n' +
    '  - 근거 없는 단순 결론 금지\n\n' +

    '=== 구체 명사 강제 규칙 (디테일이 신뢰감!) ===\n' +
    '추상적 조언 금지. 각 섹션에 지명/제품/브랜드/숫자 등 구체 명사 최소 3개 자연스럽게 박아.\n' +
    '이 사주의 용신(' + neededOhs.join('·') + ') 기반 추천 구체 명사:\n' +
    '  - ' + concreteNounsList + '\n' +
    '예시:\n' +
    '  - 나쁜: "동쪽이 좋아"\n' +
    '  - 좋은: "동쪽 공원·숲(분당 율동공원, 청량리 일대)이 너의 충전소야"\n' +
    '  - 나쁜: "운동해"\n' +
    '  - 좋은: "주 2회 필라테스 50분 + 메탈 액세서리(반지/팔찌)로 부족한 금 보충"\n\n' +

    '=== 팩트폭행 규칙 (신뢰도 핵심!) ===\n' +
    '사주 상담의 신뢰는 "뼈 때리는 단점 지적"에서 나와. 칭찬만 하면 9900원 가치 없음.\n' +
    '각 섹션에서 반드시 팩트폭행 멘트 — 읽는 사람이 "헉, 어떻게 알지?" 움찔할 정도로:\n' +
    '- 돌려 말하지 마. "약간 그런 경향이 있을 수 있어"(X) → "솔직히 너 이거 맞지?"(O)\n' +
    '- 모든 팩트폭행 뒤에 3줄 이상의 구체적 해결책 필수\n' +
    '- 각 섹션에서 팩트폭행 비율 최소 20%\n' +
    '- 비율: 긍정 55% + 단점/주의 25% + 실용 조언 20%\n' +
    (userFactPunch
      ? '\n★ 이 사주의 일간(' + CG[ds] + ')에 특화된 팩트폭행 직격 멘트 예시:\n  ' + userFactPunch + '\n  → 위 톤을 참고해서 이 사주의 격국(' + advanced.gyeokguk.primary + ')과 신살(' + shinsalStr + ')에서 나오는 고유 약점을 직격으로 저격해.\n  → 멘트를 그대로 복붙하지 말고 본문 흐름에 자연스럽게 변형해서 녹여.\n'
      : '') + '\n' +

    '=== 비유 & 표현 규칙 ===\n' +
    '비유 소재: 게임/주식/쇼핑/운동/드라마/넷플릭스/SNS/카페/직장 등 현대적 소재.\n' +
    '위트: ㅋㅋ, "솔직히", "진짜", "레전드인데", "대박인 게" 자연스럽게.\n' +
    '예시:\n' +
    '- "네 재물운은 아메리카노야 — 쓴맛 뒤에 각성이 오는 타입"\n' +
    '- "지금 대운은 보스전 앞 세이브 포인트야"\n' +
    '- "이건 인생 2편 시련 구간이야. 3편에서 반전 와"\n\n' +

    '=== 해결책 구체성 규칙 ===\n' +
    '"조심해", "노력하면 돼" 같은 뜬구름 금지. 반드시 구체 행동 + 빈도 + 명리 근거:\n' +
    '- 좋은 예: "매달 수입 20%는 자동이체로 따로. 비겁 강해서 돈 보이면 쓰고 싶어져 — 통장 분리가 물리적 방어막"\n' +
    '- 좋은 예: "월 1회 동쪽 공원/숲 산책. 목 기운 부족한 너에게 동쪽이 충전소"\n' +
    '- 개운법은 본문에 자연스럽게 녹여. "💡 실천 포인트" 같은 별도 블록 만들지 마.\n\n';

  // ============================================================
  // 4단 구조 강제 규칙 (인물·분석형 섹션에 적용)
  // ============================================================
  const fourPartRule =
    '=== 4단 문단 구조 (이 섹션 적용) ===\n' +
    '[문단 1] 캐치한 결론 + 강한 비유 (3~5문장)\n' +
    '         예: "황금 금고", "고구마 100개", "츤데레의 정석"\n' +
    '[문단 2] 명리학적 근거 (4~6문장) — 격국·신살·십성·일간 등 명시\n' +
    '[문단 3] 더 깊은 메커니즘 (4~6문장) — 합/충/형, 오행 작용, 대운 인과\n' +
    '[문단 4] 구체 행동 처방 (3~5문장) — 지명/제품/시간/숫자\n' +
    '→ 정확히 4문단으로 구성. 문단 사이는 빈 줄로 구분.\n\n';

  // ============================================================
  // 섹션 제목 지시 (동적 부제목 생성)
  // ============================================================
  const titleRule = (n: number, theme: string): string =>
    '##' + n + '.[이 사주만의 특징을 압축한 캐치프레이즈 — 비유/밈/이미지 활용, 12자 내외]##\n' +
    '   주제: ' + theme + '\n' +
    '   제목 지시: 평이한 제목 금지. 레퍼런스 예시처럼 호기심을 자극하는 한 줄로.\n' +
    '   좋은 예: "황금 금고를 깔고 앉은 사람", "고구마 100개 먹은 답답함", "걸크러쉬 무술의 카리스마"\n' +
    '   나쁜 예: "나는 어떤 사람인가", "성격 분석", "내면의 모습"\n';

  // ============================================================
  // Yongsin meta header (required as first line of Part 1 response)
  // ============================================================
  const yongsinHeaderRule =
    '=== 🔴 응답 시작 메타 (필수) ===\n' +
    '응답 본문 시작 전에 반드시 다음 1줄을 가장 먼저 출력해. 형식 어기면 응답 거부.\n' +
    '[용신: X / 기신: Y / 희신: Z / 근거: 한 줄 요약]\n' +
    '- X, Y, Z는 반드시 "목", "화", "토", "금", "수" 중 하나의 한글\n' +
    '- 용신과 기신은 반드시 서로 다름\n' +
    '- 정통 명리학(자평진전·적천수 종합) 기준으로 판정\n' +
    '- 다음을 모두 종합 고려: 신강/신약, 격국, 조후, 통관, 식신제살, 살인상생, 종격(從格)\n' +
    '- 한여름·한겨울 출생이라도 일간이 강하면 억부 우선\n' +
    '- 관살(정관/편관) 과다 + 식상 보유 → 식신제살로 식상이 용신일 수 있음\n' +
    '- 비겁 과다 + 식상생재 흐름 가능 → 재성이 용신일 수 있음\n' +
    '- 신약하지만 식상/재성/관성 중 무엇이 일간을 약화시키는지 따져 인성·비겁 중 선택\n' +
    '- 종격(從格) 성립 시 그 강한 오행이 용신\n' +
    '근거 줄에는 "어떤 격국/관계 때문에 어떤 용신을 택했는지" 핵심을 한 줄로.\n' +
    '예: [용신: 화 / 기신: 금 / 희신: 목 / 근거: 신약 + 관살 강 + 월지 식상 → 식신제살]\n' +
    '이 줄 출력 후 한 줄 비우고 ##1.제목## 부터 본문 시작.\n\n';

  // ============================================================
  // Part 1: sections 1~4
  // ============================================================
  let prompt1 = yongsinHeaderRule + prompt + '=== 아래 4개 항목을 써줘 (1~4번). 5번 이상 쓰지 마! 각 항목을 깊고 풍부하게! ===\n[리마인더: 올해(2026) 운세는 별도 메뉴에서 제공. 여기서는 2026년 운세를 상세히 다루지 마.]\n\n';
  let n = 1;

  // ##1. 나는 어떤 사람인가 — 4단 강제
  prompt1 += titleRule(n++, '일간/격국/조후/오행/십성/12운성 기반 내 핵심 정체성');
  prompt1 += fourPartRule;
  prompt1 += '내용 지시:\n' +
    '- 문단 1: 이 사주 정수(' + advanced.essence.oneLineKo + ')를 캐치한 비유로 도입.\n' +
    '- 문단 2: 일간 ' + CG[sj.dStem] + JJ[sj.dBranch] + ', 격국 ' + advanced.gyeokguk.primary + ', 조후 ' + advanced.johoo.type + '을 직접 호명하며 근거 제시.\n' +
    '- 문단 3: 신살(' + shinsalStr + ')과 합/충/형 중 가장 영향력 큰 것 2~3개를 골라 메커니즘 설명.\n' +
    '- 문단 4: 강점 활용법과 약점 보완 행동 (지명·제품·시간·숫자 포함).\n' +
    '[주의] 이 섹션에서 성격·멘탈 분석을 모두 끝내. 다른 섹션에서 성격 분석 반복 금지. 친구/대인관계 언급은 6번에서.\n\n';

  // ##2. 인생 로드맵 5단계 — 5단계 분할 (4단 강제 X)
  prompt1 += titleRule(n++, '아동기→청소년→성년→중년→노년 인생 로드맵');
  prompt1 += '형식: 5단계 분할. 각 단계 4~6줄. (4단 구조 강제 X)\n' +
    '- 아동기(0~12세): 년주 환경/가족 에너지\n' +
    '- 청소년기(13~19세): 월주 + 초기 대운\n' +
    '- 성년기(20~35세): 사회 진출, 커리어/연애 시작\n' +
    '- 중년기(36~55세): 기반 구축, 전성기\n' +
    '- 노년기(56세~): 수확기\n' +
    '각 단계마다 해당 대운의 천간/지지와 원국 작용을 명시. 게임/영화/계절 비유 활용.\n' +
    '현재 나이(' + userAge + '세) 기준으로 과거는 회고형("이런 경험 있었지?"), 미래는 예측형으로.\n\n';

  // ##3. 돈/커리어 — 4단 + 직업 리스트
  prompt1 += titleRule(n++, '돈, 직업, 재능, 시험운');
  prompt1 += fourPartRule;
  prompt1 += '내용 지시 (4단 + 끝에 리스트 추가):\n' +
    '- 4단 본문: 정재/편재 위치와 힘, 재물그릇, 격국 기반 사업/직장 적성, 통변으로 재성 대운이 올 때 사건.\n' +
    '- 4단 본문에 격국명(' + advanced.gyeokguk.primary + ') 자연스럽게 노출.\n' +
    '- 본문 끝에 별도 리스트 2개:\n' +
    '  🎯 딱 맞는 분야 TOP 5 (격국/용신 근거 1~2줄씩)\n' +
    '  ⚠️ 안 맞는 직업 3가지 (기신 오행/구조 충돌 근거)\n\n';

  // ##4. 연애/부부 (분기) — 4단 강제
  if (isMarried) {
    prompt1 += titleRule(n++, '배우자 분석 & 부부 관계');
    prompt1 += fourPartRule;
    prompt1 += '내용 지시:\n' +
      '- 문단 1: 배우자궁(' + JJ[sj.dBranch] + ') 기반 부부 관계 비유로 도입.\n' +
      '- 문단 2: 배우자성 + 십성 구조 근거.\n' +
      '- 문단 3: 부부 사이 좋아지는 시기/조심할 시기 (대운/세운 합충형).\n' +
      '- 문단 4: 권태기 극복법, 표현법 구체 제시.\n\n';
  } else {
    prompt1 += titleRule(n++, '연애 & 결혼 타이밍');
    prompt1 += fourPartRule;
    prompt1 += '내용 지시:\n' +
      '- 문단 1: 미래 반쪽의 느낌과 매력 무기 비유로 도입.\n' +
      '- 문단 2: 배우자궁(' + JJ[sj.dBranch] + ') + 관성/재성 구조 근거.\n' +
      '- 문단 3: 인연이 오는 시기(통변), 어떤 타입이 올지, 결혼 적기 조건.\n' +
      '- 문단 4: 연애 전략 구체 (어디서 만나, 어떻게 다가가, 무엇을 조심).\n\n';
  }

  prompt1 += getTerminologyPromptBlock(userData.lang === 'en' ? 'en' : 'ko');
  prompt1 += commonRules;

  // ============================================================
  // Part 2: sections 5~8
  // ============================================================
  let prompt2 = prompt + '=== 아래 4개 항목을 써줘 (5~8번). 각 항목을 깊고 풍부하게! ===\n[출력형식] 반드시 ##숫자.제목## 형태로 각 섹션 시작. 안 지키면 응답 거부.\n\n';

  // ##5. 사용자 질문 분석 — Q&A 카테고리
  prompt2 += titleRule(n++, '사용자가 답한 질문들에 대한 맞춤 분석');
  prompt2 += '형식: 4개 질문에 각 1문단씩 답변 (4단 구조 강제 X).\n' +
    '- 가장 큰 고민(' + concernText + ')이 사주적으로 왜 생기는지 + 해결 실마리\n' +
    '- 현재 상태(' + stateText + ')가 대운/세운과 어떻게 연결되는지\n' +
    '- 자가 성격 진단(' + (persText || '미입력') + ')과 사주 성격 비교 — 일치/불일치 코멘트\n' +
    '- 현재 연애 상태(' + relText + ')와 사주 연애운 연결 해석\n' +
    '[주의] 올해(2026) 운세는 별도 메뉴 안내 한 줄로.\n\n';

  // ##6. 인간관계 귀인 — 4단 + 오행별 리스트
  prompt2 += titleRule(n++, '귀인, 친구, 손절 가이드');
  prompt2 += fourPartRule;
  prompt2 += '내용 지시 (4단 + 끝에 오행별 사람 묘사 리스트):\n' +
    '- 4단 본문: 귀인(천을귀인/문창귀인), 연상/연하 적성, 에너지 주는 사람 vs 빼앗는 사람.\n' +
    '- 본문 끝에 5개 리스트: 목/화/토/금/수 기운 강한 사람의 외모·말투·행동 특징 묘사.\n' +
    '  예: "목 기운 강한 사람: 키 크거나 마른 편, 정의감 강함, 직설적이고 추진력 있음"\n' +
    '  용신(' + (advanced.johoo.needed.join('·') || '없음') + ')에 맞는 사람과 기신 오행 사람 구분도 명시.\n\n';

  // ##7. 가정·자녀운 — 가족별 단락
  prompt2 += titleRule(n++, '가족, 부모, 자녀운');
  prompt2 += '형식: 가족 구성원별 단락 (4단 강제 X).\n' +
    '- 년주(조상궁) → 월주(부모/형제궁) → 일지(배우자궁) → 시주(자녀궁) 순.\n' +
    '- 부모 관계(월주-일주 충/형), 형제 관계(비겁 구조), 가족 갈등 해소법.\n';
  if (userAge >= 50) {
    prompt2 += '- 자녀운: 성인 자녀와의 관계, 손주복, 가족 모임 좋은 시기. 출산 시기는 다루지 마.\n\n';
  } else {
    prompt2 += '- 자녀운: 자녀복(시주 12운성), 아이 들어오기 좋은 시기, 아이 예상 성향, 부모 스타일.\n\n';
  }

  // ##8. 건강·멘탈 — 4단 강제
  prompt2 += titleRule(n++, '건강 & 멘탈 관리');
  prompt2 += fourPartRule;
  prompt2 += '내용 지시:\n' +
    '- 문단 1: 오행 균형과 조후(' + advanced.johoo.type + ') 기반 체질 비유.\n' +
    '- 문단 2: 취약 장기(' + (dayOh==='목'?'간/눈':dayOh==='화'?'심장/혈관':dayOh==='토'?'위/소화기':dayOh==='금'?'폐/호흡기':'신장/방광') + ') + 신살(양인/백호 등 있으면) 근거.\n' +
    '- 문단 3: 멘탈 메커니즘 — 비겁/인성 구조가 스트레스에 어떻게 작용하는지.\n' +
    '- 문단 4: 맞는 취미/운동 3가지 + 구체 습관 처방.\n' +
    '[중요] 특정 질병 진단/의학적 조언 금지. 끝에 "※ 명리학적 경향성이며 의학 조언이 아닙니다." 포함.\n\n';

  prompt2 += getTerminologyPromptBlock(userData.lang === 'en' ? 'en' : 'ko');
  prompt2 += commonRules;

  // ============================================================
  // Part 3: sections 9~12
  // ============================================================
  let prompt3 = prompt + '=== 아래 4개 항목을 써줘 (9~12번). 반드시 4개 모두! ===\n[출력형식] 반드시 ##숫자.제목## 형태로 각 섹션 시작.\n\n';

  // ##9. 현재 인생 챕터 — 4단 강제
  prompt3 += titleRule(n++, '지금 나의 인생 챕터');
  prompt3 += fourPartRule;
  prompt3 += '내용 지시:\n' +
    '- 문단 1: 현재 나이(' + userAge + '세, ' + lifeStage + ') 대운을 비유로 도입.\n' +
    '- 문단 2: 현재 대운의 천간/지지와 원국 작용(합/충/형) 근거.\n' +
    '- 문단 3: 12운성으로 지금 에너지 상태 분석. 이 시기의 의미.\n' +
    '- 문단 4: 지금 집중할 것 + 내려놓을 것 + 2027년(정미) 한 줄 미리보기.\n\n';

  // ##10. 향후 10년 — 연도별 리스트
  prompt3 += titleRule(n++, '향후 10년 시나리오 (2027~2036)');
  prompt3 += '형식: 연도별 리스트 (4단 강제 X). 현재는 2026년 — 과거(2025 이전) 절대 금지.\n' +
    '- 2027년(정미)은 자세히 (상반기/하반기, 합/충/형, 집중 영역)\n' +
    '- 2028~2036년 매년 한두 줄로 (세운과 원국의 관계)\n' +
    '- 대운 전환 시기\n' +
    '- 삼재 시기 (신자진생→인묘진년, 해묘미생→사오미년, 인오술생→신유술년, 사유축생→해자축년)\n' +
    '- 10년 중 가장 좋은 해 TOP 3 + 조심할 해 TOP 2 (대비법 포함)\n' +
    '- 끝에 인생 하이라이트 시기 한 줄.\n\n';

  // ##11. 행운/부동산/방위 — 리스트형
  prompt3 += titleRule(n++, '개운법, 행운 루틴, 부동산, 방위');
  prompt3 += '형식: 리스트형 (4단 강제 X).\n' +
    '- 행운 색/숫자/방향/요일/계절 (용신 ' + (advanced.johoo.needed.join('·') || dayOh) + ' 근거)\n' +
    '- 매일 행운 습관 3가지\n' +
    '- 기신 피하는 실생활 팁\n' +
    '- 부동산: ' + (dayOh==='목'?'동':dayOh==='화'?'남':dayOh==='토'?'중앙':dayOh==='금'?'서':'북') + '쪽 유리, 맞는 부동산 유형, 재물 축적 전략\n' +
    '- 구체 지명/제품 포함 (예: "한강 변", "메탈 액세서리")\n\n';

  // ##12. 편지 — 자유 형식
  prompt3 += titleRule(n++, '나에게 보내는 편지');
  prompt3 += '형식: 3~4단 자유. 따뜻한 응원 메시지. 격국/조후/대운 흐름을 바탕으로 한 비유 가득한 진심 편지.\n\n';

  prompt3 += commonRules;

  // ============================================================
  // 영어 모드 처리
  // ============================================================
  if (isEn) {
    const engHead = '🚨 CRITICAL LANGUAGE INSTRUCTION 🚨\nWrite EVERYTHING in English. EVERY section title, EVERY explanation must be in English. Translate Korean section titles. Saju terms like Gap(甲) may appear with English meaning. Use warm, casual, friend-like tone. IF YOU WRITE IN KOREAN, THE RESPONSE WILL BE REJECTED.\n\n';
    prompt1 = engHead + prompt1;
    prompt2 = engHead + prompt2;
    prompt3 = engHead + prompt3;
    const engTail = '\n\n🚨 FINAL REMINDER — Write EVERYTHING in English. Translate all section titles. Korean characters only allowed for Saju term notation in parentheses.\n';
    prompt1 += engTail;
    prompt2 += engTail;
    prompt3 += engTail;
  }

  return [prompt1, prompt2, prompt3];
}

// ============================================================
// LLM 응답 첫 줄에서 용신 메타 추출 + 검증
// ============================================================
export interface YongsinMeta {
  yongsin: string;
  gisin: string;
  heesin: string;
  reason: string;
}

const VALID_OH = ['목', '화', '토', '금', '수'];

/**
 * LLM 응답 텍스트에서 첫 줄의 [용신: X / 기신: Y / 희신: Z / 근거: ...] 메타를 추출.
 * 형식·정합성 검증 통과 시 객체 반환, 실패 시 null.
 * 영어 응답도 처리 ([Yongsin: Fire / Gisin: Metal / ...] 형식).
 */
export function parseYongsinMeta(text: string): YongsinMeta | null {
  if (!text) return null;
  // 한국어 형식 우선 시도
  const koRe = /\[\s*용신\s*:\s*([목화토금수])\s*\/\s*기신\s*:\s*([목화토금수])\s*\/\s*희신\s*:\s*([목화토금수])\s*\/\s*근거\s*:\s*([^\]]+?)\s*\]/;
  let m = text.match(koRe);
  if (m) {
    const result = { yongsin: m[1], gisin: m[2], heesin: m[3], reason: m[4].trim() };
    return validateYongsinMeta(result) ? result : null;
  }
  // 영어 형식 시도 (LLM이 영어로 출력한 경우)
  const enRe = /\[\s*(?:Yongsin|용신)\s*:\s*(Wood|Fire|Earth|Metal|Water)\s*\/\s*(?:Gisin|기신)\s*:\s*(Wood|Fire|Earth|Metal|Water)\s*\/\s*(?:Heesin|희신)\s*:\s*(Wood|Fire|Earth|Metal|Water)\s*\/\s*(?:Reason|근거)\s*:\s*([^\]]+?)\s*\]/i;
  m = text.match(enRe);
  if (m) {
    const enToKo: Record<string, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
    const result = {
      yongsin: enToKo[m[1].toLowerCase()],
      gisin: enToKo[m[2].toLowerCase()],
      heesin: enToKo[m[3].toLowerCase()],
      reason: m[4].trim(),
    };
    return validateYongsinMeta(result) ? result : null;
  }
  return null;
}

/**
 * 명리 정합성 검증 — 명백한 오류만 잡고 회색지대(식신제살 등)는 통과시킴.
 */
function validateYongsinMeta(meta: YongsinMeta): boolean {
  // 형식: 5오행 중 하나
  if (!VALID_OH.includes(meta.yongsin)) return false;
  if (!VALID_OH.includes(meta.gisin)) return false;
  if (!VALID_OH.includes(meta.heesin)) return false;
  // 용신과 기신은 달라야 함
  if (meta.yongsin === meta.gisin) return false;
  // 근거 비어있으면 의심
  if (!meta.reason || meta.reason.length < 2) return false;
  return true;
}

/**
 * LLM 응답 본문에서 용신 메타 줄을 제거하고 깔끔한 본문만 반환.
 * 메타가 없거나 형식이 다르면 원본 그대로.
 */
export function stripYongsinMeta(text: string): string {
  if (!text) return text;
  const re = /\[\s*(?:용신|Yongsin)\s*:[^\]]*?\]\s*\n*/i;
  return text.replace(re, '').trimStart();
}
