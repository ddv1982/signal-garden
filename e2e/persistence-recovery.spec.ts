import { expect, test, type Page } from '@playwright/test';
import type { ReflectionSeed } from '../shared/models';
import { m } from '../src/paraglide/messages.js';

const documentKey = 'signal-garden/reflections/v2';
const seed: ReflectionSeed = {
  id: 'recovery-seed',
  createdAt: '2026-06-07T10:00:00.000Z',
  emotions: [],
  bodySignals: [],
  values: [],
  dreams: [],
  labelText: 'Keep this reflection',
  tinyAction: 'Take a pause',
  status: 'planted',
  visualType: 'seed',
};

async function setup(
  page: Page,
  seeds: ReflectionSeed[] = [],
  pendingSeed: ReflectionSeed | null = null
) {
  await page.goto('/');
  await page.getByLabel(m.onboarding_mode_mixed()).check();
  await page.getByLabel(m.onboarding_order_open()).check();
  await page.getByRole('button', { name: m.onboarding_start() }).click();
  await page.evaluate(
    ({ key, seeds, pendingSeed }) => {
      localStorage.setItem(
        key,
        JSON.stringify({ version: 2, revision: 1, seeds, pendingSeed, draft: null })
      );
    },
    { key: documentKey, seeds, pendingSeed }
  );
  await page.reload();
  await expect(page.getByTestId('garden-canvas')).toBeVisible();
}

function stored(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), documentKey);
}

test('failed planting retains the pending reflection and retries exactly once', async ({
  page,
}) => {
  await setup(page, [], seed);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    document.documentElement.dataset.failReflectionWrites = 'true';
    Storage.prototype.setItem = function (name, value) {
      if (name === key && document.documentElement.dataset.failReflectionWrites === 'true') {
        throw new DOMException('Test quota failure', 'QuotaExceededError');
      }
      original.call(this, name, value);
    };
  }, documentKey);
  await page.getByTestId('plant-here').click();
  await expect(page.getByRole('alert')).toContainText(m.persistence_save_error());
  expect(await stored(page)).toMatchObject({ seeds: [], pendingSeed: { id: seed.id } });
  await page.evaluate(() => {
    delete document.documentElement.dataset.failReflectionWrites;
  });
  await page.getByTestId('plant-here').click();
  await expect
    .poll(() => stored(page))
    .toMatchObject({ seeds: [{ id: seed.id }], pendingSeed: null });
  await page.reload();
  expect(await stored(page)).toMatchObject({ seeds: [{ id: seed.id }], pendingSeed: null });
});

test('an unsubmitted answer survives Escape and reload after saving', async ({ page }) => {
  await setup(page);
  const open = async () => {
    await page.getByTestId('start-lens-journey').focus();
    await page.keyboard.press('Enter');
  };
  await open();
  const answer = 'A full answer\nwith punctuation, and 🌱';
  await page.getByLabel(m.lens_word_field()).fill(answer);
  await expect
    .poll(() => stored(page))
    .toMatchObject({ draft: { responses: { wordLabel: answer } } });
  await page.keyboard.press('Escape');
  await open();
  await expect(page.getByLabel(m.lens_word_field())).toHaveValue(answer);
  await page.reload();
  await open();
  await expect(page.getByLabel(m.lens_word_field())).toHaveValue(answer);
});

test('a full garden can archive another reflection and begin a new journey', async ({ page }) => {
  const plots = [
    'front-left',
    'front-center',
    'front-right',
    'front-far-right',
    'middle-left',
    'middle-center-left',
    'middle-center',
    'middle-center-right',
    'middle-right',
    'back-left',
    'back-center',
    'back-right',
  ];
  await setup(
    page,
    plots.map((plot) => ({ ...seed, id: plot, gardenPlotId: plot })),
    seed
  );
  await expect(page.getByTestId('plant-here')).toBeDisabled();
  await page.getByRole('button', { name: m.garden_save_archive(), exact: true }).click();
  await expect
    .poll(() => stored(page))
    .toMatchObject({
      pendingSeed: null,
      seeds: expect.arrayContaining([{ ...seed, placement: 'archive' }]),
    });
  await page.reload();
  await page.getByRole('button', { name: m.tab_archive(), exact: true }).click();
  await expect(page.locator('button.seed-card')).toHaveCount(13);
  await page.getByRole('button', { name: m.tab_garden(), exact: true }).click();
  await page.getByTestId('start-lens-journey').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('lens-panel')).toBeVisible();
});

test('deletion in another tab closes stale details and cannot resurrect a reflection', async ({
  page,
  context,
}) => {
  await setup(page, [seed]);
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('button', { name: m.tab_archive(), exact: true }).click();
  await other.locator('button.seed-card').click();
  await expect(other.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: m.tab_settings(), exact: true }).click();
  await page.getByRole('button', { name: m.settings_delete_seeds(), exact: true }).click();
  await page.getByRole('button', { name: m.settings_delete_permanently(), exact: true }).click();
  await expect(other.getByRole('dialog')).toHaveCount(0);
  expect(await stored(other)).toMatchObject({ seeds: [], pendingSeed: null });
  await other.reload();
  expect(await stored(other)).toMatchObject({ seeds: [] });
});

test('pending reflection keyboard tabs skip unavailable care controls', async ({ page }) => {
  await setup(page, [], seed);
  await page.getByRole('button', { name: m.tab_archive(), exact: true }).click();
  await page.locator('button.seed-card').click();
  const overview = page.getByRole('tab', { name: m.seed_dialog_tab_overview(), exact: true });
  const history = page.getByRole('tab', { name: m.seed_dialog_tab_history(), exact: true });
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  await expect(history).toBeFocused();
  await expect(history).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(overview).toBeFocused();
  await expect(overview).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toBeVisible();
});

async function failReflectionReads(page: Page) {
  await page.evaluate((key) => {
    const original = Storage.prototype.getItem;
    document.documentElement.dataset.failReflectionReads = 'true';
    Storage.prototype.getItem = function (name) {
      if (name === key && document.documentElement.dataset.failReflectionReads === 'true') {
        throw new DOMException('Test read failure', 'SecurityError');
      }
      return original.call(this, name);
    };
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, documentKey);
}

test('read failures retain an open watering form through notification and retry', async ({
  page,
}) => {
  await setup(page, [seed]);
  await page.getByRole('button', { name: m.tab_archive(), exact: true }).click();
  await page.locator('button.seed-card').click();
  await page.getByRole('button', { name: m.seed_dialog_water_seed(), exact: true }).click();
  const dialog = page.getByRole('dialog');
  const fields = dialog.locator('textarea');
  await fields.nth(0).fill('Keep the softened thought');
  await fields.nth(1).fill('Keep the kind action');
  await failReflectionReads(page);
  await expect(fields.nth(0)).toHaveValue('Keep the softened thought');
  await dialog.getByRole('button', { name: m.seed_dialog_water_seed(), exact: true }).click();
  await expect(dialog).toContainText(m.persistence_unreadable_error());
  await expect(fields.nth(0)).toHaveValue('Keep the softened thought');
  await expect(fields.nth(1)).toHaveValue('Keep the kind action');
  await page.evaluate(() => {
    delete document.documentElement.dataset.failReflectionReads;
  });
  await dialog.getByRole('button', { name: m.seed_dialog_water_seed(), exact: true }).click();
  await expect
    .poll(() => stored(page))
    .toMatchObject({
      seeds: [
        {
          waterings: [
            { transformedLabel: 'Keep the softened thought', kindAction: 'Keep the kind action' },
          ],
        },
      ],
    });
});

test('a failed storage notification cannot discard the current saved draft', async ({ page }) => {
  await setup(page);
  await page.getByTestId('start-lens-journey').focus();
  await page.keyboard.press('Enter');
  const field = page.getByLabel(m.lens_word_field());
  await field.fill('Keep this answer through a read failure');
  await expect
    .poll(() => stored(page))
    .toMatchObject({
      draft: { responses: { wordLabel: 'Keep this answer through a read failure' } },
    });
  await failReflectionReads(page);
  await expect(field).toHaveValue('Keep this answer through a read failure');
  await page.evaluate(() => {
    delete document.documentElement.dataset.failReflectionReads;
  });
  await field.fill('Reads recovered, answer retained');
  await expect
    .poll(() => stored(page))
    .toMatchObject({ draft: { responses: { wordLabel: 'Reads recovered, answer retained' } } });
});
