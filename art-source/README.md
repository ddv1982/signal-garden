# Art Source

Generation-time masters for Signal Garden. Nothing here is imported by the app,
bundled by Vite, or loaded by Phaser; these are the files that runtime art was
cut, resized and recoloured from. `scripts/clean-lens-props.mjs`,
`scripts/audit-lens-props.mjs` and the other asset audits read from here.

## Provenance

`provenance.json` records, for every committed art binary, whether it can be
regenerated and what from. `pnpm art:audit` checks it and runs in CI.

Three roles:

- **master** — generated source art. Nothing derives it, so deleting it loses
  it. Hash-pinned.
- **master-of-record** — a runtime asset that is itself the only surviving copy,
  because no master was ever committed. Hash-pinned and treated exactly like a
  master: never re-encode it.
- **derived** — reproducible from a master by the recorded recipe, so it does
  not need to be archived. Superseded derived art can be deleted; the recipe is
  the archive. Entries marked `reproducible` are regenerated and compared byte
  for byte on every run, so a recipe that stops matching its output is a
  failure rather than a comment that quietly goes stale.

Adding art without a provenance entry fails the audit. That is deliberate: the
way this gap appears is that someone commits art and nobody writes down where it
came from.

## Both light backdrops are irreplaceable

`src/assets/garden/background-v4.webp` (live) and `background-v3.webp`
(superseded) have no master. No larger or earlier version of either exists at
any point in git history, on any branch or tag, and the art came from a
generative workflow that does not reproduce deterministically from a prompt.
The shipped 1480x484 WebP is the master, whether or not anyone declared it one.

This already cost something. `background-v4.webp` was re-encoded in 0.1.19 for a
1.7% byte saving, which lost 39.32 dB on the only copy in existence. The hash
pins exist so that the next one fails CI instead of shipping. If a pinned file
has to change, update the pin in the same commit and say why.

## Why these stay in git rather than moving to LFS

Measured rather than assumed, over the whole history:

| Path                | Share of history | Blob versions | Regenerable |
| ------------------- | ---------------- | ------------- | ----------- |
| `docs/screenshots/` | 43.0%            | 51            | yes         |
| `src/assets/`       | 30.5%            | 241           | mostly      |
| `art-source/`       | 20.7%            | 7             | **no**      |

A full clone is about 72 MB and CI checks out shallow, so it pays the 44 MB
working tree. Neither number justifies taking on Git LFS, whose free tier caps
bandwidth at 1 GB/month across every clone, fork and CI checkout, and which
disables itself when exceeded — after which clones silently receive pointer
files instead of images and pushes are refused. Vercel also needs Git LFS
switched on per project or it deploys the pointer file, not the art.

That risk is worst for exactly this directory: it is the smallest of the three,
it has stopped growing (7 blob versions for 8 files), and it is the only part of
the repo that cannot be regenerated. The largest contributor is regenerable
screenshots.

Recompressing the masters is also a false saving. Lossless WebP shrinks them
24.6% (18.3 MB to 13.8 MB, pixel-identical), but committing the smaller files
adds 13.8 MB of new blobs while the originals stay reachable in history, so the
clone grows. Re-emitting them as PNG is worse still: they are already well
compressed and come out 29% larger.
