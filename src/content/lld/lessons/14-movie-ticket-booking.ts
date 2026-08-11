import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Sixth case study, and
 * the one with a real HLD counterpart already shipped in this project:
 * `src/scenarios/movieTicketBooking.ts` puts the same "thousands of fans
 * booking the same few showtimes at once" story in front of the Workshop's
 * simulation engine, from the infrastructure-capacity angle (an
 * undersized database connection pool). This lesson designs the same
 * story from the code-level angle instead — how does the code itself
 * prevent two users from double-booking the same seat, independent of how
 * much infrastructure capacity exists.
 */
export const MOVIE_TICKET_BOOKING: LLDLesson = {
  slug: "movie-ticket-booking",
  number: 14,
  category: "case-study",
  title: "Case Study: Movie Ticket Booking",
  tagline:
    "The infrastructure question is 'can we handle the traffic' — this project's own Workshop scenario already explores that. The code-level question is different: how does the code itself guarantee two users never book the same seat?",
  estimatedMinutes: 40,
  sections: [
    {
      id: "requirements",
      heading: "Step 1 — Requirements",
      blocks: [
        {
          kind: "paragraph",
          text: "Users browse shows (a specific movie, at a specific theatre/screen, at a specific time), select one or more seats, and complete a booking. Because payment takes real time, selected seats are held with a temporary lock so two users can't both proceed to pay for the same seat — the lock releases automatically if checkout isn't completed in time.",
        },
        {
          kind: "paragraph",
          text: "This is the exact scenario this project's own Workshop ships as \"Movie Ticket Booking\" (Scenarios tab in the Component Library) — but that scenario is about whether the *infrastructure* (an undersized database connection pool, deliberately) survives a traffic spike. This lesson is about a different, code-level question the infrastructure scenario doesn't touch at all: given enough capacity, how does the *code itself* guarantee correctness — no seat sold twice — under concurrent access?",
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
            "User — browses shows, selects seats (triggering a temporary lock), completes payment (confirming the booking) or abandons checkout (releasing the lock, immediately or via timeout).",
            "The system — enforces that a seat can only be locked or booked by one user at a time.",
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
            { from: "Show", to: "Seat", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has" },
            { from: "Seat", to: "SeatState", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "delegates to" },
            { from: "Booking", to: "Seat", kind: "association", fromMultiplicity: "1", toMultiplicity: "1..*", label: "books (0 or more)" },
          ],
        },
        {
          kind: "paragraph",
          text: "Show composes its Seats (a seat's layout has no meaning outside the show/screen it belongs to). Each Seat delegates its behavior to a SeatState — AVAILABLE, LOCKED, or BOOKED — the same State pattern shape Lesson 10's Elevator System already established, now applied to a different lifecycle.",
        },
      ],
    },
    {
      id: "the-real-problem",
      heading: "Step 6 — The actual hard problem: preventing a double-book race",
      blocks: [
        {
          kind: "paragraph",
          text: "Two users click the same seat within milliseconds of each other. Both read \"AVAILABLE.\" Both proceed to lock it. Without a correctness guarantee at exactly this point, both succeed, and the system has sold — or at least locked — one seat to two people. This is the actual interview-worthy problem; everything else in this case study is supporting structure around it.",
        },
        {
          kind: "paragraph",
          text: "Two standard fixes, both worth naming — an interviewer is often specifically listening for whether you know there's a choice here at all, not just one \"correct\" answer.",
        },
        {
          kind: "table",
          headers: ["", "Pessimistic locking", "Optimistic locking"],
          rows: [
            ["Mechanism", "Acquire an exclusive lock before checking/changing state; other requests wait or fail immediately", "Read state with a version number; write only succeeds if the version hasn't changed since the read"],
            ["Behavior under contention", "One request proceeds, others block or are rejected immediately", "Both requests proceed to attempt the write; the loser's write fails and must retry or give up"],
            ["Cost when contention is rare", "Pays lock overhead even when no one else is competing for this seat", "No lock overhead at all when uncontended — the common case for most seats, most of the time"],
            ["Cost when contention is high", "Predictable — the second request simply waits or fails fast", "Wasted work — the losing request did real work (read, computed, attempted write) that gets discarded"],
          ],
        },
      ],
    },
    {
      id: "pessimistic-implementation",
      heading: "Pessimistic locking — the simpler, safer default",
      blocks: [
        {
          kind: "code",
          language: "java",
          code: 'enum SeatStatus { AVAILABLE, LOCKED, BOOKED }\n\nclass Seat {\n    private final String id;\n    private volatile SeatStatus status = SeatStatus.AVAILABLE;\n    private String lockedByUserId;\n    private long lockExpiryMillis;\n\n    synchronized boolean tryLock(String userId, long holdDurationMillis) {\n        if (status == SeatStatus.AVAILABLE\n                || (status == SeatStatus.LOCKED && System.currentTimeMillis() > lockExpiryMillis)) {\n            status = SeatStatus.LOCKED;\n            lockedByUserId = userId;\n            lockExpiryMillis = System.currentTimeMillis() + holdDurationMillis;\n            return true;\n        }\n        return false; // already locked by someone else, and not yet expired\n    }\n\n    synchronized boolean confirmBooking(String userId) {\n        if (status == SeatStatus.LOCKED && userId.equals(lockedByUserId)) {\n            status = SeatStatus.BOOKED;\n            return true;\n        }\n        return false; // lock expired, or belongs to a different user\n    }\n\n    synchronized void releaseLock(String userId) {\n        if (status == SeatStatus.LOCKED && userId.equals(lockedByUserId)) {\n            status = SeatStatus.AVAILABLE;\n            lockedByUserId = null;\n        }\n    }\n}',
        },
        {
          kind: "insight",
          text: "`synchronized` on each method makes the read-check-write sequence inside `tryLock` atomic — the exact race described above is closed because no second thread can observe `AVAILABLE` while a first thread is mid-transition to `LOCKED`. The lock expiry check baked into `tryLock` itself is what implements 'releases automatically if checkout isn't completed in time,' without needing a separate background timer thread for the common case (an expired lock is only actually reclaimed the next time someone tries to lock that seat — good enough for correctness, though a real system would likely also run a periodic sweep for seats nobody ever retries).",
        },
      ],
    },
    {
      id: "distributed-note",
      heading: "The honest caveat: this only works on one machine",
      blocks: [
        {
          kind: "paragraph",
          text: "`synchronized` provides mutual exclusion within one JVM process. A real booking service running on multiple server instances behind a load balancer needs the lock to be visible across all of them — `synchronized` alone doesn't help two different processes.",
        },
        {
          kind: "paragraph",
          text: "The standard production answer: move the lock into shared, external storage every instance can see — a database row-level lock (`SELECT ... FOR UPDATE`) or a distributed lock service (Redis with an expiring key, `SETNX seat:123 userId EX 300`). The logic above stays structurally identical; only where the lock state actually lives changes.",
        },
        {
          kind: "insight",
          text: "Naming this limitation unprompted, rather than waiting for the interviewer to ask 'does this work across multiple servers?', is exactly the kind of self-awareness Lesson 5 named as what separates a strong LLD answer from a merely-correct one.",
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
            ["Group booking — lock multiple seats atomically, all-or-nothing", "`tryLock` on each seat individually isn't safe here (partial success leaves some seats locked and others not) — needs a coordinating method that acquires all seats' locks (in a consistent order, to avoid deadlock between two group bookings racing for overlapping seats) or rolls back any partial locks acquired if one seat in the group fails."],
            ["Dynamic pricing based on demand", "A `PricingStrategy` interface, computing a seat's price from current demand signals — a clean Strategy fit, independent of the locking mechanism entirely."],
            ["Waitlist for a sold-out show", "A new `Waitlist` class, subscribed as an Observer (Lesson 8) to a seat's cancellation/release event — no change needed to `Seat`'s own locking logic, just one more thing reacting to a state change it already exposes."],
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
          question: "\"Why pessimistic locking here instead of optimistic?\"",
          answer:
            "\"Seat booking has high contention on popular shows specifically — the exact scenario this problem describes, many users converging on the same few seats at once — and the cost of a failed optimistic write (a user who filled in payment details only to be told 'sorry, someone else got it' after the fact) is a worse user experience than being told immediately that a seat is already held. Pessimistic locking fits high-contention, high-cost-of-conflict problems; optimistic fits low-contention ones where retrying is cheap.\"",
        },
        {
          kind: "qa",
          question: "\"How is this different from what the Workshop's Movie Ticket Booking scenario teaches?\"",
          answer:
            "\"That scenario is entirely about capacity — an undersized database connection pool that starts rejecting requests once traffic spikes, fixed by scaling infrastructure (more connections, a cache, a queue). It never asks whether two users could book the same seat; it assumes correctness and asks whether the system stays *available*. This lesson assumes the infrastructure has enough capacity and asks the opposite question: does the code itself guarantee correctness under concurrent access, independent of how much capacity exists.\"",
        },
      ],
    },
  ],
  summary:
    "Movie Ticket Booking's real interview content is the double-book race condition, not the class diagram around it: two users racing to lock the same seat need the read-check-write sequence to be atomic, which synchronized methods provide within one process and a database row lock or distributed lock (Redis) provides across many. Pessimistic locking fits this problem's high-contention, high-cost-of-conflict shape better than optimistic locking would. Seat delegates to a State (AVAILABLE/LOCKED/BOOKED) — the same pattern Elevator System already established — and this project's own Workshop scenario of the same name explores the complementary infrastructure-capacity question this lesson deliberately doesn't.",
  keyTakeaways: [
    "The actual hard problem is the double-book race: two users reading AVAILABLE and both proceeding to lock the same seat needs an atomic read-check-write, not just a status field.",
    "Pessimistic locking (synchronized / DB row lock) fits high-contention, high-cost-of-conflict problems like seat booking better than optimistic locking (version-check-and-retry).",
    "synchronized alone only guarantees correctness within one process — a multi-instance deployment needs the lock's state to live in shared external storage (a DB row lock or a distributed lock service).",
    "Naming the single-JVM limitation before being asked is what an interviewer is listening for — self-awareness about a design's own boundaries, not just a working answer.",
    "This project's own Workshop scenario of the same name explores the complementary infrastructure-capacity question (does the system stay available under load) — this lesson deliberately assumes capacity and designs for correctness instead.",
  ],
  exercise: {
    prompt:
      "A new requirement: a user should be able to hold seats for up to three different shows simultaneously while deciding, but the system must prevent any single seat from being locked by more than one user account at once (a user can't 'hoard' the same seat under two different sessions either). Does the Seat.tryLock design from this lesson already satisfy the second half of this requirement? Explain why or why not.",
    guidance: [
      {
        kind: "list",
        items: [
          "**Cross-session lock on the same seat — already satisfied.** `tryLock`'s check is against `status` and `lockedByUserId` regardless of which session initiated the call, so a second lock attempt for the same seat under the same `userId` from a different session would still be evaluated as 'is this seat AVAILABLE or lock-expired' and would return false if the seat is already LOCKED by that same `userId` from another session — unless the intent is that a user's own second session should be allowed to take over their own held seat, a genuinely different requirement worth clarifying explicitly, per Lesson 5's step-1 discipline, rather than assumed either way.",
          "**Holding seats across three different shows simultaneously — already free.** Each `Show` owns its own independent `Seat` objects, so locks on seats belonging to different `Show` instances never interact at all.",
        ],
      },
    ],
  },
};
