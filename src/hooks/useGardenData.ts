import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SignalGardenRepository } from '../persistence/repositories';
import type { ReflectionCommand, ReflectionResult } from '../persistence/reflections';

export function useGardenData(repository: SignalGardenRepository) {
  const [snapshot, setSnapshot] = useState(() => repository.reflections.read());
  const [error, setError] = useState<string | null>(null);
  const receiveSnapshot = useCallback((result: ReflectionResult) => {
    setSnapshot((previous) => (result.ok ? result : { ...result, document: previous.document }));
  }, []);
  useEffect(() => repository.reflections.subscribe(receiveSnapshot), [repository, receiveSnapshot]);
  useEffect(() => {
    let active = true;
    void repository.reflections.command({ kind: 'grow' }).then((result) => {
      if (active) {
        receiveSnapshot(result);
        setError(result.ok ? null : result.error);
      }
    });
    return () => {
      active = false;
    };
  }, [repository, receiveSnapshot]);
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
    receiveSnapshot(result);
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
