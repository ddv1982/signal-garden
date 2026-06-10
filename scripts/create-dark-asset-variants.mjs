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
    const output = tintForDarkMode(source, group.kind, file);
    fs.writeFileSync(targetPath, PNG.sync.write(output));
    console.log(`${group.to}/${file}`);
  }
}

function tintForDarkMode(source, kind, file) {
  const output = new PNG({ width: source.width, height: source.height, colorType: 6 });
  source.data.copy(output.data);

  const profile = darkProfileFor(kind, file);

  for (let index = 0; index < output.data.length; index += 4) {
    const alpha = output.data[index + 3];
    if (alpha === 0) continue;

    const red = output.data[index];
    const green = output.data[index + 1];
    const blue = output.data[index + 2];
    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
    const warmPixel = isWarmPixel(red, green, blue, luminance);
    const brightPixel = luminance > profile.highlightThreshold;
    const shadowPixel = luminance < profile.shadowThreshold;
    const tint = warmPixel ? profile.warmTint : profile.moonTint;
    const tintAmount = warmPixel ? profile.warmTintAmount : profile.moonTintAmount;
    const exposure = brightPixel
      ? profile.highlightExposure
      : shadowPixel
        ? profile.shadowExposure
        : profile.exposure;
    const contrastAmount = profile.contrast * (shadowPixel ? 0.55 : 1);
    const alphaFactor = alpha < 224 ? softAlphaFactor(alpha, profile) : 1;

    output.data[index] = gradeChannel(red, exposure, contrastAmount, tint[0], tintAmount, profile.redBias);
    output.data[index + 1] = gradeChannel(green, exposure, contrastAmount, tint[1], tintAmount, profile.greenBias);
    output.data[index + 2] = gradeChannel(blue, exposure, contrastAmount, tint[2], tintAmount, profile.blueBias);

    if (shadowPixel && profile.shadowLift > 0) {
      output.data[index] = clamp(output.data[index] + profile.moonTint[0] * profile.shadowLift);
      output.data[index + 1] = clamp(output.data[index + 1] + profile.moonTint[1] * profile.shadowLift);
      output.data[index + 2] = clamp(output.data[index + 2] + profile.moonTint[2] * profile.shadowLift);
    }

    if (brightPixel && profile.highlightWarmth > 0 && warmPixel) {
      output.data[index] = clamp(output.data[index] + profile.warmTint[0] * profile.highlightWarmth);
      output.data[index + 1] = clamp(output.data[index + 1] + profile.warmTint[1] * profile.highlightWarmth);
      output.data[index + 2] = clamp(output.data[index + 2] + profile.warmTint[2] * profile.highlightWarmth);
    }

    output.data[index + 3] = clamp(alpha * alphaFactor);
  }

  return output;
}

function darkProfileFor(kind, file) {
  const base = {
    moonTint: [132, 166, 171],
    warmTint: [212, 162, 101],
    moonTintAmount: 0.16,
    warmTintAmount: 0.1,
    exposure: 0.78,
    highlightExposure: 0.7,
    shadowExposure: 0.9,
    contrast: 0.02,
    shadowLift: 0.04,
    highlightWarmth: 0,
    highlightThreshold: 0.64,
    shadowThreshold: 0.2,
    softAlphaCutoff: 224,
    softAlphaScale: 1,
    softAlphaFloor: 0.82,
    redBias: 1,
    greenBias: 1,
    blueBias: 1.04
  };

  if (kind === 'companion') {
    return {
      ...base,
      moonTint: [116, 145, 153],
      warmTint: [184, 143, 107],
      moonTintAmount: 0.2,
      warmTintAmount: 0.1,
      exposure: 0.78,
      highlightExposure: 0.68,
      shadowExposure: 0.94,
      contrast: 0.05,
      shadowLift: 0.025,
      highlightWarmth: 0.035,
      highlightThreshold: 0.58,
      softAlphaScale: 1,
      blueBias: 1.03
    };
  }

  if (kind === 'garden') {
    return {
      ...base,
      moonTint: [112, 151, 142],
      warmTint: [204, 156, 91],
      moonTintAmount: 0.15,
      warmTintAmount: 0.13,
      exposure: 0.62,
      highlightExposure: 0.58,
      shadowExposure: 0.76,
      contrast: 0.07,
      shadowLift: 0.03,
      blueBias: 1.02
    };
  }

  const lensProfiles = {
    'action-basket.png': {
      warmTint: [218, 168, 99],
      moonTint: [126, 157, 145],
      exposure: 0.76,
      highlightExposure: 0.68,
      warmTintAmount: 0.1,
      moonTintAmount: 0.16,
      highlightWarmth: 0.02,
      softAlphaScale: 0.9,
      softAlphaFloor: 0.7
    },
    'body-ripple.png': {
      moonTint: [95, 168, 188],
      warmTint: [196, 160, 96],
      exposure: 0.78,
      highlightExposure: 0.68,
      moonTintAmount: 0.2,
      warmTintAmount: 0.04,
      contrast: 0.03,
      softAlphaScale: 0.62,
      softAlphaFloor: 0.46,
      blueBias: 1.08
    },
    'emotion-lantern.png': {
      moonTint: [105, 134, 143],
      warmTint: [238, 176, 93],
      exposure: 0.66,
      highlightExposure: 0.7,
      moonTintAmount: 0.12,
      warmTintAmount: 0.22,
      highlightWarmth: 0.055,
      softAlphaScale: 0.86,
      softAlphaFloor: 0.68
    },
    'image-cloud.png': {
      moonTint: [126, 154, 169],
      warmTint: [190, 154, 105],
      exposure: 0.72,
      highlightExposure: 0.58,
      shadowExposure: 0.9,
      moonTintAmount: 0.19,
      warmTintAmount: 0.03,
      contrast: 0.02,
      softAlphaScale: 0.55,
      softAlphaFloor: 0.42,
      blueBias: 1.04
    },
    'meaning-gate.png': {
      moonTint: [111, 148, 139],
      warmTint: [210, 166, 99],
      exposure: 0.76,
      highlightExposure: 0.66,
      moonTintAmount: 0.17,
      warmTintAmount: 0.09,
      contrast: 0.03,
      softAlphaScale: 0.82,
      softAlphaFloor: 0.62
    },
    'observer-pool.png': {
      moonTint: [87, 154, 174],
      warmTint: [195, 158, 96],
      exposure: 0.74,
      highlightExposure: 0.64,
      moonTintAmount: 0.22,
      warmTintAmount: 0.04,
      contrast: 0.03,
      softAlphaScale: 0.58,
      softAlphaFloor: 0.44,
      blueBias: 1.08
    },
    'word-stones.png': {
      moonTint: [118, 145, 147],
      warmTint: [190, 151, 100],
      exposure: 0.74,
      highlightExposure: 0.64,
      moonTintAmount: 0.18,
      warmTintAmount: 0.04,
      contrast: 0.03,
      softAlphaScale: 0.68,
      softAlphaFloor: 0.5
    }
  };

  return { ...base, ...(lensProfiles[file] ?? {}) };
}

function gradeChannel(value, exposure, contrastAmount, tint, tintAmount, bias) {
  const exposed = value * exposure * bias;
  const contrasted = exposed + (exposed - 128) * contrastAmount;
  return clamp(contrasted * (1 - tintAmount) + tint * tintAmount);
}

function softAlphaFactor(alpha, profile) {
  if (alpha >= profile.softAlphaCutoff) return 1;
  const softness = 1 - alpha / profile.softAlphaCutoff;
  return Math.max(profile.softAlphaFloor, 1 - softness * profile.softAlphaScale);
}

function isWarmPixel(red, green, blue, luminance) {
  return red > blue + 16 && green > blue + 4 && (red > green + 6 || luminance > 0.38);
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
