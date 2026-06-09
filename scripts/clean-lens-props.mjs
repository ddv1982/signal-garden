import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const projectRoot = new URL('..', import.meta.url).pathname;
const propDir = path.join(projectRoot, 'src/assets/lenses/props');
const sourceSheetPath = path.join(projectRoot, 'src/assets/lenses/source/garden-lens-sheet-chromakey.png');
const alphaThreshold = 8;
const outputPadding = 24;
const sourceCrops = {
  'action-basket.png': { x: 935, y: 760, width: 365, height: 264 },
  'body-ripple.png': { x: 408, y: 528, width: 350, height: 225 },
  'emotion-lantern.png': { x: 810, y: 522, width: 270, height: 244 },
  'image-cloud.png': { x: 1085, y: 535, width: 370, height: 235 },
  'observer-pool.png': { x: 230, y: 765, width: 365, height: 245 }
};

const files = fs.readdirSync(propDir).filter((file) => file.endsWith('.png')).sort();
const sourceSheet = PNG.sync.read(fs.readFileSync(sourceSheetPath));

for (const file of files) {
  const filePath = path.join(propDir, file);
  const source = sourceCrops[file] ? cropSourceSheet(sourceSheet, sourceCrops[file]) : PNG.sync.read(fs.readFileSync(filePath));
  removeChromaKeyBackground(source);
  removeDetachedEdgeArtifacts(source);
  if (file === 'emotion-lantern.png') removeSmallDetachedArtifacts(source, 80);
  defringeChromaKeyEdges(source);
  removePinkMatteEdges(source);
  defringeGreenKeyEdges(source);
  softenGreenMatteEdges(source);
  if (file === 'image-cloud.png') softenCloudBrightHalo(source);
  if (file === 'observer-pool.png') removeObserverLowerPinkMatte(source);
  if (!hasSemiTransparentAlpha(source)) featherAlphaEdges(source);
  bleedTransparentEdgeColors(source);
  const cleaned = cropAndPad(source, outputPadding);
  if (file === 'observer-pool.png') {
    removeObserverLowerPinkMatte(cleaned);
    bleedTransparentEdgeColors(cleaned);
  }
  fs.writeFileSync(filePath, PNG.sync.write(cleaned));

  const metrics = collectMetrics(cleaned);
  console.log(`${file}\t${cleaned.width}x${cleaned.height}\tbbox=${metrics.bbox}\tmargins=${metrics.margins}\tchromaKey=${metrics.chromaKey}`);
}

function cropSourceSheet(sheet, crop) {
  const output = new PNG({ width: crop.width, height: crop.height, colorType: 6 });
  output.data.fill(0);

  for (let y = 0; y < crop.height; y += 1) {
    for (let x = 0; x < crop.width; x += 1) {
      const sourceIndex = pixelIndex(sheet, crop.x + x, crop.y + y);
      const targetIndex = pixelIndex(output, x, y);
      output.data[targetIndex] = sheet.data[sourceIndex];
      output.data[targetIndex + 1] = sheet.data[sourceIndex + 1];
      output.data[targetIndex + 2] = sheet.data[sourceIndex + 2];
      output.data[targetIndex + 3] = sheet.data[sourceIndex + 3];
    }
  }

  return output;
}

function removeChromaKeyBackground(png) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha <= 0) continue;
      if (!isChromaKey(png.data[index], png.data[index + 1], png.data[index + 2])) continue;
      png.data[index + 3] = 0;
    }
  }
}

function removeDetachedEdgeArtifacts(png) {
  const components = collectComponents(png);
  const largest = components[0];
  if (!largest) return;

  for (const component of components.slice(1)) {
    if (!touchesImageEdge(component, png) || component.count < 80) continue;
    for (const [x, y] of component.pixels) {
      const index = pixelIndex(png, x, y);
      png.data[index + 3] = 0;
    }
  }
}

function removeSmallDetachedArtifacts(png, minimumPixels) {
  const components = collectComponents(png);

  for (const component of components.slice(1)) {
    if (component.count >= minimumPixels) continue;
    for (const [x, y] of component.pixels) {
      const index = pixelIndex(png, x, y);
      png.data[index + 3] = 0;
    }
  }
}

function defringeChromaKeyEdges(png) {
  const replacements = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha <= 0 || alpha >= 252 || !isChromaKey(png.data[index], png.data[index + 1], png.data[index + 2])) continue;

      const replacement = nearestOpaqueObjectColor(png, x, y);
      replacements.push({ index, replacement });
    }
  }

  for (const { index, replacement } of replacements) {
    if (!replacement) {
      png.data[index + 3] = 0;
      continue;
    }
    png.data[index] = replacement[0];
    png.data[index + 1] = replacement[1];
    png.data[index + 2] = replacement[2];
  }
}

function removePinkMatteEdges(png) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha <= 0 || alpha > 120 || !isPinkMatteFringe(png.data[index], png.data[index + 1], png.data[index + 2], alpha)) continue;
      if (!hasTransparentNeighbor(png, x, y, 3)) continue;
      png.data[index + 3] = 0;
    }
  }
}

function defringeGreenKeyEdges(png) {
  const replacements = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha <= 0 || alpha >= 252 || !isGreenChromaFringe(png.data[index], png.data[index + 1], png.data[index + 2], alpha)) continue;
      if (!hasTransparentNeighbor(png, x, y, 2)) continue;

      const replacement = nearestOpaqueObjectColor(png, x, y, 14, true);
      replacements.push({ index, replacement });
    }
  }

  for (const { index, replacement } of replacements) {
    if (!replacement) {
      png.data[index + 3] = Math.min(png.data[index + 3], 120);
      continue;
    }

    png.data[index] = replacement[0];
    png.data[index + 1] = replacement[1];
    png.data[index + 2] = replacement[2];
  }
}

function softenGreenMatteEdges(png) {
  const replacements = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha <= 0 || alpha >= 252 || !isGreenMatteFringe(png.data[index], png.data[index + 1], png.data[index + 2], alpha)) continue;
      if (!hasTransparentNeighbor(png, x, y, 3)) continue;

      const replacement = nearestOpaqueObjectColor(png, x, y, 14, true);
      replacements.push({ index, replacement });
    }
  }

  for (const { index, replacement } of replacements) {
    if (!replacement) {
      png.data[index + 3] = 0;
      continue;
    }

    png.data[index] = replacement[0];
    png.data[index + 1] = replacement[1];
    png.data[index + 2] = replacement[2];

    if (isGreenMatteFringe(png.data[index], png.data[index + 1], png.data[index + 2], png.data[index + 3])) {
      png.data[index + 3] = 0;
    }
  }
}

function softenCloudBrightHalo(png) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha <= 0 || alpha >= 252 || !isBrightCloudHalo(png.data[index], png.data[index + 1], png.data[index + 2], alpha)) continue;
      if (!hasTransparentNeighbor(png, x, y, 3)) continue;
      png.data[index + 3] = Math.min(alpha, 45);
    }
  }
}

function featherAlphaEdges(png) {
  const sourceAlpha = new Uint8Array(png.width * png.height);
  const solidMask = new Uint8Array(png.width * png.height);

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const maskIndex = y * png.width + x;
      const alpha = alphaAt(png, x, y);
      sourceAlpha[maskIndex] = alpha;
      solidMask[maskIndex] = alpha >= 180 ? 1 : 0;
    }
  }

  const replacements = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const maskIndex = y * png.width + x;
      let solidNeighbors = 0;

      for (let yy = Math.max(0, y - 1); yy <= Math.min(png.height - 1, y + 1); yy += 1) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(png.width - 1, x + 1); xx += 1) {
          solidNeighbors += solidMask[yy * png.width + xx];
        }
      }

      if (solidNeighbors === 0 || (solidNeighbors === 9 && solidMask[maskIndex])) continue;

      const alpha = Math.round((solidNeighbors / 9) * 255);
      const replacement = nearestOpaqueObjectColor(png, x, y, 4, true);
      replacements.push({ index: pixelIndex(png, x, y), alpha, replacement, sourceAlpha: sourceAlpha[maskIndex] });
    }
  }

  for (const { index, alpha, replacement, sourceAlpha } of replacements) {
    if (replacement && !isChromaKey(replacement[0], replacement[1], replacement[2])) {
      png.data[index] = replacement[0];
      png.data[index + 1] = replacement[1];
      png.data[index + 2] = replacement[2];
    } else if (sourceAlpha === 0) {
      png.data[index] = 0;
      png.data[index + 1] = 0;
      png.data[index + 2] = 0;
    }

    png.data[index + 3] = alpha;
  }
}

function bleedTransparentEdgeColors(png) {
  const replacements = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      if (png.data[index + 3] !== 0) continue;
      replacements.push({ index, replacement: nearestOpaqueObjectColor(png, x, y, 4, true) });
    }
  }

  for (const { index, replacement } of replacements) {
    if (!replacement || isChromaKey(replacement[0], replacement[1], replacement[2])) {
      png.data[index] = 0;
      png.data[index + 1] = 0;
      png.data[index + 2] = 0;
      continue;
    }

    png.data[index] = replacement[0];
    png.data[index + 1] = replacement[1];
    png.data[index + 2] = replacement[2];
  }
}

function nearestOpaqueObjectColor(png, x, y, maxRadius = 12, rejectFringe = false) {
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;

    for (let yy = Math.max(0, y - radius); yy <= Math.min(png.height - 1, y + radius); yy += 1) {
      for (let xx = Math.max(0, x - radius); xx <= Math.min(png.width - 1, x + radius); xx += 1) {
        if (Math.abs(xx - x) !== radius && Math.abs(yy - y) !== radius) continue;
        const index = pixelIndex(png, xx, yy);
        const alpha = png.data[index + 3];
        if (alpha < 230) continue;
        const r = png.data[index];
        const g = png.data[index + 1];
        const b = png.data[index + 2];
        if (isChromaKey(r, g, b)) continue;
        if (rejectFringe && isGreenMatteFringe(r, g, b, alpha)) continue;
        red += r;
        green += g;
        blue += b;
        count += 1;
      }
    }

    if (count > 0) {
      return [Math.round(red / count), Math.round(green / count), Math.round(blue / count)];
    }
  }

  return null;
}

function cropAndPad(source, padding) {
  const bounds = alphaBounds(source);
  if (!bounds) return source;

  const width = bounds.maxX - bounds.minX + 1 + padding * 2;
  const height = bounds.maxY - bounds.minY + 1 + padding * 2;
  const output = new PNG({ width, height, colorType: 6 });
  output.data.fill(0);

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const sourceIndex = pixelIndex(source, x, y);
      const targetIndex = pixelIndex(output, x - bounds.minX + padding, y - bounds.minY + padding);
      output.data[targetIndex] = source.data[sourceIndex];
      output.data[targetIndex + 1] = source.data[sourceIndex + 1];
      output.data[targetIndex + 2] = source.data[sourceIndex + 2];
      output.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }

  return output;
}

function collectComponents(png) {
  const seen = new Uint8Array(png.width * png.height);
  const components = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const start = y * png.width + x;
      if (seen[start] || alphaAt(png, x, y) <= alphaThreshold) continue;

      const component = { count: 0, minX: x, minY: y, maxX: x, maxY: y, pixels: [] };
      const stack = [[x, y]];
      seen[start] = 1;

      while (stack.length > 0) {
        const [currentX, currentY] = stack.pop();
        component.count += 1;
        component.pixels.push([currentX, currentY]);
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
          if (nextX < 0 || nextY < 0 || nextX >= png.width || nextY >= png.height) continue;
          const nextIndex = nextY * png.width + nextX;
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

function collectMetrics(png) {
  const bounds = alphaBounds(png);
  let chromaKey = 0;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha > 5 && isChromaKey(png.data[index], png.data[index + 1], png.data[index + 2])) chromaKey += 1;
    }
  }

  if (!bounds) return { bbox: 'empty', margins: 'n/a', chromaKey };
  return {
    bbox: `${bounds.minX},${bounds.minY}..${bounds.maxX},${bounds.maxY}`,
    margins: `${bounds.minX},${bounds.minY},${png.width - 1 - bounds.maxX},${png.height - 1 - bounds.maxY}`,
    chromaKey
  };
}

function hasSemiTransparentAlpha(png) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = alphaAt(png, x, y);
      if (alpha > alphaThreshold && alpha < 245) return true;
    }
  }

  return false;
}

function alphaBounds(png) {
  const bounds = { minX: png.width, minY: png.height, maxX: -1, maxY: -1 };
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (alphaAt(png, x, y) <= alphaThreshold) continue;
      if (x < bounds.minX) bounds.minX = x;
      if (y < bounds.minY) bounds.minY = y;
      if (x > bounds.maxX) bounds.maxX = x;
      if (y > bounds.maxY) bounds.maxY = y;
    }
  }
  return bounds.maxX >= 0 ? bounds : null;
}

function touchesImageEdge(component, png) {
  return component.minX === 0 || component.minY === 0 || component.maxX === png.width - 1 || component.maxY === png.height - 1;
}

function isChromaKey(red, green, blue) {
  return isMagentaChromaKey(red, green, blue);
}

function isMagentaChromaKey(red, green, blue) {
  return red > 200 && blue > 170 && green < 195 && red - green > 45 && blue - green > 24;
}

function isGreenChromaFringe(red, green, blue, alpha = 255) {
  return alpha < 252 && green > 220 && green - red > 34 && green - blue > 34 && Math.max(red, blue) < 210;
}

function isGreenMatteFringe(red, green, blue, alpha = 255) {
  return (
    isGreenChromaFringe(red, green, blue, alpha) ||
    (alpha < 252 && green > red + 8 && green > blue + 8) ||
    (alpha < 180 && red > blue + 25 && green > blue + 20 && green >= red - 20)
  );
}

function removeObserverLowerPinkMatte(png) {
  for (let y = Math.floor(png.height * 0.72); y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha <= 0 || alpha > 230 || !isLowerPinkMatte(png.data[index], png.data[index + 1], png.data[index + 2])) continue;
      if (!hasTransparentNeighbor(png, x, y, 4)) continue;
      png.data[index + 3] = 0;
    }
  }
}

function isBrightCloudHalo(red, green, blue, alpha = 255) {
  return alpha < 252 && red > 205 && green > 205 && blue > 170;
}

function isPinkMatteFringe(red, green, blue, alpha = 255) {
  return alpha <= 120 && red > 220 && blue > 150 && green < 210 && red - green > 30 && blue - green > 0;
}

function isLowerPinkMatte(red, green, blue) {
  return red > 180 && blue > 120 && red > green + 20 && blue > green - 20;
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

function alphaAt(png, x, y) {
  return png.data[pixelIndex(png, x, y) + 3];
}

function pixelIndex(png, x, y) {
  return (y * png.width + x) * 4;
}
