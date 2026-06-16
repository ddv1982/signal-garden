import { Suspense, lazy, useEffect, useState } from 'react';
import type { InnerExperienceMode, LensPromptOrder, ReflectionSeed } from '../shared/models';
import { seedCardAccessibilityLabel, seedStatusLabel } from './domain/accessibilityCopy';
import { seedExportFilename, serializeSeedExport } from './domain/exportSeeds';
import type { ThemePreference } from './domain/theme';
import { createLensProfile, lensDefinitions } from './domain/lenses';
import {
  advanceGardenGrowth,
  assignPlotToSeed,
  bloomSeed,
  waterSeed,
  type SeedBloomInput,
  type SeedWateringInput,
} from './domain/seedGrowth';
import { createSignalGardenRepository } from './persistence/repositories';
import { firstAvailableGardenPlot } from './game/gardenLayout';
import { useLensJourney } from './hooks/useLensJourney';
import { useSystemTheme } from './hooks/useSystemTheme';
import { useGardenData } from './hooks/useGardenData';
import { useAppSettings } from './hooks/useAppSettings';
import { friendlySeedDate } from './domain/dates';
import { LensPanel } from './components/LensPanel';
import { OnboardingPanel } from './components/OnboardingPanel';
import { SeedStageArt } from './components/SeedStageArt';
import { SeedDialog } from './components/SeedDialog';
import { TopBar, type Tab } from './components/TopBar';
import { m } from './paraglide/messages.js';
import companionIdleUrl from './assets/companion/frames/idle-sit.webp';
import companionIdleDarkUrl from './assets/companion/frames-dark/idle-sit.webp';
import gardenBackgroundUrl from './assets/garden/background-v4.webp';
import gardenBackgroundDarkUrl from './assets/garden/background-dusk-v3.jpg';

const repository = createSignalGardenRepository();
const GardenCanvas = lazy(() =>
  import('./components/GardenCanvas').then((module) => ({ default: module.GardenCanvas }))
);

const themePreferenceOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: m.theme_follow_system() },
  { value: 'light', label: m.theme_light() },
  { value: 'dark', label: m.theme_dark() },
];

function savedSeedCountLabel(count: number) {
  return count === 1 ? m.garden_saved_seed_one({ count }) : m.garden_saved_seed_many({ count });
}

function plantedSeedCountLabel(count: number) {
  return count === 1 ? m.archive_count_one({ count }) : m.archive_count_many({ count });
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('garden');
  const {
    seeds,
    setSeeds,
    pendingSeed,
    gardenState,
    savePendingSeed,
    clearPendingSeed,
    clearGarden,
  } = useGardenData(repository);
  const systemTheme = useSystemTheme();
  const {
    settings,
    activeTheme,
    setThemePreference,
    setReducedMotion,
    completeOnboarding,
    resetOnboarding,
  } = useAppSettings(repository, systemTheme);
  const [profile, setProfile] = useState(() => repository.loadLensProfile());
  const [selectedSeed, setSelectedSeed] = useState<ReflectionSeed | null>(null);
  const [lastWateringEvent, setLastWateringEvent] = useState<{
    seedId: string;
    eventId: string;
  } | null>(null);
  const [petMessage, setPetMessage] = useState<string>(m.pet_nearby());
  const [gardenCanvasWidth, setGardenCanvasWidth] = useState(720);
  const [confirmingSeedDelete, setConfirmingSeedDelete] = useState(false);
  const [confirmingProfileReset, setConfirmingProfileReset] = useState(false);

  const journey = useLensJourney({
    repository,
    profile,
    onProfileEnsured: setProfile,
    onSeedReady: (seed) => {
      setSeeds((current) => advanceGardenGrowth(current, new Date().toISOString(), 'journey'));
      savePendingSeed(seed);
    },
    onMessage: setPetMessage,
    onEnterGarden: () => setActiveTab('garden'),
  });

  const needsOnboarding = !profile || !settings.onboardingCompleted;
  const petDebug =
    import.meta.env.DEV && new URLSearchParams(window.location.search).has('petDebug');
  const accessiblePlantPlot = firstAvailableGardenPlot(seeds, gardenCanvasWidth);

  useEffect(() => {
    if (profile) repository.saveLensProfile(profile);
  }, [profile]);
  function selectTab(tab: Tab) {
    setConfirmingSeedDelete(false);
    setConfirmingProfileReset(false);
    if (tab === 'home') {
      setPetMessage(
        seeds.length === 0
          ? m.pet_nearby()
          : seeds.length === 1
            ? m.pet_watches_one({ count: seeds.length })
            : m.pet_watches_many({ count: seeds.length })
      );
    }
    setActiveTab(tab);
  }

  function finishOnboarding(mode: InnerExperienceMode, order: LensPromptOrder) {
    setProfile(createLensProfile(mode, order));
    completeOnboarding();
    setPetMessage(m.pet_onboarding_complete());
  }

  function plantPendingSeed(position: { plotId: string; x: number; y: number }) {
    if (!pendingSeed) return;

    const plantedSeed = assignPlotToSeed(pendingSeed, position.plotId, {
      x: position.x,
      y: position.y,
    });
    setSeeds((current) => [plantedSeed, ...current]);
    clearPendingSeed();
    setPetMessage(m.pet_seed_planted());
  }

  function handleSeedWatering(seed: ReflectionSeed, input: SeedWateringInput): string | null {
    try {
      const watered = waterSeed(seed, input);
      const latestWatering = watered.waterings?.[watered.waterings.length - 1];
      setSeeds((current) => current.map((item) => (item.id === seed.id ? watered : item)));
      setSelectedSeed(watered);
      if (latestWatering) {
        setLastWateringEvent({ seedId: seed.id, eventId: latestWatering.id });
      }
      setPetMessage(m.pet_seed_watered());
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : m.app_error_watering_save();
    }
  }

  function handleSeedBloom(seed: ReflectionSeed, input: SeedBloomInput): string | null {
    try {
      const bloomed = bloomSeed(seed, input);
      setSeeds((current) => current.map((item) => (item.id === seed.id ? bloomed : item)));
      setSelectedSeed(bloomed);
      setLastWateringEvent({
        seedId: seed.id,
        eventId: `bloom-${bloomed.bloomReflection?.completedAt ?? Date.now()}`,
      });
      setPetMessage(m.pet_seed_bloomed());
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : m.app_error_bloom_save();
    }
  }

  function exportSeeds() {
    const blob = new Blob([serializeSeedExport(seeds)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = seedExportFilename();
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function deleteAllSeeds() {
    clearGarden();
    setSelectedSeed(null);
    setConfirmingSeedDelete(false);
    setPetMessage(m.pet_empty_garden());
  }

  function resetLensProfile() {
    resetOnboarding();
    setProfile(null);
    journey.resetSession();
    repository.clearLensProfile();
    setConfirmingProfileReset(false);
  }

  return (
    <main
      className="app-shell"
      data-theme-preference={settings.themePreference}
      data-active-theme={activeTheme}
    >
      <TopBar
        activeTab={activeTab}
        activeTheme={activeTheme}
        themePreference={settings.themePreference}
        onSelectTab={selectTab}
        onSelectTheme={setThemePreference}
      />

      {activeTab === 'home' && (
        <section className="panel home-grid">
          <div>
            <p className="eyebrow">{m.home_eyebrow()}</p>
            <h2>{m.home_title()}</h2>
            <p>{m.home_description()}</p>
            {journey.lensDraft ? (
              <button type="button" className="primary-action" onClick={journey.beginJourney}>
                {m.home_continue_journey({
                  step: journey.lensStepNumber,
                  total: journey.lensOrder.length,
                })}
              </button>
            ) : (
              <button type="button" className="primary-action" onClick={() => selectTab('garden')}>
                {m.home_enter_garden()}
              </button>
            )}
          </div>
          <div className="home-visual" aria-live="polite">
            <img
              className="home-garden-art"
              src={activeTheme === 'dark' ? gardenBackgroundDarkUrl : gardenBackgroundUrl}
              alt=""
            />
            <img
              className="home-companion-art"
              src={activeTheme === 'dark' ? companionIdleDarkUrl : companionIdleUrl}
              alt={m.app_pet_alt()}
            />
            <p>{petMessage}</p>
          </div>
        </section>
      )}

      {activeTab === 'garden' && !needsOnboarding && (
        <section className="garden-view">
          <h1 className="sr-only">{m.garden_title()}</h1>
          <div className="garden-stage">
            <Suspense
              fallback={<div className="garden-canvas loading-canvas">{m.garden_loading()}</div>}
            >
              <GardenCanvas
                state={gardenState}
                reducedMotion={settings.reducedMotion}
                theme={activeTheme}
                pendingSeed={pendingSeed}
                currentLens={journey.currentLens}
                lensSessionActive={Boolean(journey.lensDraft)}
                petDebug={petDebug}
                onPetTapped={() => setPetMessage(m.pet_notices_back())}
                onSeedSelected={setSelectedSeed}
                lastWateringEvent={lastWateringEvent}
                onSignalRequested={journey.beginJourney}
                onLensObjectSelected={journey.openLens}
                onPendingSeedPlanted={plantPendingSeed}
                onCanvasWidthChange={setGardenCanvasWidth}
              />
            </Suspense>
            {(pendingSeed || journey.lensDraft || seeds.length > 0) && !journey.lensPanelOpen && (
              <div className="garden-status" aria-live="polite">
                <span>
                  {pendingSeed
                    ? m.garden_pending_seed_status()
                    : journey.lensDraft
                      ? lensDefinitions[journey.lensDraft.currentLens].title
                      : savedSeedCountLabel(seeds.length)}
                </span>
              </div>
            )}
            {journey.lensPanelOpen &&
              journey.lensDraft &&
              journey.currentLensDefinition &&
              !pendingSeed && (
                <LensPanel
                  key={journey.currentLens}
                  draft={journey.lensDraft}
                  definition={journey.currentLensDefinition}
                  lensOrder={journey.lensOrder}
                  stepNumber={journey.lensStepNumber}
                  isLastLens={journey.isLastLens}
                  input={journey.lensInput}
                  onInputChange={journey.setLensInput}
                  onDismiss={journey.dismissPanel}
                  onRest={journey.clearJourney}
                  onSubmit={journey.submitCurrentLens}
                />
              )}
            {pendingSeed && (
              <div className="placement-panel" data-testid="placement-panel" aria-live="polite">
                <strong>{m.garden_seed_ready()}</strong>
                <span>
                  {accessiblePlantPlot
                    ? m.garden_seed_ready_available()
                    : m.garden_seed_ready_full()}
                </span>
                <button
                  type="button"
                  className="primary-action"
                  data-testid="plant-here"
                  disabled={!accessiblePlantPlot}
                  onClick={() => {
                    if (accessiblePlantPlot) {
                      plantPendingSeed({
                        plotId: accessiblePlantPlot.id,
                        x: accessiblePlantPlot.x,
                        y: accessiblePlantPlot.y,
                      });
                    }
                  }}
                >
                  {m.garden_plant_here()}
                </button>
              </div>
            )}
            <div className="sr-only" aria-live="polite">
              {petMessage}
            </div>
            <div className="sr-only garden-keyboard-controls">
              <p>{m.garden_keyboard_controls()}</p>
              <button
                type="button"
                data-testid="start-lens-journey"
                disabled={Boolean(pendingSeed)}
                onClick={journey.beginJourney}
              >
                {m.garden_start_lens_journey()}
              </button>
              {seeds.map((seed) => (
                <button
                  key={seed.id}
                  type="button"
                  aria-label={seedCardAccessibilityLabel(seed)}
                  onClick={() => setSelectedSeed(seed)}
                >
                  {m.garden_open_seed()}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'archive' && (
        <section className="panel archive-view">
          <div className="section-heading archive-heading">
            <div>
              <p className="eyebrow">{m.archive_eyebrow()}</p>
              <h2>{m.archive_title()}</h2>
            </div>
            <span className="section-count">{plantedSeedCountLabel(seeds.length)}</span>
          </div>
          {seeds.length === 0 ? (
            <div className="archive-empty">
              <SeedStageArt stageIndex={0} theme={activeTheme} />
              <p>{m.archive_empty()}</p>
              <button type="button" className="primary-action" onClick={() => selectTab('garden')}>
                {m.archive_visit_garden()}
              </button>
            </div>
          ) : (
            <div className="seed-list">
              {seeds.map((seed) => (
                <button
                  key={seed.id}
                  type="button"
                  className="seed-card"
                  aria-label={seedCardAccessibilityLabel(seed)}
                  onClick={() => setSelectedSeed(seed)}
                >
                  <SeedStageArt seed={seed} theme={activeTheme} />
                  <span>
                    {m.archive_seed_card_status({ status: seedStatusLabel(seed.status) })}
                  </span>
                  <strong>{seed.unhookedText || seed.labelText || seed.tinyAction}</strong>
                  <small>
                    {m.archive_planted_date({ date: friendlySeedDate(seed.createdAt) })}
                  </small>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="panel settings-view">
          <div>
            <p className="eyebrow">{m.settings_eyebrow()}</p>
            <h2>{m.settings_title()}</h2>
          </div>
          <fieldset className="settings-section settings-theme">
            <legend>{m.settings_appearance()}</legend>
            <div className="segmented-grid theme-preference-grid">
              {themePreferenceOptions.map((option) => (
                <label
                  key={option.value}
                  className={
                    settings.themePreference === option.value ? 'segment selected' : 'segment'
                  }
                >
                  <input
                    type="radio"
                    name="theme-preference"
                    value={option.value}
                    checked={settings.themePreference === option.value}
                    onChange={() => setThemePreference(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="settings-section">
            <h3>{m.settings_comfort()}</h3>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(event) => setReducedMotion(event.target.checked)}
              />
              {m.settings_reduce_motion()}
            </label>
          </div>
          <div className="settings-section">
            <h3>{m.settings_your_data()}</h3>
            <p>{m.settings_data_description()}</p>
            <div className="settings-actions">
              {confirmingProfileReset ? (
                <div
                  className="confirm-inline"
                  role="group"
                  aria-label={m.settings_confirm_profile_reset_label()}
                >
                  <span>{m.settings_profile_reset_warning()}</span>
                  <button type="button" onClick={() => setConfirmingProfileReset(false)}>
                    {m.settings_keep_journey()}
                  </button>
                  <button type="button" className="danger" onClick={resetLensProfile}>
                    {m.settings_reset_anyway()}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (journey.lensDraft) {
                      setConfirmingProfileReset(true);
                    } else {
                      resetLensProfile();
                    }
                  }}
                >
                  {m.settings_reset_lens_profile()}
                </button>
              )}
              <button type="button" onClick={exportSeeds} disabled={seeds.length === 0}>
                {m.settings_export_seed_data()}
              </button>
              {confirmingSeedDelete ? (
                <div
                  className="confirm-inline"
                  role="group"
                  aria-label={m.settings_confirm_seed_deletion_label()}
                >
                  <span>
                    {seeds.length === 1
                      ? m.settings_delete_seed_one({ count: seeds.length })
                      : m.settings_delete_seed_many({ count: seeds.length })}
                  </span>
                  <button type="button" onClick={() => setConfirmingSeedDelete(false)}>
                    {m.settings_cancel()}
                  </button>
                  <button type="button" className="danger" onClick={deleteAllSeeds}>
                    {m.settings_delete_permanently()}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="danger"
                  onClick={() => setConfirmingSeedDelete(true)}
                  disabled={seeds.length === 0}
                >
                  {m.settings_delete_seeds()}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {needsOnboarding && <OnboardingPanel onComplete={finishOnboarding} />}

      {selectedSeed && (
        <SeedDialog
          key={selectedSeed.id}
          seed={selectedSeed}
          onClose={() => setSelectedSeed(null)}
          onWater={handleSeedWatering}
          onBloom={handleSeedBloom}
        />
      )}
    </main>
  );
}
