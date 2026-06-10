import { useEffect, useRef } from 'react';
import type { LensKind, LensSessionDraft } from '../../shared/models';
import type { LensDefinition } from '../domain/lenses';

type LensPanelProps = {
  draft: LensSessionDraft;
  definition: LensDefinition;
  lensOrder: LensKind[];
  stepNumber: number;
  isLastLens: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onDismiss: () => void;
  onRest: () => void;
  onSubmit: () => void;
};

export function LensPanel({
  draft,
  definition,
  lensOrder,
  stepNumber,
  isLastLens,
  input,
  onInputChange,
  onDismiss,
  onRest,
  onSubmit,
}: LensPanelProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      className="signal-panel lens-panel"
      data-testid="lens-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="lens-panel-title"
      aria-label="Move this signal through the current lens"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onDismiss();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <p className="eyebrow">
          Current lens · Step {stepNumber} of {lensOrder.length}
        </p>
        <h3 id="lens-panel-title">{definition.title}</h3>
        <div className="lens-step-meter" aria-hidden="true">
          {lensOrder.map((kind) => (
            <span
              key={kind}
              className={
                kind === draft.currentLens
                  ? 'meter-step active'
                  : draft.completedLensIds.includes(kind)
                    ? 'meter-step complete'
                    : 'meter-step'
              }
            />
          ))}
        </div>
      </div>
      <label>
        {definition.fieldLabel}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={definition.helper}
        />
      </label>
      <div className="form-actions">
        <button type="button" onClick={onRest}>
          Let it rest
        </button>
        <button type="submit" className="primary-action">
          {isLastLens ? 'Make Seed' : 'Continue'}
        </button>
      </div>
    </form>
  );
}
