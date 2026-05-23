// 직업·환경·돈 결정론 분석 (spec §13).
// 십성/오행/용신/일간 강약/특별 포인트를 결합해서
// 구체 업계·직무·일하는 환경·돈 버는 방식을 추천한다.
//
// GPT는 이 결과를 풀어쓰기만 한다 (없는 업계 만들지 X).

import type { FourPillars } from '../calendar/pillarCalculator';
import type {
  CareerSpecificAnalysis, CareerMatch, ConditionalCareerMatch,
  CareerAvoidEnvironment, WorkStyleItem, MoneyMakingStyleItem,
  TenGodAnalysis, ElementStrengthAnalysis, DayMasterStrengthAnalysis,
  UsefulGodAnalysis, SpecialPoint, FortuneCycleInfo,
} from '../report/sajuReportSchema';
import type { UserContext } from '../calendar/normalizeBirthInput';
import type { Element } from '../rules/elements';

interface Args {
  pillars: FourPillars;
  tenGods: TenGodAnalysis;
  elements: ElementStrengthAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  usefulGod: UsefulGodAnalysis;
  specialPoints: SpecialPoint[];
  fortune: FortuneCycleInfo;
  userContext: UserContext;
}

interface IndustryTemplate {
  industry: string;
  roles: string[];
  whyTemplate: string[];   // 채워질 근거 패턴
  scene: string;
  caution: string;
  match: (a: Args) => { score: number; reasons: string[] };
}

// ============================================================
// 업계 템플릿 12개 — 십성/오행/특별포인트 조합으로 스코어링
// ============================================================

const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    industry: '스타트업 / IT 플랫폼',
    roles: ['서비스 기획', 'PM/PO', '운영 개선', '신사업 기획'],
    whyTemplate: [],
    scene: '아이디어를 빠르게 결과물로 만들고, 시장 반응을 직접 확인할 수 있는 환경',
    caution: '구조가 잡히지 않은 초기 조직에서는 책임이 모호해질 수 있어요',
    match: ({ tenGods, elements, specialPoints }) => {
      const reasons: string[] = [];
      let s = 0;
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      const wealth = tenGods.totals['편재'] + tenGods.totals['정재'];
      if (out >= 1.2) { s += 25; reasons.push(`식상(표현·결과물 만드는 힘) ${out.toFixed(1)} — 아이디어를 결과물로 빠르게 바꾸는 결`); }
      if (wealth >= 1.2) { s += 15; reasons.push(`재성(시장 감각) ${wealth.toFixed(1)} — 가치가 돈으로 연결되는 흐름을 본다`); }
      if (elements.strongest.includes('wood')) { s += 10; reasons.push('목 기운 강 — 새로운 판을 키우는 성장 에너지'); }
      if (specialPoints.some(p => p.id === 'sikSangSaengJae')) { s += 20; reasons.push('식상생재 — 만든 결과물이 자연스럽게 돈으로 연결'); }
      if (specialPoints.some(p => p.id === 'yeokMaMovement')) { s += 10; reasons.push('역마 — 환경 변화에 빠르게 적응'); }
      return { score: s, reasons };
    },
  },
  {
    industry: '브랜딩 / 마케팅 / 콘텐츠 기획',
    roles: ['브랜드 매니저', '콘텐츠 기획', '카피·메시지 디자이너', '소셜 그로스'],
    whyTemplate: [],
    scene: '나의 표현이 곧 결과가 되고, 사람들의 반응으로 다음 방향을 잡는 일',
    caution: '단발 캠페인보다 흐름이 쌓이는 구조에 더 강해요',
    match: ({ tenGods, specialPoints, elements }) => {
      const reasons: string[] = [];
      let s = 0;
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      if (out >= 1.2) { s += 25; reasons.push(`식상 ${out.toFixed(1)} — 표현·메시지가 강점`); }
      if (specialPoints.some(p => p.id === 'peachBlossomExpression' || p.id === 'hongyeomCharm')) {
        s += 25; reasons.push('표현·매력 포인트 — 같은 말을 해도 더 기억에 남는 결');
      }
      if (elements.strongest.includes('fire')) { s += 10; reasons.push('화 기운 — 밖으로 드러나는 표현력'); }
      if (tenGods.totals['상관'] >= 1.0) { s += 10; reasons.push('상관 — 기존 틀을 깨는 표현 감각'); }
      return { score: s, reasons };
    },
  },
  {
    industry: '데이터 분석 / 연구 / 리서치',
    roles: ['데이터 분석가', '리서처', '비즈니스 분석', '인사이트 컨설팅'],
    whyTemplate: [],
    scene: '복잡한 자료에서 핵심 패턴을 찾고, 다른 사람이 못 본 결을 잡는 일',
    caution: '내부 보고만 반복되는 자리는 결과물이 외부로 안 나가 답답해질 수 있어요',
    match: ({ tenGods, elements, specialPoints, dayMasterStrength }) => {
      const reasons: string[] = [];
      let s = 0;
      const sup = tenGods.totals['정인'] + tenGods.totals['편인'];
      if (sup >= 1.2) { s += 25; reasons.push(`인성(학습·분석) ${sup.toFixed(1)} — 깊이 파는 학습력`); }
      if (elements.strongest.includes('metal')) { s += 15; reasons.push('금 기운 — 자르고 정리하는 판단력'); }
      if (elements.strongest.includes('water')) { s += 15; reasons.push('수 기운 — 흐름을 읽는 지혜'); }
      if (specialPoints.some(p => p.id === 'hwagaeDepth')) { s += 15; reasons.push('화개 — 깊게 파는 몰입력'); }
      if (dayMasterStrength.level === 'strong' || dayMasterStrength.level === 'very-strong') {
        s += 5; reasons.push('일간 강 — 자기 기준으로 결론 내리는 힘');
      }
      return { score: s, reasons };
    },
  },
  {
    industry: '전략기획 / 컨설팅',
    roles: ['전략기획', '경영 컨설팅', '운영 컨설팅', 'PMO'],
    whyTemplate: [],
    scene: '복잡한 상황을 구조화해서 결정 가능한 형태로 만드는 일',
    caution: '실행보다 진단만 반복되는 자리는 보람이 줄 수 있어요',
    match: ({ tenGods, elements, specialPoints }) => {
      const reasons: string[] = [];
      let s = 0;
      const auth = tenGods.totals['정관'] + tenGods.totals['편관'];
      const sup = tenGods.totals['정인'] + tenGods.totals['편인'];
      if (auth >= 1.2) { s += 20; reasons.push(`관성(책임·구조) ${auth.toFixed(1)} — 책임을 지면서 정리해내는 힘`); }
      if (sup >= 1.0) { s += 15; reasons.push(`인성 ${sup.toFixed(1)} — 분석 깊이`); }
      if (elements.strongest.includes('metal')) { s += 15; reasons.push('금 기운 — 핵심을 가르는 판단력'); }
      if (specialPoints.some(p => p.id === 'gwanInSangSaeng')) { s += 25; reasons.push('관인상생 — 책임이 학습으로, 학습이 권위로 이어지는 구조'); }
      return { score: s, reasons };
    },
  },
  {
    industry: '교육 / 강의 / 코칭',
    roles: ['교육 콘텐츠 기획', '강의', '코칭', '학습 설계'],
    whyTemplate: [],
    scene: '내가 정리한 지식이 다른 사람의 행동을 바꾸게 만드는 일',
    caution: '준비만 길어지면 강의로 나오는 시점이 자꾸 미뤄질 수 있어요',
    match: ({ tenGods, specialPoints }) => {
      const reasons: string[] = [];
      let s = 0;
      const sup = tenGods.totals['정인'] + tenGods.totals['편인'];
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      if (sup >= 1.2 && out >= 1.0) { s += 30; reasons.push(`인성+식상 결합 — 학습한 것을 자기 말로 풀어내는 힘`); }
      if (specialPoints.some(p => p.id === 'gwanInSangSaeng')) { s += 15; reasons.push('관인상생 — 권위와 학습이 같이 가는 결'); }
      if (specialPoints.some(p => p.id === 'cheoneulStrong')) { s += 10; reasons.push('천을귀인 — 도움 주고받는 흐름'); }
      return { score: s, reasons };
    },
  },
  {
    industry: '프리랜서 / 1인 사업 / 컨설팅',
    roles: ['프리랜서 기획·디자인·개발', '1인 컨설팅', '온라인 강의', '구독형 콘텐츠'],
    whyTemplate: [],
    scene: '내 이름·내 결과물·내 가격표로 시장과 직접 거래하는 구조',
    caution: '계약·정산 기준을 늦게 잡으면 돈이 새기 쉬워요',
    match: ({ tenGods, specialPoints, dayMasterStrength, elements }) => {
      const reasons: string[] = [];
      let s = 0;
      const self = tenGods.totals['비견'] + tenGods.totals['겁재'];
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      const wealth = tenGods.totals['편재'] + tenGods.totals['정재'];
      if (self >= 1.2) { s += 15; reasons.push(`비겁(독립성) ${self.toFixed(1)} — 혼자 판단하고 움직이는 결`); }
      if (out + wealth >= 2.0) { s += 20; reasons.push('식상+재성 — 결과물로 직접 돈을 버는 구조'); }
      if (dayMasterStrength.level === 'strong' || dayMasterStrength.level === 'very-strong') {
        s += 10; reasons.push('일간 강 — 독립적으로 굴러가는 체력');
      }
      if (specialPoints.some(p => p.id === 'sikSangSaengJae')) { s += 20; reasons.push('식상생재 — 만든 가치가 돈으로 자연 연결'); }
      if (elements.strongest.includes('fire') || elements.strongest.includes('wood')) {
        s += 5; reasons.push('확장형 오행 — 자기 이름으로 키우는 흐름');
      }
      return { score: s, reasons };
    },
  },
  {
    industry: '영업 / BD / 파트너십',
    roles: ['B2B 영업', '제휴 BD', '고객 성공', '계정 매니지먼트'],
    whyTemplate: [],
    scene: '사람을 만나서 가치를 설명하고, 거래를 성사시키는 일',
    caution: '관계가 일이 되면 감정노동이 누적될 수 있어요',
    match: ({ tenGods, elements, specialPoints }) => {
      const reasons: string[] = [];
      let s = 0;
      const wealth = tenGods.totals['편재'] + tenGods.totals['정재'];
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      if (wealth >= 1.5) { s += 25; reasons.push(`재성 ${wealth.toFixed(1)} — 사람·돈의 흐름을 보는 감각`); }
      if (out >= 1.0) { s += 15; reasons.push('식상 — 표현·설득력'); }
      if (elements.strongest.includes('fire')) { s += 10; reasons.push('화 기운 — 관계 표현력'); }
      if (specialPoints.some(p => p.id === 'cheoneulStrong')) { s += 10; reasons.push('천을귀인 — 인맥의 도움'); }
      if (specialPoints.some(p => p.id === 'yeokMaMovement')) { s += 10; reasons.push('역마 — 이동·외부 미팅 잘 맞음'); }
      return { score: s, reasons };
    },
  },
  {
    industry: '재무 / 회계 / 리스크 관리',
    roles: ['재무 분석', '회계', '리스크 관리', '내부 통제'],
    whyTemplate: [],
    scene: '숫자와 규정 안에서 안정성을 만들어내는 일',
    caution: '창의적 표현보다 정합성과 정확성이 더 중요한 자리',
    match: ({ tenGods, elements, dayMasterStrength }) => {
      const reasons: string[] = [];
      let s = 0;
      const wealth = tenGods.totals['정재'];
      const auth = tenGods.totals['정관'];
      if (wealth >= 1.0) { s += 20; reasons.push(`정재 ${wealth.toFixed(1)} — 안정 재물·정확한 관리`); }
      if (auth >= 1.0) { s += 15; reasons.push(`정관 ${auth.toFixed(1)} — 규정·기준 안에서의 책임감`); }
      if (elements.strongest.includes('metal')) { s += 15; reasons.push('금 기운 — 정밀함·기준'); }
      if (elements.strongest.includes('earth')) { s += 10; reasons.push('토 기운 — 안정·축적'); }
      if (dayMasterStrength.level === 'balanced' || dayMasterStrength.level === 'strong') s += 5;
      return { score: s, reasons };
    },
  },
  {
    industry: '운영 개선 / 프로세스 / SCM',
    roles: ['운영 매니저', '프로세스 엔지니어링', 'SCM', '시스템 운영'],
    whyTemplate: [],
    scene: '돌아가는 시스템의 병목을 찾아 다시 흐르게 만드는 일',
    caution: '드라마틱한 변화보다 꾸준한 개선이 핵심',
    match: ({ tenGods, elements, specialPoints }) => {
      const reasons: string[] = [];
      let s = 0;
      const auth = tenGods.totals['정관'] + tenGods.totals['편관'];
      if (auth >= 1.2) { s += 20; reasons.push(`관성 ${auth.toFixed(1)} — 구조 안에서 책임지는 힘`); }
      if (elements.strongest.includes('earth')) { s += 15; reasons.push('토 기운 — 안정적 운영'); }
      if (elements.strongest.includes('metal')) { s += 10; reasons.push('금 기운 — 정리·체계'); }
      if (specialPoints.some(p => p.id === 'strongSurvival')) { s += 15; reasons.push('버티는 힘 — 꾸준한 개선에 강함'); }
      return { score: s, reasons };
    },
  },
  {
    industry: '크리에이터 / 1인 미디어 / 콘텐츠 수익화',
    roles: ['숏폼 크리에이터', '뉴스레터·블로그', '유튜브', '온라인 클래스'],
    whyTemplate: [],
    scene: '내 색깔로 콘텐츠를 만들고, 반응을 직접 수익으로 바꾸는 구조',
    caution: '완성도를 100% 채울 때까지 공개를 미루면 흐름이 끊겨요',
    match: ({ tenGods, specialPoints, elements }) => {
      const reasons: string[] = [];
      let s = 0;
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      if (out >= 1.5) { s += 30; reasons.push(`식상 ${out.toFixed(1)} — 표현·결과물의 힘`); }
      if (specialPoints.some(p => p.id === 'peachBlossomExpression' || p.id === 'hongyeomCharm')) {
        s += 25; reasons.push('표현·매력 포인트 — 인상에 남는 결');
      }
      if (specialPoints.some(p => p.id === 'sikSangSaengJae')) { s += 15; reasons.push('식상생재 — 콘텐츠가 돈으로 연결'); }
      if (elements.strongest.includes('fire')) { s += 10; reasons.push('화 기운 — 표현력 강화'); }
      return { score: s, reasons };
    },
  },
  {
    industry: '디자인 / 크래프트 / 제작',
    roles: ['UX/UI 디자인', '브랜드 디자인', '프로덕트 디자인', '핸드메이드 제작'],
    whyTemplate: [],
    scene: '감각과 손끝에서 완성도가 결정되는, 결과물 중심의 일',
    caution: '클라이언트 피드백 협업 비중이 높은 자리는 표현 자유도가 줄어요',
    match: ({ tenGods, elements, specialPoints }) => {
      const reasons: string[] = [];
      let s = 0;
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      if (out >= 1.2) { s += 20; reasons.push(`식상 ${out.toFixed(1)} — 결과물 만드는 힘`); }
      if (elements.strongest.includes('wood')) { s += 10; reasons.push('목 기운 — 자라나는 감각'); }
      if (specialPoints.some(p => p.id === 'hwagaeDepth')) { s += 10; reasons.push('화개 — 미적 감각의 깊이'); }
      return { score: s, reasons };
    },
  },
  {
    industry: '안정형 조직 / 공공·대기업 정규직',
    roles: ['공공기관', '대기업 정규직', '연구소', '전문직 자격기반'],
    whyTemplate: [],
    scene: '안정적 구조 안에서 자격·연차·전문성을 누적해 인정받는 길',
    caution: '결과물이 외부로 빠르게 드러나지 않으면 답답함이 생길 수 있어요',
    match: ({ tenGods, dayMasterStrength, specialPoints }) => {
      const reasons: string[] = [];
      let s = 0;
      const auth = tenGods.totals['정관'];
      const sup = tenGods.totals['정인'];
      if (auth >= 1.2 && sup >= 1.0) { s += 25; reasons.push('정관+정인 — 안정 조직과 자격 누적이 잘 맞는 결'); }
      if (dayMasterStrength.level === 'weak' || dayMasterStrength.level === 'very-weak') {
        s += 10; reasons.push('일간 약 — 구조의 보호 안에서 더 안정적');
      }
      if (specialPoints.some(p => p.id === 'gwanInSangSaeng')) { s += 15; reasons.push('관인상생'); }
      return { score: s, reasons };
    },
  },
];

// ============================================================
// 메인 분석 함수
// ============================================================

export function analyzeCareerSpecifics(args: Args): CareerSpecificAnalysis {
  // ── 1. 업계 스코어링 ──
  const scored = INDUSTRY_TEMPLATES
    .map(t => {
      const m = t.match(args);
      return { tpl: t, score: m.score, reasons: m.reasons };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 3).map((s, i): CareerMatch => ({
    rank: i + 1,
    industry: s.tpl.industry,
    roles: s.tpl.roles,
    fitScore: Math.min(100, s.score),
    whyFits: s.reasons,
    howItShowsInLife: s.tpl.scene,
    caution: s.tpl.caution,
  }));

  // 조건부 매치 — 4~6위 (점수는 있지만 top3 못 든 것)
  const conditional = scored.slice(3, 6).map((s): ConditionalCareerMatch => ({
    industry: s.tpl.industry,
    roles: s.tpl.roles,
    condition: deriveCondition(args, s.tpl.industry),
    whyFits: s.reasons,
    caution: s.tpl.caution,
  }));

  // ── 2. 피해야 할 환경 ──
  const avoid = deriveAvoidEnvironments(args);

  // ── 3. 일하는 환경 ──
  const workStyle = deriveBestWorkStyle(args);

  // ── 4. 돈 버는 방식 ──
  const moneyStyle = deriveMoneyMakingStyle(args);

  return {
    topCareerMatches: top,
    conditionalCareerMatches: conditional,
    avoidCareerEnvironments: avoid,
    bestWorkStyle: workStyle,
    moneyMakingStyle: moneyStyle,
  };
}

// ============================================================
// 보조 함수
// ============================================================

function deriveCondition(args: Args, industry: string): string {
  const { dayMasterStrength, tenGods } = args;
  if (dayMasterStrength.level === 'weak' || dayMasterStrength.level === 'very-weak') {
    return '혼자 짊어지는 자리보다, 조력자·자료·시스템이 같이 있는 환경에서';
  }
  if (tenGods.totals['편관'] >= 1.5) {
    return '책임과 권한이 같이 주어지는 자리에서';
  }
  if (tenGods.totals['상관'] >= 1.5) {
    return '기존 틀을 흔들어도 되는 자율적 환경에서';
  }
  return `${industry} 안에서도 결과물이 외부에 드러나는 자리에서`;
}

function deriveAvoidEnvironments(args: Args): CareerAvoidEnvironment[] {
  const { tenGods, elements, usefulGod, dayMasterStrength } = args;
  const out: CareerAvoidEnvironment[] = [];

  // 일간 약 + 관성 과다 → 책임 떠안기 위험
  if ((dayMasterStrength.level === 'weak' || dayMasterStrength.level === 'very-weak')
      && tenGods.totals['편관'] >= 2.0) {
    out.push({
      environment: '책임은 많은데 권한은 없는 조직',
      reason: '일간이 약한데 압박형 관성이 강한 구조 — 혼자 짊어지면 빠르게 소진됩니다',
      relatedTo: 'tenGod',
    });
  }

  // 식상 강 → 결과물 못 내는 환경 피해야
  const out_tg = tenGods.totals['식신'] + tenGods.totals['상관'];
  if (out_tg >= 1.5) {
    out.push({
      environment: '아이디어를 내도 실제 반영이 안 되는 팀',
      reason: '표현·결과물의 힘이 강한데 외부로 안 나오면 답답함이 누적됩니다',
      relatedTo: 'tenGod',
    });
  }

  // 비겁 강 → 위계 강한 조직 피하면 좋음
  const self = tenGods.totals['비견'] + tenGods.totals['겁재'];
  if (self >= 1.8) {
    out.push({
      environment: '결과물보다 눈치와 보고가 더 중요한 자리',
      reason: '독립성과 자기 판단이 강한 결 — 보고 중심 문화에선 갈등이 잦습니다',
      relatedTo: 'tenGod',
    });
  }

  // 기신 오행이 환경 자극
  const ki = usefulGod.unfavorable[0] as Element | undefined;
  if (ki) {
    out.push({
      environment: kiEnvironmentLabel(ki),
      reason: `기신 ${ki} 기운이 강해지는 환경 — 균형이 깨지기 쉬워요`,
      relatedTo: 'unfavorableGod',
    });
  }

  // 충 많으면 안정성 떨어지는 자리 피하기
  if (elements.excessive.length >= 2) {
    out.push({
      environment: '성과 기준이 불명확하고 변화만 많은 환경',
      reason: '오행 편중이 큰 사주 — 기준 없는 변화는 균형을 더 흔듭니다',
      relatedTo: 'element',
    });
  }

  return out.slice(0, 4);
}

function kiEnvironmentLabel(ki: Element): string {
  const map: Record<Element, string> = {
    wood: '새 프로젝트만 끝없이 열리고 마무리가 흩어지는 환경',
    fire: '감정 소모가 큰 무대형 자리 — 표현은 많은데 회수가 적은 구조',
    earth: '결정은 미루고 책임만 누적되는 보수적 조직',
    metal: '규정과 통제가 과한 자리 — 자율성과 표현이 막히는 구조',
    water: '익명·이동성만 강하고 안정된 베이스가 없는 환경',
  };
  return map[ki];
}

function deriveBestWorkStyle(args: Args): WorkStyleItem[] {
  const { tenGods, dayMasterStrength, specialPoints } = args;
  const items: WorkStyleItem[] = [];

  const out = tenGods.totals['식신'] + tenGods.totals['상관'];
  const auth = tenGods.totals['정관'] + tenGods.totals['편관'];
  const sup = tenGods.totals['정인'] + tenGods.totals['편인'];

  if (out >= 1.2) {
    items.push({
      title: '결과물이 외부로 드러나는 환경',
      description: '글·영상·제품·서비스처럼 남이 확인할 수 있는 형태로 나가는 자리에서 강점이 더 살아납니다',
      evidence: [`식상(표현·결과물) ${out.toFixed(1)}`],
    });
  }
  if (auth >= 1.2) {
    items.push({
      title: '책임과 권한이 같이 주어지는 역할',
      description: '역할이 분명하고 결정 권한이 있는 자리에서 실력이 정리됩니다',
      evidence: [`관성(책임·구조) ${auth.toFixed(1)}`],
    });
  }
  if (sup >= 1.2) {
    items.push({
      title: '문제를 구조화하고 분석해야 하는 역할',
      description: '자료·정보·기준을 다루고, 그 위에서 판단하는 자리가 잘 맞습니다',
      evidence: [`인성(학습·분석) ${sup.toFixed(1)}`],
    });
  }
  if (dayMasterStrength.level === 'strong' || dayMasterStrength.level === 'very-strong') {
    items.push({
      title: '자기 기준으로 굴러가는 자율적 환경',
      description: '일정과 우선순위를 스스로 잡을 수 있는 자리에서 더 강해집니다',
      evidence: ['일간 강 — 독립성'],
    });
  }
  if (specialPoints.some(p => p.id === 'strongSurvival')) {
    items.push({
      title: '장기 프로젝트·꾸준한 누적이 평가되는 자리',
      description: '단기 반응보다 꾸준함이 자산이 되는 환경에서 결국 더 인정받습니다',
      evidence: ['버티는 힘 포인트'],
    });
  }
  if (specialPoints.some(p => p.id === 'cheoneulStrong')) {
    items.push({
      title: '사람·정보·소개가 자연스럽게 오가는 환경',
      description: '닫힌 조직보다, 다양한 사람과 정보가 흐르는 자리에서 기회가 붙기 쉽습니다',
      evidence: ['천을귀인 — 인맥의 흐름'],
    });
  }

  return items.slice(0, 4);
}

function deriveMoneyMakingStyle(args: Args): MoneyMakingStyleItem[] {
  const { tenGods, specialPoints, dayMasterStrength } = args;
  const items: MoneyMakingStyleItem[] = [];

  const out = tenGods.totals['식신'] + tenGods.totals['상관'];
  const wealth = tenGods.totals['편재'] + tenGods.totals['정재'];
  const auth = tenGods.totals['정관'] + tenGods.totals['편관'];
  const sup = tenGods.totals['정인'] + tenGods.totals['편인'];
  const self = tenGods.totals['비견'] + tenGods.totals['겁재'];

  // 식상생재 또는 식상 강 → 콘텐츠/성과형
  if (specialPoints.some(p => p.id === 'sikSangSaengJae') || (out >= 1.5 && wealth >= 1.0)) {
    items.push({
      kind: 'performance',
      title: '내가 만든 결과물이 시장 반응을 얻을 때',
      description: '고정 월급보다, 만든 것이 팔리거나 반응을 얻을 때 돈 흐름이 살아납니다',
      evidence: [`식상 ${out.toFixed(1)} + 재성 ${wealth.toFixed(1)}`],
    });
    items.push({
      kind: 'content',
      title: '콘텐츠·자료가 누적되어 자동으로 돈이 흐르는 구조',
      description: '강의·뉴스레터·유료 콘텐츠처럼 한번 만든 것이 계속 팔리는 형태가 잘 맞습니다',
      evidence: ['식상생재 — 만든 가치가 돈으로 연결'],
    });
  }

  // 편재 강 → 거래·기회형
  if (tenGods.totals['편재'] >= 1.5) {
    items.push({
      kind: 'transaction',
      title: '큰 흐름의 기회·거래·딜에서 돈을 잡는 방식',
      description: '시장 변화·가격 흐름을 보고 타이밍에 맞춰 들어가는 거래·중개·신사업에 어울립니다',
      evidence: [`편재 ${tenGods.totals['편재'].toFixed(1)}`],
    });
  }

  // 정재 강 → 안정·전문성
  if (tenGods.totals['정재'] >= 1.2) {
    items.push({
      kind: 'expertise',
      title: '꾸준히 쌓이는 전문성·자격·연차로 안정 수익',
      description: '연차와 자격이 누적되는 구조 — 매년 단가가 올라가는 방식에 강합니다',
      evidence: [`정재 ${tenGods.totals['정재'].toFixed(1)}`],
    });
  }

  // 관인상생 → 월급형
  if (specialPoints.some(p => p.id === 'gwanInSangSaeng') || (auth >= 1.2 && sup >= 1.0)) {
    items.push({
      kind: 'salary',
      title: '안정적 조직 안에서 책임과 직책으로 수익',
      description: '월급·직위·연차 구조 안에서 안정성과 성장이 같이 오는 방식이 잘 맞습니다',
      evidence: ['관성+인성 결합'],
    });
  }

  // 비겁 강 → 1인 브랜드/프로젝트
  if (self >= 1.5) {
    items.push({
      kind: 'personal-brand',
      title: '내 이름·내 색깔로 직접 거래하는 1인 브랜드형',
      description: '회사 이름 뒤에 가려지기보다, 내 이름이 가치가 되는 구조에서 더 강해집니다',
      evidence: [`비겁(독립성) ${self.toFixed(1)}`],
    });
  }

  // 일간 약 + 정인 → 네트워크/지원형
  if ((dayMasterStrength.level === 'weak' || dayMasterStrength.level === 'very-weak') && sup >= 1.2) {
    items.push({
      kind: 'network',
      title: '도움과 소개가 흐르는 네트워크 안에서 수익',
      description: '혼자 다 만들기보다, 파트너·소개·협업이 돈으로 이어지는 구조와 궁합이 있습니다',
      evidence: ['일간 약 + 인성 강'],
    });
  }

  return items.slice(0, 4);
}
