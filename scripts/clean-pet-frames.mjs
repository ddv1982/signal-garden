import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const projectRoot = new URL('..', import.meta.url).pathname;
const frameDir = path.join(projectRoot, 'src/assets/companion/frames');
const alphaThreshold = 8;

const cleanupMasks = {
  'groom.png': [
    { x: 100, y: 36, width: 76, height: 16 },
    { x: 100, y: 460, width: 190, height: 42 },
  ],
  'nap-curl.png': [{ x: 440, y: 330, width: 52, height: 130 }],
  'settle-back.png': [
    { x: 20, y: 245, width: 94, height: 130 },
    { x: 462, y: 432, width: 30, height: 42 },
  ],
};

const files = fs
  .readdirSync(frameDir)
  .filter((file) => file.endsWith('.png'))
  .sort();

for (const fileName of files) {
  const filePath = path.join(frameDir, fileName);
  const png = PNG.sync.read(fs.readFileSync(filePath));

  for (const mask of cleanupMasks[fileName] ?? []) {
    for (let y = mask.y; y < mask.y + mask.height; y += 1) {
      for (let x = mask.x; x < mask.x + mask.width; x += 1) {
        if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
        const index = (y * png.width + x) * 4;
        png.data[index + 3] = 0;
      }
    }
  }
  defringeGreenKeyEdges(png);
  warmRemainingYellowGreenMatte(png);
  warmOpaqueSilhouetteMatte(png);
  softenRemainingGreenSpill(png);
  bleedTransparentEdgeColors(png);
  fs.writeFileSync(filePath, PNG.sync.write(png));
  console.log(`Cleaned ${fileName}`);
}

function defringeGreenKeyEdges(png) {
  const replacements = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (
        alpha <= 0 ||
        alpha >= 252 ||
        !isPetMatteSpill(png.data[index], png.data[index + 1], png.data[index + 2], alpha)
      )
        continue;
      if (!hasTransparentNeighbor(png, x, y, 4)) continue;

      const replacement = nearestOpaqueObjectColor(png, x, y, 14);
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

function bleedTransparentEdgeColors(png) {
  const replacements = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      if (png.data[index + 3] !== 0) continue;
      replacements.push({ index, replacement: nearestOpaqueObjectColor(png, x, y, 4) });
    }
  }

  for (const { index, replacement } of replacements) {
    if (!replacement) {
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

function softenRemainingGreenSpill(png) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      if (
        alpha <= 0 ||
        alpha >= 252 ||
        !isPetMatteSpill(png.data[index], png.data[index + 1], png.data[index + 2], alpha)
      )
        continue;
      if (!hasTransparentNeighbor(png, x, y, 6)) continue;
      png.data[index + 3] = 0;
    }
  }
}

function warmRemainingYellowGreenMatte(png) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      const red = png.data[index];
      const green = png.data[index + 1];
      const blue = png.data[index + 2];
      if (alpha <= 0 || alpha >= 252 || !isPetYellowGreenMatte(red, green, blue, alpha)) continue;
      if (!hasTransparentNeighbor(png, x, y, 6)) continue;

      const warmedRed = Math.min(255, Math.max(red, green + 18));
      const warmedGreen = Math.min(green, Math.round(warmedRed * 0.78));
      png.data[index] = warmedRed;
      png.data[index + 1] = warmedGreen;
      png.data[index + 2] = Math.min(blue, Math.max(0, warmedGreen - 12));
    }
  }
}

function warmOpaqueSilhouetteMatte(png) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = pixelIndex(png, x, y);
      const alpha = png.data[index + 3];
      const red = png.data[index];
      const green = png.data[index + 1];
      const blue = png.data[index + 2];
      if (alpha <= alphaThreshold || !isPetOpaqueYellowGreenMatte(red, green, blue, alpha))
        continue;
      if (!hasTransparentNeighbor(png, x, y, 6)) continue;

      const warmRed = Math.min(255, Math.max(red, green + 6));
      const warmGreen = Math.min(green, Math.round(warmRed * 0.82));
      const warmBlue = Math.max(blue, warmGreen - 24);
      png.data[index] = warmRed;
      png.data[index + 1] = warmGreen;
      png.data[index + 2] = warmBlue;
    }
  }
}

function nearestOpaqueObjectColor(png, x, y, maxRadius) {
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
        if (isPetMatteSpill(r, g, b, alpha)) continue;
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

function isGreenChromaFringe(red, green, blue, alpha = 255) {
  return (
    alpha < 252 && green > 145 && green - red > 34 && green - blue > 34 && Math.max(red, blue) < 210
  );
}

function isPetGreenSpill(red, green, blue, alpha = 255) {
  return (
    isGreenChromaFringe(red, green, blue, alpha) ||
    (alpha < 252 && green > red + 8 && green > blue + 8)
  );
}

function isPetOliveMatte(red, green, blue, alpha = 255) {
  return alpha < 180 && red > blue + 25 && green > blue + 20;
}

function isPetYellowGreenMatte(red, green, blue, alpha = 255) {
  return alpha < 252 && green >= red - 8 && green > blue + 20;
}

function isPetOpaqueYellowGreenMatte(red, green, blue, alpha = 255) {
  return alpha >= 180 && green >= red - 12 && green > blue + 28 && Math.max(red, green) > 105;
}

function isPetMatteSpill(red, green, blue, alpha = 255) {
  return (
    isPetGreenSpill(red, green, blue, alpha) ||
    isPetOliveMatte(red, green, blue, alpha) ||
    isPetOpaqueYellowGreenMatte(red, green, blue, alpha)
  );
}

function hasTransparentNeighbor(png, x, y, radius) {
  for (let yy = Math.max(0, y - radius); yy <= Math.min(png.height - 1, y + radius); yy += 1) {
    for (let xx = Math.max(0, x - radius); xx <= Math.min(png.width - 1, x + radius); xx += 1) {
      if (xx === x && yy === y) continue;
      if (png.data[pixelIndex(png, xx, yy) + 3] <= alphaThreshold) return true;
    }
  }

  return false;
}

function pixelIndex(png, x, y) {
  return (y * png.width + x) * 4;
}
