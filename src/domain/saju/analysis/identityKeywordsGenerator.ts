// 나만의 사주 키워드 5개 (spec §2, §3-1).
//
// 일간·강한 십성·강한 오행·격국·signature SpecialPoint를 조합해 사주 정체성 키워드 산출.
// GPT는 이 5개를 풀어쓰기만 — 자기 마음대로 새 키워드 만들면 안 됨.

import type { FourPillars } from '../calendar/pillarCalculator';
import type {
  IdentityKeyword, TenGodAnalysis, ElementStrengthAnalysis,
  DayMasterStrengthAnalysis, UsefulGodAnalysis, SpecialPoint,
} from '../report/sajuReportSchema';
import type { StructureAnalysis } from './structureAnalyzer';

interface Template {
  id: string;
  keyword: string;
  shortDescription: string;
  narrativeHint: string;
  /** 매칭 점수 반환 (0이면 미적용) */
  match(args: MatchArgs): { score: number; evidence: IdentityKeyword['evidence'] };
}

interface MatchArgs {
  pillars: FourPillars;
  tenGods: TenGodAnalysis;
  elements: ElementStrengthAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  structure: StructureAnalysis;
  usefulGod: UsefulGodAnalysis;
  specialPoints: SpecialPoint[];
}

const TEMPLATES: Template[] = [
  {
    id: 'standard-clear',
    keyword: '기준이 분명한 사람',
    shortDescription: '사람·상황을 볼 때 감정보다 기준과 일관성을 먼저 보는 타입',
    narrativeHint: '차갑다기보다 기준 없는 관계에 에너지를 쓰기 어려운 사람으로 설명',
    match: ({ pillars, elements, tenGods }) => {
      const ev: IdentityKeyword['evidence'] = [];
      let s = 0;
      if (pillars.day.stemElement === 'metal') { s += 3; ev.push({ source: 'dayMaster', description: `일간 ${pillars.dayMaster}(금)` }); }
      if (elements.strongest.includes('metal')) { s += 2; ev.push({ source: 'elementStrength', description: '금 기운이 강함' }); }
      if (tenGods.totals['정관'] + tenGods.totals['편관'] >= 1.5) { s += 2; ev.push({ source: 'tenGod', description: `관성 합 ${(tenGods.totals['정관']+tenGods.totals['편관']).toFixed(2)}` }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'result-over-talk',
    keyword: '말보다 결과로 증명하는 타입',
    shortDescription: '말을 늘리는 것보다 만들어낸 결과로 자기를 보여주는 쪽',
    narrativeHint: '식상 강이지만 입보다 결과물·작품으로 표현하는 결을 강조',
    match: ({ tenGods, elements }) => {
      const ev: IdentityKeyword['evidence'] = [];
      let s = 0;
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      if (out >= 1.5) { s += 2; ev.push({ source: 'tenGod', description: `식상 합 ${out.toFixed(2)}` }); }
      if (elements.strongest.includes('earth') || elements.strongest.includes('metal')) {
        s += 1; ev.push({ source: 'elementStrength', description: '토·금 기운이 결과로 응축' });
      }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'noble-pull-people',
    keyword: '결정적 순간에 사람이 붙는 구조',
    shortDescription: '위기 때 사람·정보·연결이 들어오는 귀인의 별',
    narrativeHint: '천을귀인 같은 구조가 살아 있어 막힐 때마다 사람이 길을 여는 결',
    match: ({ specialPoints }) => {
      const sp = specialPoints.find(p => p.id === 'cheoneulStrong');
      if (!sp) return { score: 0, evidence: [] };
      return { score: 4, evidence: [{ source: 'specialPoint', description: sp.title }] };
    },
  },
  {
    id: 'talent-to-money',
    keyword: '돈 되는 재능을 밖으로 꺼내야 하는 사주',
    shortDescription: '아이디어가 결과물·서비스·콘텐츠로 외화될 때 돈이 들어오는 구조',
    narrativeHint: '식상생재가 핵심. 머릿속에서만 굴리면 돈 흐름 막힘',
    match: ({ specialPoints, tenGods }) => {
      const sp = specialPoints.find(p => p.id === 'sikSangSaengJae');
      if (sp) return { score: 4, evidence: [{ source: 'specialPoint', description: sp.title }] };
      const out = tenGods.totals['식신'] + tenGods.totals['상관'];
      const wealth = tenGods.totals['편재'] + tenGods.totals['정재'];
      if (out >= 1 && wealth >= 1) {
        return { score: 2, evidence: [{ source: 'tenGod', description: `식상 ${out.toFixed(1)} + 재성 ${wealth.toFixed(1)}` }] };
      }
      return { score: 0, evidence: [] };
    },
  },
  {
    id: 'deep-alone',
    keyword: '혼자 정리할 때 깊어지는 사람',
    shortDescription: '관계 속이 아니라 정리·몰입의 시간 속에서 깊이가 만들어지는 결',
    narrativeHint: '화개·인성왕 — 빠른 반응보다 오래 남는 결과물에서 강점이 살아남',
    match: ({ specialPoints, tenGods }) => {
      const ev: IdentityKeyword['evidence'] = [];
      let s = 0;
      const sp = specialPoints.find(p => p.id === 'hwagaeDepth');
      if (sp) { s += 3; ev.push({ source: 'specialPoint', description: sp.title }); }
      const sup = tenGods.totals['정인'] + tenGods.totals['편인'];
      if (sup >= 1.5) { s += 2; ev.push({ source: 'tenGod', description: `인성 합 ${sup.toFixed(2)}` }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'never-break',
    keyword: '쉽게 꺾이지 않는 버티는 힘',
    shortDescription: '자기 기준이 분명하고 위기 때 끝까지 버티는 결',
    narrativeHint: '양인·괴강·비겁 강 — 결단·돌파의 자산. 단 협업에선 합의 시간 필요',
    match: ({ specialPoints, tenGods }) => {
      const ev: IdentityKeyword['evidence'] = [];
      let s = 0;
      const sp = specialPoints.find(p => p.id === 'strongSurvival');
      if (sp) { s += 4; ev.push({ source: 'specialPoint', description: sp.title }); }
      const self = tenGods.totals['비견'] + tenGods.totals['겁재'];
      if (self >= 1.5) { s += 2; ev.push({ source: 'tenGod', description: `비겁 합 ${self.toFixed(2)}` }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'inner-outer-different',
    keyword: '겉과 속이 다른 입체적인 사람',
    shortDescription: '사회적 얼굴과 가까운 관계 안의 결이 다른 반전 구조',
    narrativeHint: '천간과 지장간의 십성 방향 차이를 자산으로 보고, 가까운 관계엔 열어두는 결',
    match: ({ specialPoints }) => {
      const sp = specialPoints.find(p => p.id === 'innerOuterContrast');
      if (!sp) return { score: 0, evidence: [] };
      return { score: 4, evidence: [{ source: 'specialPoint', description: sp.title }] };
    },
  },
  {
    id: 'change-makes-luck',
    keyword: '움직임 속에서 답을 찾는 사람',
    shortDescription: '한 자리 고정보다 환경 변화에서 감각이 살아나는 결',
    narrativeHint: '역마 — 이직·이사·해외·새 프로젝트에서 판단력이 빨라짐',
    match: ({ specialPoints }) => {
      const sp = specialPoints.find(p => p.id === 'yeokMaMovement');
      if (!sp) return { score: 0, evidence: [] };
      return { score: 3, evidence: [{ source: 'specialPoint', description: sp.title }] };
    },
  },
  {
    id: 'magnet-presence',
    keyword: '존재감으로 시선을 끄는 사람',
    shortDescription: '의도 안 해도 분위기·말맛으로 기억에 남는 결',
    narrativeHint: '도화·홍염·식상 — 진심 담은 표현이 가장 큰 자산',
    match: ({ specialPoints }) => {
      const sp = specialPoints.find(p => p.id === 'peachBlossomExpression' || p.id === 'hongyeomCharm');
      if (!sp) return { score: 0, evidence: [] };
      return { score: 3, evidence: [{ source: 'specialPoint', description: sp.title }] };
    },
  },
  {
    id: 'authority-grows',
    keyword: '책임이 커질수록 빛나는 사람',
    shortDescription: '직책·자격·역할이 주어지면 실력이 정리되는 구조',
    narrativeHint: '관인상생 — 자유보다 인정받는 틀 안에서 성장',
    match: ({ specialPoints }) => {
      const sp = specialPoints.find(p => p.id === 'gwanInSangSaeng');
      if (!sp) return { score: 0, evidence: [] };
      return { score: 3, evidence: [{ source: 'specialPoint', description: sp.title }] };
    },
  },
  {
    id: 'wood-grows-up',
    keyword: '꾸준히 자라는 결을 가진 사람',
    shortDescription: '한 번에 폭발하는 결이 아니라 누적해서 자라는 식의 성장',
    narrativeHint: '갑·을 일간 또는 목 강 — 시간이 자산이 되는 사람',
    match: ({ pillars, elements }) => {
      const ev: IdentityKeyword['evidence'] = [];
      let s = 0;
      if (pillars.day.stemElement === 'wood') { s += 2; ev.push({ source: 'dayMaster', description: `일간 ${pillars.dayMaster}(목)` }); }
      if (elements.strongest.includes('wood')) { s += 1; ev.push({ source: 'elementStrength', description: '목 기운이 강함' }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'water-reads-flow',
    keyword: '흐름을 읽는 사람',
    shortDescription: '상황·사람의 결을 빠르게 읽는 통찰의 결',
    narrativeHint: '임·계 일간 또는 수 강 — 깊은 통찰이 자산',
    match: ({ pillars, elements }) => {
      const ev: IdentityKeyword['evidence'] = [];
      let s = 0;
      if (pillars.day.stemElement === 'water') { s += 2; ev.push({ source: 'dayMaster', description: `일간 ${pillars.dayMaster}(수)` }); }
      if (elements.strongest.includes('water')) { s += 1; ev.push({ source: 'elementStrength', description: '수 기운이 강함' }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'earth-foundation',
    keyword: '안정 위에 단단히 서는 사람',
    shortDescription: '주변이 흔들려도 자기 자리를 지키는 결',
    narrativeHint: '무·기 일간 또는 토 강 — 신뢰가 자산',
    match: ({ pillars, elements }) => {
      const ev: IdentityKeyword['evidence'] = [];
      let s = 0;
      if (pillars.day.stemElement === 'earth') { s += 2; ev.push({ source: 'dayMaster', description: `일간 ${pillars.dayMaster}(토)` }); }
      if (elements.strongest.includes('earth')) { s += 1; ev.push({ source: 'elementStrength', description: '토 기운이 강함' }); }
      return { score: s, evidence: ev };
    },
  },
  {
    id: 'fire-warms-room',
    keyword: '공간을 밝히는 사람',
    shortDescription: '존재만으로 분위기를 데우는 결',
    narrativeHint: '병·정 일간 또는 화 강 — 영향력·표현이 자산',
    match: ({ pillars, elements }) => {
      const ev: IdentityKeyword['evidence'] = [];
      let s = 0;
      if (pillars.day.stemElement === 'fire') { s += 2; ev.push({ source: 'dayMaster', description: `일간 ${pillars.dayMaster}(화)` }); }
      if (elements.strongest.includes('fire')) { s += 1; ev.push({ source: 'elementStrength', description: '화 기운이 강함' }); }
      return { score: s, evidence: ev };
    },
  },
];

export function generateIdentityKeywords(args: MatchArgs): IdentityKeyword[] {
  const scored: Array<{ tpl: Template; score: number; evidence: IdentityKeyword['evidence'] }> = [];
  for (const tpl of TEMPLATES) {
    const r = tpl.match(args);
    if (r.score > 0) scored.push({ tpl, score: r.score, evidence: r.evidence });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);
  return top.map((s, i) => ({
    keyword: s.tpl.keyword,
    shortDescription: s.tpl.shortDescription,
    evidence: s.evidence,
    narrativeHint: s.tpl.narrativeHint,
    displayPriority: 5 - i,
  }));
}
