import { describe, expect, it } from 'vitest';
import {
  PET_FRAME_TEXTURES,
  PET_SEQUENCE_FINAL_STATES,
  PET_SEQUENCES,
  pickNextPostureAction,
  type PetSequenceId,
} from '../petAnimation';

describe('pet sequence tables', () => {
  it('defines a final state for every sequence', () => {
    for (const sequence of Object.keys(PET_SEQUENCES) as PetSequenceId[]) {
      expect(PET_SEQUENCE_FINAL_STATES[sequence]).toBeDefined();
    }
  });

  it('only references frames that have textures', () => {
    for (const steps of Object.values(PET_SEQUENCES)) {
      for (const step of steps) {
        expect(PET_FRAME_TEXTURES[step.frame]).toBeDefined();
        expect(step.durationMs).toBeGreaterThan(0);
      }
    }
  });

  it('ends the sleep sequence on the sleeping frame', () => {
    const lastStep = PET_SEQUENCES.sleep[PET_SEQUENCES.sleep.length - 1];
    expect(lastStep.frame).toBe('sleeping');
    expect(PET_SEQUENCE_FINAL_STATES.sleep).toBe('sleep');
  });
});

describe('pickNextPostureAction', () => {
  it('never repeats the previous posture', () => {
    for (let roll = 0; roll < 1; roll += 0.1) {
      const action = pickNextPostureAction('groom', false, () => roll);
      expect(action).not.toBe('groom');
    }
  });

  it('only picks grooming twice as often when seeds exist', () => {
    const seen = new Set<string>();
    for (let roll = 0; roll < 1; roll += 0.05) {
      seen.add(pickNextPostureAction(null, true, () => roll));
    }
    expect(seen).toEqual(new Set(['curious', 'groom', 'stretch']));
  });

  it('falls back to curious when the roll lands out of range', () => {
    expect(pickNextPostureAction(null, false, () => 1)).toBe('curious');
  });
});
