type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function getCachedValue<T>(key: string): T | null {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number): void {
  const expiresAt = Date.now() + ttlMs;
  store.set(key, { value, expiresAt });
}

