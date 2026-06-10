export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;

  try {
    const probeKey = 'signal-garden/storage-probe';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

export type ReadJsonOptions<T> = {
  /**
   * Attempt to convert an invalid stored shape into a valid one (schema
   * migration). A successful migration is validated and written back, so
   * old data survives a version bump instead of being silently discarded.
   */
  migrate?: (value: unknown) => T | null;
};

export function readJson<T>(
  storage: StorageLike | null,
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
  options: ReadJsonOptions<T> = {}
): T {
  if (!storage) return fallback;

  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    warnStorage('read', key, error);
    return fallback;
  }
  if (!raw) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    warnStorage('parse', key, error);
    return fallback;
  }

  if (validate(parsed)) return parsed;

  const migrated = options.migrate?.(parsed) ?? null;
  if (migrated !== null && validate(migrated)) {
    writeJson(storage, key, migrated);
    return migrated;
  }

  warnStorage('validate', key);
  return fallback;
}

export function writeJson<T>(storage: StorageLike | null, key: string, value: T): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Most commonly QuotaExceededError; losing one save beats crashing the app.
    warnStorage('write', key, error);
  }
}

export function writeRaw(storage: StorageLike | null, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch (error) {
    warnStorage('write', key, error);
  }
}

function warnStorage(operation: string, key: string, error?: unknown) {
  if (typeof console === 'undefined') return;
  console.warn(`[signal-garden] Storage ${operation} failed for "${key}".`, error ?? '');
}
