import fs from 'node:fs';
import { PNG } from 'pngjs';

/** Matches runtime sprite files; sources stay PNG, runtime assets are WebP. */
export const RUNTIME_IMAGE_PATTERN = /\.(png|webp)$/;

/** Strip the image extension so lookup tables work for both PNG and WebP names. */
export function imageBaseName(file) {
  return file.replace(RUNTIME_IMAGE_PATTERN, '');
}

/**
 * Decode any sharp-supported image into the pngjs-compatible shape
 * ({ width, height, data: RGBA buffer }) the audit scripts work with.
 */
export async function readImageRGBA(filePath) {
  if (filePath.endsWith('.png')) return PNG.sync.read(fs.readFileSync(filePath));
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
}

export async function writeImageRGBA(filePath, image) {
  if (filePath.endsWith('.png')) {
    fs.writeFileSync(filePath, PNG.sync.write(image));
    return;
  }
  if (!filePath.endsWith('.webp')) throw new Error(`Unsupported output format: ${filePath}`);
  const { default: sharp } = await import('sharp');
  await sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 4 },
  })
    .webp({ lossless: true })
    .toFile(filePath);
}

export function runtimeImageFiles(directory) {
  const files = fs
    .readdirSync(directory)
    .filter((file) => RUNTIME_IMAGE_PATTERN.test(file))
    .sort();
  if (files.length === 0) throw new Error(`No PNG or WebP images found in ${directory}`);
  return files;
}
