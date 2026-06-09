import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const projectRoot = new URL('..', import.meta.url).pathname;
const propDir = path.join(projectRoot, 'src/assets/lenses/props');
const alphaThreshold = 8;
const minimumMargin = 24;

const files = fs.readdirSync(propDir).filter((file) => file.endsWith('.png')).sort();
let hasFailure = false;

for (const file of files) {
  const filePath = path.join(propDir, file);
  const png = PNG.sync.read(fs.readFileSync(filePath));
  const metrics = collectMetrics(png);

  console.log(`${file}\t${png.width}x${png.height}\tbbox=${metrics.bbox}\tmargins=${metrics.margins.join(',')}\tchromaKey=${metrics.chromaKey}`);

  if (metrics.margins.some((margin) => margin < minimumMargin)) {
    hasFailure = true;
    console.error(`  FAIL ${file}: expected at least ${minimumMargin}px transparent padding on every side`);
  }

  if (metrics.chromaKey > 0) {
    hasFailure = true;
    console.error(`  FAIL ${file}: chroma-key pixels remain`);
  }
}

if (hasFailure) process.exit(1);

function collectMetrics(png) {
  const bounds = alphaBounds(png);
  let chromaKey = 0;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha > 5 && isChromaKey(png.data[index], png.data[index + 1], png.data[index + 2])) {
        chromaKey += 1;
      }
    }
  }

  if (!bounds) return { bbox: 'empty', margins: [0, 0, 0, 0], chromaKey };
  return {
    bbox: `${bounds.minX},${bounds.minY}..${bounds.maxX},${bounds.maxY}`,
    margins: [bounds.minX, bounds.minY, png.width - 1 - bounds.maxX, png.height - 1 - bounds.maxY],
    chromaKey
  };
}

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

function isChromaKey(red, green, blue) {
  return isMagentaChromaKey(red, green, blue);
}

function isMagentaChromaKey(red, green, blue) {
  return red > 200 && blue > 180 && green < 190 && red - green > 45 && blue - green > 35;
}

function pixelIndex(png, x, y) {
  return (y * png.width + x) * 4;
}
