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
    title: 'Loosen the word stones',
    actionLabel: 'Loosen Word',
    fieldLabel: 'What word or story is attached?',
    helper: 'Name the label as something appearing, not as the whole of you.',
    responseKey: 'wordLabel',
  },
  body: {
    kind: 'body',
    title: 'Notice the body weather',
    actionLabel: 'Feel Body',
    fieldLabel: 'Where does this show up in your body?',
    helper: 'A sensation, posture, temperature, pressure, or energy is enough.',
    responseKey: 'bodySignal',
  },
  emotion: {
    kind: 'emotion',
    title: 'Light the emotion lantern',
    actionLabel: 'Name Emotion',
    fieldLabel: 'What emotion is nearby?',
    helper: 'Use one word, several words, or a rough atmosphere.',
    responseKey: 'emotion',
  },
  image: {
    kind: 'image',
    title: 'Shape the image cloud',
    actionLabel: 'Shape Image',
    fieldLabel: 'If this had an image, what would it look like?',
    helper: 'A color, texture, scene, shape, or symbol can work.',
    responseKey: 'innerImage',
  },
  observer: {
    kind: 'observer',
    title: 'Rest by the observer pool',
    actionLabel: 'Pause Wider',
    fieldLabel: 'What notices this experience?',
    helper: 'This can be simple: "something in me is aware of it."',
    responseKey: 'observerNote',
  },
  meaning: {
    kind: 'meaning',
    title: 'Open the meaning gate',
    actionLabel: 'Open Meaning',
    fieldLabel: 'What else could be true beyond the first label?',
    helper: 'Try a kinder or wider meaning without forcing positivity.',
    responseKey: 'alternateMeaning',
  },
  action: {
    kind: 'action',
    title: 'Choose an action seed',
    actionLabel: 'Choose Action',
    fieldLabel: 'What is one tiny kind action?',
    helper: 'One doable compassionate step is enough.',
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
      ? `Noticing the story: “${response.wordLabel.trim()}”`
      : undefined,
    emotions: splitList(response.emotion),
    bodySignals: splitList(response.bodySignal),
    values: splitList(response.alternateMeaning),
    dreams: splitList(response.innerImage),
    tinyAction: response.tinyAction.trim() || 'Offer myself one small kind pause.',
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
