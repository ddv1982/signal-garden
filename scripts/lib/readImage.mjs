import sharp from 'sharp';

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
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
}
