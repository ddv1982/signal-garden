import { afterEach, describe, expect, it, vi } from 'vitest';
import { readJson, writeJson, writeRaw, type StorageLike } from '../storage';

type Shape = { count: number };

function isShape(value: unknown): value is Shape {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).count === 'number'
  );
}

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readJson', () => {
  it('returns the fallback when storage is unavailable', () => {
    expect(readJson(null, 'key', { count: 1 }, isShape)).toEqual({ count: 1 });
  });

  it('returns stored valid values', () => {
    const storage = memoryStorage({ key: JSON.stringify({ count: 5 }) });
    expect(readJson(storage, 'key', { count: 0 }, isShape)).toEqual({ count: 5 });
  });

  it('warns and falls back on corrupted JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = memoryStorage({ key: '{not json' });
    expect(readJson(storage, 'key', { count: 0 }, isShape)).toEqual({ count: 0 });
    expect(warn).toHaveBeenCalledOnce();
  });

  it('warns and falls back on an invalid shape without a migration', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = memoryStorage({ key: JSON.stringify({ count: 'five' }) });
    expect(readJson(storage, 'key', { count: 0 }, isShape)).toEqual({ count: 0 });
    expect(warn).toHaveBeenCalledOnce();
  });

  it('migrates an old shape and writes the result back', () => {
    const storage = memoryStorage({ key: JSON.stringify({ legacyCount: '7' }) });
    const result = readJson(storage, 'key', { count: 0 }, isShape, {
      migrate: (value) => {
        const legacy = (value as Record<string, unknown>).legacyCount;
        return typeof legacy === 'string' ? { count: Number(legacy) } : null;
      },
    });
    expect(result).toEqual({ count: 7 });
    expect(JSON.parse(storage.data.key)).toEqual({ count: 7 });
  });

  it('warns and falls back when storage reads throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(readJson(storage, 'key', { count: 0 }, isShape)).toEqual({ count: 0 });
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('writeJson', () => {
  it('persists serialized values', () => {
    const storage = memoryStorage();
    writeJson(storage, 'key', { count: 3 });
    expect(storage.data.key).toBe('{"count":3}');
  });

  it('warns instead of throwing when the quota is exceeded', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
      removeItem: () => {},
    };
    expect(() => writeJson(storage, 'key', { count: 3 })).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('writeRaw', () => {
  it('persists raw strings and swallows write errors', () => {
    const storage = memoryStorage();
    writeRaw(storage, 'key', 'dark');
    expect(storage.data.key).toBe('dark');

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {},
    };
    expect(() => writeRaw(failing, 'key', 'dark')).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });
});
