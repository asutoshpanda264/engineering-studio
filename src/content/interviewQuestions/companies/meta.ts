import type { InterviewQuestion } from "../types";

/**
 * Meta — researched 2026-08-23, see `docs/interview_exp.md` for the full
 * research log and the complete ~130-item research catalog. Same ship bar
 * as `google.ts`: only questions with a real, expansive prompt — specific
 * requirements, numbers, constraints, or a concrete narrative — make it in
 * here. Meta's Exponent question DB alone runs to 96 bare "Design X."
 * one-liners; those stay in the tracker doc as real reported topics, not
 * practice questions a candidate could actually sit down and answer. See
 * the tracker's "Shipped to app" note for the full before/after list.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a transcript
 * to memorize. These are authored by reasoning through each problem the way
 * a strong candidate would, not sourced from a specific candidate's actual
 * answer — unlike `prompt`/`context`, which are sourced and cited,
 * `optimalAnswer` is this app's own content.
 */
export const META_QUESTIONS: InterviewQuestion[] = [
  {
    id: "meta-ticketmaster-single-event",
    company: "Meta",
    title: "Design a ticketing system for a single online event",
    prompt:
      "Build a simplified Ticketmaster for a single online event with 100,000 tickets to sell. The event has no seat/row assignment — it's general admission. Handle the race condition when many buyers try to claim the same ticket at once.",
    category: "system-design",
    tags: ["ticketing-inventory"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/6336311/Meta-System-Design/",
      reportedDate: "Jan 2025",
      confidence: "high",
    },
    context:
      "The candidate initially designed with rows/seat numbers before the interviewer clarified partway through that this was a single online event with no seating — then asked them to explain, live, how their design prevents two buyers from claiming the same ticket.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is this general admission (just a count) or does each of the 100,000 tickets have a specific seat/row? (the actual twist in the real interview)",
        "What's the peak concurrent-demand spike when sales open — tens of thousands of buyers hitting \"buy\" in the same second?",
        "Is there a hold/checkout window, or is it buy-now-or-lose-it?",
        "Does purchase order need to be strictly fair (first-come-first-served), or is a queue/lottery acceptable?",
      ],
      requirements: [
        "Exactly 100,000 tickets for one online event, no overselling",
        "General admission — no seat/row assignment to track",
        "Correct under massive concurrent contention the moment sales open",
        "A ticket held mid-checkout releases back to available after a timeout",
        "Basic fraud/bot mitigation (purchase limits per account)",
      ],
      approach:
        "General admission with no seating means the whole problem reduces to protecting one shared counter under extreme contention — the design should center on that atomic decrement, not on per-seat locking.",
      keyPoints: [
        "Model available inventory as a single atomic counter for the event, not per-seat state — far lower contention than seat-level locking, since there's nothing to distinguish one ticket from another",
        "A purchase attempt does an atomic conditional decrement (compare-and-swap: decrement only if count > 0) — this single operation is the actual race-condition fix the interviewer was probing for",
        "On successful decrement, create a held reservation (ticket claimed, payment pending) with a short timeout, rather than treating the decrement itself as a final sale",
        "A background sweeper releases holds whose timeout passed, incrementing the counter back — handles abandoned checkouts without manual cleanup",
        "Put a virtual waiting room in front of checkout once demand is detected to exceed capacity, admitting a bounded number of buyers per second into the actual purchase flow — this keeps the hot counter from being hammered by the full spike at once",
        "Rate-limit and cap tickets per account/payment method at the admission layer for basic fraud mitigation",
      ],
      tradeoffs: [
        "A single atomic counter (simple, correct, but is itself a hot key under extreme concurrent writes) vs. sharding the counter into N partial counters summed periodically — sharding raises throughput ceiling at the cost of a brief window where the true remaining count is approximate across shards",
        "Optimistic compare-and-swap on the counter vs. a distributed lock — compare-and-swap scales far better under this kind of high-contention single-resource access pattern",
        "Strict FIFO admission queue vs. random/batched admission — FIFO feels fairer but a single ordered queue can itself become a bottleneck at this scale",
      ],
      followUps: [
        "How would seat-level (not count-level) inventory change this design, now that specific seats exist?",
        "What stops the same buyer from holding multiple reservations across tabs/devices?",
        "How would you extend this to multiple simultaneous on-sale events sharing the same platform?",
      ],
      relatedLinks: [
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
        { label: "Build it: Concert Ticket Drop scenario", href: "/workshop?scenario=concert-ticket-drop" },
        { label: "Build it: Flash Sale scenario", href: "/workshop?scenario=flash-sale" },
      ],
    },
  },
  {
    id: "meta-web-crawler-100-machines",
    company: "Meta",
    title: "Design a distributed web crawler across 100 machines",
    prompt:
      "There's a very large website organized like Wikipedia, where every page links to multiple other pages. Design a system that downloads all pages from this site, visits each URL exactly once, and minimizes the amount of traffic coming from any given node — using exactly 100 machines. Assume tens of millions of pages; external links don't need to be visited.",
    category: "system-design",
    tags: ["web-crawling"],
    level: "E4/E5",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/1935481/meta-system-design-interview-question-e4e5/",
      reportedDate: "Apr 2022",
      confidence: "high",
    },
    context:
      "The interviewer wouldn't clarify what \"minimize traffic from any given node\" actually meant when asked directly (\"it's not important\") — a deliberately underspecified constraint the candidate had to interpret and defend on their own.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Does \"minimize traffic from any given node\" mean balance crawl work evenly across the 100 machines, or literally cap total bytes moved? (the interviewer wouldn't clarify this in the real interview — state your interpretation out loud and defend it)",
        "Do we need to store the downloaded pages, or just visit each URL once?",
        "Is politeness (rate-limiting requests to the target site) a concern, or is raw throughput the goal?",
      ],
      requirements: [
        "Visit every URL on the site exactly once (dedup, tens of millions of pages)",
        "Use exactly 100 machines",
        "Distribute crawl traffic so no single machine becomes a hotspot",
        "No external links need visiting — a bounded crawl domain",
      ],
      approach:
        "Interpreting \"minimize traffic from any given node\" as load-balancing crawl work evenly across the fleet turns this into a partitioning problem: assign every URL a deterministic owner among the 100 machines, and hand off links rather than letting one machine crawl everything it happens to discover.",
      keyPoints: [
        "Partition the URL space across the 100 machines with a deterministic hash of the URL (consistent hashing) — every machine can compute any URL's owner without a central lookup",
        "Each machine holds a local frontier queue of URLs to crawl and an authoritative local dedup set for the URLs it owns — a hash set, not a bloom filter, since \"visit each URL exactly once\" was emphasized and a bloom filter's false positives would silently skip pages",
        "When a machine crawls a page, it extracts outbound links, hashes each one, and forwards it to the owning machine's queue instead of crawling it locally — this hand-off is what actually keeps any one machine from becoming a hotspot for a heavily-linked page",
        "Termination needs explicit detection: a machine is done only when its local frontier is empty and no more inbound URLs are arriving from peers — use a coordinator that polls all 100 machines for idle status and confirms with a second round after the first all-idle report, since a URL could still be in flight between machines",
        "If a machine dies mid-crawl, its shard's uncrawled URLs need reassignment — consistent hashing bounds this to roughly 1/100th of the total URL space rather than a full re-partition",
      ],
      tradeoffs: [
        "Exact-once dedup via an authoritative per-shard hash set vs. a bloom filter — bloom filters are smaller/faster but risk skipping a page that should be crawled, which the stated requirement rules out",
        "Fully decentralized hash-based ownership (no coordinator bottleneck, harder termination detection) vs. a central coordinator assigning work (easier to reason about termination, becomes a scaling/SPOF concern at higher machine counts) — decentralized fits 100 machines well",
        "Politeness/rate-limiting per target host vs. maximizing raw crawl throughput — not explicitly asked for, but a real crawler at this scale would need it to avoid effectively DoS-ing the site being crawled",
      ],
      followUps: [
        "What happens when a machine crashes mid-crawl — how much redistribution does that trigger?",
        "How would you detect that the crawl has actually finished across all 100 machines?",
        "How would this change if you also needed to store/index the page content, not just visit it?",
      ],
      relatedLinks: [
        { label: "Foundations: Consistent Hashing", href: "/foundations/consistent-hashing" },
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
      ],
    },
  },
  {
    id: "meta-post-privacy-visibility",
    company: "Meta",
    title: "Design Facebook post privacy (Public / Friends / Friends of Friends)",
    prompt:
      "Design privacy for a Facebook post. Users select one of three privacy options when posting: Public, Friends, or Friends of Friends. Design how the system determines whether any given viewer can see that post.",
    category: "system-design",
    tags: ["auth-secrets"],
    level: "Onsite, 10+ YOE",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/1628524/facebook-product-design-privacy-feature-of-a-post/",
      reportedDate: "Dec 2021",
      confidence: "high",
    },
    context:
      "Reported flow: clarify DAU/read-write ratio and non-functional requirements, then a high-level design with /get-privacy-settings, /post-message, /check-privacy APIs and user_post/user_friends tables. Cross-questions that followed: how do you handle a friends-of-friends check, how do you handle new privacy types (group/exclude/include), why that user_friends table shape, and a special case for celebrity/high-follower accounts.",
    optimalAnswer: {
      clarifyingQuestions: [
        "What's the read:write ratio — posts are written once but the privacy check runs on every viewer/every feed render, so reads likely dominate by orders of magnitude",
        "How many friends does an average user have, vs. a celebrity/public-figure account?",
        "Does the privacy level ever change after posting, and does visibility need to update retroactively if so?",
      ],
      requirements: [
        "Three privacy levels per post: Public, Friends, Friends of Friends",
        "A fast \"can viewer V see post P?\" check, cheap enough to run at feed-render time",
        "Correct even for celebrity accounts with very large friend/follower graphs",
        "Extensible to future privacy types (custom groups, explicit exclude/include lists)",
      ],
      approach:
        "Public and Friends are single-hop checks; Friends-of-Friends is what makes this hard, since it has to reason about both the viewer's and the poster's social graph while staying cheap enough to run on every feed render, not just at post time.",
      keyPoints: [
        "Store a privacy_level field directly on the post record — Public and Friends checks are then a cheap direct lookup plus (for Friends) a single edge check against the friend graph",
        "The user_friends table (one row per friendship edge, indexed both directions) is the source of truth for both Friends and Friends-of-Friends checks",
        "For Friends-of-Friends, avoid a live two-hop graph traversal on every check: precompute and cache each user's 2-hop friend set when their friend list changes, since friend-list edits are far rarer than post views",
        "Fold the visibility check into feed generation/caching rather than as a separate synchronous call per post per viewer — check once when building a user's feed, not repeatedly per render",
        "Celebrity/high-follower special case: precomputing a full 2-hop set is infeasible at that fan-out, so treat Friends-of-Friends as effectively Public past a follower-count threshold (or compute it lazily/approximately) — name this trade-off explicitly rather than silently ignoring the scale mismatch",
        "Design privacy_level as an extensible type, not a hardcoded 3-value enum, so a later custom-group/exclude/include type slots in without restructuring the check path",
      ],
      tradeoffs: [
        "Precomputed/cached 2-hop friend sets (fast reads, goes stale until recomputed, expensive to maintain for high-degree nodes) vs. on-the-fly graph traversal per check (always correct, too slow at this read volume) — caching wins for the vast majority of users; celebrities need the special-cased fallback either way",
        "Fan-out-on-write (precompute each viewer's visible feed) vs. fan-out-on-read (compute visibility at render time) — fan-out-on-write suits this read-heavy pattern but multiplies storage and complicates changing a post's privacy after publishing",
        "Exact Friends-of-Friends for celebrity accounts vs. an approximation/cutoff — exact is correct but doesn't scale; a documented approximation is the honest answer at Meta's actual scale",
      ],
      followUps: [
        "How would you extend this to custom friend groups (e.g. \"Close Friends\") or explicit exclude lists?",
        "What happens to already-fanned-out feed entries when a user changes a post's privacy level after publishing?",
        "How does the Friends-of-Friends check behave when the poster themselves is the celebrity with the huge graph?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Indexing Deep Dive", href: "/foundations/database-indexing-deep-dive" },
        { label: "Foundations: Caching", href: "/foundations/caching" },
      ],
    },
  },
  {
    id: "meta-price-tracker-camelcamelcamel",
    company: "Meta",
    title: "Design a price-tracking service like camelcamelcamel",
    prompt:
      "Design a price-tracking application like camelcamelcamel.com — it monitors Amazon product prices over time and alerts users when prices drop. Store price history for each product for up to 2 years.",
    category: "system-design",
    tags: ["notifications"],
    level: "E5",
    source: {
      name: "Blind",
      url: "https://www.teamblind.com/post/meta-system-design-interview-fwt0ruxp",
      reportedDate: "Jan 2022",
      confidence: "high",
    },
    context:
      "The candidate reported choosing a wide-column store with a product_id, created_date, day1...day730 row layout and wasn't confident it was the right foundation, even though the rest of the design (caching, fault tolerance, microservices) reportedly convinced the interviewer. A later update to the post: selected at E5, TC 200k CAD.",
    optimalAnswer: {
      clarifyingQuestions: [
        "How many products are being tracked, and how often is price sampled — hourly? daily?",
        "Do users set a target price and get alerted on drop-below, or just view a history chart?",
        "Is price data scraped/ingested from Amazon, or pushed in by some other feed?",
      ],
      requirements: [
        "Store up to 2 years of price history per tracked product",
        "Millions of products, price sampled at some regular interval",
        "Users can view historical price charts and set drop-below-threshold alerts",
        "High, steady write volume from polling, bursty read volume around chart views",
      ],
      approach:
        "This is fundamentally a time-series storage problem — the interesting decision is the price-history schema, since charting and alerting both read from it.",
      keyPoints: [
        "A scraper/ingestion service polls prices on a schedule per product and writes a new (product_id, timestamp, price) point rather than mutating a single row",
        "Use a wide-column/time-series-shaped schema keyed by product_id with time-bucketed columns (the reported day1...day730 layout is one valid version of this) instead of one row per price point in a plain relational table — bucketing keeps a product's whole history physically co-located for fast range scans when rendering a chart",
        "Alerting is separate from storage: on each new price write, check it against any active alert thresholds for that product and push a notification if crossed — don't scan history to alert, only compare the new point",
        "Cache the current price and a recent-window summary (e.g. last 30 days) per product aggressively, since most reads (chart previews, \"is this a good price\" badges) don't need the full 2-year history",
        "Downsample data approaching the 2-year retention boundary (daily instead of hourly) to bound storage growth, since fine-grained history matters most for recent movement",
      ],
      tradeoffs: [
        "A bucketed wide-column schema (efficient range scans for whole-history-per-product reads, more complex writes) vs. one row per price point in a plain relational table (simpler, but unclustered at this row count) — bucketing wins for this read pattern, which is what the reported HBase-style design was reaching for",
        "Polling on a fixed schedule vs. event-driven ingestion — polling is the realistic constraint here since there's no real-time price-change feed to subscribe to",
        "Full-resolution storage forever vs. downsampling older data — downsampling bounds storage growth at the cost of old-data precision, reasonable given alerts care most about recent price movement",
      ],
      followUps: [
        "How would you scale ingestion if you went from Amazon-only to a dozen retailers?",
        "How do you avoid re-scraping products nobody is actively tracking anymore?",
        "How would you detect and handle a scraper getting blocked/rate-limited by the source site?",
      ],
      relatedLinks: [
        { label: "Foundations: NoSQL Deep Dive", href: "/foundations/nosql-deep-dive" },
        { label: "Build it: Price Alert Notifications scenario", href: "/workshop?scenario=price-alert-notifications" },
      ],
    },
  },
  {
    id: "meta-chess-api-design-scope",
    company: "Meta",
    title: "Design an online chess game — API design only, not distributed systems",
    prompt:
      "Design an online chess game. Partway into the round, the interviewer explicitly narrows scope: skip distributed-systems architecture entirely and focus only on the API layer.",
    category: "system-design",
    tags: ["chess-lld"],
    source: {
      name: "Exponent blog",
      url: "https://www.tryexponent.com/blog/meta-system-design-interview",
      confidence: "high",
    },
    context:
      "Reported as catching the candidate off guard, since every mock interview they'd practiced assumed a distributed-systems framing. Exponent's own guidance: follow the interviewer's narrowed scope immediately — pushing back on the constraint or drifting back to a rehearsed distributed-systems answer is one of the fastest ways to lose points.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Confirm scope out loud immediately: are we deliberately skipping horizontal scaling, sharding, and infra, and focusing purely on the API surface and game-state model?",
        "Two-player-only, or does it need spectators/multiple concurrent games per server?",
        "Real-time (push updates) or client-polls-for-state?",
      ],
      requirements: [
        "A playable two-player online chess game",
        "Explicitly scoped to API design only — no distributed-systems architecture",
        "Must reject illegal moves and detect game-ending conditions (checkmate, stalemate, resignation, draw)",
        "Real-time-enough that both players see the opponent's move promptly",
      ],
      approach:
        "With distributed systems explicitly off the table, the whole interview lives in the API contract and the state machine behind it — spend the time on a clean resource model and move-validation flow instead of reaching for scaling talk the interviewer just said they don't want.",
      keyPoints: [
        "Model the core resource as a Game: game_id, board state (FEN string or 8x8 array), current turn, move history, status (in_progress/checkmate/stalemate/resigned/draw)",
        "POST /games — create a new game, returns game_id and initial state",
        "POST /games/{id}/moves — submit a move (from, to, optional promotion piece); server validates legality against current board state and turn, rejects illegal moves with a clear error, otherwise applies it and returns the updated state",
        "A WebSocket/long-poll channel per game pushes state updates to the opponent, rather than requiring the client to poll GET /games/{id} — matters directly for the \"real-time enough\" requirement",
        "Move validation lives entirely server-side — never trust the client to enforce chess rules, since that's the actual integrity guarantee of the whole game",
        "Represent move history as an append-only list on the game so past moves (undo/review/replay) are server state, not something the client reconstructs",
        "Game-end detection (checkmate/stalemate) runs as part of applying each move — check the resulting position immediately after every accepted move",
      ],
      tradeoffs: [
        "WebSocket push vs. client polling for opponent moves — push is more responsive and what a real product would use; polling is simpler to design under time pressure and reasonable as a stated MVP with push as the explicit next step",
        "Full board state per response (simple, larger payload) vs. delta/move-only updates (smaller, but the client must maintain its own state and can drift from server truth) — full state is safer for correctness, which matters more here than payload size",
        "Encoding board state as FEN (compact, standard, less readable at a glance) vs. a raw 8x8 array (verbose, trivial to reason about) — either is defensible; naming the standard signals domain familiarity",
      ],
      followUps: [
        "How would you add spectator support (read-only viewers of an in-progress game)?",
        "How would you support move takebacks or a draw-offer/accept negotiation between players?",
        "If you had to add scaling back in after all, what's the one component most likely to need it first?",
      ],
      relatedLinks: [
        { label: "Foundations: REST APIs", href: "/foundations/rest-apis" },
        { label: "LLD: OOP Fundamentals", href: "/lld/oop-fundamentals" },
      ],
    },
  },
  {
    id: "meta-security-layer-stripe-stride",
    company: "Meta",
    title: "Design the security layer for a payments platform like Stripe",
    prompt:
      "As a candidate for a Security Engineering Manager role: design the security layer for a payments platform like Stripe — not the payment-processing infrastructure itself, but the security architecture: threat modeling, access control, encryption, and incident response, at Meta scale.",
    category: "system-design",
    tags: ["payments-idempotency", "auth-secrets"],
    level: "M1 Security EM",
    source: {
      name: "Exponent blog",
      url: "https://www.tryexponent.com/blog/meta-system-design-interview",
      confidence: "high",
    },
    context:
      "The framework interviewers expected: STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) — identify system components, map threats to each using STRIDE, then propose mitigations per threat.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Are we threat-modeling the whole platform, or a specific flow (e.g. card-charge API, merchant onboarding, webhook delivery)?",
        "What's already assumed secure (e.g. TLS in transit) vs. what needs designing from scratch?",
        "Who are the actors — end customers, merchants, internal engineers, third-party integrators — since each has a different trust boundary?",
      ],
      requirements: [
        "Cover the major system components of a payments platform (API gateway, auth, card-data storage, transaction processing, merchant dashboard, webhooks)",
        "Apply STRIDE systematically to each component, not a generic \"use encryption\" answer",
        "Propose concrete mitigations per identified threat category",
        "Address incident response, not just prevention",
      ],
      approach:
        "This isn't a payments-infrastructure question — it's explicitly a security-architecture and threat-modeling exercise, so the actual deliverable is a STRIDE pass across components, not a data-pipeline design.",
      keyPoints: [
        "List components first: public API gateway, authentication/authorization service, card-data vault, transaction-processing core, merchant dashboard, webhook delivery — this decomposition is what STRIDE gets applied to",
        "Spoofing: mutual-TLS + API-key/OAuth for merchant integrations, MFA for dashboard/human access — no component trusts a caller's claimed identity without verification",
        "Tampering: sign and verify webhook payloads, checksum/integrity-check transaction records, immutable audit logs for anything touching money",
        "Repudiation: every state-changing action (a charge, a refund, a config change) logs actor identity and timestamp in an append-only, tamper-evident audit trail — this is what makes \"who did this\" answerable after the fact",
        "Information Disclosure: card data never touches app servers in plaintext (tokenization/vaulting), encryption at rest and in transit, strict field-level access so most services only ever see a token, never the real card number",
        "Denial of Service: rate limiting at the API gateway, per-merchant quotas, circuit breakers so one abusive or broken integrator can't degrade the platform for everyone",
        "Elevation of Privilege: least-privilege service accounts, no shared credentials, regular access reviews, and a hard boundary between the card-data vault and everything else — even an internal engineer's default access shouldn't reach raw card numbers",
        "Incident response: a documented playbook per threat category (e.g. detected key leak → rotate, revoke, notify affected merchants) rather than improvising during an actual incident",
      ],
      tradeoffs: [
        "Tokenizing card data everywhere (adds a lookup hop, but nothing outside the vault ever sees a real card number) vs. encrypting-in-place (fewer moving parts, but a compromised service with decrypt access is a much bigger blast radius) — tokenization wins at this scale and trust-boundary count",
        "Centralized audit logging (one source of truth, becomes a critical dependency itself) vs. per-service logging (more individually resilient, harder to correlate an incident) — centralized with redundancy is standard, worth naming the trade explicitly",
        "Auto-blocking suspicious requests (faster response, false-positive risk to legitimate merchants) vs. flagging for review (safer, slower) — a tiered response (throttle first, hard-block on repeated signal) balances both",
      ],
      followUps: [
        "Walk through what happens end-to-end if an API key leaks — detection, containment, notification, recovery",
        "How would this threat model change for a webhook delivery system specifically, where you're sending data out, not receiving it?",
        "How do you balance strict access control against an on-call engineer needing emergency access during an incident?",
      ],
      relatedLinks: [
        { label: "Foundations: REST APIs", href: "/foundations/rest-apis" },
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
      ],
    },
  },
  {
    id: "meta-em-recommendation-system",
    company: "Meta",
    title: "Design a recommendation system for a specific business use case",
    prompt:
      "Design a recommendation system for a specific business use case. Follow-ups probe requirements, data and features, modeling trade-offs, training, evaluation metrics, production concerns, and scale.",
    category: "ml-ai-system-design",
    tags: ["recommendation-ranking"],
    level: "M1 Engineering Manager",
    source: {
      name: "Exponent blog",
      url: "https://www.tryexponent.com/blog/meta-system-design-interview",
      confidence: "high",
    },
    context:
      "Verified M1 loop: this same ML framing was used in both the phone screen and the onsite round. Reported candidate insight: interviewers expect the candidate to drive depth unprompted — \"they expect you to provide depth on your own, even if the interviewer isn't especially good at eliciting it.\"",
    optimalAnswer: {
      clarifyingQuestions: [
        "What's the specific business use case — pick one and commit (e.g. \"recommend Groups to join\", \"recommend Reels\"), since the prompt is deliberately open-ended",
        "What's the primary business objective — engagement, revenue, retention — since that shapes what the model should actually optimize for",
        "Implicit feedback (clicks, watch time) or explicit (ratings, likes)?",
        "How do we handle cold-start — a brand-new user or item with no history?",
      ],
      requirements: [
        "Recommend relevant items (posts/groups/products — pick one concretely) to a user from a large catalog",
        "Personalized to the individual user's history/behavior",
        "Serve recommendations within a tight latency budget on high-traffic surfaces (feed, home screen)",
        "Measurably improve the chosen business metric, not just \"relevance\" in the abstract",
      ],
      approach:
        "As an EM candidate, the bar isn't executing the ML yourself — it's showing you can drive the framing, defend trade-offs, and go a level deeper unprompted, since the interviewer explicitly isn't going to spoon-feed follow-ups.",
      keyPoints: [
        "Frame the business objective first and translate it into a model objective (e.g. \"increase engagement\" → predict P(click) or expected watch-time, not a vague relevance score) — EM rounds specifically probe whether you connect business goals to ML objectives, not just architecture",
        "Two-stage architecture: a cheap candidate-generation stage (embedding similarity / collaborative filtering over the full catalog) narrows millions of items to hundreds, then a heavier ranking model scores just that shortlist — the standard pattern for reconciling catalog scale with a real-time latency budget",
        "Features: user features (history, demographics), item features (content/category), interaction features (recency, past engagement with similar items) — a feature store keeps training and serving computing features identically, avoiding train/serve skew",
        "Training: offline batch training on historical interaction logs, labeled by the chosen implicit/explicit signal",
        "Evaluation: offline (precision@k, NDCG, AUC against held-out interactions) and online (A/B test against the chosen business metric) — offline metrics are a proxy; only the online test confirms real impact",
        "Production concerns: model staleness (retraining cadence as behavior shifts), monitoring for feature drift, and a fallback (popularity-based) ranking if the personalized model or a feature pipeline fails",
        "Cold-start: fall back to popularity/trending or content-based similarity for new users/items until enough interaction data accumulates",
      ],
      tradeoffs: [
        "Collaborative filtering (needs interaction history, struggles with cold-start, captures taste well) vs. content-based filtering (works from item zero, weaker personalization) — most production systems blend both rather than picking one",
        "Two-stage retrieve-then-rank vs. scoring the entire catalog directly — direct scoring is simpler to reason about but doesn't meet a real-time latency budget once the catalog is large",
        "Optimizing for a single metric (click-through) vs. a blended objective (click + downstream retention) — single-metric is easier to train and explain but risks over-optimizing for short-term engagement at the expense of the metric that actually matters",
      ],
      followUps: [
        "How would you detect and correct for popularity bias in recommendations over time?",
        "What's your retraining cadence, and how do you know the model has gone stale?",
        "How would you extend this design across a second business use case, reusing the same infrastructure?",
      ],
      relatedLinks: [
        { label: "Foundations: Caching", href: "/foundations/caching" },
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
      ],
    },
  },
  {
    id: "meta-crawler-botnet-10000-machines",
    company: "Meta",
    title: "Design a distributed crawl job across 10,000 low-end machines",
    prompt:
      "Design a system that can exploit 10,000 low-end machines to run code. All machines need to crawl web pages and return results. No machine should crawl a page twice.",
    category: "system-design",
    tags: ["web-crawling"],
    level: "Production Engineer, design and architecture round",
    source: {
      name: "IGotAnOffer — Meta Production Engineer guide",
      url: "https://igotanoffer.com/blogs/tech/facebook-production-engineer-interview",
      confidence: "high",
    },
    context:
      "Reported under the \"design and architecture\" bucket of Meta's Production Engineer onsite round, framed with the word \"botnet\" but functionally the same no-duplicate-crawl requirement as the E4/E5 web crawler question, at 100x the machine count.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Are these 10,000 machines homogeneous, or genuinely low-end/heterogeneous — does that change how work gets partitioned?",
        "Does \"no machine should crawl a page twice\" mean no re-crawl by the same machine, or no two machines crawling the same page globally?",
        "Do the machines have reliable connectivity to each other, or are they intermittently reachable, as is realistic for \"low-end\" hardware?",
      ],
      requirements: [
        "Coordinate work across 10,000 low-end, potentially unreliable machines",
        "Every page is crawled exactly once, globally, across the whole fleet",
        "Results are collected back centrally",
        "Tolerate individual machine failures without losing the crawl",
      ],
      approach:
        "At 10,000 low-end/unreliable nodes, the dominant problem shifts from \"crawl efficiently\" to \"coordinate reliably\" — a centralized work-distribution model with a durable queue and lease-based ownership fits better here than the peer-to-peer hash partitioning that suits a smaller, more reliable fleet.",
      keyPoints: [
        "A central, durable work queue holds URLs to crawl; each of the 10,000 machines pulls a batch of work when idle rather than being statically assigned a shard — this naturally tolerates low-end/unreliable machines, since a slow or dead machine simply stops pulling more work",
        "A worker leases a URL (checks it out with a timeout) rather than permanently claiming it — if the worker dies or the lease expires without a result, the URL returns to the queue for another worker; this is what actually prevents both \"never crawled\" and \"crawled twice\" at this fleet size",
        "A separate durable dedup store (a distributed key-value store, not per-machine memory) tracks completed URLs — a worker checks it before starting and updates it atomically on completion",
        "Results are pushed to a central results store/queue as each crawl completes, decoupled from the crawl-assignment queue",
        "Keep the unit of work small (single-URL leases, not big batches) given low-end machines — a dying machine then loses minimal in-flight work",
      ],
      tradeoffs: [
        "Central queue + lease model (simple to reason about, the queue itself must be highly available) vs. hash-based static partitioning like the 100-machine version of this question — static partitioning is more efficient when nodes are reliable, but leases handle unreliable low-end machines far better, which is the actual constraint this question adds",
        "Short lease timeouts (fast recovery from a dead worker, risk of double-crawling if a slow-but-alive worker's lease expires) vs. long timeouts (fewer false failures, slower recovery) — tune based on expected page-fetch latency",
        "A single central queue (simpler, a potential bottleneck at 10,000 workers) vs. a sharded/partitioned queue — at this scale a naive single queue likely needs partitioning too, worth flagging as a scaling follow-up",
      ],
      followUps: [
        "How do you pick a lease timeout when page-fetch latency is highly variable?",
        "What happens if the central dedup store itself becomes a bottleneck at 10,000 concurrent workers?",
        "How does this design change if the 10,000 machines are actually untrusted (the literal botnet framing) rather than owned infrastructure?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Consistent Hashing", href: "/foundations/consistent-hashing" },
      ],
    },
  },
  {
    id: "meta-uncle-bernies-website-down",
    company: "Meta",
    title: "Uncle Bernie's website is down — figure out why",
    prompt: "Uncle Bernie's Website is down. Figure out why.",
    category: "scenario-operational",
    tags: ["incident-response"],
    level: "E4 Production Engineer, screening round",
    source: {
      name: "The Reliability Whisperer (Substack)",
      url: "https://reliabilitywhisperer.substack.com/p/2025meta-e4-production-engineer-interview",
      reportedDate: "Mar 2025",
      confidence: "high",
    },
    context:
      "A live troubleshooting exercise where the interviewer kept \"moving the goalposts\" as the candidate investigated — testing whether they kept a systematic process rather than latching onto the first plausible cause. Reported root cause: the disk was out of space.",
    optimalAnswer: {
      clarifyingQuestions: [
        "(Live troubleshooting — think through a systematic checklist rather than asking the interviewer for the answer) How is \"down\" confirmed — a monitoring alert, a user report, a manual check? Timeouts, 5xx errors, connection refused?",
        "When did it last work, and what changed since then — a deploy, a config change, a traffic pattern shift?",
        "Is it down for everyone, or a subset — one region, one user cohort?",
      ],
      requirements: [
        "Systematically narrow down the cause of an unspecified outage, not guess",
        "Demonstrate a repeatable troubleshooting process, since the interviewer deliberately introduces new information mid-exercise",
        "Distinguish symptom from root cause",
      ],
      approach:
        "Treat this as a live elimination process working from the outside in — confirm the symptom, check the cheap/high-probability things first, and keep restating what's been ruled out so new information lands as a clue instead of a reset.",
      keyPoints: [
        "Confirm the symptom precisely first: reproduce it directly (curl the endpoint, check the port) rather than trusting an unverified report",
        "Check cheap, high-probability causes before anything exotic: is the process actually running? did it crash? check recent logs for an obvious error around the time things broke",
        "Check resource exhaustion next — disk space, memory, open file descriptors, connection pool limits — these produce confusing downstream symptoms (a service that's technically \"up\" but failing every request), and this is exactly the class of thing the real answer (disk out of space) falls into",
        "Check what changed recently — a deploy, a config push, a traffic spike, a dependency's status — and correlate the failure's start time against any recent change",
        "Narrate the process out loud and explicitly state what's been ruled out as you go — this is what lets the interviewer's goalpost-moves land as new clues instead of retreading the same ground",
        "Once found, separate the immediate fix (free disk / restart) from the actual follow-up (why did disk fill up — broken log rotation? a runaway process?) — the immediate fix alone doesn't prevent recurrence",
      ],
      tradeoffs: [
        "Checking resource exhaustion (disk/memory/fds) early vs. late in the checklist — it's cheap to check and a very common real-world cause, so checking early is generally right, but skipping straight to it without confirming the symptom risks missing something simpler",
        "Fixing the symptom immediately vs. investigating root cause fully before touching anything — narrating both an immediate mitigation and a root-cause path demonstrates the fuller skill this round is testing for",
      ],
      followUps: [
        "The disk fills up again a week later — what would you change to prevent recurrence?",
        "How would your approach differ if this were a live production incident with real users affected right now, vs. this screening exercise?",
        "What monitoring/alerting would have caught this before it became a full outage?",
      ],
      relatedLinks: [{ label: "Foundations: Circuit Breakers", href: "/foundations/circuit-breakers" }],
    },
  },
  {
    id: "meta-chess-100m-mau",
    company: "Meta",
    title: "Design an online chess platform for 100M monthly active users",
    prompt:
      "Design an online chess game that is fast, reliable, and supports 100 million monthly active users, each playing roughly one game a week.",
    category: "system-design",
    tags: ["chess-lld"],
    source: {
      name: "Exponent question DB",
      url: "https://www.tryexponent.com/questions?company=meta-facebook&type=system-design",
      reportedDate: "~2023",
      confidence: "high",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "Is \"roughly one game a week\" the average, or does usage cluster heavily around peak hours/weekends?",
        "Do we need spectator mode and ranked matchmaking/ELO, or just basic play?",
        "Real-time (both players online simultaneously) or can games be asynchronous (correspondence-style)?",
      ],
      requirements: [
        "100M MAU, ~1 game/week/user → ~100M games/week, roughly 14M games/day average",
        "Fast (low move-latency) and reliable at this scale",
        "Matchmaking to pair players",
        "Reliably persist game state and history",
      ],
      approach:
        "Do the back-of-envelope math first, since it reframes the problem: ~14M games/day is only ~165 new games/sec on average — modest for average load — but chess traffic is extremely peaky (evenings, weekends), so the design has to be sized for peak concurrency, not the average.",
      keyPoints: [
        "A matchmaking service pairs waiting players — by rating/ELO for competitive fairness, or instantly for casual play — via a lightweight queue per rating band rather than a full search over all waiting players",
        "Each active game is owned by one stateful game-server instance holding the authoritative board state in memory for low-latency move validation, with moves persisted asynchronously to durable storage so a crash doesn't lose game history",
        "Real-time move delivery to the opponent via a persistent connection (WebSocket) per active game rather than polling — directly serves the \"fast\" requirement",
        "Shard active games across many game-server instances (e.g. by game_id hash); a lightweight routing layer directs each player's connection to the server currently owning their game",
        "At peak, most load is concurrent active games needing low-latency moves, not the matchmaking step — size game-server capacity for peak concurrent games, and let matchmaking queue depth absorb burstiness gracefully",
        "Store completed games (final state + move history) in durable storage for history/replay, decoupled from the in-memory live-game path",
      ],
      tradeoffs: [
        "Stateful game servers holding live board state in memory (fast, but a crash loses in-flight state unless move-by-move persistence backs it up) vs. fully stateless (recompute board from move log every time, simpler failure recovery, slower per-move) — stateful-with-async-persistence balances both",
        "ELO-based matchmaking (fairer, longer waits for a close match) vs. fast/loose pairing (instant games, mismatched skill) — offer both modes rather than picking one",
        "WebSocket per active game (responsive, more server-side connection overhead at scale) vs. polling (simpler infra, laggy) — WebSocket wins given the explicit \"fast\" requirement",
      ],
      followUps: [
        "How would you handle a player disconnecting mid-game — pause, forfeit-timer, or reconnect window?",
        "How would you add spectator mode without doubling per-viewer server load for popular games?",
        "How does peak-hour capacity planning change your matchmaking-queue design specifically?",
      ],
      relatedLinks: [
        { label: "Foundations: Load Balancers", href: "/foundations/load-balancers" },
        { label: "Foundations: Estimation and Interview Framework", href: "/foundations/estimation-and-interview-framework" },
      ],
    },
  },
  {
    id: "meta-audio-system-cross-app",
    company: "Meta",
    title: "Design a shared 5.1 audio system across WhatsApp, Instagram, and Messenger",
    prompt:
      "Design a 5.1 audio system for WhatsApp, Instagram, and Messenger — including hardware interfaces, codecs, API endpoints, and the value proposition for Meta.",
    category: "system-design",
    tags: ["messaging-chat"],
    source: {
      name: "Exponent question DB",
      url: "https://www.tryexponent.com/questions?company=meta-facebook&type=system-design",
      reportedDate: "~2025",
      confidence: "high",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "Is this about spatial/surround audio for calls (WhatsApp/Messenger voice-video, Instagram Live), or media playback (Reels, shared audio content)?",
        "Does \"shared across three apps\" mean one common audio pipeline/SDK all three consume, or three implementations coordinated by a shared spec?",
        "What device/hardware range needs support — phones only, or also earbuds/external speakers with real 5.1 hardware?",
      ],
      requirements: [
        "A 5.1 surround-style audio experience usable across WhatsApp, Instagram, and Messenger",
        "Define hardware interfaces, codec choice, and API surface",
        "Articulate the business value proposition for Meta of building this once, shared",
      ],
      approach:
        "The \"value proposition for Meta\" half of the prompt is doing real work — this reads as much like a product-architecture question (why build one shared audio layer instead of three app-specific ones) as a pure systems question, so lead with the shared-infrastructure argument.",
      keyPoints: [
        "Business case first: WhatsApp, Instagram, and Messenger each currently maintain separate audio/call stacks; a shared spatial-audio layer is a build-once, reuse-three-times investment and a differentiator for calls/Live content against stereo-only competitors",
        "Core shared component: a common Audio SDK all three apps link against, exposing a consistent API (startSpatialSession(), attachStream(), setChannelLayout()) so app teams don't reimplement channel mixing per app",
        "Codec choice: a modern, low-bitrate-efficient spatial codec (an Opus-based multichannel encoding) suited to variable mobile bandwidth, not an uncompressed or legacy format built for fixed home-theater connections",
        "Hardware interface layer abstracts over the actual output device — phone speakers can't truly do discrete 5.1, so downmix to stereo/binaural on-device; genuine multichannel-capable headsets/speakers get the full channel layout — the API looks the same to the app regardless",
        "Graceful degradation is the core hardware-interface decision: detect device capability and fall back automatically, rather than failing or forcing the app to special-case every device type",
        "API endpoints: session management (create/join a spatial session for a call or live stream), device-capability negotiation, and a metrics/telemetry endpoint for audio-quality monitoring across the three apps",
      ],
      tradeoffs: [
        "One shared SDK across all three apps (consistent, but changes ripple across three products and need cross-team coordination) vs. three independent implementations (faster per-app iteration, duplicated effort, inconsistent quality) — shared wins for the stated value proposition, but is a real coordination cost worth naming",
        "Server-side mixing (consistent output regardless of device, adds server compute + latency) vs. client-side mixing (lower latency, output quality varies by device capability) — client-side is the more realistic choice given latency sensitivity for live calls",
        "True binaural/spatial processing (better experience, more on-device CPU) vs. a simple stereo downmix as the default (cheaper, works everywhere) — offer spatial as a capability-gated opt-in upgrade rather than the universal default",
      ],
      followUps: [
        "How would you roll this out — behind a feature flag per app, staged by region/device tier?",
        "How do you measure whether the spatial-audio investment is actually paying off?",
        "What happens on a low-end device or poor network — does spatial audio degrade gracefully or get disabled entirely?",
      ],
      relatedLinks: [{ label: "Foundations: REST APIs", href: "/foundations/rest-apis" }],
    },
  },
  {
    id: "meta-image-storage-dedup",
    company: "Meta",
    title: "Design an image storage system for Facebook and Instagram",
    prompt:
      "Design a system to store images for Facebook and Instagram that handles 1,000 uploads per second and deduplicates identical images.",
    category: "system-design",
    tags: ["media-storage"],
    source: {
      name: "LeetCode Discuss — \"Meta Onsite System Design Questions\" compiled thread",
      url: "https://leetcode.com/discuss/interview-experience/4428743/Meta-Onsite-System-Design-Questions",
      reportedDate: "Dec 2023",
      confidence: "high",
    },
    context:
      "Corroborated by IGotAnOffer's Production Engineer guide as a bare \"design a system that stores and retrieves images for Facebook\" prompt — this numbered version carries the concrete throughput and dedup requirement.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Dedup at what granularity — byte-identical files only, or near-duplicate detection (same photo re-compressed/cropped)?",
        "Read:write ratio — image views vastly outnumber uploads on a social platform, so reads likely dominate by a large factor",
        "Do we need multiple resolutions served (thumbnail, feed-size, full-res), or just store-and-retrieve the original?",
      ],
      requirements: [
        "Sustain 1,000 image uploads/sec",
        "Deduplicate identical images (avoid storing the same bytes twice)",
        "Serve images back with low latency at a much higher read volume than write volume",
        "Durable — a lost photo is a real user-facing failure",
      ],
      approach:
        "The dedup requirement is design-defining — build the storage path around a content hash, since it's both the dedup key and, conveniently, a natural cache/CDN key.",
      keyPoints: [
        "On upload, compute a content hash (e.g. SHA-256) of the image bytes before storing anything — this hash is the dedup key",
        "Check a hash → blob-location index first; if the hash already exists, create a new metadata record pointing at the existing blob and increment a reference count instead of storing the bytes again — this is the actual dedup mechanism",
        "Store the unique blobs in an object store, not a database — databases are the wrong tool for large binary payloads at this volume",
        "Store per-post/per-user metadata (who posted it, when, privacy, caption) separately in a database, referencing the blob by hash, so metadata and bytes scale independently",
        "At 1,000 writes/sec, put a queue in front of the hashing/storage pipeline so upload requests get acknowledged quickly (accepted, processing async) rather than making the user wait on the full store-and-index round trip synchronously",
        "Given reads vastly outnumber writes, put a CDN in front of the blob store keyed by the same content hash — identical images across different posts/users share one CDN cache entry for free, compounding the dedup benefit into the read path too",
        "Reference counting on the blob determines when it's safe to delete the underlying bytes — never delete on a single post's removal if other posts still reference the same hash",
      ],
      tradeoffs: [
        "Exact-hash dedup (simple, fast, only catches byte-identical files) vs. perceptual/near-duplicate hashing (catches re-compressed or lightly-edited copies, much more compute per upload) — exact-hash is the right default for the stated requirement; near-duplicate detection is a reasonable follow-up extension",
        "Synchronous upload processing (simpler, but 1,000/sec of hashing+storage work directly in the request path adds latency) vs. async via a queue (faster user-facing ack, needs an upload-status mechanism) — async wins at this throughput",
        "Content-hash-addressed storage (natural dedup and cache key, but a single popular photo's hash becomes a hot key) vs. random blob IDs (no natural dedup) — content-addressing wins overall, with hot-key mitigation (CDN, replica fan-out) as a named follow-up rather than a reason to avoid it",
      ],
      followUps: [
        "How do you handle the same image uploaded at different resolutions/crops — does dedup catch that, or only byte-identical uploads?",
        "What happens to reference counting under concurrent uploads/deletes of the same hash?",
        "How would this design change if you added on-the-fly resizing (thumbnails vs. full-res) on top?",
      ],
      relatedLinks: [
        { label: "Foundations: CDN", href: "/foundations/cdn" },
        { label: "Foundations: Consistent Hashing", href: "/foundations/consistent-hashing" },
      ],
    },
  },
  {
    id: "meta-packet-upgrade-troubleshoot",
    company: "Meta",
    title: "Push a software update to remote machines and troubleshoot partial failures",
    prompt:
      "How would you send packets to remote machines and try to upgrade the packages remotely? How would you troubleshoot if some of the machines are not updated?",
    category: "scenario-operational",
    tags: ["ota-rollout"],
    source: {
      name: "IGotAnOffer — Meta Production Engineer guide",
      url: "https://igotanoffer.com/blogs/tech/facebook-production-engineer-interview",
      confidence: "high",
    },
    context: "Reported under the \"networking\" round of Meta's Production Engineer interview.",
    optimalAnswer: {
      clarifyingQuestions: [
        "How many machines, and are they reachable directly or behind some fleet-management layer already?",
        "Does the upgrade need zero downtime, or is a brief per-machine service interruption acceptable?",
        "Does \"not updated\" mean the push never reached them, or it reached them and failed to apply?",
      ],
      requirements: [
        "Push an update to a fleet of remote machines reliably",
        "Detect which machines succeeded vs. failed",
        "Have a concrete troubleshooting process for the machines that didn't update",
      ],
      approach:
        "Split this into the two halves the question actually asks for: the rollout mechanism itself, and — just as important — how to diagnose a partial failure afterward, which is really an observability question layered on top of a deployment question.",
      keyPoints: [
        "Roll out in waves/canary batches rather than pushing to every machine at once — update a small percentage first, verify health, then expand, bounding blast radius if the package itself is bad",
        "Each machine reports its update status (started, succeeded, failed-with-reason) back to a central tracking system — without this, \"which machines failed\" is undiscoverable at fleet scale",
        "Prefer a pull model where possible (machines check in and pull the update when ready) over a pure push — pull is naturally resilient to a machine being temporarily unreachable, since it just catches up at the next check-in instead of being permanently missed by a one-time push",
        "Troubleshooting a \"not updated\" machine: first check whether the push ever reached it (network/connectivity — firewall, machine offline at push time) vs. reached it but failed to apply (disk space, permissions, a dependency conflict, the update script itself erroring)",
        "Cross-reference failed machines for a common pattern (all in one datacenter/rack, all one hardware generation, all one OS version) — a shared trait usually points straight at the root cause rather than 100 independent unrelated failures",
        "Keep the previous package version available for immediate rollback per machine — \"some machines didn't update\" is a far better failure mode than \"a machine updated to a broken version and now can't be reached to roll back\"",
      ],
      tradeoffs: [
        "Push-based rollout (immediate, simpler mental model) vs. pull-based (machine-initiated, naturally handles transient unreachability, slight staleness while waiting for the next check-in) — pull tends to be the more robust choice at real fleet scale",
        "All-at-once rollout (fast, but a bad package hits the whole fleet immediately) vs. staged/canary rollout (slower, contains the blast radius) — staged is close to always the right call for a whole-fleet change",
        "Automated rollback on failure detection (faster recovery, risk of flapping if detection is noisy) vs. manual intervention (slower, more deliberate) — a reasonable middle ground is auto-pause-the-rollout plus alert, with rollback as a deliberate human call",
      ],
      followUps: [
        "The failed machines are all in one geographic region — what does that tell you, and what do you check next?",
        "How would you design the update mechanism to be resumable if a machine goes offline mid-update and comes back later?",
        "How do you avoid the status-tracking system itself becoming the bottleneck or single point of failure at fleet scale?",
      ],
      relatedLinks: [{ label: "Foundations: Circuit Breakers", href: "/foundations/circuit-breakers" }],
    },
  },
];
