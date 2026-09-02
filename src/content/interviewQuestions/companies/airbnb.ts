import type { InterviewQuestion } from "../types";

/**
 * Airbnb — researched 2026-08-24, see `docs/interview_exp.md` for the full
 * research log and the complete list of what was found. This file is
 * deliberately a small subset of that research: only questions with a
 * real, expansive prompt — specific requirements, numbers, constraints,
 * or a concrete narrative — make it in here. A one-line imperative like
 * "Design Airbnb's search functionality." is a real reported topic (and
 * stays in the tracker doc), but it reads as a topic label, not a
 * question a candidate could actually sit down and answer — so it
 * doesn't ship to this practice UI. See the tracker's "Shipped to app"
 * note for the full before/after list and reasoning.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a
 * transcript to memorize. These are authored by reasoning through each
 * problem the way a strong candidate would, not sourced from a specific
 * candidate's actual answer — unlike `prompt`/`context`, which are
 * sourced and cited, `optimalAnswer` is this app's own content.
 */
export const AIRBNB_QUESTIONS: InterviewQuestion[] = [
  {
    id: "airbnb-wallet-payment-system",
    company: "Airbnb",
    title: "Design Airbnb's wallet payment system",
    prompt:
      "Design Airbnb's wallet. Users should be able to see their wallet balance, view transaction history, and transfer money between their wallet and their bank account. Provide the core APIs — e.g. create_transfer(account_number, routing_number, transfer_type, amount) returning a vendor transfer id, and get_transfer_status(vendor_transfer_id) — and be ready to defend which two of the three CAP properties this system should favor.",
    category: "system-design",
    tags: ["payments-idempotency"],
    level: "Onsite system design round",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/1352118/airbnb-system-design-round-airbnb-wallet/",
      reportedDate: "Jul 2021",
      confidence: "high",
      note: "Original poster's account, full page reread. A later commenter (Nov 2022) independently confirms getting the same question with a richer worked account, and another (Aug 2024) confirms getting the identical question again — both folded into `context` below.",
    },
    context:
      "The interviewer pushed hardest on what services would exist, scalability, caching, latency reduction, and atomic transactions — and specifically asked which 2 of the 3 CAP properties the design should pick (community consensus: consistency + availability for a ledger, since partition tolerance isn't really optional in a real distributed system). A later candidate who got the same question reported working the numbers live: ~10M DAU → ~3M transactions/day (30% of DAU) → ~36 TPS on the make-payment API, ~1KB/record → ~3GB/day of ever-growing storage, which pushed them toward SQL for the hot path and NoSQL for archiving records older than 6 months. They also noted the payment vendor's API can take hours to settle, so they proposed an async, poll-based flow where the client polls a status URL rather than blocking on the vendor call, plus Kubernetes pod restarts or an active-passive failover model for service failures.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is this wallet used only to pay for Airbnb bookings, or can it also hold a general balance for arbitrary transfers?",
        "Can the wallet go negative, or is a transfer blocked once the balance would dip below zero?",
        "Is the linked bank transfer synchronous from the user's point of view, or is \"pending\" an acceptable, expected state?",
        "What's the expected scale — roughly how many DAU, and what fraction of them transact in a day?",
      ],
      requirements: [
        "View current wallet balance and paginated transaction history",
        "Transfer funds wallet → bank and bank → wallet (top-up and withdrawal)",
        "create_transfer(...) and get_transfer_status(...) as the core API surface, backed by a third-party payment processor",
        "Transactions must be atomic and auditable — no double-spends, no silently lost transfers",
        "At Airbnb's scale (~10M DAU), the design needs to survive tens of transactions per second sustained with bursty peaks",
      ],
      approach:
        "Treat this as two problems wearing one name: a durable, auditable ledger (source of truth) and a fast balance-read path in front of it. The interesting part isn't the CRUD — it's that the ledger writes must be atomic and idempotent, and that a third-party payment vendor call can be slow or fail independently of the wallet's own consistency guarantees.",
      keyPoints: [
        "A transactions table is the system of record — every wallet mutation is an append-only row (type, amount, status: PENDING/SUCCESS/FAILED, idempotency key) in a relational store; balance is derived, never mutated in place",
        "create_transfer() writes a PENDING transaction row and calls the vendor asynchronously — never block the API response on a vendor round-trip that can take hours to settle",
        "A poll-based status flow: the client calls get_transfer_status(vendor_transfer_id) rather than the server holding a connection open; a worker pool separately polls the vendor and/or consumes vendor webhooks to move PENDING → SUCCESS/FAILED",
        "Idempotency keys on every transfer request so a client retry (or a duplicate vendor webhook) can never double-apply the same transfer",
        "Cache the current balance (e.g. Redis) computed from the ledger for fast reads, invalidated/recomputed on every committed transaction — the ledger stays authoritative, the cache is just a read accelerator",
        "Archive transactions older than a fixed window (e.g. 6 months) out of the hot relational store into a cheaper, append-friendly store, since the ledger only grows and old rows are rarely queried",
      ],
      tradeoffs: [
        "Consistency vs. availability under CAP — for money movement, favor consistency: a wallet showing a stale-but-safe balance is far better than two concurrent transfers both succeeding against a balance that was never actually there",
        "Synchronous vendor call vs. async + polling — synchronous is simpler to reason about but ties up a request thread for as long as the vendor takes (up to hours); async + polling (or webhooks) trades a bit of latency for not blocking and for surviving vendor slowness gracefully",
        "SQL for the whole ledger vs. SQL for hot data + NoSQL archive — an all-SQL ledger is simplest operationally but keeps paying index-maintenance cost on records nobody queries anymore; splitting hot/cold adds a migration job but keeps the hot path fast as the ledger grows unbounded",
      ],
      followUps: [
        "How do you prevent a double-spend if two transfer requests for the same wallet race each other?",
        "The vendor webhook arrives twice for the same transfer — how does your system guarantee the balance only moves once?",
        "How would you extend this to support multiple currencies?",
      ],
      relatedLinks: [
        { label: "Foundations: SQL Deep Dive", href: "/foundations/sql-deep-dive" },
        { label: "Foundations: NoSQL Deep Dive", href: "/foundations/nosql-deep-dive" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
      ],
    },
  },
  {
    id: "airbnb-host-guest-messaging-fanout",
    company: "Airbnb",
    title: "Design Airbnb's host-guest messaging system",
    prompt:
      "Design Airbnb's host-guest messaging system: hosts and guests can message each other, it's a group chat of sorts where additional people can be added to a conversation, and it needs to support both online (real-time) and offline delivery, with appropriate fan-out strategies.",
    category: "system-design",
    tags: ["messaging-chat", "fanout-feed"],
    level: "Senior",
    source: {
      name: "Blind",
      url: "https://www.teamblind.com/post/airbnb-system-design-expectations-qyk5urzo",
      reportedDate: "~Apr 2026",
      confidence: "high",
      note: "Corroborated by two independent commenters on the same thread describing the same round for a senior SWE loop: one names it explicitly as \"Design Group Chat System (group messaging with online and offline delivery and fan-out strategies)\"; a second, separately, reports \"I got the messaging service question... hosts and guests can message each other. It's a group chat of sorts and you can add people to the chat.\"",
    },
    context:
      "One commenter on the same thread compared it directly to designing WhatsApp; another (an ex-Airbnb-loop candidate) noted the pattern generally: Airbnb tends to take standard system-design staples (à la Alex Xu) and reskin them in Airbnb's domain — \"instead of Facebook messenger, build Airbnb messenger.\"",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is a conversation always scoped to one listing/booking, or can hosts and guests message outside of an active reservation?",
        "How many participants can a single conversation have — is this really group chat, or mostly 1:1 with an occasional third party (e.g. co-host)?",
        "Does \"offline delivery\" mean push notifications, or does it also mean the message must be waiting for the user the next time they open the app regardless of connectivity?",
        "What's the expected fan-out — are most conversations small (2-3 people) or does this need to handle large groups?",
      ],
      requirements: [
        "Support group conversations, not just 1:1, with the ability to add participants",
        "Deliver messages in real time to online participants",
        "Reliably deliver messages to offline participants once they reconnect, plus a push notification",
        "Persist full conversation history, readable across devices",
        "Scale to Airbnb's host/guest population without one giant conversation's fan-out starving the rest of the system",
      ],
      approach:
        "Split the problem into three concerns that are often conflated: durable storage of the conversation (source of truth), real-time delivery to currently-connected clients, and fan-out — deciding whose inbox a new message needs to land in, and whether that's done eagerly (on write) or lazily (on read).",
      keyPoints: [
        "Messages are persisted first, to a store partitioned by conversation_id, before any delivery is attempted — delivery failures should never mean a lost message",
        "Real-time delivery to online users goes over a persistent connection (WebSocket) fanned out from a pub/sub layer keyed by conversation_id, so only participants of that conversation receive the push",
        "Offline delivery relies on the same persisted message plus a push notification service (APNs/FCM); when the user reopens the app, unread messages are fetched from the store directly, not re-delivered over the socket",
        "Fan-out-on-write (push the message into each participant's inbox/index at send time) suits Airbnb's mostly-small conversations — fan-out-on-read only pays off for very large groups, which this domain rarely produces, so keep it as an escape hatch rather than the default",
        "A per-conversation sequence number (not just a timestamp) gives clients a reliable way to detect gaps and request missed messages after reconnecting",
        "Adding a participant mid-conversation is a metadata change to the conversation's member list — new members typically see messages from the point they joined, not full retroactive history, which keeps the access-control model simple",
      ],
      tradeoffs: [
        "Fan-out-on-write vs. fan-out-on-read — write-time fan-out gives cheap, fast reads and suits Airbnb's small-group conversations; it would need to fall back to read-time fan-out only for pathologically large groups, which don't really exist in a host/guest messaging context the way they do in, say, a public broadcast channel",
        "WebSockets vs. long-polling for the online path — WebSockets give lower latency and less connection overhead at scale, at the cost of more complex connection-state management (which server holds which socket); long-polling is simpler operationally but wastes more resources under load",
        "Storing conversation history in a general relational store vs. a wide-column store partitioned by conversation_id — the latter suits this access pattern (append-mostly, range-read by conversation) better as message volume grows, at the cost of losing easy cross-conversation joins",
      ],
      followUps: [
        "How do you handle read receipts without every read fanning out a write to every other participant?",
        "How would you support message search across a user's entire conversation history?",
        "What happens if a participant is removed from a conversation — do they lose access to prior history?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Build it: Flight Status Push Updates scenario", href: "/workshop?scenario=flight-status-push-updates" },
      ],
    },
  },
  {
    id: "airbnb-booking-platform-hot-partitions",
    company: "Airbnb",
    title: "Design a booking platform that avoids double bookings, with a hot-partition follow-up",
    prompt:
      "Design a booking platform for Airbnb listings that avoids double bookings and supports creating, modifying, and deleting bookings — the interviewer also expects search capability built in. Follow-up: how would you handle a scenario where a major event is happening in one area (the interviewer's example: a Taylor Swift concert) — if your database is partitioned by zip code, how do you handle the resulting hot partition?",
    category: "system-design",
    tags: ["ticketing-inventory"],
    level: "Senior",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/post/7517460/airbnb-senior-engineer-interview-experie-yr5o/",
      reportedDate: "Jan 2026",
      confidence: "high",
      note: "First-person account, full page reread. Candidate solved all three coding rounds but reported not doing as well on this system-design round, and was given a second attempt at it.",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "Is search in scope for this round, or just booking CRUD plus double-booking prevention?",
        "Are bookings for exact date ranges, or could there be partial-night / flexible-date semantics to worry about?",
        "How should the system behave when a search spike hits one geographic area — degrade gracefully, or is scaling that partition acceptable?",
        "Is cancellation/modification expected to release the held dates immediately, or after some grace period?",
      ],
      requirements: [
        "Create, modify, and delete bookings for a listing and date range",
        "Never allow two confirmed bookings to overlap on the same listing and dates",
        "Support searching listings by location and availability",
        "Stay responsive when demand spikes hard in one geographic area (e.g. a major local event)",
      ],
      approach:
        "Separate the write-heavy, correctness-critical booking path from the read-heavy, latency-sensitive search path — they have opposite scaling needs. Then treat the hot-partition follow-up as exactly what it is: a partitioning-key choice (zip code) creating a hotspot, which is a scaling problem layered on top of an already-correct booking design, not a reason to redesign booking correctness itself.",
      keyPoints: [
        "Booking writes go through a transactional store with a uniqueness constraint (or explicit row-level lock) on (listing_id, date_range) so two concurrent booking attempts for overlapping dates can't both succeed",
        "A short-lived hold (e.g. a few minutes, TTL-backed) reserves the dates while payment completes, then converts to a confirmed booking — this avoids holding a database lock open for the whole checkout flow",
        "Search runs against a separate, denormalized index (not the transactional booking store) built from listing + availability data, so booking correctness and search latency don't contend for the same resources",
        "For the hot-partition follow-up: partitioning by zip code is a reasonable default for locality, but a single popular zip code (concert venue's area) can overwhelm one partition — mitigate with a composite key (zip code + a hash suffix, or zip code + listing_id) to spread writes/reads across multiple physical partitions, plus a cache layer in front of the hot partition's read traffic",
        "Add rate limiting / request shedding at the API layer scoped to the hot area, and pre-warm caches when a spike is predictable (e.g. known event dates), rather than relying purely on reactive scaling",
      ],
      tradeoffs: [
        "Zip code as the sole partition key vs. a composite/salted key — pure zip code is simple and keeps geographic queries single-partition, but creates exactly the hotspot the interviewer is probing for; salting spreads load at the cost of needing scatter-gather for a \"what's available in this zip\" query",
        "Locking rows for the duration of checkout vs. a short-lived hold that expires — a hold is more forgiving of abandoned checkouts and doesn't tie up database locks, at the cost of needing a background sweep to release expired holds",
        "Serving search from the transactional store directly vs. a separate index — a separate index adds sync/consistency-lag complexity but protects the booking path's latency and correctness from being degraded by search load",
      ],
      followUps: [
        "What happens if the payment step fails after a hold is placed — how and when does the hold get released?",
        "How would you extend this to support flexible date ranges (\"any 3 nights in June\") in search?",
        "How would you detect and alert on a hot partition before it becomes user-visible latency?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Foundations: Consistent Hashing", href: "/foundations/consistent-hashing" },
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
        { label: "Build it: Concert Ticket Drop Confirmations scenario", href: "/workshop?scenario=concert-ticket-drop" },
      ],
    },
  },
  {
    id: "airbnb-booking-waitlist-demand-notifications",
    company: "Airbnb",
    title: "Design a booking waitlist system for fully-booked listings",
    prompt:
      "Design a waitlist system for Airbnb property bookings: guests can join a waitlist for dates that are currently unavailable, hosts can view aggregated waitlist demand for their properties, and waitlisted guests get notified when a cancellation frees up matching dates — with a fair, time-limited window to claim the booking before it goes back to the general market.",
    category: "system-design",
    tags: ["ticketing-inventory", "notifications"],
    level: "Reported at Staff, Senior, and Senior Manager levels",
    source: {
      name: "Hello Interview community question database",
      url: "https://www.hellointerview.com/community/questions/booking-waitlist-system/cmf9ygbvj015h08adv95a25un",
      reportedDate: "~2026 (dated reports: Staff, mid Jul 2026; Senior, early Jul 2026; Senior Manager, late May 2026)",
      confidence: "high",
      note: "Full page reread. This question is tagged exclusively to Airbnb on Hello Interview (not shared with other companies, unlike several of their other system-design entries), with three separate dated candidate reports across levels. The prompt text itself is Hello Interview's canonicalized description aggregated across those reports, not one candidate's verbatim wording.",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "When a cancellation opens dates, do we notify every waitlisted user at once, or one at a time in some priority order?",
        "How long does a notified user have to claim the booking before it's offered to the next person / released back to search?",
        "Should hosts see waitlist demand in real time, or is a periodic aggregate (e.g. daily) good enough?",
        "Can a user be on multiple waitlists for the same listing across different overlapping date ranges?",
      ],
      requirements: [
        "Join/leave a waitlist for a specific listing and unavailable date range",
        "Notify waitlisted users promptly when a cancellation frees up matching dates",
        "Give notified users a fair, time-limited window to claim the booking before it returns to general availability",
        "Let hosts view aggregated waitlist demand for their properties",
      ],
      approach:
        "This is fundamentally the same double-booking-prevention problem as the base booking system, plus a real-time notification/claim workflow bolted onto the cancellation path — and a fan-out problem, since a single cancellation can suddenly make many waitlisted users eligible at once. Design the claim step to be exactly as atomic as a normal booking, and design notification fan-out to avoid a thundering herd.",
      keyPoints: [
        "A cancellation event triggers an eligibility lookup against the waitlist index (by listing_id + date_range) to find matching waitlisted users",
        "Rather than notifying everyone simultaneously, notify in priority order (e.g. join time) with a short exclusive claim window per user — only opening the next person's window if the current one expires without a claim",
        "The claim step reuses the same short-lived hold + atomic confirmation logic as regular booking (TTL-backed hold, uniqueness constraint on confirmation) — a waitlist claim is not a special-cased booking path",
        "Waitlist entries live in a store indexed by listing_id and date range so \"who's eligible for this newly-freed slot\" is an efficient lookup, not a table scan",
        "Host-facing demand analytics are computed off an aggregation pipeline (batch or near-real-time) over waitlist entries, kept off the hot booking/claim path so a popular listing's demand dashboard never competes with its booking traffic",
        "Notification delivery goes through a queue rather than a direct synchronous call, so a burst of newly-eligible waitlisted users from one big cancellation doesn't overwhelm the notification service inline",
      ],
      tradeoffs: [
        "Notify-all-at-once vs. sequential exclusive windows — notifying everyone is simpler and faster to fill the slot, but risks many users racing for one spot (poor UX, wasted claim attempts) and gives no clear fairness guarantee; sequential windows are fairer at the cost of a slower fill",
        "Real-time host demand analytics vs. periodic aggregation — real-time is more useful to hosts deciding on pricing, but adds ongoing computation cost on every waitlist join; periodic aggregation is far cheaper and usually good enough for a host-facing dashboard",
        "Reusing the booking hold mechanism for waitlist claims vs. building a separate claim mechanism — reuse keeps correctness guarantees consistent and halves the code to maintain, at the cost of the waitlist flow inheriting any latency the booking hold path has",
      ],
      followUps: [
        "How would you prevent the same user from claiming a slot via both the waitlist notification and a simultaneous direct search hit?",
        "How do you rank multiple waitlisted users fairly if you don't want pure first-come-first-served (e.g. loyalty tier)?",
        "What happens to a user's other pending waitlist entries once they successfully claim one booking?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Build it: Parking Reservation Platform scenario", href: "/workshop?scenario=parking-reservation-platform" },
      ],
    },
  },
  {
    id: "airbnb-in-memory-file-system",
    company: "Airbnb",
    title: "Design an in-memory file system (ls, mkdir, addContentToFile, readContentFromFile)",
    prompt:
      "Design an in-memory file system supporting: ls(path) — for a file path, return a one-item list with that file's name; for a directory path, return the directory's contents (files and directories) in lexicographic order. mkdir(path) — create a directory, creating any missing intermediate directories along the way. addContentToFile(path, content) — create the file with the given content if it doesn't exist, otherwise append the content. readContentFromFile(path) — return the file's full content as a string. All paths are absolute, begin with \"/\", and don't end with \"/\" (except the root \"/\" itself); directory and file names use only lowercase letters, and no two siblings share a name.",
    category: "lld-ood",
    tags: ["file-system-lld"],
    level: "Phone screen",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/post/874876/airbnb-phone-screen-design-in-memory-fil-n2im/",
      reportedDate: "Sep 2020",
      confidence: "high",
      note: "Original poster's own account of a 45-minute phone screen, full page reread, including the exact function signatures and a worked example.",
    },
    optimalAnswer: {
      clarifyingQuestions: [
        "Is this single-threaded, or does it need to be safe under concurrent access?",
        "Should ls on a file include the file's own metadata (size, etc.), or just its name as specified?",
        "Is there a delete operation to support, or is the scope strictly the four listed methods?",
        "Is there a reasonable upper bound on path depth or number of entries to design around?",
      ],
      requirements: [
        "ls(path): list a file's name, or a directory's contents in lexicographic order",
        "mkdir(path): create a directory, creating missing intermediate directories",
        "addContentToFile(path, content): create-or-append file content",
        "readContentFromFile(path): return a file's full content",
        "All paths are absolute and well-formed per the stated constraints",
      ],
      approach:
        "This is a classic tree-of-nodes design: model the file system as an in-memory tree where each node is either a directory (holding a map of child name → child node) or a file (holding its content as a string). Every operation reduces to walking the tree from the root by splitting the path into components.",
      keyPoints: [
        "A single Node type (or a directory/file variant) holds a name, a boolean/type discriminator, a sorted map of children (for directories), and a content string (for files)",
        "A shared path-walking helper splits the path on \"/\" and traverses/creates nodes component by component — mkdir reuses this to create missing intermediates, ls and read reuse it to locate the target node",
        "Using a sorted map (e.g. TreeMap-equivalent) for a directory's children keeps ls's lexicographic-order requirement free — no separate sort step needed at read time",
        "addContentToFile walks to the parent directory, then either creates a new file node with the given content or appends to an existing one's content string",
        "ls on a file path is a small special case: don't traverse into it, just return its own name in a single-element list",
      ],
      tradeoffs: [
        "A single polymorphic Node type vs. separate File/Directory classes — a single type with a discriminator is less code for this scope; separate classes (or an interface) scale better if the file system needs to grow more operations with genuinely different behavior per type",
        "Sorted map for children vs. plain map + sort-on-read — sorting on insert (sorted map) amortizes the cost across many reads; sorting on read is simpler but repeats work if ls is called often on a large directory",
        "Building the whole path-walk fresh on every call vs. caching resolved paths — caching would speed up repeated lookups but adds invalidation complexity (a mkdir or delete anywhere on the path would need to invalidate it) that isn't justified at this problem's stated scope",
      ],
      followUps: [
        "How would you add a delete(path) operation, including recursive directory deletion?",
        "How would this change if multiple threads could call these methods concurrently?",
        "How would you support a very large file system that doesn't fit in memory on one machine?",
      ],
      relatedLinks: [
        { label: "LLD: OOP Fundamentals", href: "/lld/oop-fundamentals" },
        { label: "LLD: The LLD Interview Approach", href: "/lld/lld-interview-approach" },
      ],
    },
  },
  {
    id: "airbnb-recently-viewed-listings",
    company: "Airbnb",
    title: "Design a system to show a user's recently viewed listings",
    prompt:
      "Design a system that returns a user's recently viewed listings on Airbnb. Example: a user searches for and views hotels in Bangalore — design a system responsible for surfacing those recently viewed listings back to that user.",
    category: "system-design",
    tags: ["personalization-history"],
    level: "L4",
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/post/1775088/airbnb-software-engineer-l4-bangalore-by-yxg5/",
      reportedDate: "Feb 2022",
      confidence: "high",
      note: "First-person account of an L4 Bangalore onsite loop, full page reread. This was the final (4th) technical round; the candidate reported not performing well here specifically and was rejected despite clearing the three coding rounds.",
    },
    context:
      "The candidate noted Airbnb weighs code quality heavily even in a system-design-flavored round — variable naming, modular functions — and evaluates communication throughout, not just the end architecture.",
    optimalAnswer: {
      clarifyingQuestions: [
        "How \"recent\" — a fixed count (last N), a time window, or both?",
        "Does a view get recorded on a search-result impression, or only when the user opens a listing's detail page?",
        "Should duplicate views of the same listing collapse to one entry (most-recent-first), or show every view?",
        "Does this need to be consistent across the user's devices in near real time, or is some staleness acceptable?",
      ],
      requirements: [
        "Record when a user views a listing",
        "Return that user's most recent N viewed listings, most-recent-first",
        "Low-latency reads — this is a personalization feature on a page load, not a background report",
        "Scale to Airbnb's active user base without a hot write path for popular listings",
      ],
      approach:
        "This is a per-user, bounded, recency-ordered list — a textbook fit for a fixed-size structure keyed by user, not a query over a general events table. Optimize for cheap writes on every view and O(1)-ish reads on page load.",
      keyPoints: [
        "Maintain a per-user capped list (e.g. a Redis list or sorted set keyed by user_id) that a view event pushes onto, trimming to the last N entries on write",
        "A view event is fire-and-forget from the client's perspective — write it asynchronously (via a queue) so recording a view never adds latency to browsing",
        "Deduplicate by listing: if the user re-views a listing already in their recent list, move it to the front rather than adding a second entry — a sorted set keyed by last-viewed timestamp makes this a single atomic update",
        "Reads hit the capped structure directly by user_id — no scan, no join, just a bounded read",
        "Persist a durable, larger history separately (e.g. an events table or log) if there's ever a need for full view history beyond the \"recent\" surface — keep that off the hot path entirely",
      ],
      tradeoffs: [
        "A capped per-user structure (Redis) vs. querying a general events/analytics table on every page load — the capped structure is far cheaper for a feature that's read constantly, at the cost of being a second system to keep in sync if a fuller history is ever needed",
        "Synchronous view recording vs. async via a queue — async decouples \"did the write succeed\" from the user's browsing experience, at the cost of the recent-list lagging true reality by a small, usually-imperceptible amount",
        "Deduplicating re-views vs. keeping every view as a separate entry — deduplication matches the actual product need (\"places I've looked at\") and keeps the list useful; keeping every view would need its own dedup step at read time instead",
      ],
      followUps: [
        "How would you extend this to power \"listings similar to what you've recently viewed\" recommendations?",
        "How would you keep the recent-views list in sync in near real time across a user's phone and laptop?",
        "What happens to this list if the viewed listing gets deleted or delisted by the host?",
      ],
      relatedLinks: [
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Foundations: Caching", href: "/foundations/caching" },
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
      ],
    },
  },
];
