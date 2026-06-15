import Phaser from 'phaser';
import type { ActiveTheme } from '../../domain/theme';
import {
  createGardenAmbientLayout,
  type AmbientCircle,
  type AmbientEllipse,
} from '../gardenEffects';
import type { GardenFrame } from '../gardenLayout';

export type AmbienceRendererContext = {
  scene: Phaser.Scene;
  theme: ActiveTheme;
  reducedMotion: boolean;
  hostElement: HTMLElement;
};

export function drawAmbientGardenEffects(ctx: AmbienceRendererContext, frame: GardenFrame) {
  const layout = createGardenAmbientLayout(frame, ctx.reducedMotion);
  ctx.hostElement.dataset.ambientMotion = layout.motion;
  ctx.hostElement.dataset.ambientZones = layout.zones;
  drawPondShimmer(ctx, layout.pondShimmers);
  drawPondMotes(ctx, layout.pondMotes);
}

function drawPondShimmer(ctx: AmbienceRendererContext, shimmers: AmbientEllipse[]) {
  const dark = ctx.theme === 'dark';
  const color = dark ? 0x8fb5b1 : 0xaecfc7;

  shimmers.forEach((shimmer) => {
    const ripple = ctx.scene.add
      .ellipse(
        shimmer.x,
        shimmer.y,
        shimmer.width,
        shimmer.height,
        color,
        dark ? shimmer.alpha * 0.96 : shimmer.alpha * 0.82
      )
      .setDepth(88);

    if (!ctx.reducedMotion) {
      ctx.scene.tweens.add({
        targets: ripple,
        alpha: { from: shimmer.alpha * 0.42, to: shimmer.alpha * 0.98 },
        scaleX: 1.035,
        scaleY: 1.08,
        duration: shimmer.durationMs,
        delay: shimmer.delayMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  });
}

function drawPondMotes(ctx: AmbienceRendererContext, motes: AmbientCircle[]) {
  const dark = ctx.theme === 'dark';

  motes.forEach((mote, index) => {
    const color = dark
      ? index % 2 === 0
        ? 0xd6bd83
        : 0x9fbfbd
      : index % 2 === 0
        ? 0xf1ddba
        : 0xb8d8cf;
    const circle = ctx.scene.add
      .circle(mote.x, mote.y, mote.radius, color, mote.alpha)
      .setDepth(255);

    if (!ctx.reducedMotion) {
      ctx.scene.tweens.add({
        targets: circle,
        y: mote.y + mote.driftY,
        alpha: { from: mote.alpha * 0.42, to: mote.alpha * 1.08 },
        duration: mote.durationMs,
        delay: mote.delayMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  });
}
