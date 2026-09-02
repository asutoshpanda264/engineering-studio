/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { generateTypeScript } from "../codegen";
import { createClassNodeData, createField, createMethod, createRelationshipEdgeData } from "../types";
import type { ClassDiagram, DiagramClassRef, DiagramRelationshipRef } from "../types";

function cls(id: string, overrides: Partial<ReturnType<typeof createClassNodeData>> = {}): DiagramClassRef {
  return { id, data: { ...createClassNodeData(), ...overrides } };
}

function rel(
  id: string,
  source: string,
  target: string,
  kind: DiagramRelationshipRef["data"]["kind"]
): DiagramRelationshipRef {
  return { id, source, target, data: createRelationshipEdgeData(kind) };
}

describe("generateTypeScript", () => {
  it("emits an interface with field and method signatures, no bodies", () => {
    const iface = cls("iface", {
      name: "PaymentStrategy",
      stereotype: "interface",
      fields: [createField({ name: "currency", type: "String" })],
      methods: [createMethod({ name: "pay", params: "amount: double", returnType: "boolean" })],
    });

    const output = generateTypeScript({ classes: [iface], relationships: [] });
    expect(output).toContain("export interface PaymentStrategy {");
    expect(output).toContain("currency: string;");
    expect(output).toContain("pay(amount: number): boolean;");
    expect(output).not.toContain("throw new Error");
  });

  it("emits a class implementing an interface with a stub method body", () => {
    const iface = cls("iface", { name: "PaymentStrategy", stereotype: "interface" });
    const impl = cls("impl", {
      name: "CreditCardStrategy",
      methods: [createMethod({ name: "pay", returnType: "boolean" })],
    });

    const diagram: ClassDiagram = {
      classes: [iface, impl],
      relationships: [rel("r1", "impl", "iface", "realization")],
    };

    const output = generateTypeScript(diagram);
    expect(output).toContain("export class CreditCardStrategy implements PaymentStrategy {");
    expect(output).toContain('throw new Error("Not implemented");');
  });

  it("emits `extends` from an inheritance edge and applies visibility modifiers", () => {
    const parent = cls("parent", { name: "Vehicle" });
    const child = cls("child", {
      name: "Car",
      fields: [createField({ name: "vin", type: "String", visibility: "private" })],
    });

    const diagram: ClassDiagram = {
      classes: [parent, child],
      relationships: [rel("r1", "child", "parent", "inheritance")],
    };

    const output = generateTypeScript(diagram);
    expect(output).toContain("export class Car extends Vehicle {");
    expect(output).toContain("private vin: string;");
  });

  it("emits `abstract method(): T;` only on an abstract-stereotype class, real stub bodies otherwise", () => {
    const abstractClass = cls("abs", {
      name: "Shape",
      stereotype: "abstract",
      methods: [createMethod({ name: "area", returnType: "double", isAbstract: true })],
    });
    const concreteClass = cls("concrete", {
      name: "Circle",
      methods: [createMethod({ name: "area", returnType: "double", isAbstract: true })],
    });

    const abstractOutput = generateTypeScript({ classes: [abstractClass], relationships: [] });
    expect(abstractOutput).toContain("abstract area(): number;");
    expect(abstractOutput).not.toContain("throw new Error");

    // A plain "class" ignores a stray isAbstract flag rather than emitting invalid TS.
    const concreteOutput = generateTypeScript({ classes: [concreteClass], relationships: [] });
    expect(concreteOutput).toContain('throw new Error("Not implemented");');
    expect(concreteOutput).not.toContain("abstract area");
  });

  it("skips classes with no name", () => {
    const blank = cls("blank", { name: "" });
    const output = generateTypeScript({ classes: [blank], relationships: [] });
    expect(output).not.toContain("export class");
    expect(output).not.toContain("export interface");
  });
});
