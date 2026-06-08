import { describe, expect, it } from 'vitest';
import type { ReflectionSeed } from '../../../shared/models';
import {
  availableGardenPlots,
  createGardenFrame,
  createGardenPlots,
  createGardenSeedLayout,
  createLensObjectPlacements,
  firstAvailableGardenPlot,
  gardenPlotPoint,
  lensObjectBounds,
  LENS_RING_ORDER,
  pendingSeedStartPoint,
  resolveGardenSeedPlacement,
  type GardenSeedLayoutItem
} from '../gardenLayout';

describe('createGardenSeedLayout', () => {
  it('returns one layout item per visible seed up to the 50 seed target', () => {
    expect(createGardenSeedLayout(390, 720, 0)).toHaveLength(0);
    expect(createGardenSeedLayout(390, 720, 12)).toHaveLength(12);
    expect(createGardenSeedLayout(390, 720, 50)).toHaveLength(50);
    expect(createGardenSeedLayout(390, 720, 75)).toHaveLength(50);
  });

  it('keeps seed positions within the canvas width', () => {
    const layout = createGardenSeedLayout(320, 680, 50);

    expect(layout.every((item) => item.x >= 20 && item.x <= 300)).toBe(true);
  });

  it('uses smaller scales for older seed bands', () => {
    const layout = createGardenSeedLayout(430, 760, 50);
    const front = layout.filter((item) => item.band === 'front');
    const middle = layout.filter((item) => item.band === 'middle');
    const back = layout.filter((item) => item.band === 'back');

    expect(front).toHaveLength(14);
    expect(middle).toHaveLength(18);
    expect(back).toHaveLength(18);
    expect(front[0].scale).toBeGreaterThan(middle[0].scale);
    expect(middle[0].scale).toBeGreaterThan(back[0].scale);
  });
});

describe('createGardenPlots', () => {
  it('returns stable normalized plot ids for designed planting spots', () => {
    const desktop = createGardenPlots(960, 640);
    const mobile = createGardenPlots(390, 680);

    expect(desktop.map((plot) => plot.id)).toEqual([
      'front-left',
      'front-center',
      'front-right',
      'front-far-right',
      'middle-left',
      'middle-center-left',
      'middle-center',
      'middle-center-right',
      'middle-right',
      'back-left',
      'back-center',
      'back-right'
    ]);
    expect(mobile.map((plot) => plot.id)).toEqual([
      'front-left',
      'front-center',
      'front-right',
      'front-far-right',
      'middle-left',
      'middle-center',
      'middle-right',
      'back-center'
    ]);
    expect(desktop.every((plot) => plot.x > 0 && plot.x < 1 && plot.y > 0 && plot.y < 1)).toBe(true);
  });

  it('projects mobile plots into the visible cropped garden frame', () => {
    const frame = createGardenFrame(390, 758);
    const projectedPlots = createGardenPlots(390, 758).map((plot) => gardenPlotPoint(frame, plot));

    expect(projectedPlots.every((point) => point.x >= 0 && point.x <= frame.width)).toBe(true);
    expect(projectedPlots.every((point) => point.y >= 0 && point.y <= frame.height)).toBe(true);
  });

  it('projects desktop plots into the visible cropped garden frame', () => {
    const frame = createGardenFrame(2048, 900);
    const projectedPlots = createGardenPlots(2048, 900).map((plot) => gardenPlotPoint(frame, plot));

    expect(projectedPlots.every((point) => point.x >= 0 && point.x <= frame.width)).toBe(true);
    expect(projectedPlots.every((point) => point.y >= 0 && point.y <= frame.height)).toBe(true);
  });

  it('keeps designed planting plots out of the main pool water', () => {
    const poolWater = { x: 0.5, y: 0.66, radiusX: 0.22, radiusY: 0.11 };
    const isInsidePool = (plot: { x: number; y: number }) => {
      const dx = (plot.x - poolWater.x) / poolWater.radiusX;
      const dy = (plot.y - poolWater.y) / poolWater.radiusY;

      return dx * dx + dy * dy < 1;
    };

    expect(createGardenPlots(960, 640).filter(isInsidePool)).toEqual([]);
    expect(createGardenPlots(390, 680).filter(isInsidePool)).toEqual([]);
  });

  it('keeps designed planting plots off the central walking path', () => {
    const isOnCentralPath = (plot: { x: number; y: number }) => plot.y > 0.83 && plot.x > 0.34 && plot.x < 0.66;

    expect(createGardenPlots(960, 640).filter(isOnCentralPath)).toEqual([]);
    expect(createGardenPlots(390, 680).filter(isOnCentralPath)).toEqual([]);
  });
});

describe('available garden plots', () => {
  it('prefers a front-right accessible planting plot when it is empty', () => {
    expect(firstAvailableGardenPlot([], 960)?.id).toBe('front-right');
  });

  it('skips occupied plot ids for accessible planting', () => {
    const seeds = [seedWithPlot('front-right'), seedWithPlot('front-center')];

    expect(availableGardenPlots(seeds, 960).map((plot) => plot.id)).not.toContain('front-right');
    expect(firstAvailableGardenPlot(seeds, 960)?.id).toBe('front-left');
  });

  it('uses the mobile plot set below the canvas-width threshold', () => {
    const seeds = [seedWithPlot('front-right'), seedWithPlot('front-center'), seedWithPlot('front-left')];

    expect(availableGardenPlots(seeds, 390).map((plot) => plot.id)).toEqual([
      'front-far-right',
      'middle-left',
      'middle-center',
      'middle-right',
      'back-center'
    ]);
    expect(firstAvailableGardenPlot(seeds, 390)?.id).toBe('front-far-right');
  });

  it('keeps the preferred accessible mobile plot visible after background cropping', () => {
    const frame = createGardenFrame(390, 758);
    const preferredPlot = firstAvailableGardenPlot([], 390);

    expect(preferredPlot?.id).toBe('front-right');

    const point = gardenPlotPoint(frame, preferredPlot!);

    expect(point.x).toBeGreaterThanOrEqual(0);
    expect(point.x).toBeLessThanOrEqual(frame.width);
    expect(point.y).toBeGreaterThanOrEqual(0);
    expect(point.y).toBeLessThanOrEqual(frame.height);
  });

  it('returns null when every designed plot is occupied', () => {
    const seeds = createGardenPlots(960, 640).map((plot) => seedWithPlot(plot.id));

    expect(availableGardenPlots(seeds, 960)).toHaveLength(0);
    expect(firstAvailableGardenPlot(seeds, 960)).toBeNull();
  });
});

describe('pool-centered lens object layout', () => {
  it('projects the desktop lens constellation in journey order', () => {
    const frame = createGardenFrame(2048, 900);
    const placements = createLensObjectPlacements(frame, 'word');

    expect(placements.map((placement) => placement.kind)).toEqual(LENS_RING_ORDER);
  });

  it('keeps desktop lens bounds inside the garden and clear of the right panel safe zone', () => {
    [createGardenFrame(2048, 900), createGardenFrame(1440, 760)].forEach((frame) => {
      const panelSafeLeft = frame.width * 0.7;
      const placements = createLensObjectPlacements(frame, 'word');

      placements.forEach((placement) => {
        const bounds = lensObjectBounds(placement);

        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(panelSafeLeft);
        expect(bounds.top).toBeGreaterThanOrEqual(0);
        expect(bounds.bottom).toBeLessThanOrEqual(frame.height);
      });
    });
  });

  it('keeps the cloud and observer pool from overlapping on desktop', () => {
    [createGardenFrame(2048, 900), createGardenFrame(1440, 760)].forEach((frame) => {
      const placements = createLensObjectPlacements(frame, 'observer');
      const imageBounds = lensObjectBounds(placements.find((placement) => placement.kind === 'image')!);
      const observerBounds = lensObjectBounds(placements.find((placement) => placement.kind === 'observer')!);

      expect(rectsOverlap(imageBounds, observerBounds)).toBe(false);
    });
  });

  it('shows only the active mobile lens and keeps it visible above the panel area', () => {
    [createGardenFrame(390, 758), createGardenFrame(360, 664)].forEach((frame) => {
      LENS_RING_ORDER.forEach((kind) => {
        const placements = createLensObjectPlacements(frame, kind);

        expect(placements.map((placement) => placement.kind)).toEqual([kind]);

        const bounds = lensObjectBounds(placements[0]);

        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(frame.width);
        expect(bounds.top).toBeGreaterThanOrEqual(0);
        expect(bounds.bottom).toBeLessThanOrEqual(frame.height - 144);
      });
    });
  });
});

describe('pending seed layout', () => {
  it('keeps the seed-ready start point visible on mobile planting viewports', () => {
    [createGardenFrame(390, 758), createGardenFrame(360, 664)].forEach((frame) => {
      const point = pendingSeedStartPoint(frame, null);

      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(frame.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(frame.height);
    });
  });

  it('starts the mobile pending seed on the selected soil plot instead of over the pool', () => {
    const frame = createGardenFrame(390, 758);
    const plot = firstAvailableGardenPlot([], 390);
    const point = pendingSeedStartPoint(frame, plot);
    const plotPoint = gardenPlotPoint(frame, plot!);

    expect(point).toEqual(plotPoint);
  });
});

describe('resolveGardenSeedPlacement', () => {
  const fallback: GardenSeedLayoutItem = {
    index: 0,
    x: 100,
    y: 200,
    scale: 0.5,
    depth: 10,
    band: 'front'
  };

  it('uses the responsive plot position before a stored legacy garden position', () => {
    const seed = {
      ...seedWithPlot('front-right'),
      gardenPosition: { x: 0.62, y: 0.8 }
    };
    const placement = resolveGardenSeedPlacement(seed, fallback, 390, 680);

    expect(placement.x).toBeCloseTo(319.8);
    expect(placement.y).toBeCloseTo(353.6);
    expect(placement.scale).toBe(0.72);
    expect(placement.depth).toBe(260);
  });

  it('falls back to stored garden position when the plot id is not in the current plot set', () => {
    const seed = {
      ...seedWithPlot('back-left'),
      gardenPosition: { x: 0.8, y: 0.84 }
    };
    const placement = resolveGardenSeedPlacement(seed, fallback, 390, 680);

    expect(placement.x).toBeCloseTo(312);
    expect(placement.y).toBeCloseTo(571.2);
    expect(placement.scale).toBe(fallback.scale);
    expect(placement.depth).toBe(fallback.depth);
  });
});

function seedWithPlot(gardenPlotId: string): ReflectionSeed {
  return {
    id: `seed-${gardenPlotId}`,
    createdAt: '2026-06-07T12:00:00.000Z',
    emotions: [],
    bodySignals: [],
    values: [],
    dreams: [],
    tinyAction: 'Pause.',
    status: 'planted',
    gardenPlotId,
    visualType: 'seed'
  };
}

function rectsOverlap(
  first: { left: number; right: number; top: number; bottom: number },
  second: { left: number; right: number; top: number; bottom: number }
) {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}
