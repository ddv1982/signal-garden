import { describe, expect, it } from 'vitest';
import type { ReflectionSeed } from '../../../shared/models';
import {
  bloomOutcomeLabel,
  growthIndexForSeed,
  isReadyToBloom,
  seedStageCopy,
  wateringCountForSeed,
  wateringPromptForSeed,
} from '../seedDisplay';

function makeSeed(overrides: Partial<ReflectionSeed> = {}): ReflectionSeed {
  return {
    id: 'seed-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    labelText: 'I always mess things up',
    emotions: [],
    bodySignals: [],
    values: [],
    dreams: [],
    tinyAction: 'Send one kind message',
    status: 'planted',
    visualType: 'seed',
    ...overrides,
  };
}

function makeWatering(id: string) {
  return {
    id,
    createdAt: '2026-01-02T00:00:00.000Z',
    fromLabel: 'label',
    transformedLabel: 'softer label',
    kindAction: 'small action',
  };
}

describe('growthIndexForSeed', () => {
  it('returns 0 for a freshly planted seed', () => {
    expect(growthIndexForSeed(makeSeed())).toBe(0);
  });

  it('follows seed status when there are no waterings', () => {
    expect(growthIndexForSeed(makeSeed({ status: 'sprouted', growthPoints: 1 }))).toBe(1);
    expect(growthIndexForSeed(makeSeed({ status: 'growing', growthPoints: 2 }))).toBe(2);
    expect(growthIndexForSeed(makeSeed({ status: 'blooming', growthPoints: 3 }))).toBe(3);
  });

  it('uses watering count as a floor for legacy seeds without growth points', () => {
    expect(growthIndexForSeed(makeSeed({ waterings: [makeWatering('w1')] }))).toBe(1);
    expect(
      growthIndexForSeed(makeSeed({ waterings: [makeWatering('w1'), makeWatering('w2')] }))
    ).toBe(2);
  });

  it('treats a bloom reflection as fully grown', () => {
    const seed = makeSeed({
      bloomReflection: {
        completedAt: '2026-01-03T00:00:00.000Z',
        outcome: 'done',
        reflection: 'It grew.',
      },
    });
    expect(growthIndexForSeed(seed)).toBe(3);
  });
});

describe('seedStageCopy', () => {
  it('describes each growth stage', () => {
    expect(seedStageCopy(makeSeed()).eyebrow).toBe('Seed');
    expect(seedStageCopy(makeSeed({ status: 'sprouted', growthPoints: 1 })).eyebrow).toBe('Sprout');
    expect(seedStageCopy(makeSeed({ status: 'growing', growthPoints: 2 })).eyebrow).toBe(
      'Growing plant'
    );
    expect(seedStageCopy(makeSeed({ status: 'blooming', growthPoints: 3 })).eyebrow).toBe('Flower');
  });
});

describe('wateringPromptForSeed', () => {
  it('prompts for a softened label before the first watering', () => {
    const prompt = wateringPromptForSeed(makeSeed());
    expect(prompt.label).toBe('How can this label soften today?');
    expect(prompt.labelPlaceholder).toContain('I always mess things up');
    expect(prompt.actionPlaceholder).toBe('Send one kind message');
  });

  it('prompts for what changed after a watering', () => {
    const prompt = wateringPromptForSeed(makeSeed({ waterings: [makeWatering('w1')] }));
    expect(prompt.label).toBe('What did you notice after trying this?');
  });
});

describe('isReadyToBloom', () => {
  it('requires two waterings and no existing bloom', () => {
    expect(isReadyToBloom(makeSeed())).toBe(false);
    expect(isReadyToBloom(makeSeed({ waterings: [makeWatering('w1')] }))).toBe(false);
    expect(isReadyToBloom(makeSeed({ waterings: [makeWatering('w1'), makeWatering('w2')] }))).toBe(
      true
    );
    expect(
      isReadyToBloom(
        makeSeed({
          waterings: [makeWatering('w1'), makeWatering('w2')],
          bloomReflection: {
            completedAt: '2026-01-03T00:00:00.000Z',
            outcome: 'done',
            reflection: 'It grew.',
          },
        })
      )
    ).toBe(false);
  });
});

describe('wateringCountForSeed', () => {
  it('counts waterings defensively', () => {
    expect(wateringCountForSeed(makeSeed())).toBe(0);
    expect(wateringCountForSeed(makeSeed({ waterings: [makeWatering('w1')] }))).toBe(1);
  });
});

describe('bloomOutcomeLabel', () => {
  it('maps outcomes to display labels', () => {
    expect(bloomOutcomeLabel('done')).toBe('It happened');
    expect(bloomOutcomeLabel('adapted')).toBe('It changed');
    expect(bloomOutcomeLabel('more-care')).toBe('It needs more care');
  });
});
