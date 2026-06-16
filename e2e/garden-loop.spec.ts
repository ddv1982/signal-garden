import { expect, test, type Page } from '@playwright/test';
import { m } from '../src/paraglide/messages.js';

const lensLabels = {
  word: m.lens_word_field(),
  body: m.lens_body_field(),
  emotion: m.lens_emotion_field(),
  image: m.lens_image_field(),
  observer: m.lens_observer_field(),
  meaning: m.lens_meaning_field(),
  action: m.lens_action_field(),
};

test.describe('garden-first lens journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('creates a lens profile, completes a lens journey, plants a seed, and persists it', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Full seven-lens journey is covered on desktop; mobile covers onboarding and persistence smoke paths.'
    );
    test.setTimeout(60_000);
    await expect(page.getByTestId('onboarding-panel')).toBeVisible();
    await expect(page.getByTestId('garden-canvas')).toHaveCount(0);
    await completeOnboarding(page);
    await expect(page.getByTestId('garden-canvas')).toBeVisible();
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute('data-signal-motion', 'glow');
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute(
      'data-ambient-motion',
      'anchored'
    );
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute(
      'data-ambient-zones',
      'pond,pet'
    );
    await expect(page.getByTestId('notice-signal')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Head-butt' })).toHaveCount(0);

    await startLensJourney(page);
    await fillLens(page, lensLabels.word, 'I am behind');
    await fillLens(page, lensLabels.body, 'tight chest');
    await fillLens(page, lensLabels.emotion, 'sad, worried');
    await fillLens(page, lensLabels.image, 'a small gray cloud');
    await fillLens(page, lensLabels.observer, 'awareness is here too');
    await fillLens(page, lensLabels.meaning, 'I may need rest');
    await fillLens(page, lensLabels.action, 'Take one soft pause', m.lens_make_seed());

    await expect(page.getByText(m.garden_pending_seed_status())).toBeVisible();
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute('data-plot-mode', 'planting');
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute(
      'data-available-plots',
      /[1-9]/
    );
    await page.getByTestId('plant-here').click();

    await expect(page.getByText(m.garden_saved_seed_one({ count: 1 }))).toBeVisible();
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          gardenPlotId: 'front-right',
          gardenPosition: { x: 0.7, y: 0.87 },
          growthPoints: 0,
          status: 'planted',
        },
      ]);
    await page.reload();
    await expect(page.getByText(m.garden_saved_seed_one({ count: 1 }))).toBeVisible();

    await page.getByRole('button', { name: m.tab_archive() }).click();
    await page.getByRole('button', { name: /I am behind/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Goal: Take one soft pause', { exact: true })).toBeVisible();
    await dialog.getByRole('tab', { name: m.seed_dialog_tab_history() }).click();
    await dialog.getByText(m.seed_dialog_original_journey()).click();
    await expect(dialog.getByText('Action: Take one soft pause', { exact: true })).toBeVisible();
    await expect(
      dialog.getByText('Pause Wider: awareness is here too', { exact: true })
    ).toBeVisible();
    await expect(dialog.getByText('Image: a small gray cloud', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Grow Seed' })).toHaveCount(0);
  });

  test('persists an unfinished lens draft after reload', async ({ page }) => {
    await completeOnboarding(page);
    await startLensJourney(page);
    await fillLens(page, lensLabels.word, 'I am not enough');

    await page.reload();
    await expect(page.getByText(m.lens_body_title())).toBeVisible();
    await openCurrentLens(page);
    await expect(page.getByTestId('lens-panel')).toBeVisible();
    await expect(page.getByLabel(lensLabels.body)).toBeVisible();
  });

  test('recovers a pending seed after reload before planting', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Full seven-lens journey is covered on desktop; mobile covers shorter smoke paths.'
    );
    test.setTimeout(60_000);
    await completeOnboarding(page);
    await completeLensJourney(page);

    await expect(page.getByText(m.garden_pending_seed_status())).toBeVisible();
    await expect
      .poll(() => storedPendingSeed(page))
      .toMatchObject({
        tinyAction: 'Take one soft pause',
        lensJourney: {
          responses: {
            wordLabel: 'I am behind',
          },
        },
      });

    await page.reload();

    await expect(page.getByText(m.garden_pending_seed_status())).toBeVisible();
    await page.getByTestId('plant-here').click();
    await expect(page.getByText(m.garden_saved_seed_one({ count: 1 }))).toBeVisible();
    await expect.poll(() => storedPendingSeed(page)).toBeNull();
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          tinyAction: 'Take one soft pause',
          gardenPlotId: 'front-right',
        },
      ]);
  });

  test('starts a lens journey from the canvas signal', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Mobile canvas coverage uses active lens-object interactions; the signal hit target is desktop-stable.'
    );
    await completeOnboarding(page);

    await clickCanvasFraction(page, 0.72, 0.5);

    await expect(page.getByTestId('lens-panel')).toBeVisible();
    await expect(page.getByLabel(lensLabels.word)).toBeVisible();
  });

  test('only the active canvas lens object opens the lens panel', async ({ page }) => {
    await completeOnboarding(page);
    await startLensJourney(page);
    await expect(page.getByTestId('lens-panel')).toBeVisible();
    await expect(page.getByLabel(lensLabels.word)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('lens-panel')).toBeHidden();

    await clickCanvasFraction(page, 0.37, 0.58);
    await expect(page.getByTestId('lens-panel')).toBeHidden();

    await openCurrentLens(page);
    await expect(page.getByTestId('lens-panel')).toBeVisible();
    await expect(page.getByLabel(lensLabels.word)).toBeVisible();
  });

  test('plants a completed seed from the canvas soil and persists it', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Full seven-lens journey is covered on desktop.'
    );
    test.setTimeout(120_000);
    await completeOnboarding(page);
    await completeLensJourney(page);

    await expect(page.getByText(m.garden_pending_seed_status())).toBeVisible();
    await clickCanvasFraction(page, 0.74, 0.87);

    await expect(page.getByText(m.garden_saved_seed_one({ count: 1 }))).toBeVisible();
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute(
      'data-selected-plot',
      'front-right'
    );
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          gardenPlotId: 'front-right',
          status: 'planted',
        },
      ]);
    await page.reload();
    await expect(page.getByText(m.garden_saved_seed_one({ count: 1 }))).toBeVisible();
  });

  test('starts the pet without constant bounce', async ({ page }) => {
    await completeOnboarding(page);
    const canvas = page.getByTestId('garden-canvas');

    await expect(canvas).toHaveAttribute('data-pet-state', 'idle');
    await expect(canvas).toHaveAttribute('data-pet-motion', 'breathing');
    await expect(canvas).not.toHaveAttribute('data-pet-motion', 'bouncing');
  });

  test('renders anchored garden ambience on desktop and mobile', async ({ page }) => {
    await completeOnboarding(page);
    const canvas = page.getByTestId('garden-canvas');

    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('data-ambient-motion', 'anchored');
    await expect(canvas).toHaveAttribute('data-ambient-zones', 'pond,pet');
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
        )
      )
      .toBe(true);
  });

  test('follows the system dark theme by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await completeOnboarding(page);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.app-shell')).toHaveAttribute('data-theme-preference', 'system');
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute('data-texture-theme', 'dark');
    await expect(page.getByRole('button', { name: m.theme_match_system() })).toHaveClass(/active/);
    await expect(page.getByRole('button', { name: m.theme_use_dark_mode() })).not.toHaveClass(
      /active/
    );
  });

  test('keeps the removed dark lens chip menu off screen', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await completeOnboarding(page);
    await startLensJourney(page);
    await page.keyboard.press('Escape');

    const lensProgress = page.locator('.lens-progress');
    await expect(lensProgress).toHaveCount(0);
    await expect(page.getByText(m.lens_word_title())).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
        )
      )
      .toBe(true);
  });

  test('persists a manual light override while the system is dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await completeOnboarding(page);

    await page.getByRole('button', { name: m.theme_use_light_mode() }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute('data-texture-theme', 'light');
    await expect.poll(() => storedSettings(page)).toMatchObject({ themePreference: 'light' });

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute('data-texture-theme', 'light');
  });

  test('persists a manual dark override while the system is light and can return to system', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await completeOnboarding(page);

    await page.getByRole('button', { name: m.theme_use_dark_mode() }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute('data-texture-theme', 'dark');
    await expect.poll(() => storedSettings(page)).toMatchObject({ themePreference: 'dark' });

    await page.getByRole('button', { name: m.tab_settings() }).click();
    await page.getByLabel(m.theme_follow_system()).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => storedSettings(page)).toMatchObject({ themePreference: 'system' });
  });

  for (const scenario of [
    {
      name: 'dedicated manual dark preference',
      colorScheme: 'light' as const,
      themePreference: 'dark',
      settings: { reducedMotion: false, onboardingCompleted: true, themePreference: 'dark' },
      expectedTheme: 'dark',
    },
    {
      name: 'dedicated manual light preference',
      colorScheme: 'dark' as const,
      themePreference: 'light',
      settings: { reducedMotion: false, onboardingCompleted: true, themePreference: 'light' },
      expectedTheme: 'light',
    },
    {
      name: 'dedicated system dark preference',
      colorScheme: 'dark' as const,
      themePreference: 'system',
      settings: { reducedMotion: false, onboardingCompleted: true, themePreference: 'system' },
      expectedTheme: 'dark',
    },
    {
      name: 'dedicated preference over legacy settings',
      colorScheme: 'light' as const,
      themePreference: 'dark',
      settings: { reducedMotion: false, onboardingCompleted: true, themePreference: 'light' },
      expectedTheme: 'dark',
    },
    {
      name: 'legacy manual dark preference',
      colorScheme: 'light' as const,
      settings: { reducedMotion: false, onboardingCompleted: true, themePreference: 'dark' },
      expectedTheme: 'dark',
    },
    {
      name: 'invalid dedicated preference',
      colorScheme: 'dark' as const,
      themePreference: 'night',
      settings: { reducedMotion: false, onboardingCompleted: true, themePreference: 'light' },
      expectedTheme: 'dark',
    },
    {
      name: 'invalid legacy preference',
      colorScheme: 'dark' as const,
      settings: { reducedMotion: false, onboardingCompleted: true, themePreference: 'night' },
      expectedTheme: 'dark',
    },
    {
      name: 'invalid settings shape with manual theme',
      colorScheme: 'light' as const,
      settings: { themePreference: 'dark' },
      expectedTheme: 'light',
    },
    {
      name: 'malformed persisted settings',
      colorScheme: 'dark' as const,
      settings: '{not-json',
      expectedTheme: 'dark',
    },
  ] as const) {
    test(`sets first-paint theme from ${scenario.name} before React loads`, async ({ page }) => {
      await assertBootstrapTheme(page, scenario);
    });
  }

  test('advances an older seed after a later lens journey', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Full repeated journey growth is covered on desktop.'
    );
    test.setTimeout(90_000);
    await completeOnboarding(page);
    await completeLensJourney(page);
    await page.getByTestId('plant-here').click();
    await expect(page.getByText(m.garden_saved_seed_one({ count: 1 }))).toBeVisible();

    await completeLensJourney(page);

    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          status: 'sprouted',
          growthPoints: 1,
        },
      ]);
  });

  test('waters a planted seed, advances growth, and persists the watering', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Full seven-lens journey is covered on desktop.'
    );
    test.setTimeout(90_000);
    await completeOnboarding(page);
    await completeLensJourney(page);
    await page.getByTestId('plant-here').click();
    await expect(page.getByText(m.garden_saved_seed_one({ count: 1 }))).toBeVisible();

    await page.getByRole('button', { name: m.tab_archive() }).click();
    await page.getByRole('button', { name: /I am behind/i }).click();
    const dialog = page.getByRole('dialog');
    const waterTab = dialog.getByRole('tab', { name: m.seed_dialog_tab_water() });
    await expect(waterTab).toHaveAttribute('aria-controls', 'seed-dialog-panel-water');
    await expect(dialog.locator('#seed-dialog-panel-overview')).toHaveAttribute(
      'aria-labelledby',
      'seed-dialog-tab-overview'
    );
    await expect(dialog.getByRole('button', { name: 'Grow Seed' })).toHaveCount(0);
    await dialog.getByRole('button', { name: m.seed_dialog_water_seed() }).click();
    await expect(dialog.locator('#seed-dialog-panel-water')).toHaveAttribute(
      'aria-labelledby',
      'seed-dialog-tab-water'
    );
    await dialog.getByLabel(m.seed_prompt_first_label()).fill('   ');
    await dialog.getByLabel(m.seed_prompt_first_action()).fill('Take one gentle breath.');
    await dialog.getByRole('button', { name: m.seed_dialog_water_seed() }).click();
    await expect(dialog.getByText(m.seed_dialog_validation_watering())).toBeVisible();
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          status: 'planted',
          growthPoints: 0,
        },
      ]);
    await dialog.getByRole('button', { name: m.lens_let_it_rest() }).click();
    await dialog.getByRole('button', { name: m.seed_dialog_water_seed() }).click();
    await expect(dialog.getByText(m.seed_dialog_validation_watering())).toHaveCount(0);
    await expect(dialog.getByLabel(m.seed_prompt_first_label())).toHaveValue('');
    await expect(dialog.getByLabel(m.seed_prompt_first_action())).toHaveValue('');
    await dialog
      .getByLabel(m.seed_prompt_first_label())
      .fill('This is one story, not the whole of me.');
    await dialog.getByLabel(m.seed_prompt_first_action()).fill('Take one gentle breath.');
    await dialog.getByRole('button', { name: m.seed_dialog_water_seed() }).click();

    await dialog.getByRole('tab', { name: m.seed_dialog_tab_history() }).click();
    await dialog.getByText(m.seed_dialog_watering_history()).click();
    await expect(dialog.getByText('This is one story, not the whole of me.')).toBeVisible();
    await expect(dialog.getByText('Take one gentle breath.')).toBeVisible();
    await dialog.getByRole('tab', { name: m.seed_dialog_tab_water() }).click();
    await expect(page.getByText(m.pet_seed_watered())).toHaveCount(0);
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          status: 'sprouted',
          growthPoints: 1,
          visualType: 'sprout',
          waterings: [
            {
              transformedLabel: 'This is one story, not the whole of me.',
              kindAction: 'Take one gentle breath.',
            },
          ],
        },
      ]);

    await dialog.getByRole('button', { name: m.seed_dialog_close() }).click();
    await page.getByRole('button', { name: m.tab_garden() }).click();
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute('data-watered-seed', /\S/);
    const firstWateringEvent = await page
      .getByTestId('garden-canvas')
      .getAttribute('data-watering-event');
    expect(firstWateringEvent).toBeTruthy();

    await page.getByRole('button', { name: m.tab_archive() }).click();
    await page.getByRole('button', { name: /I am behind/i }).click();
    await dialog.getByRole('tab', { name: m.seed_dialog_tab_water() }).click();
    await dialog.getByLabel(m.seed_prompt_after_label()).fill('This story is smaller today.');
    await dialog.getByLabel(m.seed_prompt_next_action()).fill('Step outside for one minute.');
    await dialog.getByRole('button', { name: m.seed_dialog_water_seed() }).click();
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          status: 'growing',
          growthPoints: 2,
          visualType: 'bud',
          waterings: [
            {
              kindAction: 'Take one gentle breath.',
            },
            {
              kindAction: 'Step outside for one minute.',
            },
          ],
        },
      ]);
    await expect(dialog.getByTestId('bloom-form')).toBeVisible();
    await dialog
      .getByLabel(m.seed_dialog_bloom_label())
      .fill('This became one small flower of trust.');
    await dialog.getByRole('button', { name: m.seed_dialog_bloom_submit() }).click();
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          status: 'blooming',
          growthPoints: 3,
          visualType: 'flower',
          bloomReflection: {
            outcome: 'done',
            reflection: 'This became one small flower of trust.',
          },
        },
      ]);
    await dialog.getByRole('button', { name: m.seed_dialog_close() }).click();
    await page.getByRole('button', { name: m.tab_garden() }).click();
    await expect(page.getByTestId('garden-canvas')).toHaveAttribute('data-watering-event', /\S/);
    const secondWateringEvent = await page
      .getByTestId('garden-canvas')
      .getAttribute('data-watering-event');
    expect(secondWateringEvent).toBeTruthy();
    expect(secondWateringEvent).not.toBe(firstWateringEvent);

    await page.reload();
    await expect(page.getByText(m.garden_saved_seed_one({ count: 1 }))).toBeVisible();
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          status: 'blooming',
          visualType: 'flower',
          waterings: [
            {
              kindAction: 'Take one gentle breath.',
            },
            {
              kindAction: 'Step outside for one minute.',
            },
          ],
          bloomReflection: {
            reflection: 'This became one small flower of trust.',
          },
        },
      ]);
  });

  test('accessible planting skips an occupied preferred plot', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Desktop plot ordering is covered here; mobile keeps smoke coverage.'
    );
    test.setTimeout(60_000);
    await completeOnboarding(page);
    await seedStoredGarden(page, ['front-right']);
    await page.reload();
    await completeLensJourney(page);

    await page.getByTestId('plant-here').click();

    await expect(page.getByText(m.garden_saved_seed_many({ count: 2 }))).toBeVisible();
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          gardenPlotId: 'front-center',
        },
        {
          gardenPlotId: 'front-right',
        },
      ]);
  });

  test('accessible planting is disabled when designed plots are full', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Desktop full-plot behavior is covered here; mobile keeps smoke coverage.'
    );
    test.setTimeout(60_000);
    await completeOnboarding(page);
    await seedStoredGarden(page, [
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
    ]);
    await page.reload();
    await completeLensJourney(page);

    await expect(page.getByTestId('plant-here')).toBeDisabled();
    await expect(page.getByText(m.garden_seed_ready_full())).toBeVisible();
    await expect.poll(() => storedSeeds(page)).toHaveLength(12);
  });

  test('accessible planting uses the measured mobile canvas width', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Desktop browser is resized here to exercise the canvas-width threshold deterministically.'
    );
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 500, height: 760 });
    await completeOnboarding(page);
    await seedStoredGarden(page, ['front-right', 'front-center', 'front-left']);
    await page.reload();
    await completeLensJourney(page);

    await page.getByTestId('plant-here').click();

    await expect(page.getByText(m.garden_saved_seed_many({ count: 4 }))).toBeVisible();
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          gardenPlotId: 'front-far-right',
        },
        {
          gardenPlotId: 'front-right',
        },
        {
          gardenPlotId: 'front-center',
        },
        {
          gardenPlotId: 'front-left',
        },
      ]);
  });

  test('reports sleeping pet state without idle breathing motion', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Sleep debug sequence coverage is desktop-stable; mobile keeps no-bounce and reduced-motion coverage.'
    );
    await page.goto('/?petDebug=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await completeOnboarding(page);
    const canvas = page.getByTestId('garden-canvas');
    await expect(page.getByTestId('pet-debug-panel')).toBeVisible();

    await page.getByTestId('pet-debug-sequence-sleep').click();

    await expect(canvas).toHaveAttribute('data-pet-debug-preview', 'sleep');
    await expect(canvas).toHaveAttribute('data-pet-state', 'sleep', { timeout: 20_000 });
    await expect(canvas).toHaveAttribute('data-pet-motion', 'sleeping');
  });

  test('pet debug mode can freeze every pose and trigger representative sequences', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    test.skip(
      !!process.env.CI,
      'Pet debug pose review is a local visual QA harness; CI covers user-facing pet behavior and reduced-motion sequence smoke.'
    );
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Exhaustive pet pose review is covered on desktop; mobile keeps reduced-motion and canvas smoke coverage.'
    );
    await page.goto('/?petDebug=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await completeOnboarding(page);

    const canvas = page.getByTestId('garden-canvas');
    await expect(page.getByTestId('pet-debug-panel')).toBeVisible();
    await page.waitForTimeout(500);

    const frames = [
      'idle',
      'blinkSleepy',
      'curious',
      'headbuttWindup',
      'headbuttContact',
      'settleBack',
      'stretch',
      'groom',
      'napCurl',
      'sleeping',
      'wake',
      'plantProud',
    ];

    for (const frame of frames) {
      await page.getByTestId(`pet-debug-frame-${frame}`).click();
      await expect(canvas).toHaveAttribute('data-pet-frame', frame);
      await expect(canvas).toHaveAttribute('data-pet-debug-preview', frame);
    }

    const sequences: Array<{ id: string; state: string; finalState: string }> = [
      { id: 'stretch', state: 'attention', finalState: 'idle' },
      { id: 'sleep', state: 'napStart', finalState: 'sleep' },
      { id: 'wake', state: 'attention', finalState: 'idle' },
    ];

    for (const sequence of sequences) {
      await page.getByTestId(`pet-debug-sequence-${sequence.id}`).click();
      await expect(canvas).toHaveAttribute('data-pet-debug-preview', sequence.id);
      await expect(canvas).toHaveAttribute('data-pet-state', sequence.state);
      await expect(canvas).toHaveAttribute('data-pet-state', sequence.finalState, {
        timeout: 20_000,
      });
    }
  });

  test('keeps reduced-motion pet behavior to frame changes', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: m.tab_settings() }).click();
    await page.getByLabel(m.settings_reduce_motion()).check();
    await page.reload();

    const canvas = page.getByTestId('garden-canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('data-pet-motion', 'still');
    await expect(canvas).toHaveAttribute('data-ambient-motion', 'still');
    await expect(canvas).toHaveAttribute('data-ambient-zones', 'pond,pet');

    await page.waitForTimeout(2_000);
    await expect(canvas).toHaveAttribute('data-pet-motion', /^(frame-change|still)$/);
    await expect(canvas).not.toHaveAttribute('data-pet-motion', 'state-action');
  });

  test('pet debug sequences respect reduced motion', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile-chrome',
      'Debug sequence controls are exercised on desktop; mobile reduced-motion behavior is covered by the regular reduced-motion test.'
    );
    await page.goto('/?petDebug=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await completeOnboarding(page);
    await page.getByRole('button', { name: m.tab_settings() }).click();
    await page.getByLabel(m.settings_reduce_motion()).check();
    await page.reload();

    const canvas = page.getByTestId('garden-canvas');
    await expect(page.getByTestId('pet-debug-panel')).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByTestId('pet-debug-sequence-stretch').click();
    await expect(canvas).toHaveAttribute('data-pet-motion', 'frame-change');
    await expect(canvas).not.toHaveAttribute('data-pet-motion', 'state-action');
  });

  test('supports keyboard panel dismissal and persists reduced motion', async ({ page }) => {
    await completeOnboarding(page);
    await startLensJourney(page);
    const lensPanel = page.getByTestId('lens-panel');
    await expect(lensPanel).toBeVisible();

    await expect(page.getByRole('button', { name: 'Close Panel' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(lensPanel).toBeHidden();

    await clickActiveLensTarget(page);
    await expect(lensPanel).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(lensPanel).toBeHidden();

    await page.getByRole('button', { name: m.tab_settings() }).click();
    await page.getByLabel(m.settings_reduce_motion()).check();
    await page.reload();
    await page.getByRole('button', { name: m.tab_settings() }).click();
    await expect(page.getByLabel(m.settings_reduce_motion())).toBeChecked();
  });

  test('mobile smoke covers onboarding, lens start, storage, and planting @mobile-smoke', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'mobile-chrome', 'Mobile smoke runs on mobile-chrome.');
    test.setTimeout(60_000);

    await completeOnboarding(page);
    await startLensJourney(page);
    const lensPanel = page.getByTestId('lens-panel');
    await expect(lensPanel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(lensPanel).toBeHidden();

    await page.getByRole('button', { name: m.tab_settings() }).click();
    await page.getByLabel(m.settings_reduce_motion()).check();
    await page.reload();
    await page.getByRole('button', { name: m.tab_settings() }).click();
    await expect(page.getByLabel(m.settings_reduce_motion())).toBeChecked();

    await storePendingSeed(page);
    await page.reload();
    await expect(page.getByText(m.garden_pending_seed_status())).toBeVisible();
    await page.getByTestId('plant-here').click();

    await expect(page.getByText(m.garden_saved_seed_one({ count: 1 }))).toBeVisible();
    await expect.poll(() => storedPendingSeed(page)).toBeNull();
    await expect
      .poll(() => storedSeeds(page))
      .toMatchObject([
        {
          id: 'mobile-pending-seed',
          tinyAction: 'Take one mobile pause',
          gardenPlotId: 'front-right',
        },
      ]);
  });
});

async function completeOnboarding(page: Page) {
  await expect(page.getByTestId('onboarding-panel')).toBeVisible();
  await page.getByLabel(m.onboarding_mode_mixed()).check();
  await page.getByLabel(m.onboarding_order_open()).check();
  await page.getByRole('button', { name: m.onboarding_start() }).click();
  await expect(page.getByTestId('onboarding-panel')).toBeHidden();
}

async function fillLens(page: Page, label: string, value: string, buttonName = m.lens_continue()) {
  const panel = page.getByTestId('lens-panel');
  await expect(panel).toBeVisible();
  const field = panel.getByLabel(label);
  await field.fill(value);
  await expect(field).toHaveValue(value);
  await panel.getByRole('button', { name: buttonName }).click();
}

async function completeLensJourney(page: Page) {
  await startLensJourney(page);
  await fillLens(page, lensLabels.word, 'I am behind');
  await fillLens(page, lensLabels.body, 'tight chest');
  await fillLens(page, lensLabels.emotion, 'sad, worried');
  await fillLens(page, lensLabels.image, 'a small gray cloud');
  await fillLens(page, lensLabels.observer, 'awareness is here too');
  await fillLens(page, lensLabels.meaning, 'I may need rest');
  await fillLens(page, lensLabels.action, 'Take one soft pause', m.lens_make_seed());
}

async function startLensJourney(page: Page) {
  await clickCanvasFraction(page, 0.72, 0.5);
  try {
    await expect(page.getByTestId('lens-panel')).toBeVisible({ timeout: 1_500 });
  } catch {
    const startControl = page.getByTestId('start-lens-journey');
    await expect(startControl).toHaveCount(1);
    await startControl.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('lens-panel')).toBeVisible();
  }
}

async function openCurrentLens(page: Page) {
  await clickActiveLensTarget(page);
  try {
    await expect(page.getByTestId('lens-panel')).toBeVisible({ timeout: 1_500 });
  } catch {
    const startControl = page.getByTestId('start-lens-journey');
    await expect(startControl).toHaveCount(1);
    await startControl.focus();
    await page.keyboard.press('Enter');
  }
}

async function storedSeeds(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('signal-garden/reflection-seeds/vite/v1') ?? '[]')
  );
}

async function storedPendingSeed(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('signal-garden/pending-seed/vite/v1') ?? 'null')
  );
}

async function storedSettings(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('signal-garden/settings/vite/v1') ?? '{}')
  );
}

async function assertBootstrapTheme(
  page: Page,
  scenario: {
    colorScheme: 'dark' | 'light';
    themePreference?: string;
    settings: Record<string, unknown> | string;
    expectedTheme: 'dark' | 'light';
  }
) {
  await page.emulateMedia({ colorScheme: scenario.colorScheme });
  await page.route('**/src/main.tsx', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: '',
    })
  );
  await page.addInitScript(
    ({ settings, themePreference }) => {
      localStorage.removeItem('signal-garden/theme-preference/vite/v1');
      localStorage.removeItem('signal-garden/settings/vite/v1');
      if (themePreference !== undefined) {
        localStorage.setItem('signal-garden/theme-preference/vite/v1', themePreference);
      }
      localStorage.setItem(
        'signal-garden/settings/vite/v1',
        typeof settings === 'string' ? settings : JSON.stringify(settings)
      );
    },
    { settings: scenario.settings, themePreference: scenario.themePreference }
  );

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('data-theme', scenario.expectedTheme);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.colorScheme))
    .toBe(scenario.expectedTheme);
  await expect(page.locator('#root')).toBeEmpty();
}

async function seedStoredGarden(page: Page, plotIds: string[]) {
  await page.evaluate((ids) => {
    const seeds = ids.map((plotId, index) => ({
      id: `seed-${plotId}`,
      createdAt: `2026-06-07T12:${String(index).padStart(2, '0')}:00.000Z`,
      emotions: [],
      bodySignals: [],
      values: [],
      dreams: [],
      tinyAction: 'Pause.',
      status: 'planted',
      gardenPlotId: plotId,
      gardenPosition: { x: 0.5, y: 0.8 },
      growthPoints: 0,
      visualType: 'seed',
    }));
    localStorage.setItem('signal-garden/reflection-seeds/vite/v1', JSON.stringify(seeds));
  }, plotIds);
}

async function storePendingSeed(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('signal-garden/lens-session-draft/vite/v1');
    localStorage.setItem(
      'signal-garden/pending-seed/vite/v1',
      JSON.stringify({
        id: 'mobile-pending-seed',
        createdAt: '2026-06-07T13:00:00.000Z',
        labelText: 'mobile signal',
        unhookedText: 'Noticing the story: mobile signal',
        emotions: ['curious'],
        bodySignals: ['warm hands'],
        values: ['steadiness'],
        dreams: ['small lantern'],
        tinyAction: 'Take one mobile pause',
        status: 'planted',
        visualType: 'seed',
        lensJourney: {
          completedAt: '2026-06-07T13:05:00.000Z',
          lensOrder: ['word', 'body', 'emotion', 'image', 'observer', 'meaning', 'action'],
          responses: {
            wordLabel: 'mobile signal',
            bodySignal: 'warm hands',
            emotion: 'curious',
            innerImage: 'small lantern',
            observerNote: 'awareness is here',
            alternateMeaning: 'steadiness can be small',
            tinyAction: 'Take one mobile pause',
          },
        },
      })
    );
  });
}

async function clickCanvasFraction(page: Page, xFraction: number, yFraction: number) {
  const wrapper = page.getByTestId('garden-canvas');
  await expect(wrapper).toBeVisible();

  const phaserCanvas = wrapper.locator('canvas').first();
  const box =
    (await phaserCanvas.count()) > 0
      ? await phaserCanvas.boundingBox()
      : await wrapper.boundingBox();
  if (!box) throw new Error('Garden canvas missing');

  await page.mouse.click(box.x + box.width * xFraction, box.y + box.height * yFraction);
}

async function clickActiveLensTarget(page: Page) {
  const wrapper = page.getByTestId('garden-canvas');
  await expect(wrapper).toHaveAttribute('data-active-lens-x', /0\.\d+/);
  await expect(wrapper).toHaveAttribute('data-active-lens-y', /0\.\d+/);

  const [xFraction, yFraction] = await wrapper.evaluate((element) => [
    Number((element as HTMLElement).dataset.activeLensX),
    Number((element as HTMLElement).dataset.activeLensY),
  ]);

  if (!Number.isFinite(xFraction) || !Number.isFinite(yFraction)) {
    throw new Error('Active lens target is missing');
  }

  await clickCanvasFraction(page, xFraction, yFraction);
}
