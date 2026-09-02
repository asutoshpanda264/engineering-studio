/**
 * Hand-placed node positions for the `/foundations` forest map
 * (`FoundationsMap`) — percent coordinates within the map's own canvas,
 * not lesson content, so this stays a separate file from
 * `lessons/*.ts` to keep map layout apart from lesson data.
 *
 * `x` is topological tier (how many `prerequisites` hops from the root),
 * `y` is the node's lane within that tier — the reader scrolls
 * left-to-right from the root toward the capstone, with parallel
 * branches (Networking vs. Databases vs. Scaling's fan-out) reading as
 * distinct horizontal lanes rather than stacked vertically. Not derived
 * from an auto-layout algorithm: 24 nodes that change rarely don't
 * justify a layout-engine dependency, so positions are eyeballed by tier
 * and nudged apart within a tier so siblings don't collide. Re-tune by
 * hand if a future lesson's edges make a spot too cramped.
 */

export interface FoundationsMapNode {
  slug: string;
  x: number;
  y: number;
}

export const FOUNDATIONS_MAP_LAYOUT: FoundationsMapNode[] = [
  { slug: "what-is-system-design", x: 4, y: 50 },

  { slug: "how-the-internet-works", x: 12, y: 24 },
  { slug: "databases-the-big-picture", x: 12, y: 76 },

  { slug: "browser-request-lifecycle", x: 21, y: 18 },
  { slug: "sql-deep-dive", x: 21, y: 62 },
  { slug: "nosql-deep-dive", x: 21, y: 88 },

  { slug: "client-server-architecture", x: 29, y: 18 },
  { slug: "database-indexing-deep-dive", x: 29, y: 75 },

  { slug: "dns-deep-dive", x: 38, y: 6 },
  { slug: "http-and-https", x: 38, y: 30 },

  { slug: "rest-apis", x: 46, y: 30 },

  { slug: "vertical-vs-horizontal-scaling", x: 54, y: 40 },

  // This tier and the next one are the map's densest bipartite knot —
  // Load Balancers and Caching both feed CDN *and* Consistent Hashing, so
  // some edge-edge crossing between the two of them is unavoidable
  // regardless of ordering (draw both pairs and at least one crossing is
  // forced). What *is* fixable by ordering is edges cutting through a
  // third, unrelated node's card — solved here by lane order, not just
  // curve tuning: Load Balancers/Redis share the top lane (Redis is
  // Caching's own solo child, but sits row-aligned with Load Balancers so
  // Load Balancers' own solo child, Rate Limiting, has a clear lane at the
  // bottom instead of a long diagonal back up through the middle), the
  // shared CDN/Consistent Hashing pair sits in the middle where both
  // parents can reach them without a long sweep, and Kafka moves down to
  // sit right under its one true parent, Message Queues (it used to sit
  // near the top, forcing that edge to cut straight through the CDN/
  // Consistent Hashing cluster). Verified with a throwaway script
  // (line-vs-card-rect intersection test over every prerequisite edge and
  // every unrelated node, same discipline `movieTicketBooking.ts`'s own
  // header documents for tuning against the real engine — deleted after
  // use) rather than eyeballed: this ordering is the one that gets a
  // clean zero hits, versus 11 on the layout it replaced.
  { slug: "load-balancers", x: 63, y: 12 },
  { slug: "caching", x: 63, y: 50 },
  { slug: "message-queues", x: 63, y: 88 },

  { slug: "redis-deep-dive", x: 71, y: 12 },
  { slug: "cdn", x: 71, y: 31 },
  { slug: "consistent-hashing", x: 71, y: 50 },
  { slug: "kafka-deep-dive", x: 71, y: 69 },
  { slug: "rate-limiting", x: 71, y: 88 },

  { slug: "database-sharding", x: 79, y: 68 },
  { slug: "circuit-breakers", x: 79, y: 90 },

  { slug: "database-replication", x: 88, y: 68 },

  { slug: "estimation-and-interview-framework", x: 96, y: 50 },
];

export function getMapNodePosition(slug: string): FoundationsMapNode | undefined {
  return FOUNDATIONS_MAP_LAYOUT.find((node) => node.slug === slug);
}
