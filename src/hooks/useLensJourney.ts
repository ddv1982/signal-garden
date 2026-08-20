import { useEffect, useState } from 'react';
import type { InnerLensProfile, LensKind, ReflectionSeed } from '../../shared/models';
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
  onSeedReady: (seed: ReflectionSeed) => void;
  onMessage: (message: string) => void;
  onEnterGarden: () => void;
};

export function useLensJourney({
  repository,
  profile,
  onProfileEnsured,
  onSeedReady,
  onMessage,
  onEnterGarden,
}: UseLensJourneyOptions) {
  const [lensDraft, setLensDraft] = useState(() => repository.loadLensSessionDraft());
  const [lensPanelOpen, setLensPanelOpen] = useState(false);
  const [lensInput, setLensInput] = useState('');

  useEffect(() => {
    if (lensDraft) repository.saveLensSessionDraft(lensDraft);
  }, [repository, lensDraft]);

  const currentLens = lensDraft?.currentLens ?? null;
  const currentLensDefinition = currentLens ? lensDefinitions[currentLens] : null;
  const lensOrder = lensOrderForProfile(profile);
  const lensStepNumber = currentLens ? lensOrder.indexOf(currentLens) + 1 : 0;
  const isLastLens = currentLens !== null && lensOrder[lensOrder.length - 1] === currentLens;

  function beginJourney() {
    const activeProfile = profile ?? createLensProfile('mixed', 'open');
    const draft = lensDraft ?? createLensSessionDraft(activeProfile);
    onProfileEnsured(activeProfile);
    setLensDraft(draft);
    setLensInput(draft.responses[lensDefinitions[draft.currentLens].responseKey]);
    setLensPanelOpen(true);
    onMessage(m.pet_signal_glowing());
    onEnterGarden();
  }

  function openLens(kind: LensKind) {
    if (!lensDraft) {
      beginJourney();
      return;
    }

    if (kind !== lensDraft.currentLens) {
      onMessage(m.pet_follow_glowing_lens());
      return;
    }

    setLensInput(lensDraft.responses[lensDefinitions[kind].responseKey]);
    setLensPanelOpen(true);
  }

  function submitCurrentLens(submittedInput = lensInput) {
    if (!lensDraft || !currentLensDefinition) return;

    const updatedDraft = completeLens(lensDraft, profile, submittedInput);
    setLensDraft(updatedDraft);
    setLensInput('');

    if (isLensSessionComplete(updatedDraft, profile)) {
      const journey = createJourneyFromSession(updatedDraft, profile);
      const seed = createReflectionSeedFromJourney(journey);
      setLensDraft(null);
      repository.clearLensSessionDraft();
      setLensPanelOpen(false);
      onMessage(m.pet_journey_becomes_seed());
      onSeedReady(seed);
      return;
    }

    const nextDefinition = lensDefinitions[updatedDraft.currentLens];
    setLensInput(updatedDraft.responses[nextDefinition.responseKey]);
    onMessage(m.pet_next_lens({ title: nextDefinition.title }));
  }

  function dropSession() {
    setLensDraft(null);
    setLensPanelOpen(false);
    setLensInput('');
    repository.clearLensSessionDraft();
  }

  function clearJourney() {
    dropSession();
    onMessage(m.pet_signal_settles());
  }

  function dismissPanel() {
    setLensPanelOpen(false);
  }

  function resetSession() {
    dropSession();
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
    dismissPanel,
    resetSession,
  };
}
