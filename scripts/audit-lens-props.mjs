import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const projectRoot = new URL('..', import.meta.url).pathname;
const propDir = path.join(projectRoot, 'src/assets/lenses/props');
const sourceSheetPath = path.join(projectRoot, 'src/assets/lenses/source/garden-lens-sheet-chromakey.png');
const alphaThreshold = 8;
const minimumMargin = 24;
const minimumSourceMargin = 3;
const sourceCrops = {
  'action-basket.png': { x: 935, y: 760, width: 365, height: 264 },
  'body-ripple.png': { x: 408, y: 528, width: 350, height: 225 },
  'emotion-lantern.png': { x: 810, y: 522, width: 270, height: 244 }
};

const files = fs.readdirSync(propDir).filter((file) => file.endsWith('.png')).sort();
const sourceSheet = PNG.sync.read(fs.readFileSync(sourceSheetPath));
let hasFailure = false;

for (const file of files) {
  const filePath = path.join(propDir, file);
  const png = PNG.sync.read(fs.readFileSync(filePath));
  const metrics = collectMetrics(png);
  const sourceMetrics = sourceCrops[file] ? collectSourceCropMetrics(sourceSheet, sourceCrops[file]) : null;

  console.log(`${file}\t${png.width}x${png.height}\tbbox=${metrics.bbox}\tmargins=${metrics.margins.join(',')}\tchromaKey=${metrics.chromaKey}`);

  if (metrics.margins.some((margin) => margin < minimumMargin)) {
    hasFailure = true;
    console.error(`  FAIL ${file}: expected at least ${minimumMargin}px transparent padding on every side`);
  }

  if (metrics.chromaKey > 0) {
    hasFailure = true;
    console.error(`  FAIL ${file}: chroma-key pixels remain`);
  }

  if (sourceMetrics) {
    console.log(`  sourceComponent=${sourceMetrics.bbox}\tsourceMargins=${sourceMetrics.margins.join(',')}`);

    if (sourceMetrics.margins.some((margin) => margin < minimumSourceMargin)) {
      hasFailure = true;
      console.error(`  FAIL ${file}: source crop should leave at least ${minimumSourceMargin}px around the main non-chroma artwork`);
    }
  }
}

if (hasFailure) process.exit(1);

function collectSourceCropMetrics(sheet, crop) {
  const seen = new Uint8Array(crop.width * crop.height);
  const components = [];

  for (let y = 0; y < crop.height; y += 1) {
    for (let x = 0; x < crop.width; x += 1) {
      const start = y * crop.width + x;
      if (seen[start] || !sourcePixelVisible(sheet, crop, x, y)) {
        seen[start] = 1;
        continue;
      }

      const component = { count: 0, minX: x, minY: y, maxX: x, maxY: y };
      const stack = [[x, y]];
      seen[start] = 1;

      while (stack.length > 0) {
        const [currentX, currentY] = stack.pop();
        component.count += 1;
        if (currentX < component.minX) component.minX = currentX;
        if (currentY < component.minY) component.minY = currentY;
        if (currentX > component.maxX) component.maxX = currentX;
        if (currentY > component.maxY) component.maxY = currentY;

        for (const [nextX, nextY] of [
          [currentX + 1, currentY],
          [currentX - 1, currentY],
          [currentX, currentY + 1],
          [currentX, currentY - 1]
        ]) {
          if (nextX < 0 || nextY < 0 || nextX >= crop.width || nextY >= crop.height) continue;
          const nextIndex = nextY * crop.width + nextX;
          if (seen[nextIndex]) continue;
          if (!sourcePixelVisible(sheet, crop, nextX, nextY)) {
            seen[nextIndex] = 1;
            continue;
          }

          seen[nextIndex] = 1;
          stack.push([nextX, nextY]);
        }
      }

      components.push(component);
    }
  }

  const bounds = components.sort((a, b) => b.count - a.count)[0];
  if (!bounds) return { bbox: 'empty', margins: [0, 0, 0, 0] };
  return {
    bbox: `${bounds.minX},${bounds.minY}..${bounds.maxX},${bounds.maxY}`,
    margins: [bounds.minX, bounds.minY, crop.width - 1 - bounds.maxX, crop.height - 1 - bounds.maxY]
  };
}

function sourcePixelVisible(sheet, crop, x, y) {
  const index = pixelIndex(sheet, crop.x + x, crop.y + y);
  return sheet.data[index + 3] > alphaThreshold && !isChromaKey(sheet.data[index], sheet.data[index + 1], sheet.data[index + 2]);
}

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
