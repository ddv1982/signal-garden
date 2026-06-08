# Signal Garden

[Open Signal Garden](https://signal-garden.space)

![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178c6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19.0.0-149eca?style=flat-square&logo=react&logoColor=white)
![Phaser](https://img.shields.io/badge/Phaser-3.90.0-8cc84b?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-7.2.7-646cff?style=flat-square&logo=vite&logoColor=white)

Signal Garden is a Vite React + Phaser self-reflection game with a warm virtual pet. It helps users move one inner signal through a gentle lens journey: loosen a word or story, notice body weather, name emotion, shape an inner image, pause at the observer lens, open a wider meaning, choose one tiny kind action, and save the journey as a seed in a visual Dream Garden.

The current browser prototype includes:

- Vite React TypeScript shell.
- Home, Dream Garden, Archive, and Settings screens.
- A directly mounted Phaser garden prototype built from local TypeScript game code.
- Codex-generated ragdoll-style pet sprite frames with head-butt, stretch, groom, sleep, wake, and planting reactions.
- Generated storybook garden backdrop, lens objects, and prop sprites for a more game-like Phaser scene.
- A garden-first playable loop: create a local inner lens profile, tap the glowing signal, move through lens objects, make a seed, then drag or place the seed into the soil.
- Browser-owned seeds, lens profile, unfinished lens journey draft, and settings persistence through `localStorage`.
- Lazy-loaded Phaser garden code so the main React shell stays separate from the game bundle.
- Browser-first scripts and build output suitable for Vercel.
- GitHub Actions CI for typecheck, unit tests, Playwright smoke coverage, and production build.
- Desktop and mobile beta screenshots under `docs/screenshots/`.

## Run

```sh
corepack enable
corepack pnpm install
corepack pnpm run dev
```

Open `http://localhost:5173/`.

## Verify

```sh
corepack pnpm run typecheck
corepack pnpm run test
corepack pnpm run pet:audit
corepack pnpm run pet:sheet
corepack pnpm run e2e
corepack pnpm run build
```

## Notes

The active project runtime is the root Vite app under `src/`. It is a static frontend suitable for Vercel.

Generated pet assets live under `src/assets/companion/`. Optimized runtime frames are kept in `frames/`, and `companion.animations.json` documents animation intent.
Use `http://localhost:5173/?petDebug=1` during development to freeze pet poses and play animation sequences for visual review.

Generated garden assets live under `src/assets/garden/` and `src/assets/lenses/`. The active Phaser scene uses the generated backdrop, seed/growth props, and separate lens objects for the playable journey.

Reflection text stays local in this prototype. OpenAI image generation was used during development for bitmap assets only; no OpenAI text model reads or interprets user reflections at runtime.

Current beta screenshots:

- [Desktop home](docs/screenshots/home-desktop.png)
- [Mobile home](docs/screenshots/home-mobile.png)
- [Desktop garden](docs/screenshots/garden-desktop.png)
- [Mobile garden](docs/screenshots/garden-mobile.png)
- [Pet animation contact sheet](docs/screenshots/pet-animation-contact-sheet.png)

## Beta Readiness

- Privacy policy draft: [docs/privacy-policy-draft.md](docs/privacy-policy-draft.md)
- Prototype limitations: [docs/beta-known-limitations.md](docs/beta-known-limitations.md)
- Beta testing checklist: [docs/beta-testing-checklist.md](docs/beta-testing-checklist.md)
