import { describe, expect, it } from 'vitest';
import type { LensSessionDraft, ReflectionSeed } from '../../../shared/models';
import { createLensProfile, createLensSessionDraft } from '../../domain/lenses';
import {
  createReflectionStore,
  reflectionDocumentKey,
  type ReflectionLock,
  type ReflectionDocument,
} from '../reflections';
import type { StorageLike } from '../storage';

const seed: ReflectionSeed = {
  id: 'one',
  createdAt: '2020-01-01T00:00:00Z',
  emotions: [],
  bodySignals: [],
  values: [],
  dreams: [],
  tinyAction: 'Pause',
  status: 'planted',
  visualType: 'seed',
};
const draft: LensSessionDraft = {
  ...createLensSessionDraft(createLensProfile('mixed', 'open')),
  sessionId: 'session',
  revision: 0,
};
const blank = (): ReflectionDocument => ({
  version: 2,
  revision: 0,
  seeds: [],
  pendingSeed: null,
  draft: null,
});
function fixture(initial: Partial<ReflectionDocument> = {}) {
  const values = new Map([[reflectionDocumentKey, JSON.stringify({ ...blank(), ...initial })]]);
  let fail = false;
  let removeFail = false;
  const storage: StorageLike = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (fail) throw new Error('quota');
      values.set(key, value);
    },
    removeItem: (key) => {
      if (removeFail) throw new Error('denied');
      values.delete(key);
    },
  };
  let queue = Promise.resolve();
  const lock: ReflectionLock = (work) => {
    const result = queue.then(work);
    queue = result.then(
      () => {},
      () => {}
    );
    return result;
  };
  return {
    values,
    storage,
    lock,
    store: createReflectionStore(storage, lock),
    fail: (value = true) => {
      fail = value;
    },
    failRemove: () => {
      removeFail = true;
    },
  };
}

describe('reflection commands', () => {
  it('keeps legacy data readable at quota and retries atomic migration without losing pending data', async () => {
    const f = fixture();
    f.values.delete(reflectionDocumentKey);
    f.values.set('signal-garden/reflection-seeds/vite/v1', JSON.stringify([seed]));
    f.values.set('signal-garden/pending-seed/vite/v1', JSON.stringify({ ...seed, id: 'pending' }));
    f.fail();
    expect(f.store.read().document.seeds).toEqual([seed]);
    expect(
      (await f.store.command({ kind: 'place', id: 'pending', placement: { kind: 'archive' } })).ok
    ).toBe(false);
    expect(f.values.has(reflectionDocumentKey)).toBe(false);
    expect(f.store.read().document.pendingSeed?.id).toBe('pending');
    f.fail(false);
    expect(
      (await f.store.command({ kind: 'place', id: 'pending', placement: { kind: 'archive' } })).ok
    ).toBe(true);
    expect(f.store.read().document.seeds.map((seed) => seed.id)).toEqual(['pending', 'one']);
    expect(f.values.has('signal-garden/pending-seed/vite/v1')).toBe(false);
  });
  it('does not delete the durable draft when completion fails and completes once on retry', async () => {
    const f = fixture({ draft });
    f.fail();
    expect((await f.store.command({ kind: 'complete', seed, expected: draft })).ok).toBe(false);
    expect(f.store.read().document.draft).toEqual(draft);
    expect(f.store.read().document.pendingSeed).toBeNull();
    f.fail(false);
    await f.store.command({ kind: 'complete', seed, expected: draft });
    await f.store.command({ kind: 'complete', seed, expected: draft });
    expect(f.store.read().document.pendingSeed).toEqual(seed);
    expect(f.store.read().document.draft).toBeNull();
  });
  it('preserves every history field when archiving and never grows archived records passively', async () => {
    const pending = {
      ...seed,
      waterings: [
        {
          id: 'w',
          createdAt: seed.createdAt,
          fromLabel: 'old',
          transformedLabel: 'new',
          kindAction: 'rest',
          note: 'note',
        },
      ],
      bloomReflection: {
        completedAt: seed.createdAt,
        outcome: 'done' as const,
        reflection: 'rested',
      },
    };
    const f = fixture({ pendingSeed: pending });
    await f.store.command({ kind: 'place', id: seed.id, placement: { kind: 'archive' } });
    await f.store.command({ kind: 'grow' });
    expect(f.store.read().document.seeds).toEqual([{ ...pending, placement: 'archive' }]);
  });
  it('does not resurrect a seed deleted by another tab', async () => {
    const f = fixture({ seeds: [seed] });
    const tab = createReflectionStore(f.storage, f.lock);
    await f.store.command({ kind: 'delete-completed', ids: ['one', 'archived', 'seed-1'] });
    expect(
      (
        await tab.command({
          kind: 'water',
          id: seed.id,
          input: { transformedLabel: 'New', kindAction: 'Pause' },
          eventId: 'event',
        })
      ).ok
    ).toBe(false);
    expect(tab.read().document.seeds).toEqual([]);
  });
  it('serializes simultaneous waterings from two stores and retries by event ID', async () => {
    const f = fixture({ seeds: [seed] });
    const tab = createReflectionStore(f.storage, f.lock);
    const input = { transformedLabel: 'New', kindAction: 'Pause' };
    await Promise.all([
      f.store.command({ kind: 'water', id: seed.id, input, eventId: 'a' }),
      tab.command({ kind: 'water', id: seed.id, input, eventId: 'b' }),
    ]);
    await tab.command({ kind: 'water', id: seed.id, input, eventId: 'b' });
    expect(f.store.read().document.seeds[0].waterings?.map((w) => w.id)).toEqual(['a', 'b']);
  });
  it('places a shared pending reflection once when tabs race', async () => {
    const f = fixture({ pendingSeed: seed });
    const tab = createReflectionStore(f.storage, f.lock);
    await Promise.all([
      f.store.command({ kind: 'place', id: seed.id, placement: { kind: 'archive' } }),
      tab.command({
        kind: 'place',
        id: seed.id,
        placement: { kind: 'garden', plotId: 'front-left', x: 0.5, y: 0.8 },
      }),
    ]);
    expect(f.store.read().document.seeds).toHaveLength(1);
    expect(f.store.read().document.seeds[0].placement).toBe('archive');
  });
  it('checks plot occupancy inside the command and preserves pending on conflict', async () => {
    const f = fixture({
      seeds: [{ ...seed, gardenPlotId: 'front-left' }],
      pendingSeed: { ...seed, id: 'two' },
    });
    expect(
      (
        await f.store.command({
          kind: 'place',
          id: 'two',
          placement: { kind: 'garden', plotId: 'front-left', x: 0.5, y: 0.8 },
        })
      ).ok
    ).toBe(false);
    expect(f.store.read().document.pendingSeed?.id).toBe('two');
  });
  it('rejects stale draft edits and completion without changing the newer answer', async () => {
    const f = fixture({ draft });
    const tab = createReflectionStore(f.storage, f.lock);
    await f.store.command({
      kind: 'draft',
      expected: draft,
      draft: { ...draft, responses: { ...draft.responses, wordLabel: 'new answer' } },
    });
    expect((await tab.command({ kind: 'draft', expected: draft, draft })).ok).toBe(false);
    expect((await tab.command({ kind: 'complete', expected: draft, seed })).ok).toBe(false);
    expect(f.store.read().document.draft?.responses.wordLabel).toBe('new answer');
  });
  it('deletes planted, archived, and pending reflections while retaining the unfinished draft', async () => {
    const f = fixture({ seeds: [seed, { ...seed, id: 'archived', placement: 'archive' }], draft });
    await f.store.command({ kind: 'delete-completed', ids: ['one', 'archived', 'seed-1'] });
    expect(f.store.read().document).toMatchObject({ seeds: [], pendingSeed: null, draft });
    const pending = fixture({ pendingSeed: seed });
    await pending.store.command({ kind: 'delete-completed', ids: ['one', 'archived', 'seed-1'] });
    expect(pending.store.read().document.pendingSeed).toBeNull();
  });
  it('keeps the committed document authoritative if legacy cleanup fails or an old tab writes legacy data', async () => {
    const f = fixture({ pendingSeed: seed });
    f.failRemove();
    f.values.set('signal-garden/reflection-seeds/vite/v1', '[]');
    expect(
      (await f.store.command({ kind: 'place', id: seed.id, placement: { kind: 'archive' } })).ok
    ).toBe(true);
    f.values.set(
      'signal-garden/reflection-seeds/vite/v1',
      JSON.stringify([{ ...seed, id: 'stale' }])
    );
    expect(f.store.read().document.seeds.map((seed) => seed.id)).toEqual(['one']);
  });
  it.each(['legacy', 'v2'])(
    'preserves malformed %s data and shows readable valid seeds without overwriting originals',
    async (source) => {
      const f = fixture();
      const key =
        source === 'legacy' ? 'signal-garden/reflection-seeds/vite/v1' : reflectionDocumentKey;
      const raw = JSON.stringify(
        source === 'legacy'
          ? [seed, { id: 'broken' }]
          : { ...blank(), seeds: [seed, { id: 'broken' }] }
      );
      f.values.delete(reflectionDocumentKey);
      f.values.set(key, raw);
      expect(f.store.read().ok).toBe(false);
      expect(f.store.read().document.seeds).toEqual([seed]);
      expect(
        (await f.store.command({ kind: 'delete-completed', ids: ['one', 'archived', 'seed-1'] })).ok
      ).toBe(false);
      expect(f.values.get(key)).toBe(raw);
      expect(f.store.recovery()[key]).toBe(raw);
    }
  );
  it('rejects contradictory persisted state', () => {
    for (const initial of [
      { seeds: [seed], pendingSeed: seed },
      { draft, pendingSeed: seed },
      { seeds: [seed, seed] },
    ])
      expect(fixture(initial).store.read().ok).toBe(false);
  });
  it('preserves data when Web Locks is unavailable', async () => {
    const f = fixture({ seeds: [seed] });
    const unsupported = createReflectionStore(f.storage);
    const result = await unsupported.command({
      kind: 'delete-completed',
      ids: ['one', 'archived', 'seed-1'],
    });
    expect(result.ok).toBe(false);
    expect(f.store.read().document.seeds).toEqual([seed]);
  });
  it('acknowledges a durable commit even when the next read or subscriber fails', async () => {
    const f = fixture({ seeds: [seed] });
    let readsFail = false;
    const store = createReflectionStore(
      {
        ...f.storage,
        getItem: (key) => {
          if (readsFail) throw new Error('temporarily unavailable');
          return f.storage.getItem(key);
        },
        setItem: (key, value) => {
          f.storage.setItem(key, value);
          readsFail = true;
        },
      },
      f.lock
    );
    store.subscribe(() => {
      throw new Error('subscriber');
    });
    const result = await store.command({
      kind: 'water',
      id: seed.id,
      input: { transformedLabel: 'New', kindAction: 'Pause' },
      eventId: 'only',
    });
    expect(result.ok).toBe(true);
    expect(result.document.seeds[0].waterings).toHaveLength(1);
  });
  it('salvages valid sibling keys when legacy JSON is malformed', async () => {
    const f = fixture();
    f.values.delete(reflectionDocumentKey);
    f.values.set('signal-garden/reflection-seeds/vite/v1', JSON.stringify([seed]));
    f.values.set('signal-garden/lens-session-draft/vite/v1', '{');
    expect(f.store.read().document.seeds).toEqual([seed]);
    expect((await f.store.command({ kind: 'grow' })).ok).toBe(false);
    expect(f.values.has(reflectionDocumentKey)).toBe(false);
    expect(f.values.get('signal-garden/lens-session-draft/vite/v1')).toBe('{');
  });
  it('does not migrate contradictory legacy documents', async () => {
    for (const [seeds, pending, session] of [
      [[seed, seed], null, null],
      [[seed], seed, null],
      [[], seed, draft],
    ]) {
      const f = fixture();
      f.values.delete(reflectionDocumentKey);
      f.values.set('signal-garden/reflection-seeds/vite/v1', JSON.stringify(seeds));
      f.values.set('signal-garden/pending-seed/vite/v1', JSON.stringify(pending));
      f.values.set('signal-garden/lens-session-draft/vite/v1', JSON.stringify(session));
      expect((await f.store.command({ kind: 'grow' })).ok).toBe(false);
      expect(f.values.has(reflectionDocumentKey)).toBe(false);
      expect(f.values.size).toBe(3);
    }
  });
  it('deletes only the reflections whose IDs were confirmed', async () => {
    const f = fixture({ seeds: [seed, { ...seed, id: 'added-in-another-tab' }] });
    await f.store.command({ kind: 'delete-completed', ids: [seed.id] });
    expect(f.store.read().document.seeds.map((seed) => seed.id)).toEqual(['added-in-another-tab']);
  });
  it('reports a conflicting placement rather than confirming the wrong destination', async () => {
    const f = fixture({ pendingSeed: seed });
    const first = await f.store.command({
      kind: 'place',
      id: seed.id,
      placement: { kind: 'archive' },
    });
    const repeat = await f.store.command({
      kind: 'place',
      id: seed.id,
      placement: { kind: 'archive' },
    });
    const conflicting = await f.store.command({
      kind: 'place',
      id: seed.id,
      placement: { kind: 'garden', plotId: 'front-left', x: 0.5, y: 0.8 },
    });
    expect(first.ok).toBe(true);
    expect(repeat.ok).toBe(true);
    expect(conflicting.ok).toBe(false);
    expect(f.store.read().document.seeds[0].placement).toBe('archive');
  });
  it('keeps the first bloom history when a stale tab submits a second bloom', async () => {
    const f = fixture({
      seeds: [
        {
          ...seed,
          bloomReflection: { outcome: 'done', completedAt: seed.createdAt, reflection: 'first' },
        },
      ],
    });
    expect(
      (
        await f.store.command({
          kind: 'bloom',
          id: seed.id,
          input: { outcome: 'adapted', reflection: 'stale' },
        })
      ).ok
    ).toBe(false);
    expect(f.store.read().document.seeds[0].bloomReflection?.reflection).toBe('first');
  });
});
