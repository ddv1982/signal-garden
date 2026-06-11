import { describe, expect, it } from 'vitest';
import type { ReflectionSeed } from '../../../shared/models';
import { m } from '../../paraglide/messages.js';
import {
  advanceGardenGrowth,
  assignPlotToSeed,
  bloomSeed,
  growthStageForSeed,
  waterSeed,
} from '../seedGrowth';

const seed: ReflectionSeed = {
  id: 'seed-1',
  createdAt: '2026-06-06T12:00:00.000Z',
  emotions: ['calm'],
  bodySignals: [],
  values: ['rest'],
  dreams: [],
  tinyAction: 'Take one pause.',
  status: 'planted',
  visualType: 'flower',
};

describe('seed growth domain', () => {
  it('assigns a chosen garden plot with local growth metadata', () => {
    const planted = assignPlotToSeed(
      seed,
      'front-left',
      { x: 0.2, y: 0.8 },
      '2026-06-07T10:00:00.000Z'
    );

    expect(planted.gardenPlotId).toBe('front-left');
    expect(planted.gardenPosition).toEqual({ x: 0.2, y: 0.8 });
    expect(planted.plantedAt).toBe('2026-06-07T10:00:00.000Z');
    expect(planted.lastGrowthAt).toBe('2026-06-07T10:00:00.000Z');
    expect(planted.growthPoints).toBe(0);
    expect(growthStageForSeed(planted)).toBe('seed');
  });

  it('advances growth through later journeys', () => {
    const planted = assignPlotToSeed(
      seed,
      'front-left',
      { x: 0.2, y: 0.8 },
      '2026-06-07T10:00:00.000Z'
    );
    const [sprouted] = advanceGardenGrowth([planted], '2026-06-07T10:05:00.000Z', 'journey');
    const [blooming] = advanceGardenGrowth([sprouted], '2026-06-07T10:10:00.000Z', 'journey');

    expect(sprouted.status).toBe('sprouted');
    expect(growthStageForSeed(sprouted)).toBe('sprout');
    expect(blooming.status).toBe('growing');
    expect(growthStageForSeed(blooming)).toBe('growing');
  });

  it('advances growth on a later local visit after enough elapsed time', () => {
    const planted = assignPlotToSeed(
      seed,
      'front-left',
      { x: 0.2, y: 0.8 },
      '2026-06-07T10:00:00.000Z'
    );
    const [unchanged] = advanceGardenGrowth([planted], '2026-06-07T20:00:00.000Z');
    const [sprouted] = advanceGardenGrowth([planted], '2026-06-08T05:00:00.000Z');

    expect(unchanged.status).toBe('planted');
    expect(sprouted.status).toBe('sprouted');
  });

  it('waters a planted seed into a sprout and records the watering', () => {
    const planted = assignPlotToSeed(
      seed,
      'front-left',
      { x: 0.2, y: 0.8 },
      '2026-06-07T10:00:00.000Z'
    );
    const watered = waterSeed(
      planted,
      {
        transformedLabel: 'This is a story passing through.',
        kindAction: 'Take one breath.',
      },
      '2026-06-07T10:03:00.000Z'
    );

    expect(watered.status).toBe('sprouted');
    expect(watered.growthPoints).toBe(1);
    expect(watered.lastWateredAt).toBe('2026-06-07T10:03:00.000Z');
    expect(watered.waterings).toHaveLength(1);
    expect(watered.waterings?.[0]).toMatchObject({
      fromLabel: 'Take one pause.',
      transformedLabel: 'This is a story passing through.',
      kindAction: 'Take one breath.',
    });
  });

  it('waters a sprouted seed into a growing bud without blooming', () => {
    const planted = assignPlotToSeed(
      seed,
      'front-left',
      { x: 0.2, y: 0.8 },
      '2026-06-07T10:00:00.000Z'
    );
    const sprouted = waterSeed(
      planted,
      { transformedLabel: 'A passing story.', kindAction: 'Breathe.' },
      '2026-06-07T10:03:00.000Z'
    );
    const growing = waterSeed(
      sprouted,
      { transformedLabel: 'A smaller story.', kindAction: 'Step outside.' },
      '2026-06-07T10:06:00.000Z'
    );

    expect(growing.status).toBe('growing');
    expect(growing.growthPoints).toBe(2);
    expect(growing.visualType).toBe('bud');
    expect(growthStageForSeed(growing)).toBe('growing');
    expect(growing.waterings).toHaveLength(2);
  });

  it('blooms a growing seed into a flower after final reflection', () => {
    const planted = assignPlotToSeed(
      seed,
      'front-left',
      { x: 0.2, y: 0.8 },
      '2026-06-07T10:00:00.000Z'
    );
    const sprouted = waterSeed(
      planted,
      { transformedLabel: 'A passing story.', kindAction: 'Breathe.' },
      '2026-06-07T10:03:00.000Z'
    );
    const growing = waterSeed(
      sprouted,
      { transformedLabel: 'A smaller story.', kindAction: 'Step outside.' },
      '2026-06-07T10:06:00.000Z'
    );
    const flower = bloomSeed(
      growing,
      { outcome: 'adapted', reflection: 'The action became a smaller kinder step.' },
      '2026-06-07T10:09:00.000Z'
    );

    expect(flower.status).toBe('blooming');
    expect(flower.growthPoints).toBe(3);
    expect(flower.visualType).toBe('flower');
    expect(growthStageForSeed(flower)).toBe('mature');
    expect(flower.bloomReflection).toMatchObject({
      outcome: 'adapted',
      reflection: 'The action became a smaller kinder step.',
    });
  });

  it('rejects bloom reflection before two waterings', () => {
    const planted = assignPlotToSeed(
      seed,
      'front-left',
      { x: 0.2, y: 0.8 },
      '2026-06-07T10:00:00.000Z'
    );
    const sprouted = waterSeed(
      planted,
      { transformedLabel: 'A passing story.', kindAction: 'Breathe.' },
      '2026-06-07T10:03:00.000Z'
    );

    expect(() =>
      bloomSeed(
        planted,
        { outcome: 'done', reflection: 'It became a flower.' },
        '2026-06-07T10:06:00.000Z'
      )
    ).toThrow(m.seed_error_bloom_requires_two_waterings());
    expect(() =>
      bloomSeed(
        sprouted,
        { outcome: 'done', reflection: 'It became a flower.' },
        '2026-06-07T10:06:00.000Z'
      )
    ).toThrow(m.seed_error_bloom_requires_two_waterings());
  });

  it('keeps dream-heavy seeds botanical instead of becoming lanterns', () => {
    const dreamSeed = assignPlotToSeed(
      {
        ...seed,
        dreams: ['a small gray cloud'],
        values: ['rest'],
        bodySignals: ['tight chest'],
        emotions: ['sad'],
      },
      'front-left',
      { x: 0.2, y: 0.8 },
      '2026-06-07T10:00:00.000Z'
    );
    const sprouted = waterSeed(
      dreamSeed,
      { transformedLabel: 'A passing story.', kindAction: 'Breathe.' },
      '2026-06-07T10:03:00.000Z'
    );
    const growing = waterSeed(
      sprouted,
      { transformedLabel: 'A smaller story.', kindAction: 'Step outside.' },
      '2026-06-07T10:06:00.000Z'
    );
    const flower = bloomSeed(
      growing,
      { outcome: 'done', reflection: 'This became a flower.' },
      '2026-06-07T10:09:00.000Z'
    );

    expect(sprouted.visualType).toBe('sprout');
    expect(growing.visualType).toBe('bud');
    expect(flower.visualType).toBe('flower');
  });

  it('records water on a blooming seed without growing beyond bloom', () => {
    const blooming = {
      ...seed,
      status: 'blooming' as const,
      growthPoints: 2,
      visualType: 'flower' as const,
    };
    const watered = waterSeed(
      blooming,
      { transformedLabel: 'Already softer.', kindAction: 'Keep resting.' },
      '2026-06-07T10:09:00.000Z'
    );

    expect(watered.status).toBe('blooming');
    expect(watered.growthPoints).toBe(2);
    expect(watered.visualType).toBe('flower');
    expect(watered.waterings).toHaveLength(1);
  });

  it('rejects blank watering text without advancing growth', () => {
    const planted = assignPlotToSeed(
      seed,
      'front-left',
      { x: 0.2, y: 0.8 },
      '2026-06-07T10:00:00.000Z'
    );

    expect(() =>
      waterSeed(
        planted,
        { transformedLabel: '   ', kindAction: 'Breathe.' },
        '2026-06-07T10:03:00.000Z'
      )
    ).toThrow(m.seed_error_watering_requires_fields());
    expect(() =>
      waterSeed(
        planted,
        { transformedLabel: 'A passing story.', kindAction: '   ' },
        '2026-06-07T10:03:00.000Z'
      )
    ).toThrow(m.seed_error_watering_requires_fields());
    expect(planted.status).toBe('planted');
    expect(planted.waterings).toBeUndefined();
  });
});
