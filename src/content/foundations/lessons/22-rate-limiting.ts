import type { FoundationLesson } from "../types";

/**
 * Closes a gap this course's own content flagged during an audit: this
 * app's Rate Limiter entity (Token Bucket vs. Sliding Window, with
 * Stripe-calibrated benchmarks already sitting in `entityConfigSchema.ts`)
 * had zero corresponding theory lesson anywhere in Foundations — the
 * concept simply never got taught before now. Synthesized from the
 * standard treatment of rate-limiting algorithms (the four named in most
 * system-design-interview material: fixed window, sliding window, token
 * bucket, leaky bucket) and this app's own simulated pair, rather than one
 * external source.
 */
export const RATE_LIMITING: FoundationLesson = {
  slug: "rate-limiting",
  number: 22,
  title: "Rate Limiting",
  tagline:
    "Every other lesson so far scales a system up to meet demand. This one is the opposite instinct: sometimes the correct response to more traffic is a firm, immediate no.",
  estimatedMinutes: 40,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Load balancers (Lesson 13), caching (Lesson 14), read replicas (Lesson 21), and sharding (Lesson 20) all answer \"how do we handle more traffic.\" A rate limiter answers a different question: how much traffic should this client be allowed to send in the first place, regardless of whether the backend could technically handle more.",
        },
        {
          kind: "paragraph",
          text: "That distinction matters because the reasons to say no aren't only about capacity. A rate limiter protects against an overwhelmed downstream, but also against a buggy client retry-looping, a scraper hammering an endpoint, brute-force login attempts, and a free-tier user simply using more than their plan allows — problems more capacity doesn't solve, because the traffic itself is the problem, not the system's ability to serve it.",
        },
        {
          kind: "insight",
          text: "Rate limiting is proactive and client-caused: it rejects requests based on how many a client has already sent, before anything downstream is touched. Lesson 23 (Circuit Breakers) covers the reactive, dependency-caused counterpart: stopping calls to something that's already failing, regardless of who's calling it or how often. The two are often deployed side by side and are easy to conflate — this lesson and the next one are deliberately sequenced together so the distinction stays clear.",
        },
      ],
    },
    {
      id: "algorithms",
      heading: "Four algorithms, one goal",
      blocks: [
        {
          kind: "paragraph",
          text: "Every rate-limiting algorithm answers the same question — has this client exceeded its allowance? — with a different definition of \"allowance\" and a different memory/precision trade-off.",
        },
        {
          kind: "paragraph",
          text: "Fixed Window Counter — count requests in a fixed clock-aligned window (e.g. 00:00:00–00:00:59), reset the counter to zero at each boundary. Cheapest to implement (one counter), but has a real correctness flaw:",
        },
        {
          kind: "table",
          headers: ["Time", "Window", "Requests in this second", "Allowed under limit=100/window?"],
          rows: [
            ["11:59:59.9", "Window ending 12:00:00", "100 requests arrive", "Yes — counter hits exactly 100"],
            ["12:00:00.1", "New window starts, counter resets to 0", "100 more requests arrive", "Yes — brand new counter, well under 100"],
          ],
        },
        {
          kind: "insight",
          text: "200 requests landed in a 0.2-second span, against a limit meant to be \"100 per 60 seconds\" — the boundary reset let a full window's worth of traffic through twice back-to-back. This is Fixed Window's named flaw: it allows up to 2x the intended rate right at a window boundary, and it's the reason the other three algorithms exist.",
        },
        {
          kind: "paragraph",
          text: "Sliding Window — instead of resetting at a fixed boundary, the window continuously moves with the current time (\"the last 60 seconds,\" not \"this clock-aligned minute\"), so there's no reset instant for a burst to exploit. Real implementations approximate this with a weighted blend of the current and previous fixed windows rather than storing every timestamp, trading a little precision for far less memory than logging every request.",
        },
        {
          kind: "paragraph",
          text: "Token Bucket — a bucket holds up to Burst Capacity tokens, refilling at the steady configured rate; each request spends one token, and a request is rejected only once the bucket is empty. Because tokens accumulate while idle, a client that's been quiet can burst up to the full bucket size in one go before being throttled back to the steady rate.",
        },
        {
          kind: "paragraph",
          text: "Leaky Bucket — the inverse framing of token bucket: requests queue up and are processed (\"leak out\") at a fixed steady rate no matter how bursty their arrival was; the queue itself has a capacity, and it overflows (rejecting new requests) once full. Where token bucket lets a burst through immediately, leaky bucket smooths a burst out into a steady trickle.",
        },
        {
          kind: "table",
          headers: ["Algorithm", "Burst tolerance", "Memory cost", "Boundary flaw"],
          rows: [
            ["Fixed Window", "Up to 2x limit at a boundary (the flaw)", "Lowest — one counter", "Yes — the defining weakness"],
            ["Sliding Window", "None — a hard, steady ceiling", "Low-moderate (weighted blend, not full log)", "No"],
            ["Token Bucket", "Up to Burst Capacity, then throttled to steady rate", "Low — one counter (tokens) + a timestamp", "No"],
            ["Leaky Bucket", "None — smooths bursts into a steady output rate", "Moderate — a request queue", "No"],
          ],
        },
        {
          kind: "insight",
          text: "Token Bucket and Sliding Window — the two this app simulates — sit at opposite ends of the same trade-off Lesson 20's range-vs-hash sharding comparison made: Token Bucket forgives a burst (spends saved-up idle capacity), Sliding Window enforces a hard ceiling with zero burst allowance. They admit identical traffic under smooth, steady load and only diverge the moment traffic actually bursts — which is exactly the condition worth testing for when choosing between them.",
        },
      ],
    },
    {
      id: "placement",
      heading: "Where a rate limiter sits, and what a client sees",
      blocks: [
        {
          kind: "paragraph",
          text: "Client-side rate limiting (an SDK that self-throttles) is advisory only — nothing stops a client from ignoring it, whether by bug or by intent. Real protection has to be enforced server-side, and the higher up the request path it sits, the less wasted work a rejected request causes.",
        },
        {
          kind: "table",
          headers: ["Placement", "Protects", "Trade-off"],
          rows: [
            ["Edge / API gateway", "Every service behind it, in one place", "Coarser — one global policy unless the gateway supports per-route/per-key limits"],
            ["Per-service", "Just that one service", "More precise, but duplicated at every service that needs it"],
            ["Per-user / per-API-key", "Fair usage across tenants, not just aggregate volume", "Needs identity established before limiting — can't key on something a client controls freely, like an IP behind shared NAT"],
          ],
        },
        {
          kind: "paragraph",
          text: "A rejected request gets HTTP 429 Too Many Requests (Lesson 6's status-code table already named it) — conventionally with a Retry-After header telling a well-behaved client exactly when to try again, rather than making it guess and retry immediately into the same limit.",
        },
        {
          kind: "insight",
          text: "A single-process counter only works if all of a client's requests land on the same process. The moment a rate limiter runs behind a load balancer across multiple instances (the normal case — Lesson 13), the counter has to be shared, typically in Redis (Lesson 15) via an atomic increment-and-check — usually a small Lua script so the read-check-write sequence can't race across two instances checking the same counter at once.",
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
            "Stripe — Token Bucket-style limiting: 100 requests/second in live mode, 25/second in sandbox (the exact numbers this app's own benchmarks are calibrated against, below).",
            "GitHub's REST API — a sliding window: 5,000 requests/hour per authenticated token (60/hour unauthenticated), with `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers so a client can self-throttle before hitting 429.",
            "AWS API Gateway — token bucket, configurable steady-state rate plus a separate burst limit — the same two-parameter shape (rate + burst capacity) this app's Rate Limiter exposes.",
            "nginx's `limit_req` module — leaky bucket by name and design: a request queue drained at a fixed rate, with an explicit `burst` parameter for how many requests can queue before being rejected outright.",
          ],
        },
        {
          kind: "insight",
          text: "This app's own Rate Limiter entity simulates exactly two of the four (Token Bucket, Sliding Window), and its Requests/Second benchmarks are anchored directly to the Stripe numbers above: ~25 req/s as the tight/sandbox-like end, ~100 req/s as the live-mode-like default. Burst Capacity only affects Token Bucket mode, matching the algorithm description here — it has no effect at all under Sliding Window, since a sliding window has no concept of spendable saved-up capacity.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "\"Design a rate limiter\" is common enough to have a predictable shape:" },
        {
          kind: "qa",
          question: "\"Design a rate limiter for a public API.\"",
          answer:
            "\"I'd key it per API key or user ID rather than IP, since IPs can be shared behind NAT and easily rotated. Token bucket is my default algorithm — it tolerates natural bursts, which matters for legitimate clients that batch requests, while still enforcing a steady long-run rate. I'd enforce it at the API gateway, ahead of the actual services, so a rejected request never does wasted downstream work. And it needs to run behind a shared store like Redis, not an in-process counter, since the gateway itself is horizontally scaled and every instance has to agree on the same client's count.\"",
        },
        {
          kind: "qa",
          question: "\"Token bucket vs. sliding window — when would you pick one over the other?\"",
          answer:
            "\"Token bucket when I want to tolerate natural bursts — a client that's been idle and then sends a batch shouldn't be punished for timing, only for a sustained rate over the allowance. Sliding window when I need a hard, predictable ceiling with no exceptions — protecting a fragile downstream dependency that genuinely can't absorb any burst, or enforcing a strict billing quota where 'burst forgiveness' isn't a feature, it's a loophole.\"",
        },
        {
          kind: "qa",
          question: "\"Your rate limiter runs on 10 API gateway instances behind a load balancer. What breaks with a naive per-instance counter, and how do you fix it?\"",
          answer:
            "\"A per-instance in-memory counter only sees the requests that instance received — a client could get 10x the intended limit just by having its requests spread round-robin across all 10. The fix is a shared counter, usually in Redis, incremented atomically per request with a Lua script so the check-and-increment can't race between two instances handling the same client's requests at nearly the same moment. That does add a network round trip per request, which is the real cost of correct distributed rate limiting versus the free-but-wrong per-instance version.\"",
        },
      ],
    },
  ],
  summary:
    "A rate limiter answers a different question than the rest of this course's scaling lessons: not 'can the system handle this load' but 'should this client be allowed to send this much traffic at all.' Fixed Window Counter is cheapest but allows up to 2x the intended rate right at a window boundary — its named flaw and the reason the other three algorithms exist. Sliding Window enforces a hard ceiling with no boundary flaw and no burst tolerance; Token Bucket accumulates idle capacity into forgiving bursts, then throttles to a steady rate; Leaky Bucket smooths bursty arrivals into a steady output rate via a queue. A rejected request gets HTTP 429 with a Retry-After header. Real protection has to be server-side and, once a rate limiter runs behind a load balancer across multiple instances, its counter has to live in a shared store like Redis with an atomic increment, not in any one instance's memory. Stripe (100 req/s live, 25 req/s sandbox), GitHub (5,000/hour sliding window), AWS API Gateway (token bucket), and nginx's limit_req (leaky bucket) all build on exactly these four algorithms.",
  keyTakeaways: [
    "Rate limiting is proactive and client-caused — it rejects based on how much a client has already sent, before touching anything downstream. Circuit breaking (Lesson 23) is reactive and dependency-caused — it stops calls to something already failing, regardless of caller volume. Easy to conflate, genuinely different problems.",
    "Fixed Window Counter's named flaw: resetting a counter at a fixed clock boundary lets up to 2x the intended rate through in a burst that straddles the reset instant. This is the reason Sliding Window, Token Bucket, and Leaky Bucket all exist.",
    "Token Bucket forgives bursts by spending accumulated idle capacity, then throttles to the steady rate; Sliding Window is a hard, steady ceiling with zero burst tolerance. This app simulates exactly this pair, with Burst Capacity having no effect at all under Sliding Window.",
    "A rate limiter belongs server-side (client-side self-throttling is advisory only), and once it runs behind a load balancer across multiple instances, its counter must live in a shared store (Redis, atomic increment) — a per-instance in-memory counter under-enforces the real limit by a factor of however many instances there are.",
    "A rejected request returns HTTP 429 with a Retry-After header, telling a well-behaved client exactly when to try again rather than making it guess and immediately re-trip the same limit.",
  ],
  exercise: {
    prompt:
      "You're designing rate limiting for a public API currently enforced with a single in-process counter per API key, reset every clock-aligned minute, running on one server. (1) The team is about to scale to 5 servers behind a load balancer — explain precisely what breaks with the current counter, in terms of how much real traffic a client can actually push through. (2) Fix the placement/storage problem — where does the counter need to live, and what specific race condition do you need to guard against when fixing it? (3) Separately, a client has noticed they can send exactly 2x their per-minute limit if they time their requests to straddle a minute boundary. Name the algorithm flaw causing this and the specific fix. (4) The API serves two kinds of clients: interactive dashboard users (bursty — idle, then a flurry of requests) and scheduled batch jobs (steady, predictable rate). Would you use the same algorithm for both, or different ones — and why?",
  },
  relatedEntitySlugs: ["rate-limiter"],
  prerequisites: ["load-balancers"],
};
