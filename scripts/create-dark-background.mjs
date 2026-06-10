import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [, , inputPath, outputPath] = process.argv;
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const defaultInputWebp = path.join(projectRoot, 'src/assets/garden/background-v4.webp');
const defaultOutputJpg = path.join(projectRoot, 'src/assets/garden/background-dark.jpg');

const sourcePath = inputPath ?? defaultInputWebp;
const targetPath = outputPath ?? defaultOutputJpg;

if ((inputPath && !outputPath) || (!inputPath && outputPath)) {
  console.error('Usage: node scripts/create-dark-background.mjs [input-image output-image]');
  process.exit(1);
}

const { data, info } = await sharp(sourcePath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const output = Buffer.from(data);

for (let y = 0; y < info.height; y += 1) {
  const vertical = y / Math.max(1, info.height - 1);
  for (let x = 0; x < info.width; x += 1) {
    const index = (y * info.width + x) * info.channels;
    const red = output[index];
    const green = output[index + 1];
    const blue = output[index + 2];
    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
    const groundWeight = smoothstep(0.26, 0.68, vertical);
    const skyAmount = mix(0.48, 0.2, groundWeight);
    const groundAmount = mix(0.36, 0.62, groundWeight);
    const warmPixel = red > blue + 18 && green > blue + 8 && red > 118;
    const warmGlow = red > 168 && green > 128 && blue < 100 && luminance > 0.5;
    const moon = [22, 65, 91];
    const deep = [3, 11, 19];
    const earthShadow = [18, 35, 39];
    const warm = [174, 109, 60];

    let nextRed = red * (0.18 + luminance * 0.07);
    let nextGreen = green * (0.25 + luminance * 0.08);
    let nextBlue = blue * (0.42 + luminance * 0.12);

    nextRed = mix(nextRed, deep[0], groundAmount * 0.72);
    nextGreen = mix(nextGreen, deep[1], groundAmount * 0.66);
    nextBlue = mix(nextBlue, moon[2], skyAmount);

    if (warmGlow) {
      nextRed = mix(nextRed, warm[0], 0.12);
      nextGreen = mix(nextGreen, warm[1], 0.08);
      nextBlue = mix(nextBlue, warm[2], 0.03);
    } else if (warmPixel) {
      const amberMute = 0.24 + groundWeight * 0.3;
      nextRed = mix(nextRed, earthShadow[0], amberMute);
      nextGreen = mix(nextGreen, earthShadow[1], amberMute * 0.9);
      nextBlue = mix(nextBlue, earthShadow[2], amberMute * 0.7);
    } else {
      nextRed = mix(nextRed, moon[0], 0.24);
      nextGreen = mix(nextGreen, moon[1], 0.28);
      nextBlue = mix(nextBlue, moon[2], 0.28);
    }

    output[index] = clamp(nextRed);
    output[index + 1] = clamp(nextGreen);
    output[index + 2] = clamp(nextBlue);
  }
}

addGlow(output, info, 0.52, 0.16, 164, [124, 176, 209], 0.18);
addStars(output, info);
addMoon(output, info, 0.52, 0.16, 28);
addGlow(output, info, 0.77, 0.38, 104, [160, 95, 52], 0.08);
addGlow(output, info, 0.075, 0.78, 72, [146, 88, 50], 0.05);
addGlow(output, info, 0.51, 0.69, 180, [94, 167, 191], 0.12);
addVignette(output, info, 0.32);

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
await sharp(output, {
  raw: {
    width: info.width,
    height: info.height,
    channels: info.channels,
  },
})
  .jpeg({ quality: 88 })
  .toFile(targetPath);

console.log(`Wrote ${path.relative(projectRoot, targetPath)}`);

function addGlow(buffer, info, centerX, centerY, radius, color, strength) {
  const cx = info.width * centerX;
  const cy = info.height * centerY;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      if (distance > radius) continue;
      const amount = (1 - distance / radius) * strength;
      const index = (y * info.width + x) * info.channels;
      buffer[index] = clamp(mix(buffer[index], color[0], amount));
      buffer[index + 1] = clamp(mix(buffer[index + 1], color[1], amount));
      buffer[index + 2] = clamp(mix(buffer[index + 2], color[2], amount));
    }
  }
}

function addMoon(buffer, info, centerX, centerY, radius) {
  const cx = info.width * centerX;
  const cy = info.height * centerY;
  const craterColor = [180, 197, 190];
  const moonColor = [225, 232, 209];
  const rimColor = [244, 235, 187];

  for (
    let y = Math.max(0, Math.floor(cy - radius * 1.35));
    y < Math.min(info.height, Math.ceil(cy + radius * 1.35));
    y += 1
  ) {
    for (
      let x = Math.max(0, Math.floor(cx - radius * 1.35));
      x < Math.min(info.width, Math.ceil(cx + radius * 1.35));
      x += 1
    ) {
      const normalizedDistance = Math.hypot(x - cx, y - cy) / radius;
      if (normalizedDistance > 1.18) continue;

      const edge = smoothstep(1.18, 0.82, normalizedDistance);
      const core = Math.max(0, 1 - normalizedDistance);
      const speckle = moonNoise(x, y) * 0.1;
      const index = (y * info.width + x) * info.channels;
      const target = [
        mix(moonColor[0], craterColor[0], speckle),
        mix(moonColor[1], craterColor[1], speckle),
        mix(moonColor[2], craterColor[2], speckle),
      ];
      const rim = smoothstep(0.62, 1, normalizedDistance) * 0.22;

      buffer[index] = clamp(
        mix(buffer[index], mix(target[0], rimColor[0], rim), 0.82 * edge + core * 0.12)
      );
      buffer[index + 1] = clamp(
        mix(buffer[index + 1], mix(target[1], rimColor[1], rim), 0.82 * edge + core * 0.12)
      );
      buffer[index + 2] = clamp(
        mix(buffer[index + 2], mix(target[2], rimColor[2], rim), 0.82 * edge + core * 0.12)
      );
    }
  }
}

function addStars(buffer, info) {
  const stars = [
    [0.18, 0.12, 1.1, 0.28],
    [0.28, 0.18, 0.9, 0.22],
    [0.38, 0.1, 1, 0.24],
    [0.47, 0.2, 0.8, 0.2],
    [0.7, 0.11, 1.2, 0.26],
    [0.82, 0.2, 0.9, 0.18],
    [0.9, 0.13, 0.8, 0.16],
  ];

  for (const [centerX, centerY, radius, strength] of stars) {
    addGlow(buffer, info, centerX, centerY, radius * 4, [196, 222, 230], strength * 0.2);
    addGlow(buffer, info, centerX, centerY, radius, [232, 241, 224], strength);
  }
}

function addVignette(buffer, info, strength) {
  const cx = info.width * 0.5;
  const cy = info.height * 0.54;
  const maxDistance = Math.hypot(cx, cy);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const distance = Math.hypot(x - cx, y - cy) / maxDistance;
      const amount = Math.max(0, distance - 0.34) * strength;
      const index = (y * info.width + x) * info.channels;
      buffer[index] = clamp(buffer[index] * (1 - amount));
      buffer[index + 1] = clamp(buffer[index + 1] * (1 - amount * 0.9));
      buffer[index + 2] = clamp(buffer[index + 2] * (1 - amount * 0.78));
    }
  }
}

function moonNoise(x, y) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return Math.abs(value - Math.floor(value));
}

function mix(value, target, amount) {
  return value * (1 - amount) + target * amount;
}

function smoothstep(edge0, edge1, value) {
  const normalized = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return normalized * normalized * (3 - 2 * normalized);
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
