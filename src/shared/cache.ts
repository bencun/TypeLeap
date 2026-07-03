import { memoryCacheMaxBytes } from "../config.js";

type CacheEntry = {
  value: unknown;
  bytes: number;
};

/**
 * Tiny byte-limited in-memory cache. Recency is tracked with Map insertion order.
 */
export class MemoryCache {
  private readonly entries = new Map<string, CacheEntry>();
  private usedBytes = 0;

  constructor(private readonly maxBytes = memoryCacheMaxBytes) {}

  get sizeBytes(): number {
    return this.usedBytes;
  }

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, bytes = estimateBytes(value)): void {
    this.delete(key);

    if (bytes > this.maxBytes) {
      return;
    }

    this.entries.set(key, { value, bytes });
    this.usedBytes += bytes;
    this.evictOverflow();
  }

  delete(key: string): void {
    const entry = this.entries.get(key);

    if (!entry) {
      return;
    }

    this.entries.delete(key);
    this.usedBytes -= entry.bytes;
  }

  clear(): void {
    this.entries.clear();
    this.usedBytes = 0;
  }

  private evictOverflow(): void {
    while (this.usedBytes > this.maxBytes) {
      const oldestKey = this.entries.keys().next().value as string | undefined;

      if (!oldestKey) {
        return;
      }

      this.delete(oldestKey);
    }
  }
}

export const pageCache = new MemoryCache();

export function cacheKey(namespace: string, value: string): string {
  return `${namespace}:${value}`;
}

export function estimateBytes(value: unknown): number {
  if (typeof value === "string") {
    return Buffer.byteLength(value);
  }

  if (Buffer.isBuffer(value)) {
    return value.length;
  }

  if (value instanceof ArrayBuffer) {
    return value.byteLength;
  }

  if (value && typeof value === "object" && "buffer" in value && Buffer.isBuffer(value.buffer)) {
    return value.buffer.length;
  }

  return Buffer.byteLength(JSON.stringify(value));
}
