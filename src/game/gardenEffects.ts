import { LENS_POOL_CENTER, visibleGardenPoint, type GardenFrame } from './gardenLayout';

export const GARDEN_EFFECT_COMPACT_WIDTH = 560;

export type AmbientMotion = 'anchored' | 'still';

export type AmbientCircle = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  delayMs: number;
  durationMs: number;
  driftY: number;
};

export type AmbientEllipse = {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
  delayMs: number;
  durationMs: number;
};

export type RelativeAmbientCircle = Omit<AmbientCircle, 'x' | 'y'> & {
  x: number;
  y: number;
};

export type PetAmbientLayout = {
  ground: AmbientEllipse;
  motes: RelativeAmbientCircle[];
};

export type GardenAmbientLayout = {
  compact: boolean;
  motion: AmbientMotion;
  zones: 'pond,pet';
  pondShimmers: AmbientEllipse[];
  pondMotes: AmbientCircle[];
};

const DESKTOP_POND_MOTES = [
  { x: -126, y: -48, radius: 4.8, alpha: 0.24, delayMs: 0, durationMs: 5200, driftY: -18 },
  { x: -84, y: -20, radius: 4.0, alpha: 0.21, delayMs: 420, durationMs: 5600, driftY: -13 },
  { x: -34, y: -58, radius: 5.0, alpha: 0.25, delayMs: 860, durationMs: 6100, driftY: -20 },
  { x: 20, y: -30, radius: 3.9, alpha: 0.22, delayMs: 1260, durationMs: 5400, driftY: -14 },
  { x: 74, y: -14, radius: 4.3, alpha: 0.2, delayMs: 1640, durationMs: 5900, driftY: -16 },
  { x: 122, y: -50, radius: 4.1, alpha: 0.21, delayMs: 2060, durationMs: 5700, driftY: -15 },
  { x: 150, y: -24, radius: 3.6, alpha: 0.18, delayMs: 2480, durationMs: 6200, driftY: -12 },
];

const COMPACT_POND_MOTES = [
  { x: -42, y: -32, radius: 2.2, alpha: 0.13, delayMs: 0, durationMs: 5400, driftY: -10 },
  { x: 8, y: -46, radius: 2.4, alpha: 0.15, delayMs: 720, durationMs: 5900, driftY: -12 },
  { x: 48, y: -22, radius: 2.1, alpha: 0.12, delayMs: 1380, durationMs: 5600, driftY: -9 },
];

const DESKTOP_PET_MOTES = [
  { x: -56, y: -116, radius: 3.2, alpha: 0.2, delayMs: 240, durationMs: 4800, driftY: -12 },
  { x: 46, y: -132, radius: 2.8, alpha: 0.17, delayMs: 980, durationMs: 5300, driftY: -10 },
  { x: 10, y: -156, radius: 2.6, alpha: 0.16, delayMs: 1660, durationMs: 5100, driftY: -11 },
];

const COMPACT_PET_MOTES = [
  { x: -34, y: -112, radius: 1.8, alpha: 0.1, delayMs: 360, durationMs: 5200, driftY: -8 },
  { x: 28, y: -134, radius: 1.6, alpha: 0.09, delayMs: 1180, durationMs: 5600, driftY: -7 },
];

const LENS_MOTES = [
  { x: -0.38, y: -0.2, radius: 0.029, alpha: 0.48, delayMs: 0, durationMs: 2400, driftY: -0.036 },
  { x: 0.3, y: -0.13, radius: 0.024, alpha: 0.4, delayMs: 320, durationMs: 2760, driftY: -0.044 },
  { x: 0.1, y: -0.3, radius: 0.021, alpha: 0.34, delayMs: 680, durationMs: 3120, driftY: -0.052 },
];

export function isCompactGardenFrame(frame: GardenFrame) {
  return frame.width < GARDEN_EFFECT_COMPACT_WIDTH;
}

export function createGardenAmbientLayout(
  frame: GardenFrame,
  reducedMotion: boolean
): GardenAmbientLayout {
  const compact = isCompactGardenFrame(frame);
  const scale = compact ? clamp(frame.scale, 0.78, 1.02) : clamp(frame.scale, 0.86, 1.18);
  const center = visibleGardenPoint(frame, LENS_POOL_CENTER.x, LENS_POOL_CENTER.y);
  const shimmerCount = compact ? 2 : 3;

  return {
    compact,
    motion: reducedMotion ? 'still' : 'anchored',
    zones: 'pond,pet',
    pondShimmers: Array.from({ length: shimmerCount }, (_, index) => ({
      x: center.x + (index - (shimmerCount - 1) / 2) * 34 * scale,
      y: center.y + (compact ? 10 : 14) * scale + index * 2 * scale,
      width: (compact ? 88 : 118) * scale + index * 16 * scale,
      height: (compact ? 20 : 24) * scale + index * 4 * scale,
      alpha: compact ? 0.07 - index * 0.012 : 0.09 - index * 0.014,
      delayMs: index * 520,
      durationMs: 4200 + index * 640,
    })),
    pondMotes: (compact ? COMPACT_POND_MOTES : DESKTOP_POND_MOTES).map((mote) =>
      absoluteCircle(frame, center, mote, scale)
    ),
  };
}

export function createPetAmbientLayout(targetHeight: number, compact: boolean): PetAmbientLayout {
  const scale = clamp(targetHeight / 150, 0.86, compact ? 1.04 : 1.18);
  const motes = (compact ? COMPACT_PET_MOTES : DESKTOP_PET_MOTES).map((mote) => ({
    x: mote.x * scale,
    y: mote.y * scale,
    radius: mote.radius * scale,
    alpha: mote.alpha,
    delayMs: mote.delayMs,
    durationMs: mote.durationMs,
    driftY: mote.driftY * scale,
  }));

  return {
    ground: {
      x: 0,
      y: -4 * scale,
      width: targetHeight * 0.76,
      height: targetHeight * 0.13,
      alpha: compact ? 0.05 : 0.065,
      delayMs: 0,
      durationMs: 4600,
    },
    motes,
  };
}

export function createLensAmbientMotes(
  size: number,
  glowY: number,
  compact: boolean
): RelativeAmbientCircle[] {
  const count = compact ? 2 : 3;

  return LENS_MOTES.slice(0, count).map((mote) => ({
    x: size * mote.x,
    y: glowY + size * mote.y,
    radius: Math.max(1.1, size * mote.radius * (compact ? 0.72 : 1)),
    alpha: compact ? mote.alpha * 0.42 : mote.alpha,
    delayMs: mote.delayMs,
    durationMs: mote.durationMs,
    driftY: size * mote.driftY,
  }));
}

function absoluteCircle(
  frame: GardenFrame,
  center: { x: number; y: number },
  mote: (typeof DESKTOP_POND_MOTES)[number],
  scale: number
): AmbientCircle {
  const radius = mote.radius * scale;

  return {
    x: clamp(center.x + mote.x * scale, radius + 4, frame.width - radius - 4),
    y: clamp(center.y + mote.y * scale, radius + 4, frame.height - radius - 4),
    radius,
    alpha: mote.alpha,
    delayMs: mote.delayMs,
    durationMs: mote.durationMs,
    driftY: mote.driftY * scale,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
