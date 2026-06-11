import type {
  InnerExperienceMode,
  InnerLensProfile,
  LensJourney,
  LensKind,
  LensPromptOrder,
  LensResponses,
  LensSessionDraft,
  ReflectionSeed,
  SeedVisualType,
} from '../../shared/models';
import { m } from '../paraglide/messages.js';

export const lensKinds: LensKind[] = [
  'word',
  'body',
  'emotion',
  'image',
  'observer',
  'meaning',
  'action',
];

export const emptyLensResponses: LensResponses = {
  wordLabel: '',
  bodySignal: '',
  emotion: '',
  innerImage: '',
  observerNote: '',
  alternateMeaning: '',
  tinyAction: '',
};

export const defaultLensProfile: InnerLensProfile = {
  preferredMode: 'mixed',
  promptOrder: 'open',
  completedAt: '',
};

export type LensDefinition = {
  kind: LensKind;
  title: string;
  actionLabel: string;
  fieldLabel: string;
  helper: string;
  responseKey: keyof LensResponses;
};

export const lensDefinitions: Record<LensKind, LensDefinition> = {
  word: {
    kind: 'word',
    title: m.lens_word_title(),
    actionLabel: m.lens_word_action(),
    fieldLabel: m.lens_word_field(),
    helper: m.lens_word_helper(),
    responseKey: 'wordLabel',
  },
  body: {
    kind: 'body',
    title: m.lens_body_title(),
    actionLabel: m.lens_body_action(),
    fieldLabel: m.lens_body_field(),
    helper: m.lens_body_helper(),
    responseKey: 'bodySignal',
  },
  emotion: {
    kind: 'emotion',
    title: m.lens_emotion_title(),
    actionLabel: m.lens_emotion_action(),
    fieldLabel: m.lens_emotion_field(),
    helper: m.lens_emotion_helper(),
    responseKey: 'emotion',
  },
  image: {
    kind: 'image',
    title: m.lens_image_title(),
    actionLabel: m.lens_image_action(),
    fieldLabel: m.lens_image_field(),
    helper: m.lens_image_helper(),
    responseKey: 'innerImage',
  },
  observer: {
    kind: 'observer',
    title: m.lens_observer_title(),
    actionLabel: m.lens_observer_action(),
    fieldLabel: m.lens_observer_field(),
    helper: m.lens_observer_helper(),
    responseKey: 'observerNote',
  },
  meaning: {
    kind: 'meaning',
    title: m.lens_meaning_title(),
    actionLabel: m.lens_meaning_action(),
    fieldLabel: m.lens_meaning_field(),
    helper: m.lens_meaning_helper(),
    responseKey: 'alternateMeaning',
  },
  action: {
    kind: 'action',
    title: m.lens_action_title(),
    actionLabel: m.lens_action_action(),
    fieldLabel: m.lens_action_field(),
    helper: m.lens_action_helper(),
    responseKey: 'tinyAction',
  },
};

export function createLensProfile(
  preferredMode: InnerExperienceMode,
  promptOrder: LensPromptOrder
): InnerLensProfile {
  return {
    preferredMode,
    promptOrder,
    completedAt: new Date().toISOString(),
  };
}

export function createLensSessionDraft(profile: InnerLensProfile): LensSessionDraft {
  const now = new Date().toISOString();
  const order = lensOrderForProfile(profile);

  return {
    currentLens: order[0],
    responses: { ...emptyLensResponses },
    completedLensIds: [],
    startedAt: now,
    updatedAt: now,
  };
}

export function lensOrderForProfile(profile: InnerLensProfile | null): LensKind[] {
  const order = profile?.promptOrder ?? 'open';
  if (order === 'body-first')
    return ['body', 'emotion', 'word', 'image', 'observer', 'meaning', 'action'];
  if (order === 'image-first')
    return ['image', 'emotion', 'body', 'word', 'observer', 'meaning', 'action'];
  return lensKinds;
}

export function nextLens(current: LensKind, profile: InnerLensProfile | null): LensKind | null {
  const order = lensOrderForProfile(profile);
  const index = order.indexOf(current);
  return order[index + 1] ?? null;
}

export function completeLens(
  draft: LensSessionDraft,
  profile: InnerLensProfile | null,
  value: string
): LensSessionDraft {
  const definition = lensDefinitions[draft.currentLens];
  const completed = draft.completedLensIds.includes(draft.currentLens)
    ? draft.completedLensIds
    : [...draft.completedLensIds, draft.currentLens];
  const followingLens = nextLens(draft.currentLens, profile);

  return {
    ...draft,
    currentLens: followingLens ?? draft.currentLens,
    responses: {
      ...draft.responses,
      [definition.responseKey]: value.trim(),
    },
    completedLensIds: completed,
    updatedAt: new Date().toISOString(),
  };
}

export function isLensSessionComplete(
  draft: LensSessionDraft,
  profile: InnerLensProfile | null
): boolean {
  const required = lensOrderForProfile(profile);
  return required.every((kind) => draft.completedLensIds.includes(kind));
}

export function createJourneyFromSession(
  draft: LensSessionDraft,
  profile: InnerLensProfile | null
): LensJourney {
  return {
    completedAt: new Date().toISOString(),
    lensOrder: lensOrderForProfile(profile),
    responses: { ...draft.responses },
  };
}

export function createReflectionSeedFromJourney(journey: LensJourney): ReflectionSeed {
  const createdAt = new Date().toISOString();
  const response = journey.responses;
  const visualType = visualTypeForJourney(journey);

  return {
    id: crypto.randomUUID?.() ?? createdAt,
    createdAt,
    labelText: response.wordLabel.trim(),
    unhookedText: response.wordLabel.trim()
      ? m.lens_unhooked_text({ word: response.wordLabel.trim() })
      : undefined,
    emotions: splitList(response.emotion),
    bodySignals: splitList(response.bodySignal),
    values: splitList(response.alternateMeaning),
    dreams: splitList(response.innerImage),
    tinyAction: response.tinyAction.trim() || m.lens_default_tiny_action(),
    status: 'planted',
    visualType,
    lensJourney: journey,
  };
}

function visualTypeForJourney(journey: LensJourney): SeedVisualType {
  if (journey.responses.alternateMeaning.trim()) return 'stone';
  if (journey.responses.innerImage.trim()) return 'flower';
  if (journey.responses.bodySignal.trim() || journey.responses.emotion.trim()) return 'vine';
  return 'seed';
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
