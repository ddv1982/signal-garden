import { useEffect, useMemo, useState } from 'react';
import type { ReflectionSeed } from '../../shared/models';
import { advanceGardenGrowth } from '../domain/seedGrowth';
import type { SignalGardenRepository } from '../persistence/repositories';

export function useGardenData(repository: SignalGardenRepository) {
  const [seeds, setSeeds] = useState<ReflectionSeed[]>(() =>
    advanceGardenGrowth(repository.loadSeeds())
  );
  const [pendingSeed, setPendingSeed] = useState<ReflectionSeed | null>(() =>
    repository.loadPendingSeed()
  );
  const gardenState = useMemo(() => repository.gardenState(seeds), [repository, seeds]);

  useEffect(() => repository.saveSeeds(seeds), [repository, seeds]);

  function savePendingSeed(seed: ReflectionSeed) {
    repository.savePendingSeed(seed);
    setPendingSeed(seed);
  }

  function clearPendingSeed() {
    repository.clearPendingSeed();
    setPendingSeed(null);
  }

  function clearGarden() {
    setSeeds([]);
    repository.clearSeeds();
    repository.clearPendingSeed();
    setPendingSeed(null);
  }

  return {
    seeds,
    setSeeds,
    pendingSeed,
    gardenState,
    savePendingSeed,
    clearPendingSeed,
    clearGarden,
  };
}
