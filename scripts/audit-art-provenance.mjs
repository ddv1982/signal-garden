#!/usr/bin/env node
/**
 * Checks committed art against art-source/provenance.json.
 *
 * The gap this closes: neither light backdrop has a master, and nothing said
 * so. One of them was quietly re-encoded in 0.1.19, losing quality on the only
 * copy that exists, and nothing noticed. Masters and masters-of-record are
 * therefore hash-pinned here, so the next accidental re-encode fails loudly.
 *
 * Unlisted art also fails, because the way this class of gap appears is that
 * someone adds art and nobody records where it came from.
 *
 *   node scripts/audit-art-provenance.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const manifestPath = path.join(projectRoot, 'art-source/provenance.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Anything matching these is art that must have a provenance entry.
const TRACKED = [
  { dir: 'art-source', pattern: /\.(png|jpe?g|webp)$/i, recursive: true },
  { dir: 'src/assets/garden', pattern: /^background-.*\.(png|jpe?g|webp)$/i, recursive: false },
];

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative = (file) => path.relative(projectRoot, file).split(path.sep).join('/');

function collect({ dir, pattern, recursive }) {
  const root = path.join(projectRoot, dir);
  if (!fs.existsSync(root)) return [];
  const found = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive) walk(full);
      } else if (pattern.test(entry.name)) {
        found.push(relative(full));
      }
    }
  };
  walk(root);
  return found;
}

function describeRecipe(entry) {
  if (entry.regenerateWith) return entry.regenerateWith;
  const steps = [];
  if (entry.regenerate?.resize) steps.push(`resize(${entry.regenerate.resize.join(', ')})`);
  if (entry.regenerate?.webp) {
    const options = Object.entries(entry.regenerate.webp)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    steps.push(`webp({ ${options} })`);
  }
  return steps.length ? `sharp(master).${steps.join('.')}` : 'recipe not recorded';
}

const failures = [];
const warnings = [];
const listed = new Set();
let pinned = 0;
let verified = 0;

for (const entry of manifest.files) {
  listed.add(entry.path);
  const full = path.join(projectRoot, entry.path);
  const exists = fs.existsSync(full);
  const isPinned = entry.role === 'master' || entry.role === 'master-of-record';

  if (isPinned) {
    if (!exists) {
      failures.push(`${entry.path}: ${entry.role} is missing. This art has no other source.`);
      continue;
    }
    const actual = sha256(full);
    if (actual !== entry.sha256) {
      failures.push(
        `${entry.path}: ${entry.role} changed.\n` +
          `    expected ${entry.sha256}\n` +
          `    actual   ${actual}\n` +
          `    Nothing can regenerate this file. If the change is deliberate, update the pin in\n` +
          `    art-source/provenance.json in the same commit and say why.`
      );
      continue;
    }
    pinned += 1;
    if (entry.duplicateOf) {
      warnings.push(`${entry.path}: byte-identical duplicate of ${entry.duplicateOf}`);
    }
    continue;
  }

  // Derived art is allowed to be absent; the point of recording the recipe is
  // that the file does not have to be kept.
  if (!exists) continue;

  const master = path.join(projectRoot, entry.derivedFrom ?? '');
  if (!entry.derivedFrom || !fs.existsSync(master)) {
    failures.push(
      `${entry.path}: derived from ${entry.derivedFrom ?? '(unrecorded)'}, which is missing.`
    );
    continue;
  }

  if (entry.reproducible === false) {
    warnings.push(`${entry.path}: does not reproduce byte for byte from ${entry.derivedFrom}`);
    continue;
  }

  if (!entry.regenerate) continue;
  let image = sharp(master);
  if (entry.regenerate.resize) image = image.resize(...entry.regenerate.resize);
  if (entry.regenerate.webp) image = image.webp(entry.regenerate.webp);
  const regenerated = await image.toBuffer();
  if (Buffer.compare(regenerated, fs.readFileSync(full)) !== 0) {
    failures.push(
      `${entry.path}: recorded recipe no longer reproduces it.\n` +
        `    recipe: ${describeRecipe(entry)}`
    );
    continue;
  }
  verified += 1;
}

for (const source of TRACKED) {
  for (const file of collect(source)) {
    if (file === 'art-source/provenance.json') continue;
    if (!listed.has(file)) {
      failures.push(
        `${file}: committed art with no provenance entry.\n` +
          `    Add it to art-source/provenance.json as a master (nothing regenerates it)\n` +
          `    or as derived (record derivedFrom and the recipe).`
      );
    }
  }
}

console.log(`art provenance: ${pinned} pinned, ${verified} regenerated and matched`);
for (const warning of warnings) console.log(`  note: ${warning}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):\n`);
  for (const failure of failures) console.error(`  ${failure}\n`);
  process.exit(1);
}

console.log('all recorded art accounted for');
