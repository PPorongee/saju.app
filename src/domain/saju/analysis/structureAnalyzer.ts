// 격국 (格局) — 월지 중심으로 사주의 구조 형태 결정.
//
// 단계:
//  1. 월지 본기 천간 → 일간 기준 십성 = primary 격
//  2. 그 십성이 비겁(自)이면 → 월지 중기/여기 또는 천간 투출 십성 중 강한 것
//  3. 둘 다 모호하면 → '일반격' 또는 '잡기격'
//  4. 종격(從格) — 일간 외 한 오행이 절대 다수일 때 (간단 휴리스틱)

import type { FourPillars } from '../calendar/pillarCalculator';
import type { TenGodAnalysis, ElementStrengthAnalysis, TenGod } from '../report/sajuReportSchema';
import { calcTenGod, TEN_GOD_CATEGORY } from '../rules/tenGods';
import { HIDDEN_STEMS } from '../rules/hiddenStems';

export interface StructureAnalysis {
  name: string;                  // 예: '편관격', '식신격', '잡기격', '일반격', '종재격'
  primary: TenGod | null;        // 격의 근거 십성
  source: 'monthBranchPrimary' | 'monthBranchMiddleResidual' | 'transparentStem' | 'jongGyeok' | 'general';
  notes: string[];
}

export function analyzeStructure(
  pillars: FourPillars,
  tenGods: TenGodAnalysis,
  elements: ElementStrengthAnalysis,
): StructureAnalysis {
  const notes: string[] = [];
  const dm = pillars.dayMaster;

  // 1. 월지 본기 십성
  const monthPrimaryStem = HIDDEN_STEMS[pillars.month.branch].find(h => h.role === 'primary')!.stem;
  const monthPrimaryTg = calcTenGod(dm, monthPrimaryStem);
  notes.push(`월지 ${pillars.month.branch} 본기 ${monthPrimaryStem} → ${monthPrimaryTg}`);

  // 종격 휴리스틱 — 일간 오행이 isolated이고 다른 한 오행이 매우 강하면
  if (elements.isolated.length > 0 && elements.excessive.length > 0) {
    const isolatedSelf = elements.isolated.includes(pillars.day.stemElement);
    if (isolatedSelf) {
      const dominant = elements.excessive[0];
      notes.push(`일간 오행 ${pillars.day.stemElement} 고립 + ${dominant} 과다 → 종격 의심`);
      // 종재/종관/종아/종강 구분 (간단)
      const dominantTg = dominantElementToTenGod(pillars, dominant);
      if (dominantTg) {
        return {
          name: `종${dominantTg.endsWith('재') ? '재' : dominantTg.endsWith('관') ? '관' : dominantTg.endsWith('인') ? '인' : '강'}격`,
          primary: dominantTg,
          source: 'jongGyeok',
          notes,
        };
      }
    }
  }

  // 일반 격: 월지 본기 십성이 비겁이 아니면 그게 격
  const cat = TEN_GOD_CATEGORY[monthPrimaryTg];
  if (cat !== 'self') {
    return {
      name: `${monthPrimaryTg}격`,
      primary: monthPrimaryTg,
      source: 'monthBranchPrimary',
      notes,
    };
  }

  // 비겁이면 — 월지 중기/여기에서 다른 십성 찾기
  const monthOther = HIDDEN_STEMS[pillars.month.branch]
    .filter(h => h.role !== 'primary')
    .map(h => ({ stem: h.stem, tg: calcTenGod(dm, h.stem), weight: h.weight }))
    .filter(x => TEN_GOD_CATEGORY[x.tg] !== 'self')
    .sort((a, b) => b.weight - a.weight);
  if (monthOther.length > 0) {
    notes.push(`월지 비겁 → 중기/여기 ${monthOther[0].stem}(${monthOther[0].tg}) 채택`);
    return {
      name: `${monthOther[0].tg}격`,
      primary: monthOther[0].tg,
      source: 'monthBranchMiddleResidual',
      notes,
    };
  }

  // 그래도 비겁밖에 없으면 — 천간 투출 십성 중 가장 강한 것
  const transparent = tenGods.visible
    .filter(v => TEN_GOD_CATEGORY[v.tenGod] !== 'self')
    .sort((a, b) => (tenGods.totals[b.tenGod] ?? 0) - (tenGods.totals[a.tenGod] ?? 0));
  if (transparent.length > 0) {
    notes.push(`월지 비겁 + 중기/여기도 비겁 → 천간 투출 ${transparent[0].source}(${transparent[0].tenGod}) 채택`);
    return {
      name: `${transparent[0].tenGod}격`,
      primary: transparent[0].tenGod,
      source: 'transparentStem',
      notes,
    };
  }

  notes.push('명확한 격 없음 — 일반격으로 분류');
  return {
    name: '일반격',
    primary: null,
    source: 'general',
    notes,
  };
}

function dominantElementToTenGod(pillars: FourPillars, dom: import('../rules/elements').Element): TenGod | null {
  // dom 오행을 천간으로 변환 (양간 대표): wood=갑, fire=병, ...
  const repStem: Record<string, import('../rules/heavenlyStems').HeavenlyStem> = {
    wood: '갑', fire: '병', earth: '무', metal: '경', water: '임',
  };
  const stem = repStem[dom];
  if (!stem) return null;
  return calcTenGod(pillars.dayMaster, stem);
}
