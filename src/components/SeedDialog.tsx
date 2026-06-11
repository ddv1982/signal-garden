import { useEffect, useRef, useState } from 'react';
import type { ReflectionSeed } from '../../shared/models';
import { seedStatusLabel } from '../domain/accessibilityCopy';
import { lensDefinitions } from '../domain/lenses';
import {
  bloomOutcomeLabel,
  bloomOutcomeOptions,
  growthIndexForSeed,
  growthStepLabels,
  isReadyToBloom,
  seedStageCopy,
  wateringPromptForSeed,
} from '../domain/seedDisplay';
import type { SeedBloomInput, SeedWateringInput } from '../domain/seedGrowth';
import { useWateringForm } from '../hooks/useWateringForm';
import { m } from '../paraglide/messages.js';

type SeedDialogTab = 'overview' | 'water' | 'history';

type SeedDialogProps = {
  seed: ReflectionSeed;
  onClose: () => void;
  /** Returns an error message to show in the form, or null on success. */
  onWater: (seed: ReflectionSeed, input: SeedWateringInput) => string | null;
  /** Returns an error message to show in the form, or null on success. */
  onBloom: (seed: ReflectionSeed, input: SeedBloomInput) => string | null;
};

export function SeedDialog({ seed, onClose, onWater, onBloom }: SeedDialogProps) {
  const [activeTab, setActiveTab] = useState<SeedDialogTab>('overview');
  const [form, dispatch] = useWateringForm();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }
  }, []);

  function submitWatering(event: React.FormEvent) {
    event.preventDefault();
    const transformedLabel = form.wateringLabel.trim();
    const kindAction = form.wateringAction.trim();
    if (!transformedLabel || !kindAction) {
      dispatch({
        type: 'watering-failed',
        message: m.seed_dialog_validation_watering(),
      });
      return;
    }

    const error = onWater(seed, { transformedLabel, kindAction });
    if (error) {
      dispatch({ type: 'watering-failed', message: error });
      return;
    }
    dispatch({ type: 'reset' });
  }

  function submitBloom(event: React.FormEvent) {
    event.preventDefault();
    const reflection = form.bloomReflection.trim();
    if (!reflection) {
      dispatch({
        type: 'bloom-failed',
        message: m.seed_dialog_validation_bloom(),
      });
      return;
    }

    const error = onBloom(seed, { outcome: form.bloomOutcome, reflection });
    if (error) {
      dispatch({ type: 'bloom-failed', message: error });
      return;
    }
    dispatch({ type: 'reset' });
    setActiveTab('overview');
  }

  return (
    <dialog
      ref={dialogRef}
      className="seed-dialog"
      aria-labelledby="seed-dialog-title"
      onClose={onClose}
    >
      <div className="dialog-heading">
        <p className="eyebrow">{m.seed_dialog_eyebrow({ status: seedStatusLabel(seed.status) })}</p>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label={m.seed_dialog_close_details()}
          onClick={onClose}
        >
          {m.seed_dialog_close()}
        </button>
      </div>
      <h2 id="seed-dialog-title">
        {seed.unhookedText || seed.labelText || m.seed_dialog_fallback_title()}
      </h2>
      <div className="seed-dialog-tabs" role="tablist" aria-label={m.seed_dialog_details_label()}>
        {(['overview', 'water', 'history'] as SeedDialogTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? 'seed-dialog-tab active' : 'seed-dialog-tab'}
            onClick={() => setActiveTab(tab)}
          >
            {seedDialogTabLabel(tab)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <section className="seed-dialog-panel" role="tabpanel">
          <div className="seed-stage-card">
            <p className="eyebrow">{seedStageCopy(seed).eyebrow}</p>
            <strong>{seedStageCopy(seed).title}</strong>
            <span>{seedStageCopy(seed).description}</span>
          </div>
          <div className="seed-progress" aria-label={m.seed_dialog_growth_progress()}>
            {growthStepLabels.map((step, index) => (
              <span key={step} className={index <= growthIndexForSeed(seed) ? 'complete' : ''}>
                {step}
              </span>
            ))}
          </div>
          <p>
            <strong>{m.seed_dialog_goal_label()}</strong> {seed.tinyAction}
          </p>
          {seed.bloomReflection && (
            <p>
              <strong>{m.seed_dialog_bloom_reflection_label()}</strong>{' '}
              {seed.bloomReflection.reflection}
            </p>
          )}
          <button type="button" className="primary-action" onClick={() => setActiveTab('water')}>
            {seed.bloomReflection
              ? m.seed_dialog_review_growth()
              : isReadyToBloom(seed)
                ? m.seed_dialog_reflect_to_flower()
                : m.seed_dialog_water_seed()}
          </button>
        </section>
      )}

      {activeTab === 'water' && (
        <section className="seed-dialog-panel" role="tabpanel">
          {seed.bloomReflection ? (
            <div className="seed-stage-card">
              <p className="eyebrow">{m.seed_stage_flower_eyebrow()}</p>
              <strong>{m.seed_stage_flower_title()}</strong>
              <span>{seed.bloomReflection.reflection}</span>
            </div>
          ) : isReadyToBloom(seed) ? (
            <form className="watering-form" data-testid="bloom-form" onSubmit={submitBloom}>
              <fieldset>
                <legend>{m.seed_dialog_bloom_legend()}</legend>
                <div className="segmented-grid">
                  {bloomOutcomeOptions.map((option) => (
                    <label
                      key={option.value}
                      className={
                        form.bloomOutcome === option.value ? 'segment selected' : 'segment'
                      }
                    >
                      <input
                        type="radio"
                        name="bloom-outcome"
                        value={option.value}
                        checked={form.bloomOutcome === option.value}
                        onChange={() =>
                          dispatch({ type: 'set-bloom-outcome', value: option.value })
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                {m.seed_dialog_bloom_label()}
                <textarea
                  value={form.bloomReflection}
                  onChange={(event) =>
                    dispatch({ type: 'set-bloom-reflection', value: event.target.value })
                  }
                  placeholder={m.seed_dialog_bloom_placeholder()}
                  required
                />
              </label>
              {form.bloomError && (
                <p className="form-error" role="alert">
                  {form.bloomError}
                </p>
              )}
              <div className="form-actions">
                <button type="button" onClick={() => dispatch({ type: 'reset' })}>
                  {m.lens_let_it_rest()}
                </button>
                <button type="submit" className="primary-action">
                  {m.seed_dialog_bloom_submit()}
                </button>
              </div>
            </form>
          ) : (
            <form className="watering-form" data-testid="watering-form" onSubmit={submitWatering}>
              <label>
                {wateringPromptForSeed(seed).label}
                <textarea
                  value={form.wateringLabel}
                  onChange={(event) =>
                    dispatch({ type: 'set-watering-label', value: event.target.value })
                  }
                  placeholder={wateringPromptForSeed(seed).labelPlaceholder}
                  required
                />
              </label>
              <label>
                {wateringPromptForSeed(seed).actionLabel}
                <textarea
                  value={form.wateringAction}
                  onChange={(event) =>
                    dispatch({ type: 'set-watering-action', value: event.target.value })
                  }
                  placeholder={wateringPromptForSeed(seed).actionPlaceholder}
                  required
                />
              </label>
              {form.wateringError && (
                <p className="form-error" role="alert">
                  {form.wateringError}
                </p>
              )}
              <div className="form-actions">
                <button type="button" onClick={() => dispatch({ type: 'reset' })}>
                  {m.lens_let_it_rest()}
                </button>
                <button type="submit" className="primary-action">
                  {m.seed_dialog_water_seed()}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {activeTab === 'history' && (
        <section className="seed-dialog-panel" role="tabpanel">
          <details>
            <summary>{m.seed_dialog_original_journey()}</summary>
            <div className="journey-detail">
              <p>
                <strong>{m.seed_dialog_history_action()}</strong> {seed.tinyAction}
              </p>
              {seed.emotions.length > 0 && (
                <p>
                  <strong>{m.seed_dialog_history_emotions()}</strong> {seed.emotions.join(', ')}
                </p>
              )}
              {seed.bodySignals.length > 0 && (
                <p>
                  <strong>{m.seed_dialog_history_body()}</strong> {seed.bodySignals.join(', ')}
                </p>
              )}
              {seed.values.length > 0 && (
                <p>
                  <strong>{m.seed_dialog_history_meaning()}</strong> {seed.values.join(', ')}
                </p>
              )}
              {seed.dreams.length > 0 && (
                <p>
                  <strong>{m.seed_dialog_history_image()}</strong> {seed.dreams.join(', ')}
                </p>
              )}
              {seed.lensJourney?.lensOrder.map((kind) => {
                const definition = lensDefinitions[kind];
                const value = seed.lensJourney?.responses[definition.responseKey];
                if (!value) return null;
                return (
                  <p key={kind}>
                    <strong>{definition.actionLabel}:</strong> {value}
                  </p>
                );
              })}
            </div>
          </details>
          <details>
            <summary>{m.seed_dialog_watering_history()}</summary>
            <div className="watering-history">
              {seed.waterings && seed.waterings.length > 0 ? (
                seed.waterings.map((watering, index) => (
                  <p key={watering.id}>
                    <strong>
                      {index + 1}. {watering.transformedLabel}
                    </strong>
                    <span>{watering.kindAction}</span>
                  </p>
                ))
              ) : (
                <p>{m.seed_dialog_no_waterings()}</p>
              )}
              {seed.bloomReflection && (
                <p>
                  <strong>
                    {m.seed_dialog_flower_outcome({
                      outcome: bloomOutcomeLabel(seed.bloomReflection.outcome),
                    })}
                  </strong>
                  <span>{seed.bloomReflection.reflection}</span>
                </p>
              )}
            </div>
          </details>
        </section>
      )}
    </dialog>
  );
}

function seedDialogTabLabel(tab: SeedDialogTab) {
  switch (tab) {
    case 'overview':
      return m.seed_dialog_tab_overview();
    case 'water':
      return m.seed_dialog_tab_water();
    case 'history':
      return m.seed_dialog_tab_history();
  }
}
