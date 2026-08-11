import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. First case study:
 * applies Lesson 5's seven-step framework explicitly, step by step, and
 * reuses the exact class diagram sketched in Lesson 4's worked example —
 * this lesson is that diagram, built out into real code.
 */
export const PARKING_LOT: LLDLesson = {
  slug: "parking-lot",
  number: 9,
  category: "case-study",
  title: "Case Study: Parking Lot",
  tagline:
    "The most commonly asked LLD problem, for a good reason — it exercises composition, inheritance, Strategy, and Singleton without needing any single one of them to feel forced.",
  estimatedMinutes: 40,
  sections: [
    {
      id: "requirements",
      heading: "Step 1 — Requirements",
      blocks: [
        {
          kind: "paragraph",
          text: "In scope: a multi-floor parking lot with multiple spot sizes (motorcycle, compact, large), multiple vehicle types, issuing a ticket on entry, calculating a fee on exit, and finding an available spot for a given vehicle.",
        },
        {
          kind: "paragraph",
          text: "Explicitly out of scope for this pass: multiple entry gates coordinating in real time, reservations ahead of arrival, and payment processing itself (just fee calculation). These are named, not silently ignored — worth saying out loud in an interview even when you're not solving them.",
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
            "Driver — arrives with a vehicle, needs a spot; leaves, pays, gets the vehicle out.",
            "ParkingAttendant / the system itself — assigns a spot on entry, calculates the fee on exit.",
          ],
        },
      ],
    },
    {
      id: "classes-relationships",
      heading: "Steps 3-4 — Classes and relationships",
      blocks: [
        {
          kind: "paragraph",
          text: "This is the exact diagram sketched in Lesson 4's worked example, now the backbone of a real design rather than an illustration.",
        },
        {
          kind: "uml",
          relationships: [
            { from: "ParkingLot", to: "ParkingFloor", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" },
            { from: "ParkingFloor", to: "ParkingSpot", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" },
            { from: "ParkingSpot", to: "Vehicle", kind: "association", fromMultiplicity: "1", toMultiplicity: "0..1", label: "parks (0 or 1)" },
            { from: "Car", to: "Vehicle", kind: "inheritance" },
            { from: "Bike", to: "Vehicle", kind: "inheritance" },
            { from: "Truck", to: "Vehicle", kind: "inheritance" },
          ],
        },
        {
          kind: "list",
          items: [
            "ParkingLot has ParkingFloors, which have ParkingSpots — composition throughout, since none of these exist independent of the lot they belong to.",
            "ParkingSpot references a Vehicle by association, not ownership — a spot doesn't own the vehicle parked in it.",
            "Car, Bike, Truck are Vehicle subclasses — a real 'is-a', and each has a size that determines which spot types can hold it.",
          ],
        },
      ],
    },
    {
      id: "core-classes",
      heading: "Steps 5 — Attributes and methods",
      blocks: [
        {
          kind: "code",
          language: "java",
          code: 'enum VehicleSize { MOTORCYCLE, COMPACT, LARGE }\nenum SpotSize { MOTORCYCLE, COMPACT, LARGE }\n\nabstract class Vehicle {\n    private final String licensePlate;\n    private final VehicleSize size;\n    Vehicle(String licensePlate, VehicleSize size) {\n        this.licensePlate = licensePlate;\n        this.size = size;\n    }\n    VehicleSize size() { return size; }\n}\nclass Motorcycle extends Vehicle { Motorcycle(String plate) { super(plate, VehicleSize.MOTORCYCLE); } }\nclass Car extends Vehicle { Car(String plate) { super(plate, VehicleSize.COMPACT); } }\nclass Truck extends Vehicle { Truck(String plate) { super(plate, VehicleSize.LARGE); } }\n\nclass ParkingSpot {\n    private final String id;\n    private final SpotSize size;\n    private Vehicle parkedVehicle; // null when empty\n\n    ParkingSpot(String id, SpotSize size) { this.id = id; this.size = size; }\n\n    boolean canFit(Vehicle vehicle) {\n        return parkedVehicle == null && spotSizeFits(vehicle.size());\n    }\n    private boolean spotSizeFits(VehicleSize v) {\n        // a LARGE spot can hold anything smaller; sizes below can\'t hold bigger vehicles\n        return size.ordinal() >= v.ordinal();\n    }\n    void park(Vehicle vehicle) { this.parkedVehicle = vehicle; }\n    void vacate() { this.parkedVehicle = null; }\n}',
        },
        {
          kind: "code",
          language: "java",
          code: 'class ParkingFloor {\n    private final int floorNumber;\n    private final List<ParkingSpot> spots;\n\n    ParkingFloor(int floorNumber, List<ParkingSpot> spots) {\n        this.floorNumber = floorNumber;\n        this.spots = spots; // created by ParkingLot — composition, see below\n    }\n\n    Optional<ParkingSpot> findAvailableSpot(Vehicle vehicle) {\n        return spots.stream().filter(s -> s.canFit(vehicle)).findFirst();\n    }\n}',
        },
      ],
    },
    {
      id: "spot-assignment-strategy",
      heading: "Step 6 — Where a pattern actually earns its place",
      blocks: [
        {
          kind: "paragraph",
          text: "Two genuine pattern candidates here, each justified by a specific requirement rather than applied by default (Lesson 5's own warning about reaching for patterns too early).",
        },
        {
          kind: "paragraph",
          text: "Singleton — there should be exactly one ParkingLot instance system-wide. Two accidentally-created instances would each independently believe they own the same physical spots, and could double-book one.",
        },
        {
          kind: "code",
          language: "java",
          code: 'class ParkingLot {\n    private static ParkingLot instance;\n    private final List<ParkingFloor> floors = new ArrayList<>();\n\n    private ParkingLot(int floorCount, int spotsPerFloor) {\n        for (int i = 0; i < floorCount; i++) {\n            floors.add(buildFloor(i, spotsPerFloor)); // composition — created here, not passed in\n        }\n    }\n\n    static synchronized ParkingLot getInstance(int floorCount, int spotsPerFloor) {\n        if (instance == null) instance = new ParkingLot(floorCount, spotsPerFloor);\n        return instance;\n    }\n\n    private ParkingFloor buildFloor(int number, int spotCount) { /* ... */ return null; }\n}',
        },
        {
          kind: "paragraph",
          text: "Strategy — if the requirements specify more than one spot-assignment policy (e.g. \"nearest available spot to the entrance\" vs. \"fill lower floors first to save elevator/escalator load\"), that's a genuine Strategy candidate. If only one policy is ever required, hardcoding `findAvailableSpot`'s simple first-match logic (shown above) is the right call — don't add an interface for a choice nobody asked for.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface SpotAssignmentStrategy {\n    Optional<ParkingSpot> assign(List<ParkingFloor> floors, Vehicle vehicle);\n}\n\nclass NearestAvailableStrategy implements SpotAssignmentStrategy {\n    public Optional<ParkingSpot> assign(List<ParkingFloor> floors, Vehicle vehicle) {\n        for (ParkingFloor floor : floors) { // floors ordered nearest-to-entrance first\n            Optional<ParkingSpot> spot = floor.findAvailableSpot(vehicle);\n            if (spot.isPresent()) return spot;\n        }\n        return Optional.empty();\n    }\n}',
        },
        {
          kind: "insight",
          text: "This is the same shape this project's own Load Balancer entity uses for its five routing algorithms — one interface, several interchangeable implementations, compared side by side. See Lesson 8's Strategy section, and `docs/Entities.md`'s Load Balancer section for the HLD version of the identical idea.",
        },
      ],
    },
    {
      id: "core-flow",
      heading: "Step 7 — Core flow: park and unpark",
      blocks: [
        {
          kind: "code",
          language: "java",
          code: 'class Ticket {\n    private final String id;\n    private final ParkingSpot spot;\n    private final long entryTimeMillis;\n\n    Ticket(String id, ParkingSpot spot, long entryTimeMillis) {\n        this.id = id;\n        this.spot = spot;\n        this.entryTimeMillis = entryTimeMillis;\n    }\n    ParkingSpot spot() { return spot; }\n    long entryTimeMillis() { return entryTimeMillis; }\n}\n\nclass ParkingLot {\n    // ...fields from before, plus:\n    private final SpotAssignmentStrategy strategy;\n\n    Ticket parkVehicle(Vehicle vehicle) {\n        ParkingSpot spot = strategy.assign(floors, vehicle)\n            .orElseThrow(() -> new IllegalStateException("No available spot"));\n        spot.park(vehicle);\n        return new Ticket(UUID.randomUUID().toString(), spot, System.currentTimeMillis());\n    }\n\n    double unparkVehicle(Ticket ticket) {\n        long durationMillis = System.currentTimeMillis() - ticket.entryTimeMillis();\n        double fee = calculateFee(durationMillis, ticket.spot());\n        ticket.spot().vacate();\n        return fee;\n    }\n\n    private double calculateFee(long durationMillis, ParkingSpot spot) {\n        long hours = Math.max(1, durationMillis / (1000 * 60 * 60)); // minimum 1 hour billed\n        return hours * ratePerHourFor(spot);\n    }\n    private double ratePerHourFor(ParkingSpot spot) { return 20.0; /* could vary by spot size */ }\n}',
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
            ["A second, different fee schedule for members vs. non-members", "New `FeeStrategy` interface, one new implementation each — `calculateFee` stops being a hardcoded method, becomes a call to the injected strategy. `ParkingLot` itself doesn't change again after this."],
            ["Multiple entry gates issuing tickets concurrently", "`parkVehicle` needs to be thread-safe — the spot-assignment-and-mark-occupied sequence must be atomic, or two gates could assign the same spot to two vehicles in a race."],
            ["Electric vehicle charging spots as a new spot type", "One new `SpotSize`/vehicle-compatibility rule, or a `ChargingSpot` subclass of `ParkingSpot` if charging spots need extra state (charging status) beyond what a plain spot tracks — no change needed to `ParkingFloor` or `ParkingLot`."],
          ],
        },
        {
          kind: "insight",
          text: "Every one of these is answerable as 'one new class, don't touch the rest' — that's Open/Closed (Lesson 3) actually paying off, not just cited as a principle.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Why is ParkingLot a Singleton but ParkingFloor and ParkingSpot aren't?\"",
          answer:
            "\"Because the 'exactly one' constraint is specific to the lot itself — there's one physical parking facility this code represents. Floors and spots are many by design; making them Singletons wouldn't make sense and isn't what the requirement asks for. Applying Singleton everywhere 'just in case' is the over-application this track's SOLID lesson warned about.\"",
        },
        {
          kind: "qa",
          question: "\"How would you handle a vehicle that could fit in multiple spot sizes — should a Motorcycle be allowed to take a LARGE spot?\"",
          answer:
            "\"Functionally yes — a bigger spot can always physically hold a smaller vehicle, which is exactly what `spotSizeFits`'s ordinal comparison allows. Whether it's a *good* assignment is a business decision, not a correctness one — a real system would prefer NOT to waste a LARGE spot on a Motorcycle when a MOTORCYCLE-sized spot is free, which is a job for the assignment Strategy to prioritize, not the spot's own `canFit` check to forbid.\"",
        },
      ],
    },
  ],
  summary:
    "Parking Lot exercises the full framework cleanly: composition for the ParkingLot → ParkingFloor → ParkingSpot ownership chain, inheritance for the Vehicle hierarchy, Singleton because exactly one lot instance is a real requirement (not a default), and Strategy only where the requirements actually specify more than one policy (spot assignment, fee calculation) — never applied just because the pattern exists. Every plausible new requirement (a new fee schedule, concurrent entry gates, a new spot type) resolves to adding one class, not editing the ones that already work.",
  keyTakeaways: [
    "ParkingLot → ParkingFloor → ParkingSpot is composition throughout — none of these exist independent of the lot they belong to.",
    "Singleton is justified here by a real requirement (exactly one physical lot), not applied as a default — the same discipline every pattern in this track requires.",
    "Strategy is only introduced where the requirements name more than one real policy (spot assignment, fee calculation) — a single hardcoded policy stays a plain method until a second one is actually needed.",
    "Concurrent entry gates would require making park-and-mark-occupied atomic — a correctness requirement this single-threaded sketch doesn't yet handle, worth naming even when not fully designing it.",
    "New requirements resolve to new classes, not edits to existing ones, whenever the design correctly separated the varying concern (fee policy, spot type) from the fixed structure (the lot/floor/spot hierarchy).",
  ],
  exercise: {
    prompt:
      "Extend this design to support a reservation system: a Driver can reserve a specific spot type up to 30 minutes before arrival, and a reserved spot should not be assignable to a walk-in vehicle during that window. Sketch which classes change and which new ones you'd add — code optional, class-level design only.",
    guidance: [
      {
        kind: "list",
        items: [
          "**Add a `Reservation` class** — fields: driverId, spotType, reservedFrom, reservedUntil.",
          "**Update `ParkingSpot`** — gains a nullable `currentReservation` field, plus a check: `isAvailableFor(Vehicle, time)` now needs to check both `parkedVehicle == null` AND (no active reservation, OR the reservation belongs to this arriving vehicle).",
          "**Update `SpotAssignmentStrategy.assign`** — needs the current time passed in, so it can filter out reserved-and-not-yet-claimed spots.",
          "**Where reservation logic lives** — best modeled as owned by a `ReservationService` (its own class, one new responsibility, keeping SRP intact) rather than bolted directly onto `ParkingLot`, which already has its own single job — the same instinct as Lesson 3's SRP fix for the Order class doing three jobs.",
        ],
      },
    ],
  },
};
