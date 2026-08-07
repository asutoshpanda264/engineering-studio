/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { CacheStore } from "../entities/CacheStore";

function makeStore(ttlMs = 0, capacity = 10): CacheStore {
  return new CacheStore({ capacity, evictionPolicy: "lru", ttlMs });
}

describe("CacheStore.lookup", () => {
  it("returns 'cold' for a key that was never stored", () => {
    const store = makeStore();
    expect(store.lookup("missing", 0)).toBe("cold");
  });

  it("returns 'hit' for a present, unexpired key", () => {
    const store = makeStore(1000);
    store.set("A", 0);
    expect(store.lookup("A", 500)).toBe("hit");
  });

  it("returns 'expired' — not 'cold' — once a stored key's own TTL has passed, then evicts it", () => {
    const store = makeStore(100);
    store.set("A", 0);
    expect(store.lookup("A", 150)).toBe("expired");
    // The expired entry was evicted as a side effect — a second lookup at
    // the same instant is a genuinely new/never-seen "cold" miss, not
    // another "expired" one (an entry can only expire once).
    expect(store.lookup("A", 150)).toBe("cold");
  });

  it("never expires when ttlMs is 0", () => {
    const store = makeStore(0);
    store.set("A", 0);
    expect(store.lookup("A", 1_000_000)).toBe("hit");
  });
});

describe("CacheStore.set — per-entry TTL override", () => {
  it("uses the store's configured TTL when no override is given", () => {
    const store = makeStore(200);
    store.set("A", 0);
    expect(store.lookup("A", 150)).toBe("hit");
    expect(store.lookup("A", 250)).toBe("expired");
  });

  it("lets one entry's effective TTL diverge from the store's configured TTL", () => {
    // Configured TTL is long (1000ms), but this one entry is stored with a
    // much shorter override — exactly what Cache.ts's ttlJitterPercent
    // does per entry, without needing every entry to share one TTL.
    const store = makeStore(1000);
    store.set("A", 0, 30);
    expect(store.lookup("A", 40)).toBe("expired");
  });

  it("keeps different entries' overridden TTLs fully independent", () => {
    const store = makeStore(1000);
    store.set("short", 0, 20);
    store.set("long", 0, 500);
    // At t=100: "short" has long since expired on its own override, while
    // "long" is still well within its own — neither is affected by the
    // store's shared config.ttlMs (1000) or by each other.
    expect(store.lookup("short", 100)).toBe("expired");
    expect(store.lookup("long", 100)).toBe("hit");
  });

  it("a 0 override means that entry never expires, even with a nonzero configured TTL", () => {
    const store = makeStore(50);
    store.set("A", 0, 0);
    expect(store.lookup("A", 1_000_000)).toBe("hit");
  });
});
