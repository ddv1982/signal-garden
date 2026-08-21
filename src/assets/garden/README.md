# Garden Asset Notes

This folder contains generated garden graphics passes for Signal Garden.

- Source: generated with the built-in image generation workflow for this project.
- Intended use: browser prototype game art for the Phaser Dream Garden.
- Visual target: soft storybook/felt-watercolor garden environment with warm light, handmade textures, and calm self-reflection mood.
- `background-v4.webp`: current runtime backdrop from the full lens-game art pass, with chroma-contaminated edge pixels cleaned in the asset.
- `background-dark.jpg`: previous moonlit dark-mode runtime backdrop generated from the 1480x484 light background with `node scripts/create-dark-background.mjs` so Phaser layout alignment stayed exact.
- `background-dusk-v1.webp`: first dusk-mode runtime backdrop, superseded and no longer referenced by any code. Generated with the built-in image generation workflow on 2026-06-10 from the light garden composition as a dusk / blue-hour storybook watercolor pass, then resized to 1480x484 with Sharp. Re-derived from `art-source/garden/background-dusk-generated.png` as WebP at quality 85 (217 KB JPEG to 175 KB), not transcoded from the JPEG, so it measures closer to the master than the file it replaced.
- `background-dusk-v2.webp`: second dusk-mode backdrop, superseded and no longer referenced by any code. Generated with the built-in image generation workflow on 2026-06-10 as gameplay stage art, then resized to 1480x484 with Sharp. This pass established the current nighttime palette, but drifted farther from the daytime pond/path composition. Re-derived from `art-source/garden/background-dusk-v2-generated.png` as WebP at quality 85 (237 KB JPEG to 191 KB) on the same terms as v1.
- `background-dusk-v3.webp`: current dark-mode runtime backdrop. Generated with the built-in image generation workflow on 2026-06-10 using the daytime garden as the composition reference and `background-dusk-v2.webp` as the style reference, then resized to 1480x484 with Sharp. Prompt summary: keep the v2 nighttime/dusk mood, palette, warm highlights, and star/firefly atmosphere while restoring the daytime pond scale, path placement, door placement, rocks, and prop-safe open spaces. Transcoded from JPEG to WebP at quality 85 (229 KB to 162 KB); the backdrop is also drawn sharp by Phaser and behind onboarding, so quality was chosen to hold the painterly grain rather than to minimise bytes.
- Source files are not retained in this runtime asset folder; the checked-in files here are the optimized browser assets consumed by Vite and Phaser.
- `props/`: locally cut and alpha-processed runtime props for seeds, soil, growth objects, lantern, and stone.
- `props-dark/`: dusk-mode runtime siblings generated from the transparent runtime props with `node scripts/create-dark-asset-variants.mjs` so alpha bounds and Phaser anchors remain stable. The current profile is tuned to `background-dusk-v3.webp` with warmer highlights and less blue-black shadowing than the original moonlit pass.
- `props/bud.webp`: alpha-processed 256x256 runtime prop for the growing-plant stage between sprout and flower.

Lens object runtime props live under `src/assets/lenses/props/` and cover word stones, body ripple, emotion lantern, image cloud, observer pool, meaning gate, and action basket.

The generated signal orb from the prop sheet was not used in the active scene because its matte read too dark against the backdrop. The active signal is drawn in Phaser for readability, while the generated assets carry the environment and plant/soil visuals.
