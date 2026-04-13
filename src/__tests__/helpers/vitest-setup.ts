/**
 * Global test setup for vitest + jsdom
 * Stubs browser APIs that jsdom does not implement.
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Stub navigator.serviceWorker (SajuApp registers SW on mount)
if (!('serviceWorker' in navigator)) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register: vi.fn(() => Promise.resolve({ scope: '/' })) },
    writable: true,
  });
}

// Stub window.matchMedia (CSS media queries are not evaluated in jsdom)
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    writable: true,
  });
}

// Stub URL.createObjectURL / revokeObjectURL (used by shareResult)
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}

// Stub navigator.share
Object.defineProperty(navigator, 'share', {
  value: vi.fn(() => Promise.resolve()),
  writable: true,
  configurable: true,
});

// Stub navigator.canShare
Object.defineProperty(navigator, 'canShare', {
  value: vi.fn(() => false),
  writable: true,
  configurable: true,
});

// Stub HTMLCanvasElement.prototype.getContext (for html2canvas)
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  arc: vi.fn(),
  font: '',
  textAlign: '',
  textBaseline: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Stub HTMLCanvasElement.prototype.toBlob
HTMLCanvasElement.prototype.toBlob = vi.fn(function (this: HTMLCanvasElement, callback: BlobCallback) {
  callback(new Blob(['mock'], { type: 'image/png' }));
}) as unknown as typeof HTMLCanvasElement.prototype.toBlob;

// Suppress Google Fonts link errors in jsdom
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('fonts.googleapis.com') || msg.includes('Not implemented') || msg.includes('Error: Could not parse CSS stylesheet')) return;
  originalError.apply(console, args);
};
