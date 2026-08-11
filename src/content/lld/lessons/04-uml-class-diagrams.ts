import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. ASCII diagrams
 * standing in for real UML notation, same convention `foundations/`
 * already uses for protocol diagrams (monospace `diagram` blocks, no
 * external rendering library) — see e.g. `05-dns-deep-dive.ts`.
 */
export const UML_CLASS_DIAGRAMS: LLDLesson = {
  slug: "uml-class-diagrams",
  number: 4,
  category: "fundamentals",
  title: "UML Class Diagrams",
  tagline:
    "The four relationship types — association, aggregation, composition, inheritance — are the actual vocabulary an LLD interview is conducted in, on a whiteboard or on paper.",
  estimatedMinutes: 30,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "You don't need to know all of UML — a huge, formal specification with notation for nearly every diagram type software engineering has ever used. You need the one corner of it that an LLD interview actually runs on: class diagrams, and specifically how to draw the *relationships* between classes correctly.",
        },
        {
          kind: "paragraph",
          text: "This matters because getting a relationship wrong isn't a notation nitpick — \"is ParkingFloor part of ParkingLot, or just associated with it?\" is really the question \"does a floor's lifecycle depend on the lot's, or can it exist independently?\", and that question has a real code consequence.",
        },
      ],
    },
    {
      id: "class-box",
      heading: "The class box",
      blocks: [
        {
          kind: "paragraph",
          text: "A UML class is drawn as a box with three compartments: name, attributes, methods. Visibility is marked with a prefix.",
        },
        {
          kind: "table",
          headers: ["Symbol", "Visibility", "Java equivalent"],
          rows: [
            ["+", "public", "public"],
            ["-", "private", "private"],
            ["#", "protected", "protected"],
            ["~", "package", "(no modifier)"],
          ],
        },
        {
          kind: "diagram",
          lines: [
            "┌───────────────────────────────┐",
            "│          BankAccount           │",
            "├───────────────────────────────┤",
            "│ - balance: double              │",
            "│ - accountId: String            │",
            "├───────────────────────────────┤",
            "│ + deposit(amount: double): void │",
            "│ + withdraw(amount: double): void│",
            "│ + getBalance(): double          │",
            "└───────────────────────────────┘",
          ],
        },
        {
          kind: "paragraph",
          text: "In practice, interview whiteboard/paper diagrams are usually looser than this — often just the class name and its key relationships, attributes and methods added only where they clarify something. Knowing the formal notation is what lets you loosen it deliberately instead of by accident.",
        },
      ],
    },
    {
      id: "association",
      heading: "Association — \"uses\" or \"knows about\"",
      blocks: [
        {
          kind: "paragraph",
          text: "The weakest, most general relationship: one class references or uses another, with no ownership implied. A plain line, optionally labeled with the verb and multiplicity at each end.",
        },
        {
          kind: "uml",
          relationships: [{ from: "Professor", to: "Student", kind: "association", fromMultiplicity: "1", toMultiplicity: "*", label: "teaches" }],
        },
        {
          kind: "paragraph",
          text: "Neither object owns the other. A Professor object doesn't need Student objects to exist, and a Student existing doesn't require any particular Professor. They just know about each other for the duration of some interaction.",
        },
      ],
    },
    {
      id: "aggregation",
      heading: "Aggregation — \"has-a\", independent lifecycle",
      blocks: [
        {
          kind: "paragraph",
          text: "A whole/part relationship where the part can outlive the whole. Drawn as a line with a hollow (unfilled) diamond at the \"whole\" end.",
        },
        {
          kind: "uml",
          relationships: [{ from: "Department", to: "Professor", kind: "aggregation", fromMultiplicity: "1", toMultiplicity: "*", label: "has" }],
        },
        {
          kind: "paragraph",
          text: "A Department has Professors, but if the Department is dissolved, the Professors don't cease to exist — they can move to a different department. That independence is exactly what the hollow diamond signals.",
        },
      ],
    },
    {
      id: "composition",
      heading: "Composition — \"has-a\", dependent lifecycle",
      blocks: [
        {
          kind: "paragraph",
          text: "The stronger whole/part relationship: the part's lifecycle is bound to the whole's. Drawn as a line with a filled (solid) diamond at the \"whole\" end.",
        },
        {
          kind: "uml",
          relationships: [{ from: "ParkingLot", to: "ParkingFloor", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" }],
        },
        {
          kind: "paragraph",
          text: "A ParkingLot has ParkingFloors, and a ParkingFloor with no lot to belong to doesn't make sense — if the lot is demolished, the floors go with it. In code, this usually means the ParkingLot constructor creates its ParkingFloors internally, rather than accepting them as external references passed in.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Composition in code: ParkingLot owns the creation and lifecycle of its floors\nclass ParkingLot {\n    private final List<ParkingFloor> floors = new ArrayList<>();\n\n    ParkingLot(int floorCount) {\n        for (int i = 0; i < floorCount; i++) {\n            floors.add(new ParkingFloor(i)); // created here, not passed in\n        }\n    }\n}\n\n// Aggregation in code: Department references Professors created elsewhere\nclass Department {\n    private final List<Professor> professors = new ArrayList<>();\n\n    void addProfessor(Professor p) { professors.add(p); } // passed in, exists independently\n}',
        },
        {
          kind: "insight",
          text: "The interview-usable test: if you deleted the whole object right now, should the part objects also disappear? Composition — yes. Aggregation — no, they're just no longer referenced by this particular whole.",
        },
      ],
    },
    {
      id: "inheritance",
      heading: "Inheritance (Generalization) and Realization",
      blocks: [
        {
          kind: "paragraph",
          text: "Inheritance (a class extends a class) is drawn as a solid line with a hollow triangle arrowhead pointing at the superclass.",
        },
        {
          kind: "uml",
          relationships: [
            { from: "Car", to: "Vehicle", kind: "inheritance" },
            { from: "Truck", to: "Vehicle", kind: "inheritance" },
          ],
        },
        {
          kind: "paragraph",
          text: "Realization (a class implements an interface) is the same hollow triangle, but with a dashed line instead of solid — the distinction UML draws between \"inherits an implementation\" and \"promises to fulfill a contract.\"",
        },
        {
          kind: "uml",
          relationships: [{ from: "Car", to: "Drivable", kind: "realization" }],
        },
      ],
    },
    {
      id: "dependency",
      heading: "Dependency — the loosest, most temporary relationship",
      blocks: [
        {
          kind: "paragraph",
          text: "One class uses another only briefly — as a method parameter, a local variable, or a return type — without holding a reference to it as a field. Drawn as a dashed line with a plain (open) arrowhead.",
        },
        {
          kind: "uml",
          relationships: [{ from: "OrderService", to: "EmailValidator", kind: "dependency" }],
        },
        {
          kind: "code",
          language: "java",
          code: 'class OrderService {\n    void placeOrder(Order order, EmailValidator validator) {\n        // uses EmailValidator only within this method — no field, no long-term reference\n        if (!validator.isValid(order.getCustomerEmail())) {\n            throw new IllegalArgumentException("Invalid email");\n        }\n    }\n}',
        },
      ],
    },
    {
      id: "multiplicity",
      heading: "Multiplicity notation",
      blocks: [
        {
          kind: "paragraph",
          text: "The numbers at each end of a relationship line say how many instances participate. These come up constantly when identifying whether a field should be a single reference or a collection.",
        },
        {
          kind: "table",
          headers: ["Notation", "Meaning"],
          rows: [
            ["1", "Exactly one"],
            ["0..1", "Zero or one (optional single reference)"],
            ["*", "Zero or more"],
            ["1..*", "One or more (at least one required)"],
            ["3..5", "Between 3 and 5"],
          ],
        },
      ],
    },
    {
      id: "worked-example",
      heading: "Worked example — Parking Lot, partially",
      blocks: [
        {
          kind: "paragraph",
          text: "Putting all of the above together on a small slice of a class diagram you'll build in full in Lesson 9.",
        },
        {
          kind: "uml",
          relationships: [
            { from: "ParkingLot", to: "ParkingFloor", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" },
            { from: "ParkingFloor", to: "ParkingSpot", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" },
            { from: "ParkingSpot", to: "Vehicle", kind: "association", fromMultiplicity: "1", toMultiplicity: "0..1", label: "parks (0 or 1)" },
            { from: "Car", to: "Vehicle", kind: "inheritance" },
            { from: "Bike", to: "Vehicle", kind: "inheritance" },
            { from: "ParkingSpot", to: "Comparable", kind: "realization", label: "sorting by distance" },
          ],
        },
        {
          kind: "list",
          items: [
            "ParkingLot → ParkingFloor and ParkingFloor → ParkingSpot are both composition: floors and spots don't exist independent of the lot they belong to.",
            "ParkingSpot → Vehicle is association, not aggregation or composition: a spot doesn't own a vehicle, it just references whichever one is currently parked there (0..1, since an empty spot references none).",
            "Car and Bike inherit from Vehicle — a real 'is-a'.",
            "ParkingSpot realizing Comparable is a dashed-line implementation relationship, not inheritance.",
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
          question: "\"Do I need to draw perfect UML in an interview?\"",
          answer:
            "\"No — most interviewers care that you can distinguish composition from aggregation from plain association when it matters, and that your diagram (however rough) communicates those distinctions. Perfect notation with the wrong relationships is worse than rough notation with the right ones.\"",
        },
        {
          kind: "qa",
          question: "\"How do you decide between aggregation and composition when it's ambiguous?\"",
          answer:
            "\"I ask: if I deleted the parent object right now, does it make sense for the child objects to keep existing independently, referenced by something else? If yes, aggregation. If the child only makes sense as part of that specific parent, composition. When it's genuinely ambiguous, I say so out loud and pick the one that matches the stated requirements rather than guessing silently.\"",
        },
      ],
    },
  ],
  summary:
    "UML class diagrams for an LLD interview reduce to five relationship types worth drawing correctly: association (plain line, 'knows about'), aggregation (hollow diamond, 'has-a' with independent lifecycle), composition (filled diamond, 'has-a' with dependent lifecycle), inheritance (hollow triangle, solid line, 'is-a'), and realization (hollow triangle, dashed line, 'implements'). Multiplicity at each end (1, 0..1, *, 1..*) determines whether a field is a single reference or a collection. Getting composition vs. aggregation right isn't notation pedantry — it's the same question as whether a field's lifecycle is owned or merely referenced.",
  keyTakeaways: [
    "Association is the loosest relationship — one class knows about another, no ownership implied.",
    "Aggregation (hollow diamond) is 'has-a' where the part can outlive the whole. Composition (filled diamond) is 'has-a' where it can't.",
    "The test for composition vs. aggregation: if you deleted the parent right now, would the children still make sense existing on their own?",
    "Inheritance (hollow triangle, solid line) means 'is-a'. Realization (hollow triangle, dashed line) means 'implements this interface's contract'.",
    "Multiplicity (1, 0..1, *, 1..*) at each end of a relationship line directly determines whether a field should be a single reference or a collection in code.",
  ],
  exercise: {
    prompt:
      "For each pair below, say whether the relationship is association, aggregation, or composition, and why: (1) Library and Book, (2) Book and Author, (3) Car and Engine, (4) Order and OrderLineItem, (5) Taxi and Passenger (during a single ride).",
    guidance: [
      {
        kind: "list",
        ordered: true,
        items: [
          "**Library–Book — aggregation.** If a Library closes, its Books can move to another library; they outlive it.",
          "**Book–Author — association.** Neither owns the other's lifecycle; an Author exists whether or not a specific Book does, and a Book references an Author without owning them.",
          "**Car–Engine — composition, in the usual modeling.** An Engine built into a specific Car is typically not meant to be swapped between Car objects in the model (in the real world engines can be removed, but the standard LLD-interview modeling treats this as composition unless the problem says otherwise).",
          "**Order–OrderLineItem — composition.** A line item has no meaning outside the order it belongs to; deleting the order deletes its line items.",
          "**Taxi–Passenger — association**, and a good example of why duration matters. The relationship exists only for the ride, neither owns the other, and a Passenger obviously outlives any one Taxi ride.",
        ],
      },
    ],
  },
};
