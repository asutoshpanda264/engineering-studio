import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 11 | Topic: Database Indexing Deep Dive | Phase: 1 — Foundations".
 * The exercise's follow-up in the source chat was a coaching back-and-forth
 * ("attempt it before I give hints") rather than a clean worked answer, so
 * unlike Lesson 3, this lesson's exercise has no `guidance` field.
 */
export const DATABASE_INDEXING_DEEP_DIVE: FoundationLesson = {
  slug: "database-indexing-deep-dive",
  number: 11,
  title: "Database Indexing Deep Dive",
  tagline:
    "The single biggest performance lever in any database — and the one most engineers think they understand until EXPLAIN proves otherwise.",
  estimatedMinutes: 60,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Imagine a textbook with 1,000 pages. You need to find every mention of \"distributed systems.\"",
        },
        { kind: "paragraph", text: "Option A: read every single page front to back." },
        {
          kind: "paragraph",
          text: "Option B: turn to the index at the back, find \"distributed systems → pages 45, 234, 567, 891\", go directly there.",
        },
        { kind: "paragraph", text: "Option B is what a database index does." },
        {
          kind: "insight",
          text: "Without an index, every query reads every row. With 10 million rows, that's a disaster. With the right index, the database jumps directly to matching rows in microseconds. Indexes are the single biggest performance lever in any database system.",
        },
      ],
    },
    {
      id: "without-an-index",
      heading: "What actually happens without an index",
      blocks: [
        { kind: "paragraph", text: "Let's make this concrete." },
        {
          kind: "code",
          language: "sql",
          code: "-- Zomato orders table: 500 million rows\nSELECT * FROM orders WHERE user_id = 123;",
        },
        { kind: "paragraph", text: "Without an index, the database performs a Full Table Scan:" },
        {
          kind: "flow",
          steps: [
            { title: "Read row 1", detail: "user_id = 891 — not 123" },
            { title: "Read row 2", detail: "user_id = 445 — not 123" },
            { title: "Read row 3", detail: "user_id = 123 — found one", tone: "healthy" },
            { title: "... continue through row 500,000,000", detail: "time taken: potentially minutes", tone: "critical" },
          ],
        },
        { kind: "paragraph", text: "Every. Single. Row. Read. From disk." },
        { kind: "paragraph", text: "With an index on user_id:" },
        {
          kind: "flow",
          steps: [
            { title: "Look up user_id=123 in index tree" },
            { title: "Directly find pointers", detail: "rows 3, 9981, 45821, 2341092" },
            { title: "Fetch only those 4 rows", detail: "time taken: milliseconds", tone: "healthy" },
          ],
        },
      ],
    },
    {
      id: "b-tree",
      heading: "How indexes work internally — the B-tree",
      blocks: [
        { kind: "paragraph", text: "Most database indexes use a data structure called a B-Tree (Balanced Tree)." },
        {
          kind: "tree",
          root: {
            label: "[300 | 700]",
            children: [
              { label: "[100 | 200]", children: [{ label: "[50]" }, { label: "[150]" }, { label: "[250]" }] },
              { label: "[400 | 500 | 600]", children: [{ label: "..." }] },
              { label: "[800 | 900]", children: [{ label: "[750]" }, { label: "[850]" }] },
            ],
          },
        },
        { kind: "paragraph", text: "Properties of a B-Tree:" },
        {
          kind: "list",
          items: [
            "Always balanced — every leaf is at the same depth",
            "Sorted — left subtree < node < right subtree",
            "Each node holds multiple keys (not just 2 like a binary tree)",
            "Optimized for disk reads — wide nodes mean fewer disk accesses",
          ],
        },
        { kind: "paragraph", text: "How a B-Tree lookup works — find user_id = 123:" },
        {
          kind: "flow",
          steps: [
            { title: "Start at root: [300 | 700]", detail: "123 < 300 → go left" },
            { title: "Node: [100 | 200]", detail: "100 < 123 < 200 → go middle" },
            { title: "Leaf: [110 | 123 | 145]", detail: "found 123! → pointer to row location on disk", tone: "healthy" },
            { title: "Total: 3 node reads", detail: "instead of 500 million row reads", tone: "healthy" },
          ],
        },
        {
          kind: "insight",
          text: "For a table with 500 million rows, a B-Tree is only ~30 levels deep. That's 30 comparisons vs 500 million. This is the power of logarithmic complexity.",
        },
      ],
    },
    {
      id: "types-of-indexes",
      heading: "Types of indexes",
      blocks: [
        { kind: "paragraph", text: "Primary Index (Clustered Index) — the table data itself is physically sorted by this index." },
        { kind: "paragraph", text: "SQL Server / MySQL InnoDB: primary key = clustered index. The rows are stored ON DISK in primary key order:" },
        {
          kind: "architecture",
          nodes: [
            { id: "row-1", label: "order_id=1", sublabel: "data...", col: 0, row: 0 },
            { id: "row-2", label: "order_id=2", sublabel: "data...", col: 1, row: 0 },
            { id: "row-3", label: "order_id=3", sublabel: "data...", col: 2, row: 0 },
          ],
          edges: [],
        },
        { kind: "paragraph", text: "Physically adjacent on disk." },
        {
          kind: "insight",
          text: "There can be only ONE clustered index per table — because you can only physically sort data one way.",
        },
        { kind: "paragraph", text: "Benefit: range queries on the primary key are extremely fast:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Super fast — rows are adjacent on disk\nSELECT * FROM orders WHERE order_id BETWEEN 9000 AND 9100;",
        },
        { kind: "paragraph", text: "Secondary Index (Non-Clustered Index) — a separate structure that points back to the primary key." },
        { kind: "paragraph", text: "Index on orders.user_id:" },
        {
          kind: "architecture",
          nodes: [
            { id: "secondary-btree", label: "B-Tree of user_ids", col: 0, row: 0 },
            { id: "secondary-pk", label: "Primary key", sublabel: "order_id", col: 1, row: 0 },
            { id: "secondary-row", label: "Actual row", sublabel: "fetch row data", col: 2, row: 0 },
          ],
          edges: [
            { from: "secondary-btree", to: "secondary-pk" },
            { from: "secondary-pk", to: "secondary-row" },
          ],
        },
        {
          kind: "paragraph",
          text: "Notice: two lookups — first the secondary index, then the primary index to get actual data. This is called a double lookup or bookmark lookup.",
        },
        { kind: "paragraph", text: "You can have many secondary indexes — but each one costs write performance." },
      ],
    },
    {
      id: "composite-indexes",
      heading: "Composite indexes — the most misunderstood topic",
      blocks: [
        { kind: "paragraph", text: "A composite index covers multiple columns." },
        { kind: "code", language: "sql", code: "CREATE INDEX idx_orders_user_status ON orders(user_id, status);" },
        { kind: "paragraph", text: "The Leftmost Prefix Rule — this is what most engineers get wrong. A composite index (user_id, status) can be used for:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Uses the index:\nWHERE user_id = 123\nWHERE user_id = 123 AND status = 'delivered'\nWHERE user_id = 123 AND status = 'delivered' ORDER BY created_at\n\n-- Does NOT use the index:\nWHERE status = 'delivered'                       -- missing leading column\nWHERE status = 'delivered' AND user_id = 123     -- order doesn't matter in WHERE,\n                                                   -- but leading column must exist",
        },
        {
          kind: "paragraph",
          text: "Think of it like a phone book sorted by (Last Name, First Name):",
        },
        {
          kind: "list",
          items: [
            { text: "You can look up \"Sharma\" → finds all Sharmas", tone: "healthy" },
            { text: "You can look up \"Sharma, Priya\" → finds specific person", tone: "healthy" },
            { text: "You can look up \"Priya\" without a last name → useless, must scan everything", tone: "critical" },
          ],
        },
        { kind: "paragraph", text: "Column order in composite indexes:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Scenario: frequent queries are:\n-- 1. WHERE user_id = ? AND status = ?     (most common)\n-- 2. WHERE user_id = ?                    (common)\n-- 3. WHERE status = ?                     (rare)\n\n-- Best index: (user_id, status)\n-- Covers query 1 and 2\n-- Query 3 needs a separate index if important\n\nCREATE INDEX idx_orders_user_status ON orders(user_id, status);",
        },
        {
          kind: "insight",
          text: "Rule: put the column with the highest cardinality (most unique values) first — UNLESS you always filter by a specific column first. Access pattern beats cardinality.",
        },
      ],
    },
    {
      id: "selectivity",
      heading: "Index selectivity — not all indexes are equal",
      blocks: [
        { kind: "paragraph", text: "Selectivity = how many unique values does this column have?" },
        {
          kind: "table",
          headers: ["Column", "Unique values", "Selectivity"],
          rows: [
            ["user_id", "500 million", "HIGH — great index"],
            ["status", "5", "LOW — poor index"],
            ["city", "500", "MEDIUM"],
          ],
        },
        { kind: "paragraph", text: "Why low selectivity indexes hurt:" },
        {
          kind: "code",
          language: "sql",
          code: "-- status has only 5 values: pending, confirmed, preparing, out_for_delivery, delivered\n-- Roughly 20% of rows have each status\n\nCREATE INDEX idx_orders_status ON orders(status);\n\nSELECT * FROM orders WHERE status = 'delivered';\n-- Index finds 20% of 500 million rows = 100 million rows\n-- Then fetches each row individually\n-- SLOWER than a full table scan!",
        },
        {
          kind: "insight",
          text: "The database optimizer is smart — it often ignores a low-selectivity index and does a full scan instead. This surprises engineers who think \"I have an index so it should be fast.\"",
        },
      ],
    },
    {
      id: "covering-indexes",
      heading: "Covering indexes — eliminating the double lookup",
      blocks: [
        {
          kind: "paragraph",
          text: "Remember the double lookup problem? We can eliminate it. A covering index includes all columns needed by the query — so the database never needs to fetch the actual row.",
        },
        {
          kind: "code",
          language: "sql",
          code: "-- Query: get order totals for user 123\nSELECT order_id, total, status FROM orders WHERE user_id = 123;\n\n-- Regular index on (user_id):\n-- Step 1: B-tree lookup → find order_ids for user 123\n-- Step 2: For each order_id, fetch actual row to get total and status\n-- = N disk reads (one per row)\n\n-- Covering index on (user_id, order_id, total, status):\n-- Step 1: B-tree lookup → all needed data IS IN THE INDEX\n-- Step 2: Nothing! Data comes directly from the index\n-- = 1 lookup, no row fetches",
        },
        { kind: "code", language: "sql", code: "CREATE INDEX idx_orders_covering\nON orders(user_id, order_id, total, status);" },
        {
          kind: "paragraph",
          text: "When to use: for your most critical, highest-frequency queries where you need maximum performance. Trade-off: a larger index means more storage + slower writes. Only cover your hottest queries.",
        },
      ],
    },
    {
      id: "anti-patterns",
      heading: "Index conditions that break indexes",
      blocks: [
        {
          kind: "paragraph",
          text: "These are the gotchas that cause \"my query is slow even with an index\" problems.",
        },
        { kind: "paragraph", text: "Function on Indexed Column:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Index on created_at is NOT used:\nSELECT * FROM orders WHERE YEAR(created_at) = 2024;\n\n-- Index IS used:\nSELECT * FROM orders\nWHERE created_at >= '2024-01-01'\nAND created_at < '2025-01-01';",
        },
        {
          kind: "paragraph",
          text: "Wrapping a column in a function breaks index usage because the index stores raw values, not function results.",
        },
        { kind: "paragraph", text: "Leading Wildcard in LIKE:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Index NOT used (leading wildcard):\nSELECT * FROM users WHERE email LIKE '%@gmail.com';\n\n-- Index IS used (trailing wildcard):\nSELECT * FROM users WHERE email LIKE 'priya%';",
        },
        { kind: "paragraph", text: "Implicit Type Conversion:" },
        {
          kind: "code",
          language: "sql",
          code: "-- user_id is BIGINT, but we pass a string:\nSELECT * FROM orders WHERE user_id = '123';   -- index NOT used\n\n-- Pass the correct type instead:\nSELECT * FROM orders WHERE user_id = 123;      -- index used",
        },
        {
          kind: "paragraph",
          text: "The database might convert every row's user_id to a string to compare — breaking the index.",
        },
        { kind: "paragraph", text: "OR Conditions:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Often can't use index efficiently:\nSELECT * FROM orders\nWHERE user_id = 123 OR restaurant_id = 42;\n\n-- Use UNION instead:\nSELECT * FROM orders WHERE user_id = 123\nUNION\nSELECT * FROM orders WHERE restaurant_id = 42;",
        },
      ],
    },
    {
      id: "strategies",
      heading: "Index strategies for real systems",
      blocks: [
        { kind: "paragraph", text: "Strategy 1: Index Foreign Keys — always index foreign keys, they're almost always used in JOINs and WHERE clauses." },
        {
          kind: "code",
          language: "sql",
          code: "-- Automatically index these:\nCREATE INDEX idx_orders_user_id ON orders(user_id);\nCREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);\nCREATE INDEX idx_order_items_order_id ON order_items(order_id);",
        },
        { kind: "paragraph", text: "Strategy 2: Index Sort Columns — if you frequently sort by a column, index it." },
        {
          kind: "code",
          language: "sql",
          code: "-- Frequently: ORDER BY created_at DESC\nCREATE INDEX idx_orders_created_at ON orders(created_at);\n\n-- Even better combined with a filter:\nCREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);",
        },
        { kind: "paragraph", text: "Strategy 3: Partial Indexes — index only a subset of rows; powerful for skewed data." },
        {
          kind: "code",
          language: "sql",
          code: "-- Most queries only care about pending orders\n-- delivered orders are rarely queried\nCREATE INDEX idx_orders_pending\nON orders(user_id, created_at)\nWHERE status = 'pending';\n\n-- Much smaller index, much faster for pending queries",
        },
        { kind: "paragraph", text: "Strategy 4: Don't Over-Index. Each index speeds up reads, slows down INSERT/UPDATE/DELETE, and consumes storage. A table with 20 indexes has very slow writes." },
        {
          kind: "insight",
          text: "Rule: start with no indexes, add them based on slow query analysis. Never add indexes preemptively \"just in case.\"",
        },
      ],
    },
    {
      id: "explain",
      heading: "EXPLAIN — seeing what the database actually does",
      blocks: [
        { kind: "paragraph", text: "Every serious backend engineer uses EXPLAIN to understand query execution." },
        {
          kind: "code",
          language: "sql",
          code: "EXPLAIN SELECT * FROM orders\nWHERE user_id = 123\nAND status = 'delivered';",
        },
        {
          kind: "code",
          code: "+----+-------------+--------+------+------------------+---------+------+-------+\n| id | select_type | table  | type | possible_keys    | key     | rows | Extra |\n+----+-------------+--------+------+------------------+---------+------+-------+\n| 1  | SIMPLE      | orders | ref  | idx_user_status  | idx_... | 12   |       |\n+----+-------------+--------+------+------------------+---------+------+-------+",
        },
        {
          kind: "table",
          headers: ["Column", "What it tells you"],
          rows: [
            ["type", "How the table is accessed"],
            ["key", "Which index was used (NULL = no index!)"],
            ["rows", "Estimated rows scanned"],
            ["Extra", "\"Using filesort\", \"Using temporary\" = bad signs"],
          ],
        },
        { kind: "paragraph", text: "Access types (best to worst):" },
        {
          kind: "table",
          headers: ["Access type", "Description"],
          rows: [
            ["const", "single row match (PRIMARY KEY lookup) — best"],
            ["ref", "index lookup, multiple rows possible"],
            ["range", "index range scan (BETWEEN, >, <)"],
            ["index", "full index scan (better than ALL)"],
            ["ALL", "full table scan — worst, needs fixing"],
          ],
        },
        { kind: "insight", text: "If you see type: ALL with millions of rows — you need an index." },
      ],
    },
    {
      id: "maintenance",
      heading: "Index maintenance — the hidden cost",
      blocks: [
        { kind: "paragraph", text: "Indexes aren't free after creation. They need maintenance." },
        { kind: "paragraph", text: "Write Amplification:" },
        {
          kind: "code",
          code: "INSERT INTO orders (...) → must update ALL indexes on orders table\nUPDATE orders SET status = 'delivered' WHERE order_id = 9981\n  → must update index on status column\nDELETE FROM orders WHERE order_id = 9981\n  → must remove from ALL indexes\n\nTable with 10 indexes:\n1 write to table = 11 total write operations",
        },
        {
          kind: "paragraph",
          text: "Index Bloat — over time, deleted rows leave \"holes\" in the index. The index grows but holds dead entries. Periodic REINDEX or VACUUM (PostgreSQL) is needed.",
        },
        {
          kind: "paragraph",
          text: "Index Rebuild — for very large tables with heavy write traffic, indexes can become fragmented and slow. Rebuilding indexes periodically maintains performance — but rebuilding is expensive and needs to be done during low-traffic windows.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "paragraph",
          text: "Indexing questions are asked in almost every backend/system design interview at Indian companies.",
        },
        {
          kind: "qa",
          question: "\"This query is slow, how do you fix it?\"",
          answer:
            "Run EXPLAIN — check if an index is being used. Check for full table scans (type: ALL). Look for function calls on indexed columns. Check if the composite index column order matches the query.",
        },
        {
          kind: "qa",
          question: "\"What's the trade-off of adding more indexes?\"",
          answer: "Faster reads, slower writes, more storage. Only add indexes for actual slow queries.",
        },
        {
          kind: "qa",
          question: "\"What is a covering index?\"",
          answer: "An index that contains all columns needed by a query, eliminating the need to fetch the actual row.",
        },
        {
          kind: "qa",
          question: "\"Why is this index not being used?\"",
          answer: "Function on the column, leading wildcard LIKE, low selectivity, type mismatch, or an OR condition.",
        },
      ],
    },
  ],
  summary:
    "Database indexes are B-tree data structures that trade write performance and storage for dramatically faster reads — and using them correctly requires understanding selectivity, composite index column ordering, covering indexes, and the query patterns that break index usage.",
  keyTakeaways: [
    "B-Tree indexes reduce 500M row scans to ~30 comparisons — logarithmic vs linear complexity.",
    "Composite index column order matters — the leftmost prefix rule determines which queries use the index.",
    "Low selectivity columns (like status with 5 values) make poor indexes — the optimizer may ignore them.",
    "Covering indexes eliminate the double-lookup by storing all needed columns in the index itself.",
    "Functions, leading wildcards, and type mismatches silently break index usage — always verify with EXPLAIN.",
  ],
  exercise: {
    prompt:
      "You're a backend engineer at Swiggy. The orders table has 800 million rows: order_id (PK), user_id, restaurant_id, status (enum: pending/preparing/out_for_delivery/delivered/cancelled), total, city, created_at. Three queries are running slowly in production: Query 1 — customer support looks up all orders for a user (SELECT order_id, total, status, created_at FROM orders WHERE user_id = 12345 ORDER BY created_at DESC); Query 2 — finance team runs a nightly revenue report (SELECT city, SUM(total) as revenue, COUNT(*) as order_count FROM orders WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01' AND status = 'delivered' GROUP BY city); Query 3 — restaurant dashboard shows their pending orders (SELECT order_id, total, created_at FROM orders WHERE restaurant_id = 567 AND status IN ('pending', 'preparing') ORDER BY created_at ASC). Your task: for each query, design the optimal index (specify column order and why); for Query 1, could a covering index help — if yes, what would it include?; Query 2 runs once a night on historical data, and someone suggests \"let's just add an index on status since we filter by it\" — what's wrong with this suggestion?",
  },
  relatedEntitySlugs: ["database"],
  prerequisites: ["sql-deep-dive", "nosql-deep-dive"],
};
