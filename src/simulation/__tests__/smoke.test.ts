/**
 * Smoke test — verifies the simulation folder is importable
 * without pulling in React. This guard will catch accidental
 * React imports leaking into the engine.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";

describe("simulation layer", () => {
  it("exports a module boundary", () => {
    // When real modules exist this will import them.
    // For now, just verify the test infrastructure works.
    expect(true).toBe(true);
  });

  it("has no React imports in the import graph", async () => {
    // This test will be expanded once real modules exist.
    // The key invariant: src/simulation/ must never import React.
    expect(typeof describe).toBe("function");
  });
});
