# Lens Asset Notes

This folder contains generated lens object props for the Phaser Dream Garden.

- Source: generated with the built-in image generation workflow as part of the full game redesign art pass.
- Intended use: clickable lens objects for the local, rule-based lens journey.
- Runtime props: word stones, body ripple, emotion lantern, image cloud, observer pool, meaning gate, and action basket.
- Processing: the generated chroma-key sheet is kept in `source/`, while alpha-processed runtime props are kept in `props/`.
- Runtime cleanup: `corepack pnpm run lens:clean` removes detached sheet-edge artifacts, despills magenta chroma-key fringe, crops to alpha bounds, and adds 24px transparent padding. `corepack pnpm run lens:audit` verifies padding and fringe metrics.
- Dusk-mode pass 2026-06-10: `props-dark/` contains dusk runtime siblings produced with `node scripts/create-dark-asset-variants.mjs`, preserving transparent padding and runtime anchors for the theme-aware Phaser texture swap. The current profile is tuned to `background-dusk-v3.jpg` with warmer stone/lantern accents, brighter water props, and softer blue-hour shadows.

These assets are decorative and interactive game art only. User reflection text is not sent to an image or text model at runtime.
