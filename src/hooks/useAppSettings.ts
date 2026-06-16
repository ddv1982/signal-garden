import { useEffect, useLayoutEffect, useState } from 'react';
import { resolveActiveTheme, type ThemePreference } from '../domain/theme';
import type { AppSettings, SignalGardenRepository } from '../persistence/repositories';

export function useAppSettings(repository: SignalGardenRepository, systemTheme: 'dark' | 'light') {
  const [settings, setSettings] = useState<AppSettings>(() => repository.loadSettings());
  const activeTheme = resolveActiveTheme(settings.themePreference, systemTheme);

  useEffect(() => repository.saveSettings(settings), [repository, settings]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.style.colorScheme = activeTheme;
  }, [activeTheme]);

  function setThemePreference(themePreference: ThemePreference) {
    setSettings((current) => ({ ...current, themePreference }));
  }

  function setReducedMotion(reducedMotion: boolean) {
    setSettings((current) => ({ ...current, reducedMotion }));
  }

  function completeOnboarding() {
    setSettings((current) => ({ ...current, onboardingCompleted: true }));
  }

  function resetOnboarding() {
    setSettings((current) => ({ ...current, onboardingCompleted: false }));
  }

  return {
    settings,
    activeTheme,
    setThemePreference,
    setReducedMotion,
    completeOnboarding,
    resetOnboarding,
  };
}
