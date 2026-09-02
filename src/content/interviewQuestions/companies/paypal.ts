import type { InterviewQuestion } from "../types";

/**
 * PayPal — researched 2026-08-24, see `docs/interview_exp.md` for the full
 * research log and the complete list of what was found. PayPal's public
 * trail is much thinner than Big Tech's — Exponent's own company-filtered
 * question DB has only 3 items total — so this file is a small subset (5)
 * of a 15-item general-bucket catalog. Same ship bar as every other
 * company here: a bare "Design a payment gateway." is a real reported
 * topic (and stays in the tracker), but it reads as a topic label, not a
 * question a candidate could actually sit down and answer — so it doesn't
 * ship to this practice UI. The `claude-in-chrome` browser was unavailable
 * for this research pass, so every LeetCode/Glassdoor-sourced question
 * below is capped at "medium" confidence (reached via search snippet, not
 * a full page reread) — see each `source.note`.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a
 * transcript to memorize. These are authored by reasoning through each
 * problem the way a strong candidate would, not sourced from a specific
 * candidate's actual answer — unlike `prompt`/`context`, which are
 * sourced and cited, `optimalAnswer` is this app's own content.
 */
export const PAYPAL_QUESTIONS: InterviewQuestion[] = [
  {
    id: "paypal-irctc-ticket-booking",
    company: "PayPal",
    title: "Design a ticket-booking system like IRCTC",
    prompt:
      "Design a ticket-booking system like IRCTC. Prevent double-booking of seats under concurrent demand, and optimize search queries for seat availability.",
    category: "system-design",
    tags: ["ticketing-inventory"],
    level: "SDE2",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-experience/6986184/",
      confidence: "medium",
      note: "Reached via search snippet; direct page fetch returned 403 and the claude-in-chrome browser was unavailable this pass, so the exact wording wasn't independently reread.",
    },
    context: "Reported follow-up discussion covered concurrency, caching, and indexing in depth.",
    optimalAnswer: {
      clarifyingQuestions: [
        "What's the scale of a hot sale — how many trains/seats, and how many users hit \"search\"/\"book\" in the first minute of tatkal-style booking opening?",
        "Is inventory seat-level (specific berth/seat) or class-level (just a count per class)?",
        "Does search need to be real-time-accurate, or is a few seconds of staleness acceptable for availability counts?",
        "Is there a waitlist/RAC (partial confirmation) concept, or just confirmed-or-nothing?",
      ],
      requirements: [
        "No double-booking — hard correctness constraint even under massive concurrent demand for the same seat",
        "Fast search: given a route/date, return seat availability quickly across many trains/classes",
        "Fair-ish booking under a flash-demand spike (tatkal-style windows)",
        "System stays responsive under load vastly exceeding available inventory",
      ],
      approach:
        "Split this into two very different problems with very different consistency needs: search (read-heavy, can tolerate slight staleness) and booking (write-path, must be strictly correct) — solving them with the same mechanism is the most common way this design goes wrong.",
      keyPoints: [
        "Search path: serve availability counts from a denormalized, frequently-refreshed read cache (per train/date/class) — this is what absorbs the read-heavy query volume without hitting the booking system of record on every search",
        "Booking path: claim a specific seat with an atomic conditional write (compare-and-swap on seat status, or a short-TTL per-seat lock) against the source-of-truth store — this is the actual correctness mechanism preventing a seat from being sold twice",
        "Model each seat as a small state machine: available → held → booked, with held → available on payment timeout",
        "For class-level (not seat-level) inventory, decrement a single atomic counter per train/class instead of locking individual seats — far less contention than seat-level locking when the seat identity doesn't matter yet",
        "Shard the booking store by train id (or train+date) so a hot train during a tatkal window doesn't contend with unrelated trains",
        "Put a queue/rate-limited admission gate in front of the booking write path during a known high-demand window (tatkal opening) so the backend never has to absorb the full instantaneous spike",
        "Async-update the search cache after each successful booking rather than synchronously on every write — search staleness of a few seconds is an acceptable trade for keeping the booking path's latency low",
      ],
      tradeoffs: [
        "Seat-level locking vs. class-level counters — seat-level gives passengers a specific seat immediately but creates far more contention; class-level counters scale better and defer seat assignment to a cheaper background step",
        "Strongly consistent search vs. cached/eventually-consistent search — a booking system's search should almost always be eventually consistent, since the booking path itself is the actual correctness boundary, not the search results",
        "Pessimistic per-seat locking vs. optimistic compare-and-swap on booking attempt — CAS scales better under typical contention, but a single hot class-level counter can itself become a contention point that may need sharding",
      ],
      followUps: [
        "How would you add a waitlist/RAC tier that promotes automatically as confirmed seats are cancelled?",
        "How do you stop the same user from holding seats on multiple trains simultaneously during a tatkal window?",
        "How does the design change if refunds/cancellations need to reflow into availability in real time?",
      ],
      relatedLinks: [
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
        { label: "Foundations: Caching", href: "/foundations/caching" },
        { label: "Build it: Concert Ticket Drop scenario", href: "/workshop?scenario=concert-ticket-drop" },
      ],
    },
  },
  {
    id: "paypal-payment-service-send-money",
    company: "PayPal",
    title: "Design a payment service to handle sending money",
    prompt:
      "Design a payment service to handle sending money between users. Cover functional and non-functional requirements, high-level design, API design, database schema, and a flowchart of the request path.",
    category: "system-design",
    tags: ["payments-idempotency"],
    level: "SDE2",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-experience/6068980/Paypal-or-Software-Engineer-or-SDE2-or-Chennai",
      confidence: "medium",
      note: "Reached via search snippet; direct page fetch returned 403 and the claude-in-chrome browser was unavailable this pass, so the exact wording wasn't independently reread.",
    },
    context: "Reported from a Chennai-based SDE2 round; the same round separately asked the candidate to design an Elevator System.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is this a wallet-style transfer (balances held inside the system) or does it also need to touch external bank rails?",
        "What's the consistency requirement — can a sender's balance ever be double-spent under concurrent transfer requests?",
        "Does the client retry on a timeout, and if so, how do we avoid double-charging on retry?",
        "What's the expected transfer volume and peak concurrency per user?",
      ],
      requirements: [
        "Users can send money to other users; balances must never go negative or be double-spent",
        "Every transfer is atomic — either fully applied (debit + credit) or not applied at all",
        "Idempotent under client retries — a retried request must not double-charge",
        "Full transaction history per user, queryable",
        "Low latency on the transfer path, since this is a user-facing synchronous action",
      ],
      approach:
        "This is fundamentally a double-entry ledger problem wearing a \"send money\" UI — design the ledger and its correctness guarantees first, then the API/schema fall out naturally.",
      keyPoints: [
        "Model money movement as a double-entry ledger: every transfer writes two linked entries (debit sender, credit receiver) in a single atomic transaction — never mutate a single \"balance\" column in place without a paired, auditable entry",
        "Require an idempotency key on every transfer request (client-generated or derived), and check it against a fast lookup (e.g. Redis) before processing — a retried request with the same key returns the original result instead of re-executing",
        "Use a database transaction with row-level locking (or a compare-and-swap on account version) to make debit+credit atomic and prevent a race between two concurrent transfers draining the same account below zero",
        "API surface: `POST /transfers` (idempotent, takes sender, receiver, amount, idempotency key) returns a transfer id and status; `GET /accounts/{id}/transactions` for history — keep the write API narrow and single-purpose rather than a generic \"update balance\" endpoint",
        "Schema: an `accounts` table (balance, version), a `transactions`/`ledger_entries` table (append-only, transfer id, account id, amount, direction, timestamp) — the ledger table is the source of truth; `accounts.balance` is a derived/cached value that can be reconstructed from it",
        "Flow: client → API gateway → payment service validates + acquires idempotency lock → DB transaction (debit, credit, ledger entries) → commit → async-publish a transfer-completed event for notifications/analytics, kept off the synchronous critical path",
      ],
      tradeoffs: [
        "Storing a mutable `balance` column vs. deriving balance purely from summing ledger entries — a cached balance column is much faster to read but must be kept correct via the same transaction that writes the ledger; a pure sum-of-entries design is simpler to reason about but slow at scale without materialized aggregates",
        "Synchronous notification/analytics on the transfer path vs. publishing an async event — synchronous is simpler but couples an unrelated concern's latency/availability to the money-movement path; async decouples but adds eventual-consistency for anything downstream",
        "Idempotency key required by the client vs. server-generated dedup by request fingerprint — client-supplied keys are more reliable for network-level retries but require the client to get key-reuse discipline right",
      ],
      followUps: [
        "How would this extend to cross-currency transfers?",
        "How do you reconcile the ledger against a payment processor's own records if they ever disagree?",
        "What happens if the database transaction commits but the response to the client is lost — how does the client safely retry?",
      ],
      relatedLinks: [
        { label: "LLD: Case Study — Elevator System", href: "/lld/elevator-system" },
        { label: "Foundations: Database Replication", href: "/foundations/database-replication" },
        { label: "Foundations: SQL Deep Dive", href: "/foundations/sql-deep-dive" },
      ],
    },
  },
  {
    id: "paypal-parking-lot-multi-floor-t24",
    company: "PayPal",
    title: "Design a parking lot system (multi-floor, multiple vehicle types)",
    prompt:
      "Design a parking lot system with multi-floor support, online booking of parking slots, handling of multiple vehicle types, a scalable architecture, and a justified choice of database.",
    category: "system-design",
    tags: ["parking-lot-lld"],
    level: "SE3 / T24",
    source: {
      name: "roundz.substack.com",
      url: "https://roundz.substack.com/p/interview-experience-paypal-software-engineer-se3-t24",
      confidence: "high",
      note: "Full page fetched successfully — Substack isn't behind the same bot-block LeetCode/Glassdoor returned this pass.",
    },
    context:
      "Bangalore, Round 4 (~60 minutes, rated Hard). Interviewer emphasized end-to-end thinking — from how the user interacts with the system to how the data flows and gets stored. The candidate was ultimately rejected, with feedback citing gaps in a separate machine-coding round (missing design patterns, exception handling, and idempotency handling).",
    optimalAnswer: {
      clarifyingQuestions: [
        "How many floors and roughly how many spots per floor — does the design need to reason about a specific scale, or stay general?",
        "Which vehicle types (motorcycle, car, bus/truck), and do larger vehicles need multiple adjacent spots or a dedicated spot size?",
        "Is booking a reservation ahead of arrival, or purely walk-in with online payment at entry/exit?",
        "Does pricing vary by duration, vehicle type, or floor/spot type?",
      ],
      requirements: [
        "Multi-floor parking lot with distinct spot types per vehicle size",
        "Online booking — a user can reserve a spot before arriving",
        "No double-booking of the same physical spot",
        "Scalable architecture, with a justified database choice",
      ],
      approach:
        "Treat this as two coupled subsystems: an object model for the physical lot (floors, spots, vehicle-to-spot-size matching) and a booking/reservation flow with the same atomic-claim discipline any inventory-booking system needs — the interviewer's framing (\"how the user interacts, how data flows and gets stored\") is explicitly asking you to connect both halves, not just model classes in isolation.",
      keyPoints: [
        "Model `ParkingLot` → `Floor` → `Spot`, where each `Spot` has a `SpotType` (motorcycle/compact/large) — vehicle-to-spot matching is a simple compatibility rule (a car can't fit a motorcycle spot, a motorcycle can use any larger spot at some inefficiency), not a complex allocation algorithm",
        "Claim a spot via an atomic conditional update (compare-and-swap on spot status: available → reserved) — this is the correctness mechanism preventing two users from booking the same physical spot",
        "For search (\"find me an available compact spot on any floor\"), maintain a per-floor, per-type available-count as a fast-read aggregate, updated on each claim/release — avoids scanning every spot on every search",
        "A reservation has a hold window (arrive within N minutes or the spot releases) — same held-state-with-timeout pattern as any ticketing/booking system",
        "Database choice: a relational database (spot state needs strict consistency for the claim operation, and the schema — floors, spots, reservations, vehicles — is naturally relational with foreign keys); an in-memory cache layer in front for the available-count aggregates that back search, refreshed on each write",
        "Scale out by sharding per parking-lot location (each physical lot's spots are independent of every other lot's) — there's no cross-lot query that needs global coordination",
      ],
      tradeoffs: [
        "Exact per-spot booking vs. a capacity-counter-only model (reserve \"a compact spot,\" assign the physical one at arrival) — per-spot booking gives the user certainty ahead of time but adds contention; a counter-first model with late spot assignment scales better and is usually what real garages do",
        "Relational DB for spot/reservation state vs. a NoSQL store — relational wins here because correctness (no double-booking) and relational structure (floors→spots→reservations) both favor it; NoSQL would mostly help if the write volume from spot-state changes became the bottleneck, which is unlikely at typical garage scale",
        "Sharding by lot vs. a single shared spot-inventory table — sharding by lot is simpler to reason about and scales linearly with more locations, at the cost of no built-in cross-lot query",
      ],
      followUps: [
        "How would you extend this to dynamic/surge pricing by time of day?",
        "How do you handle a vehicle that overstays its reservation?",
        "How would you support finding the nearest available lot across many physical locations?",
      ],
      relatedLinks: [
        { label: "LLD: Case Study — Parking Lot", href: "/lld/parking-lot" },
        { label: "Build it: Parking Reservation Platform scenario", href: "/workshop?scenario=parking-reservation-platform" },
        { label: "Foundations: SQL Deep Dive", href: "/foundations/sql-deep-dive" },
      ],
    },
  },
  {
    id: "paypal-parking-garage-ai-monitor",
    company: "PayPal",
    title: "Design a parking garage with an AI monitor that detects car entry",
    prompt:
      "Design a system for a parking garage with an AI monitor that can recognize when a car gets in.",
    category: "system-design",
    tags: ["parking-lot-lld", "ai-ml-infra"],
    level: "Software Engineer I",
    source: {
      name: "Glassdoor",
      url: "https://www.glassdoor.com/Interview/PayPal-Software-Engineer-I-Interview-Questions-EI_IE9848.0,6_KO7,26.htm",
      reportedDate: "~Mar 2024",
      confidence: "medium",
      note: "Reached via search snippet; direct page fetch returned 403 and the claude-in-chrome browser was unavailable this pass, so the exact wording wasn't independently reread.",
    },
    context: "Reported from a San Jose, CA on-site round.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is the \"AI monitor\" a black-box service this design just needs to integrate with (a camera + inference endpoint that emits car-detected events), or does the design need to include the detection model itself?",
        "How many entry lanes/garages does this need to scale to?",
        "What's the acceptable false-positive/false-negative rate for detection — does a missed detection just mean a manual fallback, or a real correctness problem for billing?",
        "Does detecting entry need to also identify the vehicle (license plate) for automated billing, or just count occupancy?",
      ],
      requirements: [
        "An AI/vision component detects when a car enters (and, implicitly, exits) each monitored point",
        "The system reacts to that detection — updating occupancy, opening a gate, starting a billing session, etc.",
        "Must handle multiple lanes/garages reliably",
        "Should degrade gracefully if the detection pipeline is briefly unavailable",
      ],
      approach:
        "Treat the AI detector as a sensor emitting events into a pipeline, not as something the core system logic needs to know the internals of — the interesting system-design surface is how detection events flow into state changes (gate control, occupancy, billing), not the computer-vision model itself.",
      keyPoints: [
        "Each camera/lane runs (or streams to) an inference service that emits a lightweight `car-entered` / `car-exited` event with a lane id and timestamp — this is the clean boundary between \"AI monitor\" and the rest of the system",
        "Events flow through a message queue rather than a direct synchronous call — this decouples the detection pipeline's latency/availability from the core system, and lets multiple consumers (gate control, occupancy counter, billing) react independently to the same event",
        "Gate control is the latency-sensitive consumer — it needs a fast, dedicated path from detection event to gate-open action, ideally colocated with the lane rather than routed through a distant central service",
        "Occupancy count and billing session start are less latency-sensitive and can consume the same event asynchronously — updating a per-garage occupancy aggregate and, if the design needs automated billing, correlating entry+exit events by vehicle/lane into a session",
        "Design for false negatives explicitly: if the camera fails to detect an exit (occlusion, lighting), the system needs a fallback (a maximum-session-length timeout, or a manual override) rather than assuming a car that never \"exited\" is still there forever",
        "Keep the detection model itself out of the system's own service boundary if it's a black-box capability — treat it as an external dependency with its own SLA that this design integrates with, not something the design needs to train or host",
      ],
      tradeoffs: [
        "Synchronous detection→gate-control call vs. event-driven pub/sub — synchronous is simpler and lower-latency for the single gate-control use case, but pub/sub is what lets billing/occupancy consume the same signal without adding load or coupling to the latency-critical gate path",
        "Per-lane local inference vs. a centralized vision service all cameras stream to — local/edge inference cuts gate-open latency and reduces bandwidth, at the cost of harder fleet-wide model updates; centralized is simpler to update but adds network latency and a single point of failure for every lane",
        "Trusting a single detection event vs. requiring entry+exit correlation before billing — billing off a single \"entered\" event risks charging for a car that immediately left (a false positive); requiring a matched exit event is safer but needs a session-timeout fallback for missed exits",
      ],
      followUps: [
        "How would you handle two cars entering the same lane close together (tailgating) that the camera might miss as one event?",
        "How would you extend this to reconcile physical occupancy with parking-spot inventory from a booking system?",
        "What's your fallback if the camera/inference service goes down entirely — does the garage stop functioning, or degrade to manual entry?",
      ],
      relatedLinks: [
        { label: "LLD: Case Study — Parking Lot", href: "/lld/parking-lot" },
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
      ],
    },
  },
  {
    id: "paypal-notification-system-idempotency",
    company: "PayPal",
    title: "Design a notification system (from a social-media-site prompt)",
    prompt:
      "The round started as \"design a social media site\" and evolved into designing its notification system — covering idempotency, scalability, caching, load balancers, regional load balancers, replication, and message queues.",
    category: "system-design",
    tags: ["notifications", "payments-idempotency"],
    source: {
      name: "Glassdoor (PayPal Software Engineer interview-question pages)",
      url: "https://www.glassdoor.com/Interview/PayPal-Software-Engineer-Interview-Questions-EI_IE9848.0,6_KO7,24.htm",
      confidence: "medium",
      note: "Reached via a cross-thread search-index summary; no single Glassdoor page was independently confirmed via direct fetch (403, and the claude-in-chrome browser was unavailable this pass).",
    },
    context:
      "The interviewer reportedly steered a broad \"design a social media site\" prompt specifically toward the notification path, then probed each of the listed concepts in turn.",
    optimalAnswer: {
      clarifyingQuestions: [
        "What triggers a notification — likes/comments/follows, or does this also need to cover push-to-mobile-device delivery?",
        "Does delivery need to be exactly-once, or is at-least-once with client-side dedup acceptable?",
        "What's the fan-out shape — does one action (e.g. a celebrity posting) need to notify millions of followers?",
        "Multi-region: do users in different regions need low-latency notification delivery, or is some cross-region lag acceptable?",
      ],
      requirements: [
        "Deliver notifications triggered by user actions (likes, comments, follows, etc.)",
        "Idempotent delivery — a retried or duplicated event must not double-notify the user",
        "Scale to high fan-out (one action can generate notifications for many recipients)",
        "Low-latency, multi-region-aware delivery",
        "Resilient to a downstream delivery provider (push/email) being temporarily unavailable",
      ],
      approach:
        "Split the pipeline into three stages with different scaling/consistency needs — event ingestion, fan-out, and delivery — and put a message queue between each stage so a slow or failing downstream (like a flaky push provider) never backs up event ingestion.",
      keyPoints: [
        "Event ingestion: the action that triggers a notification (a like, a comment) publishes a lightweight event onto a queue — the producing service doesn't wait for notifications to actually be delivered, keeping the user-facing action fast",
        "Fan-out worker: consumes the event, resolves the recipient list (a single user for a comment, potentially millions of followers for a celebrity action), and writes one per-recipient notification record — this is the step that needs to scale horizontally the most, since fan-out volume is the multiplier",
        "Idempotency: tag every notification with a deterministic key (event id + recipient id) and check it against a fast store (e.g. Redis) before writing/delivering — a redelivered or duplicated upstream event then produces the same key and is a no-op on retry",
        "Delivery: a separate worker pool reads pending notifications and pushes to the actual channel (mobile push, in-app, email) — decoupled from fan-out so a slow/down push provider doesn't stall fan-out for other channels",
        "Caching: cache each user's unread-notification count and recent-notifications list (read-heavy, checked on nearly every app open) rather than recomputing from the full notification table on every request",
        "Regional load balancers + replication: route each user's read/write traffic to their nearest region, with the underlying notification store replicated across regions so a user's device can fetch their notification feed with low latency regardless of where the triggering action originated",
      ],
      tradeoffs: [
        "Synchronous notification delivery vs. queue-based async fan-out — synchronous is simpler but couples the fast user-facing action (posting a like) to the delivery pipeline's latency/availability; async is the only way to survive celebrity-scale fan-out without slowing down the triggering action",
        "Push-per-event vs. batched/coalesced notifications (\"Alice and 12 others liked your post\") — coalescing cuts notification volume and delivery cost dramatically at high fan-out, at the cost of a short aggregation delay before the first notification goes out",
        "Global idempotency store vs. per-region — a single global store simplifies correctness but becomes a cross-region dependency on every write; per-region stores with async reconciliation scale better but reopen a narrow window for a cross-region duplicate",
      ],
      followUps: [
        "How would you coalesce multiple rapid-fire notifications (10 likes in 5 seconds) into one delivered notification?",
        "How does the design change for a celebrity account with 50 million followers posting once?",
        "What happens if the push-notification provider itself is down for 10 minutes — does the design retry, drop, or queue for later?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Load Balancers", href: "/foundations/load-balancers" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Foundations: Database Replication", href: "/foundations/database-replication" },
      ],
    },
  },
];
