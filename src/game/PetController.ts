import Phaser from 'phaser';
import { textureKeyForTheme } from './assets';
import {
  PET_BREATHING,
  PET_FRAME_OFFSETS,
  PET_FRAME_TEXTURES,
  PET_POSTURE_TIMING,
  PET_SEQUENCE_FINAL_STATES,
  PET_SEQUENCES,
  PET_SLEEP_TIMING,
  pickNextPostureAction,
  type PetAnimationState,
  type PetClipStep,
  type PetFrameId,
  type PetSequenceId,
} from './petAnimation';
import type { ActiveTheme } from '../domain/theme';

export type PetControllerContext = {
  isReducedMotion(): boolean;
  theme(): ActiveTheme;
  isPetDebug(): boolean;
  /** True while a pending seed or lens session should keep the pet awake and attentive. */
  isGardenBusy(): boolean;
  hasSeeds(): boolean;
};

/**
 * Owns the companion's animation state machine: frame sequences, posture and
 * sleep scheduling, breathing tweens, and the host dataset hooks the e2e
 * tests observe. The scene builds the pet's display objects each draw and
 * hands them over via attach().
 */
export class PetController {
  private readonly scene: Phaser.Scene;
  private readonly host: HTMLElement;
  private readonly ctx: PetControllerContext;

  private group?: Phaser.GameObjects.Container;
  private sprite?: Phaser.GameObjects.Image;
  private baseScaleX = 1;
  private baseScaleY = 1;
  private sequenceId = 0;
  private postureEvent?: Phaser.Time.TimerEvent;
  private sleepEvent?: Phaser.Time.TimerEvent;
  private breathingTween?: Phaser.Tweens.Tween;
  private state: PetAnimationState = 'idle';
  private debugFrame?: PetFrameId;
  private quietSince = 0;
  private sleeping = false;
  private lastPostureAction: PetAnimationState | null = null;

  constructor(scene: Phaser.Scene, host: HTMLElement, ctx: PetControllerContext) {
    this.scene = scene;
    this.host = host;
    this.ctx = ctx;
  }

  get isSleeping() {
    return this.sleeping;
  }

  get isAttached() {
    return Boolean(this.group);
  }

  noteSceneStart() {
    this.quietSince = this.scene.time.now;
  }

  markInteraction() {
    this.quietSince = this.scene.time.now;
  }

  attach(
    group: Phaser.GameObjects.Container,
    sprite: Phaser.GameObjects.Image,
    baseScaleX: number,
    baseScaleY: number
  ) {
    this.group = group;
    this.sprite = sprite;
    this.baseScaleX = baseScaleX;
    this.baseScaleY = baseScaleY;
  }

  /** Called when the scene clears; display objects are about to be destroyed. */
  detach() {
    this.stopMotionTweens();
    this.group = undefined;
    this.sprite = undefined;
    this.sequenceId += 1;
    this.postureEvent?.remove(false);
    this.postureEvent = undefined;
    this.sleepEvent?.remove(false);
    this.sleepEvent = undefined;
  }

  previewFrame(frame: PetFrameId) {
    if (!this.group) return;

    this.sequenceId += 1;
    this.stopMotionTweens();
    this.debugFrame = frame;
    this.sleeping = frame === 'sleeping' || frame === 'napCurl';
    this.setFrame(frame);
    this.setState(frame === 'sleeping' ? 'sleep' : 'attention');
    this.host.dataset.petDebugPreview = frame;
  }

  previewSequence(sequence: PetSequenceId) {
    if (!this.group) return;

    this.stopMotionTweens();
    this.debugFrame = undefined;
    this.host.dataset.petDebugPreview = sequence;
    this.setState(sequence === 'sleep' ? 'napStart' : 'attention');
    this.playFrameSequence(PET_SEQUENCES[sequence], {
      finalState: PET_SEQUENCE_FINAL_STATES[sequence],
      keepSleeping: sequence === 'sleep',
    });
  }

  playHeadButt() {
    if (!this.group) return;

    if (this.sleeping) {
      this.playWake();
      return;
    }
    this.markInteraction();
    this.setState('headButt');
    const group = this.group;
    this.stopMotionTweens();
    if (this.ctx.isReducedMotion()) {
      this.setFrame('headbuttContact');
      group.rotation = -0.04;
      this.scene.time.delayedCall(180, () => {
        if (this.group === group) {
          group.rotation = 0;
          this.setFrame('idle');
          this.setState('idle');
        }
      });
      return;
    }

    this.playFrameSequence(PET_SEQUENCES.headButt, { finalState: 'idle' });
  }

  playAttention() {
    if (!this.group) return;

    if (this.sleeping) {
      this.playWake();
      return;
    }

    this.markInteraction();
    this.setState('attention');
    this.stopMotionTweens();
    this.playFrameSequence(PET_SEQUENCES.attention, { finalState: 'idle' });
  }

  playFriendly() {
    if (this.sleeping) {
      this.playWake();
      return;
    }

    const roll = Math.random();
    if (roll < 0.45) this.playAttention();
    else if (roll < 0.74) this.playGroom();
    else this.playHeadButt();
  }

  playPlantProud() {
    if (!this.group) return;

    if (this.sleeping) this.playWake();
    this.markInteraction();
    this.setState('plantProud');
    this.stopMotionTweens();
    this.playFrameSequence(PET_SEQUENCES.plantProud, { finalState: 'idle' });
  }

  /** Wakes a sleeping pet. Returns true when a wake was triggered. */
  wake() {
    if (!this.sleeping) return false;

    this.playWake();
    return true;
  }

  restoreAfterDraw() {
    if (this.ctx.isPetDebug() && this.debugFrame) {
      this.setFrame(this.debugFrame);
      this.setState(this.debugFrame === 'sleeping' ? 'sleep' : 'attention');
      return;
    }

    if (this.state === 'sleep' || this.state === 'napStart') {
      this.sleeping = true;
      this.setFrame('sleeping');
      this.setState('sleep');
      this.startBreathing('sleep');
      return;
    }

    this.setFrame('idle');
    this.setState('idle');
  }

  startIdleBreathing() {
    this.startBreathing('idle');
  }

  startLivingLoop() {
    this.schedulePosture(
      this.ctx.isReducedMotion()
        ? PET_POSTURE_TIMING.reducedMotionInitialDelayMs
        : PET_POSTURE_TIMING.initialDelayMs
    );
    this.scheduleSleepCheck(PET_SLEEP_TIMING.initialCheckDelayMs);
  }

  private playGroom() {
    if (!this.group) return;

    this.setState('groom');
    this.stopMotionTweens();
    this.playFrameSequence(PET_SEQUENCES.groom, { finalState: 'idle' });
  }

  private playStretch() {
    if (!this.group) return;

    this.setState('stretch');
    this.stopMotionTweens();
    this.playFrameSequence(PET_SEQUENCES.stretch, { finalState: 'idle' });
  }

  private playCurious() {
    if (!this.group) return;

    this.setState('curious');
    this.stopMotionTweens();
    this.playFrameSequence(PET_SEQUENCES.attention, { finalState: 'idle' });
  }

  private playSleep() {
    if (!this.group || this.ctx.isGardenBusy()) return;

    this.setState('napStart');
    this.stopMotionTweens();
    this.sleeping = true;
    this.playFrameSequence(PET_SEQUENCES.sleep, { finalState: 'sleep', keepSleeping: true });
  }

  private playWake() {
    if (!this.group) return;

    this.markInteraction();
    this.setState('wake');
    this.stopMotionTweens();
    this.sleeping = false;
    this.playFrameSequence(PET_SEQUENCES.wake, { finalState: 'idle' });
  }

  private schedulePosture(delay: number) {
    this.postureEvent?.remove(false);
    if (!this.group || this.ctx.isPetDebug()) return;

    this.postureEvent = this.scene.time.delayedCall(delay, () => {
      if (!this.group) return;
      if (!this.sleeping && !this.ctx.isGardenBusy() && this.state === 'idle') {
        this.playNextPosture();
      }
      const timing = PET_POSTURE_TIMING;
      this.schedulePosture(
        this.ctx.isReducedMotion()
          ? timing.reducedMotionDelayMs + Math.random() * timing.reducedMotionJitterMs
          : timing.delayMs + Math.random() * timing.jitterMs
      );
    });
  }

  private scheduleSleepCheck(delay: number) {
    this.sleepEvent?.remove(false);
    if (!this.group || this.ctx.isPetDebug()) return;

    this.sleepEvent = this.scene.time.delayedCall(delay, () => {
      if (!this.group) return;
      const timing = PET_SLEEP_TIMING;
      const quietTime = this.scene.time.now - this.quietSince;
      if (this.sleeping) {
        if (quietTime > timing.quietBeforeWakeMs && Math.random() > timing.wakeRollThreshold) {
          this.playWake();
        }
      } else if (
        !this.ctx.isGardenBusy() &&
        quietTime > timing.quietBeforeSleepMs &&
        Math.random() > timing.sleepRollThreshold
      ) {
        this.playSleep();
      }
      this.scheduleSleepCheck(
        this.ctx.isReducedMotion()
          ? timing.reducedMotionCheckIntervalMs
          : timing.checkIntervalMs + Math.random() * timing.checkIntervalJitterMs
      );
    });
  }

  private playNextPosture() {
    const nextAction = pickNextPostureAction(this.lastPostureAction, this.ctx.hasSeeds());
    this.lastPostureAction = nextAction;
    if (nextAction === 'groom') this.playGroom();
    else if (nextAction === 'stretch') this.playStretch();
    else this.playCurious();
  }

  private setFrame(frame: PetFrameId) {
    const textureKey = textureKeyForTheme(PET_FRAME_TEXTURES[frame], this.ctx.theme());
    if (this.sprite) {
      this.sprite.setTexture(textureKey);
      this.applyFrameOffset(frame);
      this.host.dataset.petFrame = frame;
    }
  }

  private applyFrameOffset(frame: PetFrameId) {
    if (!this.sprite) return;

    const offset = PET_FRAME_OFFSETS[frame] ?? { x: 0, y: 0 };
    this.sprite.x = offset.x * this.baseScaleX;
    this.sprite.y = offset.y * this.baseScaleY;
  }

  private playFrameSequence(
    sequence: readonly PetClipStep[],
    options: {
      finalState?: PetAnimationState;
      keepSleeping?: boolean;
      preserveAmbientMotion?: boolean;
    } = {}
  ) {
    this.debugFrame = undefined;
    if (!options.keepSleeping) this.sleeping = false;
    const sequenceId = ++this.sequenceId;
    let elapsed = 0;
    sequence.forEach((step) => {
      this.scene.time.delayedCall(elapsed, () => {
        if (sequenceId !== this.sequenceId) return;
        this.setFrame(step.frame);
        if (!options.preserveAmbientMotion) this.playStepMotion(step);
      });
      elapsed += step.durationMs;
    });
    this.scene.time.delayedCall(elapsed, () => {
      if (sequenceId !== this.sequenceId) return;
      if (options.finalState) this.setState(options.finalState);
      if (options.finalState === 'sleep') this.startBreathing('sleep');
      if (options.finalState === 'idle' && !options.preserveAmbientMotion) {
        this.startBreathing('idle');
      }
    });
  }

  private playStepMotion(step: PetClipStep) {
    if (!this.group || !this.sprite) return;

    if (step.motion === 'blink') return;

    this.scene.tweens.killTweensOf(this.group);
    this.scene.tweens.killTweensOf(this.sprite);
    this.group.rotation = 0;
    this.group.scaleX = 1;
    this.group.scaleY = 1;
    this.group.x = this.scene.scale.width * 0.24;
    this.group.y = this.scene.scale.height * 0.73;
    this.sprite.scaleX = this.baseScaleX;
    this.sprite.scaleY = this.baseScaleY;
    this.sprite.alpha = 1;
    this.applyFrameOffset(step.frame);

    if (step.motion === 'sleep') {
      this.setState('sleep');
      this.startBreathing('sleep');
      return;
    }

    if (this.ctx.isReducedMotion() || !step.motion) return;

    const duration = Math.max(120, step.durationMs);
    if (step.motion === 'look') {
      this.scene.tweens.add({
        targets: this.group,
        rotation: -0.025,
        duration: Math.min(340, duration),
        ease: 'Sine.easeInOut',
      });
    } else if (step.motion === 'lookSettle' || step.motion === 'settle') {
      this.scene.tweens.add({
        targets: this.group,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        duration: Math.min(280, duration),
        ease: 'Sine.easeOut',
      });
    } else if (step.motion === 'headButtWindup') {
      this.scene.tweens.add({
        targets: this.group,
        x: this.group.x - 8,
        rotation: 0.035,
        duration,
        ease: 'Sine.easeInOut',
      });
    } else if (step.motion === 'headButtContact') {
      this.scene.tweens.add({
        targets: this.group,
        x: this.group.x + 14,
        rotation: -0.09,
        duration,
        ease: 'Sine.easeInOut',
      });
    } else if (step.motion === 'stretch') {
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: this.baseScaleX * 1.018,
        scaleY: this.baseScaleY * 0.992,
        duration: duration * 0.56,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    } else if (step.motion === 'groom') {
      this.scene.tweens.add({
        targets: this.group,
        rotation: 0.018,
        duration: 220,
        yoyo: true,
        repeat: Math.max(1, Math.floor(duration / 260)),
        ease: 'Sine.easeInOut',
      });
    } else if (step.motion === 'nap') {
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0.96,
        scaleX: this.baseScaleX * 0.992,
        scaleY: this.baseScaleY * 1.004,
        duration,
        ease: 'Sine.easeInOut',
      });
    } else if (step.motion === 'wake') {
      this.scene.tweens.add({
        targets: this.group,
        rotation: 0.026,
        duration: duration * 0.5,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    } else if (step.motion === 'proud') {
      this.scene.tweens.add({
        targets: this.group,
        scaleX: 1.025,
        scaleY: 0.99,
        duration: duration * 0.45,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }
  }

  private setState(state: PetAnimationState) {
    this.state = state;
    this.sleeping = state === 'sleep' || state === 'napStart';
    this.host.dataset.petState = state;
    if (state !== 'idle') this.host.dataset.petLastAction = state;
    if (state === 'sleep') this.host.dataset.petMotion = 'sleeping';
    else if (state === 'idle') {
      this.host.dataset.petMotion = this.ctx.isReducedMotion() ? 'still' : 'breathing';
    } else {
      this.host.dataset.petMotion = this.ctx.isReducedMotion() ? 'frame-change' : 'state-action';
    }
  }

  private startBreathing(kind: 'idle' | 'sleep') {
    if (!this.sprite || this.state !== kind) return;
    this.breathingTween?.stop();
    this.breathingTween = undefined;
    this.host.dataset.petMotion =
      kind === 'sleep' ? 'sleeping' : this.ctx.isReducedMotion() ? 'still' : 'breathing';
    if (this.ctx.isReducedMotion()) return;

    const breathing = PET_BREATHING[kind];
    // Idle breathing drifts from the sprite's current scale; sleep breathing
    // anchors to the base scale so a nap always settles to the same depth.
    const referenceScaleX = kind === 'idle' ? this.sprite.scaleX : this.baseScaleX;
    const referenceScaleY = kind === 'idle' ? this.sprite.scaleY : this.baseScaleY;
    this.breathingTween = this.scene.tweens.add({
      targets: this.sprite,
      scaleX: referenceScaleX * breathing.scaleX,
      scaleY: referenceScaleY * breathing.scaleY,
      alpha: breathing.alpha,
      duration: breathing.durationMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopMotionTweens() {
    if (this.group) {
      this.scene.tweens.killTweensOf(this.group);
      this.group.rotation = 0;
      this.group.scaleX = 1;
      this.group.scaleY = 1;
    }
    if (this.sprite) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.scaleX = this.baseScaleX;
      this.sprite.scaleY = this.baseScaleY;
      const currentFrame = this.host.dataset.petFrame;
      if (currentFrame && currentFrame in PET_FRAME_TEXTURES) {
        this.applyFrameOffset(currentFrame as PetFrameId);
      } else {
        this.sprite.x = 0;
        this.sprite.y = 0;
      }
      this.sprite.alpha = 1;
    }
    this.breathingTween?.stop();
    this.breathingTween = undefined;
  }
}
