import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LensSessionDraft } from '../../../shared/models';
import { createLensProfile, createLensSessionDraft } from '../../domain/lenses';
import { createSignalGardenRepository } from '../../persistence/repositories';
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
  it('creates a default profile when beginning a journey without one', async () => {
    const repository = createRepository();
    const onProfileEnsured = vi.fn();
    const onMessage = vi.fn();
    const onEnterGarden = vi.fn();

    renderJourney({ repository, profile: null, onProfileEnsured, onMessage, onEnterGarden });

    await act(async () => latestJourney.beginJourney());

    expect(onProfileEnsured).toHaveBeenCalledWith(
      expect.objectContaining({ preferredMode: 'mixed', promptOrder: 'open' })
    );
    expect(latestJourney.currentLens).toBe('word');
    expect(latestJourney.lensPanelOpen).toBe(true);
    expect(onMessage).toHaveBeenCalledWith(expect.any(String));
    expect(onEnterGarden).toHaveBeenCalledTimes(1);
  });

  it('keeps the panel closed and sends guidance when opening the wrong lens', async () => {
    const profile = createLensProfile('mixed', 'open');
    const repository = createRepository();
    const onMessage = vi.fn();

    renderJourney({ repository, profile, onMessage });

    await act(async () => latestJourney.beginJourney());
    await act(async () => latestJourney.dismissPanel());
    await act(async () => latestJourney.openLens('body'));

    expect(latestJourney.currentLens).toBe('word');
    expect(latestJourney.lensPanelOpen).toBe(false);
    expect(onMessage).toHaveBeenLastCalledWith(expect.any(String));
  });

  it('clears in-progress journey state and stored drafts', async () => {
    const profile = createLensProfile('mixed', 'open');
    const repository = createRepository(createLensSessionDraft(profile));

    renderJourney({ repository, profile });

    await act(async () => latestJourney.beginJourney());
    await act(async () => latestJourney.clearJourney());

    expect(latestJourney.lensDraft).toBeNull();
    expect(latestJourney.lensPanelOpen).toBe(false);
    expect(latestJourney.lensInput).toBe('');
    expect(repository.reflections.read().document.draft).toBeNull();
  });

  it('keeps unsent text when dismissed, reopened, and remounted', async () => {
    const repository = createRepository();
    renderJourney({ repository });
    await act(async () => latestJourney.beginJourney());
    await act(async () => latestJourney.setLensInput('retain this unsent answer'));
    await act(async () => latestJourney.dismissPanel());
    await act(async () => latestJourney.openLens('word'));
    expect(latestJourney.lensInput).toBe('retain this unsent answer');
    expect(repository.reflections.read().document.draft?.completedLensIds).toEqual([]);
    act(() => root.unmount());
    root = createRoot(container);
    renderJourney({ repository });
    expect(latestJourney.lensInput).toBe('retain this unsent answer');
  });
  it('preserves local input when a concurrent tab changes the durable draft', async () => {
    const repository = createRepository();
    renderJourney({ repository });
    await act(async () => latestJourney.beginJourney());
    const durable = repository.reflections.read().document.draft;
    expect(durable).not.toBeNull();
    if (!durable) return;
    const originalCommand = repository.reflections.command;
    let release: (() => void) | undefined;
    repository.reflections.command = async (command) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return originalCommand(command);
    };
    await act(async () => latestJourney.setLensInput('my local text'));
    await act(async () => {
      await originalCommand({
        kind: 'draft',
        expected: durable,
        draft: { ...durable, responses: { ...durable.responses, wordLabel: 'other tab' } },
      });
    });
    await act(async () => release?.());
    expect(latestJourney.lensInput).toBe('my local text');
    expect(latestJourney.saveState).toBe('error');
    expect(repository.reflections.read().document.draft?.responses.wordLabel).toBe('other tab');
  });
  it('serializes delayed input saves without letting an old acknowledgement erase newer text', async () => {
    const repository = createRepository();
    renderJourney({ repository });
    await act(async () => latestJourney.beginJourney());
    const originalCommand = repository.reflections.command;
    const releases: Array<() => void> = [];
    repository.reflections.command = async (command) => {
      await new Promise<void>((resolve) => {
        releases.push(resolve);
      });
      return originalCommand(command);
    };
    await act(async () => {
      latestJourney.setLensInput('first');
      latestJourney.setLensInput('final answer');
    });
    expect(latestJourney.lensInput).toBe('final answer');
    expect(latestJourney.saveState).toBe('saving');
    await act(async () => releases.shift()?.());
    expect(latestJourney.lensInput).toBe('final answer');
    await act(async () => releases.shift()?.());
    expect(latestJourney.saveState).toBe('saved');
    expect(repository.reflections.read().document.draft?.responses.wordLabel).toBe('final answer');
  });
  it('turns a completed lens session into a pending seed and clears the draft', async () => {
    const profile = createLensProfile('mixed', 'open');
    const repository = createRepository();

    renderJourney({ repository, profile });

    await act(async () => latestJourney.beginJourney());
    await act(async () => latestJourney.submitCurrentLens('I am behind'));
    await act(async () => latestJourney.submitCurrentLens('tight chest'));
    await act(async () => latestJourney.submitCurrentLens('sad, worried'));
    await act(async () => latestJourney.submitCurrentLens('a small gray cloud'));
    await act(async () => latestJourney.submitCurrentLens('awareness is here too'));
    await act(async () => latestJourney.submitCurrentLens('I may need rest'));
    await act(async () => latestJourney.submitCurrentLens('Take one soft pause'));

    expect(repository.reflections.read().document.pendingSeed).toEqual(
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
    expect(repository.reflections.read().document.draft).toBeNull();
  });
});

function renderJourney(overrides: Partial<UseLensJourneyOptions> = {}) {
  const options: UseLensJourneyOptions = {
    repository: createRepository(),
    profile: null,
    onProfileEnsured: vi.fn(),
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
  const values = new Map<string, string>();
  if (draft) values.set('signal-garden/lens-session-draft/vite/v1', JSON.stringify(draft));
  return createSignalGardenRepository(
    {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    },
    async (work) => work()
  );
}
