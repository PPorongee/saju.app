// 내 사주의 무기 3~5개 (spec §3-2).
// 실제 삶에서 강점으로 쓸 수 있는 능력 — 단순 칭찬 X, 명리 근거 + 활용법 + 그림자 모두 포함.

import type { FourPillars } from '../calendar/pillarCalculator';
import type {
  LifeWeapon, LifeWeaponCategory, TenGodAnalysis,
  ElementStrengthAnalysis, DayMasterStrengthAnalysis,
  UsefulGodAnalysis, SpecialPoint, FortuneCycleInfo,
} from '../report/sajuReportSchema';

interface MatchArgs {
  pillars: FourPillars;
  tenGods: TenGodAnalysis;
  elements: ElementStrengthAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  usefulGod: UsefulGodAnalysis;
  specialPoints: SpecialPoint[];
  fortune: FortuneCycleInfo;
}

interface Template {
  id: string;
  name: string;
  category: LifeWeaponCategory;
  realLifeScene: string;
  howToUse: string;
  caution: string;
  match(args: MatchArgs): { score: number; evidence: LifeWeapon['evidence'] };
}

const TEMPLATES: Template[] = [
  {
    id: 'critical-judgment',
    name: '복잡한 상황에서 핵심을 가르는 판단력',
    category: 'judgment',
    realLifeScene: '회의·협상·문제 해결·사람 판단에서 곁가지 잘라내는 능력',
    howToUse: '판단은 빠르게 하되 표현은 한 박자 부드럽게 — 상대가 날카로움에 위축되지 않게',
    caution: '판단이 너무 빠르면 정보 부족 상태에서 결론 내리는 risk',
    match: ({ pillars, elements, tenGods }) => {
      const ev: LifeWeapon['evidence'] = [];
      let s = 0;
      if (elements.strongest.includes('metal')) { s += 30; ev.push({ source: 'element', description: '금 기운 강' }); }
      if (pillars.day.stemElement === 'metal') { s += 20; ev.push({ source: 'tenGod', description: '일간 금' }); }
      const auth = tenGods.totals['정관'] + tenGods.totals['편관'];
      if (auth >= 1.2) { s += 15; ev.push({ source: 'tenGod', description: `관성 ${auth.toFixed(2)}` }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'consistency-read',
    name: '사람의 말보다 행동의 일관성을 보는 감각',
    category: 'judgment',
    realLifeScene: '말은 좋은데 행동이 어긋나는 사람을 빠르게 알아채는 결',
    howToUse: '직감을 메모로 외화 — 나중에 검증되면 자기 신뢰 강화',
    caution: '의심이 깊어지면 관계 시작 자체가 늦어짐',
    match: ({ tenGods, specialPoints }) => {
      const ev: LifeWeapon['evidence'] = [];
      let s = 0;
      const sup = tenGods.totals['정인'] + tenGods.totals['편인'];
      if (sup >= 1.2) { s += 25; ev.push({ source: 'tenGod', description: `인성 ${sup.toFixed(2)} — 관찰력` }); }
      if (specialPoints.some(p => p.id === 'innerOuterContrast')) {
        s += 20; ev.push({ source: 'specialPoint', description: '반전 구조 — 안팎의 차이를 읽는 감각' });
      }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'endurance',
    name: '위기 때 끝까지 버티는 힘',
    category: 'persistence',
    realLifeScene: '주변이 흔들릴 때 자기 자리 지키는 결. 긴 프로젝트·장기 목표에 강함',
    howToUse: '자기 기준을 자산으로 쓰되, 협업 자리에선 합의 시간을 의도적으로 확보',
    caution: '타협이 어려워 가까운 관계에 마찰 누적',
    match: ({ specialPoints, tenGods }) => {
      const ev: LifeWeapon['evidence'] = [];
      let s = 0;
      const sp = specialPoints.find(p => p.id === 'strongSurvival');
      if (sp) { s += 50; ev.push({ source: 'specialPoint', description: sp.title }); }
      const self = tenGods.totals['비견'] + tenGods.totals['겁재'];
      if (self >= 1.5) { s += 20; ev.push({ source: 'tenGod', description: `비겁 ${self.toFixed(2)}` }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'idea-to-output',
    name: '아이디어를 결과물로 바꾸는 능력',
    category: 'expression',
    realLifeScene: '생각을 말·문서·콘텐츠·제안서·서비스로 바꿀 때 강점이 살아남',
    howToUse: '완성도를 높이기 전에 작은 결과물부터 외부에 보여주는 방식',
    caution: '생각만 많고 결과물이 늦어지면 장점이 체감되지 않음',
    match: ({ tenGods, specialPoints }) => {
      const ev: LifeWeapon['evidence'] = [];
      let s = 0;
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      if (out >= 1.2) { s += 30; ev.push({ source: 'tenGod', description: `식상 ${out.toFixed(2)}` }); }
      if (specialPoints.some(p => p.id === 'sikSangSaengJae')) {
        s += 30; ev.push({ source: 'specialPoint', description: '식상생재 — 결과물이 돈으로 연결' });
      }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'memorable-expression',
    name: '사람을 설득하거나 기억에 남게 만드는 표현력',
    category: 'expression',
    realLifeScene: '같은 말을 해도 더 잘 전달되고, 같은 옷을 입어도 자기 색이 살아남',
    howToUse: '진심 담은 표현. 정중함과 매력의 균형',
    caution: '관심 받기 위해 자기 색을 흐리면 매력이 약해짐',
    match: ({ specialPoints }) => {
      const ev: LifeWeapon['evidence'] = [];
      let s = 0;
      const sp = specialPoints.find(p => p.id === 'peachBlossomExpression' || p.id === 'hongyeomCharm');
      if (sp) { s += 50; ev.push({ source: 'specialPoint', description: sp.title }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'noble-connector',
    name: '필요한 사람과 정보를 연결해 받는 힘',
    category: 'relationship',
    realLifeScene: '막힐 때마다 누군가 한마디를 더해주거나 우연한 만남이 길을 여는 결',
    howToUse: '닫지 말고 물어볼 것 — 도움 요청이 곧 작동 스위치',
    caution: '모든 사람한테 도움 받으려 하면 정작 핵심 조언자가 흐려짐',
    match: ({ specialPoints }) => {
      const ev: LifeWeapon['evidence'] = [];
      let s = 0;
      const sp = specialPoints.find(p => p.id === 'cheoneulStrong');
      if (sp) { s += 50; ev.push({ source: 'specialPoint', description: sp.title }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'deep-research',
    name: '한 주제를 깊게 파는 몰입력',
    category: 'learning',
    realLifeScene: '연구·기획·분석·글쓰기에서 다른 사람이 못 본 결을 잡음',
    howToUse: '인풋의 깊이를 자산화 — 정리한 결과물을 외부에 공개',
    caution: '인풋만 무한 반복하면 산출이 늦어짐',
    match: ({ specialPoints, tenGods }) => {
      const ev: LifeWeapon['evidence'] = [];
      let s = 0;
      const sp = specialPoints.find(p => p.id === 'hwagaeDepth');
      if (sp) { s += 40; ev.push({ source: 'specialPoint', description: sp.title }); }
      const sup = tenGods.totals['정인'] + tenGods.totals['편인'];
      if (sup >= 1.5) { s += 20; ev.push({ source: 'tenGod', description: `인성 ${sup.toFixed(2)}` }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'pivot-adapt',
    name: '변화 속에서 빠르게 적응하는 감각',
    category: 'creativity',
    realLifeScene: '환경 바뀌면 오히려 판단이 빨라지고, 새 사람·새 주제에 빠르게 녹아듦',
    howToUse: '의도적 변화를 일정에 배치 — 분기마다 새 도전·환경 전환',
    caution: '뿌리 없이 움직임만 반복하면 정리가 안 됨',
    match: ({ specialPoints }) => {
      const ev: LifeWeapon['evidence'] = [];
      const sp = specialPoints.find(p => p.id === 'yeokMaMovement');
      if (!sp) return { score: 0, evidence: [] };
      return { score: 40, evidence: [{ source: 'specialPoint', description: sp.title }] };
    },
  },
  {
    id: 'wealth-eye',
    name: '돈의 흐름을 읽는 감각',
    category: 'money',
    realLifeScene: '시장 변화·기회·가격 협상에서 다른 사람이 못 본 흐름을 잡음',
    howToUse: '큰돈을 한 번에 굴리기 전에 작게 검증. 여러 채널 동시 운영',
    caution: '관리가 약하면 큰돈이 빠르게 빠짐',
    match: ({ specialPoints, tenGods }) => {
      const ev: LifeWeapon['evidence'] = [];
      let s = 0;
      const sp = specialPoints.find(p => p.id === 'pyeonjaeStrong');
      if (sp) { s += 40; ev.push({ source: 'specialPoint', description: sp.title }); }
      if (tenGods.totals['편재'] >= 1.5) { s += 20; ev.push({ source: 'tenGod', description: `편재 ${tenGods.totals['편재'].toFixed(2)}` }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'responsibility-shine',
    name: '책임을 안을수록 단단해지는 결',
    category: 'career',
    realLifeScene: '직책·자격·역할이 주어지면 실력이 정리되는 자리에서 두각',
    howToUse: '인정받을 수 있는 틀 안에서 자격·자료를 꾸준히 쌓기',
    caution: '책임이 너무 크면 자기 검열로 실행이 늦어짐',
    match: ({ specialPoints }) => {
      const ev: LifeWeapon['evidence'] = [];
      const sp = specialPoints.find(p => p.id === 'gwanInSangSaeng' || p.id === 'sikSinJeSal');
      if (!sp) return { score: 0, evidence: [] };
      return { score: 40, evidence: [{ source: 'specialPoint', description: sp.title }] };
    },
  },
];

export function detectLifeWeapons(args: MatchArgs): LifeWeapon[] {
  const scored = TEMPLATES
    .map(t => ({ tpl: t, ...t.match(args) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 5);
  return top.map((s, i) => ({
    name: s.tpl.name,
    category: s.tpl.category,
    evidence: s.evidence,
    realLifeScene: s.tpl.realLifeScene,
    howToUse: s.tpl.howToUse,
    caution: s.tpl.caution,
    strengthScore: Math.min(100, s.score),
    displayPriority: 5 - i,
  }));
}
