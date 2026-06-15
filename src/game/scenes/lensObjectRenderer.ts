import Phaser from 'phaser';
import type { LensKind, ReflectionSeed } from '../../../shared/models';
import type { ActiveTheme } from '../../domain/theme';
import { createLensAmbientMotes, isCompactGardenFrame } from '../gardenEffects';
import {
  createLensObjectPlacements,
  lensObjectHitTarget,
  type GardenFrame,
  type LensPropAnchor,
} from '../gardenLayout';
import { DARK_LENS_LIGHTING } from '../lensLighting';

export type LensObjectRendererContext = {
  scene: Phaser.Scene;
  theme: ActiveTheme;
  reducedMotion: boolean;
  pendingSeed: ReflectionSeed | null;
  currentLens: LensKind | null;
  lensSessionActive: boolean;
  hostElement: HTMLElement;
  onLensObjectSelected: (kind: LensKind) => void;
  wakePet: () => boolean;
  playPetAttention: () => void;
  addPropImage: (
    group: Phaser.GameObjects.Container,
    textureKey: string,
    x: number,
    y: number,
    maxSize: number,
    anchor?: LensPropAnchor
  ) => Phaser.GameObjects.Image;
};

export type LensObjectRendererState = {
  lastRevealedLens: LensKind | null;
};

export function drawLensObjects(
  ctx: LensObjectRendererContext,
  rendererState: LensObjectRendererState,
  frame: GardenFrame
) {
  if (!ctx.lensSessionActive || ctx.pendingSeed) {
    rendererState.lastRevealedLens = null;
    return;
  }

  const placements = createLensObjectPlacements(frame, ctx.currentLens);
  const lensChanged = ctx.currentLens !== rendererState.lastRevealedLens;
  const animateReveal = lensChanged && !ctx.reducedMotion;
  if (animateReveal && rendererState.lastRevealedLens) {
    drawLensFarewell(ctx, frame, rendererState.lastRevealedLens);
  }
  rendererState.lastRevealedLens = ctx.currentLens;
  drawLensFocusVignette(ctx, frame);

  placements.forEach((placement) => {
    const active = ctx.currentLens === placement.kind;
    const size = placement.size;
    const hitTarget = lensObjectHitTarget(placement);
    const glowY = hitTarget.y - placement.y;
    const group = ctx.scene.add.container(placement.x, placement.y).setDepth(active ? 620 : 240);
    const dark = ctx.theme === 'dark';
    if (active) {
      ctx.hostElement.dataset.activeLensX = (hitTarget.x / ctx.scene.scale.width).toFixed(4);
      ctx.hostElement.dataset.activeLensY = (hitTarget.y / ctx.scene.scale.height).toFixed(4);
      group.setInteractive(
        new Phaser.Geom.Circle(0, glowY, hitTarget.radius),
        Phaser.Geom.Circle.Contains
      );
      group.on('pointerdown', () => {
        ctx.onLensObjectSelected(placement.kind);
        if (ctx.wakePet()) return;
        ctx.playPetAttention();
      });
    }
    const glow = dark
      ? drawDarkLensGlow(ctx, placement.kind, size, glowY, active)
      : ctx.scene.add.circle(
          0,
          glowY,
          size * 0.42,
          active ? 0xfff1ad : 0xffffff,
          active ? 0.2 : 0.06
        );
    const shadow = ctx.scene.add.ellipse(
      0,
      placement.shadowY,
      placement.shadowWidth,
      placement.shadowHeight,
      dark ? 0x241a18 : 0x5c4a36,
      dark ? placement.shadowAlpha * 0.72 : placement.shadowAlpha
    );
    group.add([glow, shadow]);
    if (active && dark) {
      drawDarkActiveLensInnerFill(ctx, group, placement.kind, size, glowY);
      drawDarkActiveLensFocusBase(ctx, group, placement.kind, size, glowY);
    }
    ctx.addPropImage(group, `lens-${placement.kind}`, 0, 0, size, placement.anchor);
    if (active) {
      if (dark) {
        drawDarkActiveLensOrbit(ctx, group, placement.kind, size, glowY);
        drawDarkActiveLensMotes(ctx, group, placement.kind, size, glowY);
      } else {
        group.add(
          ctx.scene.add.circle(0, glowY, size * 0.5, 0xfff1ad, 0).setStrokeStyle(2, 0xfff1ad, 0.52)
        );
        drawLightActiveLensMotes(ctx, group, size, glowY, isCompactGardenFrame(frame));
      }
    }
    if (active && !ctx.reducedMotion) {
      ctx.scene.tweens.add({
        targets: glow,
        alpha: dark ? DARK_LENS_LIGHTING[placement.kind].activeAlpha * 1.65 : 0.46,
        scale: dark ? 1.025 : 1.04,
        duration: 3400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    if (animateReveal) {
      const restingY = group.y;
      group.setAlpha(0);
      group.setScale(0.94);
      group.y = restingY + 14;
      ctx.scene.tweens.add({
        targets: group,
        alpha: 1,
        scale: 1,
        y: restingY,
        duration: 520,
        delay: 220,
        ease: 'Sine.easeOut',
      });
    }
  });
}

function drawLensFarewell(ctx: LensObjectRendererContext, frame: GardenFrame, kind: LensKind) {
  const [placement] = createLensObjectPlacements(frame, kind);
  if (!placement) return;

  const group = ctx.scene.add.container(placement.x, placement.y).setDepth(600);
  const dark = ctx.theme === 'dark';
  const shadow = ctx.scene.add.ellipse(
    0,
    placement.shadowY,
    placement.shadowWidth,
    placement.shadowHeight,
    dark ? 0x241a18 : 0x5c4a36,
    dark ? placement.shadowAlpha * 0.72 : placement.shadowAlpha
  );
  group.add(shadow);
  ctx.addPropImage(group, `lens-${kind}`, 0, 0, placement.size, placement.anchor);
  ctx.scene.tweens.add({
    targets: group,
    alpha: 0,
    scale: 0.96,
    y: placement.y + 10,
    duration: 360,
    ease: 'Sine.easeIn',
    onComplete: () => group.destroy(),
  });
}

function drawLensFocusVignette(ctx: LensObjectRendererContext, frame: GardenFrame) {
  const dark = ctx.theme === 'dark';
  ctx.scene.add
    .rectangle(
      frame.width / 2,
      frame.height / 2,
      frame.width,
      frame.height,
      dark ? 0x060d10 : 0x2c2417,
      dark ? 0.16 : 0.08
    )
    .setDepth(540);
}

function drawDarkActiveLensInnerFill(
  ctx: LensObjectRendererContext,
  group: Phaser.GameObjects.Container,
  kind: LensKind,
  size: number,
  glowY: number
) {
  const lighting = DARK_LENS_LIGHTING[kind];
  const fillAlpha = Math.max(0.16, lighting.activeAlpha * 1.35);
  const fill = ctx.scene.add.circle(
    0,
    glowY,
    size * 0.42,
    lighting.focusColor,
    ctx.reducedMotion ? fillAlpha * 0.84 : fillAlpha
  );
  group.add(fill);
  if (!ctx.reducedMotion) {
    ctx.scene.tweens.add({
      targets: fill,
      alpha: { from: fillAlpha * 0.82, to: fillAlpha * 1.12 },
      scale: 1.018,
      duration: 3600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}

function drawDarkActiveLensOrbit(
  ctx: LensObjectRendererContext,
  group: Phaser.GameObjects.Container,
  kind: LensKind,
  size: number,
  glowY: number
) {
  const lighting = DARK_LENS_LIGHTING[kind];
  const orbitAlpha = ctx.reducedMotion ? 0.42 : 0.5;
  const orbit = ctx.scene.add
    .circle(0, glowY, size * 0.5, lighting.focusColor, 0)
    .setStrokeStyle(2, lighting.focusColor, orbitAlpha);
  const innerOrbit = ctx.scene.add
    .circle(-size * 0.03, glowY - size * 0.02, size * 0.38, lighting.moteColor, 0)
    .setStrokeStyle(1, lighting.moteColor, ctx.reducedMotion ? 0.18 : 0.24);

  group.add([orbit, innerOrbit]);
  if (!ctx.reducedMotion) {
    ctx.scene.tweens.add({
      targets: [orbit, innerOrbit],
      alpha: { from: 0.82, to: 1 },
      scale: 1.025,
      duration: 3600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}

function drawDarkLensGlow(
  ctx: LensObjectRendererContext,
  kind: LensKind,
  size: number,
  glowY: number,
  active: boolean
) {
  const lighting = DARK_LENS_LIGHTING[kind];
  return ctx.scene.add.ellipse(
    0,
    glowY + size * 0.04,
    size * lighting.glowWidth,
    size * lighting.glowHeight,
    lighting.glowColor,
    active ? lighting.activeAlpha : lighting.inactiveAlpha
  );
}

function drawDarkActiveLensFocusBase(
  ctx: LensObjectRendererContext,
  group: Phaser.GameObjects.Container,
  kind: LensKind,
  size: number,
  glowY: number
) {
  const lighting = DARK_LENS_LIGHTING[kind];
  const focus = ctx.scene.add.ellipse(
    0,
    glowY + size * lighting.focusYOffset,
    size * lighting.focusWidth,
    size * lighting.focusHeight,
    lighting.focusColor,
    ctx.reducedMotion ? lighting.activeAlpha * 0.78 : lighting.activeAlpha
  );
  const inner = ctx.scene.add.ellipse(
    -size * 0.04,
    glowY + size * (lighting.focusYOffset - 0.01),
    size * lighting.focusWidth * 0.52,
    size * lighting.focusHeight * 0.46,
    lighting.moteColor,
    ctx.reducedMotion ? 0.08 : 0.11
  );
  group.add([focus, inner]);
  if (!ctx.reducedMotion) {
    ctx.scene.tweens.add({
      targets: [focus, inner],
      alpha: { from: lighting.activeAlpha * 0.72, to: lighting.activeAlpha * 1.18 },
      scaleX: 1.035,
      scaleY: 1.08,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}

function drawDarkActiveLensMotes(
  ctx: LensObjectRendererContext,
  group: Phaser.GameObjects.Container,
  kind: LensKind,
  size: number,
  glowY: number
) {
  const lighting = DARK_LENS_LIGHTING[kind];
  const motes = [
    ctx.scene.add.circle(
      -size * 0.36,
      glowY - size * 0.18,
      Math.max(1.4, size * 0.018),
      lighting.moteColor,
      0.3
    ),
    ctx.scene.add.circle(
      size * 0.28,
      glowY - size * 0.12,
      Math.max(1.2, size * 0.014),
      lighting.focusColor,
      0.24
    ),
    ctx.scene.add.circle(
      size * 0.1,
      glowY - size * 0.28,
      Math.max(1.1, size * 0.012),
      lighting.moteColor,
      0.21
    ),
  ];
  group.add(motes);
  if (!ctx.reducedMotion) {
    motes.forEach((mote, index) => {
      ctx.scene.tweens.add({
        targets: mote,
        y: mote.y - size * (0.035 + index * 0.01),
        alpha: index === 0 ? 0.16 : 0.13,
        duration: 2200 + index * 360,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }
}

function drawLightActiveLensMotes(
  ctx: LensObjectRendererContext,
  group: Phaser.GameObjects.Container,
  size: number,
  glowY: number,
  compact: boolean
) {
  const moteLayout = createLensAmbientMotes(size, glowY, compact);
  const motes = moteLayout.map((mote, index) =>
    ctx.scene.add.circle(
      mote.x,
      mote.y,
      mote.radius,
      index % 2 === 0 ? 0xf1ddba : 0xb8d8cf,
      mote.alpha
    )
  );
  group.add(motes);

  if (!ctx.reducedMotion) {
    motes.forEach((mote, index) => {
      const config = moteLayout[index];
      ctx.scene.tweens.add({
        targets: mote,
        y: mote.y + config.driftY,
        alpha: config.alpha * 0.48,
        duration: config.durationMs,
        delay: config.delayMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }
}
