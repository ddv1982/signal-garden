import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const projectRoot = new URL('..', import.meta.url).pathname;
const frameDir = path.join(projectRoot, 'src/assets/companion/frames');

const cleanupMasks = {
  'groom.png': [
    { x: 100, y: 36, width: 76, height: 16 },
    { x: 100, y: 460, width: 190, height: 42 }
  ],
  'nap-curl.png': [
    { x: 440, y: 330, width: 52, height: 130 }
  ],
  'settle-back.png': [
    { x: 20, y: 245, width: 94, height: 130 },
    { x: 462, y: 432, width: 30, height: 42 }
  ]
};

for (const [fileName, masks] of Object.entries(cleanupMasks)) {
  const filePath = path.join(frameDir, fileName);
  const png = PNG.sync.read(fs.readFileSync(filePath));

  for (const mask of masks) {
    for (let y = mask.y; y < mask.y + mask.height; y += 1) {
      for (let x = mask.x; x < mask.x + mask.width; x += 1) {
        if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
        const index = (y * png.width + x) * 4;
        png.data[index + 3] = 0;
      }
    }
  }

  fs.writeFileSync(filePath, PNG.sync.write(png));
  console.log(`Cleaned ${fileName}`);
}
