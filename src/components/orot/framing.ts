/**
 * BleedCard 의 이미지 위치/스케일 — 디자인 캔버스에서 사용자가 reframe한 offset/scale.
 * 원본: public/images/orot/framing.json (배포 자산 동기화용 사본)
 */
type Frame = { scale: number; offsetX: number; offsetY: number };

const FRAMING: Record<string, Frame> = {
  'home-hero-character': { scale: 1, offsetX: 9.07, offsetY: 0 },
  'home-feat-saju':      { scale: 1, offsetX: 0, offsetY: 0 },
  'home-feat-compat':    { scale: 1, offsetX: -10.30, offsetY: 0 },
  'home-feat-baby':      { scale: 1, offsetX: 8.47, offsetY: 0 },
  'home-feat-saju-hero':   { scale: 1, offsetX: 0, offsetY: 0 },
  'home-feat-year-hero':   { scale: 1, offsetX: -11.67, offsetY: 0 },
  'home-feat-compat-hero': { scale: 1, offsetX: 20, offsetY: 0 },
  'home-feat-baby-hero':   { scale: 1, offsetX: 8.47, offsetY: 40 },
  'home-feat-year':      { scale: 1, offsetX: -11.67, offsetY: 0 },
  'home-history-character': { scale: 1, offsetX: -3.31, offsetY: 0 },
  'year-character':      { scale: 1, offsetX: 0, offsetY: 0 },
  'compat-character':    { scale: 1, offsetX: -25.81, offsetY: 0 },
  'saju-in-character':   { scale: 1, offsetX: 2.87, offsetY: 0 },
  'baby-character':      { scale: 1, offsetX: 23.30, offsetY: 0 },
};

const DEFAULT: Frame = { scale: 1, offsetX: 0, offsetY: 0 };

export function getFraming(id: string): Frame {
  return FRAMING[id] ?? DEFAULT;
}
