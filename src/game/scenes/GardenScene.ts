import Phaser from 'phaser';
import type { GardenPlot, GardenState, LensKind, ReflectionSeed } from '../../../shared/models';
import type { ActiveTheme } from '../../domain/theme';
import { growthStageForSeed } from '../../domain/seedGrowth';
import { m } from '../../paraglide/messages.js';
import {
  GARDEN_DESIGN_HEIGHT,
  GARDEN_DESIGN_WIDTH,
  availableGardenPlots,
  createGardenFrame,
  createLensObjectPlacements,
  createGardenPlots,
  createGardenSeedLayout,
  gardenNormalizedPoint,
  gardenPlotPoint,
  gardenPoint,
  lensObjectHitTarget,
  pendingSeedStartPoint,
  PET_INTERACTION_OFFSET,
  PET_INTERACTION_SIZE,
  resolveGardenSeedPlacement,
  visibleGardenPoint,
  type GardenFrame,
  type LensPropAnchor,
} from '../gardenLayout';
import { preloadGardenTextures, textureKeyForTheme } from '../assets';
import {
  createGardenAmbientLayout,
  createLensAmbientMotes,
  createPetAmbientLayout,
  isCompactGardenFrame,
  type AmbientCircle,
  type AmbientEllipse,
} from '../gardenEffects';
import { DARK_LENS_LIGHTING } from '../lensLighting';
import { PetController } from '../PetController';
import type { PetFrameId, PetSequenceId } from '../petAnimation';

export type PlantingPosition = { plotId: string; x: number; y: number };
export type WateringEvent = { seedId: string; eventId: string };

export type GardenSceneOptions = {
  parent: HTMLElement;
  state: GardenState;
  reducedMotion: boolean;
  theme: ActiveTheme;
  pendingSeed: ReflectionSeed | null;
  currentLens: LensKind | null;
  lensSessionActive: boolean;
  petDebug: boolean;
  lastWateringEvent: WateringEvent | null;
  onPetTapped: () => void;
  onSeedSelected: (seed: ReflectionSeed) => void;
  onSignalRequested: () => void;
  onLensObjectSelected: (kind: LensKind) => void;
  onPendingSeedPlanted: (position: PlantingPosition) => void;
};

export class GardenScene extends Phaser.Scene {
  private state: GardenState;
  private reducedMotion: boolean;
  private theme: ActiveTheme;
  private pendingSeed: ReflectionSeed | null;
  private currentLens: LensKind | null;
  private lensSessionActive: boolean;
  private lastWateringEvent: WateringEvent | null;
  private lastAnimatedWateringEventId: string | null = null;
  private petDebug: boolean;
  private readonly onPetTapped: () => void;
  private readonly onSeedSelected: (seed: ReflectionSeed) => void;
  private readonly onSignalRequested: () => void;
  private readonly onLensObjectSelected: (kind: LensKind) => void;
  private readonly onPendingSeedPlanted: (position: PlantingPosition) => void;
  private readonly hostElement: HTMLElement;
  private readonly pet: PetController;
  private isPendingSeedDragging = false;
  private pendingSeedGroup?: Phaser.GameObjects.Container;
  private previousSeedCount = 0;
  private seedGroups: Phaser.GameObjects.Container[] = [];
  private signalGroup?: Phaser.GameObjects.Container;
  private gardenPlots: GardenPlot[] = [];
  private lastRevealedLens: LensKind | null = null;

  constructor(options: GardenSceneOptions) {
    super('GardenScene');
    this.hostElement = options.parent;
    this.state = options.state;
    this.reducedMotion = options.reducedMotion;
    this.theme = options.theme;
    this.pendingSeed = options.pendingSeed;
    this.currentLens = options.currentLens;
    this.lensSessionActive = options.lensSessionActive;
    this.lastWateringEvent = options.lastWateringEvent;
    this.petDebug = options.petDebug;
    this.onPetTapped = options.onPetTapped;
    this.onSeedSelected = options.onSeedSelected;
    this.onSignalRequested = options.onSignalRequested;
    this.onLensObjectSelected = options.onLensObjectSelected;
    this.onPendingSeedPlanted = options.onPendingSeedPlanted;
    this.previousSeedCount = options.state.seeds.length;
    this.pet = new PetController(this, this.hostElement, {
      isReducedMotion: () => this.reducedMotion,
      theme: () => this.theme,
      isPetDebug: () => this.petDebug,
      isGardenBusy: () => Boolean(this.pendingSeed) || this.lensSessionActive,
      hasSeeds: () => this.state.seeds.length > 0,
    });
  }

  preload() {
    preloadGardenTextures(this.load);
  }

  create() {
    this.pet.noteSceneStart();
    this.input.on(
      'drag',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
      ) => {
        if (gameObject === this.pendingSeedGroup) {
          this.pendingSeedGroup.setPosition(dragX, dragY);
        }
      }
    );
    this.input.on('dragend', () => this.tryPlantPendingSeed());
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPendingSeedDragging && this.pendingSeedGroup) {
        this.pendingSeedGroup.setPosition(pointer.x, pointer.y);
      }
    });
    this.input.on('pointerup', () => {
      if (!this.isPendingSeedDragging) return;
      this.isPendingSeedDragging = false;
      this.tryPlantPendingSeed();
    });
    this.scale.on('resize', () => this.draw());
    this.draw();
  }

  setGardenState(
    state: GardenState,
    reducedMotion: boolean,
    theme: ActiveTheme,
    pendingSeed: ReflectionSeed | null,
    currentLens: LensKind | null,
    lensSessionActive: boolean,
    lastWateringEvent: WateringEvent | null
  ) {
    const previousSeedCount = this.previousSeedCount;
    const previousTheme = this.theme;
    this.state = state;
    this.reducedMotion = reducedMotion;
    this.theme = theme;
    this.pendingSeed = pendingSeed;
    this.currentLens = currentLens;
    this.lensSessionActive = lensSessionActive;
    this.lastWateringEvent = lastWateringEvent;
    this.previousSeedCount = state.seeds.length;
    if (this.sys.isActive()) {
      this.draw();
      if (previousTheme === theme) {
        if (state.seeds.length > previousSeedCount) this.animateNewestSeed();
        this.animateWateredSeed();
      }
    }
  }

  previewPetFrame(frame: PetFrameId) {
    this.pet.previewFrame(frame);
  }

  previewPetSequence(sequence: PetSequenceId) {
    this.pet.previewSequence(sequence);
  }

  playHeadButt() {
    this.pet.playHeadButt();
  }

  private draw() {
    const width = this.scale.width || 720;
    const height = this.scale.height || 520;
    const frame = createGardenFrame(width, height);
    this.hostElement.dataset.theme = this.theme;
    this.hostElement.dataset.textureTheme = this.theme;
    this.clearScene();
    this.drawBackground(width, height, frame);
    this.drawGardenLandmarks(frame);
    this.drawSoilTarget(frame);
    this.drawSeeds(width, height, frame);
    this.drawPlantingPlots(width, height, frame);
    this.drawSignal(frame);
    this.drawAmbientGardenEffects(frame);
    this.drawLensObjects(frame);
    this.drawPendingSeed(width, height, frame);
    this.drawPet(frame);
  }

  private clearScene() {
    delete this.hostElement.dataset.activeLensX;
    delete this.hostElement.dataset.activeLensY;
    delete this.hostElement.dataset.ambientMotion;
    delete this.hostElement.dataset.ambientZones;
    this.pet.detach();
    this.children.removeAll(true);
    this.seedGroups = [];
    this.isPendingSeedDragging = false;
    this.pendingSeedGroup = undefined;
    this.signalGroup = undefined;
    this.gardenPlots = [];
  }

  private gardenSize(
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

  private drawBackground(width: number, height: number, frame: GardenFrame) {
    const backgroundTexture = textureKeyForTheme('garden-background-v4', this.theme);
    this.add
      .image(width / 2, height / 2, backgroundTexture)
      .setDepth(0)
      .setScale(frame.scale);

    if (this.theme !== 'dark') {
      this.add.rectangle(width / 2, height / 2, width, height, 0xfff6e8, 0.08).setDepth(2);
    }
  }

  private drawGardenLandmarks(frame: GardenFrame) {
    const seedCount = this.state.seeds.length;
    const leftSoil = gardenNormalizedPoint(frame, 0.18, 0.67);
    const dark = this.theme === 'dark';

    this.add
      .ellipse(
        leftSoil.x,
        leftSoil.y,
        this.gardenSize(frame, 94, { max: 132 }),
        this.gardenSize(frame, 28, { max: 40 }),
        dark ? 0x4a5b4f : 0x7b5941,
        seedCount === 0 ? (dark ? 0.42 : 0.22) : dark ? 0.24 : 0.12
      )
      .setDepth(30);
    this.add
      .circle(
        leftSoil.x - this.gardenSize(frame, 28),
        gardenNormalizedPoint(frame, 0.18, 0.65).y,
        this.gardenSize(frame, 8, { max: 12 }),
        dark ? 0xf0ca82 : 0xf8d76e,
        seedCount === 0 ? 0.66 : 0.28
      )
      .setDepth(31);
    this.add
      .circle(
        leftSoil.x + this.gardenSize(frame, 4),
        gardenNormalizedPoint(frame, 0.18, 0.64).y,
        this.gardenSize(frame, 6, { max: 10 }),
        dark ? 0xf1a6a9 : 0xdb6f7a,
        seedCount === 0 ? 0.56 : 0.22
      )
      .setDepth(31);

    if (seedCount >= 1) {
      const point = gardenNormalizedPoint(frame, 0.83, 0.55);
      const lantern = this.add.container(point.x, point.y).setDepth(70);
      this.addPropImage(
        lantern,
        'prop-lantern',
        0,
        0,
        this.gardenSize(frame, 92, { max: 130 }),
        'bottom'
      );
      if (!this.reducedMotion) {
        this.tweens.add({
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
      const vine = this.add.container(point.x, point.y).setDepth(60);
      this.addPropImage(
        vine,
        'prop-vine',
        0,
        0,
        this.gardenSize(frame, 124, { max: 172 }),
        'bottom'
      );
    }

    if (seedCount >= 7) {
      const point = gardenNormalizedPoint(frame, 0.66, 0.66);
      const dreamStone = this.add.container(point.x, point.y).setDepth(65);
      this.addPropImage(
        dreamStone,
        'prop-dream-stone',
        0,
        0,
        this.gardenSize(frame, 96, { max: 136 }),
        'bottom'
      );
    }
  }

  private drawSoilTarget(frame: GardenFrame) {
    if (!this.pendingSeed) return;
    if (frame.width < 560) return;

    const point = gardenNormalizedPoint(frame, 0.5, 0.51);
    const dark = this.theme === 'dark';
    const label = this.add
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

  private drawPlantingPlots(width: number, height: number, frame: GardenFrame) {
    this.gardenPlots = createGardenPlots(width, height);
    this.hostElement.dataset.availablePlots = this.emptyPlots().length.toString();
    this.hostElement.dataset.plotMode = this.pendingSeed ? 'planting' : 'hidden';
    if (!this.pendingSeed) return;

    const dark = this.theme === 'dark';
    this.emptyPlots().forEach((plot) => {
      const { x, y } = gardenPlotPoint(frame, plot);
      const plotScale = plot.scale * Phaser.Math.Clamp(frame.scale, 0.86, 1.42);
      const marker = this.add.container(x, y).setDepth(plot.depth - 8);
      const glow = this.add.ellipse(
        0,
        0,
        96 * plotScale,
        40 * plotScale,
        dark ? 0xaedfd9 : 0xfff1ad,
        dark ? 0.2 : 0.24
      );
      const soil = this.add.ellipse(
        0,
        0,
        74 * plotScale,
        28 * plotScale,
        dark ? 0x263a34 : 0x7b5941,
        dark ? 0.52 : 0.36
      );
      const ring = this.add
        .ellipse(0, 0, 104 * plotScale, 46 * plotScale, dark ? 0xd8f4e6 : 0xfff1ad, 0)
        .setStrokeStyle(2, dark ? 0xd8f4e6 : 0xfff1ad, dark ? 0.58 : 0.72);
      marker.add([glow, soil, ring]);
      marker.setInteractive(
        new Phaser.Geom.Ellipse(0, 0, 104 * plotScale, 54 * plotScale),
        Phaser.Geom.Ellipse.Contains
      );
      marker.on('pointerdown', () => {
        this.plantAtPlot(plot);
        this.pet.playHeadButt();
      });
      if (!this.reducedMotion) {
        this.tweens.add({
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

  private drawSeeds(width: number, height: number, frame: GardenFrame) {
    const visibleSeeds = this.state.seeds.slice(0, 50);
    const layout = createGardenSeedLayout(
      GARDEN_DESIGN_WIDTH,
      GARDEN_DESIGN_HEIGHT,
      visibleSeeds.length
    );
    const plots = createGardenPlots(width, height);

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
      const group = this.add
        .container(point.x, point.y)
        .setScale(placement.scale * Phaser.Math.Clamp(frame.scale, 0.82, 1.38))
        .setDepth(placement.depth);
      group.setInteractive(new Phaser.Geom.Ellipse(0, -28, 72, 96), Phaser.Geom.Ellipse.Contains);
      group.on('pointerdown', () => this.onSeedSelected(seed));
      this.drawSeed(group, seed);
      group.setData('seedId', seed.id);
      group.setData('seedStatus', seed.status);
      group.setData('gardenPlotId', seed.gardenPlotId ?? '');
      this.seedGroups.push(group);
    });
  }

  private drawSeed(group: Phaser.GameObjects.Container, seed: ReflectionSeed) {
    this.addPropImage(group, this.seedPropKey(seed), 0, 0, 82, 'bottom');
    group.add(this.add.ellipse(0, 20, 58, 18, 0x7b5941, 0.18));
  }

  private drawSignal(frame: GardenFrame) {
    if (this.pendingSeed || this.lensSessionActive) return;

    const point = visibleGardenPoint(frame, 0.72, 0.5);
    const group = this.add.container(point.x, point.y).setDepth(260);
    const dark = this.theme === 'dark';
    group.add(this.add.circle(0, 0, 20, dark ? 0xaec9bd : 0xffe0a1, dark ? 0.88 : 0.96));
    group.add(this.add.circle(0, 0, 9, dark ? 0xe9859c : 0xdb6f7a, 0.86));
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      group.add(
        this.add.circle(
          Math.cos(angle) * 34,
          Math.sin(angle) * 28,
          index % 2 === 0 ? 4 : 3,
          dark ? 0xd8f4e6 : 0xfff1ad,
          dark ? 0.68 : 0.78
        )
      );
    }
    group.add(
      this.add
        .circle(0, 0, 31, dark ? 0xd8f4e6 : 0xfff1ad, 0)
        .setStrokeStyle(2, dark ? 0xd8f4e6 : 0xfff1ad, dark ? 0.66 : 0.76)
    );
    group.setInteractive(new Phaser.Geom.Circle(0, 0, 54), Phaser.Geom.Circle.Contains);
    group.on('pointerdown', () => {
      this.pet.playAttention();
      this.onSignalRequested();
    });
    this.hostElement.dataset.signalMotion = this.reducedMotion ? 'still' : 'glow';
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: group,
        scale: 1.018,
        alpha: 0.92,
        duration: 3600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.signalGroup = group;
  }

  private drawLensObjects(frame: GardenFrame) {
    if (!this.lensSessionActive || this.pendingSeed) {
      this.lastRevealedLens = null;
      return;
    }

    const placements = createLensObjectPlacements(frame, this.currentLens);
    const lensChanged = this.currentLens !== this.lastRevealedLens;
    const animateReveal = lensChanged && !this.reducedMotion;
    if (animateReveal && this.lastRevealedLens) {
      this.drawLensFarewell(frame, this.lastRevealedLens);
    }
    this.lastRevealedLens = this.currentLens;
    this.drawLensFocusVignette(frame);

    placements.forEach((placement) => {
      const active = this.currentLens === placement.kind;
      const size = placement.size;
      const hitTarget = lensObjectHitTarget(placement);
      const glowY = hitTarget.y - placement.y;
      const group = this.add.container(placement.x, placement.y).setDepth(active ? 620 : 240);
      const dark = this.theme === 'dark';
      if (active) {
        this.hostElement.dataset.activeLensX = (hitTarget.x / this.scale.width).toFixed(4);
        this.hostElement.dataset.activeLensY = (hitTarget.y / this.scale.height).toFixed(4);
        group.setInteractive(
          new Phaser.Geom.Circle(0, glowY, hitTarget.radius),
          Phaser.Geom.Circle.Contains
        );
        group.on('pointerdown', () => {
          this.onLensObjectSelected(placement.kind);
          if (this.pet.wake()) return;
          this.pet.playAttention();
        });
      }
      const glow = dark
        ? this.drawDarkLensGlow(placement.kind, size, glowY, active)
        : this.add.circle(0, glowY, size * 0.42, active ? 0xfff1ad : 0xffffff, active ? 0.2 : 0.06);
      const shadow = this.add.ellipse(
        0,
        placement.shadowY,
        placement.shadowWidth,
        placement.shadowHeight,
        dark ? 0x241a18 : 0x5c4a36,
        dark ? placement.shadowAlpha * 0.72 : placement.shadowAlpha
      );
      group.add([glow, shadow]);
      if (active && dark) {
        this.drawDarkActiveLensInnerFill(group, placement.kind, size, glowY);
        this.drawDarkActiveLensFocusBase(group, placement.kind, size, glowY);
      }
      this.addPropImage(group, `lens-${placement.kind}`, 0, 0, size, placement.anchor);
      if (active) {
        if (dark) {
          this.drawDarkActiveLensOrbit(group, placement.kind, size, glowY);
          this.drawDarkActiveLensMotes(group, placement.kind, size, glowY);
        } else {
          group.add(
            this.add.circle(0, glowY, size * 0.5, 0xfff1ad, 0).setStrokeStyle(2, 0xfff1ad, 0.52)
          );
          this.drawLightActiveLensMotes(group, size, glowY, isCompactGardenFrame(frame));
        }
      }
      if (active && !this.reducedMotion) {
        this.tweens.add({
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
        this.tweens.add({
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

  private drawLensFarewell(frame: GardenFrame, kind: LensKind) {
    const [placement] = createLensObjectPlacements(frame, kind);
    if (!placement) return;

    const group = this.add.container(placement.x, placement.y).setDepth(600);
    const dark = this.theme === 'dark';
    const shadow = this.add.ellipse(
      0,
      placement.shadowY,
      placement.shadowWidth,
      placement.shadowHeight,
      dark ? 0x241a18 : 0x5c4a36,
      dark ? placement.shadowAlpha * 0.72 : placement.shadowAlpha
    );
    group.add(shadow);
    this.addPropImage(group, `lens-${kind}`, 0, 0, placement.size, placement.anchor);
    this.tweens.add({
      targets: group,
      alpha: 0,
      scale: 0.96,
      y: placement.y + 10,
      duration: 360,
      ease: 'Sine.easeIn',
      onComplete: () => group.destroy(),
    });
  }

  private drawAmbientGardenEffects(frame: GardenFrame) {
    const layout = createGardenAmbientLayout(frame, this.reducedMotion);
    this.hostElement.dataset.ambientMotion = layout.motion;
    this.hostElement.dataset.ambientZones = layout.zones;
    this.drawPondShimmer(layout.pondShimmers);
    this.drawPondMotes(layout.pondMotes);
  }

  private drawPondShimmer(shimmers: AmbientEllipse[]) {
    const dark = this.theme === 'dark';
    const color = dark ? 0x8fb5b1 : 0xaecfc7;

    shimmers.forEach((shimmer) => {
      const ripple = this.add
        .ellipse(
          shimmer.x,
          shimmer.y,
          shimmer.width,
          shimmer.height,
          color,
          dark ? shimmer.alpha * 0.96 : shimmer.alpha * 0.82
        )
        .setDepth(88);

      if (!this.reducedMotion) {
        this.tweens.add({
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

  private drawPondMotes(motes: AmbientCircle[]) {
    const dark = this.theme === 'dark';

    motes.forEach((mote, index) => {
      const color = dark
        ? index % 2 === 0
          ? 0xd6bd83
          : 0x9fbfbd
        : index % 2 === 0
          ? 0xf1ddba
          : 0xb8d8cf;
      const circle = this.add.circle(mote.x, mote.y, mote.radius, color, mote.alpha).setDepth(255);

      if (!this.reducedMotion) {
        this.tweens.add({
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

  private drawLensFocusVignette(frame: GardenFrame) {
    const dark = this.theme === 'dark';
    this.add
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

  private drawDarkActiveLensInnerFill(
    group: Phaser.GameObjects.Container,
    kind: LensKind,
    size: number,
    glowY: number
  ) {
    const lighting = DARK_LENS_LIGHTING[kind];
    const fillAlpha = Math.max(0.16, lighting.activeAlpha * 1.35);
    const fill = this.add.circle(
      0,
      glowY,
      size * 0.42,
      lighting.focusColor,
      this.reducedMotion ? fillAlpha * 0.84 : fillAlpha
    );
    group.add(fill);
    if (!this.reducedMotion) {
      this.tweens.add({
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

  private drawDarkActiveLensOrbit(
    group: Phaser.GameObjects.Container,
    kind: LensKind,
    size: number,
    glowY: number
  ) {
    const lighting = DARK_LENS_LIGHTING[kind];
    const orbitAlpha = this.reducedMotion ? 0.42 : 0.5;
    const orbit = this.add
      .circle(0, glowY, size * 0.5, lighting.focusColor, 0)
      .setStrokeStyle(2, lighting.focusColor, orbitAlpha);
    const innerOrbit = this.add
      .circle(-size * 0.03, glowY - size * 0.02, size * 0.38, lighting.moteColor, 0)
      .setStrokeStyle(1, lighting.moteColor, this.reducedMotion ? 0.18 : 0.24);

    group.add([orbit, innerOrbit]);
    if (!this.reducedMotion) {
      this.tweens.add({
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

  private drawDarkLensGlow(kind: LensKind, size: number, glowY: number, active: boolean) {
    const lighting = DARK_LENS_LIGHTING[kind];
    return this.add.ellipse(
      0,
      glowY + size * 0.04,
      size * lighting.glowWidth,
      size * lighting.glowHeight,
      lighting.glowColor,
      active ? lighting.activeAlpha : lighting.inactiveAlpha
    );
  }

  private drawDarkActiveLensFocusBase(
    group: Phaser.GameObjects.Container,
    kind: LensKind,
    size: number,
    glowY: number
  ) {
    const lighting = DARK_LENS_LIGHTING[kind];
    const focus = this.add.ellipse(
      0,
      glowY + size * lighting.focusYOffset,
      size * lighting.focusWidth,
      size * lighting.focusHeight,
      lighting.focusColor,
      this.reducedMotion ? lighting.activeAlpha * 0.78 : lighting.activeAlpha
    );
    const inner = this.add.ellipse(
      -size * 0.04,
      glowY + size * (lighting.focusYOffset - 0.01),
      size * lighting.focusWidth * 0.52,
      size * lighting.focusHeight * 0.46,
      lighting.moteColor,
      this.reducedMotion ? 0.08 : 0.11
    );
    group.add([focus, inner]);
    if (!this.reducedMotion) {
      this.tweens.add({
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

  private drawDarkActiveLensMotes(
    group: Phaser.GameObjects.Container,
    kind: LensKind,
    size: number,
    glowY: number
  ) {
    const lighting = DARK_LENS_LIGHTING[kind];
    const motes = [
      this.add.circle(
        -size * 0.36,
        glowY - size * 0.18,
        Math.max(1.4, size * 0.018),
        lighting.moteColor,
        0.3
      ),
      this.add.circle(
        size * 0.28,
        glowY - size * 0.12,
        Math.max(1.2, size * 0.014),
        lighting.focusColor,
        0.24
      ),
      this.add.circle(
        size * 0.1,
        glowY - size * 0.28,
        Math.max(1.1, size * 0.012),
        lighting.moteColor,
        0.21
      ),
    ];
    group.add(motes);
    if (!this.reducedMotion) {
      motes.forEach((mote, index) => {
        this.tweens.add({
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

  private drawLightActiveLensMotes(
    group: Phaser.GameObjects.Container,
    size: number,
    glowY: number,
    compact: boolean
  ) {
    const motes = createLensAmbientMotes(size, glowY, compact).map((mote, index) =>
      this.add.circle(
        mote.x,
        mote.y,
        mote.radius,
        index % 2 === 0 ? 0xf1ddba : 0xb8d8cf,
        mote.alpha
      )
    );
    group.add(motes);

    if (!this.reducedMotion) {
      motes.forEach((mote, index) => {
        const config = createLensAmbientMotes(size, glowY, compact)[index];
        this.tweens.add({
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

  private drawPendingSeed(width: number, height: number, frame: GardenFrame) {
    if (!this.pendingSeed) return;

    const emptyPlot = this.emptyPlots().find((plot) => plot.x >= 0.55) ?? this.emptyPlots()[0];
    const startPoint = pendingSeedStartPoint(frame, emptyPlot ?? null);
    const startX = startPoint.x;
    const startY =
      width < 560
        ? startPoint.y
        : emptyPlot
          ? Math.max(height * 0.48, startPoint.y - this.gardenSize(frame, 118, { max: 148 }))
          : startPoint.y;
    const group = this.add.container(startX, startY).setDepth(470);
    this.drawSeed(group, this.pendingSeed);
    group.setScale(width < 560 ? 1.55 : 1.28);
    group.setInteractive(new Phaser.Geom.Circle(0, -14, 46), Phaser.Geom.Circle.Contains);
    this.input.setDraggable(group);
    group.on('pointerdown', () => {
      this.isPendingSeedDragging = true;
    });
    this.pendingSeedGroup = group;
  }

  private drawPet(frame: GardenFrame) {
    const { x, y } = visibleGardenPoint(frame, 0.24, 0.73);
    const group = this.add.container(x, y).setDepth(500);
    group.setInteractive(
      new Phaser.Geom.Ellipse(
        PET_INTERACTION_OFFSET.x,
        PET_INTERACTION_OFFSET.y,
        PET_INTERACTION_SIZE.width,
        PET_INTERACTION_SIZE.height
      ),
      Phaser.Geom.Ellipse.Contains
    );
    group.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const seed = this.seedUnderPointer(pointer);
      if (seed) {
        this.onSeedSelected(seed);
        return;
      }

      this.onPetTapped();
      if (this.pet.wake()) return;
      this.pet.playFriendly();
    });

    const idleTexture = textureKeyForTheme('companion-idle', this.theme);
    const sprite = this.add.image(0, 0, idleTexture).setOrigin(0.5, 1);
    const targetHeight = this.gardenSize(frame, 150, { min: 150, max: 235 });
    if (this.theme === 'dark') {
      group.add(
        this.add.ellipse(0, -46, targetHeight * 0.72, targetHeight * 0.82, 0xf1bd79, 0.055)
      );
      group.add(this.add.ellipse(0, -4, targetHeight * 0.66, targetHeight * 0.11, 0x241a18, 0.18));
    }
    this.drawPetAmbient(group, targetHeight, isCompactGardenFrame(frame));
    sprite.setScale(targetHeight / sprite.height);
    group.add(sprite);

    this.pet.attach(group, sprite, sprite.scaleX, sprite.scaleY);
    this.pet.restoreAfterDraw();
    this.pet.startIdleBreathing();
    if (!this.petDebug) {
      this.pet.startLivingLoop();
    }
  }

  private drawPetAmbient(
    group: Phaser.GameObjects.Container,
    targetHeight: number,
    compact: boolean
  ) {
    const dark = this.theme === 'dark';
    const layout = createPetAmbientLayout(targetHeight, compact);
    const ground = this.add.ellipse(
      layout.ground.x,
      layout.ground.y,
      layout.ground.width,
      layout.ground.height,
      dark ? 0xd6bd83 : 0xf1ddba,
      dark ? layout.ground.alpha * 0.86 : layout.ground.alpha * 0.74
    );
    group.add(ground);

    if (!this.reducedMotion) {
      this.tweens.add({
        targets: ground,
        alpha: layout.ground.alpha * 0.36,
        scaleX: 1.045,
        duration: layout.ground.durationMs,
        delay: layout.ground.delayMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    layout.motes.forEach((mote, index) => {
      const circle = this.add.circle(
        mote.x,
        mote.y,
        mote.radius,
        dark ? 0xd6bd83 : index % 2 === 0 ? 0xf1ddba : 0xb8d8cf,
        mote.alpha
      );
      group.add(circle);

      if (!this.reducedMotion) {
        this.tweens.add({
          targets: circle,
          y: mote.y + mote.driftY,
          alpha: mote.alpha * 0.42,
          duration: mote.durationMs,
          delay: mote.delayMs,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  private tryPlantPendingSeed() {
    if (!this.pendingSeedGroup) return;

    const width = this.scale.width || 720;
    const height = this.scale.height || 520;
    const frame = createGardenFrame(width, height);
    const plot = this.nearestEmptyPlot(this.pendingSeedGroup.x, this.pendingSeedGroup.y);
    if (!plot) {
      const emptyPlot = this.emptyPlots()[0];
      const point = pendingSeedStartPoint(frame, emptyPlot ?? null);
      this.tweens.add({
        targets: this.pendingSeedGroup,
        x: point.x,
        y:
          width < 560
            ? point.y
            : emptyPlot
              ? Math.max(height * 0.48, point.y - this.gardenSize(frame, 118, { max: 148 }))
              : point.y,
        duration: this.reducedMotion ? 1 : 240,
        ease: 'Sine.easeOut',
      });
      return;
    }

    this.plantAtPlot(plot);
    this.pet.playHeadButt();
  }

  private seedUnderPointer(pointer: Phaser.Input.Pointer): ReflectionSeed | null {
    const pointerX = pointer.worldX ?? pointer.x;
    const pointerY = pointer.worldY ?? pointer.y;

    for (let index = this.seedGroups.length - 1; index >= 0; index -= 1) {
      const group = this.seedGroups[index];
      const seedId = group.getData('seedId') as string | undefined;
      if (!seedId) continue;

      const scale = Math.max(group.scaleX, group.scaleY, 1);
      const dx = pointerX - group.x;
      const dy = pointerY - (group.y - 28 * scale);
      const radiusX = 36 * scale;
      const radiusY = 48 * scale;
      const insideSeed = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1;
      if (insideSeed) {
        return this.state.seeds.find((seed) => seed.id === seedId) ?? null;
      }
    }

    return null;
  }

  private emptyPlots() {
    return availableGardenPlots(
      this.state.seeds,
      this.scale.width || 720,
      this.scale.height || 520
    );
  }

  private nearestEmptyPlot(x: number, y: number) {
    const width = this.scale.width || 720;
    const height = this.scale.height || 520;
    const frame = createGardenFrame(width, height);
    const emptyPlots = this.emptyPlots();
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

  private plantAtPlot(plot: GardenPlot) {
    this.hostElement.dataset.selectedPlot = plot.id;
    this.onPendingSeedPlanted({ plotId: plot.id, x: plot.x, y: plot.y });
  }

  private animateNewestSeed() {
    const newestSeedGroup = this.seedGroups[0];
    if (!newestSeedGroup) return;

    this.pet.playPlantProud();
    if (this.reducedMotion) return;

    this.tweens.killTweensOf(newestSeedGroup);
    const settledScale = newestSeedGroup.scaleX;
    newestSeedGroup.setScale(settledScale * 1.2);
    this.drawPlantingBurst(newestSeedGroup.x, newestSeedGroup.y);
    this.tweens.add({
      targets: newestSeedGroup,
      scale: settledScale,
      duration: 360,
      ease: 'Back.easeOut',
    });
  }

  private animateWateredSeed() {
    if (
      !this.lastWateringEvent ||
      this.lastAnimatedWateringEventId === this.lastWateringEvent.eventId
    )
      return;

    const seedGroup = this.seedGroups.find(
      (group) => group.getData('seedId') === this.lastWateringEvent?.seedId
    );
    if (!seedGroup) return;

    this.lastAnimatedWateringEventId = this.lastWateringEvent.eventId;
    this.hostElement.dataset.wateredSeed = this.lastWateringEvent.seedId;
    this.hostElement.dataset.wateringEvent = this.lastWateringEvent.eventId;
    if (this.reducedMotion) {
      const shimmer = this.add
        .circle(seedGroup.x, seedGroup.y - 18, 34, 0x8bc6c3, 0.18)
        .setDepth(478);
      this.time.delayedCall(650, () => shimmer.destroy());
      return;
    }

    this.tweens.killTweensOf(seedGroup);
    const settledScale = seedGroup.scaleX;
    this.drawWateringBurst(seedGroup.x, seedGroup.y);
    this.tweens.add({
      targets: seedGroup,
      scale: settledScale * 1.08,
      duration: 180,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  private drawPlantingBurst(x: number, y: number) {
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10;
      const particle = this.add
        .circle(x, y - 14, 4, index % 2 === 0 ? 0xfff1ad : 0xdb6f7a, 0.72)
        .setDepth(480);
      this.tweens.add({
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

  private drawWateringBurst(x: number, y: number) {
    for (let index = 0; index < 8; index += 1) {
      const offset = (index - 3.5) * 8;
      const droplet = this.add.ellipse(x + offset, y - 64, 7, 12, 0x8bc6c3, 0.82).setDepth(480);
      this.tweens.add({
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

  private seedPropKey(seed: ReflectionSeed): string {
    const growthStage = growthStageForSeed(seed);
    if (growthStage === 'seed') return 'prop-seed';
    if (growthStage === 'sprout') return 'prop-sprout';
    if (growthStage === 'growing') return 'prop-bud';
    return 'prop-flower';
  }

  private addPropImage(
    group: Phaser.GameObjects.Container,
    textureKey: string,
    x: number,
    y: number,
    maxSize: number,
    anchor: LensPropAnchor = 'center'
  ): Phaser.GameObjects.Image {
    const themedTextureKey = textureKeyForTheme(textureKey, this.theme);
    const image = this.add
      .image(x, y, themedTextureKey)
      .setOrigin(0.5, anchor === 'center' ? 0.5 : 1);
    image.setScale(maxSize / Math.max(image.width, image.height));
    group.add(image);
    return image;
  }
}
