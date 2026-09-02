import type { FoundationLesson } from "../types";

/**
 * Direct continuation of two open threads this course deliberately left
 * dangling: Lesson 12 (Vertical vs Horizontal Scaling) introduced sharding
 * as "Strategy 2," showed a range-based example, hit the hotspot problem,
 * and said "we'll go deep on sharding strategies in Phase 6." Lesson 19
 * (Consistent Hashing) then solved the *rebalancing* half of that problem
 * generically, for any hash-bucketed pool. This lesson is Phase 6: the
 * shard-key decision, the three strategies (range/hash/directory-based),
 * what sharding breaks in your data model (cross-shard joins and
 * transactions), and how a live system reshards without downtime —
 * synthesized from the standard system-design-interview treatment of the
 * topic (Alex Xu's consistent-hashing chapter this app already cited in
 * Lesson 19, MongoDB's and Vitess's public sharding docs, and Instagram's
 * 2012 "Sharding & IDs at Instagram" engineering post for the ID-generation
 * example) rather than one single source.
 */
export const DATABASE_SHARDING: FoundationLesson = {
  slug: "database-sharding",
  number: 20,
  title: "Database Sharding",
  tagline:
    "Read replicas copy the same data everywhere and still funnel every write through one machine. Sharding is the strategy for when even that isn't enough — split the data itself, not just the copies of it.",
  estimatedMinutes: 50,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Lesson 12 named three database scaling strategies: read replicas, sharding, and caching. Read replicas and caching both leave the dataset itself intact on one primary — they just add copies (replicas) or a fast lookaside (cache) in front of it. Sharding is the one strategy that actually cuts the dataset itself into pieces, so no single machine has to hold — or write — all of it.",
        },
        {
          kind: "paragraph",
          text: "That single sentence hides most of the real difficulty: which pieces? Split badly and one shard gets all the traffic while the others sit idle — the exact hotspot Lesson 12 flagged and deferred. Split well and a query that used to be one JOIN across your whole dataset is now a scatter-gather across a dozen servers, or worse, doesn't have a clean answer at all.",
        },
        {
          kind: "insight",
          text: "Lesson 19 solved a narrower problem than this lesson: given that keys are already routed to shards by a hash, how do you avoid remapping everything when the shard count changes? That's the rebalancing mechanics. This lesson is the layer underneath it — how you decide what a \"shard\" even is, what breaks in your data model once you have one, and how a live system moves from N shards to N+1 without downtime.",
        },
      ],
    },
    {
      id: "why-shard",
      heading: "Why sharding earns its complexity",
      blocks: [
        {
          kind: "paragraph",
          text: "Read replicas scale reads almost for free — add a replica, point more read traffic at it. But every replica still receives every write, replicated from the same one primary. Once writes alone exceed what a single primary can absorb, or the dataset alone exceeds what a single disk can hold, no number of read replicas fixes it — you need to split the data, not just copy it.",
        },
        {
          kind: "table",
          headers: ["Strategy", "What it scales", "What it can't scale"],
          rows: [
            ["Read replicas (Lesson 12)", "Read throughput", "Write throughput, total storage — still one primary"],
            ["Caching (Lesson 14)", "Read latency for hot keys", "Cold reads, all writes, total storage"],
            ["Sharding", "Write throughput and total storage, by splitting both across N machines", "Cross-shard queries — see below"],
          ],
        },
        {
          kind: "insight",
          text: "That's why sharding is usually the last strategy reached for, not the first: it's the only one of the three that changes where data actually lives, which is also what makes cross-shard queries and transactions hard. Exhaust read replicas and caching before sharding — Lesson 12's 3-stage scaling plan makes exactly this ordering explicit.",
        },
      ],
    },
    {
      id: "shard-key",
      heading: "The shard key: the decision you can't take back cheaply",
      blocks: [
        {
          kind: "paragraph",
          text: "The shard key (or partition key) is the field used to decide which shard a row lives on — every sharding scheme starts by picking one. Get it wrong and you don't find out until production traffic exposes it, because the schema still looks perfectly reasonable in a design review.",
        },
        {
          kind: "list",
          items: [
            { text: "High cardinality: many distinct values, so rows actually spread across shards instead of piling onto a handful.", tone: "healthy" },
            { text: "Even access distribution: no value is disproportionately hot — a shard key that's fine for storage can still create a traffic hotspot.", tone: "healthy" },
            { text: "Matches the dominant query pattern: most queries should be answerable from one shard using the key, not scattered across all of them.", tone: "healthy" },
            { text: "Monotonically increasing keys (auto-increment IDs, timestamps) as the sole shard key: every new row lands on the newest shard — all writes hit one machine.", tone: "critical" },
            { text: "Low-cardinality flags (country, subscription tier) as the sole shard key: a handful of values means a handful of possible shards, however uneven the real-world split (most users on \"free\", most traffic from one region).", tone: "critical" },
          ],
        },
        {
          kind: "insight",
          text: "This is the same hotspot Lesson 12 hit with \"what if Shard 1 has all the active users?\" — and it's a shard-key design problem, not something consistent hashing (Lesson 19) can fix after the fact. Consistent hashing keeps rebalancing cheap when the shard count changes; it does nothing if the key itself concentrates load on one shard regardless of how many shards exist.",
        },
      ],
    },
    {
      id: "strategies",
      heading: "Three sharding strategies",
      blocks: [
        {
          kind: "paragraph",
          text: "Once a shard key is chosen, something still has to map a key to a physical shard. There are three standard ways to do that.",
        },
        {
          kind: "paragraph",
          text: "1) Range-based sharding — the Lesson 12 example. Shards own contiguous ranges of the key (user_id 1–1M on Shard 1, 1M–2M on Shard 2, ...). A router just compares the key against known boundaries.",
        },
        {
          kind: "table",
          headers: ["Shard", "user_id range"],
          rows: [
            ["Shard 1", "1 – 1,000,000"],
            ["Shard 2", "1,000,000 – 2,000,000"],
            ["Shard 3", "2,000,000 – 3,000,000"],
          ],
        },
        {
          kind: "paragraph",
          text: "2) Hash-based sharding — apply a hash function to the shard key and route by the result, either a plain hash(key) % N or, better, the hash ring from Lesson 19. This is what solves range-based sharding's hotspot problem for monotonically-increasing keys: hashing scrambles insertion order, so new rows spread evenly instead of piling onto the newest shard.",
        },
        {
          kind: "paragraph",
          text: "3) Directory-based sharding — a separate lookup service (a \"shard directory\" or \"shard map\") stores an explicit key → shard mapping, consulted on every request instead of computed. Nothing about the mapping has to follow a formula at all.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "shard-client", label: "Application", col: 0, row: 1 },
            { id: "shard-directory", label: "Shard directory", sublabel: "key → shard lookup table", col: 1, row: 0, tone: "signal" },
            { id: "shard-a", label: "Shard A", sublabel: "keys 1, 4, 9, ...", col: 0, row: 2, entityType: "database" },
            { id: "shard-b", label: "Shard B", sublabel: "keys 2, 5, 7, ...", col: 1, row: 2, entityType: "database" },
            { id: "shard-c", label: "Shard C", sublabel: "keys 3, 6, 8, ...", col: 2, row: 2, entityType: "database" },
          ],
          edges: [
            { from: "shard-client", to: "shard-directory", label: "1. where does key live?" },
            { from: "shard-directory", to: "shard-client", label: "2. Shard B", dashed: true, tone: "healthy" },
            { from: "shard-client", to: "shard-b", label: "3. query directly" },
          ],
        },
        {
          kind: "table",
          headers: ["Strategy", "Range queries", "Rebalancing cost", "Hotspot risk", "Extra hop"],
          rows: [
            ["Range-based", "Fast — one shard, no scatter-gather", "Split/merge one boundary — cheap", "High, for monotonic keys", "None — boundaries are known"],
            ["Hash-based", "Scatter-gather — a range spans every shard", "Cheap with a ring (Lesson 19); expensive with plain hash % N", "Low, if the key has good cardinality", "None — computed"],
            ["Directory-based", "Depends on how the directory groups keys", "Cheapest — update one row in the directory, move data, done", "Lowest — placement is fully manual/adjustable", "Yes — every request consults the directory"],
          ],
        },
        {
          kind: "insight",
          text: "Directory-based sharding trades a lookup hop for total flexibility: because the mapping isn't a formula, an operator can move any single key to any shard without touching how other keys resolve — no ring, no boundary math. The trade-off is that the directory itself becomes a new critical dependency (and often its own bottleneck) unless it's small, cached, and replicated — MongoDB's config servers, covered below, are exactly that.",
        },
      ],
    },
    {
      id: "cross-shard-problems",
      heading: "What sharding breaks: cross-shard queries and transactions",
      blocks: [
        {
          kind: "paragraph",
          text: "Sharding is reached for last because it's the strategy that changes where data lives, and a query engine that used to answer everything from one machine now has to reckon with data being scattered on purpose.",
        },
        {
          kind: "list",
          items: [
            "JOINs across shards: a JOIN that used to be one query is now either a scatter-gather (query every shard, join in the application) or a denormalization that duplicates data to avoid the join entirely.",
            "Foreign keys and uniqueness constraints: a UNIQUE constraint on email only guarantees uniqueness within one shard unless email is (or is derivable from) the shard key — a database engine can't enforce a global invariant across machines it doesn't coordinate.",
            "Multi-row transactions: an ACID transaction that touches rows on two different shards needs a distributed transaction protocol (e.g. two-phase commit) or has to be redesigned to avoid spanning shards — plain per-shard transactions don't cover it.",
            "ID generation: auto-increment breaks the moment two shards can both insert row \"#4521\" independently — sharded systems need IDs that are unique without a single counter (UUIDs, or a structured scheme like Instagram's, covered below).",
          ],
        },
        {
          kind: "insight",
          text: "None of this is a routing problem consistent hashing or a smarter shard-key choice fixes — it's the actual cost of sharding, paid in data-model complexity rather than infrastructure. Reaching for sharding means accepting this cost, which is exactly why Lesson 12's ordering (replicas and caching first) exists.",
        },
      ],
    },
    {
      id: "resharding",
      heading: "Resharding without downtime",
      blocks: [
        {
          kind: "paragraph",
          text: "Shard counts don't stay fixed forever — growth eventually means adding shards. Plain hash(key) % N sharding hits exactly the rehashing problem Lesson 19 opened with: change N and nearly every key's mapping changes at once, which for a database means nearly every row needs to physically move before it can be found. A hash ring (Lesson 19) or a directory-based scheme both avoid that blast radius by construction — but even a bounded move of \"only the affected keys\" still has to happen on a live system serving traffic, without an outage.",
        },
        {
          kind: "flow",
          steps: [
            { title: "Pick the new shard boundary or hash-ring position", detail: "the exact keys that will move are now known", tone: "signal" },
            { title: "Dual-write to old and new shard", detail: "new writes for the moving key range land on both — the old shard stays authoritative for reads", tone: "signal" },
            { title: "Backfill historical data", detail: "copy the moving range's existing rows from old shard to new, in the background, while dual-writes keep it from going stale", tone: "signal" },
            { title: "Verify consistency", detail: "compare row counts / checksums between old and new copies of the moving range", tone: "healthy" },
            { title: "Cut reads over to the new shard", detail: "flip the router/directory entry — this is the only user-visible instant, and it's a metadata update, not a data move", tone: "healthy" },
            { title: "Stop dual-writing, decommission the old copy", detail: "the new shard is now the sole owner of that key range", tone: "healthy" },
          ],
        },
        {
          kind: "insight",
          text: "This is the same shape as any zero-downtime migration: never make the cutover the moment data moves — make the cutover a flip of a small piece of metadata (a ring position, a directory row, a router boundary) after the data is already safely copied and verified. It's also exactly why directory-based sharding is the easiest of the three to reshard live: step 5 above is a single-row update in the directory, with nothing else to recompute.",
        },
      ],
    },
    {
      id: "real-world-usage",
      heading: "Real usage",
      blocks: [
        {
          kind: "list",
          items: [
            "MongoDB sharded clusters — directory-based in spirit: config servers store the chunk map (shard-key-range → shard), a mongos router consults it on every query, and a background balancer moves chunks between shards as they grow uneven — the live \"move the metadata, not the traffic\" pattern above, automated.",
            "Vitess (built at YouTube, now widely used) — adds a routing layer (vtgate) in front of sharded MySQL so applications query it like one logical database; resharding is an explicit online workflow that copies, verifies, and cuts over exactly the dual-write/backfill/verify sequence described above.",
            "DynamoDB — partition key is hashed via consistent hashing (Lesson 19) to place an item on a physical partition; an optional sort key orders items within that partition, giving range-query support back within a single shard without giving up hash-based distribution across shards.",
            "Instagram (2012 engineering blog, \"Sharding & IDs at Instagram\") — thousands of logical Postgres shards (each a schema) mapped many-to-one onto a smaller number of physical servers, so a logical shard can move between physical machines without changing any ID. Each row's 64-bit ID is generated from its shard directly: bits for a millisecond timestamp, bits for the logical shard ID, bits for a per-shard, per-millisecond sequence — solving the auto-increment problem above by construction, since two shards can never generate the same ID.",
          ],
        },
        {
          kind: "insight",
          text: "This app's own Database entity lists \"sharding/partitioning\" as one of the standard levers a real database has, and NoSQL mode already applies a throughput/latency profile meant to represent partitioned-by-key access — but there's no dedicated Shard entity or shard-key configuration to drag onto the canvas, the same honest gap Lesson 19 called out for its own hashRouting.ts. Sharding here stays a concept this app teaches, not one it simulates end-to-end.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "Sharding questions in an HLD interview tend to probe whether you understand the trade-off, not just the mechanism:" },
        {
          kind: "qa",
          question: "\"Your database is the bottleneck — walk me through how you'd shard it.\"",
          answer:
            "\"First I'd check whether sharding is actually necessary yet — read replicas and caching solve read-heavy bottlenecks without touching the data model, so I'd only reach for sharding if writes or total storage, not just reads, are the constraint. If it is necessary: pick a shard key with high cardinality, even access distribution, and alignment with the dominant query pattern — that choice matters more than which routing strategy I pick on top of it, because a bad key creates a hotspot no routing scheme fixes. Then I'd choose hash-based routing with a consistent-hashing ring by default, since it avoids both the range-based hotspot-on-monotonic-keys problem and the plain-hash-% -N rebalancing problem — directory-based only if I need arbitrary manual placement.\"",
        },
        {
          kind: "qa",
          question: "\"Range-based vs. hash-based sharding — when would you pick one over the other?\"",
          answer:
            "\"Range-based when range queries on the shard key are the dominant access pattern — 'give me all orders from this week' stays a single-shard query. The cost is hotspots on any monotonically increasing key, since all new writes land on the newest shard. Hash-based when write distribution matters more than range queries — hashing scrambles insertion order so writes spread evenly, at the cost of turning any range query into a scatter-gather across every shard.\"",
        },
        {
          kind: "qa",
          question: "\"How do you handle a query that needs to JOIN data living on two different shards?\"",
          answer:
            "\"Three options, in order of preference: denormalize so the join isn't needed — duplicate the small side of the join onto both shards and accept the update cost; do the join in the application layer by querying each shard and merging in memory, which works but pushes complexity and latency into the app; or, if the two entities are always accessed together, that's a signal they may need the same shard key so the join becomes single-shard again. A distributed join engine or cross-shard transaction protocol is the last resort — it solves the problem but reintroduces most of the coordination cost sharding was meant to avoid.\"",
        },
      ],
    },
  ],
  summary:
    "Sharding is the database-scaling strategy that splits the dataset itself across machines, not just copies of it (replicas) or a fast path in front of it (caching) — which is why it's reached for last and pays off hardest when writes or storage, not just reads, are the bottleneck. Everything starts with the shard key: high cardinality, even access distribution, and alignment with the dominant query pattern, or every routing strategy built on top inherits a hotspot. Range-based sharding keeps range queries fast but hotspots on monotonic keys; hash-based sharding (ideally over a consistent-hashing ring, Lesson 19) spreads writes evenly at the cost of range queries; directory-based sharding trades an extra lookup hop for fully manual placement and the cheapest live resharding. Sharding also breaks things a single database gave you for free — cross-shard JOINs, uniqueness constraints, multi-row transactions, and auto-increment IDs — which is the real cost being paid, not the routing mechanics. Live resharding follows the same shape everywhere it's done for real (MongoDB, Vitess): dual-write, backfill, verify, then cut over by flipping metadata, never by moving data at the instant of cutover.",
  keyTakeaways: [
    "Sharding splits the data itself across machines; read replicas and caching only add copies or a lookaside in front of one primary — sharding is what scales writes and total storage, not just reads.",
    "The shard key is the decision that matters most: high cardinality, even access distribution, and alignment with the dominant query pattern. A bad shard key creates a hotspot that no routing strategy — hash-based, ring-based, or otherwise — can fix afterward.",
    "Three routing strategies: range-based (fast range queries, hotspots on monotonic keys), hash-based (even write distribution, range queries become scatter-gather; best paired with Lesson 19's consistent-hashing ring), and directory-based (an explicit key→shard lookup table, most flexible, cheapest to reshard, but an extra hop and a new critical dependency).",
    "Sharding breaks things a single database provides for free: cross-shard JOINs, uniqueness constraints, multi-row transactions, and auto-increment ID generation (Instagram's timestamp+shard+sequence 64-bit ID scheme is the standard real-world fix for the last one). This data-model cost, not the routing mechanics, is why sharding is a last resort.",
    "Live resharding never moves the cutover moment to when data moves — dual-write, backfill, verify, then flip a small piece of metadata (a ring position, a directory row, a boundary). MongoDB's config-server/balancer and Vitess's online resharding workflow both automate exactly this sequence.",
  ],
  exercise: {
    prompt:
      "You run a ride-hailing app's trips database on a single Postgres primary with read replicas (Lesson 12). Trips are growing 10x and writes — not reads — are now the bottleneck: every trip start, location ping, and trip end is a write, and the primary can't keep up. (1) Explain why adding more read replicas doesn't fix this, in one sentence. (2) You're considering sharding by trip_id (an auto-incrementing integer) versus sharding by rider_id. Which would you pick, and what specific problem does the other one create? (3) A common query is \"show me this rider's last 20 trips\" — does your choice from (2) keep that query fast, or does it now need to scatter-gather across shards? Explain. (4) Six months later you need to go from 4 shards to 8. Describe the live resharding sequence you'd run so the cutover doesn't cause downtime — name each step.",
    guidance: [
      {
        kind: "paragraph",
        text: "(1) Read replicas only add read capacity — every replica still receives every write, replicated from the same one primary, so a write-throughput ceiling is untouched by adding more of them.",
      },
      {
        kind: "paragraph",
        text: "(2) Shard by rider_id, not trip_id. trip_id is monotonically increasing, so sharding by it (range-based) puts every new trip's writes on whichever shard currently owns the newest ID range — exactly the hotspot Lesson 12 flagged. rider_id has far higher effective cardinality relative to any one rider's write rate, so writes spread across shards instead of concentrating on one.",
      },
      {
        kind: "paragraph",
        text: "(3) Sharding by rider_id keeps it fast and single-shard: all of one rider's trips live on the same shard (assuming rider_id is also the shard key used for routing), so \"last 20 trips for this rider\" is a normal indexed query against one machine, not a scatter-gather.",
      },
      {
        kind: "list",
        items: [
          "Pick the new shard boundaries/ring positions for going 4 → 8 shards — this identifies exactly which rider_id ranges move.",
          "Dual-write: new writes for the moving ranges go to both the old and new (8th) shard.",
          "Backfill: copy each moving range's existing trip rows from its old shard to its new shard in the background.",
          "Verify: check row counts/checksums between old and new copies of each moving range.",
          "Cut reads over: flip the router/directory entries for the moved ranges to point at the new shards — the only user-visible instant, and it's a metadata flip, not a data move.",
          "Stop dual-writing and decommission the old copies of the moved ranges.",
        ],
      },
    ],
  },
  relatedEntitySlugs: ["database", "replica-pool"],
  prerequisites: ["consistent-hashing", "database-indexing-deep-dive"],
};
