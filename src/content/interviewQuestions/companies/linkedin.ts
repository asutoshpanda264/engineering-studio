import type { InterviewQuestion } from "../types";

/**
 * LinkedIn — researched 2026-08-24, see `docs/interview_exp.md` for the full
 * research log and the complete list of what was found. This file is
 * deliberately a small subset of that research: only questions with a real,
 * expansive prompt — specific requirements, numbers, constraints, or a
 * concrete narrative — make it in here. A one-line imperative like "Design
 * a rate limiter." is a real reported topic (and stays in the tracker doc),
 * but it reads as a topic label, not a question a candidate could actually
 * sit down and answer — so it doesn't ship to this practice UI. See the
 * tracker's "Shipped to app" note for the full before/after list and
 * reasoning.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a transcript
 * to memorize. These are authored by reasoning through each problem the way
 * a strong candidate would, not sourced from a specific candidate's actual
 * answer — unlike `prompt`/`context`, which are sourced and cited,
 * `optimalAnswer` is this app's own content.
 */
export const LINKEDIN_QUESTIONS: InterviewQuestion[] = [
  {
    id: "linkedin-top-shared-posts-time-windows",
    company: "LinkedIn",
    title: "Design a top-shared-posts tracking system",
    prompt:
      "The shared item can be shared in LinkedIn or could be shared outside the LinkedIn ecosystem. Design a system to get the top shared items in the last 5 minutes, and the top shared items in the last 24 hours.",
    category: "system-design",
    tags: ["top-k-streaming"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/post/342381/design-top-shared-posts-in-linkedin/",
      reportedDate: "Jul 2019",
      confidence: "high",
      note: "A second commenter independently confirmed getting the same question in a LinkedIn system-design round; a LeetCode 'LinkedIn Senior role System Design Questions/Topics' thread separately lists a top-K/time-window variant of this as one of the two most commonly repeated LinkedIn system-design prompts.",
    },
    context:
      "One commenter framed it as functionally the same problem as tracking the most-tweeted hashtag at Twitter-scale, pointing toward heavy-hitters / Top-K-over-a-sliding-window streaming algorithms as the expected approach.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Does 'shared outside LinkedIn' mean a distinct share type (e.g. copy-link vs. re-share-in-feed) that needs separate counting, or just one more event source feeding the same counter?",
        "Is 'top' by raw share count, or does recency need to weight more heavily within each window?",
        "How many distinct posts are we tracking shares for at once — order of millions?",
        "Does a share event ever need to be retracted (undo), or is this append-only?",
      ],
      requirements: [
        "Ingest share events tagged with a post id, a timestamp, and whether the share happened inside LinkedIn or was tracked as an external share",
        "Serve top-N shared posts for a trailing 5-minute window",
        "Serve top-N shared posts for a trailing 24-hour window, computed from the same underlying event stream",
        "Low read latency — this is a live ranking surface, not a batch report",
        "Scale to a high, bursty share-event rate (a viral post can spike share volume by orders of magnitude in minutes)",
      ],
      approach:
        "This is the classic heavy-hitters / Top-K-over-a-sliding-window problem, but with two windows of very different size sharing one input stream — the design should compute both from the same counters rather than running two independent pipelines.",
      keyPoints: [
        "Ingest share events through a queue (Kafka-style) so a viral spike buffers rather than overwhelming the counting layer directly",
        "Bucket counts by post id into fixed time buckets (e.g. 1-minute buckets) in an in-memory store (Redis) with sorted-set increments — a bucket's counts age out naturally via TTL/eviction rather than needing a sweep job",
        "5-minute window: sum the last 5 one-minute buckets per post on read, or maintain a rolling sorted set (ZINCRBY per share, ZREVRANGE for the top N) that gets decremented as the oldest bucket ages out",
        "24-hour window: don't re-derive from 1,440 one-minute buckets on every read — roll minute buckets up into hourly buckets asynchronously, so the 24h read is a sum over 24 hourly buckets, not 1,440",
        "Maintain a separate top-N candidate set (e.g. a bounded max-heap or Redis sorted set capped at a few thousand posts) rather than ranking the entire post catalog on every read — only posts that received at least one recent share are candidates",
        "Distinguish internal vs. external shares as two counters per post per bucket so both a combined ranking and an internal-only ranking are answerable without re-ingesting",
      ],
      tradeoffs: [
        "Exact counts vs. an approximate heavy-hitters sketch (e.g. Count-Min Sketch) — exact per-post counters are affordable here since the post catalog with recent activity is bounded; a sketch only pays off if the key space is unbounded (e.g. per-user counts), which isn't the case for post-level tracking",
        "Recomputing rankings on every read vs. maintaining a live top-N heap updated on every write — a live heap trades write-path complexity for much cheaper reads, which is the right trade for a frequently-polled ranking surface",
        "One combined internal+external counter vs. two separate counters merged at read time — separate counters cost a bit more storage but let a single pipeline answer both 'top shared overall' and 'top shared inside LinkedIn' without re-ingesting or re-partitioning the stream",
      ],
      followUps: [
        "How would you extend this to arbitrary windows (top shared in the last N minutes, for any N) instead of just 5 minutes and 24 hours?",
        "How do you handle a single post going viral and dominating the counters — does anything need rate-limiting or dampening?",
        "What happens to the ranking if the ingestion pipeline falls behind during a traffic spike?",
      ],
      relatedLinks: [
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Build it: Trending Hashtags Feed scenario", href: "/workshop?scenario=trending-hashtags-feed" },
      ],
    },
  },
  {
    id: "linkedin-flexible-cache-eviction-policies",
    company: "LinkedIn",
    title: "Design a flexible in-memory cache with customizable eviction policies",
    prompt:
      "Design a flexible in-memory cache with customizable capacity and eviction policies. The cache should allow users to define: Capacity — how much data the cache can hold based on memory resources and data size; Eviction Policy — a pluggable strategy for removing items when the cache is full, such as Least Recently Used (LRU) or Lowest Priority. This flexibility should let the cache be tailored to different services' resource and performance needs.",
    category: "system-design",
    tags: ["caching"],
    level: "Staff Software Engineer, onsite system design round",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/post/6858262/linkedin-staff-software-engineer-intervi-mg5c/",
      reportedDate: "Jun 2025",
      confidence: "high",
      note: "Full first-person account of a 6-round Staff SWE loop with an offer; this was the system-design round (Round 4).",
    },
    context:
      "Once the candidate's single-node LLD was agreed, the interviewer extended it to an HLD for a distributed, multi-node setup — covering the hot-key problem in a write-heavy workload and pushing specifically into Redis internals.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is 'Lowest Priority' a caller-supplied priority per entry, or derived from something else (e.g. access frequency)?",
        "Does capacity mean entry count, or bytes of memory — does the cache need to size variable-sized values?",
        "Single-process cache first, or does the distributed extension need to be designed from the start?",
        "Do different callers need genuinely different eviction policies at the same time, or one policy per cache instance?",
      ],
      requirements: [
        "Pluggable eviction strategy selected per cache instance (at minimum LRU and a priority-based policy)",
        "Configurable capacity, enforced regardless of which policy is active",
        "O(1) get/put on the hot path regardless of eviction policy",
        "Extends cleanly to a distributed, multi-node deployment without redesigning the single-node interface",
        "Handles a write-heavy hot key without degrading the rest of the cache",
      ],
      approach:
        "Design the single-node LLD around a Strategy interface for eviction so capacity enforcement and lookup stay policy-agnostic, then treat the distributed extension as a second, separate design pass layered on top — sharding, replication, and hot-key handling are HLD concerns that shouldn't leak into the eviction-policy interface itself.",
      keyPoints: [
        "Core structure: a hash map (key → node) for O(1) lookup, paired with a policy-owned ordering structure — a doubly linked list for LRU (move-to-front on access), a heap or ordered structure for priority-based eviction — behind one EvictionPolicy interface with onAccess(key), onInsert(key), and evict() -> key",
        "The cache class owns capacity enforcement: on put, if at capacity, call policy.evict() for a victim before inserting — this keeps the cache itself policy-agnostic and lets a new eviction strategy be added without touching cache logic",
        "Distributed extension: shard by key (consistent hashing) across nodes so no single node holds the whole keyspace; each shard runs its own local eviction policy independently rather than trying to coordinate a single global LRU order across nodes",
        "Hot-key problem in a write-heavy setup: a single very popular key concentrates writes on one shard — mitigate by replicating just that key across multiple nodes (read replicas for a detected hot key), or by adding a small per-node local cache in front of the sharded layer so repeated writes to the same key don't all cross the network",
        "Redis-internals discussion point: Redis's own maxmemory-policy (allkeys-lru, volatile-lru, allkeys-lfu, etc.) is a real-world instance of exactly this pluggable-eviction-policy pattern, and Redis approximates LRU with sampling rather than a true linked list for performance — worth naming as a production precedent",
        "TTL as an orthogonal concern from eviction: expired-but-not-yet-evicted entries should be treated as absent on read (lazy expiration) in addition to whatever active eviction policy is running, since eviction and expiration solve different problems",
      ],
      tradeoffs: [
        "True LRU (exact recency order via a linked list) vs. approximate LRU (sampling, like Redis's default) — exact is simpler to reason about at moderate scale; sampling trades a small accuracy loss for much cheaper eviction at very high throughput, which is why production caches default to it",
        "Per-shard independent eviction vs. a globally coordinated eviction order — independent per-shard eviction is far simpler and scales linearly, at the cost of a shard being able to evict something globally 'more valuable' than what another shard keeps; coordinating globally would require cross-node communication on every eviction, which doesn't scale",
        "Replicating a detected hot key vs. accepting the hot shard's throughput ceiling — replication fixes the bottleneck but adds write-consistency complexity (which replica is authoritative); accepting the ceiling is simpler but caps that key's throughput at one node's capacity",
      ],
      followUps: [
        "How would you add a new eviction policy (e.g. LFU) without touching the core cache class?",
        "How do you keep a replicated hot key consistent across its replicas under concurrent writes?",
        "What would you change if values varied wildly in size, so capacity needs to be tracked in bytes rather than entry count?",
      ],
      relatedLinks: [
        { label: "Foundations: Caching", href: "/foundations/caching" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Foundations: Consistent Hashing", href: "/foundations/consistent-hashing" },
        { label: "LLD: LRU Cache", href: "/lld/lru-cache" },
      ],
    },
  },
  {
    id: "linkedin-internal-notification-system-scale",
    company: "LinkedIn",
    title: "Design a LinkedIn internal notification system at very large scale",
    prompt:
      "Design an internal notification system for LinkedIn that can handle a very large scale.",
    category: "system-design",
    tags: ["notifications", "fanout-feed"],
    level: "Staff Software Engineer, Hiring Manager round",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/post/6858262/linkedin-staff-software-engineer-intervi-mg5c/",
      reportedDate: "Jun 2025",
      confidence: "high",
      note: "Same full loop account as the eviction-policy cache question above — this HLD was thrown in during the final 10-15 minutes of the Hiring Manager round.",
    },
    context:
      "The interviewer cross-questioned specifically about which internal microservices would be involved and how Kafka would be used for async handling.",
    optimalAnswer: {
      clarifyingQuestions: [
        "What triggers a notification — a connection request, a post like, a job match, a message — one type or many, each with different urgency?",
        "Delivery surfaces: in-app only, or also push/email — does each need different guarantees?",
        "Does a user need to see notifications in a consistent order across devices, or is best-effort per-device fine?",
        "Any dedup requirement — should 5 likes on the same post in 1 minute become 1 notification or 5?",
      ],
      requirements: [
        "Accept notification-triggering events from many internal producing services",
        "Fan out each event to the right recipient(s) across one or more delivery surfaces",
        "Handle very large scale — spiky, high-volume producer traffic without becoming a bottleneck for the services that emit it",
        "Async by design — producing services shouldn't block on notification delivery",
      ],
      approach:
        "Treat this as a producer/consumer pipeline decoupled by a message bus: producing microservices publish notification-worthy events and never wait on delivery, while a separate fan-out and delivery layer consumes, dedups, and routes at its own pace — this is exactly the shape the interviewer's Kafka follow-up was probing for.",
      keyPoints: [
        "Producing services (connections, feed, messaging, jobs, etc.) publish a lightweight event (actor, action, target, timestamp) to Kafka rather than calling a notification service synchronously — this is what keeps notification volume from ever becoming a producing service's own latency problem",
        "A fan-out consumer group reads the event stream and expands each event into per-recipient notification records — for a high-fan-out event (e.g. a popular post gets many likes) this expansion is the part that needs to scale horizontally, so partition by recipient so one consumer's backlog doesn't block another recipient's notifications",
        "A dedup/aggregation stage groups near-duplicate notifications for the same recipient within a short window (e.g. collapse 5 likes into '5 people liked your post') before they hit delivery — cuts both storage and perceived notification spam",
        "Delivery fan-out per surface: an in-app notification write (fast-path store, e.g. a per-user recent-notifications list in a wide-column store or Redis) plus separate async workers for push and email, each with their own retry/backoff so a slow email provider doesn't stall in-app delivery",
        "Multi-tenant/multi-team ownership: different producing teams own different event types but share the same ingestion contract and delivery infrastructure — an onboarding process for a new notification type should be adding a new event schema and consumer mapping, not new delivery-layer code",
      ],
      tradeoffs: [
        "Kafka-based async fan-out vs. a synchronous notification-service RPC per event — sync is simpler to reason about but makes every producing service's latency depend on notification-service health; async decouples them at the cost of eventual, not immediate, delivery",
        "Partitioning the fan-out stream by recipient vs. by event type — partitioning by recipient keeps one user's notification backlog isolated from another's, which matters more for user-facing latency than partitioning by event type would",
        "Aggregating near-duplicate notifications vs. delivering every raw event — aggregation is better UX and cheaper at scale, but adds a windowing/state component (what counts as 'near' in time) that a raw-delivery design avoids",
      ],
      followUps: [
        "How do you guarantee a user doesn't miss a notification if the delivery worker crashes mid-fan-out?",
        "How would you add per-user notification preferences (mute this type, digest instead of real-time) without redesigning the pipeline?",
        "How do you keep notification counts consistent across a user's multiple logged-in devices?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
        { label: "Build it: Wildfire Alert Broadcast scenario", href: "/workshop?scenario=wildfire-alert-broadcast" },
      ],
    },
  },
  {
    id: "linkedin-malicious-request-interceptor",
    company: "LinkedIn",
    title: "Design a system to intercept and deny malicious requests",
    prompt:
      "Given a system like LinkedIn, design a system where you have to intercept malicious requests and deny them. Assume a service isMaliciousRequest is available.",
    category: "system-design",
    tags: ["abuse-content-moderation"],
    level: "Staff Software Engineer, onsite system design round",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/post/7103201/staff-software-engineer-linkedin-by-anon-3ufy/",
      reportedDate: "Aug 2025",
      confidence: "high",
    },
    context:
      "isMaliciousRequest is given as a black-box primitive to design around, not something to implement — a commenter separately asked whether an interface was specified for it, which it wasn't; the design is expected to define that contract itself.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is isMaliciousRequest synchronous and fast, or could it be a slower ML-scoring call — does the design need to tolerate it being on the slow side?",
        "Should a request be blocked before it reaches the target service (a gateway-layer decision), or can it be flagged after the fact?",
        "Is 'malicious' a single boolean, or does it come with a confidence score that should drive graduated responses (block vs. rate-limit vs. log-and-allow)?",
        "Does this need to adapt to new attack patterns over time, or is isMaliciousRequest's own logic out of scope?",
      ],
      requirements: [
        "Evaluate incoming requests against isMaliciousRequest and deny the ones it flags",
        "Sit in the request path without becoming the system's own latency/availability bottleneck",
        "Scale to LinkedIn's full inbound request volume",
        "Fail in a safe, defined way if isMaliciousRequest itself is slow or unavailable",
      ],
      approach:
        "Place the check at the edge — an API gateway / reverse-proxy layer — so a denied request never reaches backend services at all, and treat isMaliciousRequest as an external dependency that needs its own timeout, caching, and fallback policy rather than being trusted blindly inline.",
      keyPoints: [
        "Enforce at the gateway/load-balancer tier: every inbound request is evaluated before routing to a backend service, so malicious traffic never consumes backend capacity",
        "Cache isMaliciousRequest results keyed by a request fingerprint (source IP + user/session + endpoint, or a hash of relevant request features) with a short TTL — avoids re-scoring identical/near-identical requests from a sustained attack on every single call",
        "Call isMaliciousRequest asynchronously off a fast local pre-filter for the obvious cases (known-bad IP lists, basic rate thresholds) so the common case doesn't pay the latency of the full check; route only the ambiguous remainder through the full isMaliciousRequest call",
        "Timeout + fail-open-or-closed policy on isMaliciousRequest itself: define explicitly what happens if it's slow or down — for a service like LinkedIn, likely fail open with heavier local rate-limiting as a stopgap, rather than blocking all traffic if the malicious-request scorer has an outage, unless the request type is high-risk enough to warrant fail-closed",
        "Log every block decision (and a sample of allowed ones near the threshold) to a pipeline the security team can audit and use to tune isMaliciousRequest's own model or rules over time — the interception layer should produce feedback signal, not just enforce a black-box verdict silently",
        "Rate-limit and circuit-break per source identity in front of isMaliciousRequest itself, since a malicious actor is also the traffic most likely to try to overwhelm the classifier",
      ],
      tradeoffs: [
        "Synchronous inline check vs. an async pre-filter with the full check only for ambiguous cases — inline-everywhere is simpler but puts isMaliciousRequest's latency on every single request; a fast local pre-filter trades some implementation complexity for keeping the common-case latency low",
        "Fail-open vs. fail-closed when isMaliciousRequest is unavailable — fail-open keeps the product available during a classifier outage but risks letting real attacks through; fail-closed is safer but turns a dependency outage into a full site outage, which is rarely the right trade for a consumer platform",
        "Enforcing at the edge/gateway vs. per-service — edge enforcement is simpler to operate and protects everything uniformly, but a per-service check can apply finer-grained, service-specific rules at the cost of duplicated enforcement logic",
      ],
      followUps: [
        "How would you handle a coordinated attack that deliberately stays just under whatever local pre-filter threshold you set?",
        "How do you avoid false positives blocking real users, and how would a blocked user appeal?",
        "What changes if isMaliciousRequest needs request body content, not just metadata, to make its determination?",
      ],
      relatedLinks: [
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
        { label: "Foundations: Circuit Breakers", href: "/foundations/circuit-breakers" },
        { label: "Foundations: Load Balancers", href: "/foundations/load-balancers" },
      ],
    },
  },
  {
    id: "linkedin-metrics-gathering-system",
    company: "LinkedIn",
    title: "Design a metrics gathering system",
    prompt:
      "Design a metrics gathering system for LinkedIn — collect metrics and counters emitted by many internal services, store them for later rendering, and support monitoring and alerting on top of them.",
    category: "system-design",
    tags: ["metrics-observability"],
    level: "Senior Software Engineer, applications track",
    source: {
      name: "Blind",
      url: "https://www.teamblind.com/post/linkedin-onsite-interview-system-design-review-1buxmbjm",
      reportedDate: "Feb 2025",
      confidence: "high",
      note: "The OP (interviewing for an applications track, not infra) was surprised to get this question; multiple other commenters independently confirmed it's 'a popular LinkedIn question' asked to them too, including once in a behavioral/EM round rather than the dedicated system-design round — corroborated separately by a LeetCode thread listing 'design a metrics system for LinkedIn' as one of the two most commonly repeated LinkedIn system-design topics.",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "Are we designing the collection/storage pipeline, the alerting layer, or both end to end?",
        "What's the expected cardinality — how many distinct metric names × tag/dimension combinations across all of LinkedIn's services?",
        "Push (services emit) or pull (a central collector scrapes each service) model?",
        "What retention/resolution tradeoff is acceptable — full resolution for a day, downsampled after that?",
      ],
      requirements: [
        "Let any internal service emit arbitrary named metrics and counters with minimal integration effort",
        "Store metrics in a form optimized for time-range queries and later rendering (dashboards)",
        "Support monitoring and alerting on top of the same stored data",
        "Scale across many teams, tenants, and geographic regions without one team's metric volume starving another's",
        "The metrics system's own reliability can't depend on the services it's monitoring — it needs to stay up when everything else is having a bad day",
      ],
      approach:
        "Split this into three layers — an SDK/emission contract every service uses the same way, a time-series storage layer optimized for write-heavy append + range-read query patterns, and a monitoring/alerting layer built on top that's a consumer of the same stored data rather than a separate system — and design the onboarding and resource-governance story explicitly, since that's what separates a real answer from a generic 'metrics go in a time-series DB' one-liner.",
      keyPoints: [
        "Emission contract: a small SDK every service links (preferred over a raw web-service call) exposing primitives like counters and timer.start()/timer.stop() for durations — standardizing this is what makes the system usable across hundreds of independently-owned services without bespoke integration work per team",
        "Ingestion: services emit locally-aggregated metrics on an interval (not per-event) to a collection tier, buffered through a queue so a burst from any one service doesn't propagate directly into storage",
        "Storage: a time-series database (partitioned by metric name + tags, e.g. service/region/host) optimized for append-heavy writes and range-scoped reads by time window — the same access pattern as every other 'store readings over time, query by range' system",
        "Onboarding process: a new service registers its metric names, a storage quota, and a retention/archival policy up front — this is explicitly what one candidate account of this exact question says the interviewer wanted discussed, not just the storage engine",
        "Monitoring/alerting as a consumer of the stored time series: rule evaluation (threshold, rate-of-change, anomaly) runs as a separate service reading the same store, firing to an on-call/paging system — kept as a layer on top rather than baked into ingestion, since alerting rules change far more often than the storage engine should",
        "Multi-tenant fairness: enforce per-team/per-service write quotas at the ingestion tier so one noisy or buggy service emitting an unbounded metric cardinality can't degrade the system for every other team — cardinality explosions (e.g. an accidentally-high-cardinality tag like a raw user id) are the most common real-world failure mode for systems like this",
        "The metrics/monitoring system needs its own separate health monitoring across teams/tenants/regions — it has to detect its own degradation independently, since it can't rely on itself to alert on itself going down",
      ],
      tradeoffs: [
        "Push (services emit on their own schedule) vs. pull (central collector scrapes each service, Prometheus-style) — push scales better to a very large, heterogeneous service fleet without the collector needing to discover and reach every instance; pull gives the collector more control over cadence and simplifies detecting a service that's gone silent",
        "Full-resolution storage vs. downsampling after a retention window — full resolution is simplest but expensive at scale; downsampling older data (keep raw for a day, minute-level after, hour-level after a week) is what keeps long-term storage costs sane while preserving recent debugging fidelity",
        "One global metrics store vs. per-region stores federated for cross-region queries — a single global store is simpler to query but becomes a cross-region latency and single-point-of-failure risk; per-region stores with async cross-region rollups better match LinkedIn's actual multi-geography footprint at the cost of eventual, not immediate, global visibility",
      ],
      followUps: [
        "How would you detect and contain a service that starts emitting an unbounded number of distinct metric names (a cardinality explosion)?",
        "How does alerting avoid paging on every noisy, self-correcting blip — what does a good alerting rule look like beyond a raw threshold?",
        "What changes about this design if it needs to also serve as the audit trail for a security or compliance investigation?",
      ],
      relatedLinks: [
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
      ],
    },
  },
  {
    id: "linkedin-legacy-app-quality-triage-behavioral",
    company: "LinkedIn",
    title: "You inherit a legacy application with no tests, no monitoring, and slow response times",
    prompt:
      "Imagine you join LinkedIn on a massive team that owns a legacy application. The application lacks adequate testing and monitoring and has slow response times. Consumers complain about this, and deployments often contain bugs. What efforts would you make as a Staff SWE? Then: rank the following in terms of priority — bugs, no testing, no monitoring, slowness. What do you tackle first, and how do you eventually turn this into microservices?",
    category: "scenario-operational",
    tags: ["behavioral"],
    level: "Staff Software Engineer, \"Craftsmanship\" round",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/post/6858262/linkedin-staff-software-engineer-intervi-mg5c/",
      reportedDate: "Jun 2025",
      confidence: "high",
      note: "Reported in near-identical wording by two independent Staff SWE candidate accounts on LeetCode Discuss (this one, and \"Staff Software Engineer | Linkedin\", Aug 2025) — both in LinkedIn's dedicated behavioral \"Craftsmanship\" round for Staff-level candidates.",
    },
    context:
      "Asked as a hypothetical rather than a real war story from the candidate — it's evaluating engineering judgment and prioritization reasoning, not a specific past project. Both accounts report it paired with follow-up questions on code-review strategy, mentoring junior engineers on a fast-growing team, and defining what \"quality\" means for a product/system.",
    optimalAnswer: {
      clarifyingQuestions: [
        "(Think through, don't ask the interviewer) Is 'slow response times' a known cause already, or genuinely undiagnosed?",
        "How large is the team, and is the current bug/incident rate actually blocking new feature work, or just embarrassing?",
        "Is there any existing observability at all, or truly zero visibility into what's failing?",
      ],
      requirements: [
        "Reduce user-facing harm (bugs, slowness) without freezing all delivery for months",
        "Establish enough visibility (monitoring) to know whether any subsequent change is actually helping",
        "Build a testing safety net that makes future changes — including the eventual microservices split — safe to make",
        "Set a sequencing/priority order the whole team can act on, not just a personal opinion",
        "Land somewhere concrete on the migration-to-microservices question, with reasoning for why that timing",
      ],
      approach:
        "The trap in this prompt is over-indexing on any one dimension in isolation — fixing bugs without monitoring just means the next bug is invisible again, and jumping straight to microservices multiplies an already-fragile, untested system's problems. Sequence by what has to exist before the next step is even safe to attempt.",
      keyPoints: [
        "Priority order and why: monitoring first, then testing, then bugs, then slowness, then (much later) microservices — you can't safely fix bugs you can't see, and you can't safely refactor code you can't verify with tests, so both of those are prerequisites to everything downstream",
        "Monitoring first: minimal but real observability (error rates, latency percentiles, key business-metric dashboards) — this alone often surfaces which 'bugs' are actually the highest-impact ones, replacing guesswork with data before spending engineering time",
        "Testing second: not 100% coverage as a prerequisite — start with characterization tests around the highest-risk, highest-change-frequency code paths (informed by what monitoring just revealed), so the team can make changes without flying blind, and require tests on every touched file going forward rather than a big-bang rewrite",
        "Bugs third, prioritized by the monitoring data — fix by user impact and frequency, not by whichever bug is loudest or newest",
        "Slowness fourth — once monitoring shows where time is going and tests exist to change that code safely, latency work becomes a scoped, safe optimization rather than a blind guess",
        "Microservices last, and only opportunistically: don't schedule a big-bang decomposition. Extract one well-tested, well-monitored boundary at a time — the module that's both highest-value to isolate (independent scaling/deploy needs) and now has the test/monitoring coverage to make extraction safe — using the strangler-fig pattern rather than a rewrite",
        "Communicate this as a sequenced plan with visible milestones to stakeholders/consumers complaining about the current state — 'monitoring in 2 weeks, safety-net tests around the top 3 failure areas in 6 weeks' is a concrete commitment, not a vague 'we're improving quality'",
      ],
      tradeoffs: [
        "A full stop on feature work to fix quality vs. improving quality alongside continued delivery — a full stop is cleaner in theory but rarely survives contact with business pressure and erodes trust if it drags on; folding quality work into the same sprints (a fixed percentage of capacity) is slower per-fix but sustainable and visibly ships value the whole time",
        "Rewriting vs. incrementally strangling the legacy system — a rewrite risks the classic second-system trap (new bugs, feature parity gaps, a long dark period with two systems to maintain); the strangler-fig approach is slower to fully complete but never leaves the team without a working system",
        "Monitoring-first vs. testing-first — testing-first feels intuitive since it 'prevents bugs,' but without monitoring the team doesn't know which code is worth testing first or whether a fix actually helped in production; monitoring-first buys the data that makes every subsequent investment better-targeted",
      ],
      followUps: [
        "Six months in, the team pushes back that 'quality work' is starving the roadmap — how do you respond?",
        "How do you decide which module to extract into a microservice first, concretely?",
        "What would make you deviate from this exact priority order?",
      ],
    },
  },
];
