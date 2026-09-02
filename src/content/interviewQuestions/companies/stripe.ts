import type { InterviewQuestion } from "../types";

/**
 * Stripe — researched 2026-08-24, see `docs/interview_exp.md` for the full
 * research log and the complete list of what was found. This file is
 * deliberately a small subset of that research: only questions with a
 * real, expansive prompt — specific requirements, numbers, constraints,
 * or a concrete narrative — make it in here. A one-line imperative like
 * "Design a ledger." is a real reported topic (and stays in the tracker
 * doc), but it reads as a topic label, not a question a candidate could
 * actually sit down and answer — so it doesn't ship to this practice UI.
 * See the tracker's "Shipped to app" note for the full before/after list
 * and reasoning.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a
 * transcript to memorize. These are authored by reasoning through each
 * problem the way a strong candidate would, not sourced from a specific
 * candidate's actual answer — unlike `prompt`/`context`, which are
 * sourced and cited, `optimalAnswer` is this app's own content.
 */
export const STRIPE_QUESTIONS: InterviewQuestion[] = [
  {
    id: "stripe-webhook-delivery-noisy-neighbor-ssrf",
    company: "Stripe",
    title: "Design Stripe's webhook delivery system",
    prompt:
      "Design a system that receives internal events, finds each merchant's registered webhook URL, and delivers an HTTP POST to their server — at 10,000 events per second globally, with guaranteed delivery attempts. Follow-ups the interviewer pushed on for 45 minutes: (1) a merchant's endpoint consistently returns 500 errors — how do you retry without blocking events for everyone else? (2) one merchant's underprovisioned server accepts connections but hangs for 30 seconds before timing out — how do you stop that one merchant from saturating your worker pool? (3) merchants provide arbitrary callback URLs — how do you prevent SSRF, including a DNS-rebinding attack where a domain resolves to a public IP at validation time but an internal IP when the HTTP client actually connects? (4) an accounting-platform merchant needs exactly-once delivery so a charge is never double-recorded — is that actually achievable?",
    category: "system-design",
    tags: ["fanout-feed", "abuse-content-moderation"],
    level: "Onsite, backend role",
    source: {
      name: "Medium",
      url: "https://medium.com/@emilyhustlenyc/every-question-i-was-asked-in-stripes-system-design-interview-f6f19c2e62d6",
      reportedDate: "2026",
      confidence: "high",
      note: "First-person account, full article retrieved (via a reader-mode fetch after a direct fetch of medium.com was blocked — no browser session was available this pass; content was confirmed complete and consistent, not a search snippet). Same author who wrote the first-person Uber surge-pricing account shipped in this tracker's Uber pass.",
    },
    context:
      "Candidate's initial architecture (Kafka topics → consumer services → Postgres lookup of the merchant's webhook URL → Redis-backed Celery queue → worker pool doing the HTTP POSTs) was accepted as a reasonable happy-path design. She answered (1) correctly (exponential backoff: 1 min → 5 min → 1 hour → up to 3 days, failed events re-queued at the tail rather than blocking new ones) and (4) completely (network delivery can only be at-least-once, never exactly-once — push idempotency onto the receiver via a unique event ID they store and de-dupe against). She stumbled on (2), initially proposing only a fixed HTTP timeout, which the interviewer pointed out still saturates a shared connection pool at volume — the intended answer was per-merchant circuit breakers routing a consistently-slow or -erroring merchant to an isolated \"slow queue\" (or dropping them) rather than letting them consume shared worker capacity. She also stumbled on (3), initially proposing to resolve-then-validate the domain's IP, which the interviewer noted doesn't stop DNS rebinding — the intended fix is to resolve once, validate that IP is public, then force the HTTP client to connect directly to that already-validated IP (passing the original domain via the Host header) rather than letting the client re-resolve DNS a second time. She was rejected 3 days later with feedback that her \"initial architecture was sound, but ability to reason about failure domains and system abuse was not at the level we needed\" — her own conclusion was that she'd designed for a data-flow exercise instead of a reliability exercise.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is delivery order per-merchant required, or is out-of-order delivery acceptable as long as each event carries enough info to reconcile?",
        "What's the expected retry ceiling before giving up entirely and surfacing the failure to the merchant?",
        "Do merchants need a way to replay/re-fetch historical webhook deliveries, or just receive new ones?",
        "Is there a signature/auth mechanism merchants use to verify a webhook actually came from us?",
      ],
      requirements: [
        "Deliver an HTTP POST to a merchant's registered URL for every relevant internal event, at up to 10K events/sec globally",
        "Retry failed deliveries with bounded, increasing backoff rather than giving up immediately",
        "One slow or broken merchant endpoint must not degrade delivery to any other merchant",
        "Reject requests to internal/private network ranges, including against DNS-rebinding attempts",
        "Give receivers what they need to de-duplicate a delivery that was retried",
      ],
      approach:
        "Treat this explicitly as a reliability problem, not a data-flow problem: the happy-path pipeline (queue in, HTTP out) is the easy 10% — the actual design is in how failures, slow consumers, and malicious input are contained so they can't take down delivery for anyone else.",
      keyPoints: [
        "Events land on a durable queue (Kafka) partitioned so per-merchant ordering can be preserved if needed, decoupling ingestion from the delivery workers entirely",
        "Per-merchant delivery isolation: rather than one shared worker pool and a global timeout, wrap each merchant's delivery attempts in a circuit breaker — repeated timeouts/errors trip it, routing that merchant's events to an isolated slow-lane (or a dead-letter path) instead of tying up capacity everyone else needs",
        "Exponential backoff with a cap on total retry duration (e.g. minutes → hours → days) before an event is marked permanently failed and surfaced to the merchant via a dashboard/API rather than retried forever",
        "SSRF defense: resolve the merchant's callback domain once, verify the resolved IP is public/non-reserved, then have the HTTP client connect directly to that validated IP (setting the Host header to the original domain) so a second, attacker-controlled DNS resolution can never happen mid-request",
        "Every delivery includes a unique, stable event ID in the payload — the receiver's own responsibility to de-dupe against it, since the network can only guarantee at-least-once delivery, never exactly-once",
        "Delivery attempts and outcomes are logged per-event so merchants (and support) can see delivery/replay history, not just a black box",
      ],
      tradeoffs: [
        "A single shared worker pool with a per-request timeout vs. per-merchant circuit breakers — a shared pool is simpler but lets one bad merchant starve everyone; isolation costs more bookkeeping (per-merchant state) but is what actually contains a noisy neighbor",
        "Resolve-then-connect-by-domain vs. resolve-once-then-connect-by-IP — resolving by domain on every request is simpler but reopens the DNS-rebinding hole every single call; pinning to the validated IP closes it at the cost of needing to handle the (rare) case of a legitimately rotating IP within a request's lifetime",
        "Exactly-once delivery vs. at-least-once + receiver-side idempotency — chasing exactly-once at the transport layer is not achievable over an unreliable network; pushing de-dup responsibility to the receiver via an event ID is simpler and is what every major webhook provider actually does",
      ],
      followUps: [
        "How would you let a merchant safely replay all webhooks from a specific time window?",
        "How do you handle a spike where one internal event fans out to millions of merchants at once (e.g. a platform-wide policy change)?",
        "How would you version the webhook payload schema without breaking merchants who haven't updated their integration?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Circuit Breakers", href: "/foundations/circuit-breakers" },
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
        { label: "Build it: Newsletter Send Confirmations scenario", href: "/workshop?scenario=newsletter-send-confirmations" },
      ],
    },
  },
  {
    id: "stripe-payments-api-idempotent-charge",
    company: "Stripe",
    title: "Design the core of Stripe's payments API — charging a card exactly once",
    prompt:
      "Design the core of a payments API. A merchant wants to charge a card — walk through the request end to end, at a few thousand requests per second, with an authorization response required in under 500-800ms. Scope is authorization (not settlement/capture beyond that). Follow-up: what happens if a client retries the exact same charge request — say the retry lands on a different server instance than the first attempt, and the first attempt is still in flight, hasn't yet written its idempotency record, when the retry arrives? Or the database write fails after the card network has already authorized the charge — how do you avoid either double-charging the customer or losing track of money the network already moved?",
    category: "system-design",
    tags: ["payments-idempotency"],
    level: "Onsite (retaken after an initial rejection)",
    source: {
      name: "Medium",
      url: "https://medium.com/h7w/the-stripe-system-design-question-that-separates-senior-from-staff-engineers-ecb9a98af1fd",
      reportedDate: "2026",
      confidence: "high",
      note: "First-person account (author failed this round, then returned roughly six months later and passed with a stronger answer), full article retrieved via a reader-mode fetch after medium.com direct-fetch was blocked (no browser session available this pass).",
    },
    context:
      "The author frames this as the question that separates Senior from Staff answers: a Senior-level answer typically stops at a Redis-backed idempotency-key cache check plus standard scaling patterns (load balancer, sharded DB, webhooks for async status). A Staff-level answer goes further — a durable state machine for the charge with a transactional upsert on the idempotency key (so the race between two concurrent attempts for the same key is resolved by the database, not by a check-then-act race in application code), double-entry bookkeeping so the ledger stays correct even under partial failure, an outbox pattern so a webhook notification can't be lost if the process crashes right after the DB commit, and a background reconciliation job that catches the specific case of \"card network says authorized, our database write failed\" and resolves it rather than leaving money in an inconsistent state.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is idempotency scoped to a client-supplied key, or does the system need to derive equivalence some other way?",
        "What should happen to the client while the very first attempt for a given idempotency key is still in flight and a retry arrives?",
        "Is settlement/capture in scope, or only authorization, for this round?",
        "What's the source of truth if the card network's response and our own database ever disagree?",
      ],
      requirements: [
        "Authorize a card charge within a strict latency budget (under ~500-800ms) at a few-thousand-RPS sustained load",
        "The exact same logical charge request, retried, must never result in two authorizations against the customer",
        "A request that fails midway — after the card network has already authorized, before our own write commits — must not silently lose that authorization",
        "The system must be reasoned about in terms of correctness under partial failure, not just the happy path",
      ],
      approach:
        "Model the charge as a durable state machine keyed by an idempotency key, and make every transition an atomic, transactional write — so \"what happens on a retry\" and \"what happens on a partial failure\" are answered by the data model itself, not by ad hoc application-level checks that can race.",
      keyPoints: [
        "A charge_attempts table keyed by (merchant_id, idempotency_key) with a unique constraint — the very first insert for a given key wins; a concurrent second attempt for the same key gets a constraint violation and is told to poll/wait for the first attempt's result instead of starting a second one",
        "State machine per charge: created → authorizing → authorized/declined → (later) captured/failed, each transition a single atomic DB write, so a retry that arrives mid-flight sees a specific, well-defined state rather than an ambiguous one",
        "On the specific race the interviewer probed — network authorizes but the DB write fails — the write path itself uses an outbox-style pattern: the authorization call to the card network and the local state transition are treated as two steps that must reconcile, with a background job that periodically checks any charge stuck in \"authorizing\" for too long against the card network's own record and resolves it either way",
        "Double-entry ledger entries (debit/credit pair) are written in the same transaction as the charge's own state transition, so the ledger and the charge's status can never drift apart from each other even if something downstream fails",
        "Webhooks/notifications to the merchant go through an outbox table written in the same transaction as the state change, drained by a separate process — this guarantees a notification is never lost just because the process crashed right after committing",
        "Scale the hot authorization path (few-thousand RPS, tight latency budget) separately from the reconciliation/ledger-reporting path — the former needs to be fast and simple, the latter can run asynchronously and do more expensive consistency checks",
      ],
      tradeoffs: [
        "A check-then-insert idempotency check in application code vs. a unique constraint the database enforces — application-level check-then-act has an inherent race under concurrency; letting the database's unique constraint be the actual arbiter removes that race entirely, at the cost of needing to handle constraint-violation errors as a normal, expected code path rather than an exception",
        "Optimistic client-side retry with no idempotency key vs. mandatory idempotency keys — no key is simpler for the client but makes safe retries impossible to guarantee server-side; a mandatory key pushes a small integration burden onto the client in exchange for a real correctness guarantee",
        "Synchronous reconciliation on every request vs. an async background reconciliation job — checking every charge's true state against the card network synchronously would blow the latency budget; async reconciliation accepts a short window of \"authorizing\" ambiguity in exchange for keeping the hot path fast",
      ],
      followUps: [
        "How would you extend this to support partial captures (charging less than the originally authorized amount)?",
        "How do you handle a card network response that arrives after your own reconciliation job already resolved the charge as failed?",
        "How would you shard the charge_attempts table as volume grows, and does that change the idempotency guarantee?",
      ],
      relatedLinks: [
        { label: "Foundations: SQL Deep Dive", href: "/foundations/sql-deep-dive" },
        { label: "Foundations: Database Replication", href: "/foundations/database-replication" },
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Build it: Checkout Timeout Mystery scenario", href: "/workshop?scenario=checkout-timeout-mystery" },
      ],
    },
  },
  {
    id: "stripe-internal-ledger-double-entry",
    company: "Stripe",
    title: "Design an internal ledger system for merchant transactions",
    prompt:
      "Design an internal ledger system that lets merchants record transactions and query account balances for their companies — account creation and management (with optional sub-accounts, multi-currency support, and metadata), idempotent atomic double-entry transactions, current and point-in-time balance queries, and transaction-history listing for reconciliation and auditing.",
    category: "system-design",
    tags: ["payments-idempotency"],
    level: "Reported at Senior, Staff, and Manager levels",
    source: {
      name: "Hello Interview community question database",
      url: "https://www.hellointerview.com/community/questions/internal-ledger-system/cm8lxn4te00033x68eynjv94p",
      reportedDate: "~2026 (dated reports: Staff, early Aug 2026; Senior, early Aug 2026; Senior, late Jul 2026)",
      confidence: "high",
      note: "Full page retrieved via a reader-mode fetch (no browser session available this pass). This question is tagged exclusively to Stripe on Hello Interview, with three separate dated candidate reports — Stripe's own materials (the Exponent \"Get a Job at Stripe\" blog, its dedicated system-design blog) independently and repeatedly describe some version of \"design a ledger/bookkeeping service\" as their single most recurring prompt, which corroborates this being a real, frequently-asked theme rather than a one-off. The prompt text itself is Hello Interview's own canonicalized write-up aggregated across those reports, not one candidate's verbatim wording.",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "Is this ledger the actual system of record for money movement, or a secondary read model built from a payments system that already exists?",
        "Do balances need to be correct read-your-own-write immediately after a transaction, or is a small propagation delay acceptable for the balance-query path?",
        "How are corrections (refunds, disputes, chargebacks) modeled — as edits to history, or as new offsetting entries?",
        "What's the expected transaction volume per account — mostly light accounts, or a few extremely hot ones?",
      ],
      requirements: [
        "Create and manage merchant accounts, including sub-accounts and multi-currency balances",
        "Record double-entry transactions (a debit and a matching credit) atomically and idempotently",
        "Answer both \"current balance\" and \"balance as of a specific point in time\" queries",
        "List/filter transaction history per account for reconciliation and audit",
      ],
      approach:
        "Treat correctness as the primary requirement and performance as secondary — this is the one domain where getting the numbers right matters more than getting them fast. Model money movement as immutable, append-only double-entry events, and derive every other view (current balance, point-in-time balance, history) from that log rather than mutating a balance field directly.",
      keyPoints: [
        "Every transaction writes exactly two ledger entries (one debit, one credit) to an append-only table in a single atomic transaction — a transaction is never \"half posted\"",
        "An idempotency key on each transaction request prevents the same client-submitted transaction from posting twice on retry",
        "Balances are never stored as a single mutable counter — \"current balance\" is either computed by summing an account's entries, or (for hot accounts) served from a periodically-refreshed materialized snapshot that's always reconcilable back against the raw entries",
        "Point-in-time balance queries are a range-sum over entries up to a given timestamp/sequence number — the append-only, timestamped log makes this a query, not a separate feature to build",
        "Hot-account contention (many concurrent transactions hitting the same account) is handled by serializing writes per account — e.g. partitioning by account ID so contention is isolated rather than global, plus optimistic concurrency to detect and retry conflicting writes rather than locking broadly",
        "A periodic reconciliation job verifies that every account's debits and credits still net to exactly zero across the whole ledger — this is the system's own self-check, independent of any individual transaction's correctness",
      ],
      tradeoffs: [
        "Storing a live mutable balance column vs. deriving balance from the entry log — a mutable column is a faster read but is exactly the kind of state that can silently drift from the true history under a bug or partial failure; deriving from (or snapshotting against) the immutable log keeps balance always reconcilable at the cost of more read-side complexity",
        "Correcting an entry in place vs. always posting an offsetting reversal entry — in-place correction is simpler but destroys the audit trail; an offsetting entry preserves a complete, tamper-evident history at the cost of the ledger never actually \"shrinking\"",
        "Global locking for transaction posting vs. per-account partitioning with optimistic concurrency — global locking is simplest to reason about but doesn't scale past a single hot shard; per-account partitioning scales but requires the reconciliation job to prove cross-partition correctness rather than a single lock guaranteeing it",
      ],
      followUps: [
        "How would you support a merchant with sub-accounts that need to roll up into one parent balance?",
        "How do you handle a currency conversion inside a single logical transaction without breaking the debit-equals-credit invariant?",
        "How would you migrate from an existing mutable-balance system to this model without downtime?",
      ],
      relatedLinks: [
        { label: "Foundations: SQL Deep Dive", href: "/foundations/sql-deep-dive" },
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
      ],
    },
  },
  {
    id: "stripe-ai-customer-support-agent",
    company: "Stripe",
    title: "Design an AI-powered customer support agent",
    prompt:
      "Design an AI-powered customer support agent that can understand a user's issue, retrieve relevant context, resolve common requests, and escalate complex cases to a human — while balancing accuracy, safety, latency, and customer trust.",
    category: "fde-agentic",
    tags: ["ai-ml-infra"],
    level: "Senior",
    source: {
      name: "Hello Interview community question database",
      url: "https://www.hellointerview.com/community/questions/ai-customer-support-agent/cmpy9mxg001qo09adnj64hc8i",
      reportedDate: "~Jun 2026",
      confidence: "high",
      note: "Full page retrieved via a reader-mode fetch (no browser session available this pass). Only one dated report so far (Senior, early Jun 2026) — thinner corroboration than the ledger question, but the prompt itself carries real scope (four explicit capabilities plus four explicit design tensions to balance), well past a bare title, and it's the only concrete `fde-agentic`-shaped find this pass. Independently plausible given Stripe's own recent, real \"Forward Deployed AI Accelerator\" job posting (confirmed via Stripe's careers listing and press coverage) — see this company's tracker entry for that role's details.",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "What's the blast radius of a wrong automated resolution — a misapplied discount, or something as consequential as an unauthorized refund?",
        "Does the agent need to act (issue a refund, cancel a subscription) or only inform/advise, with a human always executing the actual action?",
        "What counts as \"complex\" enough to escalate — a fixed rule set, a confidence threshold, or both?",
        "Is there an existing knowledge base / ticket history to retrieve from, or does that need to be built too?",
      ],
      requirements: [
        "Understand a user's support request well enough to classify intent and extract the relevant entities (order ID, account, etc.)",
        "Retrieve the specific account/order/policy context needed to act on that request, not just generic docs",
        "Resolve common, low-risk request types autonomously",
        "Escalate anything outside its confidence/authority to a human, with enough context that the human doesn't start from zero",
        "Stay within a latency budget acceptable for a live chat-style support interaction",
      ],
      approach:
        "Split the system into a bounded, auditable decision loop rather than one end-to-end model call: classify → retrieve → decide → (act or escalate), with an explicit policy layer gating any action that has real-world consequence, independent of how confident the underlying model is.",
      keyPoints: [
        "Intent classification and entity extraction happen first, against a small, well-defined taxonomy of support-request types — this bounds what the agent will even attempt, rather than letting an open-ended model decide scope on the fly",
        "Retrieval is scoped and structured: pull the specific customer's account/order/transaction records and the relevant policy documents for that request type, not a broad semantic search over everything — this both improves accuracy and shrinks the blast radius of a bad retrieval",
        "A policy/guardrail layer sits between \"the model recommends an action\" and \"the action executes\" — any action above a defined risk threshold (e.g. anything involving money movement) requires either a human-in-the-loop approval or falls outside what the agent is allowed to do autonomously at all, regardless of how confident the model's output looks",
        "Low-risk, well-understood request types (order-status lookups, resending a receipt, updating contact info) are auto-resolved directly; anything else defaults to a structured escalation — packaged with the classified intent, retrieved context, and the agent's own reasoning — so a human agent isn't starting the investigation over",
        "Every decision (auto-resolve vs. escalate, and the reasoning behind it) is logged for auditing and for building the feedback loop that improves the classification/retrieval steps over time",
        "Latency budget is met by keeping the hot path (classify + retrieve + decide) tight and running any heavier reasoning or verification asynchronously where the interaction allows for it (e.g. background verification before an already-queued auto-resolution actually executes)",
      ],
      tradeoffs: [
        "Letting the agent both decide and execute vs. always requiring human execution for anything consequential — full autonomy is faster for the customer but riskier; a human-in-the-loop gate on high-stakes actions trades some speed for a hard ceiling on how bad a model mistake can be",
        "A single large end-to-end model call vs. a structured classify→retrieve→decide pipeline — an end-to-end call is simpler to build but far harder to audit, guardrail, or debug when it goes wrong; a structured pipeline is more engineering work but makes each failure mode (bad classification, bad retrieval, bad decision) independently observable and fixable",
        "Confidence-threshold-based escalation vs. fixed-rule escalation — confidence thresholds adapt better as the model improves but are less predictable/explainable to a human reviewer; fixed rules are more predictable but need manual updates as new edge cases surface",
      ],
      followUps: [
        "How would you detect and contain a prompt-injection attempt embedded in a customer's message?",
        "How do you evaluate this system's quality on an ongoing basis, beyond just watching escalation rate?",
        "What happens if the retrieval step returns stale account data — how would you catch that before the agent acts on it?",
      ],
      relatedLinks: [
        { label: "Agentic AI: Tool Use Pattern", href: "/agentic/tool-use-pattern" },
        { label: "Agentic AI: Guardrails as Architecture", href: "/agentic/guardrails-as-architecture" },
        { label: "Agentic AI: The Agent Failure Taxonomy", href: "/agentic/the-agent-failure-taxonomy" },
        { label: "Build it: Customer Support Refund Agent scenario", href: "/workshop?scenario=customer-support-agent" },
      ],
    },
  },
];
