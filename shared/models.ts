export type SeedStatus = 'planted' | 'sprouted' | 'growing' | 'blooming' | 'resting';

export type SeedVisualType = 'seed' | 'sprout' | 'bud' | 'flower' | 'vine' | 'lantern' | 'stone';

export type GardenPlot = {
  id: string;
  x: number;
  y: number;
  band: 'front' | 'middle' | 'back';
  scale: number;
  depth: number;
};

export type LensKind = 'word' | 'body' | 'emotion' | 'image' | 'observer' | 'meaning' | 'action';

export type InnerExperienceMode = 'words' | 'images' | 'body' | 'emotions' | 'knowing' | 'mixed';

export type LensPromptOrder = 'word-first' | 'body-first' | 'image-first' | 'open';

export type InnerLensProfile = {
  preferredMode: InnerExperienceMode;
  promptOrder: LensPromptOrder;
  completedAt: string;
};

export type LensResponses = {
  wordLabel: string;
  bodySignal: string;
  emotion: string;
  innerImage: string;
  observerNote: string;
  alternateMeaning: string;
  tinyAction: string;
};

export type LensSessionDraft = {
  currentLens: LensKind;
  responses: LensResponses;
  completedLensIds: LensKind[];
  startedAt: string;
  updatedAt: string;
};

export type LensJourney = {
  completedAt: string;
  lensOrder: LensKind[];
  responses: LensResponses;
};

export type SeedWatering = {
  id: string;
  createdAt: string;
  fromLabel: string;
  transformedLabel: string;
  kindAction: string;
  note?: string;
};

export type SeedBloomOutcome = 'done' | 'adapted' | 'more-care';

export type SeedBloomReflection = {
  completedAt: string;
  outcome: SeedBloomOutcome;
  reflection: string;
};

export type ReflectionSeed = {
  id: string;
  createdAt: string;
  labelText?: string;
  unhookedText?: string;
  emotions: string[];
  bodySignals: string[];
  values: string[];
  dreams: string[];
  tinyAction: string;
  status: SeedStatus;
  gardenPosition?: { x: number; y: number };
  gardenPlotId?: string;
  plantedAt?: string;
  lastGrowthAt?: string;
  lastWateredAt?: string;
  growthPoints?: number;
  visualType: SeedVisualType;
  waterings?: SeedWatering[];
  bloomReflection?: SeedBloomReflection;
  lensJourney?: LensJourney;
};

export type PetMood = 'curious' | 'cozy' | 'attentive' | 'sleepy' | 'proud' | 'concerned';

export type PetState = {
  name: string;
  mood: PetMood;
  lastInteractionAt?: string;
  unlockedInteractionVariants: string[];
};

export type GardenState = {
  seeds: ReflectionSeed[];
  pet: PetState;
};
