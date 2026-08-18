import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 9 | Topic: SQL Deep Dive | Phase: 1 — Foundations".
 */
export const SQL_DEEP_DIVE: FoundationLesson = {
  slug: "sql-deep-dive",
  number: 9,
  title: "SQL Deep Dive",
  tagline:
    "Tables, schemas, joins, indexes, transactions — and the N+1 query problem that quietly kills more production systems than anything else on this list.",
  estimatedMinutes: 60,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "SQL has been around since 1974. Fifty years later, it's still the most important data skill in software engineering.",
        },
        {
          kind: "paragraph",
          text: "Every backend engineer at Flipkart, Uber, Google, and every startup in between writes SQL daily. Every system design interview eventually asks you to design a schema. Every debugging session eventually involves a slow query.",
        },
        {
          kind: "insight",
          text: "The engineers who truly understand SQL — not just the syntax, but why queries work the way they do — make fundamentally better system design decisions.",
        },
      ],
    },
    {
      id: "how-sql-organizes-data",
      heading: "How SQL databases organize data",
      blocks: [
        { kind: "paragraph", text: "Everything in SQL revolves around tables. A table is like a spreadsheet:" },
        {
          kind: "list",
          items: [
            "Columns define the structure (what data exists)",
            "Rows are individual records (actual data)",
            "Schema is the definition of all tables and their rules",
          ],
        },
        {
          kind: "table",
          headers: ["user_id", "name", "email", "city", "created_at"],
          rows: [
            ["1", "Priya", "priya@gmail.com", "Mumbai", "2024-01-15 10:30:00"],
            ["2", "Rahul", "rahul@gmail.com", "Delhi", "2024-01-16 14:22:00"],
            ["3", "Ananya", "ananya@gmail.com", "Bangalore", "2024-01-17 09:15:00"],
          ],
        },
      ],
    },
    {
      id: "data-types",
      heading: "Data types — the building blocks",
      blocks: [
        {
          kind: "paragraph",
          text: "Every column has a data type. Choosing the right type matters for storage efficiency and query performance.",
        },
        {
          kind: "table",
          headers: ["Type", "Use for", "Example"],
          rows: [
            ["INT / BIGINT", "Numbers, IDs", "user_id, order_id"],
            ["VARCHAR(n)", "Variable text up to n chars", "name, email"],
            ["TEXT", "Long text, no limit", "description, review"],
            ["DECIMAL(p,s)", "Precise numbers (money)", "price: DECIMAL(10,2)"],
            ["BOOLEAN", "True/false", "is_active, is_verified"],
            ["TIMESTAMP", "Date and time", "created_at, updated_at"],
            ["ENUM", "Fixed set of values", "status: ('pending','delivered')"],
            ["JSON", "Flexible structured data", "metadata, preferences"],
          ],
        },
        {
          kind: "insight",
          text: "Never use FLOAT for money. Floating point math is imprecise: 0.1 + 0.2 = 0.30000000000000004 ❌. Use DECIMAL(10,2) for money always ✅.",
        },
      ],
    },
    {
      id: "keys",
      heading: "Primary keys and foreign keys",
      blocks: [
        { kind: "paragraph", text: "Primary Key — a column (or combination) that uniquely identifies each row." },
        {
          kind: "code",
          language: "sql",
          code: "CREATE TABLE users (\n    user_id    BIGINT PRIMARY KEY AUTO_INCREMENT,\n    name       VARCHAR(100) NOT NULL,\n    email      VARCHAR(255) UNIQUE NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);",
        },
        { kind: "paragraph", text: "Rules of a primary key:" },
        {
          kind: "list",
          items: [
            "Must be unique — no two rows share the same value",
            "Cannot be NULL",
            "Should never change — once set, stays forever",
            "Usually an auto-incrementing integer or UUID",
          ],
        },
        { kind: "paragraph", text: "Foreign Key — a column that references another table's primary key, linking rows together." },
        {
          kind: "code",
          language: "sql",
          code: "CREATE TABLE orders (\n    order_id      BIGINT PRIMARY KEY AUTO_INCREMENT,\n    user_id       BIGINT NOT NULL,\n    restaurant_id BIGINT NOT NULL,\n    total         DECIMAL(8,2) NOT NULL,\n    status        ENUM('pending','delivered','cancelled'),\n    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n\n    FOREIGN KEY (user_id) REFERENCES users(user_id),\n    FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)\n);",
        },
        { kind: "paragraph", text: "The foreign key constraint enforces referential integrity:" },
        {
          kind: "list",
          items: [
            "Can't create an order for a user that doesn't exist",
            "Can't delete a user who has orders (unless you cascade)",
          ],
        },
      ],
    },
    {
      id: "crud",
      heading: "The core SQL operations — CRUD",
      blocks: [
        {
          kind: "code",
          language: "sql",
          code: "-- CREATE\nINSERT INTO users (name, email, city)\nVALUES ('Priya', 'priya@gmail.com', 'Mumbai');\n\n-- READ\nSELECT name, email FROM users WHERE city = 'Mumbai';\n\n-- UPDATE\nUPDATE users SET city = 'Pune' WHERE user_id = 1;\n\n-- DELETE\nDELETE FROM users WHERE user_id = 1;",
        },
        { kind: "paragraph", text: "Simple. But real systems need far more powerful queries." },
      ],
    },
    {
      id: "select",
      heading: "SELECT — the most important statement",
      blocks: [
        { kind: "paragraph", text: "SELECT is where SQL becomes powerful:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Basic structure (order matters)\nSELECT   columns\nFROM     table\nWHERE    conditions\nGROUP BY columns\nHAVING   conditions on groups\nORDER BY columns\nLIMIT    n;",
        },
        { kind: "paragraph", text: "Filtering with WHERE:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Simple condition\nSELECT * FROM orders WHERE status = 'delivered';\n\n-- Multiple conditions\nSELECT * FROM orders\nWHERE status = 'delivered'\nAND total > 500\nAND created_at >= '2024-01-01';\n\n-- IN — match any value in a list\nSELECT * FROM users WHERE city IN ('Mumbai', 'Delhi', 'Bangalore');\n\n-- LIKE — pattern matching\nSELECT * FROM users WHERE email LIKE '%@gmail.com';\n\n-- BETWEEN\nSELECT * FROM orders WHERE total BETWEEN 200 AND 1000;\n\n-- IS NULL\nSELECT * FROM users WHERE phone IS NULL;",
        },
        { kind: "paragraph", text: "Aggregation — computing summaries:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Count all orders\nSELECT COUNT(*) FROM orders;\n\n-- Total revenue\nSELECT SUM(total) FROM orders WHERE status = 'delivered';\n\n-- Average order value\nSELECT AVG(total) FROM orders;\n\n-- Min and max\nSELECT MIN(total), MAX(total) FROM orders;\n\n-- Revenue by restaurant\nSELECT\n    restaurant_id,\n    COUNT(*) as order_count,\n    SUM(total) as total_revenue,\n    AVG(total) as avg_order_value\nFROM orders\nWHERE status = 'delivered'\nGROUP BY restaurant_id\nORDER BY total_revenue DESC;",
        },
        { kind: "paragraph", text: "HAVING — filtering on aggregated results:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Restaurants with more than 100 orders\nSELECT restaurant_id, COUNT(*) as order_count\nFROM orders\nGROUP BY restaurant_id\nHAVING COUNT(*) > 100;\n\n-- Can't use WHERE here because WHERE filters rows,\n-- HAVING filters groups (after aggregation)",
        },
      ],
    },
    {
      id: "joins",
      heading: "JOINs — the heart of relational databases",
      blocks: [
        {
          kind: "paragraph",
          text: "JOINs combine data from multiple tables. This is what makes relational databases powerful.",
        },
        { kind: "paragraph", text: "The Zomato schema:" },
        {
          kind: "code",
          language: "sql",
          code: "users:        user_id, name, email, city\nrestaurants:  restaurant_id, name, city, cuisine\norders:       order_id, user_id, restaurant_id, total, status\norder_items:  item_id, order_id, dish_name, price, quantity",
        },
        { kind: "paragraph", text: "INNER JOIN — only matching rows from both tables:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Get all orders with user names\nSELECT\n    users.name,\n    orders.order_id,\n    orders.total,\n    orders.status\nFROM orders\nINNER JOIN users ON orders.user_id = users.user_id;",
        },
        {
          kind: "table",
          headers: ["name", "order_id", "total", "status"],
          rows: [
            ["Priya", "9981", "605.00", "delivered"],
            ["Rahul", "9982", "320.00", "pending"],
            ["Priya", "9985", "180.00", "delivered"],
          ],
        },
        { kind: "paragraph", text: "LEFT JOIN — all rows from the left table, matching from the right:" },
        {
          kind: "code",
          language: "sql",
          code: "-- All users, even those with no orders\nSELECT\n    users.name,\n    COUNT(orders.order_id) as order_count\nFROM users\nLEFT JOIN orders ON users.user_id = orders.user_id\nGROUP BY users.user_id, users.name;",
        },
        {
          kind: "table",
          headers: ["name", "order_count"],
          rows: [
            ["Priya", "5"],
            ["Rahul", "2"],
            ["Ananya", "0 ← no orders, still shows up"],
          ],
        },
        { kind: "paragraph", text: "Joining multiple tables — complete order details: user + restaurant + items:" },
        {
          kind: "code",
          language: "sql",
          code: "SELECT\n    u.name          as customer,\n    r.name          as restaurant,\n    oi.dish_name,\n    oi.quantity,\n    oi.price,\n    o.total,\n    o.status\nFROM orders o\nINNER JOIN users u        ON o.user_id = u.user_id\nINNER JOIN restaurants r  ON o.restaurant_id = r.restaurant_id\nINNER JOIN order_items oi ON o.order_id = oi.order_id\nWHERE o.order_id = 9981;",
        },
        {
          kind: "venn",
          panels: [
            { title: "INNER JOIN", subtitle: "only matching rows", leftLabel: "users", rightLabel: "orders", highlight: "overlap" },
            { title: "LEFT JOIN", subtitle: "all of users + matches", leftLabel: "users", rightLabel: "orders", highlight: "left" },
            { title: "RIGHT JOIN", subtitle: "all of orders + matches", leftLabel: "users", rightLabel: "orders", highlight: "right" },
            { title: "FULL JOIN", subtitle: "everything from both", leftLabel: "users", rightLabel: "orders", highlight: "all" },
          ],
        },
        {
          kind: "table",
          headers: ["Join type", "Notation", "Result"],
          rows: [
            ["INNER JOIN", "A ∩ B", "only matching rows"],
            ["LEFT JOIN", "A", "all of A + matches from B"],
            ["RIGHT JOIN", "B", "all of B + matches from A"],
            ["FULL JOIN", "A ∪ B", "everything from both"],
          ],
        },
      ],
    },
    {
      id: "indexes",
      heading: "Indexes — how databases find data fast",
      blocks: [
        { kind: "paragraph", text: "This is the most practically important concept in SQL for system design." },
        { kind: "paragraph", text: "The problem without indexes:" },
        { kind: "code", language: "sql", code: "SELECT * FROM orders WHERE user_id = 123;" },
        {
          kind: "paragraph",
          text: "Without an index, the database reads every single row to find matches. With 100 million orders, that's a full table scan — potentially taking seconds.",
        },
        {
          kind: "paragraph",
          text: "What an index does: an index is a separate data structure (usually a B-tree) that keeps a sorted copy of a column with pointers to the actual rows.",
        },
        { kind: "paragraph", text: "Index on orders.user_id:" },
        {
          kind: "table",
          headers: ["user_id", "row locations"],
          rows: [
            ["1", "[row 45, row 892, row 10234]"],
            ["2", "[row 12, row 567]"],
            ["123", "[row 9981, row 9985, row 10012] ← found instantly"],
            ["456", "[row 9982]"],
          ],
        },
        {
          kind: "paragraph",
          text: "Instead of reading 100M rows, the database jumps directly to user 123's rows.",
        },
        {
          kind: "code",
          language: "sql",
          code: "-- Single column index\nCREATE INDEX idx_orders_user_id ON orders(user_id);\n\n-- Composite index (multiple columns)\nCREATE INDEX idx_orders_user_status ON orders(user_id, status);\n\n-- Unique index (also enforces uniqueness)\nCREATE UNIQUE INDEX idx_users_email ON users(email);",
        },
        { kind: "paragraph", text: "The index trade-off:" },
        {
          kind: "list",
          items: [
            "Read performance: ✅ much faster (milliseconds vs seconds)",
            "Write performance: ❌ slower (must update the index on every INSERT/UPDATE/DELETE)",
            "Storage: ❌ more disk space (the index is a separate structure)",
          ],
        },
        {
          kind: "insight",
          text: "Rule of thumb: index columns you frequently filter, sort, or join on. Don't index every column.",
        },
        { kind: "paragraph", text: "Composite index column order matters:" },
        {
          kind: "code",
          language: "sql",
          code: "-- Index: (user_id, status)\n-- This query USES the index:\nSELECT * FROM orders WHERE user_id = 123 AND status = 'delivered';\n\n-- This query USES the index (leading column):\nSELECT * FROM orders WHERE user_id = 123;\n\n-- This query DOES NOT use the index (missing leading column):\nSELECT * FROM orders WHERE status = 'delivered';",
        },
        {
          kind: "paragraph",
          text: "Always put the most selective column first, and the column used most frequently in WHERE clauses.",
        },
      ],
    },
    {
      id: "transactions",
      heading: "Transactions — ACID in practice",
      blocks: [
        { kind: "paragraph", text: "A transaction groups multiple operations into one atomic unit." },
        {
          kind: "code",
          language: "sql",
          code: "-- Transfer ₹500 from account A to account B\nBEGIN TRANSACTION;\n\nUPDATE accounts SET balance = balance - 500 WHERE account_id = 'A';\nUPDATE accounts SET balance = balance + 500 WHERE account_id = 'B';\n\n-- Both succeeded? Commit.\nCOMMIT;\n\n-- Something failed? Roll back everything.\nROLLBACK;",
        },
        {
          kind: "flow",
          steps: [
            { title: "UPDATE account A: -500", tone: "healthy" },
            { title: "Server crashes", tone: "critical" },
            { title: "UPDATE account B: never happens", tone: "critical" },
            { title: "₹500 disappears from the system", tone: "critical" },
          ],
        },
        {
          kind: "insight",
          text: "With transactions: either both happen or neither happens. This is Atomicity.",
        },
        { kind: "paragraph", text: "Isolation Levels — a critical interview topic. When multiple transactions run simultaneously, how much do they see each other?" },
        {
          kind: "table",
          headers: ["Level", "What you see", "Problem avoided"],
          rows: [
            ["Read Uncommitted", "Other transactions' uncommitted changes", "Nothing"],
            ["Read Committed", "Only committed changes", "Dirty reads"],
            ["Repeatable Read", "Same data throughout the transaction", "Non-repeatable reads"],
            ["Serializable", "Transactions run as if sequential", "All anomalies"],
          ],
        },
        {
          kind: "paragraph",
          text: "Most databases default to Read Committed (PostgreSQL) or Repeatable Read (MySQL).",
        },
        {
          kind: "insight",
          text: "For interviews: know that higher isolation = fewer anomalies but lower performance. Serializable is the safest but slowest.",
        },
      ],
    },
    {
      id: "schema-design",
      heading: "Schema design — the interview skill",
      blocks: [
        {
          kind: "paragraph",
          text: "Designing a schema is tested in almost every placement interview. Here's the process, using BookMyShow.",
        },
        { kind: "paragraph", text: "Step 1: Identify Entities" },
        { kind: "list", items: ["Users", "Movies", "Theatres", "Shows (a movie at a theatre at a time)", "Seats", "Bookings"] },
        { kind: "paragraph", text: "Step 2: Identify Attributes" },
        {
          kind: "list",
          items: [
            "Users: user_id, name, email, phone, created_at",
            "Movies: movie_id, title, duration_mins, language, rating",
            "Theatres: theatre_id, name, city, address",
            "Shows: show_id, movie_id, theatre_id, start_time, price",
            "Seats: seat_id, theatre_id, row, number, type (regular/premium)",
            "Bookings: booking_id, user_id, show_id, seat_id, amount, status",
          ],
        },
        { kind: "paragraph", text: "Step 3: Identify Relationships" },
        {
          kind: "list",
          items: [
            "A Movie has many Shows",
            "A Theatre has many Shows",
            "A Show has many Seats available",
            "A User makes many Bookings",
            "A Booking is for one Show and one Seat",
          ],
        },
        { kind: "paragraph", text: "Step 4: Write the Schema" },
        {
          kind: "code",
          language: "sql",
          code: "CREATE TABLE movies (\n    movie_id    BIGINT PRIMARY KEY AUTO_INCREMENT,\n    title       VARCHAR(255) NOT NULL,\n    duration    INT NOT NULL,  -- in minutes\n    language    VARCHAR(50),\n    rating      DECIMAL(2,1),\n    released_at DATE\n);\n\nCREATE TABLE theatres (\n    theatre_id  BIGINT PRIMARY KEY AUTO_INCREMENT,\n    name        VARCHAR(255) NOT NULL,\n    city        VARCHAR(100) NOT NULL,\n    address     TEXT\n);\n\nCREATE TABLE shows (\n    show_id     BIGINT PRIMARY KEY AUTO_INCREMENT,\n    movie_id    BIGINT NOT NULL,\n    theatre_id  BIGINT NOT NULL,\n    start_time  TIMESTAMP NOT NULL,\n    price       DECIMAL(8,2) NOT NULL,\n    FOREIGN KEY (movie_id) REFERENCES movies(movie_id),\n    FOREIGN KEY (theatre_id) REFERENCES theatres(theatre_id)\n);\n\nCREATE TABLE seats (\n    seat_id     BIGINT PRIMARY KEY AUTO_INCREMENT,\n    theatre_id  BIGINT NOT NULL,\n    row_label   CHAR(1) NOT NULL,    -- A, B, C...\n    seat_number INT NOT NULL,\n    seat_type   ENUM('regular','premium','recliner'),\n    FOREIGN KEY (theatre_id) REFERENCES theatres(theatre_id)\n);\n\nCREATE TABLE bookings (\n    booking_id  BIGINT PRIMARY KEY AUTO_INCREMENT,\n    user_id     BIGINT NOT NULL,\n    show_id     BIGINT NOT NULL,\n    seat_id     BIGINT NOT NULL,\n    amount      DECIMAL(8,2) NOT NULL,\n    status      ENUM('pending','confirmed','cancelled'),\n    booked_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (user_id) REFERENCES users(user_id),\n    FOREIGN KEY (show_id) REFERENCES shows(show_id),\n    FOREIGN KEY (seat_id) REFERENCES seats(seat_id),\n    UNIQUE (show_id, seat_id)   -- same seat can't be booked twice for same show\n);\n\n-- Critical indexes\nCREATE INDEX idx_shows_movie ON shows(movie_id);\nCREATE INDEX idx_shows_theatre ON shows(theatre_id);\nCREATE INDEX idx_bookings_user ON bookings(user_id);\nCREATE INDEX idx_bookings_show ON bookings(show_id);",
        },
        {
          kind: "insight",
          text: "Notice the UNIQUE (show_id, seat_id) constraint — this is the database-level protection against double booking. Even if two transactions try simultaneously, the database rejects the second one.",
        },
      ],
    },
    {
      id: "n-plus-one",
      heading: "N+1 query problem — the most common performance bug",
      blocks: [
        {
          kind: "paragraph",
          text: "This kills performance in production and interviewers love asking about it. The scenario: display 10 orders with restaurant names.",
        },
        { kind: "paragraph", text: "❌ N+1 approach (what beginners write):" },
        {
          kind: "code",
          language: "sql",
          code: "Query 1: SELECT * FROM orders LIMIT 10;\n  → returns 10 orders\n\n-- Then for EACH order:\nQuery 2:  SELECT name FROM restaurants WHERE restaurant_id = 42;\nQuery 3:  SELECT name FROM restaurants WHERE restaurant_id = 18;\nQuery 4:  SELECT name FROM restaurants WHERE restaurant_id = 42;\n...\nQuery 11: SELECT name FROM restaurants WHERE restaurant_id = 7;",
        },
        {
          kind: "paragraph",
          text: "Total: 11 queries for 10 orders. With 100 orders: 101 queries. With 1000 orders: 1001 queries.",
        },
        { kind: "paragraph", text: "✅ Correct approach: JOIN or IN clause" },
        {
          kind: "code",
          language: "sql",
          code: "-- Single query\nSELECT o.order_id, o.total, r.name as restaurant_name\nFROM orders o\nJOIN restaurants r ON o.restaurant_id = r.restaurant_id\nLIMIT 10;",
        },
        { kind: "paragraph", text: "Total: 1 query regardless of how many orders." },
        {
          kind: "insight",
          text: "The N+1 problem is everywhere in production systems. Recognizing and fixing it is a mark of a senior engineer.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "SQL comes up in three ways:" },
        {
          kind: "qa",
          question: "Schema Design — \"Design the database schema for Zomato/Uber/Instagram\"",
          answer: "Use the 4-step process: entities → attributes → relationships → SQL.",
        },
        {
          kind: "qa",
          question: "Query Writing — \"Write a query to find the top 5 restaurants by revenue this month\"",
          answer:
            "SELECT r.name, SUM(o.total) as monthly_revenue FROM orders o JOIN restaurants r ON o.restaurant_id = r.restaurant_id WHERE o.status = 'delivered' AND o.created_at >= DATE_FORMAT(NOW(), '%Y-%m-01') GROUP BY r.restaurant_id, r.name ORDER BY monthly_revenue DESC LIMIT 5;",
        },
        {
          kind: "qa",
          question: "Performance — \"This query is slow, how do you fix it?\"",
          answer:
            "Check for missing indexes, avoid SELECT * (fetch only needed columns), check for N+1 problems, analyze the query execution plan.",
        },
      ],
    },
  ],
  summary:
    "SQL is the language of structured data — tables, relationships, and ACID transactions — where mastering JOINs for combining data, indexes for query performance, and schema design for modeling entities is the foundation of every backend system you'll ever build or design.",
  keyTakeaways: [
    "Schema design follows a process — entities → attributes → relationships → SQL. Practice this for every case study.",
    "Indexes are the single biggest SQL performance lever you have — index columns you filter/sort/join on selectively.",
    "JOINs are how relational data comes alive — INNER for matches, LEFT for all-including-unmatched.",
    "Transactions enforce ACID — always wrap multi-step operations (like payments) in a transaction.",
    "N+1 is the most common performance bug — always JOIN instead of querying in a loop.",
  ],
  exercise: {
    prompt:
      "You're designing the database for Splitwise — an app where friends split expenses. Core features: users can create groups (e.g. \"Goa Trip\", \"Flat Mates\"); users can add expenses to a group (\"Priya paid ₹3000 for hotel, split equally among 4 people\"); the app tracks who owes whom how much; users can settle debts. Your task: identify the core entities; design the schema (table names, key columns, primary/foreign keys); write one SQL query: \"For user Priya, show everyone who owes her money and how much\"; what index would you add to make that query fast? Don't worry about being perfect — think through the relationships first.",
  },
  relatedEntitySlugs: ["database"],
};
