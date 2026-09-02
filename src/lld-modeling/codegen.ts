/**
 * Phase 5 (stretch) of Pillar B: "download your design as code" — emits
 * TypeScript class/interface stubs from a `ClassDiagram`. Zero React, pure
 * TS, deterministic, same as every other module here.
 *
 * Deliberately a straight, honest transcription of what's actually drawn
 * — every field/method exactly as declared, `extends`/`implements` derived
 * from inheritance/realization edges — and nothing more. It doesn't try to
 * synthesize fields from composition/aggregation edges (that could
 * conflict with fields the student already typed in by hand) or infer
 * real method bodies (there are none to infer from): every concrete
 * method body is a `throw new Error("Not implemented")` stub, always
 * type-valid regardless of the declared return type, and honest about
 * being one.
 */

import type { ClassDiagram, ClassMethod, DiagramClassRef } from "./types";

/** Java/C#-flavored scalar type spellings (the lesson content's own convention, see `04-uml-class-diagrams.ts`'s worked examples) mapped to their TS equivalents. Whole-word only, so a class named e.g. `Long` isn't accidentally rewritten mid-identifier. */
const SCALAR_TYPE_MAP: Record<string, string> = {
  string: "string",
  int: "number",
  integer: "number",
  long: "number",
  double: "number",
  float: "number",
  short: "number",
  byte: "number",
  bool: "boolean",
  boolean: "boolean",
  void: "void",
  object: "unknown",
};

function toTsType(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "void";
  return trimmed.replace(/\b[A-Za-z_]\w*\b/g, (word) => SCALAR_TYPE_MAP[word.toLowerCase()] ?? word);
}

/** "amount: double, note: String" -> "amount: number, note: string" — an untyped param (no ":") gets an explicit ": any" rather than silently becoming implicit-any. */
function convertParams(raw: string): string {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colon = part.indexOf(":");
      if (colon === -1) return `${part}: any`;
      const name = part.slice(0, colon).trim();
      const type = part.slice(colon + 1).trim();
      return `${name}: ${toTsType(type)}`;
    })
    .join(", ");
}

function visibilityModifier(visibility: ClassMethod["visibility"]): string {
  if (visibility === "private") return "private ";
  if (visibility === "protected") return "protected ";
  // TS has no package-private equivalent; "public"/"package" both emit no
  // modifier, which is TS's own implicit-public default.
  return "";
}

function generateClassBlock(
  cls: DiagramClassRef,
  extendsName: string | undefined,
  implementsNames: string[]
): string {
  const name = cls.data.name.trim() || "Untitled";

  if (cls.data.stereotype === "interface") {
    const members = [
      ...cls.data.fields.map((f) => `  ${f.name}: ${toTsType(f.type)};`),
      ...cls.data.methods.map((m) => `  ${m.name}(${convertParams(m.params)}): ${toTsType(m.returnType)};`),
    ];
    return `export interface ${name} {\n${members.join("\n")}\n}`;
  }

  const heritage = [
    extendsName ? `extends ${extendsName}` : "",
    implementsNames.length ? `implements ${implementsNames.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const fieldLines = cls.data.fields.map((f) => {
    const staticKw = f.isStatic ? "static " : "";
    return `  ${visibilityModifier(f.visibility)}${staticKw}${f.name}: ${toTsType(f.type)};`;
  });

  const methodLines = cls.data.methods.map((m) => {
    const modifier = visibilityModifier(m.visibility);
    const staticKw = m.isStatic ? "static " : "";
    const signature = `${m.name}(${convertParams(m.params)}): ${toTsType(m.returnType)}`;

    // Only an abstract-stereotype class can declare a bodyless `abstract`
    // method in valid TS — a method flagged abstract on a plain "class"
    // still gets a real (stub) body, so the output always compiles.
    if (cls.data.stereotype === "abstract" && m.isAbstract) {
      return `  ${modifier}abstract ${signature};`;
    }
    return `  ${modifier}${staticKw}${signature} {\n    throw new Error("Not implemented");\n  }`;
  });

  const abstractKw = cls.data.stereotype === "abstract" ? "abstract " : "";
  const body = [...fieldLines, ...methodLines].join("\n\n");
  return `export ${abstractKw}class ${name}${heritage ? ` ${heritage}` : ""} {\n${body}\n}`;
}

export function generateTypeScript(diagram: ClassDiagram): string {
  const classById = new Map(diagram.classes.map((c) => [c.id, c]));
  const extendsByClass = new Map<string, string>();
  const implementsByClass = new Map<string, string[]>();

  for (const rel of diagram.relationships) {
    const target = classById.get(rel.target);
    if (!target) continue;

    // TS classes support only single inheritance — the first inheritance
    // edge wins if a diagram (incorrectly, for TS) models more than one;
    // this is a transcription of the diagram, not a validator, so it
    // doesn't reject that case, just picks one deterministically.
    if (rel.data.kind === "inheritance" && !extendsByClass.has(rel.source)) {
      extendsByClass.set(rel.source, target.data.name.trim() || "Untitled");
    } else if (rel.data.kind === "realization") {
      const list = implementsByClass.get(rel.source) ?? [];
      list.push(target.data.name.trim() || "Untitled");
      implementsByClass.set(rel.source, list);
    }
  }

  const blocks = diagram.classes
    .filter((c) => c.data.name.trim().length > 0)
    .map((c) => generateClassBlock(c, extendsByClass.get(c.id), implementsByClass.get(c.id) ?? []));

  const header =
    "// Generated by Engineering Studio's /lld/editor — a structural export of your class diagram.\n" +
    "// Method bodies are stubs (\"Not implemented\"); this transcribes the diagram's shape, not real logic.\n";

  return `${header}\n${blocks.join("\n\n")}\n`;
}
