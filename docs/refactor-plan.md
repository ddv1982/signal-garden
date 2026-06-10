# Refactoring Plan

Goal: reduce structural complexity without changing behavior. The two hotspots are
`src/game/GardenGame.ts` (1,684 lines, one class doing rendering + animation + input + theming)
and `src/App.tsx` (962 lines, 24 `useState` + 9 `useEffect` in one component).

Every phase is behavior-preserving and ends with the same gate:
`pnpm typecheck && pnpm test && pnpm e2e` green before moving on.

Best-practice references this plan aligns with:

- **Official Phaser React template** (`phaserjs/template-react-ts`): a thin bridge component
  owns the Phaser lifecycle, scenes live in `src/game/scenes/`, and React/Phaser communicate
  through an event bus — React never touches game objects directly; props configure initial
  setup, events carry ongoing changes.
- **React docs** (react.dev): extract clusters of related `useState`/`useEffect` into custom
  hooks; use `useReducer` when multiple fields update together (forms); never store derived
  state; colocate state with the UI that uses it.
- **Community consensus**: components under ~150–200 lines with a single responsibility;
  flag-soup state replaced by explicit state machines; lint rules (`react-hooks/exhaustive-deps`)
  enforced in CI.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Safety net (do first, smallest effort)

The project has strict TypeScript and good domain/e2e tests, but no linter or formatter.
Adding them first means every later refactor step is checked automatically.

- [ ] Add ESLint (flat config) with `typescript-eslint`, `eslint-plugin-react-hooks`,
      `eslint-plugin-react-refresh`. The hooks plugin is the important one — App.tsx has 9
      effects whose dependency arrays are currently unverified.
- [ ] Add Prettier (or ESLint stylistic) and format the repo in one isolated commit.
- [ ] Add `lint` script and wire it into `.github/workflows/ci.yml` next to typecheck/test.
- [ ] Commit the in-flight UI-upgrade work first so the refactor starts from a clean baseline.

## Phase 1 — App.tsx decomposition (highest UI-side ROI)

24 `useState` calls fall into clear clusters; each cluster becomes a custom hook or component.

- [ ] `useLensJourney()` hook: `lensDraft`, `currentLens`, `lensPanelOpen`, `lensInput`,
      `lensOrder`, session-active flag (App.tsx:76–106). Returns state + commands, hides setters.
- [ ] `useWateringForm()` hook built on `useReducer`: `wateringLabel`, `wateringAction`,
      `wateringOpen`, `wateringError`, `bloomOutcome`, `bloomReflection`, `bloomError`
      (App.tsx:81–87) — seven `useState` calls that always update together, plus the
      reset-on-seed-change effect (App.tsx:135–149) folded into a single `reset` action.
- [ ] Extract `<SeedDialog>` component owning `seedDialogTab` and its dialog refs.
- [ ] Extract `<LensPanel>` and the top-bar chrome into components; target App.tsx ≤ ~250 lines
      of composition.
- [ ] Move module-level display helpers (`wateringCountForSeed`, `seedStageCopy`,
      `wateringPromptForSeed`, `bloomOutcomeLabel`, App.tsx:901–962) to `src/domain/seedDisplay.ts`.
- [ ] Deduplicate growth logic: `growthIndexForSeed` (App.tsx:905) overlaps
      `growthStageForSeed` in `src/domain/seedGrowth.ts` — one source of truth in the domain.
- [ ] Wrap `waterSeed()`/`bloomSeed()` call sites in error handling — `seedGrowth.ts` throws on
      invalid input and App.tsx:235–274 currently doesn't catch.
- [ ] Unit-test the new hooks (vitest + jsdom is already configured).

## Phase 2 — GardenGame.ts split (highest game-side ROI)

One scene class currently holds 30+ `draw*` methods, the pet animation state machine, input
handling, and theming. Split along the official template's `src/game/scenes/` layout:

- [ ] Move the scene to `src/game/scenes/GardenScene.ts`; keep `GardenGame.ts` as the public
      entry (config + factory + exported types) so imports stay stable.
- [ ] Extract `src/game/theme.ts`: the ~72 inline hex literals and 30+ `dark ? … : …` ternaries
      become a palette/texture lookup keyed by theme (`textureKeyForTheme` already points the way).
- [ ] Extract `PetController` (state machine + sequences + motion): `drawPet`, `playPetStepMotion`
      (103 lines, GardenGame.ts:1346–1449), sleep scheduling, breathing. Replace the implicit
      flags (`isPetSleeping`, `quietSince`, `lastPostureAction`) with one explicit state enum and
      a transition function — unit-testable without Phaser.
- [ ] Deduplicate `startIdleBreathing`/`startSleepBreathing` (GardenGame.ts:1620/1639) into one
      parameterized tween helper.
- [ ] Extract `GardenRenderer` (or split draw methods into `renderers/` modules: background,
      landmarks, plots/seeds, lens objects, ambient). `drawLensObjects` (79 lines) splits into
      placement / visuals / interaction.
- [ ] Name the magic numbers: tween durations (360/520/2800), sleep thresholds
      (76000/52000/18000 at GardenGame.ts:1548–1552), plot scale clamps (0.86/1.42 at :667) into
      `ANIMATION_DURATIONS` / `SLEEP_THRESHOLDS` style constants.
- [ ] Unit-test the extracted pure parts (pet state transitions, theme lookups) — currently the
      1,684-line file has zero unit coverage.

## Phase 3 — React↔Phaser bridge hardening

The bridge (`src/components/GardenCanvas.tsx`) is structurally sound — callbacks in, immutable
state snapshots into `setGardenState()`. Targeted fixes rather than a rewrite:

- [ ] Fix the `callbacksRef` double-update pattern (GardenCanvas.tsx:77–91) so callbacks can't
      lag a render.
- [ ] Guard game creation against React 19 strict-mode double-mount (init flag) and verify
      destroy ordering on unmount.
- [ ] Extract the pet debug UI (GardenCanvas.tsx:162–195) into `<PetDebugPanel>`.
- [ ] Optional: adopt the official template's `EventBus` if Phaser→React signals grow beyond the
      current two callbacks (`onSignalRequested`, `onPetTapped`). Not worth it yet — note for later.

## Phase 4 — Persistence resilience

`src/persistence/` is small and clean but fails silently.

- [ ] Surface errors: `readJson` catch blocks (storage.ts:18/24) get an `onError` hook or at
      minimum a `console.warn` so corrupted data and quota issues are observable.
- [ ] Handle `QuotaExceededError` in `writeJson` (storage.ts:29–31).
- [ ] Add a versioned-migration seam: keys are already versioned (`…/v1`) but a schema bump
      currently silently discards user data.
- [ ] Unit tests for the storage layer (currently only `repositories.ts` is tested).

## Phase 5 — Verification & cleanup

- [ ] Full gate after each phase: `pnpm typecheck && pnpm test && pnpm e2e && pnpm build`.
- [ ] Re-run asset audits if any game files moved: `lens:audit`, `pet:audit`, `garden:audit:dark`.
- [ ] Delete anything made dead by the extraction passes; confirm bundle size didn't regress
      (`vite build` output comparison).

---

## Suggested order & sizing

0 → 1 → 2 → 3 → 4. Phase 0 is an hour and protects everything after it. Phases 1 and 2 are
independent of each other and each splits into PR-sized steps (one hook / one extracted module
per commit). Phase 3 and 4 are small, low-risk follow-ups.

What this plan deliberately does **not** do: introduce a state-management library (the app is
local-state only and `useReducer` + hooks cover it), rewrite the bridge to the EventBus pattern
(two callbacks don't justify it), or add a UI framework. The existing architecture is right —
the files are just too big.

## Key files

`src/App.tsx` · `src/game/GardenGame.ts` · `src/components/GardenCanvas.tsx` ·
`src/persistence/storage.ts` · `src/domain/seedGrowth.ts` · `.github/workflows/ci.yml`
