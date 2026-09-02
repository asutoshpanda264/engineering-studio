/**
 * Static structural linter over a class diagram — the LLD/UML pillar's
 * equivalent of `src/simulation/`'s "the simulation creates reality" core
 * claim: there's no traffic to fail here, so "break it" means the diagram
 * itself can be structurally wrong, and this module is the thing that
 * actually walks the graph and says so. Zero React, pure TS, deterministic
 * — same discipline `src/simulation/engine/` follows, operating on a
 * static `ClassDiagram` instead of an event timeline.
 *
 * Phase 2 ("SOLID linter pass 1") shipped three rules: SRP (member-count
 * heuristic), LSP (override-throws detection), DIP (concrete-to-concrete
 * coupling where a mediating interface already exists). Phase 3 adds two
 * design-pattern *suggestions* on top — Strategy and Factory Method, the
 * two with a structural signal strong enough to trust without real method
 * bodies to inspect. Deliberately not attempting a lesson-07 structural-
 * pattern rule (Adapter/Decorator/Facade/Proxy/Composite) this pass — none
 * of them has a comparably low-false-positive signal available from a bare
 * diagram; worth revisiting if one turns up. Diamond inheritance and
 * further pattern recognition stay out of scope for later phases.
 */

import type {
  ClassDiagram,
  ClassMethod,
  DiagramClassRef,
  DiagramRelationshipRef,
} from "./types";

/**
 * SOLID principle rules report a genuine violation of that principle.
 * Pattern rules (`"Strategy"`, `"Factory Method"`) are opportunities, not
 * proven violations — a structural proxy for "this shape often wants that
 * pattern," always surfaced at `info` severity, never asserted as fact.
 */
export type LintCategory = "SRP" | "LSP" | "DIP" | "Strategy" | "Factory Method";
export type LintSeverity = "critical" | "warning" | "info";

export interface LintFinding {
  severity: LintSeverity;
  category: LintCategory;
  classId?: string;
  edgeId?: string;
  title: string;
  description: string;
  /** Deep link to the `/lld` lesson section this finding pairs with, e.g. `/lld/behavioral-patterns#strategy`. Only pattern rules set this — the SOLID rules have no single lesson section to point at. */
  relatedLessonHref?: string;
}

// ---- SRP: member-count heuristic ----

const SRP_WARNING_THRESHOLD = 10;
const SRP_CRITICAL_THRESHOLD = 15;

function checkSingleResponsibility(classes: DiagramClassRef[]): LintFinding[] {
  const findings: LintFinding[] = [];

  for (const cls of classes) {
    const memberCount = cls.data.fields.length + cls.data.methods.length;
    const name = cls.data.name || "This class";

    if (memberCount >= SRP_CRITICAL_THRESHOLD) {
      findings.push({
        severity: "critical",
        category: "SRP",
        classId: cls.id,
        title: `${name} has too many responsibilities`,
        description: `${name} carries ${memberCount} fields and methods combined. A class this large is almost always doing more than one job — look for a natural seam (a group of fields/methods that only ever change together) and split it into a second class.`,
      });
    } else if (memberCount >= SRP_WARNING_THRESHOLD) {
      findings.push({
        severity: "warning",
        category: "SRP",
        classId: cls.id,
        title: `${name} is growing large`,
        description: `${name} has ${memberCount} fields and methods combined. Not a violation yet, but worth watching — if it keeps absorbing new members, consider whether it's still doing one job.`,
      });
    }
  }

  return findings;
}

// ---- LSP: override-throws detection ----

const THROW_SIGNAL_PATTERN = /throw|not\s*implement|unsupported/i;

function isThrowStub(note: string | undefined): boolean {
  return typeof note === "string" && THROW_SIGNAL_PATTERN.test(note);
}

function methodsByName(methods: ClassMethod[]): Map<string, ClassMethod> {
  const map = new Map<string, ClassMethod>();
  for (const method of methods) map.set(method.name, method);
  return map;
}

/**
 * A subclass "overrides" a superclass method here if it declares a method
 * of the same name — matching on params/return type too would mean
 * parsing the free-text param string, not worth it for a heuristic this
 * diagram-level (see the Phase 2 plan's own note on this simplification).
 */
function checkLiskovSubstitution(
  classes: DiagramClassRef[],
  relationships: DiagramRelationshipRef[]
): LintFinding[] {
  const findings: LintFinding[] = [];
  const classById = new Map(classes.map((c) => [c.id, c]));

  for (const rel of relationships) {
    if (rel.data.kind !== "inheritance" && rel.data.kind !== "realization") continue;

    const subclass = classById.get(rel.source);
    const superclass = classById.get(rel.target);
    if (!subclass || !superclass) continue;

    const superMethods = methodsByName(superclass.data.methods);

    for (const method of subclass.data.methods) {
      if (!superMethods.has(method.name)) continue;
      if (!isThrowStub(method.implementationNote)) continue;

      findings.push({
        severity: "critical",
        category: "LSP",
        classId: subclass.id,
        title: `${subclass.data.name || "This class"}.${method.name}() breaks substitution`,
        description: `${subclass.data.name || "This class"} overrides ${superclass.data.name || "its parent"}'s ${method.name}() but its implementation note says it throws instead of doing the work. Code written against ${superclass.data.name || "the parent"} can't safely substitute ${subclass.data.name || "this subclass"} in — either give ${method.name}() a real implementation here, or move it off the shared superclass/interface.`,
      });
    }
  }

  return findings;
}

// ---- DIP: concrete-to-concrete coupling with a mediating interface available ----

const COUPLING_KINDS = new Set(["association", "aggregation", "composition", "dependency"]);

/**
 * classId -> the interface/abstract-class ids it directly realizes or
 * inherits from — shared by the DIP and Factory Method rules below, both
 * of which need "what abstraction does this concrete class sit behind."
 * Only `"interface"`/`"abstract"` targets count as a mediating abstraction
 * — a concrete `"class"` superclass isn't one (depending on it instead
 * buys DIP nothing; it's exactly as concrete as the class already
 * pointed at), so those edges are excluded here on purpose.
 */
function supertypesByClass(
  classes: DiagramClassRef[],
  relationships: DiagramRelationshipRef[]
): Map<string, Set<string>> {
  const classById = new Map(classes.map((c) => [c.id, c]));
  const map = new Map<string, Set<string>>();

  for (const rel of relationships) {
    if (rel.data.kind !== "realization" && rel.data.kind !== "inheritance") continue;
    const target = classById.get(rel.target);
    if (!classById.has(rel.source) || !target) continue;
    if (target.data.stereotype === "class") continue;

    const set = map.get(rel.source) ?? new Set<string>();
    set.add(rel.target);
    map.set(rel.source, set);
  }

  return map;
}

function checkDependencyInversion(
  classes: DiagramClassRef[],
  relationships: DiagramRelationshipRef[],
  supertypes: Map<string, Set<string>>
): LintFinding[] {
  const findings: LintFinding[] = [];
  const classById = new Map(classes.map((c) => [c.id, c]));

  for (const rel of relationships) {
    if (!COUPLING_KINDS.has(rel.data.kind)) continue;

    const from = classById.get(rel.source);
    const to = classById.get(rel.target);
    if (!from || !to) continue;
    if (from.data.stereotype !== "class" || to.data.stereotype !== "class") continue;

    const mediatingIds = supertypes.get(to.id);
    if (!mediatingIds || mediatingIds.size === 0) continue;

    const interfaceNames = [...mediatingIds]
      .map((id) => classById.get(id)?.data.name || "an interface")
      .join(", ");
    findings.push({
      severity: "warning",
      category: "DIP",
      classId: from.id,
      edgeId: rel.id,
      title: `${from.data.name || "This class"} depends on ${to.data.name || "a concrete class"} directly`,
      description: `${from.data.name || "This class"} is coupled to the concrete class ${to.data.name || "it points at"}, but ${to.data.name || "that class"} already implements ${interfaceNames}. Depending on ${interfaceNames} instead would let ${to.data.name || "the implementation"} be swapped without touching ${from.data.name || "this class"}.`,
    });
  }

  return findings;
}

// ---- Strategy: a class "switches on type" via a cluster of similarly-named methods ----

const STRATEGY_MIN_SHARED_PREFIX = 6;
const STRATEGY_MIN_CLUSTER_SIZE = 3;

/** The longest prefix shared by every name in the group, cut back to the last camelCase word boundary (so "applyDiscountReg"/"applyDiscountVip" reduce to "applyDiscount", not a mid-word split). */
function camelCaseSharedPrefix(names: string[]): string {
  if (names.length === 0) return "";
  let prefix = names[0];
  for (const name of names.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < name.length && prefix[i] === name[i]) i++;
    prefix = prefix.slice(0, i);
  }
  if (prefix.length === 0) return prefix;

  // The raw prefix already ends on a real word boundary if the very next
  // character in every name (the one right where they first diverge) is
  // uppercase — or a name is exactly the prefix's own length.
  const endsOnBoundary = names.every(
    (name) => name.length === prefix.length || /[A-Z]/.test(name[prefix.length])
  );
  if (endsOnBoundary) return prefix;

  // Otherwise the raw prefix cuts through a word (e.g. "handleCl" from
  // "handleClick"/"handleClose") — retreat to that trailing word's own
  // start (the last uppercase letter inside the prefix) so it reduces to
  // "handle", not a mid-word fragment.
  for (let i = prefix.length - 1; i >= 0; i--) {
    if (/[A-Z]/.test(prefix[i])) return prefix.slice(0, i);
  }
  return prefix;
}

function checkStrategyOpportunity(classes: DiagramClassRef[]): LintFinding[] {
  const findings: LintFinding[] = [];

  for (const cls of classes) {
    if (cls.data.stereotype === "interface") continue; // the contract itself isn't the switch
    if (cls.data.methods.length < STRATEGY_MIN_CLUSTER_SIZE) continue;

    // Group method names by their shared camelCase prefix against every
    // other method — small class member counts (this only ever runs on
    // one class's own methods) make the pairwise scan cheap.
    const names = cls.data.methods.map((m) => m.name);
    const seen = new Set<string>();

    for (let i = 0; i < names.length; i++) {
      if (seen.has(names[i])) continue;
      const cluster = [names[i]];
      for (let j = i + 1; j < names.length; j++) {
        if (seen.has(names[j]) || names[j] === names[i]) continue;
        const prefix = camelCaseSharedPrefix([names[i], names[j]]);
        if (prefix.length >= STRATEGY_MIN_SHARED_PREFIX) cluster.push(names[j]);
      }
      if (cluster.length < STRATEGY_MIN_CLUSTER_SIZE) continue;

      const sharedPrefix = camelCaseSharedPrefix(cluster);
      if (sharedPrefix.length < STRATEGY_MIN_SHARED_PREFIX) continue;

      for (const name of cluster) seen.add(name);
      const name = cls.data.name || "This class";
      findings.push({
        severity: "info",
        category: "Strategy",
        classId: cls.id,
        title: `${name} may want a Strategy`,
        description: `${name} has ${cluster.length} methods that share the "${sharedPrefix}" prefix (${cluster.join(", ")}) — a common shape for a method that switches its behavior by type or case. Consider extracting a Strategy interface with one implementation per variant instead of branching inside ${name}.`,
        relatedLessonHref: "/lld/behavioral-patterns#strategy",
      });
    }
  }

  return findings;
}

// ---- Factory Method: a class chooses directly between several interchangeable implementations ----

const FACTORY_METHOD_MIN_SIBLINGS = 2;

function checkFactoryMethodOpportunity(
  classes: DiagramClassRef[],
  relationships: DiagramRelationshipRef[],
  supertypes: Map<string, Set<string>>
): LintFinding[] {
  const findings: LintFinding[] = [];
  const classById = new Map(classes.map((c) => [c.id, c]));

  for (const cls of classes) {
    const targets = relationships
      .filter((rel) => rel.source === cls.id && COUPLING_KINDS.has(rel.data.kind))
      .map((rel) => classById.get(rel.target))
      .filter((t): t is DiagramClassRef => Boolean(t) && t!.data.stereotype === "class");

    if (targets.length < FACTORY_METHOD_MIN_SIBLINGS) continue;

    // Group the coupled concrete targets by shared supertype — two or
    // more that realize/inherit the same interface/superclass are
    // "interchangeable implementations this class is choosing between."
    const bySupertype = new Map<string, DiagramClassRef[]>();
    for (const target of targets) {
      for (const supertypeId of supertypes.get(target.id) ?? []) {
        const group = bySupertype.get(supertypeId) ?? [];
        group.push(target);
        bySupertype.set(supertypeId, group);
      }
    }

    for (const [supertypeId, siblings] of bySupertype) {
      const uniqueSiblings = [...new Map(siblings.map((s) => [s.id, s])).values()];
      if (uniqueSiblings.length < FACTORY_METHOD_MIN_SIBLINGS) continue;

      const supertypeName = classById.get(supertypeId)?.data.name || "a shared interface";
      const siblingNames = uniqueSiblings.map((s) => s.data.name || "an implementation").join(", ");
      const name = cls.data.name || "This class";
      findings.push({
        severity: "info",
        category: "Factory Method",
        classId: cls.id,
        title: `${name} chooses directly between ${uniqueSiblings.length} implementations of ${supertypeName}`,
        description: `${name} is coupled to ${siblingNames} at once — all interchangeable implementations of ${supertypeName}. Centralizing which one gets created behind a Factory Method would let ${name} depend only on ${supertypeName}, and let new implementations be added without touching ${name}.`,
        relatedLessonHref: "/lld/creational-patterns#factory-method",
      });
    }
  }

  return findings;
}

const SEVERITY_RANK: Record<LintSeverity, number> = { critical: 0, warning: 1, info: 2 };

export function lintClassDiagram(diagram: ClassDiagram): LintFinding[] {
  const supertypes = supertypesByClass(diagram.classes, diagram.relationships);

  const findings = [
    ...checkSingleResponsibility(diagram.classes),
    ...checkLiskovSubstitution(diagram.classes, diagram.relationships),
    ...checkDependencyInversion(diagram.classes, diagram.relationships, supertypes),
    ...checkStrategyOpportunity(diagram.classes),
    ...checkFactoryMethodOpportunity(diagram.classes, diagram.relationships, supertypes),
  ];

  return findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
