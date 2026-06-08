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

export function readJson<T>(storage: StorageLike | null, key: string, fallback: T, validate: (value: unknown) => value is T): T {
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(storage: StorageLike | null, key: string, value: T): void {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}
