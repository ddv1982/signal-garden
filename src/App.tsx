import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type {
  InnerExperienceMode,
  LensKind,
  LensPromptOrder,
  LensSessionDraft,
  ReflectionSeed,
  SeedBloomOutcome
} from '../shared/models';
import { seedCardAccessibilityLabel, seedStatusLabel } from './domain/accessibilityCopy';
import { seedExportFilename, serializeSeedExport } from './domain/exportSeeds';
import {
  completeLens,
  createJourneyFromSession,
  createLensProfile,
  createLensSessionDraft,
  createReflectionSeedFromJourney,
  isLensSessionComplete,
  lensDefinitions,
  lensOrderForProfile
} from './domain/lenses';
import { advanceGardenGrowth, assignPlotToSeed, bloomSeed, waterSeed } from './domain/seedGrowth';
import { createSignalGardenRepository } from './persistence/repositories';
import { firstAvailableGardenPlot } from './game/gardenLayout';
import companionIdleUrl from './assets/companion/frames/idle-sit.png';
import gardenBackgroundUrl from './assets/garden/background-v3.webp';

type Tab = 'home' | 'garden' | 'archive' | 'settings';
type SeedDialogTab = 'overview' | 'water' | 'history';

const repository = createSignalGardenRepository();
const GardenCanvas = lazy(() => import('./components/GardenCanvas').then((module) => ({ default: module.GardenCanvas })));

const modeOptions: Array<{ value: InnerExperienceMode; label: string }> = [
  { value: 'words', label: 'Words' },
  { value: 'images', label: 'Images' },
  { value: 'body', label: 'Body' },
  { value: 'emotions', label: 'Emotions' },
  { value: 'knowing', label: 'Quiet knowing' },
  { value: 'mixed', label: 'Mixed' }
];

const orderOptions: Array<{ value: LensPromptOrder; label: string }> = [
  { value: 'open', label: 'Open path' },
  { value: 'word-first', label: 'Words first' },
  { value: 'body-first', label: 'Body first' },
  { value: 'image-first', label: 'Images first' }
];

const bloomOutcomeOptions: Array<{ value: SeedBloomOutcome; label: string }> = [
  { value: 'done', label: 'It happened' },
  { value: 'adapted', label: 'It changed' },
  { value: 'more-care', label: 'It needs more care' }
];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('garden');
  const [seeds, setSeeds] = useState<ReflectionSeed[]>(() => advanceGardenGrowth(repository.loadSeeds()));
  const [settings, setSettings] = useState(() => repository.loadSettings());
  const [profile, setProfile] = useState(() => repository.loadLensProfile());
  const [lensDraft, setLensDraft] = useState<LensSessionDraft | null>(() => repository.loadLensSessionDraft());
  const [selectedSeed, setSelectedSeed] = useState<ReflectionSeed | null>(null);
  const [pendingSeed, setPendingSeed] = useState<ReflectionSeed | null>(null);
  const [lensPanelOpen, setLensPanelOpen] = useState(false);
  const [lensInput, setLensInput] = useState('');
  const [wateringOpen, setWateringOpen] = useState(false);
  const [wateringLabel, setWateringLabel] = useState('');
  const [wateringAction, setWateringAction] = useState('');
  const [wateringError, setWateringError] = useState('');
  const [bloomOutcome, setBloomOutcome] = useState<SeedBloomOutcome>('done');
  const [bloomReflection, setBloomReflection] = useState('');
  const [bloomError, setBloomError] = useState('');
  const [seedDialogTab, setSeedDialogTab] = useState<SeedDialogTab>('overview');
  const [lastWateringEvent, setLastWateringEvent] = useState<{ seedId: string; eventId: string } | null>(null);
  const [petMessage, setPetMessage] = useState('Your pet is nearby.');
  const [gardenCanvasWidth, setGardenCanvasWidth] = useState(720);
  const [onboardingMode, setOnboardingMode] = useState<InnerExperienceMode>('mixed');
  const [onboardingOrder, setOnboardingOrder] = useState<LensPromptOrder>('open');
  const lensInputRef = useRef<HTMLTextAreaElement | null>(null);
  const seedDialogRef = useRef<HTMLDialogElement | null>(null);
  const seedDialogCloseRef = useRef<HTMLButtonElement | null>(null);

  const gardenState = useMemo(() => repository.gardenState(seeds), [seeds]);
  const needsOnboarding = !profile || !settings.onboardingCompleted;
  const currentLens = lensDraft?.currentLens ?? null;
  const currentLensDefinition = currentLens ? lensDefinitions[currentLens] : null;
  const lensOrder = lensOrderForProfile(profile);
  const petDebug = import.meta.env.DEV && new URLSearchParams(window.location.search).has('petDebug');
  const accessiblePlantPlot = firstAvailableGardenPlot(seeds, gardenCanvasWidth);

  useEffect(() => repository.saveSeeds(seeds), [seeds]);
  useEffect(() => repository.saveSettings(settings), [settings]);
  useEffect(() => {
    if (profile) repository.saveLensProfile(profile);
  }, [profile]);
  useEffect(() => {
    if (lensDraft) repository.saveLensSessionDraft(lensDraft);
  }, [lensDraft]);
  useEffect(() => {
    const dialog = seedDialogRef.current;
    if (selectedSeed && dialog && !dialog.open) {
      dialog.showModal();
      seedDialogCloseRef.current?.focus();
    }
  }, [selectedSeed]);
  useEffect(() => {
    if (lensPanelOpen) lensInputRef.current?.focus();
  }, [lensPanelOpen, currentLens]);

  useEffect(() => {
    resetWateringForm();
    setSeedDialogTab('overview');
  }, [selectedSeed?.id]);

  function resetWateringForm() {
    setWateringOpen(false);
    setWateringLabel('');
    setWateringAction('');
    setWateringError('');
    setBloomOutcome('done');
    setBloomReflection('');
    setBloomError('');
  }

  function finishOnboarding() {
    const newProfile = createLensProfile(onboardingMode, onboardingOrder);
    setProfile(newProfile);
    setSettings((current) => ({ ...current, onboardingCompleted: true }));
    setPetMessage('Your pet pads into the garden with you.');
  }

  function beginLensJourney() {
    const activeProfile = profile ?? createLensProfile('mixed', 'open');
    const draft = lensDraft ?? createLensSessionDraft(activeProfile);
    setProfile(activeProfile);
    setLensDraft(draft);
    setLensInput(draft.responses[lensDefinitions[draft.currentLens].responseKey]);
    setLensPanelOpen(true);
    setPetMessage('A signal is glowing. Move through it one lens at a time.');
    setActiveTab('garden');
  }

  function openLens(kind: LensKind) {
    if (!lensDraft) {
      beginLensJourney();
      return;
    }

    if (kind !== lensDraft.currentLens) {
      setPetMessage('Follow the glowing lens one step at a time.');
      return;
    }

    setLensInput(lensDraft.responses[lensDefinitions[kind].responseKey]);
    setLensPanelOpen(true);
  }

  function submitCurrentLens() {
    if (!lensDraft || !currentLensDefinition) return;

    const updatedDraft = completeLens(lensDraft, profile, lensInput);
    setLensDraft(updatedDraft);
    setLensInput('');

    if (isLensSessionComplete(updatedDraft, profile)) {
      const journey = createJourneyFromSession(updatedDraft, profile);
      const seed = createReflectionSeedFromJourney(journey);
      setSeeds((current) => advanceGardenGrowth(current, new Date().toISOString(), 'journey'));
      setPendingSeed(seed);
      setLensDraft(null);
      repository.clearLensSessionDraft();
      setLensPanelOpen(false);
      setPetMessage('The lens journey becomes a seed. Plant it in the soil.');
      return;
    }

    const nextDefinition = lensDefinitions[updatedDraft.currentLens];
    setLensInput(updatedDraft.responses[nextDefinition.responseKey]);
    setPetMessage(`${nextDefinition.title}. Your pet stays close.`);
  }

  function clearLensJourney() {
    setLensDraft(null);
    setLensPanelOpen(false);
    setLensInput('');
    repository.clearLensSessionDraft();
    setPetMessage('The signal settles back into the garden.');
  }

  function plantPendingSeed(position: { plotId: string; x: number; y: number }) {
    if (!pendingSeed) return;

    const plantedSeed = assignPlotToSeed(pendingSeed, position.plotId, { x: position.x, y: position.y });
    setSeeds((current) => [plantedSeed, ...current]);
    setPendingSeed(null);
    setPetMessage('Your pet gives a proud head-butt. A new seed is planted.');
  }

  function submitSeedWatering(seed: ReflectionSeed) {
    const transformedLabel = wateringLabel.trim();
    const kindAction = wateringAction.trim();
    if (!transformedLabel || !kindAction) {
      setWateringError('Add both a softened label and one small action before watering.');
      return;
    }

    const watered = waterSeed(seed, {
      transformedLabel,
      kindAction
    });
    const latestWatering = watered.waterings?.[watered.waterings.length - 1];
    setSeeds((current) => current.map((item) => (item.id === seed.id ? watered : item)));
    setSelectedSeed(watered);
    resetWateringForm();
    if (latestWatering) {
      setLastWateringEvent({ seedId: seed.id, eventId: latestWatering.id });
    }
    setPetMessage('You watered this seed with one kind action.');
  }

  function submitSeedBloom(seed: ReflectionSeed) {
    const reflection = bloomReflection.trim();
    if (!reflection) {
      setBloomError('Add one reflection before the seed becomes a flower.');
      return;
    }

    const bloomed = bloomSeed(seed, {
      outcome: bloomOutcome,
      reflection
    });
    setSeeds((current) => current.map((item) => (item.id === seed.id ? bloomed : item)));
    setSelectedSeed(bloomed);
    resetWateringForm();
    setSeedDialogTab('overview');
    setLastWateringEvent({ seedId: seed.id, eventId: `bloom-${bloomed.bloomReflection?.completedAt ?? Date.now()}` });
    setPetMessage('The seed becomes a flower.');
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="app-brand">
          <span className="brand-mark" aria-hidden="true">SG</span>
          <div>
            <p className="eyebrow">Signal Garden</p>
            <span>A living garden for shifting perspective.</span>
          </div>
        </div>
        <nav className="tabs" aria-label="Signal Garden sections">
          {(['home', 'garden', 'archive', 'settings'] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'tab active' : 'tab'}
              aria-current={activeTab === tab ? 'page' : undefined}
              onClick={() => setActiveTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'home' && (
        <section className="panel home-grid">
          <div>
            <p className="eyebrow">Lens journey</p>
            <h2>Move one signal through words, body, image, meaning, and action.</h2>
            <p>
              Your pet helps you notice inner signals without turning them into who you are.
              Each completed journey becomes a seed in your Dream Garden.
            </p>
            <button type="button" className="primary-action" onClick={() => setActiveTab('garden')}>
              Enter the Garden
            </button>
          </div>
          <div className="home-visual" aria-live="polite">
            <img className="home-garden-art" src={gardenBackgroundUrl} alt="" />
            <img className="home-companion-art" src={companionIdleUrl} alt="Ragdoll-style pet sitting in the garden." />
            <p>{petMessage}</p>
            <button type="button" className="primary-action" onClick={beginLensJourney}>
              Begin Lens Journey
            </button>
          </div>
        </section>
      )}

      {activeTab === 'garden' && (
        <section className="garden-view">
          <h1 className="sr-only">Dream Garden</h1>
          <div className="garden-stage">
            <Suspense fallback={<div className="garden-canvas loading-canvas">Garden is waking up.</div>}>
              <GardenCanvas
                state={gardenState}
                reducedMotion={settings.reducedMotion}
                pendingSeed={pendingSeed}
                currentLens={currentLens}
                lensSessionActive={Boolean(lensDraft)}
                petDebug={petDebug}
                onPetTapped={() => setPetMessage('Your pet notices you back.')}
                onSeedSelected={setSelectedSeed}
                lastWateringEvent={lastWateringEvent}
                onSignalRequested={beginLensJourney}
                onLensObjectSelected={openLens}
                onPendingSeedPlanted={plantPendingSeed}
                onCanvasWidthChange={setGardenCanvasWidth}
              />
            </Suspense>
            {(pendingSeed || lensDraft || seeds.length > 0) && (
              <div className="garden-status" aria-live="polite">
                <span>
                  {pendingSeed
                    ? 'Place the seed in an open soil spot.'
                    : lensDraft
                      ? lensDefinitions[lensDraft.currentLens].title
                      : `${seeds.length} saved seed${seeds.length === 1 ? '' : 's'}`}
                </span>
              </div>
            )}
            {(lensDraft || pendingSeed) && (
              <div className="lens-progress" aria-label="Lens journey progress">
                {lensOrder.map((kind) => {
                  const complete = Boolean(lensDraft?.completedLensIds.includes(kind)) || Boolean(pendingSeed);
                  const active = currentLens === kind && !pendingSeed;
                  const className = active ? 'lens-chip active' : complete ? 'lens-chip complete' : 'lens-chip';

                  return active && lensDraft ? (
                    <button
                      key={kind}
                      type="button"
                      className={className}
                      onClick={() => openLens(kind)}
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
            {lensPanelOpen && lensDraft && currentLensDefinition && !pendingSeed && (
              <form
                className="signal-panel lens-panel"
                data-testid="lens-panel"
                role="dialog"
                aria-modal="false"
                aria-labelledby="lens-panel-title"
                aria-label="Move this signal through the current lens"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setLensPanelOpen(false);
                }}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitCurrentLens();
                }}
              >
                <div>
                  <p className="eyebrow">Current lens</p>
                  <h3 id="lens-panel-title">{currentLensDefinition.title}</h3>
                </div>
                <label>
                  {currentLensDefinition.fieldLabel}
                  <textarea
                    ref={lensInputRef}
                    value={lensInput}
                    onChange={(event) => setLensInput(event.target.value)}
                    placeholder={currentLensDefinition.helper}
                  />
                </label>
                <div className="form-actions">
                  <button type="button" onClick={clearLensJourney}>Let it rest</button>
                  <button type="submit" className="primary-action">
                    {isLastLens(lensDraft.currentLens, lensOrder) ? 'Make Seed' : 'Continue'}
                  </button>
                </div>
              </form>
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
                        y: accessiblePlantPlot.y
                      });
                    }
                  }}
                >
                  Plant Here
                </button>
              </div>
            )}
            <div className="sr-only" aria-live="polite">{petMessage}</div>
            <div className="sr-only garden-keyboard-controls">
              <p>
                Dream Garden keyboard controls. Start the glowing signal to begin a lens journey. Use Plant Here when a seed is ready.
              </p>
              <button
                type="button"
                data-testid="start-lens-journey"
                disabled={Boolean(pendingSeed)}
                onClick={beginLensJourney}
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
              Reflection text, seeds, the lens profile, drafts, and settings stay in this browser through localStorage.
              No OpenAI text model reads or interprets your reflections in this prototype.
            </p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) => setSettings((current) => ({ ...current, reducedMotion: event.target.checked }))}
            />
            Reduce garden motion
          </label>
          <div className="settings-actions">
            <button type="button" onClick={() => {
              setSettings((current) => ({ ...current, onboardingCompleted: false }));
              setProfile(null);
              setLensDraft(null);
              setLensPanelOpen(false);
              setLensInput('');
              repository.clearLensProfile();
              repository.clearLensSessionDraft();
            }}>
              Reset Lens Profile
            </button>
            <button type="button" onClick={exportSeeds} disabled={seeds.length === 0}>Export Seed Data</button>
            <button type="button" className="danger" onClick={deleteAllSeeds} disabled={seeds.length === 0}>Delete Seeds</button>
          </div>
        </section>
      )}

      {needsOnboarding && (
        <section className="onboarding-backdrop" aria-labelledby="onboarding-title" data-testid="onboarding-panel">
          <form
            className="onboarding-panel"
            onSubmit={(event) => {
              event.preventDefault();
              finishOnboarding();
            }}
          >
            <p className="eyebrow">Inner lens profile</p>
            <h2 id="onboarding-title">How does experience usually arrive for you?</h2>
            <p>
              This only changes the order and emphasis of garden prompts. It is stored locally and is not a diagnosis.
            </p>
            <fieldset>
              <legend>Most familiar signal</legend>
              <div className="segmented-grid">
                {modeOptions.map((option) => (
                  <label key={option.value} className={onboardingMode === option.value ? 'segment selected' : 'segment'}>
                    <input
                      type="radio"
                      name="preferred-mode"
                      value={option.value}
                      checked={onboardingMode === option.value}
                      onChange={() => setOnboardingMode(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Gentle path</legend>
              <div className="segmented-grid">
                {orderOptions.map((option) => (
                  <label key={option.value} className={onboardingOrder === option.value ? 'segment selected' : 'segment'}>
                    <input
                      type="radio"
                      name="prompt-order"
                      value={option.value}
                      checked={onboardingOrder === option.value}
                      onChange={() => setOnboardingOrder(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="primary-action">Start in the Garden</button>
          </form>
        </section>
      )}

      {selectedSeed && (
        <dialog
          ref={seedDialogRef}
          className="seed-dialog"
          aria-labelledby="seed-dialog-title"
          onClose={() => {
            setSelectedSeed(null);
            resetWateringForm();
          }}
        >
          <div className="dialog-heading">
            <p className="eyebrow">{seedStatusLabel(selectedSeed.status)} seed</p>
            <button ref={seedDialogCloseRef} type="button" aria-label="Close seed details" onClick={() => setSelectedSeed(null)}>Close</button>
          </div>
          <h2 id="seed-dialog-title">{selectedSeed.unhookedText || selectedSeed.labelText || 'A tiny kind action'}</h2>
          <div className="seed-dialog-tabs" role="tablist" aria-label="Seed details">
            {(['overview', 'water', 'history'] as SeedDialogTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={seedDialogTab === tab}
                className={seedDialogTab === tab ? 'seed-dialog-tab active' : 'seed-dialog-tab'}
                onClick={() => setSeedDialogTab(tab)}
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {seedDialogTab === 'overview' && (
            <section className="seed-dialog-panel" role="tabpanel">
              <div className="seed-stage-card">
                <p className="eyebrow">{seedStageCopy(selectedSeed).eyebrow}</p>
                <strong>{seedStageCopy(selectedSeed).title}</strong>
                <span>{seedStageCopy(selectedSeed).description}</span>
              </div>
              <div className="seed-progress" aria-label="Seed growth progress">
                {['Seed', 'Sprout', 'Bud', 'Flower'].map((step, index) => (
                  <span key={step} className={index <= growthIndexForSeed(selectedSeed) ? 'complete' : ''}>
                    {step}
                  </span>
                ))}
              </div>
              <p><strong>Goal:</strong> {selectedSeed.tinyAction}</p>
              {selectedSeed.bloomReflection && (
                <p><strong>Bloom reflection:</strong> {selectedSeed.bloomReflection.reflection}</p>
              )}
              <button type="button" className="primary-action" onClick={() => setSeedDialogTab('water')}>
                {selectedSeed.bloomReflection ? 'Review Growth' : selectedSeed.waterings && selectedSeed.waterings.length >= 2 ? 'Reflect to Flower' : 'Water Seed'}
              </button>
            </section>
          )}

          {seedDialogTab === 'water' && (
            <section className="seed-dialog-panel" role="tabpanel">
              {selectedSeed.bloomReflection ? (
                <div className="seed-stage-card">
                  <p className="eyebrow">Flower</p>
                  <strong>This seed has bloomed.</strong>
                  <span>{selectedSeed.bloomReflection.reflection}</span>
                </div>
              ) : selectedSeed.waterings && selectedSeed.waterings.length >= 2 ? (
                <form
                  className="watering-form"
                  data-testid="bloom-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitSeedBloom(selectedSeed);
                  }}
                >
                  <fieldset>
                    <legend>Did this goal/action happen, change, or need more care?</legend>
                    <div className="segmented-grid">
                      {bloomOutcomeOptions.map((option) => (
                        <label key={option.value} className={bloomOutcome === option.value ? 'segment selected' : 'segment'}>
                          <input
                            type="radio"
                            name="bloom-outcome"
                            value={option.value}
                            checked={bloomOutcome === option.value}
                            onChange={() => setBloomOutcome(option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label>
                    What does this seed become now?
                    <textarea
                      value={bloomReflection}
                      onChange={(event) => {
                        setBloomReflection(event.target.value);
                        if (bloomError) setBloomError('');
                      }}
                      placeholder="Name what grew from this small action."
                      required
                    />
                  </label>
                  {bloomError && <p className="form-error" role="alert">{bloomError}</p>}
                  <div className="form-actions">
                    <button type="button" onClick={resetWateringForm}>Let it rest</button>
                    <button type="submit" className="primary-action">Bloom Into Flower</button>
                  </div>
                </form>
              ) : (
                <form
                  className="watering-form"
                  data-testid="watering-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitSeedWatering(selectedSeed);
                  }}
                >
                  <label>
                    {wateringPromptForSeed(selectedSeed).label}
                    <textarea
                      value={wateringLabel}
                      onChange={(event) => {
                        setWateringLabel(event.target.value);
                        if (wateringError) setWateringError('');
                      }}
                      placeholder={wateringPromptForSeed(selectedSeed).labelPlaceholder}
                      required
                    />
                  </label>
                  <label>
                    {wateringPromptForSeed(selectedSeed).actionLabel}
                    <textarea
                      value={wateringAction}
                      onChange={(event) => {
                        setWateringAction(event.target.value);
                        if (wateringError) setWateringError('');
                      }}
                      placeholder={wateringPromptForSeed(selectedSeed).actionPlaceholder}
                      required
                    />
                  </label>
                  {wateringError && <p className="form-error" role="alert">{wateringError}</p>}
                  <div className="form-actions">
                    <button type="button" onClick={resetWateringForm}>Let it rest</button>
                    <button type="submit" className="primary-action">Water Seed</button>
                  </div>
                </form>
              )}
            </section>
          )}

          {seedDialogTab === 'history' && (
            <section className="seed-dialog-panel" role="tabpanel">
              <details>
                <summary>Original lens journey</summary>
                <div className="journey-detail">
                  <p><strong>Action:</strong> {selectedSeed.tinyAction}</p>
                  {selectedSeed.emotions.length > 0 && <p><strong>Emotions:</strong> {selectedSeed.emotions.join(', ')}</p>}
                  {selectedSeed.bodySignals.length > 0 && <p><strong>Body:</strong> {selectedSeed.bodySignals.join(', ')}</p>}
                  {selectedSeed.values.length > 0 && <p><strong>Meaning:</strong> {selectedSeed.values.join(', ')}</p>}
                  {selectedSeed.dreams.length > 0 && <p><strong>Image:</strong> {selectedSeed.dreams.join(', ')}</p>}
                  {selectedSeed.lensJourney?.lensOrder.map((kind) => {
                    const definition = lensDefinitions[kind];
                    const value = selectedSeed.lensJourney?.responses[definition.responseKey];
                    if (!value) return null;
                    return <p key={kind}><strong>{definition.actionLabel}:</strong> {value}</p>;
                  })}
                </div>
              </details>
              <details>
                <summary>Watering history</summary>
                <div className="watering-history">
                  {selectedSeed.waterings && selectedSeed.waterings.length > 0 ? selectedSeed.waterings.map((watering, index) => (
                    <p key={watering.id}>
                      <strong>{index + 1}. {watering.transformedLabel}</strong>
                      <span>{watering.kindAction}</span>
                    </p>
                  )) : <p>No waterings yet.</p>}
                  {selectedSeed.bloomReflection && (
                    <p>
                      <strong>Flower: {bloomOutcomeLabel(selectedSeed.bloomReflection.outcome)}</strong>
                      <span>{selectedSeed.bloomReflection.reflection}</span>
                    </p>
                  )}
                </div>
              </details>
            </section>
          )}
        </dialog>
      )}
    </main>
  );
}

function isLastLens(current: LensKind, order: LensKind[]) {
  return order[order.length - 1] === current;
}

function wateringCountForSeed(seed: ReflectionSeed) {
  return seed.waterings?.length ?? 0;
}

function growthIndexForSeed(seed: ReflectionSeed) {
  if (seed.bloomReflection || seed.status === 'blooming') return 3;
  if (wateringCountForSeed(seed) >= 2 || seed.status === 'growing') return 2;
  if (wateringCountForSeed(seed) >= 1 || seed.status === 'sprouted') return 1;
  return 0;
}

function seedStageCopy(seed: ReflectionSeed) {
  const index = growthIndexForSeed(seed);
  if (index === 3) {
    return {
      eyebrow: 'Flower',
      title: 'This seed has bloomed.',
      description: 'The action has become a flower in the garden.'
    };
  }
  if (index === 2) {
    return {
      eyebrow: 'Growing plant',
      title: 'A bud is forming.',
      description: 'One final reflection can decide whether this becomes a flower.'
    };
  }
  if (index === 1) {
    return {
      eyebrow: 'Sprout',
      title: 'The seed has sprouted.',
      description: 'Water it once more by noticing what changed and choosing the next kind version.'
    };
  }
  return {
    eyebrow: 'Seed',
    title: 'This seed is planted.',
    description: 'Water it with one softened label and one small action.'
  };
}

function wateringPromptForSeed(seed: ReflectionSeed) {
  if (wateringCountForSeed(seed) >= 1) {
    return {
      label: 'What did you notice after trying this?',
      labelPlaceholder: 'Name what shifted, even if it was small.',
      actionLabel: 'What is the next kind version?',
      actionPlaceholder: seed.tinyAction
    };
  }

  return {
    label: 'How can this label soften today?',
    labelPlaceholder: `The story "${seed.labelText || seed.tinyAction}" can soften into one passing thought.`,
    actionLabel: 'What small action gives this seed water?',
    actionPlaceholder: seed.tinyAction
  };
}

function bloomOutcomeLabel(outcome: SeedBloomOutcome) {
  return bloomOutcomeOptions.find((option) => option.value === outcome)?.label ?? 'It changed';
}
