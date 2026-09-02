/**
 * One worked, checklist-passing class diagram per `challenges.ts` case
 * study — drawn from the exact class names, relationships, and method
 * signatures each `/lld/[slug]` lesson already sketches (its own `"uml"`
 * block and Java code snippets), not invented separately. Shown read-only
 * in `ReferenceSolutionModal.tsx` from `ChallengeBriefing` as "a valid
 * design", never loaded onto the student's own canvas — same "nothing
 * here can overwrite what you built" caution `CompareModal.tsx` uses for
 * the Workshop's own remedy comparisons.
 *
 * Deliberately trimmed versus each lesson's full worked example — a
 * pattern only earns a node here if a `challenges.ts` requirement (or the
 * lesson's own "step 6" pattern discussion) actually depends on it. E.g.
 * Parking Lot's Singleton and fee-Strategy are real, lesson-taught ideas
 * that don't change what this diagram needs to show, so they're named in
 * `note` instead of modeled — same discipline `challenges.ts`'s own
 * `realClasses` filter applies to "don't reward padding the canvas".
 *
 * Content here is authored by class *name*, not id — ids, positions, and
 * the XY Flow-specific `Node`/`Edge` wrapping are all derived in
 * `buildLayoutedDiagram`/consumed by `ReferenceSolutionModal.tsx`, which
 * keeps this module at the same "zero React" layer `challenges.ts` and
 * `linter.ts` already sit at.
 */

import {
  createField,
  createMethod,
  createRelationshipEdgeData,
} from "./types";
import type {
  ClassField,
  ClassMethod,
  ClassNodeData,
  ClassStereotype,
  DiagramRelationshipRef,
  UmlRelationshipKind,
  Visibility,
} from "./types";

export interface ReferenceFieldSpec {
  name: string;
  type: string;
  visibility?: Visibility;
  isStatic?: boolean;
}

export interface ReferenceMethodSpec {
  name: string;
  params?: string;
  returnType?: string;
  visibility?: Visibility;
  isAbstract?: boolean;
  isStatic?: boolean;
}

export interface ReferenceClassSpec {
  name: string;
  stereotype?: ClassStereotype;
  fields?: ReferenceFieldSpec[];
  methods?: ReferenceMethodSpec[];
}

export interface ReferenceRelationshipSpec {
  /** `ReferenceClassSpec.name` this relationship starts from. */
  from: string;
  to: string;
  kind: UmlRelationshipKind;
  label?: string;
  fromMultiplicity?: string;
  toMultiplicity?: string;
}

export interface ReferenceSolution {
  /** Matches `ClassDiagramChallenge.slug` in `challenges.ts`. */
  slug: string;
  /** The one design callout worth reading before the diagram — the "why" behind a specific choice, not a restatement of the prompt. */
  note: string;
  classes: ReferenceClassSpec[];
  relationships: ReferenceRelationshipSpec[];
}

// ---- the 7 reference solutions, one per `challenges.ts` entry ----

export const REFERENCE_SOLUTIONS: ReferenceSolution[] = [
  {
    slug: "parking-lot",
    note: "Composition all the way down (lot → floor → spot) — none of those exist independent of the lot they belong to. Singleton (exactly one lot) and a spot-assignment Strategy are both justified too (see the lesson), just left out here to keep the picture focused on what the checklist above asks for.",
    classes: [
      {
        name: "Vehicle",
        stereotype: "abstract",
        fields: [
          { name: "licensePlate", type: "String" },
          { name: "size", type: "VehicleSize" },
        ],
        methods: [{ name: "size", returnType: "VehicleSize" }],
      },
      { name: "Car", methods: [] },
      { name: "Bike", methods: [] },
      { name: "Truck", methods: [] },
      {
        name: "ParkingSpot",
        fields: [
          { name: "id", type: "String" },
          { name: "size", type: "SpotSize" },
          { name: "parkedVehicle", type: "Vehicle" },
        ],
        methods: [
          { name: "canFit", params: "vehicle: Vehicle", returnType: "boolean" },
          { name: "park", params: "vehicle: Vehicle" },
          { name: "vacate" },
        ],
      },
      {
        name: "ParkingFloor",
        fields: [
          { name: "floorNumber", type: "int" },
          { name: "spots", type: "List<ParkingSpot>" },
        ],
        methods: [{ name: "findAvailableSpot", params: "vehicle: Vehicle", returnType: "ParkingSpot" }],
      },
      {
        name: "ParkingLot",
        fields: [{ name: "floors", type: "List<ParkingFloor>" }],
        methods: [
          { name: "parkVehicle", params: "vehicle: Vehicle", returnType: "Ticket" },
          { name: "unparkVehicle", params: "ticket: Ticket", returnType: "double" },
        ],
      },
    ],
    relationships: [
      { from: "ParkingLot", to: "ParkingFloor", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" },
      { from: "ParkingFloor", to: "ParkingSpot", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" },
      { from: "ParkingSpot", to: "Vehicle", kind: "association", fromMultiplicity: "1", toMultiplicity: "0..1", label: "parks" },
      { from: "Car", to: "Vehicle", kind: "inheritance" },
      { from: "Bike", to: "Vehicle", kind: "inheritance" },
      { from: "Truck", to: "Vehicle", kind: "inheritance" },
    ],
  },
  {
    slug: "elevator-system",
    note: "State (Idle/Moving/DoorsOpen) owns the elevator's own transition rules instead of one growing if/else in Elevator; Strategy (DispatchStrategy) keeps 'which elevator answers this call' swappable from 'nearest' to something smarter later without touching ElevatorController.",
    classes: [
      {
        name: "ElevatorState",
        stereotype: "interface",
        methods: [
          { name: "requestFloor", params: "elevator: Elevator, floor: int", isAbstract: true },
          { name: "arrive", params: "elevator: Elevator", isAbstract: true },
        ],
      },
      { name: "IdleState", methods: [{ name: "requestFloor", params: "elevator: Elevator, floor: int" }, { name: "arrive", params: "elevator: Elevator" }] },
      { name: "MovingState", methods: [{ name: "requestFloor", params: "elevator: Elevator, floor: int" }, { name: "arrive", params: "elevator: Elevator" }] },
      {
        name: "DoorsOpenState",
        methods: [
          { name: "requestFloor", params: "elevator: Elevator, floor: int" },
          { name: "arrive", params: "elevator: Elevator" },
          { name: "closeDoors", params: "elevator: Elevator" },
        ],
      },
      {
        name: "Elevator",
        fields: [
          { name: "id", type: "int" },
          { name: "currentFloor", type: "int" },
          { name: "state", type: "ElevatorState" },
          { name: "pendingStops", type: "TreeSet<Integer>" },
        ],
        methods: [
          { name: "setState", params: "state: ElevatorState" },
          { name: "requestFloor", params: "floor: int" },
          { name: "addStop", params: "floor: int" },
          { name: "hasMoreStops", returnType: "boolean" },
        ],
      },
      {
        name: "DispatchStrategy",
        stereotype: "interface",
        methods: [{ name: "selectElevator", params: "elevators: List<Elevator>, callFloor: int, direction: Direction", returnType: "Elevator", isAbstract: true }],
      },
      {
        name: "NearestElevatorStrategy",
        methods: [{ name: "selectElevator", params: "elevators: List<Elevator>, callFloor: int, direction: Direction", returnType: "Elevator" }],
      },
      {
        name: "ElevatorController",
        fields: [
          { name: "elevators", type: "List<Elevator>" },
          { name: "dispatchStrategy", type: "DispatchStrategy" },
        ],
        methods: [{ name: "handleHallCall", params: "floor: int, direction: Direction" }],
      },
    ],
    relationships: [
      { from: "ElevatorController", to: "Elevator", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" },
      { from: "Elevator", to: "ElevatorState", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "delegates to" },
      { from: "IdleState", to: "ElevatorState", kind: "realization" },
      { from: "MovingState", to: "ElevatorState", kind: "realization" },
      { from: "DoorsOpenState", to: "ElevatorState", kind: "realization" },
      { from: "ElevatorController", to: "DispatchStrategy", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "uses" },
      { from: "NearestElevatorStrategy", to: "DispatchStrategy", kind: "realization" },
    ],
  },
  {
    slug: "tic-tac-toe",
    note: "Board takes a size in its constructor and WinningStrategy checks k-in-a-row generically — nothing here assumes 3×3 or exactly 3-in-a-row, which is the actual ask (generalizes to N×N), not just a side effect of using a 2D array.",
    classes: [
      { name: "Cell", fields: [{ name: "symbol", type: "Symbol" }], methods: [{ name: "symbol", returnType: "Symbol" }, { name: "set", params: "symbol: Symbol" }] },
      {
        name: "Board",
        fields: [
          { name: "size", type: "int" },
          { name: "cells", type: "Cell[][]" },
        ],
        methods: [
          { name: "cellAt", params: "row: int, col: int", returnType: "Cell" },
          { name: "isFull", returnType: "boolean" },
        ],
      },
      { name: "Player", fields: [{ name: "name", type: "String" }, { name: "symbol", type: "Symbol" }] },
      {
        name: "WinningStrategy",
        stereotype: "interface",
        methods: [{ name: "checkWin", params: "board: Board, row: int, col: int, symbol: Symbol, k: int", returnType: "boolean", isAbstract: true }],
      },
      {
        name: "LineCheckStrategy",
        methods: [{ name: "checkWin", params: "board: Board, row: int, col: int, symbol: Symbol, k: int", returnType: "boolean" }],
      },
      {
        name: "Game",
        fields: [
          { name: "board", type: "Board" },
          { name: "players", type: "Player[]" },
          { name: "winningStrategy", type: "WinningStrategy" },
          { name: "currentPlayerIndex", type: "int" },
        ],
        methods: [{ name: "makeMove", params: "row: int, col: int", returnType: "GameResult" }],
      },
    ],
    relationships: [
      { from: "Game", to: "Board", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1", label: "has" },
      { from: "Board", to: "Cell", kind: "composition", fromMultiplicity: "1", toMultiplicity: "N×N", label: "has" },
      { from: "Game", to: "Player", kind: "association", fromMultiplicity: "1", toMultiplicity: "2", label: "turn order" },
      { from: "Game", to: "WinningStrategy", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "uses" },
      { from: "LineCheckStrategy", to: "WinningStrategy", kind: "realization" },
    ],
  },
  {
    slug: "lru-cache",
    note: "The eviction policy is the one part of an 'LRU cache' that's actually likely to change (LRU today, LFU tomorrow) — pulling it behind EvictionPolicy means Cache's get/put never change when the policy does, the same shape this project's own multi-algorithm entities use.",
    classes: [
      {
        name: "EvictionPolicy",
        stereotype: "interface",
        methods: [
          { name: "onAccess", params: "key: K", isAbstract: true },
          { name: "onInsert", params: "key: K", isAbstract: true },
          { name: "evictionCandidate", returnType: "K", isAbstract: true },
        ],
      },
      { name: "LruEvictionPolicy", methods: [{ name: "onAccess", params: "key: K" }, { name: "onInsert", params: "key: K" }, { name: "evictionCandidate", returnType: "K" }] },
      { name: "LfuEvictionPolicy", methods: [{ name: "onAccess", params: "key: K" }, { name: "onInsert", params: "key: K" }, { name: "evictionCandidate", returnType: "K" }] },
      {
        name: "Cache",
        fields: [
          { name: "capacity", type: "int" },
          { name: "store", type: "Map<K, V>" },
          { name: "evictionPolicy", type: "EvictionPolicy" },
        ],
        methods: [
          { name: "get", params: "key: K", returnType: "V" },
          { name: "put", params: "key: K, value: V" },
        ],
      },
    ],
    relationships: [
      { from: "Cache", to: "EvictionPolicy", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "uses" },
      { from: "LruEvictionPolicy", to: "EvictionPolicy", kind: "realization" },
      { from: "LfuEvictionPolicy", to: "EvictionPolicy", kind: "realization" },
    ],
  },
  {
    slug: "splitwise",
    note: "Three interchangeable ExpenseSplitStrategy implementations (equal/exact/percentage) behind one interface — Expense doesn't know or care which one computed its Splits. BalanceSheet is its own class so 'who owes whom' stays one source of truth Group delegates to, not state duplicated per Expense.",
    classes: [
      { name: "User", fields: [{ name: "id", type: "String" }, { name: "name", type: "String" }] },
      { name: "Split", fields: [{ name: "user", type: "User" }, { name: "amountOwed", type: "double" }] },
      {
        name: "Expense",
        fields: [
          { name: "amount", type: "double" },
          { name: "paidBy", type: "User" },
          { name: "participants", type: "List<User>" },
        ],
      },
      {
        name: "ExpenseSplitStrategy",
        stereotype: "interface",
        methods: [{ name: "computeSplits", params: "totalAmount: double, participants: List<User>, input: Map<User, Double>", returnType: "List<Split>", isAbstract: true }],
      },
      { name: "EqualSplitStrategy", methods: [{ name: "computeSplits", params: "totalAmount: double, participants: List<User>, input: Map<User, Double>", returnType: "List<Split>" }] },
      { name: "ExactSplitStrategy", methods: [{ name: "computeSplits", params: "totalAmount: double, participants: List<User>, input: Map<User, Double>", returnType: "List<Split>" }] },
      { name: "PercentageSplitStrategy", methods: [{ name: "computeSplits", params: "totalAmount: double, participants: List<User>, input: Map<User, Double>", returnType: "List<Split>" }] },
      {
        name: "BalanceSheet",
        fields: [{ name: "balances", type: "Map<User, Map<User, Double>>" }],
        methods: [
          { name: "recordExpense", params: "paidBy: User, splits: List<Split>" },
          { name: "netBalance", params: "a: User, b: User", returnType: "double" },
        ],
      },
      {
        name: "Group",
        fields: [
          { name: "members", type: "List<User>" },
          { name: "balanceSheet", type: "BalanceSheet" },
        ],
        methods: [{ name: "addExpense", params: "amount: double, paidBy: User, participants: List<User>, strategy: ExpenseSplitStrategy" }],
      },
    ],
    relationships: [
      { from: "Group", to: "Expense", kind: "composition", fromMultiplicity: "1", toMultiplicity: "0..*", label: "has" },
      { from: "Expense", to: "ExpenseSplitStrategy", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "uses" },
      { from: "Expense", to: "Split", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "one per participant" },
      { from: "Split", to: "User", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "owed by" },
      { from: "Group", to: "User", kind: "association", fromMultiplicity: "1", toMultiplicity: "1..*", label: "members" },
      { from: "Group", to: "BalanceSheet", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1", label: "has" },
      { from: "EqualSplitStrategy", to: "ExpenseSplitStrategy", kind: "realization" },
      { from: "ExactSplitStrategy", to: "ExpenseSplitStrategy", kind: "realization" },
      { from: "PercentageSplitStrategy", to: "ExpenseSplitStrategy", kind: "realization" },
    ],
  },
  {
    slug: "movie-ticket-booking",
    note: "The lock/expiry fields live on Seat, not on Booking — that's what actually prevents two users double-booking the same seat under concurrent requests. tryLock only succeeds if the seat is free or its previous hold expired, and confirmBooking checks the caller still owns that hold before finalizing it.",
    classes: [
      {
        name: "Seat",
        fields: [
          { name: "id", type: "String" },
          { name: "status", type: "SeatStatus" },
          { name: "lockedByUserId", type: "String" },
          { name: "lockExpiryMillis", type: "long" },
        ],
        methods: [
          { name: "tryLock", params: "userId: String, holdDurationMillis: long", returnType: "boolean" },
          { name: "confirmBooking", params: "userId: String", returnType: "boolean" },
          { name: "releaseLock", params: "userId: String" },
        ],
      },
      { name: "Show", fields: [{ name: "seats", type: "List<Seat>" }, { name: "startTime", type: "long" }] },
      { name: "Booking", fields: [{ name: "userId", type: "String" }, { name: "seats", type: "List<Seat>" }] },
    ],
    relationships: [
      { from: "Show", to: "Seat", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" },
      { from: "Booking", to: "Show", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "for" },
      { from: "Booking", to: "Seat", kind: "association", fromMultiplicity: "1", toMultiplicity: "1..*", label: "books" },
    ],
  },
  {
    slug: "rate-limiter",
    note: "Four interchangeable algorithms behind one RateLimiter interface — the same 'pick one, compare it against the others' shape this project's own Load Balancer entity uses. windowSizeMillis (three of the four) is the time-window field the checklist asks for; TokenBucket tracks the equivalent idea as a refill rate instead.",
    classes: [
      {
        name: "RateLimiter",
        stereotype: "interface",
        methods: [{ name: "allowRequest", params: "clientId: String", returnType: "boolean", isAbstract: true }],
      },
      {
        name: "FixedWindowRateLimiter",
        fields: [{ name: "limit", type: "int" }, { name: "windowSizeMillis", type: "long" }],
        methods: [{ name: "allowRequest", params: "clientId: String", returnType: "boolean" }],
      },
      {
        name: "SlidingWindowLogRateLimiter",
        fields: [{ name: "limit", type: "int" }, { name: "windowSizeMillis", type: "long" }],
        methods: [{ name: "allowRequest", params: "clientId: String", returnType: "boolean" }],
      },
      {
        name: "SlidingWindowCounterRateLimiter",
        fields: [{ name: "limit", type: "int" }, { name: "windowSizeMillis", type: "long" }],
        methods: [{ name: "allowRequest", params: "clientId: String", returnType: "boolean" }],
      },
      {
        name: "TokenBucketRateLimiter",
        fields: [{ name: "capacity", type: "int" }, { name: "refillRatePerMillis", type: "double" }],
        methods: [{ name: "allowRequest", params: "clientId: String", returnType: "boolean" }],
      },
    ],
    relationships: [
      { from: "FixedWindowRateLimiter", to: "RateLimiter", kind: "realization" },
      { from: "SlidingWindowLogRateLimiter", to: "RateLimiter", kind: "realization" },
      { from: "SlidingWindowCounterRateLimiter", to: "RateLimiter", kind: "realization" },
      { from: "TokenBucketRateLimiter", to: "RateLimiter", kind: "realization" },
    ],
  },
];

export function getReferenceSolution(slug: string): ReferenceSolution | undefined {
  return REFERENCE_SOLUTIONS.find((s) => s.slug === slug);
}

// ---- name-keyed spec -> id-keyed, positioned diagram ----

export interface LayoutedClassRef {
  id: string;
  data: ClassNodeData;
  position: { x: number; y: number };
}

export interface LayoutedClassDiagram {
  classes: LayoutedClassRef[];
  relationships: DiagramRelationshipRef[];
}

function buildFieldData(spec: ReferenceFieldSpec): ClassField {
  return createField({
    name: spec.name,
    type: spec.type,
    visibility: spec.visibility ?? "private",
    isStatic: spec.isStatic,
  });
}

function buildMethodData(spec: ReferenceMethodSpec): ClassMethod {
  return createMethod({
    name: spec.name,
    params: spec.params ?? "",
    returnType: spec.returnType ?? "void",
    visibility: spec.visibility ?? "public",
    isAbstract: spec.isAbstract,
    isStatic: spec.isStatic,
  });
}

function buildClassData(spec: ReferenceClassSpec): ClassNodeData {
  return {
    name: spec.name,
    stereotype: spec.stereotype ?? "class",
    fields: (spec.fields ?? []).map(buildFieldData),
    methods: (spec.methods ?? []).map(buildMethodData),
  };
}

/**
 * Rough box height from content alone (name + fields + methods
 * compartments) — mirrors `ClassNode.tsx`'s own compartment padding
 * closely enough to keep a layer's stacked boxes from overlapping. Doesn't
 * need to be pixel-exact: this only feeds a read-only, `fitView`d preview,
 * never the live editor's real layout.
 */
function estimateNodeHeight(data: ClassNodeData): number {
  let height = 46; // name compartment
  if (data.stereotype === "interface") height += 14; // «interface» tag line
  height += Math.max(40, 16 + data.fields.length * 15);
  height += Math.max(40, 16 + data.methods.length * 15);
  return height;
}

const COLUMN_WIDTH = 376;
const ROW_GAP = 48;

/**
 * Longest-path (ASAP) layering over the relationship graph
 * (`layer[to] = max(layer[to], layer[from] + 1)`), an ALAP backward pass
 * that pulls pure-root nodes as close as possible to their own targets
 * (see below), then stacks each layer's boxes top-to-bottom by estimated
 * height — a small, deterministic Sugiyama-style layout, not a generic
 * force simulation, since every one of these graphs is a hand-authored
 * DAG with well under a dozen nodes. `|V|` relaxation passes always
 * converges for a graph this size and shape (same "small, fixed
 * iteration count is provably enough" reasoning `linter.ts`'s own checks
 * lean on).
 */
function computeLayeredPositions(
  names: string[],
  relationships: ReferenceRelationshipSpec[],
  heights: Record<string, number>
): Record<string, { x: number; y: number }> {
  const layer: Record<string, number> = {};
  for (const name of names) layer[name] = 0;

  for (let pass = 0; pass < names.length; pass++) {
    for (const rel of relationships) {
      if (!(rel.from in layer) || !(rel.to in layer)) continue;
      const candidate = layer[rel.from] + 1;
      if (candidate > layer[rel.to]) layer[rel.to] = candidate;
    }
  }

  // Backward (ALAP) compaction — a node nothing points *at* (a pure
  // root: an interface's implementer, a subclass) has no forward
  // constraint pinning it at column 0, so the pass above leaves it
  // there even when everything it points to got pushed several columns
  // right by some other edge (e.g. three `implements` edges into an
  // interface that a fourth, unrelated association also targets).
  // Left uncorrected, that root's one edge has to stretch across every
  // column in between, grazing past unrelated boxes on the way — e.g.
  // Car (parking-lot's Vehicle hierarchy) sharing column 0 with
  // ParkingLot while Vehicle itself sits 3 columns right, association-
  // pulled there by ParkingSpot. Pulling a childless-inbound node up to
  // just before the *nearest* of its own targets keeps every edge it's
  // actually part of short, without moving anything it doesn't own.
  for (const name of names) {
    const hasIncoming = relationships.some((r) => r.to === name);
    if (hasIncoming) continue;
    const outgoing = relationships.filter((r) => r.from === name);
    if (outgoing.length === 0) continue;
    layer[name] = Math.min(...outgoing.map((r) => layer[r.to] - 1));
  }

  const columns = new Map<number, string[]>();
  for (const name of names) {
    const col = layer[name];
    const list = columns.get(col) ?? [];
    list.push(name);
    columns.set(col, list);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  for (const [col, colNames] of columns) {
    let y = 0;
    for (const name of colNames) {
      positions[name] = { x: col * COLUMN_WIDTH, y };
      y += (heights[name] ?? 140) + ROW_GAP;
    }
  }
  return positions;
}

export function buildLayoutedDiagram(solution: ReferenceSolution): LayoutedClassDiagram {
  const idOf = (name: string) => `ref__${solution.slug}__${name}`;

  const classData = new Map<string, ClassNodeData>();
  for (const spec of solution.classes) classData.set(spec.name, buildClassData(spec));

  const names = solution.classes.map((c) => c.name);
  const heights: Record<string, number> = {};
  for (const name of names) heights[name] = estimateNodeHeight(classData.get(name)!);

  const positions = computeLayeredPositions(names, solution.relationships, heights);

  const classes: LayoutedClassRef[] = solution.classes.map((spec) => ({
    id: idOf(spec.name),
    data: classData.get(spec.name)!,
    position: positions[spec.name] ?? { x: 0, y: 0 },
  }));

  const relationships: DiagramRelationshipRef[] = solution.relationships.map((rel, index) => ({
    id: `${idOf(rel.from)}__${idOf(rel.to)}__${index}`,
    source: idOf(rel.from),
    target: idOf(rel.to),
    data: {
      ...createRelationshipEdgeData(rel.kind),
      label: rel.label,
      fromMultiplicity: rel.fromMultiplicity,
      toMultiplicity: rel.toMultiplicity,
    },
  }));

  return { classes, relationships };
}

const LAYOUTED_DIAGRAMS: Record<string, LayoutedClassDiagram> = Object.fromEntries(
  REFERENCE_SOLUTIONS.map((solution) => [solution.slug, buildLayoutedDiagram(solution)])
);

export function getReferenceDiagram(slug: string): LayoutedClassDiagram | undefined {
  return LAYOUTED_DIAGRAMS[slug];
}
