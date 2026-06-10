#!/usr/bin/env node
/**
 * Regenerates docs/screenshots/{home,garden}-{desktop,mobile}.png against a
 * running dev server:
 *   pnpm dev   (port 5173)
 *   node scripts/capture-doc-screenshots.mjs [baseUrl]
 */
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const browser = await chromium.launch();

for (const [label, viewport] of Object.entries(viewports)) {
  const page = await browser.newPage({ viewport, colorScheme: 'light' });
  await page.goto(baseUrl);

  const onboarding = page.getByRole('button', { name: 'Start in the Garden' });
  if (await onboarding.isVisible().catch(() => false)) {
    await onboarding.click();
  }

  await page.waitForSelector('[data-testid="garden-canvas"] canvas', { timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `docs/screenshots/garden-${label}.png` });

  await page.getByRole('button', { name: 'Home' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `docs/screenshots/home-${label}.png` });
  await page.close();
}

await browser.close();
console.log('screenshots written to docs/screenshots/');
