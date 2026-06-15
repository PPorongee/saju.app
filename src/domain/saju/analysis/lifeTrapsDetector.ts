// 내 사주의 함정 3~5개 (spec §3-3).
// 사용자가 "이건 내 얘기다"라고 느낄 반복 패턴. 명리 근거 + 벗어나는 방법 필수.

import type { FourPillars } from '../calendar/pillarCalculator';
import type {
  LifeTrap, LifeTrapCategory, TenGodAnalysis,
  ElementStrengthAnalysis, DayMasterStrengthAnalysis,
  UsefulGodAnalysis, SpecialPoint, FortuneCycleInfo,
} from '../report/sajuReportSchema';
import type { UserContext } from '../calendar/normalizeBirthInput';

interface MatchArgs {
  pillars: FourPillars;
  tenGods: TenGodAnalysis;
  elements: ElementStrengthAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  usefulGod: UsefulGodAnalysis;
  specialPoints: SpecialPoint[];
  fortune: FortuneCycleInfo;
  userContext: UserContext;
}

interface Template {
  id: string;
  name: string;
  category: LifeTrapCategory;
  patternDescription: string;
  realLifeScene: string;
  escapeStrategy: string;
  match(args: MatchArgs): { score: number; evidence: LifeTrap['evidence'] };
}

const TEMPLATES: Template[] = [
  {
    id: 'solo-everything',
    name: '혼자 다 감당하다가 도움받을 타이밍을 놓치는 것',
    category: 'over-responsibility',
    patternDescription: '비겁이나 강한 일간의 힘이 두드러지면 "내가 해결해야 한다"는 감각이 강해져, 같이 풀면 쉬운 일도 혼자 끌고 가기 쉬움',
    realLifeScene: '주변 사람들은 당신이 괜찮은 줄 알지만 정작 본인은 속으로 지쳐가는 상황 반복',
    escapeStrategy: '완전히 무너지기 전, 중간 단계에서 정해진 사람에게 조언을 구하는 습관',
    match: ({ tenGods, specialPoints, dayMasterStrength }) => {
      const ev: LifeTrap['evidence'] = [];
      let s = 0;
      const self = tenGods.totals['비견'] + tenGods.totals['겁재'];
      if (self >= 1.5) { s += 30; ev.push({ source: 'tenGod', description: `비겁 ${self.toFixed(2)}` }); }
      if (specialPoints.some(p => p.id === 'strongSurvival')) {
        s += 25; ev.push({ source: 'specialPoint', description: '승부형 — 혼자 버티는 결' });
      }
      if (dayMasterStrength.level === 'strong' || dayMasterStrength.level === 'very-strong') {
        s += 15; ev.push({ source: 'tenGod', description: `신강 ${dayMasterStrength.level}` });
      }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'overthink-no-start',
    name: '생각이 많아 시작이 늦어지는 것',
    category: 'overthinking',
    patternDescription: '인성왕 + 결과물(식상) 약하면 머릿속에서 완성도를 계속 높이느라 실행이 지연',
    realLifeScene: '준비는 많이 했는데 막상 공개·실행은 못 한 채 다음 아이디어로 넘어가는 패턴',
    escapeStrategy: '"완벽한 결과물"보다 "검증 가능한 작은 결과물"을 먼저 만들기 — 초안·샘플·베타로 외부 접점',
    match: ({ tenGods }) => {
      const ev: LifeTrap['evidence'] = [];
      let s = 0;
      const sup = tenGods.totals['정인'] + tenGods.totals['편인'];
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      if (sup >= 1.5 && out < 1.0) {
        s += 40;
        ev.push({ source: 'tenGod', description: `인성 ${sup.toFixed(2)} >> 식상 ${out.toFixed(2)}` });
      } else if (sup >= 1.5) {
        s += 20;
        ev.push({ source: 'tenGod', description: `인성 ${sup.toFixed(2)} (강)` });
      }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'cut-relationship-late',
    name: '아닌 사람을 오래 참다가 한 번에 끊어내는 것',
    category: 'relationship',
    patternDescription: '오래 참고 누적하다가 임계치를 넘으면 한 번에 정리해버리는 패턴',
    realLifeScene: '주변엔 "갑자기 변했다"고 보이지만 본인은 오래 누적한 끝의 결정',
    escapeStrategy: '중간 단계에서 거리감을 조정하는 짧은 신호 — 미리 표현하면 한 방에 끊을 일이 줄어듦',
    match: ({ specialPoints, tenGods }) => {
      const ev: LifeTrap['evidence'] = [];
      let s = 0;
      if (specialPoints.some(p => p.id === 'innerOuterContrast')) {
        s += 30; ev.push({ source: 'specialPoint', description: '반전 구조' });
      }
      if (tenGods.totals['정인'] + tenGods.totals['편인'] >= 1.5) {
        s += 15; ev.push({ source: 'tenGod', description: '인성왕 — 속에 쌓는 결' });
      }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'free-talent',
    name: '돈 되는 재능을 무료로 써버리는 것',
    category: 'money',
    patternDescription: '식상 강 + 재성 약하거나 식상→재성 연결이 흐릿하면, 능력은 있지만 보상 구조로 옮기는 데 망설임',
    realLifeScene: '기획·조언·제작·문제 해결을 주변에게 쉽게 주지만 정작 가격·계약은 못 만드는 모습',
    escapeStrategy: '작은 작업이라도 범위·기간·보상 기준을 먼저 정하는 습관',
    match: ({ tenGods }) => {
      const ev: LifeTrap['evidence'] = [];
      let s = 0;
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      const wealth = tenGods.totals['편재'] + tenGods.totals['정재'];
      if (out >= 1.5 && wealth < 0.8) {
        s += 40;
        ev.push({ source: 'tenGod', description: `식상 ${out.toFixed(2)} >> 재성 ${wealth.toFixed(2)}` });
      }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'over-responsibility-burnout',
    name: '책임을 너무 혼자 짊어지는 것',
    category: 'over-responsibility',
    patternDescription: '관성 강 + 인성으로 받쳐주는 구조에서 "이건 내 일"이라는 감각이 과도해짐',
    realLifeScene: '직장·가족·프로젝트에서 자기 몫 이상을 떠안다가 번아웃',
    escapeStrategy: '책임 위임은 약함이 아니라 시스템 능력 — 한 영역은 의도적으로 다른 사람 몫으로 분리',
    match: ({ tenGods, specialPoints }) => {
      const ev: LifeTrap['evidence'] = [];
      let s = 0;
      const auth = tenGods.totals['정관'] + tenGods.totals['편관'];
      if (auth >= 1.5) { s += 25; ev.push({ source: 'tenGod', description: `관성 ${auth.toFixed(2)}` }); }
      if (specialPoints.some(p => p.id === 'gwanInSangSaeng')) {
        s += 20; ev.push({ source: 'specialPoint', description: '관인상생' });
      }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'isolated-element',
    name: '필요한 기운이 부족해 자주 막힘을 느끼는 것',
    category: 'persistence',
    patternDescription: '용신 오행이 원국에 부족하면 평소 작은 일에도 막힘 체감',
    realLifeScene: '이유 없이 답답하거나 흐름이 잘 안 풀리는 시기에 자주 나타남',
    escapeStrategy: '용신 오행과 연결된 생활 환경(색·방향·공간·취미·관계)을 의도적으로 가까이',
    match: ({ usefulGod, elements }) => {
      const ev: LifeTrap['evidence'] = [];
      const useful = usefulGod.primaryUseful.value as import('../rules/elements').Element;
      if (elements.isolated.includes(useful) || elements.deficient.includes(useful)) {
        return { score: 35, evidence: [
          { source: 'usefulGod', description: `용신 ${useful}이 원국에 부족/고립` },
          { source: 'elementDeficiency', description: `${useful} 점수 ${elements.scores[useful].toFixed(2)}` },
        ] };
      }
      return { score: 0, evidence: ev };
    },
  },
  {
    id: 'fear-of-judgment',
    name: '남의 평가가 두려워 시작을 미루는 것',
    category: 'avoidance',
    patternDescription: '관성 강 + 식상 약하면 "잘해야 한다"는 부담으로 첫발이 늦어짐',
    realLifeScene: '아이디어는 많은데 외부 노출이 거의 없는 패턴',
    escapeStrategy: '"평가받을 결과물"이 아니라 "실험하는 과정"으로 framing — 베타·초안 라벨 활용',
    match: ({ tenGods }) => {
      const ev: LifeTrap['evidence'] = [];
      let s = 0;
      const auth = tenGods.totals['정관'] + tenGods.totals['편관'];
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      if (auth >= 1.2 && out < 0.8) {
        s += 30; ev.push({ source: 'tenGod', description: `관성 ${auth.toFixed(2)} >> 식상 ${out.toFixed(2)}` });
      }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'excessive-element-burst',
    name: '강한 한 가지에 매몰되어 다른 영역을 놓치는 것',
    category: 'perfectionism',
    patternDescription: '오행 한 쪽이 과다하면 그 영역만 깊이 파고 다른 균형이 무너짐',
    realLifeScene: '일은 잘하는데 건강·관계·휴식이 무너지는 패턴',
    escapeStrategy: '주 1회 비주류 영역에 의도적으로 시간 배정 (calc상 약한 오행 활동 우선)',
    match: ({ elements }) => {
      const ev: LifeTrap['evidence'] = [];
      let s = 0;
      if (elements.excessive.length > 0) {
        s += 25; ev.push({ source: 'elementExcess', description: `과다 오행 ${elements.excessive.join(',')}` });
      }
      return { score: s, evidence: ev };
    },
  },
];

export function detectLifeTraps(args: MatchArgs): LifeTrap[] {
  const scored = TEMPLATES
    .map(t => ({ tpl: t, ...t.match(args) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 5);
  return top.map((s, i) => ({
    name: s.tpl.name,
    category: s.tpl.category,
    evidence: s.evidence,
    patternDescription: s.tpl.patternDescription,
    realLifeScene: s.tpl.realLifeScene,
    escapeStrategy: s.tpl.escapeStrategy,
    riskScore: Math.min(100, s.score),
    displayPriority: 5 - i,
  }));
}
