import Phaser from 'phaser';
import type { GardenPlot, GardenState, ReflectionSeed } from '../../../shared/models';
import type { ActiveTheme } from '../../domain/theme';
import {
  availableGardenPlots,
  createGardenFrame,
  gardenNormalizedPoint,
  gardenPlotPoint,
  pendingSeedStartPoint,
  type GardenFrame,
} from '../gardenLayout';
import { m } from '../../paraglide/messages.js';
import { drawSeed, type SeedRendererContext } from './seedRenderer';

export type PlantingPosition = { plotId: string; x: number; y: number };

export type PlantingRendererContext = Pick<SeedRendererContext, 'addPropImage'> & {
  scene: Phaser.Scene;
  state: GardenState;
  theme: ActiveTheme;
  reducedMotion: boolean;
  pendingSeed: ReflectionSeed | null;
  hostElement: HTMLElement;
  onPendingSeedPlanted: (position: PlantingPosition) => void;
  onPlantingFeedback: () => void;
};

export type PlantingRendererState = {
  isPendingSeedDragging: boolean;
  pendingSeedDropHandled: boolean;
  pendingSeedGroup?: Phaser.GameObjects.Container;
};

export function drawSoilTarget(ctx: PlantingRendererContext, frame: GardenFrame) {
  if (!ctx.pendingSeed) return;
  if (frame.width < 560) return;

  const point = gardenNormalizedPoint(frame, 0.5, 0.51);
  const dark = ctx.theme === 'dark';
  const label = ctx.scene.add
    .text(point.x - 78, point.y, m.garden_canvas_choose_plot(), {
      backgroundColor: dark ? 'rgba(18, 32, 34, 0.78)' : 'rgba(255, 250, 241, 0.72)',
      color: dark ? '#f1e9cf' : '#49382e',
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      padding: { x: 8, y: 4 },
    })
    .setDepth(430);
  label.setAlpha(0.86);
}

export function drawPlantingPlots(ctx: PlantingRendererContext, width: number, height: number) {
  const emptyPlots = availablePlots(ctx, width, height);
  ctx.hostElement.dataset.availablePlots = emptyPlots.length.toString();
  ctx.hostElement.dataset.plotMode = ctx.pendingSeed ? 'planting' : 'hidden';
  if (!ctx.pendingSeed) return;

  const frame = createGardenFrame(width, height);
  const dark = ctx.theme === 'dark';
  emptyPlots.forEach((plot) => {
    const { x, y } = gardenPlotPoint(frame, plot);
    const plotScale = plot.scale * Phaser.Math.Clamp(frame.scale, 0.86, 1.42);
    const marker = ctx.scene.add.container(x, y).setDepth(plot.depth - 8);
    const glow = ctx.scene.add.ellipse(
      0,
      0,
      96 * plotScale,
      40 * plotScale,
      dark ? 0xaedfd9 : 0xfff1ad,
      dark ? 0.2 : 0.24
    );
    const soil = ctx.scene.add.ellipse(
      0,
      0,
      74 * plotScale,
      28 * plotScale,
      dark ? 0x263a34 : 0x7b5941,
      dark ? 0.52 : 0.36
    );
    const ring = ctx.scene.add
      .ellipse(0, 0, 104 * plotScale, 46 * plotScale, dark ? 0xd8f4e6 : 0xfff1ad, 0)
      .setStrokeStyle(2, dark ? 0xd8f4e6 : 0xfff1ad, dark ? 0.58 : 0.72);
    marker.add([glow, soil, ring]);
    marker.setInteractive(
      new Phaser.Geom.Ellipse(0, 0, 104 * plotScale, 54 * plotScale),
      Phaser.Geom.Ellipse.Contains
    );
    marker.on('pointerdown', () => {
      plantAtPlot(ctx, plot);
      ctx.onPlantingFeedback();
    });
    if (!ctx.reducedMotion) {
      ctx.scene.tweens.add({
        targets: glow,
        alpha: 0.26,
        scaleX: 1.03,
        scaleY: 1.02,
        duration: 3200 + Math.random() * 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  });
}

export function drawPendingSeed(
  ctx: PlantingRendererContext,
  rendererState: PlantingRendererState,
  width: number,
  height: number,
  frame: GardenFrame
) {
  if (!ctx.pendingSeed) return;

  const emptyPlots = availablePlots(ctx, width, height);
  const emptyPlot = emptyPlots.find((plot) => plot.x >= 0.55) ?? emptyPlots[0];
  const startPoint = pendingSeedStartPoint(frame, emptyPlot ?? null);
  const startX = startPoint.x;
  const startY = pendingSeedRestY(frame, width, height, startPoint.y, emptyPlot ?? null);
  const group = ctx.scene.add.container(startX, startY).setDepth(470);
  drawSeed(ctx, group, ctx.pendingSeed);
  group.setScale(width < 560 ? 1.55 : 1.28);
  group.setInteractive(new Phaser.Geom.Circle(0, -14, 46), Phaser.Geom.Circle.Contains);
  ctx.scene.input.setDraggable(group);
  group.on('pointerdown', () => {
    rendererState.isPendingSeedDragging = true;
    rendererState.pendingSeedDropHandled = false;
  });
  rendererState.pendingSeedGroup = group;
}

export function clearPlantingRendererState(rendererState: PlantingRendererState) {
  rendererState.isPendingSeedDragging = false;
  rendererState.pendingSeedDropHandled = false;
  rendererState.pendingSeedGroup = undefined;
}

export function dragPendingSeed(
  rendererState: PlantingRendererState,
  gameObject: Phaser.GameObjects.GameObject,
  dragX: number,
  dragY: number
) {
  if (gameObject === rendererState.pendingSeedGroup) {
    rendererState.pendingSeedGroup.setPosition(dragX, dragY);
  }
}

export function movePendingSeedDrag(
  rendererState: PlantingRendererState,
  pointer: Phaser.Input.Pointer
) {
  if (rendererState.isPendingSeedDragging && rendererState.pendingSeedGroup) {
    rendererState.pendingSeedGroup.setPosition(pointer.x, pointer.y);
  }
}

export function endPendingSeedDrag(
  ctx: PlantingRendererContext,
  rendererState: PlantingRendererState
) {
  if (!rendererState.isPendingSeedDragging) return;
  rendererState.isPendingSeedDragging = false;
  tryPlantPendingSeed(ctx, rendererState);
}

export function tryPlantPendingSeed(
  ctx: PlantingRendererContext,
  rendererState: PlantingRendererState
) {
  if (rendererState.pendingSeedDropHandled) return;
  if (!rendererState.pendingSeedGroup) return;
  rendererState.pendingSeedDropHandled = true;
  rendererState.isPendingSeedDragging = false;

  const width = ctx.scene.scale.width || 720;
  const height = ctx.scene.scale.height || 520;
  const frame = createGardenFrame(width, height);
  const plot = nearestEmptyPlot(
    ctx,
    rendererState.pendingSeedGroup.x,
    rendererState.pendingSeedGroup.y
  );
  if (!plot) {
    const emptyPlot = availablePlots(ctx, width, height)[0];
    const point = pendingSeedStartPoint(frame, emptyPlot ?? null);
    ctx.scene.tweens.add({
      targets: rendererState.pendingSeedGroup,
      x: point.x,
      y: pendingSeedRestY(frame, width, height, point.y, emptyPlot ?? null),
      duration: ctx.reducedMotion ? 1 : 240,
      ease: 'Sine.easeOut',
    });
    return;
  }

  plantAtPlot(ctx, plot);
  ctx.onPlantingFeedback();
}

function availablePlots(
  ctx: Pick<PlantingRendererContext, 'state'>,
  width: number,
  height: number
) {
  return availableGardenPlots(ctx.state.seeds, width, height);
}

function nearestEmptyPlot(ctx: PlantingRendererContext, x: number, y: number) {
  const width = ctx.scene.scale.width || 720;
  const height = ctx.scene.scale.height || 520;
  const frame = createGardenFrame(width, height);
  const emptyPlots = availablePlots(ctx, width, height);
  let nearest: GardenPlot | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  emptyPlots.forEach((plot) => {
    const point = gardenPlotPoint(frame, plot);
    const distance = Phaser.Math.Distance.Between(x, y, point.x, point.y);
    if (distance < nearestDistance) {
      nearest = plot;
      nearestDistance = distance;
    }
  });

  return nearestDistance <= Math.max(76, Math.min(width, height) * 0.16, 92 * frame.scale)
    ? nearest
    : undefined;
}

function plantAtPlot(ctx: PlantingRendererContext, plot: GardenPlot) {
  ctx.hostElement.dataset.selectedPlot = plot.id;
  ctx.onPendingSeedPlanted({ plotId: plot.id, x: plot.x, y: plot.y });
}

function pendingSeedRestY(
  frame: GardenFrame,
  width: number,
  height: number,
  startY: number,
  plot: GardenPlot | null
) {
  return width < 560
    ? startY
    : plot
      ? Math.max(height * 0.48, startY - gardenSize(frame, 118, { max: 148 }))
      : startY;
}

function gardenSize(
  frame: GardenFrame,
  designSize: number,
  options: { min?: number; max?: number } = {}
) {
  return Phaser.Math.Clamp(
    designSize * frame.scale,
    options.min ?? 1,
    options.max ?? Number.POSITIVE_INFINITY
  );
}
