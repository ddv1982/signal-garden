import type { GardenState, InnerLensProfile, LensSessionDraft, ReflectionSeed } from '../../shared/models';
import { isInnerLensProfile, isLensSessionDraft, isReflectionSeed } from '../../shared/bridgeValidation';
import { getBrowserStorage, readJson, writeJson, type StorageLike } from './storage';

const seedKey = 'signal-garden/reflection-seeds/vite/v1';
const settingsKey = 'signal-garden/settings/vite/v1';
const lensProfileKey = 'signal-garden/inner-lens-profile/vite/v1';
const lensSessionKey = 'signal-garden/lens-session-draft/vite/v1';

export type AppSettings = {
  reducedMotion: boolean;
  onboardingCompleted: boolean;
};

const defaultSettings: AppSettings = {
  reducedMotion: false,
  onboardingCompleted: false
};

export function createSignalGardenRepository(storage: StorageLike | null = getBrowserStorage()) {
  return {
    loadSeeds(): ReflectionSeed[] {
      return readJson(storage, seedKey, [], isSeedArray);
    },
    saveSeeds(seeds: ReflectionSeed[]): void {
      writeJson(storage, seedKey, seeds);
    },
    clearSeeds(): void {
      storage?.removeItem(seedKey);
    },
    loadLensProfile(): InnerLensProfile | null {
      const profile = readJson(storage, lensProfileKey, null, isNullableInnerLensProfile);
      return profile && profile.completedAt ? profile : null;
    },
    saveLensProfile(profile: InnerLensProfile): void {
      writeJson(storage, lensProfileKey, profile);
    },
    clearLensProfile(): void {
      storage?.removeItem(lensProfileKey);
    },
    loadLensSessionDraft(): LensSessionDraft | null {
      return readJson(storage, lensSessionKey, null, isNullableLensSessionDraft);
    },
    saveLensSessionDraft(draft: LensSessionDraft): void {
      writeJson(storage, lensSessionKey, draft);
    },
    clearLensSessionDraft(): void {
      storage?.removeItem(lensSessionKey);
    },
    loadSettings(): AppSettings {
      return { ...defaultSettings, ...readJson(storage, settingsKey, defaultSettings, isAppSettings) };
    },
    saveSettings(settings: AppSettings): void {
      writeJson(storage, settingsKey, settings);
    },
    gardenState(seeds: ReflectionSeed[]): GardenState {
      return {
        seeds,
        pet: {
          name: 'Pet',
          mood: seeds.length > 0 ? 'proud' : 'curious',
          unlockedInteractionVariants: ['headButt']
        }
      };
    }
  };
}

function isSeedArray(value: unknown): value is ReflectionSeed[] {
  return Array.isArray(value) && value.every(isReflectionSeed);
}

function isNullableInnerLensProfile(value: unknown): value is InnerLensProfile | null {
  return value === null || isInnerLensProfile(value);
}

function isNullableLensSessionDraft(value: unknown): value is LensSessionDraft | null {
  return value === null || isLensSessionDraft(value);
}

function isAppSettings(value: unknown): value is AppSettings {
  if (!isRecord(value) || typeof value.reducedMotion !== 'boolean') return false;
  if (value.onboardingCompleted === undefined) return true;
  return typeof value.onboardingCompleted === 'boolean';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
