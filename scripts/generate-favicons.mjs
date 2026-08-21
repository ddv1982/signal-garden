import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = resolve(root, 'public');

mkdirSync(publicDir, { recursive: true });

const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

// public/favicon.svg is the hand-authored source of truth; everything else here
// is rasterized from it.
const svg = readFileSync(resolve(publicDir, 'favicon.svg'), 'utf8');

const iconPngs = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 256, height: 256 } });

try {
  for (const { size, name } of sizes) {
    const html = `<!doctype html>
      <html>
        <head>
          <style>
            html,
            body {
              background: transparent;
              height: 100%;
              margin: 0;
              overflow: hidden;
              width: 100%;
            }

            svg {
              display: block;
              height: ${size}px;
              width: ${size}px;
            }
          </style>
        </head>
        <body>${svg}</body>
      </html>`;

    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html);
    const buffer = await page.screenshot({ omitBackground: true, type: 'png' });

    writeFileSync(resolve(publicDir, name), buffer);
    if (size === 16 || size === 32) {
      iconPngs.push({ size, buffer });
    }
  }
} finally {
  await browser.close();
}

writeFileSync(resolve(publicDir, 'favicon.ico'), createIconFile(iconPngs));

function createIconFile(pngBuffers) {
  const headerSize = 6;
  const directorySize = 16 * pngBuffers.length;
  let offset = headerSize + directorySize;
  const fileSize = offset + pngBuffers.reduce((total, { buffer }) => total + buffer.length, 0);
  const icon = Buffer.alloc(fileSize);

  icon.writeUInt16LE(0, 0);
  icon.writeUInt16LE(1, 2);
  icon.writeUInt16LE(pngBuffers.length, 4);

  pngBuffers.forEach(({ size, buffer }, index) => {
    const entry = headerSize + index * 16;
    icon.writeUInt8(size >= 256 ? 0 : size, entry);
    icon.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    icon.writeUInt8(0, entry + 2);
    icon.writeUInt8(0, entry + 3);
    icon.writeUInt16LE(1, entry + 4);
    icon.writeUInt16LE(32, entry + 6);
    icon.writeUInt32LE(buffer.length, entry + 8);
    icon.writeUInt32LE(offset, entry + 12);
    buffer.copy(icon, offset);
    offset += buffer.length;
  });

  return icon;
}
