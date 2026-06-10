import { describe, expect, it } from 'vitest';
import { isThemePreference, resolveActiveTheme, systemThemeFromMatches } from '../theme';

describe('theme domain', () => {
  it('resolves system preferences from the current system theme', () => {
    expect(resolveActiveTheme('system', 'dark')).toBe('dark');
    expect(resolveActiveTheme('system', 'light')).toBe('light');
  });

  it('lets manual preferences override the system theme', () => {
    expect(resolveActiveTheme('light', 'dark')).toBe('light');
    expect(resolveActiveTheme('dark', 'light')).toBe('dark');
  });

  it('validates persisted preference values', () => {
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('night')).toBe(false);
  });

  it('maps media query matches to the active theme', () => {
    expect(systemThemeFromMatches(true)).toBe('dark');
    expect(systemThemeFromMatches(false)).toBe('light');
  });
});
