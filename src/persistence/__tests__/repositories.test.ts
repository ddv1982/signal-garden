import { describe, expect, it } from 'vitest';
import { createLensProfile, createLensSessionDraft } from '../../domain/lenses';
import { createSignalGardenRepository } from '../repositories';
import type { StorageLike } from '../storage';
import type { ReflectionSeed } from '../../../shared/models';

describe('createSignalGardenRepository', () => {
  it('saves and loads seeds from a storage-like object', () => {
    const storage = createMemoryStorage();
    const repository = createSignalGardenRepository(storage);
    const seed: ReflectionSeed = {
      id: 'seed-1',
      createdAt: '2026-06-06T12:00:00.000Z',
      labelText: 'I am too late',
      emotions: [],
      bodySignals: [],
      values: [],
      dreams: [],
      tinyAction: 'Offer myself one small kind pause.',
      status: 'planted',
      visualType: 'seed'
    };

    repository.saveSeeds([seed]);

    expect(repository.loadSeeds()).toEqual([seed]);
  });

  it('falls back when stored seed data is invalid', () => {
    const storage = createMemoryStorage();
    storage.setItem('signal-garden/reflection-seeds/vite/v1', '{"broken":true}');

    expect(createSignalGardenRepository(storage).loadSeeds()).toEqual([]);
  });

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

  it('saves, loads, and clears an unfinished lens session', () => {
    const storage = createMemoryStorage();
    const repository = createSignalGardenRepository(storage);
    const draft = createLensSessionDraft(createLensProfile('images', 'image-first'));

    repository.saveLensSessionDraft(draft);
    expect(repository.loadLensSessionDraft()).toEqual(draft);

    repository.clearLensSessionDraft();
    expect(repository.loadLensSessionDraft()).toBeNull();
  });

  it('loads older settings without onboarding state', () => {
    const storage = createMemoryStorage();
    storage.setItem('signal-garden/settings/vite/v1', JSON.stringify({ reducedMotion: true }));

    expect(createSignalGardenRepository(storage).loadSettings()).toEqual({
      reducedMotion: true,
      onboardingCompleted: false
    });
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
    }
  };
}
