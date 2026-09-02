import type { InterviewQuestion } from "../types";

/**
 * Netflix — researched 2026-08-24, see `docs/interview_exp.md` for the full
 * research log and complete research catalog (Exponent's 5-item Netflix
 * question DB, Netflix's own dedicated system-design/SWE/MLE Exponent
 * guides, and two LeetCode Discuss threads reread in full). Same ship bar
 * as `google.ts`/`meta.ts`/`amazon.ts`/`microsoft.ts`/`apple.ts`: only
 * questions with a real, answerable prompt — concrete numbers, explicit
 * constraints, a multi-part ask, or an actual narrative — make it in here.
 *
 * Netflix's own hiring guidance (confirmed independently across every
 * source reread this pass) is unusually explicit and consistent: there is
 * no shared question bank at all. Each hiring team designs its own system
 * design prompt around its actual work, the round is a verbal, often
 * whiteboard-free conversation rather than a structured framework
 * exercise, and Netflix is candid that domain fluency can outweigh
 * technical polish. That shows up directly in the size and shape of this
 * company's public research trail: a noticeably smaller total catalog than
 * Google/Meta/Amazon/Microsoft (Netflix simply doesn't have a large bank of
 * bare "Design X." DB entries to draw from), but a higher proportion of
 * what does exist is a genuine, narrative, ship-worthy question — because
 * the sources that do exist (Netflix's own dedicated Exponent guides) skew
 * toward named-team, named-constraint anecdotes rather than a title-only
 * question database.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a transcript
 * to memorize. These are authored by reasoning through each problem the way
 * a strong candidate would, not sourced from a specific candidate's actual
 * answer — unlike `prompt`/`context`, which are sourced and cited,
 * `optimalAnswer` is this app's own content.
 */
export const NETFLIX_QUESTIONS: InterviewQuestion[] = [
  {
    id: "netflix-dynamic-recommendation-system",
    company: "Netflix",
    title: "Design a dynamic recommendation system for the Netflix home screen",
    prompt:
      "After you open the Netflix app and select a viewing profile, Netflix displays a collection of recommended titles organized into categories. These categories and titles are dynamic recommendations tailored to the individual viewing profile. How would you design a dynamic recommendation system for Netflix?",
    category: "ml-ai-system-design",
    tags: ["recommendation-ranking"],
    level: "Software Engineer, L4/L5",
    source: {
      name: "Exponent — Netflix System Design Interview (2026 Guide)",
      url: "https://www.tryexponent.com/blog/netflix-system-design-interview",
      reportedDate: "~2026 (guide last updated 3 months ago)",
      confidence: "high",
    },
    context:
      "One of two full candidate accounts the guide draws from. The candidate asked the interviewer about expected simultaneous users before designing anything and was told a specific number — 300 million users — which then shaped the rest of the discussion. Netflix's own framing: system design rounds here are unstructured conversations, not a shared-whiteboard exercise, and the interviewer expects the candidate to drive requirements-gathering rather than wait to be prompted.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Are we generating fresh recommendations on every app open, or serving pre-computed rows that refresh on a slower cadence?",
        "What signals are available — explicit (ratings, thumbs up/down) or only implicit (watch time, hover, abandon point)?",
        "Does every category (e.g. 'Continue Watching', 'Because you watched X', 'Trending Now') use the same ranking model, or does each category have its own generation logic?",
        "What's the latency budget for rendering the home screen — this is the first thing a user sees, so it needs to feel instant?",
      ],
      requirements: [
        "Serve a personalized, categorized set of title recommendations the moment a viewing profile is opened",
        "Handle roughly 300M simultaneous users (per the candidate's own reported clarifying-question answer) without the home screen becoming a bottleneck",
        "Recommendations should reflect recent activity (a title watched five minutes ago should be able to influence 'Continue Watching' and related rows immediately)",
        "Each row/category can have distinct ranking logic, not one global model",
      ],
      approach:
        "Split the problem into an offline path that does the expensive work (candidate generation, model training, most category rankings) ahead of time, and an online path that only does cheap, low-latency work at request time (assembling precomputed rows, re-ranking with the freshest signals, and handling anything that must reflect the last few minutes of activity, like 'Continue Watching'). This mirrors how real large-scale recommender systems split precompute from serving, since generating a full ranked list for 300M users synchronously on every app open isn't a real latency budget.",
      keyPoints: [
        "A batch/offline pipeline (nightly or hourly) generates most rows per user: candidate generation (collaborative filtering / embeddings to shortlist a few hundred plausible titles per user from the full catalog) followed by a ranking model per row-type, with results written to a fast key-value store (user_id + row_type → ranked title list) so the online path is a lookup, not a computation",
        "A separate real-time path handles anything that must reflect activity in the last few minutes — a stream (e.g. Kafka) of play/pause/finish events feeds a lightweight online re-ranker or a dedicated 'Continue Watching' service that doesn't wait for the next batch cycle",
        "The home-screen request itself fans out to the precomputed-row store for most categories and to the real-time service for the freshness-sensitive ones, then assembles the final page — this keeps the request path to a handful of key-value lookups plus a merge, not a live model inference for every row",
        "Candidate generation and ranking are decoupled: candidate generation narrows millions of titles to a few hundred per user cheaply (embeddings + approximate nearest neighbor), and only that shortlist goes through a more expensive ranking model — this two-stage pattern is what makes ranking computationally tractable at this scale",
        "Cache the assembled home-screen response per user for a short TTL (seconds to low minutes) so repeated app opens in a short window don't redo the fan-out/merge work",
        "New/cold-start users and titles get a fallback path (popularity-based or editorially curated rows) since collaborative-filtering signals don't exist yet for them",
      ],
      tradeoffs: [
        "Precomputed batch rows (cheap and fast to serve, but potentially hours stale) vs. computing every row fully online per request (always fresh, but far too expensive to run a full ranking model for 300M users on every app open) — the hybrid split (batch for most rows, a thin real-time layer only where staleness is visibly wrong, like 'Continue Watching') is the standard resolution",
        "One shared ranking model across all categories (simpler to maintain) vs. a distinct model per row-type (better relevance per category, since 'Trending Now' and 'Because you watched X' optimize for different things) — per-category models win once the product has more than a couple of row types, at the cost of more models to train and monitor",
        "Storing precomputed rows keyed by user (fast reads, but a full recompute needed whenever the model changes) vs. computing on read from raw features (always reflects the latest model, but far too slow) — precompute wins for anything not on the request's critical path for freshness",
      ],
      followUps: [
        "How would you A/B test a new ranking model without risking the home screen for the whole 300M-user base?",
        "How do you keep the 'Continue Watching' row consistent if the user watches on one device and immediately opens the app on another?",
        "What happens to this design during a regional outage — do stale precomputed rows degrade gracefully, or does the whole home screen fail?",
      ],
      relatedLinks: [
        { label: "Foundations: Caching", href: "/foundations/caching" },
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
      ],
    },
  },
  {
    id: "netflix-frequency-capping-system",
    company: "Netflix",
    title: "Design a frequency capping system for Netflix's ad platform",
    prompt:
      "Design a frequency capping system for an ad platform: how do you limit the number of times a given user sees an ad from the same advertiser within a time window, across different granularities (line item, campaign, category)? For example: a maximum of 5 views per user per day, and 10 per campaign cycle, enforced across Netflix's full user base.",
    category: "system-design",
    tags: ["abuse-content-moderation"],
    level: "Software Engineer, Ads org",
    source: {
      name: "Exponent — Netflix Software Engineer Interview Guide",
      url: "https://www.tryexponent.com/guides/netflix-software-engineer-interview",
      reportedDate: "~2026 (guide updated 22 days ago)",
      confidence: "high",
    },
    context:
      "Independently corroborated with the same core prompt and the concrete 5-per-day/10-per-cycle numbers by the separate Netflix System Design Interview blog post and by an Exponent question-DB entry (~4 months old at fetch) — a rare case of the same Ads-org prompt surfacing across three of Exponent's own pages. Requires rate limiting at scale, distributed counters, and multiple simultaneous levels of capping (line item, campaign, category) rather than one flat limit.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Do the three granularities (line item, campaign, category) all apply simultaneously to every impression decision, or can a line-item cap alone stop a show without checking the others?",
        "Does the cap need to be exact, or is a small amount of overcounting under heavy concurrency acceptable — i.e. is this closer to a rate limiter's approximate-counting tolerance?",
        "What's the read path — is this a synchronous check on the ad-serving hot path (must respond in milliseconds), or can capping be enforced with some lag?",
        "Is 'per campaign cycle' a fixed window (e.g. a calendar week) or a rolling window from campaign start?",
      ],
      requirements: [
        "Enforce impression caps at three simultaneous granularities: line item, campaign, and category (e.g. 5/user/day at the line-item level, 10/user/campaign-cycle at the campaign level)",
        "Check and update counts on the ad-serving hot path with low latency, at Netflix's full user-base scale",
        "Counters must be correct enough under massive concurrency that an advertiser doesn't get meaningfully over- or under-served",
        "Support different window types (daily, campaign-cycle) per granularity",
      ],
      approach:
        "Treat this as a distributed rate limiter with multiple simultaneous keys per request, not a single counter: every impression decision checks (and atomically increments, if allowed) one counter per granularity level, and the ad only serves if all three checks pass. Use an in-memory, horizontally-sharded counter store so the hot-path check stays fast, and accept approximate (not perfectly exact) counting the same way most production rate limiters do, since a rare off-by-a-few-impressions error is far cheaper than adding synchronous cross-node coordination to every ad decision.",
      keyPoints: [
        "Model each cap as a key (user_id + line_item_id, user_id + campaign_id, user_id + category_id) mapping to a counter with a TTL matching its window — 24h for a daily cap, the campaign-cycle length for the campaign-level cap",
        "Store counters in a sharded in-memory store (Redis-cluster-style) keyed so a given user's counters land on a small, predictable set of shards — this keeps a single ad decision's three counter checks to a handful of network hops, not a scatter-gather across the whole cluster",
        "Use an atomic increment-and-check operation (e.g. Redis `INCR` + `EXPIRE`, or a Lua script for atomicity) so two concurrent requests for the same user can't both read 'under cap' and both increment past it — the atomicity is what keeps the count meaningfully accurate without a distributed lock",
        "On the ad-serving path: fetch all three counters for the candidate ad in parallel, reject the ad if any one is at/over its cap, otherwise serve it and increment all three counters that just passed",
        "Accept sliding-window approximation (e.g. a sliding-window-counter algorithm, or fixed windows with jittered boundaries) rather than an exact sliding log — at this request volume, exact per-impression logs would be far more storage and compute than the accuracy gain is worth",
        "Asynchronously reconcile the fast, approximate counters against the durable impression log (already being written for billing/analytics) on a lag, so any drift gets corrected without slowing down the hot path",
      ],
      tradeoffs: [
        "In-memory sharded counters (fast, cheap, slightly approximate under high concurrency) vs. a strongly-consistent counter in a transactional database (perfectly accurate, but adds real latency to every single ad decision at Netflix's request volume) — the approximate approach is the standard trade for any rate-limiter-shaped problem at this scale",
        "Checking all three granularities synchronously in the ad-serving path (correct at decision time, adds a bit of latency) vs. checking asynchronously and clawing back over-served impressions after the fact (faster serving path, but an impression, once shown, can't be un-shown) — synchronous wins here because unlike many other kinds of write, an impression can't be rolled back",
        "Fixed time windows (simpler, but can double-serve right at a window boundary) vs. a true sliding window (no boundary effect, more state to maintain per key) — fixed windows with a jittered reset time are usually good enough for an ad cap, where being off by one impression at a boundary is a rounding error, not a correctness bug",
      ],
      followUps: [
        "How would you handle a hot user — someone who happens to be shown an unusually large number of ad opportunities in a short window — without that user's counter checks becoming a bottleneck?",
        "What happens if the counter store for a shard goes down mid-campaign — do you fail open (risk over-serving) or fail closed (risk under-serving, losing the advertiser revenue)?",
        "How would you extend this to cap not just impressions but a frequency-weighted budget, where different ad slots cost different amounts against the cap?",
      ],
      relatedLinks: [
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
        { label: "LLD: Rate Limiter", href: "/lld/rate-limiter" },
      ],
    },
  },
  {
    id: "netflix-ads-campaign-data-model",
    company: "Netflix",
    title: "Model the data an advertiser needs to launch and run a campaign on Netflix",
    prompt:
      "Describe the data models needed for an advertiser to start a campaign and show ads to users. Cover ad frequency capping, ad targeting, creative delivery, and revenue tracking.",
    category: "lld-ood",
    tags: ["workflow-crud-system"],
    level: "Software Engineer, Ads org — data modeling round",
    source: {
      name: "Exponent — Netflix Software Engineer Interview Guide",
      url: "https://www.tryexponent.com/guides/netflix-software-engineer-interview",
      reportedDate: "~2026 (guide updated 22 days ago)",
      confidence: "high",
    },
    context:
      "Reported as a distinct round in the Ads org's onsite loop — separate from the system design round entirely. The guide's framing: this round tests whether a candidate can translate a business domain into coherent entities and relationships, not architecture; a related, recently-asked prompt from the same round asks candidates to 'walk through the full ad stack, from demand sources and campaign setup through to impression-level data' in the same data-modeling format. Sloppy domain terminology reportedly costs more points here than in most companies' data-modeling rounds.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is this campaign for a single advertiser buying directly, or does the model need to account for programmatic/demand-side-platform intermediaries too?",
        "Can one campaign contain multiple line items with different creatives/targeting, or is campaign the finest-grained unit?",
        "Does 'revenue tracking' mean impression-level billing (cost per impression) or outcome-based (cost per completed view), since that changes what needs to be recorded per event?",
        "Do creatives need an approval/review state before they can serve, or is that out of scope?",
      ],
      requirements: [
        "Model an Advertiser who can create one or more Campaigns",
        "Each Campaign breaks down into Line Items, each with its own targeting rules, budget, and frequency cap",
        "Creatives (the actual ad content) attach to line items and must be resolvable at ad-serving time",
        "Every served impression must be recorded with enough detail to support both frequency capping and revenue/billing reporting",
      ],
      approach:
        "Model this top-down, matching the real hierarchy an ads business actually has: Advertiser owns Campaigns, Campaigns own Line Items (the unit that actually carries targeting, budget, and a frequency cap), Line Items reference Creatives, and every ad decision produces an Impression record that ties back to all of the above — the frequency-capping design (see the companion frequency-capping question) reads and writes against this same Line-Item/Campaign hierarchy rather than inventing separate identifiers.",
      keyPoints: [
        "`Advertiser(advertiser_id, name, billing_account_id)` — the top-level entity holding the billing relationship",
        "`Campaign(campaign_id, advertiser_id, name, start_date, end_date, total_budget, status)` — the business-facing grouping an advertiser reasons about; campaign-level frequency cap and campaign-level spend roll up from its line items",
        "`LineItem(line_item_id, campaign_id, targeting_rule_id, creative_id, daily_budget, frequency_cap_per_user_per_day, status)` — the actual unit selected at ad-serving time; this is the finest granularity most real ad systems schedule against, since it's where budget pacing and targeting are actually enforced",
        "`TargetingRule(rule_id, criteria_json)` — kept as its own entity, rather than inline columns on LineItem, since targeting criteria (demographics, content category, device, geography) vary in shape and grow over time; a flexible schema here avoids repeated migrations",
        "`Creative(creative_id, advertiser_id, asset_url, duration_seconds, format, review_status)` — decoupled from LineItem via a reference so the same creative can be reused across multiple line items/campaigns",
        "`Impression(impression_id, user_id, line_item_id, timestamp, cost, category_id)` — one row per served ad, the append-only fact table that both frequency capping (fast approximate counters, see the frequency-capping question) and revenue tracking (a slower, exact aggregation over this table) are built from — a single source-of-truth event table for both purposes is what keeps the two systems from disagreeing",
      ],
      tradeoffs: [
        "Frequency cap and budget stored per line item, rolling up to campaign totals (matches how advertisers actually think about spend, requires an aggregation step to answer 'how much has this campaign spent') vs. storing an independent counter/budget directly on Campaign (faster to answer campaign-level questions, but line-item-level enforcement — what the ad-serving hot path actually needs — becomes a separate, potentially inconsistent system) — line-item-first with roll-up wins because the ad-serving decision is always made at line-item granularity",
        "A flexible JSON targeting-criteria column (adapts to new targeting dimensions without a schema migration, harder to query/index efficiently) vs. fully normalized targeting tables per dimension (fast, indexable queries, a migration every time a new targeting dimension ships) — JSON is the pragmatic choice for a criteria set that's still evolving, with the option to promote a dimension to its own indexed column once it's proven stable and heavily queried",
        "One shared Impression fact table serving both frequency capping and revenue reporting (single source of truth, but has to serve two very different access patterns — fast point lookups for capping vs. large aggregations for billing) vs. two separate event streams (each optimized for its own access pattern, but now able to silently disagree) — one table with two different downstream consumers (an in-memory counter service and a batch billing job) keeps correctness centralized while letting each consumer use the storage engine that fits its access pattern",
      ],
      followUps: [
        "How would you extend this model to support programmatic demand (real-time bidding from a third-party DSP) alongside direct-sold campaigns?",
        "A creative gets pulled mid-campaign for a content violation — walk through what has to happen across this data model.",
        "How would you handle a line item targeted at an audience segment that changes size dynamically (e.g. 'users who watched a documentary in the last 7 days')?",
      ],
      relatedLinks: [
        { label: "LLD: UML Class Diagrams", href: "/lld/uml-class-diagrams" },
        { label: "Foundations: SQL Deep Dive", href: "/foundations/sql-deep-dive" },
      ],
    },
  },
  {
    id: "netflix-event-logging-own-vs-docs-client",
    company: "Netflix",
    title: "Own the event-logging client libraries, or just publish documentation?",
    prompt:
      "You're building a product for logging events at Netflix. Should you own the client libraries that ingest those events, or provide documentation and let other teams build their own clients? Walk through your recommendation.",
    category: "system-design",
    tags: ["metrics-observability"],
    level: "Software Engineer, internal tooling team",
    source: {
      name: "Exponent — Netflix Software Engineer Interview Guide",
      url: "https://www.tryexponent.com/guides/netflix-software-engineer-interview",
      reportedDate: "~2026 (guide updated 22 days ago)",
      confidence: "high",
    },
    context:
      "The companion Netflix system design blog post reports the same underlying scenario, framed as a real, unresolved architectural debate the interviewing team was actively working through at the time — not a settled 'correct answer' prompt. The candidate reported the session 'felt like an unsolved problem the team was actively working through' rather than a rehearsed system-design exercise; the interviewer pushed on cross-team resourcing and long-term maintenance implications more than on any diagram.",
    optimalAnswer: {
      clarifyingQuestions: [
        "How many internal teams would need to emit events through this system, and how varied are their tech stacks/languages?",
        "How strict does event-schema correctness need to be — does a malformed event from one team break downstream analytics for everyone, or is it isolated?",
        "What's the team's actual headcount/capacity to build and support client libraries across multiple languages long-term?",
        "Is there already an informal precedent — are some teams already hand-rolling their own event-emission code today?",
      ],
      requirements: [
        "Every team at Netflix that wants to emit business events needs a reliable, low-friction way to do it",
        "Events must arrive in a consistent, well-formed shape for downstream processing (analytics, alerting, and in some cases billing)",
        "The solution has to scale in the number of internal producing teams, not just event volume",
        "The owning team's own capacity to build and support the chosen path is a real constraint, not an afterthought",
      ],
      approach:
        "Frame this explicitly as a build-vs-document trade-off rather than a pure technical design, since the real cost driver is organizational: owning client libraries buys consistency and correctness at the price of becoming a long-term dependency for every producing team, while documentation-only trades that ongoing maintenance burden for a much higher risk of silent schema drift across teams. Recommend owning a thin, well-tested client library for the most common languages/stacks, while publishing a documented raw-protocol fallback (a schema and wire contract) for anything outside that supported set — this captures most of the consistency benefit without requiring the owning team to maintain a client for every stack Netflix uses.",
      keyPoints: [
        "Own official client libraries for the 2-3 dominant languages/stacks used internally — this is where most event volume and most producing teams will come from, so owning it there buys the most consistency for the least maintenance surface",
        "Publish the event schema and wire protocol (e.g. a versioned Avro/Protobuf schema over gRPC or HTTP) as the documented fallback for any team on an unsupported stack — this keeps the door open without obligating the owning team to support every language",
        "Bake schema validation into the client library itself (fail fast at the producing team's build/test time, not silently at ingestion) — this is the single biggest argument for owning at least some client code, since documentation alone can't enforce anything",
        "Version the schema and the client library together, with a deprecation window, so producing teams aren't broken by a schema change they didn't opt into",
        "Track adoption and event-quality metrics per producing team (schema-validation failure rate, client library version in use) so the owning team can see drift before it becomes an incident, not after",
        "Treat the documented fallback path's event quality as a leading indicator: a rising share of malformed events from fallback-path teams is the signal to invest in an official client for that stack next",
      ],
      tradeoffs: [
        "Owning client libraries for every stack (maximum consistency, but the owning team becomes a bottleneck and a long-term maintenance liability across languages it may not have deep expertise in) vs. documentation-only for everything (zero maintenance burden, but every producing team re-solves schema validation, retries, and batching independently, and silent drift is nearly guaranteed at Netflix's team count) — the hybrid (own the common stacks, document the rest) is a deliberate middle path, not a reluctant compromise",
        "Strict client-side schema validation (catches problems early, at the cost of the producing team's build failing on a schema change) vs. permissive ingestion with server-side validation only (never blocks a producing team's build, but bad events reach the pipeline before anyone notices) — client-side validation is worth the friction, because the alternative is discovering a broken event stream in production analytics, much later and much more expensively",
        "A single global schema for all events (simplest to reason about) vs. per-domain schemas with a shared envelope (more flexible for different event shapes, more moving parts) — a shared envelope (common fields: timestamp, producing-team ID, schema version) wrapping a domain-specific payload gets most of the flexibility without losing the ability to do cross-team tooling on the common fields",
      ],
      followUps: [
        "A producing team says the official client library doesn't support a use case they need — how do you decide whether to extend the library or point them at the fallback path?",
        "How would you migrate every producing team off a major, breaking schema change without an outage?",
        "How do you decide when it's finally worth building an official client for a fourth or fifth language stack?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: REST APIs", href: "/foundations/rest-apis" },
      ],
    },
  },
  {
    id: "netflix-ttl-cache-eviction-compaction",
    company: "Netflix",
    title: "Implement a TTL cache — then defend what happens if nothing ever evicts",
    prompt:
      "Implement a TTL cache. What happens if you never evict expired entries? What are some approaches to compacting the cache on a regular cadence?",
    category: "lld-ood",
    tags: ["caching"],
    level: "Software Engineer, technical screen",
    source: {
      name: "Exponent — Netflix Software Engineer Interview Guide",
      url: "https://www.tryexponent.com/guides/netflix-software-engineer-interview",
      reportedDate: "~2026 (guide updated 22 days ago)",
      confidence: "high",
      note: "Same prompt independently listed in Exponent's Netflix question DB (~4 months old at fetch, 1 reported answer) — the guide adds the two follow-up questions that give it real specificity.",
    },
    context:
      "Reported in the technical-screen round (CodeSignal or CoderPad, 45-60 minutes). The guide frames this as typical of Netflix's coding rounds: an initial working implementation followed by open-ended follow-ups about failure modes and trade-offs that don't require more code, testing whether the candidate can reason through the design out loud.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Should expiration be checked lazily (on access) or does the interviewer want active/background expiration as part of the base implementation?",
        "What's the expected read/write ratio — does that change whether lazy or eager eviction is the better default?",
        "Is there a maximum size bound in addition to the TTL, or is TTL the only eviction trigger?",
        "Single-threaded for this exercise, or does the implementation need to be thread-safe?",
      ],
      requirements: [
        "Support set(key, value, ttl) and get(key), where get returns nothing for an expired entry even before any cleanup has run",
        "Expired entries should never be returned as valid, even if they haven't been physically removed yet",
        "Memory should not grow unboundedly from entries nobody ever reads again",
        "The design should hold up under continuous, high-volume writes, not just a small test case",
      ],
      approach:
        "Start with the simplest correct version — lazy expiration checked on every get, so correctness (never returning a stale value) is guaranteed regardless of when cleanup runs — then treat the interviewer's own follow-up as the real point of the exercise: lazy-only expiration is correct but leaks memory for any key that's written once and never read again, so a real system needs an active compaction strategy layered on top, not as a replacement for the lazy check.",
      keyPoints: [
        "Store each entry as (value, expiry_timestamp) in a hash map; get(key) checks the current time against expiry_timestamp before returning — if expired, treat it as a miss and delete it on the spot, piggybacking cleanup onto the read path essentially for free",
        "Lazy-only expiration is correct (nothing stale is ever returned) but leaks memory: a key set once and never read again sits in the map forever, unbounded, since nothing ever triggers its cleanup",
        "Add a background compaction pass on a fixed cadence (e.g. every N seconds) that scans for expired entries and removes them — this bounds the memory leak from write-once/read-never keys without changing the correctness guarantee the lazy check already provides",
        "A full linear scan of the whole map every cadence tick gets expensive as the cache grows — a min-heap or a time-bucketed structure (entries grouped by expiry time into buckets, e.g. per-minute) lets compaction only look at buckets whose time has already passed, instead of scanning every key",
        "For high write throughput, run compaction incrementally (a small slice of the map per tick) rather than one large stop-the-world pass, so compaction doesn't itself become a latency spike",
        "If a size bound exists alongside the TTL, combine this with LRU-style eviction: TTL expiration removes stale entries, but a hard size cap still needs a separate eviction policy for valid-but-least-recently-used entries when the cache is full",
      ],
      tradeoffs: [
        "Lazy-only expiration (simplest, zero background cost, but unbounded memory growth from unread keys) vs. active-only expiration via a periodic full scan (bounds memory, but wastes CPU rescanning the whole cache every tick, most of which hasn't expired) vs. lazy + time-bucketed active compaction (bounds memory and only does work proportional to what's actually expired) — the combined approach is what production TTL caches (e.g. Redis) actually do, for exactly this reason",
        "Compacting on a fixed timer (predictable resource usage, but wasted cycles when nothing has expired) vs. compacting based on a memory-pressure trigger (only does work when it's actually needed, more complex to implement and tune) — a fixed timer is the right default for a bounded exercise like this one; memory-pressure triggering is a reasonable follow-up answer, not a starting design",
        "A single global lock around the map (simple, safe, but serializes every read/write if thread-safety is required) vs. sharding the cache into N independently-locked segments (much better concurrent throughput, more implementation complexity) — worth naming as the natural next question if the interviewer asks about thread-safety",
      ],
      followUps: [
        "How would this design change under thread-safety requirements — multiple readers and writers hitting the cache concurrently?",
        "How would you extend this to a distributed cache shared across multiple service instances, where a single in-process hash map no longer works?",
        "What's the failure mode if the background compaction thread itself dies or falls behind — does the cache silently grow unbounded, and how would you detect that?",
      ],
      relatedLinks: [
        { label: "LLD: LRU Cache", href: "/lld/lru-cache" },
        { label: "Foundations: Caching", href: "/foundations/caching" },
      ],
    },
  },
  {
    id: "netflix-anonymous-social-app-like-reddit",
    company: "Netflix",
    title: "Design an anonymous web app like Reddit — then handle it going public",
    prompt:
      "Design an anonymous web app like Reddit: users can upvote and downvote posts. How would you combat spam? Extended follow-up: what if all of a sudden the product needed to turn into a social media network — i.e. no longer anonymous?",
    category: "system-design",
    tags: ["fanout-feed"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/system-design/469900/Netflix-or-System-Design-Web-App-Like-Reddit/",
      reportedDate: "Jan 2020",
      confidence: "high",
      note: "Netflix-tagged thread, full page reread; original post (not a comment) stating the exact prompt and both follow-ups.",
    },
    context:
      "Posted by the candidate directly after the interview, with the prompt shape and both explicit follow-ups (spam mitigation, then the scope change to a non-anonymous social network) stated plainly. The post separately lists the resources the candidate used to prep (Grokking the System Design Interview, Tushar's YouTube videos) rather than claiming any particular answer was correct — the value here is the verified prompt itself, not a reported 'right answer.'",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is anonymity here 'no persistent username shown to other users,' or fully unauthenticated — no account at all, just a device/session identity?",
        "Do votes need to be idempotent per user (one vote per post) even though users are anonymous — and if so, what identifies 'a user' for that purpose?",
        "Should ranking favor recency ('new') or a hot-score blending votes and age ('hot')?",
        "For the extended follow-up: does 'no longer anonymous' mean retrofitting identity onto all historical anonymous posts, or only new posts going forward?",
      ],
      requirements: [
        "Users can create posts and upvote/downvote them without a visible persistent identity",
        "Vote counts must resist trivial abuse — one browser tab spamming upvotes shouldn't move the ranking",
        "Feed ranking (e.g. 'hot', 'new') must stay computable as post/vote volume grows",
        "The design must be extensible to add persistent identity later without a full rewrite",
      ],
      approach:
        "Even with 'anonymous' users, some stable identity is required behind the scenes purely to make voting fair — otherwise nothing stops one person from voting the same post up a thousand times. Design around a lightweight, non-personally-identifying session/device identity for vote deduplication and spam signals, keep it decoupled from anything user-facing, and treat 'add real accounts later' as mostly a matter of attaching a persistent identity to that same internal identity concept rather than redesigning the vote or post pipeline.",
      keyPoints: [
        "Assign every client a stable-but-anonymous identity token (a signed cookie or device ID) issued on first visit — this is the identity votes and posts are actually keyed against internally, even though nothing about it is shown to other users",
        "Vote(post_id, anon_id, direction) with a uniqueness constraint on (post_id, anon_id) enforces one vote per post per identity at the data layer, not just in application code — this is the core spam-resistance primitive, since it makes naive repeat-voting a constraint violation rather than a race condition to catch after the fact",
        "Layer additional spam signals on top of the identity constraint: rate-limit votes/posts per anon_id per time window, and flag anon_ids whose vote pattern looks scripted (e.g. sub-second intervals, single-post targeting) for a lightweight challenge or throttling",
        "Post score is maintained as a counter incrementally updated on each vote (not recomputed from a vote log on every read), with a 'hot' ranking formula (blending score and post age) computed periodically rather than on every feed request",
        "Store posts and votes so anon_id is just another foreign key, not something baked structurally into the schema as 'the' identity concept — this is what makes the extended follow-up tractable",
        "For the extended follow-up (adding real accounts): introduce a User entity and an optional link from anon_id to user_id once a user registers; existing posts/votes keep working unmodified since they were never tied to anything more specific than anon_id in the first place — the only new work is the registration/login flow and deciding whether historical anonymous activity gets retroactively attributed",
      ],
      tradeoffs: [
        "A signed cookie/device-ID as the anonymous identity (simple, no account-creation friction) vs. no persistent identity at all, just IP-based limits (even simpler, but trivially defeated by anyone rotating IPs, and unfairly blocks legitimate users behind shared/NAT'd IPs) — a device identity is the right default since it's both harder to trivially abuse and doesn't collectively punish innocent users on the same network",
        "Enforcing one-vote-per-post via a database uniqueness constraint (correct under concurrency, adds a write-path check) vs. trusting the client to only send one vote (no server enforcement cost, but trivially bypassed) — the constraint is non-negotiable for a product whose core mechanic is vote-based ranking",
        "Retrofitting identity onto historical anonymous posts when the product adds real accounts (lets users claim their post history, more migration complexity, a privacy question about consent) vs. leaving historical posts permanently anonymous and only identity-tagging new posts (simpler, respects the original anonymity contract) — leaving history untouched is usually the safer default absent an explicit product decision to retrofit",
      ],
      followUps: [
        "How would you detect coordinated (multi-account, not single-account) vote manipulation, where the abuse isn't one anon_id voting repeatedly but many distinct ones acting in concert?",
        "How does the 'hot' ranking formula avoid a runaway feedback loop where early votes permanently lock in a post's position?",
        "If the product does add real accounts, how do you handle a user who wants their anonymous post history deleted rather than attributed to their new account?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
      ],
    },
  },
  {
    id: "netflix-distributed-db-multi-region-eventual-consistency",
    company: "Netflix",
    title: "Design a distributed database that syncs across 3 regions and 3 zones per region",
    prompt:
      "Design a distributed database that syncs across 3 regions and 3 zones within the regions. Requirement: eventually consistent system.",
    category: "system-design",
    tags: ["multi-region-failover"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/system-design/158698/Distributed-database:-Netflix",
      reportedDate: "Aug 2018",
      confidence: "high",
      note: "Netflix-tagged thread, full page reread; the original prompt is brief, but its comment thread engages substantively with the stated constraints (a multi-region active-active architecture reference, one-master-per-region writes with CRDT-based conflict resolution, and totally-ordered multicast via a sequencer).",
    },
    context:
      "The post itself is short, but the comment thread is substantive: one reply points to a real multi-region active-active architecture writeup, another proposes one-master-per-region writes with CRDT-based conflict resolution, and a third proposes totally-ordered multicast via a sequencer — three genuinely different resolution strategies for the same eventually-consistent, multi-region requirement.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Are the 3 zones within each region for fault tolerance only, or do they also need independent read/write availability during a zone outage?",
        "Is 'eventually consistent' the requirement for cross-region replication only, or also for writes within a single region across its 3 zones?",
        "What's the conflict scenario in practice — can the same key genuinely be written concurrently in two different regions, or is there a natural data-ownership split (e.g. each record has a home region)?",
        "What read-your-own-writes guarantee, if any, is needed for a client that just wrote to its local region?",
      ],
      requirements: [
        "Data replicates across 3 geographic regions and 3 availability zones within each region",
        "The system is eventually consistent — reads can briefly return stale data, but all replicas converge",
        "A single zone or even a whole region going down shouldn't take down writes/reads for the rest of the system",
        "Conflicting concurrent writes from different regions must be resolved deterministically, not silently dropped",
      ],
      approach:
        "Split the two consistency problems apart, since they have different natural answers: within a region, use synchronous (or near-synchronous) replication across the 3 zones, since zones in one region are close enough that strong consistency there is cheap and worth having; across the 3 regions, use asynchronous replication with an explicit conflict-resolution strategy, since forcing synchronous consensus across regions would mean every write pays cross-continent latency, defeating the entire point of a multi-region design.",
      keyPoints: [
        "Within a region: each of the 3 zones holds a full replica; writes go to a zone-local leader and synchronously replicate to at least one other zone before acknowledging (a quorum write) — this survives a single zone failure without losing an acknowledged write and without needing cross-region round trips for every write",
        "Across regions: replication is asynchronous — a region's writes stream to the other two regions in the background, which is what actually delivers the 'eventually consistent' requirement rather than a stronger, more expensive guarantee",
        "Conflict resolution for concurrent cross-region writes to the same key: attach a vector clock or hybrid logical clock to each write so the system can detect true concurrency (as opposed to a clean overwrite), and resolve detected conflicts with either last-writer-wins (simple, silently discards one write) or CRDTs (both writes merge deterministically, no data is silently lost) depending on whether the data type tolerates LWW's data loss",
        "Route each write to its 'home' region where possible (e.g. by the user's typical geography) — this minimizes the frequency of genuine cross-region conflicts in the first place, since most keys are then only ever written from one region under normal operation",
        "Reads default to the local region/zone for latency, with an optional stronger-consistency read path (read from the current write-quorum leader) available for the specific operations that need read-your-own-writes",
        "Health-check and automatically fail over zone-local leadership within a region on a zone outage, and fail over cross-region routing (stop sending a home region's traffic there, route to the nearest surviving region) on a full region outage",
      ],
      tradeoffs: [
        "Synchronous quorum writes within a region plus asynchronous replication across regions (fast within-region durability, eventual global convergence) vs. synchronous replication everywhere including cross-region (stronger global consistency, but every write pays cross-region — often 100ms+ — latency) — the split matches the stated eventually-consistent requirement and is the only approach that doesn't waste the multi-region design on unusable latency",
        "Last-writer-wins conflict resolution (simple, deterministic, but silently discards one of two genuinely concurrent writes) vs. CRDTs (no data loss, merges are always well-defined, but only works for data types that have a valid CRDT formulation and adds real design complexity) — CRDTs are worth the complexity specifically where losing a concurrent write is unacceptable (e.g. a user's list of saved items); LWW is fine where losing a stale write genuinely doesn't matter",
        "Home-region write routing to minimize conflicts (much simpler steady-state behavior, but a user who travels or fails over regions can still produce real conflicts) vs. no routing preference, accepting conflicts as routine (simpler routing logic, but conflict resolution becomes the common case instead of the rare case) — home-region routing is worth doing even though it doesn't eliminate conflicts, because it turns conflict resolution from 'the normal path' into 'the exception path,' which is much easier to reason about and test",
      ],
      followUps: [
        "How would you detect and alert on replication lag between regions before it becomes a user-visible staleness problem?",
        "Walk through what happens to an in-flight write if the region it's writing to fails over mid-write.",
        "How would this design change if one specific key type (e.g. an account balance) actually needed strong consistency while everything else stayed eventually consistent?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Replication", href: "/foundations/database-replication" },
        { label: "Foundations: NoSQL Deep Dive", href: "/foundations/nosql-deep-dive" },
      ],
    },
  },
  {
    id: "netflix-movie-review-score-prediction",
    company: "Netflix",
    title: "Predict a movie's score from 10,000 written reviews",
    prompt:
      "You've been given access to 10,000 movie reviews. Each review contains several sentences and a score from 1 to 10. How would you design a system to predict the movie score based on the review text?",
    category: "ml-ai-system-design",
    tags: ["ai-ml-infra"],
    level: "Machine Learning Engineer, final interviews",
    source: {
      name: "Exponent — Netflix Machine Learning Engineer (MLE) Interview Guide",
      url: "https://www.tryexponent.com/guides/netflix-machine-learning-engineer-interview",
      reportedDate: "~2026 (guide updated 3 months ago)",
      confidence: "high",
    },
    context:
      "Listed under both the 'final interviews' technical-screening round and the dedicated 'ML system design' section of the guide — the same prompt appears in both, suggesting it recurs across the MLE loop rather than being a one-off. Framed as testing both practical NLP/modeling knowledge (feature representation, model choice) and systems thinking (how this becomes a deployed, monitored pipeline), not a pure ML-theory question.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is the goal to predict the numeric score (1-10) for a review that has no score yet, or to build something that generalizes to review text for movies not in the original 10,000?",
        "Is 10,000 reviews the full available training set, or an initial batch with more arriving over time?",
        "Does this need to run as a one-off batch job, or does it need to serve predictions in near-real-time as new reviews come in?",
        "Is model interpretability important here — e.g. for showing users 'why' a score was predicted — or is raw accuracy the only goal?",
      ],
      requirements: [
        "Given review text, predict a numeric score from 1 to 10",
        "Train on the available 10,000 labeled reviews (text + true score)",
        "The design should describe a full system, not just a model: data flow, training/evaluation/serving, and monitoring",
        "Should generalize reasonably to new reviews, not just memorize the training set",
      ],
      approach:
        "Treat this as a supervised regression (or ordinal classification) problem over text, and design the full pipeline around it: data preparation and feature representation, model choice appropriate to a modest 10,000-example dataset, an evaluation strategy that actually measures what matters (ordinal closeness, not just exact-match accuracy), and a serving/monitoring path — since the prompt explicitly frames this as 'design a system,' not just 'pick a model.'",
      keyPoints: [
        "Frame it as regression (predict a continuous 1-10 value, round for the final output) rather than 10-way classification — a review predicted as 7 when the true score is 8 is a much smaller error than being predicted as 1, and regression's loss function (e.g. MSE) captures that ordinal closeness directly, where plain classification accuracy would treat both misses as equally wrong",
        "For a modest labeled set (10,000 examples), a pretrained language model's embeddings — or even simpler TF-IDF features — feeding a lighter-weight regressor (gradient-boosted trees, or a small fine-tuned head) generalizes better than training a large model from scratch on what's a genuinely small dataset",
        "Split the 10,000 reviews into train/validation/test sets stratified by score, so rare scores (e.g. very few 1s or 10s if the distribution skews toward the middle) aren't accidentally left entirely out of one split",
        "Evaluate with a metric that reflects the ordinal nature of the target — mean absolute error or a correlation metric (Spearman/Pearson between predicted and true score) — rather than exact-match accuracy, since exact-match is a needlessly harsh bar for a 1-10 scale",
        "For deployment: wrap the trained model behind a prediction service, log every (review text, predicted score) pair, and periodically retrain as new labeled reviews accumulate — treat the initial 10,000 as a starting point, not a static, permanent training set",
        "Monitor for drift: track the distribution of predicted scores over time and alert if it shifts meaningfully from the training distribution, which would suggest either changing review style/content or a degrading model",
      ],
      tradeoffs: [
        "Fine-tuning a pretrained transformer on the review text (best raw accuracy potential, more compute and infrastructure to serve) vs. simpler TF-IDF/bag-of-words features into a classical regressor (much cheaper to train and serve, usually a meaningfully worse ceiling on accuracy) — for a system-design answer, naming both and picking the simpler path as the default (with the heavier model as a stated future improvement once more labeled data exists) shows the right instinct for a modest dataset size",
        "Framing as regression (captures ordinal closeness naturally) vs. multi-class classification over 10 classes (loses the 'closeness' signal entirely, and with only 10,000 examples across 10 classes, some classes may be badly underrepresented) — regression is the stronger default answer here, worth stating explicitly rather than defaulting to classification out of habit",
        "Retraining on a fixed cadence (predictable, simple to operate) vs. retraining continuously as new labeled reviews stream in (always current, but a much more complex pipeline for what's likely a slow-moving distribution) — a fixed cadence (e.g. weekly) is the pragmatic default unless there's evidence the review-score relationship shifts quickly",
      ],
      followUps: [
        "How would you handle a review that's sarcastic, or where the text sentiment doesn't match the numeric score at all?",
        "How would this design change if you had to predict a score for a review in a language the training set doesn't cover?",
        "How would you detect that the model's predictions have started silently degrading in production, before user complaints surface it?",
      ],
      relatedLinks: [
        { label: "Foundations: Estimation & Interview Framework", href: "/foundations/estimation-and-interview-framework" },
      ],
    },
  },
];
