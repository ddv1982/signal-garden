import Phaser from 'phaser';
import type { GardenState, LensKind, ReflectionSeed } from '../../shared/models';
import type { ActiveTheme } from '../domain/theme';
import {
  GardenScene,
  type GardenSceneOptions,
  type PlantingPosition,
  type WateringEvent,
} from './scenes/GardenScene';
import type { PetFrameId, PetSequenceId } from './petAnimation';

export type { PetFrameId, PetSequenceId } from './petAnimation';
export type GardenGameOptions = GardenSceneOptions;
export type { PlantingPosition, WateringEvent };

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
  const scene = new GardenScene(options);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    backgroundColor: options.theme === 'dark' ? '#26383f' : '#f7ead7',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: options.parent.clientWidth || 720,
      height: options.parent.clientHeight || 520,
    },
    scene,
  });

  return {
    update(
      state,
      reducedMotion,
      theme,
      pendingSeed,
      currentLens,
      lensSessionActive,
      lastWateringEvent
    ) {
      scene.setGardenState(
        state,
        reducedMotion,
        theme,
        pendingSeed,
        currentLens,
        lensSessionActive,
        lastWateringEvent
      );
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
    },
  };
}
