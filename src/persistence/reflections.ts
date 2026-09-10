import { m } from '../paraglide/messages.js';
import type { LensSessionDraft, ReflectionSeed } from '../../shared/models';
import { isLensSessionDraft, isReflectionSeed } from '../../shared/bridgeValidation';
import {
  advanceGardenGrowth,
  assignPlotToSeed,
  bloomSeed,
  waterSeed,
  type SeedBloomInput,
  type SeedWateringInput,
} from '../domain/seedGrowth';
import { getBrowserStorage, type StorageLike } from './storage';

export const reflectionDocumentKey = 'signal-garden/reflections/v2';
const legacyKeys = [
  'signal-garden/reflection-seeds/vite/v1',
  'signal-garden/pending-seed/vite/v1',
  'signal-garden/lens-session-draft/vite/v1',
] as const;
export type ReflectionDocument = {
  version: 2;
  revision: number;
  seeds: ReflectionSeed[];
  pendingSeed: ReflectionSeed | null;
  draft: LensSessionDraft | null;
};
export type ReflectionResult =
  | { ok: true; document: ReflectionDocument }
  | { ok: false; error: string; document: ReflectionDocument };
export type ReflectionCommand =
  | { kind: 'draft'; draft: LensSessionDraft; expected: LensSessionDraft | null }
  | { kind: 'discard-draft'; expected: LensSessionDraft }
  | { kind: 'complete'; seed: ReflectionSeed; expected: LensSessionDraft }
  | {
      kind: 'place';
      id: string;
      placement: { kind: 'archive' } | { kind: 'garden'; plotId: string; x: number; y: number };
    }
  | { kind: 'water'; id: string; input: SeedWateringInput; eventId: string }
  | { kind: 'bloom'; id: string; input: SeedBloomInput }
  | { kind: 'delete-completed'; ids: string[] }
  | { kind: 'grow' };
export type ReflectionLock = <T>(work: () => T | Promise<T>) => Promise<T>;
const emptyDocument = (): ReflectionDocument => ({
  version: 2,
  revision: 0,
  seeds: [],
  pendingSeed: null,
  draft: null,
});
const saveError = m.persistence_save_error();
const conflictError = m.persistence_conflict_error();

export function createReflectionStore(
  storage: StorageLike | null = getBrowserStorage(),
  lock: ReflectionLock = browserLock
) {
  const listeners = new Set<(result: ReflectionResult) => void>();
  function read(): ReflectionResult {
    const document = emptyDocument();
    if (!storage) return { ok: false, error: saveError, document };
    try {
      const raw = storage.getItem(reflectionDocumentKey);
      if (raw !== null) {
        const value: unknown = JSON.parse(raw);
        if (!isDocument(value))
          return {
            ok: false,
            error: m.persistence_read_error(),
            document: salvage(value),
          };
        return { ok: true, document: value };
      }
      let invalid = false;
      const values: unknown[] = legacyKeys.map((key) => {
        try {
          const value = storage.getItem(key);
          return value === null ? null : JSON.parse(value);
        } catch {
          invalid = true;
          return null;
        }
      });
      const [seeds, pending, draft] = values;
      const candidate = { ...document, seeds: seeds ?? [], pendingSeed: pending, draft };
      if (invalid || !isDocument(candidate)) {
        return {
          ok: false,
          error: m.persistence_partial_read_error(),
          document: salvage(candidate),
        };
      }
      return { ok: true, document: candidate };
    } catch {
      return {
        ok: false,
        error: m.persistence_unreadable_error(),
        document,
      };
    }
  }
  function notify(result: ReflectionResult) {
    for (const listener of listeners) {
      try {
        listener(result);
      } catch {
        continue;
      }
    }
  }
  return {
    read,
    subscribe(listener: (result: ReflectionResult) => void) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (
          event.key === reflectionDocumentKey ||
          event.key === null ||
          legacyKeys.some((key) => key === event.key)
        )
          listener(read());
      };
      if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(listener);
        if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
      };
    },
    recovery() {
      const raw: Record<string, string | null> = {};
      for (const key of [reflectionDocumentKey, ...legacyKeys]) {
        try {
          raw[key] = storage?.getItem(key) ?? null;
        } catch {
          raw[key] = null;
        }
      }
      return raw;
    },
    async command(command: ReflectionCommand): Promise<ReflectionResult> {
      try {
        return await lock(() => {
          const current = read();
          if (!current.ok) return current;
          let next: ReflectionDocument;
          try {
            next = applyCommand(current.document, command);
          } catch (error) {
            return {
              ok: false,
              document: current.document,
              error: error instanceof Error ? error.message : saveError,
            };
          }
          next = { ...next, revision: current.document.revision + 1 };
          try {
            if (!storage) throw new Error(saveError);
            storage.setItem(reflectionDocumentKey, JSON.stringify(next));
          } catch {
            return { ok: false, document: current.document, error: saveError };
          }
          for (const key of legacyKeys) {
            try {
              storage.removeItem(key);
            } catch {
              continue;
            }
          }
          const result: ReflectionResult = { ok: true, document: next };
          notify(result);
          return result;
        });
      } catch (error) {
        return {
          ok: false,
          document: read().document,
          error: error instanceof Error ? error.message : saveError,
        };
      }
    },
  };
}

async function browserLock<T>(work: () => T | Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks)
    throw new Error(m.persistence_browser_error());
  return navigator.locks.request('signal-garden/reflections', work);
}

function sameDraft(a: LensSessionDraft | null, b: LensSessionDraft | null) {
  return a === null || b === null
    ? a === b
    : (a.sessionId ?? a.startedAt) === (b.sessionId ?? b.startedAt) &&
        (a.revision ?? 0) === (b.revision ?? 0);
}
function applyCommand(
  document: ReflectionDocument,
  command: ReflectionCommand
): ReflectionDocument {
  switch (command.kind) {
    case 'draft':
      if (document.pendingSeed || !sameDraft(document.draft, command.expected))
        throw new Error(conflictError);
      return {
        ...document,
        draft: {
          ...command.draft,
          sessionId: command.draft.sessionId ?? command.draft.startedAt,
          revision: (document.draft?.revision ?? 0) + 1,
        },
      };
    case 'discard-draft':
      if (!sameDraft(document.draft, command.expected)) throw new Error(conflictError);
      return { ...document, draft: null };
    case 'complete':
      if (
        document.pendingSeed?.id === command.seed.id ||
        document.seeds.some((seed) => seed.id === command.seed.id)
      )
        return document;
      if (document.pendingSeed || !sameDraft(document.draft, command.expected))
        throw new Error(conflictError);
      return {
        ...document,
        draft: null,
        pendingSeed: command.seed,
        seeds: advanceGardenGrowth(document.seeds, new Date().toISOString(), 'journey'),
      };
    case 'place': {
      const existing = document.seeds.find((seed) => seed.id === command.id);
      if (existing) {
        if (
          command.placement.kind === 'archive'
            ? existing.placement === 'archive'
            : existing.placement !== 'archive' && existing.gardenPlotId === command.placement.plotId
        )
          return document;
        throw new Error(m.persistence_moved_error());
      }
      if (document.pendingSeed?.id !== command.id) throw new Error(m.persistence_moved_error());
      const placement = command.placement;
      if (
        placement.kind === 'garden' &&
        document.seeds.some(
          (seed) => seed.placement !== 'archive' && seed.gardenPlotId === placement.plotId
        )
      )
        throw new Error(m.persistence_plot_error());
      const seed: ReflectionSeed =
        placement.kind === 'archive'
          ? { ...document.pendingSeed, placement: 'archive' }
          : {
              ...assignPlotToSeed(document.pendingSeed, placement.plotId, placement),
              placement: 'garden',
            };
      return { ...document, seeds: [seed, ...document.seeds], pendingSeed: null };
    }
    case 'water':
    case 'bloom': {
      const seed = document.seeds.find((seed) => seed.id === command.id);
      if (!seed) throw new Error(m.persistence_deleted_error());
      if (command.kind === 'bloom' && seed.bloomReflection)
        throw new Error(m.persistence_bloomed_error());
      if (
        command.kind === 'water' &&
        seed.waterings?.some((watering) => watering.id === command.eventId)
      )
        return document;
      let updated =
        command.kind === 'water' ? waterSeed(seed, command.input) : bloomSeed(seed, command.input);
      if (command.kind === 'water')
        updated = {
          ...updated,
          waterings: updated.waterings?.map((watering, index, all) =>
            index === all.length - 1 ? { ...watering, id: command.eventId } : watering
          ),
        };
      return {
        ...document,
        seeds: document.seeds.map((item) => (item.id === seed.id ? updated : item)),
      };
    }
    case 'delete-completed':
      return {
        ...document,
        seeds: document.seeds.filter((seed) => !command.ids.includes(seed.id)),
        pendingSeed:
          document.pendingSeed && command.ids.includes(document.pendingSeed.id)
            ? null
            : document.pendingSeed,
      };
    case 'grow':
      return { ...document, seeds: advanceGardenGrowth(document.seeds) };
  }
}
function isDocument(value: unknown): value is ReflectionDocument {
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 2)
    return false;
  return (
    'revision' in value &&
    typeof value.revision === 'number' &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 0 &&
    'seeds' in value &&
    Array.isArray(value.seeds) &&
    value.seeds.every(isReflectionSeed) &&
    new Set(value.seeds.map((seed) => seed.id)).size === value.seeds.length &&
    'pendingSeed' in value &&
    (value.pendingSeed === null || isReflectionSeed(value.pendingSeed)) &&
    'draft' in value &&
    (value.draft === null || isLensSessionDraft(value.draft)) &&
    !(value.pendingSeed && value.draft) &&
    !(
      isReflectionSeed(value.pendingSeed) &&
      value.seeds.some(
        (seed) =>
          'pendingSeed' in value &&
          isReflectionSeed(value.pendingSeed) &&
          seed.id === value.pendingSeed.id
      )
    )
  );
}

function salvage(value: unknown): ReflectionDocument {
  const document = emptyDocument();
  if (!value || typeof value !== 'object') return document;
  if ('seeds' in value && Array.isArray(value.seeds)) {
    const seen = new Set<string>();
    document.seeds = value.seeds.filter(isReflectionSeed).filter((seed) => {
      if (seen.has(seed.id)) return false;
      seen.add(seed.id);
      return true;
    });
  }
  if (
    'pendingSeed' in value &&
    isReflectionSeed(value.pendingSeed) &&
    !document.seeds.some(
      (seed) =>
        'pendingSeed' in value &&
        isReflectionSeed(value.pendingSeed) &&
        seed.id === value.pendingSeed.id
    )
  )
    document.pendingSeed = value.pendingSeed;
  if ('draft' in value && isLensSessionDraft(value.draft)) document.draft = value.draft;
  return document;
}
