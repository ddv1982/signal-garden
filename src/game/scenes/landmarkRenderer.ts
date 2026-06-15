import Phaser from 'phaser';
import type { GardenState } from '../../../shared/models';
import type { ActiveTheme } from '../../domain/theme';
import { gardenNormalizedPoint, type GardenFrame, type LensPropAnchor } from '../gardenLayout';

export type LandmarkRendererContext = {
  scene: Phaser.Scene;
  state: GardenState;
  theme: ActiveTheme;
  reducedMotion: boolean;
  addPropImage: (
    group: Phaser.GameObjects.Container,
    textureKey: string,
    x: number,
    y: number,
    maxSize: number,
    anchor?: LensPropAnchor
  ) => Phaser.GameObjects.Image;
};

export function drawGardenLandmarks(ctx: LandmarkRendererContext, frame: GardenFrame) {
  const seedCount = ctx.state.seeds.length;
  const leftSoil = gardenNormalizedPoint(frame, 0.18, 0.67);
  const dark = ctx.theme === 'dark';

  ctx.scene.add
    .ellipse(
      leftSoil.x,
      leftSoil.y,
      gardenSize(frame, 94, { max: 132 }),
      gardenSize(frame, 28, { max: 40 }),
      dark ? 0x4a5b4f : 0x7b5941,
      seedCount === 0 ? (dark ? 0.42 : 0.22) : dark ? 0.24 : 0.12
    )
    .setDepth(30);
  ctx.scene.add
    .circle(
      leftSoil.x - gardenSize(frame, 28),
      gardenNormalizedPoint(frame, 0.18, 0.65).y,
      gardenSize(frame, 8, { max: 12 }),
      dark ? 0xf0ca82 : 0xf8d76e,
      seedCount === 0 ? 0.66 : 0.28
    )
    .setDepth(31);
  ctx.scene.add
    .circle(
      leftSoil.x + gardenSize(frame, 4),
      gardenNormalizedPoint(frame, 0.18, 0.64).y,
      gardenSize(frame, 6, { max: 10 }),
      dark ? 0xf1a6a9 : 0xdb6f7a,
      seedCount === 0 ? 0.56 : 0.22
    )
    .setDepth(31);

  if (seedCount >= 1) {
    const point = gardenNormalizedPoint(frame, 0.83, 0.55);
    const lantern = ctx.scene.add.container(point.x, point.y).setDepth(70);
    ctx.addPropImage(lantern, 'prop-lantern', 0, 0, gardenSize(frame, 92, { max: 130 }), 'bottom');
    if (!ctx.reducedMotion) {
      ctx.scene.tweens.add({
        targets: lantern,
        alpha: 0.78,
        duration: 1300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  if (seedCount >= 3) {
    const point = gardenNormalizedPoint(frame, 0.5, 0.6);
    const vine = ctx.scene.add.container(point.x, point.y).setDepth(60);
    ctx.addPropImage(vine, 'prop-vine', 0, 0, gardenSize(frame, 124, { max: 172 }), 'bottom');
  }

  if (seedCount >= 7) {
    const point = gardenNormalizedPoint(frame, 0.66, 0.66);
    const dreamStone = ctx.scene.add.container(point.x, point.y).setDepth(65);
    ctx.addPropImage(
      dreamStone,
      'prop-dream-stone',
      0,
      0,
      gardenSize(frame, 96, { max: 136 }),
      'bottom'
    );
  }
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
