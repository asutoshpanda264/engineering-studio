import type { InterviewQuestion } from "../types";

/**
 * Bloomberg — researched 2026-08-24, see `docs/interview_exp.md` for the full
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
 * Bloomberg's own public candidate-report trail is thinner than every prior
 * company in this tracker (Exponent's Bloomberg question DB returned zero
 * results for system-design across every role filter tried), and the
 * `claude-in-chrome` browser wasn't available this pass — every
 * LeetCode/Glassdoor source below is capped at "medium" confidence
 * (search-index snippet, not an independently reread full page) rather than
 * the "high" a browser session would normally allow for those domains.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a transcript
 * to memorize. These are authored by reasoning through each problem the way
 * a strong candidate would, not sourced from a specific candidate's actual
 * answer — unlike `prompt`/`context`, which are sourced and cited,
 * `optimalAnswer` is this app's own content.
 */
export const BLOOMBERG_QUESTIONS: InterviewQuestion[] = [
  {
    id: "bloomberg-multi-exchange-stock-price-topk",
    company: "Bloomberg",
    title: "Design a multi-exchange stock price aggregation system",
    prompt:
      "Design a system that pulls in stock information from 10 different stock exchanges tracking 100,000 stocks total. The system must service client requests for a given stock's price at each exchange it trades on, returned in sorted order, and must also be able to identify the top-K stocks by some measure (e.g. volume) throughout the trading day.",
    category: "system-design",
    tags: ["top-k-streaming"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/system-design/431712/Bloomberg-or-Design-a-system-to-give-prices-of-a-stock/",
      confidence: "medium",
      note: "Reached via search snippet, direct fetch 403'd (no browser session this pass). Independently corroborated by a second thread (\"Bloomberg Onsite System Design\") reporting the same multiple-exchanges-plus-top-K-stocks framing.",
    },
    context:
      "Two independently reported Bloomberg onsite threads describe the same shape of question — ingest per-exchange price data at scale and serve both point lookups and a top-K ranking from it — suggesting this is a recurring, not one-off, Bloomberg system-design prompt.",
    optimalAnswer: {
      clarifyingQuestions: [
        "How fast do prices actually change per exchange — every tick, or a bounded update rate?",
        "Does 'sorted order' mean sorted by price across the 10 exchanges for one stock, or something else?",
        "Is top-K by trading volume, price movement, or something else — and over what window (whole day so far, or a trailing window)?",
        "Do clients need push updates (subscribe and get notified), or is this pull-only (request a snapshot)?",
        "Is exact top-K required, or is an approximate/eventually-consistent ranking acceptable given the update rate?",
      ],
      requirements: [
        "Ingest a continuous price-update stream from 10 exchanges covering 100,000 stocks",
        "Serve a per-stock price lookup across all 10 exchanges, sorted, with low read latency",
        "Maintain a live top-K ranking (by volume or similar) queryable at any point during the trading day",
        "Handle the ingestion rate without falling behind — a stale top-K or price is a real correctness problem in a trading context",
        "Scale reads independently from the write-heavy ingestion path",
      ],
      approach:
        "Split into two paths off one ingestion stream: a per-stock, per-exchange price store optimized for point lookups, and a separate streaming aggregation path that maintains a live top-K structure — computing top-K by re-scanning all 100,000 stocks on every read would be far too slow for a live ranking, so it has to be maintained incrementally as updates arrive.",
      keyPoints: [
        "Ingestion: one connector per exchange normalizes that exchange's feed into a common (stockId, exchangeId, price, volume, timestamp) event, published onto a partitioned message bus (partitioned by stockId) so ingestion scales horizontally and a slow/bursty exchange doesn't block others",
        "Point-lookup path: an in-memory store (e.g. Redis hash keyed by stockId, holding each exchange's latest price) serves the 'price at each exchange, sorted' query in O(E log E) for E=10 exchanges — trivially fast since E is tiny and fixed",
        "Top-K path: maintain a live bounded structure (min-heap of size K, or a sorted set) updated incrementally on every relevant volume/price event rather than recomputed from scratch — an update either enters the current top-K (evicting the current minimum) or is a no-op for ranking purposes, an O(log K) operation per update instead of an O(N log N) full re-sort",
        "Decouple the top-K maintainer from the ingestion consumers via the same message bus, partitioned so that no single consumer needs global state for all 100,000 stocks — a common pattern is a two-stage aggregation: per-partition local top-K, merged periodically into a global top-K, trading a small staleness window for horizontal scalability",
        "Cache the current top-K result so repeated client reads don't re-touch the live structure directly — invalidate/refresh on every update rather than on every read",
        "Snapshot + replay for correctness: persist raw exchange events to a durable log so the aggregation state can be rebuilt if a consumer crashes, rather than trusting purely in-memory state",
      ],
      tradeoffs: [
        "Exact top-K (a coordinated global heap) vs. an approximate two-stage local-then-merged top-K — exact is correct at any instant but requires either a single bottleneck aggregator or expensive coordination; the two-stage approach scales horizontally at the cost of a small, bounded staleness window, which is the right trade at 100,000-stock scale",
        "Push (WebSocket/subscription) vs. pull (poll-based) delivery to clients — push keeps clients current with lower latency but adds connection-management complexity at scale; pull is simpler to operate but trades freshness for simplicity, and is fine if clients only need periodic snapshots rather than tick-by-tick updates",
        "In-memory-only price store vs. a persisted, replicated store — in-memory is fast but loses state on a crash; a persisted/replicated store (or an in-memory store with async persistence + a replay log) trades a bit of write latency for durability, which matters more here since these are financial prices, not disposable cache data",
      ],
      followUps: [
        "How would you handle one exchange's feed falling behind or going down — does the point-lookup response degrade gracefully or block?",
        "How would you extend top-K to be queryable over an arbitrary trailing window (last 5 minutes) instead of just 'so far today'?",
        "What changes if a client needs a guarantee that the price they see is never more than N milliseconds stale?",
      ],
      relatedLinks: [
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Build it: Trending Product Search scenario", href: "/workshop?scenario=trending-product-search" },
      ],
    },
  },
  {
    id: "bloomberg-stock-price-change-alert-window",
    company: "Bloomberg",
    title: "Design a stock price change alerting system",
    prompt:
      "Build a stock notification system that monitors the price of many companies in real time from a constant stream of (stockID, price, timestamp) ticks arriving roughly every millisecond. A user can subscribe to a company and receive an alert whenever that stock's price moves more than X% within a trailing Y-minute window, where X and Y are configurable per subscription.",
    category: "system-design",
    tags: ["notifications"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/968803/bloomberg-onsite-stock-change-notification-system/",
      confidence: "medium",
      note: "Reached via search snippet, direct fetch 403'd (no browser session this pass).",
    },
    context:
      "The reporter notes the interview's focus was specifically the algorithmic sliding-window-efficiency angle — the interviewer pushed on how to compute the rolling percentage change in both time- and space-efficient ways given the millisecond tick rate, more than on broad system architecture.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is X (percent threshold) and Y (window) fixed globally, or configurable per subscription — does that change how per-stock state is stored?",
        "Once an alert fires, should it re-fire immediately if the price keeps moving, or is there a cooldown/dedup requirement?",
        "How many distinct stocks and how many total subscriptions need to be supported concurrently?",
        "Does 'moves more than X%' mean vs. the window's starting price, or vs. any point within the window (i.e. max drawdown/rise)?",
      ],
      requirements: [
        "Ingest a per-stock tick stream at roughly millisecond granularity",
        "Support many concurrent per-user subscriptions, each with its own (stock, X%, Y-minute) parameters",
        "Detect a >X% move within a trailing Y-minute window efficiently — not by re-scanning raw ticks per check",
        "Deliver an alert with low latency once a threshold is crossed",
        "Scale to many stocks and many subscribers without per-tick cost growing with the number of subscriptions",
      ],
      approach:
        "Separate 'maintaining an efficient rolling window per stock' from 'matching per-user threshold subscriptions against that window' — the former should be shared work done once per stock regardless of how many users are watching it, the latter is a cheap comparison against already-summarized window state.",
      keyPoints: [
        "Per-stock, maintain a sliding-window structure (a deque of (price, timestamp) pairs, or fixed-size time buckets) that tracks the rolling min/max — or window-start price, depending on the exact definition — trimming ticks older than Y minutes as new ones arrive, so each tick is processed in amortized O(1)",
        "Compute the current window's percent change once per stock per update (not once per subscriber) — a single shared computation, not duplicated per user watching that stock",
        "Group subscriptions by stock (a map from stockId to a list of subscriber thresholds), so a stock's update fans out only to the subscribers actually watching it — most stocks have zero active subscribers at any moment, so this avoids wasted work on the vast majority of ticks",
        "If Y varies per subscription (not one global window), maintain the union of distinct windows needed per stock (e.g. bucket subscriptions into a small number of common window sizes) rather than one sliding window per individual subscriber, which wouldn't scale with subscriber count",
        "Alert delivery: push through the same async pipeline pattern as any fan-out notification system (queue-backed, decoupled from the ingestion hot path) so a slow delivery channel (email/push) never blocks tick processing",
        "Dedup/cooldown: once fired, suppress re-firing for the same subscription until the price re-crosses back under the threshold (a simple armed/disarmed flag per subscription) to avoid alert spam on a stock oscillating right at the boundary",
      ],
      tradeoffs: [
        "A deque-per-stock sliding window vs. fixed time-bucket aggregation — a deque gives exact rolling min/max at the cost of storing every tick in the window; fixed buckets (e.g. 1-second buckets) trade a small amount of precision for bounded memory per stock regardless of tick rate, which matters more as tick rate grows",
        "Recomputing percent-change per tick vs. only on-demand at query time — recomputing on every tick keeps alert latency low (the check is already done by the time a threshold is crossed) at the cost of constant background work; on-demand is cheaper per-tick but adds latency to alert delivery, which defeats the point of a real-time alert",
        "One shared window per stock vs. one per subscription — sharing is far cheaper at scale but only works cleanly if Y is drawn from a small set of common values; fully arbitrary per-subscriber Y values would need a different, more expensive design (e.g. one window per distinct Y value actually in use, not per subscriber)",
      ],
      followUps: [
        "How would this change if X and Y could be arbitrary per subscription rather than a handful of common values?",
        "How do you avoid an alert storm across all subscribers when a stock has a genuine flash crash?",
        "What happens if the tick stream for one stock briefly goes silent — does the window just go stale, or does that need explicit handling?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
        { label: "Build it: Price Alert Notifications scenario", href: "/workshop?scenario=price-alert-notifications" },
      ],
    },
  },
  {
    id: "bloomberg-stock-option-alert-new-grad-rejection",
    company: "Bloomberg",
    title: "Design a stock-option transaction alert system",
    prompt:
      "Design a system where users can create alerts on stock options, and the system raises an alert when a matching transaction occurs — for example, notify the user when an \"AAPL\" stock transaction happens for more than $100.",
    category: "system-design",
    tags: ["notifications"],
    level: "New Grad",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/1555003/bloomberg-system-design-new-grad-2022-rejection",
      reportedDate: "2022",
      confidence: "medium",
      note: "Reached via search snippet, direct fetch 403'd (no browser session this pass).",
    },
    context:
      "The candidate reports being surprised to receive a high-level-design question at all in a fresher/New Grad interview, and was ultimately rejected over this specific round — a reminder that Bloomberg's New Grad loop isn't guaranteed to be design-question-free, even when a candidate expects otherwise.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is a transaction a single trade event, or does it need to be aggregated (e.g. total daily volume) before the threshold check?",
        "Can one user have many alert rules across many symbols — what's the expected scale of rules vs. transaction volume?",
        "Should an alert fire once and disable itself, or keep firing every time the condition is met?",
        "Does 'more than $100' mean price per share, or total transaction value?",
      ],
      requirements: [
        "Let a user register an alert rule tied to a symbol and a threshold condition",
        "Evaluate every incoming transaction against all currently-registered rules for that symbol",
        "Notify the user promptly when a rule's condition is met",
        "Scale to many users, many rules, and a high-volume transaction stream without per-transaction cost growing linearly with total rule count across the whole system",
      ],
      approach:
        "This is a rule-matching-over-a-stream problem: index rules by the symbol they care about so each incoming transaction only needs to be checked against the (small) set of rules for its own symbol, not every rule in the system.",
      keyPoints: [
        "Store alert rules keyed by symbol (a map from symbol to a list of {userId, condition}) so a transaction for AAPL only ever touches AAPL's rule set, never the full rule table",
        "Transaction ingestion: consume the trade stream, look up the symbol's rule list, and evaluate each rule's condition (a simple threshold comparison here, but the interface should support more complex predicates without changing the ingestion path)",
        "Decouple matching from delivery: a match enqueues a notification event onto a separate queue/worker pool, so a slow notification channel (email/push) never backs up transaction ingestion",
        "Rule CRUD as a separate, low-volume path (add/remove/list a user's own rules) backed by a regular database — this path doesn't need the same throughput design as the hot transaction-matching path",
        "Partition the symbol-to-rules index by symbol so it can be sharded across matching workers as rule/transaction volume grows, the same shape as sharding any key-partitioned lookup table",
      ],
      tradeoffs: [
        "Per-symbol rule indexing vs. a flat rule table scanned per transaction — indexing by symbol is essential once rule count is nontrivial; a flat scan only works at toy scale and degrades linearly with total rules regardless of how few apply to any given symbol",
        "Synchronous matching-and-notify vs. decoupled matching plus async delivery — synchronous is simpler but ties transaction-ingestion latency to notification-channel latency; decoupling costs a queue and a bit of delivery delay but keeps the hot path fast and isolated from a flaky delivery provider",
        "One rule engine for all condition types vs. a simple threshold-only special case — a single flexible predicate interface costs a bit more design upfront but avoids having to redesign the matching path the first time a more complex rule type (e.g. percent change, not just an absolute threshold) is requested",
      ],
      followUps: [
        "How would you extend this to support more complex conditions (e.g. moving-average crossovers) without redesigning the matching path?",
        "What happens if a burst of transactions for one heavily-alerted symbol arrives faster than notification delivery can keep up?",
        "How do you avoid double-notifying a user if the same transaction is retried or duplicated upstream?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Build it: Price Alert Notifications scenario", href: "/workshop?scenario=price-alert-notifications" },
      ],
    },
  },
  {
    id: "bloomberg-terminal-stock-exchange-feed",
    company: "Bloomberg",
    title: "Design a system to feed live exchange data into the Bloomberg Terminal",
    prompt:
      "Build a system that takes data from a stock exchange and displays it on the Bloomberg Terminal.",
    category: "system-design",
    tags: ["fanout-feed"],
    level: "New Grad Software Engineer",
    source: {
      name: "Glassdoor",
      url: "https://www.glassdoor.com/Interview/-system-design-Build-a-system-that-takes-data-from-a-Stock-Exchange-and-displays-it-on-Bloomberg-Terminal-Code-Questions-QTN_4107656.htm",
      confidence: "medium",
      note: "Reached via search snippet, direct fetch 403'd (no browser session this pass).",
    },
    context:
      "The same reporter adds general framing about Bloomberg's interviews beyond this question: coding questions 'will not be from LeetCode, they will be complex in nature and will require you to think about the DS' — a reminder that even coding rounds lean toward original problems requiring real data-structure reasoning, not memorized patterns.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is this one exchange's feed, or does the design need to account for multiple exchanges from the start?",
        "What does 'the Terminal' need — a raw price ticker, or does it need derived views (charts, order-book depth)?",
        "How many concurrent Terminal sessions need to receive this feed, and do they need identical or personalized views?",
        "What's the acceptable end-to-end latency from an exchange event to it appearing on screen?",
      ],
      requirements: [
        "Ingest a real-time data feed from a stock exchange",
        "Normalize and process that feed into a form suitable for display",
        "Deliver updates to many concurrent Terminal client sessions with low latency",
        "Handle exchange feed bursts (e.g. market open) without falling behind or crashing downstream consumers",
      ],
      approach:
        "Treat this as a classic feed-handler pipeline: an ingestion layer that speaks the exchange's specific protocol, a normalization layer that converts it into an internal event format, and a fan-out layer that pushes updates to many subscribed Terminal sessions — keeping each stage independently scalable since ingestion, processing, and fan-out have very different load profiles.",
      keyPoints: [
        "Feed handler: a dedicated ingestion process per exchange connection, parsing that exchange's native protocol/format into a common internal event schema (symbol, price, volume, timestamp) — isolating exchange-specific parsing here means adding a new exchange later doesn't touch anything downstream",
        "Publish normalized events onto a partitioned message bus (partitioned by symbol) so downstream consumers scale horizontally and a burst on one symbol doesn't stall processing for others",
        "Maintain a latest-value cache per symbol (in-memory store) so a newly-opened Terminal session gets an immediate current snapshot rather than waiting for the next tick to arrive",
        "Fan-out layer: a gateway tier holding persistent connections (WebSocket-style) to Terminal sessions, subscribing each session only to the symbols it's actually displaying — avoids broadcasting every symbol's updates to every session",
        "Backpressure handling: if a Terminal session's connection is slow, the gateway should drop to sending only the latest value per symbol (coalescing) rather than queueing every intermediate tick — a stale-but-current price is more useful than a backlog of outdated ones",
        "End-to-end monitoring on ingestion-to-display latency specifically, since Bloomberg's whole value proposition here is timeliness — a silently-lagging feed is a much worse failure than a visibly-down one",
      ],
      tradeoffs: [
        "Push (persistent connection, server sends updates) vs. pull (Terminal polls for updates) — push gives much lower latency, which matters for a live-price product; pull is simpler to operate but adds polling-interval latency that's a real problem for a trading-adjacent display",
        "Per-symbol subscription filtering at the gateway vs. broadcasting the full feed to every session — filtering costs a bit of subscription-management complexity but avoids wasting bandwidth and client-side processing on symbols nobody's viewing; broadcasting is simpler but doesn't scale as the symbol universe grows",
        "Coalescing to latest-value-only under backpressure vs. queueing and eventually delivering every tick — coalescing accepts silently dropping intermediate values to stay current, the right trade for a live-price display; full delivery guarantees every tick is seen but risks the display falling further and further behind during a burst",
      ],
      followUps: [
        "How would you extend this to multiple exchanges feeding the same symbol, and reconcile which price is 'the' displayed price?",
        "What happens to a Terminal session's view during a brief exchange feed outage — stale data, an explicit gap indicator, or something else?",
        "How would you add a historical replay feature (show me this symbol's feed as of 2 hours ago) without redesigning the live path?",
      ],
      relatedLinks: [
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
        { label: "Foundations: CDN", href: "/foundations/cdn" },
        { label: "Foundations: Load Balancers", href: "/foundations/load-balancers" },
        { label: "Build it: Live Sports Scoreboard scenario", href: "/workshop?scenario=live-sports-scoreboard" },
      ],
    },
  },
  {
    id: "bloomberg-intern-market-data-fanout",
    company: "Bloomberg",
    title: "Fan out exchange trade data to multiple local applications",
    prompt:
      "An external data provider streams information about trades happening on a stock exchange into a program running on one machine. Design that program so that other applications, running as separate processes on the same machine, can request and receive data about specific stocks from it.",
    category: "system-design",
    tags: ["fanout-feed"],
    level: "Software Engineer Intern",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/1000668/bloomberg-london-software-engineer-intern-virtual-onsite-algo-system-design/",
      confidence: "medium",
      note: "Surfaced via a search-snippet summary of this thread's general area — the exact prompt's attribution to this specific thread (vs. a nearby reply/related thread) wasn't independently confirmed with a full page reread this pass (no browser session available). Treat this as the pass's weakest-attributed shipped source; worth reconfirming with a direct fetch when the browser tool is available again.",
    },
    context:
      "Reported as an intern-level virtual onsite system-design task, distinct from the exchange-facing questions asked of full-time candidates — the framing here is single-machine, inter-process data distribution rather than a distributed, multi-region system.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Do consuming applications need every trade event for a stock they care about, or just the latest value?",
        "Is a new consumer process expected to start after the data provider connection is already running, and if so, does it need historical/current state immediately?",
        "How many distinct stocks and how many concurrent consumer processes need to be supported on one machine?",
        "Is low latency between an exchange trade and a consumer seeing it a hard requirement, or is some buffering acceptable?",
      ],
      requirements: [
        "Receive a continuous trade-data stream from one external provider into a single process",
        "Let other, independent processes on the same machine request/subscribe to specific stocks' data",
        "Support multiple concurrent consumer processes without one slow consumer blocking others",
        "Keep inter-process data delivery fast, since this is all local (no network hop needed)",
      ],
      approach:
        "This is a single-machine pub/sub problem: one process owns the external connection and acts as the source of truth, and consumer processes subscribe to just the symbols they care about via a local IPC mechanism — the design should avoid making every consumer independently connect to the external provider, since that duplicates external connections and any provider-side rate limits or costs.",
      keyPoints: [
        "One dedicated process (the 'hub') owns the connection to the external data provider and is the only process that talks to it — this centralizes rate-limiting/reconnection logic and avoids N consumers each needing their own connection",
        "The hub maintains an in-memory per-stock latest-value table plus a lightweight local IPC server (Unix domain sockets or shared memory on one machine — much lower overhead than a network socket since everything's local)",
        "Consumer processes connect to the hub and subscribe to specific stock symbols; the hub only forwards updates for symbols a given consumer has subscribed to, not the full stream",
        "On a new consumer's subscription, immediately send it the current latest-value snapshot for its requested symbols (from the in-memory table) before streaming live updates, so it isn't stuck waiting for the next external tick to get initial state",
        "Isolate a slow or unresponsive consumer: give each consumer connection its own outbound buffer, and drop/coalesce to latest-value-only for that specific consumer if its buffer backs up, rather than letting one slow consumer's IPC channel block the hub's processing of new external ticks",
        "Design the hub-consumer protocol so a consumer can be added or removed without restarting the hub or affecting other consumers — this is what makes it a real reusable local pub/sub layer rather than a point-to-point pipe",
      ],
      tradeoffs: [
        "One centralized hub process vs. every consumer independently connecting to the external provider — centralizing avoids duplicated external connections/rate-limit exposure and is simpler to keep consistent, at the cost of the hub itself becoming a single point of failure for all local consumers",
        "Push (hub streams updates to subscribed consumers) vs. pull (consumers poll the hub) — push gives lower latency, appropriate here since the whole point is receiving live trade data promptly; pull is simpler to implement but adds polling-interval latency for no real benefit on a single machine",
        "Per-consumer backpressure isolation vs. a single shared broadcast channel — per-consumer isolation costs a bit more implementation complexity (separate buffers/threads per consumer) but prevents one badly-behaved consumer from degrading service to every other consumer, which matters once there's more than a couple of them",
      ],
      followUps: [
        "How would this design change if consumers needed to run on a different machine, not just a different process on the same one?",
        "What happens if the hub process itself crashes and restarts — do consumers need to resubscribe, and does the latest-value table need to be persisted?",
        "How would you add a new stock symbol to the feed without restarting the hub or any connected consumer?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Client-Server Architecture", href: "/foundations/client-server-architecture" },
        { label: "Build it: IoT Sensor Ingestion scenario", href: "/workshop?scenario=iot-sensor-ingestion" },
      ],
    },
  },
  {
    id: "bloomberg-underground-system-subway-tracker",
    company: "Bloomberg",
    title: "Design an underground/subway check-in check-out tracking system",
    prompt:
      "Design an underground railway system that keeps track of customer travel times between different stations. Implement three operations: checkIn(id, stationName, t) when a customer taps in; checkOut(id, stationName, t) when the same customer taps out; and getAverageTime(startStation, endStation) which returns the average travel time between two stations across all completed trips recorded so far.",
    category: "lld-ood",
    tags: ["geospatial-tracking"],
    level: "Onsite / Phone screen",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/925625/bloomberg-onsite-valid-anagram-design-underground-system",
      confidence: "medium",
      note: "Reached via search snippet, direct fetch 403'd (no browser session this pass). Independently reported across at least 3 more Bloomberg-tagged threads this pass (a phone-round report, a 2022 New Grad full-loop writeup pairing it with Meeting Rooms II, and a Phone+Onsite report pairing it with Count and Say plus a bonus no-coding OOD question) — a genuinely recurring Bloomberg question, not a one-off.",
    },
    context:
      "One reporting candidate's approach: two hash maps (one tracking in-progress trips by customer id, one accumulating total-time-and-count per station pair), first computing average time in O(N) per call, then optimizing to O(1) by maintaining a running sum and count incrementally instead of recomputing from stored trip records on every query.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Can a customer check in again before checking out (double tap-in), or is that guaranteed not to happen by the caller?",
        "Does getAverageTime ever get called for a station pair with zero recorded trips — what should it return?",
        "Are check-in/check-out timestamps guaranteed monotonically increasing per customer, or could they arrive out of order?",
        "Is this meant to stay single-process, or does it need to be discussed as a distributed system given real subway/Terminal scale?",
      ],
      requirements: [
        "checkIn(id, stationName, t): record that customer id tapped in at stationName at time t",
        "checkOut(id, stationName, t): record that customer id (previously checked in) tapped out at stationName at time t, completing a trip",
        "getAverageTime(startStation, endStation): return the average travel time across every completed trip recorded between those two stations",
        "All three operations should be efficient — ideally O(1) — since this needs to handle high check-in/check-out volume",
      ],
      approach:
        "Use one hash map to hold each customer's in-progress trip (set on checkIn, consumed and cleared on checkOut) and a second hash map keyed by (startStation, endStation) holding a running (totalTime, tripCount) pair, updated incrementally on every checkOut — this avoids ever storing or re-scanning the full trip history just to answer an average query.",
      keyPoints: [
        "checkIn: store {stationName, t} in a map keyed by customer id — O(1)",
        "checkOut: look up and remove the customer's in-progress entry, compute travelTime = t - startTime, then increment totalTime and tripCount for the (startStation, endStation) key in the second map — O(1), no need to store the individual trip afterward",
        "getAverageTime: look up (startStation, endStation) in the second map and return totalTime / tripCount directly — O(1), not a scan over historical trips",
        "This is the same 'maintain a running aggregate instead of raw history' pattern that shows up anywhere an average/count needs to be queried repeatedly over an append-only stream — recomputing from scratch on every read is the naive version worth mentioning and then improving past",
        "Edge case handling: decide and state explicitly what checkIn does if the customer already has an in-progress trip (overwrite vs. reject), and what getAverageTime returns for a station pair with zero trips (0, an error, or a sentinel) — these are the kind of small-but-real decisions an interviewer is listening for",
      ],
      tradeoffs: [
        "Storing every individual trip vs. a running (totalTime, count) aggregate per station pair — storing every trip supports later features (median, percentiles, a specific customer's trip history) at the cost of unbounded memory growth; the aggregate-only approach is O(1) and memory-bounded but can only ever answer a mean, not richer statistics, unless redesigned",
        "Recomputing average on every query vs. maintaining it incrementally — incremental maintenance (the O(1) approach) is strictly better here since there's no reason to defer the cheap running-sum update; recomputing is only reasonable if writes vastly outnumber reads by an extreme margin, which isn't the case for a live-queried metric like this",
        "One global hash map keyed by (station, station) vs. a per-station-pair object created lazily — a flat hash map is simpler and matches the O(1) requirement directly; a more object-oriented per-pair structure could hold richer stats later, at the cost of more upfront class design for a feature not yet asked for",
      ],
      followUps: [
        "How would you extend this to support median travel time, not just average, without breaking O(1) checkOut?",
        "How would you handle a customer who checks in but never checks out — should that trip eventually be discarded, and after how long?",
        "How would this design change if it needed to serve many stations/customers across a distributed, multi-node deployment rather than one process?",
      ],
      relatedLinks: [
        { label: "LLD: LLD Interview Approach", href: "/lld/lld-interview-approach" },
        { label: "LLD: OOP Fundamentals", href: "/lld/oop-fundamentals" },
        { label: "Foundations: What Is System Design", href: "/foundations/what-is-system-design" },
      ],
    },
  },
];
