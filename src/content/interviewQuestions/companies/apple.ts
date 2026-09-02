import type { InterviewQuestion } from "../types";

/**
 * Apple — researched 2026-08-23, see `docs/interview_exp.md` for the full
 * research log and the complete research catalog (Exponent's 17-item Apple
 * question DB, the Exponent Apple system-design blog's named ICT-level and
 * EM anecdotes, the Exponent Apple SWE guide's product-grounded sample
 * questions, a LeetCode Discuss full-loop write-up, and a Blind thread with
 * a real Apple-employee comment). Same ship bar as
 * `google.ts`/`meta.ts`/`amazon.ts`/`microsoft.ts`: only questions with a
 * real, answerable prompt — concrete numbers, explicit constraints, a
 * multi-part ask, or an actual narrative — make it in here. Apple's own
 * hiring guidance (confirmed across every source reread this pass) is that
 * there is no standard Apple system design question at all — each team
 * writes its own, un-coordinated with any other team's — so the questions
 * that shipped here skew toward Apple's two most consistently-reported
 * differentiators: privacy/security treated as a first-class design
 * constraint rather than an afterthought, and genuine client-side/mobile
 * system design (on-device compute, resource constraints, offline
 * behavior) rather than the server-only HLD default most other companies'
 * loops default to.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a transcript
 * to memorize. These are authored by reasoning through each problem the way
 * a strong candidate would, not sourced from a specific candidate's actual
 * answer — unlike `prompt`/`context`, which are sourced and cited,
 * `optimalAnswer` is this app's own content.
 */
export const APPLE_QUESTIONS: InterviewQuestion[] = [
  {
    id: "apple-observability-storage-migration-block-store",
    company: "Apple",
    title: "Migrate an observability platform's storage without losing data or live traffic",
    prompt:
      "You're redesigning storage for an observability platform. First: design a block-storage system for large block data — keys up to about 1KB, values up to about 300KB — then extend it to serve EU users alongside US users with low latency and strong consistency. Second, on the same underlying system: as record volume grows from millions to hundreds of millions or billions, how do you design the partitioning? Third: you're replacing the old metrics storage system, which has scaling issues — how do you migrate the data without interrupting live traffic or losing any internal data?",
    category: "scenario-operational",
    tags: ["metrics-observability", "data-migration"],
    level: "Engineering Manager",
    source: {
      name: "Exponent question DB (3 related entries from one candidate account)",
      url: "https://www.tryexponent.com/questions/6315/design-storage-system-large-block-data",
      reportedDate: "~Mar 2026 (5 months ago)",
      confidence: "high",
      note: "Three separate DB question entries (6315 block-storage sizing, 6313 partitioning-at-scale, 6312 zero-interruption migration) share the identical candidate interview-experience text and are clearly one EM candidate's single loop, split by Exponent into three DB items — combined here into one question. The EU/US low-latency + strong-consistency extension is corroborated independently by the Exponent Apple system-design blog's 'Design a migration from a legacy storage system to a new one' bucket entry, framed there as an M1 EM question.",
    },
    context:
      "The candidate's shared account: a roughly three-month loop (first screen in late November/early December, finishing mid-March), tighter than most companies with two real screens before the onsite. Every onsite round tied closely to the actual job on an observability team — 'especially storage migration, host cost, and working across a matrix organization.' Notable unusual rounds: a cross-org partnership round with a cost-management stakeholder, and a 'code review' that turned into live coding from scratch.",
    optimalAnswer: {
      clarifyingQuestions: [
        "What's the read/write ratio on this metrics data — is it write-heavy (ingest) with occasional reads, or read-heavy (dashboards, alerting queries)?",
        "Does 'strong consistency' apply to all reads, or only to reads immediately following a write from the same region (e.g. an EU write must be strongly consistent for EU readers, without paying cross-region latency for US readers of US data)?",
        "During migration, can the two systems run genuinely in parallel (dual-write), or does the legacy system's scaling issues mean it can't absorb any additional load?",
        "What does 'losing internal data' mean precisely here — zero data loss on the metrics themselves, or does that extend to derived state like alert history and dashboards built on the old system?",
      ],
      requirements: [
        "Store large block values (up to ~300KB) keyed by a smaller key (up to ~1KB) with low-latency reads and writes",
        "Serve both EU and US users with low latency and strong consistency for their own region's data",
        "Partition the system so it scales smoothly from millions of records to hundreds of millions or billions without a redesign",
        "Migrate off the old metrics system with zero live-traffic interruption and zero internal data loss",
      ],
      approach:
        "Treat this as three layered problems solved in order: first the storage engine itself (how a block is stored and fetched), then how that engine is partitioned and replicated across regions to hit the EU/US latency and consistency bar, and only then the migration plan — which becomes mostly mechanical once the new system's partitioning scheme is settled, because the migration just has to move data into a shape the new partitioning already expects.",
      keyPoints: [
        "Store each block as (key, value) where the value is chunked into fixed-size sub-blocks (e.g. 32-64KB) written and read in parallel — at up to 300KB per value, chunking keeps a single write/read from becoming one large sequential I/O and lets a partial failure retry just the missing chunk instead of the whole value",
        "Partition by a hash of the key across a consistent-hashing ring, so partitions rebalance by moving the minimum number of keys when nodes are added — this is the direct answer to the 'millions → billions of records' partitioning question, since resharding cost stays proportional to the change in cluster size, not to total data volume",
        "For the EU/US split: each region runs its own full set of partitions holding that region's data, keyed so a record's home region is derivable from the key (e.g. an embedded region tag) — this gives strong consistency for regional reads without a cross-region round trip, since a US read never needs to consult EU nodes for US data",
        "Cross-region replication (for global aggregate views, or disaster recovery) runs asynchronously, not synchronously — synchronous cross-region writes would force every write to pay transatlantic latency, defeating the low-latency requirement",
        "For the migration: dual-write to both the legacy and new systems once the new system's schema/partitioning is live, backfill historical data into the new system in the background (rate-limited so it doesn't compete with live dual-write traffic), then verify the backfill against the legacy system's data with a reconciliation pass before cutting reads over",
        "Cut over reads gradually (a percentage of read traffic at a time) with the ability to fall back to the legacy system instantly, and only decommission the legacy system once the new system has served 100% of reads correctly for a defined bake-in period — this is what actually delivers 'no interruption, no data loss,' not a single instantaneous cutover moment",
      ],
      tradeoffs: [
        "Consistent hashing for partitioning (minimal data movement on rebalance, some operational complexity in ring management) vs. static range partitioning (simpler to reason about initially, but a range that grows hot or a cluster resize can require moving a large fraction of all data) — consistent hashing is close to mandatory once volume is explicitly expected to grow by orders of magnitude",
        "Region-local partitions with async cross-region replication (strong consistency per-region, low latency, eventual global view) vs. one globally-distributed partition set with synchronous cross-region consensus (strong global consistency everywhere, but every write pays cross-region latency) — region-local wins decisively given the explicit 'low latency, strong consistency' framing is per-region, not global",
        "Dual-write + gradual read cutover migration (safe, verifiable, more moving parts and a longer migration window) vs. a big-bang cutover after an offline data copy (much simpler, but any bug in the copy or any traffic during the cutover window risks data loss or downtime) — dual-write is the only approach that actually satisfies 'no interruption, no data loss' as stated requirements rather than best-effort goals",
      ],
      followUps: [
        "How would you detect and reconcile a discrepancy the backfill verification pass finds between the legacy and new systems mid-migration?",
        "How would you handle a hot key — one metric ID that's written far more often than others — under this partitioning scheme?",
        "What's your rollback plan if the new system shows a correctness bug after read traffic has already partially cut over?",
      ],
      relatedLinks: [
        { label: "Foundations: Consistent Hashing", href: "/foundations/consistent-hashing" },
        { label: "Foundations: Database Replication", href: "/foundations/database-replication" },
      ],
    },
  },
  {
    id: "apple-view-hierarchy-hit-test",
    company: "Apple",
    title: "Given a view hierarchy and a point, return every view containing it",
    prompt:
      "Given a view hierarchy and a coordinate point, return all views that contain that point. Define your traversal strategy across the view tree, how you handle overlapping or nested views, and how hit-testing works on a constrained device.",
    category: "lld-ood",
    tags: ["lld-coding-exercise"],
    level: "ICT3, mobile system design",
    source: {
      name: "Exponent — Apple System Design Interview (2026 Guide)",
      url: "https://www.tryexponent.com/blog/apple-system-design-interview",
      confidence: "high",
    },
    context:
      "Listed as an ICT3-level mobile system design example in Exponent's Apple guide (written with input from Apple engineers and interviewers across ICT3-ICT5 roles, including Siri and Apple Intelligence teams). Framed explicitly as testing whether a candidate can reason about on-device computation, not backend architecture — the blog's broader point is that Apple takes client-side/mobile system design as seriously as server-side, unusual among big tech.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Can views overlap arbitrarily (z-order matters), or is the hierarchy guaranteed non-overlapping at each level?",
        "Should the result include every containing view at every level of nesting, or only the deepest (topmost, front-most) view that contains the point?",
        "Are view bounds always axis-aligned rectangles, or can a view have a non-rectangular hit region (e.g. a circular button)?",
        "Is this a one-off query, or does it need to run on every touch event at 60fps-class frequency, which changes how much precomputation is worth doing?",
      ],
      requirements: [
        "Given a view tree and a point, return every view whose bounds contain that point",
        "Handle nested and overlapping views correctly, respecting each view's actual bounds within its parent's coordinate space",
        "Run fast enough to be usable on every touch event on a resource-constrained device, not just as a batch query",
      ],
      approach:
        "Treat the view hierarchy as a tree where each view's bounds are expressed relative to its parent, and do a depth-first traversal that transforms the point into each child's local coordinate space as it descends — pruning a whole subtree the moment the point falls outside a view's bounds, since nothing inside a view can be hit if the point isn't inside that view first.",
      keyPoints: [
        "Each `View` node stores its bounds (origin + size) relative to its parent's coordinate space, plus a list of child views in front-to-back or back-to-front order (whichever the platform's rendering convention uses) and a clipsToBounds flag",
        "`hitTest(point)` on a node first checks whether the point falls within its own bounds; if not, it returns immediately without recursing into children — pruning like this keeps the traversal proportional to the visible depth of the hierarchy actually under the point, not the whole tree",
        "If the point is inside the node's bounds, translate the point into the node's own coordinate space (subtract the node's origin) and recurse into each child with the translated point — every level of the tree does this translation exactly once, which is what keeps the containment check correct however deeply the hierarchy is nested",
        "Collect every node along the path where the point falls within bounds, not just the deepest one — the prompt asks for 'all views that contain the point,' which for a typical UI is the full ancestor chain from root down to the frontmost view actually hit",
        "If a node has `clipsToBounds` set and the point falls outside its bounds, don't even recurse into its children, since a clipped child can't be visible (and therefore shouldn't be hittable) outside its parent's bounds regardless of the child's own geometry",
        "For a non-rectangular hit region (e.g. a circular button), the bounds check for that specific node becomes a shape-specific test (distance-from-center for a circle) rather than a plain rectangle containment check — the rest of the traversal logic is unaffected, since this only changes the leaf-level test, not the tree-walking strategy",
      ],
      tradeoffs: [
        "Depth-first traversal with early pruning on out-of-bounds nodes (proportional cost to the hit path's depth, simple recursive implementation) vs. checking every leaf view's absolute screen-space bounds directly (avoids coordinate-space translation logic, but has to check every leaf regardless of hierarchy structure and duplicates work for deeply nested UIs) — pruned depth-first traversal is the standard real-UI-framework approach and scales far better on a device with limited CPU",
        "Returning the full ancestor chain (matches what the prompt literally asks, useful when a gesture recognizer needs to know every view a touch is inside) vs. returning only the topmost hit view (simpler API, matches how most touch-handling code actually wants to consume the result) — the prompt's own wording ('all views that contain that point') settles this in favor of the full chain, but worth stating the trade-off explicitly since real UI frameworks usually optimize for the topmost-hit case",
        "Recomputing hit-testing fresh on every touch event (always correct, cost scales with hierarchy depth) vs. caching a spatial index of view bounds (faster repeated queries, but the index has to be invalidated on every layout change, which for an interactive UI happens constantly) — plain recomputation is usually the right call here, since view hierarchies in interactive UIs are shallow enough that traversal cost is already negligible next to layout/render cost",
      ],
      followUps: [
        "How would this change if views could be transformed (rotated, scaled) relative to their parent, not just translated?",
        "How would you extend hit-testing to respect a view's opacity or an alpha-mask, so a fully-transparent pixel doesn't register a hit?",
        "How would you make this work for multitouch, where several points need hit-testing against the same hierarchy simultaneously?",
      ],
      relatedLinks: [
        { label: "LLD: OOP Fundamentals", href: "/lld/oop-fundamentals" },
        { label: "LLD: UML Class Diagrams", href: "/lld/uml-class-diagrams" },
      ],
    },
  },
  {
    id: "apple-canvas-app-shapes-layers-dragdrop",
    company: "Apple",
    title: "Design a canvas app: shapes, layers, drag-and-drop, undo/redo",
    prompt:
      "Design a canvas application that supports shapes, text, layering, and drag-and-drop repositioning of elements. Cover your data model for elements and layers, how you handle rendering efficiently, and how undo/redo state is managed. Expect follow-up questions on collaborative editing and conflict resolution.",
    category: "lld-ood",
    tags: ["lld-coding-exercise"],
    level: "ICT4",
    source: {
      name: "Exponent — Apple System Design Interview (2026 Guide)",
      url: "https://www.tryexponent.com/blog/apple-system-design-interview",
      confidence: "high",
    },
    context:
      "Listed as an ICT4-level example from Apple interviewers in Exponent's Apple guide. The guide explicitly frames ICT4 as expecting 'a coherent end-to-end design with clean API definitions, a reasonable data model, and a discussion of how components interact' — and notes ICT5 candidates get pushed further on the same base design (here: into collaborative editing and conflict resolution) rather than being asked a harder question outright.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is undo/redo scoped per-session (cleared on app close) or does it need to persist across sessions?",
        "How many elements does a typical canvas hold — tens, or thousands — since that changes whether naive re-render-everything is acceptable?",
        "Is collaborative editing in scope for the base design, or purely a follow-up direction the interviewer might push into?",
        "Do layers have their own transform (e.g. a layer-level pan/zoom) independent of the elements inside them, or is layering purely a z-order/visibility concept?",
      ],
      requirements: [
        "Model shapes, text, and layers with position, size, and z-order",
        "Support drag-and-drop repositioning of any element",
        "Render efficiently as the canvas grows, without redrawing unaffected elements on every interaction",
        "Support undo/redo across the editing session",
      ],
      approach:
        "Separate the canvas into three layers of responsibility: an element/layer data model that's just data (no rendering logic baked in), a command layer that represents every mutation as an object (which is what makes undo/redo fall out almost for free), and a rendering layer that only repaints the regions actually affected by the last change.",
      keyPoints: [
        "Model a `CanvasElement` base type (position, size, z-index, layerId) with subtypes `Shape` (shape kind, fill/stroke) and `TextElement` (content, font); a `Layer` holds an ordered list of element IDs and its own visibility/lock flags — layering is a grouping and z-order concept, elements themselves don't need to know which layer they're in beyond a back-reference",
        "Represent every mutation (move, resize, add, delete, reorder) as a `Command` object with `execute()` and `undo()` methods, applied through a single `CommandStack` — this is the Command design pattern, and it's what makes undo/redo systematic instead of ad hoc: undo just calls the last command's `undo()` and pops it onto a redo stack, redo pushes it back and re-executes",
        "Drag-and-drop repositioning doesn't commit a `MoveCommand` on every mousemove frame — it tracks a live drag offset outside the command stack during the drag, and only pushes one `MoveCommand` (start position → end position) when the drag ends, so a long drag doesn't flood undo history with dozens of intermediate steps",
        "For rendering efficiency, maintain a spatial index (e.g. a quadtree keyed on element bounds) and, on each change, invalidate and redraw only the screen region the changed element's old and new bounds cover — a full-canvas redraw on every small move doesn't scale once the canvas holds more than a handful of elements",
        "Layer visibility/lock toggles are handled at render and hit-test time by skipping elements whose layer is hidden or locked, rather than removing them from the model — this keeps undo/redo and the data model itself simple, since hiding a layer is just a flag flip, not a structural change to what elements exist",
        "For the ICT5-level collaborative-editing follow-up: represent each command as an operation with enough context (element ID, before/after state) to apply an operational-transform or CRDT-style merge against concurrent commands from another user, so two people moving different elements simultaneously merge cleanly, and two people moving the same element resolves via a defined policy (e.g. last-write-wins by timestamp, or explicit conflict surfacing)",
      ],
      tradeoffs: [
        "Command-pattern undo/redo (systematic, every mutation is automatically undoable, small memory overhead per command) vs. full-state snapshots on every change (trivial to implement, but memory cost scales with canvas size × number of undo steps kept) — the command pattern is worth the extra design upfront specifically because it's the difference between undo/redo being a designed feature versus a bolted-on hack",
        "Spatial-index-driven partial redraw (scales to large canvases, real complexity in index maintenance) vs. full-canvas redraw on every change (trivially correct, simple, but becomes visibly janky well before a canvas gets to hundreds of elements) — partial redraw is the standard answer once 'rendering efficiently' is an explicit requirement rather than an afterthought",
        "CRDT/operational-transform merge for collaborative editing (correct convergence without a central lock, more complex to implement) vs. a single global edit lock (trivial to implement, but defeats real-time collaboration — only one person can edit at a time) — CRDT/OT wins if collaborative editing is a genuine requirement, which is exactly the direction the prompt signals an ICT5 interviewer will probe",
      ],
      followUps: [
        "How would you handle two users dragging the same element simultaneously in the collaborative-editing extension?",
        "How would you cap undo history memory for a very long editing session without losing the ability to undo recent changes?",
        "How would grouping (treating several elements as one draggable/undoable unit) change your command and data model?",
      ],
      relatedLinks: [
        { label: "LLD: Behavioral Patterns", href: "/lld/behavioral-patterns" },
        { label: "LLD: UML Class Diagrams", href: "/lld/uml-class-diagrams" },
      ],
    },
  },
  {
    id: "apple-typeahead-privacy-angle",
    company: "Apple",
    title: "Design a typeahead search box, with a privacy follow-up",
    prompt:
      "Design a typeahead box for a search engine — focus on the client-server split, latency requirements for real-time suggestions, and result ranking. At Apple, expect a follow-up on the privacy angle: what query data, if any, is logged, how it is isolated, and what the on-device versus server-side split looks like.",
    category: "system-design",
    tags: ["search-indexing"],
    source: {
      name: "Exponent — Apple System Design Interview (2026 Guide)",
      url: "https://www.tryexponent.com/blog/apple-system-design-interview",
      confidence: "high",
      note: "The base typeahead prompt is a common cross-company question (also reported for Pinterest, Meta, Amazon, TikTok, Adobe, and Oracle per Exponent's own question DB); the Apple-specific privacy follow-up framing comes from Exponent's Apple system-design blog, written with input from Apple interviewers across multiple teams.",
    },
    context:
      "The Apple guide's broader framing (reread in full) is that privacy is treated as a first-class design constraint at Apple, not a section addressed at the end — 'the candidates who perform best treat privacy as a design constraint from the start, the way they would treat latency or availability at other companies.' Typeahead is used as a concrete example of where that shows up: search-query logging is a genuine privacy-sensitive surface, since query text can itself contain personal information.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is this an on-device search (e.g. Spotlight-style search over local content) or a query against a remote/web index?",
        "What's the acceptable end-to-end latency budget for a suggestion to appear after a keystroke?",
        "Does ranking need to reflect a specific user's history/preferences, or is it a shared, population-level ranking?",
        "What's the retention policy expectation for any query data that is logged — is this a greenfield design or a constraint layered onto an existing logging pipeline?",
      ],
      requirements: [
        "Return ranked suggestions within a low-latency budget on every keystroke",
        "Rank suggestions by relevance/popularity, ideally improving as more usage data accumulates",
        "Scale to serve suggestion requests fired on every keystroke across a large user base",
        "Minimize what raw query data is logged, and isolate/anonymize what is logged, as a first-class part of the design",
      ],
      approach:
        "Split the system into an offline path that builds and periodically refreshes a fast-lookup suggestion index from aggregated (not raw, per-user) query data, and an online path that serves suggestions from that index with a tight latency budget — then treat privacy as a constraint on the offline path's inputs, not a filter bolted onto the online path's outputs.",
      keyPoints: [
        "Serve suggestions from a Trie (or a similarly prefix-indexed structure) mapping a typed prefix to its top-K most likely completions, precomputed offline — a live per-keystroke request only needs a prefix lookup against this structure, not a fresh ranking computation",
        "Build/refresh the Trie from an aggregated, privacy-scrubbed pipeline: query events are counted and aggregated (e.g. minimum-count thresholds so a rare, potentially personally-identifying query never surfaces as a suggestion) before they ever influence the served ranking — this is where the privacy requirement is actually enforced, upstream of serving",
        "Cache the Trie (or hot subtrees of it) in-region behind a CDN/edge cache close to users, since suggestion lookups are extremely read-heavy relative to how often the underlying data changes — this is also what makes the latency budget achievable at scale",
        "For personalization, keep any per-user signal (recent searches, frequently opened results) in a small, on-device store rather than a server-side per-user profile — suggestions are composed client-side by merging the shared, aggregated server ranking with the user's local history, so personal query history never has to leave the device to shape their own suggestions",
        "Don't fire a network request on every single keystroke against the live prefix — debounce slightly (or serve the first several characters entirely from a small on-device cache of common prefixes) so the client-server split doesn't turn into a request storm during fast typing",
        "For the privacy follow-up specifically: log only aggregated, k-anonymized query statistics server-side (counts per query, not per-user query logs), keep raw per-user query text on-device only if retained at all, and treat any server-side logging as opt-in telemetry rather than a default data-collection path",
      ],
      tradeoffs: [
        "On-device personalization merged with a shared server ranking (personal query history never leaves the device, more client-side logic and storage) vs. a fully server-side personalized ranking (simpler server architecture, one ranking pipeline, but requires storing per-user query history server-side) — on-device merging is the answer Apple's framing specifically points toward, since it gets personalization without creating a server-side store of what is effectively a log of what a user has searched for",
        "Aggregated, k-anonymized query logging (privacy-preserving by construction, loses the ability to debug or improve ranking from individual query sessions) vs. raw per-query logging (much easier to debug and iterate on ranking quality) — aggregation wins whenever privacy is a stated first-class constraint, even though it costs real debuggability",
        "Precomputed Trie refreshed periodically (fast reads, suggestions lag real-world trending queries by the refresh interval) vs. computing rankings from live query logs on every request (always current, but far too slow to hit a per-keystroke latency budget at scale) — precomputation wins because the latency requirement is non-negotiable and a short refresh lag on suggestion freshness is an acceptable trade",
      ],
      followUps: [
        "How would you surface a genuinely trending query (a sudden spike) faster than your normal Trie-refresh cadence allows?",
        "How would you handle a prefix with no cached suggestions — an empty subtree in the Trie?",
        "What changes about your privacy story if suggestions need to draw on a user's private/local content (contacts, files) alongside public web results?",
      ],
      relatedLinks: [
        { label: "Foundations: Caching", href: "/foundations/caching" },
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
      ],
    },
  },
  {
    id: "apple-auth-migration-oidc",
    company: "Apple",
    title: "Migrate a SaaS product from Basic Auth to OIDC",
    prompt:
      "You're working on a SaaS product that currently uses Basic Authentication (username/password) for API and application access. Security and compliance have mandated moving to OIDC (OpenID Connect). Design the migration from Basic Auth to OIDC: the architecture changes, the migration approach, and the rollout strategy. What are the technical challenges, impacts on customers, backward-compatibility considerations, and deployment plan? How do you ensure minimal downtime, minimal customer impact, and a secure transition?",
    category: "system-design",
    tags: ["auth-secrets", "data-migration"],
    source: {
      name: "Exponent question DB",
      url: "https://www.tryexponent.com/questions/5394/authentication-system-migration",
      reportedDate: "~Aug 2025 (a year ago)",
      confidence: "high",
      note: "The bare prompt text is 'design a plan to migrate an existing authentication system to a new one'; the full detail (Basic Auth → OIDC, the specific follow-up questions) comes from a community-contributed answer thread on the same question page, upvoted and marked 'Hot,' which restates the interviewer's actual framing rather than just proposing a solution.",
    },
    context:
      "Directly relevant given Apple's system design round's consistent emphasis on treating authentication and authorization as first-class design concerns rather than afterthoughts, per the Exponent Apple blog (reread in full this pass), which independently lists an authentication-migration prompt as a named example with the same expected follow-ups: token formats and how access-control policies are enforced mid-migration.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Are there active, long-lived Basic Auth sessions/API keys already in production that need to keep working during the transition, or can existing credentials be force-rotated?",
        "Is this API-only, or does it also cover an interactive web application login flow, since OIDC's redirect-based flow behaves very differently from a header-based API credential?",
        "Do downstream services that currently validate Basic Auth credentials themselves need to be migrated too, or does a single gateway own all authentication?",
        "What's the compliance deadline — is there a hard cutoff date Basic Auth must be disabled by, which would change how aggressive the rollout can be?",
      ],
      requirements: [
        "Support OIDC-based authentication for both API and application access",
        "Keep existing Basic Auth clients working throughout the migration window (backward compatibility)",
        "Achieve zero (or minimal) downtime during the cutover",
        "Ensure the transition doesn't weaken security at any point — no window where both old and new methods are simultaneously less secure than either alone",
      ],
      approach:
        "Put an authentication gateway in front of the application that can accept both Basic Auth and OIDC tokens simultaneously during a transition window, issue OIDC tokens progressively to clients as they migrate, and only remove Basic Auth support once telemetry confirms real traffic has actually moved off it — treating the deadline as a target for that telemetry to hit zero, not a hard flag-flip date.",
      keyPoints: [
        "Introduce an OIDC identity provider (either a managed one or self-hosted) issuing standard tokens (ID token + access token, typically JWTs) alongside the existing Basic Auth credential store — the two systems run in parallel rather than one replacing the other on day one",
        "The authentication gateway (or each service's auth middleware, if there's no central gateway) accepts either an `Authorization: Basic ...` header or a valid OIDC bearer token during the transition, validating each through its own path — this is what makes 'backward compatible' concrete rather than aspirational",
        "Roll out OIDC to clients in cohorts, starting with internal/low-risk consumers, then external API clients, communicating a clear deprecation timeline for Basic Auth to each cohort as they're migrated — this mirrors how a DNS or API-version migration is staged, and gives customers real lead time rather than a surprise cutover",
        "Instrument both auth paths with metrics (requests authenticated via Basic Auth vs. OIDC, broken down by client/API key) so the team can see real Basic Auth usage trend toward zero rather than assuming migration is complete because a deadline passed",
        "Handle active sessions during the application-login-flow migration by allowing an existing Basic-Auth-authenticated session to continue until natural expiry, while all new logins go through the OIDC flow — this avoids forcibly logging out every user at cutover, which itself would be a customer-impact and support-load event",
        "Define an explicit rollback path at each rollout stage (re-enable Basic Auth for a cohort that hit an OIDC integration issue) rather than a one-way migration, since 'secure transition' includes not getting stuck in a broken state if a client's OIDC integration is buggy",
      ],
      tradeoffs: [
        "Dual-auth-method gateway with cohort-based rollout (real backward compatibility, telemetry-driven confidence before removing the old method, longer overall migration timeline) vs. a hard cutover on a fixed date (faster to reach 'fully migrated,' but any client that hasn't integrated OIDC by the deadline breaks immediately) — dual-support wins whenever 'minimal customer impact' is an explicit requirement, as it is here",
        "JWT-based OIDC tokens (stateless validation, no session-store lookup per request, but harder to revoke instantly since a token is valid until it expires) vs. opaque tokens validated against a central session store (instant revocation, but adds a lookup on every request and a new stateful dependency) — JWTs are the more standard OIDC choice and fit an API-heavy product better, but instant-revocation needs (e.g. a compromised token) should be called out as a gap this trade-off creates",
        "Communicating a deprecation timeline per client cohort (respects that different clients migrate at different speeds, more operational overhead to track) vs. one global deadline for everyone (simpler to communicate and track, but ignores that some clients — especially external ones — genuinely need more lead time) — per-cohort timelines are worth the overhead for an external-facing API product where breaking a customer's integration has real business cost",
      ],
      followUps: [
        "How would you revoke a compromised OIDC token immediately, given that JWTs are normally valid until expiry?",
        "How would you handle a client that authenticates via Basic Auth from a script that no human is actively maintaining, and won't proactively migrate?",
        "What access-control policy changes are needed once identity comes from OIDC claims instead of a username looked up directly against a local user table?",
      ],
      relatedLinks: [
        { label: "Foundations: REST APIs", href: "/foundations/rest-apis" },
        { label: "Foundations: Database Replication", href: "/foundations/database-replication" },
      ],
    },
  },
  {
    id: "apple-applicant-tracking-system",
    company: "Apple",
    title: "Design an Applicant Tracking System",
    prompt:
      "Design an Applicant Tracking System (ATS). Define your data model for candidates, roles, and pipeline stages. Cover the APIs your front end needs, storage trade-offs for search and filtering, and how permissions differ across user roles — with an eye toward privacy-aware design around sensitive candidate data.",
    category: "system-design",
    tags: ["workflow-crud-system"],
    source: {
      name: "Exponent question DB",
      url: "https://www.tryexponent.com/questions/3222/design-applicant-tracking-system",
      reportedDate: "~2023 (3 years ago)",
      confidence: "high",
      note: "The bare DB entry ('Design an Applicant Tracking System (ATS)') is elaborated with this multi-part structure — data model, APIs, storage/search trade-offs, role-based permissions, privacy-aware design — by the Exponent Apple system-design blog, reread in full this pass, which independently lists it as a named example question.",
    },
    context:
      "Listed among the Exponent Apple blog's system design question examples. Consistent with the blog's broader framing that Apple interviewers expect privacy and access control woven through a design from the start — an ATS is used as an example specifically because candidate data (résumés, interview feedback, compensation expectations) is sensitive by nature, giving a natural privacy angle without it feeling bolted on.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Who are the distinct user roles — recruiter, hiring manager, interviewer, HR/compliance — and how differently should each see the same candidate record?",
        "Does search/filtering need to be full-text over resumes and interview notes, or structured filtering over fields like role, stage, and source?",
        "Should interview feedback be visible to other interviewers before they submit their own (to avoid anchoring), or hidden until everyone has submitted?",
        "Is there a data-retention requirement for rejected candidates' data (a common compliance constraint for ATS products)?",
      ],
      requirements: [
        "Model candidates, job requisitions, and pipeline stages, with a candidate's progress trackable through a defined stage sequence",
        "Support search and filtering over candidates by role, stage, skills, and other structured/free-text fields",
        "Enforce role-based permissions so different users see and can edit different subsets of a candidate's data",
        "Protect sensitive candidate data (contact info, compensation expectations, interview feedback) as a first-class design constraint, not an add-on",
      ],
      approach:
        "Model the domain around three core entities — `Candidate`, `Requisition`, and `Application` (the join between a candidate and a requisition, carrying the pipeline-stage state) — then layer role-based field-level access control on top, since an ATS's real complexity isn't the pipeline state machine, it's who is allowed to see which fields of which record.",
      keyPoints: [
        "`Candidate` holds identity and contact info; `Requisition` holds an open role's details; `Application` links one candidate to one requisition and owns the mutable pipeline state (current stage, stage history with timestamps) — modeling stage as a property of the Application, not the Candidate, correctly allows one candidate to be in different stages of different open roles simultaneously",
        "Interview feedback is its own entity (`Feedback`: interviewer, application, rating, notes, submitted-at), not a field on `Application` — this makes it natural to enforce 'hidden until everyone submits' by filtering `Feedback` records at query time based on the requesting interviewer's own submission status, rather than needing a separate visibility flag",
        "Role-based access control is enforced at the API/query layer via a permission matrix keyed on (role, field): a recruiter sees full contact info and compensation expectations, an interviewer sees the candidate's resume and role context but not compensation, and this is checked server-side on every field returned, not just gated by hiding UI elements client-side",
        "For search/filtering: structured fields (stage, requisition, source) are indexed directly in the primary store for fast filtering; free-text fields (resume content, feedback notes) are indexed separately in a search engine (e.g. an inverted-index/full-text search service) kept in sync via change-data-capture from the primary store, since full-text search and structured filtering have very different storage and query characteristics",
        "Log every access to a candidate's sensitive fields (who viewed compensation expectations, when) to a separate audit trail — an ATS is exactly the kind of system where 'who looked at this candidate's data and why' is a real compliance question, not a hypothetical one",
        "Data-retention: build an explicit expiry/anonymization job for rejected candidates' data past a configured retention window (e.g. scrub contact info and free-text feedback, retain only aggregate pipeline-stage statistics) rather than keeping every rejected application's full data indefinitely by default",
      ],
      tradeoffs: [
        "Field-level, server-enforced permissions (correct even against a malicious or buggy client, more complex query/serialization logic) vs. UI-level hiding of sensitive fields (much simpler to build, but any direct API call bypasses it entirely) — server-enforced field-level access is the only approach that actually satisfies 'privacy-aware design,' since UI-only hiding isn't real access control",
        "Separate full-text search index kept in sync via CDC (fast, relevance-ranked search over resumes/notes, added infrastructure and eventual-consistency lag between primary store and search index) vs. running `LIKE`-style queries directly against the primary store (no extra infrastructure, but poor relevance ranking and query performance degrades badly as candidate volume grows) — a dedicated search index is worth it the moment resume/notes search is a real product requirement, not just a rarely-used nice-to-have",
        "Modeling pipeline stage on `Application` rather than `Candidate` (correctly supports one candidate in multiple concurrent pipelines, slightly more entities to reason about) vs. a single stage field directly on `Candidate` (simpler model, but breaks the moment a candidate applies to two roles at once) — the `Application`-based model is worth the extra entity because the single-stage model is a real correctness bug waiting to happen, not just a theoretical edge case",
      ],
      followUps: [
        "How would you support a hiring manager comparing multiple candidates for the same requisition side-by-side without leaking one candidate's feedback into how they read another's?",
        "How would you handle a candidate reapplying to a different requisition months later — do they get a fresh `Candidate` record or does history carry forward?",
        "How would your audit log itself need to be access-controlled, given that 'who viewed this candidate's data' is itself sensitive?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Indexing Deep Dive", href: "/foundations/database-indexing-deep-dive" },
        { label: "Foundations: REST APIs", href: "/foundations/rest-apis" },
      ],
    },
  },
  {
    id: "apple-subscription-form-billions-scale",
    company: "Apple",
    title: "Handle a subscription form accessed by billions of people",
    prompt:
      "Scenario from a coded system-design round: you're the network lead for a large volunteer organization and need to circulate a signup form with a subscription fee. The form is accessed by billions of people. Design a robust system to handle wide-scale usage.",
    category: "system-design",
    tags: ["capacity-scaling"],
    level: "Java Backend Engineer",
    source: {
      name: "LeetCode Discuss — Apple Interview Experience | L4 | SDE 2 | Hyderabad",
      url: "https://leetcode.com/discuss/post/6461783/apple-interview-experience-l4-sde-2-hyde-o46k/",
      reportedDate: "Feb 2025",
      confidence: "high",
      note: "Full multi-round interview write-up reread directly; the original post names the specific organization the scenario was framed around, generalized here to 'a large volunteer organization' consistent with this app's sourcing convention of not reproducing identifying specifics that aren't load-bearing to the design problem.",
    },
    context:
      "Reported as the system design portion of a Java Backend Engineer onsite loop, which otherwise focused heavily on Java/Spring Boot fundamentals and a multithreading countdown-timer coding exercise. The candidate's own summary: 'System design is more about scalability and handling large-scale users effectively' — and to prepare across 'Java, Spring Boot, Multithreading, and System Design' together, reflecting how tightly Apple's rounds mix language-specific depth with architecture at this level.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is 'billions of people accessing the form' the total addressable audience, or the expected concurrent/peak load — those imply very different designs?",
        "Does the subscription fee need to be processed synchronously (user sees confirmation immediately) or can payment confirmation be asynchronous?",
        "Is the form itself static (same fields for everyone) or does content vary by user/region?",
        "What happens if payment succeeds but the signup record fails to save, or vice versa — is exactly-once signup+payment a hard requirement?",
      ],
      requirements: [
        "Serve a signup form to a very large, geographically distributed audience without degrading under load",
        "Process a subscription fee per signup reliably — never charge without recording a signup, never record a signup without a successful (or explicitly tracked) charge",
        "Handle bursty access patterns (a link shared publicly tends to spike, not arrive as steady traffic)",
        "Remain available even if a downstream dependency (e.g. the payment processor) is degraded",
      ],
      approach:
        "Split the problem into a static, cacheable front door (the form itself) and a much smaller, carefully-guarded write path (the actual signup + payment), since 'billions of people access the form' mostly describes read/view load that's trivial to absorb with caching — the real design problem is keeping the signup-and-charge write path correct and available under a much smaller, but still large, burst of actual submissions.",
      keyPoints: [
        "Serve the form's static assets (HTML/JS/CSS, field definitions) from a CDN — this alone absorbs the overwhelming majority of 'billions of people accessing the form' load, since viewing the form is a pure read of content that rarely changes",
        "The submit endpoint sits behind a load balancer fanning out to a stateless application tier that can scale horizontally with demand — no session affinity needed if the form itself doesn't require multi-step server-side state",
        "Decouple the write path: on submit, validate input and write a `PendingSignup` record immediately (fast, durable), then enqueue a payment-processing job onto a queue rather than calling the payment processor synchronously in the request path — this keeps the user-facing request fast and keeps a slow/degraded payment processor from cascading into slow form submissions",
        "A worker pool consumes the payment queue, calls the payment processor, and on success flips the record to `Confirmed`; on failure, retries with backoff up to a limit, then flips to `Failed` and notifies the user (email/webhook) rather than leaving them in limbo — this is what delivers 'never charge without a signup record, never lose a signup without knowing the payment outcome'",
        "Rate-limit and apply basic bot/abuse protection at the edge (before the request even reaches the application tier) since a form that processes a fee is a natural target for abuse — this protects both the application tier and the payment processor from being overwhelmed by non-human traffic",
        "Idempotency: require an idempotency key on submit (generated client-side) so a user's retried submission after a timeout doesn't create a duplicate `PendingSignup` or trigger a duplicate charge — critical once payment is involved, since a network blip shouldn't cost a user double",
      ],
      tradeoffs: [
        "Asynchronous payment processing via a queue (submit stays fast and available even if the payment processor is slow, adds eventual-consistency between 'submitted' and 'confirmed') vs. synchronous payment processing in the request path (user gets an immediate yes/no, but the form's availability now directly depends on the payment processor's availability and latency) — async wins decisively at this scale, since coupling form availability to a third-party payment processor's uptime is exactly the kind of fragility a robust design for billions of potential users needs to avoid",
        "CDN-served static form (near-zero marginal cost per view, form content changes require a cache-invalidation/redeploy step) vs. dynamically rendering the form per-request (trivial to make dynamic content, but every single view now hits the application tier) — CDN-served static wins unless the form genuinely needs to be dynamic per-user, since read volume here dwarfs write volume by orders of magnitude",
        "Idempotency keys enforced at the write layer (prevents duplicate charges cleanly, requires client cooperation to generate and resend the same key on retry) vs. no idempotency handling (simpler, but a network retry after a timeout can double-charge a real user) — idempotency is close to mandatory the moment money changes hands, regardless of scale",
      ],
      followUps: [
        "How would you handle a payment processor outage lasting hours — do submissions queue indefinitely, or is there a fallback?",
        "How would you detect and mitigate a bot attempting to submit the form (and incur charges) at scale?",
        "How would this design change if the form needed to enforce a hard capacity limit (e.g. a capped number of subscriptions)?",
      ],
      relatedLinks: [
        { label: "Build it: Flash Sale scenario", href: "/workshop?scenario=flash-sale" },
        { label: "Foundations: Load Balancers", href: "/foundations/load-balancers" },
      ],
    },
  },
  {
    id: "apple-icloud-photos-sync-devices",
    company: "Apple",
    title: "Design iCloud Photos sync across a user's devices",
    prompt:
      "Design iCloud Photos sync across a user's devices — a photo (or edit, deletion, album change) made on one device should propagate to every other device signed into the same account, correctly and without conflicting or duplicating.",
    category: "system-design",
    tags: ["media-storage"],
    source: {
      name: "Exponent — Apple Software Engineer (SWE) Interview Guide",
      url: "https://www.tryexponent.com/guides/apple-software-engineer-interview",
      confidence: "high",
      note: "Listed as a sample system-design question in Exponent's Apple SWE guide (13 interview experiences, 111 questions, marked 'Verified'), which frames Apple's system design round as consistently built 'around Apple's own products, scoped to your team's domain.'",
    },
    context:
      "Grouped in the guide alongside iMessage delivery guarantees and Apple Push Notification service as examples of prompts built directly around real, shipping Apple products, distinct from the generic 'design a distributed system' prompts most other companies default to. The guide's system-design section stresses on-device vs. cloud trade-offs and reliability/privacy as what interviewers evaluate for exactly this style of question.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Can a user be offline on one device for an extended period and still expect a correct sync once they reconnect?",
        "Do photo edits need to sync the full edited image, or can devices sync just the edit operations and re-render locally (saving bandwidth)?",
        "Is storage capacity a factor — does every device need every photo at full resolution, or can a device keep thumbnails locally and fetch full-resolution on demand?",
        "What happens if the same photo is deleted on one device and edited on another before either change has synced?",
      ],
      requirements: [
        "Propagate a photo add/edit/delete and album-membership change from one device to every other device on the account",
        "Handle a device that was offline for a period and needs to catch up correctly once reconnected",
        "Avoid duplicating or losing photos when two devices make changes around the same time",
        "Respect mobile devices' storage and bandwidth constraints — not every device needs every photo at full resolution locally",
      ],
      approach:
        "Treat the photo library as a versioned, append-only change log per account (not a single mutable blob that devices overwrite), where each device downloads and applies the changes it's missing since its last sync point — this makes 'a device was offline, then reconnected' just a longer catch-up, not a special case, and makes conflicting concurrent edits something the log can represent explicitly rather than silently lose.",
      keyPoints: [
        "Every mutation (photo added, photo edited, photo deleted, album membership changed) is appended to a per-account change log with a monotonically increasing sequence number — a device syncs by requesting 'everything since sequence N,' where N is the last sequence it successfully applied",
        "Photo binary data (the actual image bytes) is stored separately from the change log, in cloud object storage referenced by ID — the change log entry for 'photo added' carries metadata and a reference, not the image bytes themselves, since the log needs to stay small and fast to fetch even as photo count grows into the tens of thousands",
        "Devices sync metadata (which photos exist, their edit state, album membership) eagerly and continuously, but fetch full-resolution image bytes lazily/on-demand — a device shows a thumbnail (synced eagerly, cheap) and only pulls the full-resolution original when the user actually opens or edits that photo, respecting mobile storage/bandwidth constraints directly",
        "Edits are themselves logged as operations (crop, filter, adjustment parameters) rather than only as a new full-resolution output image where possible — this both keeps sync payloads small and lets 'edit non-destructively, revert to original' work naturally, since the original is untouched and edits are a layered, replayable log",
        "For the delete-vs-edit conflict: since both operations are logged with timestamps against the same photo ID, apply a defined resolution policy — e.g. delete wins if it happened after the edit's timestamp, or (for a friendlier UX) resurrect the photo with the edit applied and let the user confirm the delete was intentional — the point being the log makes the conflict visible and resolvable rather than silently dropping one side",
        "A device that reconnects after an extended offline period just requests every log entry since its last known sequence number and replays them in order — no special 'long catch-up' code path is needed because this is the same mechanism as a normal sync, just with more entries to apply",
      ],
      tradeoffs: [
        "Append-only change log with lazy full-resolution fetch (correct catch-up for any offline duration, respects mobile storage constraints, more moving parts — log storage, sequence tracking per device) vs. syncing a mutable snapshot of the full library on every change (conceptually simpler, but any concurrent edit is a direct overwrite conflict with no record of what happened, and every device needs the full library synced eagerly) — the change-log model is what real multi-device sync systems use precisely because it makes conflicts representable instead of silently lossy",
        "Logging edits as replayable operations (small sync payloads, non-destructive editing falls out naturally) vs. syncing a fully-rendered new image per edit (simpler server-side, but every edit is a full-image-sized sync payload and undo requires keeping every prior version around) — operation-logging wins for a product where non-destructive editing is a real feature, at the cost of needing consistent edit-rendering logic across every client platform",
        "Timestamp-based conflict resolution policy (deterministic, no user interruption in the common case) vs. surfacing every conflict to the user for manual resolution (never silently loses user intent, but interrupts the user far more often than most conflicts actually warrant) — an automatic policy with a sensible default (favoring not losing data, e.g. resurrect-and-confirm over silent-delete) is the better default, reserving manual resolution for genuinely ambiguous cases",
      ],
      followUps: [
        "How would you handle a user with a very large library (100,000+ photos) doing a first-time sync on a brand-new device?",
        "How would shared albums (multiple accounts contributing to one album) change your conflict-resolution model?",
        "How would you bound the change log's growth for an account with years of continuous editing activity?",
      ],
      relatedLinks: [
        { label: "Build it: Fitness Tracker Step Sync scenario", href: "/workshop?scenario=fitness-tracker-step-sync" },
        { label: "Foundations: Database Replication", href: "/foundations/database-replication" },
      ],
    },
  },
  {
    id: "apple-imessage-delivery-guarantees",
    company: "Apple",
    title: "Design a messaging system like iMessage with delivery guarantees",
    prompt:
      "Design a messaging system like iMessage with delivery guarantees — a message sent while the recipient is offline must still be delivered once they reconnect, delivery/read status must be reflected back to the sender, and a message must never be silently lost or duplicated.",
    category: "system-design",
    tags: ["messaging-chat"],
    source: {
      name: "Exponent — Apple Software Engineer (SWE) Interview Guide",
      url: "https://www.tryexponent.com/guides/apple-software-engineer-interview",
      confidence: "high",
      note: "Listed as a sample system-design question in Exponent's Apple SWE guide, alongside iCloud Photos sync and APNs — grouped as prompts built around Apple's own shipping products rather than a generic cross-company prompt.",
    },
    context:
      "The 'with delivery guarantees' qualifier is the load-bearing part of this prompt — it points the design toward the store-and-forward, ack-based mechanics that distinguish a messaging system with real reliability guarantees from a simpler chat-relay design, which is exactly the kind of trade-off depth the guide's system-design section says Apple interviewers probe for.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Does 'delivery guarantee' mean at-least-once (recipient will eventually get it, possibly duplicated and de-duplicated client-side) or exactly-once?",
        "Should a message be deliverable to all of a user's devices simultaneously (multi-device sync), or just to whichever device is currently active?",
        "Is group messaging in scope, which changes fan-out from one recipient to several?",
        "What's the retention policy for an undelivered message if the recipient never comes back online — does it expire, or is retention indefinite?",
      ],
      requirements: [
        "Deliver a message to an offline recipient once they reconnect, without the sender needing to resend",
        "Reflect delivery and read receipts back to the sender",
        "Never silently lose a message, and avoid duplicating a message on the recipient's side",
        "Support a recipient with multiple devices, all of which should receive the message",
      ],
      approach:
        "Model the server as a durable message store the sender writes to and the recipient's devices read from and acknowledge, rather than a live relay that only works if both parties are simultaneously connected — delivery becomes 'has every one of the recipient's devices acknowledged this message,' a state the server can track and retry against, not something that depends on both parties being online at the same instant.",
      keyPoints: [
        "On send, the message is durably written to a per-recipient (per-device, if multi-device) delivery queue on the server and immediately acknowledged back to the sender as 'sent' — the sender's own success signal doesn't wait on the recipient being reachable",
        "If a recipient device has an active connection (e.g. a long-lived push/websocket connection), the message is pushed immediately; if not, it stays in that device's durable queue until the device reconnects and pulls pending messages",
        "Each device acknowledges receipt of a message by ID; only once a device acks does its copy get removed from that device's pending queue — this is what gives an at-least-once guarantee: an unacked message is retried (via push retry and eventually via a batch of pending messages on next connect), and a lost ack just means a harmless duplicate delivery attempt, not a lost message",
        "The recipient client de-duplicates on message ID, since at-least-once delivery means occasionally receiving the same message twice (e.g. an ack that was sent but lost in transit) — de-duplication client-side is what turns 'never lose a message' into 'never lose or double-show a message' from the user's perspective",
        "Delivery and read receipts are themselves small messages flowing back from recipient to sender through the same durable-queue mechanism, not a separate ad hoc status-flag system — this reuses the same reliability guarantees (at-least-once, acked, retried) for receipts instead of building a second, weaker mechanism",
        "For multi-device fan-out, the message is enqueued once per device the account has registered, and delivery status is tracked per-device — the sender's 'delivered' status reflects at least one device having acked, while 'read' more precisely reflects the device the user is actually using having acked a read event",
      ],
      tradeoffs: [
        "Durable per-device queue with retry-until-ack (survives any combination of sender/recipient going offline at any point, requires client-side de-duplication since at-least-once can double-deliver) vs. a live-relay-only design (simpler, no server-side durable state, but a message sent while the recipient is offline is simply lost) — durable queuing is the only approach that actually satisfies 'delivery guarantees' as stated, a live relay doesn't meet the bar",
        "At-least-once delivery with client-side dedup (simpler server-side guarantee to build correctly, pushes a small amount of complexity to every client) vs. attempting exactly-once delivery end-to-end (nicer guarantee on paper, but exactly-once across an unreliable network is notoriously difficult to actually achieve without the same ack/retry/dedup machinery underneath anyway) — at-least-once-plus-dedup is the standard, pragmatic answer real messaging systems converge on",
        "Per-device delivery tracking for multi-device accounts (accurately reflects 'delivered to every device,' more state to track per message) vs. tracking delivery at the account level only (simpler, but can't distinguish 'the user's phone got it' from 'the user's phone and laptop both got it,' which matters for read receipts specifically) — per-device tracking is worth the extra state for a product where read receipts are a real, visible feature",
      ],
      followUps: [
        "How would you cap how long an undelivered message stays queued for a device that never reconnects (e.g. a decommissioned old device)?",
        "How would end-to-end encryption change your server's ability to do anything with a message beyond store-and-forward the encrypted bytes?",
        "How would you extend this to group messaging, where one send needs to fan out to many recipients' queues atomically?",
      ],
      relatedLinks: [
        { label: "Build it: Flight Status Push Updates scenario", href: "/workshop?scenario=flight-status-push-updates" },
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
      ],
    },
  },
  {
    id: "apple-ondevice-vs-cloud-decision-feature",
    company: "Apple",
    title: "Design the decision system for on-device vs. cloud AI processing",
    prompt:
      "Design a feature that decides, per request, whether to run AI processing on-device or route it to the cloud — the routing decision itself is the system to design, not the model that eventually runs. Account for privacy, latency, device capability, and network conditions in how that decision gets made.",
    category: "ml-ai-system-design",
    tags: ["ai-ml-infra"],
    source: {
      name: "Exponent — Apple Software Engineer (SWE) Interview Guide",
      url: "https://www.tryexponent.com/guides/apple-software-engineer-interview",
      confidence: "high",
      note: "Listed as a sample system-design question in Exponent's Apple SWE guide. Reflects a real, current Apple architecture pattern (on-device processing with fallback to Private Cloud Compute for requests that exceed on-device model capability) described independently across multiple Apple engineering and ML-role guides reread this pass, though this specific question's wording is the guide's own.",
    },
    context:
      "This question sits at the intersection of the Exponent Apple SWE guide's system-design section (which lists it as a sample prompt) and the Apple MLE guide's own framing (reread separately this pass) that Apple's ML system design round explicitly tests 'on-device awareness: how privacy and resource limits shape your architecture choices' — this prompt asks a candidate to design that boundary-drawing logic directly, rather than the model behind either side of it.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is the on-device model a strict subset of the cloud model's capability (same task, smaller/faster/less accurate), or can they diverge in what they're each capable of?",
        "Does the user have any control over this routing (e.g. a privacy setting that forces on-device-only, even at reduced quality), or is it fully automatic?",
        "What's the latency budget difference between the two paths, and does the feature need a response within a hard deadline regardless of which path is chosen?",
        "Does 'network conditions' include being fully offline, in which case cloud routing isn't a choice at all, it's simply unavailable?",
      ],
      requirements: [
        "Decide, per request, whether to process on-device or route to the cloud",
        "Never send data to the cloud that the user or policy has designated as on-device-only",
        "Degrade gracefully when the network is unavailable or degraded, without the feature simply failing",
        "Account for the current device's compute/battery/thermal state, not just a static device-capability tier",
      ],
      approach:
        "Treat the router as a small, fast, on-device decision function evaluated before any processing begins — it should never need to make a network call itself to decide whether to make a network call — that combines a hard privacy policy check (which can force on-device regardless of everything else) with a soft cost/quality estimate (device capability, current resource state, network reachability) for anything the policy permits routing at all.",
      keyPoints: [
        "The router runs entirely on-device and evaluates in a strict order: first, a privacy/policy check — if the request category is marked on-device-only (by user setting, data sensitivity, or system policy), route on-device unconditionally and skip every other consideration",
        "For requests where cloud routing is permitted, estimate on-device feasibility from current device state: available memory, thermal throttling status, and battery level/charging state — a device under thermal throttling or low battery should bias toward cloud even if it's normally capable, since running a large model on-device in that state degrades the whole device's responsiveness",
        "Check network reachability and estimated bandwidth/latency (not just 'connected/not connected') before considering the cloud path — a technically-connected but very slow or high-latency connection should route on-device even for a request that would otherwise prefer the cloud, since the cloud round-trip needs to actually be faster in practice, not just theoretically available",
        "If on-device capability is insufficient for the request (e.g. exceeds the on-device model's context/complexity limits) and cloud routing is permitted and network conditions support it, route to a privacy-preserving cloud path — for genuinely sensitive data this should still go through techniques like Apple's Private Cloud Compute model (verifiable, stateless, no retention) rather than a conventional server call, so 'cloud' doesn't mean 'less private,' just 'more capable'",
        "If cloud routing is either disallowed or unavailable (offline, policy-blocked) and on-device capability is genuinely insufficient, fail gracefully — a lower-quality on-device-only result, or a clear 'unavailable right now' state — rather than hanging on a cloud call that will never succeed",
        "Log the routing decision itself (on-device vs. cloud, and why) locally for debugging and quality monitoring, but keep that log on-device or aggregate it before any server-side collection, consistent with the same privacy posture the routing decision itself is trying to preserve",
      ],
      tradeoffs: [
        "Hard privacy-policy check evaluated first, before any capability/cost estimation (privacy guarantee holds regardless of how the rest of the logic evolves, some requests get a worse-quality on-device result even when cloud was technically reachable) vs. treating privacy as one weighted factor among several in a scoring function (more flexible, could in theory route more requests optimally) — the hard-check-first design is the right call whenever privacy is a guarantee rather than a preference, since a scoring function can in principle be tuned or bugged into violating it, while an unconditional early-exit check structurally can't",
        "On-device resource-state-aware routing (adapts to real device conditions — thermal, battery — not just a static capability tier) vs. routing purely off static device model/tier (simpler, deterministic given the device, but sends a phone into thermal throttling or drains a nearly-dead battery running a task it technically \"can\" do) — resource-aware routing is worth the added complexity for a feature that runs on battery-powered, thermally-constrained hardware, which is Apple's entire device fleet",
        "Privacy-preserving cloud fallback (e.g. Private-Cloud-Compute-style stateless, verifiable processing) vs. a conventional cloud API call for anything routed to the cloud (much simpler infrastructure, but reintroduces exactly the privacy concern the routing decision was trying to manage for anything that can't stay on-device) — the privacy-preserving fallback is what makes 'route to cloud' not a privacy compromise, which matters specifically because the whole point of the router is to make that boundary meaningful rather than nominal",
      ],
      followUps: [
        "How would you A/B test or gradually roll out a change to the routing thresholds without risking a regression in either latency or privacy guarantees?",
        "How would you handle a request that starts on-device but the device's state changes mid-processing (e.g. thermal throttling kicks in) — can you migrate it to the cloud mid-flight, or does it have to restart?",
        "How would you monitor routing-decision quality in aggregate without collecting per-request routing logs that could themselves become a privacy-sensitive dataset?",
      ],
      relatedLinks: [
        { label: "Build it: Cost-Constrained Edge Assistant scenario", href: "/workshop?scenario=cost-constrained-edge-assistant" },
        { label: "Foundations: Caching", href: "/foundations/caching" },
      ],
    },
  },
];
