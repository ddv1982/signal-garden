# Label Management & i18n Plan

Goal: centralize all user-facing copy (~240–260 strings) so text can be changed in one place
and deployed without hunting through code, with a real path to translation later.

Chosen tool: **Paraglide JS (inlang)** — compile-time i18n with a first-class Vite plugin.
All copy lives in a git-versioned `messages/en.json`; the compiler emits one tiny typed
TypeScript function per message (`m.water_seed()`, `m.garden_label({ count })`).

Why Paraglide for this stack (Vite + React 19 + TS + Phaser, static deploy on Vercel):

- **Plain functions, no React context.** Messages are importable anywhere — components,
  domain files (`accessibilityCopy.ts`, `seedDisplay.ts`), and Phaser-side code alike.
  This is what rules out `react-intl` (React-only API) and makes `react-i18next` clunkier
  than needed here.
- **Type-safe keys with zero config.** Keys are function names; typos and missing
  interpolation parameters are compile errors with autocomplete. react-i18next needs
  `d.ts` augmentation to approximate this.
- **Near-zero bundle cost.** ~1–2 KB tree-shaken runtime vs ~20 KB+ for react-i18next.
- **Nothing changes in the deploy pipeline.** It's a Vite plugin producing static output.
- **Actively maintained** — official i18n for SvelteKit and TanStack Router.
  (Avoid `typesafe-i18n`: best-in-class typing but a maintenance risk since 2023.)

Considered alternative: a plain typed TS dictionary (`copy.ts` with `as const`) is
defensible at this size with zero dependencies, but translation is an explicit goal —
Paraglide adds plurals, typed parameters, and a multi-language path for ~2 KB.

Current state (from codebase survey):

- Bulk of strings: `src/App.tsx` (~70) and `src/components/SeedDialog.tsx` (~40).
- Good partial centralization already exists in `src/domain/lenses.ts`,
  `src/domain/seedDisplay.ts`, `src/domain/accessibilityCopy.ts` — these map cleanly
  onto message functions.
- Hand-rolled pluralization (`seed`/`seeds` ternaries) in 5+ places → becomes proper
  plural variants.
- No text is rendered inside the Phaser canvas itself (animations only), and
  `src/domain/dates.ts` already uses locale-aware `Intl` APIs. Both are free wins.
- Unit tests and the Playwright e2e suite assert on literal English strings — addressed
  in Phase 3.

Every phase ends with the same gate: `pnpm typecheck && pnpm test && pnpm e2e` green.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Setup (smallest effort)

- [x] `npx @inlang/paraglide-js init` — creates `project.inlang/settings.json` and
      `messages/en.json`, wires `paraglideVitePlugin` into `vite.config.ts` with output
      in `src/paraglide/` (gitignored; compiled on dev/build with HMR).
- [x] Base locale `en` only — no other locales yet.
- [x] Confirm dev server, build, and e2e still pass untouched.

## Phase 1 — Migrate domain files (cleanest mapping)

Replace literals with `m.*()` calls; the existing function-based structure carries over.

- [x] `src/domain/lenses.ts` — 7 lens definitions × 4 fields (`title`, `actionLabel`,
      `fieldLabel`, `helper`) → `m.lens_word_title()` etc.
- [x] `src/domain/seedDisplay.ts` — status labels, bloom outcomes, stage copy, watering
      prompts.
- [x] `src/domain/accessibilityCopy.ts` — interpolated a11y labels become typed-parameter
      messages; `seed/seeds` and `time/times` ternaries become plural variants.
- [x] `src/domain/dates.ts` — only the three literals (`today`, `yesterday`, `N days ago`);
      keep the existing `Intl.DateTimeFormat` usage as-is.

Key naming: flat with prefixes (`lens_word_title`, `seed_stage_sprout_description`) —
keys are function names, so prefixes give grouping + autocomplete.

## Phase 2 — Migrate components

In descending string-count order, each component an isolated commit:

- [x] `src/App.tsx` — theme options, home/garden/archive/settings sections, pet messages,
      confirmation dialogs, error messages.
- [x] `src/components/SeedDialog.tsx` — tabs, stage cards, watering/bloom forms, history,
      validation errors.
- [x] `src/components/OnboardingPanel.tsx`, `TopBar.tsx`, `LensPanel.tsx`,
      `GardenCanvas.tsx` — including all `aria-label` and `title` attributes.

Out of scope: `PetDebugPanel.tsx` (dev-only) and `index.html` meta tags (SEO meta in a
static SPA is a separate concern).

## Phase 3 — Tests stop duplicating copy

- [x] Unit tests (`src/domain/__tests__/`): assert against `m.*()` instead of duplicated
      literals — tests then survive copy edits.
- [x] E2E (`e2e/garden-loop.spec.ts`): import message functions in the spec, or switch
      the most brittle `getByText` queries to roles/test-ids.

## Phase 4 — Verify & document

- [x] Full gate: `pnpm typecheck && pnpm test && pnpm e2e`.
- [x] Visual pass in preview at 3 window widths (narrow/mid/wide — garden plot anchors).
- [x] Add a short note to README or docs: "All copy lives in `messages/en.json`.
      Edit, commit, push — Vercel deploys."

---

## Later — when translation actually happens (out of scope now)

- Add `messages/nl.json` (etc.); missing keys fall back to `en`.
- Paraglide's default locale switch does a full page reload — acceptable here, and it
  conveniently rebuilds the Phaser scene with fresh strings.
- Free tooling when needed: Sherlock (VS Code extension, inline editing) and Fink (web
  editor for non-developer translators). No paid TMS needed under ~3 languages.
- Mind ~30% text expansion (e.g. German) in tight layouts, DOM and canvas alike.
- Pluralization currently uses manual `_one`/`_many` key pairs chosen by ternaries in code.
  Fine for English/Dutch; languages with more plural categories (Polish, Russian) need
  inlang's `match`-based plural variants instead, moving the decision into the catalog.

References: paraglidejs.com/vite · paraglidejs.com/comparison ·
github.com/opral/paraglide-js · i18next.com/overview/typescript (runner-up) ·
rexrainbow.github.io/phaser3-rex-notes/docs/site/texttranslation/ (Phaser + i18next,
if ever needed)
