import { describe, expect, it } from 'vitest';
import { m } from '../../paraglide/messages.js';
import { friendlySeedDate } from '../dates';

describe('friendlySeedDate', () => {
  const now = new Date('2026-06-11T14:00:00');

  it('labels same-day plantings as today', () => {
    expect(friendlySeedDate('2026-06-11T01:10:00', now)).toBe(m.date_today());
  });

  it('labels the previous day as yesterday', () => {
    expect(friendlySeedDate('2026-06-10T23:59:00', now)).toBe(m.date_yesterday());
  });

  it('counts recent days', () => {
    expect(friendlySeedDate('2026-06-07T10:00:00', now)).toBe(m.date_days_ago({ count: 4 }));
  });

  it('falls back to a month and day within the same year', () => {
    expect(friendlySeedDate('2026-06-01T10:00:00', now)).toMatch(/June 1/);
  });

  it('includes the year for older seeds', () => {
    expect(friendlySeedDate('2025-12-20T10:00:00', now)).toMatch(/December 20, 2025/);
  });

  it('returns an empty string for invalid dates', () => {
    expect(friendlySeedDate('not-a-date', now)).toBe('');
  });
});
