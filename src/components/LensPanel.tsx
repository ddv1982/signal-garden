import { useEffect, useRef } from 'react';
import type { LensKind, LensSessionDraft } from '../../shared/models';
import type { LensDefinition } from '../domain/lenses';
import { m } from '../paraglide/messages.js';

type LensPanelProps = {
  draft: LensSessionDraft;
  definition: LensDefinition;
  lensOrder: readonly LensKind[];
  stepNumber: number;
  isLastLens: boolean;
  input: string;
  saveStatus?: string;
  submitting?: boolean;
  onInputChange: (value: string) => void;
  onDismiss: () => void;
  onRest: () => void;
  onSubmit: (value: string) => void;
};

export function LensPanel({
  draft,
  definition,
  lensOrder,
  stepNumber,
  isLastLens,
  input,
  saveStatus,
  submitting = false,
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
      aria-label={m.lens_panel_label()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onDismiss();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(inputRef.current?.value ?? input);
      }}
    >
      <div>
        <p className="eyebrow">
          {m.lens_panel_eyebrow({ step: stepNumber, total: lensOrder.length })}
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
          disabled={submitting}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={definition.helper}
        />
      </label>
      {saveStatus && <p role="status">{saveStatus}</p>}
      <div className="form-actions">
        <button type="button" onClick={onRest}>
          {m.lens_let_it_rest()}
        </button>
        <button type="submit" className="primary-action" disabled={submitting}>
          {isLastLens ? m.lens_make_seed() : m.lens_continue()}
        </button>
      </div>
    </form>
  );
}
