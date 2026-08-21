import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Icons are judged at 180px and lived with at 16px. Rasterize the shipped mark
// at each size it actually ships at, then magnify the resulting pixels; scaling
// the SVG up instead would hide the mush this exists to catch.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, process.argv[2] ?? 'docs/screenshots/app-icon.png');

const favicon = readFileSync(resolve(root, 'public/favicon.svg'), 'utf8');
const maskIcon = readFileSync(resolve(root, 'public/safari-pinned-tab.svg'), 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

const rasters = {};
for (const size of [16, 32, 180]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><head><style>
    html,body{margin:0;background:transparent;overflow:hidden}
    svg{display:block;width:${size}px;height:${size}px}
  </style></head><body>${favicon}</body></html>`);
  rasters[size] = (await page.screenshot({ omitBackground: true, type: 'png' })).toString('base64');
}

const img = (size, zoom) =>
  `<img src="data:image/png;base64,${rasters[size]}" style="width:${size * zoom}px;height:${size * zoom}px;image-rendering:pixelated;display:block">`;

const html = `<!doctype html><html><head><style>
  body{background:#6f6f6f;margin:20px;font:12px ui-monospace,SFMono-Regular,monospace}
  table{border-collapse:collapse}
  td{padding:14px;text-align:center;vertical-align:middle}
  i{color:#fff;font-style:normal;display:block;padding-top:6px;font-size:10px;opacity:.8}
  .tabrow{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:7px}
  .tabrow b{font:12px system-ui,sans-serif;font-weight:400}
  .light .tabrow{background:#dee1e6;color:#202124}
  .dark .tabrow{background:#292a2d;color:#e8eaed}
  /* Safari flattens a mask icon to a single colour, so preview it flattened. */
  .mask svg{width:16px;height:16px;display:block;margin:0 auto}
  .mask svg *{fill:#365e4a;stroke:none}
  .mask svg [stroke]{stroke:#365e4a}
  .maskbig svg{width:96px;height:96px;display:block;margin:0 auto}
  .maskbig svg *{fill:#365e4a;stroke:none}
  .maskbig svg [stroke]{stroke:#365e4a}
</style></head><body><table><tr>
  <td class="light"><span class="tabrow">${img(16, 1)}<b>Signal Garden</b></span><i>16 in a tab</i></td>
  <td class="dark"><span class="tabrow">${img(16, 1)}<b>Signal Garden</b></span><i>16 in a tab</i></td>
  <td>${img(16, 9)}<i>16 @9x</i></td>
  <td>${img(32, 5)}<i>32 @5x</i></td>
  <td>${img(180, 1)}<i>180</i></td>
  <td style="background:#dee1e6"><div class="maskbig">${maskIcon}</div><div class="mask">${maskIcon}</div><i style="color:#202124">mask icon</i></td>
</tr></table></body></html>`;

await page.setViewportSize({ width: 1200, height: 340 });
await page.setContent(html);
mkdirSync(dirname(outPath), { recursive: true });
await page.locator('table').screenshot({ path: outPath });
await browser.close();
console.log(`wrote ${outPath}`);
