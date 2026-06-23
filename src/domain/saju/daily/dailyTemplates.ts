// Daily Fortune — deterministic 문장 템플릿 (spec §7).
//
// 톤 원칙(§7): 짧고, 구체적이고, 오늘 바로 해볼 수 있고, 살짝 재미있게.
// 일반론 금지("신중함이 필요합니다", "소통을 잘하세요" 등) — dailyFortuneValidator가 가드.
//
// 변화 원천: dayTenGod(오늘 천간 십성)은 매일 바뀌므로(천간 10일 주기),
// goodFor/points가 매일 달라진다. flowLabel은 더 거친 단위.
//
// ko = 작은따옴표 / en = 큰따옴표(아포스트로피 escape 회피).

import type { TenGod } from '../report/sajuReportSchema';
import type { DailyFlowLabel } from './dailyFortuneTypes';

export interface TenGodFlavor {
  /** 오늘 들어오는 기운의 한 줄 주제 */
  theme: string;
  /** goodFor 후보 (구체적·짧음, 3개) */
  good: string[];
  work: string;
  money: string;
  relationship: string;
}

export const TENGOD_FLAVOR: Record<TenGod, TenGodFlavor> = {
  비견: {
    theme: '내 페이스와 독립',
    good: ['내 방식대로 일 진행하기', '혼자 집중하는 시간 갖기', '체력 미리 안배하기'],
    work: '남 눈치보다 내 기준으로 처리하면 일이 빨라져요.',
    money: '큰 지출보다 지금 흐름을 유지하는 편이 안전해요.',
    relationship: '굳이 맞추려 애쓰기보다 내 페이스를 지켜도 괜찮은 날이에요.',
  },
  겁재: {
    theme: '경쟁과 지출 주의',
    good: ['일을 나눠서 협업하기', '충동구매 한 박자 참기', '경쟁 상황 침착하게 보기'],
    work: '욕심내 여러 개 벌이기보다 하나에 집중하는 게 유리해요.',
    money: '예상 못 한 지출이 생기기 쉬우니 결제 전에 한 번 더 확인해요.',
    relationship: '경쟁심이 올라오면 한 발 물러서면 오히려 편해져요.',
  },
  식신: {
    theme: '꾸준한 표현과 만들기',
    good: ['미뤘던 작업물 마무리하기', '맛있는 끼니 챙기기', '하던 루틴 이어가기'],
    work: '새로 벌이기보다 만들던 걸 끝낼 때 성과가 보여요.',
    money: '무리한 투자보다 꾸준한 흐름이 어울리는 날이에요.',
    relationship: '편한 사람과 가볍게 시간 보내기 좋아요.',
  },
  상관: {
    theme: '아이디어와 말의 힘',
    good: ['떠오른 아이디어 글로 정리하기', '발표·콘텐츠 만들기', '새 방식 한 가지 시도하기'],
    work: '튀는 아이디어가 잘 나오니 떠오르면 바로 기록해둬요.',
    money: '돈 이야기를 말로 흐릿하게 넘기지 말고 숫자로 확인해요.',
    relationship: '말이 앞서기 쉬우니 한 번 더 다듬어 전해요.',
  },
  정재: {
    theme: '꼼꼼한 관리',
    good: ['가계부·정산 정리하기', '계약·서류 한 번 점검하기', '약속 시간 지키기'],
    work: '디테일을 챙기면 신뢰가 쌓이는 날이에요.',
    money: '숫자를 직접 확인하면 새는 돈이 보여요.',
    relationship: '약속을 지키는 작은 행동이 점수를 올려줘요.',
  },
  편재: {
    theme: '기회와 사교',
    good: ['새 자리에 가볍게 나가보기', '필요한 정보 모으기', '유동 자금 점검하기'],
    work: '여러 기회가 들어오니 우선순위부터 정해요.',
    money: '돈이 도는 흐름은 좋지만 한 번에 크게 벌이진 말아요.',
    relationship: '사람을 통해 기회가 오니 가볍게 연결해둬요.',
  },
  정관: {
    theme: '책임과 신뢰',
    good: ['해야 할 일 먼저 처리하기', '절차대로 보고·정리하기', '맡은 약속 지키기'],
    work: '맡은 일을 정석대로 하면 인정받기 좋은 날이에요.',
    money: '큰 결정은 절차를 밟아 천천히 가는 편이 안전해요.',
    relationship: '믿음직한 태도가 관계를 단단하게 해줘요.',
  },
  편관: {
    theme: '압박을 정리로 바꾸기',
    good: ['급한 일 우선순위 정하기', '부담되는 일 작게 쪼개기', '컨디션 먼저 챙기기'],
    work: '책임이 몰릴 수 있으니 할 일을 글로 쪼개면 한결 가벼워요.',
    money: '압박감에 급하게 지르지 말고 결정을 미뤄도 돼요.',
    relationship: '예민해지기 쉬우니 바로 답하기보다 한 박자 쉬어요.',
  },
  정인: {
    theme: '배움과 충전',
    good: ['자료·책 읽으며 공부하기', '쉬어가며 에너지 채우기', '필요할 때 도움 청하기'],
    work: '새로 배우거나 정리하면 머리가 맑아지는 날이에요.',
    money: '큰 움직임보다 아껴두는 편이 어울려요.',
    relationship: '기대고 싶을 땐 솔직히 도움을 청해도 좋아요.',
  },
  편인: {
    theme: '혼자만의 사색',
    good: ['혼자 깊게 파고들기', '관심 분야 탐색하기', '조용한 환경 만들기'],
    work: '깊이 파는 작업에 어울리니 방해 요소부터 줄여요.',
    money: '평소 안 쓰던 곳에 끌릴 수 있으니 하루 미뤄 결정해요.',
    relationship: '혼자 있는 시간이 필요하면 그래도 괜찮은 날이에요.',
  },
};

export interface FlowTemplate {
  headline: string;
  shortMessage: string;
  caution: string[];
}

export const FLOW_TEMPLATE: Record<DailyFlowLabel, FlowTemplate> = {
  '흐름 좋음': {
    headline: '오늘은 막힘이 적고 흐름이 자연스럽게 풀리는 날이에요.',
    shortMessage:
      '평소 미루던 일을 가볍게 꺼내기 좋아요. 한 번에 몰아치기보다, 잘 풀리는 흐름을 차분히 이어가 보세요.',
    caution: ['들뜬 김에 일 벌이기', '잘 된다고 점검 건너뛰기', '쉬는 시간 없이 달리기'],
  },
  '정리 필요한 날': {
    headline: '오늘은 속도보다 정리가 먼저인 날이에요.',
    shortMessage:
      '새로 벌이기보다 밀린 것을 정리할 때 흐름이 붙어요. 책상·일정·할 일을 한 번 비우고 시작해 보세요.',
    caution: ['새 일 무리하게 시작하기', '정리 안 된 채로 결정 내리기', '피곤한데 억지로 밀어붙이기'],
  },
  '무리 금지': {
    headline: '오늘은 욕심을 줄이고 컨디션을 지키는 날이에요.',
    shortMessage:
      '의욕만큼 일이 안 받쳐줄 수 있어요. 중요한 건 내일로 미뤄도 괜찮으니, 오늘은 무리하지 않는 편이 이득이에요.',
    caution: ['몸 상태 무시하고 강행하기', '급하게 큰 결정 내리기', '예민할 때 바로 부딪치기'],
  },
  '관계 조심': {
    headline: '오늘은 말 한마디를 한 번 더 다듬으면 좋은 날이에요.',
    shortMessage:
      '사람 사이에서 작은 어긋남이 생기기 쉬워요. 바로 답하기보다 잠깐 두었다가, 기록으로 남기는 편이 안전해요.',
    caution: ['감정적으로 바로 답장하기', '민감한 주제 즉석에서 결론내기', '피곤한 사람에게 오래 붙잡히기'],
  },
  '돈 관리 유리': {
    headline: '오늘은 돈을 ‘감’이 아니라 ‘숫자’로 보는 날이에요.',
    shortMessage:
      '들어오고 나가는 돈을 직접 확인하기 좋은 흐름이에요. 흐릿하게 넘긴 정산이 있다면 오늘 맞춰두세요.',
    caution: ['돈 이야기 대충 넘기기', '충동적으로 큰 결제하기', '확인 없이 빌려주거나 약속하기'],
  },
  '움직이면 풀리는 날': {
    headline: '오늘은 가만히보다 한 걸음 움직일 때 풀리는 날이에요.',
    shortMessage:
      '연락·외출·작은 시도가 흐름을 열어줘요. 머릿속으로만 재지 말고 먼저 가볍게 움직여 보세요.',
    caution: ['생각만 하다 타이밍 놓치기', '한 번에 너무 멀리 가기', '준비 없이 즉흥으로 지르기'],
  },
  '집중력 좋은 날': {
    headline: '오늘은 말보다 ‘만들어내는 힘’이 붙는 날이에요.',
    shortMessage:
      '하나에 깊게 몰입하기 좋은 흐름이에요. 알림을 줄이고, 끝내고 싶던 작업물에 시간을 몰아주세요.',
    caution: ['여러 일 동시에 벌이기', '잦은 알림에 흐름 끊기', '완벽하게 하려다 시작 못 하기'],
  },
  '속도 조절': {
    headline: '오늘은 빠르게보다 일정하게 가는 날이에요.',
    shortMessage:
      '급가속보다 페이스 유지가 어울려요. 무리한 약속을 줄이고, 할 일을 글로 적어 하나씩 비워가세요.',
    caution: ['무리하게 일정 채우기', '조급하게 결론 서두르기', '쉼 없이 몰아붙이기'],
  },
};

// ─── English mirrors ─────────────────────────────────────────────────────────

export const TENGOD_FLAVOR_EN: Record<TenGod, TenGodFlavor> = {
  비견: {
    theme: "Your own pace",
    good: ["Do things your own way", "Take focused solo time", "Pace your energy ahead"],
    work: "Trust your own standards over others' glances — things move faster.",
    money: "Holding your current flow beats big spending today.",
    relationship: "It's fine to keep your own pace instead of over-adjusting to others.",
  },
  겁재: {
    theme: "Watch rivalry and spending",
    good: ["Split the work and collaborate", "Pause a beat before impulse buys", "Stay calm in competition"],
    work: "Focus on one thing rather than juggling several today.",
    money: "Surprise costs pop up — double-check before you pay.",
    relationship: "When competitiveness rises, a step back makes things easier.",
  },
  식신: {
    theme: "Steady making and expressing",
    good: ["Finish a task you put off", "Enjoy a good meal", "Keep your routine going"],
    work: "Finishing what's in progress beats starting something new.",
    money: "Steady flow suits today more than a risky bet.",
    relationship: "Easy time with comfortable people fits well.",
  },
  상관: {
    theme: "Ideas and the power of words",
    good: ["Write down ideas as they hit", "Make a presentation or content", "Try one new approach"],
    work: "Sharp ideas come easily — capture them right away.",
    money: "Don't leave money talk vague; confirm it with numbers.",
    relationship: "Words run ahead today, so polish once before sending.",
  },
  정재: {
    theme: "Careful management",
    good: ["Tidy your budget or settle accounts", "Check a contract or document", "Keep your appointments on time"],
    work: "Minding the details builds trust today.",
    money: "Check the numbers yourself and the leaks show up.",
    relationship: "Small kept promises earn you more points than grand gestures.",
  },
  편재: {
    theme: "Opportunity and good company",
    good: ["Show up to a new gathering", "Gather useful information", "Review your cash flow"],
    work: "Many chances come in — set your priorities first.",
    money: "Money moves well, but don't go all-in at once.",
    relationship: "Opportunities come through people, so connect lightly.",
  },
  정관: {
    theme: "Responsibility and trust",
    good: ["Handle the must-dos first", "Report and organize by the book", "Keep your commitments"],
    work: "Doing your role by the book earns recognition today.",
    money: "Take big decisions slowly, step by step.",
    relationship: "A dependable attitude steadies your relationships.",
  },
  편관: {
    theme: "Turn pressure into order",
    good: ["Set priorities for urgent tasks", "Break heavy tasks into small steps", "Mind your condition first"],
    work: "Responsibility may pile up — breaking tasks down in writing makes it lighter.",
    money: "Don't spend in a rush under pressure; it can wait.",
    relationship: "You're sensitive today, so pause a beat before replying.",
  },
  정인: {
    theme: "Learning and recharging",
    good: ["Study or read materials", "Rest and refill your energy", "Ask for help when you need it"],
    work: "Learning or organizing clears your head today.",
    money: "Saving suits you better than big moves.",
    relationship: "When you want support, it's okay to ask honestly.",
  },
  편인: {
    theme: "Quiet reflection",
    good: ["Dig deep on your own", "Explore a field you like", "Make a quiet environment"],
    work: "Good for deep work — cut distractions first.",
    money: "You may be drawn to unusual buys; sleep on it.",
    relationship: "If you need alone time, that's perfectly okay today.",
  },
};

export const FLOW_TEMPLATE_EN: Record<DailyFlowLabel, FlowTemplate> = {
  '흐름 좋음': {
    headline: "Today flows smoothly with little resistance.",
    shortMessage:
      "A good day to gently pick up what you've been putting off. Rather than rushing all at once, keep the good flow going calmly.",
    caution: ["Starting too much on a high", "Skipping checks because it's going well", "Running with no breaks"],
  },
  '정리 필요한 날': {
    headline: "Today is about tidying up before speeding up.",
    shortMessage:
      "Flow comes from clearing the backlog, not starting new things. Clear your desk, schedule, and to-dos first.",
    caution: ["Forcing a new project", "Deciding while things are messy", "Pushing hard while tired"],
  },
  '무리 금지': {
    headline: "Today, ease off and protect your condition.",
    shortMessage:
      "Your drive may outrun what the day supports. Important things can wait till tomorrow — not overdoing it pays off.",
    caution: ["Pushing through when worn out", "Making big calls in a hurry", "Clashing head-on while on edge"],
  },
  '관계 조심': {
    headline: "Today, polishing one more word goes a long way.",
    shortMessage:
      "Small misalignments with people come easily. Rather than replying instantly, pause and leave a record.",
    caution: ["Replying emotionally on the spot", "Settling sensitive topics impromptu", "Getting held up by a tired person"],
  },
  '돈 관리 유리': {
    headline: "Today, see money as numbers, not a hunch.",
    shortMessage:
      "A good flow for checking money in and out directly. If a settlement got hand-waved, square it today.",
    caution: ["Glossing over money talk", "Impulse big purchases", "Lending or promising without checking"],
  },
  '움직이면 풀리는 날': {
    headline: "Today opens up when you take one step.",
    shortMessage:
      "A call, an outing, a small try opens the flow. Don't just calculate in your head — move lightly first.",
    caution: ["Missing timing while only thinking", "Going too far at once", "Diving in unprepared"],
  },
  '집중력 좋은 날': {
    headline: "Today, the power to make beats the power to talk.",
    shortMessage:
      "Great flow for deep focus on one thing. Mute notifications and pour time into what you wanted to finish.",
    caution: ["Starting many things at once", "Breaking flow with frequent alerts", "Not starting for fear of imperfection"],
  },
  '속도 조절': {
    headline: "Today, steady beats fast.",
    shortMessage:
      "Holding your pace suits you more than accelerating. Cut overloaded plans and clear to-dos one by one.",
    caution: ["Overpacking your schedule", "Rushing to conclusions", "Pushing on with no rest"],
  },
};

/** flowLabel(한글 enum)의 영어 표시명 */
export const FLOW_LABEL_EN: Record<DailyFlowLabel, string> = {
  '흐름 좋음': 'Good flow',
  '정리 필요한 날': 'A day to tidy up',
  '무리 금지': "Don't overdo it",
  '관계 조심': 'Mind your words',
  '돈 관리 유리': 'Good with money',
  '움직이면 풀리는 날': 'Move and it opens',
  '집중력 좋은 날': 'Deep focus',
  '속도 조절': 'Pace yourself',
};
