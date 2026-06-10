import { useSyncExternalStore } from 'react';
import { systemThemeFromMatches, type ActiveTheme } from '../domain/theme';

function readSystemTheme(): ActiveTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return systemThemeFromMatches(window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function subscribeToSystemTheme(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }
  mediaQuery.addListener(onChange);
  return () => mediaQuery.removeListener(onChange);
}

export function useSystemTheme(): ActiveTheme {
  return useSyncExternalStore(subscribeToSystemTheme, readSystemTheme);
}
