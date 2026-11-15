# Riyad Sarkar — Ultra Pro Max UI/UX rollout

Based on the **Riyad Sarkar Web App — “Ultra Pro Max” UI/UX Deep Research & Implementation Blueprint** (15 November 2026).

## Design direction: Calm Cyber Precision

A distinctive, high-trust cyber security brand with calm, deliberate product interfaces. Preserve **Inter** for functional interfaces, **Space Grotesk** for headings, the existing sky/blue brand identity, Lucide icon vocabulary, and the current Radix/Tailwind stack. Do not add another UI framework for visual polish.

### Semantic product palette

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--workspace-canvas` | `#f7f9fc` | `#07111d` | Dashboard canvas |
| `--workspace-surface` | `#ffffff` | `#0c1826` | Cards, toolbar, composer |
| `--workspace-subtle` | `#f0f4f8` | `#111f30` | Inbox and inspector |
| `--workspace-line` | `#dce5ee` | `#22364a` | Low-noise structure |
| Primary portal action | `#0369a1` | `#0369a1` | Legible white text and focus |

Use a 4px spacing rhythm; 8px controls, 12px cards, and 16px large surfaces. Meaningful motion only, respecting reduced motion. Marketing pages may be expressive; product pages must remain readable under time pressure.

## Phase 1 — shared foundation / chat polish (this PR)

- [x] Introduce reusable semantic workspace CSS tokens with independent light/dark colors.
- [x] Align customer/admin portal widths and shared heading hierarchy.
- [x] Improve sidebar contrast, active-route discoverability, keyboard Escape/focus trap on mobile.
- [x] Remove marketing grain/scroll progress and Lenis smooth scroll from authenticated routes.
- [x] Polish chat queue, thread, inspector, message bubbles, composer, and case selected state.
- [x] Extract an explicit accessible realtime connection indicator.
- [x] Preserve IME composition during Enter-to-send and expose sending state.
- [x] Add screen-reader stable values for animated homepage metrics.
- [ ] Confirm responsive screenshots at 360/390/768/1024/1440px in real browser sessions.
- [ ] Confirm an authenticated two-actor user + agent conversation.

**Phase 1 release gate:** TypeScript, ESLint, chat queue unit regression tests, Next.js production build, and visual smoke check. No schema/data/RLS/RPC changes. Do not claim browser E2E until actually tested.

## Phase 2 — support workspace components and flows (next PRs)

- [ ] Extract visual-only `CaseRow`, `QueuePanel`, `ConversationPanel`, `CaseInspector`, `Composer`, `CaseHistory` components from `components/portal/live-chat.tsx`, keeping existing request sequencing, realtime subscriptions and mutation calls untouched.
- [ ] Explicit reconnect/offline/stale UX, local skeletons and manual retry states without replacing existing content.
- [ ] Clear three-pane desktop inbox (Queue 280–340px / conversation flexible / Inspector 320–380px), list+thread tablet, sequential mobile workflow.
- [ ] Show customer history independently of active queue filters, with click-through to read-only resolved/closed transcripts.
- [ ] Improve escalation/transfer/join lifecycle feedback, without inventing backend capabilities.
- [ ] Review customer dashboard, support team management, auth and settings UI and error recovery.

## Phase 3 — public portfolio and brand polish

- [ ] Restructure the long homepage into clearer narrative: proposition -> proof -> outcome-based services -> selected work -> credibility -> CTA. Retain deep links and avoid deleting content without redirect strategy.
- [ ] Reduce competing gradients, excessive shadows, auto-animations and unnecessary 3D on first load.
- [ ] Deliver meaningful stats and essential hero content without animation or client JavaScript.
- [ ] Refine navbar, language/theme controls, mobile nav, media sizing, and dark theme variants.

## Release acceptance and testing

1. **Safety:** never delete customer chat cases/messages; never alter production Supabase schema or RLS during a UI-only PR. Staff access rules and RPC payloads are server-authoritative.
2. **Chat:** customer starts case -> agent joins once -> welcome persisted once -> both send -> reconnect -> resolve -> previous case available. Exercise stale waiting/active requests; queue selection must not disappear.
3. **Accessibility:** WCAG 2.2 AA focused keyboard path, obvious focus outline, dialog focus management, target size >=24 CSS px (prefer 44px touch), contrast checked on light/dark, 200% zoom and reduced-motion.
4. **Responsive:** review at 360, 390, 768, 1024, and 1440 CSS pixels, including mobile keyboard and safe-area inset in composer.
5. **Performance:** collect baseline and production p75 LCP <=2.5s, INP <=200ms and CLS <=0.1, with measured network activity on chat; do not invent Lighthouse scores.
6. **Staging:** user/agent/supervisor/admin disposable accounts and cases; do not create fake production staff or seed production cases. QA on staging/preview before promotion.
7. **Release:** separate PR per phase, CI, visual review, deploy verification, then promote. No blanket claim of completion from a successful build alone.

Primary references: [research repository](https://github.com/riyadsarkar07/riyad.sarkar), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Core Web Vitals](https://web.dev/articles/vitals), [Intercom Inbox principles](https://www.intercom.com/help/en/articles/6258745-the-inbox-explained).
