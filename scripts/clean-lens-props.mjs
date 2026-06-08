import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const projectRoot = new URL('..', import.meta.url).pathname;
const propDir = path.join(projectRoot, 'src/assets/lenses/props');
const alphaThreshold = 8;
const outputPadding = 24;

const files = fs.readdirSync(propDir).filter((file) => file.endsWith('.png')).sort();

for (const file of files) {
  const filePath = path.join(propDir, file);
  const source = PNG.sync.read(fs.readFileSync(filePath));
  removeDetachedEdgeArtifacts(source);
  defringeMagentaEdges(source);
  const cleaned = cropAndPad(source, outputPadding);
  fs.writeFileSync(filePath, PNG.sync.write(cleaned));

  const metrics = collectMetrics(cleaned);
  console.log(`${file}\t${cleaned.width}x${cleaned.height}\tbbox=${metrics.bbox}\tmargins=${metrics.margins}\tsemiMagenta=${metrics.semiMagenta}`);
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

function defringeMagentaEdges(png) {
  const replacements = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha <= 0 || alpha >= 252 || !isMagentaFringe(png.data[index], png.data[index + 1], png.data[index + 2])) continue;

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

function nearestOpaqueObjectColor(png, x, y) {
  for (let radius = 1; radius <= 12; radius += 1) {
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
        if (isMagentaFringe(r, g, b)) continue;
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
  let semiMagenta = 0;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (alpha > 5 && alpha < 245 && isMagentaFringe(png.data[index], png.data[index + 1], png.data[index + 2])) semiMagenta += 1;
    }
  }

  if (!bounds) return { bbox: 'empty', margins: 'n/a', semiMagenta };
  return {
    bbox: `${bounds.minX},${bounds.minY}..${bounds.maxX},${bounds.maxY}`,
    margins: `${bounds.minX},${bounds.minY},${png.width - 1 - bounds.maxX},${png.height - 1 - bounds.maxY}`,
    semiMagenta
  };
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

function isMagentaFringe(red, green, blue) {
  return red > 200 && blue > 180 && green < 190 && red - green > 45 && blue - green > 35;
}

function alphaAt(png, x, y) {
  return png.data[pixelIndex(png, x, y) + 3];
}

function pixelIndex(png, x, y) {
  return (y * png.width + x) * 4;
}
