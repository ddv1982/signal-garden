import Phaser from 'phaser';
import type { GardenState, ReflectionSeed } from '../../../shared/models';
import { growthStageForSeed } from '../../domain/seedGrowth';
import type { ActiveTheme } from '../../domain/theme';
import {
  GARDEN_DESIGN_HEIGHT,
  GARDEN_DESIGN_WIDTH,
  createGardenSeedLayout,
  createGardenPlots,
  gardenPlotPoint,
  gardenPoint,
  resolveGardenSeedPlacement,
  type GardenFrame,
  type LensPropAnchor,
} from '../gardenLayout';

export type SeedWateringEvent = { seedId: string; eventId: string };

export type SeedRendererContext = {
  scene: Phaser.Scene;
  state: GardenState;
  theme: ActiveTheme;
  reducedMotion: boolean;
  hostElement: HTMLElement;
  lastWateringEvent: SeedWateringEvent | null;
  lastAnimatedWateringEventId: string | null;
  onSeedSelected: (seed: ReflectionSeed) => void;
  addPropImage: (
    group: Phaser.GameObjects.Container,
    textureKey: string,
    x: number,
    y: number,
    maxSize: number,
    anchor?: LensPropAnchor
  ) => Phaser.GameObjects.Image;
};

export function drawSeeds(
  ctx: SeedRendererContext,
  width: number,
  height: number,
  frame: GardenFrame
): Phaser.GameObjects.Container[] {
  const visibleSeeds = ctx.state.seeds.slice(0, 50);
  const layout = createGardenSeedLayout(
    GARDEN_DESIGN_WIDTH,
    GARDEN_DESIGN_HEIGHT,
    visibleSeeds.length
  );
  const plots = createGardenPlots(width, height);
  const seedGroups: Phaser.GameObjects.Container[] = [];

  layout.forEach((item) => {
    const seed = visibleSeeds[item.index];
    const placement = resolveGardenSeedPlacement(
      seed,
      item,
      GARDEN_DESIGN_WIDTH,
      GARDEN_DESIGN_HEIGHT,
      plots
    );
    const plot = seed.gardenPlotId
      ? plots.find((item) => item.id === seed.gardenPlotId)
      : undefined;
    const point = plot
      ? gardenPlotPoint(frame, plot)
      : gardenPoint(frame, placement.x, placement.y);
    const group = ctx.scene.add
      .container(point.x, point.y)
      .setScale(placement.scale * Phaser.Math.Clamp(frame.scale, 0.82, 1.38))
      .setDepth(placement.depth);
    group.setInteractive(new Phaser.Geom.Ellipse(0, -28, 72, 96), Phaser.Geom.Ellipse.Contains);
    group.on('pointerdown', () => ctx.onSeedSelected(seed));
    drawSeed(ctx, group, seed);
    group.setData('seedId', seed.id);
    group.setData('seedStatus', seed.status);
    group.setData('gardenPlotId', seed.gardenPlotId ?? '');
    seedGroups.push(group);
  });

  return seedGroups;
}

export function drawSeed(
  ctx: Pick<SeedRendererContext, 'addPropImage'>,
  group: Phaser.GameObjects.Container,
  seed: ReflectionSeed
) {
  ctx.addPropImage(group, seedPropKey(seed), 0, 0, 82, 'bottom');
  group.add(group.scene.add.ellipse(0, 20, 58, 18, 0x7b5941, 0.18));
}

export function seedUnderPointer(
  seedGroups: Phaser.GameObjects.Container[],
  seeds: ReflectionSeed[],
  pointer: Phaser.Input.Pointer
): ReflectionSeed | null {
  const pointerX = pointer.worldX ?? pointer.x;
  const pointerY = pointer.worldY ?? pointer.y;

  for (let index = seedGroups.length - 1; index >= 0; index -= 1) {
    const group = seedGroups[index];
    const seedId = group.getData('seedId') as string | undefined;
    if (!seedId) continue;

    const scale = Math.max(group.scaleX, group.scaleY, 1);
    const dx = pointerX - group.x;
    const dy = pointerY - (group.y - 28 * scale);
    const radiusX = 36 * scale;
    const radiusY = 48 * scale;
    const insideSeed = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1;
    if (insideSeed) {
      return seeds.find((seed) => seed.id === seedId) ?? null;
    }
  }

  return null;
}

export function animateNewestSeed(
  ctx: Pick<SeedRendererContext, 'scene' | 'reducedMotion'>,
  seedGroups: Phaser.GameObjects.Container[],
  pet: { playPlantProud(): void }
) {
  const newestSeedGroup = seedGroups[0];
  if (!newestSeedGroup) return;

  pet.playPlantProud();
  if (ctx.reducedMotion) return;

  ctx.scene.tweens.killTweensOf(newestSeedGroup);
  const settledScale = newestSeedGroup.scaleX;
  newestSeedGroup.setScale(settledScale * 1.2);
  drawPlantingBurst(ctx.scene, newestSeedGroup.x, newestSeedGroup.y);
  ctx.scene.tweens.add({
    targets: newestSeedGroup,
    scale: settledScale,
    duration: 360,
    ease: 'Back.easeOut',
  });
}

export function animateWateredSeed(
  ctx: SeedRendererContext,
  seedGroups: Phaser.GameObjects.Container[]
): string | null {
  if (!ctx.lastWateringEvent || ctx.lastAnimatedWateringEventId === ctx.lastWateringEvent.eventId)
    return null;

  const seedGroup = seedGroups.find(
    (group) => group.getData('seedId') === ctx.lastWateringEvent?.seedId
  );
  if (!seedGroup) return null;

  ctx.hostElement.dataset.wateredSeed = ctx.lastWateringEvent.seedId;
  ctx.hostElement.dataset.wateringEvent = ctx.lastWateringEvent.eventId;
  if (ctx.reducedMotion) {
    const shimmer = ctx.scene.add
      .circle(seedGroup.x, seedGroup.y - 18, 34, 0x8bc6c3, 0.18)
      .setDepth(478);
    ctx.scene.time.delayedCall(650, () => shimmer.destroy());
    return ctx.lastWateringEvent.eventId;
  }

  ctx.scene.tweens.killTweensOf(seedGroup);
  const settledScale = seedGroup.scaleX;
  drawWateringBurst(ctx.scene, seedGroup.x, seedGroup.y);
  ctx.scene.tweens.add({
    targets: seedGroup,
    scale: settledScale * 1.08,
    duration: 180,
    yoyo: true,
    ease: 'Sine.easeInOut',
  });

  return ctx.lastWateringEvent.eventId;
}

function drawPlantingBurst(scene: Phaser.Scene, x: number, y: number) {
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10;
    const particle = scene.add
      .circle(x, y - 14, 4, index % 2 === 0 ? 0xfff1ad : 0xdb6f7a, 0.72)
      .setDepth(480);
    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * 42,
      y: y - 14 + Math.sin(angle) * 28,
      alpha: 0,
      scale: 0.4,
      duration: 520,
      ease: 'Sine.easeOut',
      onComplete: () => particle.destroy(),
    });
  }
}

function drawWateringBurst(scene: Phaser.Scene, x: number, y: number) {
  for (let index = 0; index < 8; index += 1) {
    const offset = (index - 3.5) * 8;
    const droplet = scene.add.ellipse(x + offset, y - 64, 7, 12, 0x8bc6c3, 0.82).setDepth(480);
    scene.tweens.add({
      targets: droplet,
      y: y - 18,
      alpha: 0,
      scale: 0.55,
      duration: 520 + index * 24,
      ease: 'Sine.easeIn',
      onComplete: () => droplet.destroy(),
    });
  }
}

function seedPropKey(seed: ReflectionSeed): string {
  const growthStage = growthStageForSeed(seed);
  if (growthStage === 'seed') return 'prop-seed';
  if (growthStage === 'sprout') return 'prop-sprout';
  if (growthStage === 'growing') return 'prop-bud';
  return 'prop-flower';
}
