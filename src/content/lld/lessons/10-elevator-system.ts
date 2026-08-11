import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Second case study —
 * the canonical State pattern problem (an elevator's behavior genuinely
 * changes as it moves through Idle/Moving/DoorsOpen) paired with a
 * dispatch Strategy, so both halves of Lesson 8's Strategy-vs-State
 * distinction show up in one problem instead of two separate ones.
 */
export const ELEVATOR_SYSTEM: LLDLesson = {
  slug: "elevator-system",
  number: 10,
  category: "case-study",
  title: "Case Study: Elevator System",
  tagline:
    "An elevator's behavior genuinely depends on its own lifecycle stage — the textbook case for State — wired to a separately-swappable dispatch Strategy for deciding which elevator answers a call.",
  estimatedMinutes: 40,
  sections: [
    {
      id: "requirements",
      heading: "Step 1 — Requirements",
      blocks: [
        {
          kind: "paragraph",
          text: "In scope: a bank of N elevators serving M floors. A user presses a hall call button (up/down) on a floor; the system dispatches an elevator. Inside the elevator, a user presses a floor button. The elevator answers requests, opens/closes doors, and moves toward its next destination.",
        },
        {
          kind: "paragraph",
          text: "Out of scope for this pass: weight limits, emergency/fire-service mode, and express/zoned elevators (banks that only serve certain floor ranges) — named but not designed here.",
        },
      ],
    },
    {
      id: "actors-use-cases",
      heading: "Step 2 — Actors and use cases",
      blocks: [
        {
          kind: "list",
          items: [
            "Rider on a floor — presses a hall call button (UP or DOWN), waits, boards, presses a destination floor button inside the car.",
            "The dispatch system — decides which elevator answers a given hall call.",
          ],
        },
      ],
    },
    {
      id: "classes-relationships",
      heading: "Steps 3-4 — Classes and relationships",
      blocks: [
        {
          kind: "uml",
          relationships: [
            { from: "ElevatorController", to: "Elevator", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" },
            { from: "Elevator", to: "ElevatorState", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "delegates to" },
            { from: "HallCall", to: "Direction", kind: "association", label: "enum: UP, DOWN" },
            { from: "Elevator", to: "Direction", kind: "association", label: "enum: UP, DOWN, IDLE" },
          ],
        },
        {
          kind: "list",
          items: [
            "ElevatorController has Elevators — composition; a controller with no elevators to manage isn't meaningful, and elevators here are always part of exactly one bank.",
            "Elevator delegates its behavior to an ElevatorState object — this is the State pattern, not inheritance: the elevator's current state object decides what happens when a new floor request arrives.",
          ],
        },
      ],
    },
    {
      id: "state-pattern",
      heading: "Steps 5-6 — State: an elevator's behavior genuinely depends on its lifecycle",
      blocks: [
        {
          kind: "paragraph",
          text: "This is the case study Lesson 8's State section was written for. An idle elevator accepts any new request immediately. A moving elevator should generally keep moving toward its current destination and only reroute under specific conditions. A doors-open elevator shouldn't start moving at all until doors close. Modeling this as an if/else on a status field, repeated in every method, is exactly the anti-pattern Lesson 8 opened with — State replaces it with delegation.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface ElevatorState {\n    void requestFloor(Elevator elevator, int floor);\n    void arrive(Elevator elevator);\n}\n\nclass IdleState implements ElevatorState {\n    public void requestFloor(Elevator elevator, int floor) {\n        elevator.setDestination(floor);\n        elevator.setState(new MovingState());\n    }\n    public void arrive(Elevator elevator) {\n        // not moving — arrive() shouldn\'t be called in this state\n        throw new IllegalStateException("Idle elevator cannot arrive anywhere");\n    }\n}\n\nclass MovingState implements ElevatorState {\n    public void requestFloor(Elevator elevator, int floor) {\n        elevator.addStop(floor); // queue it; already committed to current direction\n    }\n    public void arrive(Elevator elevator) {\n        elevator.setState(new DoorsOpenState());\n    }\n}\n\nclass DoorsOpenState implements ElevatorState {\n    public void requestFloor(Elevator elevator, int floor) {\n        elevator.addStop(floor); // accepted, but elevator won\'t move until doors close\n    }\n    public void arrive(Elevator elevator) {\n        throw new IllegalStateException("Already arrived — doors are open");\n    }\n    void closeDoors(Elevator elevator) {\n        elevator.setState(elevator.hasMoreStops() ? new MovingState() : new IdleState());\n    }\n}',
        },
        {
          kind: "code",
          language: "java",
          code: 'class Elevator {\n    private final int id;\n    private int currentFloor;\n    private ElevatorState state = new IdleState();\n    private final TreeSet<Integer> pendingStops = new TreeSet<>();\n\n    void setState(ElevatorState state) { this.state = state; }\n    void requestFloor(int floor) { state.requestFloor(this, floor); }\n    void setDestination(int floor) { pendingStops.add(floor); }\n    void addStop(int floor) { pendingStops.add(floor); }\n    boolean hasMoreStops() { return !pendingStops.isEmpty(); }\n    int currentFloor() { return currentFloor; }\n}',
        },
        {
          kind: "insight",
          text: "Notice `Elevator` itself has no if/else on its own status anywhere — every method just delegates to `state`. Compare this directly against Lesson 8's naive Order example (`if (status.equals(\"PLACED\"))` repeated everywhere) to see the exact same fix applied to a different domain.",
        },
      ],
    },
    {
      id: "dispatch-strategy",
      heading: "Dispatch: a separate Strategy for a separate decision",
      blocks: [
        {
          kind: "paragraph",
          text: "Which elevator should answer a given hall call is a completely different decision from how one elevator behaves once it's committed to a request. Conflating the two into one class would violate Single Responsibility — this is a second, independent Strategy.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface DispatchStrategy {\n    Elevator selectElevator(List<Elevator> elevators, int callFloor, Direction direction);\n}\n\nclass NearestElevatorStrategy implements DispatchStrategy {\n    public Elevator selectElevator(List<Elevator> elevators, int callFloor, Direction direction) {\n        return elevators.stream()\n            .min(Comparator.comparingInt(e -> Math.abs(e.currentFloor() - callFloor)))\n            .orElseThrow();\n    }\n}\n\nclass ElevatorController {\n    private final List<Elevator> elevators;\n    private final DispatchStrategy dispatchStrategy;\n\n    void handleHallCall(int floor, Direction direction) {\n        Elevator chosen = dispatchStrategy.selectElevator(elevators, floor, direction);\n        chosen.requestFloor(floor);\n    }\n}',
        },
        {
          kind: "paragraph",
          text: "A more realistic strategy (closer to real elevator systems' SCAN/LOOK-style algorithms) would also weigh whether a candidate elevator is already moving in a compatible direction and could pick up the call along its existing path, not just raw distance — a genuine second `DispatchStrategy` implementation, swappable without touching `ElevatorController` at all.",
        },
      ],
    },
    {
      id: "extensibility",
      heading: "Extensibility — what if a new requirement arrived?",
      blocks: [
        {
          kind: "table",
          headers: ["New requirement", "What changes"],
          rows: [
            ["Express elevators that skip most floors", "A new `DispatchStrategy` that filters candidate elevators by floor-range eligibility before applying nearest-elevator logic — `Elevator` and its states don't change at all."],
            ["A maintenance/out-of-service mode", "A new `ElevatorState` (`OutOfServiceState`) whose `requestFloor` rejects every call — `ElevatorController`'s dispatch logic just needs to skip elevators in this state, one filter added to `selectElevator`'s candidate list."],
            ["Overload/weight-limit detection", "New state transition trigger (`arrive()` or a new `checkWeight()` hook) from `MovingState`/`DoorsOpenState` into a state that refuses new stops until weight drops — the state machine's shape already supports adding a new state, it doesn't need restructuring."],
          ],
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Why State for the elevator's behavior instead of Strategy?\"",
          answer:
            "\"Because the elevator itself transitions between states as a direct consequence of its own events — arriving at a floor, doors closing — not because external code decided to swap in a different behavior for its own reasons. That's exactly the distinction Lesson 8 draws: State when the object drives its own transitions, Strategy when an external caller chooses.\"",
        },
        {
          kind: "qa",
          question: "\"How would you test the dispatch strategy in isolation, without a real elevator bank running?\"",
          answer:
            "\"Because `DispatchStrategy` is an interface injected into `ElevatorController` rather than hardcoded logic inside it — Dependency Inversion from Lesson 3 — I can unit test `NearestElevatorStrategy.selectElevator()` directly with a hand-built list of `Elevator` objects at known floors, no `ElevatorController` or real dispatch loop involved at all.\"",
        },
      ],
    },
  ],
  summary:
    "Elevator System pairs State and Strategy in one problem, which is exactly why it's worth building after Lesson 8 rather than before. State governs one elevator's own behavior as it moves through Idle/Moving/DoorsOpen — the elevator itself drives these transitions, with zero if/else on status scattered through its methods. Strategy governs a completely separate decision, which elevator answers a given hall call, injected into the controller so a smarter dispatch algorithm swaps in without touching Elevator or its states at all. Keeping these as two separate patterns instead of one tangled class is Single Responsibility paying off in a genuinely stateful system.",
  keyTakeaways: [
    "An elevator's own behavior (accept a new request now vs. queue it vs. reject it) depends on its lifecycle stage — the textbook State pattern case, replacing a repeated status if/else with delegation to a state object.",
    "Which elevator answers a hall call is a separate decision from how one elevator behaves — modeled as an independently swappable Strategy, not folded into the state machine.",
    "The elevator itself drives its own state transitions (arriving triggers Moving→DoorsOpen) — that's what makes this State, not Strategy, per Lesson 8's distinction.",
    "A smarter dispatch algorithm (SCAN/LOOK-style, weighing in-progress direction) is a new DispatchStrategy implementation — zero changes to Elevator or ElevatorController.",
    "New elevator-level requirements (out-of-service, overload) add a new ElevatorState — the state machine's shape accommodates growth without restructuring.",
  ],
  exercise: {
    prompt:
      "A new requirement: when an elevator is in DoorsOpenState and a rider presses the 'door open' button again (holding the door), the doors should NOT auto-close on the usual timer. Sketch how you'd extend DoorsOpenState to support this without adding an if/else on a boolean flag checked in every other state's methods.",
    guidance: [
      {
        kind: "list",
        items: [
          "**Add `holdDoor()` to `ElevatorState`** — default no-op on every other state, since holding the door only makes sense while it's open; give `DoorsOpenState` its own `doorHeld` boolean field, set by `holdDoor()`.",
          "**Update `DoorsOpenState.closeDoors()`** — (or whatever triggers the auto-close timer) checks `doorHeld` before transitioning; if held, it stays in `DoorsOpenState` and the timer resets.",
          "**Why this shape** — keeps the check local to the one state where it's actually meaningful, rather than a flag every other state's methods would otherwise need to know about and ignore.",
        ],
      },
    ],
  },
};
