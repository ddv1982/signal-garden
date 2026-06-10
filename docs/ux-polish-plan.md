# UX Polish & Craft Plan

Goal: fix the correctness/safety gaps found in the June 2026 UI review, remove redundant journey chrome, give the archive/settings/home screens real design attention, and tie the UI chrome to the watercolor art direction (typography + surfaces + lighter assets).

Source review: hands-on pass through onboarding → 7-lens journey → planting → seed dialog → archive → settings, light and dark, June 11 2026.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 1 — Correctness & safety (small diffs, do first)

- [x] **Seed title grammar.** `unhookedText` now composes `Noticing the story: “…”` instead of grafting user text into a sentence (`src/domain/lenses.ts`). Updated `lenses.test.ts` and the three e2e locators in `garden-loop.spec.ts`. Existing saved seeds keep their old display text — no migration needed.
- [x] **Confirm before "Delete Seeds".** Two-step inline confirm (`.confirm-inline`) with seed count; no browser `confirm()`.
- [x] **Guard "Reset Lens Profile" mid-journey.** Inline "This discards your journey in progress" confirm appears only when a lens draft exists.
- [x] **Magenta hairline at the top of the garden canvas (light mode).** Root cause was in the asset itself: `background-v4.webp` shipped with a 3-row solid magenta strip plus ~650 scattered magenta speckles in the top 40 rows (generation artifact). Patched the file in place by replacing artifact pixels with the nearest clean pixel below (verified: top rows now clean sky).
- [x] **Theme toggle can return to "Follow system".** TopBar is now a three-state control (sun / moon / half-circle auto) driven by `themePreference` rather than resolved theme; `Use light/dark mode` aria-labels kept, new button is "Match system theme" (avoids colliding with the Settings `Follow system` radio in Playwright's substring matching). Updated the system-default e2e assertion to expect the auto button active.
- [x] **Stale pet message on Home.** Selecting the Home tab resets the message to a seed-count summary ("Your pet watches over N seeds.") via the `selectTab` handler.

## Phase 2 — Journey focus: one progress indicator, honest copy

- [x] **Dedupe journey signage.** `.garden-status` and `.lens-progress` are hidden while `lensPanelOpen`; the chip rail returns when the panel is dismissed mid-journey (re-entry affordance). Verified in preview: panel open → no duplicate chrome.
- [x] **Align home copy with the real journey.** Headline is now "Move one signal through seven gentle lenses."
- [x] **Settings privacy copy.** Now: data "stays on this device, in this browser. Nothing is uploaded, and no AI service ever reads your reflections." `privacy-policy-draft.md` never quoted the old wording (no change needed); README's OpenAI note is developer-facing asset provenance and stays.

## Phase 3 — Screen-level UX: archive, seed dialog, settings, home

- [x] **Archive cards show the garden.** New `SeedStageArt` component reuses the seed/sprout/bud/flower prop art (theme-aware) on each card.
- [x] **Human dates.** New `friendlySeedDate` (`src/domain/dates.ts`, unit-tested): "today", "yesterday", "4 days ago", then "June 3" / "December 20, 2025". Used in archive cards and the seed-card accessibility label.
- [x] **Archive empty state.** Seed illustration + "No seeds yet. Your first lens journey plants one." + Visit the Garden button.
- [x] **Seed dialog stage chips read as a progress track.** `.seed-progress` restyled as bar segments with captions (mirrors the lens step meter); no longer button-like.
- [x] **Settings layout.** Single-column `settings-view` with grouped sections: Appearance · Comfort · Your data; danger action stays at the end of the data section.
- [x] **Home earns its keep.** Companion repositioned onto the path/bank (was floating on the pond in light mode); primary button is adaptive — "Continue Lens Journey · Step n of 7" when a draft exists, otherwise "Enter the Garden".

## Phase 4 — Look & feel: typography and surfaces

- [x] **Display face for headings.** Fraunces Variable (via `@fontsource-variable/fraunces`, +84 KB woff2) on `h1/h2/h3`, settings section heads, and the Appearance legend through a `--font-display` token; body stays system sans.
- [x] **Warm the light theme surfaces.** Page/surface/control/HUD tokens tinted toward parchment (`#faf7ef` page, warm borders `rgba(82,71,55,…)`), matching the dark theme's warmth. Text tokens unchanged; contrast comfortably ≥ AA on the new backgrounds.
- [x] **Tone sweep.** Verified home/garden/archive/settings/dialogs in both themes via preview after the font/tint pass.

## Phase 5 — Asset weight

- [x] **Sprites → WebP.** New `scripts/convert-runtime-assets-to-webp.mjs` converts all runtime sprite dirs and deletes the PNGs. Props/lenses use lossy q90; companion frames must stay **lossless** — lossy/near-lossless WebP shifts semi-transparent edge pixels enough to fail `pet:audit`'s matte check (frames: 3.9 MB → 2.3 MB lossless; props/lenses: ~2.3 MB → ~0.35 MB). Audit scripts now decode via sharp (`scripts/lib/readImage.mjs`) and accept `.png`/`.webp`. All audits green.
- [x] **Moved `src/assets/*/source/` (18 MB of generation sheets) to top-level `art-source/`**; updated `audit-lens-props.mjs` and `clean-lens-props.mjs` paths.
- [ ] (Optional, later) Pack frames/props into per-theme atlases to cut ~50 HTTP requests to a handful.

## Phase 6 — Verification

- [x] `pnpm typecheck`, `pnpm test` (92/92), `pnpm build`, `pnpm lint`, Prettier all clean; `playwright test --project=chromium` 29/29 passed.
- [x] Preview pass: journey + plant + seed dialog + settings confirms in light and dark at desktop width; 390px covered by the regenerated mobile screenshots; reduced-motion paths covered by e2e (3 specs).
- [x] Regenerated `docs/screenshots/{home,garden}-{desktop,mobile}.png` via the new `scripts/capture-doc-screenshots.mjs`.
- [x] Bundle recorded: **dist 8.2 MB → 4.8 MB**; image payload 6.5 MB → 3.3 MB (85% cut on props/lenses, 41% lossless cut on companion frames); Fraunces adds 84 KB.

---

## Suggested order

1 → 2 → 3 → 4 → 5, verifying (6) per phase. Phase 1 is shippable in one small PR and removes the only data-loss and broken-copy issues. Phases 2–3 are independent of each other; 4 touches global tokens so it lands after the screen work to avoid rebasing styling twice. Asset conversion (5) is mechanical and can run in parallel with 4.

## Key files

`src/domain/lenses.ts` (seed title) · `src/domain/dates.ts` (friendly dates) · `src/App.tsx` (settings actions, archive, home, journey chrome) · `src/components/TopBar.tsx` (theme toggle) · `src/components/SeedStageArt.tsx` (stage art) · `src/styles.css` (tokens, typography, surfaces) · `scripts/convert-runtime-assets-to-webp.mjs` + `scripts/lib/readImage.mjs` (asset pipeline) · `art-source/` (generation sheets) · `e2e/garden-loop.spec.ts` (updated locators).
