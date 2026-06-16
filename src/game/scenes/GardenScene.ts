import Phaser from 'phaser';
import type { GardenState, LensKind, ReflectionSeed } from '../../../shared/models';
import type { ActiveTheme } from '../../domain/theme';
import {
  createGardenFrame,
  PET_INTERACTION_OFFSET,
  PET_INTERACTION_SIZE,
  visibleGardenPoint,
  type GardenFrame,
  type LensPropAnchor,
} from '../gardenLayout';
import { preloadGardenTextures, textureKeyForTheme } from '../assets';
import { createPetAmbientLayout, isCompactGardenFrame } from '../gardenEffects';
import { PetController } from '../PetController';
import type { PetFrameId, PetSequenceId } from '../petAnimation';
import {
  animateNewestSeed,
  animateWateredSeed,
  drawSeeds,
  seedUnderPointer,
  type SeedRendererContext,
} from './seedRenderer';
import {
  clearPlantingRendererState,
  dragPendingSeed,
  drawPendingSeed,
  drawPlantingPlots,
  drawSoilTarget,
  endPendingSeedDrag,
  movePendingSeedDrag,
  tryPlantPendingSeed,
  type PlantingPosition,
  type PlantingRendererContext,
  type PlantingRendererState,
} from './plantingRenderer';
import {
  drawLensObjects,
  type LensObjectRendererContext,
  type LensObjectRendererState,
} from './lensObjectRenderer';
import { drawAmbientGardenEffects, type AmbienceRendererContext } from './ambienceRenderer';
import { drawGardenLandmarks, type LandmarkRendererContext } from './landmarkRenderer';
import { clearGardenHostDataset } from './sceneDataset';

export type { PlantingPosition } from './plantingRenderer';
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

export type GardenSceneUpdate = Pick<
  GardenSceneOptions,
  | 'state'
  | 'reducedMotion'
  | 'theme'
  | 'pendingSeed'
  | 'currentLens'
  | 'lensSessionActive'
  | 'lastWateringEvent'
>;

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
  private readonly plantingState: PlantingRendererState = {
    isPendingSeedDragging: false,
    pendingSeedDropHandled: false,
  };
  private readonly lensObjectState: LensObjectRendererState = { lastRevealedLens: null };
  private previousSeedCount = 0;
  private seedGroups: Phaser.GameObjects.Container[] = [];
  private signalGroup?: Phaser.GameObjects.Container;
  private readonly handleResize = () => this.draw();

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
        dragPendingSeed(this.plantingState, gameObject, dragX, dragY);
      }
    );
    this.input.on('dragend', () =>
      tryPlantPendingSeed(this.plantingRendererContext(), this.plantingState)
    );
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) =>
      movePendingSeedDrag(this.plantingState, pointer)
    );
    this.input.on('pointerup', () =>
      endPendingSeedDrag(this.plantingRendererContext(), this.plantingState)
    );
    this.scale.on('resize', this.handleResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownScene, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdownScene, this);
    this.draw();
  }

  setGardenState(update: GardenSceneUpdate) {
    const previousSeedCount = this.previousSeedCount;
    const previousTheme = this.theme;
    this.state = update.state;
    this.reducedMotion = update.reducedMotion;
    this.theme = update.theme;
    this.pendingSeed = update.pendingSeed;
    this.currentLens = update.currentLens;
    this.lensSessionActive = update.lensSessionActive;
    this.lastWateringEvent = update.lastWateringEvent;
    this.previousSeedCount = update.state.seeds.length;
    if (this.sys.isActive()) {
      this.draw();
      if (previousTheme === update.theme) {
        if (update.state.seeds.length > previousSeedCount) {
          animateNewestSeed(this.seedRendererContext(), this.seedGroups, this.pet);
        }
        const animatedWateringEventId = animateWateredSeed(
          this.seedRendererContext(),
          this.seedGroups
        );
        if (animatedWateringEventId) {
          this.lastAnimatedWateringEventId = animatedWateringEventId;
        }
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
    drawGardenLandmarks(this.landmarkRendererContext(), frame);
    drawSoilTarget(this.plantingRendererContext(), frame);
    this.seedGroups = drawSeeds(this.seedRendererContext(), width, height, frame);
    drawPlantingPlots(this.plantingRendererContext(), width, height);
    this.drawSignal(frame);
    drawAmbientGardenEffects(this.ambienceRendererContext(), frame);
    drawLensObjects(this.lensObjectRendererContext(), this.lensObjectState, frame);
    drawPendingSeed(this.plantingRendererContext(), this.plantingState, width, height, frame);
    this.drawPet(frame);
  }

  private clearScene() {
    clearGardenHostDataset(this.hostElement);
    this.pet.detach();
    this.children.removeAll(true);
    this.seedGroups = [];
    clearPlantingRendererState(this.plantingState);
    this.signalGroup = undefined;
  }

  private shutdownScene() {
    this.scale.off('resize', this.handleResize);
    clearGardenHostDataset(this.hostElement);
    this.pet.detach();
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

  private seedRendererContext(): SeedRendererContext {
    return {
      scene: this,
      state: this.state,
      theme: this.theme,
      reducedMotion: this.reducedMotion,
      hostElement: this.hostElement,
      lastWateringEvent: this.lastWateringEvent,
      lastAnimatedWateringEventId: this.lastAnimatedWateringEventId,
      onSeedSelected: this.onSeedSelected,
      addPropImage: (group, textureKey, x, y, maxSize, anchor) =>
        this.addPropImage(group, textureKey, x, y, maxSize, anchor),
    };
  }

  private plantingRendererContext(): PlantingRendererContext {
    return {
      scene: this,
      state: this.state,
      theme: this.theme,
      reducedMotion: this.reducedMotion,
      pendingSeed: this.pendingSeed,
      hostElement: this.hostElement,
      onPendingSeedPlanted: this.onPendingSeedPlanted,
      onPlantingFeedback: () => this.pet.playHeadButt(),
      addPropImage: (group, textureKey, x, y, maxSize, anchor) =>
        this.addPropImage(group, textureKey, x, y, maxSize, anchor),
    };
  }

  private lensObjectRendererContext(): LensObjectRendererContext {
    return {
      scene: this,
      theme: this.theme,
      reducedMotion: this.reducedMotion,
      pendingSeed: this.pendingSeed,
      currentLens: this.currentLens,
      lensSessionActive: this.lensSessionActive,
      hostElement: this.hostElement,
      onLensObjectSelected: this.onLensObjectSelected,
      wakePet: () => this.pet.wake(),
      playPetAttention: () => this.pet.playAttention(),
      addPropImage: (group, textureKey, x, y, maxSize, anchor) =>
        this.addPropImage(group, textureKey, x, y, maxSize, anchor),
    };
  }

  private ambienceRendererContext(): AmbienceRendererContext {
    return {
      scene: this,
      theme: this.theme,
      reducedMotion: this.reducedMotion,
      hostElement: this.hostElement,
    };
  }

  private landmarkRendererContext(): LandmarkRendererContext {
    return {
      scene: this,
      state: this.state,
      theme: this.theme,
      reducedMotion: this.reducedMotion,
      addPropImage: (group, textureKey, x, y, maxSize, anchor) =>
        this.addPropImage(group, textureKey, x, y, maxSize, anchor),
    };
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
      const seed = seedUnderPointer(this.seedGroups, this.state.seeds, pointer);
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
