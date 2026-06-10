import type { GardenPlot, LensKind, ReflectionSeed } from '../../shared/models';

export type GardenSeedLayoutItem = {
  index: number;
  x: number;
  y: number;
  scale: number;
  depth: number;
  band: 'front' | 'middle' | 'back';
};

export type GardenSeedPlacement = {
  x: number;
  y: number;
  scale: number;
  depth: number;
};

export type GardenFrame = {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  visibleX: number;
  visibleY: number;
  visibleWidth: number;
  visibleHeight: number;
};

export type LensPropAnchor = 'center' | 'bottom' | 'ground';

export type LensObjectPlacement = {
  kind: LensKind;
  x: number;
  y: number;
  size: number;
  displayWidth: number;
  displayHeight: number;
  shadowY: number;
  shadowWidth: number;
  shadowHeight: number;
  shadowAlpha: number;
  anchor: LensPropAnchor;
};

export type LensObjectBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type CircleHitTarget = {
  x: number;
  y: number;
  radius: number;
};

export type EllipseHitTarget = {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
};

const MAX_VISIBLE_SEEDS = 50;
export const GARDEN_DESIGN_WIDTH = 1480;
export const GARDEN_DESIGN_HEIGHT = 484;
export const LENS_POOL_CENTER = { x: 0.49, y: 0.66 };
export const LENS_RING_ORDER: LensKind[] = ['word', 'body', 'emotion', 'image', 'observer', 'meaning', 'action'];
export const PET_INTERACTION_OFFSET = { x: 0, y: -92 };
export const PET_INTERACTION_SIZE = { width: 178, height: 226 };
const MOBILE_LENS_PANEL_SAFE_HEIGHT = 144;
const MOBILE_LENS_SAFE_GAP = 8;

const PREFERRED_PLOT_IDS = ['front-right', 'front-center', 'front-left', 'front-far-right'];

const LENS_PROP_RATIOS: Record<LensKind, { width: number; height: number }> = {
  word: scaledRatio(335, 247),
  body: scaledRatio(364, 243),
  emotion: scaledRatio(289, 274),
  image: scaledRatio(374, 253),
  observer: scaledRatio(376, 261),
  meaning: scaledRatio(340, 295),
  action: scaledRatio(347, 272)
};

const LENS_RING: Array<{
  kind: LensKind;
  angle: number;
  radiusX: number;
  radiusY: number;
  size: number;
  shadowY: number;
  shadowWidth: number;
  shadowHeight: number;
  shadowAlpha: number;
  anchor: LensPropAnchor;
}> = [
  { kind: 'word', angle: 214, radiusX: 0.18, radiusY: 0.18, size: 104, shadowY: 20, shadowWidth: 88, shadowHeight: 22, shadowAlpha: 0.14, anchor: 'bottom' },
  { kind: 'body', angle: 236, radiusX: 0.12, radiusY: 0.15, size: 108, shadowY: 26, shadowWidth: 98, shadowHeight: 20, shadowAlpha: 0.1, anchor: 'center' },
  { kind: 'emotion', angle: 282, radiusX: 0.14, radiusY: 0.13, size: 108, shadowY: 23, shadowWidth: 74, shadowHeight: 22, shadowAlpha: 0.14, anchor: 'bottom' },
  { kind: 'image', angle: 322, radiusX: 0.16, radiusY: 0.13, size: 116, shadowY: 24, shadowWidth: 98, shadowHeight: 22, shadowAlpha: 0.11, anchor: 'bottom' },
  { kind: 'observer', angle: 8, radiusX: 0.17, radiusY: 0.14, size: 92, shadowY: 22, shadowWidth: 84, shadowHeight: 18, shadowAlpha: 0.1, anchor: 'bottom' },
  { kind: 'meaning', angle: 76, radiusX: 0.14, radiusY: 0.17, size: 120, shadowY: 26, shadowWidth: 84, shadowHeight: 22, shadowAlpha: 0.13, anchor: 'bottom' },
  { kind: 'action', angle: 136, radiusX: 0.15, radiusY: 0.18, size: 108, shadowY: 24, shadowWidth: 84, shadowHeight: 22, shadowAlpha: 0.14, anchor: 'bottom' }
];

const DESKTOP_PLOTS: GardenPlot[] = [
  { id: 'front-left', x: 0.17, y: 0.72, band: 'front', scale: 1, depth: 330 },
  { id: 'front-center', x: 0.28, y: 0.76, band: 'front', scale: 1.02, depth: 342 },
  { id: 'front-right', x: 0.72, y: 0.75, band: 'front', scale: 1, depth: 340 },
  { id: 'front-far-right', x: 0.84, y: 0.72, band: 'front', scale: 0.96, depth: 350 },
  { id: 'middle-left', x: 0.2, y: 0.64, band: 'middle', scale: 0.78, depth: 230 },
  { id: 'middle-center-left', x: 0.32, y: 0.58, band: 'middle', scale: 0.76, depth: 235 },
  { id: 'middle-center', x: 0.44, y: 0.54, band: 'middle', scale: 0.72, depth: 238 },
  { id: 'middle-center-right', x: 0.6, y: 0.56, band: 'middle', scale: 0.72, depth: 240 },
  { id: 'middle-right', x: 0.75, y: 0.64, band: 'middle', scale: 0.78, depth: 250 },
  { id: 'back-left', x: 0.3, y: 0.52, band: 'back', scale: 0.6, depth: 130 },
  { id: 'back-center', x: 0.5, y: 0.52, band: 'back', scale: 0.58, depth: 134 },
  { id: 'back-right', x: 0.68, y: 0.52, band: 'back', scale: 0.6, depth: 140 }
];

const MOBILE_PLOTS: GardenPlot[] = [
  { id: 'front-left', x: 0.16, y: 0.55, band: 'front', scale: 0.72, depth: 250 },
  { id: 'front-center', x: 0.32, y: 0.5, band: 'front', scale: 0.68, depth: 245 },
  { id: 'front-right', x: 0.82, y: 0.52, band: 'front', scale: 0.72, depth: 260 },
  { id: 'front-far-right', x: 0.9, y: 0.56, band: 'front', scale: 0.66, depth: 270 },
  { id: 'middle-left', x: 0.22, y: 0.48, band: 'middle', scale: 0.58, depth: 205 },
  { id: 'middle-center', x: 0.48, y: 0.49, band: 'middle', scale: 0.58, depth: 205 },
  { id: 'middle-right', x: 0.68, y: 0.5, band: 'middle', scale: 0.58, depth: 215 },
  { id: 'back-center', x: 0.78, y: 0.47, band: 'back', scale: 0.54, depth: 180 }
];

export function createGardenPlots(width: number, _height: number): GardenPlot[] {
  const plots = width < 540 ? MOBILE_PLOTS : DESKTOP_PLOTS;
  return plots.map((plot) => ({ ...plot }));
}

export function availableGardenPlots(seeds: ReflectionSeed[], width: number): GardenPlot[] {
  const occupied = new Set(seeds.map((seed) => seed.gardenPlotId).filter(Boolean));
  return createGardenPlots(width, 0).filter((plot) => !occupied.has(plot.id));
}

export function firstAvailableGardenPlot(seeds: ReflectionSeed[], width: number): GardenPlot | null {
  const available = availableGardenPlots(seeds, width);
  return PREFERRED_PLOT_IDS.map((id) => available.find((plot) => plot.id === id)).find(Boolean) ?? available[0] ?? null;
}

export function createGardenFrame(width: number, height: number): GardenFrame {
  const scale = Math.max(width / GARDEN_DESIGN_WIDTH, height / GARDEN_DESIGN_HEIGHT);
  const scaledWidth = GARDEN_DESIGN_WIDTH * scale;
  const scaledHeight = GARDEN_DESIGN_HEIGHT * scale;
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;

  return {
    width,
    height,
    scale,
    offsetX,
    offsetY,
    visibleX: Math.max(0, -offsetX / scale),
    visibleY: Math.max(0, -offsetY / scale),
    visibleWidth: Math.min(GARDEN_DESIGN_WIDTH, width / scale),
    visibleHeight: Math.min(GARDEN_DESIGN_HEIGHT, height / scale)
  };
}

export function gardenPoint(frame: GardenFrame, x: number, y: number) {
  return {
    x: frame.offsetX + x * frame.scale,
    y: frame.offsetY + y * frame.scale
  };
}

export function gardenNormalizedPoint(frame: GardenFrame, x: number, y: number) {
  return gardenPoint(frame, x * GARDEN_DESIGN_WIDTH, y * GARDEN_DESIGN_HEIGHT);
}

export function visibleGardenPoint(frame: GardenFrame, x: number, y: number) {
  return gardenPoint(frame, frame.visibleX + frame.visibleWidth * x, frame.visibleY + frame.visibleHeight * y);
}

export function gardenPlotPoint(frame: GardenFrame, plot: GardenPlot) {
  return visibleGardenPoint(frame, plot.x, plot.y);
}

export function createLensObjectPlacements(frame: GardenFrame, currentLens: LensKind | null): LensObjectPlacement[] {
  const compact = frame.width < 560;
  // Step-by-step reveal: only the current lens prop is placed. Passing null returns
  // the full ring (used for layout audits and tests).
  const source = currentLens ? LENS_RING.filter((placement) => placement.kind === currentLens) : LENS_RING;

  return source.map((placement) => {
    const point = compact && placement.kind === 'observer'
      ? visibleGardenPoint(frame, 0.68, 0.58)
      : lensRingPoint(
          frame,
          placement.angle,
          compact ? placement.radiusX * 0.62 : placement.radiusX,
          compact ? placement.radiusY * 0.58 : placement.radiusY
        );
    const size = lensObjectSize(frame, placement.size, compact);
    const clamped = compact ? clampLensPointForMobile(frame, point, size, placement.anchor) : point;

    const lensPlacement = {
      kind: placement.kind,
      x: clamped.x,
      y: clamped.y,
      size,
      displayWidth: size * LENS_PROP_RATIOS[placement.kind].width,
      displayHeight: size * LENS_PROP_RATIOS[placement.kind].height,
      shadowY: placement.shadowY,
      shadowWidth: compact ? Math.min(placement.shadowWidth, 92) : placement.shadowWidth,
      shadowHeight: compact ? Math.min(placement.shadowHeight, 22) : placement.shadowHeight,
      shadowAlpha: placement.shadowAlpha,
      anchor: placement.anchor
    };

    return compact ? separateLensPlacementFromMobilePet(frame, lensPlacement) : lensPlacement;
  });
}

export function lensObjectBounds(placement: LensObjectPlacement): LensObjectBounds {
  const halfWidth = placement.displayWidth / 2;
  const halfHeight = placement.displayHeight / 2;
  const top = placement.anchor === 'center' ? placement.y - halfHeight : placement.y - placement.displayHeight;
  const bottom = placement.anchor === 'center' ? placement.y + halfHeight : placement.y;

  return {
    left: placement.x - halfWidth,
    right: placement.x + halfWidth,
    top,
    bottom
  };
}

export function lensObjectHitTarget(placement: LensObjectPlacement): CircleHitTarget {
  const offsetY = placement.anchor === 'center' ? 0 : -placement.size * 0.36;

  return {
    x: placement.x,
    y: placement.y + offsetY,
    radius: placement.size * 0.48
  };
}

export function petInteractionTarget(frame: GardenFrame): EllipseHitTarget {
  const petPoint = visibleGardenPoint(frame, 0.24, 0.73);

  return {
    x: petPoint.x + PET_INTERACTION_OFFSET.x,
    y: petPoint.y + PET_INTERACTION_OFFSET.y,
    radiusX: PET_INTERACTION_SIZE.width / 2,
    radiusY: PET_INTERACTION_SIZE.height / 2
  };
}

export function circleOverlapsEllipse(circle: CircleHitTarget, ellipse: EllipseHitTarget, padding = 0) {
  const radiusX = ellipse.radiusX + circle.radius + padding;
  const radiusY = ellipse.radiusY + circle.radius + padding;
  const dx = (circle.x - ellipse.x) / radiusX;
  const dy = (circle.y - ellipse.y) / radiusY;

  return dx * dx + dy * dy < 1;
}

export function pendingSeedStartPoint(frame: GardenFrame, plot: GardenPlot | null) {
  if (frame.width < 560) return plot ? gardenPlotPoint(frame, plot) : visibleGardenPoint(frame, 0.72, 0.82);

  return plot ? gardenPlotPoint(frame, plot) : visibleGardenPoint(frame, 0.64, 0.48);
}

export function createGardenSeedLayout(width: number, height: number, seedCount: number): GardenSeedLayoutItem[] {
  const count = Math.min(Math.max(seedCount, 0), MAX_VISIBLE_SEEDS);
  if (count === 0) return [];

  const frontCount = Math.min(count, 14);
  const middleCount = Math.min(Math.max(count - frontCount, 0), 18);
  const backCount = Math.max(count - frontCount - middleCount, 0);

  return [
    ...createBandLayout({ startIndex: 0, count: frontCount, columns: columnsFor(width, 7), width, y: height * 0.79, rowGap: 36, scale: 1, depthStart: 300, band: 'front' }),
    ...createBandLayout({ startIndex: frontCount, count: middleCount, columns: columnsFor(width, 9), width, y: height * 0.68, rowGap: 29, scale: 0.78, depthStart: 200, band: 'middle' }),
    ...createBandLayout({ startIndex: frontCount + middleCount, count: backCount, columns: columnsFor(width, 10), width, y: height * 0.58, rowGap: 22, scale: 0.58, depthStart: 100, band: 'back' })
  ];
}

export function resolveGardenSeedPlacement(
  seed: ReflectionSeed,
  fallback: GardenSeedLayoutItem,
  width: number,
  height: number,
  plots = createGardenPlots(width, height)
): GardenSeedPlacement {
  const plot = seed.gardenPlotId ? plots.find((item) => item.id === seed.gardenPlotId) : undefined;
  if (plot) {
    return {
      x: plot.x * width,
      y: plot.y * height,
      scale: plot.scale,
      depth: plot.depth
    };
  }

  if (seed.gardenPosition) {
    return {
      x: clamp(seed.gardenPosition.x, 0.08, 0.92) * width,
      y: clamp(seed.gardenPosition.y, 0.52, 0.88) * height,
      scale: fallback.scale,
      depth: fallback.depth
    };
  }

  return {
    x: fallback.x,
    y: fallback.y,
    scale: fallback.scale,
    depth: fallback.depth
  };
}

function createBandLayout({
  startIndex,
  count,
  columns,
  width,
  y,
  rowGap,
  scale,
  depthStart,
  band
}: {
  startIndex: number;
  count: number;
  columns: number;
  width: number;
  y: number;
  rowGap: number;
  scale: number;
  depthStart: number;
  band: GardenSeedLayoutItem['band'];
}) {
  if (count === 0) return [];

  const safeColumns = Math.max(1, Math.min(columns, count));
  const sidePadding = Math.max(24, width * 0.08);
  const usableWidth = Math.max(1, width - sidePadding * 2);

  return Array.from({ length: count }, (_, offset) => {
    const row = Math.floor(offset / safeColumns);
    const rowSize = Math.min(safeColumns, count - row * safeColumns);
    const col = offset % safeColumns;
    const rowWidth = rowSize > 1 ? usableWidth : 0;
    const rowOffset = row % 2 === 0 ? 0 : Math.min(usableWidth / Math.max(safeColumns - 1, 1) / 2, 18);
    const x = rowSize === 1 ? width / 2 : sidePadding + (col * rowWidth) / (rowSize - 1) + rowOffset;

    return {
      index: startIndex + offset,
      x: Math.min(width - 20, Math.max(20, x)),
      y: y + row * rowGap,
      scale,
      depth: depthStart + row * 10 + col,
      band
    };
  });
}

function columnsFor(width: number, preferred: number) {
  if (width < 390) return Math.max(4, preferred - 3);
  if (width < 540) return Math.max(5, preferred - 2);
  return preferred;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scaledRatio(width: number, height: number) {
  const maxDimension = Math.max(width, height);

  return {
    width: width / maxDimension,
    height: height / maxDimension
  };
}

function lensRingPoint(frame: GardenFrame, angle: number, radiusX: number, radiusY: number) {
  const radians = PhaserAngleToRadians(angle);
  const normalizedX = LENS_POOL_CENTER.x + Math.cos(radians) * radiusX;
  const normalizedY = LENS_POOL_CENTER.y + Math.sin(radians) * radiusY;

  return visibleGardenPoint(frame, normalizedX, normalizedY);
}

function lensObjectSize(frame: GardenFrame, designSize: number, compact: boolean) {
  if (compact) return clamp(designSize * frame.scale, 88, Math.min(114, designSize));
  return clamp(designSize * frame.scale, designSize * 0.72, designSize * 1.18);
}

function clampLensPointForMobile(frame: GardenFrame, point: { x: number; y: number }, size: number, anchor: LensPropAnchor) {
  const half = size / 2;
  const topInset = anchor === 'center' ? half : size;
  const bottomInset = anchor === 'center' ? half : 0;

  return {
    x: clamp(point.x, Math.max(half + 12, frame.width * 0.66), frame.width - half - 12),
    y: clamp(point.y, topInset + 18, frame.height - bottomInset - 172)
  };
}

function separateLensPlacementFromMobilePet(frame: GardenFrame, placement: LensObjectPlacement): LensObjectPlacement {
  const target = lensObjectHitTarget(placement);
  const petTarget = petInteractionTarget(frame);
  if (!circleOverlapsEllipse(target, petTarget, MOBILE_LENS_SAFE_GAP)) return placement;

  const radiusX = petTarget.radiusX + target.radius + MOBILE_LENS_SAFE_GAP;
  const radiusY = petTarget.radiusY + target.radius + MOBILE_LENS_SAFE_GAP;
  const dy = (target.y - petTarget.y) / radiusY;
  const requiredX = petTarget.x + radiusX * Math.sqrt(Math.max(0, 1 - dy * dy)) + 1;
  const shiftedRight = clampLensPlacementForMobileFrame({ ...placement, x: Math.max(placement.x, requiredX) }, frame);
  if (!circleOverlapsEllipse(lensObjectHitTarget(shiftedRight), petTarget, MOBILE_LENS_SAFE_GAP)) return shiftedRight;

  return clampLensPlacementForMobileFrame(
    { ...placement, y: placement.y - (target.y - (petTarget.y - radiusY - 1)) },
    frame
  );
}

function clampLensPlacementForMobileFrame(placement: LensObjectPlacement, frame: GardenFrame): LensObjectPlacement {
  const bounds = lensObjectBounds(placement);
  const target = lensObjectHitTarget(placement);
  const minX = placement.x + Math.max(0, -bounds.left, target.radius - target.x);
  const maxX = placement.x - Math.max(0, bounds.right - frame.width, target.x + target.radius - frame.width);
  const minY = placement.y + Math.max(0, -bounds.top, target.radius - target.y);
  const maxY = placement.y - Math.max(0, bounds.bottom - (frame.height - MOBILE_LENS_PANEL_SAFE_HEIGHT), target.y + target.radius - (frame.height - MOBILE_LENS_PANEL_SAFE_HEIGHT));

  return {
    ...placement,
    x: clamp(placement.x, minX, maxX),
    y: clamp(placement.y, minY, maxY)
  };
}

function PhaserAngleToRadians(angle: number) {
  return (angle * Math.PI) / 180;
}
