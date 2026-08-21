import { chromium } from '@playwright/test';

// What backdrop-filter costs, measured rather than guessed.
//
// The panes above the garden stage (.garden-status, .signal-panel,
// .placement-panel) are siblings of the Phaser canvas, so their backdrop is
// live and re-blurs on every canvas frame. Everything else sits over the static
// world layer and composites once.
//
// Method: drive the garden with the lens sheet open, sample requestAnimationFrame
// deltas under CDP CPU throttling, and compare the authored styles against the
// same page with prefers-reduced-transparency emulated and against every
// backdrop-filter forced off. The delta between them is the cost attributable
// to the blur.
//
// Read the deltas, not the absolute frame times: headless Chromium rasterizes
// through SwiftShader, so blur runs on the CPU here and is a pessimistic ceiling
// for a device that composites it on the GPU.
//
// Usage: pnpm dev, then pnpm perf:blur [url]

const url = process.argv[2] ?? 'http://localhost:5173';
const sampleMs = 6000;
const throttleRates = [4, 6, 10];

const seeds = [
  ['this has to be perfect', 'blooming', 'flower', 9, 12, 'front-right'],
  ['I should be further along', 'growing', 'bud', 6, 5, 'front-left'],
  ['nobody replied yet', 'sprouted', 'sprout', 3, 1, 'mid-right'],
  ['I am behind', 'planted', 'seed', 0, 0, 'mid-left'],
].map(([labelText, status, visualType, growthPoints, daysAgo, gardenPlotId], index) => ({
  id: `seed-${index}`,
  createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  labelText,
  unhookedText: `Noticing the story: \u201c${labelText}\u201d`,
  emotions: ['worried'],
  bodySignals: ['tight chest'],
  values: ['rest'],
  dreams: ['a small gray cloud'],
  tinyAction: 'Take one soft pause',
  status,
  visualType,
  growthPoints,
  gardenPlotId,
  gardenPosition: { x: 240 + index * 110, y: 420 },
  plantedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  waterings: [],
}));

const killBlur = `*, *::before, *::after {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}`;

async function sampleFrames(page, duration) {
  return page.evaluate(async (ms) => {
    const deltas = [];
    await new Promise((done) => {
      let last = performance.now();
      const start = last;
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        if (now - start < ms) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
    // Drop the first delta; it carries scheduling noise from the eval itself.
    const sorted = deltas.slice(1).sort((a, b) => a - b);
    const mean = sorted.reduce((total, d) => total + d, 0) / sorted.length;
    return {
      frames: sorted.length,
      fps: Number((1000 / mean).toFixed(1)),
      p50: Number(sorted[Math.floor(sorted.length * 0.5)].toFixed(1)),
      p95: Number(sorted[Math.floor(sorted.length * 0.95)].toFixed(1)),
      dropped: sorted.filter((d) => d > 33.4).length,
    };
  }, duration);
}

async function run(variant, rate) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  if (variant === 'reduced-transparency') {
    await client.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
    });
  } else if (variant === 'no-blur') {
    await page.addInitScript((css) => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.append(style);
      });
    }, killBlur);
  }

  await page.goto(url);
  await page.evaluate(
    ([seedData]) => {
      localStorage.setItem('signal-garden/reflection-seeds/vite/v1', JSON.stringify(seedData));
      localStorage.setItem(
        'signal-garden/settings/vite/v1',
        JSON.stringify({
          themePreference: 'light',
          reducedMotion: false,
          onboardingCompleted: true,
        })
      );
      localStorage.setItem(
        'signal-garden/inner-lens-profile/vite/v1',
        JSON.stringify({
          preferredMode: 'mixed',
          promptOrder: 'open',
          completedAt: new Date().toISOString(),
        })
      );
    },
    [seeds]
  );
  await page.reload();

  await page.getByRole('button', { name: 'Garden', exact: true }).click();
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2500);
  await page.getByTestId('start-lens-journey').focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid="lens-panel"]');
  await page.waitForTimeout(1200);

  const blurredPanes = await page.evaluate(
    () =>
      [...document.querySelectorAll('*')].filter((element) => {
        const style = getComputedStyle(element);
        return style.backdropFilter && style.backdropFilter !== 'none';
      }).length
  );

  await client.send('Emulation.setCPUThrottlingRate', { rate });
  await page.waitForTimeout(600);
  const result = await sampleFrames(page, sampleMs);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await browser.close();

  return { ...result, blurredPanes };
}

for (const rate of throttleRates) {
  for (const variant of ['authored', 'reduced-transparency', 'no-blur']) {
    const r = await run(variant, rate);
    console.log(
      `cpu ${String(rate).padStart(2)}x  ${variant.padEnd(21)} ` +
        `fps ${String(r.fps).padStart(4)}  p95 ${String(r.p95).padStart(5)}ms  ` +
        `dropped ${String(r.dropped).padStart(3)}/${r.frames}  panes ${r.blurredPanes}`
    );
  }
}
