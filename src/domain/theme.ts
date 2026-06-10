export type ActiveTheme = 'light' | 'dark';
export type ThemePreference = 'system' | ActiveTheme;

export const defaultThemePreference: ThemePreference = 'system';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveActiveTheme(
  preference: ThemePreference,
  systemTheme: ActiveTheme
): ActiveTheme {
  return preference === 'system' ? systemTheme : preference;
}

export function systemThemeFromMatches(matchesDark: boolean): ActiveTheme {
  return matchesDark ? 'dark' : 'light';
}
