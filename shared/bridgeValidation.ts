import type {
  GardenState,
  InnerExperienceMode,
  LensKind,
  LensPromptOrder,
  LensResponses,
  PetMood,
  PetState,
  ReflectionSeed,
  SeedBloomOutcome,
  SeedBloomReflection,
  SeedWatering,
  SeedStatus,
  SeedVisualType
} from './models';

const petMoods: PetMood[] = ['curious', 'cozy', 'attentive', 'sleepy', 'proud', 'concerned'];
const seedStatuses: SeedStatus[] = ['planted', 'sprouted', 'growing', 'blooming', 'resting'];
const seedVisualTypes: SeedVisualType[] = ['seed', 'sprout', 'bud', 'flower', 'vine', 'lantern', 'stone'];
const seedBloomOutcomes: SeedBloomOutcome[] = ['done', 'adapted', 'more-care'];
const lensKinds: LensKind[] = ['word', 'body', 'emotion', 'image', 'observer', 'meaning', 'action'];
const innerExperienceModes: InnerExperienceMode[] = ['words', 'images', 'body', 'emotions', 'knowing', 'mixed'];
const lensPromptOrders: LensPromptOrder[] = ['word-first', 'body-first', 'image-first', 'open'];

type UnknownRecord = Record<string, unknown>;

export function parseStoredJson(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

export function isGardenState(value: unknown): value is GardenState {
  return (
    isRecord(value) &&
    Array.isArray(value.seeds) &&
    value.seeds.every(isReflectionSeed) &&
    isPetState(value.pet)
  );
}

export function isReflectionSeed(value: unknown): value is ReflectionSeed {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    isOptionalString(value.labelText) &&
    isOptionalString(value.unhookedText) &&
    isStringArray(value.emotions) &&
    isStringArray(value.bodySignals) &&
    isStringArray(value.values) &&
    isStringArray(value.dreams) &&
    typeof value.tinyAction === 'string' &&
    isSeedStatus(value.status) &&
    isOptionalGardenPosition(value.gardenPosition) &&
    isOptionalString(value.gardenPlotId) &&
    isOptionalString(value.plantedAt) &&
    isOptionalString(value.lastGrowthAt) &&
    isOptionalString(value.lastWateredAt) &&
    isOptionalNumber(value.growthPoints) &&
    isSeedVisualType(value.visualType) &&
    (value.waterings === undefined || (Array.isArray(value.waterings) && value.waterings.every(isSeedWatering))) &&
    (value.bloomReflection === undefined || isSeedBloomReflection(value.bloomReflection)) &&
    (value.lensJourney === undefined || isLensJourney(value.lensJourney))
  );
}

export function isInnerLensProfile(value: unknown) {
  return (
    isRecord(value) &&
    includes(innerExperienceModes, value.preferredMode) &&
    includes(lensPromptOrders, value.promptOrder) &&
    typeof value.completedAt === 'string'
  );
}

export function isLensSessionDraft(value: unknown) {
  return (
    isRecord(value) &&
    includes(lensKinds, value.currentLens) &&
    isLensResponses(value.responses) &&
    Array.isArray(value.completedLensIds) &&
    value.completedLensIds.every((kind) => includes(lensKinds, kind)) &&
    typeof value.startedAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isPetState(value: unknown): value is PetState {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    isPetMood(value.mood) &&
    isOptionalString(value.lastInteractionAt) &&
    isStringArray(value.unlockedInteractionVariants)
  );
}

function isPetMood(value: unknown): value is PetMood {
  return includes(petMoods, value);
}

function isSeedStatus(value: unknown): value is SeedStatus {
  return includes(seedStatuses, value);
}

function isSeedVisualType(value: unknown): value is SeedVisualType {
  return includes(seedVisualTypes, value);
}

function isSeedWatering(value: unknown): value is SeedWatering {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.fromLabel === 'string' &&
    typeof value.transformedLabel === 'string' &&
    typeof value.kindAction === 'string' &&
    isOptionalString(value.note)
  );
}

function isSeedBloomReflection(value: unknown): value is SeedBloomReflection {
  return (
    isRecord(value) &&
    typeof value.completedAt === 'string' &&
    includes(seedBloomOutcomes, value.outcome) &&
    typeof value.reflection === 'string'
  );
}

function isLensJourney(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.completedAt === 'string' &&
    Array.isArray(value.lensOrder) &&
    value.lensOrder.every((kind) => includes(lensKinds, kind)) &&
    isLensResponses(value.responses)
  );
}

function isLensResponses(value: unknown): value is LensResponses {
  return (
    isRecord(value) &&
    typeof value.wordLabel === 'string' &&
    typeof value.bodySignal === 'string' &&
    typeof value.emotion === 'string' &&
    typeof value.innerImage === 'string' &&
    typeof value.observerNote === 'string' &&
    typeof value.alternateMeaning === 'string' &&
    typeof value.tinyAction === 'string'
  );
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || isFiniteNumber(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isOptionalGardenPosition(value: unknown): value is { x: number; y: number } | undefined {
  return (
    value === undefined ||
    (isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y))
  );
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function includes<T>(items: readonly T[], value: unknown): value is T {
  return items.includes(value as T);
}
