import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 4 | Topic: Client-Server Architecture | Phase: 1 — Foundations".
 */
export const CLIENT_SERVER_ARCHITECTURE: FoundationLesson = {
  slug: "client-server-architecture",
  number: 4,
  title: "Client-Server Architecture",
  tagline:
    "Clients ask, servers respond — the single most fundamental pattern in software engineering, and where it quietly breaks down.",
  estimatedMinutes: 30,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "When you open Swiggy and order food, your phone doesn't talk directly to the restaurant's computer. It talks to Swiggy's servers — which then coordinate everything: checking the menu, placing the order, notifying the restaurant, tracking the delivery partner.",
        },
        { kind: "paragraph", text: "Your phone is the client. Swiggy's infrastructure is the server." },
        {
          kind: "paragraph",
          text: "This separation — client asks, server responds — is the single most fundamental pattern in all of software engineering. Every system you'll ever design is built on top of it, or is a variation of it.",
        },
      ],
    },
    {
      id: "the-problem",
      heading: "The problem it solves",
      blocks: [
        {
          kind: "paragraph",
          text: "Imagine if every phone had to store all of Swiggy's restaurant data locally. Every menu update, every new restaurant, every price change would need to be pushed to 50 million phones simultaneously.",
        },
        { kind: "paragraph", text: "That's insane." },
        { kind: "paragraph", text: "Instead: clients are thin — they just display and collect input. Servers are fat — they store data, run logic, coordinate everything." },
        {
          kind: "list",
          items: [
            "One place to update data (server)",
            "One place to enforce security (server)",
            "Clients that work on any device",
            "The ability to scale server capacity independently",
          ],
        },
      ],
    },
    {
      id: "basic-model",
      heading: "The basic model",
      blocks: [
        {
          kind: "table",
          headers: ["Client", "Server"],
          rows: [
            ["Your phone", "Swiggy's computer"],
            ["Your browser", "Google's computer"],
            ["Uber app", "Uber's backend"],
          ],
        },
        { kind: "paragraph", text: "The rules:" },
        {
          kind: "list",
          items: [
            "Client always initiates — servers don't randomly push data to clients (usually)",
            "Server responds — it never calls the client first (usually)",
            "Stateless by default — the server doesn't remember previous requests (usually)",
          ],
        },
        { kind: "paragraph", text: "Those \"usuallys\" are where interesting system design happens. We'll get to them." },
      ],
    },
    {
      id: "what-is-a-server",
      heading: "What is a server, really?",
      blocks: [
        { kind: "paragraph", text: "A server is just a computer running software that listens for requests and responds to them." },
        { kind: "paragraph", text: "That's it." },
        {
          kind: "list",
          items: [
            "A laptop in someone's bedroom (early Instagram literally ran on this)",
            "A VM on AWS",
            "A container on Google Cloud",
            "A rack of physical machines in a data center",
          ],
        },
        { kind: "paragraph", text: "What makes it a \"server\" is the role it plays — not the hardware." },
        {
          kind: "code",
          language: "java",
          code: "// The simplest possible server — conceptually\nwhile (true) {\n  Request request = waitForRequest();\n  Response response = process(request);\n  send(response);\n}",
        },
      ],
    },
    {
      id: "tiers",
      heading: "Tiers — how real systems are structured",
      blocks: [
        {
          kind: "paragraph",
          text: "Real applications aren't just one client and one server. They're split into tiers (layers of responsibility).",
        },
        { kind: "paragraph", text: "1-Tier Architecture — everything on one machine. Your code, your database, your UI." },
        {
          kind: "architecture",
          nodes: [{ id: "laptop", label: "Your Laptop", sublabel: "UI + Logic + Database", col: 0, row: 0 }],
          edges: [],
        },
        { kind: "list", items: ["Used for: desktop apps, early prototypes", "Problem: can't scale, one failure kills everything"] },
        { kind: "paragraph", text: "2-Tier Architecture — client talks directly to the database." },
        {
          kind: "architecture",
          nodes: [
            { id: "client-app", label: "Client App", col: 0, row: 0, entityType: "client" },
            { id: "database-server", label: "Database Server", col: 1, row: 0, entityType: "database" },
          ],
          edges: [{ from: "client-app", to: "database-server" }],
        },
        { kind: "list", items: ["Used for: internal tools, simple admin dashboards", "Problem: business logic lives in the client — hard to secure, hard to change"] },
        { kind: "paragraph", text: "3-Tier Architecture — the standard for modern web applications." },
        {
          kind: "architecture",
          nodes: [
            { id: "client-tier", label: "Client", sublabel: "Tier 1 — Presentation", col: 0, row: 0, entityType: "client" },
            { id: "app-tier", label: "Application Server", sublabel: "Tier 2 — Business Logic", col: 1, row: 0, entityType: "api" },
            { id: "db-tier", label: "Database", sublabel: "Tier 3 — Data", col: 2, row: 0, entityType: "database" },
          ],
          edges: [
            { from: "client-tier", to: "app-tier" },
            { from: "app-tier", to: "db-tier" },
          ],
        },
        {
          kind: "list",
          items: [
            "Tier 1 (Client): browser, mobile app — renders UI, collects input",
            "Tier 2 (Application Server): your backend code — processes requests, runs business logic",
            "Tier 3 (Database): stores and retrieves data",
          ],
        },
        { kind: "paragraph", text: "Why this separation matters:" },
        {
          kind: "list",
          items: [
            "You can scale each tier independently",
            "You can swap out the database without touching the client",
            "Security lives in Tier 2 — clients never touch the database directly",
          ],
        },
        { kind: "paragraph", text: "This is how Flipkart, Swiggy, and every modern app is built." },
        { kind: "paragraph", text: "N-Tier / Microservices — multiple application servers, each responsible for one thing." },
        {
          kind: "architecture",
          nodes: [
            { id: "client-n", label: "Client", col: 1, row: 0, entityType: "client" },
            { id: "gateway", label: "API Gateway", col: 1, row: 1 },
            { id: "auth-svc", label: "Auth Service", col: 0, row: 2, entityType: "api" },
            { id: "order-svc", label: "Order Service", col: 1, row: 2, entityType: "api" },
            { id: "payment-svc", label: "Payment Service", col: 2, row: 2, entityType: "api" },
            { id: "notification-svc", label: "Notification Service", col: 3, row: 2, entityType: "api" },
            { id: "user-db", label: "User DB", col: 0, row: 3, entityType: "database" },
            { id: "order-db", label: "Order DB", col: 1, row: 3, entityType: "database" },
            { id: "payment-db", label: "Payment DB", col: 2, row: 3, entityType: "database" },
            { id: "kafka-queue", label: "Kafka Queue", col: 3, row: 3, entityType: "kafka" },
          ],
          edges: [
            { from: "client-n", to: "gateway" },
            { from: "gateway", to: "auth-svc" },
            { from: "gateway", to: "order-svc" },
            { from: "gateway", to: "payment-svc" },
            { from: "gateway", to: "notification-svc" },
            { from: "auth-svc", to: "user-db" },
            { from: "order-svc", to: "order-db" },
            { from: "payment-svc", to: "payment-db" },
            { from: "notification-svc", to: "kafka-queue" },
          ],
        },
        { kind: "paragraph", text: "This is what Uber, Netflix, and Amazon actually look like. We'll get here in Phase 4." },
      ],
    },
    {
      id: "request-response-cycle",
      heading: "The request-response cycle in a 3-tier system",
      blocks: [
        { kind: "paragraph", text: "Let's trace a Swiggy order through a 3-tier system:" },
        {
          kind: "flow",
          steps: [
            { title: "You tap \"Place Order\" on the app" },
            { title: "App (Client) sends HTTP POST request", detail: "POST /orders { \"restaurant_id\": 42, \"items\": [...], \"address\": \"...\" }" },
            {
              title: "Application Server receives it",
              detail: "validates your session, checks restaurant is open, calculates total price, checks payment method",
            },
            { title: "Application Server queries Database", detail: "INSERT INTO orders (user_id, restaurant_id, total) VALUES (...)" },
            { title: "Database confirms", detail: "\"Inserted, order_id = 9981\"" },
            {
              title: "Application Server sends response back to app",
              detail: "{ \"order_id\": 9981, \"status\": \"confirmed\", \"eta\": \"35 mins\" }",
            },
            { title: "App displays", detail: "\"Order placed! Arriving in 35 mins\"", tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "Every web application you use follows this pattern." },
      ],
    },
    {
      id: "stateless-vs-stateful",
      heading: "Stateless vs stateful servers",
      blocks: [
        { kind: "paragraph", text: "This is one of the most important concepts in system design." },
        {
          kind: "paragraph",
          text: "Stateless Server — the server remembers nothing about you between requests. Every request must carry all the information needed to process it.",
        },
        {
          kind: "list",
          items: [
            "Request 1: \"Here's my user_id=123, give me my orders\"",
            "Request 2: \"Here's my user_id=123, give me my profile\"",
          ],
        },
        { kind: "paragraph", text: "Server treats each as completely independent." },
        { kind: "list", items: ["Any server can handle any request", "Easy to scale — just add more servers", "No coordination needed between servers"] },
        { kind: "paragraph", text: "Disadvantage: the client must send more data with each request (like auth tokens)." },
        { kind: "paragraph", text: "Most modern backends are stateless. This is by design." },
        {
          kind: "paragraph",
          text: "Stateful Server — the server remembers your session in memory.",
        },
        {
          kind: "list",
          items: [
            "Request 1: \"Login\" → Server stores your session in memory",
            "Request 2: \"Give me orders\" → Server remembers who you are",
          ],
        },
        { kind: "paragraph", text: "Problem: what if Request 1 goes to Server A and Request 2 goes to Server B?" },
        {
          kind: "list",
          items: [
            { text: "Server A: knows your session", tone: "healthy" },
            { text: "Server B: has no idea who you are", tone: "critical" },
          ],
        },
        {
          kind: "insight",
          text: "This is called the sticky session problem — and it breaks horizontal scaling. Solution: move state out of the server into a shared store (like Redis). Now any server can look up your session.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "server-a", label: "Server A", col: 0, row: 0, entityType: "api" },
            { id: "redis-store", label: "Redis", sublabel: "session store", col: 1, row: 0, entityType: "cache" },
            { id: "server-b", label: "Server B", col: 2, row: 0, entityType: "api" },
          ],
          edges: [
            { from: "server-a", to: "redis-store" },
            { from: "server-b", to: "redis-store" },
          ],
        },
        { kind: "paragraph", text: "We'll revisit this deeply in the Redis and Load Balancer lessons." },
      ],
    },
    {
      id: "when-it-breaks-down",
      heading: "When client-server breaks down",
      blocks: [
        { kind: "paragraph", text: "The basic model has limitations. Here's where it struggles and what replaces it:" },
        {
          kind: "table",
          headers: ["Problem", "Limitation", "Solution"],
          rows: [
            ["Real-time updates", "Client must keep asking \"anything new?\"", "WebSockets (persistent connection)"],
            ["Millions of users", "One server can't handle all requests", "Load balancers + multiple servers"],
            ["Slow database", "Every request hits DB", "Caching layer"],
            ["One server fails", "Everything goes down", "Replication + failover"],
            ["Client and server too far apart", "High latency", "CDN, edge servers"],
          ],
        },
        { kind: "paragraph", text: "Each row in that table is a lesson in this course." },
      ],
    },
    {
      id: "peer-to-peer",
      heading: "Peer-to-peer — the alternative model",
      blocks: [
        { kind: "paragraph", text: "Not everything uses client-server. Some systems use peer-to-peer (P2P):" },
        {
          kind: "compare",
          panels: [
            {
              title: "Client-Server",
              nodes: [
                { id: "cs-client", label: "Client", col: 0, row: 0, entityType: "client" },
                { id: "cs-server", label: "Server", col: 1, row: 0, entityType: "api" },
              ],
              edges: [{ from: "cs-client", to: "cs-server" }],
            },
            {
              title: "Peer-to-Peer",
              nodes: [
                { id: "node-a", label: "Node A", col: 0, row: 0 },
                { id: "node-b", label: "Node B", col: 1, row: 0 },
                { id: "node-c", label: "Node C", col: 0, row: 1 },
              ],
              edges: [
                { from: "node-a", to: "node-b" },
                { from: "node-b", to: "node-c" },
                { from: "node-c", to: "node-a" },
              ],
            },
          ],
        },
        { kind: "paragraph", text: "In P2P, every node is both a client and a server." },
        { kind: "list", items: ["BitTorrent — file sharing", "Bitcoin — blockchain", "WebRTC — browser-to-browser video calls (Zoom uses this partially)"] },
        {
          kind: "insight",
          text: "P2P is resilient (no central point of failure) but hard to control, secure, and reason about. Client-server is easier to build and scale for most applications.",
        },
      ],
    },
    {
      id: "industry-examples",
      heading: "Real industry examples",
      blocks: [
        {
          kind: "table",
          headers: ["Company", "Client", "Server architecture"],
          rows: [
            ["Instagram", "Mobile app", "3-tier: App → Django backend → PostgreSQL + Cassandra"],
            ["Uber", "Rider + Driver app", "Microservices: location, matching, pricing, payment services"],
            ["Netflix", "Smart TV / browser", "CDN for video + microservices for recommendations, auth, billing"],
            ["WhatsApp", "Mobile app", "Stateful connection servers (chat needs persistent connections)"],
            ["Flipkart", "Browser / app", "API Gateway → microservices → multiple databases"],
          ],
        },
        {
          kind: "paragraph",
          text: "Notice WhatsApp is an exception — chat requires persistent connections, so it partially breaks the stateless model. We'll design a chat system in Phase 5.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "paragraph",
          text: "When you draw a system design diagram, you're always drawing a variation of client-server architecture. Interviewers want to see:",
        },
        {
          kind: "list",
          items: [
            "Do you separate concerns into tiers?",
            "Do you know why stateless servers are easier to scale?",
            "Do you know when the basic model breaks and what to reach for?",
          ],
        },
        { kind: "paragraph", text: "A common interview question:" },
        { kind: "insight", text: "\"Your app has 10 million users. How do you handle the load?\"" },
        {
          kind: "qa",
          question: "Wrong answer",
          answer: "\"I'll use a better server.\"",
        },
        {
          kind: "qa",
          question: "Right answer",
          answer:
            "\"I'll make the application layer stateless, put multiple app servers behind a load balancer, move session state to Redis, and add a caching layer in front of the database.\"",
        },
        {
          kind: "paragraph",
          text: "That answer shows you understand why client-server architecture is designed the way it is.",
        },
      ],
    },
  ],
  summary:
    "Client-server architecture separates systems into clients that request and servers that respond — and the key insight is that making servers stateless is what allows you to scale horizontally by adding more servers without coordination problems.",
  keyTakeaways: [
    "3-tier architecture (Client → App Server → Database) is the foundation of every modern web app.",
    "Stateless servers are the goal — any server handles any request, enabling easy horizontal scaling.",
    "Stateful servers create sticky session problems — solved by moving state to a shared store like Redis.",
    "The basic model breaks at scale — load balancers, caches, CDNs, and WebSockets all exist to patch specific failure modes.",
    "Microservices are just many small servers, each owning one responsibility — a natural evolution of 3-tier.",
  ],
  exercise: {
    prompt:
      "You're designing the backend for Hotstar during the IPL final. 50 million users are watching simultaneously. Your single application server is melting. Your teammate proposes: \"Let's just add 10 more application servers and split the traffic.\" A second teammate says: \"That won't work — our app server stores user session data in memory.\" Why exactly does the second teammate's concern break the \"just add more servers\" plan? What is the one architectural change you need to make before adding more servers will actually help? Reason through it using what you learned today — specifically the stateless vs stateful section.",
  },
  relatedEntitySlugs: [],
  prerequisites: ["browser-request-lifecycle"],
};
