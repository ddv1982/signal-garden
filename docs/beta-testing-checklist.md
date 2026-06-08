# Signal Garden Beta Testing Checklist

Use this checklist before sharing a web build with early testers.

## Core Loop

- App opens directly into the Dream Garden.
- Pet art appears on desktop and mobile.
- Notice Signal opens the signal panel.
- A heavy word and tiny kind action can become a seed.
- The seed can be planted with the accessible Plant Here control.
- A planted seed remains visible after browser reload.
- Archive opens the saved seed details.

## Responsive And Accessibility

- 390px wide mobile viewport has no horizontal page overflow.
- Tab navigation is usable with touch and keyboard.
- Focus outlines are visible on buttons and fields.
- Reduced-motion setting removes looping garden motion.
- Settings copy clearly states that data is stored in this browser.
- Desktop screenshot exists at `docs/screenshots/garden-desktop.png`.
- Mobile screenshot exists at `docs/screenshots/garden-mobile.png`.
- Home screenshots exist at `docs/screenshots/home-desktop.png` and `docs/screenshots/home-mobile.png`.

## Data Controls

- Export Seed Data downloads JSON when seeds exist.
- Delete Seeds clears the visible garden and archive.
- Clearing browser storage is understood to remove local prototype data.

## Release Smoke

- `corepack pnpm run typecheck` passes.
- `corepack pnpm run test` passes.
- `corepack pnpm run e2e -- --project=chromium` passes.
- `corepack pnpm run build` passes.
- Playwright uses port `6173`, leaving the normal Vite dev port free for local use.
- Deployed Vercel URL loads and route rewrites serve the app.
