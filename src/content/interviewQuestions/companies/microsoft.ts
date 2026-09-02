import type { InterviewQuestion } from "../types";

/**
 * Microsoft — researched 2026-08-23, see `docs/interview_exp.md` for the full
 * research log and the complete research catalog (Exponent's 25-item
 * Microsoft question DB, the Exponent Microsoft system-design blog's named
 * candidate/interviewer anecdotes, several LeetCode Discuss threads reread
 * in full — including two very recent full-loop write-ups from Dec 2025 and
 * Feb 2026 — and Blind candidate posts). Same ship bar as
 * `google.ts`/`meta.ts`/`amazon.ts`: only questions with a real, answerable
 * prompt — concrete numbers, explicit constraints, a multi-part ask, or an
 * actual narrative — make it in here. Microsoft's own hiring guidance (see
 * the Exponent blog, reread in full this pass) is that there's no single
 * standard Microsoft system design question — the interviewing team writes
 * the round, so it swings unpredictably between a distributed-systems
 * architecture discussion and a coded, low-level object-oriented exercise.
 * That's reflected here: several shipped questions are genuinely LLD, not
 * classic HLD, because that's what candidates actually reported being asked.
 *
 * Every question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a transcript
 * to memorize. These are authored by reasoning through each problem the way
 * a strong candidate would, not sourced from a specific candidate's actual
 * answer — unlike `prompt`/`context`, which are sourced and cited,
 * `optimalAnswer` is this app's own content.
 */
export const MICROSOFT_QUESTIONS: InterviewQuestion[] = [
  {
    id: "microsoft-firmware-ota-update-devices",
    company: "Microsoft",
    title: "Design an over-the-air firmware update system for a device fleet",
    prompt:
      "Design a system that delivers firmware updates to devices. As reported by a Microsoft SDE II, this was the over-the-air (OTA) version for a car company's fleet — reason about chunking large payloads, choosing between TCP and UDP for the transfer, and recovering from lost packets mid-update.",
    category: "system-design",
    tags: ["ota-rollout"],
    level: "SDE II / Mid-Level (L4)",
    source: {
      name: "Exponent question DB",
      url: "https://www.tryexponent.com/questions/5984/design-device-firmware-update-system",
      reportedDate: "~Mar 2026 (5 months ago)",
      confidence: "high",
    },
    context:
      "The candidate account (reread in full) describes a long Microsoft loop for an SDE II role — a HackerRank OA, a culture-focused recruiter screen, then three back-to-back rounds on coding, system design, and low-level design. Several prompts were reported as deliberately vague, requiring the candidate to pull out requirements by asking questions instead of jumping to a textbook answer; overall difficulty was described as comparable to Google or Amazon. Cross-confirmed by Exponent's Microsoft system design blog post, which independently names the same firmware-update prompt and the chunking/TCP-vs-UDP/packet-recovery framing as a 'Distributed systems and infrastructure' bucket question.",
    optimalAnswer: {
      clarifyingQuestions: [
        "How large is a typical firmware image relative to the device's available flash/RAM for staging an update?",
        "Are devices reliably connected, or do they have flaky, low-bandwidth connectivity (a car in a parking garage, a spotty cellular link)?",
        "Does the update need to be atomic — device fully moves to the new version or stays on the old one — or is partial/incremental application acceptable?",
        "Is there a required rollout cadence (all at once vs. a staged, canary-first rollout across the fleet)?",
      ],
      requirements: [
        "Reliably deliver a large firmware image to a fleet of devices over unreliable, possibly low-bandwidth connections",
        "Recover from a partial or interrupted transfer without corrupting the device or requiring a full restart",
        "Verify the integrity and authenticity of an image before it's ever applied",
        "Roll back automatically to a known-good version if the new firmware fails to boot",
        "Support a staged rollout so a bad build is caught on a small population before it reaches the whole fleet",
      ],
      approach:
        "Split the problem into two halves: a resilient chunked-transfer protocol that gets the bytes onto the device despite a flaky connection, and a safe-apply mechanism on the device itself that guarantees a bad image can never leave it unbootable.",
      keyPoints: [
        "Chunk the firmware image into fixed-size blocks with a manifest listing block count, a hash per block, and a whole-image checksum — a device can then request only the blocks it's missing instead of restarting the whole transfer after a drop",
        "Use a block-based protocol over UDP with application-level acks and retransmits rather than raw TCP: a car's connectivity is intermittent, and TCP's single ordered byte stream stalls the entire transfer on one dropped packet, while a block-based scheme lets the device pull missing blocks out of order once connectivity returns",
        "Devices write received blocks to a staging partition and only proceed once the manifest confirms every block arrived and hashed correctly — nothing touches the active partition until the full image is verified",
        "Apply an A/B (dual-partition) update: flash and verify the new firmware to the inactive partition, flip a boot flag, and mark the update permanent only after the device boots successfully and passes a health check — otherwise the bootloader falls back to the previous partition automatically",
        "Sign firmware images centrally and verify the signature on-device before flashing, so a compromised delivery channel can't push malicious firmware",
        "Roll out in rings — a small canary population, then increasing percentages of the fleet — driven by a central rollout service that halts the rollout automatically if canary devices report a spike in failed boots",
        "A device-fleet management service tracks each device's current version, retries stalled deliveries, and feeds rollout health back to the rollout service so a bad build is caught early",
      ],
      tradeoffs: [
        "Block-based UDP transfer (resilient to intermittent connectivity, more protocol complexity to design and test) vs. plain TCP (simpler, but one dropped packet on a flaky link can stall or restart the whole download) — UDP wins for a fleet of intermittently-connected devices like cars",
        "A/B dual-partition updates (doubles the flash storage an update needs, but guarantees a safe rollback path) vs. in-place patching (less storage, but a failed patch can brick the device) — A/B wins whenever the device is safety-critical or hard to physically recover",
        "Staged/canary rollout (slower to reach 100% of the fleet, catches bad builds on a small population) vs. pushing to every device at once (fastest rollout, but a bug reaches the whole fleet before anyone notices) — staged wins whenever a bad build has real-world consequences",
      ],
      followUps: [
        "How would you handle a device that loses power mid-flash, partway through writing the inactive partition?",
        "How would you throttle bandwidth so a mass rollout doesn't saturate a shared network — many cars on the same cellular tower at once?",
        "How would you extend this to delta/differential updates instead of shipping the full image every time?",
      ],
      relatedLinks: [
        { label: "Foundations: CDN", href: "/foundations/cdn" },
        { label: "Foundations: Circuit Breakers", href: "/foundations/circuit-breakers" },
      ],
    },
  },
  {
    id: "microsoft-file-system-lld-coded-exercise",
    company: "Microsoft",
    title: "Code a file system's classes: files, directories, and symbolic links",
    prompt:
      "Your 'system design' round turns out to be a low-level, object-oriented coding exercise: build a working file system — covering files, directories, and symbolic links — across several use cases, live, in 45 minutes. As one candidate put it: the interviewer said 'let's code it out' and expected classes, not a distributed-systems sketch.",
    category: "lld-ood",
    tags: ["file-system-lld"],
    level: "SC2 / Mid-Level, Microsoft 365 / Copilot-adjacent team",
    source: {
      name: "Exponent — Microsoft Software Engineer (SC2) interview experience",
      url: "https://www.tryexponent.com/experiences/microsoft-software-engineer-interview-89b7e7",
      reportedDate: "~3 days before the 2026-08-23 research pass",
      confidence: "high",
    },
    context:
      "Candidate interviewed for an SC2 role on Microsoft's Experience + Devices team (Copilot integration into Microsoft 365). Reported a 4-round final loop over 2 days, all principal-level interviewers, where even the system design and hiring-manager rounds were 'basically coding.' The file system round was the hardest: a low-level design coded up with classes and multiple use cases in 45 minutes, rather than the endpoints-and-databases discussion the candidate expected. Cross-confirmed by Exponent's Microsoft system design blog, which independently describes the same pattern — 'design a file system, often as a coded, object-oriented exercise covering files, directories, and symbolic links' — as one of Microsoft's three characteristic question buckets, and notes this ambiguity (is it HLD or a coding round?) is something a candidate should clarify up front rather than assume.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Should this be a real, working in-memory implementation, or a class/interface sketch with pseudocode for the bodies?",
        "Does a 'file' need real byte content, or is a placeholder (a size and a content string) enough?",
        "Do symbolic links need to support both file and directory targets, and can they be circular?",
        "What operations does the interviewer want covered — create, delete, move, list, resolve-a-path, follow-a-symlink?",
      ],
      requirements: [
        "Model files and directories in a single, consistent tree structure",
        "Support symbolic links that point at another path and transparently resolve through it",
        "Support core operations: create/delete a file or directory, list a directory's contents, resolve an absolute path to a node",
        "Detect and reject a circular symlink chain rather than looping forever",
      ],
      approach:
        "Model the file system as a tree of a common `Node` abstraction with two concrete kinds — `File` and `Directory` — plus a `SymbolicLink` node that stores a target path and resolves through the same path-resolution logic every other operation uses, so link-following isn't special-cased into every method.",
      keyPoints: [
        "Define an abstract `FileSystemNode` (name, parent reference, created/modified timestamps) with two subclasses: `File` (holds content/size) and `Directory` (holds a name-to-child map)",
        "Add a `SymbolicLink` subclass that stores a target path string rather than content — it isn't a `File` or `Directory` itself, it's resolved through path resolution",
        "Centralize all path handling in one `resolve(path)` method that walks the tree component by component; whenever it lands on a `SymbolicLink`, it re-resolves starting from the link's target path instead of returning the link node — every other operation (list, delete, open) calls this one method rather than re-implementing traversal",
        "Track symlink hops in a visited-count or visited-path-set inside `resolve` and throw once a hop limit (or a repeated path) is hit, so a circular link fails cleanly instead of infinite-looping",
        "`Directory.list()` returns its children's names directly; it does not resolve symlinks eagerly, since listing a directory shouldn't require every link target to exist and be reachable",
        "Keep `File`/`Directory`/`SymbolicLink` mutation methods (create, delete, rename) on `Directory` as the parent — a node doesn't delete itself, its parent directory removes it from its child map — which keeps the tree invariant (every node except the root has exactly one parent) enforced in one place",
      ],
      tradeoffs: [
        "Central `resolve()` shared by every operation (one place to get symlink handling and error cases right) vs. letting each operation do its own path walking (faster to write one method, but symlink-following and circular-link detection have to be reimplemented correctly in every one of them) — centralizing wins because it's the part of this design that's genuinely easy to get subtly wrong twice",
        "Symlinks as a distinct node type that stores a target path (matches how real file systems like POSIX distinguish a symlink from what it points to — `ls -l` shows the link itself) vs. a symlink that just aliases straight to the target node in memory (simpler, but loses the ability to have a dangling or later-created target, which is real symlink behavior) — the distinct-type model is worth the extra indirection for interview purposes since it's the detail that separates a shallow answer from a correct one",
      ],
      followUps: [
        "Extend this to print every file under a given path, following symlinks but never re-visiting a path already seen in this traversal.",
        "How would you add hard links, and how is a hard link's behavior different from a symbolic link's in your model?",
        "How would you make directory listing and file reads thread-safe if multiple callers can mutate the tree concurrently?",
      ],
      relatedLinks: [
        { label: "LLD: OOP Fundamentals", href: "/lld/oop-fundamentals" },
        { label: "LLD: UML Class Diagrams", href: "/lld/uml-class-diagrams" },
      ],
    },
  },
  {
    id: "microsoft-visual-studio-live-share",
    company: "Microsoft",
    title: "Design Visual Studio Live Share's real-time collaborative sharing",
    prompt:
      "How would you design Visual Studio Live Share functionality? Design the real-time system that lets one developer share their editor session (or their screen) with others, who can view — and in some cases control — what's being shared.",
    category: "system-design",
    tags: ["messaging-chat"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/485856/Microsoft-System-design",
      reportedDate: "Jan 2020",
      confidence: "high",
      note: "Full page and comment thread reread directly (Chrome, bypasses LeetCode's bot block on scripted fetches).",
    },
    context:
      "The original post is a bare one-line prompt, but the comment thread (reread in full) develops real technical substance: one commenter argues this is closer to a live screen-share/streaming problem than a text-collaboration one, and works through the protocol choice — WebSockets vs. WebRTC (peer-to-peer, UDP-based, with reliability guarantees) vs. streaming protocols like RTMP/HLS/MPEG-DASH — plus a concrete detail that a presenter's screen can be streamed at a much lower frame rate (~5 FPS) than real video (24+ FPS), and that the design needs a path for granting a viewer remote-control access to the presenter's app.",
      optimalAnswer: {
      clarifyingQuestions: [
        "Is this sharing a live code editor session (structured edits/cursors/selections) or a raw screen/video stream of the presenter's screen?",
        "Can more than one viewer join a session, and can more than one participant edit or control at once?",
        "Does a viewer ever need to gain control (drive the presenter's cursor, run code) — or is it view-only?",
        "What's the acceptable end-to-end latency for a remote edit or cursor move to show up for viewers?",
      ],
      requirements: [
        "Let a host start a session and invite others to join with low setup friction",
        "Propagate the host's edits (or screen) to all viewers with low, consistent latency",
        "Support an explicit hand-off of control from host to a viewer for pair-programming style sessions",
        "Scale to a small number of concurrent viewers per session (this is a pairing tool, not a broadcast platform) without degrading the host's own editing experience",
      ],
      approach:
        "Treat editor collaboration and screen/audio sharing as two different transport problems layered on the same session: a low-latency, ordered event channel for structured edit operations, and a separate media path for anything that's actually pixels, since the two have very different bandwidth and reliability needs.",
      keyPoints: [
        "A session-coordination service creates a session on 'start sharing,' issues a shareable session ID/link, and tracks which participants are currently connected and who currently holds control",
        "Structured collaboration (cursor moves, text edits, file open/close) goes over a persistent WebSocket connection to a relay server per session, since these are small, frequent, ordered events where a reliable in-order channel matters more than raw throughput",
        "Apply an operational-transform or CRDt-style merge on incoming edits at the relay (or peer-to-peer, if going serverless) so concurrent edits from host and a controlling viewer converge to the same document state without last-writer-wins clobbering",
        "When the shared content is the screen itself rather than structured editor state, use a WebRTC media stream instead of WebSockets — WebRTC runs over UDP with its own reliability/congestion handling, which tolerates the frame loss a lossy video-like stream can absorb far better than TCP's head-of-line blocking would",
        "Cap the shared-screen frame rate low (roughly 5 FPS is enough for a presenter's screen, versus 24+ FPS for real video) to keep bandwidth and CPU cost down, since the content is mostly static text/UI rather than motion",
        "Control hand-off is a small state machine on the session: only the current controller's input events are forwarded to the shared editor/app; transferring control is an explicit action gated by the host so a viewer can't unilaterally take over",
      ],
      tradeoffs: [
        "WebRTC for screen/media sharing (built-in UDP reliability tuning, handles packet loss gracefully, but heavier to set up — signaling, NAT traversal/STUN/TURN) vs. plain WebSockets for everything (simpler infra, but TCP's ordered-stream guarantee means one dropped packet stalls a video-like stream) — WebRTC wins once the shared content includes actual screen pixels rather than just structured text events",
        "Server-relayed sessions (host and viewers all connect to a relay, easier to add participants, works behind strict NATs/firewalls common in enterprise networks) vs. pure peer-to-peer (lower latency, no relay infrastructure cost, but scales poorly past a couple of participants and struggles behind corporate firewalls) — a relay-based design fits Microsoft's actual enterprise/dev-tool audience better",
        "CRDT/operational-transform merge for concurrent edits (correct, converges automatically, more implementation complexity) vs. simple 'only the controller can edit' locking (much simpler, but defeats true pair-programming where both parties want to type) — the merge approach is worth it specifically because Live Share's whole value proposition is simultaneous editing",
      ],
      followUps: [
        "How would you handle a viewer joining mid-session and needing to catch up to the current document/screen state?",
        "How would you keep the host's local editing responsive even if a viewer's connection is slow (don't let a slow viewer stall the host)?",
        "How would this change if you needed to support 100 viewers instead of a handful — what breaks first?",
      ],
      relatedLinks: [
        { label: "Foundations: Message Queues", href: "/foundations/message-queues" },
        { label: "Build it: Live Sports Scoreboard scenario", href: "/workshop?scenario=live-sports-scoreboard" },
      ],
    },
  },
  {
    id: "microsoft-billion-customer-rule-filter-batch",
    company: "Microsoft",
    title: "Batch-evaluate billions of customers against 10-15 business rules daily",
    prompt:
      "We have billions of customers in a database. Once a day we need to run a job that checks every customer against 10 to 15 business-rule filters, where each rule has about 10 criteria, and produce a 'Customer → Matched Rules' output. Data is in the billions, so performance is the thing to concentrate on.",
    category: "system-design",
    tags: ["rules-engine-lld"],
    source: {
      name: "LeetCode Discuss — Microsoft System Design, Onsite",
      url: "https://leetcode.com/discuss/interview-question/system-design/692996/Microsoft-System-Design-Please-help",
      reportedDate: "Jun 2020",
      confidence: "high",
      note: "Full page and comments reread directly.",
    },
    context:
      "Reported as an onsite Microsoft system design question. Commenters converge on the same shape of answer: this is a classic MapReduce/batch-processing use case, and one commenter adds that clarifying whether the underlying customer data actually changes daily unlocks a caching optimization (a Spark-style batch job vs. an incremental one).",
    optimalAnswer: {
      clarifyingQuestions: [
        "Does the underlying customer data change daily, or only a small fraction of records — could this run incrementally instead of a full daily re-scan?",
        "Do the 10-15 rules themselves change often, or are they stable enough to be compiled/cached once per run?",
        "What's the freshness requirement on the output — does it need to be ready by a specific time each day (an SLA), or is 'sometime overnight' fine?",
        "Is the output consumed as a batch report, or does something downstream need to query 'which customers matched rule X' interactively?",
      ],
      requirements: [
        "Evaluate every one of billions of customer records against 10-15 rules (≈10 criteria each) once per day",
        "Produce a per-customer list of which rules matched",
        "Complete within an operational batch window despite the data volume — this is explicitly a performance-first problem",
        "Scale roughly linearly as the customer base or rule count grows",
      ],
      approach:
        "Treat this as an embarrassingly parallel batch job: partition the customer base across many workers, ship the same (small, stable) rule set to every worker, and let each worker evaluate its partition independently with no cross-worker coordination needed, since rule evaluation for one customer never depends on another customer.",
      keyPoints: [
        "Partition the customer table by customer ID range (or hash) into many shards; a MapReduce/Spark-style job assigns one or more shards to each worker so the billions of records are processed in parallel rather than serially",
        "Load the 10-15 rules (each ~10 criteria) once per worker at job start and keep them in memory — they're small and shared across every customer that worker touches, so there's no reason to re-fetch or re-parse them per record",
        "Each worker streams its shard's customer records, evaluates all rules against each record in memory, and emits (customerId, matchedRuleIds) pairs — this is the 'map' step and needs no shuffle/reduce, since each customer's result is independent",
        "Write worker output directly to a columnar batch store (or straight to the serving database) partitioned the same way the input was, avoiding an expensive global sort/reduce stage the problem doesn't actually need",
        "If most customer records don't change day to day, keep a persisted result set from the previous run and only re-evaluate customers whose relevant fields changed since then — this turns a full billions-record scan into a much smaller incremental one",
        "Instrument per-shard progress so a stuck or slow worker can be detected and its shard retried or reassigned, rather than the whole nightly job silently blowing its window",
      ],
      tradeoffs: [
        "Full daily re-scan of all billions of records (simple, always correct, no state to manage) vs. incremental evaluation of only changed customers (much cheaper per run, but requires reliably tracking what changed and risks drift if that tracking has a bug) — incremental is worth the complexity once the data is mostly stable day to day, but full re-scan is the safer default to start from and periodically reconcile against",
        "In-memory rule evaluation per worker (fast — no per-record lookup cost) vs. a rules-engine service each worker calls over the network (centralizes rule logic, easier to update rules without redeploying workers, but adds a network round-trip per customer at billions-of-records scale) — in-memory wins decisively here because the rule set is small and the volume is enormous",
        "Hash-partitioning customers across workers (even load distribution) vs. range-partitioning (keeps related customers together, simpler to reason about, but risks hot/uneven shards if customer IDs aren't uniformly distributed) — hash partitioning is the safer default for even load unless there's a reason to keep ranges contiguous",
      ],
      followUps: [
        "How would you add a new rule without re-running the entire billions-record job from scratch?",
        "How would you guarantee the job actually finishes inside its nightly window as the customer base keeps growing?",
        "How would you support an ad-hoc 'which customers currently match rule X' query without waiting for tomorrow's batch run?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
        { label: "Foundations: Estimation and Interview Framework", href: "/foundations/estimation-and-interview-framework" },
      ],
    },
  },
  {
    id: "microsoft-parking-lot-lld-to-hld",
    company: "Microsoft",
    title: "Parking lot: low-level class design, then switch to high-level scale",
    prompt:
      "Design a multi-level, multi-entry-and-exit parking lot: handle payments, different vehicle types, and give a centralized view across lots. Share the classes and their relationships, draw a class diagram, write an algorithm to find the closest available spot to a given entry (and the closest exit on leaving), and explain how you'd handle multiple cars entering at the same time. Then, on the same design: how would you handle the request load, how many servers would you assign, and how would you scale it?",
    category: "lld-ood",
    tags: ["parking-lot-lld"],
    level: "SDE 2, Onsite",
    source: {
      name: "LeetCode Discuss — Microsoft | Onsite | System Design | SDE 2",
      url: "https://leetcode.com/discuss/interview-question/system-design/598634/Microsoft-or-Onsite-or-System-Design-or-SDE-2",
      reportedDate: "Apr 2020",
      confidence: "high",
      note: "Full page and comments reread directly.",
    },
    context:
      "Candidate reports the interviewer deliberately switched the same design from low-level (classes, closest-spot algorithm, concurrent-entry handling) to high-level (scalability, concurrency, sharding, server count) mid-round — a concrete real-world instance of the exact HLD/LLD ambiguity Microsoft's own hiring guidance warns candidates to clarify up front (see the Exponent blog's advice to ask 'high-level or low-level?' at the start of any Microsoft design round). A commenter on the thread separately notes this makes the round unusually demanding: get the class model wrong and both the low-level and high-level halves of the discussion suffer.",
    optimalAnswer: {
      clarifyingQuestions: [
        "How many entry/exit points and levels does the lot have, and can a car enter at one point and exit at another?",
        "What vehicle types need distinct spot sizes (motorcycle, compact, regular, bus/oversized)?",
        "Is payment on entry, on exit (time-based), or both (e.g. a flat entry fee plus metered time)?",
        "Does 'centralized view across lots' mean one interviewer wants a single system managing many physical parking structures, not just one?",
      ],
      requirements: [
        "Model levels, spots (by size/type), entries, and exits as a coherent class hierarchy",
        "Assign the closest available compatible spot to an entering vehicle, and route an exiting vehicle to its nearest exit",
        "Handle payment, computed from vehicle type and duration",
        "Handle multiple vehicles entering concurrently without double-assigning the same spot",
        "(HLD follow-up) Scale to handle the request load of many large lots under one centralized system",
      ],
      approach:
        "Start from a small, correct class model — `ParkingLot` owning `Level`s, each owning `Spot`s of a `SpotType`, plus a `Vehicle` hierarchy and a `Ticket` tying a vehicle to a spot and an entry time — then treat the HLD follow-up as scaling that same model out: partition it by physical lot, and put the spot-assignment decision behind a service that can serialize concurrent requests per lot.",
      keyPoints: [
        "`ParkingLot` has many `Level`s; each `Level` has many `Spot`s, each with a `SpotType` (motorcycle/compact/regular/oversized) and a status (free/occupied); `Vehicle` is an abstract type with subclasses matching the spot types it's compatible with",
        "On entry, a `SpotAssignmentService` finds the nearest free spot compatible with the vehicle's type relative to the entry point — model this as a graph/grid distance from the entry node and do a nearest-free-spot search (e.g. BFS outward from the entry, or maintain a free-spot list per level sorted by distance from each entry) rather than scanning every spot linearly",
        "A `Ticket` is created linking vehicle, assigned spot, entry point, and entry timestamp; on exit, the same ticket determines the fee (via a pluggable `PricingStrategy` keyed on vehicle type and duration) and the nearest exit is found the same way the nearest entry-side spot was",
        "Handle concurrent entries by making spot assignment atomic per spot — e.g. a compare-and-swap on the spot's status, or a lock scoped to the small candidate set of nearest free spots — so two cars arriving at once can't both be assigned the same spot; only the actual assignment needs to be serialized, not the whole lot",
        "(HLD) Partition the system per physical lot: each lot's state (spots, tickets) lives behind its own service/database shard, since spot assignment for lot A never needs to coordinate with lot B — this turns 'how many servers' into 'how many lots at once,' a much more tractable scaling question",
        "(HLD) Front each lot's assignment service with a queue or load balancer so a burst of simultaneous entries (e.g. a lot opening at rush hour) is smoothed rather than causing lock contention on a single spot-assignment call path",
        "The 'centralized view across lots' requirement is a read-only aggregation layer over each lot's own data — a reporting/dashboard service that polls or subscribes to per-lot occupancy, not something that needs to sit in the entry/exit hot path",
      ],
      tradeoffs: [
        "Per-spot atomic assignment (fine-grained, lets unrelated spots be assigned fully in parallel) vs. locking the whole level/lot during any assignment (simpler to reason about, but serializes every entry at a busy lot even when there's no actual conflict) — per-spot atomicity is worth the extra care since a busy multi-entry lot needs real concurrency",
        "Partitioning the HLD by physical lot (each lot's data is independent, scales naturally, matches how the real world is already partitioned) vs. one shared database for every lot (simpler to query 'all lots at once,' but becomes a single point of contention as more lots are added) — per-lot partitioning wins because nothing in spot assignment is ever cross-lot",
        "Class model that treats `SpotType` as data on `Spot` (one flexible `Spot` class) vs. a `Spot` subclass per vehicle type (more classes, marginally clearer intent) — data-driven `SpotType` is usually the better answer in an interview because it avoids a subclass explosion as spot types grow, and it's the detail that shows you're thinking about maintainability, not just getting a diagram down",
      ],
      followUps: [
        "How would you handle a spot that's reserved (e.g. EV charging, handicapped) so it's only offered to compatible vehicles?",
        "How would you support dynamic pricing (surge pricing when the lot is nearly full)?",
        "If a lot's assignment service goes down mid-day, how do vehicles already parked still exit and pay?",
      ],
      relatedLinks: [
        { label: "LLD: Parking Lot", href: "/lld/parking-lot" },
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
      ],
    },
  },
  {
    id: "microsoft-multi-region-customer-data-ux-split",
    company: "Microsoft",
    title: "Serve a UX in one region when customer data lives in another",
    prompt:
      "System design: a customer's data lives in region A, but the UX serving that customer runs in region B. Design how the UX figures out which region to contact to fetch the customer's data — the candidate's reported solution used HTTP redirects, weighed a Redis cache instance vs. a cluster, propagated customer-info updates via Kafka, and minimized cost by running hot/warm Redis instances rather than fully replicating everywhere.",
    category: "system-design",
    tags: ["multi-region-failover"],
    level: "SDE2 / Senior, downleveled offer",
    source: {
      name: "Blind — Microsoft SDE2/Senior Software Engineer Interview experience",
      url: "https://www.teamblind.com/post/microsoft-sde2senior-software-engineer-interview-experience-g70vklcp",
      reportedDate: "Oct 2025",
      confidence: "high",
      note: "Full post reread directly.",
    },
    context:
      "Candidate (interviewing from Google) reported this as one part of a longer loop that also included coding rounds. Despite a strong system-design answer, the candidate was downleveled from Senior to SDE2 in the final offer, and the post's own top comment speculates the system design round is specifically what Microsoft uses to separate senior from non-senior candidates — matching the Exponent blog's framing of system design as a level-setting round.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is the region split fixed per customer (their data always lives in one specific region, e.g. by data residency/compliance requirement), or can it change over time?",
        "How fresh does the UX's view of 'which region owns this customer' need to be after the customer is provisioned or migrated?",
        "What's an acceptable added latency for the extra region lookup on a customer's first request?",
        "Is data residency (e.g. GDPR — EU customer data must stay in an EU region) actually driving the region split, which would change how flexible the 'redirect' logic can be?",
      ],
      requirements: [
        "Let a UX request in region B find and reach the correct home region A for a given customer's data",
        "Keep the region-ownership lookup fast enough not to add noticeable latency to every request",
        "Propagate customer-info updates so the lookup layer doesn't serve stale region mappings",
        "Minimize infrastructure cost — don't fully replicate every customer's data to every region",
      ],
      approach:
        "Separate 'which region owns this customer' (a small, cacheable routing fact) from 'the customer's actual data' (large, stays in its home region) — resolve the former cheaply and redirect, rather than trying to make every region a full replica of every other region's data.",
      keyPoints: [
        "A lightweight region-mapping service (customerId → home region) sits in front of every region's UX; on a request, the UX first checks whether the customer is local — if not, it issues an HTTP redirect pointing the client at the correct region's endpoint rather than proxying the request itself, keeping the cross-region hop out of the UX's own request path",
        "Cache the customerId → region mapping in Redis, since it's read far more often than it changes and a cache miss just costs one lookup against the source of truth, not a full customer-data fetch",
        "Choose a Redis cluster over a single large instance once the customer count is big enough that one instance's memory or throughput becomes the bottleneck — a cluster shards the mapping across nodes so no single node has to hold every customer's region mapping",
        "Customer-info updates (e.g. a customer's home region changes, or their profile is edited) are published to Kafka; a consumer updates the Redis cache and the source-of-truth store, so the cache converges quickly without every write going through Redis synchronously",
        "Run 'hot/warm' Redis instances — full capacity in the customer's actual home regions, a smaller warm standby elsewhere — instead of a fully replicated cluster in every region, since most regions only need to resolve mappings for customers who occasionally wander there, not serve as a primary for anyone",
        "On a redirect, the client (or an edge layer) can cache the resolved region for that customer locally for some TTL, so repeat requests from the same customer don't re-pay the lookup cost every time",
      ],
      tradeoffs: [
        "HTTP redirect to the correct region (keeps each region's UX simple and stateless about other regions, adds one extra round trip on a cache miss) vs. the UX transparently proxying the request to the right region (one hop from the client's perspective, but every UX now needs cross-region networking and becomes a fan-out point for failures in a region it doesn't own) — redirect wins for simplicity and blast-radius containment",
        "Redis cluster (shards the mapping, higher availability, more operational complexity) vs. a single larger Redis instance (simpler ops, but a single point of failure and a ceiling on throughput) — the cluster is worth it once customer volume outgrows one instance's practical limits",
        "Kafka-propagated cache updates (decoupled, resilient to a temporary consumer outage — messages just queue) vs. synchronous cache invalidation on every write (simpler, always fresh, but couples the write path's latency and availability to the cache's) — Kafka wins because customer-info updates are relatively infrequent and don't need instant global consistency",
      ],
      followUps: [
        "What happens if a customer's home region migrates — how do you avoid serving requests to the old region during the cutover?",
        "How would you handle a request for a customer whose region mapping isn't in cache and the source-of-truth lookup is slow or down?",
        "How would you extend this if data residency rules mean a customer's data can never even transiently pass through a non-compliant region?",
      ],
      relatedLinks: [
        { label: "Foundations: Redis Deep Dive", href: "/foundations/redis-deep-dive" },
        { label: "Foundations: Kafka Deep Dive", href: "/foundations/kafka-deep-dive" },
      ],
    },
  },
  {
    id: "microsoft-chatgpt-style-platform-inference-nodes",
    company: "Microsoft",
    title: "Design a ChatGPT-style platform with inference nodes as a black box",
    prompt:
      "Design a platform like ChatGPT. Assume there are some nodes that do inference as a black box (input text in, output response text out) — you don't need to design the model-serving internals. Focus on supporting chats: sending messages and receiving responses.",
    category: "ml-ai-system-design",
    tags: ["ai-ml-infra"],
    level: "L59/L60 (most junior SDE band), <1.5 YOE, CoreAI org",
    source: {
      name: "Blind — Got asked System Design in Microsoft L59/L60 interview",
      url: "https://www.teamblind.com/post/got-asked-system-design-in-microsoft-l59l60-interview-what-is-the-expectation-okzz4rx3",
      reportedDate: "Dec 2025",
      confidence: "high",
      note: "Post reread directly.",
    },
    context:
      "Reported by a candidate interviewing for Microsoft's CoreAI org (Prague), Microsoft's Copilot & AI-platform division, at the most junior SDE band. The explicit 'inference is a black box' framing is notable — it signals the interviewer wanted the system design around chat/session/message plumbing, not ML-serving depth, which fits Microsoft's junior-level pattern of scoping designs down to what the level should reasonably own.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is a chat a single back-and-forth session, or does it need persistent history a user can resume later?",
        "Can a user have multiple concurrent chats, and does each need independent context sent to the inference node?",
        "What's the expected response time from an inference node, and should the UX show a streaming/typing response or wait for the full reply?",
        "Is this single-region for now, or does it need to serve users globally from day one?",
      ],
      requirements: [
        "Let a user send a message in a chat session and receive the model's response",
        "Persist chat history so a session can be resumed and the model has conversation context for follow-up messages",
        "Route each message to an available inference node without the client needing to know node details",
        "Handle an inference node being slow or unavailable without losing the user's message",
      ],
      approach:
        "Treat this as a fairly ordinary request/response chat app with one twist: the 'reply' step is a slow, resource-heavy call to an inference node, so the design centers on how messages get routed to and queued for those nodes rather than on anything model-specific.",
      keyPoints: [
        "A `ChatService` owns sessions and messages: each `Chat` has an ordered list of `Message`s (role: user/assistant, content, timestamp), persisted so history survives a resumed session or a server restart",
        "On a new user message, the service appends it to the chat, assembles the conversation context (recent message history, up to whatever context window the inference node accepts), and hands that off to an inference-routing layer — this is the black-box boundary the prompt describes",
        "The inference-routing layer load-balances across available inference nodes (e.g. round-robin or least-loaded) and treats a node purely as 'accepts a context payload, eventually returns response text'",
        "Because inference is slow relative to a normal API call, don't block the HTTP request on it: accept the message, return quickly, and either stream partial tokens back over a persistent connection (WebSocket/SSE) as the node produces them, or have the client poll/subscribe for the completed response",
        "Queue outgoing inference requests rather than calling nodes synchronously and directly, so a burst of messages doesn't overwhelm a fixed pool of nodes — the queue also gives a natural retry point if a node fails mid-request",
        "Persist the assistant's response back onto the chat once it completes, so history stays consistent even if the client that sent the original message has disconnected by the time the response is ready",
      ],
      tradeoffs: [
        "Streaming the response token-by-token over a persistent connection (much better perceived latency, more complex client and server state) vs. waiting for the full response before returning it (simpler, but a slow model reply means a long silent wait) — streaming is worth it for a chat product where responsiveness is the whole user experience",
        "Queueing requests to inference nodes (absorbs bursts, adds a retry point, adds latency and an extra moving part) vs. calling a node directly and synchronously per message (simpler, lower latency when nodes have spare capacity, but a burst of traffic directly overloads whatever nodes are up) — queueing wins once inference capacity is the actual bottleneck, which it usually is",
        "Sending recent message history as context on every call (stateless nodes, simple to scale — any node can serve any request) vs. giving each chat a sticky, stateful node that holds context in memory (avoids re-sending history, but ties a chat to a specific node and complicates failover) — stateless nodes with context passed per call are simpler to operate and were explicitly the framing the prompt gave (inference as a black box)",
      ],
      followUps: [
        "How would you handle a chat's history growing past what fits in one inference call's context window?",
        "How would you rate-limit a single user so they can't monopolize the inference node pool?",
        "How would you add support for the model calling out to a tool mid-response (an early step toward agentic behavior) without changing the black-box inference contract?",
      ],
      relatedLinks: [
        { label: "Foundations: Load Balancers", href: "/foundations/load-balancers" },
        { label: "Build it: Cost-Constrained Edge Assistant scenario", href: "/workshop?scenario=cost-constrained-edge-assistant" },
      ],
    },
  },
  {
    id: "microsoft-top-10-products-billions-records",
    company: "Microsoft",
    title: "Surface the top-10 best-selling products from billions of order records",
    prompt:
      "System design for an online shopping site: display the top 10 products or items with the highest sales as a suggestion to users. Assume there are billions of records in the database. How do you compute and serve the top-10 highest-selling products efficiently?",
    category: "system-design",
    tags: ["top-k-streaming"],
    source: {
      name: "LeetCode Discuss — Microsoft | System design | Please help",
      url: "https://leetcode.com/discuss/interview-question/system-design/666792/Microsoft-or-System-design-or-Please-help/",
      reportedDate: "Jun 2020",
      confidence: "high",
      note: "Full page and top comment reread directly.",
    },
    context:
      "The thread's top comment (reread directly) frames this as structurally the same problem as a live leaderboard — showing the top-N players by score in a game — and points to a real-time-counting architecture pattern (a streaming aggregation pipeline rather than a full table scan per request) as the shape of a strong answer.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Does 'top 10' mean all-time sales, or a rolling window (last 24 hours, last 7 days)? — this changes the whole design",
        "How stale can the top-10 list be — does it need to update within seconds of a sale, or is a few minutes of lag fine?",
        "Is this one global top-10, or does it need to be computed per category/region as well?",
        "What counts as a 'sale' for ranking — units sold, revenue, or something else?",
      ],
      requirements: [
        "Continuously rank products by sales across billions of order records",
        "Serve the current top-10 with low read latency (this is shown on a high-traffic page, not a report)",
        "Keep the ranking reasonably fresh as new sales happen",
        "Scale as order volume and catalog size grow, without a full table scan on every read",
      ],
      approach:
        "Don't compute the top-10 from the raw orders table on read — maintain a running per-product sales counter that's updated incrementally as orders happen, and keep the current top-10 as a small, cheap-to-read materialized value derived from those counters, so a page view never triggers a scan over billions of rows.",
      keyPoints: [
        "Every completed order emits a sale event (productId, quantity or revenue) onto a stream (e.g. Kafka) rather than the ranking being computed by querying the orders table directly",
        "A stream-processing job consumes sale events and increments a per-product running counter, held in a fast key-value store (e.g. Redis) — this converts 'rank billions of historical rows' into 'increment one counter per sale, in real time'",
        "Maintain the current top-10 as a small sorted structure (e.g. Redis' sorted-set type) keyed by the same running counters, so reading the top-10 is a single cheap range query against a structure that's already sorted, not a fresh sort over the whole catalog on every request",
        "For a rolling-window top-10 (e.g. 'last 24 hours'), use time-bucketed counters (per-hour buckets per product) and sum only the buckets inside the current window, aging out old buckets — this avoids needing to know 'when did this counter start' and keeps old sales from permanently inflating the ranking",
        "Serve the top-10 to users from a cache in front of the sorted-set read, refreshed on a short TTL — the page traffic for 'top products' is enormous and read-heavy relative to how often the actual top-10 changes",
        "Reconcile periodically against the source-of-truth orders table (e.g. a nightly batch recompute) to catch any drift from missed or double-counted stream events, so the real-time counters don't silently diverge from ground truth forever",
      ],
      tradeoffs: [
        "Streaming incremental counters + a sorted-set for top-10 (fast reads, fast to reflect new sales, more moving infrastructure) vs. computing top-10 with a `GROUP BY`/`ORDER BY` query over the orders table on read (trivial to implement, but a full aggregation over billions of rows on every page view doesn't scale) — streaming wins decisively once volume is in the billions",
        "Time-bucketed counters for a rolling window (correctly ages out old sales, more storage/complexity) vs. one all-time counter per product (simpler, but can't answer 'top-10 in the last 24 hours' at all, and a product that sold well years ago never leaves the list) — bucketing is necessary the moment the requirement is a rolling window rather than all-time",
        "Periodic batch reconciliation against ground truth (catches drift, adds an offline job) vs. trusting the streaming counters forever (simpler, but a lost or duplicated event silently corrupts the ranking with no way to detect it) — reconciliation is cheap insurance against a ranking silently drifting wrong",
      ],
      followUps: [
        "How would you extend this to a top-10 per category, without one hot global sorted-set becoming a bottleneck?",
        "How would you prevent a burst of fraudulent or bot-driven orders from temporarily gaming a product onto the list?",
        "What would you do differently if 'top 10' needed strong consistency (guaranteed to reflect every completed order with zero lag)?",
      ],
      relatedLinks: [
        { label: "Build it: Global Leaderboard Updates scenario", href: "/workshop?scenario=global-leaderboard-updates" },
        { label: "Foundations: Database Indexing Deep Dive", href: "/foundations/database-indexing-deep-dive" },
      ],
    },
  },
  {
    id: "microsoft-url-shortener-snowflake-multi-region",
    company: "Microsoft",
    title: "URL shortener with multi-region deployment and Snowflake-style ID generation",
    prompt:
      "Design a URL shortener, with a deep dive on multi-region deployments and ID generation. Be ready to discuss Twitter Snowflake-style ID generation, a dedicated ID-generation service, and Base62 encoding of auto-incrementing IDs, and how those choices interact once the service runs across multiple regions.",
    category: "system-design",
    tags: ["multi-region-failover"],
    level: "SDE 2 / L61-L62",
    source: {
      name: "LeetCode Discuss — Microsoft SDE 2 | L61/62 | Interview Experience",
      url: "https://leetcode.com/discuss/post/7545165/microsoft-sde-2-l6162-interview-experien-e5q7/",
      reportedDate: "Feb 2026",
      confidence: "high",
      note: "Full multi-round write-up reread directly.",
    },
    context:
      "From a detailed, very recent five-round loop write-up (OA, DSA, LLD, HLD, hiring-manager round). This was Round 4, the dedicated HLD round; the candidate reports a strong back-and-forth on ID generation specifically, discussing Twitter's Snowflake approach, a standalone ID-generation service, and Base62-encoding an auto-incrementing ID as three concrete alternatives — and cleared the round. The same loop's Round 3 (LLD: design a music-playing app like Spotify) and Round 5 (HM round: idempotency during checkout) are recorded separately in this file's context and in the tracker's full catalog.",
    optimalAnswer: {
      clarifyingQuestions: [
        "What's the expected write (new short URL) vs. read (redirect) ratio, and roughly what read volume are we designing for?",
        "Do short URLs need to be unguessable/non-sequential (a security concern) or is a predictable, incrementing code acceptable?",
        "Should the service support custom aliases, or only generated codes?",
        "Is the service actually deployed across multiple regions from day one, or is that a scale-out the interviewer wants explored as a follow-up?",
      ],
      requirements: [
        "Generate a unique short code for a submitted long URL and redirect a short-code request to the original URL",
        "Generate IDs without collisions even when write traffic is spread across multiple regions",
        "Redirect with low latency, since reads vastly outnumber writes for a URL shortener",
        "Remain available and correct if one region goes down",
      ],
      approach:
        "Separate 'how do we generate a globally-unique ID with no cross-region coordination on every write' from 'how do we turn that ID into a short, URL-safe code' — the first is the actual hard distributed-systems problem here, the second is just an encoding step once the ID is decided.",
      keyPoints: [
        "Rule out a single auto-incrementing counter in one central database as the ID source — it's a single point of failure and a cross-region write bottleneck, exactly the two things a multi-region deployment is trying to avoid",
        "Twitter Snowflake-style IDs (timestamp bits + region/worker-ID bits + a per-millisecond sequence number, packed into a 64-bit integer) let every region generate IDs completely independently with zero coordination, while still guaranteeing global uniqueness because each region embeds its own ID in the bit layout",
        "A dedicated ID-generation service (a separate small service each region's write path calls) is the alternative to embedding Snowflake logic directly in the URL-shortener's own write path — worth it if multiple different services across the company need globally-unique IDs, overkill if this is the only consumer",
        "Base62-encode the generated numeric ID (0-9, a-z, A-Z) to turn it into a short, URL-safe string — this is a pure encoding step, reversible, and produces a shorter string than Base10 or hex for the same numeric range",
        "Each region's write path: generate a Snowflake ID locally, Base62-encode it, write the (code → longUrl) mapping to that region's local database, then replicate asynchronously to other regions — the write never has to wait on a cross-region round trip",
        "Reads (the redirect path, the overwhelming majority of traffic) are served from whichever region is closest to the requester, from a cache in front of the database, since a short code's mapping is immutable once created and is a natural cache-forever candidate",
      ],
      tradeoffs: [
        "Snowflake-style IDs (no cross-region coordination, IDs are roughly time-sortable, but the ID is a fixed-format bit-packed integer, less flexible if requirements change later) vs. a central sequence service (single source of truth, simpler to reason about, but becomes a bottleneck and single point of failure across regions) — Snowflake wins for a genuinely multi-region write path",
        "Base62 encoding of a numeric ID (deterministic, short, reversible — you can decode a code straight back to its ID) vs. a random string generated independently of any ID (avoids leaking any information via the code's structure, like roughly when it was created, but needs an explicit uniqueness check since it's not derived from something already unique) — Base62-over-an-already-unique-ID avoids the extra collision-check step entirely",
        "Asynchronous cross-region replication of new mappings (writes stay fast and region-local, brief window where a code isn't yet resolvable in every region) vs. synchronous replication before acknowledging the write (every region sees a new code instantly, but write latency now includes the slowest region's round trip) — async replication is the right choice since a few seconds of replication lag on a brand-new code is a non-issue for a redirect service",
      ],
      followUps: [
        "How would you handle the rare case of a Base62-encoded collision if two ID-generation schemes were ever merged or migrated?",
        "How would you support custom, user-chosen aliases alongside generated codes without them colliding?",
        "What changes if a URL needs to expire or be deleted — how does that interact with aggressive read-side caching?",
      ],
      relatedLinks: [
        { label: "Build it: URL Shortener scenario", href: "/workshop?scenario=url-shortener" },
        { label: "Foundations: Database Sharding", href: "/foundations/database-sharding" },
      ],
    },
  },
  {
    id: "microsoft-idempotent-checkout-fintech",
    company: "Microsoft",
    title: "Handle idempotency during checkout in a Fintech-flavored system",
    prompt:
      "Write pseudocode and explain exactly where you would handle idempotency during checkout, in a system where duplicate submissions (a retried request, a double-click, a network timeout that resends) must not result in double-charging or double-processing an order.",
    category: "scenario-operational",
    tags: ["payments-idempotency"],
    level: "SDE 2 / L61-L62, hiring-manager round",
    source: {
      name: "LeetCode Discuss — Microsoft SDE 2 | L61/62 | Interview Experience",
      url: "https://leetcode.com/discuss/post/7545165/microsoft-sde-2-l6162-interview-experien-e5q7/",
      reportedDate: "Feb 2026",
      confidence: "high",
      note: "Full multi-round write-up reread directly.",
    },
    context:
      "Asked in the hiring-manager round of a five-round loop, explicitly framed around the candidate's Fintech background. The candidate's reported solution used a cache as an optimization layered on top of a database column with a unique index for the actual idempotency key, then added a transaction block under interviewer pushback even though it wasn't strictly required for the single-upsert case being discussed — and the interviewer kept probing by asking where else in the transaction's lifecycle the candidate would need to maintain idempotency, not just at the initial write.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is the client expected to generate and send an idempotency key with each checkout request, or does the server need to derive one (e.g. from cart contents + user + time window)?",
        "What's the retry window — could a legitimate retry arrive seconds later, or could it be minutes/hours after a client-side failure?",
        "Does checkout involve multiple downstream side effects (charge payment, reserve inventory, send confirmation), each of which needs its own idempotency handling, or is this scoped to just the order-creation write?",
        "What should happen if a retry arrives while the original request is still being processed (in-flight), not after it's already completed?",
      ],
      requirements: [
        "A retried checkout request (same idempotency key) must never create a second order or trigger a second charge",
        "A retried request should return the same result the original request produced, so the client can safely retry on any network failure",
        "Handle the case where a retry arrives while the original request is still in flight, not just after it's finished",
        "Idempotency must hold even under concurrent requests hitting multiple server instances at once",
      ],
      approach:
        "Make idempotency a property of the write itself, not something bolted on after the fact: require every checkout request to carry a client-generated idempotency key, and let a unique constraint at the database layer be the actual source of truth for 'has this exact request already been processed,' with a cache in front purely as a fast-path optimization.",
      keyPoints: [
        "Client generates a unique idempotency key per logical checkout attempt (e.g. a UUID created once when the user clicks 'Pay,' reused on every automatic retry of that same click) and sends it as a request header or field",
        "The orders table has a unique index on the idempotency key column; the checkout handler attempts an insert (or upsert) using that key — the database's unique constraint is what actually guarantees at-most-one order is ever created for a given key, even under concurrent requests, since the constraint is enforced atomically by the database regardless of how many app servers are handling requests",
        "On a unique-constraint violation (key already exists), the handler doesn't error out — it looks up the existing order by that key and returns its result, so a retried request gets the same response the original succeeded with, not a failure",
        "Layer a cache (idempotency key → response) in front of the database purely as an optimization, so a rapid retry doesn't even need a database round trip to get the same answer back — but the cache is never the source of truth, since it can be evicted or momentarily inconsistent; the database's unique constraint is what's actually load-bearing",
        "Wrap order creation and its immediate side effects that must succeed or fail together (e.g. reserving inventory) in a transaction, so a crash partway through can't leave a half-created order — this is the piece the candidate initially treated as unnecessary for a single upsert, but the interviewer's follow-up about the transaction's broader lifecycle points at exactly this: idempotency needs to hold across every side effect checkout triggers, not just the initial row insert",
        "For a request that arrives while the original is still mid-flight (not yet committed), mark the idempotency key's state as 'processing' before doing the work; a concurrent retry that sees 'processing' waits or returns a 'still in progress' response rather than racing to insert a second row",
      ],
      tradeoffs: [
        "Database unique constraint as the source of truth (correct under concurrency by construction, since the database enforces it atomically) vs. an application-level check-then-insert ('does this key exist? if not, insert') without a constraint (simpler-looking code, but has a race window between the check and the insert under concurrent requests) — the unique constraint wins because it closes exactly the race condition idempotency exists to prevent",
        "Cache-in-front-of-database as a pure optimization (fast repeat-retry responses, zero correctness burden since the database backs it up) vs. relying on the cache as the actual idempotency guard (much faster, but a cache eviction or restart could let a duplicate through) — treating the cache as optimization-only, never authority, is the difference between a fast system and a subtly incorrect one",
        "Client-generated idempotency key (works even if the client never gets a response to know whether the original succeeded) vs. a server-derived key from request contents (no client cooperation needed, but two genuinely different checkout attempts with identical contents could be wrongly deduplicated) — client-generated keys are the standard approach for exactly this reason",
      ],
      followUps: [
        "Where else in checkout's lifecycle — payment capture, inventory reservation, confirmation email — does idempotency need to be enforced independently, and does one shared key cover all of them or does each need its own?",
        "How would you expire old idempotency keys so the unique-index table doesn't grow forever, without accidentally allowing a very late retry to create a duplicate?",
        "How does this change if checkout calls an external payment processor that has its own idempotency-key mechanism?",
      ],
      relatedLinks: [
        { label: "Build it: Checkout Timeout Mystery scenario", href: "/workshop?scenario=checkout-timeout-mystery" },
        { label: "Foundations: Database Indexing Deep Dive", href: "/foundations/database-indexing-deep-dive" },
      ],
    },
  },
  {
    id: "microsoft-twitter-celebrity-tweet-fanout",
    company: "Microsoft",
    title: "Twitter-style feed: what happens when a celebrity posts?",
    prompt:
      "Design Twitter, with the discussion centering on the feed: specifically, what happens to your design when a celebrity account with a massive follower count posts a tweet?",
    category: "system-design",
    tags: ["fanout-feed"],
    source: {
      name: "LeetCode Discuss — Microsoft SDE-2 Recent questions 2025 | Consolidated",
      url: "https://leetcode.com/discuss/interview-question/6403987/Microsoft-SDE-2-Recent-questions-2025-or-Consolidated/",
      reportedDate: "Feb 2025",
      confidence: "high",
      note: "Full page reread directly; a consolidated list of recent-at-the-time Microsoft SDE-2 questions pulled from other LeetCode Discuss threads.",
    },
    context:
      "Listed under the source's 'HLD' section as: 'designing Twitter. Major discussion went related to Twitter Feed. What would happen when a celebrity posts some tweet.' This is the classic feed fan-out/hot-key problem stated with its specific triggering scenario rather than as a bare 'design Twitter' prompt.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Is the feed a reverse-chronological timeline, a ranked feed, or does that matter for this discussion?",
        "Roughly what follower-count range separates a 'normal' account from a 'celebrity' one, for capacity-planning purposes?",
        "Does a tweet need to appear in followers' feeds within a specific latency bound?",
        "Can a user follow a celebrity and also be followed by millions themselves (i.e., do we need to handle both fan-out directions at once)?",
      ],
      requirements: [
        "A new tweet should appear in the feeds of everyone who follows that account",
        "The system should not degrade badly when the poster has an unusually large follower count",
        "Feed reads should stay fast regardless of how a given tweet was fanned out",
        "The design should scale to normal accounts (fan-out-heavy) without breaking on celebrity accounts (fan-out-explosive)",
      ],
      approach:
        "Use a hybrid fan-out strategy: fan a tweet out to followers' precomputed feeds on write for normal accounts (since reads are far more frequent than writes and this keeps feed reads cheap), but switch to fan-out-on-read for celebrity accounts, since writing one tweet into millions of individual feed lists at once is the actual bottleneck a fixed fan-out-on-write design breaks on.",
      keyPoints: [
        "For a normal account, fan-out-on-write pushes a new tweet's ID into a precomputed feed list (e.g. a Redis list) for every follower at post time — this keeps feed reads to a single cheap lookup, which matters because feed reads vastly outnumber posts",
        "Identify celebrity/high-follower accounts by a follower-count threshold and route their posts down a different path: don't fan out to millions of individual feed lists synchronously (or at all) — instead, mark the tweet in the celebrity's own timeline only",
        "On feed read, merge two sources: the user's precomputed fan-out-on-write feed (from normal accounts they follow) plus a fan-out-on-read fetch of recent posts from the small number of celebrity accounts they follow — since a user follows relatively few celebrities compared to their total follow count, this merge stays cheap even though it's computed at read time",
        "Cache each celebrity's recent tweets aggressively (they're read by an enormous number of distinct followers, so cache hit rates are extremely high) so the fan-out-on-read path for celebrities doesn't hammer the primary tweet store",
        "If fan-out-on-write is still used for a celebrity's more moderately-followed segment, do it asynchronously through a queue rather than synchronously in the post request path, so the celebrity's own post doesn't hang waiting on millions of writes to complete",
        "Set an explicit, tunable threshold (follower count, or observed post fan-out cost) that decides which strategy an account uses, rather than hardcoding 'celebrity' as a fixed category — this lets the system adapt as an account's follower count grows past the threshold",
      ],
      tradeoffs: [
        "Hybrid fan-out (fast reads for the common case, added complexity of maintaining two code paths and a threshold) vs. pure fan-out-on-write for everyone (simple, one code path, but a celebrity post becomes a single write that fans out to millions of lists synchronously, which doesn't scale) — hybrid is the standard real-world answer to exactly this prompt because pure fan-out-on-write breaks specifically at the celebrity case",
        "Pure fan-out-on-read for everyone (no fan-out cost at write time, trivially handles any follower count) vs. hybrid (reads are more expensive for normal accounts under pure fan-out-on-read, since every feed view has to merge from every followed account at read time) — pure fan-out-on-read avoids the celebrity problem entirely but makes the far more common normal-account read path slower, which is why hybrid wins overall",
        "Asynchronous fan-out via a queue (post request returns fast regardless of follower count, eventual — not instant — visibility to all followers) vs. synchronous fan-out in the request path (immediate visibility, but request latency now scales with follower count) — async wins once follower counts get large enough that synchronous fan-out would make posting itself slow",
      ],
      followUps: [
        "How would you handle a user who follows several celebrity accounts — does the read-time merge cost scale linearly with how many celebrities they follow?",
        "How would you keep the feed roughly chronologically ordered when it's assembled from two different sources (precomputed list plus live merge)?",
        "What would you change if the product needed a ranked (not chronological) feed instead?",
      ],
      relatedLinks: [
        { label: "Build it: Trending Hashtags Feed scenario", href: "/workshop?scenario=trending-hashtags-feed" },
        { label: "Foundations: Caching", href: "/foundations/caching" },
      ],
    },
  },
  {
    id: "microsoft-azure-key-vault-secrets-service",
    company: "Microsoft",
    title: "Design a service like Azure Key Vault",
    prompt:
      "Design a service like Azure Key Vault that securely stores and retrieves secrets, certificates, and keys for applications and users.",
    category: "system-design",
    tags: ["auth-secrets"],
    level: "Software Engineer",
    source: {
      name: "Exponent question DB",
      url: "https://www.tryexponent.com/questions/5437/system-design-secure-key-vault-service",
      reportedDate: "~Aug 2025 (a year ago)",
      confidence: "high",
    },
    context:
      "Corroborated as a real Microsoft prompt by the Exponent Microsoft system design blog post (reread in full this pass), which independently lists 'design a service like Azure Key Vault' as one of its named Azure-domain question examples — fitting the blog's broader point that Microsoft's rounds are domain-flavored and expect security/compliance reasoning volunteered without being asked.",
    optimalAnswer: {
      clarifyingQuestions: [
        "Are secrets, certificates, and keys three genuinely different object types with different lifecycles (e.g. certs expire and need renewal, keys are used for crypto operations rather than just retrieved), or can they share one storage model?",
        "Who calls this service — applications (machine identities) at runtime, humans through a console, or both, and does that change the access-control model?",
        "Does the service need to perform cryptographic operations itself (sign, encrypt) using stored keys, or only store and hand back secret values?",
        "What's the audit/compliance requirement — does every read of a secret need to be logged for later review?",
      ],
      requirements: [
        "Store secrets, certificates, and keys with strong encryption at rest",
        "Authenticate and authorize every caller (application or user) per-vault and per-object, not just per-service",
        "Serve retrieval requests with low latency, since applications may fetch secrets on every startup or frequently at runtime",
        "Support certificate expiry/rotation and key versioning without breaking callers mid-rotation",
        "Log every access for audit purposes",
      ],
      approach:
        "Treat this as a narrow, security-first key-value store: the interesting design problems aren't about scale (secret volume per tenant is small) but about access control, encryption, and never letting a secret value leak into a log, cache, or error message it shouldn't be in.",
      keyPoints: [
        "Organize storage into per-tenant vaults, each holding named objects tagged as a secret, certificate, or key — certificates and keys carry extra metadata (expiry date, key type/algorithm) that plain secrets don't, but all three share the same access-control and versioning machinery",
        "Encrypt every stored value at rest using envelope encryption: each object is encrypted with a data key, and the data key itself is encrypted by a master key held in a dedicated hardware security module (HSM) or HSM-backed key-management layer — the vault service itself never persists plaintext secret values or an unencrypted master key",
        "Authenticate callers via managed identities (for applications) or standard identity tokens (for humans), then authorize per-vault, per-object access through explicit access policies — an application's identity is granted read access to specific secrets it needs, not blanket access to a whole vault",
        "Version every object on write rather than overwriting in place; retrieval defaults to the latest version but can request a specific one, which lets a certificate rotation or key rollover happen without breaking a caller mid-request that started against the previous version",
        "Cache secret reads at the calling application's SDK layer with a short TTL (not server-side, and never written to disk or logs) to avoid hitting the vault on every single use, while still picking up rotations reasonably quickly",
        "Log every access — who, what object, when, success/failure — to an append-only audit trail, since 'who read this secret and when' is often a compliance requirement independent of whether the read itself succeeded",
      ],
      tradeoffs: [
        "Envelope encryption with an HSM-backed master key (strong security boundary — even a compromised database dump is useless without the HSM, but adds a dependency on HSM availability for every decrypt) vs. a single application-managed encryption key stored alongside the data (simpler, but a database compromise plus the key together fully exposes every secret) — envelope encryption is worth the added dependency for anything positioned as a security-critical service",
        "Per-object versioning (safe rotation, more storage since old versions are retained, slightly more complex retrieval API) vs. in-place overwrite (simpler, smaller storage footprint, but a rotation can break any caller mid-flight that already fetched the old value and expects it to keep working) — versioning is close to mandatory once certificates/keys with real rotation schedules are in scope",
        "Client-side, short-TTL caching (keeps the vault's own read load manageable, rotation propagates within the TTL window) vs. no caching, always hit the vault (rotation is instant everywhere, but every application read now depends on the vault's availability and adds latency to hot paths) — light caching is the right default since most secrets don't need instant global rotation visibility",
      ],
      followUps: [
        "How would you support emergency, immediate revocation of a compromised secret, bypassing any client-side cache TTL?",
        "How would you scale this across regions while keeping each tenant's vault data in its required compliance region?",
        "What changes if a caller needs the vault to perform a signing operation with a stored private key, rather than ever retrieving the key material itself?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Replication", href: "/foundations/database-replication" },
        { label: "Foundations: REST APIs", href: "/foundations/rest-apis" },
      ],
    },
  },
  {
    id: "microsoft-azure-region-migration-ai-prompt-surge",
    company: "Microsoft",
    title: "Handle a regional AI-prompt traffic surge and migrate off a struggling Azure region",
    prompt:
      "Two related Azure-scale operational scenarios reported from Microsoft system design rounds: (1) handle a sudden high volume of AI prompts concentrated in one particular region, and (2) migrate services off a struggling West Coast Azure region — walk through how you'd move live traffic and data out of a region that's degrading, without a customer-visible outage.",
    category: "scenario-operational",
    tags: ["multi-region-failover", "capacity-scaling"],
    source: {
      name: "Exponent — Microsoft System Design Interview (2026 Guide)",
      url: "https://www.tryexponent.com/blog/microsoft-system-design-interview",
      confidence: "high",
      note: "Two related Azure-domain prompts from the blog's named question list, reread in full; grouped here as one operational scenario since both are about a single region under unusual load/degradation rather than a from-scratch architecture.",
    },
    context:
      "Listed among the Exponent blog's 'Microsoft and Azure domain prompts' bucket, alongside Azure Key Vault and a health-app prompt. The blog frames Microsoft's system design round as consistently domain-flavored — an Azure-adjacent team's prompts mirror real Azure operational concerns like regional capacity and failover, not abstract textbook systems.",
    optimalAnswer: {
      clarifyingQuestions: [
        "For the traffic-surge case: is the surge from more users, or from existing users sending more/larger prompts (which changes whether you scale request count or per-request cost)?",
        "For the region migration: is this a planned, gradual migration or an emergency response to a region that's actively degrading right now?",
        "Does the affected service hold state (user sessions, in-flight data) that needs to move with it, or is it stateless and just needs traffic redirected?",
        "What's the acceptable customer-visible impact — zero downtime required, or a brief, well-communicated maintenance window acceptable?",
      ],
      requirements: [
        "Absorb a sudden spike in AI-prompt volume concentrated in one region without that region's degradation becoming a customer-visible outage",
        "Move live traffic and data off a struggling region with no (or minimal) customer-visible downtime",
        "Avoid silently overloading a healthy neighboring region as a side effect of shedding load from the struggling one",
        "Keep data consistent through the transition — no lost or duplicated writes during cutover",
      ],
      approach:
        "Handle both scenarios with the same underlying capability: a global traffic-management layer that can shift load away from a specific region gradually and observably, backed by data that's either already replicated elsewhere or can be migrated ahead of the traffic cutover — treat 'sudden regional surge' and 'planned regional evacuation' as the same mechanism triggered by different signals (real-time load metrics vs. an operator decision).",
      keyPoints: [
        "Front all regions with a global load balancer / traffic manager (DNS-based or anycast) that can shift the percentage of traffic routed to each region, rather than routing being a fixed, static assignment",
        "For the sudden prompt-volume surge: autoscale inference/serving capacity within the affected region first (add nodes, since this is the cheapest and fastest lever), and only shed excess traffic to neighboring regions once autoscaling hits its ceiling — dumping load onto neighbors immediately risks cascading the problem into a second region",
        "Rate-limit or queue excess prompt volume that can't be served even after scaling and cross-region shedding, so the system degrades gracefully (slower responses, a visible queue) rather than falling over entirely — this matters especially for AI workloads where a single request is expensive relative to a typical web request",
        "For the region-migration case, replicate the region's data to the target region(s) ahead of time (this should already be true for anything designed with regional failover in mind) so cutover is a traffic-routing change, not a data-copy race against the clock",
        "Migrate traffic gradually via the traffic manager — shift a small percentage first, watch error rates and latency in the new region, then ramp — rather than an all-at-once cutover, so a problem in the target region is caught while it only affects a fraction of traffic",
        "For stateful sessions in flight during migration, either drain them (let in-flight requests finish in the old region while new requests route to the new one) or design sessions to be resumable from replicated state in the new region, depending on how long-lived a session typically is",
      ],
      tradeoffs: [
        "Gradual, percentage-based traffic shift (catches problems early on a small blast radius, migration takes longer) vs. an instant full cutover (fast, but any issue in the target region immediately affects 100% of traffic) — gradual shift is the safer default whenever the timeline allows for it, and the prompt explicitly calls for avoiding a customer-visible outage",
        "Autoscale-first, shed-to-neighbors-second for a traffic surge (protects neighboring regions from cascading overload, slower to relieve pressure than immediately spreading load) vs. immediately spreading surge traffic across all healthy regions (fastest relief for the affected region, but risks turning one region's problem into everyone's problem) — autoscale-first is the more conservative and generally correct ordering",
        "Pre-replicated data ready before any migration is triggered (cutover is fast and low-risk, costs steady-state replication overhead and infrastructure even when never needed) vs. copying data only once a migration is decided (no steady-state cost, but a slow, risky data-copy race is now on the critical path during an active incident) — pre-replication is worth the standing cost for anything where an emergency migration is a real possibility",
      ],
      followUps: [
        "How would you distinguish a genuine regional traffic surge from a bug or bot traffic causing an artificial spike, before autoscaling to meet it?",
        "How would you communicate the migration to affected customers, and what would trigger rolling it back mid-flight?",
        "How would this change if the struggling region needed to be evacuated within minutes, not with a gradual multi-hour ramp?",
      ],
      relatedLinks: [
        { label: "Foundations: Load Balancers", href: "/foundations/load-balancers" },
        { label: "Foundations: Database Replication", href: "/foundations/database-replication" },
      ],
    },
  },
];
