import type { ReflectionSeed, SeedBloomOutcome } from '../../shared/models';
import { growthStageForSeed, type SeedGrowthStage } from './seedGrowth';

export const growthStepLabels = ['Seed', 'Sprout', 'Bud', 'Flower'] as const;

export const bloomOutcomeOptions: Array<{ value: SeedBloomOutcome; label: string }> = [
  { value: 'done', label: 'It happened' },
  { value: 'adapted', label: 'It changed' },
  { value: 'more-care', label: 'It needs more care' },
];

const growthStageIndex: Record<SeedGrowthStage, number> = {
  seed: 0,
  sprout: 1,
  growing: 2,
  mature: 3,
};

export function wateringCountForSeed(seed: ReflectionSeed) {
  return seed.waterings?.length ?? 0;
}

export function growthIndexForSeed(seed: ReflectionSeed) {
  // Legacy seeds may carry waterings without growth points, so the watering
  // count acts as a floor under the domain growth stage.
  const wateringFloor = Math.min(wateringCountForSeed(seed), 2);
  return Math.max(growthStageIndex[growthStageForSeed(seed)], wateringFloor);
}

export function seedStageCopy(seed: ReflectionSeed) {
  const index = growthIndexForSeed(seed);
  if (index === 3) {
    return {
      eyebrow: 'Flower',
      title: 'This seed has bloomed.',
      description: 'The action has become a flower in the garden.',
    };
  }
  if (index === 2) {
    return {
      eyebrow: 'Growing plant',
      title: 'A bud is forming.',
      description: 'One final reflection can decide whether this becomes a flower.',
    };
  }
  if (index === 1) {
    return {
      eyebrow: 'Sprout',
      title: 'The seed has sprouted.',
      description:
        'Water it once more by noticing what changed and choosing the next kind version.',
    };
  }
  return {
    eyebrow: 'Seed',
    title: 'This seed is planted.',
    description: 'Water it with one softened label and one small action.',
  };
}

export function wateringPromptForSeed(seed: ReflectionSeed) {
  if (wateringCountForSeed(seed) >= 1) {
    return {
      label: 'What did you notice after trying this?',
      labelPlaceholder: 'Name what shifted, even if it was small.',
      actionLabel: 'What is the next kind version?',
      actionPlaceholder: seed.tinyAction,
    };
  }

  return {
    label: 'How can this label soften today?',
    labelPlaceholder: `The story "${seed.labelText || seed.tinyAction}" can soften into one passing thought.`,
    actionLabel: 'What small action gives this seed water?',
    actionPlaceholder: seed.tinyAction,
  };
}

export function bloomOutcomeLabel(outcome: SeedBloomOutcome) {
  return bloomOutcomeOptions.find((option) => option.value === outcome)?.label ?? 'It changed';
}

export function isReadyToBloom(seed: ReflectionSeed) {
  return !seed.bloomReflection && wateringCountForSeed(seed) >= 2;
}
