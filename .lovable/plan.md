## Accessibility audit results

I ran an automated axe-core scan against the live site (home, Opportunities, Employment, List an Opportunity, Employment Resources) and reviewed the components by hand. The site is in decent shape — skip links, ARIA-hidden decorative icons, and semantic landmarks are already present on most pages — but there are real issues that affect screen-reader ("e-reader") and low-vision users.

### Critical (blocks screen-reader users)

1. **Unlabeled dropdown filters on Employment** — the three filter comboboxes (employer, sort, and one more) announce as "button" with no name. A screen reader user cannot tell what they change. (`src/pages/Employment.tsx`)
2. **Unlabeled slider thumb** — the pay slider on Employment and the hours slider on Opportunities expose a `role="slider"` with no accessible name; the label sits on the wrapper, not on the thumb. Opportunities also throws an `aria-allowed-attr` error from `aria-valuetext` on the wrong element. (`src/pages/Employment.tsx`, `src/components/OpportunityFilters.tsx`, `src/components/ui/slider.tsx`)
3. **Toast close button has no name** — the "X" on notification toasts announces as an unnamed button. (`src/components/ui/toast.tsx`)
4. **Auto-opening popup on the homepage** — the exemption dialog opens on a 500 ms timer with no visible title (title is `sr-only`) and steals focus before the page has been read. Disorienting for screen-reader and keyboard users. (`src/pages/Index.tsx`)

### Serious (degrades experience)

5. **Color contrast below WCAG AA** — white text on the green `--success` (#16a249, ratio 3.33:1) and orange `--highlight` (#f26c0d, 3.03:1) buttons fails the 4.5:1 requirement. This affects every green "Post Opportunity" / "Visit Site" button and the orange employment buttons — 45 instances on Employment, 19 on Employment Resources. (`src/index.css`)
6. **Homepage missing skip link and `#main-content`** — every other page has `<SkipNavigation />` and `<main id="main-content">`; the homepage has neither, so the skip link target is broken there. (`src/pages/Index.tsx`)
7. **Links not distinguishable without color** — the `rhinton@uwtc.org` mailto links rely on color alone until hover. (`src/pages/ListOpportunity.tsx` and other footers)
8. **Content outside landmarks** — the tab/segment bar on Opportunities sits outside any landmark region.

### Minor

9. Toast viewport uses `<ol>` containing non-`<li>` children (shadcn default).
10. `min-h-screen` is used instead of `min-h-dvh` across pages — causes clipped content on mobile browsers with dynamic toolbars.

Admin pages were not scanned (auth-gated); they're internal-only, so I'd treat them as lower priority.

## Proposed fixes

Work in priority order, all frontend/presentation only:

**Round 1 — critical**
- Add `aria-label` to each `SelectTrigger` on Employment (e.g. "Filter by employer", "Sort jobs by").
- Move slider labeling onto the Radix thumb so the accessible name lands on `role="slider"`; remove the invalid `aria-valuetext`/`id` placement on the Opportunities hours slider.
- Add `aria-label="Close notification"` to the toast close button.
- Give the homepage exemption dialog a visible `DialogTitle` and remove the auto-open timer in favor of an explicit trigger (or delay + no focus steal) — I'll confirm your preference before changing behavior.

**Round 2 — serious**
- Darken `--success` and `--highlight` in `src/index.css` so white text clears 4.5:1 (roughly `142 76% 29%` and `25 90% 38%`), keeping the same hue family. Verify against the design tokens in both light and dark themes.
- Add `<SkipNavigation />` and `<main id="main-content">` to the homepage.
- Add `underline` to inline mailto/text links.
- Wrap the Opportunities tab bar inside the `<main>` landmark.

**Round 3 — polish**
- Swap `min-h-screen` for `min-h-dvh` across pages.
- Fix the shadcn toast viewport list semantics.

**Verification**
After each round, re-run the axe-core scan on all five public routes and report the remaining violation count.

### Technical notes
- Contrast fixes are HSL token edits in `src/index.css` only; no component-level color hardcoding.
- Slider and toast fixes touch the shadcn primitives in `src/components/ui/`, applied as ARIA additions rather than behavior rewrites.
