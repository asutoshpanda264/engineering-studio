import type { FoundationLesson } from "../types";

/**
 * Source: Alex Xu, "System Design Interview" Vol. 1, Chapter 5 ("Design
 * Consistent Hashing") — the rehashing problem, hash ring, virtual nodes,
 * and standard-deviation figures below are drawn from that chapter's
 * worked examples, adapted into this app's `FoundationLesson` shape.
 */
export const CONSISTENT_HASHING: FoundationLesson = {
  slug: "consistent-hashing",
  number: 19,
  title: "Consistent Hashing",
  tagline:
    "A clock face instead of a hash table — hash(key) % N reshuffles almost every key when N changes; a hash ring moves only the keys between the changed node and its neighbor.",
  estimatedMinutes: 45,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Every sharded cache, partitioned database, and distributed cache client faces the same question millions of times a second: given a key, which server owns it? The obvious answer is a hash function and a modulo: serverIndex = hash(key) % N.",
        },
        {
          kind: "paragraph",
          text: "That works fine as long as N — the number of servers — never changes. The moment a server is added or removed, N changes, and the modulo operation quietly breaks almost every key's mapping at once, not just the keys that were actually on the server that changed.",
        },
        {
          kind: "insight",
          text: "Lesson 12 (Vertical vs Horizontal Scaling) flagged sharding's hotspot problem and deferred the fix. This is the fix: consistent hashing is the standard technique for rebalancing shards, cache pools, and partitions without a full-system reshuffle every time the pool resizes.",
        },
      ],
    },
    {
      id: "naive-approach",
      heading: "The rehashing problem",
      blocks: [
        {
          kind: "paragraph",
          text: "Say you run 4 cache servers and route with hash(key) % 4. Eight keys land on servers like this:",
        },
        {
          kind: "table",
          headers: ["Key", "hash(key)", "server = hash % 4"],
          rows: [
            ["key0", "12", "Server 0"],
            ["key1", "47", "Server 3"],
            ["key2", "61", "Server 1"],
            ["key3", "91", "Server 3"],
            ["key4", "34", "Server 2"],
            ["key5", "78", "Server 2"],
            ["key6", "23", "Server 3"],
            ["key7", "55", "Server 3"],
          ],
        },
        {
          kind: "paragraph",
          text: "Now Server 1 goes offline for maintenance. The pool shrinks to 3 servers, so every lookup now computes hash % 3 instead of hash % 4 — same hash values, different divisor:",
        },
        {
          kind: "table",
          headers: ["Key", "hash(key)", "server = hash % 3"],
          rows: [
            ["key0", "12", "Server 0 (unchanged)"],
            ["key1", "47", "Server 2 (moved)"],
            ["key2", "61", "Server 1 (moved — correctly, it lost its home)"],
            ["key3", "91", "Server 1 (moved)"],
            ["key4", "34", "Server 1 (moved)"],
            ["key5", "78", "Server 0 (moved)"],
            ["key6", "23", "Server 2 (moved)"],
            ["key7", "55", "Server 1 (moved)"],
          ],
        },
        {
          kind: "insight",
          text: "Only key2 actually lived on the server that disappeared. But 6 of the 8 keys moved anyway — every cache client now looks in the wrong place for data that was never touched, which shows up as a storm of cache misses across the entire fleet, not a contained blip on one server.",
        },
        {
          kind: "paragraph",
          text: "This is the rehashing problem, and it gets worse as the pool grows: with a traditional hash table, resizing remaps nearly every key. Consistent hashing's whole purpose is to shrink that blast radius from \"almost everything\" to \"roughly k/n keys\" (k = total keys, n = number of nodes) — proportional to the one node that actually changed, not the pool size.",
        },
      ],
    },
    {
      id: "hash-ring",
      heading: "The hash ring",
      blocks: [
        {
          kind: "paragraph",
          text: "Consistent hashing drops the modulo entirely. Instead, both servers and keys are hashed onto the same fixed circular space — conventionally visualized as a clock face running 0° to 360° (a real implementation uses a hash function's full output range, e.g. SHA-1's 0 to 2^160 − 1, wrapped into a ring).",
        },
        {
          kind: "table",
          headers: ["Server", "Position on the ring"],
          rows: [
            ["Server 0", "40°"],
            ["Server 1", "140°"],
            ["Server 2", "230°"],
            ["Server 3", "320°"],
          ],
        },
        {
          kind: "paragraph",
          text: "Keys get hashed onto the same ring (with a plain hash — no modulo). To find which server owns a key, walk clockwise from the key's position until you hit the first server:",
        },
        {
          kind: "table",
          headers: ["Key", "Position on the ring", "First server clockwise"],
          rows: [
            ["key0", "10°", "Server 0 (40°)"],
            ["key1", "100°", "Server 1 (140°)"],
            ["key2", "200°", "Server 2 (230°)"],
            ["key3", "280°", "Server 3 (320°)"],
          ],
        },
        {
          kind: "insight",
          label: "Two basic steps",
          text: "1) Map servers and keys onto the ring with a uniformly-distributed hash function. 2) To look up a key's owner, walk clockwise from the key's position until you hit the first server. That's the entire algorithm — everything else in this lesson is making it work well in practice.",
        },
      ],
    },
    {
      id: "adding-removing-nodes",
      heading: "Adding and removing a node",
      blocks: [
        {
          kind: "paragraph",
          text: "This is the payoff. Because a key's owner is determined by \"nearest server clockwise,\" a ring change only affects the arc between the changed node and its clockwise neighbor — not the whole ring.",
        },
        {
          kind: "flow",
          steps: [
            { title: "Add Server 4 onto the ring", detail: "hashed to position 20°", tone: "signal" },
            {
              title: "key0 (10°) is now between Server 4 (20°) and Server 0 (40°)",
              detail: "clockwise nearest is Server 4 → key0 moves",
              tone: "critical",
            },
            { title: "key1, key2, key3 are untouched", detail: "their nearest clockwise server never changed", tone: "healthy" },
          ],
        },
        {
          kind: "flow",
          steps: [
            { title: "Remove Server 1 from the ring", detail: "was at position 140°", tone: "signal" },
            {
              title: "key1 (100°) loses its owner",
              detail: "next clockwise is now Server 2 (230°) → key1 moves",
              tone: "critical",
            },
            { title: "key0, key2, key3 are untouched", detail: "their nearest clockwise server never changed", tone: "healthy" },
          ],
        },
        {
          kind: "paragraph",
          text: "To find exactly which keys are affected without scanning the whole keyspace: on an add, walk anticlockwise from the new node until you hit the previous server — everything in between moves to the new node. On a remove, walk anticlockwise from the removed node until you hit the previous server — everything that was owned by the removed node moves to that next server. Either way it's one arc, not the whole ring.",
        },
        {
          kind: "table",
          headers: ["Scenario", "Naive hash % N", "Consistent hashing"],
          rows: [
            ["Add a node", "Nearly all keys remap", "Only the arc between the new node and its clockwise predecessor moves"],
            ["Remove a node", "Nearly all keys remap", "Only that node's keys move, to its clockwise successor"],
            ["Blast radius", "O(total keys)", "O(k / n) — proportional to the one node that changed"],
          ],
        },
      ],
    },
    {
      id: "virtual-nodes",
      heading: "Virtual nodes — the detail everyone skips",
      blocks: [
        {
          kind: "paragraph",
          text: "The ring as described so far has two real problems once you only have a handful of physical servers on it. First, partition sizes (the arc each server owns) are wildly uneven — remove one neighbor and the next server's arc can double overnight. Second, servers can cluster unevenly by pure chance: if three servers all happen to hash near each other, one of them can end up owning most of the ring while another owns almost nothing.",
        },
        {
          kind: "paragraph",
          text: "The fix: instead of placing each physical server once, place it many times under different virtual identities — s0_0, s0_1, s0_2, ... — each independently hashed to its own ring position. A key still resolves to \"first virtual node clockwise,\" which now maps back to whichever physical server that virtual node belongs to.",
        },
        {
          kind: "table",
          headers: ["Virtual nodes per physical server", "Standard deviation of load"],
          rows: [
            ["1 (no virtual nodes)", "High — one server can end up with several times the average load"],
            ["100", "~10% of the mean"],
            ["200", "~5% of the mean"],
          ],
        },
        {
          kind: "insight",
          text: "More virtual nodes → smoother distribution, because with more independently-hashed points per server, the law of large numbers evens out the ring's arcs. The cost is memory: the ring itself (a sorted map of position → physical server) grows with the number of virtual nodes, so this is a tunable knob, not a fixed constant. Real deployments commonly use 100-200+ virtual nodes per physical node.",
        },
        {
          kind: "paragraph",
          text: "Virtual nodes also solve a second problem for free: heterogeneous hardware. A server with 4x the capacity of its peers can simply get 4x the virtual nodes, so it ends up owning roughly 4x the ring — proportional capacity allocation without any special-casing in the lookup logic.",
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
            "Amazon DynamoDB — consistent hashing (with virtual nodes) is the partitioning component that assigns keys to storage nodes.",
            "Apache Cassandra — data is partitioned across the cluster using the same ring-and-virtual-node scheme.",
            "Client-side Memcached hashing (ketama) — since Memcached servers know nothing about each other, the hashing has to happen in the client library; ketama is the de facto consistent-hashing implementation for exactly that.",
            "Discord — uses consistent hashing to route between its own service instances at scale.",
          ],
        },
        {
          kind: "insight",
          text: "This app's own hashRouting.ts implements exactly the naive hash(key) % N scheme this lesson opened with — it's what Kafka's partitioner (Lesson 17) and the Load Balancer's ip_hash algorithm (Lesson 13) both use. That's a reasonable simplification, not an oversight: a Kafka topic's partition count essentially never changes after creation, and an ip_hash pool resize is rare and already accepted as disruptive — so the \"N changes\" problem this lesson solves barely comes up there. Consistent hashing earns its keep specifically when node count changes at runtime: a real sharded database assigning keys to shard leaders, a cache pool that autoscales, or a growing/shrinking ReplicaPool (Lesson 10's replica sets) — all cases where this app's own entities simplify past the problem consistent hashing exists to solve.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "Consistent hashing questions come in a few recurring shapes:" },
        {
          kind: "qa",
          question: "\"How would you shard a system that needs to add or remove nodes without a full rebalance?\"",
          answer:
            "\"Use consistent hashing: hash both nodes and keys onto a ring, and route each key to the first node found going clockwise. Adding or removing a node only moves the keys on the arc adjacent to that node — everything else stays put. I'd also add virtual nodes per physical node (100-200+) so load stays evenly distributed instead of depending on where a handful of physical nodes happened to land on the ring.\"",
        },
        {
          kind: "qa",
          question: "\"What's actually wrong with hash(key) % N — isn't a hash function random enough?\"",
          answer:
            "\"The hash function is fine; the modulo is the problem. N is the size of the pool, and the moment it changes, the divisor changes for every key, not just the ones on the node that changed. In practice that means removing one server out of four can remap 6 or 7 out of every 8 keys, which shows up as a cache-miss storm across the whole fleet, not a contained blip.\"",
        },
        {
          kind: "qa",
          question: "\"Why do you need virtual nodes — doesn't hashing already spread things out randomly?\"",
          answer:
            "\"With only a handful of physical nodes actually placed on the ring, randomness works against you — nodes can cluster by chance, leaving one node's arc many times larger than another's. Giving each physical node 100-200 independently-hashed virtual positions averages that out; empirically that gets standard deviation in per-node load down to roughly 5-10% of the mean, versus a much larger spread with one placement per node. It's also how you give a bigger server proportionally more load: more virtual nodes, more ring, no special-casing in the lookup.\"",
        },
      ],
    },
  ],
  summary:
    "Naive hash(key) % N routing breaks almost every key's mapping the instant the server count N changes, because the divisor itself changes for every lookup. Consistent hashing fixes this by hashing both servers and keys onto a shared ring and routing each key to the first server found going clockwise — so adding or removing a node only ever moves the keys on the adjacent arc, roughly k/n of them, not the whole keyspace. Virtual nodes (100-200+ per physical server) fix the ring's remaining unevenness and let heavier servers claim proportionally more of it. DynamoDB, Cassandra, and client-side Memcached hashing (ketama) all build on exactly this.",
  keyTakeaways: [
    "The rehashing problem: with hash(key) % N, changing N reshuffles nearly every key's mapping, not just the keys on the node that changed — a fleet-wide cache-miss storm from a single server swap.",
    "The hash ring: servers and keys are hashed onto the same circular space; a key belongs to the first server found going clockwise from it.",
    "Adding or removing a node only moves the keys on the arc between that node and its clockwise neighbor — on average k/n keys, proportional to the one node that changed, not the pool size.",
    "Virtual nodes (100-200+ per physical server) are what make the ring practical — they smooth out uneven partition sizes and let heavier servers claim proportionally more of the ring, just by holding more virtual positions.",
    "It's a targeted fix, not a default: this app's own hashRouting.ts, Kafka's partitioner, and Load Balancer's ip_hash all use the naive scheme because their bucket counts rarely change at runtime — consistent hashing earns its place specifically when node count changes live, as in DynamoDB, Cassandra, and ketama-style client hashing.",
  ],
  exercise: {
    prompt:
      "You run a distributed cache with 6 servers, routing with hash(key) % 6. It works until Server 3 needs to be pulled for maintenance — the on-call engineer reports a spike in cache misses across almost the entire fleet, not just requests that were served by Server 3. (1) Explain why removing one server out of six caused misses well beyond that one server's share of keys, in terms of the modulo operation. (2) Redesign the routing using consistent hashing — describe the ring, how a lookup works, and exactly which keys move when Server 3 is removed. (3) With only 6 physical servers placed on the ring, a teammate is skeptical load will actually be even — what's the concrete failure mode they're worried about, and how do virtual nodes address it? (4) A new Server 7 is added at a ring position between two existing servers — describe the precise, bounded procedure (not \"rehash everything\") for finding which keys need to move to it.",
  },
  relatedEntitySlugs: ["replica-pool", "cache", "kafka"],
};
