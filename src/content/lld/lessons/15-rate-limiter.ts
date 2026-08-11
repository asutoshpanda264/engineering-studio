import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Closing case study,
 * and the track's cleanest full-circle example: Strategy (Lesson 8)
 * applied to genuinely comparable algorithms, mirroring Load Balancer's
 * routing-algorithm comparison from Lesson 6/9 one more time — and this
 * project's own Rate Limiter entity simulates two of the same algorithms
 * this lesson designs at the code level.
 */
export const RATE_LIMITER: LLDLesson = {
  slug: "rate-limiter",
  number: 15,
  category: "case-study",
  title: "Case Study: Rate Limiter",
  tagline:
    "Five named algorithms, all answering the same question — should this request be admitted right now — with genuinely different trade-offs between burst tolerance, memory, and precision at the boundary.",
  estimatedMinutes: 35,
  sections: [
    {
      id: "requirements",
      heading: "Step 1 — Requirements",
      blocks: [
        {
          kind: "paragraph",
          text: "Given a client identifier (a user id, an API key, an IP) and a configured limit (e.g. 100 requests per minute), decide in O(1) time whether an incoming request should be admitted or rejected. Rejected requests fail immediately — no queueing.",
        },
      ],
    },
    {
      id: "the-interface",
      heading: "Steps 3-4 — One interface, five interchangeable algorithms",
      blocks: [
        {
          kind: "paragraph",
          text: "This is Strategy, and it's worth naming explicitly why it earns the pattern here rather than being applied by default: the requirements — or the interviewer's own follow-ups — genuinely name multiple real algorithms with different trade-offs, the same bar Load Balancer's routing algorithms (Lesson 6/9) and Splitwise's split types (Lesson 13) already cleared.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface RateLimiter {\n    boolean allowRequest(String clientId);\n}',
        },
      ],
    },
    {
      id: "fixed-window",
      heading: "Fixed Window Counter — simplest, with a real boundary flaw",
      blocks: [
        {
          kind: "paragraph",
          text: "Divide time into fixed windows (e.g. every 60-second wall-clock boundary), count requests per client per window, reset the count when the window rolls over.",
        },
        {
          kind: "code",
          language: "java",
          code: 'class FixedWindowRateLimiter implements RateLimiter {\n    private final int limit;\n    private final long windowSizeMillis;\n    private final Map<String, Integer> counts = new ConcurrentHashMap<>();\n    private final Map<String, Long> windowStart = new ConcurrentHashMap<>();\n\n    public synchronized boolean allowRequest(String clientId) {\n        long now = System.currentTimeMillis();\n        long currentWindow = windowStart.getOrDefault(clientId, 0L);\n        if (now - currentWindow >= windowSizeMillis) {\n            windowStart.put(clientId, now);\n            counts.put(clientId, 0);\n        }\n        int count = counts.getOrDefault(clientId, 0);\n        if (count >= limit) return false;\n        counts.put(clientId, count + 1);\n        return true;\n    }\n}',
        },
        {
          kind: "insight",
          text: "The named flaw: a client can send `limit` requests in the last millisecond of one window and another `limit` in the first millisecond of the next — 2× the intended rate in a very short span straddling the boundary, while each individual window's count looks compliant. Simple and memory-cheap, but this boundary burst is the exact thing an interviewer's follow-up usually targets.",
        },
      ],
    },
    {
      id: "sliding-window-log",
      heading: "Sliding Window Log — precise, at a memory cost",
      blocks: [
        {
          kind: "paragraph",
          text: "Fixes the boundary flaw by tracking every request's exact timestamp, and counting how many fall within the trailing window (now minus window size), not a fixed calendar window.",
        },
        {
          kind: "code",
          language: "java",
          code: 'class SlidingWindowLogRateLimiter implements RateLimiter {\n    private final int limit;\n    private final long windowSizeMillis;\n    private final Map<String, Deque<Long>> requestLog = new ConcurrentHashMap<>();\n\n    public synchronized boolean allowRequest(String clientId) {\n        long now = System.currentTimeMillis();\n        Deque<Long> log = requestLog.computeIfAbsent(clientId, k -> new ArrayDeque<>());\n        while (!log.isEmpty() && now - log.peekFirst() >= windowSizeMillis) {\n            log.pollFirst(); // drop timestamps that have aged out of the trailing window\n        }\n        if (log.size() >= limit) return false;\n        log.addLast(now);\n        return true;\n    }\n}',
        },
        {
          kind: "insight",
          text: "Exactly precise — no boundary flaw at all. The cost: memory proportional to the request rate, since every admitted request's timestamp is stored until it ages out. Under high traffic per client, this can genuinely matter at scale in a way Fixed Window's single integer counter never does.",
        },
      ],
    },
    {
      id: "sliding-window-counter",
      heading: "Sliding Window Counter — the practical middle ground",
      blocks: [
        {
          kind: "paragraph",
          text: "Approximates Sliding Window Log's precision with Fixed Window's O(1) memory, by weighting the previous window's count based on how much of it still overlaps the trailing window.",
        },
        {
          kind: "code",
          language: "java",
          code: 'class SlidingWindowCounterRateLimiter implements RateLimiter {\n    private final int limit;\n    private final long windowSizeMillis;\n    private final Map<String, WindowCounts> state = new ConcurrentHashMap<>();\n\n    private record WindowCounts(long windowStart, int previousCount, int currentCount) {}\n\n    public synchronized boolean allowRequest(String clientId) {\n        long now = System.currentTimeMillis();\n        WindowCounts w = state.getOrDefault(clientId, new WindowCounts(now, 0, 0));\n        long elapsed = now - w.windowStart();\n\n        if (elapsed >= windowSizeMillis) {\n            // rolled into a new window (or several) — shift current into previous\n            w = new WindowCounts(now, elapsed < 2 * windowSizeMillis ? w.currentCount() : 0, 0);\n        }\n\n        double overlapFraction = 1.0 - (double) (now - w.windowStart()) / windowSizeMillis;\n        double weightedCount = w.previousCount() * overlapFraction + w.currentCount();\n\n        if (weightedCount >= limit) return false;\n        state.put(clientId, new WindowCounts(w.windowStart(), w.previousCount(), w.currentCount() + 1));\n        return true;\n    }\n}',
        },
        {
          kind: "paragraph",
          text: "An approximation, not exact — but the boundary burst it still permits is bounded and small, not the full 2× Fixed Window allows, and memory stays O(1) per client regardless of request volume. This is what most real production rate limiters (including Cloudflare's own published design) actually use.",
        },
      ],
    },
    {
      id: "token-bucket-leaky-bucket",
      heading: "Token Bucket and Leaky Bucket — burst-shaped",
      blocks: [
        {
          kind: "paragraph",
          text: "Token Bucket: a bucket holds up to `capacity` tokens, refilling at a steady rate; each request consumes one token, and a request with no token available is rejected. Unlike the window-based algorithms, its explicit design goal is tolerating bursts — accumulated idle capacity can be spent all at once.",
        },
        {
          kind: "code",
          language: "java",
          code: 'class TokenBucketRateLimiter implements RateLimiter {\n    private final int capacity;\n    private final double refillRatePerMillis;\n    private final Map<String, Double> tokens = new ConcurrentHashMap<>();\n    private final Map<String, Long> lastRefill = new ConcurrentHashMap<>();\n\n    public synchronized boolean allowRequest(String clientId) {\n        long now = System.currentTimeMillis();\n        double current = tokens.getOrDefault(clientId, (double) capacity);\n        long last = lastRefill.getOrDefault(clientId, now);\n\n        double refilled = Math.min(capacity, current + (now - last) * refillRatePerMillis);\n        lastRefill.put(clientId, now);\n\n        if (refilled < 1) {\n            tokens.put(clientId, refilled);\n            return false;\n        }\n        tokens.put(clientId, refilled - 1);\n        return true;\n    }\n}',
        },
        {
          kind: "paragraph",
          text: "Leaky Bucket is Token Bucket's mirror image: requests fill a fixed-capacity queue (the bucket), processed at a constant outflow rate regardless of how bursty the inflow was — smoothing bursts into a steady stream rather than admitting them. Whether burst tolerance is wanted (Token Bucket) or burst smoothing is wanted (Leaky Bucket) is a real, opposite-direction design choice, not a naming difference.",
        },
      ],
    },
    {
      id: "comparison",
      heading: "All five, side by side",
      blocks: [
        {
          kind: "table",
          headers: ["Algorithm", "Memory per client", "Burst behavior", "Precision"],
          rows: [
            ["Fixed Window", "O(1) — one counter", "Allows up to 2× at window boundaries", "Low — boundary flaw"],
            ["Sliding Window Log", "O(n) — every request timestamp", "None — exact enforcement", "Exact"],
            ["Sliding Window Counter", "O(1) — two counters", "Small, bounded boundary effect", "Approximate, close to exact"],
            ["Token Bucket", "O(1) — one counter (tokens)", "Explicitly tolerates bursts up to capacity", "Exact against its own steady-state rate"],
            ["Leaky Bucket", "O(1) or O(queue size)", "Smooths bursts into a steady outflow rather than admitting them", "Exact against its own steady-state rate"],
          ],
        },
        {
          kind: "insight",
          text: "This project's own Rate Limiter entity simulates two of these — Token Bucket and Sliding Window — as a real, comparable config choice: identical under smooth traffic, diverging the moment traffic bursts (Token Bucket forgives the spike by spending saved capacity; Sliding Window rejects the overflow immediately regardless of how idle the limiter was a moment before). See `docs/Entities.md`'s Rate Limiter section for the HLD framing of the same trade-off this lesson designs at the code level.",
        },
      ],
    },
    {
      id: "distributed-note",
      heading: "The honest caveat, again: this only works on one machine",
      blocks: [
        {
          kind: "paragraph",
          text: "Same limitation Lesson 14 named for seat locking: every implementation above uses in-process maps, correct only for a single server instance. A client hitting a load-balanced fleet of API servers could get `limit` requests admitted per instance — the real limit becomes `limit × instance count`, not `limit`.",
        },
        {
          kind: "paragraph",
          text: "The production fix: move the counter into shared storage every instance reads and writes atomically — typically Redis, using `INCR` with an expiring key for Fixed Window, or a sorted set for Sliding Window Log, with Redis's own atomicity guarantees standing in for the `synchronized` blocks above.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Which algorithm would you actually recommend for a public API?\"",
          answer:
            "\"Sliding Window Counter, by default — it's the practical middle ground real systems use: O(1) memory per client, and the boundary imprecision it allows is small and bounded, not the full 2x burst Fixed Window permits. I'd reach for Token Bucket specifically if the product wants to explicitly reward idle clients with burst capacity — e.g. a client that's been quiet for a while should be allowed a short burst — since that's Token Bucket's actual design goal, not an accident of its implementation.\"",
        },
        {
          kind: "qa",
          question: "\"How would you rate-limit per-endpoint instead of per-client globally?\"",
          answer:
            "\"Key the same underlying data structure by (clientId, endpoint) instead of just clientId — every implementation above generalizes directly, since the map is already keyed by an identifier string. The algorithm itself doesn't need to change at all, only what identifies a 'bucket.'\"",
        },
      ],
    },
  ],
  summary:
    "Rate Limiter is Strategy applied to five genuinely different algorithms, each trading memory, burst behavior, and boundary precision differently: Fixed Window is cheapest but allows a real 2x boundary burst; Sliding Window Log is exact but costs memory proportional to request volume; Sliding Window Counter approximates Log's precision at Fixed Window's O(1) memory, and is what most production rate limiters actually use; Token Bucket explicitly tolerates bursts by spending accumulated idle capacity; Leaky Bucket smooths bursts into a steady outflow instead. Every implementation here is single-process-correct only — a real multi-instance deployment needs the counter moved into shared storage (typically Redis), the same caveat Lesson 14 named for seat locking.",
  keyTakeaways: [
    "Fixed Window's real flaw is the boundary burst — up to 2x the intended rate can slip through across a window edge, even though each window's own count looks compliant.",
    "Sliding Window Log is exact but costs memory proportional to request volume (every timestamp stored); Sliding Window Counter approximates it at O(1) memory — the trade-off most production systems actually choose.",
    "Token Bucket and Leaky Bucket are opposite design goals, not synonyms — Token Bucket explicitly tolerates bursts, Leaky Bucket explicitly smooths them into a steady outflow.",
    "Every in-process implementation here is only correct for a single server instance — a load-balanced fleet needs the counter moved into shared storage (Redis) with the same atomicity guarantee `synchronized` provided locally.",
    "This project's own Rate Limiter entity simulates the Token Bucket vs. Sliding Window trade-off as a real, comparable, observable config choice — the HLD counterpart to this lesson's code-level design.",
  ],
  exercise: {
    prompt:
      "A product requirement: different clients should have different limits (free tier: 100/min, paid tier: 10,000/min), and the limit for a given client can change at runtime without restarting the service. Sketch the smallest change to this lesson's RateLimiter interface and one implementation to support this.",
    guidance: [
      {
        kind: "list",
        items: [
          "**Interface** — barely changes: `boolean allowRequest(String clientId)` already takes a per-call `clientId`, so the limit just needs to become a lookup instead of a constructor-time constant.",
          "**Change** — add a `TierService` (or similar) dependency injected into each implementation, called as `int limit = tierService.limitFor(clientId)` at the start of `allowRequest`, replacing the fixed `this.limit` field.",
          "**Why it works at runtime** — because `TierService` is injected as an interface rather than the limiter reading a hardcoded config value, changing a client's tier at runtime (updating whatever `TierService` reads from — a database row, a config service) takes effect on the very next request, with no restart and no change needed to any of the five algorithm implementations' actual counting logic.",
        ],
      },
    ],
  },
  relatedEntitySlugs: ["rate-limiter"],
};
