import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 15 | Topic: Redis Deep Dive | Phase: 1 — Foundations".
 */
export const REDIS_DEEP_DIVE: FoundationLesson = {
  slug: "redis-deep-dive",
  number: 15,
  title: "Redis Deep Dive",
  tagline:
    "Not \"just a cache\" — a data structure server. Choosing the right structure (ZSet, Set, List, Hash) is the actual skill.",
  estimatedMinutes: 60,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "In Lesson 14 we learned why caching exists. Now let's learn the tool that powers caching at almost every major tech company in the world.",
        },
        { kind: "paragraph", text: "Redis is used by:" },
        {
          kind: "list",
          items: [
            "Twitter — storing timelines and social graphs",
            "GitHub — caching, queuing, rate limiting",
            "Instagram — feed caching, session storage",
            "Flipkart — product caching, cart storage",
            "Uber — location data, surge pricing",
            "Stack Overflow — entire caching layer",
          ],
        },
        { kind: "insight", text: "The question isn't \"should I use Redis?\" — it's \"how do I use Redis correctly?\"" },
        {
          kind: "paragraph",
          text: "Redis is deceptively simple on the surface. But used wrong, it becomes a bottleneck instead of a solution. This lesson builds the deep understanding that separates engineers who \"have used Redis\" from engineers who truly understand it.",
        },
      ],
    },
    {
      id: "what-redis-is",
      heading: "What Redis actually is",
      blocks: [
        { kind: "paragraph", text: "Most engineers think Redis is \"just a cache.\" It's not." },
        { kind: "paragraph", text: "Redis = Remote Dictionary Server. It's an in-memory data structure store that can be used as:" },
        {
          kind: "list",
          items: ["Cache", "Database (primary store for some use cases)", "Message broker", "Queue", "Session store", "Rate limiter", "Leaderboard engine", "Pub/Sub system", "Distributed lock manager"],
        },
        {
          kind: "insight",
          text: "The key insight: Redis is fast because everything lives in RAM. Operations complete in microseconds because there's no disk I/O on the critical path.",
        },
        {
          kind: "table",
          headers: ["Metric", "Value"],
          rows: [
            ["GET operation", "~1 microsecond"],
            ["SET operation", "~1 microsecond"],
            ["ZADD operation", "~O(log N) microseconds"],
            ["Throughput (single instance)", "100,000 – 1,000,000 operations/second"],
          ],
        },
      ],
    },
    {
      id: "data-structures",
      heading: "Redis data structures — the core",
      blocks: [
        {
          kind: "paragraph",
          text: "Redis isn't just key → string. It has 8 native data structures, each solving different problems.",
        },
        { kind: "paragraph", text: "Data Structure 1: Strings. The simplest — a key maps to a string value (which can be text, numbers, or binary)." },
        {
          kind: "code",
          language: "redis",
          code: '-- Basic set and get\nSET user:123:name "Priya Sharma"\nGET user:123:name\n→ "Priya Sharma"\n\n-- Set with TTL (expires after 3600 seconds)\nSET session:abc123 "user_data_here" EX 3600\nTTL session:abc123\n→ 3547  (seconds remaining)\n\n-- Atomic increment (no race condition)\nSET page:home:views 0\nINCR page:home:views    → 1\nINCR page:home:views    → 2\nINCRBY page:home:views 10  → 12\n\n-- Only set if key doesn\'t exist (NX = Not eXists)\nSET lock:order:9981 "locked" NX EX 30\n→ OK    (lock acquired)\nSET lock:order:9981 "locked" NX EX 30\n→ nil   (lock already held by someone else)',
        },
        {
          kind: "paragraph",
          text: "Real use cases: session storage (session:{token} → user data), caching (product:{id} → JSON), rate limiting (rate:{ip} → request count), distributed locks (lock:{resource} → owner).",
        },
        { kind: "paragraph", text: "Data Structure 2: Hashes. A map of field → value pairs. Like a mini-document." },
        {
          kind: "code",
          language: "redis",
          code: '-- Store user object as hash\nHSET user:123 name "Priya" email "priya@gmail.com"\n\n-- Shopping cart (product_id → quantity)\nHSET cart:user_123 product_456 2\nHSET cart:user_123 product_789 1\nHGETALL cart:user_123\n→ product_456  2\n   product_789  1\n\n-- Update quantity\nHINCRBY cart:user_123 product_456 1   → 3',
        },
        { kind: "paragraph", text: "Data Structure 3: Lists. Ordered list of strings — push/pop from either end, like a doubly-linked list." },
        {
          kind: "code",
          language: "redis",
          code: '-- Push to left (head)\nLPUSH notifications:user_123 "Priya liked your photo"\nLPUSH notifications:user_123 "Rahul commented on your post"\nLPUSH notifications:user_123 "Your order was delivered"\n\n-- Get first 10 items (0 = first, 9 = tenth)\nLRANGE notifications:user_123 0 9\n→ 1) "Your order was delivered"     ← most recent (last pushed)\n   2) "Rahul commented on your post"\n   3) "Priya liked your photo"\n\n-- Get list length\nLLEN notifications:user_123 → 3\n\n-- Pop from left (remove and return)\nLPOP notifications:user_123\n→ "Your order was delivered"\n\n-- Trim to keep only latest 100 items\nLTRIM notifications:user_123 0 99\n\n-- Blocking pop (wait for item to appear) — used for queues\nBLPOP queue:emails 30    -- wait up to 30 seconds',
        },
        {
          kind: "paragraph",
          text: "Real use cases: activity feeds (latest N items), task queues (producer pushes, consumer pops), recent searches, message history (last N messages), log buffers.",
        },
        {
          kind: "code",
          language: "redis",
          code: '-- Simple task queue\n-- Producer (API server):\nLPUSH queue:emails "send_welcome_email:user_456"\n\n-- Consumer (worker process):\nBRPOP queue:emails 0   -- blocking pop, waits forever\n→ "send_welcome_email:user_456"\n-- Worker processes the email task',
        },
        { kind: "paragraph", text: "Data Structure 4: Sets. Unordered collection of unique strings — no duplicates." },
        {
          kind: "code",
          language: "redis",
          code: '-- Add members\nSADD post:456:likes "user_123"\nSADD post:456:likes "user_789"\nSADD post:456:likes "user_123"   -- duplicate, ignored\n\n-- Count members\nSCARD post:456:likes → 2\n\n-- Check membership\nSISMEMBER post:456:likes "user_123" → 1 (yes)\nSISMEMBER post:456:likes "user_999" → 0 (no)\n\n-- Get all members\nSMEMBERS post:456:likes\n→ user_123\n   user_789\n\n-- Remove member\nSREM post:456:likes "user_123"\n\n-- Set operations — powerful for social features\nSADD user:123:following "user_A" "user_B" "user_C"\nSADD user:456:following "user_B" "user_C" "user_D"\n\n-- Mutual follows (intersection)\nSINTER user:123:following user:456:following\n→ user_B\n   user_C\n\n-- All people either follows (union)\nSUNION user:123:following user:456:following\n→ user_A user_B user_C user_D\n\n-- People 123 follows that 456 doesn\'t (difference)\nSDIFF user:123:following user:456:following\n→ user_A',
        },
        {
          kind: "paragraph",
          text: "Real use cases: like/upvote tracking (unique users who liked), tags on content, mutual friends (\"People you may know\"), unique visitors per page, blocking lists.",
        },
        {
          kind: "paragraph",
          text: "Data Structure 5: Sorted Sets (ZSet). Like Sets but each member has a score, and members are ordered by score. The most powerful Redis data structure.",
        },
        {
          kind: "code",
          language: "redis",
          code: '-- Add members with scores\nZADD leaderboard 9823 "Mumbai Indians"\nZADD leaderboard 8654 "Chennai Super Kings"\nZADD leaderboard 7234 "Royal Challengers"\nZADD leaderboard 6891 "Kolkata Knight Riders"\n\n-- Get top 3 (highest score first)\nZREVRANGE leaderboard 0 2 WITHSCORES\n→ Mumbai Indians      9823\n   Chennai Super Kings 8654\n   Royal Challengers   7234\n\n-- Get rank of a team (0-indexed)\nZREVRANK leaderboard "Chennai Super Kings"\n→ 1  (second place)\n\n-- Get score\nZSCORE leaderboard "Mumbai Indians"\n→ 9823\n\n-- Increment score\nZINCRBY leaderboard 150 "Royal Challengers"\n→ 7384\n\n-- Get members within score range\nZRANGEBYSCORE leaderboard 7000 9000\n→ Royal Challengers\n   Chennai Super Kings',
        },
        {
          kind: "paragraph",
          text: "Real use cases: leaderboards (scores, rankings), priority queues (score = priority), rate limiting with sliding window (score = timestamp), news feed ranking (score = recency + engagement), trending topics (score = mention count).",
        },
        {
          kind: "code",
          language: "redis",
          code: '-- Rate limiting with sorted set\n-- Store request timestamps for user IP\nZADD rate:192.168.1.1 1704067200 "req_1"\nZADD rate:192.168.1.1 1704067201 "req_2"\n...\n\n-- Count requests in last 60 seconds\nnow = current_timestamp\nZCOUNT rate:192.168.1.1 (now-60) now\n→ 47  (requests in last minute)\n\n-- If > 100, rate limit them\n-- Remove old entries\nZREMRANGEBYSCORE rate:192.168.1.1 0 (now-60)',
        },
        { kind: "paragraph", text: "Quick reference — which data structure?" },
        {
          kind: "list",
          items: [
            "Storing a single value? → String",
            "Storing an object with multiple fields? → Hash",
            "Ordered list, duplicates allowed? → List",
            "Unique items, no order needed? → Set",
            "Unique items with ranking/scoring? → Sorted Set",
          ],
        },
      ],
    },
    {
      id: "persistence",
      heading: "Redis persistence — solving the \"everything in RAM\" problem",
      blocks: [
        {
          kind: "paragraph",
          text: "If Redis stores everything in RAM, what happens when the server restarts? Data is lost. Redis offers two persistence mechanisms.",
        },
        { kind: "paragraph", text: "RDB (Redis Database) — Snapshots. Periodically takes a snapshot of all data and writes it to disk." },
        {
          kind: "code",
          code: "save 900 1    → save if 1 change in 900 seconds\nsave 300 10   → save if 10 changes in 300 seconds\nsave 60 10000 → save if 10000 changes in 60 seconds",
        },
        {
          kind: "paragraph",
          text: "How it works: (1) Redis forks a child process; (2) the child writes the complete dataset to disk (dump.rdb); (3) the main process continues serving requests; (4) on restart, Redis loads from dump.rdb.",
        },
        {
          kind: "paragraph",
          text: "Advantages: compact single file (easy to backup); fast restart (load one file); minimal performance impact (a child process does the work). Disadvantages: data loss between snapshots — if a crash happens 4 minutes after the last snapshot, 4 minutes of data is lost.",
        },
        { kind: "paragraph", text: "Use when: data loss of a few minutes is acceptable (cache, sessions)." },
        { kind: "paragraph", text: "AOF (Append Only File) — Write Log. Every write operation is logged to a file. On restart, replay the log." },
        {
          kind: "code",
          code: "*3\\r\\n$3\\r\\nSET\\r\\n$8\\r\\nuser:123\\r\\n$5\\r\\nPriya\\r\\n\n*3\\r\\n$3\\r\\nSET\\r\\n$8\\r\\nsession:abc\\r\\n...\n...every write ever made...",
        },
        { kind: "paragraph", text: "On restart: Redis replays every command in the AOF file and the state is fully restored." },
        {
          kind: "paragraph",
          text: "fsync options: always → fsync after every write (safest, slowest); everysec → fsync every second (good balance, default); no → let the OS decide (fastest, least safe).",
        },
        {
          kind: "paragraph",
          text: "Advantages: near-zero data loss (at most 1 second with everysec); append-only means no corruption on crash. Disadvantages: larger file than RDB; slower restart (replay all commands); slightly slower writes.",
        },
        { kind: "paragraph", text: "Use when: data durability is important (primary data store, not just cache)." },
        {
          kind: "table",
          headers: ["Scenario", "Recommendation"],
          rows: [
            ["Pure cache (data exists in DB)", "No persistence (fastest)"],
            ["Sessions, rate limits", "RDB (acceptable small loss)"],
            ["Primary data store", "AOF with everysec"],
            ["Maximum durability", "RDB + AOF together"],
          ],
        },
      ],
    },
    {
      id: "expiration",
      heading: "Redis expiration strategies",
      blocks: [
        { kind: "paragraph", text: "Redis has two internal mechanisms for handling expired keys." },
        { kind: "paragraph", text: "Lazy Expiration — a key is checked for expiration only when accessed." },
        {
          kind: "flow",
          steps: [
            { title: "Key \"session:abc\" has TTL expired" },
            { title: "Nobody accesses it", detail: "stays in memory (wasted space)", tone: "signal" },
            { title: "User requests \"session:abc\"", detail: "Redis checks: expired? Yes → delete → return nil", tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "Active Expiration — Redis periodically scans a random sample of keys with TTLs and deletes expired ones." },
        {
          kind: "flow",
          steps: [
            { title: "Every 100ms: Redis picks 20 random keys with TTL" },
            { title: "Deletes the expired ones", tone: "healthy" },
            { title: "If >25% were expired", detail: "run again immediately", tone: "signal" },
          ],
        },
        {
          kind: "insight",
          text: "Combined effect: most expired keys are cleaned quickly. Some might linger briefly in memory. For large datasets with many expiring keys, memory usage can be temporarily higher than expected — something to monitor in production.",
        },
      ],
    },
    {
      id: "clustering",
      heading: "Redis clustering — scaling beyond one node",
      blocks: [
        { kind: "paragraph", text: "A single Redis instance has limits: memory limited to one server's RAM, throughput ~1M ops/second max, and it's a single point of failure. For larger systems, you need Redis Cluster." },
        { kind: "paragraph", text: "Master-Replica Replication:" },
        {
          kind: "architecture",
          nodes: [
            { id: "master-replica-master", label: "Redis Master", sublabel: "read+write — all writes go here", col: 1, row: 0 },
            { id: "master-replica-r1", label: "Replica 1", sublabel: "read", col: 0, row: 1 },
            { id: "master-replica-r2", label: "Replica 2", sublabel: "read", col: 2, row: 1 },
          ],
          edges: [
            { from: "master-replica-master", to: "master-replica-r1", label: "async replication" },
            { from: "master-replica-master", to: "master-replica-r2", label: "async replication" },
          ],
        },
        {
          kind: "paragraph",
          text: "Benefits: read scaling (distribute reads across replicas), high availability (a replica can be promoted if the master fails). Trade-off: async replication means slight data lag on replicas, and writes still go to a single master (write bottleneck).",
        },
        { kind: "paragraph", text: "Redis Cluster — Sharding. Split data across multiple master nodes. Each master owns a subset of the 16,384 hash slots." },
        {
          kind: "architecture",
          nodes: [
            { id: "master-a", label: "Node 1 — Master A", sublabel: "hash slots 0-5460", col: 0, row: 0 },
            { id: "master-a-r1", label: "Replica A1", col: 0, row: 1 },
            { id: "master-a-r2", label: "Replica A2", col: 1, row: 1 },
            { id: "master-b", label: "Node 2 — Master B", sublabel: "hash slots 5461-10922", col: 3, row: 0 },
            { id: "master-b-r1", label: "Replica B1", col: 3, row: 1 },
            { id: "master-b-r2", label: "Replica B2", col: 4, row: 1 },
            { id: "master-c", label: "Node 3 — Master C", sublabel: "hash slots 10923-16383", col: 6, row: 0 },
            { id: "master-c-r1", label: "Replica C1", col: 6, row: 1 },
            { id: "master-c-r2", label: "Replica C2", col: 7, row: 1 },
          ],
          edges: [
            { from: "master-a", to: "master-a-r1" },
            { from: "master-a", to: "master-a-r2" },
            { from: "master-b", to: "master-b-r1" },
            { from: "master-b", to: "master-b-r2" },
            { from: "master-c", to: "master-c-r1" },
            { from: "master-c", to: "master-c-r2" },
          ],
        },
        {
          kind: "flow",
          steps: [
            { title: "SET user:123 \"Priya\"" },
            { title: "hash(\"user:123\") % 16384 = 5789" },
            { title: "Routes to Node 2 (Master B)", tone: "healthy" },
          ],
        },
        {
          kind: "paragraph",
          text: "Benefits: horizontal scaling of memory (add nodes, add capacity), write scaling (each node handles its subset), high availability (replica promotes on master failure). Trade-offs: multi-key operations are limited (keys must be on the same node), cross-slot queries aren't supported, and setup is more complex.",
        },
      ],
    },
    {
      id: "sentinel",
      heading: "Redis Sentinel — high availability",
      blocks: [
        {
          kind: "paragraph",
          text: "For Master-Replica setups without full clustering, Redis Sentinel provides automatic failover.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "sentinel-1", label: "Sentinel 1", col: 0, row: 0 },
            { id: "sentinel-2", label: "Sentinel 2", col: 1, row: 0 },
            { id: "sentinel-3", label: "Sentinel 3", col: 2, row: 0 },
            { id: "sentinel-master", label: "Master", col: 0, row: 1 },
            { id: "sentinel-replica", label: "Replica", col: 2, row: 1 },
          ],
          edges: [
            { from: "sentinel-1", to: "sentinel-master", label: "monitor" },
            { from: "sentinel-1", to: "sentinel-replica", label: "monitor" },
            { from: "sentinel-2", to: "sentinel-master", label: "monitor" },
            { from: "sentinel-2", to: "sentinel-replica", label: "monitor" },
            { from: "sentinel-3", to: "sentinel-master", label: "monitor" },
            { from: "sentinel-3", to: "sentinel-replica", label: "monitor" },
          ],
        },
        {
          kind: "paragraph",
          text: "Master fails: Sentinels detect it (a quorum of 2/3 must agree), a Sentinel promotes the Replica to Master, and clients are notified of the new Master address — automatic, ~30 seconds of downtime.",
        },
        {
          kind: "paragraph",
          text: "When to use: a Master-Replica setup that needs automatic failover, simpler than a full Redis Cluster, when the dataset fits in one node's memory.",
        },
      ],
    },
    {
      id: "patterns",
      heading: "Redis patterns in system design",
      blocks: [
        { kind: "paragraph", text: "Pattern 1: Distributed Lock. Prevent race conditions in distributed systems." },
        {
          kind: "code",
          language: "redis",
          code: '-- Acquire lock (NX = only set if not exists, EX = TTL)\nSET lock:payment:9981 "server1_thread42" NX EX 30\n→ OK     (lock acquired, auto-releases in 30 seconds)\n→ nil    (lock held by someone else)\n\n-- Release lock (only if WE hold it)\n-- Use a Lua script for atomic check-and-delete:',
        },
        {
          kind: "code",
          language: "lua",
          code: 'if redis.call("GET", KEYS[1]) == ARGV[1] then\n    return redis.call("DEL", KEYS[1])\nelse\n    return 0\nend',
        },
        { kind: "paragraph", text: "Used for: preventing duplicate payment processing, distributed cron jobs, inventory updates." },
        { kind: "paragraph", text: "Pattern 2: Rate Limiting." },
        {
          kind: "code",
          language: "redis",
          code: "-- Fixed window rate limiting\n-- Allow 100 requests per minute per user\n\nfunction is_rate_limited(user_id):\n    key = \"rate:\" + user_id + \":\" + current_minute()\n    count = INCR key\n    if count == 1:\n        EXPIRE key 60    -- set TTL on first request\n    return count > 100\n\n-- Sliding window (more accurate, using Sorted Set)\nfunction is_rate_limited_sliding(user_id):\n    now = timestamp_ms()\n    window_start = now - 60000  -- 60 seconds ago\n    key = \"rate_sliding:\" + user_id\n\n    -- Add current request\n    ZADD key now now\n\n    -- Remove old requests outside window\n    ZREMRANGEBYSCORE key 0 window_start\n\n    -- Count requests in window\n    count = ZCARD key\n\n    -- Set TTL\n    EXPIRE key 60\n\n    return count > 100",
        },
        { kind: "paragraph", text: "Pattern 3: Pub/Sub for Real-Time Events." },
        {
          kind: "code",
          language: "redis",
          code: '-- Subscriber (notification service):\nSUBSCRIBE channel:user:123:notifications\n\n-- Publisher (order service, when order delivered):\nPUBLISH channel:user:123:notifications "Your order #9981 has been delivered!"\n\n-- Subscriber receives:\n→ message\n   channel:user:123:notifications\n   "Your order #9981 has been delivered!"',
        },
        {
          kind: "insight",
          text: "Limitation: Pub/Sub is fire-and-forget. If the subscriber is offline, the message is lost. For guaranteed delivery, use Redis Streams or Kafka.",
        },
        { kind: "paragraph", text: "Pattern 4: Leaderboard." },
        {
          kind: "code",
          language: "redis",
          code: '-- Fantasy cricket leaderboard\nZADD fantasy:ipl:2024 8750 "user_123"\nZADD fantasy:ipl:2024 9200 "user_456"\nZADD fantasy:ipl:2024 8100 "user_789"\n\n-- Top 10 players\nZREVRANGE fantasy:ipl:2024 0 9 WITHSCORES\n\n-- User\'s rank (0-indexed, add 1 for display)\nZREVRANK fantasy:ipl:2024 "user_123"\n→ 1  (second place)\n\n-- Users near user_123 (their neighborhood)\nrank = ZREVRANK fantasy:ipl:2024 "user_123"\nZREVRANGE fantasy:ipl:2024 (rank-2) (rank+2) WITHSCORES\n→ shows 5 players around user_123',
        },
      ],
    },
    {
      id: "redis-vs-memcached",
      heading: "Redis vs Memcached",
      blocks: [
        { kind: "paragraph", text: "Often compared in interviews:" },
        {
          kind: "table",
          headers: ["", "Redis", "Memcached"],
          rows: [
            ["Data structures", "8 types (String, Hash, List, Set, ZSet...)", "String only"],
            ["Persistence", "RDB + AOF", "None"],
            ["Replication", "Built-in", "Not built-in"],
            ["Clustering", "Native cluster", "Third-party"],
            ["Pub/Sub", "Yes", "No"],
            ["Lua scripting", "Yes", "No"],
            ["Memory efficiency", "Good", "Slightly better for strings"],
            ["Multi-threading", "Single-threaded (Redis 6+ has I/O threads)", "Multi-threaded"],
            ["Use case", "Everything", "Pure simple caching"],
          ],
        },
        {
          kind: "paragraph",
          text: "When to use Memcached: pure caching with simple string values, need multi-threaded performance on a single node, extremely simple use case.",
        },
        { kind: "paragraph", text: "When to use Redis: almost always — it does everything Memcached does plus much more." },
        {
          kind: "insight",
          text: "Interview answer: \"I'd choose Redis over Memcached because Redis supports rich data structures, persistence, pub/sub, and native clustering. Memcached is simpler but Redis's additional capabilities almost always justify the slight complexity increase.\"",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "Redis questions come up constantly. Key scenarios:" },
        {
          kind: "qa",
          question: "\"How would you implement a leaderboard for a gaming app?\"",
          answer:
            "\"Redis Sorted Set with ZADD to update scores and ZREVRANGE to fetch top N. User rank via ZREVRANK. All O(log N) operations. Can handle millions of players.\"",
        },
        {
          kind: "qa",
          question: "\"How would you implement rate limiting?\"",
          answer:
            "\"Redis INCR with TTL for fixed window. Sorted Sets with timestamps for sliding window rate limiting. Atomic operations prevent race conditions.\"",
        },
        {
          kind: "qa",
          question: "\"How does Redis handle persistence?\"",
          answer:
            "\"Two mechanisms: RDB snapshots periodically, and AOF logs every write. For a cache, I'd disable persistence. For a primary store, I'd use AOF with everysec fsync for at most 1 second of data loss.\"",
        },
        {
          kind: "qa",
          question: "\"Redis is single-threaded. How can it be so fast?\"",
          answer:
            "\"Single-threaded eliminates lock contention overhead. All data in RAM eliminates disk I/O. Simple data structures mean operations complete in nanoseconds. Network I/O is the bottleneck, not CPU — and Redis 6+ uses I/O threads for network operations.\"",
        },
      ],
    },
  ],
  summary:
    "Redis is an in-memory data structure store whose eight native data structures — Strings, Hashes, Lists, Sets, Sorted Sets, and more — each solve specific problems far more elegantly than a generic cache, while its persistence options, clustering, and atomic operations make it the Swiss Army knife of backend infrastructure.",
  keyTakeaways: [
    "Redis is not just a cache — it's a data structure server. Choosing the right data structure (ZSet for leaderboards, Set for unique tracking, List for queues) is the real skill.",
    "Sorted Sets are the most powerful structure — leaderboards, rate limiting, priority queues, feed ranking all use ZSets.",
    "Persistence is optional and configurable — no persistence for pure cache, AOF for durability, RDB for fast restarts.",
    "Single-threaded doesn't mean slow — no lock contention + all in RAM = 1M+ ops/second.",
    "Redis Cluster shards data across nodes for horizontal scaling — each key hashes to a specific node.",
  ],
  exercise: {
    prompt:
      "You're building the backend for Dream11 — India's largest fantasy sports platform. During IPL, Dream11 has: 10 million concurrent users; users creating teams and joining contests; a live leaderboard updating every over (every ~4 minutes); user notifications when they move up/down in rank. Design the Redis layer for these 4 features: Feature 1 — user session management (10M concurrent users, sessions expire after 24 hours); Feature 2 — live contest leaderboard (1 contest can have 5M participants, scores update every over); Feature 3 — rate limiting on team creation (max 10 teams per user per day); Feature 4 — real-time rank change notifications (notify a user when their rank changes by more than 10 positions). For each feature: which Redis data structure? What's the key naming convention? Any TTL needed? What Redis command(s) power the core operation?",
  },
  relatedEntitySlugs: ["cache"],
};
