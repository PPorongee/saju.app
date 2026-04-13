export type Lang = 'ko' | 'en';

export const T: Record<string, Record<Lang, string>> = {
  // Intro
  appTitle: { ko: '별빛 사주', en: 'Starlight Saju' },
  appSubtitle: { ko: '네 생일에 우주가 살짝 남겨둔 이야기가 있어, 한번 들어볼래?', en: 'The universe left a little story on your birthday — want to hear it?' },
  visitorCount: { ko: '명이 운명을 확인했어요', en: 'people checked their destiny today' },

  // Feature cards
  sajuTitle: { ko: '내 사주 해설', en: 'My Saju Reading' },
  sajuDesc: { ko: '17가지 심층 분석', en: '17 Deep Analysis' },
  compatTitle: { ko: '궁합 보기', en: 'Compatibility' },
  compatDesc: { ko: '두 사람의 인연 분석', en: 'Analyze your connection' },
  yearlyTitle: { ko: '2026 올해운세', en: '2026 Fortune' },
  yearlyDesc: { ko: '월별 상세 운세', en: 'Monthly detailed fortune' },
  pregTitle: { ko: '임산부 모드', en: 'Pregnancy Mode' },
  pregDesc: { ko: '엄마와 아기 궁합', en: 'Mom & baby harmony' },

  // Birth input
  enterBirthday: { ko: '너의 생년월일을 알려줘', en: 'Tell me your birthday' },
  name: { ko: '이름', en: 'Name' },
  namePlaceholder: { ko: '이름을 입력해줘', en: 'Enter your name' },
  gender: { ko: '성별', en: 'Gender' },
  male: { ko: '남', en: 'M' },
  female: { ko: '여', en: 'F' },
  calendarType: { ko: '달력 유형', en: 'Calendar' },
  solar: { ko: '양력', en: 'Solar' },
  lunar: { ko: '음력', en: 'Lunar' },
  birthday: { ko: '생년월일', en: 'Date of Birth' },
  birthTime: { ko: '태어난 시간', en: 'Birth Time' },
  unknownTime: { ko: '잘 모르겠어', en: "I don't know" },
  next: { ko: '다음', en: 'Next' },
  prev: { ko: '이전', en: 'Previous' },
  loadProfile: { ko: '정보 불러오기', en: 'Load profile' },
  quickAnalysis: { ko: '바로 분석', en: 'Quick analysis' },
  viewResults: { ko: '결과 보기', en: 'View Results' },

  // Questions
  q1Title: { ko: '지금 가장 큰 고민이 뭐야?', en: "What's your biggest concern?" },
  q2Title: { ko: '요즘 삶의 상태는?', en: "How's your life right now?" },
  q3Title: { ko: '나는 어떤 사람이야?', en: 'What kind of person are you?' },
  q3Sub: { ko: '직감으로 골라!', en: 'Choose by instinct!' },
  q4Title: { ko: '연애 상태는?', en: 'Relationship status?' },
  q5Title: { ko: '가장 알고 싶은 건?', en: 'What do you want to know most?' },

  // Question options
  concern_love: { ko: '💕 연애/관계', en: '💕 Love' },
  concern_career: { ko: '💼 커리어/진로', en: '💼 Career' },
  concern_money: { ko: '💰 돈/재정', en: '💰 Money' },
  concern_social: { ko: '👥 인간관계', en: '👥 Relationships' },
  concern_health: { ko: '🏥 건강', en: '🏥 Health' },
  concern_study: { ko: '📚 학업/시험', en: '📚 Study' },

  state_stable: { ko: '🌿 안정적이고 평화로워', en: '🌿 Stable & peaceful' },
  state_change: { ko: '🌊 변화의 흐름 속에 있어', en: '🌊 In a flow of change' },
  state_stress: { ko: '😤 스트레스가 많아', en: '😤 Very stressed' },
  state_challenge: { ko: '🧗 도전적인 시기야', en: '🧗 Challenging times' },
  state_unknown: { ko: '🤷 잘 모르겠어', en: "🤷 Not sure" },

  pers_introvert: { ko: '내향적', en: 'Introvert' },
  pers_extrovert: { ko: '외향적', en: 'Extrovert' },
  pers_emotional: { ko: '감성적', en: 'Emotional' },
  pers_logical: { ko: '이성적', en: 'Logical' },
  pers_planner: { ko: '계획적', en: 'Planner' },
  pers_spontaneous: { ko: '즉흥적', en: 'Spontaneous' },

  rel_single: { ko: '💔 솔로', en: '💔 Single' },
  rel_talking: { ko: '💬 썸 타는 중', en: '💬 Talking' },
  rel_dating: { ko: '💑 연애 중', en: '💑 Dating' },
  rel_married: { ko: '💍 기혼', en: '💍 Married' },
  rel_brokeup: { ko: '😢 최근 이별', en: '😢 Recently broke up' },

  interest_yearly: { ko: '🔮 올해 전체 운세', en: '🔮 This year fortune' },
  interest_love: { ko: '💕 연애운/궁합', en: '💕 Love fortune' },
  interest_money: { ko: '💰 재물운', en: '💰 Wealth fortune' },
  interest_career: { ko: '💼 직장/사업운', en: '💼 Career fortune' },
  interest_timing: { ko: '⏰ 중요 결정의 타이밍', en: '⏰ Decision timing' },

  // Loading
  loading1: { ko: '사주 명식을 펼치는 중...', en: 'Reading your birth chart...' },
  loading2: { ko: '오행의 기운을 분석하는 중...', en: 'Analyzing five elements...' },
  loading3: { ko: '너만의 해석을 완성하는 중...', en: 'Completing your reading...' },

  // Results
  aiReading: { ko: 'AI 사주 풀이', en: 'AI Saju Reading' },
  saveResult: { ko: '💾 결과 저장', en: '💾 Save Result' },
  restart: { ko: '처음부터 다시 하기', en: 'Start Over' },
  disclaimer: { ko: '사주풀이는 재미를 위한 것이며 전문 상담을 대체하지 않습니다.', en: 'This reading is for entertainment purposes only.' },
  sajuMyeongsik: { ko: '사주 명식', en: 'Birth Chart' },
  ohBalance: { ko: '오행 밸런스', en: 'Five Elements Balance' },
  resultSaved: { ko: '저장되었어!', en: 'Saved!' },
  savingStatus: { ko: '저장 중...', en: 'Saving...' },
  savedStatus: { ko: '결과가 저장되었습니다', en: 'Result saved successfully' },
  saveFailedStatus: { ko: '결과 저장에 실패했습니다', en: 'Failed to save result' },
  retryBtn: { ko: '다시 시도', en: 'Retry' },

  // Generating
  genStep0: { ko: '사주의 별을 읽고 있어요...', en: 'Reading the stars of your chart...' },
  genStep1: { ko: '오행의 기운을 분석하는 중...', en: 'Analyzing element energies...' },
  genStep2: { ko: '너만의 해석을 완성하는 중...', en: 'Completing your reading...' },
  genTime0: { ko: '약 30초~1분 소요', en: 'About 30s-1min' },
  genTime1: { ko: '거의 다 됐어...', en: 'Almost done...' },
  genTime2: { ko: '마무리 중...', en: 'Finishing up...' },
  preparing: { ko: '준비 중...', en: 'Preparing...' },
  analyzingChart: { ko: '사주 명식을 분석하는 중...', en: 'Analyzing birth chart...' },
  loadingResults: { ko: '결과를 불러오는 중...', en: 'Loading results...' },

  // Paywall
  unlock: { ko: '🔓 지금 잠금 해제하기', en: '🔓 Unlock Now' },
  freePreview: { ko: '무료로 먼저 볼게요', en: 'Preview for free' },
  todaySpecial: { ko: '(오늘 한정 특가)', en: '(Today only special)' },
  specialEnds: { ko: '특가 종료까지', en: 'Special ends in' },
  alreadyChecked: { ko: '명이 이미 확인했어요', en: 'people already checked' },
  analysisInProgress: { ko: '분석 진행 중...', en: 'Analysis in progress...' },
  analysisComplete: { ko: '분석 완료', en: 'Analysis complete' },
  unlockYearly: { ko: '🔓 2026 올해 운세 확인하기', en: '🔓 Unlock 2026 Fortune' },
  unlockAll: { ko: '🔓 지금 잠금 해제하기', en: '🔓 Unlock Now' },
  yearlyUnlockTitle: { ko: '2026 올해 운세 잠금 해제', en: 'Unlock 2026 Fortune' },
  allUnlockTitle: { ko: '전체 사주 해설 잠금 해제', en: 'Unlock Full Reading' },
  items6: { ko: '6개 항목 심층 분석', en: '6 Items Deep Analysis' },
  items30: { ko: '17개 항목 심층 분석', en: '17 Items Deep Analysis' },
  aiPreview: { ko: 'AI 사주 해설 미리보기', en: 'AI Reading Preview' },
  yearlyItems: { ko: '2026 운세 분석 항목 (6개)', en: '2026 Fortune Items (6)' },
  allItems: { ko: '전체 분석 항목 (17개)', en: 'Full Analysis Items (17)' },

  // Previous results
  prevResults: { ko: '📂 이전 결과 보기', en: '📂 Previous Results' },
  deleteAll: { ko: '🗑 전체 삭제', en: '🗑 Delete All' },

  // Saved profiles
  savedProfiles: { ko: '저장된 프로필', en: 'Saved Profiles' },

  // Compat
  compatAnalysis: { ko: '💑 궁합 분석', en: '💑 Compatibility Analysis' },
  person1: { ko: '🙋 첫 번째 사람', en: '🙋 Person 1' },
  person2: { ko: '🙋‍♂️ 상대방 정보 입력', en: '🙋‍♂️ Partner Info' },
  analyzeCompat: { ko: '궁합 분석하기', en: 'Analyze Compatibility' },
  compatReading: { ko: '두 사람의 인연을 읽고 있어요...', en: 'Reading your connection...' },
  compatTime: { ko: '약 20~30초 소요', en: 'About 20-30 seconds' },
  aiCompatAnalysis: { ko: 'AI 심층 궁합 분석', en: 'AI Compatibility Analysis' },
  compatUnlock: { ko: '🔓 궁합 분석 잠금 해제', en: '🔓 Unlock Compatibility' },
  compatSaveResult: { ko: '💾 궁합 결과 저장', en: '💾 Save Compatibility Result' },
  compatSaved: { ko: '궁합 결과가 저장되었어!', en: 'Compatibility result saved!' },
  aiCompatTitle: { ko: '📝 AI 궁합 분석', en: '📝 AI Compatibility' },

  // Pregnancy
  pregGuide: { ko: '🤰 임산부 사주 가이드', en: '🤰 Pregnancy Saju Guide' },
  pregSubtitle: { ko: '산모와 아기의 기운을 분석하고 맞춤 태교를 추천해줄게', en: 'Analyzing mom & baby energy harmony' },
  momName: { ko: '👩 산모 이름', en: '👩 Mother name' },
  momNamePlaceholder: { ko: '산모 이름을 입력해줘', en: 'Enter mother name' },
  momBirthday: { ko: '산모 생년월일', en: 'Mother date of birth' },
  dueDate: { ko: '📅 출산 예정일', en: '📅 Due date' },
  energyAnalysis: { ko: '🌸 기운 합 분석', en: '🌸 Energy Analysis' },
  dailyGuide: { ko: '🍀 오늘의 태교', en: "🍀 Today's Guide" },
  backToStart: { ko: '← 처음으로', en: '← Back' },
  momBabyScore: { ko: '산모-태아 기운 점수', en: 'Mom-Baby Energy Score' },
  momBabyOhTitle: { ko: '& 아기의 오행 기운', en: "& Baby's Five Elements" },
  momLabel: { ko: '👩 엄마', en: '👩 Mom' },
  babyLabel: { ko: '👶 아기', en: '👶 Baby' },
  readingMomBaby: { ko: '엄마와 아기의 인연을 읽고 있어...', en: 'Reading mom & baby connection...' },
  readingTime30: { ko: '약 30초 소요', en: 'About 30 seconds' },
  momBabyReading: { ko: '💕 엄마와 아기의 사주 궁합 해설', en: '💕 Mom & Baby Compatibility' },
  pregSaved: { ko: '임산부 궁합 결과가 저장되었어!', en: 'Pregnancy result saved!' },
  todayDate: { ko: '📅 오늘의 날짜', en: "📅 Today's Date" },

  // Yearly
  yearlyFortuneTitle: { ko: '2026 올해 운세', en: '2026 Fortune' },
  yearlyAnalyzing: { ko: '2026년 운세를 분석하고 있어요...', en: 'Analyzing 2026 fortune...' },
  yearlyTime: { ko: '약 30초~1분 소요', en: 'About 30s-1min' },
  yearlyLoading: { ko: '2026 운세를 분석하는 중...', en: 'Analyzing 2026 fortune...' },

  // AI error
  aiError: { ko: 'AI 연결에 실패했어. 잠시 후 다시 시도해줘!', en: 'AI connection failed. Please try again!' },
  compatAiError: { ko: 'AI 궁합 분석에 실패했어. 잠시 후 다시 시도해줘!', en: 'Compatibility analysis failed. Please try again!' },
  pregAiError: { ko: '분석에 실패했어. 다시 시도해줘!', en: 'Analysis failed. Please try again!' },

  // Language
  langToggle: { ko: 'EN', en: '한국어' },

  // Teaser personality
  teaserIdentity: { ko: '의 진짜 정체를 알고 있어?', en: "'s true identity revealed?" },
  teaserSajuAnalysis: { ko: '의 사주 분석', en: "'s Saju Analysis" },
  teaserYearly: { ko: '의 2026 올해 운세', en: "'s 2026 Fortune" },

  // Today visitor
  todayVisitor: { ko: '오늘', en: 'Today' },
  checkedToday: { ko: '이 확인했어요', en: 'checked today' },

  // Navigation & Common
  backBtn: { ko: '← 뒤로가기', en: '← Back' },
  anonymous: { ko: '익명', en: 'Anonymous' },
  unknown: { ko: '미상', en: 'Unknown' },
  analysisInProgressN: { ko: '분석 진행 중...', en: 'Analysis in progress...' },

  // Time units
  yearUnit: { ko: '년', en: '' },
  monthUnit: { ko: '월', en: '' },
  dayUnit: { ko: '일', en: '' },
  hourUnit: { ko: '시', en: 'h' },
  minuteUnit: { ko: '분', en: 'm' },

  // Siju time names
  sijaTime: { ko: '(자시)', en: '(Ja)' },
  chukTime: { ko: '(축시)', en: '(Chuk)' },
  inTime: { ko: '(인시)', en: '(In)' },
  myoTime: { ko: '(묘시)', en: '(Myo)' },
  jinTime: { ko: '(진시)', en: '(Jin)' },
  saTime: { ko: '(사시)', en: '(Sa)' },
  oTime: { ko: '(오시)', en: '(O)' },
  miTime: { ko: '(미시)', en: '(Mi)' },
  sinTime: { ko: '(신시)', en: '(Sin)' },
  yuTime: { ko: '(유시)', en: '(Yu)' },
  sulTime: { ko: '(술시)', en: '(Sul)' },
  haeTime: { ko: '(해시)', en: '(Hae)' },

  // Exact time
  knowExactTime: { ko: '정확한 출생시간을 알고 있어요', en: 'I know the exact birth time' },
  exactTimeNote: { ko: '출생시간이 정확할수록 더 정밀한 사주 풀이가 가능해요', en: 'The more precise the birth time, the more accurate the reading' },

  // Calendar
  calendarLabel: { ko: '달력', en: 'Calendar' },
  solarCal: { ko: '양력', en: 'Solar' },
  lunarCal: { ko: '음력', en: 'Lunar' },
  birthTimeLabel: { ko: '태어난 시간', en: 'Birth Time' },
  dontKnowTime: { ko: '잘 모르겠어', en: "I don't know" },

  // Profile
  profileSelect: { ko: '프로필 선택...', en: 'Select profile...' },
  loadProfileSaved: { ko: '📂 저장된 프로필 불러오기', en: '📂 Load saved profile' },

  // Compat relationship types
  relDating: { ko: '💕 연애 중', en: '💕 Dating' },
  relMarried: { ko: '💍 혼인 관계', en: '💍 Married' },
  relFriends: { ko: '👫 우정 관계', en: '👫 Friends' },
  relColleagues: { ko: '💼 동료 사이', en: '💼 Colleagues' },
  relBreakup: { ko: '💔 재회/이별', en: '💔 Breakup/Reunion' },
  relCrush: { ko: '💕 짝사랑/썸', en: '💕 Crush/Talking' },
  relTypeTitle: { ko: '💫 두 사람의 관계는?', en: '💫 Relationship Type' },

  // Compat paywall
  compatPayQ0: { ko: '이 사람과 진짜 맞을까?', en: 'Are we really compatible?' },
  compatPayQ1: { ko: '결혼 후 우리 모습은?', en: 'What will our marriage look like?' },
  compatPayQ2: { ko: '이 친구와 오래갈 수 있을까?', en: 'Will this friendship last?' },
  compatPayQ3: { ko: '직장에서 이 사람과 잘 맞을까?', en: 'Compatible at work?' },
  compatPayQ4: { ko: '다시 만날 운명일까?', en: 'Destined to meet again?' },
  compatPayQ5: { ko: '이 설렘, 연애로 발전할까?', en: 'Will this spark become love?' },
  star5: { ko: '⭐ 별 5개', en: '⭐ 5 Stars' },
  currentStars: { ko: '현재 보유', en: 'Current balance' },
  star5Unlock: { ko: '⭐ 별 5개로 궁합 열어보기', en: '⭐ Unlock with 5 Stars' },
  notEnoughStars: { ko: '별이 부족해요!', en: 'Not enough stars!' },
  goCharge: { ko: '⭐ 별빛충전하러 가기', en: '⭐ Go charge stars' },

  // Compat tiers
  tierSoulmate: { ko: '천생연분', en: 'Soulmates' },
  tierSoulmateDesc: { ko: '전생에 무슨 인연이길래...!', en: 'A bond from a past life!' },
  tierMarriage: { ko: '결혼궁합', en: 'Marriage Match' },
  tierMarriageDesc: { ko: '부모님한테 인사시켜도 OK', en: 'Ready to meet the parents' },
  tierGood: { ko: '좋은 궁합', en: 'Good Match' },
  tierGoodDesc: { ko: '노력하면 오래갈 수 있어', en: 'Can last with effort' },
  tierGrowth: { ko: '성장형 궁합', en: 'Growth Match' },
  tierGrowthDesc: { ko: '함께 맞춰가면 단단해져', en: 'Growing stronger together' },
  tierChallenge: { ko: '도전형 궁합', en: 'Challenge Match' },
  tierChallengeDesc: { ko: '다른 만큼 배울 게 많아', en: 'Much to learn from differences' },
  tierHere: { ko: '← 여기!', en: '← Here!' },

  // Compat analysis
  hapFound: { ko: '천간합 발견! 하늘이 정해준 인연이야. 이거 나올 확률 10%도 안 돼!', en: 'Heavenly Stem match found! A destined connection - less than 10% chance!' },
  ilganRel: { ko: '🔮 두 사람의 일간 관계', en: '🔮 Day Master Relationship' },
  ohCompare: { ko: '⚖️ 오행 에너지 비교', en: '⚖️ Five Elements Comparison' },
  yongsinCompat: { ko: '✨ 용신 궁합', en: '✨ Yongsin Compatibility' },
  singang: { ko: '신강', en: 'Strong' },
  sinyak: { ko: '신약', en: 'Weak' },

  // Compat element relationships
  bihwa: { ko: '비화(比和)', en: 'Harmony' },
  saeng: { ko: '생(生)', en: 'Nurture' },
  geuk: { ko: '극(剋)', en: 'Control' },
  cheonganHap: { ko: '천간합(天干合)', en: 'Heavenly Match' },
  bihwaDesc: { ko: '같은 오행! 서로를 거울처럼 비추는 관계', en: 'Same element! A mirror-like relationship' },
  cheonganHapDesc: { ko: '하늘이 맺어준 인연! 자석처럼 끌리는 최고의 조합', en: 'A match made in heaven! The ultimate magnetic attraction' },

  // Yearly fortune
  yearlyFortuneOf: { ko: '의 2026 올해 운세', en: "'s 2026 Fortune" },
  yearlyBadge: { ko: '2026 병오년(丙午年) - 화(火)의 해', en: '2026 Year of the Fire Horse (丙午)' },
  yearlyAnalyzingMsg: { ko: '2026 운세를 분석하는 중...', en: 'Analyzing 2026 fortune...' },
  sajuAnalysisOf: { ko: '의 사주 분석', en: "'s Saju Analysis" },

  // Teaser / paywall
  teaserPreviewYearly: { ko: '올해 운세 미리보기', en: 'Fortune Preview' },
  teaserPreviewSaju: { ko: '너의 사주가 말하는 것들', en: 'What your Saju reveals' },
  star10: { ko: '⭐ 별 10개', en: '⭐ 10 Stars' },
  star10UnlockYearly: { ko: '⭐ 별 10개로 2026 운세 열어보기', en: '⭐ Unlock 2026 Fortune with 10 Stars' },
  star10UnlockSaju: { ko: '⭐ 별 10개로 나의 사주 열어보기', en: '⭐ Unlock My Saju with 10 Stars' },
  notEnoughStarsMsg: { ko: '별이 부족해요', en: 'Not enough stars' },
  notEnoughStarsDesc: { ko: '별이 부족해요 — 충전하고 나의 사주 열어보기', en: 'Not enough stars — charge and unlock your reading' },
  paywallMsgYearly: { ko: '나의 올해 운세가 말해주는 이야기,\n계속 읽어볼래?', en: 'Want to continue reading\nwhat your 2026 fortune reveals?' },
  paywallMsgSaju: { ko: '나의 사주가 말해주는 이야기,\n계속 읽어볼래?', en: 'Want to continue reading\nwhat your Saju reveals?' },
  currentMonthNote: { ko: `현재 시점(${new Date().getMonth() + 1}월~) 기준 남은 운세를 중점 분석해드려요`, en: 'Focused analysis on remaining months from current date' },

  // Spoiler teaser
  spoilerIdentity: { ko: '의 진짜 정체', en: "'s True Identity" },
  spoilerMoney: { ko: '의 재물 구조', en: "'s Wealth Structure" },
  spoilerLove: { ko: '의 연애 패턴', en: "'s Love Pattern" },

  // Star charging
  starShopTitle: { ko: '별빛 충전소', en: 'Star Shop' },
  starShopSubtitle: { ko: '사주의 비밀을 열어볼 준비가 됐나요?', en: 'Ready to unlock the secrets of your Saju?' },
  currentStarsLabel: { ko: '현재 보유 별', en: 'Current Stars' },
  chargeBtn: { ko: '충전하기', en: 'Charge' },
  starPrice: { ko: '별 1개 = 100원', en: '1 Star = $0.10' },
  chargeLabelLight: { ko: '라이트', en: 'Light' },
  chargeLabelBasic: { ko: '베이직', en: 'Basic' },
  chargeLabelPopular: { ko: '인기', en: 'Popular' },
  chargeLabelPremium: { ko: '프리미엄', en: 'Premium' },
  chargeDescSaju1: { ko: '사주 1회', en: '1 Saju reading' },
  chargeDescCompat6: { ko: '궁합 6회', en: '6 Compatibility' },
  chargeDescPopular: { ko: '가장 인기!', en: 'Most popular!' },
  chargeDescBestValue: { ko: '최고 가성비!', en: 'Best value!' },
  starChargeNav: { ko: '별빛충전', en: 'Stars' },
  testModeAlert: { ko: '테스트 모드: 실제 결제는 연결되어 있지 않습니다.', en: 'Test mode: No real payment connected.' },
  testStarsCharged: { ko: '개가 테스트로 충전됩니다!', en: ' stars charged for testing!' },
  testVersionNotice: { ko: '테스트 버전 - 실제 결제 없이 별이 충전됩니다', en: 'Test version - Stars charged without real payment' },
  refundNotice: { ko: '충전 후 환불은 고객센터로 문의해주세요', en: 'Contact support for refunds after purchase' },

  // Pregnancy
  pregTierExcellent: { ko: '최고의 조화', en: 'Perfect Harmony' },
  pregTierGood: { ko: '좋은 조화', en: 'Good Harmony' },
  pregTierNormal: { ko: '보통', en: 'Average' },
  pregTierEffort: { ko: '노력 필요', en: 'Needs Effort' },
  momBabyOhEnergy: { ko: '& 아기의 오행 기운', en: "& Baby's Five Elements" },
  momLabel2: { ko: '👩 엄마', en: '👩 Mom' },
  babyLabel2: { ko: '👶 아기', en: '👶 Baby' },

  // Result pillar labels
  pillarYear: { ko: '년주', en: 'Year' },
  pillarMonth: { ko: '월주', en: 'Month' },
  pillarDay: { ko: '일주', en: 'Day' },
  pillarHour: { ko: '시주', en: 'Hour' },
  stemLabel: { ko: '천간', en: 'Stem' },
  branchLabel: { ko: '지지', en: 'Branch' },
  dayMasterLabel: { ko: '일간(Day Master)', en: 'Day Master' },

  // Generating status
  genAnalyzing: { ko: '사주 명식을 분석하는 중...', en: 'Analyzing birth chart...' },
  genOf: { ko: '/', en: '/' },

  // Free preview link
  freePreviewLink: { ko: '무료로 먼저 볼게요', en: 'Preview for free' },

  // Section titles for teaser (saju)
  secTitle1: { ko: '너는 이런 사람이야', en: 'This is who you are' },
  secTitle2: { ko: '타고난 성격 & 멘탈 체력', en: 'Innate Personality & Mental Strength' },
  secTitle3: { ko: '돈과 나의 관계', en: 'My Relationship with Money' },
  secTitle4: { ko: '천직 & 커리어 로드맵', en: 'Career Calling & Roadmap' },
  secTitle5: { ko: '연애 & 인연의 지도', en: 'Love & Destiny Map' },
  secTitle6: { ko: '나에게 좋은 사람 & 주의할 사람', en: 'Good People & People to Avoid' },
  secTitle7: { ko: '건강 리포트', en: 'Health Report' },
  secTitle8: { ko: '가정 & 가족관계', en: 'Family & Relationships' },
  secTitle9: { ko: '자녀운 & 부모 스타일', en: 'Children & Parenting Style' },
  secTitle10: { ko: '지금 나의 인생 챕터', en: 'My Current Life Chapter' },
  secTitle11: { ko: '2027년 미리보기', en: '2027 Preview' },
  secTitle12: { ko: '향후 10년 미래 시나리오', en: '10-Year Future Scenario' },
  secTitle13: { ko: '결혼 최적 타이밍', en: 'Best Marriage Timing' },
  secTitle14: { ko: '내 집 마련 & 부동산', en: 'Home & Real Estate' },
  secTitle15: { ko: '행운 루틴 & 개운법', en: 'Lucky Routines & Fortune Tips' },
  secTitle16: { ko: '인생에서 가장 빛나는 나이', en: 'The Brightest Age of Your Life' },
  secTitle17: { ko: '나에게 보내는 편지', en: 'A Letter to Myself' },

  // Section hints for teaser (saju)
  secHint1: { ko: '격국·용신·오행으로 보는 진짜 나...', en: 'Your true self through elements...' },
  secHint2: { ko: '십성과 12운성으로 내면 분석...', en: 'Inner analysis through 10 gods...' },
  secHint3: { ko: '재물 구조와 투자 체질...', en: 'Wealth structure & investment type...' },
  secHint4: { ko: '딱 맞는 분야 TOP 5 & 안 맞는 직업...', en: 'Top 5 career matches & mismatches...' },
  secHint5: { ko: '배우자궁으로 보는 인연의 지도...', en: 'Your destiny map through spouse palace...' },
  secHint6: { ko: '귀인·좋은 사람·피할 사람 총정리...', en: 'Noble helpers & people to avoid...' },
  secHint7: { ko: '오행 균형으로 보는 건강 레이더...', en: 'Health radar through five elements...' },
  secHint8: { ko: '년주~시주로 보는 가족 관계...', en: 'Family through four pillars...' },
  secHint9: { ko: '시주로 보는 자녀복과 부모 스타일...', en: 'Children fortune & parenting style...' },
  secHint10: { ko: '현재 대운이 말하는 인생 챕터...', en: 'What your current luck cycle says...' },
  secHint11: { ko: '정미년이 내 사주와 어떻게 작용할까...', en: 'How 2027 interacts with your chart...' },
  secHint12: { ko: '10년간 어려움·위기·기회 시나리오...', en: '10-year challenges & opportunities...' },
  secHint13: { ko: '배우자성이 활성화되는 시기...', en: 'When spouse star activates...' },
  secHint14: { ko: '부동산 시기와 방위 분석...', en: 'Real estate timing & directions...' },
  secHint15: { ko: '용신 기반 매일 행운 습관...', en: 'Daily lucky habits based on yongsin...' },
  secHint16: { ko: '대운 흐름으로 보는 인생 하이라이트...', en: 'Life highlights through luck cycles...' },
  secHint17: { ko: '사주가 전하는 따뜻한 편지...', en: 'A warm letter from your Saju...' },

  // Section titles for yearly teaser
  yrSecTitle1: { ko: '2026 병오년, 내 인생에서 어떤 해인가?', en: 'What does 2026 mean for my life?' },
  yrSecTitle2: { ko: '2026 월별 상세 운세', en: '2026 Monthly Fortune' },
  yrSecTitle3: { ko: '2026년 총평', en: '2026 Summary' },
  yrSecTitle4: { ko: '올해의 핵심 미션', en: 'Core Mission of the Year' },
  yrSecTitle5: { ko: '올해 월별 TO-DO', en: 'Monthly TO-DO' },
  yrSecTitle6: { ko: '올해 꼭 조심할 3가지', en: '3 Things to Watch Out For' },
  yrSecTitle7: { ko: '올해 나의 행운 아이템', en: 'My Lucky Items This Year' },
  yrSecHint1: { ko: '대운·세운·삼재로 보는 올해 큰 그림...', en: 'The big picture through luck cycles...' },
  yrSecHint2: { ko: '월별 운세를 이야기체로 상세 분석...', en: 'Detailed monthly fortune narrative...' },
  yrSecHint3: { ko: '올해 전체를 관통하는 핵심 키워드...', en: 'Key themes running through the year...' },
  yrSecHint4: { ko: '병오년이 주는 핵심 미션과 성장 과제...', en: 'Core growth mission from 2026...' },
  yrSecHint5: { ko: '월별 꼭 해야 할 구체적 행동...', en: 'Specific monthly action items...' },
  yrSecHint6: { ko: '사주 근거로 보는 올해 주의사항...', en: 'Saju-based cautions for the year...' },
  yrSecHint7: { ko: '행운의 색/숫자/방향/아이템/습관...', en: 'Lucky colors/numbers/directions/items...' },

  // Pillar display
  born: { ko: '생', en: 'Born' },

  // Time picker hangul
  timeJa: { ko: '(자시)', en: '(Ja)' },
  timeChuk: { ko: '(축시)', en: '(Chuk)' },
  timeIn: { ko: '(인시)', en: '(In)' },
  timeMyo: { ko: '(묘시)', en: '(Myo)' },
  timeJin: { ko: '(진시)', en: '(Jin)' },
  timeSa: { ko: '(사시)', en: '(Sa)' },
  timeO: { ko: '(오시)', en: '(O)' },
  timeMi: { ko: '(미시)', en: '(Mi)' },
  timeSin: { ko: '(신시)', en: '(Sin)' },
  timeYu: { ko: '(유시)', en: '(Yu)' },
  timeSul: { ko: '(술시)', en: '(Sul)' },
  timeHae: { ko: '(해시)', en: '(Hae)' },

  // Result screen labels
  dayMasterBracket: { ko: '[일간]', en: '[Day Master]' },
  sipsungLabel: { ko: '십성', en: '10 Gods' },
  unsungLabel: { ko: '12운성', en: '12 Stages' },
  shinsalTitle: { ko: '신살 / 귀인', en: 'Shinsal / Noble Stars' },
  lifeEnergyFlow: { ko: '인생 에너지 흐름', en: 'Life Energy Flow' },
  sajuConstitution: { ko: '사주 체질 분석', en: 'Saju Constitution Analysis' },

  // Energy points
  ancestorLabel: { ko: '(조상)', en: '(Ancestor)' },
  parentLabel: { ko: '(부모)', en: '(Parents)' },
  selfLabel: { ko: '(나)', en: '(Self)' },
  lateYearsLabel: { ko: '(말년)', en: '(Later years)' },

  // Pillar names for energy
  pillarYearAncestor: { ko: '년주 (조상/어린시절)', en: 'Year (Ancestor/Childhood)' },
  pillarMonthParent: { ko: '월주 (부모/사회)', en: 'Month (Parents/Society)' },
  pillarDaySelf: { ko: '일주 (나 자신)', en: 'Day (Myself)' },
  pillarHourChild: { ko: '시주 (자녀/말년)', en: 'Hour (Children/Later years)' },

  // Energy descriptions
  myEnergy: { ko: '나의 에너지:', en: 'My Energy:' },
  energyHighPoint: { ko: '에너지 최고점', en: 'Energy Peak' },
  energyLowPoint: { ko: '에너지 최저점', en: 'Energy Low' },
  periodEnergyDesc: { ko: '각 시기별 에너지 해설', en: 'Energy Analysis by Period' },
  birthTimeNotEntered: { ko: '출생시간 미입력', en: 'Birth time not entered' },

  // Stage descriptions
  stage_jangsaeng_name: { ko: '탄생의 에너지', en: 'Birth Energy' },
  stage_jangsaeng_analogy: { ko: '갓 태어난 아기처럼', en: 'Like a newborn baby' },
  stage_jangsaeng_desc: { ko: '새로운 시작의 에너지가 넘쳐! 배움에 열정적이고 어디서든 인정받는 타입이야. 호기심이 왕성하고 성장 잠재력이 최고야.', en: 'Overflowing with energy for new beginnings! Passionate about learning and recognized everywhere. Curiosity is strong and growth potential is at its peak.' },
  stage_mokyok_name: { ko: '사춘기 에너지', en: 'Adolescent Energy' },
  stage_mokyok_analogy: { ko: '질풍노도의 10대처럼', en: 'Like a turbulent teenager' },
  stage_mokyok_desc: { ko: '감성이 풍부하고 매력이 넘쳐! 변화가 잦지만 그만큼 다양한 경험을 쌓는 시기야. 이성에게 인기 폭발, 다만 마음이 흔들리기 쉬워.', en: 'Rich in emotion and charm! Frequent changes but plenty of diverse experiences. Very popular, though the heart wavers easily.' },
  stage_gwandae_name: { ko: '도전의 에너지', en: 'Challenge Energy' },
  stage_gwandae_analogy: { ko: '사회에 첫발을 내딛는 20대처럼', en: 'Like stepping into the world in your 20s' },
  stage_gwandae_desc: { ko: '야망이 크고 활동적이야! 자존심이 강하고 무언가를 이루고 싶은 욕구가 가득해. 이때 시작한 일이 인생의 방향을 정해.', en: 'Ambitious and active! Strong pride and desire to achieve. What you start now shapes life direction.' },
  stage_geonrok_name: { ko: '전성기 에너지', en: 'Prime Energy' },
  stage_geonrok_analogy: { ko: '커리어 최전성기의 30대처럼', en: 'Like being in your career prime in your 30s' },
  stage_geonrok_desc: { ko: '에너지 최고조! 독립적이고 자수성가 기질이 있어. 뭘 해도 잘 되는 시기지. 스스로의 힘으로 세상을 만들어가는 구간이야.', en: 'Energy at its peak! Independent and self-made. Everything works out. Building the world with your own power.' },
  stage_jewang_name: { ko: '정점의 에너지', en: 'Peak Energy' },
  stage_jewang_analogy: { ko: 'CEO가 된 것처럼 정상에 선 순간', en: 'Like standing at the top as a CEO' },
  stage_jewang_desc: { ko: '최고의 카리스마와 파워! 하지만 롤러코스터 정상에서는 내려가는 일만 남아있잖아? 이 에너지를 가진 사람은 욕심을 조금 내려놓으면 오래 빛나.', en: 'Maximum charisma and power! But at the top of a roller coaster, there is only the way down. Let go of greed a little and you shine longer.' },
  stage_soe_name: { ko: '원숙의 에너지', en: 'Maturity Energy' },
  stage_soe_analogy: { ko: '경험 많은 시니어 전문가처럼', en: 'Like an experienced senior expert' },
  stage_soe_desc: { ko: '열정은 줄었지만 깊이가 생겼어. 경험에서 오는 지혜로 주변을 이끄는 타입이야. 안정을 추구하고 판단력이 뛰어나.', en: 'Passion has faded but depth has grown. Leading others with wisdom from experience. Seeking stability with excellent judgment.' },
  stage_byeong_name: { ko: '내면 성장 에너지', en: 'Inner Growth Energy' },
  stage_byeong_analogy: { ko: '잠시 멈추고 자신을 돌아보는 시간', en: 'A time to pause and reflect' },
  stage_byeong_desc: { ko: '겉으로는 조용해 보여도 내면이 깊어지는 구간이야. 정신적으로 성숙해지고 있어. 철학적 사고가 깊어지고 진짜 중요한 게 뭔지 알게 되는 시기.', en: 'Quiet on the outside but deepening within. Growing mentally mature. Philosophical thinking deepens and you discover what truly matters.' },
  stage_sa_name: { ko: '전환점 에너지', en: 'Turning Point Energy' },
  stage_sa_analogy: { ko: '시즌 1이 끝나고 시즌 2가 시작되기 전', en: 'Between Season 1 ending and Season 2 beginning' },
  stage_sa_desc: { ko: '큰 변화의 전조야! 익숙한 것들이 끝나고 완전히 새로운 챕터가 준비되고 있어. 힘들어 보이지만 이건 더 좋은 미래를 위한 리셋이야.', en: 'A sign of big change! Familiar things end and a new chapter is being prepared. It looks hard but it is a reset for a better future.' },
  stage_myo_name: { ko: '축적의 에너지', en: 'Accumulation Energy' },
  stage_myo_analogy: { ko: '금고에 보물을 차곡차곡 모으는 것처럼', en: 'Like stacking treasures in a vault' },
  stage_myo_desc: { ko: '겉으로 드러나지 않지만 안에서 재물과 지혜를 쌓고 있어. 부동산운이 좋고 비밀스럽게 성장하는 타입. 때가 되면 한번에 빛나!', en: 'Not visible outside but accumulating wealth and wisdom inside. Good real estate luck and growing secretly. When the time comes, you shine all at once!' },
  stage_jeol_name: { ko: '리셋 에너지', en: 'Reset Energy' },
  stage_jeol_analogy: { ko: '게임을 새로 시작하는 것처럼', en: 'Like starting a new game' },
  stage_jeol_desc: { ko: '모든 것이 초기화되는 순간이야. 하지만 그래서 어디든 갈 수 있는 자유가 있어! 직관력과 영적 감각이 뛰어나고 창의적인 아이디어가 번뜩여.', en: 'Everything resets. But that means freedom to go anywhere! Strong intuition and spiritual sense with sparkling creative ideas.' },
  stage_tae_name: { ko: '잉태의 에너지', en: 'Conception Energy' },
  stage_tae_analogy: { ko: '엄마 뱃속에서 준비하는 것처럼', en: 'Like preparing in the womb' },
  stage_tae_desc: { ko: '아직 세상에 나오진 않았지만 가능성의 씨앗이 심어진 상태야. 아이디어가 풍부하고 상상력이 뛰어나. 조용히 준비하는 시간이 곧 결실이 돼.', en: 'Not yet born into the world but seeds of possibility are planted. Rich in ideas and imagination. Quiet preparation soon bears fruit.' },
  stage_yang_name: { ko: '준비의 에너지', en: 'Preparation Energy' },
  stage_yang_analogy: { ko: '세상에 나오기 직전, 마지막 성장 중', en: 'Final growth just before entering the world' },
  stage_yang_desc: { ko: '인내하며 준비하는 단계야. 아직은 조용하지만 곧 "장생"의 폭발적 에너지가 올 거야! 이 시기를 잘 보내면 다음 단계에서 대박나.', en: 'A stage of patient preparation. Still quiet but the explosive energy of rebirth is coming soon! Handle this period well and the next stage will be amazing.' },

  // Shinsal badges
  shinsal_cheonEul: { ko: '천을귀인', en: 'Noble Star' },
  shinsal_munChang: { ko: '문창귀인', en: 'Literary Star' },
  shinsal_jangSeong: { ko: '장성살', en: 'General Star' },

  // Singang/Sinyak panel
  singangSinyak: { ko: '신강/신약 체질', en: 'Strong/Weak Constitution' },
  singangFull: { ko: '신강 (身强)', en: 'Strong (身强)' },
  sinyakFull: { ko: '신약 (身弱)', en: 'Weak (身弱)' },
  weakStrong: { ko: '약 ← → 강', en: 'Weak ← → Strong' },
  deukryungLabel: { ko: '득령', en: 'Season' },
  tonggeunLabel: { ko: '통근', en: 'Roots' },
  bigyupLabel: { ko: '비겁', en: 'Peers' },
  countUnit: { ko: '개', en: '' },
  singangDesc: { ko: '일간의 힘이 강한 사주야. 에너지가 넘치고 자기주장이 뚜렷해서 독립적이고 추진력이 있어. 다만 너무 강하면 고집이 될 수 있으니 유연함이 필요해!', en: 'A strong day master chart. Overflowing energy with clear self-assertion, independence and drive. Too much strength can become stubbornness, so flexibility is needed!' },
  sinyakDesc: { ko: '일간의 힘이 부드러운 사주야. 섬세하고 주변의 도움에 감사할 줄 알아. 협력 속에서 빛나는 타입이야. 용신 기운을 잘 채우면 큰 힘을 발휘할 수 있어!', en: 'A gentle day master chart. Delicate and grateful for help. A type that shines through cooperation. Fill your yongsin energy well and you can unleash great power!' },
  yongsinLabel: { ko: '용신 (가장 필요한 기운)', en: 'Yongsin (Most needed energy)' },
  gisinLabel: { ko: '기신 (주의할 기운)', en: 'Gisin (Energy to watch)' },
  johuYongsin: { ko: '조후용신 (계절 균형)', en: 'Seasonal Yongsin (balance)' },
  gisinWarning: { ko: '이 기운이 강해지는 해 조심', en: 'Be careful in years this energy strengthens' },
  heesinLabel: { ko: '희신: ', en: 'Heesin: ' },
  heesinDesc: { ko: ' (용신을 도와줌)', en: ' (Supports yongsin)' },
  gusinLabel: { ko: '구신: ', en: 'Gusin: ' },
  gusinDesc: { ko: ' (기신을 키워줌)', en: ' (Feeds gisin)' },
  tongguanLabel: { ko: '통관용신: ', en: 'Tongguan Yongsin: ' },

  // Tongguan notes
  tongguan_wood_earth: { ko: '목과 토의 충돌이 있어 화(火)가 다리 역할을 해줘', en: 'Wood-Earth clash: Fire acts as a bridge' },
  tongguan_earth_water: { ko: '토와 수의 충돌이 있어 금(金)이 다리 역할을 해줘', en: 'Earth-Water clash: Metal acts as a bridge' },
  tongguan_water_fire: { ko: '수와 화의 충돌이 있어 목(木)이 다리 역할을 해줘', en: 'Water-Fire clash: Wood acts as a bridge' },
  tongguan_fire_metal: { ko: '화와 금의 충돌이 있어 토(土)가 다리 역할을 해줘', en: 'Fire-Metal clash: Earth acts as a bridge' },
  tongguan_metal_wood: { ko: '금과 목의 충돌이 있어 수(水)가 다리 역할을 해줘', en: 'Metal-Wood clash: Water acts as a bridge' },

  // Johu season descriptions
  johu_winter: { ko: '차가운 사주 → 따뜻함(화)이 필수. 불씨 없는 겨울 나무는 얼어버려.', en: 'Cold chart → Warmth (Fire) is essential. A winter tree without a spark will freeze.' },
  johu_summer: { ko: '뜨거운 사주 → 시원함(수)이 필수. 타오르는 불에 물을 줘야 생존.', en: 'Hot chart → Coolness (Water) is essential. Pour water on a blazing fire to survive.' },
  johu_spring: { ko: '성장하는 사주 → 적절한 제어가 필요. 봄에 비료를 줘야 열매를 맺어.', en: 'Growing chart → Proper control needed. Fertilize in spring to bear fruit.' },
  johu_autumn: { ko: '수확하는 사주 → 결실을 맺는 기운이 필요. 단풍이 물들듯 완성의 에너지.', en: 'Harvesting chart → Energy for fruition needed. Like autumn leaves coloring, energy of completion.' },

  // Johu panel
  johuTitle: { ko: '조후 (사주의 온도 균형)', en: 'Johu (Chart Temperature Balance)' },
  bornInSeason: { ko: '태생', en: 'born' },
  johuYongsinLabel: { ko: '조후용신: ', en: 'Johu Yongsin: ' },
  eokbuDiff: { ko: '과 다름 → 두 기운 모두 챙기면 최고!', en: ' differs → nurture both energies for the best!' },
  eokbuMatch: { ko: ' = 억부용신과 일치! 이 기운이 들어오면 모든 게 좋아져', en: ' = Matches Eokbu Yongsin! Everything improves when this energy arrives' },

  // Gaewun TIP
  gaewunTip: { ko: '개운 TIP: ', en: 'Fortune TIP: ' },
  gaewun_fire: { ko: '빨강/보라 계열 옷, 남쪽 방향, 매운 음식, 캔들/조명', en: 'Red/purple clothing, south direction, spicy food, candles/lighting' },
  gaewun_water: { ko: '검정/파랑 계열 옷, 북쪽 방향, 짠 음식, 수영/반신욕', en: 'Black/blue clothing, north direction, salty food, swimming/baths' },
  gaewun_wood: { ko: '초록 계열 옷, 동쪽 방향, 신맛 음식, 산책/등산', en: 'Green clothing, east direction, sour food, walks/hiking' },
  gaewun_metal: { ko: '흰색/은색 계열 옷, 서쪽 방향, 흰살 생선, 명상', en: 'White/silver clothing, west direction, white fish, meditation' },
  gaewun_earth: { ko: '노랑/베이지 계열 옷, 중앙, 달콤한 음식, 정리정돈', en: 'Yellow/beige clothing, center, sweet food, organizing' },

  // Generating progress
  genStep0Msg: { ko: '사주의 별을 읽고 있어요... ✨', en: 'Reading the stars of your chart... ✨' },
  genStep1Msg: { ko: '오행의 기운을 분석하는 중... 🌊', en: 'Analyzing element energies... 🌊' },
  genStep2Msg: { ko: '너만의 해석을 완성하는 중... 💫', en: 'Completing your reading... 💫' },

  // Yearly fortune screen
  yearlyBadgeLabel: { ko: '2026 병오년(丙午年) - 화(火)의 해', en: '2026 Year of the Fire Horse (丙午)' },

  // Yearly pillar labels
  yearlyPillarHour: { ko: '시주', en: 'Hour' },
  yearlyPillarDay: { ko: '일주', en: 'Day' },
  yearlyPillarMonth: { ko: '월주', en: 'Month' },
  yearlyPillarYear: { ko: '년주', en: 'Year' },

  // Teaser section divider
  teaserFortune: { ko: '올해 운세 미리보기', en: 'Fortune Preview' },
  teaserSaju: { ko: '너의 사주가 말하는 것들', en: 'What Your Saju Reveals' },

  // Spoiler cards - saju
  spoilerGyeokguk: { ko: '일간(short)의 격국은 ', en: ' Day Master (short) gyeokguk is ' },
  spoilerGyeokgukBlur: { ko: '이 구조가 가진 특별한 의미와 숨겨진 잠재력...', en: 'The special meaning and hidden potential of this structure...' },
  spoilerWealth: { ko: '재물운의 비밀: 너의 돈은 ', en: 'Wealth secret: Your money is ' },
  spoilerWealthBlur: { ko: '그런데 여기서 반전이 하나 있어...', en: 'But there is a twist here...' },
  spoilerWealthHint_jackpot: { ko: '한방형', en: 'Jackpot type' },
  spoilerWealthHint_salary: { ko: '월급형', en: 'Salary type' },
  spoilerWealthHint_selfmade: { ko: '자수성가형', en: 'Self-made type' },
  spoilerLoveVisible: { ko: '네가 만날 사람의 힌트: ', en: 'Hint about who you will meet: ' },
  spoilerLoveBlur: { ko: '이 글자가 말해주는 인연의 비밀은...', en: 'The secret of destiny this character reveals...' },
  spoilerKeyMonth: { ko: '2026년 가장 중요한 달: ', en: 'Most important month of 2026: ' },
  spoilerKeyMonthBlur: { ko: '이 달에 일어날 변화는...', en: 'The changes that will happen this month...' },
  monthUnit2: { ko: '월', en: '' },

  // Spoiler cards - yearly
  spoilerThisMonth: { ko: '이번 달(M월) 핵심 키워드: ', en: 'This month (M) key theme: ' },
  spoilerThisMonthBlur: { ko: '이 키워드가 의미하는 것은...', en: 'What this keyword means...' },
  spoilerCaution: { ko: '올해 가장 조심할 시기: ', en: 'Most cautious period this year: ' },
  spoilerCautionBlur: { ko: '그 이유는 너의 사주와 연관이...', en: 'The reason is connected to your Saju...' },
  spoilerOpportunity: { ko: '올해 최고의 기회: ', en: 'Best opportunity this year: ' },
  spoilerOpportunityIn: { ko: '에 찾아오는 ', en: ' brings ' },
  spoilerOpportunityBlur: { ko: '이 기회를 잡으려면...', en: 'To seize this opportunity...' },
  quarter1: { ko: '1분기', en: 'Q1' },
  quarter2: { ko: '2분기', en: 'Q2' },
  quarter3: { ko: '3분기', en: 'Q3' },
  quarter4: { ko: '4분기', en: 'Q4' },
  secondHalf: { ko: '하반기', en: '2nd half' },

  // Spoiler gyeokguk hints
  hint_pyunjae: { ko: '편재격', en: 'Wealth Star' },
  hint_junggwan: { ko: '정관격', en: 'Authority Star' },
  hint_jeongjae: { ko: '정재격', en: 'Fortune Star' },
  hint_siksang: { ko: '식상격', en: 'Creative Star' },
  hint_bigyup: { ko: '비겁격', en: 'Independence Star' },

  // Current month note
  currentMonthNoteLabel: { ko: `현재 시점(${new Date().getMonth() + 1}월~) 기준 남은 운세를 중점 분석해드려요`, en: 'Focused analysis on remaining months from current date' },

  // Compat paywall star balance
  starUnit: { ko: '개', en: '' },

  // Compat score
  scoreUnit: { ko: '점', en: 'pts' },

  // Compat load profile
  loadProfileLabel: { ko: '📂 저장된 프로필 불러오기', en: '📂 Load saved profile' },
  profileSelectPlaceholder: { ko: '프로필 선택...', en: 'Select profile...' },

  // Pregnancy results
  pregMomBabyScore: { ko: '산모-태아 기운 점수', en: 'Mom-Baby Energy Score' },
  pregMomBabyOh: { ko: '& 아기의 오행 기운', en: "& Baby's Five Elements" },
  pregMomLabel: { ko: '👩 엄마', en: '👩 Mom' },
  pregBabyLabel: { ko: '👶 아기', en: '👶 Baby' },
  pregSaveResult: { ko: '💾 결과 저장', en: '💾 Save Result' },

  // Daily guide
  dailyTodayDate: { ko: '📅 오늘의 날짜', en: "📅 Today's Date" },
  dailyIljin: { ko: '일진: ', en: 'Day Pillar: ' },
  dailyEnergyDay: { ko: ' 기운의 날', en: ' energy day' },
  dailyLuckyColor: { ko: '오늘의 행운 컬러', en: "Today's Lucky Color" },
  dailyFood: { ko: '추천 음식', en: 'Recommended Food' },
  dailyActivity: { ko: '추천 활동', en: 'Recommended Activity' },
  dailyMusic: { ko: '추천 음악', en: 'Recommended Music' },
  dailyMessage: { ko: '오늘의 태교 메시지', en: "Today's Prenatal Message" },

  // Daily guide content
  daily_wood_color: { ko: '초록/민트', en: 'Green/Mint' },
  daily_wood_food: { ko: '신선한 샐러드, 녹색 채소, 과일주스', en: 'Fresh salad, green vegetables, fruit juice' },
  daily_wood_activity: { ko: '가벼운 산책, 식물 키우기, 스트레칭', en: 'Light walk, plant care, stretching' },
  daily_wood_music: { ko: '새소리, 자연의 소리, 뉴에이지', en: 'Bird songs, nature sounds, new age' },
  daily_wood_mood: { ko: '새로운 시작의 기운! 아기에게 희망찬 이야기를 들려줘', en: 'Energy of new beginnings! Tell hopeful stories to your baby' },
  daily_fire_color: { ko: '따뜻한 핑크/코랄', en: 'Warm Pink/Coral' },
  daily_fire_food: { ko: '따뜻한 수프, 토마토 요리, 석류', en: 'Warm soup, tomato dishes, pomegranate' },
  daily_fire_activity: { ko: '태담 나누기, 일기 쓰기, 요가', en: 'Baby talk, journaling, yoga' },
  daily_fire_music: { ko: '클래식 피아노, 잔잔한 팝', en: 'Classical piano, soft pop' },
  daily_fire_mood: { ko: '열정의 기운이 넘치는 날! 아기에게 사랑한다고 속삭여줘', en: 'A day full of passion! Whisper love to your baby' },
  daily_earth_color: { ko: '베이지/크림', en: 'Beige/Cream' },
  daily_earth_food: { ko: '잡곡밥, 고구마, 따뜻한 차', en: 'Mixed grain rice, sweet potato, warm tea' },
  daily_earth_activity: { ko: '명상, 태교 일기, 편안한 독서', en: 'Meditation, prenatal diary, relaxed reading' },
  daily_earth_music: { ko: '첼로 연주, 자장가', en: 'Cello music, lullabies' },
  daily_earth_mood: { ko: '안정의 기운! 편안하게 쉬면서 아기와 교감하는 날', en: 'Stable energy! Rest comfortably and bond with your baby' },
  daily_metal_color: { ko: '화이트/실버', en: 'White/Silver' },
  daily_metal_food: { ko: '흰살 생선, 배, 우유', en: 'White fish, pear, milk' },
  daily_metal_activity: { ko: '태교 음악 감상, 정리정돈, 깊은 호흡', en: 'Prenatal music, organizing, deep breathing' },
  daily_metal_music: { ko: '바이올린, 하프 연주', en: 'Violin, harp music' },
  daily_metal_mood: { ko: '맑은 기운의 날! 깨끗한 공간에서 명상해봐', en: 'A day of clear energy! Try meditating in a clean space' },
  daily_water_color: { ko: '라벤더/하늘색', en: 'Lavender/Sky blue' },
  daily_water_food: { ko: '미역국, 해산물, 따뜻한 물', en: 'Seaweed soup, seafood, warm water' },
  daily_water_activity: { ko: '반신욕, 가벼운 수영, 아기 용품 구경', en: 'Half bath, light swimming, baby shopping' },
  daily_water_music: { ko: '파도소리, 비 내리는 소리', en: 'Wave sounds, rain sounds' },
  daily_water_mood: { ko: '지혜로운 기운! 아기에게 그림책을 읽어줘', en: 'Wise energy! Read picture books to your baby' },

  // Date display
  yearSuffix: { ko: '년', en: '/' },
  monthSuffix: { ko: '월', en: '/' },
  daySuffix: { ko: '일', en: '' },

  // Star shop
  starShopInfo1: { ko: '별 1개 = 100원 | 충전된 별은 모든 서비스에서 사용 가능', en: '1 Star = $0.10 | Stars can be used for all services' },
  starShopInfo2: { ko: '개인사주 ⭐10 | 궁합분석 ⭐5 | 올해운세 ⭐10', en: 'Saju ⭐10 | Compatibility ⭐5 | Fortune ⭐10' },

  // Star charge prices
  price1000: { ko: '1,000원', en: '$1.00' },
  price3000: { ko: '3,000원', en: '$3.00' },
  price5000: { ko: '5,000원', en: '$5.00' },
  price10000: { ko: '10,000원', en: '$10.00' },
  bonusLabel: { ko: '보너스', en: 'Bonus' },

  // Pregnancy tier labels
  pregTier95: { ko: '🌟 천생의 인연! 아이가 엄마를 선택한 거야', en: '🌟 A destined bond! The baby chose you as mom' },
  pregTier85: { ko: '💕 찰떡궁합! 서로의 기운을 완벽히 채워주는 관계', en: '💕 Perfect match! Perfectly complementing each other' },
  pregTier75: { ko: '🌸 서로 돕는 관계! 함께 성장하는 아름다운 인연', en: '🌸 A helping bond! A beautiful connection growing together' },
  pregTierDefault: { ko: '🤗 따뜻한 조화! 사랑으로 모든 게 채워지는 관계', en: '🤗 Warm harmony! A relationship filled with love' },

  // Payment
  payConfirmTitle: { ko: '결제 확인', en: 'Confirm Payment' },
  payProductName: { ko: '상품명', en: 'Product' },
  payPrice: { ko: '결제금액', en: 'Amount' },
  payDelivery: { ko: '제공 방식', en: 'Delivery' },
  payDeliveryValue: { ko: '결제 완료 후 즉시 별 충전', en: 'Stars charged immediately after payment' },
  payTiming: { ko: '제공 시점', en: 'When' },
  payTimingValue: { ko: '결제 완료 즉시', en: 'Immediately' },
  payCheckAll: { ko: '전체 동의', en: 'Agree to all' },
  payCheck1: { ko: '상품명, 결제금액, 제공 방식 및 제공 시점을 확인했습니다.', en: 'I confirm the product name, price, delivery method, and timing.' },
  payCheck2: { ko: '본 서비스는 디지털콘텐츠/온라인 용역으로서 서비스 제공이 개시된 이후 청약철회 또는 환불이 제한될 수 있음을 확인했습니다.', en: 'I understand that refunds may be limited after digital content delivery has begun.' },
  payCheck3: { ko: '이용약관 및 개인정보처리방침에 동의합니다.', en: 'I agree to the Terms of Service and Privacy Policy.' },
  payBtnLabel: { ko: '결제하기', en: 'Pay Now' },
  payTestBtn: { ko: '테스트 결제하기', en: 'Test Payment' },
  payNotice: { ko: '결제 완료 시 주문이 확정되며, 별이 즉시 충전됩니다.', en: 'Stars will be charged immediately upon payment.' },
  payRefundTitle: { ko: '환불 안내', en: 'Refund Policy' },
  payRefund1: { ko: '본 서비스는 결제 후 즉시 제공되는 디지털콘텐츠입니다.', en: 'This is digital content delivered immediately after payment.' },
  payRefund2: { ko: '서비스 제공이 개시되지 않은 경우 환불 가능합니다.', en: 'Refunds are available if service has not been provided.' },
  payRefund3: { ko: '서비스 제공 개시 이후 환불이 제한될 수 있습니다.', en: 'Refunds may be limited after service delivery begins.' },
  payRefund4: { ko: '시스템 오류, 중복 결제 시 환불 가능합니다.', en: 'Refunds available for system errors or duplicate payments.' },
  payServiceDesc: { ko: '본 서비스는 이용자가 입력한 정보를 바탕으로 사주 해석 결과를 제공하는 온라인 디지털 서비스입니다. 제공되는 해석 결과는 참고용 정보이며, 특정 결과나 효과를 보장하지 않습니다.', en: 'This service provides Saju readings based on user-provided information. Results are for reference only and do not guarantee specific outcomes.' },
  payBusinessInfo: { ko: '사업자 정보', en: 'Business Info' },
  payBack: { ko: '← 돌아가기', en: '← Back' },
  paySuccess: { ko: '결제가 완료되었습니다!', en: 'Payment complete!' },
  payStarsAdded: { ko: '별이 충전되었어!', en: 'Stars have been charged!' },

  // Translate button
  translateToEn: { ko: '🌐 Translate to English', en: '🌐 Translate to English' },
  translateToKo: { ko: '🌐 한국어로 번역', en: '🌐 Translate to Korean' },
  translating: { ko: '번역 중...', en: 'Translating...' },
};

export function t(key: string, lang: Lang): string {
  return T[key]?.[lang] || T[key]?.['ko'] || key;
}
