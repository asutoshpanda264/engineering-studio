/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { VILLAIN_SEQUENCE, lessonHref, villainForChapter } from "../villains";

describe("villains", () => {
  it("has exactly 3 villains with unique ids", () => {
    expect(VILLAIN_SEQUENCE).toHaveLength(3);
    expect(new Set(VILLAIN_SEQUENCE.map((v) => v.id)).size).toBe(3);
  });

  it("villainForChapter maps 0/1/2 to Ra's al Ghul / Joker / Bane in order", () => {
    expect(villainForChapter(0).id).toBe("ras-al-ghul");
    expect(villainForChapter(1).id).toBe("joker");
    expect(villainForChapter(2).id).toBe("bane");
  });

  it("lessonHref builds the right route per course module", () => {
    expect(lessonHref({ courseModule: "foundations", slug: "consistent-hashing" })).toBe(
      "/foundations/consistent-hashing"
    );
    expect(lessonHref({ courseModule: "lld", slug: "rate-limiter" })).toBe("/lld/rate-limiter");
  });
});
