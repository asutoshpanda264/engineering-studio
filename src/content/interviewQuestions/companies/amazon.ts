import type { InterviewQuestion } from "../types";

/**
 * Amazon — researched 2026-08-23, see `docs/interview_exp.md` for the full
 * research log and the complete research catalog (Exponent's 54-item
 * question DB, the Exponent Amazon system-design blog's five named
 * interviewer/candidate anecdotes, the Amazon Solutions Architect guide,
 * and several LeetCode Discuss / Blind threads reread in full). Same ship
 * bar as `google.ts`/`meta.ts`: only questions with a real, answerable
 * prompt — concrete numbers, explicit constraints, a multi-part ask, or an
 * actual narrative — make it in here. A bare "Design X." reads as a title,
 * not something a candidate could sit down and answer, so most of the
 * Exponent DB's 54 items stay in the tracker doc instead. See the
 * tracker's "Shipped to app" note for the full before/after list.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a transcript
 * to memorize. These are authored by reasoning through each problem the way
 * a strong candidate would, not sourced from a specific candidate's actual
 * answer — unlike `prompt`/`context`, which are sourced and cited,
 * `optimalAnswer` is this app's own content.
 */
export const AMAZON_QUESTIONS: InterviewQuestion[] = [
  {
    id: "amazon-ab-experimentation-platform",
    company: "Amazon",
    title: "Design an A/B experimentation platform",
    prompt:
      "Design an A/B experimentation platform: split traffic across experiments, with an assignment service holding the core logic and a streaming pipeline gathering metrics. At L6, also add access control (no one else can touch your experiment's traffic), mutual exclusivity so a user doesn't land in contradictory experiences, and manual overrides so QA can force test users into a variant.",
    category: "system-design",
    tags: ["experimentation"],
    level: "L6, reported as a Bar Raiser's favorite",
    source: {
      name: "Exponent blog — Amazon System Design Interview (2026 Guide)",
      url: "https://www.tryexponent.com/blog/amazon-system-design-interview",
      confidence: "high",
    },
    context:
      "Reported directly by a Bar Raiser as a favorite prompt. The L5 bar is assembling the right building blocks; the L6 bar adds access control, mutual exclusivity between experiments, and QA override support — the same base system, scored to a higher standard of completeness.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is assignment sticky per user (same variant on every visit) or re-randomized per session?",
        "How many concurrent experiments run at once, and can a single user land in more than one simultaneously?",
        "What's the metrics latency requirement — near-real-time dashboards, or is a batch/hourly rollup acceptable?",
        "Who owns an experiment, and does that ownership need to be enforced technically (the L6 access-control ask) or just by convention?",
      ],
      requirements: [
        "Deterministically assign each user to a variant per experiment, consistently across requests",
        "Support many concurrent experiments without one experiment's traffic leaking into another's analysis",
        "Collect exposure and outcome events into a streaming metrics pipeline",
        "L6 bar: per-experiment access control, mutual exclusivity between conflicting experiments, and a manual override path for QA",
      ],
      approach:
        "Split the system into two clearly separate halves — a low-latency assignment path that decides which variant a user sees, and an asynchronous metrics path that measures what happened — since they have very different latency and durability needs.",
      keyPoints: [
        "Assignment service computes a deterministic hash of (user_id, experiment_id) into a bucket, then maps buckets to variants per the experiment's configured traffic split — this makes assignment sticky and reproducible without needing to store a row per user per experiment",
        "Cache the experiment configuration (active experiments, traffic splits, targeting rules) in memory at the edge/assignment layer, refreshed on a short interval — assignment sits on the request hot path, so it can't do a database round-trip per call",
        "Mutual exclusivity: group conflicting experiments into a shared \"layer\"; a user's hash routes them into exactly one experiment within a layer, guaranteeing no user is simultaneously in two experiments that would confound each other's results",
        "Every assignment decision emits an exposure event (user, experiment, variant, timestamp) onto a streaming pipeline (e.g. Kafka-style), decoupling metric collection from the latency-sensitive assignment call",
        "A stream-processing layer joins exposure events with downstream outcome events (clicks, purchases, whatever the experiment measures) and rolls them up into per-variant metrics for the dashboard",
        "L6 access control: scope each experiment to an owning team/service via an ACL checked at experiment-creation and traffic-config-change time — not on the assignment hot path, which stays fast and doesn't need to authorize on every request",
        "L6 QA override: a force-variant lookup keyed by user_id checked before the hash-based assignment — if present, it wins outright, letting a fixed set of QA accounts always see a specific variant for testing",
      ],
      tradeoffs: [
        "Hash-based deterministic assignment (no storage needed, trivially sticky, cheap) vs. storing an explicit assignment row per user per experiment (supports arbitrary overrides more easily, but a write and a lookup per user per experiment doesn't scale to Amazon's traffic) — hash-based wins for the base case, with the override table layered on top only for the small QA-override population",
        "Streaming metrics pipeline (near-real-time dashboards, more infrastructure) vs. nightly batch rollups (simpler, but a broken experiment isn't caught for a day) — streaming is worth the complexity given how much traffic and revenue a bad experiment can burn in 24 hours",
        "Layer-based mutual exclusivity (clean guarantee, requires experiments to be pre-grouped into layers by an owner) vs. no exclusivity enforcement (simpler, relies on experiment owners manually checking for overlap) — layers scale far better once dozens of teams run concurrent experiments",
      ],
      followUps: [
        "How would you detect that an experiment's traffic split configuration got corrupted and is silently mis-bucketing users?",
        "How do you retroactively analyze an experiment if you later realize two experiments should have been mutually exclusive but weren't?",
        "How would you extend this to multi-armed-bandit-style traffic reallocation instead of a fixed split?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
      ],
    },
  },
  {
    id: "amazon-delivery-locker-capacity",
    company: "Amazon",
    title: "Manage capacity for a network of delivery lockers",
    prompt:
      "Given a bank of mixed-size delivery locker slots at a delivery station, design how to allocate capacity to minimize cost per package. Reason about the heuristic probability of a delivery date and the bottlenecks across each hop from fulfillment center to delivery station.",
    category: "system-design",
    tags: ["capacity-scaling"],
    source: {
      name: "Exponent blog — Amazon System Design Interview (2026 Guide)",
      url: "https://www.tryexponent.com/blog/amazon-system-design-interview",
      confidence: "high",
    },
    context:
      "Described as a real last-mile problem one Amazon interviewer likes to use. Strong reported answers reason probabilistically about when a package will actually arrive at the locker, not just about locker size.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Are locker sizes fixed at build time, or can a station's slot-size mix be reconfigured over time based on demand?",
        "Is \"cost per package\" dominated by locker rental/space cost, or by failed-delivery/re-route cost when no slot fits?",
        "How far in advance is a package's expected arrival known — same-day, or does the system see it days ahead?",
        "What happens when no slot of the right size is free — hold at the station, oversized-into-a-bigger-slot, or reroute to a human-handoff pickup?",
      ],
      requirements: [
        "Allocate a mix of small/medium/large locker slots at a delivery station to minimize cost per package",
        "Reason about the probability that a given package actually arrives on its predicted delivery date (deliveries slip)",
        "Account for bottlenecks across the whole hop chain — fulfillment center → line-haul → delivery station → locker — not just the locker step in isolation",
        "Handle the case where no correctly-sized slot is available when a package arrives",
      ],
      approach:
        "Treat locker assignment as a bin-packing problem under uncertainty: since a package's actual arrival time is a probability distribution rather than a fixed point, size the slot allocation against expected demand curves rather than against a naive one-package-one-slot count.",
      keyPoints: [
        "Model each inbound package with a predicted arrival-date distribution (not a single date) built from historical hop-by-hop transit-time data — a package delayed upstream shifts locker demand later, and the allocator needs to see that shift, not just the original ETA",
        "Forecast expected locker demand per size-class per day from these distributions, then allocate the station's fixed slot inventory to minimize expected cost — oversized items forced into a large slot when a medium slot would fit is wasted capacity, priced into the cost function",
        "When the right-size slot isn't free at actual arrival, fall back in order: next-size-up slot, held-for-pickup counter, or reschedule to next-day locker delivery — each fallback has a different cost, and the allocator should route to the cheapest available one first",
        "Track per-hop transit variance (fulfillment-center processing delay, line-haul delay, delivery-station intake delay) separately, since the bottleneck usually isn't the locker itself — it's an upstream hop pushing a wave of packages into the station later than planned, causing a demand spike at the locker no static allocation absorbs",
        "Recompute the size-class allocation periodically (e.g. weekly) from rolling demand data per station, since a station's package-size mix shifts with seasonality (holiday small-parcel surges, furniture-heavy periods, etc.)",
        "Surface locker utilization and overflow-fallback rate as the key operational metrics — a station consistently overflowing one size class is the direct signal to reallocate physical slots",
      ],
      tradeoffs: [
        "Probabilistic demand forecasting per size class (better-fitted capacity, more complex to build and validate) vs. simple historical-average allocation (easy to reason about, systematically wrong during demand shifts like holidays) — probabilistic wins for a last-mile system where holiday surges are the actual hard case",
        "Static slot-size allocation set at build time (cheap, doesn't adapt) vs. periodically recomputed allocation (matches real demand, requires physical reconfiguration capability at the station) — periodic recomputation only pays off if the physical lockers can actually be resized/reconfigured, which is worth confirming as a real constraint",
        "Optimizing purely for cost-per-package vs. also weighting customer-facing failure rate (package couldn't be lockered, went to a worse fallback) — pure cost optimization can quietly push failures onto customers; a real answer should name this and weight fallback cost accordingly",
      ],
      followUps: [
        "How would this change during a known demand spike (holiday season) where you can plan ahead vs. an unplanned spike (a delayed truck)?",
        "How would you detect that a specific delivery station's locker mix is systematically wrong before customers start seeing failed lockering?",
        "How would you extend this across a network of stations, reallocating slot inventory between nearby stations rather than treating each in isolation?",
      ],
      relatedLinks: [
        { label: "Foundations: Estimation and Interview Framework", href: "/foundations/estimation-and-interview-framework" },
        { label: "Build it: Warehouse Inventory Sync scenario", href: "/workshop?scenario=warehouse-inventory-sync" },
      ],
    },
  },
  {
    id: "amazon-reverse-system-design-harden",
    company: "Amazon",
    title: "Walk through and harden a system you actually built",
    prompt:
      "Rather than a generic prompt, explain your own real architecture from a past project, then defend it as the interviewer probes failure modes: what happens if this dependency goes down? Do you have a circuit breaker? What stops one slow service from hogging every thread?",
    category: "scenario-operational",
    tags: ["behavioral"],
    source: {
      name: "Exponent blog — Amazon System Design Interview (2026 Guide)",
      url: "https://www.tryexponent.com/blog/amazon-system-design-interview",
      confidence: "high",
    },
    context:
      "Reported by an Amazon interviewer as \"reverse system design\" — a deliberate alternative to a generic whiteboard prompt, specifically because it's hard to fake: the interviewer keeps escalating failure scenarios against a system the candidate genuinely built, rather than a hypothetical one.",
    optimalAnswer: {
      clarifyingQuestions: [
        "(This is about your own real system, so the \"clarifying\" step is picking the right project up front) — pick a system you can describe end-to-end, including at least one place it actually failed in production, not just the happy path",
        "Confirm scope with the interviewer: full architecture, or focus on one specific flow within it that had a real incident?",
      ],
      requirements: [
        "Describe a real system's architecture clearly enough that an interviewer unfamiliar with it can follow the request path",
        "Identify the system's actual failure modes and dependencies, not idealized ones",
        "Defend concrete resiliency mechanisms (or honestly name their absence) under live follow-up questioning",
      ],
      approach:
        "Since this format is specifically designed to catch a rehearsed, idealized answer, the winning move is leading with where the system was actually fragile rather than waiting for the interviewer to find it — that itself is an ownership signal.",
      keyPoints: [
        "Open with a one-paragraph shape of the system: what it does, the main request path, and the 2-3 services/dependencies actually in that path — don't over-draw components that weren't load-bearing to the story",
        "Proactively name at least one place the system had a real failure or near-failure — this is what separates a strong answer from a rehearsed one, since the interviewer is going to find the weak point either way",
        "For each named dependency, be ready to answer: what happens if it's slow (not just down)? A dependency that's slow but not fully failed is usually the more dangerous case, since it can silently exhaust connection pools/threads without tripping an obvious \"it's down\" alarm",
        "If the real system had a circuit breaker, timeout, or bulkhead, explain why that specific mechanism was chosen there and not elsewhere in the system — if it didn't have one, say so plainly and describe what you'd add now, which reads as more credible than pretending it was already handled",
        "Explain what stops one slow downstream call from hogging every request-handling thread — a bounded thread/connection pool per dependency, a timeout with a sane default, or an async/non-blocking call pattern — since this is a named example follow-up in the actual reported question",
        "Close the loop: what did the team actually change after the failure (if there was one), and what would you change now with more time/authority than you had then",
      ],
      tradeoffs: [
        "Presenting the system as it actually was, warts included, vs. presenting an idealized version with resiliency you'd add \"if you had more time\" — the honest version is stronger here specifically, since the round's whole design is to catch the idealized answer under follow-up",
        "A dedicated circuit breaker per dependency (isolates failures cleanly, more moving parts to build and tune) vs. a shared timeout/retry policy across dependencies (simpler, less precise isolation) — name which your real system actually used and why, rather than asserting the more sophisticated one was there if it wasn't",
      ],
      followUps: [
        "What was the blast radius when this dependency actually did fail, and how did you find out?",
        "If you were redesigning this system today with what you know now, what's the first thing you'd change?",
        "How would this system's failure behavior change under 10x the traffic it actually saw?",
      ],
      relatedLinks: [{ label: "Foundations: Circuit Breakers", href: "/foundations/circuit-breakers" }],
    },
  },
  {
    id: "amazon-chess-lld-multiplayer-sync",
    company: "Amazon",
    title: "Design a chess game — single-player, then multiplayer",
    prompt:
      "Design a chess game: single-player with difficulty levels first, then extend to multiplayer. Focus on the move-traversal algorithm, the data structures for board state, and how the two clients stay in sync (websockets vs. server-sent events).",
    category: "lld-ood",
    tags: ["chess-lld"],
    source: {
      name: "Exponent blog — Amazon System Design Interview (2026 Guide)",
      url: "https://www.tryexponent.com/blog/amazon-system-design-interview",
      confidence: "high",
    },
    context: "Reported as a common object-oriented design prompt in Amazon's low-level design rounds, especially at junior levels where the \"system design\" round is frequently LLD rather than distributed-systems HLD.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Single-player first — does \"difficulty levels\" mean a simple heuristic AI, or is a real minimax/engine integration in scope?",
        "For multiplayer: same-device pass-and-play, or two separate clients over a network?",
        "Does the design need to support move history/undo and standard chess rules (castling, en passant, promotion), or a simplified rule set?",
      ],
      requirements: [
        "Represent board state and validate legal moves per standard chess rules",
        "Single-player mode with selectable difficulty against a computer opponent",
        "Multiplayer mode where two networked clients see a consistent, up-to-date board",
        "Clean extension path from single-player to multiplayer without a rewrite",
      ],
      approach:
        "Design the board/move/rules model once, independent of who or what is making moves — a human, an AI opponent, or a remote player are all just move sources against the same validated state machine, and multiplayer becomes a networking layer on top rather than a redesign.",
      keyPoints: [
        "Model Board (piece positions), Piece (type + color + movement rules, e.g. via a strategy per piece type), and Move (from, to, special-move flags) as the core domain objects — the same trio single-player and multiplayer both operate against",
        "A Game class owns turn state and delegates move legality checks to the Board/Piece model — reject illegal moves at this layer regardless of whether the move came from a UI click, an AI, or a network message",
        "Single-player difficulty: an AI opponent implements a common MoveSource interface (same one a human player implicitly satisfies via UI input); difficulty scales the AI's search depth/heuristic quality (a shallow minimax at low difficulty, deeper search or a simple evaluation function refinement at higher)",
        "Move-traversal for legality/check detection: generate a piece's candidate moves from its movement rules, then filter out any that would leave the mover's own king in check — this check-detection filter is the part candidates most often skip and interviewers probe for",
        "Multiplayer sync: the server holds authoritative game state; each client submits moves and receives the validated result, never trusting a client's own board state as truth — this also cleanly reuses the exact same Game/Board/Move validation already built for single-player",
        "WebSocket over Server-Sent Events for the sync channel: chess needs bidirectional communication (both players send moves), while SSE is server-to-client only and would need a separate channel for the client's own move submissions — a full-duplex WebSocket avoids that split",
        "Move history as an append-only list on Game enables undo (single-player), replay, and reconnect-and-resync (multiplayer) from the same data structure",
      ],
      tradeoffs: [
        "WebSocket (bidirectional, one connection, more server-side connection state to manage) vs. SSE-push-plus-separate-POST-for-moves (simpler server model, two channels to keep coordinated) — WebSocket is the cleaner fit given moves flow both directions",
        "Server-authoritative validation (both players always converge, adds a network round-trip before a move visibly lands) vs. client-side optimistic validation with server reconciliation (feels instant, risks a visible correction if the client and server disagree) — server-authoritative is simpler to reason about and worth defaulting to unless latency is explicitly called out as a requirement",
        "A single shared Piece class with a movement-rule lookup vs. a subclass per piece type (Rook, Bishop, Queen, …) — subclassing is the more textbook OOP answer and easier to extend with new piece-specific behavior (castling rights, en passant eligibility), which is why it's the more common reported answer here",
      ],
      followUps: [
        "How would you detect and handle a disconnected player mid-game in multiplayer — pause, forfeit timer, or reconnect window?",
        "How would you add spectator mode without letting spectators submit moves?",
        "How would checkmate/stalemate detection change your move-generation approach?",
      ],
      relatedLinks: [
        { label: "LLD: OOP Fundamentals", href: "/lld/oop-fundamentals" },
        { label: "LLD: Tic-Tac-Toe", href: "/lld/tic-tac-toe" },
      ],
    },
  },
  {
    id: "amazon-discount-coupon-stacking",
    company: "Amazon",
    title: "Design a discount and coupon system with stacking rules",
    prompt:
      "Design a discount and coupon system: model a class hierarchy for percentage-based and fixed-value discounts, and handle the messy edge cases of stacking multiple coupons across multiple items in a cart.",
    category: "lld-ood",
    tags: ["rules-engine-lld"],
    level: "L4",
    source: {
      name: "Exponent blog — Amazon System Design Interview (2026 Guide)",
      url: "https://www.tryexponent.com/blog/amazon-system-design-interview",
      confidence: "high",
    },
    context: "Reported by a recent L4 candidate as a low-level design round question.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Can multiple coupons be applied to the same order, or is it one coupon per checkout?",
        "Do discounts apply per-item, cart-wide, or both (e.g. a category discount plus a cart-wide promo code)?",
        "Are there stacking restrictions (e.g. a percentage-off and a fixed-off can combine, but two percentage-offs can't)?",
        "Does application order matter — percentage-off before or after a fixed-value discount changes the final total?",
      ],
      requirements: [
        "Model both percentage-based and fixed-value discount types through a shared abstraction",
        "Apply one or more discounts to a cart containing multiple items",
        "Enforce stacking rules (which discount combinations are allowed) rather than always summing every applicable discount",
        "Produce a deterministic, explainable final price given a set of applied coupons",
      ],
      approach:
        "Define a single Discount interface both discount types implement, and separate \"what a discount computes\" from \"which discounts are allowed to combine\" — the stacking-rules problem is really a separate policy layer sitting on top of the discount model, not something to bake into the discount classes themselves.",
      keyPoints: [
        "A Discount interface exposes apply(cart) -> discountedAmount; PercentageDiscount and FixedValueDiscount each implement it independently — new discount types (e.g. buy-one-get-one) slot in later without touching existing code",
        "Each Discount also declares a scope: cart-wide, per-item, or per-category — this determines what subset of the cart it operates over before computing its amount",
        "A separate StackingPolicy component decides, given a proposed set of coupons on one order, whether that combination is legal (e.g. \"max one percentage-off per order\", \"a category coupon and a cart-wide coupon can combine, two cart-wide coupons cannot\") — keeping this out of the Discount classes means adding a new stacking rule never requires touching discount logic",
        "Discount application order is explicit and deterministic: apply scoped/per-item discounts first, then cart-wide percentage discounts, then cart-wide fixed-value discounts last — fixing this order (rather than leaving it to insertion order) is what makes the final total reproducible regardless of which order coupons were entered",
        "A PricingEngine takes the cart plus the validated (stacking-policy-approved) set of discounts, applies them in the fixed order, and returns a line-item breakdown showing what each discount contributed — not just a final number, since customer support and disputes need to see how a total was reached",
        "Reject a discount combination at the StackingPolicy layer before touching pricing — never silently apply a disallowed combination and hope the numbers work out",
      ],
      tradeoffs: [
        "A fixed, hardcoded application order (percentage before fixed-value, or vice versa) vs. a per-discount configurable priority (more flexible, harder to reason about and explain to a confused customer) — a fixed, documented order is easier to test and explain, and is the safer default absent a specific business requirement for per-discount ordering",
        "Modeling stacking rules as a separate policy object vs. a stacking flag/field on each Discount (simpler for a small number of rules, but rules that depend on the combination of two specific discount types don't fit cleanly on either one individually) — a separate policy scales better once stacking rules get genuinely combinatorial",
        "Percentage-off computed against the pre-discount item price vs. against the running discounted price after earlier discounts — this is exactly the kind of edge case interviewers push on; naming the choice explicitly (and that it changes the final total) is the actual signal being looked for",
      ],
      followUps: [
        "A customer's cart has a category discount and a store-wide coupon that shouldn't stack — how does the system decide which one applies, or does it reject the checkout?",
        "How would you add a coupon with a minimum-cart-value condition?",
        "How would you support a coupon that's a free item rather than a price reduction?",
      ],
      relatedLinks: [
        { label: "LLD: SOLID Principles", href: "/lld/solid-principles" },
        { label: "Build it: Coupon Code Redemption scenario", href: "/workshop?scenario=coupon-code-redemption" },
      ],
    },
  },
  {
    id: "amazon-cdn-from-scratch",
    company: "Amazon",
    title: "Build a CDN service from scratch",
    prompt:
      "Design a CDN service from scratch — not using a CDN as a component in a larger architecture, but designing the actual CDN infrastructure itself.",
    category: "system-design",
    tags: ["caching"],
    level: "SDE2",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/system-design/1188533/Amazon-System-Design-Interview",
      reportedDate: "~May 2021",
      confidence: "high",
    },
    context:
      "The candidate's first instinct was S3 storage replicated across regions with an API to sync contents by comparing buckets — the interviewer was reportedly unsatisfied with that approach, since it treats the CDN as a component rather than designing its actual edge/origin architecture.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Pull-CDN (edges fetch from origin on cache miss) or push-CDN (content proactively replicated to edges)?",
        "What's the expected file-size distribution and total catalog size — this drives storage and bandwidth estimates?",
        "How fresh does an update/delete need to propagate to edges — immediately, or is eventual consistency acceptable?",
      ],
      requirements: [
        "Serve static content from edge locations close to users, not directly from a single origin",
        "Support upload, read, update, and delete of content, each with a stable URL",
        "Handle cache invalidation when content is updated or deleted",
        "Scale reads far beyond what the origin alone could serve",
      ],
      approach:
        "Split the system into a master/origin site holding the source of truth and a fleet of edge sites acting as regional caches in front of it — the actual design work is in how edges handle misses, invalidation, and eviction, not in treating \"CDN\" as an opaque box.",
      keyPoints: [
        "Define the API surface first: uploadFile(bytes) -> url, readFile(url) -> bytes, updateFile(id, bytes), deleteFile(id) — each file gets a unique, stable identifier (e.g. a UUID-based URL) generated at upload time",
        "Master/origin site holds the authoritative object storage plus a key-value index mapping URL to internal storage location; this is the source of truth for both original writes and edge cache-misses",
        "Each edge site holds its own local object cache plus a local key-value index of what it currently has cached — a read request is routed to the geographically nearest edge first",
        "On a cache miss at an edge, the edge fetches from the origin, stores a local copy, and serves it — subsequent requests for that URL from that region hit the edge directly (pull-CDN behavior)",
        "Shard each site's key-value index by URL using consistent hashing across that site's machines, with a small number of replicas per shard for availability — this is a within-site sharding decision, separate from the site-to-site (edge vs. origin) topology",
        "On update or delete, the origin sends an invalidation event to all edges for that URL rather than trying to push new bytes everywhere immediately — an edge that receives an invalidation simply drops its cached copy and re-fetches from origin on the next request, keeping the propagation mechanism cheap and uniform for both updates and deletes",
        "Evict cold content at each edge under an LRU (or LFU, if some content is bursty-then-dead vs. steadily popular) policy with a TTL, since edge storage is far smaller than the origin's full catalog",
      ],
      tradeoffs: [
        "Pull-CDN (edges lazily populate on first miss, simple, first requester in a region pays full origin latency) vs. push-CDN (content proactively replicated ahead of demand, faster for predictably popular content, wastes edge storage on content that's never actually requested in that region) — pull is the simpler default; push is worth naming as an optimization for known-hot content",
        "Invalidation-then-refetch-on-next-read (simple, uniform for updates and deletes, a brief window where an edge could still serve stale content until it gets the invalidation) vs. synchronously propagating new bytes to every edge before acknowledging the write (stronger consistency, far higher write latency and cross-region bandwidth cost) — invalidation-based is the standard real-world choice given CDNs prioritize read latency over write consistency",
        "LRU eviction (simple, works well for generally-popular content) vs. LFU (better for content with a stable long-tail of steady but infrequent access) — LRU is the safer default; call out LFU as an alternative if the interviewer's traffic pattern description suggests steady long-tail access",
      ],
      followUps: [
        "How would you handle a \"thundering herd\" where an extremely popular new file causes every edge to miss and hammer the origin simultaneously?",
        "How would you route a request to the nearest edge — DNS-based geo-routing, anycast, or an application-layer lookup?",
        "How does your design change for large video files served in byte-range chunks, vs. small whole-file assets?",
      ],
      relatedLinks: [
        { label: "Foundations: CDN", href: "/foundations/cdn" },
        { label: "Foundations: Consistent Hashing", href: "/foundations/consistent-hashing" },
      ],
    },
  },
  {
    id: "amazon-food-marketplace-favorites-dashboard",
    company: "Amazon",
    title: "Add a favorite-sellers dashboard to an existing food marketplace",
    prompt:
      "There's an existing food marketplace where sellers and buyers interact. Modify the system so that (1) a buyer can mark a seller as a favorite, with multiple favorite sellers per buyer, and (2) a dashboard displays all of a buyer's favorite sellers and what they sold, sorted by day (e.g. Seller A sold Mango on Monday, Seller B sold Apple on Wednesday).",
    category: "lld-ood",
    tags: ["personalization-history"],
    level: "SDE2",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/2150819/amazon-sde2-system-design-question/",
      reportedDate: "Jun 2022",
      confidence: "high",
    },
    context:
      "The candidate's initial answer added a single favSeller column directly on the Buyer table — the interviewer flagged this as unscalable and over-engineered, since it can't represent multiple favorites per buyer without repeated columns. The thread's follow-on discussion (10 comments) converges on a many-to-many join table as the fix.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Can a buyer have an effectively unbounded number of favorite sellers, or is there a practical cap?",
        "Does the dashboard need real-time data, or is a daily/periodic rollup of \"what a seller sold\" acceptable?",
        "Is \"what they sold\" scoped to items sold to anyone, or just items sold to this specific buyer?",
      ],
      requirements: [
        "A buyer can mark any number of sellers as favorites",
        "A seller can be favorited by many different buyers (genuinely many-to-many)",
        "A dashboard lists a buyer's favorite sellers along with recent items sold, sorted by day",
        "The design must scale to a buyer having hundreds or thousands of favorites without schema changes",
      ],
      approach:
        "Recognize this as a classic many-to-many relationship and model it as its own join table rather than a column on either existing table — the column-on-Buyer approach the interviewer rejected fails precisely because it can't represent a variable-length, many-to-many relationship.",
      keyPoints: [
        "Add a new BuyerFavoriteSeller table with (buyer_id, seller_id, added_at) and a composite primary key on (buyer_id, seller_id) — this is the actual fix for the rejected design, since it represents an arbitrary number of favorites per buyer as rows, not columns",
        "Index the table by buyer_id (to list a buyer's favorites) and, if needed, by seller_id (to answer \"who has favorited this seller\", useful for seller-side analytics even though not asked here)",
        "Reuse the existing Orders/sales table (seller_id, product_name, order_date, buyer_id or anonymous) as the source for \"what did this seller sell\" — don't duplicate sales data into the favorites table itself",
        "Build the dashboard query as a join: BuyerFavoriteSeller (filtered to this buyer) joined to Orders (filtered to the favorited seller_ids), sorted by order_date — this directly produces the requested \"sorted by day\" view without any new derived tables",
        "If the dashboard needs to be fast at read time and the join gets expensive at scale (millions of orders per seller), materialize a per-seller \"most recent items sold\" summary on a schedule, and have the dashboard read that summary joined against the favorites table instead of scanning full order history live",
      ],
      tradeoffs: [
        "A dedicated join table (correctly models many-to-many, one extra table and join) vs. a favSeller column on Buyer (the rejected approach — cannot represent multiple favorites without repeating columns, and requires a schema migration every time the max-favorites assumption changes) — the join table is the only approach that actually satisfies \"multiple favorite sellers per buyer\"",
        "Live join against full order history for the dashboard (always fresh, expensive at scale) vs. a periodically materialized per-seller sales summary (fast reads, dashboard data can lag by the refresh interval) — a summary table is worth it once a seller's order volume makes the live join slow, and the prompt's \"sorted by day\" framing suggests day-level freshness is already acceptable",
        "Storing favorites in the same relational store as orders (simpler, one system to operate) vs. a separate store optimized for this access pattern (only worth it at a scale this problem doesn't clearly demand) — staying relational is the right default answer here",
      ],
      followUps: [
        "How would you extend this so a buyer gets notified when a favorite seller lists a new item?",
        "How would the design change if \"favorite\" needed categories or tags (e.g. \"favorite for produce\" vs. \"favorite for bakery\")?",
        "How do you keep the dashboard fast for a buyer who has favorited thousands of sellers?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Indexing Deep Dive", href: "/foundations/database-indexing-deep-dive" },
        { label: "Foundations: SQL Deep Dive", href: "/foundations/sql-deep-dive" },
      ],
    },
  },
  {
    id: "amazon-mars-rover-update",
    company: "Amazon",
    title: "Deliver a software update file to a rover on Mars",
    prompt:
      "Design a system that sends an update file, whenever one becomes available, to a rover on Mars. No other functional or non-functional requirements were given beyond the problem statement itself.",
    category: "scenario-operational",
    tags: ["ota-rollout"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/post/5804312/amazon-hld-update-mars-rover-by-nsd14022-svdz/",
      reportedDate: "Sep 2024",
      confidence: "high",
    },
    context:
      "Reported as deliberately vague — no functional or non-functional requirements beyond the one-line prompt. The reported discussion converged on push vs. pull delivery, chunking the file for low bandwidth, retry mechanisms for missing chunks, corruption detection, and handling an update that has bugs, including a scenario where the rover can no longer communicate with Earth at all.",
    optimalAnswer: {
      clarifyingQuestions: [
        "(The prompt is intentionally bare — state and defend your own assumptions rather than waiting for these to be answered) Is there a direct link to the rover, or does traffic relay through one or more orbiting satellites?",
        "What's the realistic bandwidth and round-trip latency — Mars communication is measured in minutes one-way, not milliseconds",
        "Can the rover always at least receive (even if it can't always transmit back confirmation promptly)?",
      ],
      requirements: [
        "Deliver an update file to a single remote, low-bandwidth, high-latency, intermittently-reachable device",
        "Tolerate transmission corruption and partial/incomplete transfers",
        "Detect and recover from an update that has bugs after it's applied",
        "Function correctly even if the rover temporarily can't communicate with Earth at all",
      ],
      approach:
        "Treat this as a delay-and-disruption-tolerant networking problem rather than a normal internet file transfer — the defining constraints are minutes of one-way latency, severely limited bandwidth, and links that can drop entirely, so every mechanism has to assume messages arrive late, out of order, or not at all.",
      keyPoints: [
        "Model the path as a chain of store-and-forward hops (Earth source → Earth-orbiting relay → Mars-orbiting relay → rover), where each hop holds the file locally until the next hop is actually reachable — unlike terrestrial routers that forward immediately, each relay here must be able to hold data for potentially hours between contact windows",
        "Chunk the update file into small pieces sized for the available bandwidth, each with its own checksum — this lets the system retransmit only the specific corrupted or missing chunks instead of the entire file after a failed transfer",
        "The rover acknowledges received chunks back along the same relay chain when a contact window allows; unacknowledged chunks are queued for retransmission on the next window rather than assumed lost after a fixed short timeout, since round-trip confirmation can legitimately take a long time",
        "Verify a full-file checksum only after all chunks are confirmed received, before applying the update — catches any corruption that slipped past per-chunk checks (e.g. chunks correctly received but incorrectly reassembled)",
        "Apply updates through a two-stage activate mechanism: stage the new version alongside the current one, run a self-check/health check after switching, and automatically roll back to the last-known-good version if the health check fails or the rover misses its next scheduled check-in — since a human can't drive out and manually recover it",
        "If the rover can't communicate with Earth at all (the reported worst case), it must default to its last-known-good software autonomously rather than getting stuck waiting for a human decision that may not arrive for a long time",
      ],
      tradeoffs: [
        "Per-chunk checksum plus a final whole-file checksum (catches more failure modes, more overhead) vs. whole-file checksum only (simpler, but a single corrupted byte forces re-sending the entire file over an extremely constrained link) — per-chunk checking is worth the overhead specifically because bandwidth is the scarce resource here, and cheap re-transmission of small pieces is far better than re-sending everything",
        "Store-and-forward relays that hold data indefinitely until the next hop is reachable (resilient to long outages, needs real storage at each relay) vs. assuming near-continuous connectivity like a normal network (much simpler, but breaks the moment any hop is briefly unreachable, which is the normal case here, not the exception) — store-and-forward is the only realistic model for this link",
        "Autonomous rollback on a failed post-update health check (self-healing, no Earth round-trip needed) vs. requiring explicit human confirmation before rolling back (safer against a false-positive health check, but the round-trip delay could leave the rover in a broken state for a long time) — autonomous rollback is the safer default given how costly a lost rover would be versus an unnecessary rollback",
      ],
      followUps: [
        "How would you prioritize a critical security patch over a routine feature update if bandwidth for a contact window is limited?",
        "How do you validate the update actually improved something rather than just \"didn't crash\", given how limited a rover's self-diagnostics are?",
        "How would multiple rovers sharing the same relay infrastructure change your chunking/scheduling strategy?",
      ],
      relatedLinks: [
        { label: "Foundations: Circuit Breakers", href: "/foundations/circuit-breakers" },
        { label: "Build it: IoT Sensor Ingestion scenario", href: "/workshop?scenario=iot-sensor-ingestion" },
      ],
    },
  },
  {
    id: "amazon-rag-qa-system-bedrock",
    company: "Amazon",
    title: "Design a RAG Q&A system over millions of documents",
    prompt:
      "Design a retrieval-augmented generation (RAG) question-and-answer system for millions of documents and hundreds of thousands of users, with cost-aware model selection on Amazon Bedrock.",
    category: "ml-ai-system-design",
    tags: ["ai-ml-infra"],
    source: {
      name: "Exponent — Amazon Solutions Architect Interview Guide",
      url: "https://www.tryexponent.com/guides/amazon-solutions-architect-interview",
      confidence: "high",
    },
    context:
      "Reported as a recently-asked system design prompt in Amazon Solutions Architect loops, reflecting generative-AI architecture becoming a mainstream system design topic and a core expectation for GenAI/ML specialist roles specifically.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Are the millions of documents relatively static, or does the corpus update continuously (new documents added, old ones revised)?",
        "Is latency tolerance closer to interactive chat (seconds) or an async/batch report-generation use case?",
        "Does answer quality require citing specific source documents, or is a synthesized answer without attribution acceptable?",
        "What's the cost sensitivity — is this optimizing for lowest cost-per-query, or is quality the primary constraint with cost as a secondary concern?",
      ],
      requirements: [
        "Answer natural-language questions grounded in a corpus of millions of documents",
        "Serve hundreds of thousands of users with acceptable latency",
        "Retrieve relevant context before generation, rather than relying purely on a model's parametric knowledge",
        "Select models cost-consciously (via Amazon Bedrock) rather than defaulting to the largest/most expensive model for every query",
      ],
      approach:
        "Split the pipeline into an ingestion/indexing path that runs ahead of time and a query-time path that retrieves and generates — this separation is what lets the expensive parts (embedding millions of documents) happen once, while the per-query cost stays bounded by a small retrieved context window rather than the whole corpus.",
      keyPoints: [
        "Ingestion pipeline: chunk documents into retrieval-sized passages (overlapping windows to avoid splitting relevant context mid-thought), embed each chunk with an embedding model, and store the vectors in a vector database alongside the source text and document metadata",
        "Query-time flow: embed the incoming question with the same embedding model, retrieve the top-k most similar chunks from the vector store, then pass the question plus retrieved chunks as context to a generation model to produce the grounded answer",
        "Cost-aware model selection on Bedrock: route by query complexity — a cheaper, smaller model handles straightforward factual lookups where retrieved context is highly relevant, while a larger model is reserved for queries the smaller model scores as low-confidence or that need multi-document synthesis",
        "Cache embeddings and, where queries repeat (a FAQ-shaped workload), cache full question-to-answer pairs — avoids re-running retrieval and generation for identical or near-identical questions across hundreds of thousands of users",
        "Return source citations alongside the generated answer by keeping chunk-to-document provenance through the whole pipeline — critical for a system this size, since users need to verify a grounded answer rather than trust it blindly",
        "Handle corpus updates via incremental re-indexing (re-embed and upsert only changed/new documents) rather than a full corpus re-embed on every update — necessary once the corpus is in the millions",
        "Add a retrieval-quality guardrail: if the top retrieved chunks score below a relevance threshold, return \"insufficient information\" rather than letting the generation model hallucinate an answer from weak context",
      ],
      tradeoffs: [
        "A single large, high-quality model for every query (simplest, most expensive at hundreds-of-thousands-of-users scale) vs. complexity-based routing across multiple Bedrock model sizes (meaningfully cheaper, adds a routing/confidence-scoring step that itself needs tuning) — routing is the right call once cost-awareness is an explicit requirement, as it is here",
        "A managed vector database (fast to stand up, ongoing cost scales with corpus size) vs. self-hosted vector search (cheaper at very large scale, real operational burden) — managed is the reasonable default at \"millions of documents\", with self-hosting only worth naming as a later cost-optimization lever",
        "Retrieving a wider context window per query (better answer grounding, more tokens sent to the generation model and higher per-query cost) vs. a narrower top-k (cheaper, risks missing relevant context split across chunks) — tune k empirically against the retrieval-quality guardrail rather than picking one on principle",
      ],
      followUps: [
        "How would you detect and reduce hallucination when the retrieved context is technically relevant but insufficient to fully answer the question?",
        "How do you evaluate whether a cheaper Bedrock model is actually good enough for the queries it's being routed to, on an ongoing basis?",
        "How would this design change if the corpus contained sensitive documents requiring per-user access control on retrieval?",
      ],
      relatedLinks: [
        { label: "Foundations: Caching", href: "/foundations/caching" },
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
      ],
    },
  },
  {
    id: "amazon-region-failure-zero-data-loss",
    company: "Amazon",
    title: "Design a system that loses no data if an entire AWS region fails",
    prompt:
      "Design a system architecture that loses no data if an entire AWS region fails.",
    category: "system-design",
    tags: ["multi-region-failover"],
    source: {
      name: "Exponent — Amazon Solutions Architect Interview Guide",
      url: "https://www.tryexponent.com/guides/amazon-solutions-architect-interview",
      confidence: "high",
    },
    context:
      "Reported as a recently-asked question in the Amazon Solutions Architect system design round, which the guide describes as an open-ended conversational round where the interviewer keeps layering on requirements and pressing for trade-off justification rather than accepting a diagram at face value.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is \"zero data loss\" a hard requirement (RPO = 0) or is a very small, bounded loss window acceptable in exchange for lower cost/latency?",
        "Does the system also need to stay available during a region failure (RTO near-zero), or is it acceptable to fail over with some downtime as long as no data is lost?",
        "What's the write volume and write latency sensitivity — this determines whether synchronous cross-region replication is even feasible without unacceptable latency?",
      ],
      requirements: [
        "Zero data loss (RPO = 0) if an entire AWS region becomes unavailable",
        "Reasonable write latency for the application's normal operation",
        "A clear, testable failover process to a surviving region",
        "Cost and complexity that's justified by the stated durability requirement, not overbuilt beyond it",
      ],
      approach:
        "RPO = 0 across a full region failure is only achievable by making a write durable in a second region before acknowledging it to the client — so the core design decision is synchronous cross-region replication on the write path, with everything else (topology, failover, cost controls) built around absorbing that latency cost.",
      keyPoints: [
        "Every write is synchronously replicated to at least one other AWS region before being acknowledged as successful — this is the only way to guarantee zero loss if the primary region disappears entirely, since anything replicated asynchronously has a window of unreplicated data that a sudden regional outage would lose",
        "Use a multi-region active-passive (or active-active, if the data model supports it) database configuration with synchronous replication for the specific writes that require RPO = 0 — not necessarily the entire system, since synchronous cross-region replication adds real latency and should be scoped to the data that actually needs it",
        "Layer in multi-AZ replication within each region as the first line of defense (handles the far more common single-AZ failure cheaply and with low latency), with cross-region synchronous replication specifically as the region-level guarantee — most failures are AZ-level, not region-level, and the design should be cheap for the common case",
        "Route traffic via a global load-balancing/DNS layer that can redirect to the secondary region on a detected regional failure, decoupling \"data safety\" (already guaranteed by synchronous replication) from \"application availability\" (a separate concern requiring compute failover, not just data failover)",
        "For write-heavy or latency-sensitive workloads where full synchronous cross-region replication is too costly, scope the zero-data-loss guarantee to a critical subset of data (e.g. financial transaction records) with synchronous replication, while less critical data uses async replication with a small, explicitly accepted RPO",
        "Regularly test actual regional failover (not just replication health) — a replication pipeline that looks healthy in metrics but has never been failed over in practice is a common source of surprise data loss during a real incident",
      ],
      tradeoffs: [
        "Synchronous cross-region replication (true RPO = 0, meaningfully higher write latency due to the cross-region round-trip) vs. asynchronous replication (much lower write latency, a real data-loss window if the region fails before replication catches up) — synchronous is the only option that actually satisfies this prompt's stated requirement, and that latency cost has to be named explicitly, not hidden",
        "Active-active multi-region (no failover step needed, writes accepted in both regions, harder to keep consistent without conflict resolution) vs. active-passive (simpler consistency model, requires an explicit failover trigger and process) — active-passive is the more defensible default answer unless the interviewer's follow-ups push toward needing zero-downtime writes during a failure, not just zero data loss",
        "Guaranteeing RPO = 0 for the entire system vs. scoping it to the subset of data that truly requires it — blanket synchronous replication is the safest verbal answer but is honest to flag as expensive; a scoped approach shows more mature cost-vs-durability trade-off thinking, which the guide notes Amazon interviewers explicitly reward",
      ],
      followUps: [
        "How does your design change if the requirement is zero data loss and near-zero downtime (RTO near 0, not just RPO = 0)?",
        "What's the cost delta between this design and one that accepts a 5-minute RPO, and how would you justify that cost to a customer?",
        "How do you handle a split-brain scenario if the \"failed\" region actually comes back online mid-failover?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Replication", href: "/foundations/database-replication" },
        { label: "Foundations: Load Balancers", href: "/foundations/load-balancers" },
      ],
    },
  },
  {
    id: "amazon-ecommerce-black-friday-surge",
    company: "Amazon",
    title: "Design an ecommerce platform that survives a Black Friday surge",
    prompt:
      "Design an ecommerce platform architecture that stays up through a Black Friday traffic surge.",
    category: "system-design",
    tags: ["capacity-scaling"],
    source: {
      name: "Exponent — Amazon Solutions Architect Interview Guide",
      url: "https://www.tryexponent.com/guides/amazon-solutions-architect-interview",
      confidence: "high",
    },
    context:
      "Reported as a recently-asked Amazon Solutions Architect system design question. The guide notes this round is conversational and open-ended, with the interviewer continuously adding functional and non-functional requirements rather than letting the candidate settle on one static diagram.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is the surge roughly predictable (a known sale start time) or does it need to handle organic, unpredictable spikes too?",
        "What's the acceptable behavior under overload — degrade gracefully (e.g. simplified pages, queued checkout) or hold the line on full functionality until capacity runs out?",
        "Which parts of the flow are most latency/availability-critical — product browsing, cart, checkout, or all equally?",
        "Roughly what surge multiplier are we planning for relative to normal traffic?",
      ],
      requirements: [
        "Stay available through a large, known-in-advance traffic surge (Black Friday)",
        "Protect the checkout/payment path specifically, since that's where a failure directly costs revenue",
        "Scale compute ahead of and during the surge without manual, reactive firefighting",
        "Avoid a single overloaded component taking down the whole platform",
      ],
      approach:
        "Because the surge is a known, scheduled event rather than a surprise, the design should lean on proactive pre-scaling and traffic shaping, not just reactive auto-scaling — and it should isolate the checkout path so that even under extreme browsing load, purchases can still complete.",
      keyPoints: [
        "Put a CDN in front of static and semi-static content (product images, category pages, largely-unchanging product descriptions) so the surge in raw traffic never reaches application servers for content that doesn't need to be computed per-request",
        "Cache frequently-read, infrequently-changed data (product catalog, prices outside of flash-sale windows) aggressively at an application cache layer in front of the database, since Black Friday's read volume is overwhelmingly browsing, not writing",
        "Pre-scale compute capacity ahead of the known surge start time rather than relying purely on reactive auto-scaling, which can lag behind a traffic cliff-edge at the exact moment a sale opens; use auto-scaling as backup for the parts of the surge that are still unpredictable",
        "Architecturally isolate the checkout/payment path from the browsing path — separate service tier, separate database connection pool, possibly separate infrastructure entirely — so a flood of browsing traffic degrading page-load times doesn't also degrade the ability of users already in checkout to complete their purchase",
        "Use a message queue to decouple order placement from order processing: accept and durably record the order quickly, then process fulfillment/inventory-decrement/confirmation-email asynchronously — this keeps the customer-facing checkout latency low even if downstream processing is temporarily backlogged",
        "Apply load shedding and rate limiting at the edge for non-critical traffic (e.g. aggressive bot/scraper traffic, which spikes heavily around known sale times) so it doesn't compete for capacity with real customers",
        "Load-test at the actual expected surge multiplier well before the event — Black Friday capacity planning is one of the few cases where the load pattern is largely predictable, so failing to rehearse it is a self-inflicted risk",
      ],
      tradeoffs: [
        "Pre-scaling ahead of a known surge (avoids the lag of reactive scaling, costs money for capacity that may go partly unused if the surge undershoots forecast) vs. relying purely on auto-scaling (cheaper on average, risks a capacity gap in the critical first minutes of the surge) — pre-scaling is the right call specifically because Black Friday's timing is known in advance, unlike a generic unpredictable spike",
        "Isolating checkout onto separate infrastructure from browsing (protects revenue-critical path, more infrastructure to manage and keep in sync) vs. a single shared tier for the whole site (simpler, but a browsing-traffic overload can take down checkout too) — isolation is worth the added complexity given how directly checkout failures translate to lost revenue",
        "Async order processing via a queue (keeps checkout latency low, introduces eventual consistency between \"order placed\" and \"order fully processed\") vs. fully synchronous order processing (simpler mental model, ties checkout latency directly to the slowest downstream step) — async wins decisively at Black Friday scale",
      ],
      followUps: [
        "What happens if the message queue backs up faster than order processing can drain it during peak surge?",
        "How would you handle inventory oversell risk if checkout is decoupled from real-time inventory decrement?",
        "How do you distinguish a legitimate traffic spike from a bot-driven scraping surge in real time, and rate-limit accordingly?",
      ],
      relatedLinks: [
        { label: "Foundations: Load Balancers", href: "/foundations/load-balancers" },
        { label: "Build it: Flash Sale scenario", href: "/workshop?scenario=flash-sale" },
      ],
    },
  },
  {
    id: "amazon-genai-fluency-production-incident",
    company: "Amazon",
    title: "Resolve a critical production incident within one hour, with AI tools allowed",
    prompt:
      "A critical production issue needs to be resolved within one hour. You're allowed to use AI tools to help. Walk through your prioritization and debugging strategy, how you'd use monitoring and logs, and how you'd use AI effectively without over-relying on it.",
    category: "scenario-operational",
    tags: ["incident-response"],
    level: "SDE-1, GenAI Fluency round (Round 3 of onsite loop)",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/post/8029194/",
      reportedDate: "Apr 2026",
      confidence: "high",
    },
    context:
      "Reported as part of a hiring-manager round that also covered a project deep-dive and a LeetCode Hard problem, following a hard 1-hour SLA framing. The reported discussion covered prioritization/debugging strategy, use of monitoring and logs, and how to use AI without over-relying on it — evaluated alongside decision-making under pressure. This is Amazon's newer \"GenAI Fluency\" round, a distinct format from a standard coding or design round.",
    optimalAnswer: {
      clarifyingQuestions: [
        "(A live incident scenario — narrate a systematic process rather than asking the interviewer to hand you the root cause) What's the actual symptom — error rate, latency, full outage — and since when?",
        "What monitoring/observability tooling is realistically available (metrics dashboards, centralized logs, tracing)?",
        "Is there a known-good previous state to roll back to, and how quickly could a rollback be executed if needed?",
      ],
      requirements: [
        "Restore the service within a hard one-hour deadline",
        "Use a systematic, explainable debugging process rather than guessing",
        "Demonstrate effective, bounded use of AI tools as an accelerant, not a replacement for judgment",
        "Show clear prioritization under time pressure",
      ],
      approach:
        "With a hard one-hour ceiling, prioritize mitigation over full root-cause analysis: get the immediate blast radius contained fast using the fastest reliable lever available (rollback, feature flag, traffic shift), then spend remaining time on root cause only once the bleeding has stopped.",
      keyPoints: [
        "First few minutes: confirm scope and severity from monitoring dashboards (error rate, latency percentiles, affected regions/traffic %) rather than acting on a single anecdotal report — this sets what \"resolved\" actually means within the hour",
        "Check what changed recently — a deploy, a config push, a feature flag flip, an infrastructure change — correlated against when the symptom started; a very large fraction of production incidents trace back to something that changed shortly before",
        "If a recent deploy correlates with the incident start, prioritize rollback over forward-fixing — a rollback is almost always faster and lower-risk than diagnosing and patching under a one-hour deadline, and mitigates impact immediately while investigation continues in parallel",
        "Use AI tools specifically for the parts they accelerate well under time pressure: summarizing/searching a large volume of logs for anomalies, generating hypotheses to check against the metrics, or quickly drafting a rollback/mitigation script — while keeping the actual decision of what action to take under human judgment, since blindly executing an AI-suggested fix against live production is its own risk",
        "State explicitly where you would NOT rely on AI unsupervised: directly applying an AI-generated fix straight to production without review, or trusting an AI's root-cause guess as fact without corroborating it against actual metrics/logs — this is the \"without over-relying on it\" half of the prompt, and naming the boundary is itself the signal being evaluated",
        "Once mitigated, use the remaining time (if any) for a lightweight root-cause pass, and explicitly flag what's deferred to a full post-incident review rather than trying to complete a deep investigation inside the same hour",
        "Communicate status at intervals (what's known, what's mitigated, what's still open) rather than going silent until the full hour is up — reflects real on-call practice, not just technical debugging",
      ],
      tradeoffs: [
        "Rolling back immediately on strong correlation with a recent deploy (fast, might occasionally roll back something unrelated to the real cause) vs. fully confirming root cause before acting (more certain, risks blowing the one-hour deadline while impact continues) — rollback-first is the right call under a hard deadline, since the cost of a wrong-but-safe rollback is far lower than continued customer impact",
        "Using AI to accelerate log analysis and hypothesis generation (faster triage, requires verifying its output against real data) vs. avoiding AI tools entirely under incident pressure (safer in the narrow sense, slower, and doesn't answer what the round is actually testing) — the round explicitly permits and expects AI use, so the differentiator is disciplined verification, not avoidance",
        "Fixing forward with a targeted patch (addresses the actual root cause immediately) vs. rolling back and root-causing later (faster mitigation, defers the real fix) — rolling back first and root-causing after is generally the safer choice specifically because the deadline is measured in minutes, not hours",
      ],
      followUps: [
        "The AI tool confidently suggests a root cause that turns out to be wrong when you check the metrics — how does that change how you use it going forward in the same incident?",
        "The deploy-correlation lead turns out to be a false trail — what's your next line of investigation?",
        "How would your approach differ if this were a real page at 2am with no time pressure conversation, just you and the alert?",
      ],
      relatedLinks: [
        { label: "Foundations: Circuit Breakers", href: "/foundations/circuit-breakers" },
        { label: "Build it: Checkout Timeout Mystery scenario", href: "/workshop?scenario=checkout-timeout-mystery" },
      ],
    },
  },
  {
    id: "amazon-dream11-leaderboard-100k-teams",
    company: "Amazon",
    title: "Design a fantasy-sports leaderboard for 100,000 registered teams",
    prompt: "Design the leaderboard for Dream11-style fantasy gaming with 100,000 registered teams.",
    category: "system-design",
    tags: ["top-k-streaming"],
    source: {
      name: "Exponent question DB",
      url: "https://www.tryexponent.com/questions?company=amazon&type=system-design",
      reportedDate: "~2024",
      confidence: "high",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "How often do scores actually change — continuously during a live match, or in discrete scoring events (a wicket, a goal)?",
        "Does the leaderboard need a live global rank for every team, or just the top N plus a team's own rank?",
        "Is there one leaderboard per contest/match, or a running season-long leaderboard across many matches?",
      ],
      requirements: [
        "Rank 100,000 teams by score, updated as underlying match events occur",
        "Serve \"top N\" and \"my team's current rank\" queries with low latency during a live match",
        "Handle a burst of near-simultaneous score updates when a single match event (e.g. a wicket) affects many teams' scores at once",
      ],
      approach:
        "Model this as a real-time ranking problem over a bounded, known-size set (100,000 is small enough to rank entirely in memory) — the interesting design work is in efficiently updating ranks on a burst of simultaneous score changes, not in the storage of the scores themselves.",
      keyPoints: [
        "Hold live scores and ranks in an in-memory sorted structure (e.g. a sorted set keyed by score) rather than recomputing ranks from a database on every query — 100,000 entries fits comfortably in memory, making rank lookups and top-N queries cheap",
        "A single match event (a player scores) triggers a fan-out: identify every team whose roster includes that player, recompute their score delta, and update their position in the sorted structure — batch these updates per event rather than processing them one team at a time to absorb the burst efficiently",
        "Serve \"my rank\" queries directly from the sorted structure's rank-lookup operation rather than scanning the full list — this needs to stay fast even as thousands of teams query their rank simultaneously right after a scoring event",
        "Push top-N leaderboard updates to connected clients via a WebSocket/push channel rather than having every client poll — reduces read load on the ranking store during the highest-traffic moments (right after a big scoring event, when everyone checks the leaderboard at once)",
        "Persist scores to durable storage asynchronously behind the in-memory live structure, so a live-ranking-node failure doesn't lose contest results — the in-memory structure is a performance layer, not the system of record",
        "Partition by contest/match if the platform runs many concurrent contests, so one match's scoring burst doesn't compete for the same in-memory structure as an unrelated contest's traffic",
      ],
      tradeoffs: [
        "In-memory sorted structure for live ranking (fast, needs a durable backing store and a recovery plan) vs. computing ranks via a database query on each request (durable by default, far too slow for live rank lookups during bursty scoring) — in-memory wins decisively for the live-leaderboard requirement, with the database as the async system of record",
        "Push-based leaderboard updates to clients (lower server read load, more connection state to manage) vs. client polling (simpler server model, hammers the ranking store exactly when it's under the most load) — push is the better fit given the described burst pattern",
        "Recomputing full ranks on every score change (always exactly correct, more work per update) vs. an approximate/eventually-consistent rank that briefly lags during a burst (cheaper, a team's displayed rank might be stale for a few seconds) — exact recomputation is feasible at only 100,000 teams, so there's little reason to trade correctness away here",
      ],
      followUps: [
        "How would this design change at 100 million teams instead of 100,000, where an in-memory full ranking no longer fits on one node?",
        "How do you handle a scoring correction after the fact (a stat gets revised) without a full leaderboard recompute?",
        "How would you detect and prevent leaderboard manipulation (e.g. a client spoofing its own rank)?",
      ],
      relatedLinks: [
        { label: "Build it: Global Leaderboard Updates scenario", href: "/workshop?scenario=global-leaderboard-updates" },
        { label: "Foundations: Caching", href: "/foundations/caching" },
      ],
    },
  },
  {
    id: "amazon-monitoring-1000-web-servers",
    company: "Amazon",
    title: "Design a monitoring system for 1,000 web servers",
    prompt: "Design a monitoring system for 1,000 web servers.",
    category: "system-design",
    tags: ["metrics-observability"],
    source: {
      name: "Exponent question DB",
      url: "https://www.tryexponent.com/questions?company=amazon&type=system-design",
      reportedDate: "~2024",
      confidence: "high",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "What signals matter most — infrastructure metrics (CPU, memory, disk), application metrics (request rate, error rate, latency), or both?",
        "What's the acceptable detection delay — near-real-time alerting, or is a minute or two of lag acceptable?",
        "Do we also need centralized log aggregation, or is this scoped to numeric metrics and alerting only?",
      ],
      requirements: [
        "Collect health/performance metrics from 1,000 servers continuously",
        "Detect problems (a server down, an error-rate spike, resource exhaustion) and alert quickly",
        "Provide a dashboard view across the fleet, not just per-server",
        "Scale metric ingestion without the monitoring system itself becoming a fleet-wide bottleneck",
      ],
      approach:
        "Separate the pipeline into three stages — lightweight per-server collection, centralized ingestion/aggregation, and alerting/visualization — so the monitoring system's own load stays proportional to the number of metrics, not tangled up with the serving traffic of the servers it's watching.",
      keyPoints: [
        "A lightweight agent on each of the 1,000 servers periodically collects local metrics (CPU, memory, disk, request rate, error rate, latency) and pushes them to a central collector, rather than the collector polling every server (push scales better as fleet size grows, since each server independently controls its own reporting cadence)",
        "Metrics flow through an ingestion buffer (a message queue) before landing in a time-series database — this absorbs bursts (e.g. all 1,000 agents reporting in the same tick) without dropping data or blocking agents",
        "Store metrics in a time-series database optimized for this exact write pattern (many small, timestamped numeric writes) and for range-query reads (dashboards, alert evaluation over a rolling window)",
        "An alerting engine evaluates rules against the incoming metric stream (e.g. \"error rate > 5% for 2 consecutive minutes\") and fires notifications — evaluate on the stream as data arrives rather than re-querying the full time-series store on a polling loop, to keep alert latency low",
        "Aggregate per-server metrics into fleet-level views (p50/p95/p99 latency across all 1,000 servers, count of servers currently unhealthy) for the dashboard, since an operator generally needs the fleet-wide picture first and drills into an individual server only after spotting an anomaly",
        "Downsample older metric data (keep full resolution for recent hours, roll up to coarser granularity for historical data) to bound storage growth, since dashboards rarely need second-level resolution from a month ago",
      ],
      tradeoffs: [
        "Agent-push model (scales naturally with fleet size, each server controls its own reporting) vs. a central poller pulling from each server (simpler mental model, the poller itself becomes a bottleneck and a single point of failure as fleet size grows) — push is the standard choice at this scale",
        "Streaming alert evaluation as metrics arrive (low alert latency, more complex to build) vs. periodically querying the time-series store for alert conditions (simpler, adds detection lag equal to the polling interval) — streaming evaluation is worth it specifically because alerting speed is the whole point of a monitoring system",
        "A dedicated time-series database (built for this exact read/write pattern) vs. a general-purpose relational database (familiar, but poorly suited to high-volume timestamped writes and range-scan reads at this ingestion rate) — a time-series-specific store is the right tool here",
      ],
      followUps: [
        "How would you avoid alert fatigue when a single root cause (e.g. a bad deploy) causes many servers to report the same underlying error simultaneously?",
        "How would the design change to also support centralized log search, not just numeric metrics?",
        "What happens if the ingestion buffer itself falls behind during a fleet-wide incident, right when alerting matters most?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
      ],
    },
  },
  {
    id: "amazon-emoji-messaging-eu-us-traffic-origin",
    company: "Amazon",
    title: "Scale an emoji-only messaging system for EU/US users and identify traffic origin",
    prompt:
      "How would you scale the design of a messaging system that only involves emojis, for users in Europe and the US? How would you identify the origin of traffic?",
    category: "system-design",
    tags: ["messaging-chat"],
    source: {
      name: "Exponent question DB",
      url: "https://www.tryexponent.com/questions?company=amazon&type=system-design",
      reportedDate: "~2025",
      confidence: "high",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "Is a message strictly a single emoji, or a short sequence of emojis?",
        "Is \"identify the origin of traffic\" about geographic routing/latency, or about abuse/fraud detection (bot traffic, spam)?",
        "Do EU and US users message each other, or are they effectively two separate regional populations?",
      ],
      requirements: [
        "Deliver emoji messages between users across two regions (EU and US) with low latency",
        "Scale independently as traffic grows in either region",
        "Identify where incoming traffic is actually originating from",
      ],
      approach:
        "The tiny, fixed-vocabulary payload (a message is just an emoji code, not free text) is the defining simplification here — it means the interesting design work is almost entirely in regional routing and traffic-origin identification, not in message storage or payload handling.",
      keyPoints: [
        "Deploy regional clusters (EU and US) each capable of handling local traffic independently, fronted by geo-DNS or an anycast routing layer that directs a user's connection to their nearest regional cluster by default — this is the direct answer to \"scale for EU and US users\"",
        "Because a message is just a small emoji identifier, encode it as a compact fixed-size code (not raw Unicode text) — this keeps per-message payload and storage overhead trivial even at very high message volume",
        "Cross-region messages (an EU user messaging a US user) route through a lightweight inter-region relay rather than every message unconditionally crossing regions — most traffic between two regional populations still tends to stay local, so this keeps the common case cheap",
        "Identify traffic origin at the network/connection layer: capture source IP at the load balancer or connection-accepting edge, resolve it to a geographic region via IP-geolocation, and tag every inbound connection/message with that origin — this is the literal answer to the second half of the prompt",
        "Use the identified origin both operationally (routing a user to their nearest regional cluster for latency) and defensively (flagging traffic whose claimed region doesn't match its actual IP-geolocation origin as a potential signal for spoofing, VPN abuse, or bot traffic)",
        "Rate-limit per identified origin (IP, or IP range) rather than per user account alone — a fixed-vocabulary, extremely lightweight message type like this is a classic spam/flood target, so origin-based rate limiting is a meaningful complement to per-account limits",
      ],
      tradeoffs: [
        "Geo-DNS/anycast routing to the nearest regional cluster (low latency for the common local-messaging case, added complexity for cross-region delivery) vs. one global cluster serving both regions (simpler, but EU users pay US latency and vice versa) — regional clustering wins given the prompt explicitly calls out two named regions",
        "IP-geolocation for origin identification (works without any client cooperation, can be spoofed via VPN/proxy) vs. trusting a client-reported region (simpler, trivially falsified) — IP-based origin detection is the more defensible answer, with the explicit caveat that it's a signal, not a guarantee",
        "Per-account rate limiting alone (simple, doesn't stop a single bad actor spinning up many accounts from one origin) vs. adding origin-based limiting on top (catches that pattern, risks false positives for many legitimate users behind a shared corporate/mobile-carrier IP) — layering both is the standard real-world answer",
      ],
      followUps: [
        "How would you detect a bot flooding random emojis at high volume from a single origin?",
        "How would the design change if emoji sequences (not single emojis) needed to be supported, with much higher payload variability?",
        "What happens to a user who's traveling and connects from a region other than where their account normally originates?",
      ],
      relatedLinks: [
        { label: "Foundations: CDN", href: "/foundations/cdn" },
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
      ],
    },
  },
  {
    id: "amazon-alexa-peloton-integration",
    company: "Amazon",
    title: "Design an Alexa integration for a connected fitness bike",
    prompt:
      "Design a system for an Alexa-enabled Peloton-style connected fitness bike. Define the APIs, the system architecture, and explain the various components.",
    category: "system-design",
    tags: ["iot-integration"],
    source: {
      name: "Exponent question DB",
      url: "https://www.tryexponent.com/questions?company=amazon&type=system-design",
      reportedDate: "~2022",
      confidence: "high",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "What voice actions are in scope — starting/pausing a class, adjusting resistance, querying stats — or the full breadth of what Alexa could theoretically control?",
        "Does the bike need to work (in a degraded mode) if internet connectivity drops mid-workout?",
        "Is live class streaming part of this design, or is that assumed to be handled by a separate video pipeline?",
      ],
      requirements: [
        "Voice commands via Alexa control the bike (start/pause a class, adjust resistance, report live stats)",
        "The bike reports live telemetry (cadence, resistance, output) that voice queries can read back",
        "Low enough latency that a voice command feels responsive during an active workout",
        "A defined API contract between the Alexa voice service, the bike's onboard system, and any backend service",
      ],
      approach:
        "Treat this as three cooperating systems — the Alexa voice pipeline, a cloud backend service, and the bike's onboard device — connected through a small, well-defined API surface, since the actual design challenge is the round-trip from spoken command to physical bike action and back.",
      keyPoints: [
        "Voice command flow: user speaks → Alexa's voice service converts speech to intent (e.g. \"IncreaseResistanceIntent\") → the associated skill backend translates the intent into a device command and calls a Device Control API against the specific bike's registered device ID",
        "Device Control API: authenticated endpoints like setResistance(deviceId, level), startClass(deviceId, classId), pauseClass(deviceId) — the skill backend is a thin translator from voice intent to this API, not where bike-control logic itself lives",
        "The bike maintains a persistent connection (e.g. MQTT over the internet connection it already has for streaming classes) to receive commands with low latency and to push live telemetry (cadence, resistance, output) upstream continuously",
        "A Telemetry/Stats API lets a voice query (\"Alexa, what's my current output?\") read the bike's latest reported stats from the backend rather than querying the bike directly on each request — the bike already streams telemetry continuously, so reads should hit that latest-known-state cache, not add a new live round-trip per query",
        "Device registration/pairing: the bike registers itself with a device identity service tied to the user's Amazon account at setup time, which is what lets a voice command on a shared Echo device resolve to the correct specific bike",
        "Degraded-connectivity handling: the bike buffers a small command queue and continues operating on locally-cached class/resistance data if the connection to the backend drops mid-session, syncing telemetry back once connectivity returns — a workout shouldn't hard-fail because of a brief network blip",
      ],
      tradeoffs: [
        "A persistent connection (MQTT-style) from bike to backend (low-latency command delivery, telemetry streams continuously) vs. the bike periodically polling for pending commands (simpler, adds latency proportional to the poll interval, which directly hurts voice-command responsiveness) — persistent connection is the right choice given the stated latency sensitivity",
        "Voice queries reading from a cached latest-telemetry snapshot (fast, technically a few seconds stale) vs. querying the bike live on every voice request (always fresh, adds a live round-trip and device-availability dependency to every stats query) — cached reads are the better trade-off since telemetry is already streaming continuously anyway",
        "Local command buffering during a connectivity drop (workout continues uninterrupted, added complexity to reconcile state on reconnect) vs. failing the command immediately if connectivity is down (simpler, but a mid-class network blip stops a live workout) — buffering is worth the complexity for a fitness product where mid-session interruption is a real user-facing failure",
      ],
      followUps: [
        "How would you handle two Echo devices in the same house both able to address the same bike — is there ambiguity, and how is it resolved?",
        "How would you extend this design to support live leaderboard stats shared across many riders in the same class in real time?",
        "What security model prevents an unauthorized voice command (or device) from controlling someone else's bike?",
      ],
      relatedLinks: [
        { label: "Foundations: REST APIs", href: "/foundations/rest-apis" },
        { label: "Build it: IoT Sensor Ingestion scenario", href: "/workshop?scenario=iot-sensor-ingestion" },
      ],
    },
  },
];
