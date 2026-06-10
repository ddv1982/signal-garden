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
    moonTint: [150, 170, 196],
    warmTint: [226, 172, 112],
    moonTintAmount: 0.12,
    warmTintAmount: 0.1,
    exposure: 0.86,
    highlightExposure: 0.82,
    shadowExposure: 1,
    contrast: 0.025,
    shadowLift: 0.055,
    highlightWarmth: 0.006,
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
      moonTint: [126, 146, 168],
      warmTint: [226, 181, 126],
      moonTintAmount: 0.14,
      warmTintAmount: 0.11,
      exposure: 0.82,
      highlightExposure: 0.78,
      shadowExposure: 0.98,
      contrast: 0.045,
      shadowLift: 0.035,
      highlightWarmth: 0.012,
      highlightThreshold: 0.58,
      softAlphaScale: 1,
      redBias: 0.98,
      greenBias: 1,
      blueBias: 1.03
    };
  }

  if (kind === 'garden') {
    return {
      ...base,
      moonTint: [132, 161, 155],
      warmTint: [224, 170, 102],
      moonTintAmount: 0.11,
      warmTintAmount: 0.14,
      exposure: 0.78,
      highlightExposure: 0.74,
      shadowExposure: 0.92,
      contrast: 0.045,
      shadowLift: 0.045,
      blueBias: 1.01
    };
  }

  const lensProfiles = {
    'action-basket.png': {
      warmTint: [224, 170, 112],
      moonTint: [126, 155, 166],
      exposure: 0.82,
      highlightExposure: 0.78,
      warmTintAmount: 0.14,
      moonTintAmount: 0.12,
      highlightWarmth: 0.018,
      softAlphaScale: 0.82,
      softAlphaFloor: 0.72,
      redBias: 0.98,
      greenBias: 1,
      blueBias: 1.03
    },
    'body-ripple.png': {
      moonTint: [114, 178, 204],
      warmTint: [142, 174, 178],
      exposure: 0.86,
      highlightExposure: 0.82,
      moonTintAmount: 0.16,
      warmTintAmount: 0.08,
      contrast: 0.03,
      softAlphaScale: 0.54,
      softAlphaFloor: 0.5,
      blueBias: 1.04
    },
    'emotion-lantern.png': {
      moonTint: [122, 146, 166],
      warmTint: [230, 150, 82],
      exposure: 0.76,
      highlightExposure: 0.72,
      moonTintAmount: 0.1,
      warmTintAmount: 0.18,
      highlightWarmth: 0.026,
      softAlphaScale: 0.78,
      softAlphaFloor: 0.7
    },
    'image-cloud.png': {
      moonTint: [150, 162, 184],
      warmTint: [172, 166, 172],
      exposure: 0.8,
      highlightExposure: 0.74,
      shadowExposure: 1,
      moonTintAmount: 0.14,
      warmTintAmount: 0.12,
      contrast: 0.04,
      softAlphaScale: 0.5,
      softAlphaFloor: 0.46,
      redBias: 0.98,
      greenBias: 1,
      blueBias: 1.04
    },
    'meaning-gate.png': {
      moonTint: [126, 156, 148],
      warmTint: [214, 168, 112],
      exposure: 0.82,
      highlightExposure: 0.76,
      moonTintAmount: 0.12,
      warmTintAmount: 0.14,
      contrast: 0.04,
      softAlphaScale: 0.76,
      softAlphaFloor: 0.64,
      redBias: 0.98,
      greenBias: 1,
      blueBias: 1.03
    },
    'observer-pool.png': {
      moonTint: [108, 170, 196],
      warmTint: [142, 174, 176],
      exposure: 0.82,
      highlightExposure: 0.76,
      moonTintAmount: 0.17,
      warmTintAmount: 0.08,
      contrast: 0.03,
      softAlphaScale: 0.52,
      softAlphaFloor: 0.48,
      blueBias: 1.04
    },
    'word-stones.png': {
      moonTint: [132, 152, 162],
      warmTint: [206, 166, 116],
      exposure: 0.84,
      highlightExposure: 0.8,
      moonTintAmount: 0.12,
      warmTintAmount: 0.12,
      contrast: 0.04,
      softAlphaScale: 0.6,
      softAlphaFloor: 0.56,
      redBias: 0.99,
      greenBias: 1,
      blueBias: 1.03
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
