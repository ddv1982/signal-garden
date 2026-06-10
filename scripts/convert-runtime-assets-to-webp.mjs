#!/usr/bin/env node
/**
 * Converts runtime sprite PNGs (companion frames, garden props, lens props)
 * to WebP and removes the PNG originals. Source generation sheets are not
 * touched. Run after regenerating assets from sheets:
 *   node scripts/convert-runtime-assets-to-webp.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Companion frames must stay lossless: lossy/near-lossless WebP shifts
// semi-transparent edge pixels enough to trip audit-pet-frames' matte check.
const RUNTIME_DIRS = [
  { dir: 'src/assets/companion/frames', options: { lossless: true, effort: 6 } },
  { dir: 'src/assets/companion/frames-dark', options: { lossless: true, effort: 6 } },
  { dir: 'src/assets/garden/props', options: { quality: 90, alphaQuality: 100, effort: 6 } },
  { dir: 'src/assets/garden/props-dark', options: { quality: 90, alphaQuality: 100, effort: 6 } },
  { dir: 'src/assets/lenses/props', options: { quality: 90, alphaQuality: 100, effort: 6 } },
  { dir: 'src/assets/lenses/props-dark', options: { quality: 90, alphaQuality: 100, effort: 6 } },
];

let beforeTotal = 0;
let afterTotal = 0;

for (const { dir, options } of RUNTIME_DIRS) {
  if (!fs.existsSync(dir)) {
    console.warn(`skip (missing): ${dir}`);
    continue;
  }
  const pngs = fs.readdirSync(dir).filter((file) => file.endsWith('.png'));
  for (const file of pngs) {
    const source = path.join(dir, file);
    const target = source.replace(/\.png$/, '.webp');
    const before = fs.statSync(source).size;
    await sharp(source).webp(options).toFile(target);
    const after = fs.statSync(target).size;
    fs.unlinkSync(source);
    beforeTotal += before;
    afterTotal += after;
    console.log(`${source} ${(before / 1024).toFixed(0)}K -> ${(after / 1024).toFixed(0)}K`);
  }
}

const saved = beforeTotal - afterTotal;
console.log(
  `\ntotal: ${(beforeTotal / 1048576).toFixed(1)}M -> ${(afterTotal / 1048576).toFixed(1)}M ` +
    `(saved ${(saved / 1048576).toFixed(1)}M, ${((saved / beforeTotal) * 100).toFixed(0)}%)`
);
