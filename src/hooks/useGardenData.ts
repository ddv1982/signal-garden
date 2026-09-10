import { useEffect, useMemo, useState } from 'react';
import type { SignalGardenRepository } from '../persistence/repositories';
import type { ReflectionCommand } from '../persistence/reflections';

export function useGardenData(repository: SignalGardenRepository) {
  const [snapshot, setSnapshot] = useState(() => repository.reflections.read());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => repository.reflections.subscribe(setSnapshot), [repository]);
  useEffect(() => {
    let active = true;
    void repository.reflections.command({ kind: 'grow' }).then((result) => {
      if (active) {
        setSnapshot(result);
        setError(result.ok ? null : result.error);
      }
    });
    return () => {
      active = false;
    };
  }, [repository]);
  const { seeds, pendingSeed } = snapshot.document;
  const gardenState = useMemo(
    () => ({ seeds: seeds.filter((seed) => seed.placement !== 'archive') }),
    [seeds]
  );
  const completedSeeds = useMemo(
    () => (pendingSeed ? [...seeds, pendingSeed] : seeds),
    [seeds, pendingSeed]
  );
  async function command(command: ReflectionCommand) {
    const result = await repository.reflections.command(command);
    setSnapshot(result);
    setError(result.ok ? null : result.error);
    return result;
  }
  return {
    seeds,
    pendingSeed,
    gardenState,
    completedSeeds,
    error: snapshot.ok ? error : snapshot.error,
    command,
  };
}
