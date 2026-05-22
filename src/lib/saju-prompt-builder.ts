import { SajuResult, CG, JJ, OH_CG, OH_JJ, getSipsung, calcShinsal, get12Unsung } from './saju-calc';
import { analyzeBranchRelations } from './branch-relations';
import { analyzeAdvanced } from './gyeokguk-johoo';
import { getTerminologyPromptBlock } from './saju-terminology';
import type { UserData } from './saju-prompt';

export function buildSajuPrompts(sj: SajuResult, ohCount: Record<string, number>, userData: UserData, cachedYongsin?: YongsinMeta): string[] {
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

  // 약점=강점의 그림자 패턴 (일간별) — 1번 레퍼런스 톤. "강점이 너무 강해서 생긴 약점" 프레임
  const shadowByStem: Record<number, { strength: string; shadow: string; remedy: string }> = {
    0: { strength: '거침없는 추진력', shadow: '너무 직진해서 우회의 미덕을 놓침', remedy: '한 박자 쉬고 옆길을 살피는 연습' },
    1: { strength: '부드러운 적응력', shadow: '자기 의견을 양보하다 본인 색깔이 흐려짐', remedy: '하루 한 번 거절·주장 한 가지씩 연습' },
    2: { strength: '환하게 빛나는 매력', shadow: '관심이 없으면 흥미가 빠르게 식음', remedy: '루틴으로 한 가지를 끝까지 끌고 가기' },
    3: { strength: '예리한 분석력', shadow: '분석만 하다 결정·실행이 늦어짐', remedy: '24시간 내 결단 룰 — 작은 일부터' },
    4: { strength: '묵직한 안정·존버력', shadow: '너무 움직이지 않아 기회를 놓침', remedy: '가볍게 스텝 밟는 연습 — 일단 저질러보기' },
    5: { strength: '섬세한 배려·돌봄', shadow: '자기 자신을 챙기는 일이 늘 뒤로 밀림', remedy: '주 1회 본인만을 위한 시간 강제 배정' },
    6: { strength: '단단한 의지·돌파력', shadow: '완벽주의로 혼자 다 하다 번아웃', remedy: '60점 완성 → 다음 70점 패스 룰' },
    7: { strength: '예리한 감각·세련된 안목', shadow: '작은 자극에 며칠씩 머물러 소모', remedy: '24시간 룰 — 무거운 감정 24시간 후 다시 보기' },
    8: { strength: '깊은 통찰·아이디어 폭발', shadow: '시작은 많은데 마무리가 안 됨', remedy: '하나만 끝낼 때까지 새 프로젝트 시작 금지' },
    9: { strength: '빠른 적응·읽는 눈', shadow: '남 맞추다 정작 본인이 지침', remedy: '내 의견부터 30초 말한 뒤 상대 응답 듣기' },
  };
  const userShadow = shadowByStem[ds];

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
  // compactRules (Tier 3) — SYSTEM_KO·hardForcedHeaderPart1과 중복 제거 후 사주 데이터·섹션별 가이드만
  // ============================================================
  const compactRules =
    '=== 이 사주 데이터 (의미 있을 때만 자연스럽게 활용) ===\n' +
    '격국: ' + advanced.gyeokguk.primary + ' / 조후: ' + advanced.johoo.type + ' / 신살: ' + shinsalStr + '\n' +
    '합·충·형:\n' +
    (branchRelations.items.length > 0
      ? branchRelations.items.slice(0, 5).map(it => '  - "' + it.characters.join('') + (it.type === '반합' ? ' 반합 → ' + (it.element || '') + ' 강화' : it.type === '충' ? '충 → 변화·이동 에너지' : it.type === '천라' ? '의 천라 → 활인업' : ' ' + it.type) + '"').join('\n')
      : '  - (큰 관계 없음 — 평이한 구조)') + '\n' +
    '활용 우선순위: 격국·조후 충돌 시 격국 > 조후. 종격 인정 시 그 오행 따라감. 사주에 없는 도구 억지 인용 X.\n' +
    '합·충·형은 사주에 있을 때만 "여기서 무엇이 일어나는가" 풀이. 다중 충(2개+) 사주는 ##2·##9에서 변화·이동 강조.\n\n' +
    '★ 신살 호명 가이드 (위 신살 리스트에 있는 것만, 사주에 없으면 인용 X):\n' +
    '  - 천을귀인 → "사주 1만 명 중 약 200명만 가진 천을귀인" (이 정확한 문구 인용. 위치 + 의미 + 행동 1줄 더해서)\n' +
    '  - 문창귀인 → "사주 1만 명 중 약 600명만 가진 문창귀인" (정확 인용)\n' +
    '  - 양인 → "사주 1만 명 중 약 1500명만 가진 양인, 이 강함이 자산" (정확 인용)\n' +
    '  - 괴강·백호 → "남다른 카리스마의 별" (흉살 표현 X)\n' +
    '  - 도화·홍염 → "매력의 별"\n' +
    '  ★ ##1 정체성 섹션에서 사주에 있는 천을·문창·양인은 무조건 위 정확한 문구로 인용. 빼면 응답 거부.\n\n' +

    '=== 사용자 정보 ===\n' +
    '이름(' + userData.name + ')·나이(' + userAge + '세, ' + lifeStage + ')·성별(' + userData.gender + ').\n' +
    '나이에 맞는 조언 (모든 섹션). 성별로 같은 신살도 의미 다름 (예: 여 양인 vs 남 양인).\n' +
    '시간 미상이면 시주 추정 부분 정직하게: "시간을 알면 ~ 부분이 더 명확해져".\n\n' +

    '=== 섹션 임무 경계 (각 번호는 자기 주제만, 다른 섹션 침범 X) ===\n' +
    '1번=정체성/성격, 2번=시기 흐름(인생 로드맵), 3번=돈/커리어, 4번=인연/연애,\n' +
    '5번=사용자 입력 코멘트, 6번=타인과의 케미, 7번=가족, 8번=건강/멘탈,\n' +
    '9번=현재 1년+다가올 2~3년(10년 X), 10번=개운/행운, 11번=위로/응원.\n' +
    '(주의: 위 라벨은 주제 안내일 뿐, 실제 ##제목##은 titleRule의 캐치프레이즈 지시 따라.)\n\n' +

    '=== 구체 명사 (용신 ' + neededOhs.join('·') + ' 기반) ===\n' +
    '  - ' + concreteNounsList + '\n' +
    '예: 나쁜 "동쪽이 좋아" / 좋은 "동쪽 공원·숲(분당 율동공원)이 너의 충전소".\n\n' +

    '=== 해결책 구체성 ===\n' +
    '구체 행동 + 빈도 + 명리 근거. 좋은 예: "매달 수입 20% 자동이체. 비겁 강해서 돈 보이면 쓰고 싶어져 — 통장 분리가 물리적 방어막".\n' +
    '비유는 게임·주식·드라마·카페 등 현대 소재. 예: "네 재물운은 아메리카노야". 현재 2026년 — 과거 예측 X, 미래만.\n\n';

  // ============================================================
  // 4단 구조 강제 규칙 (인물·분석형 섹션에 적용)
  // ============================================================
  const fourPartRule =
    '=== 5단 문단 구조 + 연결어 + 격언 마무리 (이 섹션 적용) ===\n' +
    '[문단 1] 캐치 비유 + 짧은 결론 (3~5문장)\n' +
    '  → 시드의 [캐치 비유] 활용. 예: "이서은님은 황금 금고와도 같습니다."\n' +
    '[문단 2] 시작어: "이러한 해석이 나오는 이유는~" 또는 "이런 해석의 근거는~"\n' +
    '  → 일간·격국·조후를 직접 호명 + 격국명에 괄호 풀이 즉시. 예: "군겁쟁재(친구 자아가 재물 두고 다투는 구조)".\n' +
    '[문단 3] 시작어: "여기에 ~이/가 더해져" 또는 "특히 ~는"\n' +
    '  → 신살을 단순 나열 X. 인과 사슬로 연결. 위 강제 신살 N명 문장 포함.\n' +
    '  → 예: "도화의 별이 매력을 주고, 거기에 홍염이 이성에게 끌림을 더하는데, 천을귀인이 그 끌림을 인복으로 변환하는 구조".\n' +
    '[문단 4] 시작어: "이런 기운을 가진 분들은~"\n' +
    '  → 약점=강점의 그림자 (시드 활용). 순수 약점 노출 X. "강점이 너무 강해서 ~한 단점" 프레임.\n' +
    '[문단 5 = 격언 마무리] 1~2문장 짧고 강하게.\n' +
    '  → 시드의 [한 줄 처방] 또는 비슷한 보편 격언. 예: "묵직하게 버티는 힘은 이미 충분하니, 가볍게 스텝을 밟는 연습을 해봐."\n' +
    '  → 30자 이내 두 문장이 이상적. 마지막 동사: "해봐"·"해보세요" 같은 권유.\n' +
    '\n→ 5문단 (디테일 풍부하면 6문단까지). 빈 줄로 구분.\n\n';

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
    '=== 🔴 응답 시작 메타 (필수, 5개 필드 모두 채워야 함) ===\n' +
    '응답 본문 시작 전에 반드시 다음 1줄을 가장 먼저 출력해. 5개 필드(용신/기신/희신/근거/풀이) 모두 채워야 하며 하나라도 빠지면 응답 거부.\n' +
    '[용신: X / 기신: Y / 희신: Z / 근거: 명리학 라벨 / 풀이: 사용자용 2~3문장 친근한 설명]\n' +
    '- X, Y, Z는 반드시 "목", "화", "토", "금", "수" 중 하나의 한글\n' +
    '- 용신과 기신은 반드시 서로 다름\n' +
    '- 정통 명리학(자평진전·적천수 종합) 기준으로 판정\n' +
    '- 다음을 모두 종합 고려: 신강/신약, 격국, 조후, 통관, 식신제살, 살인상생, 종격(從格)\n' +
    '- 한여름·한겨울 출생이라도 일간이 강하면 억부 우선\n' +
    '- 관살(정관/편관) 과다 + 식상 보유 → 식신제살로 식상이 용신일 수 있음\n' +
    '- 비겁 과다 + 식상생재 흐름 가능 → 재성이 용신일 수 있음\n' +
    '- 신약하지만 식상/재성/관성 중 무엇이 일간을 약화시키는지 따져 인성·비겁 중 선택\n' +
    '- 종격(從格) 성립 시 그 강한 오행이 용신\n' +
    '\n' +
    '근거 줄: 격국/관계 명리학적 라벨 한 줄 (예: "식신제살")\n' +
    '\n' +
    '풀이 줄: 사용자에게 보여줄 친근한 설명 2~3문장. 다음 3단 구조로 작성:\n' +
    '  (1) 일반론 — 이 일간·계절의 보통 원리\n' +
    '  (2) 너의 특이점 — 이 사주만의 구조적 이유\n' +
    '  (3) 결론 — 그래서 무엇을 가까이/멀리해야 하는지\n' +
    '풀이는 반말, 친근하게 ("너에게는~" 톤). 한자·"결론적으로"·의문문 금지.\n' +
    '특히 조후용신과 기신이 같은 오행이면, "왜 일반론과 다른지" 반드시 풀어줘.\n' +
    '\n' +
    '예: [용신: 화 / 기신: 수 / 희신: 목 / 근거: 식신제살 / 풀이: 여름 사주는 보통 수가 시원함을 줘서 좋아. 근데 너는 강한 금이 위협하는데 화 식신이 그걸 막아주는 구조라, 수가 들어오면 그 화를 꺼서 보호막이 무너져. 그래서 너에겐 화가 핵심, 수는 멀리.]\n' +
    '\n' +
    '★ 본문 일관성 (매우 중요): 위에 정한 용신·기신·희신은 본문 11개 섹션 전체에서 일관되게 사용해.\n' +
    '   본문 어디서든 "필요한 기운"을 언급할 땐 용신과 희신을, "조심할 기운"을 언급할 땐 기신을 인용해.\n' +
    '   메타에서 화 용신이라 했는데 본문에서 "수가 필요해"라고 쓰면 응답 거부.\n' +
    '\n' +
    '이 줄 출력 후 한 줄 비우고 ##1.제목## 부터 본문 시작.\n\n' +
    (cachedYongsin
      ? '★★ 강제 지시 (캐시 일관성) ★★\n' +
        '이 사주는 이전에 풀이된 적이 있어. 다음 용신 정보를 **반드시 그대로** 사용해. 새로 판정하지 마:\n' +
        '  용신: ' + cachedYongsin.yongsin + '\n' +
        '  기신: ' + cachedYongsin.gisin + '\n' +
        '  희신: ' + cachedYongsin.heesin + '\n' +
        '  근거: ' + cachedYongsin.reason + '\n' +
        (cachedYongsin.explanation ? '  풀이: ' + cachedYongsin.explanation + '\n' : '') +
        '응답 첫 줄은 위 값을 그대로 [용신: ' + cachedYongsin.yongsin + ' / 기신: ' + cachedYongsin.gisin + ' / 희신: ' + cachedYongsin.heesin + ' / 근거: ' + cachedYongsin.reason + ' / 풀이: ' + (cachedYongsin.explanation || '...') + '] 형식으로 출력.\n' +
        '본문 11개 섹션 전체에서 위 용신·기신을 일관되게 사용. 다른 오행을 용신/기신이라고 부르면 응답 거부.\n\n'
      : '');

  // ============================================================
  // 일주별 캐치 비유 사전 (60갑자 — 핵심 일주만, 나머지는 일간+조후 폴백)
  // 1번 레퍼런스 글의 "황금 금고" 류 압축 비유
  // ============================================================
  const ilJuMetaphors: Record<string, string> = {
    '갑자': '맑은 물에 서 있는 큰 나무 — 흐름 위에 단단히 뿌리내린 사람',
    '갑인': '큰 숲의 우두머리 나무 — 그 자체로 풍경이 되는 존재',
    '갑진': '비옥한 들판에 우뚝 선 큰 나무 — 야망의 스케일이 다른 사람',
    '갑오': '한낮 햇볕 아래 빛나는 나무 — 사람을 끌어모으는 인기의 별',
    '갑신': '바람을 가르는 단단한 줄기 — 재치와 다재다능의 결정체',
    '갑술': '서리 맞고도 꺾이지 않는 고목 — 고집과 정의감의 화신',
    '을묘': '봄날의 꽃을 다 피워낸 사람 — 부드러우면서 매력적인 존재',
    '병오': '한낮의 태양 — 가만히 있어도 빛나는 사람',
    '정사': '어둠 속의 등불 — 길을 안내하는 사람',
    '무술': '황금 금고를 깔고 앉은 묵직한 산 — 잠재력이 어마어마한 사람',
    '무진': '비옥한 큰 땅 — 무엇을 심어도 키워내는 그릇',
    '기축': '봄 들판의 부드러운 흙 — 모두를 품는 모성의 별',
    '경신': '제련된 강철 — 단단함과 예리함이 한 몸에',
    '경자': '깊은 물 위에 서린 칼 — 차분한 살의 아닌 차분한 결단',
    '신유': '잘 다듬어진 보석 — 완벽주의와 세련의 정수',
    '임자': '깊은 바다 — 속을 알 수 없는 지혜의 별',
    '임술': '차가운 바다 속의 숨겨진 보물상자 — 내면이 깊고 신비로운 사람',
    '계해': '비 그친 뒤의 강 — 모든 것을 흘려보내고 다시 채우는 사람',
  };
  const dayPillar = CG[sj.dStem] + JJ[sj.dBranch];
  const userIlJuMetaphor = ilJuMetaphors[dayPillar] || '';

  // ============================================================
  // 격국 한 줄 풀이 사전 — 비전문가에게 즉시 풀이
  // ============================================================
  const gyeokgukGloss: Record<string, string> = {
    '정관격': '권위와 책임의 별이 중심 — 안정·신뢰의 구조',
    '편관격': '도전·돌파의 별이 중심 — 어려움 속에서 빛나는 구조',
    '정인격': '배움·돌봄의 별이 중심 — 지혜와 보호의 구조',
    '편인격': '독창·통찰의 별이 중심 — 남다른 시각의 구조',
    '식신격': '베풂·표현의 별이 중심 — 사람·언어로 풀리는 구조',
    '상관격': '재능·파격의 별이 중심 — 틀을 깨는 구조',
    '정재격': '안정 재물의 별이 중심 — 꾸준한 수입의 구조',
    '편재격': '큰 재물·기회의 별이 중심 — 사업·투자의 구조',
    '비견격': '동등한 자아·친구 자아의 구조 — 독립적이고 협력적인 형국',
    '겁재격': '경쟁 자아의 구조 — 강한 추진과 갈등이 공존',
    '관인상생': '권위와 배움이 서로 돕는 구조 — 격조 있는 발전형',
    '식신제살': '베풂의 별이 시련을 막아주는 구조 — 위기 때 사람으로 풀리는 형국',
    '살인상생': '시련이 배움으로 승화되는 구조 — 고비마다 성장하는 형국',
    '군겁쟁재': '친구·형제 자아가 재물 두고 다투는 구조 — 동업·분배 주의',
    '일반격': '뚜렷한 격이 없이 오행 균형이 잡힌 구조 — 무난하게 어디서든 적응하는 형국',
    '잡기격': '여러 기운이 섞여 다재다능한 구조 — 변화에 유연한 형국',
    '종격': '한 기운에 완전히 따라가는 구조 — 그 오행이 곧 운명의 길',
    '종강격': '강한 기운에 동조하는 구조 — 자기 강점을 끝까지 밀어붙이는 형국',
    '종재격': '재물 기운에 따라가는 구조 — 돈·사업이 인생의 무대',
    '종관격': '관성 기운에 따라가는 구조 — 권위·직장이 인생의 무대',
  };
  const userGyeokgukGloss = gyeokgukGloss[advanced.gyeokguk.primary] || '';

  // ============================================================
  // 강제 신살 문장 (LLM 판단 위임 X — 코드에서 완성문장 생성)
  // ============================================================
  const forcedShinsalSentences: string[] = [];
  if (shinsalStr.includes('천을귀인')) {
    forcedShinsalSentences.push('네 사주에는 사주 1만 명 중 약 200명만 가진 천을귀인이 박혀 있어. 위기 때 누군가가 결정적인 도움을 주는 구조라, 인생의 큰 고비마다 손 내밀어 주는 사람이 분명히 나타나.');
  }
  if (shinsalStr.includes('문창귀인')) {
    forcedShinsalSentences.push('사주 1만 명 중 약 600명만 가진 문창귀인도 있어. 공부·시험·글쓰기로 풀리는 운이 흐르는 구조야.');
  }
  if (shinsalStr.includes('양인')) {
    forcedShinsalSentences.push('사주 1만 명 중 약 1500명만 가진 양인이 있어 — 이 강함이 너의 자산이야. 결단력이 필요한 자리에서 빛나.');
  }
  const forcedShinsalBlock = forcedShinsalSentences.length > 0
    ? '\n   ★★★ 다음 문장은 ##1 문단 3에 반드시 **"1만 명 중 약 N명" 수치 포함** 본문 등장 (수치 빼고 "양인의 강함이 자산"식으로만 풀면 거부됨):\n' +
      forcedShinsalSentences.map((s, i) => `   ${i + 1}. "${s}"`).join('\n') +
      '\n   ★★★ "1만 명 중 약 200명" / "1만 명 중 약 1500명" 같은 정확한 수치 표현이 응답에 없으면 응답 자체가 거부된다. 그저 신살 이름만 호명하지 말고 수치 동반 인용 필수.\n' +
      '   ★ 천을귀인은 ##3·##4에서도 자연스럽게 재등장 OK. 양인은 ##3에서 재등장 권장.'
    : '';

  // ============================================================
  // 1번 레퍼런스 품질 시드 — ##1 직전에 박을 개인화 블록
  // (캐치 비유 + 격국 풀이 + 약점-그림자 패턴)
  // ============================================================
  const referenceQualitySeed =
    '\n=== ★ 이 사주만의 풀이 시드 (##1 작성 시 적극 활용) ===\n' +
    (userIlJuMetaphor ? '  [캐치 비유] ' + dayPillar + ' 일주 → "' + userIlJuMetaphor + '"\n    → ##1 문단 1에서 이 비유 또는 비슷한 톤으로 도입.\n' : '') +
    (userGyeokgukGloss ? '  [격국 풀이] ' + advanced.gyeokguk.primary + ' = ' + userGyeokgukGloss + '\n    → ##1 문단 2에서 격국명 호명 시 이 풀이를 괄호로 즉시 풀어줘.\n' : '') +
    (userShadow ? '  [약점=강점 그림자] — ##1 문단 4에 반드시 본문 포함\n' +
      '    ★★★ 정확히 이 문장 (또는 약간 풀어쓰기) ##1 문단 4에 포함, 빠뜨리면 응답 거부:\n' +
      '    "이런 기운을 가진 분들은 ' + userShadow.strength + '의 아이콘이지만, ' + userShadow.shadow + '."\n' +
      '    → ##1 문단 5(마지막 격언)에서 처방을 짧고 강하게 (권유형 종결):\n' +
      '    "' + userShadow.remedy.replace(/$/, '') + ' 해봐."\n' +
      '    ★ ##2·##3·##4는 그 섹션 특화 격언으로 마무리 (##1 격언 복붙 X. ##3→재물 처방, ##4→인연 처방).\n' : '') +
    '\n';

  // ============================================================
  // 강제 헤더 — 파트별로 분리 (3 파트가 같은 ##N 범위로 충돌하던 버그 fix)
  // ============================================================

  // 모든 파트 공통: 신살 명명 규칙
  const universalShinsalRule =
    '[룰 신살 명명] 이 사주 신살: ' + shinsalStr + '\n' +
    '  통계 책임은 시스템이 짐 — 너는 인용만. 자체 검열·회피 X.\n' +
    '  사주에 있으면 무조건 호명 (1만 명 중 N명 표현 정확히):\n' +
    '    천을귀인 → "사주 1만 명 중 약 200명만 가진 천을귀인"\n' +
    '    문창귀인 → "사주 1만 명 중 약 600명만 가진 문창귀인"\n' +
    '    양인살 → "사주 1만 명 중 약 1500명만 가진 양인 — 이 강함이 자산"\n' +
    '    괴강·백호 → "남다른 카리스마의 별"\n' +
    '    도화·홍염 → "매력의 별"\n' +
    '  "신살" 단어 X. 이름만 또는 "별".\n';

  // Part 1: ##1~##4 + 용신 메타 첫 줄 + 격언/그림자 강제
  const hardForcedHeaderPart1 =
    '🚨 절대 위반 금지 (어기면 응답 거부) — PART 1 of 3 🚨\n\n' +
    '[룰 1] 응답 첫 줄: [용신: X / 기신: Y / 희신: Z / 근거: 명리 라벨 / 풀이: 친근한 2~3문장] — 5필드 모두 채움.\n\n' +
    universalShinsalRule +
    forcedShinsalBlock + '\n\n' +
    '[룰 3] 이 응답(Part 1)은 정확히 ##1, ##2, ##3, ##4 4개 섹션만. ##5 이상 절대 금지 (어떤 5단계 라벨도 ##기호 X).\n' +
    '  ##2 인생 로드맵: 5단계(아동기·청소년기·성년기·중년기·노년기) **전부** 본문 내 텍스트 라벨로 작성. 단 하나도 생략 X.\n' +
    '    - 사용자 나이가 청소년이라도 5단계 모두 (어른이 된 후 시점 미리보기 식).\n' +
    '    - 사용자 나이가 노년이라도 5단계 모두 (어린 시절 회고 식).\n' +
    '  ##3 제목/본문은 반드시 "돈/재물/커리어" 단어 1개 이상 포함. ##4 제목/본문은 반드시 "연애/사랑/인연/결혼/매력" 단어 1개 이상 포함.\n\n' +
    '[룰 4] 각 ##1·##3·##4 섹션의 마지막 문단은 격언 마무리 (1~2문장, 권유형 종결 "해봐/해보세요"). 격언 빠뜨리면 거부.\n\n' +
    '[룰 5] ##1 문단 4에 **약점=강점 그림자** 패턴 반드시 포함. "이런 기운을 가진 분들은 [강점]의 아이콘이지만, [그림자]" 형식.\n\n' +
    '★ 위 룰은 본문 모든 룰을 압도. ★\n\n';

  // Part 2: ##5~##8만 (용신 메타 재출력 금지)
  const hardForcedHeaderPart2 =
    '🚨 절대 위반 금지 (어기면 응답 거부) — PART 2 of 3 🚨\n\n' +
    '[룰 섹션 범위] 이 응답(Part 2)은 정확히 ##5, ##6, ##7, ##8 4개 섹션만. ##1~##4 또는 ##9 이상의 번호 절대 사용 금지.\n' +
    '  바로 ##5.[제목]## 으로 시작해. 첫 줄에 [용신:.../기신:...] 메타 재출력 금지 (Part 1에서 이미 출력됨).\n' +
    '  "정체성·성격", "인생 로드맵", "돈·커리어", "인연·연애" 같은 ##1~##4 주제로 다시 가지 마. 5~8번 주제만.\n\n' +
    universalShinsalRule + '\n' +
    '★ 위 룰은 본문 모든 룰을 압도. ★\n\n';

  // Part 3: ##9~##11만
  const hardForcedHeaderPart3 =
    '🚨 절대 위반 금지 (어기면 응답 거부) — PART 3 of 3 🚨\n\n' +
    '[룰 섹션 범위] 이 응답(Part 3)은 정확히 ##9, ##10, ##11 3개 섹션만. ##1~##8 또는 ##12 이상의 번호 절대 사용 금지.\n' +
    '  바로 ##9.[제목]## 으로 시작해. 첫 줄에 [용신:.../기신:...] 메타 재출력 금지 (Part 1에서 이미 출력됨).\n' +
    '  앞 파트(##1~##8) 주제로 다시 가지 마. 9~11번 주제(현재 1~3년 가시권, 개운/행운/방위, 편지)만.\n\n' +
    universalShinsalRule + '\n' +
    '★ 위 룰은 본문 모든 룰을 압도. ★\n\n';

  let prompt1 = hardForcedHeaderPart1 + referenceQualitySeed + compactRules + yongsinHeaderRule + prompt + '=== 아래 4개 항목을 써줘 (1~4번). 5번 이상 쓰지 마! 각 항목은 "이 사주만의 디테일"로 ===\n[리마인더] 올해(2026) 운세는 별도 메뉴에서 제공. 여기서는 2026년 운세를 상세히 다루지 마.\n[리마인더] 일반론·당연한말 금지. 각 섹션은 5~6문단 권장.\n\n';
  let n = 1;

  // ##1. 나는 어떤 사람인가 — 4단 강제 + 신살·희소성 강제
  prompt1 += titleRule(n++, '일간/격국/조후/오행/십성/12운성 기반 내 핵심 정체성');
  prompt1 += fourPartRule;
  prompt1 += '내용 지시 (★ 신살 활용 강제):\n' +
    '- 문단 1: 이 사주 정수(' + advanced.essence.oneLineKo + ')를 캐치한 비유로 도입.\n' +
    '- 문단 2: 일간 ' + CG[sj.dStem] + JJ[sj.dBranch] + ', 격국 ' + advanced.gyeokguk.primary + ', 조후 ' + advanced.johoo.type + '을 직접 호명하며 근거 제시.\n' +
    '- 문단 3 (★ 강제): 이 사주의 신살 [' + shinsalStr + '] 중 가장 영향력 큰 것 **최소 3개**를 본문에 직접 호명 + 의미 + 행동 예측. 호명 시 "신살"이라는 단어 사용 금지 — "별" 또는 신살 이름만.\n' +
    '   - 천을귀인 있으면: "사주 1만 명 중 약 200명만 가진 천을귀인" 형식으로 희소성 어필 필수.\n' +
    '   - 문창귀인 있으면: "사주 1만 명 중 약 600명만 가진 문창귀인".\n' +
    '   - 양인살 있으면: "이 강함이 너의 자산"으로 강점 변환 + 위 희소성 표현 (약 1500명).\n' +
    '   - 괴강·백호: 흉살로 부르지 말고 "남다른 카리스마의 별".\n' +
    '   - 도화·홍염: "매력의 별".\n' +
    '   합·충·형 중 가장 영향력 큰 것도 1개 짚어 메커니즘 설명.\n' +
    '- 문단 4: 강점 활용법과 약점 보완 행동 (지명·제품·시간·숫자 포함).\n' +
    '[주의] 이 섹션에서 성격·멘탈 분석을 모두 끝내. 다른 섹션에서 성격 분석 반복 금지. 친구/대인관계 언급은 6번에서.\n\n';

  // ##2. 인생 로드맵 5단계 — 12운성 + 친근한 라벨 강화
  prompt1 += titleRule(n++, '아동기→청소년→성년→중년→노년 인생 로드맵');
  prompt1 += '형식: 5단계 분할. ★ 각 단계 본문 최소 4줄 (디테일 풍부하면 6줄까지). 2~3줄로 끝내면 응답 거부.\n' +
    '★ 매우 중요: 각 단계 머리말은 절대 "##숫자.제목##" 형식으로 쓰지 마. ##기호 X. 단순 텍스트 라벨 한 줄로:\n' +
    '  예: "아동기(0~12세) — 새로 시작하는 시기 🌱 (장생)"\n' +
    '  예: "중년기(36~55세) — 가장 빛나는 시기 👑 (제왕)"\n' +
    '5단계는 모두 ##2 섹션 안의 텍스트야. ##2 다음에 ##3, ##4, ##5로 점프하면 응답 거부.\n' +
    '★ 각 단계마다 반드시 포함할 내용 (4줄을 채우는 구성):\n' +
    '  1줄: 해당 시기 대운의 천간/지지 명시 + 그 의미 (예: "을해 년주의 영향으로 ~")\n' +
    '  2줄: 원국과의 작용 (합/충/형/십성/12운성 중 하나 이상 호명)\n' +
    '  3줄: 그 시기 구체적 경험 예측 (학교·관계·진로 등)\n' +
    '  4줄: 다음 시기로 넘어가는 전환점 또는 핵심 한마디\n' +
    '★★★ 5단계 모두(아동기·청소년기·성년기·중년기·노년기) **반드시 다섯 개 라벨 모두** 본문에 등장.\n' +
    '   - 사용자 나이와 무관. 14세든 65세든 5단계 전부.\n' +
    '   - 누락된 단계가 있으면 응답 거부. 검증 시 정규식으로 5개 라벨 단어 존재 확인.\n\n' +
    '★★★ ##2 정확한 출력 형식 (이대로 그대로 따라):\n' +
    '   ##2.[캐치 제목]##\n' +
    '   아동기(0~12세) — 새로 시작하는 시기 🌱 (장생)\n' +
    '   본문 4~6줄. 년주 천간/지지 + 원국 작용 + 그 시기 경험 + 다음 시기 전환점.\n' +
    '\n   청소년기(13~19세) — 감성이 풍부한 시기 🌊 (목욕)\n' +
    '   본문 4~6줄. 월주 천간/지지 + 초기 대운 + 친구·정체성 + 다음 시기 전환점.\n' +
    '\n   성년기(20~35세) — 도전하는 시기 🎓 (관대)\n' +
    '   본문 4~6줄. 일주 + 사회진출 대운 + 커리어/연애 + 전환점.\n' +
    '\n   중년기(36~55세) — 가장 빛나는 시기 👑 (제왕)\n' +
    '   본문 4~6줄. 일지 12운성 + 중반 대운 + 기반 구축 + 전환점.\n' +
    '\n   노년기(56세~) — 무르익는 시기 📚 (쇠)\n' +
    '   본문 4~6줄. 시주 12운성 + 후반 대운 + 수확 + 다음 세대 전수.\n' +
    '\n   ★ 단계 라벨 머리말은 반드시 위 예시처럼 **##기호 X**, 그냥 텍스트 한 줄. ##2.~##5.~~ 식 절대 X.\n\n' +
    '단계 구성:\n' +
    '- 아동기(0~12세): 년주 환경/가족 + 년지 12운성\n' +
    '- 청소년기(13~19세): 월주 + 초기 대운 + 월지 12운성\n' +
    '- 성년기(20~35세): 사회 진출, 커리어/연애 시작\n' +
    '- 중년기(36~55세): 기반 구축, 전성기 + 일지 12운성\n' +
    '- 노년기(56세~): 수확기 + 시지 12운성\n\n' +
    '★ 12운성 친근한 라벨 사전 (이걸 그대로 활용):\n' +
    '  장생 → 새로 시작하는 시기 🌱\n' +
    '  목욕 → 감성이 풍부한 시기 🌊\n' +
    '  관대 → 도전하는 시기 🎓\n' +
    '  건록 → 자수성가 시기 💪\n' +
    '  제왕 → 가장 빛나는 시기 👑 (단, 욕심 내려놓는 게 핵심)\n' +
    '  쇠 → 무르익는 시기 📚\n' +
    '  병 → 내면이 깊어지는 시기 🧘\n' +
    '  사 → 전환의 시기 🔄\n' +
    '  묘 → 안에 쌓는 시기 💎\n' +
    '  절 → 리셋하는 시기 ✨\n' +
    '  태 → 가능성 품는 시기 🥚\n' +
    '  양 → 준비하는 시기 🍼\n\n' +
    '★★ 중요한 인식 강제: "에너지가 높은 시기 = 좋은 시기" 같은 오해 절대 금지.\n' +
    '  - 제왕(10)은 정점이지만 욕심 부리면 내리막. 점수만 보고 "좋다"고 쓰면 거부.\n' +
    '  - 절·묘·사 같은 낮은 단계도 각각 고유한 가치(자유·축적·전환) 있음을 풀어줘.\n' +
    '  - 단계마다 "이 시기는 이런 의미야"로 친근하게 설명. 점수 언급 자체를 피해.\n\n' +
    '각 단계마다 해당 대운의 천간/지지와 원국 작용을 명시. 게임/영화/계절 비유 활용.\n' +
    '현재 나이(' + userAge + '세) 기준으로 과거는 회고형("이런 경험 있었지?"), 미래는 예측형으로.\n' +
    '★ 현재 나이에 해당하는 단계는 "★ 지금 너의 시기"로 본문에서 강조.\n\n';

  // ##3. 돈/커리어 — 4단 + 직업 리스트
  prompt1 += titleRule(n++, '돈, 직업, 재능, 시험운');
  prompt1 += fourPartRule;
  prompt1 += '내용 지시 (4단 + 끝에 리스트 추가):\n' +
    '- 4단 본문: 정재/편재 위치와 힘, 재물그릇, 격국 기반 사업/직장 적성, 통변으로 재성 대운이 올 때 사건.\n' +
    '- 4단 본문에 격국명(' + advanced.gyeokguk.primary + ') 자연스럽게 노출.\n' +
    '- ★ 중복 방지: ##1에서 호명한 천을귀인·양인 N명 표현은 ##3에서 다시 사용 X. ##3은 재물 관점에서 다르게 풀이 (예: "도화의 별이 재물 흐름 면에서는 ~").\n' +
    '- 본문 끝에 별도 리스트 2개:\n' +
    '  🎯 딱 맞는 분야 TOP 5 (격국/용신 근거 1~2줄씩)\n' +
    '  ⚠️ 안 맞는 직업 3가지 (기신 오행/구조 충돌 근거)\n\n';

  // ##4. 연애/부부 (분기) — 4단 강제 + 격언 마무리 명시
  if (isMarried) {
    prompt1 += titleRule(n++, '배우자 분석 & 부부 관계');
    prompt1 += fourPartRule;
    prompt1 += '내용 지시:\n' +
      '- 문단 1: 배우자궁(' + JJ[sj.dBranch] + ') 기반 부부 관계 비유로 도입.\n' +
      '- 문단 2: 배우자성 + 십성 구조 근거.\n' +
      '- 문단 3: 부부 사이 좋아지는 시기/조심할 시기 (대운/세운 합충형).\n' +
      '- 문단 4: 권태기 극복법, 표현법 구체 제시.\n' +
      '- 문단 5 (격언 마무리, 반드시): 부부 관계 처방 1~2문장 권유형 종결로 ("해봐/해보세요"). 빠뜨리면 응답 거부.\n  예: "이미 알맞은 사람을 만났으니, 작은 표현 한 마디만 매일 더해봐."\n\n';
  } else {
    prompt1 += titleRule(n++, '연애 & 결혼 타이밍');
    prompt1 += fourPartRule;
    prompt1 += '내용 지시:\n' +
      '- 문단 1: 미래 반쪽의 느낌과 매력 무기 비유로 도입.\n' +
      '- 문단 2: 배우자궁(' + JJ[sj.dBranch] + ') + 관성/재성 구조 근거.\n' +
      '- 문단 3: 인연이 오는 시기(통변), 어떤 타입이 올지, 결혼 적기 조건.\n' +
      '- 문단 4: 연애 전략 구체 (어디서 만나, 어떻게 다가가, 무엇을 조심).\n' +
      '- 문단 5 (격언 마무리, 반드시): 연애 처방 1~2문장 권유형 종결로 ("해봐/해보세요"). 빠뜨리면 응답 거부.\n  예: "매력은 이미 충분하니, 솔직한 한마디부터 던져봐."\n\n';
  }

  prompt1 += getTerminologyPromptBlock(userData.lang === 'en' ? 'en' : 'ko');

  // ============================================================
  // Part 2: sections 5~8
  // ============================================================
  let prompt2 = hardForcedHeaderPart2 + compactRules + prompt + '=== 아래 4개 항목을 써줘 (5~8번). 반드시 ##5, ##6, ##7, ##8 번호 사용 (##1~##4 다시 쓰면 응답 거부). 각 항목은 "이 사주만의 디테일"로 ===\n[출력형식] 반드시 ##숫자.제목## 형태로 각 섹션 시작. 안 지키면 응답 거부.\n[리마인더] 일반론·당연한말 금지. 각 섹션은 디테일이 충분하면 5~8문단까지.\n\n';

  // ##5. 사용자 질문 분석 — 코멘테이터 톤 (짧고 자연스럽게)
  prompt2 += titleRule(n++, '네가 직접 답한 질문에 대한 코멘트');
  prompt2 += '형식: 4개 질문에 각 1문단씩 (3~5줄). 4단 구조 강제 X.\n' +
    '톤: 분석가가 너의 답을 보고 코멘트하는 식.\n' +
    '  - 사주와 일치하면 "맞아, 사주에도 이렇게 나와 — [근거]"\n' +
    '  - 사주와 다르면 "흥미롭네. 사주는 좀 다르게 말해 — [근거]"\n' +
    '문단 1 (고민: ' + concernText + '): 왜 이 고민이 사주적으로 생기는지 + 한 줄 실마리.\n' +
    '문단 2 (현재 상태: ' + stateText + '): 대운·세운과 어떻게 맞물리는지 짧게.\n' +
    '문단 3 (자가 성격: ' + (persText || '미입력') + '): 사주 성격과 일치·불일치 짧은 코멘트.\n' +
    '문단 4 (연애 상태: ' + relText + '): 사주 연애운과 현재 상황의 거리감 짧게.\n' +
    '[주의] 다른 섹션 분석을 통째로 반복 금지. 올해(2026) 운세는 "별도 메뉴 안내" 한 줄로만 처리.\n\n';

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

  // ============================================================
  // Part 3: sections 9~12
  // ============================================================
  let prompt3 = hardForcedHeaderPart3 + compactRules + prompt + '=== 아래 3개 항목을 써줘 (9~11번). 반드시 ##9, ##10, ##11 번호 사용 (##1~##8 다시 쓰면 응답 거부). 반드시 3개 모두! ===\n[출력형식] 반드시 ##숫자.제목## 형태로 각 섹션 시작.\n[리마인더] 일반론·당연한말 금지. 각 섹션은 디테일이 충분하면 5~8문단까지.\n\n';

  // ##9. 현재 1년 + 다가올 2~3년 가시권 — 4단 강제
  prompt3 += titleRule(n++, '지금 1년과 다가올 2~3년 가시권');
  prompt3 += fourPartRule;
  prompt3 += '내용 지시 (가시권만 — 10년 시나리오 X):\n' +
    '- 문단 1: 지금(2026, ' + userAge + '세, ' + lifeStage + ')이 인생에서 어떤 챕터인지 비유로 도입. 현재 대운을 한 줄 소개.\n' +
    '- 문단 2: 현재 대운의 천간/지지와 원국 작용(합/충/형) 근거. 12운성으로 지금 에너지 상태 분석.\n' +
    '- 문단 3: 2027(정미)·2028(무신) 흐름. 세운과 원국의 관계, 상반기/하반기 좋은 시점과 조심할 시점. 짧은 삼재/대운 전환이 있으면 한 줄.\n' +
    '- 문단 4: 다가올 2~3년 안에 집중할 것 + 내려놓을 것 + 2027년 한 줄 헤드라인 미리보기.\n' +
    '[주의] 2029년 이후 장기 예측 금지 — 가시권 밖. 과거(2025 이전) 예측 금지.\n\n';

  // ##10. 행운/부동산/방위 — 리스트형
  prompt3 += titleRule(n++, '개운법, 행운 루틴, 부동산, 방위');
  prompt3 += '형식: 리스트형 (4단 강제 X).\n' +
    '- 행운 색/숫자/방향/요일/계절 (용신 ' + (advanced.johoo.needed.join('·') || dayOh) + ' 근거)\n' +
    '- 매일 행운 습관 3가지\n' +
    '- 기신 피하는 실생활 팁\n' +
    '- 부동산: ' + (dayOh==='목'?'동':dayOh==='화'?'남':dayOh==='토'?'중앙':dayOh==='금'?'서':'북') + '쪽 유리, 맞는 부동산 유형, 재물 축적 전략\n' +
    '- 구체 지명/제품 포함 (예: "한강 변", "메탈 액세서리")\n\n';

  // ##11. 편지 — 자유 형식
  prompt3 += titleRule(n++, '나에게 보내는 편지');
  prompt3 += '형식: 3~4단 자유. 따뜻한 응원 메시지. 격국/조후/대운 흐름을 바탕으로 한 비유 가득한 진심 편지.\n\n';

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
  reason: string;       // 격국·근거 (짧은 명리학적 라벨)
  explanation?: string; // 사용자용 친근한 풀이 (2~3문장)
}

const VALID_OH = ['목', '화', '토', '금', '수'];

/**
 * LLM 응답 텍스트에서 첫 줄의 [용신: X / 기신: Y / 희신: Z / 근거: ...] 메타를 추출.
 * 형식·정합성 검증 통과 시 객체 반환, 실패 시 null.
 * 영어 응답도 처리 ([Yongsin: Fire / Gisin: Metal / ...] 형식).
 */
export function parseYongsinMeta(text: string): YongsinMeta | null {
  if (!text) return null;
  // 한국어 형식 — 풀이 필드 포함 (선택적)
  const koReFull = /\[\s*용신\s*:\s*([목화토금수])\s*\/\s*기신\s*:\s*([목화토금수])\s*\/\s*희신\s*:\s*([목화토금수])\s*\/\s*근거\s*:\s*([^\/\]]+?)\s*(?:\/\s*풀이\s*:\s*([^\]]+?))?\s*\]/;
  let m = text.match(koReFull);
  if (m) {
    const result: YongsinMeta = {
      yongsin: m[1],
      gisin: m[2],
      heesin: m[3],
      reason: m[4].trim(),
      explanation: m[5] ? m[5].trim() : undefined,
    };
    return validateYongsinMeta(result) ? result : null;
  }
  // 영어 형식
  const enReFull = /\[\s*(?:Yongsin|용신)\s*:\s*(Wood|Fire|Earth|Metal|Water)\s*\/\s*(?:Gisin|기신)\s*:\s*(Wood|Fire|Earth|Metal|Water)\s*\/\s*(?:Heesin|희신)\s*:\s*(Wood|Fire|Earth|Metal|Water)\s*\/\s*(?:Reason|근거)\s*:\s*([^\/\]]+?)\s*(?:\/\s*(?:Explanation|풀이)\s*:\s*([^\]]+?))?\s*\]/i;
  m = text.match(enReFull);
  if (m) {
    const enToKo: Record<string, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
    const result: YongsinMeta = {
      yongsin: enToKo[m[1].toLowerCase()],
      gisin: enToKo[m[2].toLowerCase()],
      heesin: enToKo[m[3].toLowerCase()],
      reason: m[4].trim(),
      explanation: m[5] ? m[5].trim() : undefined,
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

// ============================================================
// 용신 캐싱 — 같은 사주 = 같은 용신 일관성 보장
// ============================================================
// 사주명식이 동일하면 용신도 동일해야 함. localStorage에 영구 저장.

export function getYongsinCacheKey(sj: SajuResult): string {
  // 사주 8글자(stem 4 + branch 4) 조합으로 유일 키 생성
  return `yongsin:${sj.yStem}-${sj.yBranch}-${sj.mStem}-${sj.mBranch}-${sj.dStem}-${sj.dBranch}-${sj.hStem}-${sj.hBranch}`;
}

export function getCachedYongsin(sj: SajuResult): YongsinMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getYongsinCacheKey(sj));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as YongsinMeta;
    // 검증 — 손상된 캐시 거름
    if (parsed && parsed.yongsin && parsed.gisin && parsed.heesin
        && VALID_OH.includes(parsed.yongsin) && VALID_OH.includes(parsed.gisin) && VALID_OH.includes(parsed.heesin)
        && parsed.yongsin !== parsed.gisin) {
      return parsed;
    }
    return null;
  } catch { return null; }
}

export function setCachedYongsin(sj: SajuResult, meta: YongsinMeta): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(getYongsinCacheKey(sj), JSON.stringify(meta)); } catch { /* quota exceeded etc — ignore */ }
}
