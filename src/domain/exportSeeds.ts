import type { ReflectionSeed } from '../../shared/models';

export const SEED_EXPORT_VERSION = 1;

export type SeedExport = {
  app: 'Signal Garden';
  version: typeof SEED_EXPORT_VERSION;
  exportedAt: string;
  seedCount: number;
  seeds: ReflectionSeed[];
};

export function createSeedExport(seeds: ReflectionSeed[], exportedAt = new Date().toISOString()): SeedExport {
  return {
    app: 'Signal Garden',
    version: SEED_EXPORT_VERSION,
    exportedAt,
    seedCount: seeds.length,
    seeds
  };
}

export function serializeSeedExport(seeds: ReflectionSeed[], exportedAt?: string): string {
  return JSON.stringify(createSeedExport(seeds, exportedAt), null, 2);
}
