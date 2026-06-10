import { useState } from 'react';
import type { InnerExperienceMode, LensPromptOrder } from '../../shared/models';

const modeOptions: Array<{ value: InnerExperienceMode; label: string }> = [
  { value: 'words', label: 'Words' },
  { value: 'images', label: 'Images' },
  { value: 'body', label: 'Body' },
  { value: 'emotions', label: 'Emotions' },
  { value: 'knowing', label: 'Quiet knowing' },
  { value: 'mixed', label: 'Mixed' },
];

const orderOptions: Array<{ value: LensPromptOrder; label: string }> = [
  { value: 'open', label: 'Open path' },
  { value: 'word-first', label: 'Words first' },
  { value: 'body-first', label: 'Body first' },
  { value: 'image-first', label: 'Images first' },
];

type OnboardingPanelProps = {
  onComplete: (mode: InnerExperienceMode, order: LensPromptOrder) => void;
};

export function OnboardingPanel({ onComplete }: OnboardingPanelProps) {
  const [mode, setMode] = useState<InnerExperienceMode>('mixed');
  const [order, setOrder] = useState<LensPromptOrder>('open');

  return (
    <section
      className="onboarding-backdrop"
      aria-labelledby="onboarding-title"
      data-testid="onboarding-panel"
    >
      <form
        className="onboarding-panel"
        onSubmit={(event) => {
          event.preventDefault();
          onComplete(mode, order);
        }}
      >
        <p className="eyebrow">Inner lens profile</p>
        <h2 id="onboarding-title">How does experience usually arrive for you?</h2>
        <p>
          This only changes the order and emphasis of garden prompts. It is stored locally and is
          not a diagnosis.
        </p>
        <fieldset>
          <legend>Most familiar signal</legend>
          <div className="segmented-grid">
            {modeOptions.map((option) => (
              <label
                key={option.value}
                className={mode === option.value ? 'segment selected' : 'segment'}
              >
                <input
                  type="radio"
                  name="preferred-mode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Gentle path</legend>
          <div className="segmented-grid">
            {orderOptions.map((option) => (
              <label
                key={option.value}
                className={order === option.value ? 'segment selected' : 'segment'}
              >
                <input
                  type="radio"
                  name="prompt-order"
                  value={option.value}
                  checked={order === option.value}
                  onChange={() => setOrder(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="primary-action">
          Start in the Garden
        </button>
      </form>
    </section>
  );
}
