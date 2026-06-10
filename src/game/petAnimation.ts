import petAnimationManifest from '../assets/companion/companion.animations.json';

export type PetAnimationState =
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

export const PET_FRAME_TEXTURES = {
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
  plantProud: 'companion-plant-proud',
} as const;

export type PetFrameId = keyof typeof PET_FRAME_TEXTURES;

export const PET_FRAME_OFFSETS = petAnimationManifest.frameOffsets as Record<
  PetFrameId,
  { x: number; y: number }
>;

export type PetClipMotion =
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

export type PetClipStep = {
  frame: PetFrameId;
  durationMs: number;
  motion?: PetClipMotion;
};

export const PET_SEQUENCES = {
  attention: [
    { frame: 'idle', durationMs: 90 },
    { frame: 'curious', durationMs: 520, motion: 'look' },
    { frame: 'idle', durationMs: 240, motion: 'lookSettle' },
  ],
  headButt: [
    { frame: 'curious', durationMs: 150, motion: 'look' },
    { frame: 'headbuttWindup', durationMs: 260, motion: 'headButtWindup' },
    { frame: 'headbuttContact', durationMs: 290, motion: 'headButtContact' },
    { frame: 'settleBack', durationMs: 360, motion: 'settle' },
    { frame: 'idle', durationMs: 260, motion: 'lookSettle' },
  ],
  stretch: [
    { frame: 'curious', durationMs: 140, motion: 'look' },
    { frame: 'stretch', durationMs: 920, motion: 'stretch' },
    { frame: 'settleBack', durationMs: 320, motion: 'settle' },
    { frame: 'idle', durationMs: 260, motion: 'lookSettle' },
  ],
  groom: [
    { frame: 'curious', durationMs: 120, motion: 'look' },
    { frame: 'groom', durationMs: 560, motion: 'groom' },
    { frame: 'blinkSleepy', durationMs: 150, motion: 'blink' },
    { frame: 'groom', durationMs: 500, motion: 'groom' },
    { frame: 'settleBack', durationMs: 220, motion: 'settle' },
    { frame: 'idle', durationMs: 260, motion: 'lookSettle' },
  ],
  sleep: [
    { frame: 'blinkSleepy', durationMs: 300, motion: 'blink' },
    { frame: 'idle', durationMs: 180 },
    { frame: 'blinkSleepy', durationMs: 380, motion: 'blink' },
    { frame: 'napCurl', durationMs: 900, motion: 'nap' },
    { frame: 'sleeping', durationMs: 1200, motion: 'sleep' },
  ],
  wake: [
    { frame: 'wake', durationMs: 520, motion: 'wake' },
    { frame: 'blinkSleepy', durationMs: 120, motion: 'blink' },
    { frame: 'curious', durationMs: 320, motion: 'look' },
    { frame: 'idle', durationMs: 280, motion: 'lookSettle' },
  ],
  plantProud: [
    { frame: 'curious', durationMs: 150, motion: 'look' },
    { frame: 'headbuttContact', durationMs: 190, motion: 'headButtContact' },
    { frame: 'plantProud', durationMs: 620, motion: 'proud' },
    { frame: 'idle', durationMs: 300, motion: 'lookSettle' },
  ],
} satisfies Record<string, PetClipStep[]>;

export type PetSequenceId = keyof typeof PET_SEQUENCES;

export const PET_SEQUENCE_FINAL_STATES: Record<PetSequenceId, PetAnimationState> = {
  attention: 'idle',
  headButt: 'idle',
  stretch: 'idle',
  groom: 'idle',
  sleep: 'sleep',
  wake: 'idle',
  plantProud: 'idle',
};

/** How long the garden must stay quiet before the pet considers sleeping/waking. */
export const PET_SLEEP_TIMING = {
  initialCheckDelayMs: 12_000,
  checkIntervalMs: 18_000,
  checkIntervalJitterMs: 10_000,
  reducedMotionCheckIntervalMs: 26_000,
  quietBeforeSleepMs: 52_000,
  quietBeforeWakeMs: 76_000,
  /** A random roll must exceed these for the transition to happen. */
  sleepRollThreshold: 0.52,
  wakeRollThreshold: 0.72,
};

/** Cadence of idle posture variations (grooming, stretching, looking around). */
export const PET_POSTURE_TIMING = {
  initialDelayMs: 3_000,
  reducedMotionInitialDelayMs: 6_200,
  delayMs: 5_700,
  jitterMs: 7_200,
  reducedMotionDelayMs: 12_500,
  reducedMotionJitterMs: 5_200,
};

export const PET_BREATHING = {
  idle: { durationMs: 4200, alpha: 0.985, scaleX: 1.004, scaleY: 0.998 },
  sleep: { durationMs: 5200, alpha: 0.965, scaleX: 0.996, scaleY: 1.004 },
};

export function pickNextPostureAction(
  lastAction: PetAnimationState | null,
  hasSeeds: boolean,
  random: () => number = Math.random
): PetAnimationState {
  // Grooming is twice as likely once the garden has seeds.
  const choices: PetAnimationState[] = hasSeeds
    ? ['curious', 'groom', 'stretch', 'groom']
    : ['curious', 'groom', 'stretch'];
  const availableChoices = choices.filter((choice) => choice !== lastAction);
  return availableChoices[Math.floor(random() * availableChoices.length)] ?? 'curious';
}
