import { describe, it, expect } from 'vitest';
import { buildYearlySpecialStars } from '../yearly/yearlySpecialStars';
import { doHwaFor, yeokMaFor, hwaGaeFor, MUNCHANG, CHEONEUL } from '../rules/specialStars';

// 최소 FourPillars (buildYearlySpecialStars는 year.branch / day.branch / dayMaster만 사용)
function natal(yearBranch: string, dayBranch: string, dayMaster: string): any {
  return {
    year: { stem: '갑', branch: yearBranch },
    month: { stem: '갑', branch: '자' },
    day: { stem: dayMaster, branch: dayBranch },
    hour: undefined,
    dayMaster,
  };
}

const ALL_BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

describe('buildYearlySpecialStars — 올해 세운이 동하게 하는 신살', () => {
  it('세운 지지가 역마 자리면 역마 활성 (source=year)', () => {
    const n = natal('오', '오', '갑');
    const stars = buildYearlySpecialStars(n, yeokMaFor('오') as any, '갑');
    expect(stars.some(s => s.name === '역마' && s.source === 'year')).toBe(true);
  });

  it('세운 지지가 도화 자리면 도화 활성', () => {
    const n = natal('오', '오', '갑');
    const stars = buildYearlySpecialStars(n, doHwaFor('오') as any, '갑');
    expect(stars.some(s => s.name === '도화')).toBe(true);
  });

  it('세운 지지가 화개 자리면 화개 활성', () => {
    const n = natal('오', '오', '갑');
    const stars = buildYearlySpecialStars(n, hwaGaeFor('오') as any, '갑');
    expect(stars.some(s => s.name === '화개')).toBe(true);
  });

  it('세운 지지가 문창 자리면 문창귀인 활성', () => {
    const n = natal('오', '오', '갑');
    const stars = buildYearlySpecialStars(n, MUNCHANG['갑'] as any, '갑');
    expect(stars.some(s => s.name === '문창귀인')).toBe(true);
  });

  it('세운 지지가 천을귀인 자리면 천을귀인 활성', () => {
    const n = natal('오', '오', '갑');
    const stars = buildYearlySpecialStars(n, CHEONEUL['갑'][0] as any, '갑');
    expect(stars.some(s => s.name === '천을귀인')).toBe(true);
  });

  it('어느 신살 자리도 아니면 빈 배열 (기존 동작과 동일)', () => {
    const n = natal('오', '오', '갑');
    const triggers = new Set<string>([
      yeokMaFor('오'), doHwaFor('오'), hwaGaeFor('오'),
      yeokMaFor('오'), doHwaFor('오'), hwaGaeFor('오'),
      MUNCHANG['갑'], ...CHEONEUL['갑'],
    ]);
    const free = ALL_BRANCHES.find(b => !triggers.has(b));
    expect(free).toBeDefined();
    const stars = buildYearlySpecialStars(n, free as any, '갑');
    expect(stars.length).toBe(0);
  });

  it('활성 신살은 yearlyMeaning이 있고 공포 단어를 쓰지 않는다', () => {
    const n = natal('오', '오', '갑');
    const stars = buildYearlySpecialStars(n, yeokMaFor('오') as any, '갑');
    for (const s of stars) {
      expect(s.yearlyMeaning.length).toBeGreaterThan(10);
      expect(s.plainMeaning.length).toBeGreaterThan(5);
      expect(/사망|파산|사고|죽음|이혼 확정/.test(s.yearlyMeaning)).toBe(false);
    }
  });
});
