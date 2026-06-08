# Signal Garden Beta Known Limitations

Last updated: June 6, 2026

These notes describe current prototype limitations for beta planning and tester expectations.

## Data

- Data is local-only in this prototype. There is no account system, cloud sync, or cross-device restore.
- Export Seed Data creates a JSON copy of saved seeds in the browser.
- Delete Seeds clears saved app seeds from browser `localStorage`.
- Exported files or messages are outside Signal Garden and are not removed by the app delete control.

## Reflection Scope

- Signal Garden is a creative self-reflection space, not therapy, diagnosis, medical advice, crisis support, or productivity coaching.
- The lens journey uses gentle prompts only. It should not imply clinical assessment or treatment.

## Game Surface

- The garden is currently a directly mounted Phaser prototype in the Vite app.
- The ragdoll-style pet uses first-pass generated sprite frames. Frame consistency, edge cleanup, hit areas, and animation polish still need more work.
- The game uses browser `localStorage` through the React persistence layer; it does not sync across browsers or devices.

## QA Gaps

- Browser QA is still needed across desktop and mobile viewport sizes.
- Screen reader, reduced-motion, small-screen, keyboard, and browser storage behavior need deeper testing.
- Automated Playwright coverage covers the main lens journey, canvas signal, canvas lens object, canvas planting, draft persistence, and reduced-motion smoke paths. Deeper assistive technology testing is still needed.

## Release Readiness

- Privacy policy text needs final legal/product review before any public beta or store submission.
- Store metadata, screenshots, TestFlight/internal Google Play setup, and beta feedback channels are still pending.
