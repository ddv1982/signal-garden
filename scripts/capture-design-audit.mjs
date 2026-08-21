#!/usr/bin/env node
/**
 * Captures every screen and state of the app in both themes and both viewports
 * for design review:
 *   pnpm dev   (port 5173)
 *   node scripts/capture-design-audit.mjs [outDir] [baseUrl]
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const outDir = process.argv[2] ?? 'docs/screenshots/design-audit';
const baseUrl = process.argv[3] ?? 'http://localhost:5173';

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};
const themes = ['light', 'dark'];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

async function shot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log(`${name}.png`);
}

for (const [viewportName, viewport] of Object.entries(viewports)) {
  for (const colorScheme of themes) {
    const label = `${viewportName}-${colorScheme}`;
    const page = await browser.newPage({ viewport, colorScheme });
    await page.goto(baseUrl);

    await page.waitForSelector('[data-testid="onboarding-panel"]');
    await shot(page, `onboarding-${label}`);

    await page.getByRole('button', { name: 'Start in the Garden' }).click();
    await page.waitForSelector('[data-testid="garden-canvas"] canvas', { timeout: 20_000 });
    await page.waitForTimeout(1500);
    await shot(page, `garden-idle-${label}`);

    await page.getByTestId('start-lens-journey').focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid="lens-panel"]');
    await page.waitForTimeout(600);
    await shot(page, `lens-step1-${label}`);

    const answers = [
      'I am behind',
      'tight chest',
      'sad, worried',
      'a small gray cloud',
      'awareness is here too',
      'I may need rest',
      'Take one soft pause',
    ];
    for (const [index, answer] of answers.entries()) {
      const textarea = page.locator('[data-testid="lens-panel"] textarea');
      await textarea.fill(answer);
      if (index === 3) await shot(page, `lens-step4-filled-${label}`);
      await page
        .locator('[data-testid="lens-panel"] button[type="submit"]')
        .evaluate((button) => button.form?.requestSubmit(button));
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('[data-testid="placement-panel"]');
    await shot(page, `seed-ready-${label}`);
    await page.getByTestId('plant-here').click();
    await page.waitForTimeout(1200);
    await shot(page, `garden-planted-${label}`);

    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.waitForTimeout(500);
    await shot(page, `home-${label}`);

    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await page.waitForTimeout(500);
    await shot(page, `archive-${label}`);

    await page.locator('.seed-card').first().click();
    await page.waitForSelector('dialog[open]');
    await page.waitForTimeout(400);
    await shot(page, `seed-dialog-${label}`);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.waitForTimeout(400);
    await shot(page, `settings-${label}`);

    await page.close();
  }
}

await browser.close();
console.log(`\nwritten to ${outDir}/`);
