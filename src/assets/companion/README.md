# Pet Asset Notes

This folder contains generated pet art passes for Signal Garden.

- Source: generated with Codex image generation from the user's visual reference description, not from a shipped photo asset.
- Intended use: browser prototype game art for the Phaser Dream Garden.
- Visual target: fluffy ragdoll-style color-point cat pet with dark ears, dark face mask, glossy round eyes, cream/brown fur, dark paws, a soft collar, and gentle living-creature behaviors.
- Generation prompt: soft storybook/felt-watercolor 2D game character sheet on a flat chroma-key background.
- Processing: the generated chroma-key sheet was converted to alpha, cropped into runtime frames in `frames/`, and normalized to a 512x512 transparent canvas with bottom-center anchoring.
- Cleanup pass 2026-06-07: removed neighboring-pose fragments from the groom, nap-curl, and settle-back runtime frames; kept plant-proud sparkle fragments as intentional pose detail.
- Living-animation pass 2026-06-07: runtime clips now use posture variation, subtle lean/scale motion, sleep breathing, and stable ground offsets instead of constant full-body bouncing; ambient idle blinking is disabled until a smoother blink asset exists.
- Review tooling: run `corepack pnpm exec node scripts/audit-pet-frames.mjs` and `corepack pnpm exec node scripts/render-pet-frame-sheet.mjs` after any pet frame update.
- Full art pass: the current source sheet contains idle, blink, curious, head-butt, settle, stretch, groom, nap, sleep, wake, and proud planting poses.
- Dark-mode pass 2026-06-10: `frames-dark/` contains moonlit runtime siblings produced with `node scripts/create-dark-asset-variants.mjs` from the transparent generated frames. The script preserves the 512x512 canvases and existing bottom-center anchoring so animation offsets remain stable.

Do not treat the generated source sheets as final production art. Future passes can still improve edge matte quality and animation timing, but the runtime frame proportions are stable for the browser prototype.
