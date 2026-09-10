import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import sharp from 'sharp';
import { readImageRGBA, writeImageRGBA } from '../lib/readImage.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const groups = ['companion/frames', 'garden/props', 'lenses/props'];
const scripts = [
  'create-dark-asset-variants',
  'clean-lens-props',
  'clean-pet-frames',
  'render-pet-frame-sheet',
];
function run(script, ...args) {
  return execFileSync(process.execPath, [path.join(root, 'scripts', `${script}.mjs`), ...args], {
    encoding: 'utf8',
  });
}

test('runtime fixtures retain format, dimensions, crop and mask behavior across PNG and WebP', async (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-assets-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  for (const group of groups) {
    const input = path.join(temp, 'webp/src/assets', group);
    fs.mkdirSync(input, { recursive: true });
    for (const file of fs.readdirSync(path.join(root, 'src/assets', group))) {
      if (!file.endsWith('.webp')) continue;
      fs.copyFileSync(path.join(root, 'src/assets', group, file), path.join(input, file));
      const pngDir = path.join(temp, 'png/src/assets', group);
      fs.mkdirSync(pngDir, { recursive: true });
      await writeImageRGBA(
        path.join(pngDir, file.replace('.webp', '.png')),
        await readImageRGBA(path.join(input, file))
      );
    }
  }
  for (const format of ['png', 'webp']) {
    assert.match(
      run(scripts[0], path.join(temp, format), path.join(temp, `${format}-dark`)),
      /Processed 12 companion images/
    );
    assert.match(
      run(
        scripts[1],
        path.join(temp, format, 'src/assets/lenses/props'),
        path.join(temp, `${format}-lenses`)
      ),
      /Processed 7 images/
    );
    assert.match(
      run(
        scripts[2],
        path.join(temp, format, 'src/assets/companion/frames'),
        path.join(temp, `${format}-pets`)
      ),
      /Processed 12 images/
    );
    assert.match(
      run(
        scripts[3],
        path.join(temp, format, 'src/assets/companion/frames'),
        path.join(temp, `${format}-sheet.png`)
      ),
      /Processed 12 frames/
    );
    const sheet = await sharp(path.join(temp, `${format}-sheet.png`)).metadata();
    assert.equal(sheet.width, 1024);
    assert.equal(sheet.height, 858);
  }
  for (const output of [
    'pets',
    'lenses',
    ...groups.map((group) => `dark/src/assets/${group}-dark`),
  ]) {
    const pngDir = path.join(temp, `png-${output}`);
    const webpDir = path.join(temp, `webp-${output}`);
    for (const file of fs.readdirSync(pngDir)) {
      const png = await readImageRGBA(path.join(pngDir, file));
      const webpPath = path.join(webpDir, file.replace('.png', '.webp'));
      assert.equal((await sharp(webpPath).metadata()).format, 'webp');
      const webp = await readImageRGBA(webpPath);
      assert.equal(webp.width, png.width, file);
      assert.equal(webp.height, png.height, file);
      for (let index = 0; index < png.data.length; index += 4) {
        assert.equal(webp.data[index + 3], png.data[index + 3], `${file} alpha`);
        if (png.data[index + 3] > 0)
          assert.deepEqual(
            webp.data.subarray(index, index + 3),
            png.data.subarray(index, index + 3),
            `${file} color`
          );
      }
    }
  }
  const groom = await readImageRGBA(path.join(temp, 'webp-pets/groom.webp'));
  assert.equal(groom.width, 512);
  assert.equal(groom.height, 512);
  assert.equal(groom.data[(40 * groom.width + 110) * 4 + 3], 0);
  const crop = await readImageRGBA(path.join(temp, 'webp-lenses/action-basket.webp'));
  assert.equal(crop.width, 347);
  assert.equal(crop.height, 272);
});

test('every command rejects empty input before producing an image', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-empty-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  fs.mkdirSync(path.join(temp, 'src/assets/companion/frames'), { recursive: true });
  for (const script of scripts) {
    const result = spawnSync(
      process.execPath,
      [path.join(root, 'scripts', `${script}.mjs`), temp, path.join(temp, 'output.png')],
      { encoding: 'utf8' }
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /No PNG or WebP images found/);
    assert.equal(fs.existsSync(path.join(temp, 'output.png')), false);
  }
});
