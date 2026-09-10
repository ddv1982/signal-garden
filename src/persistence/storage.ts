export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export type ReadJsonOptions<T> = {
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

export function writeJson<T>(storage: StorageLike | null, key: string, value: T): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    warnStorage('write', key, error);
    return false;
  }
}

function warnStorage(operation: string, key: string, error?: unknown) {
  if (typeof console === 'undefined') return;
  console.warn(`[signal-garden] Storage ${operation} failed for "${key}".`, error ?? '');
}
