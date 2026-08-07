/**
 * Declarative config fields per entity type, for the Inspector panel.
 * Adding a new tunable knob to an entity is a new row here, not new JSX —
 * the Inspector renders whatever this table says an entity type has.
 *
 * Field keys match the config properties the entities themselves read
 * (see APIServerConfig / DatabaseConfig) — keep them in sync. The one
 * exception is Client's requestRate: the Client entity itself doesn't
 * generate its own traffic (see Client.ts), so workshopBridge reads this
 * field and feeds it into the scenario's traffic pattern instead.
 */

import type { EntityType } from "@/simulation/types";

interface BaseFieldSchema {
  key: string;
  label: string;
  /** Abbreviated label for the compact summary shown directly on the node card. */
  shortLabel: string;
  description: string;
}

export interface NumericFieldSchema extends BaseFieldSchema {
  /** "percent" fields are stored as 0-1 but edited as 0-100. */
  type: "number" | "percent";
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface SelectFieldSchema extends BaseFieldSchema {
  type: "select";
  options: { value: string; label: string }[];
  default: string;
}

export type ConfigFieldSchema = NumericFieldSchema | SelectFieldSchema;

export const ENTITY_CONFIG_SCHEMA: Partial<Record<EntityType, ConfigFieldSchema[]>> = {
  client: [
    {
      key: "requestRate",
      label: "Request Rate",
      shortLabel: "rate",
      type: "number",
      min: 0,
      max: 1000,
      step: 1,
      default: 20,
      unit: "req/s",
      description:
        "How many requests per second this client generates. Raise it to stress-test downstream capacity — every entity in the chain has to keep up or it starts queueing and rejecting. Lower it to see the same architecture behave well under light load.",
    },
    {
      key: "keyPoolSize",
      label: "Key Pool Size",
      shortLabel: "keys",
      type: "number",
      min: 1,
      max: 100_000,
      step: 1,
      default: 50,
      description:
        "How many distinct resources exist. Small pool = requests repeat a lot (a Cache can help). Large pool = requests are mostly unique (a Cache can't).",
    },
    {
      key: "routePoolSize",
      label: "Route Pool Size",
      shortLabel: "routes",
      type: "number",
      min: 1,
      max: 8,
      step: 1,
      default: 3,
      description:
        "How many distinct named services this client's requests are spread across (uniformly, not skewed like Key Pool Size) — /orders, /users, /payments, and so on. Only matters if a Reverse Proxy is downstream: it's what a Reverse Proxy's routing rules match against. Irrelevant to every other entity.",
    },
    {
      key: "missingKeyRate",
      label: "Missing Key Rate",
      shortLabel: "missing",
      type: "percent",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0,
      unit: "%",
      description:
        "Fraction of this client's requests that target a resource that will never exist — a typo'd id, a deleted record, an attacker probing for valid ids. These always land on the same small, fixed pool of permanently-missing keys, separate from the normal Key Pool. Only matters if a Cache is downstream: it's what a Cache's Negative Caching config protects against — cache penetration. 0 = off, the default: no phantom traffic.",
    },
  ],
  api: [
    {
      key: "maxConcurrent",
      label: "Max Concurrent",
      shortLabel: "max",
      type: "number",
      min: 1,
      max: 50,
      step: 1,
      default: 10,
      description:
        "Requests this server can process at the same time. Raise it to admit more concurrent traffic before anything queues or gets rejected — the realistic ceiling is CPU/memory per instance, not a free lever. Lower it to see the same traffic start backing up and failing sooner.",
    },
    {
      key: "maxQueueLength",
      label: "Max Queue Length",
      shortLabel: "queue",
      type: "number",
      min: 0,
      max: 200,
      step: 1,
      default: 50,
      description:
        "Requests allowed to wait once at capacity, before being rejected. Raise it to absorb short traffic bursts without dropping requests, at the cost of higher latency for whatever's waiting. Lower it (or set 0) to reject overflow immediately instead of making it wait.",
    },
    {
      key: "processingTimeMs",
      label: "Processing Time",
      shortLabel: "proc",
      type: "number",
      min: 1,
      max: 200,
      step: 1,
      default: 5,
      unit: "ms",
      description:
        "Time spent handling business logic per request. Raise it to simulate heavier per-request work — each server occupies its concurrency slots longer, so effective throughput drops even with Max Concurrent unchanged. Lower it to free up slots faster and raise effective throughput.",
    },
  ],
  database: [
    {
      key: "type",
      label: "Database Type",
      shortLabel: "type",
      type: "select",
      default: "sql",
      options: [
        { value: "sql", label: "SQL — Relational" },
        { value: "nosql", label: "NoSQL — Document / Key-Value" },
      ],
      description:
        "SQL (relational: Postgres, MySQL) enforces a fixed schema and supports joins and ACID transactions — strong consistency, but that query-planning and locking overhead caps how much concurrent write throughput a single instance handles, and joins make horizontal sharding hard. NoSQL (DynamoDB, MongoDB, Cassandra) trades that away for a flexible schema and data partitioned by key across many nodes — much higher concurrent write throughput and easier horizontal scaling, at the cost of joins and (usually) strong consistency. NoSQL isn't one thing, either: document stores (MongoDB), key-value stores (DynamoDB, Redis), column-family stores (Cassandra), and graph databases (Neo4j) each solve a different access pattern — this option collapses all four into one simulated profile, not four distinct shapes. Reach for SQL when correctness and relationships between records matter more than raw throughput (orders, payments, inventory); reach for NoSQL when the access pattern is simple lookups by key at high volume and slightly-stale reads are acceptable (event/analytics ingestion, session storage, catalogs). This changes simulated behavior here: NoSQL applies roughly 3x the effective connection ceiling and roughly half the query time on top of whatever Max Connections / Processing Time you set below, modeling partitioning and simpler key-based access — it does not simulate schemas, joins, or consistency guarantees, and it does not distinguish between NoSQL's four subtypes.",
    },
    {
      key: "maxConnections",
      label: "Max Connections",
      shortLabel: "conn",
      type: "number",
      min: 1,
      max: 50,
      step: 1,
      default: 5,
      description:
        "Queries the connection pool can run at the same time. Raise it to let more queries execute concurrently before they queue — real databases cap this because each connection costs memory on the server, so it's not free to raise indefinitely. Lower it to see contention for the pool show up sooner.",
    },
    {
      key: "maxQueueLength",
      label: "Max Queue Length",
      shortLabel: "queue",
      type: "number",
      min: 0,
      max: 500,
      step: 1,
      default: 100,
      description:
        "Queries allowed to wait once at capacity, before being rejected. Raise it to ride out a burst of queries without failing any of them, at the cost of every waiting query getting slower. Lower it (or set 0) to fail overflow queries immediately instead of queueing them.",
    },
    {
      key: "processingTimeMs",
      label: "Processing Time",
      shortLabel: "query",
      type: "number",
      min: 1,
      max: 300,
      step: 1,
      default: 15,
      unit: "ms",
      description:
        "Time spent executing a single query. Raise it to model heavier queries (missing indexes, large scans, complex joins) — each occupies a connection longer, lowering effective throughput at a given Max Connections. Lower it to model a faster, well-indexed query.",
    },
    {
      key: "failureProbability",
      label: "Failure Probability",
      shortLabel: "fail",
      type: "percent",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0,
      unit: "%",
      description:
        "Chance a query fails independently of load — models flaky infrastructure, not overload. Raise it to see errors appear even when the database is nowhere near capacity, and to test whether a Circuit Breaker or retry logic upstream actually helps. 0 means failures only ever come from being over capacity.",
    },
  ],
  load_balancer: [
    {
      key: "algorithm",
      label: "Algorithm",
      shortLabel: "algo",
      type: "select",
      default: "round_robin",
      options: [
        { value: "round_robin", label: "Round Robin" },
        { value: "least_connections", label: "Least Connections" },
        { value: "weighted_round_robin", label: "Weighted Round Robin" },
        { value: "ip_hash", label: "IP Hash" },
        { value: "least_response_time", label: "Least Response Time" },
      ],
      description:
        "Round robin cycles through targets in order, regardless of load. Least connections sends each request to whichever target currently has the fewest in-flight requests — they behave identically when targets are equally fast, and diverge once one is slower or overloaded: round robin keeps sending it an equal share anyway, least connections routes around it. Weighted round robin cycles through targets like plain round robin, but proportional to each target's configured weight below (a weight-3 target gets 3x a weight-1 target's share) — it diverges from plain round robin by design, not by load, useful when targets have known, fixed capacity differences (a bigger instance type, for example) rather than load that varies at runtime. IP Hash routes by hashing a per-request identifier so the same identifier always lands on the same target — session affinity, at the cost of not rebalancing around slow targets at all; this simulation has no modeled client IP, so it hashes the request's resource key instead (the closest available stand-in — a documented substitution, not a literal IP). Least Response Time is least connections' generalization from request count to actual observed latency — it routes to whichever target has the lowest recent average response time, so it reacts to a target that's technically available but just slow, not only one that's saturated.",
    },
  ],
  cache: [
    {
      key: "capacity",
      label: "Capacity",
      shortLabel: "cap",
      type: "number",
      min: 1,
      max: 500,
      step: 1,
      default: 20,
      unit: "keys",
      description:
        "How many distinct keys the cache can hold before it must evict one to make room. Raise it to hold more of the Client's key pool at once, improving hit rate (fewer evictions competing for the same slots) — real memory-backed caches size this against available RAM, so it isn't free to raise indefinitely. Lower it to evict more aggressively and see the hit rate drop.",
    },
    {
      key: "evictionPolicy",
      label: "Eviction Policy",
      shortLabel: "evict",
      type: "select",
      default: "lru",
      options: [
        { value: "lru", label: "LRU — Least Recently Used" },
        { value: "lfu", label: "LFU — Least Frequently Used" },
        { value: "fifo", label: "FIFO — First In, First Out" },
        { value: "mru", label: "MRU — Most Recently Used" },
      ],
      description:
        "Which entry to remove when a new key arrives at capacity. LRU (the common default) evicts whatever hasn't been touched in the longest time — good for most traffic shapes. LFU evicts whatever's been requested least often — better when a small set of keys is disproportionately hot. FIFO ignores access pattern entirely and evicts oldest-inserted first — simplest, worst hit rate under skewed traffic. MRU evicts the most recently used entry, which only makes sense for unusual cyclic-scan access patterns and generally performs worst here.",
    },
    {
      key: "ttlMs",
      label: "TTL",
      shortLabel: "ttl",
      type: "number",
      min: 0,
      max: 60_000,
      step: 100,
      default: 0,
      unit: "ms",
      description:
        "How long an entry stays valid after being stored. 0 = never expires on its own (only eviction removes it). Raise it to keep entries valid longer and improve hit rate, at the cost of staler data being served. Lower it to force fresher re-fetches more often, trading hit rate for freshness.",
    },
    {
      key: "stampedeMode",
      label: "Stampede Protection",
      shortLabel: "stampede",
      type: "select",
      default: "naive",
      options: [
        { value: "naive", label: "Naive — every concurrent miss re-fetches" },
        { value: "coalesced", label: "Coalesced — one fetch, others wait" },
      ],
      description:
        "What happens when several requests for the same key miss while a fetch for it is already in flight — a cache stampede, typically triggered by a hot key's TTL expiring under load. Naive: each one independently re-fetches from downstream, multiplying load right when it's least wanted. Coalesced: only the first miss fetches; the rest wait on it and share whatever it returns (request coalescing / single-flight, the standard production fix) — at the cost of holding their own slot in this cache's concurrency/queue the whole time they wait.",
    },
    {
      key: "negativeCaching",
      label: "Negative Caching",
      shortLabel: "negcache",
      type: "select",
      default: "off",
      options: [
        { value: "off", label: "Off — every miss for a missing key re-fetches" },
        { value: "on", label: "On — cache \"not found\" too" },
      ],
      description:
        "What happens on a miss for a key that turns out not to exist downstream (see the Client's Missing Key Rate) — cache penetration. Off: every request for that permanently-missing key makes its own full downstream round trip, forever — exactly what an attacker probing for valid ids exploits. On: the first \"not found\" result is cached too, for Negative Cache TTL below, so repeat lookups for the same missing key are answered straight from this cache instead of hammering downstream again.",
    },
    {
      key: "negativeCacheTtlMs",
      label: "Negative Cache TTL",
      shortLabel: "negttl",
      type: "number",
      min: 0,
      max: 60_000,
      step: 100,
      default: 2000,
      unit: "ms",
      description:
        "Negative Caching only — how long a cached \"not found\" stays valid before the next lookup re-checks downstream. Real systems usually keep this shorter than a normal positive TTL: too long risks masking a resource created later; too short reopens the door to penetration between expiries. 0 = never expires once cached.",
    },
    {
      key: "ttlJitterPercent",
      label: "TTL Jitter",
      shortLabel: "jitter",
      type: "percent",
      min: 0,
      max: 0.5,
      step: 0.01,
      default: 0,
      unit: "%",
      description:
        "Randomizes each entry's own TTL by up to ± this fraction of the configured TTL above, so a batch of entries cached around the same time (a cold start, a deploy) don't all expire in the same instant — a cache avalanche. 0 = off, the default: every entry shares the exact same TTL, so a wave of near-simultaneous first-time cache fills expires as one synchronized wave of downstream re-fetches later. Has no effect when TTL is 0 (never-expiring entries have nothing to stagger).",
    },
  ],
  cdn: [
    {
      key: "edgeCount",
      label: "Edge Count",
      shortLabel: "edges",
      type: "number",
      min: 1,
      max: 20,
      step: 1,
      default: 5,
      description:
        "How many geographically distributed edges the CDN operates. Raise it for better geographic coverage (more users land near an edge, lower latency on average) — but the same traffic now splits across more independent, separately-warmed caches, so each edge sees fewer requests and its own hit rate drops. Lower it to concentrate traffic on fewer edges — higher per-edge hit rate, less geographic spread.",
    },
    {
      key: "minEdgeLatencyMs",
      label: "Min Edge Latency",
      shortLabel: "near",
      type: "number",
      min: 0,
      max: 500,
      step: 1,
      default: 1,
      unit: "ms",
      description:
        "One-way latency to the nearest edge — the best case, for a user who happens to land close to one. Raise it to model a sparser edge network with longer minimum reach; lower it to model edges placed very close to users.",
    },
    {
      key: "maxEdgeLatencyMs",
      label: "Max Edge Latency",
      shortLabel: "far",
      type: "number",
      min: 0,
      max: 500,
      step: 1,
      default: 6,
      unit: "ms",
      description:
        "One-way latency to the farthest edge — the worst case, for a user furthest from any edge. Raise it to widen the gap between best- and worst-served users; lower it (closer to Min Edge Latency) to make which edge a user hits matter less.",
    },
    {
      key: "capacity",
      label: "Capacity (per edge)",
      shortLabel: "cap",
      type: "number",
      min: 1,
      max: 500,
      step: 1,
      default: 20,
      unit: "keys",
      description:
        "How many distinct keys each edge can hold before it must evict one. Raise it so each edge holds more of the working set and evicts less often, improving that edge's hit rate. Lower it to see edges thrash (evict-then-refetch) sooner under the same traffic.",
    },
    {
      key: "evictionPolicy",
      label: "Eviction Policy",
      shortLabel: "evict",
      type: "select",
      default: "lru",
      options: [
        { value: "lru", label: "LRU — Least Recently Used" },
        { value: "lfu", label: "LFU — Least Frequently Used" },
        { value: "fifo", label: "FIFO — First In, First Out" },
        { value: "mru", label: "MRU — Most Recently Used" },
      ],
      description:
        "Which entry an edge removes when a new key arrives at its capacity. Same tradeoff as Cache's eviction policy, applied independently at every edge: LRU suits most traffic, LFU favors a small hot set, FIFO is simplest but least accurate, MRU is a special case that usually hurts hit rate here.",
    },
    {
      key: "ttlMs",
      label: "TTL",
      shortLabel: "ttl",
      type: "number",
      min: 0,
      max: 60_000,
      step: 100,
      default: 0,
      unit: "ms",
      description:
        "How long an entry stays valid at an edge. 0 = never expires on its own. Raise it to keep edge content valid longer and improve hit rate, at the cost of staler content being served from edges. Lower it to force more frequent re-fetches from origin, trading hit rate for freshness.",
    },
  ],
  message_queue: [
    {
      key: "deliveryMode",
      label: "Delivery Mode",
      shortLabel: "mode",
      type: "select",
      default: "queue",
      options: [
        { value: "queue", label: "Queue — point-to-point" },
        { value: "topic", label: "Topic — fan-out / pub-sub" },
      ],
      description:
        "Queue (point-to-point): a shared pool of consumers competes for each message, so exactly one consumer gets it — a classic task queue, connect one downstream target. Topic (fan-out/pub-sub): every downstream connection is treated as an independent subscriber with its own consumer pool, and gets its own copy of every message — connect several downstream targets to see fan-out. A slow subscriber under Topic only ever falls behind on its own copy; it never blocks the publish or any other subscriber, since there's no shared backlog to overflow. That also means fan-out multiplies dispatch load by subscriber count for the same producer rate — a topic backs up faster than a queue unless Consumer Count / Max Queue Length are sized for that.",
    },
    {
      key: "consumerCount",
      label: "Consumer Count",
      shortLabel: "consumers",
      type: "number",
      min: 1,
      max: 50,
      step: 1,
      default: 3,
      description:
        "Consumers pulling messages off the backlog at the same time — per subscriber, under Topic mode. Raise it to drain the backlog faster and keep messages from piling up under sustained load. Lower it to see the backlog grow and messages wait longer before being picked up.",
    },
    {
      key: "maxQueueLength",
      label: "Max Queue Length",
      shortLabel: "backlog",
      type: "number",
      min: 0,
      max: 5_000,
      step: 10,
      default: 500,
      description:
        "Messages the backlog can buffer once every consumer is busy, before rejecting new ones — per subscriber, under Topic mode. Raise it to absorb a bigger burst of producer traffic without dropping messages, at the cost of longer wait times for whatever's backlogged. Lower it to reject overflow sooner instead of letting the backlog grow unbounded.",
    },
    {
      key: "dispatchTimeMs",
      label: "Dispatch Time",
      shortLabel: "dispatch",
      type: "number",
      min: 1,
      max: 500,
      step: 1,
      default: 10,
      unit: "ms",
      description:
        "Time a consumer takes to pick up and hand off one message. Raise it to model slower consumers — each occupies a consumer slot longer, lowering effective drain rate even with Consumer Count unchanged. Lower it to model faster consumers and a quicker-draining backlog.",
    },
  ],
  kafka: [
    {
      key: "partitionCount",
      label: "Partition Count",
      shortLabel: "partitions",
      type: "number",
      min: 1,
      max: 12,
      step: 1,
      default: 3,
      description:
        "How many partitions the topic is split into. A message's partition is a deterministic hash of its key, so the same key always lands in the same partition — strict ordering within a partition, no ordering promise across partitions. Also caps how many consumers any one consumer group can usefully run at once (see Consumers per Group) — raising this is how you buy more real parallelism, not just adding more consumers.",
    },
    {
      key: "consumerCountPerGroup",
      label: "Consumers per Group",
      shortLabel: "consumers",
      type: "number",
      min: 1,
      max: 20,
      step: 1,
      default: 3,
      description:
        "Consumers each connected consumer group runs. A group's useful parallelism is capped at min(this, Partition Count) — a consumer beyond the partition count has no partition left to read and sits idle. Raise Partition Count, not this, once you've hit that ceiling.",
    },
    {
      key: "maxQueueLength",
      label: "Max Queue Length",
      shortLabel: "backlog",
      type: "number",
      min: 0,
      max: 5_000,
      step: 10,
      default: 500,
      description:
        "Messages a consumer group's own backlog can buffer once every one of its consumers is busy, before that group starts falling behind (a bounded stand-in for consumer lag against a retention window). Independent per group — one group falling behind never affects another's backlog.",
    },
    {
      key: "dispatchTimeMs",
      label: "Dispatch Time",
      shortLabel: "dispatch",
      type: "number",
      min: 1,
      max: 500,
      step: 1,
      default: 10,
      unit: "ms",
      description:
        "Time a consumer takes to pick up and hand off one message, per consumer group. Raise it to model slower consumers — lowers a group's effective drain rate even with its consumer count unchanged.",
    },
  ],
  rate_limiter: [
    {
      key: "algorithm",
      label: "Algorithm",
      shortLabel: "algo",
      type: "select",
      default: "token_bucket",
      options: [
        { value: "token_bucket", label: "Token Bucket" },
        { value: "sliding_window", label: "Sliding Window" },
      ],
      description:
        "Token bucket accumulates idle capacity and lets a burst through in one go, up to Burst Capacity, before throttling to the steady rate. Sliding window is a hard, steady ceiling with no burst allowance — they admit the same under smooth traffic and diverge once traffic bursts: token bucket forgives the spike, sliding window rejects the overflow immediately.",
    },
    {
      key: "requestsPerSecond",
      label: "Requests / Second",
      shortLabel: "rate",
      type: "number",
      min: 1,
      max: 1000,
      step: 1,
      default: 50,
      unit: "req/s",
      description:
        "The steady-state rate this limiter admits requests at. Raise it to let more traffic through to whatever's downstream (weaker protection, fewer rejections here). Lower it to protect downstream more aggressively, at the cost of rejecting more legitimate traffic once the ceiling is hit.",
    },
    {
      key: "burstCapacity",
      label: "Burst Capacity",
      shortLabel: "burst",
      type: "number",
      min: 1,
      max: 1000,
      step: 1,
      default: 100,
      unit: "tokens",
      description:
        "Token Bucket only — how many requests can burst through at once once idle capacity has accumulated. Raise it to tolerate bigger spikes without rejecting them. Lower it to clamp bursts down closer to the steady Requests/Second rate. Has no effect under Sliding Window.",
    },
  ],
  circuit_breaker: [
    {
      key: "failureThreshold",
      label: "Failure Threshold",
      shortLabel: "threshold",
      type: "number",
      min: 1,
      max: 50,
      step: 1,
      default: 5,
      unit: "failures",
      description:
        "Consecutive failures from the wrapped target before this breaker trips open. Raise it to tolerate more transient errors before cutting the target off (slower to protect, less prone to tripping on noise). Lower it to trip sooner (more protective, but more prone to a false trip on a brief blip).",
    },
    {
      key: "tripDurationMs",
      label: "Trip Duration",
      shortLabel: "trip",
      type: "number",
      min: 100,
      max: 60_000,
      step: 100,
      default: 5000,
      unit: "ms",
      description:
        "How long the breaker stays open, failing fast, before letting a single probe request through to check if the target has recovered. Raise it to give a struggling target more uninterrupted time to recover, at the cost of a longer outage for callers. Lower it to retry recovery sooner, at the risk of probing a target that hasn't actually recovered yet.",
    },
    {
      key: "halfOpenMaxProbes",
      label: "Half-Open Probes",
      shortLabel: "probes",
      type: "number",
      min: 1,
      max: 10,
      step: 1,
      default: 1,
      unit: "probes",
      description:
        "Requests allowed through concurrently while checking if the target has recovered. One probe failing reopens the breaker immediately. Raise it to confirm recovery faster (more signal, sooner) but risk overwhelming a target that's only barely back. Lower it toward 1 for the safest, slowest recovery check.",
    },
  ],
  replica_pool: [
    {
      key: "writeRatio",
      label: "Write Ratio",
      shortLabel: "writes",
      type: "percent",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.1,
      unit: "%",
      description:
        "Fraction of requests treated as writes, routed to the leader (the first connection drawn from this pool). The rest are reads, spread round-robin across the remaining connections — the read replicas. Raise it to send more load to the single leader, which doesn't scale horizontally the way replicas do — that's the realistic bottleneck this models. Lower it to spread more load across replicas, which is where this pattern actually helps.",
    },
  ],
};
