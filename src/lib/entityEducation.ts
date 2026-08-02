/**
 * Educational content for the Inspector's "How It Works" section
 * (WORKSHOP-UI.md §10 — "Engineering Explanation"). Follows ENTITIES.md's
 * five-question framework (what am I / what should users learn) and
 * ADR-007's "every entity has one Engineering Truth" — the goal is that a
 * student selecting any component leaves understanding the underlying
 * distributed-systems idea, not just the config knobs.
 *
 * Kept separate from entityCatalog.ts: the catalog is read on every
 * sidebar render and node creation and only needs short metadata, while
 * this content is Inspector-only and paragraph-length.
 */

import type { EntityType } from "@/simulation/types";

export interface EntityEducation {
  /** One-line "Engineering Truth" per ADR-007 — what this entity fundamentally does. */
  truth: string;
  /** ENTITIES.md Q1 — what infrastructure concept this represents. */
  whatAmI: string;
  /** ENTITIES.md Q5 — the engineering idea a student should leave understanding. */
  learningGoal: string;
  relatedConcepts: string[];
}

export const ENTITY_EDUCATION: Record<EntityType, EntityEducation> = {
  client: {
    truth: "I don't know how the system works. I only know whether it worked.",
    whatAmI:
      "I represent every user hitting the system. I generate requests and wait for a response — caches, connection pools, and server load are all invisible to me.",
    learningGoal:
      "Every architecture ultimately exists to improve what I experience: latency and success rate. If a change doesn't show up here, it didn't help.",
    relatedConcepts: ["Latency", "Reliability", "Request Lifecycle"],
  },
  api: {
    truth: "I do the work, and I have a limit.",
    whatAmI:
      "I sit between the Client and the Database, running business logic. I can only process a fixed number of requests at once — anything beyond that waits in a bounded queue or gets rejected.",
    learningGoal:
      "Capacity is finite. A server that looks fine at low traffic can start rejecting requests the moment concurrent load exceeds what it's configured to handle — that's backpressure, not a bug.",
    relatedConcepts: ["Concurrency", "Backpressure", "Queueing", "Horizontal Scaling"],
  },
  database: {
    truth: "I remember.",
    whatAmI:
      "I persist state and answer queries through a bounded connection pool. Every query I run competes with every other query for the same limited connections, and I can fail independently of anything upstream.",
    learningGoal:
      "I'm usually the tightest bottleneck in any architecture — I can't be casually duplicated the way a stateless server can, so protecting me (caching, connection limits, read replicas) matters more than protecting anything else.",
    relatedConcepts: ["Connection Pooling", "Bottlenecks", "Replication", "Consistency"],
  },
  load_balancer: {
    truth: "I distribute work.",
    whatAmI:
      "I sit in front of multiple servers and decide which one handles each request — by round robin, least connections, or another policy.",
    learningGoal:
      "I don't create capacity. I only spread existing capacity more evenly. Putting me in front of one overloaded server changes nothing — the servers behind me are what actually need to scale.",
    relatedConcepts: ["Horizontal Scaling", "Traffic Distribution", "Health Checks"],
  },
  cache: {
    truth: "I prevent repeated work.",
    whatAmI:
      "I sit in front of slower storage and answer requests from memory when I can. A hit skips the expensive path entirely; a miss falls through to whatever's behind me.",
    learningGoal:
      "The lesson isn't \"use Redis.\" It's that repeated, identical work is wasteful — a cache only helps when the same data is requested often enough to be worth remembering.",
    relatedConcepts: ["Hit Rate", "Hot Data", "Eviction Policy", "Database Offloading"],
  },
  cdn: {
    truth: "I bring data closer to the user.",
    whatAmI:
      "I'm a cache with geography — copies of content live at edge locations near where users actually are, so a response doesn't have to cross the planet.",
    learningGoal:
      "Latency is partly a physics problem, not just a capacity problem. No amount of server scaling fixes a request that has to travel halfway around the world — proximity does.",
    relatedConcepts: ["Edge Computing", "Geographic Latency", "Regional Caching"],
  },
  message_queue: {
    truth: "I let producers and consumers work at different speeds.",
    whatAmI:
      "I sit between whoever creates work and whoever processes it, holding requests until a consumer is ready. Producers don't wait on consumers, and consumers process at their own pace.",
    learningGoal:
      "Not every request needs an immediate answer. Decoupling \"accepted the request\" from \"finished the request\" is how systems absorb traffic spikes without falling over.",
    relatedConcepts: ["Asynchronous Processing", "Backpressure", "Decoupling", "Dead-letter Queues"],
  },
};

export function getEntityEducation(type: EntityType): EntityEducation {
  return ENTITY_EDUCATION[type];
}
