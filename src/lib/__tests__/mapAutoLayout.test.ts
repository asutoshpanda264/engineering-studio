import { describe, expect, it } from "vitest";
import { computeTieredMapLayout, type TieredLayoutItem } from "../mapAutoLayout";

describe("computeTieredMapLayout", () => {
  const items: TieredLayoutItem[] = [
    { slug: "a", tier: "one", order: 1 },
    { slug: "b", tier: "one", order: 2 },
    { slug: "c", tier: "two", order: 1 },
    { slug: "d", tier: "two", order: 2 },
    { slug: "e", tier: "two", order: 3 },
  ];
  const tierOrder = ["one", "two", "three"];

  it("positions every item, dropping none", () => {
    const positions = computeTieredMapLayout(items, tierOrder);
    expect(positions.size).toBe(items.length);
    for (const item of items) expect(positions.has(item.slug)).toBe(true);
  });

  it("keeps every coordinate within the 0-100 percent canvas", () => {
    const positions = computeTieredMapLayout(items, tierOrder);
    for (const { x, y } of positions.values()) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it("orders tiers left-to-right by tierOrder, skipping an empty tier", () => {
    const positions = computeTieredMapLayout(items, tierOrder);
    // "three" has no items — "one" and "two" should still each get a
    // distinct column rather than leaving a gap for the skipped tier.
    const oneX = positions.get("a")!.x;
    const twoX = positions.get("c")!.x;
    expect(twoX).toBeGreaterThan(oneX);
  });

  it("spreads items within a tier into distinct lanes, in `order`", () => {
    const positions = computeTieredMapLayout(items, tierOrder);
    const c = positions.get("c")!;
    const d = positions.get("d")!;
    const e = positions.get("e")!;
    expect(c.y).toBeLessThan(d.y);
    expect(d.y).toBeLessThan(e.y);
    // Same tier, so all three should share the same column.
    expect(c.x).toBe(d.x);
    expect(d.x).toBe(e.x);
  });

  it("silently drops an item whose tier isn't in tierOrder", () => {
    const positions = computeTieredMapLayout(
      [...items, { slug: "orphan", tier: "unknown", order: 1 }],
      tierOrder
    );
    expect(positions.has("orphan")).toBe(false);
    expect(positions.size).toBe(items.length);
  });

  it("centers a lone item at (50, 50) when it's the only tier and the only lane", () => {
    const positions = computeTieredMapLayout([{ slug: "solo", tier: "one", order: 1 }], ["one"]);
    expect(positions.get("solo")).toEqual({ x: 50, y: 50 });
  });
});
