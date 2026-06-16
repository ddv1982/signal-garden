import { useEffect, useRef, useState } from 'react';
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
  const backdropRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const backdrop = backdropRef.current;
    const parent = backdrop?.parentElement;
    if (!backdrop || !parent) return;

    const restoredSiblings: Array<{
      element: HTMLElement;
      ariaHidden: string | null;
      inert: boolean;
    }> = [];

    for (const sibling of Array.from(parent.children)) {
      if (sibling === backdrop || !(sibling instanceof HTMLElement)) continue;
      restoredSiblings.push({
        element: sibling,
        ariaHidden: sibling.getAttribute('aria-hidden'),
        inert: Boolean(sibling.inert),
      });
      sibling.setAttribute('aria-hidden', 'true');
      sibling.inert = true;
    }

    return () => {
      for (const { element, ariaHidden, inert } of restoredSiblings) {
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
        element.inert = inert;
      }
    };
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
      )
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (!firstElement || !lastElement) return;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <section
      ref={backdropRef}
      className="onboarding-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      data-testid="onboarding-panel"
    >
      <form
        ref={panelRef}
        className="onboarding-panel"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
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
