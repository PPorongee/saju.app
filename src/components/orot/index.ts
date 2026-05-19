/**
 * 별빛 사주 · Orot Redesign — Shared atoms
 *
 * Import 예:
 *   import { BleedCard, FeatureCard, Sajupan, WuxingStrip, TabBar, PageHead } from '@/components/orot';
 *
 * 모든 컴포넌트는 globals.css의 `--orot-*` 토큰과 `.orot-*` 유틸리티 클래스를 사용한다.
 * 부모 컨테이너에 `orot-root` 클래스를 붙이면 폰트/색이 자동 적용된다.
 */
export { default as BleedCard } from './BleedCard';
export { default as FeatureCard } from './FeatureCard';
export { default as Sajupan } from './Sajupan';
export type { SajupanChart, SajupanPillar, OrotElement } from './Sajupan';
export { default as WuxingStrip } from './WuxingStrip';
export { default as TabBar } from './TabBar';
export type { TabKey } from './TabBar';
export { default as PageHead } from './PageHead';
export { default as BackBtn } from './BackBtn';
export { default as NextCircle } from './NextCircle';
export { getFraming } from './framing';
