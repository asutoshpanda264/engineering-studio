import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Closes out the
 * Fundamentals group: lessons 2-4 taught the vocabulary (OOP pillars,
 * SOLID, UML relationships), this one is the procedure for actually using
 * that vocabulary under a 40-minute clock — the last thing before the
 * Design Patterns group applies all of it to specific recurring problems.
 */
export const LLD_INTERVIEW_APPROACH: LLDLesson = {
  slug: "lld-interview-approach",
  number: 5,
  category: "fundamentals",
  title: "How to Approach an LLD Interview",
  tagline:
    "Most candidates fail in the first five minutes, the same way most HLD candidates do — by drawing before they understand what they're drawing.",
  estimatedMinutes: 25,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "\"Design a parking lot\" is not a request to start writing a `ParkingLot` class. It's a request to demonstrate a repeatable process: turn a vague, real-world problem into classes with clear responsibilities, honest relationships, and code that could survive a new requirement without a rewrite.",
        },
        {
          kind: "paragraph",
          text: "The process below is the same seven steps every case study in this track (Lessons 9-15) walks through explicitly. Internalizing it here means each case study reads as an application of a method, not a new problem-specific trick each time.",
        },
      ],
    },
    {
      id: "the-framework",
      heading: "The seven-step framework",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            "Clarify requirements — what's actually in scope? What's explicitly out of scope? Ask before assuming.",
            "Identify actors and use cases — who interacts with this system, and what are they trying to do?",
            "Identify classes (the nouns) — the real-world entities in the problem statement. Candidate classes, not final ones yet.",
            "Identify relationships (Lesson 4) — association, aggregation, composition, inheritance between those classes.",
            "Identify attributes and methods (the verbs) — what does each class know, and what can it do?",
            "Apply a pattern where it earns its place — never by default. A pattern should solve a concrete problem the requirements actually created.",
            "Code the core flow, then discuss extensibility — walk through one or two central methods, then answer 'what if a new requirement X arrived?' without a redesign.",
          ],
        },
        {
          kind: "insight",
          text: "Notice patterns are step 6, not step 1. Reaching for Strategy or Observer before you've even listed the classes is the single most common way candidates over-engineer a design nobody asked for.",
        },
      ],
    },
    {
      id: "time-budget",
      heading: "A realistic time budget",
      blocks: [
        {
          kind: "paragraph",
          text: "For a typical 40-45 minute round:",
        },
        {
          kind: "table",
          headers: ["Time", "Step", "What you're producing"],
          rows: [
            ["0-5 min", "Clarify requirements", "A short, explicit list of what's in and out of scope"],
            ["5-10 min", "Actors + use cases", "A bullet list — who does what"],
            ["10-20 min", "Classes + relationships", "A rough class diagram (Lesson 4's notation, loosely)"],
            ["20-25 min", "Attributes + methods", "Filled-in class boxes, key method signatures"],
            ["25-30 min", "Patterns, if earned", "Named, with the specific requirement each one answers"],
            ["30-40 min", "Code walkthrough", "Real code for 1-2 core flows, spoken through as you write"],
            ["40-45 min", "Extensibility + questions", "\"What if X changed?\" answered live; your questions to them"],
          ],
        },
        {
          kind: "paragraph",
          text: "This isn't a rigid script — a strong interviewer will interrupt with follow-ups at any point, and that's normal, not a sign you're behind. But candidates who spend 20 of their 40 minutes on requirements clarification, or who reach minute 35 with zero code written, are the two most common ways this budget actually gets blown.",
        },
      ],
    },
    {
      id: "common-mistakes",
      heading: "Common mistakes, and what they signal",
      blocks: [
        {
          kind: "table",
          headers: ["Mistake", "What it signals to the interviewer"],
          rows: [
            ["Jumping straight to code with no requirements clarification", "You don't yet know what problem you're solving — the interviewer has to guess whether your assumptions matched theirs"],
            ["Applying a pattern with no concrete driving requirement", "You're pattern-matching from memory, not reasoning from the problem"],
            ["Never writing any actual code", "Unclear whether the design translates to something buildable, not just boxes"],
            ["Treating every field as needing a getter and setter", "Encapsulation from Lesson 2 isn't actually informing the design"],
            ["One giant class doing everything", "Single Responsibility from Lesson 3 isn't actually informing the design"],
            ["Freezing when asked 'what if requirement X changed?'", "The design wasn't actually built to be extensible — it just happens to work for the one scenario discussed"],
          ],
        },
        {
          kind: "insight",
          text: "Every mistake in this table maps back to a specific Lesson 2-4 idea not being applied — which is the whole reason those lessons came first. LLD interview performance is less about knowing more facts and more about actually using the ones you already have, live, under time pressure.",
        },
      ],
    },
    {
      id: "worked-mini-example",
      heading: "Worked mini-example — Library Management System",
      blocks: [
        {
          kind: "paragraph",
          text: "A quick pass through all seven steps, at the depth an interview's first 20 minutes would actually reach — not full code, that's what the dedicated case studies (Lessons 9-15) are for.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Requirements: members can borrow and return books; the system tracks which copies are available; a book can have multiple physical copies. Out of scope for this pass: fines, reservations, multiple branches.",
            "Actors/use cases: a Member searches for a book, borrows a copy, returns a copy. A Librarian adds new books/copies to the catalogue.",
            "Candidate classes (nouns): Library, Book, BookCopy, Member, Librarian, Loan.",
            "Relationships: Library *has* many Books (aggregation — a book's catalogue entry could move between library branches in a fuller version). A Book *has* many BookCopies (composition — a copy has no meaning without the book it's a copy of). A Loan *associates* a Member with a BookCopy for a duration.",
            "Attributes/methods: BookCopy needs a status (AVAILABLE/ON_LOAN). Library needs `borrowBook(Member, Book): Loan` and `returnBook(Loan): void`.",
            "Pattern check: does anything here earn a pattern? Not yet at this scope — no polymorphic behavior variation exists. If a later requirement added different loan-duration rules per member type (Student vs. Faculty), that would be a genuine Strategy candidate (Lesson 6).",
            "Core flow: `borrowBook` finds an AVAILABLE BookCopy for the given Book, marks it ON_LOAN, creates and returns a Loan record. Extensibility check: what if the library needs a hold/reservation queue for a book with zero available copies? BookCopy's status enum and Library's borrow method would need to change — worth naming out loud even without designing it fully.",
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
          question: "\"How many classes is 'too many' for a 40-minute round?\"",
          answer:
            "\"There's no fixed number — it depends on the problem's real scope. The better question is whether each class has one clear job. Five focused classes beat two classes each doing three jobs. If I'm short on time, I'll say out loud which classes I'm sketching only at a high level versus fully detailing, rather than silently rushing all of them.\"",
        },
        {
          kind: "qa",
          question: "\"What do you do if the interviewer changes the requirements halfway through?\"",
          answer:
            "\"Treat it as the actual test, not an interruption — real requirements change mid-project constantly. I'll say which classes/relationships need to change and why, and if the existing design absorbs the change cleanly (new class, no edits to old ones), I'll point that out explicitly, since that's the concrete payoff of Open/Closed from Lesson 3.\"",
        },
      ],
    },
  ],
  summary:
    "An LLD interview rewards a repeatable process, not a memorized solution: clarify requirements, find the actors and use cases, extract candidate classes and their relationships, fill in attributes and methods, apply a pattern only where a real requirement earns it, then write and walk through the core flow before discussing how a new requirement would extend the design. Every common mistake in this kind of round traces back to skipping one of these steps or reaching for a pattern before the problem justified it.",
  keyTakeaways: [
    "The seven-step framework: requirements → actors/use cases → classes → relationships → attributes/methods → patterns (if earned) → code + extensibility.",
    "Patterns come after the classes and relationships are identified, never before — reaching for one first is the most common over-engineering mistake.",
    "A realistic 40-45 minute round budgets roughly 20 minutes to design and 10-15 to actual code — freezing with zero code written by minute 35 is a common failure mode.",
    "Every common LLD-interview mistake maps back to an OOP pillar or SOLID principle not actually being applied, not a new idea to learn.",
    "Being asked 'what if requirement X changed?' is the real test of the design, not a curveball — a design that absorbs the change as new code (not edits) is the payoff of Open/Closed in practice.",
  ],
  exercise: {
    prompt:
      "Apply the seven-step framework, at the same depth as the Library Management System example, to: \"Design a ride-hailing app's driver-matching system\" (just steps 1-5 — requirements through attributes/methods; skip patterns and code for this exercise).",
    guidance: [
      {
        kind: "list",
        items: [
          "**Requirements** — a Rider requests a ride from a location; the system matches them to a nearby available Driver. Out of scope for this pass: pricing, payments, ratings.",
          "**Actors / use cases** — Rider requests a ride, cancels a ride; Driver goes online/offline, accepts a ride.",
          "**Candidate classes** — Rider, Driver, RideRequest, Ride, Location.",
          "**Relationships** — a RideRequest is associated with a Rider (not owned/composed — the Rider exists independent of any one request) and, once matched, a Ride associates a Driver with that RideRequest. Driver *has* a current Location (composition is debatable here — most designs treat it as a simple attribute rather than a separate owned object unless location history matters).",
          "**Attributes / methods** — Driver needs a status (AVAILABLE/ON_TRIP/OFFLINE) and a currentLocation; a matching service needs something like `findNearestAvailableDriver(RideRequest): Driver`.",
        ],
      },
    ],
  },
};
