import { describe, expect, it } from 'vitest';
import {
  createGardenAmbientLayout,
  createLensAmbientMotes,
  createPetAmbientLayout,
} from '../gardenEffects';
import { createGardenFrame, visibleGardenPoint } from '../gardenLayout';

describe('createGardenAmbientLayout', () => {
  it('keeps anchored pond effects inside desktop and mobile frames', () => {
    [
      createGardenFrame(390, 758),
      createGardenFrame(1280, 720),
      createGardenFrame(2048, 900),
    ].forEach((frame) => {
      const layout = createGardenAmbientLayout(frame, false);

      layout.pondMotes.forEach((mote) => {
        expect(mote.x - mote.radius).toBeGreaterThanOrEqual(0);
        expect(mote.x + mote.radius).toBeLessThanOrEqual(frame.width);
        expect(mote.y - mote.radius).toBeGreaterThanOrEqual(0);
        expect(mote.y + mote.radius).toBeLessThanOrEqual(frame.height);
      });

      layout.pondShimmers.forEach((shimmer) => {
        expect(shimmer.x - shimmer.width / 2).toBeGreaterThanOrEqual(0);
        expect(shimmer.x + shimmer.width / 2).toBeLessThanOrEqual(frame.width);
        expect(shimmer.y - shimmer.height / 2).toBeGreaterThanOrEqual(0);
        expect(shimmer.y + shimmer.height / 2).toBeLessThanOrEqual(frame.height);
      });
    });
  });

  it('uses richer desktop ambience while keeping compact ambience calmer', () => {
    const mobile = createGardenAmbientLayout(createGardenFrame(390, 758), false);
    const desktop = createGardenAmbientLayout(createGardenFrame(1280, 720), false);

    expect(mobile.compact).toBe(true);
    expect(desktop.compact).toBe(false);
    expect(desktop.pondMotes.length).toBeGreaterThan(mobile.pondMotes.length);
    expect(desktop.pondMotes.length).toBeLessThanOrEqual(7);
    expect(desktop.pondShimmers.length).toBe(3);
    expect(mobile.pondShimmers.length).toBe(2);
  });

  it('reports static ambience when reduced motion is enabled', () => {
    const layout = createGardenAmbientLayout(createGardenFrame(1280, 720), true);

    expect(layout.motion).toBe('still');
    expect(layout.zones).toBe('pond,pet');
  });
});

describe('createPetAmbientLayout', () => {
  it('keeps pet ambience near the resting pet on desktop and mobile', () => {
    [
      { frame: createGardenFrame(390, 758), compact: true, targetHeight: 150 },
      { frame: createGardenFrame(1280, 720), compact: false, targetHeight: 196 },
    ].forEach(({ frame, compact, targetHeight }) => {
      const petPoint = visibleGardenPoint(frame, 0.24, 0.73);
      const layout = createPetAmbientLayout(targetHeight, compact);

      layout.motes.forEach((mote) => {
        expect(petPoint.x + mote.x - mote.radius).toBeGreaterThanOrEqual(0);
        expect(petPoint.x + mote.x + mote.radius).toBeLessThanOrEqual(frame.width);
        expect(petPoint.y + mote.y - mote.radius).toBeGreaterThanOrEqual(0);
        expect(petPoint.y + mote.y + mote.radius).toBeLessThanOrEqual(frame.height);
      });
    });
  });

  it('uses fewer pet motes on compact screens', () => {
    const mobile = createPetAmbientLayout(150, true);
    const desktop = createPetAmbientLayout(196, false);

    expect(desktop.motes.length).toBeGreaterThan(mobile.motes.length);
    expect(desktop.motes.length).toBe(3);
    expect(mobile.motes.length).toBe(2);
  });
});

describe('createLensAmbientMotes', () => {
  it('uses deterministic active-lens mote offsets for compact and desktop layouts', () => {
    const compact = createLensAmbientMotes(108, -38, true);
    const desktop = createLensAmbientMotes(108, -38, false);

    expect(desktop.length).toBe(3);
    expect(compact.length).toBe(2);
    expect(desktop.every((mote) => mote.durationMs > 0 && mote.radius >= 1.1)).toBe(true);
    expect(desktop.map((mote) => mote.x)).toEqual(
      createLensAmbientMotes(108, -38, false).map((mote) => mote.x)
    );
  });
});
