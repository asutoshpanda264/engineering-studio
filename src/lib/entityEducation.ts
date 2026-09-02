/**
 * Educational content for the Inspector's "How It Works" section
 * (WORKSHOP-UI.md §10 — "Engineering Explanation"). Follows ENTITIES.md's
 * five-question framework (what am I / what should users learn) and
 * ADR-007's "every entity has one Engineering Truth" — the goal is that a
 * student selecting any component leaves understanding the underlying
 * distributed-systems idea, not just the config knobs.
 *
 * Kept separate from entityCatalog.ts: the catalog is read on every
 * sidebar render and node creation and only needs short metadata, while
 * this content is Inspector-only and paragraph-length.
 */

import type { EntityType } from "@/simulation/types";

export interface EntityEducation {
  /** One-line "Engineering Truth" per ADR-007 — what this entity fundamentally does. */
  truth: string;
  /** ENTITIES.md Q1 — what infrastructure concept this represents. */
  whatAmI: string;
  /** ENTITIES.md Q5 — the engineering idea a student should leave understanding. */
  learningGoal: string;
  relatedConcepts: string[];
}

export const ENTITY_EDUCATION: Record<EntityType, EntityEducation> = {
  client: {
    truth: "I don't know how the system works. I only know whether it worked.",
    whatAmI:
      "I represent every user hitting the system. I generate requests and wait for a response — caches, connection pools, and server load are all invisible to me.",
    learningGoal:
      "Every architecture ultimately exists to improve what I experience: latency and success rate. If a change doesn't show up here, it didn't help.",
    relatedConcepts: ["Latency", "Reliability", "Request Lifecycle"],
  },
  api: {
    truth: "I do the work, and I have a limit.",
    whatAmI:
      "I sit between the Client and the Database, running business logic. I can only process a fixed number of requests at once — anything beyond that waits in a bounded queue or gets rejected.",
    learningGoal:
      "Capacity is finite. A server that looks fine at low traffic can start rejecting requests the moment concurrent load exceeds what it's configured to handle — that's backpressure, not a bug.",
    relatedConcepts: ["Concurrency", "Backpressure", "Queueing", "Horizontal Scaling"],
  },
  database: {
    truth: "I remember — but how I'm built to remember is a tradeoff, not a default.",
    whatAmI:
      "I persist state and answer queries through a bounded connection pool. Every query I run competes with every other query for the same limited connections, and I can fail independently of anything upstream. Real databases exist to provide ACID guarantees a plain file can't — Atomicity, Consistency, Isolation, Durability — though this simulation only models the concurrency and independent-failure parts of that promise, not transactional correctness itself. I can be configured as SQL (relational — a fixed schema, joins, ACID transactions, but query-planning and locking overhead limits concurrent throughput) or NoSQL (a flexible schema, data partitioned across nodes by key, much higher concurrent throughput, but no joins and usually weaker consistency) — and NoSQL isn't one thing: document, key-value, column-family, and graph stores each solve a different access pattern. Here it's modeled as a single profile, not those four distinct shapes.",
    learningGoal:
      "I'm usually the tightest bottleneck in any architecture — I can't be casually duplicated the way a stateless server can, so protecting me (caching, connection limits, read replicas) matters more than protecting anything else. SQL vs NoSQL is one of the first protective decisions: pick SQL when correctness and relationships between records matter more than raw throughput, NoSQL when the access pattern is simple key lookups at high volume. Beyond that choice, the standard levers are indexing (a B-tree-backed lookup structure that trades write cost and storage for read speed — modeled here only as a faster configured Processing Time, not as an index you actually add), connection pooling (share expensive connections instead of opening one per request), read replicas (scale reads horizontally, writes still go to one place — see Replica Pool), and sharding/partitioning (split data by key across multiple instances so no single one holds everything).",
    relatedConcepts: [
      "ACID",
      "Connection Pooling",
      "Bottlenecks",
      "Replication",
      "Consistency",
      "SQL vs NoSQL",
      "Sharding",
      "Indexing",
    ],
  },
  load_balancer: {
    truth: "I distribute work.",
    whatAmI:
      "I sit in front of multiple servers and decide which one handles each request. Five algorithms: round robin (cycles through targets in order), least connections (routes to whoever currently has the fewest in-flight requests), weighted round robin (round robin, but proportional to a per-target weight you set — for known, fixed capacity differences, not load that varies at runtime), IP hash (hashes an identifier so the same one always lands on the same target — session affinity; I have no modeled client IP, so I hash the request's resource key instead, a documented stand-in), and least response time (least connections' generalization from request count to actual observed latency, so I react to a target that's technically up but just slow). Real load balancers also operate at different layers — Layer 4 (TCP-level, fast, can't see request content) or Layer 7 (HTTP-level, routes on path/headers/cookies) — I only model Layer-7-style routing, not that distinction itself.",
    learningGoal:
      "I don't create capacity. I only spread existing capacity more evenly. Putting me in front of one overloaded server changes nothing — the servers behind me are what actually need to scale. Different algorithms achieve \"spread evenly\" differently: round robin, least connections, and least response time only diverge from an even split once a target actually behaves differently at runtime (overloads, slows down); weighted round robin and IP hash diverge immediately, by design — a configured weight, a routing key — regardless of how any target is actually performing. Active/passive health checks (detecting and routing around a struggling target automatically) are a related but separate concept I intentionally don't build into myself — that's Circuit Breaker's job; put one in front of each target instead of expecting me to track target health. And I'm not immune to failure myself: a single load balancer is a single point of failure, which is why production deployments run more than one behind DNS or a floating IP (active-passive or active-active) — this simulation doesn't model that redundancy, only what happens once traffic reaches me.",
    relatedConcepts: [
      "Horizontal Scaling",
      "Traffic Distribution",
      "Weighted Round Robin",
      "IP Hash",
      "Least Response Time",
      "Health Checks",
      "Layer 4 vs Layer 7",
      "Single Point of Failure",
    ],
  },
  cache: {
    truth: "I prevent repeated work.",
    whatAmI:
      "I sit in front of slower storage and answer requests from memory when I can. A hit skips the expensive path entirely; a miss falls through to whatever's behind me, and the result is stored on the way back — this is the cache-aside pattern. Real caches also support write-through (write to me and storage at once) and write-behind (write to me now, storage later, faster but riskier) — I only model cache-aside. I directly simulate all three of production caching's well-known failure modes: cache stampede (a popular key's value disappears while many requests for it are still arriving — Naive re-fetches independently for every one, Coalesced lets only the first fetch and shares the result, what production calls request coalescing or single-flight), cache penetration (repeated lookups for a key that will never exist — Negative Caching, off by default, caches the \"not found\" too instead of re-checking downstream every single time), and cache avalanche (many entries cached around the same moment sharing one exact TTL, so they all expire together — TTL Jitter, off by default, randomizes each entry's TTL slightly so expiries spread out instead of landing as one synchronized wave).",
    learningGoal:
      "The lesson isn't \"use Redis\" — though in production this pattern is almost always Redis or Memcached. It's that repeated, identical work is wasteful — a cache only helps when the same data is requested often enough to be worth remembering. All three failure modes are directly triggerable and observable here, each in its own Inspector section. Stampede: keep TTL low relative to traffic on a hot key, run it under Naive and watch downstream fetches spike with every expiry, then switch to Coalesced and watch that spike flatten. Penetration: give the Client a nonzero Missing Key Rate, run it with Negative Caching off and watch every lookup for the same missing key hit downstream again, then switch it on and watch those repeats get absorbed instead. Avalanche: cache a batch of keys around the same moment with TTL Jitter at 0 and watch them expire as one synchronized burst later, then raise Jitter and watch that burst spread out. A fourth named technique, the Bloom filter — a probabilistic \"definitely doesn't exist, don't even check the cache\" pre-filter — is a further, distinct fix for penetration I don't simulate; negative caching alone is the one I do.",
    relatedConcepts: [
      "Hit Rate",
      "Hot Data",
      "Eviction Policy",
      "Database Offloading",
      "Cache-Aside",
      "Cache Stampede",
      "Request Coalescing",
      "Cache Penetration",
      "Negative Caching",
      "Cache Avalanche",
      "TTL Jitter",
    ],
  },
  cdn: {
    truth: "I bring data closer to the user.",
    whatAmI:
      "I'm a cache with geography — copies of content live at edge locations near where users actually are, so a response doesn't have to cross the planet. Drag the User pin on my Edge Map and watch it happen: the nearest edge's latency drops, and it starts winning a bigger share of the traffic too — I route each request proximity-weighted from that pin, not by hashing its content, so being close pays off twice. I fetch into an edge on demand, the first time it's asked for there — a pull CDN. Real CDNs can also push content to every edge ahead of any request, for known high-demand releases (a new show, a game patch) — I only model the pull side. My TTL is the invalidation strategy I actually simulate — an entry just expires and gets re-fetched. Real CDNs also support explicit purge (an operator actively evicts a key everywhere, on demand — I have no scheduled/timer event to trigger that) and versioned keys (a new release gets a new key entirely — e.g. `app.js?v=42` instead of `app.js` — so nothing needs invalidating at all, the old key just goes cold and ages out on its own). That's the production punchline: versioning beats invalidation. I don't need special support for it either — it's already exactly what happens here the moment traffic shifts to a new key.",
    learningGoal:
      "Latency is partly a physics problem, not just a capacity problem. No amount of server scaling fixes a request that has to travel halfway around the world — proximity does. Drag my User pin closer to an edge and see both halves of that lesson move together.",
    relatedConcepts: [
      "Edge Computing",
      "Geographic Latency",
      "Regional Caching",
      "Pull vs Push CDN",
      "Cache Invalidation",
      "Cache Versioning",
    ],
  },
  message_queue: {
    truth: "I let producers and consumers work at different speeds.",
    whatAmI:
      "I sit between whoever creates work and whoever processes it, holding requests until a consumer is ready. Producers don't wait on consumers, and consumers process at their own pace. I model both of the course's two architecturally different delivery patterns as a config toggle: Queue mode is point-to-point — a shared consumer pool competes for each message, so exactly one consumer gets it, like a task queue. Topic mode is fan-out/pub-sub — every downstream connection is an independent subscriber with its own consumer pool, and gets its own copy of every message. A slow subscriber under Topic only ever falls behind on its own copy; there's no shared backlog for it to block for anyone else.",
    learningGoal:
      "Not every request needs an immediate answer. Decoupling \"accepted the request\" from \"finished the request\" is how systems absorb traffic spikes without falling over. Queue vs. Topic is a real architectural choice, not a tuning knob — a work queue distributes work once across a pool; a topic broadcasts state to everyone who cares about it. In production that guarantee usually means at-least-once delivery — a message might be redelivered, so consumers need to be idempotent — and a message that keeps failing gets moved to a dead-letter queue instead of blocking everyone behind it. I don't simulate redelivery, a dead-letter queue, or Kafka's partition/consumer-group replay model: every admitted message here is dispatched exactly once, and every subscriber gets it live or not at all.",
    relatedConcepts: [
      "Asynchronous Processing",
      "Backpressure",
      "Decoupling",
      "Dead-letter Queues",
      "Fan-out",
      "Pub-Sub",
      "Idempotency",
    ],
  },
  rate_limiter: {
    truth: "I say no before things get worse.",
    whatAmI:
      "I sit in front of a service and admit requests only up to a configured rate — Token Bucket lets short bursts through by spending saved-up capacity, Sliding Window enforces a hard, steady ceiling with no burst allowance. Either way, whatever I reject fails immediately. I never make anything wait.",
    learningGoal:
      "Rejecting immediately is a different kind of protection than queueing (API Server, Database) or buffering (Message Queue) — I trade \"nothing waits\" for \"nothing gets a chance to catch up.\" That only makes sense when the caller can retry or degrade gracefully on its own.",
    relatedConcepts: ["Backpressure", "Token Bucket", "Burst Traffic", "Fail Fast"],
  },
  circuit_breaker: {
    truth: "I stop hammering something that's already struggling.",
    whatAmI:
      "I wrap a single dependency and watch what happens to requests I forward it. Enough consecutive failures and I trip open — every request fails instantly, without ever reaching that dependency, until I let a single trial request through to see if it's recovered.",
    learningGoal:
      "Retrying a dependency that's already failing doesn't help it recover — it adds load to something already struggling, and can cascade the failure upstream. Failing fast and giving it room to recover, then cautiously checking back in, is a different tradeoff than spreading load (Load Balancer) or capping it (Rate Limiter) — this is stopping it entirely, temporarily.",
    relatedConcepts: ["Cascading Failure", "Fail Fast", "Fault Tolerance", "Resilience"],
  },
  replica_pool: {
    truth: "I scale reads by copying data, not by working harder.",
    whatAmI:
      "I route writes to one leader (the first connection you draw from me) and spread reads round-robin across whatever replicas you connect after it. Each replica is a real database or server you configure yourself — I only decide which one a given request goes to.",
    learningGoal:
      "A single leader can't be split across machines the way a stateless server can — replicating it for reads is a different lever than horizontal scaling behind a Load Balancer. The tradeoff: a replica's data can lag behind the leader's, since writes have to propagate. I don't simulate that staleness directly — modeling real consistency guarantees is a deeper rabbit hole than \"where does this request go\" — but it's the real cost you're paying every time a read gets spread across replicas instead of hitting the leader.",
    relatedConcepts: ["Read Replicas", "Replication Lag", "Read Scaling", "Leader-Follower"],
  },
  reverse_proxy: {
    truth: "I decide who handles this — not how many of them there are.",
    whatAmI:
      "I route each request to a specific downstream service based on which named route it's addressed to — /orders here, /users there. This is a different job than Load Balancer's: it spreads identical work across replicas of one service, I send different kinds of work to different services entirely, an API-gateway / nginx `location` block pattern. I have no real request path to route on, so I route on a route label instead — a documented stand-in, the same substitution Load Balancer's IP Hash makes for a client IP. A target I haven't given a route to never receives anything; a target configured as the catch-all (`*`) receives whatever no specific route claimed.",
    learningGoal:
      "Routing and load-spreading are different problems that happen to sit in the same spot in an architecture. I could theoretically also spread load across replicas, and a Load Balancer could theoretically also route by path — but combining them would blur exactly the line Single Responsibility exists to keep sharp. Two entities, two jobs, composed in the same graph: often a Reverse Proxy sits in front of several Load Balancers, one per service, not the other way around.",
    relatedConcepts: [
      "API Gateway",
      "Path-Based Routing",
      "Service Routing",
      "Single Responsibility",
    ],
  },
  kafka: {
    truth: "I remember what I sent. Producers and consumers move at their own pace, over a log, not a queue.",
    whatAmI:
      "I split into partitions — a message's partition is a hash of its key, so the same key always lands in the same partition, giving strict order within a partition and no ordering promise across them. Every downstream connection is an independent consumer group, each getting every message on its own schedule, same fan-out shape as Message Queue's Topic mode — but a group's real parallelism is capped at however many partitions exist: a sixth consumer in a group reading a 4-partition topic has nothing to read. I acknowledge a producer the instant a message is durably written, before any consumer group is even considered — that's the log, not the consumers, doing the remembering.",
    learningGoal:
      "Partition count is one decision that trades ordering against parallelism for every consumer group at once — more partitions, more room for consumers to work in parallel, but ordering is only ever guaranteed within one. I don't simulate replay (a group joining later and reading from the beginning) or true unbounded retention — every consumer group here exists from the start and reads live, and a group that falls too far behind has its own dispatch rejected instead of just quietly lagging further, a bounded stand-in for what real consumer lag against a retention window actually costs.",
    relatedConcepts: [
      "Partitioning",
      "Consumer Groups",
      "Offsets",
      "Consumer Lag",
      "Log-Based Storage",
      "Fan-out",
    ],
  },
  llm_call: {
    truth: "I have real cost, real latency, and a real chance of being confidently wrong.",
    whatAmI:
      "I'm the reasoning/generation step every agent pattern is built from — a call to a model, standing in for anything from a one-line classification to a long chain-of-thought answer. Model Tier (SLM vs LLM), Quantization (None/FP8/INT8/INT4), and Deployment Target (Cloud vs Edge) each independently shift my speed, cost, and reliability — cheaper and faster is a real trade-off against how often I hallucinate, not a free win. I use the same bounded-concurrency admit-queue-reject mechanism API Server does, so my own latency rises under concurrent load the same way real inference serving's does.",
    learningGoal:
      "A model call isn't a black box the interesting engineering happens around — it's a primitive with measurable properties, the same way a Database query is. Output tokens cost several times what input tokens cost in real inference pricing, so a call that reasons verbosely pays a structurally different price than one that reads a lot of context and answers briefly. And a hallucination usually looks like clean success, not an error — which is why the accuracy cost of a cheaper tier or heavier quantization has to be something you measure by running it, not something you take on faith.",
    relatedConcepts: [
      "Context Window",
      "Quantization",
      "Continuous Batching",
      "Hallucination",
      "Inference Cost",
    ],
  },
  tool_call: {
    truth: "I'm what makes 'Tool Use' more than a model talking to itself.",
    whatAmI:
      "I stand in for a real external action — a function, an API, an MCP tool — the thing an llm_call reaches for when generating text alone isn't enough. Together, `llm_call → tool_call` is the simplest of the six canonical agent patterns: Tool Use. I use the same bounded-concurrency shape as every other entity here, and I can fail two independent ways — the external call itself failing, or its response not matching the shape the calling model expected.",
    learningGoal:
      "The boundary where a model's text output becomes a real, structured call is exactly where two of the most common documented agent failure modes live: schema violations and hallucinated tool invocations. Both can look like clean, well-formed success in a trace while being simply wrong — a trace showing a tool call that executed is proof it executed, not proof it was valid. Least privilege — only wiring up the tools an agent actually needs — is the practical containment for what a compromised or confused model might otherwise be tricked into calling.",
    relatedConcepts: [
      "Tool Use",
      "MCP",
      "Schema Validation",
      "Prompt Injection",
      "Least Privilege",
    ],
  },
  agent_orchestrator: {
    truth: "I hold the loop — which makes me the site where a loop can run away.",
    whatAmI:
      "I route, plan, and loop across whatever's wired downstream of me. Sequential mode dispatches to each target one at a time, in order — Planning: an ordered sequence of subtasks. Parallel mode dispatches to every target at once and waits for all of them — Orchestrator-Worker: independent work fanned out, then synthesized. Either way, I hold a session for as long as I'm coordinating — every step, every worker, every retry — not just one hop, the way most other entities here do.",
    learningGoal:
      "A failed step doesn't have to mean the whole thing fails immediately — I retry it in place, up to Max Iterations, before giving up. That's also exactly where an infinite retry loop lives if nothing bounds it: a failed call retried identically, forever, with no recognition it keeps failing the same way. Set Max Iterations very high against a consistently-failing target and watch that target's own request count balloon far past what one logical request should ever cause — the failure mode made visible, not asserted. Orchestrator-Worker's parallel fan-out is also a real trade-off, not a free speedup: it's overkill for a linear, dependent workflow, and only earns its extra concurrent-call cost when the work it's fanning out to is genuinely independent.",
    relatedConcepts: [
      "Planning",
      "Orchestrator-Worker",
      "Iteration Limits",
      "Infinite Retry Loop",
      "Invoke Agent Span",
    ],
  },
  memory_context_store: {
    truth: "I don't fail loudly when I'm full — I just quietly decide what gets forgotten.",
    whatAmI:
      "I'm the context window a long-running agent session lives in. Every turn that passes through me adds to a running size; once it exceeds Capacity, my Compaction Policy decides what happens next — None truncates the oldest content for free, Summarization compresses it at the cost of extra latency, Scratchpad writes it to a file outside the window at the cost of a re-read on every later turn. All three keep the session going. Only some of them keep what actually mattered.",
    learningGoal:
      "Context that isn't managed doesn't error — it rots: attention to relevant information degrades as irrelevant tokens accumulate, and a session can look completely healthy in every metric except the one that matters, whether the model still knows the thing it was told at the start. None is the fastest, cheapest policy right up until the moment it silently drops that original constraint forever — the failure doesn't show up as a crash, it shows up later as request after request quietly going wrong for no visible reason. That's failure mode #3, context truncation, made observable instead of asserted: compare all three policies over the same long session and watch when, or whether, the thing you told it at the start survives to the last turn.",
    relatedConcepts: [
      "Context Engineering",
      "Context Window",
      "Compaction",
      "Context Rot",
      "Short-Term Memory",
    ],
  },
  retriever: {
    truth: "I have four different personalities, and picking the wrong one costs you real accuracy, not just speed.",
    whatAmI:
      "I'm the knowledge-lookup step — RAG, which fractured into three real architectures pretending to be one thing, plus a fourth that routes between them. Pipeline is the fast, cheap, one-shot baseline. Agentic turns me into a bounded loop that retrieves, critiques, and re-retrieves. GraphRAG trades chunk similarity for graph traversal — slower on an ordinary lookup, but it's the only one of the four that can actually answer a genuinely relational question. Adaptive routes each query to whichever of Pipeline or GraphRAG can answer it, reusing their real behavior instead of inventing a fifth.",
    learningGoal:
      "Chunk-similarity search has a structural ceiling, not just an accuracy dial — no amount of tuning Pipeline's Miss Rate down makes it good at 'which vendors does our highest-risk supplier also share with?', because that answer was never sitting in one similar-looking chunk. That's what Relationship Query traffic and GraphRAG's Relationship Bonus are for: a real, measurable case where a fundamentally different retrieval architecture wins, not a better-tuned version of the same one. And Agentic's retry loop isn't a free accuracy upgrade either — the same research this is grounded in names the real risk directly: without redundancy, an unresolved retrieval loop can self-correct into a more elaborate hallucination instead of just failing honestly.",
    relatedConcepts: [
      "Pipeline RAG",
      "Agentic RAG",
      "GraphRAG",
      "Adaptive RAG",
      "Retrieval Loop",
    ],
  },
  guardrail_validator: {
    truth: "I don't create the retry loop — I'm just what finally makes it mean something.",
    whatAmI:
      "I'm an inline check, wired downstream of an llm_call: Gate mode asks a binary question (good enough to ship?), Scorer mode asks a graded one (how good, on some scale, against a threshold?). Wire me inside a Sequential Agent Orchestrator and a failure here propagates back through the llm_call to the orchestrator's own existing retry — no new loop mechanism needed, just a real pass/fail decision driving a mechanism that already existed. That's Reflection (Gate) or Evaluator-Optimizer (Scorer).",
    learningGoal:
      "The gap between 'blind retry' and 'self-critique' isn't a bigger loop — it's whether something actually decides the result is good enough, and why. Scorer mode's Verification Method makes the sharpest lesson here real instead of asserted: Execution-based grounding (a real test passing, a database's real end state) never drifts, however many times you retry the identical request. Judge-based grounding — another model judging the output — measurably does: the same underlying answer gets graded more leniently on each retry without actually improving. That's not a hypothetical risk, it's Judge Drift / Attempt, a dial you can turn up and watch a loop 'pass' for the wrong reason.",
    relatedConcepts: [
      "Reflection",
      "Evaluator-Optimizer",
      "Execution-Based Verification",
      "Judge-Based Scoring",
      "Self-Correction Risk",
    ],
  },
  model_router: {
    truth: "I don't make either model smarter — I just decide which one is worth paying for, per request.",
    whatAmI:
      "I'm the SLM/LLM cascade — wire an SLM-tier llm_call as my first downstream connection and an LLM-tier one as my second, and I decide, per request, which one actually handles it. Always-LLM and Always-SLM are the two baselines with no routing logic at all. Confidence-cascade escalates to the LLM only when a per-request confidence signal falls below a threshold. Cost-optimized-cascade adds a real budget on top: once too much traffic has already escalated, further escalations get suppressed even when confidence alone called for one.",
    learningGoal:
      "The 90/10 rule — an SLM delivers roughly 90% of an LLM's functionality at roughly 10% of the cost — isn't an argument for picking one model tier forever. It's an argument for routing: send the easy majority to the cheap tier, reserve the expensive one for what actually needs it. Confidence-cascade versus Cost-optimized-cascade is the sharpest version of that lesson: a stateless per-request threshold can be individually reasonable on every single decision while still blowing through a real monthly budget, because it never looks at the running total. A budget-aware cap is what actually enforces the '75-85% cost cut' claim instead of just hoping for it.",
    relatedConcepts: [
      "SLM/LLM Cascade",
      "Model Routing",
      "90/10 Rule",
      "Confidence Threshold",
      "Cost-Optimized Routing",
    ],
  },
  human_in_loop_gate: {
    truth: "I don't make the decision better — I just make sure a human sees it before it's irreversible.",
    whatAmI:
      "I'm an approval branch, wired directly in front of whatever tool_call actually performs an action that can't be undone. Every request pays my Approval Latency first — a real human review delay, not an instant check — then Denial Rate decides the outcome. Approved requests forward on exactly like they passed any other check; denied ones fail with reason human_denied_approval, a distinct signal from a guardrail rejection or a tool failure: a human looked at this and said no.",
    learningGoal:
      "Not every action deserves the same gate. A reversible action can fail fast and retry; an irreversible one — a refund, a production deploy, a destructive delete — deserves a harder, explicit checkpoint. That's reversibility-weighted risk, the same principle Claude Code's own layered validation is built on: because the check sits outside the model's own reasoning, a compromised or hallucinated decision still has to clear a real human before anything unrecoverable happens.",
    relatedConcepts: [
      "Reversibility-Weighted Risk",
      "Escalation Path",
      "Defense in Depth",
      "Human-in-the-Loop",
      "Irreversible Actions",
    ],
  },
};

export function getEntityEducation(type: EntityType): EntityEducation {
  return ENTITY_EDUCATION[type];
}
