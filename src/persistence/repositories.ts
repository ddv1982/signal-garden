import { createReflectionStore, type ReflectionLock } from './reflections';
import type { InnerLensProfile } from '../../shared/models';
import { isInnerLensProfile } from '../../shared/bridgeValidation';
import { defaultThemePreference, isThemePreference, type ThemePreference } from '../domain/theme';
import { getBrowserStorage, readJson, writeJson, type StorageLike } from './storage';

const settingsKey = 'signal-garden/settings/vite/v1';
const themePreferenceKey = 'signal-garden/theme-preference/vite/v1';
const lensProfileKey = 'signal-garden/inner-lens-profile/vite/v1';

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

export function createSignalGardenRepository(
  storage: StorageLike | null = getBrowserStorage(),
  lock?: ReflectionLock
) {
  return {
    reflections: createReflectionStore(storage, lock),
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
    loadSettings(): AppSettings {
      const settings = sanitizeAppSettings(
        readJson(storage, settingsKey, defaultSettings, isAppSettingsObject)
      );
      const leftoverTheme = readLeftoverThemePreference(storage);
      const resolved = {
        ...settings,
        themePreference: leftoverTheme.value ?? settings.themePreference,
      };
      if (leftoverTheme.present && writeJson(storage, settingsKey, resolved)) {
        storage?.removeItem(themePreferenceKey);
      }
      return resolved;
    },
    saveSettings(settings: AppSettings): void {
      if (writeJson(storage, settingsKey, settings)) {
        storage?.removeItem(themePreferenceKey);
      }
    },
  };
}

export type SignalGardenRepository = ReturnType<typeof createSignalGardenRepository>;

function isNullableInnerLensProfile(value: unknown): value is InnerLensProfile | null {
  return value === null || isInnerLensProfile(value);
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

function readLeftoverThemePreference(storage: StorageLike | null): {
  present: boolean;
  value: ThemePreference | null;
} {
  if (!storage) return { present: false, value: null };
  try {
    const rawPreference = storage.getItem(themePreferenceKey);
    if (rawPreference === null) return { present: false, value: null };
    return {
      present: true,
      value: isThemePreference(rawPreference) ? rawPreference : null,
    };
  } catch {
    return { present: false, value: null };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
