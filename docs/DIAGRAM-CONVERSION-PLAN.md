# DIAGRAM-CONVERSION-PLAN.md

Replace every ascii `kind: "diagram"` block in `/foundations` and `/lld` with
either a real SVG figure or a better-structured existing block (`table`/
`list`/`code`). This file is the complete spec + checklist so any session —
including one with none of this conversation's context — can pick a lesson
file and convert it correctly without re-deriving the design.

**Read this whole file before converting anything.** Section 1–5 is the
infra spec (build once). Section 6 is the per-lesson catalog (execute
incrementally, one lesson file at a time, checking items off as you go).

---

## 0. Status

- **Done — the whole effort.** Infra (§2–4: the 6 generic `LessonBlock`
  kinds, `src/components/content/diagrams/generic/*`, `UmlMarkers.tsx`,
  the `LessonBlockRenderer` switch cases) is built, and every non-optional
  row in §6 (all 18 Foundations lessons, LLD L4, and the 6 LLD case
  studies) is converted and checked off. Re-running §5.1's extraction
  script finds exactly 2 remaining ascii `diagram` blocks — both
  intentional §7 exceptions (Foundations L8's CAP theorem triangle, LLD
  L4's UML class-box) — so §8's definition of done is met on the content
  side. `npx tsc --noEmit`, `npx vitest run`, `npm run lint` all clean.
  Still open: the `docs/BROWSER-CHECKS.md` entries this pass added need an
  actual browser verification pass (batched, per `AGENTS.md`'s workflow)
  before they can be deleted; the pilot 3 (`DnsHierarchyDiagram` etc.)
  still await their own original approval pass too.
- The pilot 3 figures on Foundations L5 remain bespoke one-off components
  (not migrated to the generic kinds) — §6.0 always called this optional
  cleanup, not a blocker, and it's still true now that everything else is
  done.

---

## 1. Why generic, not one component per diagram

The pilot's `figure` kind (`{ kind: "figure"; diagram: DiagramId }`, a
registry of zero-prop components) works for a handful of genuinely unique
diagrams. It does not work for 185 — that's 185 new `.tsx` files.

Scanning every ascii block across both modules, the content falls into a
handful of *shapes* that repeat constantly: a numbered vertical sequence
("step 1 → step 2 → ..."), a request/response exchange between two or
three parties over time, a hierarchy or decision tree, a box-and-arrow
topology, a before/after pair of topologies, and (LLD only) UML
relationship notation. Building one generic, prop-driven component per
shape and letting lesson content supply *data* (not JSX) means converting
a diagram is authoring a small object literal in the lesson file, not
writing a new component. That's the only way this is tractable.

A meaningful chunk of the ascii blocks aren't diagrams at all — they're
key→value listings, code traces, or ❌/✅ pairs that happen to be sitting
in a `pre` tag. Those get reformatted into the *existing* `table`/`list`/
`code` block kinds, which already render well. Don't build a diagram for
those — see the decision rule in §5.2.

---

## 2. New `LessonBlock` kinds

All go in `src/content/shared/lesson.ts`, added to the `LessonBlock` union
alongside the existing `figure` kind (keep `figure`+registry — it's the
escape hatch for the rare thing that fits none of these six).

```ts
export type BoxTone = "neutral" | "signal" | "healthy" | "critical"; // already defined in diagrams/primitives.tsx — re-export or import, don't redefine

// 1. Numbered vertical sequence — "you type X" style step-by-step.
export interface FlowStep {
  title: string;
  detail?: string;
  tone?: BoxTone; // e.g. "critical" on a final crash/failure step
}
export interface FlowBlock { kind: "flow"; steps: FlowStep[] }

// 2. Two/three-party message exchange over time (handshakes, request/response).
export interface SequenceActor { id: string; label: string }
export interface SequenceMessage {
  from: string; // actor id
  to: string;   // actor id
  label: string;
  dashed?: boolean; // conventionally: response/return messages
  tone?: BoxTone;
}
export interface SequenceBlock { kind: "sequence"; actors: SequenceActor[]; messages: SequenceMessage[] }

// 3. Hierarchy / decision tree.
export interface TreeNode {
  label: string;
  sublabel?: string;
  tone?: BoxTone;
  /** Label on the edge from this node's parent to this node — "YES"/"NO" for decision trees, absent for plain hierarchies. */
  edgeLabel?: string;
  children?: TreeNode[];
}
export interface TreeBlock { kind: "tree"; root: TreeNode }

// 4. Freeform box-and-arrow topology — the workhorse, covers anything
//    tree/flow/sequence don't (fan-out, fan-in, converging edges).
export interface ArchNode {
  id: string;
  label: string;
  sublabel?: string;
  col: number; // 0-indexed grid column
  row: number; // 0-indexed grid row
  tone?: BoxTone;
  dashed?: boolean;
}
export interface ArchEdge {
  from: string; // ArchNode id
  to: string;   // ArchNode id
  label?: string;
  tone?: BoxTone;
  dashed?: boolean;
}
export interface ArchitectureBlock { kind: "architecture"; nodes: ArchNode[]; edges: ArchEdge[] }

// 5. Side-by-side panels — before/after, A-vs-B, a short "journey" of 2-3 stages.
//    Each panel is a small ArchitectureBlock of its own (nodes/edges local to that panel).
export interface ComparePanel { title: string; nodes: ArchNode[]; edges: ArchEdge[] }
export interface CompareBlock {
  kind: "compare";
  panels: ComparePanel[]; // 2 typical, occasionally 3
  /** Short text shown in the gap between panel 0 and panel 1 only (e.g. "Primary fails → health check → DNS updates"). Omit for a plain side-by-side with no narrative transition. */
  transitionLabel?: string[];
}

// 6. LLD only — UML class-relationship notation.
export type UmlRelationshipKind =
  | "association" | "aggregation" | "composition"
  | "inheritance" | "realization" | "dependency";
export interface UmlRelationship {
  from: string;
  to: string;
  kind: UmlRelationshipKind;
  fromMultiplicity?: string;
  toMultiplicity?: string;
  label?: string; // the verb, e.g. "has", "teaches"
}
export interface UmlBlock { kind: "uml"; relationships: UmlRelationship[] }
```

Add all six to the `LessonBlock` union. TypeScript's exhaustiveness check
on `LessonBlockRenderer`'s `switch` will then force a compile error until
you add the render case for each — use that as your checklist, don't
disable it.

---

## 3. New components

One file per shape under `src/components/content/diagrams/generic/`,
reusing `DiagramBox`/`DiagramArrow`/`ArrowMarker`/`BoxTone` from the
existing `src/components/content/diagrams/primitives.tsx` (do not
duplicate those). Each takes its block's props directly (no registry
lookup needed — these carry their own data, unlike the bespoke `figure`
kind).

- `FlowDiagram.tsx` — props `{ steps: FlowStep[] }`. Same vertical-rail
  layout as the pilot's `DnsResolutionFlowDiagram`, generalized: number
  every step `1..N` uniformly (don't special-case a start/end step the
  way the pilot did — simpler, and reads fine).
- `SequenceDiagram.tsx` — props `{ actors, messages }`. N evenly-spaced
  vertical lifelines (labeled box at top, dashed line down); each message
  is a horizontal arrow at `y = TOP + index * ROW_HEIGHT` between its
  `from`/`to` actor's lifeline x-position, direction inferred from which
  is left/right, label centered above the arrow.
- `TreeDiagram.tsx` — props `{ root: TreeNode }`. Recursive layout: each
  node's subtree width = sum of children's subtree widths (leaf = one
  fixed unit); center a node over its children; depth sets the row.
  Elbow connectors like the pilot's `DnsHierarchyDiagram`, plus optional
  `edgeLabel` text near the midpoint for decision-tree YES/NO.
- `ArchitectureDiagram.tsx` — props `{ nodes: ArchNode[]; edges: ArchEdge[] }`.
  Position = `(col * COL_WIDTH, row * ROW_HEIGHT)`; resolve edge
  endpoints by looking up `from`/`to` in a `Map` built from `nodes`.
  Content authors pick col/row by hand, same as the ascii diagrams are
  already hand-positioned.
- `CompareDiagram.tsx` — props `{ panels, transitionLabel? }`. Renders
  N `ArchitectureDiagram`-equivalent panels side by side (each panel's
  node coordinates are local, auto-offset by panel index), a small
  uppercase title above each (see the pilot `DnsFailoverDiagram`'s
  panel title treatment), and `transitionLabel` lines centered in the
  gap between panel 0 and 1 only.
- `UmlDiagram.tsx` — props `{ relationships: UmlRelationship[] }`. Each
  relationship is one horizontal row (`box(from)── connector ──box(to)`),
  stacked vertically. Connector by `kind`:
  | kind | line | end marker |
  |---|---|---|
  | association | solid | none |
  | aggregation | solid | hollow diamond at `from` end |
  | composition | solid | filled diamond at `from` end |
  | inheritance | solid | hollow triangle at `to` end |
  | realization | dashed | hollow triangle at `to` end |
  | dependency | dashed | open arrowhead at `to` end |

  `fromMultiplicity`/`toMultiplicity` render as small text near each end;
  `label` centers on the line. Needs 3 new marker defs (hollow diamond,
  filled diamond, hollow triangle) alongside the existing arrow marker —
  add them to `primitives.tsx`'s `ArrowMarker` or a sibling
  `UmlMarkers.tsx`, matching its existing tone-to-fill-class pattern.

Wire all six into `LessonBlockRenderer.tsx` as new `switch` cases, same
bordered `bg-bg-panel` figure frame the `figure` case already uses (reuse
that JSX, don't reinvent it) — a `caption` prop isn't in these six block
types by design (the shape's own title/labels usually suffice); add one
only if a specific conversion genuinely needs it.

---

## 4. Two worked examples (calibrate against these before converting anything)

**`flow`** — Foundations L1, "the-problem" section, replacing:
```
Day 1:   10 users     → Works fine on one server
Day 30:  10,000 users → Server gets slow
Day 60:  1M users     → Server crashes
Day 90:  Engineers panic, rewrite everything at 3am
Day 120: Company loses crores. Engineers quit.
```
becomes:
```ts
{
  kind: "flow",
  steps: [
    { title: "Day 1 — 10 users", detail: "works fine on one server" },
    { title: "Day 30 — 10,000 users", detail: "server gets slow" },
    { title: "Day 60 — 1M users", detail: "server crashes", tone: "critical" },
    { title: "Day 90", detail: "engineers panic, rewrite everything at 3am", tone: "critical" },
    { title: "Day 120", detail: "company loses crores, engineers quit", tone: "critical" },
  ],
}
```

**`architecture`** — Foundations L16, "core-concepts" section, replacing:
```
┌──────────────┐         ┌─────────┐         ┌──────────────┐
│   Producer   │ ──────→ │  Queue  │ ──────→ │   Consumer   │
│(Order Service│  sends  │(Message │  reads  │(Email Service│
│              │ message │ Broker) │ message │              │
└──────────────┘         └─────────┘         └──────────────┘
```
becomes:
```ts
{
  kind: "architecture",
  nodes: [
    { id: "producer", label: "Producer", sublabel: "Order Service", col: 0, row: 0 },
    { id: "queue", label: "Queue", sublabel: "Message Broker", col: 1, row: 0 },
    { id: "consumer", label: "Consumer", sublabel: "Email Service", col: 2, row: 0 },
  ],
  edges: [
    { from: "producer", to: "queue", label: "sends message" },
    { from: "queue", to: "consumer", label: "reads message" },
  ],
}
```

---

## 5. Recipe for converting one lesson file

1. Open the lesson file under `src/content/foundations/lessons/` or
   `src/content/lld/lessons/`.
2. For each `kind: "diagram"` block, apply the decision rule (§5.2) and
   the catalog entry for that file in §6 (the shape call is already made
   there — trust it unless the ascii clearly changed since this was
   written, in which case re-derive and update the catalog row).
3. Replace the block in place with the new block kind's data literal, or
   reformat into `table`/`list`/`code` per the catalog.
4. Where the catalog says "merge" two or more ascii blocks into one
   figure, delete the redundant ones and any now-redundant surrounding
   prose that only existed to narrate the ascii.
5. Run `npx tsc --noEmit`, `npx vitest run`, `npm run lint`. Fix before
   moving to the next block.
6. Once a whole lesson file is converted, add **one** entry to
   `docs/BROWSER-CHECKS.md` (see the existing DNS-pilot entry for the
   format) describing what to look for — don't open a browser yourself
   per `AGENTS.md`'s workflow.
7. Check off every row for that file in §6 (`- [ ]` → `- [x]`), and
   update the running counts in §0.

### 5.1 Re-deriving the catalog if it drifts

If a lesson file has been edited since this plan was written, don't trust
§6 blindly for that file — re-extract its diagram blocks and re-classify.
The extraction script used to build §6 (run with `npx tsx`, deleted after
use — recreate it if needed):

```ts
// scripts/tmp-extract-diagrams.ts (delete after running)
import { FOUNDATION_LESSONS } from "@/content/foundations";
import { LLD_LESSONS } from "@/content/lld";
import type { LessonSection } from "@/content/shared/lesson";

function dump(name: string, lessons: { slug: string; number: number; sections: LessonSection[] }[]) {
  for (const lesson of lessons) {
    for (const section of lesson.sections) {
      section.blocks.forEach((block, i) => {
        if (block.kind !== "diagram") return;
        console.log(`### ${name} L${lesson.number} ${lesson.slug} :: ${section.id} [block ${i}]`);
        console.log(block.lines.join("\n"));
      });
    }
  }
}
dump("FOUNDATIONS", FOUNDATION_LESSONS);
dump("LLD", LLD_LESSONS);
```
Run: `npx tsx scripts/tmp-extract-diagrams.ts`, then delete the script —
it's scaffolding, not a permanent part of the repo.

### 5.2 Decision rule (shape picker)

Apply in order, first match wins:

1. **UML notation** (`◇`/`◆`/`▷`/multiplicities like `1..*`) → `uml`.
   LLD only.
2. **Two parties exchanging labeled messages over time** (handshakes,
   request→response) → `sequence`.
3. **A hierarchy or a YES/NO decision chain** → `tree`.
4. **A single before/after, A-vs-B, or 2-3 stage "journey"** where each
   side is itself a small topology → `compare`.
5. **A strictly linear, numbered, top-to-bottom temporal sequence** with
   no branching → `flow`.
6. **Boxes connected by arrows** that don't fit 2–5 (fan-out, fan-in,
   converging edges, static topology) → `architecture`.
7. **Everything else** — key→value listings, code/arithmetic traces,
   ❌/✅ text pairs, ranked lists, plain numeric comparisons — is not a
   diagram. Reformat into `table` (most common), `list`, or `code`.
   When two or more adjacent ascii blocks are the same ❌/✅ pattern
   repeated (REST's "common-mistakes" section is the clearest example),
   collapse them into **one** `table` with a row per mistake instead of
   converting each separately.

When a call is genuinely ambiguous between two shapes, prefer the one
that needs fewer nodes/nesting to express it — simpler data, easier to
read back later.

---

## 6. Catalog

One subsection per lesson file that has ascii diagrams. `§section-id
(block N)` locates it (block index within that section, 0-based, matches
the extraction script's output). Where a row says "merge with block N",
convert once and delete the other.

LLD lessons `01, 02, 03, 05, 06, 07, 08, 15` have zero `diagram` blocks —
nothing to do there.

### 6.0 Foundations L5 — dns-deep-dive (optional cleanup)

The 3 already-shipped `figure` blocks (`dns-hierarchy`,
`dns-resolution-flow`, `dns-failover`) could be migrated to `tree`,
`flow`, and `compare` respectively once those exist, retiring the 3
bespoke component files in favor of the generic ones. Not required —
only do this if you want exactly one system instead of two. Two ascii
blocks remain on this lesson:

- [x] `§ttl` (block 1) — TTL value → cache duration (300/3600/86400) → **table** (TTL, cached for)
- [x] `§cdn-and-dns` (block 3) — user location → CDN node (3 rows) → **table** (User location, CDN node)

### 6.1 Foundations L1 — what-is-system-design

- [x] `§the-problem` (block 1) — Day 1→120 growth-then-crash timeline → **flow** (5 steps, escalating to `critical`) — full data in §4's worked example, reuse it verbatim

### 6.2 Foundations L2 — how-the-internet-works

- [x] `§key-players` (block 1) — Phone→Router→ISP→Internet→Servers → **flow** (5 steps)
- [x] `§ip-addresses` (block 6) — type domain→DNS resolves→connect → **flow** (3 steps)
- [x] `§packets` (block 1) — 1 request splits into 3 packets → **architecture** (1 node fans out to 3 packet nodes)
- [x] `§full-picture` (block 0) — 9-step "open Instagram" journey → **flow** (9 steps)

### 6.3 Foundations L3 — browser-request-lifecycle

- [x] `§bird-eye-view` (block 0) — 9-stage lifecycle overview → **flow**
- [x] `§step-3-dns` (block 2) — DNS resolution, 7 sub-steps → **flow**
- [x] `§step-4-tcp` (block 2) — 3-way handshake → **sequence** (2 actors: Browser, Server; messages: SYN, SYN-ACK, ACK)
- [x] `§step-5-tls` (block 1) — TLS handshake → **sequence** (2 actors; 4 messages, last dashed/return-style where the server replies)
- [x] `§step-7-server` (block 2) — Request→LB→AppServer→Cache→DB→Response → **flow** (7 steps)
- [x] `§step-9-rendering` (block 1) — HTML→DOM→CSS→JS→Images→Paint → **flow** (6 steps)

### 6.4 Foundations L4 — client-server-architecture

- [x] `§basic-model` (block 0) — Client/Server example pairs → **table** (headers: Client, Server)
- [x] `§tiers` (block 2) — 1-tier: one box → **architecture** (1 node) — group with the next 3 as one visual progression if convenient
- [x] `§tiers` (block 5) — 2-tier: Client↔DB → **architecture** (2 nodes, 1 edge)
- [x] `§tiers` (block 8) — 3-tier: Client↔App↔DB w/ tier labels → **architecture** (3 nodes, sublabels "Tier 1/Presentation" etc.)
- [x] `§tiers` (block 14) — N-tier/microservices: Client→Gateway→4 services→4 DBs → **architecture** (2-row fan-out)
- [x] `§request-response-cycle` (block 1) — 7-step Swiggy order trace → **flow** (keep the inline code snippets as `detail` text)
- [x] `§stateless-vs-stateful` (block 2) — 2 stateless example requests → **reformat to list**
- [x] `§stateless-vs-stateful` (block 8) — 2 stateful example requests → **reformat to list**
- [x] `§stateless-vs-stateful` (block 12) — ServerA→Redis←ServerB → **architecture** (fan-in, 2 nodes → Redis)
- [x] `§peer-to-peer` (block 1) — Client-Server vs P2P mesh → **compare** (panel 1: 1 edge; panel 2: 3-node triangle mesh A↔B↔C↔A)

### 6.5 Foundations L6 — http-and-https

- [x] `§what-is-http` (block 4) — Client⇄Server generic exchange → **sequence** (2 actors, 2 messages: Request →, ← Response)
- [x] `§http-versions` (block 2) — HTTP/1.1 head-of-line blocking + (block 5) HTTP/2 multiplexing → **merge into one `compare`** (panel 1: 3 sequential/blocked requests, escalating tone; panel 2: 3 parallel streams, all healthy)
- [x] `§how-tls-works` (block 2) — Browser↔Flipkart TLS handshake → **sequence** (2 actors, 4 messages)

### 6.6 Foundations L7 — rest-apis

- [x] `§what-is-rest` (block 4) — 4 client types fan into REST API → Server+DB → **architecture** (4→1→1 fan-in)
- [x] `§what-is-rest` (block 7) — stateful(bad) vs stateless(good) request pairs → **table** (2 columns: ❌ Stateful, ✅ Stateless)
- [x] `§what-is-rest` (block 11) — action-based vs resource-based URLs → **table**
- [x] `§what-is-rest` (block 17) — Client→CDN→LB→Cache→App→DB → **architecture** (linear 6-node chain)
- [x] `§common-mistakes` (blocks 1, 2, 3, 4) — 4 separate ❌/✅ ascii pairs → **merge into ONE table**, headers `["Mistake", "❌ Wrong", "✅ Correct"]`, one row per pair (verbs-in-URLs, wrong HTTP methods, inconsistent naming, 200-for-errors)

### 6.7 Foundations L8 — databases-the-big-picture

- [x] `§sql-vs-nosql` (block 1) — Databases splits into SQL/NoSQL w/ traits + example DBs → **tree** (root "Databases", 2 children, sublabels listing traits/examples)
- [x] `§nosql-new-wave` (block 10) — column-family row-key→columns example → **reformat to table**
- [x] `§nosql-new-wave` (block 13) — graph triples (Priya-FRIENDS_WITH-Rahul, ...) → **reformat to list**
- [x] `§cap-theorem` (block 2) — CAP triangle → **keep as ascii** — one-off triangle shape, not worth a bespoke component for a single instance (see §7)
- [x] `§when-to-use-which` (block 8) — Flipkart polyglot persistence (data layer → 6 DB choices) → **tree** (root + 6 children, sublabel = reason)

### 6.8 Foundations L9 — sql-deep-dive

- [x] `§joins` (block 11) — JOIN set notation (INNER/LEFT/RIGHT/FULL) → **reformat to table** (Join type, Notation, Result)
- [x] `§indexes` (block 5) — index user_id→row locations → **reformat to table**
- [x] `§transactions` (block 2) — without-transactions failure trace → **flow** (3-4 steps, last `critical`)

### 6.9 Foundations L10 — nosql-deep-dive

- [x] `§key-value-stores` (block 1) — Redis key→value examples → **reformat to table**
- [x] `§key-value-stores` (block 15) — disk vs memory access latency → **reformat to table**
- [x] `§column-family` (block 4) — SQL row-oriented layout → **reformat to table**
- [x] `§column-family` (block 6) — Cassandra partition-oriented layout → **reformat to list**
- [x] `§column-family` (block 13) — 3 datacenters × 3 nodes → **architecture** (3 rows of 3 nodes, grouped by DC)
- [x] `§graph-databases` (block 8) — graph triples → **reformat to list**
- [x] `§choosing-nosql` (block 1) — YES/NO decision framework → **tree** (binary decision tree, `edgeLabel`s "YES"/"NO", 5 levels)
- [x] `§consistency-models` (block 2) — strong consistency, 2 lines → **reformat to paragraph/insight**, not a diagram
- [x] `§consistency-models` (block 4) — eventual consistency, 2 lines → **reformat to paragraph/insight**
- [x] `§consistency-models` (block 6) — Cassandra write/replicate timeline → **flow** (3-4 steps w/ timing in `detail`)

### 6.10 Foundations L11 — database-indexing-deep-dive

- [x] `§without-an-index` (block 3) — full table scan trace → **flow**
- [x] `§without-an-index` (block 6) — indexed lookup trace → **flow**
- [x] `§b-tree` (block 1) — B-tree structure, 3 levels → **tree** (this is a literal tree — straightforward)
- [x] `§b-tree` (block 5) — B-tree lookup trace (root→node→leaf) → **flow** (3-4 steps)
- [x] `§types-of-indexes` (block 2) — clustered index physical layout → **architecture** (3 nodes in a row)
- [x] `§types-of-indexes` (block 7) — secondary index → PK → row → **architecture** (3-node chain)
- [x] `§selectivity` (block 1) — column selectivity comparison → **reformat to table** (Column, Unique values, Selectivity)
- [x] `§explain` (block 5) — access types ranked → **reformat to table** (Access type, Description)

### 6.11 Foundations L12 — vertical-vs-horizontal-scaling

- [x] `§vertical-scaling` (block 1) — before/after single-server specs → **compare** (2 panels)
- [x] `§vertical-scaling` (block 5) — EC2 instance upgrade path → **flow**
- [x] `§horizontal-scaling` (block 1) — before/after: 1 server vs 3 + LB → **compare** (2 panels)
- [x] `§stateless-requirement` (block 2) — broken stateful scaling scenario → **flow** (4 steps; drop the redundant tiny box diagram at the end, the flow's last step already says it)
- [x] `§stateless-requirement` (block 4) — fixed: 2 servers → Redis → **architecture** (fan-in, 2→1)
- [x] `§scaling-databases` (block 5) — Primary DB → 3 read replicas → **architecture** (fan-out, 1→3)
- [x] `§scaling-databases` (block 9) — shard ranges → **reformat to table** (Shard, user_id range)
- [x] `§scaling-databases` (block 12) — cache-in-front-of-DB w/ hit/miss branch → **architecture** (3 nodes, edges labeled "hit"/"miss")
- [x] `§realistic-journey` (blocks 2, 5, 7) — Stage 1 (1 box) / Stage 3 (2 nodes) / Stage 4 (5-6 nodes) → **merge into one `compare`**, 3 panels titled "Stage 1", "Stage 3", "Stage 4"
- [x] `§auto-scaling` (block 1) — normal→spike→settle server counts → **flow** (3 steps)
- [x] `§industry-examples` (block 1) — Instagram's 2010-2016 scaling timeline → **flow** (6 steps, chronological)
- [x] `§industry-examples` (block 3) — normal day vs Big Billion Day order count → **reformat to table**

### 6.12 Foundations L13 — load-balancers

- [x] `§what-it-does` (blocks 1, 3) — no-LB (overwhelmed) vs with-LB (even) → **merge into one `compare`**
- [x] `§algorithms` (block 2) — round robin sequence → **reformat to table** (Request #, Server)
- [x] `§algorithms` (block 6) — weighted round robin → **reformat to table** (Server, Weight, or distribution sequence)
- [x] `§algorithms` (block 9) — least connections → **reformat to table** (Server, Active connections)
- [x] `§algorithms` (block 12) — IP hash → **reformat to table** (Client IP, Hash % N, Server)
- [x] `§algorithms` (block 16) — least response time → **reformat to table** (Server, Connections, Avg response, Score)
- [x] `§health-checks` (block 2) — passive health check trace → **flow** (4 steps)
- [x] `§health-checks` (block 4) — active health check ping cycle → **architecture** (LB → 3 servers, edges labeled "200 OK"/"timeout", tones healthy/healthy/critical)
- [x] `§layer4-vs-layer7` (block 7) — L7 routing capability categories → **reformat to table** (Category, Example rule)
- [x] `§ssl-termination` (blocks 2, 5) — without vs with SSL termination at LB → **merge into one `compare`**
- [x] `§redundancy` (block 2) — DNS → 2 LBs (active/standby) → shared server pool → **architecture** (converging edges — not a tree, both LBs feed the same pool)
- [x] `§global-load-balancing` (block 1) — region → datacenter mapping → **reformat to table**
- [x] `§service-mesh` (block 1) — Edge LB → Order(x3) → Payment(x5) → Notification(x2) → **architecture** (linear chain, instance-count sublabels)
- [x] `§service-mesh` (block 4) — Order Service → Envoy Sidecar → Payment instances → **architecture** (3-node chain)

### 6.13 Foundations L14 — caching

- [x] `§why-caching-works` (block 1) — CPU/RAM/SSD/DB/Network latency ladder → **reformat to table** (Layer, Latency)
- [x] `§hit-and-miss` (block 1) — hit path vs miss path → **compare** (2 panels, each a small chain)
- [x] `§hit-and-miss` (block 3) — hit-rate impact numbers → **reformat to table**
- [x] `§strategies` (block 1) — Cache-Aside read+write steps → **flow**
- [x] `§strategies` (block 7) — Write-Through steps → **flow**
- [x] `§strategies` (block 11) — Write-Behind steps → **flow**
- [x] `§strategies` (block 15) — Read-Through steps → **flow**
- [x] `§invalidation` (block 8) — event-based invalidation trace → **flow** (4 steps)
- [x] `§invalidation` (block 11) — cascading invalidation "maybe" list → **reformat to list**
- [x] `§eviction-policies` (block 2) — LRU ordered item row, evict rightmost → **architecture** (5 nodes in a row, last one `critical`)
- [x] `§eviction-policies` (block 5) — LFU access counts → **reformat to table** (Item, Access count, Decision)
- [x] `§cache-problems` (block 1) — Cache Stampede trace → **flow** (escalating to `critical`)
- [x] `§cache-problems` (block 5) — Cache Penetration trace → **flow**
- [x] `§cache-problems` (block 10) — Cache Avalanche trace → **flow**
- [x] `§cache-levels` (block 1) — Browser→CDN→LB→App→Distributed→DB, 6 levels → **flow**
- [x] `§cache-levels` (block 8) — L1/L2/L3 real-world example → **reformat to table** (Level, Store, TTL, Purpose)

### 6.14 Foundations L15 — redis-deep-dive

- [x] `§what-redis-is` (block 4) — Redis op latency + throughput → **reformat to table**
- [x] `§expiration` (block 2) — lazy expiration trace → **flow**
- [x] `§expiration` (block 4) — active expiration cycle → **flow**
- [x] `§clustering` (block 2) — master → 2 replicas → **architecture** (fan-out, 1→2)
- [x] `§clustering` (block 5) — 3 masters w/ hash slots + replicas, plus a routing trace → **split into two figures**: `architecture` (3 masters, each with 2 replica children, 2-level fan-out) + `flow` (3 steps: `SET user:123` → hash → routes to Node 2)
- [x] `§sentinel` (block 1) — 3 sentinels monitor Master+Replica → **architecture** (fan-in from sentinels, fan-out to Master/Replica)

### 6.15 Foundations L16 — message-queues

- [x] `§the-problem` (block 1) — Order Service fans directly to 5 services (tight coupling) + (block 8) same via a Queue → **merge into one `compare`** ("Direct calls" vs "Via queue")
- [x] `§the-problem` (block 4) — traffic spike crash narrative → **flow** (4 steps, escalating)
- [x] `§the-problem` (block 6) — 3 operation timings (order/email/analytics) → **reformat to table**
- [x] `§core-concepts` (block 1) — Producer→Queue→Consumer → **architecture** — full data given in §4's worked example, reuse it verbatim
- [x] `§core-concepts` (block 6) — ACK flow incl. crash-before-ACK branch → **flow** (crash branch steps toned `critical`)
- [x] `§queue-vs-topic` (blocks 1, 4, 8) — point-to-point vs pub-sub, plus the ascii's own "visual comparison" → **merge all three into one `compare`** ("Queue — point to point" vs "Topic — pub/sub"); drop block 6 (`§queue-vs-topic` fan-out example) as redundant with this
- [x] `§delivery-guarantees` (block 5) — at-least-once idempotency failure trace → **flow** (6 steps, last 2 `critical`)
- [x] `§dead-letter-queue` (block 1) — repeated-failure trace → **flow** (why DLQ exists)
- [x] `§dead-letter-queue` (blocks 3, 5) — normal queue → 3 fails → DLQ, with example message ids → **merge into one `architecture`** (Queue node w/ message-id sublabels → DLQ node, edge labeled "3 failures")
- [x] `§queue-patterns` (block 1) — Work Queue: 1 queue → 3 workers → **architecture** (fan-out)
- [x] `§queue-patterns` (block 4) — Fan-Out pattern: 1 event → 4 consumers → **architecture** (fan-out) — keep distinct from queue-vs-topic's pub-sub figure, this illustrates the *pattern* section
- [x] `§queue-patterns` (block 7) — rate limiting via queue (producer/queue/consumer w/ rate mismatch) → **architecture** (3-node chain, rate numbers as sublabels)
- [x] `§queue-patterns` (block 8) — restates block 7 as a comparison → **drop, redundant** (or keep ascii if you want the restatement — low priority either way)
- [x] `§queue-patterns` (block 10) — priority levels processed in order → **reformat to table** (Priority, Message type)
- [x] `§queue-patterns` (block 13) — Saga pattern, happy path + compensating actions on failure → **split into two `flow` blocks**: "Happy path" (4 steps) and "If Step 2 fails" (4 compensating-action steps, `critical` tone)
- [x] `§rabbitmq` (block 4) — 3 exchange types (Direct/Fanout/Topic), one mini example each → **3 separate small `architecture` figures**, one per exchange type

### 6.16 Foundations L17 — kafka-deep-dive

- [x] `§why-kafka-exists` (block 1) — driver-update scaling arithmetic → **reformat to code** (it's arithmetic, not a diagram)
- [x] `§core-architecture` (block 1) — Topic → 3 Partitions (each w/ a Broker) + Producer/Consumer → **architecture** — the flagship figure for this lesson, take care with it
- [x] `§topics-and-partitions` (block 1) — 4 example topic names → **reformat to list**
- [x] `§topics-and-partitions` (block 3) — topic → 3 partitions, each an ordered log → **reformat to table** (Partition, Messages in order)
- [x] `§topics-and-partitions` (block 7) — single partition, offsets 0-4 → **reformat to table** (Offset, Data)
- [x] `§producers` (block 4) — key-based partitioning keeps 4 events ordered → **flow** (4 steps)
- [x] `§consumers` (block 1) — 2 consumer groups reading 6 partitions differently → **reformat to table** (Group, Consumer, Partitions)
- [x] `§consumers` (block 6) — offset tracking per group/partition → **reformat to table**
- [x] `§brokers-and-replication` (block 1) — 3 brokers, partition leader/replica roles → **reformat to table** (Broker, Partition, Role)
- [x] `§brokers-and-replication` (block 3) — RF=3: 1 leader + 2 followers → **architecture** (fan-out replication)
- [x] `§brokers-and-replication` (block 5) — broker failure → new leader election → **flow** (4 steps)
- [x] `§brokers-and-replication` (block 7) — RF1-RF5 tradeoff → **reformat to table** (RF, Redundancy, Overhead)
- [x] `§retention` (block 1) — retention policy options → **reformat to list**
- [x] `§retention` (block 3) — traditional queue (data loss) vs Kafka (retains) during an outage → **compare** (2 panels)
- [x] `§retention` (block 5) — log compaction before/after → **reformat to table** (Before, After)
- [x] `§performance` (block 2) — random vs sequential disk write speed → **reformat to table**
- [x] `§performance` (block 4) — traditional 4-copy path vs Kafka zero-copy 2-copy path → **compare** (2 panels, each a short linear chain)
- [x] `§performance` (block 6) — batching without vs with → **reformat to table** (2 rows: Without/With, columns Behavior/Network calls)
- [x] `§kafka-vs-rabbitmq` (block 3) — 5-question YES/NO decision framework → **tree** (biggest decision tree in the corpus — good showcase for `edgeLabel`)
- [x] `§real-architectures` (block 1) — Uber: 1 topic → 4 consumer groups → **architecture** (fan-out)
- [x] `§real-architectures` (block 4) — Netflix: same shape → **architecture** (fan-out) — keep, distinct worked example
- [x] `§real-architectures` (block 6) — Flipkart: same shape again → converted too (kept all 3 real examples rather than trimming — each names different, real consumer services, so the repetition still teaches the pattern by example)

### 6.17 Foundations L18 — cdn

- [x] `§the-problem` (block 1) — Mumbai-Virginia distance/latency math → **reformat to code** (arithmetic)
- [x] `§the-problem` (block 3) — Hotstar bandwidth math → **reformat to code** (arithmetic)
- [x] `§the-problem` (block 5) — single-DC SPOF trace → **flow** (3 steps, `critical` at end)
- [x] `§how-it-works` (block 1) — without-CDN vs with-CDN latency (Chennai user) → **compare** (2 panels)
- [x] `§how-it-works` (block 3) — CDN request flow: first request (miss) vs subsequent (hit) → **compare** (2 panels)
- [x] `§caching-strategies` (block 1) — Pull CDN: miss→fetch→cache→serve, then hit→serve → **flow** (continuous story, differ from the compare above)
- [x] `§caching-strategies` (block 7) — Push CDN (Netflix pre-upload) → **flow** (4 steps)
- [x] `§cdn-and-dns` (blocks 2, 4) — geo-DNS routing + anycast routing → **merge into one table** (columns: Method, User location, Routed to)
- [x] `§cache-invalidation` (block 2) — stale price problem trace → **flow** (4 steps, `critical`)
- [x] `§cache-invalidation` (block 10) — invalidation vs versioning approach → **compare** (2 panels, each a short flow)
- [x] `§netflix-open-connect` (block 5) — predictive pre-positioning → **flow** (3-4 steps)
- [x] `§netflix-open-connect` (block 7) — adaptive bitrate quality tiers + switching logic → **reformat to table** for the quality tiers (Quality, Bitrate); fold the switching logic into surrounding paragraph text, don't diagram it separately
- [x] `§security` (block 2) — DDoS protection: attack→CDN absorbs→blocks→origin safe → **flow** (4 steps)
- [x] `§security` (block 7) — SSL/TLS termination at CDN edge → **architecture** (3 nodes — reuse the same visual language as L13's SSL-termination `compare`)
- [x] `§architecture-patterns` (block 1) — Multi-CDN: normal 70/30 split vs outage 100% failover → **compare** (2 panels)
- [x] `§architecture-patterns` (blocks 4, 5) — Origin Shield without/with, plus the fuller 4-edge-node topology → **merge into one `compare`** whose "with" panel is the fuller 4→1→1 topology

### 6.18 LLD L4 — uml-class-diagrams

This lesson teaches the notation `uml` needs to render — convert it
first, before any of the case-study lessons in §6.19, since those reuse
the same notation and you'll want the renderer already validated.

- [ ] `§class-box` (block 2) — BankAccount class box (name/attrs/methods) → **optional, low priority** — keep as ascii unless you want to extend `UmlDiagram` with a class-box variant; it's a one-off (see §7) — intentionally left ascii
- [x] `§association` (block 1) — Professor──teaches──Student → **uml** (1 relationship: `association`, multiplicities `1`/`*`)
- [x] `§aggregation` (block 1) — Department◇──has──Professor → **uml** (1 relationship: `aggregation`)
- [x] `§composition` (block 1) — ParkingLot◆──has──ParkingFloor → **uml** (1 relationship: `composition`)
- [x] `§inheritance` (block 1) — Car/Truck──▷──Vehicle → **uml** (2 relationships: `inheritance`, `inheritance`, shared `to`)
- [x] `§inheritance` (block 3) — Car- - ▷Drivable → **uml** (1 relationship: `realization`)
- [x] `§dependency` (block 1) — OrderService- ->EmailValidator → **uml** (1 relationship: `dependency`)
- [x] `§worked-example` (block 1) — combined 6-relationship diagram (composition×2, association, inheritance×2, realization) → **uml** — flagship demo, exercises every relationship kind at once

### 6.19 LLD case studies — one `uml` figure each

All under a `§classes-relationships` section, block 0 or 1. Straightforward
1:1 translation of each relationship line — no merging, no reformatting.

- [x] L9 parking-lot — `§classes-relationships` (block 1) — 6 relationships (ParkingLot◆Floor, Floor◆Spot, Spot──Vehicle, Car/Bike/Truck▷Vehicle) → **uml**
- [x] L10 elevator-system — `§classes-relationships` (block 0) — 4 relationships (Controller◆Elevator, Elevator──ElevatorState, HallCall──Direction, Elevator──Direction) → **uml**
- [x] L11 tic-tac-toe — `§classes-relationships` (block 0) — 4 relationships (Game◆Board, Board◆Cell, Game──Player, Game──WinningStrategy) → **uml**
- [x] L12 lru-cache — `§classes` (block 0) — 2 relationships (LRUCache◆Node, LRUCache──Map) → **uml**
- [x] L13 splitwise — `§classes-relationships` (block 0) — 4 relationships (Group◆Expense, Expense──Strategy, Expense◆Split, Group──User) → **uml**
- [x] L14 movie-ticket-booking — `§classes-relationships` (block 0) — 3 relationships (Show◆Seat, Seat──SeatState, Booking──Seat) → **uml**

---

## 7. Explicitly out of scope

- **CAP theorem triangle** (Foundations L8, `§cap-theorem`) — a genuine
  triangle shape, appears exactly once across both modules. Not worth a
  7th generic component for one instance. Leave as ascii, or hand-build
  a one-off `figure`-registry component later if it bothers you.
- **UML class box** (LLD L4, `§class-box`) — same reasoning, one
  instance. Low priority (§6.18).
- Anything marked "optional"/"drop"/"consider trimming" in §6 — these
  are calls to reduce redundant, visually-identical repeats (three
  near-identical Kafka fan-out examples, a restated rate-limiting
  diagram, ...). Converting them anyway isn't wrong, just lower value
  than everything else in the queue.

---

## 8. Definition of done for this whole effort

- Every non-optional row in §6 is checked off.
- `npx tsc --noEmit`, `npx vitest run`, `npm run lint` all clean.
- `docs/BROWSER-CHECKS.md` has (and then, after a verification pass,
  no longer has) an entry per converted lesson file.
- §0's ascii-block count, re-run via §5.1's extraction script, is 0
  (excluding the two §7 exceptions, which stay ascii on purpose).
