import { useEffect, useRef, useState } from 'react';
import type {
  InnerLensProfile,
  LensKind,
  LensSessionDraft,
  ReflectionSeed,
} from '../../shared/models';
import {
  completeLens,
  createJourneyFromSession,
  createLensProfile,
  createLensSessionDraft,
  createReflectionSeedFromJourney,
  isLensSessionComplete,
  lensDefinitions,
  lensOrderForProfile,
} from '../domain/lenses';
import { m } from '../paraglide/messages.js';
import type { createSignalGardenRepository } from '../persistence/repositories';

type Repository = ReturnType<typeof createSignalGardenRepository>;
export type UseLensJourneyOptions = {
  repository: Repository;
  profile: InnerLensProfile | null;
  onProfileEnsured: (profile: InnerLensProfile) => void;
  onMessage: (message: string) => void;
  onEnterGarden: () => void;
};
export function useLensJourney({
  repository,
  profile,
  onProfileEnsured,
  onMessage,
  onEnterGarden,
}: UseLensJourneyOptions) {
  const [lensDraft, setLensDraft] = useState(() => repository.reflections.read().document.draft);
  const durable = useRef(lensDraft);
  const local = useRef(lensDraft);
  const queue = useRef(Promise.resolve(true));
  const generation = useRef(0);
  const [lensPanelOpen, setLensPanelOpen] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const completion = useRef<ReflectionSeed | null>(null);

  useEffect(
    () =>
      repository.reflections.subscribe(() => {
        const next = repository.reflections.read().document.draft;
        if (local.current === durable.current) {
          durable.current = next;
          local.current = next;
          setLensDraft(next);
        }
      }),
    [repository]
  );

  const currentLens = lensDraft?.currentLens ?? null;
  const currentLensDefinition = currentLens ? lensDefinitions[currentLens] : null;
  const lensOrder = lensOrderForProfile(profile);
  const lensStepNumber = currentLens ? lensOrder.indexOf(currentLens) + 1 : 0;
  const isLastLens = currentLens !== null && lensOrder[lensOrder.length - 1] === currentLens;
  const lensInput =
    lensDraft && currentLensDefinition
      ? lensDraft.responses[currentLensDefinition.responseKey]
      : '';

  function saveDraft(draft: LensSessionDraft) {
    const sequence = ++generation.current;
    local.current = draft;
    setLensDraft(draft);
    setSaveState('saving');
    queue.current = queue.current.then(async () => {
      const result = await repository.reflections.command({
        kind: 'draft',
        draft,
        expected: durable.current,
      });
      if (!result.ok) {
        setError(result.error);
        setSaveState('error');
        return false;
      }
      durable.current = result.document.draft;
      if (sequence === generation.current) {
        local.current = durable.current;
        setLensDraft(durable.current);
        setError(null);
        setSaveState('saved');
      }
      return true;
    });
    return queue.current;
  }
  function beginJourney() {
    if (repository.reflections.read().document.pendingSeed) return;
    const activeProfile = profile ?? createLensProfile('mixed', 'open');
    onProfileEnsured(activeProfile);
    if (!local.current)
      saveDraft({
        ...createLensSessionDraft(activeProfile),
        sessionId: crypto.randomUUID(),
        revision: 0,
      });
    setLensPanelOpen(true);
    onMessage(m.pet_signal_glowing());
    onEnterGarden();
  }
  function openLens(kind: LensKind) {
    if (!local.current) {
      beginJourney();
      return;
    }
    if (kind !== local.current.currentLens) {
      onMessage(m.pet_follow_glowing_lens());
      return;
    }
    setLensPanelOpen(true);
  }
  function setLensInput(value: string) {
    const draft = local.current;
    if (!draft || submittingRef.current) return;
    completion.current = null;
    saveDraft({
      ...draft,
      updatedAt: new Date().toISOString(),
      responses: { ...draft.responses, [lensDefinitions[draft.currentLens].responseKey]: value },
    });
  }
  async function submitCurrentLens(submittedInput = lensInput) {
    if (!local.current || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (!(await queue.current)) return;
      const draft = local.current;
      if (!draft) return;
      const updatedDraft = completeLens(draft, profile, submittedInput);
      if (isLensSessionComplete(updatedDraft, profile)) {
        const seed =
          completion.current ??
          createReflectionSeedFromJourney(createJourneyFromSession(updatedDraft, profile));
        completion.current = seed;
        const result = await repository.reflections.command({
          kind: 'complete',
          seed,
          expected: draft,
        });
        if (!result.ok) {
          setError(result.error);
          setSaveState('error');
          return;
        }
        durable.current = null;
        local.current = null;
        setLensDraft(null);
        setLensPanelOpen(false);
        setError(null);
        setSaveState('saved');
        onMessage(m.pet_journey_becomes_seed());
      } else if (await saveDraft(updatedDraft)) {
        onMessage(m.pet_next_lens({ title: lensDefinitions[updatedDraft.currentLens].title }));
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }
  async function dropSession() {
    if (!(await queue.current) || !durable.current) return false;
    const result = await repository.reflections.command({
      kind: 'discard-draft',
      expected: durable.current,
    });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    durable.current = null;
    local.current = null;
    setLensDraft(null);
    setLensPanelOpen(false);
    setError(null);
    return true;
  }
  async function clearJourney() {
    if (await dropSession()) onMessage(m.pet_signal_settles());
  }
  function retrySave() {
    if (local.current) return saveDraft(local.current);
  }
  return {
    lensDraft,
    currentLens,
    currentLensDefinition,
    lensOrder,
    lensStepNumber,
    isLastLens,
    lensPanelOpen,
    lensInput,
    setLensInput,
    beginJourney,
    openLens,
    submitCurrentLens,
    clearJourney,
    dismissPanel: () => setLensPanelOpen(false),
    resetSession: dropSession,
    saveState,
    error,
    submitting,
    retrySave,
  };
}
