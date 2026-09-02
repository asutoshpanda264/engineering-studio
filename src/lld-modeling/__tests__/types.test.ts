/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  createClassNodeData,
  createField,
  createMethod,
  createRelationshipEdgeData,
  RELATIONSHIP_KIND_LABEL,
  VISIBILITY_SYMBOL,
} from "../types";
import type { UmlRelationshipKind } from "@/content/shared/lesson";

describe("createClassNodeData", () => {
  it("defaults to an empty class with no members", () => {
    const node = createClassNodeData();
    expect(node.stereotype).toBe("class");
    expect(node.fields).toEqual([]);
    expect(node.methods).toEqual([]);
    expect(node.name.length).toBeGreaterThan(0);
  });

  it("gives an interface a distinct starting name from a class", () => {
    const iface = createClassNodeData("interface");
    const cls = createClassNodeData("class");
    expect(iface.name).not.toBe(cls.name);
    expect(iface.stereotype).toBe("interface");
  });
});

describe("createField / createMethod", () => {
  it("assigns unique, non-empty ids across repeated calls", () => {
    const a = createField();
    const b = createField();
    expect(a.id).not.toBe(b.id);
    expect(a.id.length).toBeGreaterThan(0);
  });

  it("applies overrides on top of sane defaults", () => {
    const field = createField({ name: "balance", type: "double", visibility: "public" });
    expect(field).toMatchObject({ name: "balance", type: "double", visibility: "public" });

    const method = createMethod({ name: "deposit", returnType: "void", isAbstract: true });
    expect(method).toMatchObject({ name: "deposit", returnType: "void", isAbstract: true });
    expect(method.id.length).toBeGreaterThan(0);
  });
});

describe("createRelationshipEdgeData", () => {
  it("defaults to association", () => {
    expect(createRelationshipEdgeData().kind).toBe("association");
  });

  it("carries through an explicit kind", () => {
    expect(createRelationshipEdgeData("composition").kind).toBe("composition");
  });
});

describe("RELATIONSHIP_KIND_LABEL / VISIBILITY_SYMBOL", () => {
  it("has a label for every UmlRelationshipKind", () => {
    const kinds: UmlRelationshipKind[] = [
      "association",
      "aggregation",
      "composition",
      "inheritance",
      "realization",
      "dependency",
    ];
    for (const kind of kinds) {
      expect(RELATIONSHIP_KIND_LABEL[kind].length).toBeGreaterThan(0);
    }
  });

  it("has a single-character symbol for every visibility", () => {
    for (const symbol of Object.values(VISIBILITY_SYMBOL)) {
      expect(symbol.length).toBe(1);
    }
  });
});
