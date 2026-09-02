import type { InterviewQuestion } from "../types";

/**
 * Google — researched 2026-08-22, see `docs/interview_exp.md` for the full
 * research log and the complete list of what was found. This file is
 * deliberately a small subset of that research: only questions with a
 * real, expansive prompt — specific requirements, numbers, constraints,
 * or a concrete narrative — make it in here. A one-line imperative like
 * "Design a rate limiter." is a real reported topic (and stays in the
 * tracker doc), but it reads as a topic label, not a question a candidate
 * could actually sit down and answer — so it doesn't ship to this
 * practice UI. See the tracker's "Shipped to app" note for the full
 * before/after list and reasoning.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a
 * transcript to memorize. These are authored by reasoning through each
 * problem the way a strong candidate would, not sourced from a specific
 * candidate's actual answer — unlike `prompt`/`context`, which are
 * sourced and cited, `optimalAnswer` is this app's own content.
 */
export const GOOGLE_QUESTIONS: InterviewQuestion[] = [
  {
    id: "google-metrics-logging-service",
    company: "Google",
    title: "Design a metrics and logging service",
    prompt:
      "Design a metrics and logging service. Several systems emit different log and metric types — collect them, process them in under a minute, and serve the data to downstream consumers.",
    category: "system-design",
    tags: ["metrics-observability"],
    source: {
      name: "Exponent question DB / blog",
      url: "https://www.tryexponent.com/questions?company=google&type=system-design",
      reportedDate: "~Aug 2026",
      confidence: "high",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "What's the write volume — how many hosts/services, and roughly what metrics QPS?",
        "What's the retention/query pattern — mostly recent dashboards, or historical audits too?",
        "Do metrics need near-real-time alerting on top of the stated <1 minute processing?",
        "Are logs structured events or freeform text?",
      ],
      requirements: [
        "Ingest at high, bursty write throughput from many independent producers",
        "Process/aggregate within under a minute end-to-end",
        "Support both metrics (numeric time series) and logs (semi-structured events)",
        "Serve results to downstream consumers: dashboards, alerting, ad-hoc query",
        "Durable enough not to lose data during producer bursts",
        "Horizontally scalable as the fleet grows",
      ],
      approach:
        "Decouple ingestion from processing with a durable log in the middle, then fan the log out into two purpose-built consumer paths — one for metric rollups, one for log indexing — rather than forcing one store to serve both access patterns well.",
      keyPoints: [
        "Producers write into a durable, partitioned log (Kafka-style) — decouples producer burst rate from processing rate and gives replay for free",
        "Two consumers read off that log: a metrics aggregator computing windowed rollups (1s → 1m → 1h) into a time-series store, and a log indexer writing into a search-optimized inverted index",
        "Partition the log by service/host so one slow consumer partition doesn't stall others",
        "Pre-aggregate at the edge (client-side counters/histograms) before sending, to cut cardinality and network volume before it ever hits the pipeline",
        "Downstream consumers (dashboards, alerting) read from the aggregated store, never the raw log — keeps query latency low and decoupled from ingestion",
        "Tiered retention: hot storage for recent high-resolution data, downsampled/cold storage for history",
      ],
      tradeoffs: [
        "Push vs. pull (scrape) ingestion — pull simplifies discovery/backpressure but adds scrape-interval latency; push suits bursty, short-lived jobs better",
        "Exact vs. approximate aggregation (e.g. HyperLogLog/t-digest for percentiles) — approximate structures trade small accuracy loss for large memory/compute savings at scale",
        "One unified pipeline for logs+metrics vs. two separate systems — unified is operationally simpler but a log-heavy tenant can starve metric processing without careful isolation",
      ],
      followUps: [
        "How do you handle a downstream consumer falling behind (backpressure, consumer lag)?",
        "How do you avoid cardinality explosion when producers tag metrics with things like user IDs?",
        "How would an alerting path's latency budget differ from a dashboard's?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
      ],
    },
  },
  {
    id: "google-connection-degree-network",
    company: "Google",
    title: "Design a connection-degree system for a professional network",
    prompt:
      "Design a connection-degree system for a professional network. Given millions of users, when you open a profile the system should show instantly whether that person is a first-, second-, or third-degree connection.",
    category: "system-design",
    tags: ["social-graph"],
    source: {
      name: "Exponent blog",
      url: "https://www.tryexponent.com/blog/google-system-design-interview",
      confidence: "high",
    },
    context:
      "Reported first-principles pushback: when the candidate proposed a hosted graph database, the interviewer asked them to set it aside and write the graph traversal from scratch.",
    optimalAnswer: {
      clarifyingQuestions: [
        "What's a typical user's connection fan-out, and what does a hub/celebrity account's fan-out look like?",
        "Does \"instantly\" mean a p99 latency budget around ~100ms?",
        "How fresh do results need to be — is a few seconds of staleness after a new connection acceptable?",
        "Do we need the exact degree, or just a bucket (1st/2nd/3rd/none)?",
      ],
      requirements: [
        "Millions of users in a highly connected (small-world) social graph",
        "Given viewer + viewee, return their connection degree with low latency on profile view",
        "Writes (new connections) are relatively rare compared to reads (profile views)",
        "Must stay fast even against very high-degree hub accounts",
      ],
      approach:
        "This is explicitly testing whether you understand what a graph database does underneath, not whether you can name one — so design the traversal and its bounds yourself: a capped, bidirectional BFS backed by a cached adjacency list, not an unbounded search.",
      keyPoints: [
        "Store the social graph as an adjacency list, sharded by user id so each user's direct connections are co-located",
        "On profile view, run a bidirectional BFS from both the viewer and the viewee simultaneously, capped at depth 3 — this cuts the search space roughly from branching³ to 2 × branching^1.5",
        "Cache each user's 1st-degree (and a bounded slice of 2nd-degree) set in a fast in-memory store so most BFS steps hit cache, not a fresh graph-store read",
        "Cap the neighbor set explored per level for very high-degree hub users, trading a little accuracy at the tail for a hard latency bound",
        "Cache the computed (viewer, viewee) degree result itself with a short TTL for popular profile pairs, since recomputing on every view of a popular profile is wasted work",
        "Connection add/remove invalidates only the affected cached adjacency entries, not the whole graph",
      ],
      tradeoffs: [
        "Custom adjacency-list traversal vs. a hosted graph database — a hosted graph DB is operationally simpler, but the interviewer's pushback is explicitly testing whether you can bound the traversal cost yourself rather than delegate that understanding away",
        "Precomputing all pairwise degrees (huge, goes stale fast) vs. on-demand computation with caching (fresher, bounded cost) — on-demand with caching wins at this scale",
        "Exact BFS vs. capped/approximate for hub users — capping trades a small accuracy loss for a hard worst-case latency bound",
      ],
      followUps: [
        "How do you keep the cache consistent when a connection is removed?",
        "What happens for a viral/celebrity account with millions of 1st-degree connections?",
        "How would you extend this into a \"people you may know\" ranking?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
      ],
    },
  },
  {
    id: "google-ticketing-platform",
    company: "Google",
    title: "Design a ticketing platform (Ticketmaster-style)",
    prompt:
      "Design a ticketing platform that handles locking tickets for users, releasing tickets after timeout, managing queues for massive on-sale events, computing the optimal number of concurrently active users, and preventing fraud.",
    category: "system-design",
    tags: ["ticketing-inventory"],
    level: "L5",
    source: {
      name: "Blind",
      url: "https://www.teamblind.com/post/Google-system-design-interview-questions-MwvJeDee",
      confidence: "high",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "How many tickets/seats for a hot event, and what's the expected concurrent-demand spike (e.g. 100k users hitting \"buy\" in the first second)?",
        "Is inventory seat-level (specific seats) or general-admission (just a count)?",
        "What's the hold/timeout window for an in-progress checkout?",
        "Does purchase order need to be strictly fair (first-come-first-served), or is a lottery/queue acceptable?",
      ],
      requirements: [
        "No overselling — hard correctness constraint even under massive concurrent demand",
        "A held ticket automatically releases after a timeout if checkout isn't completed",
        "Fair-ish ordering during a flash on-sale",
        "Fraud/bot mitigation — one person, reasonable purchase limits",
        "System stays responsive (no timeouts/500s) even when demand vastly exceeds supply",
      ],
      approach:
        "The hard part isn't the CRUD, it's correctness under contention — many users racing for the same limited inventory the instant sales open. Design for that contention explicitly rather than assuming \"a database\" solves it.",
      keyPoints: [
        "Put a virtual waiting room / admission queue in front of the purchase flow the moment demand exceeds capacity — admits a bounded number of users into checkout per second so the backend never sees the full spike at once",
        "Model each ticket/seat as a small state machine: available → held → sold, and held → available on timeout or explicit release",
        "Claim a hold with an atomic conditional write (compare-and-swap on ticket status, or a per-seat lock with a short TTL) — this is the actual correctness mechanism preventing overselling",
        "A background sweeper (or lazy check-on-read) releases holds whose timeout has passed back to available",
        "For general admission (no specific seat), decrement a single atomic counter per event instead of tracking individual seats — far lower contention than seat-level locking",
        "Rate-limit and fraud-check at the queue-admission layer: cap tickets per account/payment method/IP, add bot-detection friction before admitting into checkout",
      ],
      tradeoffs: [
        "Pessimistic locking (lock the seat before showing availability) vs. optimistic compare-and-swap on purchase attempt — optimistic scales better under typical per-seat contention, but a hot general-admission counter is itself a contention point that may need sharding",
        "Strict FIFO queue vs. random admission — FIFO feels fairer but a single ordered queue can become a bottleneck; sharding the queue trades a little fairness for throughput",
        "Hold-timeout length — too short frustrates real users mid-checkout, too long lets bots squat on inventory",
      ],
      followUps: [
        "How do you stop the same account from holding tickets across multiple tabs/devices at once?",
        "How would seat-level (not count-level) inventory change the design?",
        "What happens to the admission queue if the payment provider is slow or down?",
      ],
      relatedLinks: [
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
        { label: "Build it: Flash Sale scenario", href: "/workshop?scenario=flash-sale" },
        { label: "Build it: Movie Ticket Booking scenario", href: "/workshop?scenario=movie-ticket-booking" },
      ],
    },
  },
  {
    id: "google-ad-serving-decision-api",
    company: "Google",
    title: "Design an ad-serving decision API",
    prompt:
      "Design an API to decide whether to show an ad, given an AdId with a total budget that decreases on each impression. Must be highly available, low-latency, and scalable, with some tolerance for budget-accounting error.",
    category: "system-design",
    tags: ["ai-ml-infra"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question",
      reportedDate: "~2024–2025",
      confidence: "medium",
      note: "Indexed via search; direct page fetch was blocked (403), so wording is via search snippet rather than a full reread.",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "What's the p99 latency budget for the decision — single-digit milliseconds, since this is in the serving hot path?",
        "Is \"budget\" a total spend cap or an impressions cap?",
        "How many ads/advertisers are decisions being made across concurrently?",
        "Roughly how much overspend is tolerable before it's a real problem — a few dollars, or a hard compliance cap?",
      ],
      requirements: [
        "Given an AdId, decide show/no-show based on remaining budget",
        "Highly available and low-latency — this sits directly on the ad-serving request path",
        "Scalable to very high decision QPS",
        "Some tolerance for budget-accounting error is explicitly allowed",
      ],
      approach:
        "This is a rate-limiter/counter problem in disguise: \"show or don't show\" gated by remaining budget, under a hard low-latency SLA — and the question itself is telling you some accounting slop is an acceptable trade for speed.",
      keyPoints: [
        "Keep each AdId's remaining-budget counter in an in-memory, replicated key-value store local to each serving region — a decision is then a single fast local read, not a cross-region call",
        "Decrement asynchronously/in batches rather than synchronously on every impression: serve off a locally-cached budget estimate, reconcile actual spend via an async pipeline — the stated error tolerance is exactly what licenses this",
        "Split the total budget into per-region slices (proportional to historical traffic share) so decisions never need a cross-region round-trip; a periodic rebalancer redistributes slices as real traffic shifts",
        "Decide explicitly whether to fail open or closed on infra failure — failing open (keep showing) risks overspend, failing closed (stop showing) risks lost revenue; usually fail open with a conservative safety margin",
        "Cache the decision itself for a very short TTL on extremely hot AdIds to shave repeated lookups under bursty traffic",
      ],
      tradeoffs: [
        "Synchronous exact decrement (strict correctness, adds latency/contention) vs. async batched reconciliation (fast, slightly overspends) — the stated tolerance is telling you which one to defend",
        "A single global counter vs. per-region budget slices — global is simpler but becomes a cross-region bottleneck; slicing trades perfect global accuracy for locality and speed",
        "Fail-open vs. fail-closed when the budget store is unreachable",
      ],
      followUps: [
        "How do you bound overspend under async reconciliation — what stops a budget slice from massively overshooting before reconciliation catches up?",
        "How would you rebalance budget slices across regions as traffic shifts through the day?",
        "How does this change for a hard, not-to-exceed compliance budget vs. a soft marketing budget?",
      ],
      relatedLinks: [
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
        { label: "Foundations: Consistent Hashing", href: "/foundations/consistent-hashing" },
      ],
    },
  },
  {
    id: "google-translation-service",
    company: "Google",
    title: "Design a translation service like Google Translate",
    prompt:
      "Basic requirements: translate English to one target language for now; each word has only one meaning for now; must be highly available with low latency; around 100M translations per day; around 100k words per language — how would you store and serve that?",
    category: "system-design",
    tags: ["ai-ml-infra"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/system-design/318811/Google-or-System-design-or-Design-a-translation-service-like-Google-Translate",
      reportedDate: "Jun 2019",
      confidence: "high",
    },
    context:
      "Comment thread debates storing a trie in a persistent store, an Elasticsearch/Lucene-based indexing approach, and whether a seq2seq model is a reasonable answer.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is a word-for-word lookup acceptable for v1, as the simplified requirements suggest, or does the real product need phrase/context-aware translation eventually?",
        "Do we need autocomplete/typeahead on top of plain lookup?",
        "How often does the dictionary change — a daily batch update, or real-time edits?",
      ],
      requirements: [
        "English → one target language for now, one meaning per word for now",
        "~100M translations/day (~1,150 QPS average, well above that at peak)",
        "~100k words per language",
        "High availability, low latency",
      ],
      approach:
        "Do the capacity math before designing anything: 100k words at this size comfortably fits in memory on a single machine, which means the core lookup should be a plain in-memory hash map, not a distributed store — the storage question the original thread got stuck on mostly dissolves once you see that.",
      keyPoints: [
        "Capacity check: 100k words × ~20 bytes (word + translation) ≈ a couple MB per language — trivially fits in memory",
        "Serve from replicated, stateless instances that each hold the full dictionary in memory (loaded at startup, refreshed on a schedule) — a lookup is then a local hash-map read, sub-millisecond, no network hop",
        "Put a load balancer in front of many identical replicas; scale out for QPS headroom and fault tolerance, not because any single replica can't hold the data",
        "Persist the source-of-truth dictionary in an ordinary durable store (a simple key-value or relational table: english_word + language → translation) — you don't need a trie for exact single-meaning lookup, only a hash map; a trie only earns its place once you add prefix/typeahead search on top",
        "Propagate dictionary updates by pushing (or short-polling) a refresh to each replica's in-memory copy — accept a small propagation lag rather than making every lookup pay a consistency cost",
        "Add CDN/edge caching in front of the service for repeated identical lookups (common phrases) to cut load further",
      ],
      tradeoffs: [
        "In-memory hash map vs. an external cache/database on every request — external adds an unnecessary network hop at this data size; only worth it once the dictionary is far too large to replicate fully",
        "Full replication per instance vs. sharding by language — full replication is simpler and this data size supports it; sharding only pays off once total dictionary size stops fitting comfortably in memory",
        "Push vs. poll for propagating dictionary updates to replicas",
      ],
      followUps: [
        "How does the design change once you drop the \"one meaning per word\" simplification and need real context-aware/ML translation?",
        "How would you add typeahead/autocomplete — this is where a trie legitimately earns its place?",
        "How do you scale from one language to a hundred?",
      ],
      relatedLinks: [
        { label: "Foundations: Caching", href: "/foundations/caching" },
        { label: "Foundations: CDN", href: "/foundations/cdn" },
      ],
    },
  },
  {
    id: "google-pharmacy-shop-class-design",
    company: "Google",
    title: "Design a class model for a pharmacy shop",
    prompt:
      "Design a class pattern for the following: a Pharmacist writes prescriptions; a Cashier collects and returns cash; a Manager manages employees and can sometimes also work as a cashier or pharmacist.",
    category: "lld-ood",
    tags: ["workflow-crud-system"],
    level: "Onsite",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/system-design/692383/Google-or-Onsite-or-Design-a-organization-pharmacy-shop-with-managers",
      reportedDate: "Jun 2020",
      confidence: "high",
    },
    context:
      "Follow-up: how does the design change with 100+ managers/employees, each with multiple, overlapping job roles (e.g. a manager who is also a partial cashier and partial pharmacist)? A commenter on the thread notes the ambiguity well: “is this a High Level Design question or Low Level Design question? What does Google consider a System Design round?”",
    optimalAnswer: {
      clarifyingQuestions: [
        "Can a role be added to or removed from an employee at runtime, or is it fixed at hire time?",
        "Do different roles need different permission checks (e.g. only a Manager can approve a refund)?",
        "Is \"one employee, several roles\" the common case, or an occasional exception?",
      ],
      requirements: [
        "Model Pharmacist (writes prescriptions), Cashier (collects/returns cash), Manager (manages employees, can also act as cashier/pharmacist)",
        "Must extend cleanly to 100+ employees, each with multiple, arbitrary, overlapping roles",
      ],
      approach:
        "This is really a question about composition over inheritance — the follow-up (100+ employees, overlapping roles) is specifically testing whether a naive first design paints itself into a corner once roles stop being three fixed, non-overlapping job titles.",
      keyPoints: [
        "Model roles as composable capabilities held by an employee, not as a class-per-job-title inheritance chain — a `Manager extends Cashier, Pharmacist`-style hierarchy doesn't scale once roles genuinely combine arbitrarily",
        "Give each `Employee` a set of `Role` objects; behavior (writePrescription, collectCash, manageStaff) lives on the Role, and the Employee just holds and delegates to whichever roles it has — the Strategy/composition pattern",
        "Each `Role` is its own small, independently testable class implementing its own behavior and validation",
        "To perform an action, check whether the employee holds the required role and delegate — `employee.perform(Role.WRITE_PRESCRIPTION, ...)` — rather than a growing if/else chain keyed on employee type",
        "This scales to 100+ employees with arbitrary role combinations for free: an employee is just a `Set<Role>`; adding or removing a role at runtime is a set operation, no class hierarchy to touch",
        "Store role assignments as data (a role list per employee), not as code (a fixed set of subclasses) — that's the actual thing that lets it scale past three hardcoded combinations",
      ],
      tradeoffs: [
        "Composition (roles as a set of capability objects) vs. inheritance (Manager extends Cashier, Pharmacist) — inheritance looks simpler for exactly 3 fixed roles but breaks down combinatorially and can't add a 4th role without touching the hierarchy; composition is more upfront boilerplate but is the approach that actually survives the stated follow-up",
        "A lightweight role check vs. a full permissions/ACL system — a role check is enough for what's described; a full ACL layer would be over-engineering here",
      ],
      followUps: [
        "How would you add a permission model on top (e.g. only a Manager-role holder can fire an employee)?",
        "How do you handle an employee's role changing mid-shift (a cashier gets promoted to manager)?",
        "How would you unit-test role delegation without spinning up every concrete role?",
      ],
      relatedLinks: [
        { label: "LLD: OOP Fundamentals", href: "/lld/oop-fundamentals" },
        { label: "LLD: SOLID Principles", href: "/lld/solid-principles" },
        { label: "LLD: Behavioral Patterns", href: "/lld/behavioral-patterns" },
      ],
    },
  },
  {
    id: "google-fde-friction-point-behavioral",
    company: "Google",
    title: "Tell me about a time you advocated for an engineering change",
    prompt:
      "Tell me about a time you identified a technical “friction point” in a product and successfully advocated for a change to the engineering team.",
    category: "fde-agentic",
    tags: ["behavioral"],
    source: {
      name: "Glassdoor (Forward Deployed Engineer candidate reports)",
      url: "https://www.glassdoor.com/Interview/forward-deployed-engineer-interview-questions-SRCH_KO0,25.htm",
      confidence: "medium",
      note: "Reached via a search-index summary of Glassdoor-reported FDE candidate experiences; not yet individually reread against a Google-specific review.",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "(Behavioral — think these through beforehand, don't ask the interviewer) What's a real friction point you personally noticed, not just heard about secondhand?",
        "Did you have to convince people who were initially skeptical, and how?",
        "What was the measurable before/after?",
      ],
      requirements: [
        "Demonstrates you can spot a real problem without being told to look for it",
        "Demonstrates you can build a case with data, not just opinion, for why it matters",
        "Demonstrates you can influence people who don't report to you",
        "Demonstrates you saw it through to a measurable outcome",
      ],
      approach:
        "Answer in STAR (Situation, Task, Action, Result), and pick a story where you personally noticed the friction — not one where you just executed someone else's plan — since the question specifically asks who spotted the problem.",
      keyPoints: [
        "Situation: set up context in 2-3 sentences — the product/system, who was affected, why it mattered to the business, not just \"it annoyed me\"",
        "Task: state specifically what you decided to do about it, and why it was your call even if not formally your job",
        "Action (the bulk of the answer): how you diagnosed the friction with data/observation rather than a hunch, how you proposed the fix, and specifically how you got buy-in from engineers who didn't report to you — that influence-without-authority skill is the actual thing being probed for an FDE role",
        "Result: a concrete, ideally quantified outcome, plus what you'd do differently in hindsight — that self-awareness reads stronger than a polished-but-shallow win",
        "Keep it to roughly 90 seconds spoken — a common failure mode is over-narrating Situation and rushing Action, which is the part actually being evaluated",
      ],
      tradeoffs: [
        "A story where you were the sole hero vs. one where you influenced a team — for an FDE role specifically, moving other engineers is stronger signal than a fix you coded alone",
        "A big dramatic win vs. a smaller but clearly-attributable one — smaller-but-clean-causality often lands better than large-but-hard-to-verify",
      ],
      followUps: [
        "What would you have done if the engineering team had said no?",
        "How did you measure that the change actually mattered?",
        "Was there a friction point you noticed but decided not to fix — why?",
      ],
    },
  },
  {
    id: "google-paged-2am-checkout-latency",
    company: "Google",
    title: "2am page: checkout service error rate climbing",
    prompt: "You get paged at 2am — the error rate on the checkout service is climbing. Walk me through what you do.",
    category: "scenario-operational",
    tags: ["incident-response"],
    source: {
      name: "SRE interview prep consensus (techinterview.org, kore1.com)",
      url: "https://www.techinterview.org/post/3233476403/what-sre-interviewers-actually-score/",
      confidence: "medium",
      note: "Reported as “a very common live prompt” across SRE-interview prep guides rather than tied to one dated candidate report.",
    },
    context: "Expected shape: mitigate and scope blast radius first, root-cause the trigger after.",
    optimalAnswer: {
      clarifyingQuestions: [
        "(Say these out loud to the interviewer as your first move, don't silently assume) Is this confirmed by a real alert/dashboard or a single noisy signal?",
        "What's the blast radius — one region, one service, all users?",
        "Is there a recent deploy or config change in the timeline?",
        "Is there a known-good rollback target?",
      ],
      requirements: [
        "Confirm the incident is real before acting",
        "Act to reduce user-facing harm before fully understanding root cause",
        "Keep stakeholders informed throughout",
        "Find and fix the actual cause",
        "Leave the system less likely to repeat the same failure",
      ],
      approach:
        "The single most common way candidates fail this is jumping straight to root-causing. The right sequence is mitigate → scope → communicate → root-cause → prevent, in that order.",
      keyPoints: [
        "Confirm, don't assume: check the dashboard/alert is real before doing anything disruptive",
        "Scope the blast radius immediately — one region or global? one service or a cascade? all users or one tenant/cohort? this determines both urgency and what mitigation is even safe to try",
        "Mitigate first, in roughly this order of preference: roll back a recent deploy if one exists in the timeline; shed non-critical load / degrade gracefully if it's a capacity issue; fail over to a healthy region/replica if it's localized; scale up only if none of those apply",
        "Communicate incident status (even a one-line \"investigating, mitigating\") before disappearing into a terminal for 20 minutes",
        "Root-cause after mitigation, not before — trace the actual failure (a downstream dependency timing out, a bad config, a resource leak) once user impact is already reduced",
        "Prevent recurrence: the postmortem should surface plural contributing factors — the bug, the missing alert that let it run 20 minutes, the stale runbook, the risky Friday deploy — not just \"fixed the bug\"",
      ],
      tradeoffs: [
        "Rolling back immediately vs. investigating first — rolling back a suspect recent deploy is almost always the right default even without full certainty, because it's fast and reversible; investigate first only if there's no plausible recent change and no rollback target",
        "Failing over a whole region vs. surgically shedding load — failover is faster to execute but can double load on the healthy region and cause a second incident; load-shedding is more surgical but slower to design under pressure",
      ],
      followUps: [
        "The rollback didn't fix it — what now?",
        "How do you decide when to escalate to a full incident vs. handle it solo?",
        "What goes in the postmortem, and who owns the follow-up items?",
      ],
      relatedLinks: [
        { label: "Foundations: Circuit Breakers", href: "/foundations/circuit-breakers" },
        { label: "Foundations: Load Balancers", href: "/foundations/load-balancers" },
      ],
    },
  },
];
