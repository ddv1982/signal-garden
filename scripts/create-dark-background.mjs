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
    const skyAmount = mix(0.28, 0.12, groundWeight);
    const groundAmount = mix(0.18, 0.34, groundWeight);
    const warmGlow = red > 150 && green > 110 && blue < 120 && luminance > 0.42;
    const moon = [34, 85, 92];
    const deep = [9, 24, 27];
    const warm = [224, 170, 88];

    let nextRed = red * (0.35 + luminance * 0.12);
    let nextGreen = green * (0.42 + luminance * 0.12);
    let nextBlue = blue * (0.58 + luminance * 0.1);

    nextRed = mix(nextRed, deep[0], groundAmount * 0.46);
    nextGreen = mix(nextGreen, deep[1], groundAmount * 0.38);
    nextBlue = mix(nextBlue, moon[2], skyAmount);

    if (warmGlow) {
      nextRed = mix(nextRed, warm[0], 0.32);
      nextGreen = mix(nextGreen, warm[1], 0.24);
      nextBlue = mix(nextBlue, warm[2], 0.08);
    } else {
      nextRed = mix(nextRed, moon[0], 0.16);
      nextGreen = mix(nextGreen, moon[1], 0.2);
      nextBlue = mix(nextBlue, moon[2], 0.18);
    }

    output[index] = clamp(nextRed);
    output[index + 1] = clamp(nextGreen);
    output[index + 2] = clamp(nextBlue);
  }
}

addGlow(output, info, 0.77, 0.38, 120, [232, 181, 93], 0.26);
addGlow(output, info, 0.075, 0.78, 92, [232, 181, 93], 0.18);
addGlow(output, info, 0.51, 0.69, 180, [186, 226, 220], 0.12);

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
await sharp(output, {
  raw: {
    width: info.width,
    height: info.height,
    channels: info.channels
  }
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
