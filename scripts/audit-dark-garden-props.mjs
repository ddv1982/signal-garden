import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const lightDir = path.join(projectRoot, 'src/assets/garden/props');
const darkDir = path.join(projectRoot, 'src/assets/garden/props-dark');
const alphaThreshold = 8;
const boundsTolerance = 1;

const lightFiles = fs
  .readdirSync(lightDir)
  .filter((file) => file.endsWith('.png'))
  .sort();
const darkFiles = fs
  .readdirSync(darkDir)
  .filter((file) => file.endsWith('.png'))
  .sort();
let hasFailure = false;

for (const file of lightFiles) {
  const lightPath = path.join(lightDir, file);
  const darkPath = path.join(darkDir, file);

  if (!fs.existsSync(darkPath)) {
    hasFailure = true;
    console.error(`FAIL ${file}: missing dark sibling`);
    continue;
  }

  const light = PNG.sync.read(fs.readFileSync(lightPath));
  const dark = PNG.sync.read(fs.readFileSync(darkPath));
  const lightBounds = alphaBounds(light);
  const darkBounds = alphaBounds(dark);

  console.log(
    [
      file,
      `light=${light.width}x${light.height}`,
      `dark=${dark.width}x${dark.height}`,
      `lightBounds=${formatBounds(lightBounds)}`,
      `darkBounds=${formatBounds(darkBounds)}`,
    ].join('\t')
  );

  if (light.width !== dark.width || light.height !== dark.height) {
    hasFailure = true;
    console.error(`  FAIL ${file}: dark dimensions must match light dimensions`);
  }

  if (!boundsClose(lightBounds, darkBounds)) {
    hasFailure = true;
    console.error(
      `  FAIL ${file}: dark alpha bounds drifted beyond ${boundsTolerance}px from light bounds`
    );
  }
}

for (const file of darkFiles) {
  if (!lightFiles.includes(file)) {
    hasFailure = true;
    console.error(`FAIL ${file}: dark prop has no light sibling`);
  }
}

if (hasFailure) process.exit(1);

function alphaBounds(png) {
  const bounds = { minX: png.width, minY: png.height, maxX: -1, maxY: -1 };
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[pixelIndex(png, x, y) + 3] <= alphaThreshold) continue;
      if (x < bounds.minX) bounds.minX = x;
      if (y < bounds.minY) bounds.minY = y;
      if (x > bounds.maxX) bounds.maxX = x;
      if (y > bounds.maxY) bounds.maxY = y;
    }
  }

  return bounds.maxX >= 0 ? bounds : null;
}

function boundsClose(left, right) {
  if (!left || !right) return left === right;
  return (
    Math.abs(left.minX - right.minX) <= boundsTolerance &&
    Math.abs(left.minY - right.minY) <= boundsTolerance &&
    Math.abs(left.maxX - right.maxX) <= boundsTolerance &&
    Math.abs(left.maxY - right.maxY) <= boundsTolerance
  );
}

function formatBounds(bounds) {
  return bounds ? `${bounds.minX},${bounds.minY}..${bounds.maxX},${bounds.maxY}` : 'empty';
}

function pixelIndex(png, x, y) {
  return (y * png.width + x) * 4;
}
