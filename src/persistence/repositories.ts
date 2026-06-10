import type {
  GardenState,
  InnerLensProfile,
  LensSessionDraft,
  ReflectionSeed,
} from '../../shared/models';
import {
  isInnerLensProfile,
  isLensSessionDraft,
  isReflectionSeed,
} from '../../shared/bridgeValidation';
import { defaultThemePreference, isThemePreference, type ThemePreference } from '../domain/theme';
import { getBrowserStorage, readJson, writeJson, writeRaw, type StorageLike } from './storage';

const seedKey = 'signal-garden/reflection-seeds/vite/v1';
const settingsKey = 'signal-garden/settings/vite/v1';
const themePreferenceKey = 'signal-garden/theme-preference/vite/v1';
const lensProfileKey = 'signal-garden/inner-lens-profile/vite/v1';
const lensSessionKey = 'signal-garden/lens-session-draft/vite/v1';

export type AppSettings = {
  reducedMotion: boolean;
  onboardingCompleted: boolean;
  themePreference: ThemePreference;
};

const defaultSettings: AppSettings = {
  reducedMotion: false,
  onboardingCompleted: false,
  themePreference: defaultThemePreference,
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
      const settings = sanitizeAppSettings(
        readJson(storage, settingsKey, defaultSettings, isAppSettingsObject)
      );
      const storedThemePreference = readThemePreference(storage);
      return {
        ...settings,
        themePreference: storedThemePreference ?? settings.themePreference,
      };
    },
    saveSettings(settings: AppSettings): void {
      writeJson(storage, settingsKey, settings);
      writeThemePreference(storage, settings.themePreference);
    },
    gardenState(seeds: ReflectionSeed[]): GardenState {
      return {
        seeds,
        pet: {
          name: 'Pet',
          mood: seeds.length > 0 ? 'proud' : 'curious',
          unlockedInteractionVariants: ['headButt'],
        },
      };
    },
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

function isAppSettingsObject(value: unknown): value is Partial<AppSettings> {
  if (!isRecord(value) || typeof value.reducedMotion !== 'boolean') return false;
  if (value.onboardingCompleted === undefined) return true;
  if (typeof value.onboardingCompleted !== 'boolean') return false;
  return value.themePreference === undefined || typeof value.themePreference === 'string';
}

function sanitizeAppSettings(settings: Partial<AppSettings>): AppSettings {
  return {
    reducedMotion: settings.reducedMotion ?? defaultSettings.reducedMotion,
    onboardingCompleted: settings.onboardingCompleted ?? defaultSettings.onboardingCompleted,
    themePreference: isThemePreference(settings.themePreference)
      ? settings.themePreference
      : defaultSettings.themePreference,
  };
}

function readThemePreference(storage: StorageLike | null): ThemePreference | null {
  if (!storage) return null;
  try {
    const rawPreference = storage.getItem(themePreferenceKey);
    if (rawPreference === null) return null;
    return isThemePreference(rawPreference) ? rawPreference : defaultThemePreference;
  } catch {
    return null;
  }
}

function writeThemePreference(storage: StorageLike | null, themePreference: ThemePreference) {
  writeRaw(storage, themePreferenceKey, themePreference);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
