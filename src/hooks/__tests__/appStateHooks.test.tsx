import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ReflectionSeed } from '../../../shared/models';
import { createSignalGardenRepository } from '../../persistence/repositories';
import type { StorageLike } from '../../persistence/storage';
import { useAppSettings } from '../useAppSettings';
import { useGardenData } from '../useGardenData';

const seed: ReflectionSeed = {
  id: 'seed-1',
  createdAt: '2026-06-06T12:00:00.000Z',
  labelText: 'A thought',
  emotions: [],
  bodySignals: [],
  values: [],
  dreams: [],
  tinyAction: 'Take one breath.',
  status: 'planted',
  visualType: 'seed',
};

let container: HTMLDivElement;
let root: Root;

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
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
});

describe('app state hooks', () => {
  it('persists app settings and applies the resolved theme', () => {
    const storage = createMemoryStorage();
    const repository = createSignalGardenRepository(storage);

    function Harness() {
      const settings = useAppSettings(repository, 'dark');
      return (
        <button
          type="button"
          onClick={() => {
            settings.setThemePreference('light');
            settings.setReducedMotion(true);
            settings.completeOnboarding();
          }}
        >
          Update settings
        </button>
      );
    }

    act(() => root.render(<Harness />));
    act(() => container.querySelector('button')?.click());

    expect(repository.loadSettings()).toEqual({
      reducedMotion: true,
      onboardingCompleted: true,
      themePreference: 'light',
    });
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('owns pending seed persistence and garden clearing', async () => {
    const storage = createMemoryStorage();
    const repository = createSignalGardenRepository(storage, async (work) => work());

    storage.setItem('signal-garden/pending-seed/vite/v1', JSON.stringify(seed));
    function Harness() {
      const garden = useGardenData(repository);
      return (
        <button
          type="button"
          onClick={() =>
            garden.command({ kind: 'delete-completed', ids: ['one', 'archived', 'seed-1'] })
          }
        >
          Clear garden
        </button>
      );
    }

    act(() => root.render(<Harness />));
    await act(async () => container.querySelector('button')?.click());

    expect(repository.reflections.read().document.seeds).toEqual([]);
    expect(repository.reflections.read().document.pendingSeed).toBeNull();
  });

  it('retains initially readable seeds if the visit command cannot read storage', async () => {
    const memory = createMemoryStorage();
    memory.setItem('signal-garden/reflection-seeds/vite/v1', JSON.stringify([seed]));
    let failReads = false;
    const repository = createSignalGardenRepository(
      {
        ...memory,
        getItem(key) {
          if (failReads) throw new Error('Storage became unavailable');
          return memory.getItem(key);
        },
      },
      async (work) => {
        failReads = true;
        return work();
      }
    );
    function Harness() {
      const garden = useGardenData(repository);
      return (
        <>
          <output>{garden.seeds.length}</output>
          <p role="alert">{garden.error}</p>
        </>
      );
    }
    await act(async () => root.render(<Harness />));
    expect(container.querySelector('output')?.textContent).toBe('1');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('preserved');
  });
});

function createMemoryStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}
