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
import type { createSignalGardenRepository } from '../persistence/repositories';

type Repository = ReturnType<typeof createSignalGardenRepository>;

export type UseLensJourneyOptions = {
  repository: Repository;
  profile: InnerLensProfile | null;
  /** Called when starting a journey without a profile; the caller owns profile state. */
  onProfileEnsured: (profile: InnerLensProfile) => void;
  /** Called when the final lens completes and the journey has become a seed. */
  onSeedReady: (seed: ReflectionSeed) => void;
  onMessage: (message: string) => void;
  /** Called when beginning a journey should bring the garden into view. */
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
    onMessage('A signal is glowing. Move through it one lens at a time.');
    onEnterGarden();
  }

  function openLens(kind: LensKind) {
    if (!lensDraft) {
      beginJourney();
      return;
    }

    if (kind !== lensDraft.currentLens) {
      onMessage('Follow the glowing lens one step at a time.');
      return;
    }

    setLensInput(lensDraft.responses[lensDefinitions[kind].responseKey]);
    setLensPanelOpen(true);
  }

  function submitCurrentLens() {
    if (!lensDraft || !currentLensDefinition) return;

    const updatedDraft = completeLens(lensDraft, profile, lensInput);
    setLensDraft(updatedDraft);
    setLensInput('');

    if (isLensSessionComplete(updatedDraft, profile)) {
      const journey = createJourneyFromSession(updatedDraft, profile);
      const seed = createReflectionSeedFromJourney(journey);
      setLensDraft(null);
      repository.clearLensSessionDraft();
      setLensPanelOpen(false);
      onMessage('The lens journey becomes a seed. Plant it in the soil.');
      onSeedReady(seed);
      return;
    }

    const nextDefinition = lensDefinitions[updatedDraft.currentLens];
    setLensInput(updatedDraft.responses[nextDefinition.responseKey]);
    onMessage(`${nextDefinition.title}. Your pet stays close.`);
  }

  function clearJourney() {
    setLensDraft(null);
    setLensPanelOpen(false);
    setLensInput('');
    repository.clearLensSessionDraft();
    onMessage('The signal settles back into the garden.');
  }

  function dismissPanel() {
    setLensPanelOpen(false);
  }

  /** Drops the in-progress session without the "settles back" message (settings reset). */
  function resetSession() {
    setLensDraft(null);
    setLensPanelOpen(false);
    setLensInput('');
    repository.clearLensSessionDraft();
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
