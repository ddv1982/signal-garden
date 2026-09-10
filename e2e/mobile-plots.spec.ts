import { expect, test, type Page } from '@playwright/test';
import type { ReflectionSeed } from '../shared/models';
import { createGardenPlots } from '../src/game/gardenLayout';
import { m } from '../src/paraglide/messages.js';

const plotIds = createGardenPlots(960, 680).map((plot) => plot.id);

function reflection(id: string, plotId?: string): ReflectionSeed {
  return {
    id,
    createdAt: '2026-09-01T00:00:00.000Z',
    labelText: id,
    emotions: [],
    bodySignals: [],
    values: [],
    dreams: [],
    tinyAction: `Care for ${id}`,
    status: 'blooming',
    visualType: 'flower',
    growthPoints: 6,
    ...(plotId ? { gardenPlotId: plotId, gardenPosition: { x: 0.5, y: 0.8 } } : {}),
  };
}

async function openGarden(
  page: Page,
  seeds: ReflectionSeed[],
  pendingSeed: ReflectionSeed | null = null
) {
  await page.addInitScript(
    ({ seeds, pendingSeed }) => {
      if (localStorage.getItem('mobile-fixture-ready')) return;
      localStorage.setItem('mobile-fixture-ready', 'true');
      localStorage.setItem('signal-garden/reflection-seeds/vite/v1', JSON.stringify(seeds));
      localStorage.setItem('signal-garden/pending-seed/vite/v1', JSON.stringify(pendingSeed));
      localStorage.setItem(
        'signal-garden/settings/vite/v1',
        JSON.stringify({ reducedMotion: true, onboardingCompleted: true, themePreference: 'light' })
      );
      localStorage.setItem(
        'signal-garden/inner-lens-profile/vite/v1',
        JSON.stringify({
          preferredMode: 'words',
          promptOrder: 'word-first',
          completedAt: '2026-09-01T00:00:00.000Z',
        })
      );
    },
    { seeds, pendingSeed }
  );
  await page.goto('/');
  await expect(page.getByTestId('garden-canvas').locator('canvas')).toBeVisible();
  await expect(page.getByTestId('garden-canvas')).toHaveAttribute('data-theme', 'light');
}

async function canvasBox(page: Page) {
  const box = await page.getByTestId('garden-canvas').locator('canvas').boundingBox();
  if (!box) throw new Error('Garden canvas has no bounds');
  return box;
}

async function tapPlot(page: Page, id: string, seed = false) {
  const box = await canvasBox(page);
  const plot = createGardenPlots(box.width, box.height).find((plot) => plot.id === id);
  if (!plot) throw new Error(`Missing plot ${id}`);
  const scale = plot.scale * Math.min(1.38, Math.max(0.82, box.height / 484, box.width / 1480));
  await page.mouse.click(
    box.x + plot.x * box.width,
    box.y + plot.y * box.height - (seed ? 28 * scale : 0)
  );
}

async function storedSeeds(page: Page): Promise<ReflectionSeed[]> {
  return page.evaluate(() => {
    const current = localStorage.getItem('signal-garden/reflections/v2');
    return current
      ? JSON.parse(current).seeds
      : JSON.parse(localStorage.getItem('signal-garden/reflection-seeds/vite/v1') ?? '[]');
  });
}

test('all twelve desktop plots remain selectable through mobile breakpoints', async ({
  page,
}, testInfo) => {
  await openGarden(
    page,
    plotIds.map((id) => reflection(id, id))
  );
  for (const width of [960, 390, 539, 540, 960]) {
    await page.setViewportSize({ width, height: 800 });
    await expect.poll(async () => (await canvasBox(page)).width).toBeLessThanOrEqual(width);
    await page.waitForTimeout(150);
    for (const id of plotIds) {
      await tapPlot(page, id, true);
      await expect(
        page.getByRole('dialog').getByRole('heading', { name: id, exact: true })
      ).toBeVisible();
      await page.getByRole('button', { name: m.seed_dialog_close() }).click();
    }
    await page.screenshot({ path: testInfo.outputPath(`plots-${width}.png`) });
  }
});

for (const id of plotIds) {
  test(`mobile tap plants on ${id} with the placement panel visible`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await openGarden(page, [], reflection('pending'));
    await expect(page.getByTestId('placement-panel')).toBeVisible();
    await tapPlot(page, id);
    await expect.poll(async () => (await storedSeeds(page))[0]?.gardenPlotId).toBe(id);
    await expect(page.getByTestId('placement-panel')).toHaveCount(0);
    await page.reload();
    expect((await storedSeeds(page))[0]?.gardenPlotId).toBe(id);
    await page.screenshot({ path: testInfo.outputPath(`${id}.png`) });
  });
}

test('keyboard planting skips occupied plots and survives reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openGarden(page, [reflection('occupied', 'front-right')], reflection('pending'));
  await page.getByTestId('plant-here').focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(async () => (await storedSeeds(page)).find((seed) => seed.id === 'pending')?.gardenPlotId)
    .toBe('front-center');
  await page.reload();
  expect((await storedSeeds(page)).find((seed) => seed.id === 'pending')?.gardenPlotId).toBe(
    'front-center'
  );
});

for (const id of plotIds) {
  test(`mobile drag plants on ${id}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await openGarden(page, [], reflection('pending'));
    const box = await canvasBox(page);
    const plot = createGardenPlots(box.width, box.height).find((plot) => plot.id === id);
    if (!plot) throw new Error(`Missing plot ${id}`);
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.9 - 14);
    await page.mouse.down();
    await page.mouse.move(box.x + plot.x * box.width, box.y + plot.y * box.height, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => (await storedSeeds(page))[0]?.gardenPlotId).toBe(id);
  });
}

test('legacy seed near the pet remains selectable and the pet still responds elsewhere', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openGarden(page, [
    { ...reflection('legacy', 'retired-plot'), gardenPosition: { x: 0.24, y: 0.73 } },
  ]);
  const box = await canvasBox(page);
  const scale = Math.min(1.38, Math.max(0.82, box.height / 484));
  await page.mouse.click(box.x + box.width * 0.24, box.y + box.height * 0.73 - 28 * scale);
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'legacy', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: m.seed_dialog_close() }).click();
  await page.mouse.click(box.x + box.width * 0.24, box.y + box.height * 0.73 - 140);
  await expect(page.getByText(m.pet_notices_back(), { exact: true })).toHaveCount(1);
});

test('archived records neither hide the planted seeds nor reserve plots', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const archived: ReflectionSeed[] = Array.from({ length: 51 }, (_, index) => ({
    ...reflection(`archive-${index}`, 'front-right'),
    placement: 'archive',
  }));
  await openGarden(page, [...archived, ...plotIds.map((id) => reflection(id, id))]);
  for (const id of plotIds) {
    await tapPlot(page, id, true);
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: id, exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: m.seed_dialog_close() }).click();
  }
});
