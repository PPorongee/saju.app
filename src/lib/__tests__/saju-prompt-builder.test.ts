import { describe, test, expect } from 'vitest';
import { buildSajuPrompts } from '@/lib/saju-prompt-builder';
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
  test('prompt1 has ##1-##4, prompt2 has ##5-##10 (unmarried)', () => {
    const r = buildSajuPrompts(sj,oh,mkUser({relationship:0}));
    for (let i=1;i<=4;i++) expect(r[0]).toContain('##'+i+'.');
    for (let i=5;i<=10;i++) expect(r[1]).toContain('##'+i+'.');
  });
  test('prompt3 has ##11 ##12', () => {
    const r = buildSajuPrompts(sj,oh,mkUser());
    expect(r[2]).toContain('##11.'); expect(r[2]).toContain('##12.');
  });
  test('married has spouse section, unmarried has love section', () => {
    const m = buildSajuPrompts(sj,oh,mkUser({relationship:3}));
    const u = buildSajuPrompts(sj,oh,mkUser({relationship:0}));
    expect(m[1]).toContain('부부 관계');
    expect(u[1]).toContain('연애 & 인연의 지도');
  });
  test('includes user name', () => {
    const r = buildSajuPrompts(sj,oh,mkUser({name:'Alice'}));
    expect(r[0]).toContain('Alice');
  });
});
