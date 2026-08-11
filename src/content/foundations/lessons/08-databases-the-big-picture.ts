import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 8 | Topic: Databases — The Big Picture | Phase: 1 — Foundations".
 * The users/orders SQL table + JOIN example was behind the source page's
 * own filter and reconstructed to the same shape as this lesson's own
 * surrounding tables, rather than invented from an unrelated example.
 */
export const DATABASES_THE_BIG_PICTURE: FoundationLesson = {
  slug: "databases-the-big-picture",
  number: 8,
  title: "Databases — The Big Picture",
  tagline:
    "ACID is why a database isn't just a file — and SQL vs NoSQL is the biggest single decision in most system design interviews.",
  estimatedMinutes: 45,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        { kind: "paragraph", text: "Imagine Zomato stores all its data in a text file:" },
        {
          kind: "code",
          code: "order_9981,user_123,restaurant_42,chicken_biryani,605,delivered\norder_9982,user_456,restaurant_18,pizza_margherita,320,pending\norder_9983,user_123,restaurant_42,dal_makhani,180,delivered\n...",
        },
        { kind: "paragraph", text: "Now answer these questions using that file:" },
        {
          kind: "list",
          items: [
            "What's the total revenue from restaurant 42 this month?",
            "Which users ordered more than 5 times in the last week?",
            "What happens if two people modify the file simultaneously?",
            "What if the server crashes mid-write?",
          ],
        },
        {
          kind: "paragraph",
          text: "You'd have to read the entire file every time. Concurrent writes would corrupt data. A crash mid-write would leave half-written records.",
        },
        {
          kind: "paragraph",
          text: "Databases exist to solve exactly these problems — and they've been solving them for 50 years with battle-tested guarantees.",
        },
      ],
    },
    {
      id: "what-a-database-does",
      heading: "What a database actually does",
      blocks: [
        {
          kind: "paragraph",
          text: "A database is not just \"a place to store data.\" It provides four critical guarantees that a file system cannot — the ACID properties.",
        },
        {
          kind: "table",
          headers: ["Property", "What it means", "Real example"],
          rows: [
            ["Atomicity", "All-or-nothing. Either the whole operation succeeds or none of it does", "Transfer ₹500: debit one account AND credit another. Never just debit."],
            ["Consistency", "Data always moves from one valid state to another. Rules are never violated", "Can't have a negative balance if a minimum balance rule exists"],
            ["Isolation", "Concurrent transactions don't interfere with each other", "Two people booking the last seat — only one wins"],
            ["Durability", "Committed data survives crashes", "After \"payment successful\", data persists even if the server dies"],
          ],
        },
        {
          kind: "insight",
          text: "These four properties are what separate a database from a file. ACID is why you use a database.",
        },
      ],
    },
    {
      id: "sql-vs-nosql",
      heading: "The two families — SQL vs NoSQL",
      blocks: [
        { kind: "paragraph", text: "Every database in existence falls into one of two broad families:" },
        {
          kind: "tree",
          root: {
            label: "Databases",
            children: [
              { label: "SQL", sublabel: "Relational, strict schema, ACID" },
              { label: "NoSQL", sublabel: "Non-relational, flexible schema" },
            ],
          },
        },
        {
          kind: "insight",
          text: "This is the most important database decision you'll make in any system design interview.",
        },
      ],
    },
    {
      id: "sql-veteran",
      heading: "SQL databases — the veteran",
      blocks: [
        {
          kind: "paragraph",
          text: "SQL databases organize data into tables with rows and columns — like a spreadsheet, but with relationships between tables.",
        },
        {
          kind: "table",
          headers: ["user_id", "name", "email"],
          rows: [
            ["123", "Priya", "priya@gmail.com"],
            ["456", "Rahul", "rahul@gmail.com"],
          ],
        },
        {
          kind: "table",
          headers: ["order_id", "user_id", "restaurant", "total"],
          rows: [
            ["9981", "123", "Paradise Biryani", "605"],
            ["9982", "456", "Pizza Hut", "320"],
          ],
        },
        {
          kind: "code",
          code: "SELECT orders.order_id, orders.total, users.name\nFROM orders\nJOIN users ON orders.user_id = users.user_id\nWHERE users.user_id = 123;",
        },
        {
          kind: "paragraph",
          text: "This is a relationship: orders.user_id points back to users.user_id. Relational databases are built entirely around joining tables like this.",
        },
        { kind: "paragraph", text: "SQL Strengths:" },
        {
          kind: "list",
          items: [
            "ACID guarantees — critical for financial data",
            "Complex queries with JOINs across tables",
            "Strong consistency — reads always return the latest write",
            "Well-understood, battle-tested for 50 years",
            "Enforced schema — catches bad data at insert time",
          ],
        },
        { kind: "paragraph", text: "SQL Weaknesses:" },
        {
          kind: "list",
          items: [
            "Schema changes are painful at scale (adding a column to a 500M-row table = hours of downtime)",
            "Horizontal scaling is hard (designed to run on one powerful machine)",
            "Doesn't handle unstructured data well (what if different users have different attributes?)",
            "Performance degrades with complex JOINs on huge tables",
          ],
        },
      ],
    },
    {
      id: "nosql-new-wave",
      heading: "NoSQL databases — the new wave",
      blocks: [
        {
          kind: "paragraph",
          text: "NoSQL databases were born when companies like Google, Amazon, and Facebook hit the limits of SQL at massive scale in the 2000s.",
        },
        {
          kind: "insight",
          text: "NoSQL doesn't mean \"no SQL\" — it means \"not only SQL\". It's a family of databases that trade some SQL guarantees for scale and flexibility.",
        },
        { kind: "paragraph", text: "Type 1: Document Databases. Store data as JSON-like documents. No fixed schema." },
        {
          kind: "code",
          language: "json",
          code: '// MongoDB document for a user\n{\n  "_id": "123",\n  "name": "Priya",\n  "email": "priya@gmail.com",\n  "addresses": [\n    { "type": "home", "city": "Mumbai", "pincode": "400001" },\n    { "type": "work", "city": "Mumbai", "pincode": "400051" }\n  ],\n  "preferences": {\n    "cuisine": ["biryani", "pizza"],\n    "dietary": "vegetarian"\n  }\n}',
        },
        { kind: "paragraph", text: "Notice: addresses and preferences are embedded inside the document. No JOIN needed." },
        {
          kind: "paragraph",
          text: "Used for: user profiles, product catalogs, content management. Examples: MongoDB, CouchDB, Firestore. Real usage: Flipkart uses MongoDB-style stores for its product catalog (each product has different attributes).",
        },
        { kind: "paragraph", text: "Type 2: Key-Value Stores. The simplest NoSQL. Just a giant hash map: key → value." },
        {
          kind: "code",
          code: '"user:123:session"          → "eyJhbGciOiJIUzI1NiJ9..."\n"user:123:cart"             → "[{item_id: 101, qty: 2}]"\n"rate_limit:ip:192.168.1.1" → "47"\n"cache:product:456"         → "{name: iPhone, price: 89999}"',
        },
        {
          kind: "paragraph",
          text: "Used for: caching, sessions, rate limiting, leaderboards. Examples: Redis, DynamoDB, Memcached. Real usage: every major company uses Redis for caching.",
        },
        { kind: "paragraph", text: "Type 3: Column-Family Databases. Store data in columns rather than rows. Optimized for reading specific columns across millions of rows." },
        { kind: "paragraph", text: "Row key: user_123" },
        {
          kind: "table",
          headers: ["Column", "Value"],
          rows: [
            ["2024-01:orders", "[order data]"],
            ["2024-01:spend", "4500"],
            ["2024-02:orders", "[order data]"],
            ["2024-02:spend", "6200"],
          ],
        },
        {
          kind: "paragraph",
          text: "Used for: time-series data, analytics, write-heavy workloads. Examples: Apache Cassandra, HBase, Google Bigtable. Real usage: Instagram uses Cassandra for storing activity feeds. Uber uses it for trip data.",
        },
        { kind: "paragraph", text: "Type 4: Graph Databases. Store data as nodes and relationships. Designed for highly connected data." },
        {
          kind: "list",
          items: [
            "(Priya) —FRIENDS_WITH→ (Rahul)",
            "(Priya) —FOLLOWS→ (Virat Kohli)",
            "(Rahul) —LIKES→ (Post #456)",
            "(Post #456) —TAGGED→ (Priya)",
          ],
        },
        {
          kind: "paragraph",
          text: "Used for: social networks, recommendation engines, fraud detection. Examples: Neo4j, Amazon Neptune. Real usage: LinkedIn uses graph databases for \"People You May Know\".",
        },
      ],
    },
    {
      id: "cap-theorem",
      heading: "The core trade-off — CAP theorem",
      blocks: [
        {
          kind: "paragraph",
          text: "This is the most important theoretical concept in distributed systems, and it always comes up in interviews.",
        },
        {
          kind: "paragraph",
          text: "CAP Theorem says: in a distributed system, you can only guarantee 2 of these 3 properties simultaneously:",
        },
        {
          kind: "diagram",
          lines: [
            "         Consistency",
            "              /\\",
            "             /  \\",
            "            /    \\",
            "           /      \\",
            "          /________\\",
            "   Availability    Partition Tolerance",
          ],
        },
        {
          kind: "table",
          headers: ["Property", "What it means"],
          rows: [
            ["Consistency (C)", "Every read returns the most recent write"],
            ["Availability (A)", "Every request gets a response (might not be the latest data)"],
            ["Partition Tolerance (P)", "System keeps working even if the network splits"],
          ],
        },
        {
          kind: "insight",
          text: "Network partitions ALWAYS happen in real distributed systems. So you always need P. That means the real choice is: CP or AP?",
        },
        { kind: "paragraph", text: "CP (Consistency + Partition Tolerance) — choose consistency over availability. The system might reject requests during network issues." },
        { kind: "list", items: ["Examples: HBase, MongoDB (with strong consistency), Zookeeper", "Use when: banking, payments — wrong data is worse than no data"] },
        { kind: "paragraph", text: "AP (Availability + Partition Tolerance) — choose availability over consistency. The system always responds, might return stale data." },
        { kind: "list", items: ["Examples: Cassandra, DynamoDB, CouchDB", "Use when: social feeds, product catalogs — stale data is acceptable"] },
        { kind: "paragraph", text: "Real example — WhatsApp message delivery:" },
        {
          kind: "list",
          items: [
            "AP system — a message might show \"sent\" before all replicas confirm",
            "Eventual consistency — all replicas will eventually have the message",
            "Availability > consistency for chat",
          ],
        },
        { kind: "paragraph", text: "Flipkart payment processing:" },
        {
          kind: "list",
          items: [
            "CP system — would rather reject a transaction than process it twice",
            "Consistency > availability for money",
          ],
        },
      ],
    },
    {
      id: "when-to-use-which",
      heading: "SQL vs NoSQL — when to use which",
      blocks: [
        { kind: "paragraph", text: "This is the question every interview asks. Here's the honest answer." },
        { kind: "paragraph", text: "Use SQL when:" },
        {
          kind: "list",
          items: [
            "Data has clear relationships (users, orders, products)",
            "You need ACID transactions (payments, bookings)",
            "Data structure is well-defined and stable",
            "You need complex queries and reporting",
            "Consistency is critical",
          ],
        },
        { kind: "paragraph", text: "Examples: user accounts and authentication, financial transactions, order management, inventory management." },
        { kind: "paragraph", text: "Use NoSQL when:" },
        {
          kind: "list",
          items: [
            "Massive scale (billions of records)",
            "Flexible or evolving schema",
            "Simple access patterns (lookup by key)",
            "High write throughput",
            "Eventual consistency is acceptable",
          ],
        },
        { kind: "paragraph", text: "Examples: social media feeds (Cassandra), session/cache data (Redis), product catalogs with varying attributes (MongoDB), real-time analytics (Cassandra/HBase), chat messages (Cassandra)." },
        {
          kind: "insight",
          label: "The honest industry truth",
          text: "Most large systems use both. This is called polyglot persistence.",
        },
        {
          kind: "tree",
          root: {
            label: "Flipkart's data layer",
            children: [
              { label: "User accounts", sublabel: "PostgreSQL — ACID, relationships" },
              { label: "Product catalog", sublabel: "MongoDB — flexible schema" },
              { label: "Shopping cart", sublabel: "Redis — fast, temporary" },
              { label: "Order history", sublabel: "Cassandra — massive scale" },
              { label: "Search index", sublabel: "Elasticsearch — full-text search" },
              { label: "Session store", sublabel: "Redis — key-value, fast expiry" },
            ],
          },
        },
        { kind: "paragraph", text: "Each database is chosen for what it does best." },
      ],
    },
    {
      id: "landscape",
      heading: "The database landscape — quick reference",
      blocks: [
        {
          kind: "table",
          headers: ["Database", "Type", "Best for", "Used by"],
          rows: [
            ["PostgreSQL", "SQL", "Complex queries, ACID, general purpose", "Instagram, Uber"],
            ["MySQL", "SQL", "Web applications, reads", "Facebook (early), Flipkart"],
            ["MongoDB", "Document", "Flexible schema, catalogs", "Flipkart, Adobe"],
            ["Redis", "Key-Value", "Caching, sessions, queues", "Every major company"],
            ["Cassandra", "Column", "High write scale, time-series", "Instagram, Uber, Netflix"],
            ["DynamoDB", "Key-Value/Document", "Serverless scale, AWS", "Amazon, Lyft"],
            ["Elasticsearch", "Document", "Full-text search", "Swiggy search, LinkedIn"],
            ["Neo4j", "Graph", "Highly connected data", "LinkedIn, fraud detection"],
          ],
        },
      ],
    },
    {
      id: "how-data-gets-to-disk",
      heading: "How data gets to disk — the basics",
      blocks: [
        { kind: "paragraph", text: "Understanding this helps you make better database choices." },
        { kind: "paragraph", text: "Write Path (simplified):" },
        {
          kind: "list",
          ordered: true,
          items: [
            "Write request arrives",
            "Written to Write-Ahead Log (WAL) first → durability",
            "Written to in-memory buffer",
            "Periodically flushed to disk",
            "Acknowledgment sent to client",
          ],
        },
        {
          kind: "insight",
          text: "The WAL is why databases are durable. Even if the server crashes after step 2, the data can be recovered from the log.",
        },
        { kind: "paragraph", text: "Read Path:" },
        {
          kind: "list",
          ordered: true,
          items: ["Read request arrives", "Check in-memory buffer first (fastest)", "Check disk cache", "Read from disk (slowest)", "Return data"],
        },
        {
          kind: "insight",
          text: "Databases are always trying to keep hot data in memory. The more RAM your database server has, the faster it runs — because more data stays in memory instead of going to disk.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "Database questions come in three forms:" },
        {
          kind: "qa",
          question: "\"Which database would you use for X?\"",
          answer: "Don't just say \"PostgreSQL\" for everything. Show you know the trade-offs. Use the SQL/NoSQL framework above.",
        },
        {
          kind: "qa",
          question: "\"What is ACID?\"",
          answer: "Know each property with a real-world example. Not just the acronym.",
        },
        {
          kind: "qa",
          question: "\"Explain CAP theorem.\"",
          answer: "CP vs AP with real examples (banking vs social feeds). Mention that partition tolerance is always required.",
        },
        {
          kind: "qa",
          question: "\"How would you scale a database?\"",
          answer: "This bridges to Lessons 11-12 (indexing, scaling). For now: read replicas, caching, sharding.",
        },
        {
          kind: "insight",
          label: "The answer interviewers love",
          text: "\"For this use case I'd use PostgreSQL for the transactional data because we need ACID guarantees, Redis for caching hot reads, and Cassandra for the activity feed because it's write-heavy and eventual consistency is acceptable there.\" That answer shows polyglot persistence thinking — the hallmark of a senior engineer.",
        },
      ],
    },
  ],
  summary:
    "Databases exist to provide ACID guarantees that file systems can't — and the fundamental choice between SQL (structured, consistent, relational) and NoSQL (scalable, flexible, eventually consistent) is driven by your data's structure, access patterns, and consistency requirements, with most large systems using multiple databases for different jobs.",
  keyTakeaways: [
    "ACID is why databases exist — Atomicity, Consistency, Isolation, Durability. Know each with a real example.",
    "SQL = relationships + consistency. NoSQL = scale + flexibility. Neither is universally better.",
    "CAP theorem forces a choice — in distributed systems, pick CP (banks) or AP (social feeds). You can't have both.",
    "Polyglot persistence is the industry standard — different databases for different jobs in the same system.",
    "NoSQL has four types — Document, Key-Value, Column-Family, Graph. Each solves a different problem.",
  ],
  exercise: {
    prompt:
      "You're the lead engineer designing the data layer for Hotstar — India's largest OTT platform. Here are the data requirements: (1) User accounts (name, email, subscription plan, payment history); (2) Video metadata (title, description, cast, duration, genre tags); (3) Watch history (user X watched video Y at timestamp Z, up to 80% completion); (4) Real-time view count (currently 11 million watching this video); (5) User sessions (login tokens, expiry); (6) Search (find videos by title, actor name, genre). For each of the 6 data requirements above, choose a database type (SQL, Document, Column-Family, Key-Value, or search engine) and justify your choice in one sentence. There's no single correct answer — but your reasoning must reflect the trade-offs you learned today.",
  },
  relatedEntitySlugs: ["database"],
};
