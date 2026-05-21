import type { Lang } from './i18n';

export interface UserData {
  name: string;
  gender: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  concern: number;
  state: number;
  personality: number[];
  relationship: number;
  wantToKnow: number;
  isLunar?: boolean;
  lang?: Lang;
  exactHour?: number;
  exactMinute?: number;
  useExactTime?: boolean;
}
