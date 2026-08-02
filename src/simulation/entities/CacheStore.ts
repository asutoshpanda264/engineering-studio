/**
 * A single keyed store with capacity-bound eviction — the state and
 * eviction-policy logic one Cache owns, and what a CDN owns one of per
 * edge (each edge is a geographically distributed copy of the same
 * idea). Extracted here once CDN needed the exact same LRU/LFU/FIFO/MRU
 * logic Cache already had, rather than duplicating it.
 */

export type EvictionPolicy = "lru" | "lfu" | "fifo" | "mru";

export interface CacheStoreConfig {
  capacity: number;
  evictionPolicy: EvictionPolicy;
  /** How long an entry stays valid after being stored, in ms. 0 = never expires. */
  ttlMs: number;
}

interface CacheEntry {
  insertedAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

export class CacheStore {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(private readonly config: CacheStoreConfig) {}

  /** Whether `key` is present and not expired. Expired entries are evicted on lookup. */
  lookup(key: string, now: number): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (this.config.ttlMs > 0 && now - entry.insertedAt >= this.config.ttlMs) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }

  /** Records an access to an already-present key (recency/frequency bookkeeping). */
  touch(key: string, now: number): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    entry.lastAccessedAt = now;
    entry.accessCount++;
  }

  /** Stores `key`, evicting one entry first if at capacity. */
  set(key: string, now: number): void {
    if (!this.entries.has(key) && this.entries.size >= this.config.capacity) {
      this.evictOne();
    }
    this.entries.set(key, { insertedAt: now, lastAccessedAt: now, accessCount: 1 });
  }

  private evictOne(): void {
    let victimKey: string | null = null;
    let victimEntry: CacheEntry | null = null;

    for (const [key, entry] of this.entries) {
      if (!victimEntry || this.isMoreEvictable(entry, victimEntry)) {
        victimKey = key;
        victimEntry = entry;
      }
    }
    if (victimKey !== null) this.entries.delete(victimKey);
  }

  private isMoreEvictable(candidate: CacheEntry, current: CacheEntry): boolean {
    switch (this.config.evictionPolicy) {
      case "fifo":
        return candidate.insertedAt < current.insertedAt;
      case "lru":
        return candidate.lastAccessedAt < current.lastAccessedAt;
      case "mru":
        return candidate.lastAccessedAt > current.lastAccessedAt;
      case "lfu":
        if (candidate.accessCount !== current.accessCount) {
          return candidate.accessCount < current.accessCount;
        }
        // Tie-break deterministically rather than leaving eviction order
        // to Map iteration happenstance.
        return candidate.insertedAt < current.insertedAt;
    }
  }
}
