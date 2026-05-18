import { describe, test, expect, it } from 'vitest';
import * as fs from 'node:fs';
import { buildSajuPrompts } from '@/lib/saju-prompt-builder';
import { calcSaju, getOhCount } from '@/lib/saju-calc';
import type { UserData } from '@/lib/saju-prompt';

const sj = { yStem:0,yBranch:0,mStem:2,mBranch:2,dStem:4,dBranch:4,hStem:6,hBranch:6,sajuYear:1990,sajuMonthIdx:3 };
const oh = {'목':2,'화':1,'토':3,'금':1,'수':1};
const mkUser = (o: Partial<UserData> = {}): UserData => ({
  name:'Test',gender:'m',year:1990,month:5,day:15,hour:6,
  concern:0,state:0,personality:[0,0,0],relationship:0,wantToKnow:0,...o
});

describe('buildSajuPrompts', () => {
  test('returns 3 prompts', () => {
    const r = buildSajuPrompts(sj,oh,mkUser());
    expect(r).toHaveLength(3);
  });
  test('prompts are non-empty strings', () => {
    buildSajuPrompts(sj,oh,mkUser()).forEach(p => {
      expect(typeof p).toBe('string');
      expect(p.length).toBeGreaterThan(100);
    });
  });
  test('ko mode no English instruction', () => {
    const r = buildSajuPrompts(sj,oh,mkUser({lang:'ko'}));
    expect(r[0]).not.toContain('CRITICAL LANGUAGE INSTRUCTION');
  });
  test('en mode has English instruction', () => {
    const r = buildSajuPrompts(sj,oh,mkUser({lang:'en'}));
    expect(r[0]).toContain('CRITICAL LANGUAGE INSTRUCTION');
    expect(r[1]).toContain('FINAL REMINDER');
  });
  test('prompt1 ##1-##4, prompt2 ##5-##8, prompt3 ##9-##12 (unmarried)', () => {
    const r = buildSajuPrompts(sj,oh,mkUser({relationship:0}));
    for (let i=1;i<=4;i++) expect(r[0]).toContain('##'+i+'.');
    for (let i=5;i<=8;i++) expect(r[1]).toContain('##'+i+'.');
    for (let i=9;i<=12;i++) expect(r[2]).toContain('##'+i+'.');
  });
  test('prompt3 has ##11 ##12', () => {
    const r = buildSajuPrompts(sj,oh,mkUser());
    expect(r[2]).toContain('##11.'); expect(r[2]).toContain('##12.');
  });
  test('married has spouse section, unmarried has love section', () => {
    const m = buildSajuPrompts(sj,oh,mkUser({relationship:3}));
    const u = buildSajuPrompts(sj,oh,mkUser({relationship:0}));
    expect(m[0]).toContain('부부 관계');
    expect(u[0]).toContain('연애 & 결혼 타이밍');
  });
  test('includes user name', () => {
    const r = buildSajuPrompts(sj,oh,mkUser({name:'Alice'}));
    expect(r[0]).toContain('Alice');
  });

  it('debug: 이서은 사주(1995-07-06 11:49)로 prompt 3개 파일 저장', () => {
    const eseo = calcSaju(1995, 7, 6, 6);
    const eseoOh = getOhCount(eseo);
    const user = mkUser({
      name: '이서은', gender: 'f',
      year: 1995, month: 7, day: 6, hour: 6,
      concern: 1, state: 1, personality: [0, 1, 0], relationship: 0, wantToKnow: 1,
    });
    const prompts = buildSajuPrompts(eseo, eseoOh, user);
    fs.writeFileSync('eseo-prompt-1.txt', prompts[0], 'utf8');
    fs.writeFileSync('eseo-prompt-2.txt', prompts[1], 'utf8');
    fs.writeFileSync('eseo-prompt-3.txt', prompts[2], 'utf8');
    expect(prompts[0].length).toBeGreaterThan(0);
  });
});
