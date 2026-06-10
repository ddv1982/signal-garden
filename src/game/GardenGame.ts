import Phaser from 'phaser';
import type { GardenPlot, GardenState, LensKind, ReflectionSeed } from '../../shared/models';
import type { ActiveTheme } from '../domain/theme';
import { growthStageForSeed } from '../domain/seedGrowth';
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
  type LensPropAnchor
} from './gardenLayout';
import blinkSleepyUrl from '../assets/companion/frames/blink-sleepy.png';
import curiousLeanUrl from '../assets/companion/frames/curious-lean.png';
import groomUrl from '../assets/companion/frames/groom.png';
import headbuttContactUrl from '../assets/companion/frames/headbutt-contact.png';
import headbuttWindupUrl from '../assets/companion/frames/headbutt-windup.png';
import idleSitUrl from '../assets/companion/frames/idle-sit.png';
import napCurlUrl from '../assets/companion/frames/nap-curl.png';
import plantProudUrl from '../assets/companion/frames/plant-proud.png';
import settleBackUrl from '../assets/companion/frames/settle-back.png';
import sleepingUrl from '../assets/companion/frames/sleeping.png';
import stretchUrl from '../assets/companion/frames/stretch.png';
import wakeUrl from '../assets/companion/frames/wake.png';
import blinkSleepyDarkUrl from '../assets/companion/frames-dark/blink-sleepy.png';
import curiousLeanDarkUrl from '../assets/companion/frames-dark/curious-lean.png';
import groomDarkUrl from '../assets/companion/frames-dark/groom.png';
import headbuttContactDarkUrl from '../assets/companion/frames-dark/headbutt-contact.png';
import headbuttWindupDarkUrl from '../assets/companion/frames-dark/headbutt-windup.png';
import idleSitDarkUrl from '../assets/companion/frames-dark/idle-sit.png';
import napCurlDarkUrl from '../assets/companion/frames-dark/nap-curl.png';
import plantProudDarkUrl from '../assets/companion/frames-dark/plant-proud.png';
import settleBackDarkUrl from '../assets/companion/frames-dark/settle-back.png';
import sleepingDarkUrl from '../assets/companion/frames-dark/sleeping.png';
import stretchDarkUrl from '../assets/companion/frames-dark/stretch.png';
import wakeDarkUrl from '../assets/companion/frames-dark/wake.png';
import gardenBackgroundUrl from '../assets/garden/background-v4.webp';
import gardenBackgroundDarkUrl from '../assets/garden/background-dark.jpg';
import budUrl from '../assets/garden/props/bud.png';
import dreamStoneUrl from '../assets/garden/props/dream-stone.png';
import flowerUrl from '../assets/garden/props/flower.png';
import lanternUrl from '../assets/garden/props/lantern.png';
import seedUrl from '../assets/garden/props/seed.png';
import soilPatchUrl from '../assets/garden/props/soil-patch.png';
import sproutUrl from '../assets/garden/props/sprout.png';
import vineUrl from '../assets/garden/props/vine.png';
import budDarkUrl from '../assets/garden/props-dark/bud.png';
import dreamStoneDarkUrl from '../assets/garden/props-dark/dream-stone.png';
import flowerDarkUrl from '../assets/garden/props-dark/flower.png';
import lanternDarkUrl from '../assets/garden/props-dark/lantern.png';
import seedDarkUrl from '../assets/garden/props-dark/seed.png';
import soilPatchDarkUrl from '../assets/garden/props-dark/soil-patch.png';
import sproutDarkUrl from '../assets/garden/props-dark/sprout.png';
import vineDarkUrl from '../assets/garden/props-dark/vine.png';
import actionBasketUrl from '../assets/lenses/props/action-basket.png';
import bodyRippleUrl from '../assets/lenses/props/body-ripple.png';
import emotionLanternUrl from '../assets/lenses/props/emotion-lantern.png';
import imageCloudUrl from '../assets/lenses/props/image-cloud.png';
import meaningGateUrl from '../assets/lenses/props/meaning-gate.png';
import observerPoolUrl from '../assets/lenses/props/observer-pool.png';
import wordStonesUrl from '../assets/lenses/props/word-stones.png';
import actionBasketDarkUrl from '../assets/lenses/props-dark/action-basket.png';
import bodyRippleDarkUrl from '../assets/lenses/props-dark/body-ripple.png';
import emotionLanternDarkUrl from '../assets/lenses/props-dark/emotion-lantern.png';
import imageCloudDarkUrl from '../assets/lenses/props-dark/image-cloud.png';
import meaningGateDarkUrl from '../assets/lenses/props-dark/meaning-gate.png';
import observerPoolDarkUrl from '../assets/lenses/props-dark/observer-pool.png';
import wordStonesDarkUrl from '../assets/lenses/props-dark/word-stones.png';
import petAnimationManifest from '../assets/companion/companion.animations.json';

type PetAnimationState =
  | 'idle'
  | 'blink'
  | 'curious'
  | 'headButt'
  | 'stretch'
  | 'groom'
  | 'napStart'
  | 'sleep'
  | 'wake'
  | 'plantProud'
  | 'attention';

const PET_FRAME_TEXTURES = {
  idle: 'companion-idle',
  curious: 'companion-curious',
  headbuttWindup: 'companion-headbutt-windup',
  headbuttContact: 'companion-headbutt-contact',
  settleBack: 'companion-settle-back',
  blinkSleepy: 'companion-blink-sleepy',
  stretch: 'companion-stretch',
  groom: 'companion-groom',
  napCurl: 'companion-nap-curl',
  sleeping: 'companion-sleeping',
  wake: 'companion-wake',
  plantProud: 'companion-plant-proud'
} as const;

export type PetFrameId = keyof typeof PET_FRAME_TEXTURES;

const PET_FRAME_OFFSETS = petAnimationManifest.frameOffsets as Record<PetFrameId, { x: number; y: number }>;

type PetClipMotion =
  | 'blink'
  | 'look'
  | 'lookSettle'
  | 'headButtWindup'
  | 'headButtContact'
  | 'settle'
  | 'stretch'
  | 'groom'
  | 'nap'
  | 'sleep'
  | 'wake'
  | 'proud';

type PetClipStep = {
  frame: PetFrameId;
  durationMs: number;
  motion?: PetClipMotion;
};

const PET_SEQUENCES = {
  attention: [
    { frame: 'idle', durationMs: 90 },
    { frame: 'curious', durationMs: 520, motion: 'look' },
    { frame: 'idle', durationMs: 240, motion: 'lookSettle' }
  ],
  headButt: [
    { frame: 'curious', durationMs: 150, motion: 'look' },
    { frame: 'headbuttWindup', durationMs: 260, motion: 'headButtWindup' },
    { frame: 'headbuttContact', durationMs: 290, motion: 'headButtContact' },
    { frame: 'settleBack', durationMs: 360, motion: 'settle' },
    { frame: 'idle', durationMs: 260, motion: 'lookSettle' }
  ],
  stretch: [
    { frame: 'curious', durationMs: 140, motion: 'look' },
    { frame: 'stretch', durationMs: 920, motion: 'stretch' },
    { frame: 'settleBack', durationMs: 320, motion: 'settle' },
    { frame: 'idle', durationMs: 260, motion: 'lookSettle' }
  ],
  groom: [
    { frame: 'curious', durationMs: 120, motion: 'look' },
    { frame: 'groom', durationMs: 560, motion: 'groom' },
    { frame: 'blinkSleepy', durationMs: 150, motion: 'blink' },
    { frame: 'groom', durationMs: 500, motion: 'groom' },
    { frame: 'settleBack', durationMs: 220, motion: 'settle' },
    { frame: 'idle', durationMs: 260, motion: 'lookSettle' }
  ],
  sleep: [
    { frame: 'blinkSleepy', durationMs: 300, motion: 'blink' },
    { frame: 'idle', durationMs: 180 },
    { frame: 'blinkSleepy', durationMs: 380, motion: 'blink' },
    { frame: 'napCurl', durationMs: 900, motion: 'nap' },
    { frame: 'sleeping', durationMs: 1200, motion: 'sleep' }
  ],
  wake: [
    { frame: 'wake', durationMs: 520, motion: 'wake' },
    { frame: 'blinkSleepy', durationMs: 120, motion: 'blink' },
    { frame: 'curious', durationMs: 320, motion: 'look' },
    { frame: 'idle', durationMs: 280, motion: 'lookSettle' }
  ],
  plantProud: [
    { frame: 'curious', durationMs: 150, motion: 'look' },
    { frame: 'headbuttContact', durationMs: 190, motion: 'headButtContact' },
    { frame: 'plantProud', durationMs: 620, motion: 'proud' },
    { frame: 'idle', durationMs: 300, motion: 'lookSettle' }
  ],
} satisfies Record<string, PetClipStep[]>;

export type PetSequenceId = keyof typeof PET_SEQUENCES;

const PET_SEQUENCE_FINAL_STATES: Record<PetSequenceId, PetAnimationState> = {
  attention: 'idle',
  headButt: 'idle',
  stretch: 'idle',
  groom: 'idle',
  sleep: 'sleep',
  wake: 'idle',
  plantProud: 'idle'
};

type PlantingPosition = { plotId: string; x: number; y: number };
type WateringEvent = { seedId: string; eventId: string };
type PropAnchor = LensPropAnchor;

function textureKeyForTheme(textureKey: string, theme: ActiveTheme) {
  return theme === 'dark' ? `${textureKey}-dark` : textureKey;
}

type LensLighting = {
  glowColor: number;
  focusColor: number;
  moteColor: number;
  inactiveAlpha: number;
  activeAlpha: number;
  glowWidth: number;
  glowHeight: number;
  focusWidth: number;
  focusHeight: number;
  focusYOffset: number;
};

const DARK_LENS_LIGHTING: Record<LensKind, LensLighting> = {
  word: { glowColor: 0xaac9bf, focusColor: 0xe0e9d4, moteColor: 0xc6eee1, inactiveAlpha: 0.03, activeAlpha: 0.095, glowWidth: 0.78, glowHeight: 0.32, focusWidth: 0.72, focusHeight: 0.24, focusYOffset: 0.18 },
  body: { glowColor: 0x8fd9de, focusColor: 0xc8f3ee, moteColor: 0xbaedf0, inactiveAlpha: 0.04, activeAlpha: 0.115, glowWidth: 0.9, glowHeight: 0.34, focusWidth: 0.9, focusHeight: 0.24, focusYOffset: 0.16 },
  emotion: { glowColor: 0xf0b565, focusColor: 0xffd08a, moteColor: 0xffd8a2, inactiveAlpha: 0.05, activeAlpha: 0.14, glowWidth: 0.68, glowHeight: 0.42, focusWidth: 0.62, focusHeight: 0.3, focusYOffset: 0.18 },
  image: { glowColor: 0xbfd2df, focusColor: 0xe6edf2, moteColor: 0xdcebf1, inactiveAlpha: 0.03, activeAlpha: 0.085, glowWidth: 0.86, glowHeight: 0.34, focusWidth: 0.78, focusHeight: 0.26, focusYOffset: 0.17 },
  observer: { glowColor: 0x85d8df, focusColor: 0xcaf2f0, moteColor: 0xb8eeee, inactiveAlpha: 0.035, activeAlpha: 0.1, glowWidth: 0.9, glowHeight: 0.32, focusWidth: 0.84, focusHeight: 0.24, focusYOffset: 0.16 },
  meaning: { glowColor: 0xb7d5c4, focusColor: 0xd6edd4, moteColor: 0xc9edc8, inactiveAlpha: 0.035, activeAlpha: 0.105, glowWidth: 0.74, glowHeight: 0.42, focusWidth: 0.68, focusHeight: 0.3, focusYOffset: 0.18 },
  action: { glowColor: 0xe6be78, focusColor: 0xf0d39a, moteColor: 0xf2d7a2, inactiveAlpha: 0.035, activeAlpha: 0.105, glowWidth: 0.78, glowHeight: 0.34, focusWidth: 0.7, focusHeight: 0.25, focusYOffset: 0.17 }
};

export type GardenGameOptions = {
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

export type GardenGameHandle = {
  update(
    state: GardenState,
    reducedMotion: boolean,
    theme: ActiveTheme,
    pendingSeed: ReflectionSeed | null,
    currentLens: LensKind | null,
    lensSessionActive: boolean,
    lastWateringEvent: WateringEvent | null
  ): void;
  playHeadButt(): void;
  previewPetFrame(frame: PetFrameId): void;
  previewPetSequence(sequence: PetSequenceId): void;
  destroy(): void;
};

export function createGardenGame(options: GardenGameOptions): GardenGameHandle {
  const scene = new BrowserGardenScene(options);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    backgroundColor: options.theme === 'dark' ? '#10201f' : '#f7ead7',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: options.parent.clientWidth || 720,
      height: options.parent.clientHeight || 520
    },
    scene
  });

  return {
    update(state, reducedMotion, theme, pendingSeed, currentLens, lensSessionActive, lastWateringEvent) {
      scene.setGardenState(state, reducedMotion, theme, pendingSeed, currentLens, lensSessionActive, lastWateringEvent);
    },
    playHeadButt() {
      scene.playHeadButt();
    },
    previewPetFrame(frame) {
      scene.previewPetFrame(frame);
    },
    previewPetSequence(sequence) {
      scene.previewPetSequence(sequence);
    },
    destroy() {
      game.destroy(true);
    }
  };
}

class BrowserGardenScene extends Phaser.Scene {
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
  private petGroup?: Phaser.GameObjects.Container;
  private petSprite?: Phaser.GameObjects.Image;
  private petBaseScaleX = 1;
  private petBaseScaleY = 1;
  private isPendingSeedDragging = false;
  private pendingSeedGroup?: Phaser.GameObjects.Container;
  private previousSeedCount = 0;
  private petSequenceId = 0;
  private petPostureEvent?: Phaser.Time.TimerEvent;
  private petSleepEvent?: Phaser.Time.TimerEvent;
  private petBreathingTween?: Phaser.Tweens.Tween;
  private petState: PetAnimationState = 'idle';
  private petDebugFrame?: PetFrameId;
  private petLifeStarted = false;
  private quietSince = 0;
  private isPetSleeping = false;
  private lastPostureAction: PetAnimationState | null = null;
  private seedGroups: Phaser.GameObjects.Container[] = [];
  private signalGroup?: Phaser.GameObjects.Container;
  private gardenPlots: GardenPlot[] = [];

  constructor(options: GardenGameOptions) {
    super('BrowserGardenScene');
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
  }

  preload() {
    this.load.image('garden-background-v4', gardenBackgroundUrl);
    this.load.image('garden-background-v4-dark', gardenBackgroundDarkUrl);
    this.load.image('prop-bud', budUrl);
    this.load.image('prop-dream-stone', dreamStoneUrl);
    this.load.image('prop-flower', flowerUrl);
    this.load.image('prop-lantern', lanternUrl);
    this.load.image('prop-seed', seedUrl);
    this.load.image('prop-soil-patch', soilPatchUrl);
    this.load.image('prop-sprout', sproutUrl);
    this.load.image('prop-vine', vineUrl);
    this.load.image('prop-bud-dark', budDarkUrl);
    this.load.image('prop-dream-stone-dark', dreamStoneDarkUrl);
    this.load.image('prop-flower-dark', flowerDarkUrl);
    this.load.image('prop-lantern-dark', lanternDarkUrl);
    this.load.image('prop-seed-dark', seedDarkUrl);
    this.load.image('prop-soil-patch-dark', soilPatchDarkUrl);
    this.load.image('prop-sprout-dark', sproutDarkUrl);
    this.load.image('prop-vine-dark', vineDarkUrl);
    this.load.image('companion-idle', idleSitUrl);
    this.load.image('companion-curious', curiousLeanUrl);
    this.load.image('companion-headbutt-windup', headbuttWindupUrl);
    this.load.image('companion-headbutt-contact', headbuttContactUrl);
    this.load.image('companion-settle-back', settleBackUrl);
    this.load.image('companion-blink-sleepy', blinkSleepyUrl);
    this.load.image('companion-stretch', stretchUrl);
    this.load.image('companion-groom', groomUrl);
    this.load.image('companion-nap-curl', napCurlUrl);
    this.load.image('companion-sleeping', sleepingUrl);
    this.load.image('companion-wake', wakeUrl);
    this.load.image('companion-plant-proud', plantProudUrl);
    this.load.image('companion-idle-dark', idleSitDarkUrl);
    this.load.image('companion-curious-dark', curiousLeanDarkUrl);
    this.load.image('companion-headbutt-windup-dark', headbuttWindupDarkUrl);
    this.load.image('companion-headbutt-contact-dark', headbuttContactDarkUrl);
    this.load.image('companion-settle-back-dark', settleBackDarkUrl);
    this.load.image('companion-blink-sleepy-dark', blinkSleepyDarkUrl);
    this.load.image('companion-stretch-dark', stretchDarkUrl);
    this.load.image('companion-groom-dark', groomDarkUrl);
    this.load.image('companion-nap-curl-dark', napCurlDarkUrl);
    this.load.image('companion-sleeping-dark', sleepingDarkUrl);
    this.load.image('companion-wake-dark', wakeDarkUrl);
    this.load.image('companion-plant-proud-dark', plantProudDarkUrl);
    this.load.image('lens-word', wordStonesUrl);
    this.load.image('lens-body', bodyRippleUrl);
    this.load.image('lens-emotion', emotionLanternUrl);
    this.load.image('lens-image', imageCloudUrl);
    this.load.image('lens-observer', observerPoolUrl);
    this.load.image('lens-meaning', meaningGateUrl);
    this.load.image('lens-action', actionBasketUrl);
    this.load.image('lens-word-dark', wordStonesDarkUrl);
    this.load.image('lens-body-dark', bodyRippleDarkUrl);
    this.load.image('lens-emotion-dark', emotionLanternDarkUrl);
    this.load.image('lens-image-dark', imageCloudDarkUrl);
    this.load.image('lens-observer-dark', observerPoolDarkUrl);
    this.load.image('lens-meaning-dark', meaningGateDarkUrl);
    this.load.image('lens-action-dark', actionBasketDarkUrl);
  }

  create() {
    this.quietSince = this.time.now;
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      if (gameObject === this.pendingSeedGroup) {
        this.pendingSeedGroup.setPosition(dragX, dragY);
      }
    });
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
    if (!this.petGroup) return;

    this.petSequenceId += 1;
    this.stopPetMotionTweens();
    this.petDebugFrame = frame;
    this.isPetSleeping = frame === 'sleeping' || frame === 'napCurl';
    this.setPetFrame(frame);
    this.setPetState(frame === 'sleeping' ? 'sleep' : 'attention');
    this.hostElement.dataset.petDebugPreview = frame;
  }

  previewPetSequence(sequence: PetSequenceId) {
    if (!this.petGroup) return;

    this.stopPetMotionTweens();
    this.petDebugFrame = undefined;
    this.hostElement.dataset.petDebugPreview = sequence;
    this.setPetState(sequence === 'sleep' ? 'napStart' : 'attention');
    this.playPetFrameSequence(PET_SEQUENCES[sequence], {
      finalState: PET_SEQUENCE_FINAL_STATES[sequence],
      keepSleeping: sequence === 'sleep'
    });
  }

  playHeadButt() {
    if (!this.petGroup) return;

    if (this.isPetSleeping) {
      this.playWakeAnimation();
      return;
    }
    this.markPetInteraction();
    this.setPetState('headButt');
    const petGroup = this.petGroup;
    this.stopPetMotionTweens();
    if (this.reducedMotion) {
      this.setPetFrame('headbuttContact');
      petGroup.rotation = -0.04;
      this.time.delayedCall(180, () => {
        if (this.petGroup === petGroup) {
          petGroup.rotation = 0;
          this.setPetFrame('idle');
          this.setPetState('idle');
        }
      });
      return;
    }

    this.playPetFrameSequence(PET_SEQUENCES.headButt, { finalState: 'idle' });
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
    this.drawLensObjects(frame);
    this.drawPendingSeed(width, height, frame);
    this.drawPet(frame);
  }

  private clearScene() {
    delete this.hostElement.dataset.activeLensX;
    delete this.hostElement.dataset.activeLensY;
    this.stopPetMotionTweens();
    this.children.removeAll(true);
    this.seedGroups = [];
    this.petGroup = undefined;
    this.petSprite = undefined;
    this.isPendingSeedDragging = false;
    this.pendingSeedGroup = undefined;
    this.signalGroup = undefined;
    this.gardenPlots = [];
    this.petSequenceId += 1;
    this.petPostureEvent?.remove(false);
    this.petPostureEvent = undefined;
    this.petSleepEvent?.remove(false);
    this.petSleepEvent = undefined;
  }

  private gardenPoint(frame: GardenFrame, x: number, y: number) {
    return gardenPoint(frame, x, y);
  }

  private gardenNormalizedPoint(frame: GardenFrame, x: number, y: number) {
    return gardenNormalizedPoint(frame, x, y);
  }

  private visibleGardenPoint(frame: GardenFrame, x: number, y: number) {
    return visibleGardenPoint(frame, x, y);
  }

  private plotPoint(frame: GardenFrame, plot: GardenPlot) {
    return gardenPlotPoint(frame, plot);
  }

  private gardenSize(frame: GardenFrame, designSize: number, options: { min?: number; max?: number } = {}) {
    return Phaser.Math.Clamp(designSize * frame.scale, options.min ?? 1, options.max ?? Number.POSITIVE_INFINITY);
  }

  private drawBackground(width: number, height: number, frame: GardenFrame) {
    const backgroundTexture = textureKeyForTheme('garden-background-v4', this.theme);
    if (this.textures.exists(backgroundTexture)) {
      const background = this.add.image(width / 2, height / 2, backgroundTexture).setDepth(0);
      background.setScale(frame.scale);

      this.add.rectangle(width / 2, height / 2, width, height, this.theme === 'dark' ? 0x07191f : 0xfff6e8, this.theme === 'dark' ? 0.12 : 0.08).setDepth(2);
      return;
    }

    const dark = this.theme === 'dark';
    this.add.rectangle(width / 2, height / 2, width, height, dark ? 0x122425 : 0xf7ead7);
    this.add.ellipse(width * 0.5, height * 0.88, width * 1.24, height * 0.38, dark ? 0x355f56 : 0x9bbf82, 0.92);
    this.add.ellipse(width * 0.2, height * 0.95, width * 0.52, height * 0.24, dark ? 0x24463f : 0x628f6b, 0.35);
    this.add.ellipse(width * 0.82, height * 0.9, width * 0.64, height * 0.3, dark ? 0x6e6746 : 0xd8a86f, 0.22);
    this.add.circle(width * 0.82, height * 0.18, Math.min(width, height) * 0.12, dark ? 0xc7dfd8 : 0xffd58b, 0.26);
  }

  private drawGardenLandmarks(frame: GardenFrame) {
    const seedCount = this.state.seeds.length;
    const horizon = this.gardenNormalizedPoint(frame, 0.5, 0.55);
    const leftSoil = this.gardenNormalizedPoint(frame, 0.18, 0.67);
    const dark = this.theme === 'dark';

    this.add.rectangle(horizon.x, horizon.y, this.gardenSize(frame, GARDEN_DESIGN_WIDTH * 0.64), Math.max(3, 5 * frame.scale), dark ? 0x9ccfbb : 0xd8a86f, dark ? 0.05 : 0.22).setDepth(20);
    this.add.ellipse(leftSoil.x, leftSoil.y, this.gardenSize(frame, 94, { max: 132 }), this.gardenSize(frame, 28, { max: 40 }), dark ? 0x263a34 : 0x7b5941, seedCount === 0 ? (dark ? 0.34 : 0.22) : (dark ? 0.18 : 0.12)).setDepth(30);
    this.add.circle(leftSoil.x - this.gardenSize(frame, 28), this.gardenNormalizedPoint(frame, 0.18, 0.65).y, this.gardenSize(frame, 8, { max: 12 }), dark ? 0xd9b06e : 0xf8d76e, seedCount === 0 ? 0.55 : 0.28).setDepth(31);
    this.add.circle(leftSoil.x + this.gardenSize(frame, 4), this.gardenNormalizedPoint(frame, 0.18, 0.64).y, this.gardenSize(frame, 6, { max: 10 }), dark ? 0xe0919a : 0xdb6f7a, seedCount === 0 ? 0.46 : 0.22).setDepth(31);

    if (seedCount >= 1) {
      const point = this.gardenNormalizedPoint(frame, 0.83, 0.55);
      const lantern = this.add.container(point.x, point.y).setDepth(70);
      if (!this.addPropImage(lantern, 'prop-lantern', 0, 0, this.gardenSize(frame, 92, { max: 130 }), 'bottom')) {
        lantern.add(this.add.rectangle(0, -34, 5, 70, 0x6c5a4c, 0.68));
        lantern.add(this.add.circle(0, -78, 19, 0xffc96d, 0.82));
        lantern.add(this.add.circle(0, -78, 10, 0xfff1ad, 0.72));
      }
      if (!this.reducedMotion) {
        this.tweens.add({
          targets: lantern,
          alpha: 0.78,
          duration: 1300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }

    if (seedCount >= 3) {
      const point = this.gardenNormalizedPoint(frame, 0.5, 0.6);
      const vine = this.add.container(point.x, point.y).setDepth(60);
      if (!this.addPropImage(vine, 'prop-vine', 0, 0, this.gardenSize(frame, 124, { max: 172 }), 'bottom')) {
        vine.add(this.add.arc(-48, 0, 36, 220, 40, false, 0x3f7f53, 0.8).setStrokeStyle(6, 0x3f7f53, 0.8));
        vine.add(this.add.arc(12, -10, 42, 200, 20, false, 0x4f7d55, 0.74).setStrokeStyle(6, 0x4f7d55, 0.74));
        vine.add(this.add.ellipse(-14, -32, 22, 11, 0x78a65d, 0.88).setRotation(0.35));
        vine.add(this.add.ellipse(48, -24, 24, 12, 0x78a65d, 0.78).setRotation(-0.45));
      }
    }

    if (seedCount >= 7) {
      const point = this.gardenNormalizedPoint(frame, 0.66, 0.66);
      const dreamStone = this.add.container(point.x, point.y).setDepth(65);
      if (!this.addPropImage(dreamStone, 'prop-dream-stone', 0, 0, this.gardenSize(frame, 96, { max: 136 }), 'bottom')) {
        dreamStone.add(this.add.ellipse(0, 0, 86, 34, 0x8d6a4b, 0.42));
        dreamStone.add(this.add.circle(-18, -12, 7, 0xfff1ad, 0.5));
        dreamStone.add(this.add.circle(16, -9, 5, 0xf8d76e, 0.42));
      }
    }
  }

  private drawSoilTarget(frame: GardenFrame) {
    if (!this.pendingSeed) return;
    if (frame.width < 560) return;

    const point = this.gardenNormalizedPoint(frame, 0.5, 0.51);
    const dark = this.theme === 'dark';
    const label = this.add.text(point.x - 78, point.y, 'choose a plot', {
      backgroundColor: dark ? 'rgba(18, 32, 34, 0.78)' : 'rgba(255, 250, 241, 0.72)',
      color: dark ? '#f1e9cf' : '#49382e',
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      padding: { x: 8, y: 4 }
    }).setDepth(430);
    label.setAlpha(0.86);
  }

  private drawPlantingPlots(width: number, height: number, frame: GardenFrame) {
    this.gardenPlots = createGardenPlots(width, height);
    this.hostElement.dataset.availablePlots = this.emptyPlots().length.toString();
    this.hostElement.dataset.plotMode = this.pendingSeed ? 'planting' : 'hidden';
    if (!this.pendingSeed) return;

    const dark = this.theme === 'dark';
    this.emptyPlots().forEach((plot) => {
      const { x, y } = this.plotPoint(frame, plot);
      const plotScale = plot.scale * Phaser.Math.Clamp(frame.scale, 0.86, 1.42);
      const marker = this.add.container(x, y).setDepth(plot.depth - 8);
      const glow = this.add.ellipse(0, 0, 96 * plotScale, 40 * plotScale, dark ? 0xaedfd9 : 0xfff1ad, dark ? 0.2 : 0.24);
      const soil = this.add.ellipse(0, 0, 74 * plotScale, 28 * plotScale, dark ? 0x263a34 : 0x7b5941, dark ? 0.52 : 0.36);
      const ring = this.add.ellipse(0, 0, 104 * plotScale, 46 * plotScale, dark ? 0xd8f4e6 : 0xfff1ad, 0).setStrokeStyle(2, dark ? 0xd8f4e6 : 0xfff1ad, dark ? 0.58 : 0.72);
      marker.add([glow, soil, ring]);
      marker.setInteractive(new Phaser.Geom.Ellipse(0, 0, 104 * plotScale, 54 * plotScale), Phaser.Geom.Ellipse.Contains);
      marker.on('pointerdown', () => {
        this.plantAtPlot(plot);
        this.playHeadButt();
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
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  private drawSeeds(width: number, height: number, frame: GardenFrame) {
    const visibleSeeds = this.state.seeds.slice(0, 50);
    const layout = createGardenSeedLayout(GARDEN_DESIGN_WIDTH, GARDEN_DESIGN_HEIGHT, visibleSeeds.length);
    const plots = createGardenPlots(width, height);

    layout.forEach((item) => {
      const seed = visibleSeeds[item.index];
      const placement = resolveGardenSeedPlacement(seed, item, GARDEN_DESIGN_WIDTH, GARDEN_DESIGN_HEIGHT, plots);
      const plot = seed.gardenPlotId ? plots.find((item) => item.id === seed.gardenPlotId) : undefined;
      const point = plot ? this.plotPoint(frame, plot) : this.gardenPoint(frame, placement.x, placement.y);
      const group = this.add.container(point.x, point.y).setScale(placement.scale * Phaser.Math.Clamp(frame.scale, 0.82, 1.38)).setDepth(placement.depth);
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
    const propKey = this.seedPropKey(seed);
    if (propKey && this.addPropImage(group, propKey, 0, 0, 82, 'bottom')) {
      group.add(this.add.ellipse(0, 20, 58, 18, 0x7b5941, 0.18));
      return;
    }

    const stem = this.add.rectangle(0, -12, 5, 32, 0x4f7d55).setOrigin(0.5, 1);
    const earth = this.add.ellipse(0, 10, 54, 20, 0x7b5941, 0.35);
    group.add([earth, stem]);

    if (seed.status === 'planted') {
      group.add(this.add.ellipse(0, 0, 22, 14, 0x8d6a4b));
      return;
    }

    if (seed.visualType === 'lantern') {
      group.add(this.add.circle(0, -34, 17, 0xffc96d));
      group.add(this.add.circle(0, -34, 10, 0xfff1ad, 0.7));
      return;
    }

    if (seed.visualType === 'vine') {
      group.add(this.add.arc(-7, -25, 18, 260, 80, false, 0x3f7f53, 1).setStrokeStyle(5, 0x3f7f53));
      group.add(this.add.ellipse(10, -36, 18, 10, 0x78a65d).setRotation(0.4));
      return;
    }

    const petalColor = seed.status === 'blooming' ? 0xdb6f7a : 0xf0b260;
    group.add(this.add.circle(0, -35, 11, 0xf8d76e));
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      group.add(this.add.ellipse(Math.cos(angle) * 14, -35 + Math.sin(angle) * 12, 16, 10, petalColor).setRotation(angle));
    }
  }

  private drawSignal(frame: GardenFrame) {
    if (this.pendingSeed || this.lensSessionActive) return;

    const point = this.visibleGardenPoint(frame, 0.72, 0.5);
    const group = this.add.container(point.x, point.y).setDepth(260);
    const dark = this.theme === 'dark';
    group.add(this.add.circle(0, 0, 20, dark ? 0xaec9bd : 0xffe0a1, dark ? 0.88 : 0.96));
    group.add(this.add.circle(0, 0, 9, dark ? 0xe9859c : 0xdb6f7a, 0.86));
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      group.add(this.add.circle(Math.cos(angle) * 34, Math.sin(angle) * 28, index % 2 === 0 ? 4 : 3, dark ? 0xd8f4e6 : 0xfff1ad, dark ? 0.68 : 0.78));
    }
    group.add(this.add.circle(0, 0, 31, dark ? 0xd8f4e6 : 0xfff1ad, 0).setStrokeStyle(2, dark ? 0xd8f4e6 : 0xfff1ad, dark ? 0.66 : 0.76));
    group.setInteractive(new Phaser.Geom.Circle(0, 0, 54), Phaser.Geom.Circle.Contains);
    group.on('pointerdown', () => {
      this.playAttentionAnimation();
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
        ease: 'Sine.easeInOut'
      });
    }
    this.signalGroup = group;
  }

  private drawLensObjects(frame: GardenFrame) {
    if (!this.lensSessionActive || this.pendingSeed) return;

    const placements = createLensObjectPlacements(frame, this.currentLens);

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
        group.setInteractive(new Phaser.Geom.Circle(0, glowY, hitTarget.radius), Phaser.Geom.Circle.Contains);
        group.on('pointerdown', () => {
          this.onLensObjectSelected(placement.kind);
          if (this.wakePet()) return;
          this.playAttentionAnimation();
        });
      }
      const glow = dark
        ? this.drawDarkLensGlow(placement.kind, size, glowY, active)
        : this.add.circle(0, glowY, size * 0.42, active ? 0xfff1ad : 0xffffff, active ? 0.2 : 0.06);
      const shadow = this.add.ellipse(0, placement.shadowY, placement.shadowWidth, placement.shadowHeight, dark ? 0x071211 : 0x5c4a36, dark ? placement.shadowAlpha * 1.25 : placement.shadowAlpha);
      group.add([glow, shadow]);
      if (active && dark) {
        this.drawDarkActiveLensFocusBase(group, placement.kind, size, glowY);
      }
      if (!this.addPropImage(group, `lens-${placement.kind}`, 0, 0, size, placement.anchor)) {
        group.add(this.add.circle(0, -size * 0.3, size * 0.3, active ? 0xf0b260 : 0xe6d1b7, 0.72));
      }
      if (active) {
        if (dark) {
          this.drawDarkActiveLensMotes(group, placement.kind, size, glowY);
        } else {
          group.add(this.add.circle(0, glowY, size * 0.5, 0xfff1ad, 0).setStrokeStyle(2, 0xfff1ad, 0.52));
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
          ease: 'Sine.easeInOut'
        });
      }
    });
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

  private drawDarkActiveLensFocusBase(group: Phaser.GameObjects.Container, kind: LensKind, size: number, glowY: number) {
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
        ease: 'Sine.easeInOut'
      });
    }
  }

  private drawDarkActiveLensMotes(group: Phaser.GameObjects.Container, kind: LensKind, size: number, glowY: number) {
    const lighting = DARK_LENS_LIGHTING[kind];
    const motes = [
      this.add.circle(-size * 0.36, glowY - size * 0.18, Math.max(1.4, size * 0.018), lighting.moteColor, 0.42),
      this.add.circle(size * 0.28, glowY - size * 0.12, Math.max(1.2, size * 0.014), lighting.focusColor, 0.34),
      this.add.circle(size * 0.1, glowY - size * 0.28, Math.max(1.1, size * 0.012), lighting.moteColor, 0.3)
    ];
    group.add(motes);
    if (!this.reducedMotion) {
      motes.forEach((mote, index) => {
        this.tweens.add({
          targets: mote,
          y: mote.y - size * (0.035 + index * 0.01),
          alpha: index === 0 ? 0.22 : 0.18,
          duration: 2200 + index * 360,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      });
    }
  }

  private drawPendingSeed(width: number, height: number, frame: GardenFrame) {
    if (!this.pendingSeed) return;

    const emptyPlot = this.emptyPlots().find((plot) => plot.x >= 0.55) ?? this.emptyPlots()[0];
    const startPoint = pendingSeedStartPoint(frame, emptyPlot ?? null);
    const startX = startPoint.x;
    const startY = width < 560 ? startPoint.y : emptyPlot ? Math.max(height * 0.48, startPoint.y - this.gardenSize(frame, 118, { max: 148 })) : startPoint.y;
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
    const { x, y } = this.visibleGardenPoint(frame, 0.24, 0.73);
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
      if (this.wakePet()) return;
      this.playFriendlyPetAnimation();
    });

    const idleTexture = textureKeyForTheme('companion-idle', this.theme);
    if (this.textures.exists(idleTexture)) {
      const sprite = this.add.image(0, 0, idleTexture).setOrigin(0.5, 1);
      const targetHeight = this.gardenSize(frame, 150, { min: 150, max: 235 });
      if (this.theme === 'dark') {
        group.add(this.add.ellipse(0, -4, targetHeight * 0.66, targetHeight * 0.11, 0x071211, 0.28));
      }
      sprite.setScale(targetHeight / sprite.height);
      this.petBaseScaleX = sprite.scaleX;
      this.petBaseScaleY = sprite.scaleY;
      group.add(sprite);
      this.petSprite = sprite;
    } else {
      this.drawPrimitivePet(group);
    }

    this.petGroup = group;
    this.restorePetStateAfterDraw();
    this.startIdleBreathing();
    if (!this.petDebug) {
      if (!this.petLifeStarted) {
        this.petLifeStarted = true;
      }
      this.startPetLivingLoop();
    }
  }

  private drawPrimitivePet(group: Phaser.GameObjects.Container) {
    group.add(this.add.ellipse(0, 18, 96, 132, 0xe6d1b7));
    group.add(this.add.ellipse(-28, 12, 34, 104, 0x6a5146));
    group.add(this.add.ellipse(28, 12, 34, 104, 0x6a5146));
    group.add(this.add.ellipse(0, -66, 92, 76, 0xd9bea0));
    group.add(this.add.triangle(-34, -100, -56, -66, -20, -72, 0x6a5146));
    group.add(this.add.triangle(34, -100, 56, -66, 20, -72, 0x6a5146));
    group.add(this.add.ellipse(0, -61, 50, 42, 0x3d302e, 0.86));
    group.add(this.add.circle(-19, -70, 9, 0x1f2530));
    group.add(this.add.circle(19, -70, 9, 0x1f2530));
    group.add(this.add.circle(-22, -73, 3, 0xffffff, 0.8));
    group.add(this.add.circle(16, -73, 3, 0xffffff, 0.8));
    group.add(this.add.ellipse(0, -52, 14, 9, 0x211b1b));
    group.add(this.add.arc(-54, 24, 28, 110, 290, false, 0x5b463f, 1).setStrokeStyle(16, 0x5b463f));
    group.add(this.add.rectangle(0, -4, 38, 8, 0x2c3036));
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
        y: width < 560 ? point.y : emptyPlot ? Math.max(height * 0.48, point.y - this.gardenSize(frame, 118, { max: 148 })) : point.y,
        duration: this.reducedMotion ? 1 : 240,
        ease: 'Sine.easeOut'
      });
      return;
    }

    this.plantAtPlot(plot);
    this.playHeadButt();
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
    return availableGardenPlots(this.state.seeds, this.scale.width || 720);
  }

  private nearestEmptyPlot(x: number, y: number) {
    const width = this.scale.width || 720;
    const height = this.scale.height || 520;
    const frame = createGardenFrame(width, height);
    const emptyPlots = this.emptyPlots();
    let nearest: GardenPlot | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    emptyPlots.forEach((plot) => {
      const point = this.plotPoint(frame, plot);
      const distance = Phaser.Math.Distance.Between(x, y, point.x, point.y);
      if (distance < nearestDistance) {
        nearest = plot;
        nearestDistance = distance;
      }
    });

    return nearestDistance <= Math.max(76, Math.min(width, height) * 0.16, 92 * frame.scale) ? nearest : undefined;
  }

  private plantAtPlot(plot: GardenPlot) {
    this.hostElement.dataset.selectedPlot = plot.id;
    this.onPendingSeedPlanted({ plotId: plot.id, x: plot.x, y: plot.y });
  }

  private animateNewestSeed() {
    const newestSeedGroup = this.seedGroups[0];
    if (!newestSeedGroup) return;

    this.playPlantProudReaction();
    if (this.reducedMotion) return;

    this.tweens.killTweensOf(newestSeedGroup);
    const settledScale = newestSeedGroup.scaleX;
    newestSeedGroup.setScale(settledScale * 1.2);
    this.drawPlantingBurst(newestSeedGroup.x, newestSeedGroup.y);
    this.tweens.add({
      targets: newestSeedGroup,
      scale: settledScale,
      duration: 360,
      ease: 'Back.easeOut'
    });
  }

  private animateWateredSeed() {
    if (!this.lastWateringEvent || this.lastAnimatedWateringEventId === this.lastWateringEvent.eventId) return;

    const seedGroup = this.seedGroups.find((group) => group.getData('seedId') === this.lastWateringEvent?.seedId);
    if (!seedGroup) return;

    this.lastAnimatedWateringEventId = this.lastWateringEvent.eventId;
    this.hostElement.dataset.wateredSeed = this.lastWateringEvent.seedId;
    this.hostElement.dataset.wateringEvent = this.lastWateringEvent.eventId;
    if (this.reducedMotion) {
      const shimmer = this.add.circle(seedGroup.x, seedGroup.y - 18, 34, 0x8bc6c3, 0.18).setDepth(478);
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
      ease: 'Sine.easeInOut'
    });
  }

  private drawPlantingBurst(x: number, y: number) {
    const particles: Phaser.GameObjects.Shape[] = [];
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10;
      const particle = this.add.circle(x, y - 14, 4, index % 2 === 0 ? 0xfff1ad : 0xdb6f7a, 0.72).setDepth(480);
      particles.push(particle);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 42,
        y: y - 14 + Math.sin(angle) * 28,
        alpha: 0,
        scale: 0.4,
        duration: 520,
        ease: 'Sine.easeOut',
        onComplete: () => particle.destroy()
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
        onComplete: () => droplet.destroy()
      });
    }
  }

  private seedPropKey(seed: ReflectionSeed): string | null {
    const growthStage = growthStageForSeed(seed);
    if (growthStage === 'seed') return 'prop-seed';
    if (growthStage === 'sprout') return 'prop-sprout';
    if (growthStage === 'growing') return 'prop-bud';
    return 'prop-flower';
  }

  private addPropImage(group: Phaser.GameObjects.Container, textureKey: string, x: number, y: number, maxSize: number, anchor: PropAnchor = 'center'): Phaser.GameObjects.Image | null {
    const themedTextureKey = textureKeyForTheme(textureKey, this.theme);
    if (!this.textures.exists(themedTextureKey)) return null;

    const image = this.add.image(x, y, themedTextureKey).setOrigin(0.5, anchor === 'center' ? 0.5 : 1);
    image.setScale(maxSize / Math.max(image.width, image.height));
    group.add(image);
    return image;
  }

  private setPetFrame(frame: PetFrameId) {
    const textureKey = textureKeyForTheme(PET_FRAME_TEXTURES[frame], this.theme);
    if (this.petSprite && this.textures.exists(textureKey)) {
      this.petSprite.setTexture(textureKey);
      this.applyPetFrameOffset(frame);
      this.hostElement.dataset.petFrame = frame;
    }
  }

  private applyPetFrameOffset(frame: PetFrameId) {
    if (!this.petSprite) return;

    const offset = PET_FRAME_OFFSETS[frame] ?? { x: 0, y: 0 };
    this.petSprite.x = offset.x * this.petBaseScaleX;
    this.petSprite.y = offset.y * this.petBaseScaleY;
  }

  private playPetFrameSequence(
    sequence: readonly PetClipStep[],
    options: { finalState?: PetAnimationState; keepSleeping?: boolean; preserveAmbientMotion?: boolean } = {}
  ) {
    this.petDebugFrame = undefined;
    if (!options.keepSleeping) this.isPetSleeping = false;
    const sequenceId = ++this.petSequenceId;
    let elapsed = 0;
    sequence.forEach((step) => {
      this.time.delayedCall(elapsed, () => {
        if (sequenceId !== this.petSequenceId) return;
        this.setPetFrame(step.frame);
        if (!options.preserveAmbientMotion) this.playPetStepMotion(step);
      });
      elapsed += step.durationMs;
    });
    this.time.delayedCall(elapsed, () => {
      if (sequenceId !== this.petSequenceId) return;
      if (options.finalState) this.setPetState(options.finalState);
      if (options.finalState === 'sleep') this.startSleepBreathing();
      if (options.finalState === 'idle' && !options.preserveAmbientMotion) this.startIdleBreathing();
    });
  }

  private playPetStepMotion(step: PetClipStep) {
    if (!this.petGroup || !this.petSprite) return;

    if (step.motion === 'blink') return;

    this.tweens.killTweensOf(this.petGroup);
    this.tweens.killTweensOf(this.petSprite);
    this.petGroup.rotation = 0;
    this.petGroup.scaleX = 1;
    this.petGroup.scaleY = 1;
    this.petGroup.x = this.scale.width * 0.24;
    this.petGroup.y = this.scale.height * 0.73;
    this.petSprite.scaleX = this.petBaseScaleX;
    this.petSprite.scaleY = this.petBaseScaleY;
    this.petSprite.alpha = 1;
    this.applyPetFrameOffset(step.frame);

    if (step.motion === 'sleep') {
      this.setPetState('sleep');
      this.startSleepBreathing();
      return;
    }

    if (this.reducedMotion || !step.motion) return;

    const duration = Math.max(120, step.durationMs);
    if (step.motion === 'look') {
      this.tweens.add({
        targets: this.petGroup,
        rotation: -0.025,
        duration: Math.min(340, duration),
        ease: 'Sine.easeInOut'
      });
    } else if (step.motion === 'lookSettle' || step.motion === 'settle') {
      this.tweens.add({
        targets: this.petGroup,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        duration: Math.min(280, duration),
        ease: 'Sine.easeOut'
      });
    } else if (step.motion === 'headButtWindup') {
      this.tweens.add({
        targets: this.petGroup,
        x: this.petGroup.x - 8,
        rotation: 0.035,
        duration,
        ease: 'Sine.easeInOut'
      });
    } else if (step.motion === 'headButtContact') {
      this.tweens.add({
        targets: this.petGroup,
        x: this.petGroup.x + 14,
        rotation: -0.09,
        duration,
        ease: 'Sine.easeInOut'
      });
    } else if (step.motion === 'stretch') {
      this.tweens.add({
        targets: this.petSprite,
        scaleX: this.petBaseScaleX * 1.018,
        scaleY: this.petBaseScaleY * 0.992,
        duration: duration * 0.56,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    } else if (step.motion === 'groom') {
      this.tweens.add({
        targets: this.petGroup,
        rotation: 0.018,
        duration: 220,
        yoyo: true,
        repeat: Math.max(1, Math.floor(duration / 260)),
        ease: 'Sine.easeInOut'
      });
    } else if (step.motion === 'nap') {
      this.tweens.add({
        targets: this.petSprite,
        alpha: 0.96,
        scaleX: this.petBaseScaleX * 0.992,
        scaleY: this.petBaseScaleY * 1.004,
        duration,
        ease: 'Sine.easeInOut'
      });
    } else if (step.motion === 'wake') {
      this.tweens.add({
        targets: this.petGroup,
        rotation: 0.026,
        duration: duration * 0.5,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    } else if (step.motion === 'proud') {
      this.tweens.add({
        targets: this.petGroup,
        scaleX: 1.025,
        scaleY: 0.99,
        duration: duration * 0.45,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    }
  }

  private playAttentionAnimation() {
    if (!this.petGroup) return;

    if (this.isPetSleeping) {
      this.playWakeAnimation();
      return;
    }

    this.markPetInteraction();
    this.setPetState('attention');
    this.stopPetMotionTweens();
    this.playPetFrameSequence(PET_SEQUENCES.attention, { finalState: 'idle' });
  }

  private playFriendlyPetAnimation() {
    if (this.isPetSleeping) {
      this.playWakeAnimation();
      return;
    }

    const roll = Math.random();
    if (roll < 0.45) this.playAttentionAnimation();
    else if (roll < 0.74) this.playGroomAnimation();
    else this.playHeadButt();
  }

  private playGroomAnimation() {
    if (!this.petGroup) return;

    this.setPetState('groom');
    this.stopPetMotionTweens();
    this.playPetFrameSequence(PET_SEQUENCES.groom, { finalState: 'idle' });
  }

  private playStretchAnimation() {
    if (!this.petGroup) return;

    this.setPetState('stretch');
    this.stopPetMotionTweens();
    this.playPetFrameSequence(PET_SEQUENCES.stretch, { finalState: 'idle' });
  }

  private playSleepAnimation() {
    if (!this.petGroup || this.lensSessionActive || this.pendingSeed) return;

    this.setPetState('napStart');
    this.stopPetMotionTweens();
    this.isPetSleeping = true;
    this.playPetFrameSequence(PET_SEQUENCES.sleep, { finalState: 'sleep', keepSleeping: true });
  }

  private playWakeAnimation() {
    if (!this.petGroup) return;

    this.markPetInteraction();
    this.setPetState('wake');
    this.stopPetMotionTweens();
    this.isPetSleeping = false;
    this.playPetFrameSequence(PET_SEQUENCES.wake, { finalState: 'idle' });
  }

  private playPlantProudReaction() {
    if (!this.petGroup) return;

    if (this.isPetSleeping) this.playWakeAnimation();
    this.markPetInteraction();
    this.setPetState('plantProud');
    this.stopPetMotionTweens();
    this.playPetFrameSequence(PET_SEQUENCES.plantProud, { finalState: 'idle' });
  }

  private startPetLivingLoop() {
    this.schedulePetPosture(this.reducedMotion ? 6200 : 3000);
    this.schedulePetSleepCheck(12000);
  }

  private schedulePetPosture(delay = 7600) {
    this.petPostureEvent?.remove(false);
    if (!this.petGroup || this.petDebug) return;

    this.petPostureEvent = this.time.delayedCall(delay, () => {
      if (!this.petGroup) return;
      if (!this.isPetSleeping && !this.pendingSeed && !this.lensSessionActive && this.petState === 'idle') {
        this.playNextPostureAction();
      }
      this.schedulePetPosture(this.reducedMotion ? 12500 + Math.random() * 5200 : 5700 + Math.random() * 7200);
    });
  }

  private schedulePetSleepCheck(delay = 18000) {
    this.petSleepEvent?.remove(false);
    if (!this.petGroup || this.petDebug) return;

    this.petSleepEvent = this.time.delayedCall(delay, () => {
      if (!this.petGroup) return;
      const quietTime = this.time.now - this.quietSince;
      if (this.isPetSleeping) {
        if (quietTime > 76000 && Math.random() > 0.72) this.playWakeAnimation();
      } else if (!this.pendingSeed && !this.lensSessionActive && quietTime > 52000 && Math.random() > 0.52) {
        this.playSleepAnimation();
      }
      this.schedulePetSleepCheck(this.reducedMotion ? 26000 : 18000 + Math.random() * 10000);
    });
  }

  private wakePet() {
    if (!this.isPetSleeping) return false;

    this.playWakeAnimation();
    return true;
  }

  private playCuriousAnimation() {
    if (!this.petGroup) return;

    this.setPetState('curious');
    this.stopPetMotionTweens();
    this.playPetFrameSequence(PET_SEQUENCES.attention, { finalState: 'idle' });
  }

  private playNextPostureAction() {
    const choices: PetAnimationState[] = this.state.seeds.length > 0
      ? ['curious', 'groom', 'stretch', 'groom']
      : ['curious', 'groom', 'stretch'];
    const availableChoices = choices.filter((choice) => choice !== this.lastPostureAction);
    const nextAction = availableChoices[Math.floor(Math.random() * availableChoices.length)] ?? 'curious';
    this.lastPostureAction = nextAction;
    if (nextAction === 'groom') this.playGroomAnimation();
    else if (nextAction === 'stretch') this.playStretchAnimation();
    else this.playCuriousAnimation();
  }

  private setPetState(state: PetAnimationState) {
    this.petState = state;
    this.isPetSleeping = state === 'sleep' || state === 'napStart';
    this.hostElement.dataset.petState = state;
    if (state !== 'idle') this.hostElement.dataset.petLastAction = state;
    if (state === 'sleep') this.hostElement.dataset.petMotion = 'sleeping';
    else if (state === 'idle') this.hostElement.dataset.petMotion = this.reducedMotion ? 'still' : 'breathing';
    else this.hostElement.dataset.petMotion = this.reducedMotion ? 'frame-change' : 'state-action';
  }

  private restorePetStateAfterDraw() {
    if (this.petDebug && this.petDebugFrame) {
      this.setPetFrame(this.petDebugFrame);
      this.setPetState(this.petDebugFrame === 'sleeping' ? 'sleep' : 'attention');
      return;
    }

    if (this.petState === 'sleep') {
      this.isPetSleeping = true;
      this.setPetFrame('sleeping');
      this.setPetState('sleep');
      this.startSleepBreathing();
      return;
    }

    if (this.petState === 'napStart') {
      this.isPetSleeping = true;
      this.setPetFrame('sleeping');
      this.setPetState('sleep');
      this.startSleepBreathing();
      return;
    }

    this.setPetFrame('idle');
    this.setPetState('idle');
  }

  private startIdleBreathing() {
    if (!this.petSprite || this.petState !== 'idle') return;
    this.petBreathingTween?.stop();
    this.petBreathingTween = undefined;
    this.hostElement.dataset.petMotion = this.reducedMotion ? 'still' : 'breathing';
    if (this.reducedMotion) return;

    this.petBreathingTween = this.tweens.add({
      targets: this.petSprite,
      scaleX: this.petSprite.scaleX * 1.004,
      scaleY: this.petSprite.scaleY * 0.998,
      alpha: 0.985,
      duration: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private startSleepBreathing() {
    if (!this.petSprite || this.petState !== 'sleep') return;
    this.petBreathingTween?.stop();
    this.petBreathingTween = undefined;
    this.hostElement.dataset.petMotion = 'sleeping';
    if (this.reducedMotion) return;

    this.petBreathingTween = this.tweens.add({
      targets: this.petSprite,
      alpha: 0.965,
      scaleX: this.petBaseScaleX * 0.996,
      scaleY: this.petBaseScaleY * 1.004,
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private stopPetMotionTweens() {
    if (this.petGroup) {
      this.tweens.killTweensOf(this.petGroup);
      this.petGroup.rotation = 0;
      this.petGroup.scaleX = 1;
      this.petGroup.scaleY = 1;
    }
    if (this.petSprite) {
      this.tweens.killTweensOf(this.petSprite);
      this.petSprite.scaleX = this.petBaseScaleX;
      this.petSprite.scaleY = this.petBaseScaleY;
      const currentFrame = this.hostElement.dataset.petFrame;
      if (currentFrame && currentFrame in PET_FRAME_TEXTURES) this.applyPetFrameOffset(currentFrame as PetFrameId);
      else {
        this.petSprite.x = 0;
        this.petSprite.y = 0;
      }
      this.petSprite.alpha = 1;
    }
    this.petBreathingTween?.stop();
    this.petBreathingTween = undefined;
  }

  private markPetInteraction() {
    this.quietSince = this.time.now;
  }
}
