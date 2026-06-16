import Phaser from 'phaser';
import {
  GardenScene,
  type GardenSceneOptions,
  type GardenSceneUpdate,
  type PlantingPosition,
  type WateringEvent,
} from './scenes/GardenScene';
import type { PetFrameId, PetSequenceId } from './petAnimation';

export type { PetFrameId, PetSequenceId } from './petAnimation';
export type GardenGameOptions = GardenSceneOptions;
export type GardenGameUpdate = GardenSceneUpdate;
export type { PlantingPosition, WateringEvent };

export type GardenGameHandle = {
  update(update: GardenGameUpdate): void;
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
    update(update) {
      scene.setGardenState(update);
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
