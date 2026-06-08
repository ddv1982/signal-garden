import type { ReflectionSeed, SeedBloomOutcome, SeedStatus, SeedVisualType } from '../../shared/models';

const GROWTH_INTERVAL_MS = 18 * 60 * 60 * 1000;

export type SeedGrowthStage = 'seed' | 'sprout' | 'growing' | 'mature';

export type SeedWateringInput = {
  transformedLabel: string;
  kindAction: string;
  note?: string;
};

export type SeedBloomInput = {
  outcome: SeedBloomOutcome;
  reflection: string;
};

export function waterSeed(seed: ReflectionSeed, input: SeedWateringInput, now = new Date().toISOString()): ReflectionSeed {
  const transformedLabel = input.transformedLabel.trim();
  const kindAction = input.kindAction.trim();
  const note = input.note?.trim();
  if (!transformedLabel || !kindAction) {
    throw new Error('Seed watering requires a softened label and kind action.');
  }

  const watered = advanceSeedWateringStage(seed, now);
  const fromLabel = seed.unhookedText || seed.labelText || seed.tinyAction;

  return {
    ...watered,
    lastWateredAt: now,
    waterings: [
      ...(seed.waterings ?? []),
      {
        id: crypto.randomUUID?.() ?? `${seed.id}-${now}`,
        createdAt: now,
        fromLabel,
        transformedLabel,
        kindAction,
        ...(note ? { note } : {})
      }
    ]
  };
}

export function bloomSeed(seed: ReflectionSeed, input: SeedBloomInput, now = new Date().toISOString()): ReflectionSeed {
  const reflection = input.reflection.trim();
  if (!reflection) {
    throw new Error('Seed bloom requires a reflection.');
  }
  if ((seed.waterings?.length ?? 0) < 2) {
    throw new Error('Seed bloom requires two waterings before final reflection.');
  }

  return {
    ...seed,
    status: 'blooming',
    growthPoints: 3,
    lastGrowthAt: now,
    visualType: 'flower',
    bloomReflection: {
      completedAt: now,
      outcome: input.outcome,
      reflection
    }
  };
}

function advanceSeedWateringStage(seed: ReflectionSeed, now: string): ReflectionSeed {
  if (seed.status === 'blooming' || seed.bloomReflection) {
    return seed;
  }

  const currentPoints = seed.growthPoints ?? statusGrowthPoints(seed.status);
  const nextPoints = Math.min(currentPoints + 1, 2);
  const status: SeedStatus = nextPoints <= 0 ? 'planted' : nextPoints === 1 ? 'sprouted' : 'growing';

  if (nextPoints === currentPoints && seed.status === status) return seed;

  return {
    ...seed,
    status,
    growthPoints: nextPoints,
    lastGrowthAt: now,
    visualType: visualTypeForStatus(seed, status)
  };
}

export function assignPlotToSeed(
  seed: ReflectionSeed,
  plotId: string,
  position: { x: number; y: number },
  now = new Date().toISOString()
): ReflectionSeed {
  return {
    ...seed,
    gardenPlotId: plotId,
    gardenPosition: position,
    plantedAt: seed.plantedAt ?? now,
    lastGrowthAt: seed.lastGrowthAt ?? now,
    growthPoints: seed.growthPoints ?? 0,
    status: 'planted'
  };
}

export function advanceGardenGrowth(
  seeds: ReflectionSeed[],
  now = new Date().toISOString(),
  reason: 'visit' | 'journey' = 'visit'
): ReflectionSeed[] {
  return seeds.map((seed) => advanceSeedGrowth(seed, now, reason));
}

export function growthStageForSeed(seed: ReflectionSeed): SeedGrowthStage {
  if (seed.status === 'blooming' || seed.bloomReflection) return 'mature';
  const points = seed.growthPoints ?? statusGrowthPoints(seed.status);
  if (points <= 0) return 'seed';
  if (points === 1) return 'sprout';
  if (points === 2) return 'growing';
  return 'mature';
}

function advanceSeedGrowth(seed: ReflectionSeed, now: string, reason: 'visit' | 'journey'): ReflectionSeed {
  if (seed.status === 'blooming') {
    return {
      ...seed,
      growthPoints: Math.max(seed.growthPoints ?? 2, 2),
      lastGrowthAt: seed.lastGrowthAt ?? seed.plantedAt ?? seed.createdAt
    };
  }

  const lastGrowthAt = seed.lastGrowthAt ?? seed.plantedAt ?? seed.createdAt;
  const shouldGrow = reason === 'journey' || elapsedMs(lastGrowthAt, now) >= GROWTH_INTERVAL_MS;
  if (!shouldGrow) return seed;

  const nextPoints = Math.min((seed.growthPoints ?? statusGrowthPoints(seed.status)) + 1, 2);
  const nextStatus: SeedStatus = nextPoints === 0 ? 'planted' : nextPoints === 1 ? 'sprouted' : 'growing';

  return {
    ...seed,
    status: nextStatus,
    visualType: visualTypeForStatus(seed, nextStatus),
    growthPoints: nextPoints,
    lastGrowthAt: now
  };
}

function visualTypeForStatus(seed: ReflectionSeed, status: SeedStatus): SeedVisualType {
  if (status === 'planted') return 'seed';
  if (status === 'sprouted') return 'sprout';
  if (status === 'growing') return 'bud';
  if (status === 'blooming') return 'flower';
  return 'flower';
}

function statusGrowthPoints(status: SeedStatus) {
  if (status === 'blooming') return 3;
  if (status === 'growing') return 2;
  if (status === 'sprouted') return 1;
  return 0;
}

function elapsedMs(start: string, end: string) {
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0;
  return endTime - startTime;
}
