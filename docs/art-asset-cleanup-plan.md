# Art Asset Cleanup Plan

Goal: remove the procedural drawing code that predates the painted art assets. The garden was
originally prototyped with Phaser primitives (rectangles, ellipses, circles); once the painted
backgrounds, props, companion frames, and lens props landed in `src/assets/` (generated from
`art-source/`), every texture became statically imported and preloaded in
`src/game/assets.ts` — so the `textures.exists()` fallback branches could never run again.
They were dead code, and one of them (the horizon glow band) actively rendered as a visual
artifact on top of the painted background.

Every phase is behavior-preserving and ends with the same gate:
`pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` green before moving on.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 1 — Fix the visible horizon-line artifact

The pre-asset "horizon glow band" in `drawGardenLandmarks` (a thin, wide, low-alpha rectangle
at 55% height, depth 20) kept drawing on top of the painted background in both themes,
showing as a subtle horizontal line through the scene.

- [x] Stop drawing the horizon band over the painted background.
- [x] Verify in the browser: line gone in light and dark mode, including wide viewports.

## Phase 2 — Remove dead procedural fallbacks (`src/game/scenes/GardenScene.ts`)

All textures requested by the scene are present in `GARDEN_TEXTURE_URLS` (light + `-dark`
variants) and loaded during Phaser `preload()`, so each guard below could never take its
fallback branch.

- [x] `drawBackground`: drop the `textures.exists` guard and the 5-shape procedural
      sky/soil/sun composition; always draw the painted background.
- [x] `drawGardenLandmarks`: delete the horizon band entirely (painted background includes a
      horizon); drop the procedural lantern, vine, and dream-stone fallback shapes.
- [x] `drawSeed`: always draw the growth-stage prop image; delete the procedural
      stem/earth/petals/lantern/vine seed drawing. `seedPropKey` now returns `string`
      (it never returned `null`).
- [x] `drawLensObjects` / `drawLensFarewell`: drop the fallback focus circles.
- [x] `drawPet`: delete `drawPrimitivePet` (15-shape procedural cat) and the texture guard;
      the companion sprite is always created.
- [x] `addPropImage`: remove the `null`-returning guard; signature is now
      `Phaser.GameObjects.Image` and no caller checks the return value.

## Phase 3 — Tighten `src/game/PetController.ts`

- [x] `attach` requires `Phaser.GameObjects.Image` (the `undefined` case only existed for
      the primitive-pet fallback). Internal `sprite?` optionality stays — that is the
      detach/redraw lifecycle, not a fallback.
- [x] `setFrame`: drop the `textures.exists` check; keep the `this.sprite` check.

## Phase 4 — Deslop sweep (rest of the codebase)

Review sweep of `src/`, `shared/`, `scripts/`, docs, and CSS for AI slop and cruft: unused
exports, dead CSS classes, narrating or stale comments, commented-out code, TODO/FIXME
leftovers, debug code, orphaned package scripts, stale docs.

- [x] Sweep completed — no actionable findings. The codebase is clean; the only flag was the
      intentional `console.warn` in `src/persistence/storage.ts` (kept: real error reporting
      for storage failures).

## Phase 5 — Verification

- [x] `pnpm typecheck`, `pnpm lint`, Prettier clean.
- [x] Unit tests: 12 files, 92 tests pass.
- [x] E2E: 47 passed, 11 conditionally skipped (unchanged from baseline).
- [x] Browser-verified with a seeded 7-plant garden so every reworked draw path rendered
      (background, lantern, vine, dream-stone, seed props, pet, lens props) in light and dark
      mode — no console errors, no missing-texture squares, no stray line.

Net result: −148 lines (48 added, 196 removed) across `GardenScene.ts` and
`PetController.ts`.

## Phase 6 — Follow-ups

- [x] Texture-coverage test (`src/game/__tests__/assets.test.ts`): every texture key the
      scene requests (background, landmark props, seed growth stages, lens props, companion
      frames) must have a light and `-dark` entry in `GARDEN_TEXTURE_URLS`, and every bundled
      entry must be reachable from a scene request — so a renamed, deleted, or orphaned asset
      fails fast instead of rendering Phaser's missing-texture frame or silently bloating the
      bundle. `GARDEN_TEXTURE_URLS` is exported from `src/game/assets.ts` for this.
- [x] The orphan check immediately caught one: `prop-soil-patch` (light + dark) was bundled
      and preloaded but never drawn — another pre-asset leftover. Removed from `assets.ts`
      along with the two derived `soil-patch.webp` files (recoverable from
      `art-source/garden/props-sheet-chromakey.png` or git history).
- [x] Commit the cleanup — released as `0.1.20` (see `docs/releases/0.1.20.md`).
- [ ] Optional: extend `scripts/audit-*` coverage or CI to keep `src/assets/` and
      `art-source/` in sync, if asset regeneration becomes frequent. (The orphan check above
      already covers the bundle side.)
