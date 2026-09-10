import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { createSignalGardenRepository } from '../../persistence/repositories';
import { useAppSettings } from '../useAppSettings';

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.reducedMotion;
});

it.each([
  [false, false],
  [false, true],
  [true, false],
  [true, true],
])('combines app %s with OS %s and unsubscribes', (app, os) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const query = new EventTarget();
  let matches = os;
  const remove = vi.spyOn(query, 'removeEventListener');
  vi.stubGlobal('matchMedia', () => Object.assign(query, { matches }));
  const values = new Map<string, string>();
  const repository = createSignalGardenRepository({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  });
  repository.saveSettings({
    reducedMotion: app,
    onboardingCompleted: true,
    themePreference: 'system',
  });
  const container = document.createElement('div');
  const root = createRoot(container);

  function Harness() {
    const { effectiveReducedMotion } = useAppSettings(repository, 'light');
    return <output>{String(effectiveReducedMotion)}</output>;
  }

  act(() => root.render(<Harness />));
  expect(container.textContent).toBe(String(app || os));
  matches = !os;
  act(() => query.dispatchEvent(new Event('change')));
  expect(container.textContent).toBe(String(app || !os));
  expect(document.documentElement.dataset.reducedMotion).toBe(String(app || !os));
  expect(repository.loadSettings().reducedMotion).toBe(app);
  act(() => root.unmount());
  expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
});
