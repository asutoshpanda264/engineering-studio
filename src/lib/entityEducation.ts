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
};

export function getEntityEducation(type: EntityType): EntityEducation {
  return ENTITY_EDUCATION[type];
}
