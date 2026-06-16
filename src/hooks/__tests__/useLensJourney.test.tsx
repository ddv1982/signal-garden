import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InnerLensProfile, LensSessionDraft } from '../../../shared/models';
import { createLensProfile, createLensSessionDraft } from '../../domain/lenses';
import { useLensJourney, type UseLensJourneyOptions } from '../useLensJourney';

type JourneyState = ReturnType<typeof useLensJourney>;
type Repository = UseLensJourneyOptions['repository'];

let container: HTMLDivElement;
let root: Root;
let latestJourney: JourneyState;

beforeAll(() => {
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
  });
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('useLensJourney', () => {
  it('creates a default profile when beginning a journey without one', () => {
    const repository = createRepository();
    const onProfileEnsured = vi.fn();
    const onMessage = vi.fn();
    const onEnterGarden = vi.fn();

    renderJourney({ repository, profile: null, onProfileEnsured, onMessage, onEnterGarden });

    act(() => latestJourney.beginJourney());

    expect(onProfileEnsured).toHaveBeenCalledWith(
      expect.objectContaining({ preferredMode: 'mixed', promptOrder: 'open' })
    );
    expect(latestJourney.currentLens).toBe('word');
    expect(latestJourney.lensPanelOpen).toBe(true);
    expect(onMessage).toHaveBeenCalledWith(expect.any(String));
    expect(onEnterGarden).toHaveBeenCalledTimes(1);
  });

  it('keeps the panel closed and sends guidance when opening the wrong lens', () => {
    const profile = createLensProfile('mixed', 'open');
    const repository = createRepository();
    const onMessage = vi.fn();

    renderJourney({ repository, profile, onMessage });

    act(() => latestJourney.beginJourney());
    act(() => latestJourney.dismissPanel());
    act(() => latestJourney.openLens('body'));

    expect(latestJourney.currentLens).toBe('word');
    expect(latestJourney.lensPanelOpen).toBe(false);
    expect(onMessage).toHaveBeenLastCalledWith(expect.any(String));
  });

  it('clears in-progress journey state and stored drafts', () => {
    const profile = createLensProfile('mixed', 'open');
    const repository = createRepository(createLensSessionDraft(profile));

    renderJourney({ repository, profile });

    act(() => latestJourney.beginJourney());
    act(() => latestJourney.clearJourney());

    expect(latestJourney.lensDraft).toBeNull();
    expect(latestJourney.lensPanelOpen).toBe(false);
    expect(latestJourney.lensInput).toBe('');
    expect(repository.clearLensSessionDraft).toHaveBeenCalledTimes(1);
  });

  it('turns a completed lens session into a pending seed and clears the draft', () => {
    const profile = createLensProfile('mixed', 'open');
    const repository = createRepository();
    const onSeedReady = vi.fn();

    renderJourney({ repository, profile, onSeedReady });

    act(() => latestJourney.beginJourney());
    act(() => latestJourney.submitCurrentLens('I am behind'));
    act(() => latestJourney.submitCurrentLens('tight chest'));
    act(() => latestJourney.submitCurrentLens('sad, worried'));
    act(() => latestJourney.submitCurrentLens('a small gray cloud'));
    act(() => latestJourney.submitCurrentLens('awareness is here too'));
    act(() => latestJourney.submitCurrentLens('I may need rest'));
    act(() => latestJourney.submitCurrentLens('Take one soft pause'));

    expect(onSeedReady).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000000',
        labelText: 'I am behind',
        tinyAction: 'Take one soft pause',
        status: 'planted',
        visualType: 'stone',
      })
    );
    expect(latestJourney.lensDraft).toBeNull();
    expect(latestJourney.lensPanelOpen).toBe(false);
    expect(repository.clearLensSessionDraft).toHaveBeenCalledTimes(1);
  });
});

function renderJourney(overrides: Partial<UseLensJourneyOptions> = {}) {
  const options: UseLensJourneyOptions = {
    repository: createRepository(),
    profile: null,
    onProfileEnsured: vi.fn(),
    onSeedReady: vi.fn(),
    onMessage: vi.fn(),
    onEnterGarden: vi.fn(),
    ...overrides,
  };

  act(() => {
    root.render(<Harness options={options} />);
  });
}

function Harness({ options }: { options: UseLensJourneyOptions }) {
  const journey = useLensJourney(options);

  useEffect(() => {
    latestJourney = journey;
  }, [journey]);

  return null;
}

function createRepository(draft: LensSessionDraft | null = null): Repository {
  return {
    loadSeeds: vi.fn(() => []),
    saveSeeds: vi.fn(),
    clearSeeds: vi.fn(),
    loadLensProfile: vi.fn<() => InnerLensProfile | null>(() => null),
    saveLensProfile: vi.fn(),
    clearLensProfile: vi.fn(),
    loadLensSessionDraft: vi.fn(() => draft),
    saveLensSessionDraft: vi.fn(),
    clearLensSessionDraft: vi.fn(),
    loadPendingSeed: vi.fn(() => null),
    savePendingSeed: vi.fn(),
    clearPendingSeed: vi.fn(),
    loadSettings: vi.fn(() => ({
      reducedMotion: false,
      onboardingCompleted: false,
      themePreference: 'system' as const,
    })),
    saveSettings: vi.fn(),
    gardenState: vi.fn(() => ({
      seeds: [],
      pet: { name: 'Pet', mood: 'curious' as const, unlockedInteractionVariants: ['headButt'] },
    })),
  };
}
