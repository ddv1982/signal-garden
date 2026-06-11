import { describe, expect, it } from 'vitest';
import { m } from '../../paraglide/messages.js';
import {
  initialWateringFormState,
  wateringFormReducer,
  type WateringFormState,
} from '../useWateringForm';

describe('wateringFormReducer', () => {
  it('updates fields and clears the matching error on edit', () => {
    const withError: WateringFormState = {
      ...initialWateringFormState,
      wateringError: 'Add both fields.',
      bloomError: 'Add one reflection.',
    };

    const afterLabel = wateringFormReducer(withError, {
      type: 'set-watering-label',
      value: 'softer',
    });
    expect(afterLabel.wateringLabel).toBe('softer');
    expect(afterLabel.wateringError).toBe('');
    expect(afterLabel.bloomError).toBe('Add one reflection.');

    const afterReflection = wateringFormReducer(withError, {
      type: 'set-bloom-reflection',
      value: 'it grew',
    });
    expect(afterReflection.bloomReflection).toBe('it grew');
    expect(afterReflection.bloomError).toBe('');
    expect(afterReflection.wateringError).toBe('Add both fields.');
  });

  it('records validation failures per form', () => {
    const wateringFailed = wateringFormReducer(initialWateringFormState, {
      type: 'watering-failed',
      message: m.seed_dialog_validation_watering(),
    });
    expect(wateringFailed.wateringError).toContain('softened label');

    const bloomFailed = wateringFormReducer(initialWateringFormState, {
      type: 'bloom-failed',
      message: m.seed_dialog_validation_bloom(),
    });
    expect(bloomFailed.bloomError).toContain('reflection');
  });

  it('selects a bloom outcome without touching errors', () => {
    const state = wateringFormReducer(
      { ...initialWateringFormState, bloomError: 'kept' },
      { type: 'set-bloom-outcome', value: 'adapted' }
    );
    expect(state.bloomOutcome).toBe('adapted');
    expect(state.bloomError).toBe('kept');
  });

  it('resets to the initial state', () => {
    const dirty: WateringFormState = {
      wateringLabel: 'a',
      wateringAction: 'b',
      wateringError: 'c',
      bloomOutcome: 'more-care',
      bloomReflection: 'd',
      bloomError: 'e',
    };
    expect(wateringFormReducer(dirty, { type: 'reset' })).toEqual(initialWateringFormState);
  });
});
