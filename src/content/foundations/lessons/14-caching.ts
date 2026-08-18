import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 14 | Topic: Caching | Phase: 1 — Foundations".
 */
export const CACHING: FoundationLesson = {
  slug: "caching",
  number: 14,
  title: "Caching",
  tagline:
    "The single highest-leverage performance optimization in system design — RAM is 10,000x faster than a database query.",
  estimatedMinutes: 60,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        { kind: "paragraph", text: "You're a doctor. Every day, 500 patients ask you: \"What's the capital of France?\"" },
        { kind: "paragraph", text: "You have two options:" },
        {
          kind: "list",
          items: [
            "Option A: call the French embassy every single time to confirm the answer.",
            "Option B: remember the answer from the first time and just say \"Paris\" instantly.",
          ],
        },
        { kind: "paragraph", text: "Option B is caching." },
        {
          kind: "paragraph",
          text: "Now scale this: Flipkart serves 50 million product page views daily. If every view hit the database to fetch product details — the database would be vaporized.",
        },
        {
          kind: "paragraph",
          text: "Instead, Flipkart fetches product details once, stores them in a cache, and serves the next 10,000 requests from memory in microseconds.",
        },
        { kind: "insight", text: "Caching is the single highest-leverage performance optimization in system design. No other technique comes close." },
      ],
    },
    {
      id: "why-caching-works",
      heading: "Why caching works — the numbers",
      blocks: [
        { kind: "paragraph", text: "Fetching data from:" },
        {
          kind: "table",
          headers: ["Layer", "Latency"],
          rows: [
            ["CPU cache (L1)", "~0.5 nanoseconds"],
            ["RAM (Redis)", "~100 nanoseconds"],
            ["SSD (local disk)", "~100 microseconds"],
            ["Database query", "~1-10 milliseconds"],
            ["Network (another DC)", "~150 milliseconds"],
          ],
        },
        {
          kind: "insight",
          text: "RAM is 10,000x faster than a database query, and 1,000,000x faster than a network call. If 90% of your requests can be served from RAM instead of the database — your system becomes 10,000x more capable without adding a single database server.",
        },
        { kind: "paragraph", text: "This is why every major tech company treats caching as a first-class architectural concern." },
      ],
    },
    {
      id: "what-to-cache",
      heading: "What should you cache?",
      blocks: [
        { kind: "paragraph", text: "Not everything deserves to be cached. The ideal cache candidate is:" },
        {
          kind: "list",
          items: [
            "✅ Read frequently, written rarely (product details, user profiles, configuration)",
            "✅ Expensive to compute or fetch (complex database queries, external API calls)",
            "✅ Acceptable to serve slightly stale (news feed, product recommendations)",
            "✅ Same result for many users (homepage, trending items, public data)",
          ],
        },
        {
          kind: "paragraph",
          text: "❌ Never cache: user-specific sensitive data (bank balance); data that must be real-time accurate (stock prices); frequently changing data with zero tolerance for staleness; data that's cheap to fetch and rarely requested.",
        },
      ],
    },
    {
      id: "hit-and-miss",
      heading: "Cache hit and cache miss",
      blocks: [
        { kind: "paragraph", text: "Every cache interaction is either a hit or a miss." },
        {
          kind: "compare",
          panels: [
            {
              title: "Cache HIT",
              nodes: [
                { id: "hit-request", label: "Request", col: 0, row: 0 },
                { id: "hit-cache", label: "Cache", col: 1, row: 0, tone: "healthy", entityType: "cache" },
                { id: "hit-return", label: "Return data", sublabel: "microseconds, DB not touched", col: 2, row: 0, tone: "healthy" },
              ],
              edges: [
                { from: "hit-request", to: "hit-cache" },
                { from: "hit-cache", to: "hit-return", label: "\"Found it!\"", tone: "healthy" },
              ],
            },
            {
              title: "Cache MISS",
              nodes: [
                { id: "miss-request", label: "Request", col: 0, row: 0 },
                { id: "miss-cache", label: "Cache", col: 1, row: 0, entityType: "cache" },
                { id: "miss-db", label: "Database", col: 2, row: 0, entityType: "database" },
                { id: "miss-return", label: "Return data", sublabel: "milliseconds, only happens once", col: 3, row: 0 },
              ],
              edges: [
                { from: "miss-request", to: "miss-cache" },
                { from: "miss-cache", to: "miss-db", label: "\"Not found\"" },
                { from: "miss-db", to: "miss-return", label: "fetch + store in cache" },
              ],
            },
          ],
        },
        { kind: "paragraph", text: "Hit Rate = Cache hits / Total requests × 100." },
        {
          kind: "table",
          headers: ["Hit rate", "Impact"],
          rows: [
            ["90%", "90% served from cache, only 10% reach the database — 10x reduction in DB load"],
            ["99%", "only 1% reaches the database — 100x reduction in DB load"],
          ],
        },
        {
          kind: "paragraph",
          text: "Industry targets: good = 90%+ hit rate, great = 99%+ hit rate, Netflix's CDN cache = 99.9%+ hit rate for popular content.",
        },
      ],
    },
    {
      id: "strategies",
      heading: "Cache strategies — where does the cache sit?",
      blocks: [
        {
          kind: "paragraph",
          text: "Strategy 1: Cache Aside (Lazy Loading). The application manages the cache manually. Most common pattern.",
        },
        {
          kind: "flow",
          steps: [
            { title: "READ: App checks cache for data" },
            { title: "READ: Cache HIT → return data directly", tone: "healthy" },
            { title: "READ: Cache MISS → fetch from DB → store in cache → return data" },
            { title: "WRITE: Write to database" },
            { title: "WRITE: Invalidate (delete) the cache entry", detail: "next read will repopulate from DB" },
          ],
        },
        {
          kind: "code",
          language: "java",
          code: 'public Product getProduct(String productId) {\n    // Step 1: Check cache\n    Product cached = redis.get("product:" + productId);\n    if (cached != null) {\n        return cached; // Cache HIT\n    }\n\n    // Step 2: Cache MISS — fetch from DB\n    Product product = database.findById(productId);\n\n    // Step 3: Store in cache with TTL\n    redis.set("product:" + productId, product, Duration.ofMinutes(30));\n\n    return product;\n}\n\npublic void updateProduct(String productId, Product updated) {\n    // Write to DB first\n    database.save(updated);\n\n    // Invalidate cache — stale data removed\n    redis.delete("product:" + productId);\n}',
        },
        { kind: "paragraph", text: "Advantages: cache only contains requested data (no wasted memory); database is the source of truth; cache failures are non-fatal (just slower); works well for read-heavy workloads." },
        { kind: "paragraph", text: "Disadvantages: cache miss penalty — first request is always slow; potential stale data between write and invalidation; cache stampede (discussed later)." },
        { kind: "paragraph", text: "Used by: Flipkart product pages, Instagram profiles, most read-heavy systems." },
        { kind: "paragraph", text: "Strategy 2: Write Through. Write to cache AND database simultaneously on every write." },
        {
          kind: "flow",
          steps: [
            { title: "App writes to cache" },
            { title: "Cache synchronously writes to database" },
            { title: "Both updated before returning to client", tone: "healthy" },
            { title: "Reads always check cache first", detail: "cache always has latest data — no staleness", tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "Advantages: cache always has fresh data; no stale reads; cache miss rare (everything written goes to cache). Disadvantages: every write hits both cache and DB — slower writes; cache fills with data that might never be read (wasted memory); write latency increases." },
        { kind: "paragraph", text: "Used for: systems where read consistency is critical and writes are infrequent." },
        { kind: "paragraph", text: "Strategy 3: Write Behind (Write Back). Write to cache immediately. Write to database asynchronously later." },
        {
          kind: "flow",
          steps: [
            { title: "App writes to cache only", detail: "returns immediately to client", tone: "healthy" },
            { title: "Cache asynchronously writes to database", detail: "batched, delayed" },
            { title: "Reads check cache first", detail: "fast reads from cache" },
          ],
        },
        { kind: "paragraph", text: "Advantages: extremely fast writes (no DB latency); can batch multiple writes (efficient DB usage); good for write-heavy workloads. Disadvantages: risk of data loss — if the cache crashes before the async write, data is lost; complex implementation; the DB might be temporarily inconsistent." },
        { kind: "paragraph", text: "Used for: gaming leaderboards, analytics counters, non-critical write-heavy data." },
        { kind: "paragraph", text: "Strategy 4: Read Through. Cache sits between app and database — the app only talks to cache." },
        {
          kind: "flow",
          steps: [
            { title: "App always asks cache" },
            { title: "Cache HIT → return from cache", tone: "healthy" },
            { title: "Cache MISS → cache fetches from DB, stores, returns", detail: "app only knows about cache, not DB directly" },
          ],
        },
        {
          kind: "paragraph",
          text: "Difference from Cache Aside: Cache Aside — the app manages cache misses (fetches from DB itself). Read Through — the cache manages misses (fetches from DB itself). Used by: CDNs (the CDN fetches from origin when it doesn't have content).",
        },
        {
          kind: "table",
          headers: ["Strategy", "Best for", "Risk"],
          rows: [
            ["Cache Aside", "General purpose, read-heavy", "Stale data, cache stampede"],
            ["Write Through", "Read consistency critical", "Slow writes, wasted memory"],
            ["Write Behind", "Write-heavy, speed critical", "Data loss on crash"],
            ["Read Through", "CDNs, transparent caching", "Cache miss still slow"],
          ],
        },
        { kind: "insight", text: "In interviews: default to Cache Aside for most systems. Explain others when asked about write patterns." },
      ],
    },
    {
      id: "invalidation",
      heading: "Cache invalidation — the hardest problem",
      blocks: [
        {
          kind: "insight",
          label: "Phil Karlton",
          text: "There are only two hard things in computer science: cache invalidation and naming things.",
        },
        { kind: "paragraph", text: "Why is invalidation hard? Because you need to answer: when is cached data too stale to serve?" },
        { kind: "paragraph", text: "Method 1: TTL (Time To Live). Set an expiry time on every cache entry. After TTL expires, data is evicted." },
        { kind: "code", language: "java", code: 'redis.set("product:456", productData, TTL=3600) // expires in 1 hour\n\n// After 1 hour → cache entry deleted\n// Next request → cache miss → fetch fresh from DB' },
        { kind: "paragraph", text: "Choosing TTL:" },
        {
          kind: "list",
          items: [
            "Data changes frequently → short TTL (user's cart: 5 minutes; stock price: 1 second)",
            "Data changes rarely → long TTL (product details: 1 hour; city list: 24 hours; static config: 7 days)",
            "Data never changes → no TTL, or very long (historical orders: 7 days)",
          ],
        },
        { kind: "paragraph", text: "TTL trade-off: short TTL → fresher data, more DB load. Long TTL → staler data, less DB load." },
        { kind: "paragraph", text: "Method 2: Event-Based Invalidation. When data changes, explicitly delete the cache entry." },
        {
          kind: "flow",
          steps: [
            { title: "Product price updated in DB" },
            { title: "Application deletes \"product:456\" from cache" },
            { title: "Next read fetches fresh data from DB" },
            { title: "Cache repopulated with new price", tone: "healthy" },
          ],
        },
        {
          kind: "code",
          language: "java",
          code: 'public void updateProductPrice(String productId, BigDecimal newPrice) {\n    // Update database\n    database.updatePrice(productId, newPrice);\n\n    // Explicitly invalidate cache\n    redis.delete("product:" + productId);\n\n    // Optional: also invalidate related caches\n    redis.delete("category:electronics:products"); // list cache\n    redis.delete("homepage:featured");             // homepage cache\n}',
        },
        {
          kind: "paragraph",
          text: "Problem: what related caches need invalidation? This grows complex as your system grows.",
        },
        { kind: "paragraph", text: "Update product price →" },
        {
          kind: "list",
          items: [
            "Invalidate product cache ✅ obvious",
            "Invalidate search results cache? maybe",
            "Invalidate recommendation cache? maybe",
            "Invalidate homepage featured cache? maybe",
            "Invalidate user's wishlist cache? maybe",
          ],
        },
        { kind: "insight", text: "Missing one invalidation = stale data served." },
      ],
    },
    {
      id: "eviction-policies",
      heading: "Cache eviction policies",
      blocks: [
        { kind: "paragraph", text: "Cache has limited memory. When it's full, what gets removed?" },
        { kind: "paragraph", text: "LRU — Least Recently Used (most common). Remove the item that hasn't been accessed for the longest time." },
        { kind: "paragraph", text: "Cache state (most → least recently used):" },
        {
          kind: "architecture",
          nodes: [
            { id: "lru-iphone", label: "iPhone 15", col: 0, row: 0 },
            { id: "lru-samsung", label: "Samsung S24", col: 1, row: 0 },
            { id: "lru-pixel", label: "Pixel 8", col: 2, row: 0 },
            { id: "lru-oneplus", label: "OnePlus 12", col: 3, row: 0 },
            { id: "lru-redmi", label: "Redmi Note", sublabel: "evict this first", col: 4, row: 0, tone: "critical" },
          ],
          edges: [],
        },
        { kind: "paragraph", text: "Intuition: if you haven't used something in a while, you probably won't need it soon. Used by: Redis default, most caches." },
        { kind: "paragraph", text: "LFU — Least Frequently Used. Remove the item accessed the fewest times overall." },
        {
          kind: "table",
          headers: ["Item", "Access count", "Decision"],
          rows: [
            ["iPhone 15", "10,000", "keep"],
            ["Samsung S24", "8,000", "keep"],
            ["Redmi Note", "3", "evict"],
          ],
        },
        { kind: "paragraph", text: "Intuition: unpopular items are unlikely to be needed. Used for: content where popularity determines relevance (news, trending items)." },
        { kind: "paragraph", text: "FIFO — First In, First Out. Remove the oldest inserted item regardless of access pattern. Simple but often wrong — old data might still be hot." },
        { kind: "paragraph", text: "Random Eviction — remove a random item. Surprisingly effective for some workloads." },
        { kind: "paragraph", text: "TTL-Based Eviction — remove expired items first, then fall back to LRU." },
        { kind: "insight", text: "For interviews: default answer is LRU. Justify LFU when access frequency is a better predictor than recency." },
      ],
    },
    {
      id: "cache-problems",
      heading: "Cache problems — the ones that kill production systems",
      blocks: [
        { kind: "paragraph", text: "Problem 1: Cache Stampede (Thundering Herd). Happens when a popular cache entry expires and thousands of requests simultaneously miss the cache." },
        {
          kind: "flow",
          steps: [
            { title: "Popular product \"iPhone 15\" cached with TTL=1 hour" },
            { title: "TTL expires at 3:00:00 PM", tone: "signal" },
            { title: "10,000 requests arrive simultaneously", detail: "all check cache → all get MISS", tone: "signal" },
            { title: "All 10,000 hit the database simultaneously", detail: "database overwhelmed → crashes", tone: "critical" },
          ],
        },
        { kind: "paragraph", text: "Solutions:" },
        {
          kind: "list",
          items: [
            "a) Mutex/Lock: cache miss → acquire lock → only ONE request fetches from DB, others wait for the lock and use the newly cached value. Problem: adds latency for waiting requests.",
            "b) Probabilistic Early Expiration: don't wait for TTL to expire — when TTL is close to expiring, probabilistically refresh early, so some requests start refreshing before TTL hits and the stampede is prevented.",
            "c) Background refresh: a background job refreshes popular cache entries before they expire, so users always get cached data and never see a miss.",
          ],
        },
        { kind: "paragraph", text: "Problem 2: Cache Penetration. Requests for data that doesn't exist in DB OR cache — every request hits the DB." },
        {
          kind: "flow",
          steps: [
            { title: "Attacker sends requests for fake IDs", detail: "GET /products/fake_id_1, fake_id_2, fake_id_3 ... millions of requests" },
            { title: "Each: cache miss (doesn't exist)", tone: "signal" },
            { title: "DB query — nothing found" },
            { title: "DB gets hammered by useless queries", tone: "critical" },
          ],
        },
        { kind: "paragraph", text: "Solutions:" },
        {
          kind: "code",
          language: "java",
          code: 'Product product = database.findById(productId);\nif (product == null) {\n    // Cache the "not found" result with short TTL\n    redis.set("product:" + productId, "NULL", TTL=60);\n    return null;\n}',
        },
        {
          kind: "paragraph",
          text: "b) Bloom Filter: before checking cache, check a Bloom Filter — \"Does product_id=fake_123 exist in the system?\" Bloom Filter: \"No\" → return 404 immediately (never touches cache or DB). A Bloom Filter is a probabilistic data structure — false positives possible, false negatives impossible, and very memory-efficient.",
        },
        { kind: "paragraph", text: "Problem 3: Cache Avalanche. Many cache entries expire at the same time → massive DB load spike." },
        {
          kind: "flow",
          steps: [
            { title: "All product caches set at 9:00 AM with TTL=1 hour" },
            { title: "At 10:00 AM → ALL expire simultaneously", tone: "signal" },
            { title: "Massive cache miss storm", tone: "signal" },
            { title: "Database overwhelmed", tone: "critical" },
          ],
        },
        { kind: "paragraph", text: "Solution: TTL Jitter." },
        {
          kind: "code",
          language: "java",
          code: "// Instead of fixed TTL:\nredis.set(key, value, TTL=3600);\n\n// Add random jitter:\nint jitter = random.nextInt(600); // 0-10 minutes\nredis.set(key, value, TTL=3600 + jitter);\n\n// Now expiry is spread between 60-70 minutes\n// No simultaneous mass expiry",
        },
      ],
    },
    {
      id: "cache-levels",
      heading: "Cache levels — where caches live",
      blocks: [
        { kind: "paragraph", text: "Modern systems have multiple cache layers:" },
        {
          kind: "flow",
          steps: [
            { title: "Request" },
            { title: "Browser Cache", detail: "Level 1 — client-side, instant" },
            { title: "CDN Cache", detail: "Level 2 — edge server, near user" },
            { title: "Load Balancer Cache", detail: "Level 3 — Nginx microcache" },
            { title: "Application Cache", detail: "Level 4 — in-memory (Guava, Caffeine)" },
            { title: "Distributed Cache", detail: "Level 5 — Redis/Memcached" },
            { title: "Database", detail: "Level 6 — source of truth" },
          ],
        },
        {
          kind: "paragraph",
          text: "Each level is faster than the one below it. The goal: serve as many requests as possible at the highest (fastest) level.",
        },
        { kind: "paragraph", text: "In-Process Cache (Caffeine, Guava) — cache lives INSIDE the application server's memory." },
        { kind: "list", items: ["Extremely fast (no network hop)", "Cache is local to one server", "Problem: 10 servers = 10 different caches — Server 1 updates its cache, Servers 2-10 still have stale data"] },
        { kind: "paragraph", text: "Distributed Cache (Redis) — cache lives in a SEPARATE server." },
        { kind: "list", items: ["Slightly slower (network hop, ~1ms)", "Shared across ALL application servers", "All servers see the same data — one update, all servers immediately consistent"] },
        { kind: "paragraph", text: "Real systems use both:" },
        {
          kind: "table",
          headers: ["Level", "Store", "TTL", "Purpose"],
          rows: [
            ["L1", "In-process cache (Caffeine)", "30 seconds", "Handles repeated requests on same server"],
            ["L2", "Redis", "30 minutes", "Handles requests across all servers"],
            ["L3", "Database", "—", "Source of truth"],
          ],
        },
      ],
    },
    {
      id: "industry-examples",
      heading: "Real industry caching examples",
      blocks: [
        { kind: "paragraph", text: "Instagram. Problem: 400M users, each following 100-1000 people — generating a feed means querying all followees' posts." },
        {
          kind: "list",
          items: [
            "Pre-compute feeds and cache in Redis",
            'Cache key: "feed:user_123" → [post_ids...]',
            "TTL: 24 hours",
            "Cache hit rate: 99%+",
          ],
        },
        { kind: "paragraph", text: "Flipkart. Problem: product pages viewed millions of times/day, each view = 15-20 DB queries (product, reviews, inventory, etc.)." },
        {
          kind: "list",
          items: [
            "Cache the complete product page response",
            'Cache key: "product_page:456:v2"',
            "TTL: 15 minutes",
            "On product update: invalidate cache",
            "Result: DB load reduced 95%",
          ],
        },
        { kind: "paragraph", text: "Netflix. Problem: 200M users, each with different recommendations — computing recommendations means expensive ML model inference." },
        {
          kind: "list",
          items: [
            "Pre-compute recommendations for all users nightly",
            "Cache in EVCache (Netflix's Redis-based cache)",
            "TTL: 24 hours",
            "Result: recommendations served in <1ms",
          ],
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "Caching is asked in EVERY system design interview. The questions:" },
        {
          kind: "qa",
          question: "\"How would you scale your system to handle 100x traffic?\"",
          answer:
            "\"Add a Redis caching layer in front of the database using the Cache Aside pattern. Cache the most frequently read data — product details, user profiles, feed data. With a 95% cache hit rate, database load drops 20x. Use TTL-based expiration with jitter to prevent cache avalanche.\"",
        },
        {
          kind: "qa",
          question: "\"How do you handle cache invalidation?\"",
          answer:
            "\"For most data, TTL-based expiration with appropriate duration. For data that must be fresh immediately after writes, event-based invalidation — delete the cache entry on write. For complex systems, use a message queue to propagate invalidation events to all cache layers.\"",
        },
        {
          kind: "qa",
          question: "\"What is cache stampede and how do you prevent it?\"",
          answer:
            "\"When a popular cache entry expires, thousands of simultaneous requests miss the cache and hammer the database. Prevent with mutex locks (only one request fetches, others wait), probabilistic early refresh (refresh before TTL expires), or background refresh jobs for high-traffic keys.\"",
        },
      ],
    },
  ],
  summary:
    "Caching stores frequently accessed data in fast memory to avoid expensive database queries — with Cache Aside being the dominant pattern, TTL and event-based invalidation controlling freshness, and cache stampede, penetration, and avalanche being the production problems every system designer must anticipate.",
  keyTakeaways: [
    "Cache Aside is the default pattern — the app checks cache, misses fetch from DB and populate cache. Simple and effective.",
    "TTL controls staleness — short TTL for dynamic data, long TTL for static data, always add jitter to prevent avalanche.",
    "Three production killers: Stampede (mass expiry), Penetration (non-existent keys), Avalanche (simultaneous expiry). Know the solutions.",
    "Multi-level caching — Browser → CDN → Application → Redis → Database. Each level serves requests faster than the one below.",
    "Cache hit rate is the metric — target 90%+ for good systems, 99%+ for great ones. Low hit rate means the wrong caching strategy.",
  ],
  exercise: {
    prompt:
      "You're the lead engineer at Hotstar during IPL season. Scale: 50 million concurrent viewers during peak, 10 million requests/second at peak, current DB is PostgreSQL and getting hammered. Most frequent requests (in order): (1) GET /matches/current — live match details (score, overs, etc.); (2) GET /users/{id}/subscription — is this user premium?; (3) GET /videos/{id}/stream-url — get CDN URL for video; (4) GET /leaderboard/fantasy — top 100 fantasy players; (5) GET /matches/{id}/comments — latest 50 comments. For each of the 5 endpoints: should it be cached (yes/no and why)? What TTL, justified by how often the data changes? What cache key would you use? What invalidation strategy — TTL only, or event-based? Bonus: endpoint 1 (live match details) is updated every ball — roughly every 30 seconds — and 50 million users are requesting it constantly. What specific cache problem are you most worried about here, and how do you prevent it?",
  },
  relatedEntitySlugs: ["cache", "cdn"],
};
