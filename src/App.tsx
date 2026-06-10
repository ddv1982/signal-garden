import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { InnerExperienceMode, LensPromptOrder, ReflectionSeed } from '../shared/models';
import { seedCardAccessibilityLabel, seedStatusLabel } from './domain/accessibilityCopy';
import { seedExportFilename, serializeSeedExport } from './domain/exportSeeds';
import { resolveActiveTheme, type ThemePreference } from './domain/theme';
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
import { LensPanel } from './components/LensPanel';
import { OnboardingPanel } from './components/OnboardingPanel';
import { SeedDialog } from './components/SeedDialog';
import { TopBar, type Tab } from './components/TopBar';
import companionIdleUrl from './assets/companion/frames/idle-sit.png';
import companionIdleDarkUrl from './assets/companion/frames-dark/idle-sit.png';
import gardenBackgroundUrl from './assets/garden/background-v4.webp';
import gardenBackgroundDarkUrl from './assets/garden/background-dusk-v3.jpg';

const repository = createSignalGardenRepository();
const GardenCanvas = lazy(() =>
  import('./components/GardenCanvas').then((module) => ({ default: module.GardenCanvas }))
);

const themePreferenceOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Follow system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('garden');
  const [seeds, setSeeds] = useState<ReflectionSeed[]>(() =>
    advanceGardenGrowth(repository.loadSeeds())
  );
  const [settings, setSettings] = useState(() => repository.loadSettings());
  const [profile, setProfile] = useState(() => repository.loadLensProfile());
  const [selectedSeed, setSelectedSeed] = useState<ReflectionSeed | null>(null);
  const [pendingSeed, setPendingSeed] = useState<ReflectionSeed | null>(null);
  const [lastWateringEvent, setLastWateringEvent] = useState<{
    seedId: string;
    eventId: string;
  } | null>(null);
  const [petMessage, setPetMessage] = useState('Your pet is nearby.');
  const [gardenCanvasWidth, setGardenCanvasWidth] = useState(720);

  const systemTheme = useSystemTheme();
  const journey = useLensJourney({
    repository,
    profile,
    onProfileEnsured: setProfile,
    onSeedReady: (seed) => {
      setSeeds((current) => advanceGardenGrowth(current, new Date().toISOString(), 'journey'));
      setPendingSeed(seed);
    },
    onMessage: setPetMessage,
    onEnterGarden: () => setActiveTab('garden'),
  });

  const gardenState = useMemo(() => repository.gardenState(seeds), [seeds]);
  const needsOnboarding = !profile || !settings.onboardingCompleted;
  const petDebug =
    import.meta.env.DEV && new URLSearchParams(window.location.search).has('petDebug');
  const accessiblePlantPlot = firstAvailableGardenPlot(seeds, gardenCanvasWidth);
  const activeTheme = resolveActiveTheme(settings.themePreference, systemTheme);

  useEffect(() => repository.saveSeeds(seeds), [seeds]);
  useEffect(() => repository.saveSettings(settings), [settings]);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.style.colorScheme = activeTheme;
  }, [activeTheme]);
  useEffect(() => {
    if (profile) repository.saveLensProfile(profile);
  }, [profile]);

  function finishOnboarding(mode: InnerExperienceMode, order: LensPromptOrder) {
    setProfile(createLensProfile(mode, order));
    setSettings((current) => ({ ...current, onboardingCompleted: true }));
    setPetMessage('Your pet pads into the garden with you.');
  }

  function plantPendingSeed(position: { plotId: string; x: number; y: number }) {
    if (!pendingSeed) return;

    const plantedSeed = assignPlotToSeed(pendingSeed, position.plotId, {
      x: position.x,
      y: position.y,
    });
    setSeeds((current) => [plantedSeed, ...current]);
    setPendingSeed(null);
    setPetMessage('Your pet gives a proud head-butt. A new seed is planted.');
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
      setPetMessage('You watered this seed with one kind action.');
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'This watering could not be saved.';
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
      setPetMessage('The seed becomes a flower.');
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'This reflection could not be saved.';
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
    setSeeds([]);
    repository.clearSeeds();
    setSelectedSeed(null);
    setPetMessage('Your pet settles beside the empty garden.');
  }

  function resetLensProfile() {
    setSettings((current) => ({ ...current, onboardingCompleted: false }));
    setProfile(null);
    journey.resetSession();
    repository.clearLensProfile();
  }

  function setThemePreference(themePreference: ThemePreference) {
    setSettings((current) => ({ ...current, themePreference }));
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
        onSelectTab={setActiveTab}
        onSelectTheme={setThemePreference}
      />

      {activeTab === 'home' && (
        <section className="panel home-grid">
          <div>
            <p className="eyebrow">Lens journey</p>
            <h2>Move one signal through words, body, image, meaning, and action.</h2>
            <p>
              Your pet helps you notice inner signals without turning them into who you are. Each
              completed journey becomes a seed in your Dream Garden.
            </p>
            <button type="button" className="primary-action" onClick={() => setActiveTab('garden')}>
              Enter the Garden
            </button>
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
              alt="Ragdoll-style pet sitting in the garden."
            />
            <p>{petMessage}</p>
            <button type="button" className="primary-action" onClick={journey.beginJourney}>
              Begin Lens Journey
            </button>
          </div>
        </section>
      )}

      {activeTab === 'garden' && (
        <section className="garden-view">
          <h1 className="sr-only">Dream Garden</h1>
          <div className="garden-stage">
            <Suspense
              fallback={<div className="garden-canvas loading-canvas">Garden is waking up.</div>}
            >
              <GardenCanvas
                state={gardenState}
                reducedMotion={settings.reducedMotion}
                theme={activeTheme}
                pendingSeed={pendingSeed}
                currentLens={journey.currentLens}
                lensSessionActive={Boolean(journey.lensDraft)}
                petDebug={petDebug}
                onPetTapped={() => setPetMessage('Your pet notices you back.')}
                onSeedSelected={setSelectedSeed}
                lastWateringEvent={lastWateringEvent}
                onSignalRequested={journey.beginJourney}
                onLensObjectSelected={journey.openLens}
                onPendingSeedPlanted={plantPendingSeed}
                onCanvasWidthChange={setGardenCanvasWidth}
              />
            </Suspense>
            {(pendingSeed || journey.lensDraft || seeds.length > 0) && (
              <div className="garden-status" aria-live="polite">
                <span>
                  {pendingSeed
                    ? 'Place the seed in an open soil spot.'
                    : journey.lensDraft
                      ? lensDefinitions[journey.lensDraft.currentLens].title
                      : `${seeds.length} saved seed${seeds.length === 1 ? '' : 's'}`}
                </span>
              </div>
            )}
            {(journey.lensDraft || pendingSeed) && (
              <div className="lens-progress" aria-label="Lens journey progress">
                {journey.lensOrder.map((kind) => {
                  const complete =
                    Boolean(journey.lensDraft?.completedLensIds.includes(kind)) ||
                    Boolean(pendingSeed);
                  const active = journey.currentLens === kind && !pendingSeed;
                  const className = active
                    ? 'lens-chip active'
                    : complete
                      ? 'lens-chip complete'
                      : 'lens-chip';

                  return active && journey.lensDraft ? (
                    <button
                      key={kind}
                      type="button"
                      className={className}
                      onClick={() => journey.openLens(kind)}
                      aria-current="step"
                    >
                      {lensDefinitions[kind].actionLabel}
                    </button>
                  ) : (
                    <span key={kind} className={className} aria-disabled="true">
                      {lensDefinitions[kind].actionLabel}
                    </span>
                  );
                })}
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
                <strong>Seed ready</strong>
                <span>
                  {accessiblePlantPlot
                    ? 'Drag it into the soil, or plant it here with the accessible control.'
                    : 'The designed soil spots are full for now.'}
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
                  Plant Here
                </button>
              </div>
            )}
            <div className="sr-only" aria-live="polite">
              {petMessage}
            </div>
            <div className="sr-only garden-keyboard-controls">
              <p>
                Dream Garden keyboard controls. Start the glowing signal to begin a lens journey.
                Use Plant Here when a seed is ready.
              </p>
              <button
                type="button"
                data-testid="start-lens-journey"
                disabled={Boolean(pendingSeed)}
                onClick={journey.beginJourney}
              >
                Start lens journey
              </button>
              {seeds.map((seed) => (
                <button
                  key={seed.id}
                  type="button"
                  aria-label={seedCardAccessibilityLabel(seed)}
                  onClick={() => setSelectedSeed(seed)}
                >
                  Open seed
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
              <p className="eyebrow">Archive</p>
              <h2>Seeds you have planted.</h2>
            </div>
            <span className="section-count">
              {seeds.length} planted seed{seeds.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="seed-list">
            {seeds.length === 0 && <p>No seeds yet.</p>}
            {seeds.map((seed) => (
              <button
                key={seed.id}
                type="button"
                className="seed-card"
                aria-label={seedCardAccessibilityLabel(seed)}
                onClick={() => setSelectedSeed(seed)}
              >
                <span>{seedStatusLabel(seed.status)} seed</span>
                <strong>{seed.unhookedText || seed.labelText || seed.tinyAction}</strong>
                <small>{new Date(seed.createdAt).toLocaleString()}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="panel settings-grid">
          <div>
            <p className="eyebrow">Local data</p>
            <h2>Saved in this browser.</h2>
            <p>
              Reflection text, seeds, the lens profile, drafts, and settings stay in this browser
              through localStorage. No OpenAI text model reads or interprets your reflections in
              this prototype.
            </p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) =>
                setSettings((current) => ({ ...current, reducedMotion: event.target.checked }))
              }
            />
            Reduce garden motion
          </label>
          <fieldset className="settings-theme">
            <legend>Appearance</legend>
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
          <div className="settings-actions">
            <button type="button" onClick={resetLensProfile}>
              Reset Lens Profile
            </button>
            <button type="button" onClick={exportSeeds} disabled={seeds.length === 0}>
              Export Seed Data
            </button>
            <button
              type="button"
              className="danger"
              onClick={deleteAllSeeds}
              disabled={seeds.length === 0}
            >
              Delete Seeds
            </button>
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
