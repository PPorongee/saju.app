<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-22 | Updated: 2026-04-05 -->

# app

## Purpose
Next.js App Router directory containing the root layout, home page, global styles, API routes, payment flow, and legal/policy pages for the Saju application.

## Key Files

| File | Description |
|------|-------------|
| `layout.tsx` | Root HTML layout — sets `lang="ko"`, loads Google Fonts (Noto Sans KR, Gamja Flower, Gowun Dodum), metadata for SEO |
| `page.tsx` | Home page — renders `<SajuApp />` component |
| `globals.css` | ~1115 lines of global CSS — dark cosmic theme with glassmorphism, star animations, pillar grids, payment UI, paywall UI, responsive styles |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `api/` | Backend API routes (see `api/AGENTS.md`) |
| `payment/` | Payment flow pages: checkout, success, failure (see `payment/AGENTS.md`) |
| `privacy/` | 개인정보처리방침 (Privacy Policy) page |
| `terms/` | 이용약관 (Terms of Service) page |
| `refund/` | 환불정책 (Refund Policy) page |

## For AI Agents

### Working In This Directory
- `layout.tsx` uses external Google Fonts via `<link>` tag (not `next/font`)
- `globals.css` defines CSS custom properties (`--primary`, `--bg1`, etc.) and all component styles globally
- The page is a thin wrapper that delegates to `SajuApp` component
- Dark theme with gold/pink accents: `#0A0E2A` background, `#F0C75E` primary
- Legal pages (`privacy/`, `terms/`, `refund/`) are standalone `'use client'` pages using `BUSINESS_INFO` from `@/lib/payment-config`
- Payment pages use `useSearchParams()` inside `<Suspense>` boundaries (Next.js requirement)

### Testing Requirements
- Verify fonts load correctly in browser
- Check responsive behavior at `max-width: 380px` breakpoint

### Common Patterns
- CSS uses dark semi-transparent backgrounds (backdrop-filter removed for Safari performance)
- Element-specific color classes: `.elem-wood`, `.elem-fire`, `.elem-earth`, `.elem-metal`, `.elem-water`
- Animations: `twinkle`, `fadeIn`, `heartBeat`, `spin`, `pulse`

<!-- MANUAL: -->
