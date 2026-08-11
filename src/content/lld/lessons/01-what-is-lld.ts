import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — no source chat
 * transcript exists for this module (unlike `foundations/`, see
 * `docs/BROWSER-CHECKS.md`'s content-source note for that module). Original
 * framing and examples, written to sit naturally next to Foundations'
 * existing "HLD vs LLD" section in its own opening lesson
 * (`foundations/lessons/01-what-is-system-design.ts`), which already
 * promises this ground gets covered — this track is that promise kept.
 */
export const WHAT_IS_LLD: LLDLesson = {
  slug: "what-is-lld",
  number: 1,
  category: "fundamentals",
  title: "What is Low-Level Design?",
  tagline:
    "HLD decides which boxes exist and how they talk. LLD decides what's actually inside one box — the classes, their relationships, and the code you'd really write.",
  estimatedMinutes: 25,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "If you've spent time in this project's Workshop, you've already done high-level design without necessarily calling it that: you dragged a Client, a Load Balancer, two API Servers, and a Database onto a canvas, wired them together, and watched traffic flow through the result.",
        },
        {
          kind: "paragraph",
          text: "That's HLD — deciding which boxes exist and how they talk. It answers \"do we need a cache?\", \"how many API servers?\", \"SQL or NoSQL?\". This project's simulation engine can actually run that decision and show you the consequence.",
        },
        {
          kind: "paragraph",
          text: "Low-Level Design asks a different question, one level deeper: you've decided \"API Server\" needs to exist — now what classes actually live inside it? If that API Server's job is issuing parking tickets, or booking movie seats, or rate-limiting requests, what objects does the code contain, what do they know, and how do they collaborate?",
        },
        {
          kind: "insight",
          text: "HLD is the floor plan of a building — which rooms exist and how they connect. LLD is what's actually built inside one specific room: the wiring, the furniture, how it's laid out so it still works when the room gets used in ways you didn't originally picture.",
        },
        {
          kind: "paragraph",
          text: "Neither is \"more important.\" They're different zoom levels on the same problem, and most real interview loops — and most real engineering work — test both.",
        },
      ],
    },
    {
      id: "hld-vs-lld",
      heading: "HLD vs LLD, side by side",
      blocks: [
        {
          kind: "paragraph",
          text: "Foundations' opening lesson already drew this line once, briefly. Here it is again, with the detail this track is actually built to cover.",
        },
        {
          kind: "table",
          headers: ["", "High-Level Design", "Low-Level Design"],
          rows: [
            ["Question", "What boxes exist, how do they talk?", "What classes exist inside one box, how do they collaborate?"],
            ["Unit of thought", "Services, databases, queues, caches", "Classes, interfaces, methods, objects"],
            ["Typical deliverable", "An architecture diagram", "A class diagram + key method signatures + a code walkthrough"],
            ["Example question", "\"Design WhatsApp\"", "\"Design a parking lot's ticketing system\""],
            ["Tools you reach for", "Load balancing, sharding, caching, replication", "SOLID, design patterns, encapsulation, interfaces"],
            ["What breaks if you get it wrong", "The system falls over under load", "The codebase becomes unmaintainable as requirements grow"],
          ],
        },
        {
          kind: "paragraph",
          text: "Notice what's absent from the LLD column: nothing about servers, nothing about latency, nothing about how many machines you'd run. LLD assumes you already have one box (\"the booking service\") and asks purely: how is the code inside it organized?",
        },
      ],
    },
    {
      id: "the-deliverable",
      heading: "What an interviewer actually wants to see",
      blocks: [
        {
          kind: "paragraph",
          text: "\"Design a parking lot\" is not an invitation to write a parking lot app from scratch in 40 minutes. It's a structured exercise with a fairly predictable shape once you've seen it a few times.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Clarify requirements — what kinds of vehicles? Multiple floors? Multiple entry gates? Do we need to support different ticket types?",
            "Identify the nouns — the real-world entities in the problem (ParkingLot, ParkingFloor, ParkingSpot, Vehicle, Ticket, Payment). These become candidate classes.",
            "Identify the verbs — what actions happen (park a vehicle, find a spot, calculate fee, process payment). These become candidate methods.",
            "Draw the relationships — does a ParkingLot *have* many ParkingFloors (composition)? Does a Vehicle *use* a ParkingSpot temporarily (association)? Is a Car a kind of Vehicle (inheritance)?",
            "Apply a pattern where it earns its place — different vehicle types need different spot-matching logic → Strategy. Only one ParkingLot instance should exist → Singleton (with the caveats Lesson 5's Creational Patterns lesson covers).",
            "Walk through the code for one or two core flows — \"here's what `parkVehicle()` actually does, step by step\" — in whatever language you're comfortable in.",
          ],
        },
        {
          kind: "insight",
          text: "The deliverable isn't a finished system. It's evidence that you can turn a vague, real-world problem into classes with clear responsibilities, honest relationships, and code you could actually extend later without a rewrite.",
        },
      ],
    },
    {
      id: "not-dsa-not-hld",
      heading: "LLD is neither a DSA round nor an HLD round",
      blocks: [
        {
          kind: "paragraph",
          text: "It's easy to conflate LLD with the two rounds that sit next to it in most interview loops. Worth separating cleanly, because each one rewards a genuinely different skill.",
        },
        {
          kind: "table",
          headers: ["Round", "Rewards", "Example prompt"],
          rows: [
            ["DSA", "Choosing the right algorithm/data structure for one function", "\"Find the shortest path in this graph\""],
            ["LLD", "Organizing a whole feature's code into classes that stay maintainable as requirements grow", "\"Design an LRU cache as a class, not just the algorithm\""],
            ["HLD", "Choosing infrastructure and its trade-offs at scale", "\"Design a system that serves this to 50 million users\""],
          ],
        },
        {
          kind: "paragraph",
          text: "The LRU Cache example is a good one to sit with: the *algorithm* (hashmap + doubly linked list, O(1) get/put) is DSA. Whether you'd actually be asked to hand-roll that in a real codebase or just import a library is beside the point — the LLD version of this question asks something different: what's the public interface, what implementation details does it hide, how would you make it thread-safe, how would you extend it to LFU without rewriting callers? That's Lesson 12 in this track.",
        },
      ],
    },
    {
      id: "scope-note",
      heading: "An honest note on what this track does — and doesn't — do",
      blocks: [
        {
          kind: "paragraph",
          text: "Everything else in this project follows one rule: nothing is asserted, everything is simulated. The Workshop's Cache doesn't just claim caching helps — you run traffic through it and watch the hit rate and the downstream database's load change in front of you.",
        },
        {
          kind: "paragraph",
          text: "LLD doesn't fit that model, and this track doesn't pretend otherwise. A class diagram has no traffic to send through it — there's no request rate, no latency, no queue to overflow. What makes a class design good or bad is a property of the code itself (does it stay easy to extend? does a new requirement mean editing five files or adding one?), not something a discrete-event simulation can measure and animate.",
        },
        {
          kind: "insight",
          text: "So this track is deliberately written content, same shape as Foundations — explanation, diagrams, code, worked exercises — not a new simulator bolted onto the Workshop. Where a case study genuinely has a hands-on HLD counterpart already built in this project (Movie Ticket Booking, Rate Limiter), the lesson links to it, so you can see the same problem from both zoom levels.",
        },
      ],
    },
    {
      id: "track-map",
      heading: "What this track covers",
      blocks: [
        { kind: "paragraph", text: "Three phases, the same shape a real LLD interview round moves through:" },
        {
          kind: "list",
          items: [
            "Fundamentals — OOP grounded for interviews (not a textbook recap), SOLID with a bad/good example for each letter, UML class-diagram relationships, and a step-by-step approach to the interview itself.",
            "Design Patterns — grouped the standard way (Creational, Structural, Behavioral), each pattern justified by the specific problem it solves rather than presented as trivia to memorize.",
            "Case Studies — Parking Lot, Elevator System, Tic-Tac-Toe, LRU Cache, Splitwise, Movie Ticket Booking, and Rate Limiter, each one applying the fundamentals and patterns to a full, interview-realistic problem.",
          ],
        },
        {
          kind: "paragraph",
          text: "Read in any order — nothing here is locked, same as every other reading room in this project — but the case studies will make more sense once you've seen the patterns they lean on.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"What's the actual difference between HLD and LLD rounds?\"",
          answer:
            "\"HLD asks which services and infrastructure exist and how they communicate — the boxes and arrows. LLD assumes you already have one box and asks how the code inside it is organized — classes, their responsibilities, their relationships, and whether a new requirement means a clean extension or a rewrite.\"",
        },
        {
          kind: "qa",
          question: "\"Do I need to memorize all 23 Gang-of-Four design patterns?\"",
          answer:
            "\"No. A handful come up constantly in interviews — Singleton, Factory, Strategy, Observer, Decorator — because they solve problems that show up constantly in the classic case studies. Knowing when a pattern earns its place matters far more than being able to recite all 23 names.\"",
        },
        {
          kind: "qa",
          question: "\"How much actual code do I need to write in a 40-minute LLD round?\"",
          answer:
            "\"Enough to prove the design works, not a finished system. Class signatures, key method bodies for one or two core flows, and interfaces where they matter. Interviewers are watching whether your classes have honest, single responsibilities and clean relationships — not grading you on syntax.\"",
        },
      ],
    },
  ],
  summary:
    "Low-Level Design is the code-level counterpart to the architecture decisions this project's Workshop already simulates: given one box in an HLD diagram, what classes live inside it, what do they know, and how do they collaborate? This track covers OOP/SOLID/UML fundamentals, the design patterns that keep showing up in real interviews, and classic case studies that apply both — as written content, deliberately not a new simulator, since class design has no traffic to run through it.",
  keyTakeaways: [
    "HLD decides which boxes exist and how they communicate. LLD decides what's inside one box — classes, relationships, and the code you'd actually write.",
    "LLD is a distinct skill from both DSA (the right algorithm for one function) and HLD (infrastructure at scale) — don't conflate the three.",
    "The deliverable in an LLD interview is a class design with honest relationships and a code walkthrough for the core flow, not a finished application.",
    "This track is written content, not a simulation — a class diagram has no traffic to run through it, unlike everything in the Workshop.",
    "Case studies here that also have a hands-on HLD counterpart in this project (Movie Ticket Booking, Rate Limiter) link to it, so the same problem is visible from both zoom levels.",
  ],
  exercise: {
    prompt:
      "An interviewer says: \"Design a vending machine.\" Before writing a single class, write down: (1) three requirements-clarifying questions you'd ask, (2) a first-pass list of the nouns in this problem that look like candidate classes, and (3) which one relationship between two of those classes you're least sure about (composition vs. association vs. inheritance) and why.",
    guidance: [
      {
        kind: "list",
        items: [
          "**Clarifying questions worth asking** — Does it accept cash, card, or both? Can it dispense multiple items per selection, or one? Does it need to track/refill inventory, or is that out of scope?",
          "**Candidate nouns** — VendingMachine, Inventory, Slot, Product, Payment, Coin/Card.",
          "**The relationship most people get wrong at first** — a VendingMachine *has* an Inventory (composition — the Inventory has no independent existence without the machine it belongs to), while a Slot *holds* a Product (association — a Product could exist, get restocked, or get discontinued independent of any one Slot).",
        ],
      },
      {
        kind: "insight",
        text: "Getting this distinction right early is exactly what Lesson 4 (UML class diagrams) covers in depth.",
      },
    ],
  },
};
