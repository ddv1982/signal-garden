import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const projectRoot = new URL('..', import.meta.url).pathname;
const frameDir = path.join(projectRoot, 'src/assets/companion/frames');
const outputPath = path.join(projectRoot, 'docs/screenshots/pet-animation-contact-sheet.png');
const frameFiles = fs.readdirSync(frameDir).filter((file) => file.endsWith('.png')).sort();
const cellWidth = 256;
const cellHeight = 286;
const columns = 4;
const rows = Math.ceil(frameFiles.length / columns);
const sheet = new PNG({ width: cellWidth * columns, height: cellHeight * rows, colorType: 6 });

sheet.data.fill(0);

for (const [index, frameFile] of frameFiles.entries()) {
  const source = PNG.sync.read(fs.readFileSync(path.join(frameDir, frameFile)));
  const column = index % columns;
  const row = Math.floor(index / columns);
  const originX = column * cellWidth;
  const originY = row * cellHeight;
  const scale = 0.45;
  const imageX = originX + Math.round((cellWidth - source.width * scale) / 2);
  const imageY = originY + 8;
  const bounds = alphaBounds(source);

  fillChecker(originX, originY, cellWidth, cellHeight);
  composite(source, imageX, imageY, scale);
  drawLine(originX + Math.floor(cellWidth / 2), originY + 8, originX + Math.floor(cellWidth / 2), originY + 238, [215, 60, 60, 255]);
  drawLine(originX + 20, imageY + Math.floor((source.height - 1) * scale), originX + cellWidth - 20, imageY + Math.floor((source.height - 1) * scale), [60, 110, 215, 255]);
  drawRect(
    imageX + Math.floor(bounds.minX * scale),
    imageY + Math.floor(bounds.minY * scale),
    imageX + Math.floor(bounds.maxX * scale),
    imageY + Math.floor(bounds.maxY * scale),
    [40, 150, 70, 255]
  );
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, PNG.sync.write(sheet));
console.log(outputPath);

function fillChecker(originX, originY, width, height) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0 ? 250 : 238;
      setPixel(originX + x, originY + y, [color, color, color, 255]);
    }
  }
}

function composite(source, originX, originY, scale) {
  for (let sourceY = 0; sourceY < source.height; sourceY += 1) {
    for (let sourceX = 0; sourceX < source.width; sourceX += 1) {
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const alpha = source.data[sourceIndex + 3] / 255;
      if (alpha === 0) continue;

      const targetX = originX + Math.floor(sourceX * scale);
      const targetY = originY + Math.floor(sourceY * scale);
      const targetIndex = (targetY * sheet.width + targetX) * 4;
      sheet.data[targetIndex] = Math.round(source.data[sourceIndex] * alpha + sheet.data[targetIndex] * (1 - alpha));
      sheet.data[targetIndex + 1] = Math.round(source.data[sourceIndex + 1] * alpha + sheet.data[targetIndex + 1] * (1 - alpha));
      sheet.data[targetIndex + 2] = Math.round(source.data[sourceIndex + 2] * alpha + sheet.data[targetIndex + 2] * (1 - alpha));
      sheet.data[targetIndex + 3] = 255;
    }
  }
}

function alphaBounds(source) {
  const bounds = { minX: source.width, minY: source.height, maxX: 0, maxY: 0 };
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (source.data[(y * source.width + x) * 4 + 3] <= 8) continue;
      if (x < bounds.minX) bounds.minX = x;
      if (y < bounds.minY) bounds.minY = y;
      if (x > bounds.maxX) bounds.maxX = x;
      if (y > bounds.maxY) bounds.maxY = y;
    }
  }
  return bounds;
}

function drawRect(x0, y0, x1, y1, color) {
  drawLine(x0, y0, x1, y0, color);
  drawLine(x1, y0, x1, y1, color);
  drawLine(x1, y1, x0, y1, color);
  drawLine(x0, y1, x0, y0, color);
}

function drawLine(x0, y0, x1, y1, color) {
  let dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    setPixel(x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const doubledError = 2 * error;
    if (doubledError >= dy) {
      error += dy;
      x0 += sx;
    }
    if (doubledError <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= sheet.width || y >= sheet.height) return;
  const index = (y * sheet.width + x) * 4;
  sheet.data[index] = color[0];
  sheet.data[index + 1] = color[1];
  sheet.data[index + 2] = color[2];
  sheet.data[index + 3] = color[3];
}
