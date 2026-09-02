import type { FoundationLesson } from "../types";

/**
 * Closes a gap this course's own content flagged during an audit: Lesson 12
 * introduced "Strategy 1: Read Replicas" in one paragraph and moved on to
 * sharding; this app's Replica Pool entity has real, simulated behavior
 * (a leader plus round-robin replicas, Write Ratio as its bottleneck lever)
 * that never got the deep-dive treatment Sharding (Lesson 20) just did for
 * its own sibling strategy. Synthesized from the standard treatment of
 * replication topologies, sync/async trade-offs, and failover across
 * PostgreSQL/MySQL/MongoDB/DynamoDB documentation, continuing directly from
 * Lessons 12, 19, and 20 rather than one external source.
 */
export const DATABASE_REPLICATION: FoundationLesson = {
  slug: "database-replication",
  number: 21,
  title: "Database Replication",
  tagline:
    "Sharding splits the data. Replication copies it. Lesson 12 introduced read replicas in one paragraph — this is the leader/follower topologies, the sync-vs-async trade-off, and what happens when the leader dies.",
  estimatedMinutes: 45,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Lesson 12 named read replicas as Strategy 1 and sharding as Strategy 2 — two answers to \"how do I scale a database beyond one machine\" that sound similar but do opposite things to the data. Replication puts the same data on multiple machines. Sharding puts different data on multiple machines. Lesson 20 went deep on the second one; this lesson is the first.",
        },
        {
          kind: "insight",
          text: "Most large real systems use both together, and in that order: shard the dataset across N machines to spread writes and storage, then replicate each shard so any one machine failing doesn't take that slice of data down with it. Sharding without replication means a single disk failure permanently loses a fifth of your data. Replication without sharding means you're still bottlenecked on one leader's write throughput. They solve different problems and compose cleanly.",
        },
      ],
    },
    {
      id: "topologies",
      heading: "Three replication topologies",
      blocks: [
        {
          kind: "paragraph",
          text: "\"Replication\" isn't one design — it's a question of which machines can accept writes, and how they agree on what happened.",
        },
        {
          kind: "paragraph",
          text: "1) Single-leader (leader-follower) — exactly what Lesson 12's Strategy 1 and this app's Replica Pool model. One machine (the leader) accepts all writes; it streams its write log to one or more followers, which serve reads.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "repl-write", label: "Write", col: 1, row: 0 },
            { id: "repl-leader", label: "Leader", sublabel: "accepts writes", col: 1, row: 1, entityType: "database", tone: "signal" },
            { id: "repl-f1", label: "Follower 1", sublabel: "read-only", col: 0, row: 2, entityType: "database" },
            { id: "repl-f2", label: "Follower 2", sublabel: "read-only", col: 2, row: 2, entityType: "database" },
          ],
          edges: [
            { from: "repl-write", to: "repl-leader" },
            { from: "repl-leader", to: "repl-f1", label: "replicates" },
            { from: "repl-leader", to: "repl-f2", label: "replicates" },
          ],
        },
        {
          kind: "paragraph",
          text: "2) Multi-leader — more than one machine accepts writes (typically one leader per datacenter), and leaders replicate to each other. Reads and writes both stay local to whichever datacenter a user is near, at the cost of a new problem single-leader never has: two leaders can accept conflicting writes to the same row at nearly the same time, and something has to resolve the conflict (last-write-wins by timestamp, a version vector, or application-level merge logic).",
        },
        {
          kind: "paragraph",
          text: "3) Leaderless — no machine is distinguished as \"the leader.\" A client writes to several replicas directly and reads from several replicas directly, using quorums to stay consistent: write to W replicas, read from R replicas, and if W + R > N (total replicas), every read is guaranteed to overlap with the most recent write on at least one replica it contacts.",
        },
        {
          kind: "table",
          headers: ["Topology", "Who accepts writes", "Conflict handling", "Example"],
          rows: [
            ["Single-leader", "One machine", "None needed — one writer, no conflicts possible", "PostgreSQL streaming replication, MySQL replication, this app's Replica Pool"],
            ["Multi-leader", "Multiple machines (usually one per region)", "Required — last-write-wins, version vectors, or app-level merge", "MySQL Group Replication, CouchDB"],
            ["Leaderless", "Any replica, via quorum writes", "Required — quorum overlap (W+R>N) plus read-repair/anti-entropy", "Amazon DynamoDB, Apache Cassandra"],
          ],
        },
        {
          kind: "insight",
          text: "Single-leader is simpler for exactly the reason it's the default taught first and the one this app simulates: writes have one unambiguous order because there's only one place they can happen. The other two topologies buy write availability across regions/nodes, and pay for it with conflict resolution — the same shape of trade-off Lesson 8's CAP theorem section already named in the abstract.",
        },
      ],
    },
    {
      id: "sync-vs-async",
      heading: "Synchronous vs. asynchronous replication",
      blocks: [
        {
          kind: "paragraph",
          text: "Even within single-leader replication, one question decides everything about the durability/latency trade-off: does the leader wait for a follower to confirm it received a write before telling the client the write succeeded?",
        },
        {
          kind: "table",
          headers: ["Mode", "Leader acknowledges write after", "Write latency", "Data loss risk if leader dies"],
          rows: [
            ["Synchronous", "At least one follower confirms it has the write too", "Higher — bounded by the slowest required follower", "None for acknowledged writes — a promoted follower already has them"],
            ["Asynchronous", "The leader's own local write, immediately", "Lower — no round trip to any follower", "Any writes the leader hadn't yet replicated are lost on failover"],
            ["Semi-synchronous", "One designated follower confirms; the rest stay async", "Between the two", "None for that one follower's confirmed writes; other followers may still lag"],
          ],
        },
        {
          kind: "insight",
          text: "This is Lesson 12's \"replication lag\" line — \"a write to Primary takes ~10-100ms to appear on Replicas\" — named precisely: that number is what asynchronous replication costs you. Fully synchronous replication to every follower would make that lag zero, but it also means one slow or unreachable follower stalls every write on the leader, which is why almost nobody runs fully synchronous to every replica. Semi-synchronous (MySQL's actual name for the mode) is the common middle ground: one follower's confirmation is required, so at least one up-to-date copy always survives a leader failure, and the rest replicate async without blocking writes.",
        },
      ],
    },
    {
      id: "replication-lag-consistency",
      heading: "What replication lag breaks: read-your-own-writes",
      blocks: [
        {
          kind: "paragraph",
          text: "Async replication's lag isn't just a number — it's a concrete bug users hit. A user updates their profile photo (write → leader), the page immediately reloads and reads it back (read → a follower that hasn't caught up yet), and the old photo flashes for a moment. This is the read-your-own-writes problem, and it's a direct, visible consequence of Lesson 12's \"replication lag\" line.",
        },
        {
          kind: "list",
          items: [
            "Read your own writes from the leader for some window after a write (e.g. the next few seconds, or for the rest of that session) — simple, but sends more traffic back to the leader that replicas exist to offload.",
            "Sticky sessions to a replica the app knows is caught up — track a `replicated_at` watermark and route a user's own reads to a replica only once it's past their last write's timestamp.",
            "Monotonic reads — even if you don't guarantee freshness, guarantee a user never sees data go backward in time (e.g. always read from the same replica for one user's session, rather than round-robin, so they can't read a stale follower after already having read a fresher one).",
          ],
        },
        {
          kind: "insight",
          text: "None of these problems exist without replication in the first place — a single database has one copy of the truth, so there's nothing to lag. This is the real cost of Lesson 12's Strategy 1, the same way cross-shard joins are the real cost of Strategy 2 (Lesson 20): the scaling technique is simple, the consistency implications it introduces are where the actual engineering judgment lives.",
        },
      ],
    },
    {
      id: "failover",
      heading: "Failover: when the leader dies",
      blocks: [
        {
          kind: "paragraph",
          text: "Single-leader replication has one obvious weak point: the leader is a single point of failure for writes, the same structural problem Lesson 13 raised about the load balancer itself. Recovering from a dead leader is a multi-step process, and getting any step wrong causes real damage.",
        },
        {
          kind: "flow",
          steps: [
            { title: "Detect the leader is actually dead", detail: "via timeout/heartbeat — too short and a slow-but-alive leader looks dead; too long and writes stall longer than necessary", tone: "signal" },
            { title: "Choose a new leader", detail: "the follower with the most up-to-date data — promoting a lagging follower silently loses whatever writes it never received", tone: "signal" },
            { title: "Reconfigure clients and other followers", detail: "point writes at the new leader, point the other followers to replicate from it instead of the old one", tone: "signal" },
            { title: "Handle the old leader's return", detail: "if it comes back online still believing it's the leader, two machines now accept writes — split brain — unless it's fenced off (shut down, or demoted and told to catch up as a follower)", tone: "critical" },
          ],
        },
        {
          kind: "insight",
          text: "Split brain is the failure mode that makes failover genuinely hard, not just mechanically fiddly: two leaders both accepting writes means the single unambiguous write order single-leader replication exists to guarantee is gone, and reconciling two divergent write histories afterward is exactly the conflict-resolution problem multi-leader replication has permanently. This is why production systems use a consensus protocol (Raft, in etcd/Patroni's case) to elect a new leader rather than a simple \"promote whichever follower answers first\" — consensus guarantees only one node can believe it's the leader at a time.",
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
            "PostgreSQL streaming replication — single-leader, async by default, synchronous_commit can be turned on per-transaction; Patroni (built on the etcd/Consul consensus layer) automates leader election and failover on top of it.",
            "MySQL — async by default; semi-synchronous replication is a real, named mode (not just a teaching simplification) requiring one replica's ack before commit.",
            "MongoDB replica sets — single-leader under the hood (called primary/secondary, not leader/follower), with automatic primary election built into the replica set protocol itself, no external tool required.",
            "Amazon DynamoDB / Apache Cassandra — leaderless, tunable per-request via consistency level (how many of N replicas must ack a write, how many must answer a read) rather than one global sync/async setting.",
          ],
        },
        {
          kind: "insight",
          text: "This app's own Replica Pool entity models the single-leader topology specifically: the first connection drawn from the pool is the leader, every connection after it is a round-robin read replica, and Write Ratio is the one dial — a higher ratio sends more traffic to the single leader, which is exactly Lesson 12's realistic bottleneck. What it doesn't simulate: replication lag itself, sync vs. async modes, or failover — the entity models the read-scaling benefit of replication, not the consistency and failure-recovery costs this lesson covers. That's a deliberate scope line, the same honest gap Lesson 19 and Lesson 20 both called out for their own entities.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "Replication questions tend to probe whether \"add read replicas\" is a memorized line or an understood trade-off:" },
        {
          kind: "qa",
          question: "\"Sync vs. async replication — which would you use for a banking system, and why?\"",
          answer:
            "\"Synchronous, or at least semi-synchronous, for anything where losing an acknowledged write is unacceptable — a confirmed balance transfer that then vanishes on a leader crash is a correctness bug, not just a UX hiccup. I'd accept the higher write latency as the cost. For something like a social media like-count, I'd go async — losing the last few writes on a rare leader crash is an acceptable trade for lower latency on every single write.\"",
        },
        {
          kind: "qa",
          question: "\"A user updates their profile and the old data flashes for a second on reload — what's happening, and how do you fix it?\"",
          answer:
            "\"That's the read-your-own-writes problem — the write went to the leader, and the read immediately after hit a follower that hasn't caught up yet, which is exactly what async replication's lag causes. The standard fix is routing that user's reads back to the leader (or to a replica known to be caught up) for a short window after their own write, rather than solving it globally — most reads can still go to any replica.\"",
        },
        {
          kind: "qa",
          question: "\"Walk me through what happens when a single-leader database's leader crashes.\"",
          answer:
            "\"First, the failure has to be detected — usually a heartbeat timeout, tuned so a truly dead leader is caught quickly without falsely promoting during a brief network blip. Then the most up-to-date follower is promoted — not just any follower, since a lagging one would silently drop the writes it never received. Clients and remaining followers get repointed at the new leader. The dangerous part is the old leader coming back online still thinking it's in charge — split brain, two nodes both accepting writes — which is why real systems use a consensus protocol like Raft for the election instead of an ad hoc 'first follower to respond' promotion, and explicitly fence the old leader off until it rejoins as a follower.\"",
        },
      ],
    },
  ],
  summary:
    "Replication copies the same data across machines; sharding (Lesson 20) splits different data across machines — they solve different problems and most large systems use both. Single-leader replication (this app's Replica Pool, PostgreSQL streaming replication, MySQL) is the default because one writer means one unambiguous write order; multi-leader and leaderless topologies buy write availability across regions or nodes at the cost of conflict resolution. Within single-leader, synchronous replication trades write latency for zero data loss on failover, asynchronous trades the reverse, and semi-synchronous (MySQL's real, named middle ground) requires just one follower's confirmation. Async's lag is what causes the read-your-own-writes bug, fixed by routing a user's own post-write reads back to the leader or a known-caught-up replica. Failover is genuinely hard because of split brain — the old leader coming back online still believing it's in charge — which is why production failover uses a consensus protocol (Raft) for leader election rather than promoting whichever follower answers first.",
  keyTakeaways: [
    "Replication copies the same data across machines (scales reads, adds durability); sharding splits different data across machines (scales writes and storage). Different problems — most large systems compose both.",
    "Three topologies: single-leader (one writer, no conflicts, this app's Replica Pool and default choice), multi-leader (write locally in each region, conflicts need resolving), leaderless (quorum reads/writes, no distinguished leader — DynamoDB, Cassandra).",
    "Sync replication trades write latency for zero acknowledged-write loss on failover; async trades the reverse and is where Lesson 12's '10-100ms replication lag' figure comes from; semi-synchronous (MySQL's real mode) requires just one follower's ack as a middle ground.",
    "Replication lag causes the read-your-own-writes bug — a user's own read immediately after their own write can hit a stale replica. Fixed by routing that read back to the leader or a known-caught-up replica for a short window, not by solving consistency globally.",
    "Failover is hard specifically because of split brain — a recovered old leader that still believes it's in charge, accepting writes alongside the new leader. Production systems use a consensus protocol (Raft) for leader election specifically to make that impossible, not an ad hoc 'promote whoever answers first.'",
  ],
  exercise: {
    prompt:
      "You run a single-leader Postgres setup (1 leader, 2 async replicas) for a checkout flow: a payment-confirmation write, immediately followed by a receipt-page read. (1) Under async replication, describe the exact bug a customer can hit on the receipt page, and why. (2) You're told write latency must stay low (checkout can't get slower), but losing an acknowledged payment write is unacceptable. Which replication mode do you pick, and what's the one guarantee it gives you that plain async doesn't? (3) The leader crashes at 2am. Replica A is fully caught up; Replica B is 4 seconds behind. Walk through the failover steps in order, naming which replica gets promoted and why. (4) Two hours later, the old leader — which was never cleanly shut down — reconnects to the network. What specifically goes wrong if nothing prevents it from acting as a leader again, and what's the standard fix?",
  },
  relatedEntitySlugs: ["replica-pool", "database"],
  prerequisites: ["database-sharding"],
};
