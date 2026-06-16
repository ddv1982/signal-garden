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

  it('owns pending seed persistence and garden clearing', () => {
    const storage = createMemoryStorage();
    const repository = createSignalGardenRepository(storage);

    function Harness() {
      const garden = useGardenData(repository);
      return (
        <button
          type="button"
          onClick={() => {
            garden.setSeeds([seed]);
            garden.savePendingSeed(seed);
            garden.clearGarden();
          }}
        >
          Clear garden
        </button>
      );
    }

    act(() => root.render(<Harness />));
    act(() => container.querySelector('button')?.click());

    expect(repository.loadSeeds()).toEqual([]);
    expect(repository.loadPendingSeed()).toBeNull();
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
