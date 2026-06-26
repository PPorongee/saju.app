// 올해운세 — 신살 활성화 (deterministic)
//
// 역할: 올해 세운(년) 지지가 원국과 만나 "동하는" 신살을 계산한다.
//   - 역마動 → 이사·이직·출장·이동 신호
//   - 도화動 → 새 인연·매력·대인 흐름
//   - 문창   → 시험·자격·문서·배움 유리
//   - 화개動 → 정리·몰입·내면 다듬기
//   - 천을귀인 → 결정적 순간 도움(귀인)
//
// 설계 원칙:
//   - "올해 세운 지지가 신살 자리에 들어왔는가"(source:'year')만 본다. 타고난 원국
//     신살(분석기 analyzeSpecialStars)과 달리, 이건 "올해 그 별이 켜지는가"의 신호다.
//   - 동하는 신살이 없으면 빈 배열 → 기존(specialStarsActivated:[])과 동일하게 무영향.
//   - 공포 해석 금지. 전부 가능성·활용 톤(yearlyReportValidator도 공포 신살 해석 차단).
//   - 도화/역마/화개는 삼합 기준(년지·일지)에서 target 지지를 구해, 세운 지지와 일치 시 활성.
//   - 문창/천을은 일간 기준 지지. 세운 지지가 그 자리에 들어오면 활성.

import type { FourPillars } from '../calendar/pillarCalculator';
import type { EarthlyBranch } from '../rules/earthlyBranches';
import type { HeavenlyStem } from '../rules/heavenlyStems';
import { CHEONEUL, MUNCHANG, doHwaFor, yeokMaFor, hwaGaeFor } from '../rules/specialStars';
import type { ActivatedSpecialStar } from './yearlyTypes';

/**
 * 올해 세운 지지가 동하게 하는 신살을 계산한다.
 * @param natal 원국 사주
 * @param sewoonBranch 올해 세운 지지 (한글 1자)
 * @param dayMaster 일간
 */
export function buildYearlySpecialStars(
  natal: FourPillars,
  sewoonBranch: EarthlyBranch,
  dayMaster: HeavenlyStem,
): ActivatedSpecialStar[] {
  const out: ActivatedSpecialStar[] = [];
  const yearB = natal.year.branch;
  const dayB = natal.day.branch;

  // 역마 — 이동·변화
  if (sewoonBranch === yeokMaFor(yearB) || sewoonBranch === yeokMaFor(dayB)) {
    out.push({
      name: '역마',
      source: 'year',
      plainMeaning: '이동·변화·먼 곳과의 인연이 늘어나는 결',
      yearlyMeaning:
        '올해는 이사·이직·출장·여행처럼 자리를 옮기거나 활동 반경이 넓어지는 흐름이 생길 수 있어요. 변화를 막기보다 방향을 정해 움직일 때 운이 살아납니다.',
      caution: '잦은 변화로 산만해지지 않게 한 방향을 정해 두는 편이 좋아요.',
    });
  }

  // 도화 — 매력·인연
  if (sewoonBranch === doHwaFor(yearB) || sewoonBranch === doHwaFor(dayB)) {
    out.push({
      name: '도화',
      source: 'year',
      plainMeaning: '사람을 끌어당기는 매력·인연의 결',
      yearlyMeaning:
        '올해는 새로운 인연이나 대인관계에서 시선을 끄는 흐름이 생길 수 있어요. 매력이 올라오는 만큼 좋은 만남으로 이어지기 쉽습니다.',
      caution: '관계가 가벼워지지 않게 거리와 기준을 함께 챙기세요.',
    });
  }

  // 화개 — 몰입·정리
  if (sewoonBranch === hwaGaeFor(yearB) || sewoonBranch === hwaGaeFor(dayB)) {
    out.push({
      name: '화개',
      source: 'year',
      plainMeaning: '혼자 정리하고 깊이 몰입할 때 빛나는 결',
      yearlyMeaning:
        '올해는 한 발 물러나 정리·연구·배움·내면을 다듬을 때 깊어지는 흐름이에요. 조용히 실력을 쌓아 두기 좋은 해입니다.',
    });
  }

  // 문창귀인 — 시험·학업·문서
  if (sewoonBranch === MUNCHANG[dayMaster]) {
    out.push({
      name: '문창귀인',
      source: 'year',
      plainMeaning: '공부·시험·글로 풀리는 학자형 결',
      yearlyMeaning:
        '올해는 시험·자격·문서·배움에서 결과가 잘 따라오는 흐름이에요. 미루던 공부나 자격 도전을 시작하기 좋습니다.',
    });
  }

  // 천을귀인 — 귀인의 도움
  if ((CHEONEUL[dayMaster] ?? []).includes(sewoonBranch)) {
    out.push({
      name: '천을귀인',
      source: 'year',
      plainMeaning: '결정적 순간에 사람·정보·조언이 붙는 귀인의 결',
      yearlyMeaning:
        '올해는 막힐 때 도와줄 사람이나 정보가 붙어 풀리는 흐름이 생길 수 있어요. 혼자 끌어안기보다 도움을 청할 때 운이 열립니다.',
    });
  }

  return out;
}
