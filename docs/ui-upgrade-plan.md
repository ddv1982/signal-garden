# UI & Look-and-Feel Upgrade Plan

Goal: make Signal Garden feel sleek and intentional — calmer UI chrome, more cohesive art, and a focused, step-by-step lens journey where only the current lens prop is visible in the garden.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 1 — Step-by-step lens reveal (highest impact, code-only)

Today all seven lens props render at once (`drawLensObjects` in `src/game/GardenGame.ts`, placements from `LENS_RING` in `src/game/gardenLayout.ts`). Change to: **only the current lens prop is visible**; on completing a step the prop transitions out and the next transitions in.

- [x] Filter placements to the current lens on all viewports (`createLensObjectPlacements` now returns only the current lens; `null` returns the full ring for audits/tests).
- [x] Transition out on completion: gentle fade + slight sink/scale-down of the outgoing prop (`drawLensFarewell`; skipped under `reducedMotion`).
- [x] Transition in: next prop fades/grows in at its ring position after a ~220ms beat.
- [x] Keep the active glow/orbit/motes treatment only for the (single) visible prop.
- [x] Progress affordance in the lens panel UI: "Step n of 7" eyebrow + segmented step meter, ordered via `lensOrderForProfile`.
- [x] Verify hit targets, `data-activeLensX/Y` dataset hooks, and pet-overlap avoidance still behave with a single prop (unit tests green).
- [x] Update tests: `gardenLayout.test.ts` placement expectations; added desktop single-lens reveal test.

## Phase 2 — UI chrome & panel redesign (HTML/CSS layer)

The token system in `src/styles.css` is solid; the upgrade is refinement, not replacement.

- [x] Lens panel: stronger glassmorphism (24px blur), larger radius, tighter type hierarchy, entrance animation, step meter.
- [x] Buttons: hover lift + pressed states, primary shadow/weight, consistent radii via tokens.
- [x] Top bar: pill nav + pill theme toggle, refined brand mark. (Kept the two sun/moon buttons — e2e tests target their aria-labels.)
- [x] Lens action chips: pill progress rail — completed get a ✓ prefix, current highlighted, upcoming muted.
- [x] Typography pass: eyebrow letter-spacing 0.08em, panel title -0.01em tracking.
- [x] Radius audit: tokens `--radius-sm/md/lg/pill` applied across all components.
- [x] Focus/keyboard states: existing `--focus-ring` outlines preserved everywhere.
- [x] Dark (dusk) theme parity (token-driven; dark shadow tokens added).

## Phase 3 — Garden art & asset polish

Existing pipeline: generated chroma-key sheets in `*/source/`, runtime props in `props/` + `props-dark/`, with `lens:clean` / `lens:audit` / `assets:dark` scripts.

- [ ] Art-direction pass: define a one-paragraph style target (palette, light direction, edge softness, saturation ceiling) so regenerated assets stay cohesive; record it in `src/assets/*/README.md`.
- [ ] Regenerate or retouch the weakest props first (judge against the style target; candidates: image cloud and action basket read less grounded than the rest).
- [ ] Background: subtle contrast/level pass so props separate cleanly from the pond area; check both `background-v4.webp` and dusk variants.
- [x] Consistent grounding: `lens:audit` + `lens:audit:dark` re-run, all green (24px padding, no chroma fringe).
- [x] `garden:audit:dark` re-run, light/dark bounds aligned.
- [x] Optimize: all runtime props confirmed alpha-cropped with 24px padding.

## Phase 4 — Motion & transitions

- [x] Lens-to-lens transition choreography: outgoing fade-down → beat → incoming fade-up; panel re-animates per step (`key={currentLens}`).
- [x] Soft "focus vignette": subtle scene dim (depth 540) while a lens is active; active prop renders above it.
- [x] Ambient life: 9 drifting motes (fireflies at dusk, pollen by day) at low alpha; disabled under `reducedMotion`.
- [x] Micro-interactions: button hover/press, panel enter animation, chip/meter transitions (CSS-only).
- [ ] Journey completion moment: deferred — existing planting burst covers the handoff; revisit if wanted.
- [x] Reduced-motion audit: Phaser tweens gated on `reducedMotion`; global `prefers-reduced-motion` CSS block added.

## Phase 5 — Verification

- [x] `pnpm typecheck` (clean), `pnpm test` (57/57), production `vite build` (clean). Playwright e2e: run locally — browsers not available in this environment.
- [ ] Manual pass: full 7-lens journey in light and dark, desktop and < 560px mobile width, with and without `prefers-reduced-motion`.
- [ ] Screenshot comparison against `docs/screenshots/` before/after; update screenshots.
- [x] Asset audits green: `lens:audit`, `lens:audit:dark`, `garden:audit:dark`.

---

## Suggested order

1 → 2 → 4 → 3. Phases 1 and 2 deliver the most visible change quickly and are pure code. Motion (4) builds directly on the reveal work. Art regeneration (3) is the slowest/most iterative, so it goes last and can proceed in parallel once the style target is written.

## Key files

`src/game/GardenGame.ts` (drawLensObjects, transitions) · `src/game/gardenLayout.ts` (LENS_RING, placements) · `src/domain/lenses.ts` (order/progress) · `src/App.tsx` (panel, chips, stepper) · `src/styles.css` (tokens, chrome) · `scripts/*` (asset pipeline).
