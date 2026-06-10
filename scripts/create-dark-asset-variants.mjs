import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

const assetGroups = [
  {
    from: 'src/assets/companion/frames',
    to: 'src/assets/companion/frames-dark',
    kind: 'companion'
  },
  {
    from: 'src/assets/garden/props',
    to: 'src/assets/garden/props-dark',
    kind: 'garden'
  },
  {
    from: 'src/assets/lenses/props',
    to: 'src/assets/lenses/props-dark',
    kind: 'lens'
  }
];

for (const group of assetGroups) {
  const sourceDir = path.join(projectRoot, group.from);
  const targetDir = path.join(projectRoot, group.to);
  fs.mkdirSync(targetDir, { recursive: true });

  for (const file of fs.readdirSync(sourceDir).filter((item) => item.endsWith('.png')).sort()) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    const source = PNG.sync.read(fs.readFileSync(sourcePath));
    const output = tintForDarkMode(source, group.kind);
    fs.writeFileSync(targetPath, PNG.sync.write(output));
    console.log(`${group.to}/${file}`);
  }
}

function tintForDarkMode(source, kind) {
  const output = new PNG({ width: source.width, height: source.height, colorType: 6 });
  source.data.copy(output.data);

  const moon = kind === 'companion'
    ? [191, 215, 214]
    : kind === 'lens'
      ? [188, 226, 220]
      : [174, 212, 196];
  const warmth = kind === 'lens' ? [232, 190, 126] : [222, 181, 119];
  const strength = kind === 'companion' ? 0.18 : 0.26;
  const exposure = kind === 'companion' ? 0.88 : 0.78;

  for (let index = 0; index < output.data.length; index += 4) {
    const alpha = output.data[index + 3];
    if (alpha === 0) continue;

    const red = output.data[index];
    const green = output.data[index + 1];
    const blue = output.data[index + 2];
    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
    const isWarmGlow = red > green + 16 && green > blue + 8 && luminance > 0.45;
    const tint = isWarmGlow ? warmth : moon;
    const tintAmount = isWarmGlow ? strength * 0.55 : strength;

    output.data[index] = clamp(red * exposure * (kind === 'companion' ? 1 : 0.86) + tint[0] * tintAmount);
    output.data[index + 1] = clamp(green * exposure + tint[1] * tintAmount);
    output.data[index + 2] = clamp(blue * Math.min(1.08, exposure + 0.2) + tint[2] * tintAmount);

    if (luminance < 0.18) {
      output.data[index] = clamp(output.data[index] + moon[0] * 0.08);
      output.data[index + 1] = clamp(output.data[index + 1] + moon[1] * 0.08);
      output.data[index + 2] = clamp(output.data[index + 2] + moon[2] * 0.08);
    }
  }

  return output;
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
