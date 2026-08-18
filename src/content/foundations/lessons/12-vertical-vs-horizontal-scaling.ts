import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 12 | Topic: Vertical vs Horizontal Scaling | Phase: 1 — Foundations".
 */
export const VERTICAL_VS_HORIZONTAL_SCALING: FoundationLesson = {
  slug: "vertical-vs-horizontal-scaling",
  number: 12,
  title: "Vertical vs Horizontal Scaling",
  tagline:
    "A bigger chef vs more chefs — both solve the queue outside the door, both have a ceiling, and only one of them has a code prerequisite.",
  estimatedMinutes: 45,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        { kind: "paragraph", text: "Imagine you run a restaurant. Business is booming. There's a queue outside the door." },
        { kind: "paragraph", text: "You have two options:" },
        {
          kind: "list",
          items: [
            "Option A: hire a bigger, faster chef. Replace your current chef with Gordon Ramsay. One person, but insanely capable.",
            "Option B: hire more chefs. 10 regular chefs working simultaneously.",
          ],
        },
        { kind: "paragraph", text: "Option A = Vertical Scaling. Option B = Horizontal Scaling." },
        {
          kind: "insight",
          text: "Both solve the problem. Both have limits. Both have costs. Knowing when to use which is one of the most fundamental system design decisions you'll ever make.",
        },
      ],
    },
    {
      id: "vertical-scaling",
      heading: "Vertical scaling (scale up)",
      blocks: [
        { kind: "paragraph", text: "Make your existing server bigger and more powerful." },
        {
          kind: "compare",
          panels: [
            {
              title: "Before",
              nodes: [{ id: "server-before", label: "Server", sublabel: "4 CPU · 16GB RAM · 500GB SSD", col: 0, row: 0 }],
              edges: [],
            },
            {
              title: "After vertical scaling",
              nodes: [
                { id: "server-after", label: "Server", sublabel: "64 CPU · 512GB RAM · 10TB SSD", col: 0, row: 0, tone: "healthy" },
              ],
              edges: [],
            },
          ],
        },
        { kind: "paragraph", text: "Same server. Just more powerful. How to vertically scale:" },
        {
          kind: "list",
          items: [
            "↑ CPU cores → handle more parallel computations",
            "↑ RAM → store more data in memory, faster access",
            "↑ SSD storage → faster disk I/O",
            "↑ Network bandwidth → handle more data transfer",
          ],
        },
        {
          kind: "paragraph",
          text: "Real example: early Instagram (2010) ran on a single EC2 instance. As they grew, they kept upgrading to larger AWS instance types:",
        },
        {
          kind: "flow",
          steps: [
            { title: "t2.micro", detail: "1 CPU, 1GB RAM — Day 1" },
            { title: "m4.large", detail: "2 CPU, 8GB RAM — Month 3" },
            { title: "m4.4xlarge", detail: "16 CPU, 64GB RAM — Month 6" },
          ],
        },
        { kind: "paragraph", text: "This works — until it doesn't." },
        {
          kind: "paragraph",
          text: "The ceiling problem: vertical scaling has a hard limit. The most powerful single server AWS offers today, u-24tb1.metal, has 448 CPU cores and 24 TB RAM. Cost: ~$200/hour = $1.75 million/year. And there's nothing bigger.",
        },
        { kind: "insight", text: "When you hit that ceiling — and at internet scale, you will — vertical scaling is done." },
        { kind: "paragraph", text: "Vertical Scaling Trade-offs:" },
        {
          kind: "list",
          items: [
            "✅ Simple — no code changes needed",
            "✅ No distributed systems complexity",
            "✅ Works immediately",
            "✅ Good for databases (simpler consistency)",
            "❌ Has a hard ceiling",
            "❌ Expensive — high-end hardware costs exponentially more",
            "❌ Single point of failure — one server dies, everything dies",
            "❌ Downtime during upgrade",
            "❌ Can't scale infinitely",
          ],
        },
      ],
    },
    {
      id: "horizontal-scaling",
      heading: "Horizontal scaling (scale out)",
      blocks: [
        { kind: "paragraph", text: "Add more servers and distribute the load across them." },
        {
          kind: "compare",
          panels: [
            {
              title: "Before",
              nodes: [{ id: "hs-server-before", label: "Server 1", sublabel: "4 CPU, 16GB RAM", col: 0, row: 0 }],
              edges: [],
            },
            {
              title: "After horizontal scaling",
              nodes: [
                { id: "hs-lb", label: "Load Balancer", col: 1, row: 0, entityType: "load_balancer" },
                { id: "hs-server-1", label: "Server 1", sublabel: "4 CPU, 16GB RAM", col: 0, row: 1, tone: "healthy", entityType: "api" },
                { id: "hs-server-2", label: "Server 2", sublabel: "4 CPU, 16GB RAM", col: 1, row: 1, tone: "healthy", entityType: "api" },
                { id: "hs-server-3", label: "Server 3", sublabel: "4 CPU, 16GB RAM", col: 2, row: 1, tone: "healthy", entityType: "api" },
              ],
              edges: [
                { from: "hs-lb", to: "hs-server-1" },
                { from: "hs-lb", to: "hs-server-2" },
                { from: "hs-lb", to: "hs-server-3" },
              ],
            },
          ],
        },
        {
          kind: "insight",
          text: "Horizontal scaling is theoretically infinite. Need more capacity? Add another server. And another. And another. Google's search runs on millions of servers, Facebook on hundreds of thousands, Netflix on AWS with auto-scaling.",
        },
        { kind: "paragraph", text: "Horizontal Scaling Trade-offs:" },
        {
          kind: "list",
          items: [
            "✅ No hard ceiling — add servers indefinitely",
            "✅ No single point of failure — one server dies, others handle traffic",
            "✅ Cost-efficient — use commodity hardware",
            "✅ Can scale to internet scale",
            "❌ Requires code changes — app must be stateless",
            "❌ Distributed systems complexity — consistency, coordination",
            "❌ Need a load balancer",
            "❌ Session/state management is harder",
            "❌ Debugging is harder across multiple servers",
          ],
        },
      ],
    },
    {
      id: "stateless-requirement",
      heading: "The stateless requirement",
      blocks: [
        {
          kind: "paragraph",
          text: "This is the critical prerequisite for horizontal scaling that most people miss. If your application stores state in memory — horizontal scaling breaks.",
        },
        { kind: "paragraph", text: "❌ Stateful application (can't horizontally scale easily):" },
        {
          kind: "flow",
          steps: [
            { title: "User logs in", detail: "Server 1 stores session in memory" },
            { title: "Next request", detail: "Load balancer routes to Server 2" },
            { title: "Server 2: \"Who are you? I have no session for you.\"", tone: "critical" },
            { title: "User gets logged out", tone: "critical" },
          ],
        },
        { kind: "paragraph", text: "✅ Stateless application (horizontally scalable): session stored in Redis (a shared store) — any server can handle any request." },
        {
          kind: "architecture",
          nodes: [
            { id: "stateless-server-1", label: "Server 1", sublabel: "stateless", col: 0, row: 0, tone: "healthy", entityType: "api" },
            { id: "stateless-redis", label: "Redis", sublabel: "session:123 = Priya", col: 1, row: 0, tone: "healthy", entityType: "cache" },
            { id: "stateless-server-2", label: "Server 2", sublabel: "stateless", col: 2, row: 0, tone: "healthy", entityType: "api" },
          ],
          edges: [
            { from: "stateless-server-1", to: "stateless-redis", tone: "healthy" },
            { from: "stateless-server-2", to: "stateless-redis", tone: "healthy" },
          ],
        },
        {
          kind: "insight",
          text: "Rule: before horizontally scaling, make your application stateless. Move all state to a shared external store (Redis, database).",
        },
      ],
    },
    {
      id: "scaling-databases",
      heading: "Scaling databases — the hard problem",
      blocks: [
        {
          kind: "paragraph",
          text: "Horizontally scaling application servers is relatively easy. Horizontally scaling databases is the hard problem in system design.",
        },
        {
          kind: "paragraph",
          text: "Why databases are hard to scale horizontally: application servers are stateless → any server handles any request ✅. Databases are stateful → they store data → consistency nightmare ❌.",
        },
        {
          kind: "insight",
          text: "If User A writes to Database Server 1, and User B reads from Database Server 2 — does User B see User A's write? This is the consistency problem.",
        },
        { kind: "paragraph", text: "Three database scaling strategies:" },
        { kind: "paragraph", text: "Strategy 1: Read Replicas. Most applications have far more reads than writes (Instagram: 99% reads, 1% writes)." },
        {
          kind: "architecture",
          nodes: [
            { id: "primary-db", label: "Primary DB", sublabel: "source of truth — all writes", col: 1, row: 0, entityType: "database" },
            { id: "replica-1", label: "Replica 1", sublabel: "read only", col: 0, row: 1, entityType: "database" },
            { id: "replica-2", label: "Replica 2", sublabel: "read only", col: 1, row: 1, entityType: "database" },
            { id: "replica-3", label: "Replica 3", sublabel: "read only", col: 2, row: 1, entityType: "database" },
          ],
          edges: [
            { from: "primary-db", to: "replica-1", label: "replicates" },
            { from: "primary-db", to: "replica-2", label: "replicates" },
            { from: "primary-db", to: "replica-3", label: "replicates" },
          ],
        },
        {
          kind: "paragraph",
          text: "Writes go to Primary, reads are distributed across Replicas, and Primary replicates changes to all Replicas.",
        },
        {
          kind: "insight",
          text: "Trade-off: replication lag. A write to Primary takes ~10-100ms to appear on Replicas. During that window, reads from Replicas return stale data. Used by Instagram, Flipkart, and almost every large SQL deployment.",
        },
        { kind: "paragraph", text: "Strategy 2: Sharding (Horizontal Partitioning). Split data across multiple database servers. Each server owns a subset of the data." },
        {
          kind: "table",
          headers: ["Shard", "user_id range"],
          rows: [
            ["Database Shard 1", "1 – 1M"],
            ["Database Shard 2", "1M – 2M"],
            ["Database Shard 3", "2M – 3M"],
          ],
        },
        { kind: "paragraph", text: "Query for user_id = 1,500,432 → routes to Shard 2 automatically." },
        {
          kind: "paragraph",
          text: "The challenge: what if Shard 1 has all the active users? Uneven load. This is called a hotspot. We'll go deep on sharding strategies in Phase 6.",
        },
        { kind: "paragraph", text: "Strategy 3: Caching Layer. Put Redis in front of your database. Most reads never hit the database." },
        {
          kind: "architecture",
          nodes: [
            { id: "cache-front-request", label: "Read request", col: 0, row: 0 },
            { id: "cache-front-cache", label: "Redis Cache", col: 1, row: 0, entityType: "cache" },
            { id: "cache-front-db", label: "Database", sublabel: "only uncached data hits DB", col: 1, row: 1, entityType: "database" },
          ],
          edges: [
            { from: "cache-front-request", to: "cache-front-cache" },
            { from: "cache-front-cache", to: "cache-front-request", label: "hit — return immediately", dashed: true, tone: "healthy" },
            { from: "cache-front-cache", to: "cache-front-db", label: "miss" },
          ],
        },
        {
          kind: "insight",
          text: "Industry reality: a well-tuned cache can absorb 90-99% of read traffic. The database only handles cache misses and all writes. We'll go very deep on this in Lesson 14 (Caching).",
        },
      ],
    },
    {
      id: "side-by-side",
      heading: "Vertical vs horizontal — side by side",
      blocks: [
        {
          kind: "table",
          headers: ["Dimension", "Vertical (Scale Up)", "Horizontal (Scale Out)"],
          rows: [
            ["Approach", "Bigger server", "More servers"],
            ["Ceiling", "Hard limit exists", "Theoretically unlimited"],
            ["Cost", "Exponentially expensive", "Linear cost"],
            ["Complexity", "Simple", "Complex (distributed systems)"],
            ["Failure", "Single point of failure", "Resilient"],
            ["Code changes", "None needed", "App must be stateless"],
            ["Best for", "Databases (early stage)", "Application servers"],
            ["Used by", "Small/medium systems", "Internet-scale systems"],
          ],
        },
      ],
    },
    {
      id: "realistic-journey",
      heading: "The realistic scaling journey",
      blocks: [
        { kind: "paragraph", text: "Here's how real companies actually scale — it's never just one strategy:" },
        { kind: "paragraph", text: "Stage 1: one server, everything on it (Day 1 startup). Stage 2: vertical scale (traction phase) — same shape, a bigger EC2 instance. Stage 3: separate concerns (scaling begins). Stage 4: horizontal app servers + load balancer." },
        {
          kind: "compare",
          panels: [
            {
              title: "Stage 1",
              nodes: [{ id: "journey-single", label: "App + DB + Cache", sublabel: "Single EC2 instance", col: 0, row: 0 }],
              edges: [],
            },
            {
              title: "Stage 3",
              nodes: [
                { id: "journey-app", label: "App Server", col: 0, row: 0, entityType: "api" },
                { id: "journey-db", label: "Database Server", col: 1, row: 0, entityType: "database" },
              ],
              edges: [{ from: "journey-app", to: "journey-db" }],
            },
            {
              title: "Stage 4",
              nodes: [
                { id: "journey-lb", label: "Load Balancer", col: 1, row: 0, entityType: "load_balancer" },
                { id: "journey-app1", label: "App 1", col: 0, row: 1, entityType: "api" },
                { id: "journey-app2", label: "App 2", col: 1, row: 1, entityType: "api" },
                { id: "journey-app3", label: "App 3", col: 2, row: 1, entityType: "api" },
                { id: "journey-db-cluster", label: "Database", sublabel: "Primary + Replicas", col: 0, row: 2, entityType: "database" },
                { id: "journey-cache", label: "Redis Cache", col: 2, row: 2, entityType: "cache" },
              ],
              edges: [
                { from: "journey-lb", to: "journey-app1" },
                { from: "journey-lb", to: "journey-app2" },
                { from: "journey-lb", to: "journey-app3" },
                { from: "journey-app2", to: "journey-db-cluster" },
                { from: "journey-app2", to: "journey-cache" },
              ],
            },
          ],
        },
        { kind: "paragraph", text: "Stage 5: full scale (internet-scale) — CDN + Load Balancers + Stateless App Servers + DB Sharding + Read Replicas + Redis Cluster + Message Queues + Microservices." },
        {
          kind: "insight",
          text: "This is the actual journey Instagram, Flipkart, and Uber went through. Not \"we designed it perfectly on day one.\"",
        },
      ],
    },
    {
      id: "auto-scaling",
      heading: "Auto-scaling — horizontal scaling on demand",
      blocks: [
        {
          kind: "paragraph",
          text: "Modern cloud platforms (AWS, GCP, Azure) support auto-scaling — automatically adding or removing servers based on load.",
        },
        {
          kind: "flow",
          steps: [
            { title: "Normal traffic (2 PM)", detail: "2 servers sufficient" },
            { title: "IPL match starts (7 PM) — traffic spikes 10x", detail: "auto-scaler detects high CPU/request rate, adds servers: 2 → 20", tone: "signal" },
            { title: "Match ends (11 PM) — traffic drops", detail: "auto-scaler removes servers, back to 2", tone: "healthy" },
          ],
        },
        {
          kind: "insight",
          text: "Netflix does this constantly. During peak evening hours they run significantly more servers than at 3 AM. You only pay for what you use.",
        },
      ],
    },
    {
      id: "industry-examples",
      heading: "Real industry examples",
      blocks: [
        { kind: "paragraph", text: "Instagram's scaling journey:" },
        {
          kind: "flow",
          steps: [
            { title: "2010", detail: "single server, PostgreSQL + Django" },
            { title: "2011", detail: "vertical scaled, then added read replicas" },
            { title: "2012", detail: "horizontal app servers, sharded PostgreSQL" },
            { title: "2013", detail: "Cassandra for activity feeds (write-heavy)" },
            { title: "2014", detail: "hundreds of servers, multiple database clusters" },
            { title: "2016", detail: "acquired by Facebook, migrated to Facebook's infrastructure", tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "Flipkart's Big Billion Day challenge:" },
        {
          kind: "table",
          headers: ["Day", "Orders"],
          rows: [
            ["Normal day", "~100,000 orders"],
            ["Big Billion Day", "~5,000,000 orders (50x spike)"],
          ],
        },
        { kind: "paragraph", text: "Solution:" },
        {
          kind: "list",
          items: [
            "Pre-scale horizontally before the event",
            "Aggressive caching (most product views are reads)",
            "Queue-based order processing (async writes)",
            "Database read replicas (handle the read surge)",
            "CDN for static assets (images, JS, CSS)",
          ],
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "Scaling questions are asked in every HLD interview. The pattern is always:" },
        { kind: "insight", text: "\"Your system needs to handle 10x more traffic. What do you do?\"" },
        {
          kind: "qa",
          question: "Wrong answer",
          answer: "\"I'll use a bigger server\" or \"I'll add more servers.\"",
        },
        {
          kind: "qa",
          question: "Right answer",
          answer:
            "\"First I'd identify the bottleneck — is it the application layer or the database layer? For application servers, horizontal scaling is straightforward since they're stateless — add more behind a load balancer with auto-scaling. For the database, I'd add read replicas to handle the read surge, a Redis caching layer to absorb 90% of reads, and if writes are the bottleneck, consider sharding. The goal is to scale each layer independently based on where the actual constraint is.\"",
        },
        {
          kind: "paragraph",
          text: "That answer shows: bottleneck identification first, different strategies for different layers, understanding of the statelessness requirement, and awareness of caching as a scaling tool.",
        },
      ],
    },
  ],
  summary:
    "Vertical scaling makes one server more powerful and is simple but has a hard ceiling and single point of failure, while horizontal scaling adds more servers for theoretically unlimited scale at the cost of distributed systems complexity — and the key enabler of horizontal scaling is making your application stateless so any server can handle any request.",
  keyTakeaways: [
    "Vertical scaling is simple but has a ceiling — it's a starting point, not an end game.",
    "Horizontal scaling requires stateless applications — move all session/state to a shared external store like Redis.",
    "Databases are harder to scale horizontally than application servers — use read replicas, caching, and sharding as progressive strategies.",
    "The realistic journey is vertical first, then horizontal — no company designs for infinite scale on day one.",
    "Auto-scaling on cloud platforms handles traffic spikes automatically — only pay for what you use.",
  ],
  exercise: {
    prompt:
      "You're the lead engineer at Meesho — a social commerce platform. Current setup: one EC2 server running App + MySQL database, current load 10,000 users/day. Meesho just went viral — load is expected to jump to 5 million users/day in 2 weeks. Your CTO says: \"Just upgrade to the biggest EC2 instance available.\" At what point does the CTO's suggestion fail — and why specifically? Design a 3-stage scaling plan to handle 5 million users/day — what do you do first, second, third, and why in that order? The database is your biggest concern, and you can't shard yet (too complex for 2 weeks) — what two things do you do to the database immediately?",
  },
  relatedEntitySlugs: ["load-balancer", "cache", "database"],
};
