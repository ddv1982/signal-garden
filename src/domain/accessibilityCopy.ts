import type { ReflectionSeed, SeedStatus } from '../../shared/models';
import { m } from '../paraglide/messages.js';
import { friendlySeedDate } from './dates';

export function seedStatusLabel(status: SeedStatus): string {
  switch (status) {
    case 'planted':
      return m.seed_status_planted();
    case 'sprouted':
      return m.seed_status_sprouted();
    case 'growing':
      return m.seed_status_growing();
    case 'blooming':
      return m.seed_status_blooming();
    case 'resting':
      return m.seed_status_resting();
  }
}

function seedStatusLowerLabel(status: SeedStatus): string {
  switch (status) {
    case 'planted':
      return m.seed_status_planted_lower();
    case 'sprouted':
      return m.seed_status_sprouted_lower();
    case 'growing':
      return m.seed_status_growing_lower();
    case 'blooming':
      return m.seed_status_blooming_lower();
    case 'resting':
      return m.seed_status_resting_lower();
  }
}

export function seedCardAccessibilityLabel(seed: ReflectionSeed): string {
  const date = friendlySeedDate(seed.createdAt);
  const status = seedStatusLowerLabel(seed.status);
  const primaryText = seed.unhookedText || seed.labelText || seed.tinyAction;
  const wateringCount = seed.waterings?.length ?? 0;
  const wateringText =
    wateringCount === 0
      ? m.seed_watered_not_yet()
      : wateringCount === 1
        ? m.seed_watered_once({ count: wateringCount })
        : m.seed_watered_many({ count: wateringCount });

  return m.seed_card_accessibility({ status, date, wateringText, primaryText });
}

export function gardenAccessibilityLabel(seedCount: number): string {
  if (seedCount === 0) return m.garden_accessibility_empty();

  const visibleCount = Math.min(seedCount, 50);
  const hiddenCount = Math.max(seedCount - visibleCount, 0);
  if (hiddenCount === 0) {
    return visibleCount === 1
      ? m.garden_accessibility_visible_one({ visibleCount })
      : m.garden_accessibility_visible_many({ visibleCount });
  }

  return m.garden_accessibility_hidden({ visibleCount, hiddenCount });
}
