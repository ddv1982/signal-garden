import { useReducer } from 'react';
import type { SeedBloomOutcome } from '../../shared/models';

export type WateringFormState = {
  wateringLabel: string;
  wateringAction: string;
  wateringError: string;
  bloomOutcome: SeedBloomOutcome;
  bloomReflection: string;
  bloomError: string;
};

export const initialWateringFormState: WateringFormState = {
  wateringLabel: '',
  wateringAction: '',
  wateringError: '',
  bloomOutcome: 'done',
  bloomReflection: '',
  bloomError: '',
};

export type WateringFormAction =
  | { type: 'set-watering-label'; value: string }
  | { type: 'set-watering-action'; value: string }
  | { type: 'set-bloom-outcome'; value: SeedBloomOutcome }
  | { type: 'set-bloom-reflection'; value: string }
  | { type: 'watering-failed'; message: string }
  | { type: 'bloom-failed'; message: string }
  | { type: 'reset' };

export function wateringFormReducer(
  state: WateringFormState,
  action: WateringFormAction
): WateringFormState {
  switch (action.type) {
    case 'set-watering-label':
      return { ...state, wateringLabel: action.value, wateringError: '' };
    case 'set-watering-action':
      return { ...state, wateringAction: action.value, wateringError: '' };
    case 'set-bloom-outcome':
      return { ...state, bloomOutcome: action.value };
    case 'set-bloom-reflection':
      return { ...state, bloomReflection: action.value, bloomError: '' };
    case 'watering-failed':
      return { ...state, wateringError: action.message };
    case 'bloom-failed':
      return { ...state, bloomError: action.message };
    case 'reset':
      return initialWateringFormState;
  }
}

export function useWateringForm() {
  return useReducer(wateringFormReducer, initialWateringFormState);
}
