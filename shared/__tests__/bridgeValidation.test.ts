import { describe, expect, it } from 'vitest';
import {
  isGardenState,
  isInnerLensProfile,
  isLensSessionDraft,
  isReflectionSeed,
  parseStoredJson
} from '../bridgeValidation';
import type { GardenState, InnerLensProfile, LensSessionDraft, ReflectionSeed } from '../models';

const seed: ReflectionSeed = {
  id: 'seed-1',
  createdAt: '2026-06-06T12:00:00.000Z',
  emotions: ['sad'],
  bodySignals: ['tight chest'],
  values: ['kindness'],
  dreams: ['rest'],
  tinyAction: 'Take one breath.',
  status: 'planted',
  visualType: 'seed'
};

const seedWithJourney: ReflectionSeed = {
  ...seed,
  gardenPlotId: 'front-left',
  plantedAt: '2026-06-06T12:08:00.000Z',
  lastGrowthAt: '2026-06-06T12:08:00.000Z',
  lastWateredAt: '2026-06-06T12:10:00.000Z',
  growthPoints: 2,
  status: 'growing',
  visualType: 'bud',
  waterings: [
    {
      id: 'watering-1',
      createdAt: '2026-06-06T12:10:00.000Z',
      fromLabel: 'I am noticing the story that I am behind',
      transformedLabel: 'This is one story, not the whole of me.',
      kindAction: 'Take one breath.'
    }
  ],
  bloomReflection: {
    completedAt: '2026-06-06T12:15:00.000Z',
    outcome: 'adapted',
    reflection: 'This became a smaller kind step.'
  },
  lensJourney: {
    completedAt: '2026-06-06T12:05:00.000Z',
    lensOrder: ['word', 'body', 'emotion', 'image', 'observer', 'meaning', 'action'],
    responses: {
      wordLabel: 'I am behind',
      bodySignal: 'tight chest',
      emotion: 'sad',
      innerImage: 'gray cloud',
      observerNote: 'awareness is here',
      alternateMeaning: 'I may need rest',
      tinyAction: 'Take one breath.'
    }
  }
};

const garden: GardenState = {
  seeds: [seed],
  pet: {
    name: 'Pet',
    mood: 'curious',
    unlockedInteractionVariants: ['headButt']
  }
};

const profile: InnerLensProfile = {
  preferredMode: 'body',
  promptOrder: 'body-first',
  completedAt: '2026-06-06T12:00:00.000Z'
};

const draft: LensSessionDraft = {
  currentLens: 'body',
  completedLensIds: ['word'],
  startedAt: '2026-06-06T12:00:00.000Z',
  updatedAt: '2026-06-06T12:05:00.000Z',
  responses: {
    wordLabel: 'I am behind',
    bodySignal: 'tight chest',
    emotion: '',
    innerImage: '',
    observerNote: '',
    alternateMeaning: '',
    tinyAction: ''
  }
};

describe('stored data validation', () => {
  it('accepts current garden, seed, profile, and draft shapes', () => {
    expect(isGardenState(garden)).toBe(true);
    expect(isReflectionSeed(seedWithJourney)).toBe(true);
    expect(isInnerLensProfile(profile)).toBe(true);
    expect(isLensSessionDraft(draft)).toBe(true);
  });

  it('rejects malformed stored data', () => {
    expect(isReflectionSeed({ ...seed, status: 'unknown' })).toBe(false);
    expect(isInnerLensProfile({ ...profile, promptOrder: 'emotion-first' })).toBe(false);
    expect(isLensSessionDraft({ ...draft, currentLens: 'memory' })).toBe(false);
    expect(isGardenState({ ...garden, pet: { ...garden.pet, mood: 'wild' } })).toBe(false);
  });

  it('parses JSON before validation', () => {
    const parsed = parseStoredJson(JSON.stringify(garden));

    expect(isGardenState(parsed)).toBe(true);
  });

  it('accepts older seeds without watering metadata', () => {
    expect(isReflectionSeed(seed)).toBe(true);
  });
});
