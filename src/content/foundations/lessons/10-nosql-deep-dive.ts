import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 10 | Topic: NoSQL Deep Dive | Phase: 1 — Foundations". The source
 * chat's own generation was interrupted partway through this lesson and
 * restarted from scratch after a "check the plan" detour — transcribed
 * from the completed retry, not the interrupted first attempt.
 */
export const NOSQL_DEEP_DIVE: FoundationLesson = {
  slug: "nosql-deep-dive",
  number: 10,
  title: "NoSQL Deep Dive",
  tagline:
    "Not \"no SQL\" — \"not only SQL\". Four distinct data models, each a deliberate trade-off, not a lesser SQL.",
  estimatedMinutes: 60,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "It's 2007. Facebook has 50 million users. Their MySQL database is struggling. Engineers are doing something they call \"sharding\" — manually splitting data across hundreds of MySQL servers. It's a nightmare to manage.",
        },
        {
          kind: "paragraph",
          text: "Meanwhile, Amazon's engineers published a paper called \"Dynamo\" — describing a database they built internally that could scale to millions of requests per second without the pain of relational databases. Google published \"Bigtable\" — describing how they stored petabytes of web crawl data that no SQL database could handle.",
        },
        {
          kind: "paragraph",
          text: "These papers inspired an entire generation of databases. MongoDB, Cassandra, Redis, HBase — all directly influenced by these papers.",
        },
        {
          kind: "insight",
          text: "NoSQL wasn't invented because SQL is bad. It was invented because SQL wasn't designed for web-scale distributed systems. Understanding why NoSQL exists is more important than memorizing its types.",
        },
      ],
    },
    {
      id: "why-sql-struggles",
      heading: "Why SQL struggles at scale",
      blocks: [
        { kind: "paragraph", text: "Let's make this concrete. Imagine Instagram's activity feed. Every second:" },
        { kind: "list", items: ["1,000 photos uploaded", "4,600 likes", "1,000 comments", "500 follows"] },
        { kind: "paragraph", text: "That's ~7,000 writes per second — just for social activity. Now imagine storing this in a SQL table:" },
        {
          kind: "code",
          language: "sql",
          code: "CREATE TABLE activity (\n    activity_id  BIGINT PRIMARY KEY,\n    user_id      BIGINT,\n    action_type  VARCHAR(20),\n    target_id    BIGINT,\n    created_at   TIMESTAMP\n);",
        },
        { kind: "paragraph", text: "Problems at this scale:" },
        {
          kind: "paragraph",
          text: "Problem 1 — Single machine limit. SQL databases are designed to run on one powerful machine. When that machine's limits are hit, you're in trouble. Scaling SQL horizontally (across machines) is complex and painful.",
        },
        { kind: "paragraph", text: "Problem 2 — Schema rigidity. Adding a column to a 10-billion-row activity table:" },
        {
          kind: "code",
          language: "sql",
          code: "ALTER TABLE activity ADD COLUMN metadata JSON;\n-- This locks the table for HOURS\n-- During which: no reads, no writes\n-- Instagram goes down",
        },
        { kind: "paragraph", text: "Problem 3 — JOIN performance at scale:" },
        {
          kind: "code",
          language: "sql",
          code: "SELECT a.*, u.name, u.photo\nFROM activity a\nJOIN users u ON a.user_id = u.user_id\nWHERE a.target_id = 123\nORDER BY a.created_at DESC\nLIMIT 20;",
        },
        { kind: "paragraph", text: "Joining two tables with billions of rows each is painfully slow." },
        {
          kind: "paragraph",
          text: "Problem 4 — Consistency cost. ACID guarantees require coordination. In a distributed system, coordination = latency. Sometimes you'd rather have fast eventual consistency than slow strong consistency.",
        },
        { kind: "insight", text: "NoSQL databases make deliberate trade-offs to solve these problems." },
      ],
    },
    {
      id: "document-databases",
      heading: "Type 1 — Document databases (MongoDB)",
      blocks: [
        {
          kind: "paragraph",
          text: "Instead of splitting data across tables and JOINing, store related data together in one document.",
        },
        { kind: "paragraph", text: "SQL approach — data split across tables:" },
        {
          kind: "code",
          code: "users table:        user_id, name, email\naddresses table:     address_id, user_id, city, pincode\npreferences table:   pref_id, user_id, cuisine, dietary\n\n-- Needs 3 JOINs to get a complete user profile",
        },
        { kind: "paragraph", text: "MongoDB approach — everything together:" },
        {
          kind: "code",
          language: "json",
          code: '{\n  "_id": "user_123",\n  "name": "Priya",\n  "email": "priya@gmail.com",\n  "addresses": [\n    { "type": "home", "city": "Mumbai", "pincode": "400001" },\n    { "type": "work", "city": "Mumbai", "pincode": "400051" }\n  ],\n  "preferences": {\n    "cuisines": ["biryani", "pizza"],\n    "dietary": "vegetarian"\n  }\n}',
        },
        { kind: "paragraph", text: "Gets the complete profile in ONE query — no JOINs." },
        { kind: "paragraph", text: "When embedding makes sense: embed data that is always accessed together." },
        {
          kind: "list",
          items: [
            "✅ Embed: user's addresses (always fetched with the user profile)",
            "✅ Embed: order's items (always shown with the order)",
            "✅ Embed: product's images (always shown with the product)",
            "❌ Don't embed: order's user details (user data changes independently)",
            "❌ Don't embed: product's reviews (could be thousands, grows unbounded)",
            "❌ Don't embed: comment's author (author appears in many places)",
          ],
        },
        { kind: "paragraph", text: "MongoDB query examples:" },
        {
          kind: "code",
          language: "javascript",
          code: '// Find all vegetarian users in Mumbai\ndb.users.find({\n  "addresses.city": "Mumbai",\n  "preferences.dietary": "vegetarian"\n});\n\n// Add a new address to user_123\ndb.users.updateOne(\n  { _id: "user_123" },\n  { $push: {\n      addresses: { type: "holiday", city: "Goa", pincode: "403001" }\n  }}\n);\n\n// Find users who like biryani (array contains)\ndb.users.find({\n  "preferences.cuisines": "biryani"\n});\n\n// Aggregation — count users by city\ndb.users.aggregate([\n  { $unwind: "$addresses" },\n  { $group: { _id: "$addresses.city", count: { $sum: 1 } } },\n  { $sort: { count: -1 } }\n]);',
        },
        { kind: "paragraph", text: "Indexes in MongoDB:" },
        {
          kind: "code",
          language: "javascript",
          code: '// Single field index\ndb.users.createIndex({ "email": 1 });\n\n// Compound index\ndb.orders.createIndex({ "user_id": 1, "status": 1 });\n\n// Text index for search\ndb.products.createIndex({ "name": "text", "description": "text" });',
        },
        {
          kind: "table",
          headers: ["Company", "What they store in MongoDB"],
          rows: [
            ["Flipkart", "Product catalog (each product has different attributes)"],
            ["Adobe", "Creative assets metadata"],
            ["Forbes", "Article content (varying structure per article type)"],
            ["Uber", "Driver and rider profiles"],
          ],
        },
        { kind: "paragraph", text: "When to use MongoDB:" },
        {
          kind: "list",
          items: [
            "✅ Product catalogs (phones have different specs than books)",
            "✅ User profiles with nested data",
            "✅ Content management (articles, blogs)",
            "✅ Real-time analytics",
            "✅ Prototyping (schema flexibility speeds development)",
            "❌ Financial transactions (need ACID across documents)",
            "❌ Highly relational data (many-to-many relationships)",
            "❌ Complex reporting with many aggregations",
          ],
        },
      ],
    },
    {
      id: "key-value-stores",
      heading: "Type 2 — Key-value stores (Redis)",
      blocks: [
        {
          kind: "paragraph",
          text: "The simplest possible data model: key → value. Like a giant dictionary/hashmap that lives on a server.",
        },
        {
          kind: "table",
          headers: ["Key", "Value"],
          rows: [
            ['"user:123:session"', '"eyJhbGciOiJIUzI1NiJ9..."'],
            ['"user:123:cart"', '"[{id:101,qty:2},{id:205,qty:1}]"'],
            ['"rate_limit:192.168.1.1"', '"47"'],
            ['"cache:product:456"', '"{name:\'iPhone 15\',price:89999}"'],
            ['"leaderboard:ipl_2024"', "sorted set of team scores"],
          ],
        },
        { kind: "paragraph", text: "Redis isn't just strings. It supports rich data structures." },
        { kind: "paragraph", text: "Strings — simple key-value:" },
        {
          kind: "code",
          language: "redis",
          code: 'SET user:123:name "Priya"\nGET user:123:name\n→ "Priya"\n\n-- With expiry (TTL)\nSET session:abc123 "user_data" EX 3600\n-- auto-deletes after 3600 seconds',
        },
        { kind: "paragraph", text: "Lists — ordered collection, push/pop from either end:" },
        {
          kind: "code",
          language: "redis",
          code: '-- Recent activity feed\nLPUSH user:123:feed "liked post 456"\nLPUSH user:123:feed "commented on post 789"\nLRANGE user:123:feed 0 9   -- get latest 10 items',
        },
        { kind: "paragraph", text: "Sets — unique unordered collection:" },
        {
          kind: "code",
          language: "redis",
          code: '-- Users who liked a post\nSADD post:456:likes "user_123"\nSADD post:456:likes "user_456"\nSADD post:456:likes "user_123"  -- duplicate, ignored\nSCARD post:456:likes            -- count = 2\n\n-- Common followers between two users\nSINTER user:123:following user:456:following',
        },
        { kind: "paragraph", text: "Sorted Sets — unique members with a score, ordered by score:" },
        {
          kind: "code",
          language: "redis",
          code: '-- Leaderboard\nZADD leaderboard 9823 "Mumbai Indians"\nZADD leaderboard 8654 "Chennai Super Kings"\nZADD leaderboard 7234 "Royal Challengers"\n\n-- Top 3 teams\nZREVRANGE leaderboard 0 2 WITHSCORES\n→ 1) Mumbai Indians       9823\n   2) Chennai Super Kings  8654\n   3) Royal Challengers    7234',
        },
        { kind: "paragraph", text: "Hashes — like a mini document:" },
        {
          kind: "code",
          language: "redis",
          code: '-- User session data\nHSET user:123 name "Priya" city "Mumbai" plan "premium"\nHGET user:123 name\n→ "Priya"\nHGETALL user:123\n→ name Priya city Mumbai plan premium',
        },
        {
          kind: "table",
          headers: ["Use case", "How Redis is used", "Data structure"],
          rows: [
            ["Session store", "Store login sessions with TTL", "String with EX"],
            ["Caching", "Cache DB query results", "String/Hash"],
            ["Rate limiting", "Count requests per IP", "String with INCR"],
            ["Leaderboards", "IPL scores, game rankings", "Sorted Set"],
            ["Real-time feed", "Recent activity", "List"],
            ["Pub/Sub", "Real-time notifications", "Pub/Sub"],
            ["Distributed lock", "Prevent double booking", "String with NX"],
          ],
        },
        { kind: "paragraph", text: "Why Redis is fast:" },
        {
          kind: "table",
          headers: ["Access", "Latency"],
          rows: [
            ["Disk access", "~10ms"],
            ["Memory access", "~100 nanoseconds"],
          ],
        },
        {
          kind: "insight",
          text: "Redis stores everything IN MEMORY → 100,000x faster than disk-based databases → can handle 100,000+ operations per second on a single node. The trade-off: RAM is expensive and limited. Redis is not for your primary data store — it's for hot, frequently accessed data.",
        },
      ],
    },
    {
      id: "column-family",
      heading: "Type 3 — Column-family databases (Cassandra)",
      blocks: [
        {
          kind: "paragraph",
          text: "Cassandra was designed for one thing: massive write throughput with high availability across multiple datacenters.",
        },
        {
          kind: "paragraph",
          text: "Instagram processes billions of social interactions daily. Uber logs billions of location updates. Netflix tracks billions of viewing events. These are write-heavy workloads that would destroy a SQL database.",
        },
        { kind: "paragraph", text: "SQL thinks in rows. Cassandra thinks in partitions." },
        { kind: "paragraph", text: "SQL table (row-oriented):" },
        {
          kind: "table",
          headers: ["order_id", "user_id", "total", "status", "created_at"],
          rows: [
            ["9981", "123", "605", "done", "2024-01-15"],
            ["9982", "456", "320", "pend", "2024-01-16"],
          ],
        },
        { kind: "paragraph", text: "Cassandra table (partition-oriented) — Partition Key: user_id, Clustering Key: created_at (orders within partition):" },
        {
          kind: "list",
          items: [
            "user_id=123 → 2024-01-15: {order_id:9981, total:605, status:done}",
            "user_id=123 → 2024-01-20: {order_id:9985, total:180, status:done}",
            "user_id=123 → 2024-01-28: {order_id:9991, total:420, status:pend}",
            "user_id=456 → 2024-01-16: {order_id:9982, total:320, status:pend}",
          ],
        },
        {
          kind: "insight",
          text: "All of user 123's orders live in the same partition — on the same node. Reading all orders for user 123 = reading one partition = extremely fast.",
        },
        { kind: "paragraph", text: "Cassandra Query Language (CQL):" },
        {
          kind: "code",
          language: "sql",
          code: "-- Create table\nCREATE TABLE orders (\n    user_id    UUID,\n    created_at TIMESTAMP,\n    order_id   UUID,\n    total      DECIMAL,\n    status     TEXT,\n    PRIMARY KEY (user_id, created_at)\n) WITH CLUSTERING ORDER BY (created_at DESC);\n\n-- Insert (blazing fast)\nINSERT INTO orders (user_id, created_at, order_id, total, status)\nVALUES (123, '2024-01-15 10:30:00', 9981, 605.00, 'delivered');\n\n-- Query by partition key (fast)\nSELECT * FROM orders\nWHERE user_id = 123\nAND created_at >= '2024-01-01'\nAND created_at <= '2024-01-31';\n\n-- This query FAILS in Cassandra:\nSELECT * FROM orders WHERE total > 500;\n-- ❌ Can't query without partition key\n-- Cassandra doesn't support arbitrary queries",
        },
        {
          kind: "insight",
          label: "The golden rule of Cassandra",
          text: "Design your tables around your queries, not your data. In SQL: design normalized tables, write any query later. In Cassandra: decide your queries first, then design tables to serve them.",
        },
        {
          kind: "paragraph",
          text: "Query: \"Get all orders for user 123 in January\" → Partition key: user_id, Clustering key: created_at. Query: \"Get all orders with status=pending\" → this requires a SEPARATE TABLE partitioned by status — you'd maintain two tables and write to both. This feels wrong coming from SQL. But it's the right way to think in Cassandra.",
        },
        { kind: "paragraph", text: "Why Cassandra is highly available — 3 datacenters, 9 nodes total:" },
        {
          kind: "architecture",
          nodes: [
            { id: "dc1-n1", label: "Node 1", sublabel: "DC1 — Mumbai", col: 0, row: 0, entityType: "database" },
            { id: "dc1-n2", label: "Node 2", sublabel: "DC1 — Mumbai", col: 1, row: 0, entityType: "database" },
            { id: "dc1-n3", label: "Node 3", sublabel: "DC1 — Mumbai", col: 2, row: 0, entityType: "database" },
            { id: "dc2-n1", label: "Node 4", sublabel: "DC2 — Delhi", col: 0, row: 1, entityType: "database" },
            { id: "dc2-n2", label: "Node 5", sublabel: "DC2 — Delhi", col: 1, row: 1, entityType: "database" },
            { id: "dc2-n3", label: "Node 6", sublabel: "DC2 — Delhi", col: 2, row: 1, entityType: "database" },
            { id: "dc3-n1", label: "Node 7", sublabel: "DC3 — Singapore", col: 0, row: 2, entityType: "database" },
            { id: "dc3-n2", label: "Node 8", sublabel: "DC3 — Singapore", col: 1, row: 2, entityType: "database" },
            { id: "dc3-n3", label: "Node 9", sublabel: "DC3 — Singapore", col: 2, row: 2, entityType: "database" },
          ],
          edges: [],
        },
        {
          kind: "paragraph",
          text: "Data is replicated across all 3 DCs. Even if the entire Mumbai DC goes down, Delhi and Singapore still serve all data — zero downtime.",
        },
        {
          kind: "paragraph",
          text: "This is called multi-datacenter replication — and it's why companies like Netflix (which must be globally available) use Cassandra.",
        },
        {
          kind: "table",
          headers: ["Company", "What they store"],
          rows: [
            ["Instagram", "Activity feed, likes, follows"],
            ["Netflix", "Viewing history, recommendations data"],
            ["Uber", "Trip data, location history"],
            ["Discord", "Chat message history (trillions of messages)"],
            ["Apple", "iCloud data"],
          ],
        },
        { kind: "paragraph", text: "When to use Cassandra:" },
        {
          kind: "list",
          items: [
            "✅ Billions of writes per day",
            "✅ Time-series data (logs, events, metrics)",
            "✅ Activity feeds",
            "✅ Multi-datacenter, globally distributed",
            "✅ High availability is critical",
            "✅ Simple, predictable query patterns",
            "❌ Complex queries (no JOINs, limited WHERE)",
            "❌ ACID transactions across rows",
            "❌ Frequently changing query patterns",
            "❌ Small datasets (overkill)",
          ],
        },
      ],
    },
    {
      id: "graph-databases",
      heading: "Type 4 — Graph databases (Neo4j)",
      blocks: [
        { kind: "paragraph", text: "Some data is fundamentally about relationships:" },
        {
          kind: "list",
          items: [
            "LinkedIn: who knows whom? Who worked where? Who has what skill?",
            "Fraud detection: is this transaction connected to known fraudsters?",
            "Recommendations: what did people similar to you buy?",
          ],
        },
        { kind: "paragraph", text: "In SQL, representing relationships requires JOIN tables:" },
        {
          kind: "code",
          language: "sql",
          code: '-- "Friends of friends" in SQL\nSELECT DISTINCT u3.name\nFROM users u1\nJOIN friendships f1 ON u1.user_id = f1.user_id\nJOIN friendships f2 ON f1.friend_id = f2.user_id\nJOIN users u3 ON f2.friend_id = u3.user_id\nWHERE u1.user_id = 123\nAND u3.user_id != 123;',
        },
        { kind: "paragraph", text: "This gets exponentially slower as you go deeper (friends of friends of friends). In Neo4j, the same query:" },
        {
          kind: "code",
          language: "cypher",
          code: "MATCH (u:User {id: 123})-[:FRIENDS_WITH*2]->(fof:User)\nWHERE fof.id <> 123\nRETURN DISTINCT fof.name",
        },
        {
          kind: "paragraph",
          text: "And it stays fast even at depth 5 or 6 because relationships are stored as direct pointers.",
        },
        {
          kind: "paragraph",
          text: "Graph database concepts: Nodes = entities (User, Product, Company); Edges = relationships (FRIENDS_WITH, PURCHASED, WORKS_AT); Properties = attributes on nodes and edges.",
        },
        {
          kind: "graph",
          nodes: [
            { id: "priya", label: "Priya", typeLabel: "User", x: 80, y: 110, tone: "signal" },
            { id: "rahul", label: "Rahul", typeLabel: "User", x: 260, y: 50 },
            { id: "iphone", label: "iPhone", typeLabel: "Product", x: 280, y: 110 },
            { id: "google", label: "Google", typeLabel: "Company", x: 260, y: 175 },
          ],
          edges: [
            { from: "priya", to: "rahul", label: "FRIENDS_WITH", propertyLabel: "since: 2020" },
            { from: "priya", to: "iphone", label: "PURCHASED", propertyLabel: "on: 2024-01-15" },
            { from: "priya", to: "google", label: "WORKS_AT", propertyLabel: "role: Engineer" },
          ],
        },
        {
          kind: "list",
          items: [
            "(Priya:User) —FRIENDS_WITH {since: 2020}→ (Rahul:User)",
            "(Priya:User) —PURCHASED {on: '2024-01-15'}→ (iPhone:Product)",
            "(Priya:User) —WORKS_AT {role: 'Engineer'}→ (Google:Company)",
          ],
        },
        { kind: "paragraph", text: "When to use graph databases:" },
        {
          kind: "list",
          items: [
            "✅ Social networks (friend recommendations)",
            "✅ Fraud detection (connected fraudster networks)",
            "✅ Knowledge graphs (Google's search graph)",
            "✅ Recommendation engines",
            "✅ Network/infrastructure topology",
            "❌ Simple data without complex relationships",
            "❌ High write throughput",
            "❌ Large-scale analytics",
          ],
        },
        {
          kind: "insight",
          text: "Graph databases are specialized. Most Indian placement interviews won't go deep here — but knowing when to suggest it shows senior thinking.",
        },
      ],
    },
    {
      id: "choosing-nosql",
      heading: "Choosing the right NoSQL database",
      blocks: [
        { kind: "paragraph", text: "Here's the decision framework for interviews:" },
        {
          kind: "tree",
          root: {
            label: "Highly connected, complex relationships?",
            children: [
              { label: "Graph Database (Neo4j)", edgeLabel: "YES", tone: "healthy" },
              {
                label: "Key-based lookup access pattern?",
                edgeLabel: "NO",
                children: [
                  {
                    label: "Small/hot data, speed critical?",
                    edgeLabel: "YES",
                    children: [
                      { label: "Key-Value Store (Redis)", edgeLabel: "YES", tone: "healthy" },
                      {
                        label: "Schema flexible, nested documents?",
                        edgeLabel: "NO",
                        children: [
                          { label: "Document DB (MongoDB)", edgeLabel: "YES", tone: "healthy" },
                          {
                            label: "Write-heavy, time-series/activity data?",
                            edgeLabel: "NO",
                            children: [
                              { label: "Column-Family (Cassandra)", edgeLabel: "YES", tone: "healthy" },
                              { label: "Reconsider SQL", edgeLabel: "NO" },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    label: "Write-heavy, time-series/activity data?",
                    edgeLabel: "NO",
                    children: [
                      { label: "Column-Family (Cassandra)", edgeLabel: "YES", tone: "healthy" },
                      { label: "Reconsider SQL", edgeLabel: "NO" },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      id: "consistency-models",
      heading: "NoSQL consistency models",
      blocks: [
        {
          kind: "paragraph",
          text: "NoSQL databases typically offer eventual consistency instead of strong consistency.",
        },
        {
          kind: "insight",
          label: "Strong Consistency (SQL default)",
          text: "Write → all nodes updated → read returns latest data. Slower, but always correct.",
        },
        {
          kind: "insight",
          label: "Eventual Consistency (NoSQL default)",
          text: "Write → some nodes updated → read might return stale data → eventually all nodes updated. Faster, but temporarily inconsistent.",
        },
        { kind: "paragraph", text: "Real example — Cassandra:" },
        {
          kind: "flow",
          steps: [
            { title: "Write \"Priya liked post 456\" to Node 1", tone: "healthy" },
            { title: "Node 1 replicates to Node 2", detail: "10ms later", tone: "healthy" },
            { title: "Node 1 replicates to Node 3", detail: "25ms later", tone: "healthy" },
            {
              title: "During those 25ms",
              detail: "a read from Node 3 might not see the like yet — eventual consistency. Fine for a \"like\", not for a bank balance.",
              tone: "signal",
            },
          ],
        },
        { kind: "paragraph", text: "Tunable Consistency in Cassandra:" },
        {
          kind: "list",
          items: [
            "ONE: at least 1 node must confirm the write",
            "QUORUM: majority of nodes must confirm (safer)",
            "ALL: all nodes must confirm (strongest, slowest)",
          ],
        },
        { kind: "insight", text: "Most companies use QUORUM for a balance of consistency and performance." },
      ],
    },
    {
      id: "comparison",
      heading: "The complete NoSQL comparison",
      blocks: [
        {
          kind: "table",
          headers: ["", "MongoDB", "Redis", "Cassandra", "Neo4j"],
          rows: [
            ["Model", "Document", "Key-Value", "Column-Family", "Graph"],
            ["Query", "Rich queries", "Key lookup", "Partition key", "Graph traversal"],
            ["Scale", "Horizontal", "Vertical + Cluster", "Massive horizontal", "Moderate"],
            ["Consistency", "Configurable", "Strong (single)", "Eventual", "ACID"],
            ["Speed", "Fast", "Extremely fast", "Very fast writes", "Fast for graphs"],
            ["Best for", "Catalogs, profiles", "Cache, sessions", "Activity feeds, logs", "Social, fraud"],
            ["Avoid for", "Complex transactions", "Primary data store", "Ad-hoc queries", "Large analytics"],
          ],
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "NoSQL questions come in three forms:" },
        {
          kind: "qa",
          question: "\"When would you use NoSQL over SQL?\"",
          answer:
            "Don't say \"when I need scale\" — that's a lazy answer. Say: \"When the data model is a poor fit for tables — like a product catalog where each product has different attributes, or activity feeds where we need massive write throughput and eventual consistency is acceptable. For financial data I'd still choose SQL for ACID guarantees.\"",
        },
        {
          kind: "qa",
          question: "\"Which database would you use for Instagram's activity feed?\"",
          answer:
            "Cassandra. Reason: billions of writes per day, time-series access pattern (show latest N activities), high availability requirement, eventual consistency acceptable for likes/follows.",
        },
        {
          kind: "qa",
          question: "\"Why is Redis so fast?\"",
          answer: "Everything in memory. No disk I/O. Single-threaded (no lock contention). Simple data structures.",
        },
        {
          kind: "insight",
          label: "The answer that impresses",
          text: "\"I'd use polyglot persistence — PostgreSQL for user accounts and financial data, MongoDB for the product catalog, Cassandra for activity feeds and time-series events, and Redis as a caching layer in front of everything. Each database does one thing extremely well.\"",
        },
      ],
    },
  ],
  summary:
    "NoSQL databases — Document, Key-Value, Column-Family, and Graph — each solve a specific problem that SQL struggles with at scale, and choosing between them requires understanding your data model, access patterns, consistency requirements, and write volume rather than picking based on what's popular.",
  keyTakeaways: [
    "Document DBs (MongoDB) embed related data together — eliminating JOINs for data always accessed together. Best for flexible schemas like product catalogs.",
    "Key-Value (Redis) is 100,000x faster than disk because everything lives in memory — use it for caching, sessions, and rate limiting, never as primary storage.",
    "Column-Family (Cassandra) is built for massive write throughput and global availability — design your tables around your queries, not your data.",
    "Graph DBs (Neo4j) make relationship traversal fast — use for social networks, fraud detection, and recommendations.",
    "Eventual consistency is the trade-off most NoSQL databases make for speed and scale — acceptable for social features, unacceptable for financial transactions.",
  ],
  exercise: {
    prompt:
      "You're designing the backend for CRED — an app where users pay credit card bills, earn coins, and get offers. Here are 5 data requirements: (1) User profiles (name, email, credit cards linked, CIBIL score); (2) Transaction history (user paid ₹45,000 bill on Jan 15 at 10:30 AM); (3) Coin balance and coin transaction ledger; (4) Real-time offer catalog (500 brands, each with different offer attributes); (5) User sessions and auth tokens. For each requirement, choose one specific database (PostgreSQL, MongoDB, Cassandra, or Redis) and give one sentence justifying the choice based on the data model, access pattern, or consistency requirement. One catch: requirement 3 (coin balance) is tricky — think carefully about what happens if two transactions try to update the same coin balance simultaneously, and which database property protects you here.",
  },
  relatedEntitySlugs: ["database", "cache"],
};
