# Garden Asset Notes

This folder contains generated garden graphics passes for Signal Garden.

- Source: generated with the built-in image generation workflow for this project.
- Intended use: browser prototype game art for the Phaser Dream Garden.
- Visual target: soft storybook/felt-watercolor garden environment with warm light, handmade textures, and calm self-reflection mood.
- `background-v4.webp`: current runtime backdrop from the full lens-game art pass, with chroma-contaminated edge pixels cleaned in the asset.
- `background-dark.jpg`: previous moonlit dark-mode runtime backdrop generated from the current 1480x484 background with `node scripts/create-dark-background.mjs` so Phaser layout alignment stayed exact.
- `background-dusk-v1.jpg`: first dusk-mode runtime backdrop. Generated with the built-in image generation workflow on 2026-06-10 from the light garden composition as a dusk / blue-hour storybook watercolor pass, then resized to 1480x484 with Sharp.
- `background-dusk-v2.jpg`: second dusk-mode backdrop. Generated with the built-in image generation workflow on 2026-06-10 as gameplay stage art, then resized to 1480x484 with Sharp. This pass established the current nighttime palette, but drifted farther from the daytime pond/path composition.
- `background-dusk-v3.jpg`: current dark-mode runtime backdrop. Generated with the built-in image generation workflow on 2026-06-10 using the daytime garden as the composition reference and `background-dusk-v2.jpg` as the style reference, then resized to 1480x484 with Sharp. Prompt summary: keep the v2 nighttime/dusk mood, palette, warm highlights, and star/firefly atmosphere while restoring the daytime pond scale, path placement, door placement, rocks, and prop-safe open spaces.
- `source/background-dusk-generated.png`: full-resolution source output for `background-dusk-v1.jpg`.
- `source/background-dusk-v2-generated.png`: full-resolution source output for `background-dusk-v2.jpg`.
- `source/background-dusk-v3-generated.png`: full-resolution source output for `background-dusk-v3.jpg`.
- `source/props-sheet-chromakey.png`: generated prop sheet on a flat chroma-key background.
- `source/full-art-pass/garden-lens-sheet-chromakey.png`: generated garden and lens object sheet for the full game redesign.
- `source/growth-bud-chromakey.png`: generated leafy bud growth-stage source on a flat magenta chroma-key background.
- `props/`: locally cut and alpha-processed runtime props for seeds, soil, growth objects, lantern, and stone.
- `props-dark/`: dusk-mode runtime siblings generated from the transparent runtime props with `node scripts/create-dark-asset-variants.mjs` so alpha bounds and Phaser anchors remain stable. The current profile is tuned to `background-dusk-v3.jpg` with warmer highlights and less blue-black shadowing than the original moonlit pass.
- `props/bud.png`: alpha-processed 256x256 runtime prop for the growing-plant stage between sprout and flower.

Lens object runtime props live under `src/assets/lenses/props/` and cover word stones, body ripple, emotion lantern, image cloud, observer pool, meaning gate, and action basket.

The generated signal orb from the prop sheet was not used in the active scene because its matte read too dark against the backdrop. The active signal is drawn in Phaser for readability, while the generated assets carry the environment and plant/soil visuals.
