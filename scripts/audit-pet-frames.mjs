import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const inputDir = args.find((arg) => !arg.startsWith('--'));
const skipMatte = args.includes('--skip-matte');
const frameDir = inputDir
  ? path.resolve(projectRoot, inputDir)
  : path.join(projectRoot, 'src/assets/companion/frames');
const shouldAuditMatte = !skipMatte;
const expectedSize = 512;
const alphaThreshold = 8;
const edgeInset = 12;
const disconnectedComponentThreshold = 80;
const allowedDetachedComponents = {
  'plant-proud.png': 6,
};

const files = fs
  .readdirSync(frameDir)
  .filter((file) => file.endsWith('.png'))
  .sort();
let hasFailure = false;

for (const file of files) {
  const filePath = path.join(frameDir, file);
  const png = PNG.sync.read(fs.readFileSync(filePath));
  const metrics = collectMetrics(png);
  const allowedExtras = allowedDetachedComponents[file] ?? 0;
  const unexpectedExtras = metrics.extraComponents.slice(allowedExtras);

  console.log(
    [
      path.relative(projectRoot, filePath),
      `${png.width}x${png.height}`,
      `bbox=${metrics.bbox}`,
      `edgeAlpha=${metrics.edgeAlpha}`,
      `edgeMatte=${shouldAuditMatte ? metrics.edgeMatte : 'skipped'}`,
      `bottomMargin=${metrics.bottomMargin}`,
      `visualCenterX=${metrics.visualCenterX}`,
      `extras=${metrics.extraComponents.length}`,
    ].join('\t')
  );

  if (png.width !== expectedSize || png.height !== expectedSize) {
    hasFailure = true;
    console.error(`  FAIL ${file}: expected ${expectedSize}x${expectedSize}`);
  }

  if (metrics.edgeAlpha > 0) {
    hasFailure = true;
    console.error(`  FAIL ${file}: alpha pixels found within ${edgeInset}px of frame edge`);
  }

  if (shouldAuditMatte && metrics.edgeMatte > 0) {
    hasFailure = true;
    console.error(
      `  FAIL ${file}: green/olive matte pixels remain on the transparent silhouette edge`
    );
  }

  if (unexpectedExtras.length > 0) {
    hasFailure = true;
    console.error(
      `  FAIL ${file}: unexpected detached alpha components ${unexpectedExtras
        .map(
          (component) =>
            `${component.count}@${component.minX},${component.minY}..${component.maxX},${component.maxY}`
        )
        .join('; ')}`
    );
  }
}

if (hasFailure) process.exit(1);

function collectMetrics(png) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  let edgeAlpha = 0;
  let edgeMatte = 0;

  forEachAlphaPixel(png, (x, y, index) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (x < edgeInset || y < edgeInset || x >= png.width - edgeInset || y >= png.height - edgeInset)
      edgeAlpha += 1;
    if (
      hasTransparentNeighbor(png, x, y, 6) &&
      isPetMatteSpill(
        png.data[index],
        png.data[index + 1],
        png.data[index + 2],
        png.data[index + 3]
      )
    ) {
      edgeMatte += 1;
    }
  });

  const components = collectComponents(png);
  const extraComponents = components
    .slice(1)
    .filter((component) => component.count > disconnectedComponentThreshold);

  return {
    bbox: maxX >= 0 ? `${minX},${minY}..${maxX},${maxY}` : 'empty',
    bottomMargin: maxX >= 0 ? png.height - 1 - maxY : 'n/a',
    visualCenterX: maxX >= 0 ? ((minX + maxX) / 2).toFixed(1) : 'n/a',
    edgeAlpha,
    edgeMatte,
    extraComponents,
  };
}

function collectComponents(png) {
  const seen = new Uint8Array(png.width * png.height);
  const components = [];
  const indexFor = (x, y) => y * png.width + x;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const start = indexFor(x, y);
      if (seen[start] || alphaAt(png, x, y) <= alphaThreshold) continue;

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
          [currentX, currentY - 1],
        ]) {
          if (nextX < 0 || nextY < 0 || nextX >= png.width || nextY >= png.height) continue;
          const nextIndex = indexFor(nextX, nextY);
          if (!seen[nextIndex] && alphaAt(png, nextX, nextY) > alphaThreshold) {
            seen[nextIndex] = 1;
            stack.push([nextX, nextY]);
          }
        }
      }

      components.push(component);
    }
  }

  return components.sort((a, b) => b.count - a.count);
}

function forEachAlphaPixel(png, callback) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      if (png.data[index + 3] > alphaThreshold) callback(x, y, index);
    }
  }
}

function alphaAt(png, x, y) {
  return png.data[pixelIndex(png, x, y) + 3];
}

function hasTransparentNeighbor(png, x, y, radius) {
  for (let yy = Math.max(0, y - radius); yy <= Math.min(png.height - 1, y + radius); yy += 1) {
    for (let xx = Math.max(0, x - radius); xx <= Math.min(png.width - 1, x + radius); xx += 1) {
      if (xx === x && yy === y) continue;
      if (alphaAt(png, xx, yy) <= alphaThreshold) return true;
    }
  }

  return false;
}

function isPetMatteSpill(red, green, blue, alpha = 255) {
  return (
    isPetGreenSpill(red, green, blue, alpha) ||
    isPetOliveMatte(red, green, blue, alpha) ||
    isPetOpaqueYellowGreenMatte(red, green, blue, alpha)
  );
}

function isPetGreenSpill(red, green, blue, alpha = 255) {
  return (
    isGreenChromaFringe(red, green, blue, alpha) ||
    (alpha < 252 && green > red + 8 && green > blue + 8)
  );
}

function isGreenChromaFringe(red, green, blue, alpha = 255) {
  return (
    alpha < 252 && green > 145 && green - red > 34 && green - blue > 34 && Math.max(red, blue) < 210
  );
}

function isPetOliveMatte(red, green, blue, alpha = 255) {
  return alpha < 180 && red > blue + 25 && green > blue + 20;
}

function isPetOpaqueYellowGreenMatte(red, green, blue, alpha = 255) {
  return alpha >= 180 && green >= red - 12 && green > blue + 28 && Math.max(red, green) > 105;
}

function pixelIndex(png, x, y) {
  return (y * png.width + x) * 4;
}
