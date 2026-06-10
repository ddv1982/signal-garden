import { describe, expect, it } from 'vitest';
import {
  completeLens,
  createJourneyFromSession,
  createLensProfile,
  createLensSessionDraft,
  createReflectionSeedFromJourney,
  isLensSessionComplete,
  lensOrderForProfile,
} from '../lenses';

describe('lens domain', () => {
  it('orders lenses from the local profile preference', () => {
    expect(lensOrderForProfile(createLensProfile('body', 'body-first')).slice(0, 3)).toEqual([
      'body',
      'emotion',
      'word',
    ]);
    expect(lensOrderForProfile(createLensProfile('images', 'image-first')).slice(0, 2)).toEqual([
      'image',
      'emotion',
    ]);
  });

  it('turns a completed lens session into a seed with archive-compatible fields', () => {
    const profile = createLensProfile('mixed', 'word-first');
    let draft = createLensSessionDraft(profile);

    draft = completeLens(draft, profile, 'I am behind');
    draft = completeLens(draft, profile, 'tight chest');
    draft = completeLens(draft, profile, 'sad, worried');
    draft = completeLens(draft, profile, 'a small gray cloud');
    draft = completeLens(draft, profile, 'awareness is here too');
    draft = completeLens(draft, profile, 'I may need rest');
    draft = completeLens(draft, profile, 'Take one soft pause');

    expect(isLensSessionComplete(draft, profile)).toBe(true);

    const seed = createReflectionSeedFromJourney(createJourneyFromSession(draft, profile));
    expect(seed.unhookedText).toBe('Noticing the story: “I am behind”');
    expect(seed.bodySignals).toEqual(['tight chest']);
    expect(seed.emotions).toEqual(['sad', 'worried']);
    expect(seed.dreams).toEqual(['a small gray cloud']);
    expect(seed.values).toEqual(['I may need rest']);
    expect(seed.tinyAction).toBe('Take one soft pause');
    expect(seed.lensJourney?.responses.observerNote).toBe('awareness is here too');
  });
});
