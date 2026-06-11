import type { ReflectionSeed, SeedBloomOutcome } from '../../shared/models';
import { m } from '../paraglide/messages.js';
import { growthStageForSeed, type SeedGrowthStage } from './seedGrowth';

export const growthStepLabels = [
  m.seed_growth_step_seed(),
  m.seed_growth_step_sprout(),
  m.seed_growth_step_bud(),
  m.seed_growth_step_flower(),
] as const;

export const bloomOutcomeOptions: Array<{ value: SeedBloomOutcome; label: string }> = [
  { value: 'done', label: m.seed_bloom_outcome_done() },
  { value: 'adapted', label: m.seed_bloom_outcome_adapted() },
  { value: 'more-care', label: m.seed_bloom_outcome_more_care() },
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
      eyebrow: m.seed_stage_flower_eyebrow(),
      title: m.seed_stage_flower_title(),
      description: m.seed_stage_flower_description(),
    };
  }
  if (index === 2) {
    return {
      eyebrow: m.seed_stage_growing_eyebrow(),
      title: m.seed_stage_growing_title(),
      description: m.seed_stage_growing_description(),
    };
  }
  if (index === 1) {
    return {
      eyebrow: m.seed_stage_sprout_eyebrow(),
      title: m.seed_stage_sprout_title(),
      description: m.seed_stage_sprout_description(),
    };
  }
  return {
    eyebrow: m.seed_stage_seed_eyebrow(),
    title: m.seed_stage_seed_title(),
    description: m.seed_stage_seed_description(),
  };
}

export function wateringPromptForSeed(seed: ReflectionSeed) {
  if (wateringCountForSeed(seed) >= 1) {
    return {
      label: m.seed_prompt_after_label(),
      labelPlaceholder: m.seed_prompt_after_placeholder(),
      actionLabel: m.seed_prompt_next_action(),
      actionPlaceholder: seed.tinyAction,
    };
  }

  return {
    label: m.seed_prompt_first_label(),
    labelPlaceholder: m.seed_prompt_first_placeholder({
      text: seed.labelText || seed.tinyAction,
    }),
    actionLabel: m.seed_prompt_first_action(),
    actionPlaceholder: seed.tinyAction,
  };
}

export function bloomOutcomeLabel(outcome: SeedBloomOutcome) {
  return (
    bloomOutcomeOptions.find((option) => option.value === outcome)?.label ??
    m.seed_bloom_outcome_adapted()
  );
}

export function isReadyToBloom(seed: ReflectionSeed) {
  return !seed.bloomReflection && wateringCountForSeed(seed) >= 2;
}
