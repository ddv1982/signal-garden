import type { ReflectionSeed, SeedStatus } from '../../shared/models';
import { friendlySeedDate } from './dates';

export function seedStatusLabel(status: SeedStatus): string {
  switch (status) {
    case 'planted':
      return 'Planted';
    case 'sprouted':
      return 'Sprouted';
    case 'growing':
      return 'Growing';
    case 'blooming':
      return 'Blooming';
    case 'resting':
      return 'Resting';
  }
}

export function seedCardAccessibilityLabel(seed: ReflectionSeed): string {
  const date = friendlySeedDate(seed.createdAt);
  const status = seedStatusLabel(seed.status);
  const primaryText = seed.unhookedText || seed.labelText || seed.tinyAction;
  const wateringCount = seed.waterings?.length ?? 0;
  const wateringText =
    wateringCount === 0
      ? 'Not watered yet.'
      : `Watered ${wateringCount} ${wateringCount === 1 ? 'time' : 'times'}.`;

  return `Open ${status.toLowerCase()} seed planted ${date}. ${wateringText} ${primaryText}`;
}

export function gardenAccessibilityLabel(seedCount: number): string {
  if (seedCount === 0)
    return 'Dream Garden. No seeds planted yet. Your pet is resting in the garden.';

  const visibleCount = Math.min(seedCount, 50);
  const hiddenCount = Math.max(seedCount - visibleCount, 0);
  const seedWord = visibleCount === 1 ? 'seed' : 'seeds';

  if (hiddenCount === 0) {
    return `Dream Garden. ${visibleCount} ${seedWord} visible. Tap your pet for a gentle head-butt or tap a seed to open it.`;
  }

  return `Dream Garden. ${visibleCount} seeds visible and ${hiddenCount} older saved. Tap your pet for a gentle head-butt or tap a seed to open it.`;
}
