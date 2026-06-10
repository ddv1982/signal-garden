# Garden Asset Notes

This folder contains generated garden graphics passes for Signal Garden.

- Source: generated with the built-in image generation workflow for this project.
- Intended use: browser prototype game art for the Phaser Dream Garden.
- Visual target: soft storybook/felt-watercolor garden environment with warm light, handmade textures, and calm self-reflection mood.
- `background-v4.webp`: current runtime backdrop from the full lens-game art pass, with chroma-contaminated edge pixels cleaned in the asset.
- `background-dark.jpg`: moonlit cozy dark-mode runtime backdrop generated from the current 1480x484 background with `node scripts/create-dark-background.mjs` so Phaser layout alignment stays exact. A built-in image generation pass on 2026-06-10 was used for the moonlit art direction; the direct generated outputs were not used at runtime because they did not preserve the required wide aspect ratio.
- `source/props-sheet-chromakey.png`: generated prop sheet on a flat chroma-key background.
- `source/full-art-pass/garden-lens-sheet-chromakey.png`: generated garden and lens object sheet for the full game redesign.
- `source/growth-bud-chromakey.png`: generated leafy bud growth-stage source on a flat magenta chroma-key background.
- `props/`: locally cut and alpha-processed runtime props for seeds, soil, growth objects, lantern, and stone.
- `props-dark/`: dark-mode runtime siblings generated from the transparent runtime props with `node scripts/create-dark-asset-variants.mjs` so alpha bounds and Phaser anchors remain stable.
- `props/bud.png`: alpha-processed 256x256 runtime prop for the growing-plant stage between sprout and flower.

Lens object runtime props live under `src/assets/lenses/props/` and cover word stones, body ripple, emotion lantern, image cloud, observer pool, meaning gate, and action basket.

The generated signal orb from the prop sheet was not used in the active scene because its matte read too dark against the backdrop. The active signal is drawn in Phaser for readability, while the generated assets carry the environment and plant/soil visuals.
