import { expect, test, type Page } from '@playwright/test';
import { m } from '../src/paraglide/messages.js';

async function onboard(page: Page) {
  await page.goto('/');
  await page.getByLabel(m.onboarding_mode_mixed()).check();
  await page.getByLabel(m.onboarding_order_open()).check();
  await page.getByRole('button', { name: m.onboarding_start() }).click();
}

for (const app of [false, true]) {
  for (const os of [false, true]) {
    test(`motion follows app=${app} and OS=${os}`, async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: os ? 'reduce' : 'no-preference' });
      await onboard(page);
      await page.getByRole('button', { name: m.tab_settings() }).click();
      await page.getByLabel(m.settings_reduce_motion()).setChecked(app);
      await page.getByRole('button', { name: m.tab_garden() }).click();
      await page.getByTestId('start-lens-journey').focus();
      await page.keyboard.press('Enter');
      const panel = page.getByTestId('lens-panel');
      await expect(panel).toBeVisible();
      const duration = await panel.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).animationDuration)
      );
      expect(duration <= 0.001).toBe(app || os);
      await expect(page.getByTestId('garden-canvas')).toHaveAttribute(
        'data-reduced-motion',
        String(app || os)
      );
      await page.screenshot({ path: testInfo.outputPath('motion.png') });
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', String(app || os));
      await page.getByRole('button', { name: m.tab_settings() }).click();
      await expect(page.getByLabel(m.settings_reduce_motion())).toBeChecked({ checked: app });
    });
  }
}

test('updates an open app when the OS preference changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await onboard(page);
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  await expect(page.getByTestId('garden-canvas')).toHaveAttribute('data-reduced-motion', 'true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
});
