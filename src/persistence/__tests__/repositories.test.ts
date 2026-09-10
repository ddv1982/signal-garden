import { describe, expect, it, vi } from 'vitest';
import { createLensProfile } from '../../domain/lenses';
import { createSignalGardenRepository } from '../repositories';
import type { StorageLike } from '../storage';

describe('createSignalGardenRepository', () => {
  it('saves and loads the local lens profile', () => {
    const storage = createMemoryStorage();
    const repository = createSignalGardenRepository(storage);
    const profile = createLensProfile('body', 'body-first');

    repository.saveLensProfile(profile);

    expect(repository.loadLensProfile()).toEqual(profile);
  });

  it('clears the local lens profile', () => {
    const storage = createMemoryStorage();
    const repository = createSignalGardenRepository(storage);
    const profile = createLensProfile('body', 'body-first');

    repository.saveLensProfile(profile);
    repository.clearLensProfile();

    expect(repository.loadLensProfile()).toBeNull();
  });

  it('loads older settings without onboarding state', () => {
    const storage = createMemoryStorage();
    storage.setItem('signal-garden/settings/vite/v1', JSON.stringify({ reducedMotion: true }));

    expect(createSignalGardenRepository(storage).loadSettings()).toEqual({
      reducedMotion: true,
      onboardingCompleted: false,
      themePreference: 'system',
    });
  });

  it('saves and loads the theme preference', () => {
    const storage = createMemoryStorage();
    const repository = createSignalGardenRepository(storage);

    repository.saveSettings({
      reducedMotion: false,
      onboardingCompleted: true,
      themePreference: 'dark',
    });

    expect(storage.getItem('signal-garden/theme-preference/vite/v1')).toBeNull();
    expect(repository.loadSettings()).toEqual({
      reducedMotion: false,
      onboardingCompleted: true,
      themePreference: 'dark',
    });
  });

  it('loads a valid legacy theme preference when the dedicated preference is absent', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'signal-garden/settings/vite/v1',
      JSON.stringify({ reducedMotion: false, onboardingCompleted: true, themePreference: 'dark' })
    );

    expect(createSignalGardenRepository(storage).loadSettings()).toEqual({
      reducedMotion: false,
      onboardingCompleted: true,
      themePreference: 'dark',
    });
  });

  it('migrates a leftover theme key into settings and deletes the leftover', () => {
    const storage = createMemoryStorage();
    storage.setItem('signal-garden/theme-preference/vite/v1', 'light');
    storage.setItem(
      'signal-garden/settings/vite/v1',
      JSON.stringify({ reducedMotion: false, onboardingCompleted: true, themePreference: 'dark' })
    );

    const repository = createSignalGardenRepository(storage);
    expect(repository.loadSettings()).toEqual({
      reducedMotion: false,
      onboardingCompleted: true,
      themePreference: 'light',
    });
    expect(storage.getItem('signal-garden/theme-preference/vite/v1')).toBeNull();
    expect(JSON.parse(storage.getItem('signal-garden/settings/vite/v1') ?? '{}')).toEqual({
      reducedMotion: false,
      onboardingCompleted: true,
      themePreference: 'light',
    });
  });

  it('falls back to system theme when a persisted theme preference is invalid without resetting other settings', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'signal-garden/settings/vite/v1',
      JSON.stringify({ reducedMotion: false, onboardingCompleted: true, themePreference: 'night' })
    );

    expect(createSignalGardenRepository(storage).loadSettings()).toEqual({
      reducedMotion: false,
      onboardingCompleted: true,
      themePreference: 'system',
    });
  });

  it('ignores an invalid leftover theme key and keeps the settings value', () => {
    const storage = createMemoryStorage();
    storage.setItem('signal-garden/theme-preference/vite/v1', 'night');
    storage.setItem(
      'signal-garden/settings/vite/v1',
      JSON.stringify({ reducedMotion: true, onboardingCompleted: true, themePreference: 'dark' })
    );

    expect(createSignalGardenRepository(storage).loadSettings()).toEqual({
      reducedMotion: true,
      onboardingCompleted: true,
      themePreference: 'dark',
    });
    expect(storage.getItem('signal-garden/theme-preference/vite/v1')).toBeNull();
  });

  it('keeps the leftover theme key when settings cannot be written', () => {
    const values = new Map<string, string>([
      ['signal-garden/theme-preference/vite/v1', 'light'],
      [
        'signal-garden/settings/vite/v1',
        JSON.stringify({
          reducedMotion: false,
          onboardingCompleted: true,
          themePreference: 'dark',
        }),
      ],
    ]);
    const storage: StorageLike = {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem() {
        throw new DOMException('quota', 'QuotaExceededError');
      },
      removeItem(key) {
        values.delete(key);
      },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(createSignalGardenRepository(storage).loadSettings().themePreference).toBe('light');
    expect(storage.getItem('signal-garden/theme-preference/vite/v1')).toBe('light');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
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
