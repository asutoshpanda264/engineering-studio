import type { InterviewQuestion } from "../types";

/**
 * Uber — researched 2026-08-24, see `docs/interview_exp.md` for the full
 * research log and the complete list of what was found. This file is
 * deliberately a small subset of that research: only questions with a
 * real, expansive prompt — specific requirements, numbers, constraints,
 * or a concrete narrative — make it in here. A one-line imperative like
 * "Design Uber." is a real reported topic (and stays in the tracker doc),
 * but it reads as a topic label, not a question a candidate could actually
 * sit down and answer — so it doesn't ship to this practice UI. See the
 * tracker's "Shipped to app" note for the full before/after list and
 * reasoning.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a
 * transcript to memorize. These are authored by reasoning through each
 * problem the way a strong candidate would, not sourced from a specific
 * candidate's actual answer — unlike `prompt`/`context`, which are
 * sourced and cited, `optimalAnswer` is this app's own content.
 */
export const UBER_QUESTIONS: InterviewQuestion[] = [
  {
    id: "uber-truck-tracking-driver-status",
    company: "Uber",
    title: "Design a truck tracking system with driver status updates",
    prompt:
      "Design a truck tracking system that supports filtering by truck number and includes an interface for updating driver status.",
    category: "system-design",
    tags: ["geospatial-tracking"],
    source: {
      name: "Exponent question DB / \"Get a Job at Uber\" blog",
      url: "https://www.tryexponent.com/blog/uber-interview-process",
      reportedDate: "~2024",
      confidence: "high",
      note: "Same prompt listed independently in both Exponent's Uber question DB and its \"Get a Job at Uber\" blog, which is marked verified with the help of an Uber interviewer.",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "How many trucks in the fleet, and how often does each report its location?",
        "What counts as \"driver status\" — on-duty/off-duty/on-break, or something richer (loading, in-transit, delayed)?",
        "Does filtering by truck number need to return live location, historical trips, or both?",
        "Who updates status — the driver's device automatically, or a manual action?",
      ],
      requirements: [
        "Ingest frequent location updates from every truck in the fleet",
        "Support looking up/filtering trucks by truck number",
        "Provide an interface (API) for updating a driver's current status",
        "Reasonably fresh data for a dispatcher-facing view",
      ],
      approach:
        "This is two related but distinct sub-systems wearing one name: a high-write, low-latency location/status pipeline, and a low-write, index-friendly lookup-by-truck-number path. Design them as separate concerns rather than forcing one data model to serve both well.",
      keyPoints: [
        "Location + status ingestion: trucks push periodic updates (location, timestamp, status enum) to a lightweight write API; buffer through a message queue before persisting so a write spike from many trucks reporting at once doesn't hit the store directly",
        "Store current state in a fast key-value store keyed by truck_id — a dispatcher's filter-by-truck-number lookup is then a single point read, not a table scan",
        "Persist a time-ordered history (append-only) separately from current state, for anyone who needs a truck's status/location trail rather than just its latest value",
        "The status-update interface is a small, separate write path (updateDriverStatus(truck_id, status)) — validated against an explicit state machine (e.g. off-duty → on-duty → in-transit → on-break) rather than accepting an arbitrary string",
        "Index by truck number as the primary lookup key since that's the stated filter dimension; add secondary indexes (by region, by status) only once a real second access pattern shows up",
        "A dispatcher-facing read API serves off the fast current-state store, never the raw ingestion stream directly",
      ],
      tradeoffs: [
        "Push (trucks report on a schedule) vs. pull (server polls each truck) — push suits a large, geographically spread fleet better since it doesn't need to track which trucks are reachable when",
        "Storing only latest state vs. full history — latest-state-only is cheaper and answers the stated filtering need; history is only worth the extra storage once there's a real audit/analytics requirement",
        "A single combined truck record (location + status) vs. splitting them — combining is simpler for this scale; splitting only pays off if location updates vastly outpace status changes and need independent scaling",
      ],
      followUps: [
        "How would you notify a dispatcher when a truck's status changes, instead of them having to poll?",
        "How do you handle a truck that goes offline and stops reporting — is it still \"on-duty\" until proven otherwise, or does staleness itself become a status?",
        "How would this change if you needed geofencing (alert when a truck enters/exits a zone)?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Build it: IoT Sensor Ingestion scenario", href: "/workshop?scenario=iot-sensor-ingestion" },
      ],
    },
  },
  {
    id: "uber-driver-location-upload-search-api",
    company: "Uber",
    title: "Design an API to upload and search driver location history",
    prompt:
      "Design an API to upload driver location to the server after every 3 seconds, with the ability to check or search a driver's location — from any current or past trip — for up to 30 days. Example: driver1 starts a trip on Mar 25 lasting 2 minutes, so the server saves 120 seconds ÷ 3 seconds = 40 location writes for that trip; there are roughly 100,000 similar trips running in parallel. If driver1 later completes multiple trips on Mar 25, 26, and 27, design an API to fetch driver1's location on a particular date and time (e.g. driver1's location on Mar 26 at 3am) — and decide which database stores this data so it can be fetched quickly.",
    category: "system-design",
    tags: ["geospatial-tracking"],
    level: "Phone screen",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/system-design/1894358/system-design-interview-question-uber-phone-interview",
      reportedDate: "Mar 2022",
      confidence: "high",
    },
    context:
      "Candidate proposed a persistent connection to upload location plus a NoSQL database to store it; the interviewer didn't agree with that approach and the OP was asking for a better one.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is the 3-second interval fixed for every driver, or does it vary by trip state (e.g. slower when idle)?",
        "Does \"search by date and time\" mean the nearest recorded point, or an exact match?",
        "Beyond 30 days, is the data deleted, or downsampled/archived?",
        "Is a query always scoped to one driver + one time range, or does the system also need \"which drivers were near X at time Y\"?",
      ],
      requirements: [
        "Ingest a location write from every active driver roughly every 3 seconds",
        "~100K trips running in parallel → on the order of 30K+ writes/second at peak",
        "Support point lookups: this driver's location at this specific past date/time, across any of their trips",
        "Retain at least 30 days of history",
        "Fetch fast — this is explicitly the part the interviewer wants designed well",
      ],
      approach:
        "Do the capacity math first, out loud: ~100K concurrent trips × one write per 3 seconds is a write-heavy, append-only, time-ordered workload — that shape should drive the database choice, not a default reach for \"NoSQL\" without justifying why.",
      keyPoints: [
        "Ingestion: drivers' apps POST (driver_id, trip_id, timestamp, lat, lng) on a fixed interval; front with a message queue so a burst of simultaneous uploads doesn't hit the storage layer directly and writes can be batched",
        "Storage: a wide-column / time-series-oriented store (e.g. Cassandra-style, partitioned by driver_id, clustered by timestamp) — this workload is exactly append-mostly, time-ordered writes with range-scoped reads, which is what that storage shape is built for",
        "Partition by driver_id so \"driver1's location at 3am on Mar 26\" is a single-partition range query, not a scatter-gather across the whole dataset",
        "Within a driver's partition, cluster by timestamp so a time-range lookup is a sequential read, not a random-access scan across 40+ points per trip",
        "TTL each record at 30 days at the storage layer, so old data ages out automatically rather than needing a manual sweep job",
        "Separate the hot write path (append the latest ping) from the query path (range read by driver + time window) — they have very different access patterns and shouldn't fight for the same index",
      ],
      tradeoffs: [
        "A general-purpose relational DB vs. a wide-column/time-series store — relational indexing overhead (B-tree maintenance on every write) doesn't hold up at 30K+ writes/sec; a log-structured, partition-by-key store trades some query flexibility for write throughput, which is the right trade here",
        "Storing every 3-second ping vs. downsampling older data — full resolution is simplest for the stated 30-day window; downsampling only pays off if retention grows well past 30 days",
        "Persistent-connection push (what the candidate proposed) vs. periodic HTTP POST — a persistent connection per driver is expensive to hold open at fleet scale for a simple periodic upload; a stateless POST every 3 seconds is simpler to scale and is likely closer to what the interviewer wanted probed",
      ],
      followUps: [
        "How would you support \"find all drivers within 500m of point X right now\" instead of a single driver's history?",
        "What happens to correctness if a driver's app buffers pings offline and uploads them late, out of order?",
        "How would retention past 30 days change the storage design?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Foundations: NoSQL Deep Dive", href: "/foundations/nosql-deep-dive" },
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Build it: Ride-Hailing Location Pings scenario", href: "/workshop?scenario=ride-hailing-location-pings" },
      ],
    },
  },
  {
    id: "uber-driver-heatmap-24h-durable",
    company: "Uber",
    title: "Design a real-time driver-density heatmap",
    prompt:
      "Create a system where every driver's app is sending its location in real time. Plot a heatmap showing the number of drivers in a particular location over the last 20 minutes, using 1-minute buckets. Follow-up: make that same data available for analytics after 24 hours — it should be durable — addressing sampling, storage, retrieval, latency, and TTL.",
    category: "system-design",
    tags: ["geospatial-tracking"],
    level: "L6 (Staff Engineer)",
    source: {
      name: "Blind",
      url: "https://www.teamblind.com/post/Uber-L6-staff-engineer-system-design-round-8EuJe85R",
      reportedDate: "Dec 2022",
      confidence: "high",
      note: "The same base heatmap prompt (real-time density, last 20 minutes, 1-minute buckets) was independently reported on LeetCode Discuss in Mar 2022 with identical wording; Blind's account is the one that adds the 24-hour-durability follow-up used here.",
    },
    context:
      "A near-identical variant of this same base prompt — swapping the fixed 20-minute/1-minute-bucket window for an arbitrary user-selectable time range — was reported by a different candidate who passed the coding round but was explicitly rejected on this system-design round, underscoring how high the bar is on this exact question.",
    optimalAnswer: {
      clarifyingQuestions: [
        "How many active drivers citywide, and roughly what's the ping interval per driver?",
        "Does the heatmap need exact counts, or is an approximate density visualization acceptable?",
        "For the 24-hour-durable follow-up: does analytics need raw pings, or is a bucketed aggregate enough?",
        "What resolution does the map grid need — city-block level, or coarser?",
      ],
      requirements: [
        "Real-time ingestion of location pings from every active driver",
        "A heatmap of driver density over the trailing 20 minutes, bucketed into 1-minute windows",
        "Low latency — a dispatcher-facing view, not a batch report",
        "Follow-up: the same data must also be durably retained and queryable for analytics after 24 hours, with defined sampling, storage, retrieval, latency, and TTL behavior",
      ],
      approach:
        "Split this into a hot path (the live 20-minute sliding-window heatmap, optimized for freshness) and a cold path (24-hour+ durable analytics store, optimized for completeness and cost) — trying to serve both from one system is what the interviewer's follow-up is specifically testing whether you'll notice.",
      keyPoints: [
        "Grid the map into cells (geohash or a fixed lat/lng grid) at a resolution matched to the map's zoom level — this turns \"density near a location\" into a counter keyed by cell_id",
        "Hot path: each incoming ping increments a per-cell, per-1-minute-bucket counter in an in-memory store (e.g. Redis) with a 20-minute TTL on each bucket — the heatmap query is then just summing the last 20 buckets per cell, no scan required",
        "As each 1-minute bucket ages past 20 minutes, it naturally expires from the hot store (via TTL) rather than needing manual cleanup",
        "Cold path (the follow-up): in parallel with the hot-path increment, asynchronously append the raw or pre-aggregated ping to a durable, cheaper store (object storage or a wide-column DB) partitioned by day and cell — this is what \"available for analytics after 24 hours\" is asking for",
        "Sampling: at fleet scale, raw-ping analytics storage is expensive — write the durable copy pre-aggregated at 1-minute-bucket granularity (same buckets the hot path already computes) rather than every raw ping, trading fine-grained replay for a large storage-cost win",
        "TTL: keep the durable analytics data for a defined retention window (e.g. 90 days) with its own downsampling/expiry policy, separate and much longer-lived than the hot path's 20-minute TTL",
      ],
      tradeoffs: [
        "Serving the heatmap from the same durable store used for analytics vs. a separate hot in-memory path — one store simplifies the architecture but can't hit dispatcher-facing latency at fleet scale; splitting hot/cold is more moving parts but is the only way to satisfy both freshness and durability requirements at once",
        "Storing raw pings vs. pre-aggregated 1-minute buckets in the durable store — raw preserves maximum fidelity for later analysis but costs far more at scale; pre-aggregating trades fidelity for a storage-cost reduction that's usually worth it for a heatmap use case",
        "Fixed grid cells vs. geohash — geohash's variable precision and neighbor-lookup properties are more flexible, but a fixed grid is simpler to reason about and often sufficient if the map's zoom level doesn't change",
      ],
      followUps: [
        "How would you support a user-selectable arbitrary time range instead of a fixed 20-minute window?",
        "What happens to accuracy if a driver's app batches and uploads pings late?",
        "How would you extend this to also compute rider-demand density, not just driver-supply density?",
      ],
      relatedLinks: [
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Foundations: Caching", href: "/foundations/caching" },
        { label: "Build it: Ride-Hailing Location Pings scenario", href: "/workshop?scenario=ride-hailing-location-pings" },
      ],
    },
  },
  {
    id: "uber-event-tracking-ingestion-api",
    company: "Uber",
    title: "Design an event tracking and ingestion system",
    prompt:
      "Design a system that injects messages (events) from other services and analyzes this data. The volume can't fit on a single disk, can't be handled by a single server, and messages can arrive out of order (an end event can arrive before its corresponding start event). The system must support these APIs: startEvent(event_id, timestamp), endEvent(event_id, timestamp), and getOngoingEvents(timestamp) — which should return the count of events that have started but not yet ended as of that timestamp.",
    category: "system-design",
    tags: ["metrics-observability"],
    level: "Senior Software Engineer (SSE), Onsite",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/system-design/3378926/System-Design-or-Uber-or-SSE/",
      reportedDate: "Apr 2023",
      confidence: "high",
    },
    context:
      "The candidate's own proposed solution used a key-value table (event_id, start_date, end_date) with a range query (start_date < timestamp < end_date) for getOngoingEvents, then separately considered a time-series DB as an alternative but wasn't sure how to index it.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Roughly what's the event volume per second, and how skewed is it (a few high-volume services vs. many low-volume ones)?",
        "How long after a start event is an end event still expected to arrive — is there a reasonable out-of-order bound?",
        "Does getOngoingEvents need to be exact, or is a small amount of staleness acceptable?",
        "Is event_id globally unique, or only unique per producing service?",
      ],
      requirements: [
        "Accept high-volume event writes from many other services (startEvent, endEvent)",
        "Data volume exceeds single-disk and single-server capacity — must be horizontally partitioned",
        "Tolerate out-of-order arrival: an endEvent can be received before its matching startEvent",
        "Answer getOngoingEvents(timestamp): how many events had started but not yet ended as of that time",
      ],
      approach:
        "The out-of-order constraint is the crux of this question — a naive design that assumes start always precedes end will silently produce wrong counts. Design the storage and the query around \"this event's state may still be incomplete\" from the start.",
      keyPoints: [
        "Store one row/record per event_id with two nullable fields, start_ts and end_ts, rather than modeling start/end as two independent event rows to join later",
        "startEvent(id, ts) and endEvent(id, ts) both do an upsert on that event_id's record — whichever call arrives first creates the record with only its own field populated; the second call fills in the other field. This is exactly what makes out-of-order arrival safe: neither call needs to assume the other already happened",
        "Partition the event store by event_id (consistent hashing across many nodes) — this is what resolves the \"can't fit on one disk/server\" constraint, and keeps both startEvent/endEvent writes for the same event_id on the same shard",
        "For getOngoingEvents(timestamp): maintain a secondary index ordered by start_ts, and query for records where start_ts <= timestamp AND (end_ts IS NULL OR end_ts > timestamp) — a range scan on that index, not a full table scan",
        "At high write volume, don't maintain that range index synchronously on every write — batch index updates or use a store whose native storage format (e.g. an LSM-tree-based store) makes range queries on a secondary key cheap without per-write index maintenance overhead",
        "A time-series DB is tempting given the timestamp-heavy access pattern, but the actual query (\"active interval spans a point in time\") is an interval-overlap query, not a simple time-range scan of independent points — that's why the OP got stuck trying to index one; a plain partitioned key-value/wide-column store with a start_ts-ordered index maps to this problem more directly",
      ],
      tradeoffs: [
        "Upsert-into-one-record vs. append-only two-event-log-then-join — upserting is simpler to query (no join needed for getOngoingEvents) but requires a store that supports efficient partial updates; append-only is simpler to write but pushes the out-of-order-reconciliation cost onto every read",
        "Exact getOngoingEvents count vs. an approximate/eventually-consistent one — exact requires synchronous index maintenance, which costs write throughput; approximate (e.g. a short propagation delay) is usually the right trade for an analytics-facing count rather than a billing-critical one",
        "A dedicated time-series DB vs. a general partitioned key-value/wide-column store — a TSDB is a poor fit here because the core query is an active-interval lookup, not a scan of independent timestamped points; worth naming explicitly, since it's the wrong-but-tempting choice",
      ],
      followUps: [
        "How would you handle an endEvent that never arrives at all — does the event stay \"ongoing\" forever?",
        "How would you scale getOngoingEvents if it needs to be called very frequently (e.g. every second) for a live dashboard?",
        "What happens if the same event_id is reused by mistake by an upstream service?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Foundations: Consistent Hashing", href: "/foundations/consistent-hashing" },
        { label: "Foundations: NoSQL Deep Dive", href: "/foundations/nosql-deep-dive" },
      ],
    },
  },
  {
    id: "uber-billions-messages-keyword-index",
    company: "Uber",
    title: "Design a keyword index over billions of text messages",
    prompt:
      "Given billions of text messages and a list of keywords, design the index for the messages in order to efficiently retrieve messages that contain given keywords. Each message can be identified and retrieved by a unique sequence number. Task 1: design a data structure to organize the keyword index. Task 2: how do you search messages that contain a single keyword? Task 3: how do you search messages that contain multiple keywords? (Optional: implement the method.)",
    category: "system-design",
    tags: ["search-indexing"],
    level: "SDE2",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/1715795/uber-sde2-system-design/",
      reportedDate: "Jan 2022",
      confidence: "high",
    },
    context:
      "The candidate's proposed approach — build a trie from the keywords, then walk each message's words through it to build a map of keyword → {message_id, message_id, ...} — was rejected by the interviewer on the grounds that the number of messages is in the billions, so storing every message ID per keyword in memory doesn't scale.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is the keyword list fixed and known in advance, or does it change over time?",
        "Do queries need exact keyword matches only, or also prefix/fuzzy matching?",
        "Is a multi-keyword search an AND (all keywords present) or OR (any keyword present)?",
        "How fresh does the index need to be relative to new incoming messages?",
      ],
      requirements: [
        "Billions of messages, each addressable by a unique sequence number",
        "A fixed or slowly-changing list of keywords to index against",
        "Efficient single-keyword lookup: all messages containing that keyword",
        "Efficient multi-keyword lookup: all messages containing all (or any) of a set of keywords",
        "Must not assume any per-keyword result set fits comfortably in memory on one machine",
      ],
      approach:
        "This is a classic inverted index, but the interviewer's actual push is about scale: naming \"inverted index\" isn't enough — the design has to explain how a keyword with a huge posting list (billions of matching messages) is stored and merged without blowing up memory on a single node.",
      keyPoints: [
        "Build an inverted index: keyword → posting list of message sequence numbers that contain it, rather than the candidate's original message → keyword-set direction, since queries go from keyword(s) to messages",
        "Shard the index by keyword (consistent hashing) across many nodes — a single hot keyword's posting list still lives on one shard, but different keywords are spread out, so no single machine holds the whole index",
        "Store each keyword's posting list sorted by sequence number and compressed (delta-encoding consecutive sequence numbers is cheap since gaps are typically small relative to the full ID space) — this is what keeps a billions-of-messages posting list from being prohibitively large",
        "Single-keyword search: route to the shard owning that keyword, stream its posting list (already sorted, so it can be paginated without loading the whole list into memory)",
        "Multi-keyword AND search: fetch each keyword's posting list and intersect them — since lists are sorted, this is a linear merge-intersect, and starting with the smallest posting list first minimizes work",
        "Multi-keyword OR search: a sorted merge (union) across posting lists, deduplicating sequence numbers as they're merged",
        "Build the index offline/incrementally as messages arrive (a streaming indexer appends new sequence numbers to the relevant keyword shards) rather than recomputing it from scratch",
      ],
      tradeoffs: [
        "Trie-plus-in-memory-map-of-IDs (the candidate's rejected approach) vs. a sharded, compressed, sorted inverted index — the trie is fine for matching text against the keyword list itself, but the failure is holding every message ID for every keyword in one in-memory map; sharding and on-disk sorted posting lists are what make billions of messages tractable",
        "Sorted posting lists (enabling merge-intersect) vs. unsorted (requiring a hash-set intersection) — sorted costs a bit more on insert but makes multi-keyword AND/OR queries far cheaper, which is the more frequent, latency-sensitive operation",
        "Exact real-time indexing vs. near-real-time (slight indexing lag) — near-real-time is usually an acceptable trade for keeping the streaming indexer simple and not bottlenecking on write consistency",
      ],
      followUps: [
        "How would you handle a keyword that matches a huge fraction of all messages (a very common word)?",
        "How would you support phrase search (an exact sequence of keywords), not just \"contains all of these keywords\"?",
        "How do you keep the index consistent if a message is deleted after being indexed?",
      ],
      relatedLinks: [
        { label: "Foundations: Consistent Hashing", href: "/foundations/consistent-hashing" },
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Foundations: Database Indexing Deep Dive", href: "/foundations/database-indexing-deep-dive" },
      ],
    },
  },
  {
    id: "uber-surge-pricing-engine-regulatory-caps",
    company: "Uber",
    title: "Design a real-time surge pricing engine",
    prompt:
      "Design a system that can calculate dynamic pricing (a surge multiplier) for every hexagonal zone in a city in near real-time. It should consider current ride requests, available drivers, historical demand patterns, and external factors like weather or events. The multiplier must update at least every 60 seconds.",
    category: "system-design",
    tags: ["capacity-scaling"],
    level: "Senior SDE, final-round onsite",
    source: {
      name: "Medium (first-person candidate account)",
      url: "https://medium.com/@emilyhustlenyc/i-failed-ubers-system-design-interview-last-month-here-s-every-question-they-asked-bdaf1bd6e64b",
      reportedDate: "Feb 2026",
      confidence: "high",
    },
    context:
      "The candidate proposed partitioning the city with Uber's real H3 hexagonal grid (resolution 7, ~5km² hexes), a Kafka → Flink → Redis pipeline recalculating multipliers every 30–60 seconds, and explicit failure-mode handling (stale-cache TTL fallback, a dead-letter queue with on-call alerting, a circuit breaker defaulting to 1.0x/no-surge). The follow-up that ended up costing them the offer: \"How do you handle surge pricing across city boundaries where hexagonal zones overlap different regulatory regions?\" (different cities cap surge at different multipliers — e.g. NYC caps at 2.5x, some cities ban it outright) — while the pricing job runs as one global Flink pipeline. The candidate's vague \"add a config per city\" answer didn't hold up under the interviewer's push, and the rejection feedback cited insufficient depth on \"cross-region system complexity and edge case handling.\"",
    optimalAnswer: {
      clarifyingQuestions: [
        "What does \"near real-time\" mean precisely — is 60 seconds a hard SLA or a target?",
        "What should happen if the pricing pipeline is down — no surge (1.0x), or serve the last known multiplier?",
        "Do different cities/regions have different regulatory constraints on surge (price caps, outright bans)?",
        "Roughly what scale — how many cities, how many concurrent GPS pings per second?",
      ],
      requirements: [
        "Compute a surge multiplier per geographic zone across an entire city",
        "Ingest real-time supply (driver GPS pings) and demand (ride requests) continuously",
        "Recalculate multipliers at least every 60 seconds",
        "Factor in historical demand baselines and external signals (weather, events), not just instantaneous counts",
        "High availability — a pricing outage should fail safe, not fail loud",
        "Correctly apply per-region regulatory constraints even though ingestion and computation run globally",
      ],
      approach:
        "Partition the city into a hex grid so \"pricing per zone\" becomes a per-key streaming aggregation problem, then treat regulatory variation as a first-class constraint on the output stage — not an afterthought bolted onto a single global formula, which is exactly where this real candidate's answer broke down.",
      keyPoints: [
        "Partition geography using a hexagonal grid (Uber's own H3 library, resolution 7 ≈ 5km² per hex) — hexagons give uniform neighbor distance, unlike a square grid, which matters once you blend supply across adjacent zones",
        "Driver GPS pings and ride requests are both mapped to an H3 hex ID and fed into sliding-window supply/demand counters (e.g. in Redis), keyed by hex",
        "A streaming job (e.g. Flink) reads both counters every 30–60 seconds and computes each hex's multiplier; the naive formula is max(1.0, demand / (supply × target_ratio)), refined with neighbor-hex blending (borrow supply from the 6 adjacent hexes via H3's kRing so a hex with 0 drivers next to one with 10 doesn't show an extreme multiplier) and a historical baseline (so a normal Friday night isn't priced like an anomaly)",
        "Regulatory zones as a first-class constraint: attach a regulatory-region ID (and its price-cap rule) to each hex at the mapping stage, and apply the cap as a clamp on the computed multiplier before it's published — the pricing computation stays one global pipeline, but the output stage enforces per-region rules rather than the whole pipeline needing to be region-aware from the start",
        "Publish results to a low-latency cache (Redis) that the rider-facing pricing service reads from, keyed by hex — riders always read a precomputed value, never trigger a synchronous calculation",
        "Fail-safe design: a short TTL on cached multipliers with the previous value surviving a computation gap; a dead-letter queue plus alert for events the streaming job can't process; a circuit breaker that defaults the whole system to 1.0x (no surge) if the pricing pipeline is down for an extended period — protects riders from a stale, artificially high multiplier rather than protecting revenue",
      ],
      tradeoffs: [
        "One global streaming pipeline with a per-region clamp at the output stage vs. fully region-partitioned pipelines — a single global pipeline is operationally simpler and is what most candidates default to; region-partitioning is more complex to run but avoids any chance of a regulatory rule being applied a computation-cycle late at a clamp stage",
        "Neighbor-hex blending vs. per-hex-only calculation — blending avoids extreme multipliers at sparse-data hex boundaries but adds computation and can mask a genuinely under-served zone; per-hex-only is simpler but noisier at low driver density",
        "Fail-safe to 1.0x vs. fail-safe to last-known-good multiplier on pipeline outage — defaulting to no-surge protects riders from stale high prices but sacrifices revenue during an outage; serving the last known value keeps revenue steady but risks showing a stale, possibly wrong price",
      ],
      followUps: [
        "How do you handle surge pricing across city boundaries where hexagonal zones overlap different regulatory regions? (the actual follow-up that defeated this candidate)",
        "How would you A/B test a change to the surge formula without affecting real riders' prices?",
        "What happens if the Flink job crashes mid-calculation — walk through exactly what a rider and a driver each see?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Foundations: Circuit Breakers", href: "/foundations/circuit-breakers" },
        { label: "Build it: Ad Auction Bidding scenario", href: "/workshop?scenario=ad-auction-bidding" },
      ],
    },
  },
];
