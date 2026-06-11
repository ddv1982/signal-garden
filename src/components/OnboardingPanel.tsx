import { useState } from 'react';
import type { InnerExperienceMode, LensPromptOrder } from '../../shared/models';
import { m } from '../paraglide/messages.js';

const modeOptions: Array<{ value: InnerExperienceMode; label: string }> = [
  { value: 'words', label: m.onboarding_mode_words() },
  { value: 'images', label: m.onboarding_mode_images() },
  { value: 'body', label: m.onboarding_mode_body() },
  { value: 'emotions', label: m.onboarding_mode_emotions() },
  { value: 'knowing', label: m.onboarding_mode_knowing() },
  { value: 'mixed', label: m.onboarding_mode_mixed() },
];

const orderOptions: Array<{ value: LensPromptOrder; label: string }> = [
  { value: 'open', label: m.onboarding_order_open() },
  { value: 'word-first', label: m.onboarding_order_word_first() },
  { value: 'body-first', label: m.onboarding_order_body_first() },
  { value: 'image-first', label: m.onboarding_order_image_first() },
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
        <p className="eyebrow">{m.onboarding_eyebrow()}</p>
        <h2 id="onboarding-title">{m.onboarding_title()}</h2>
        <p>{m.onboarding_description()}</p>
        <fieldset>
          <legend>{m.onboarding_most_familiar_signal()}</legend>
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
          <legend>{m.onboarding_gentle_path()}</legend>
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
          {m.onboarding_start()}
        </button>
      </form>
    </section>
  );
}
