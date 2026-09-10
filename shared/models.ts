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

export const LENS_KINDS = [
  'word',
  'body',
  'emotion',
  'image',
  'observer',
  'meaning',
  'action',
] as const;

export type LensKind = (typeof LENS_KINDS)[number];

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
  sessionId?: string;
  revision?: number;
  currentLens: LensKind;
  responses: LensResponses;
  completedLensIds: LensKind[];
  startedAt: string;
  updatedAt: string;
};

export type LensJourney = {
  completedAt: string;
  lensOrder: readonly LensKind[];
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
  placement?: 'garden' | 'archive';
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

export type GardenState = {
  seeds: ReflectionSeed[];
};
