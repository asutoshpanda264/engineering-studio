import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 7 | Topic: REST APIs | Phase: 1 — Foundations". A handful of
 * short query-string-heavy examples (the "inconsistent API conventions"
 * intro, and the filtering/sorting query examples in the Query Parameters
 * section) were behind the source page's own client-side filter and
 * couldn't be pulled verbatim — reconstructed from standard REST
 * conventions consistent with the surrounding verbatim text (the response
 * shapes either side of them were retrieved exactly).
 */
export const REST_APIS: FoundationLesson = {
  slug: "rest-apis",
  number: 7,
  title: "REST APIs",
  tagline:
    "URLs are nouns, HTTP methods are verbs — the rule most people violate, and the one interviewers check first.",
  estimatedMinutes: 60,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        { kind: "paragraph", text: "Imagine you're building Zomato. You have:" },
        {
          kind: "list",
          items: [
            "A mobile app (Android)",
            "A mobile app (iOS)",
            "A web browser app",
            "A third-party app (a Swiggy competitor wants to list your restaurants)",
          ],
        },
        {
          kind: "paragraph",
          text: "All four need to talk to your backend. Do you write four different backends? Obviously not.",
        },
        {
          kind: "paragraph",
          text: "You write one backend with a well-defined interface — and all four clients talk to it the same way.",
        },
        { kind: "paragraph", text: "That interface is your API (Application Programming Interface)." },
        {
          kind: "paragraph",
          text: "REST is the most widely used set of rules for designing that interface. When people say \"REST API\" or \"RESTful API\" — this is what they mean.",
        },
      ],
    },
    {
      id: "the-problem",
      heading: "What problem does REST solve?",
      blocks: [
        { kind: "paragraph", text: "Before REST, APIs were inconsistent. Every company invented their own conventions:" },
        {
          kind: "list",
          items: [
            "Company A: /api/getOrderById?id=5",
            "Company B: /getOrder/5",
            "Company C: UserService.GetUserById(123)",
          ],
        },
        { kind: "paragraph", text: "REST brought standardization. If you know REST, you can understand any REST API in minutes — because they all follow the same rules." },
      ],
    },
    {
      id: "what-is-rest",
      heading: "What is REST?",
      blocks: [
        { kind: "paragraph", text: "REST = REpresentational State Transfer" },
        {
          kind: "paragraph",
          text: "Invented by Roy Fielding in his 2000 PhD dissertation. Not a protocol — a set of architectural constraints. A system that follows REST constraints is called RESTful.",
        },
        { kind: "paragraph", text: "The six constraints (you need to understand 4 of them):" },
        { kind: "paragraph", text: "Constraint 1: Client-Server Separation. Client and server are independent. Client doesn't care how server stores data. Server doesn't care how client displays it." },
        {
          kind: "architecture",
          nodes: [
            { id: "android", label: "Android app", col: 0, row: 0, entityType: "client" },
            { id: "ios", label: "iOS app", col: 0, row: 1, entityType: "client" },
            { id: "web", label: "Web browser", col: 0, row: 2, entityType: "client" },
            { id: "third-party", label: "Third-party", col: 0, row: 3, entityType: "client" },
            { id: "rest-api", label: "REST API", col: 1, row: 1, entityType: "api" },
            { id: "server-db", label: "Server + Database", col: 2, row: 1 },
          ],
          edges: [
            { from: "android", to: "rest-api" },
            { from: "ios", to: "rest-api" },
            { from: "web", to: "rest-api" },
            { from: "third-party", to: "rest-api" },
            { from: "rest-api", to: "server-db" },
          ],
        },
        { kind: "paragraph", text: "Change your database? Clients don't care. Change your UI? Server doesn't care." },
        {
          kind: "paragraph",
          text: "Constraint 2: Stateless. Every request must contain all information needed to process it. Server stores no client state between requests.",
        },
        {
          kind: "table",
          headers: ["Stateful (bad)", "Stateless (good)"],
          rows: [
            [
              "Request 1: \"Login as user 123\"",
              "Request 1: \"Login\" → returns token",
            ],
            [
              "Request 2: \"Give me my orders\" — server must remember Request 1",
              "Request 2: \"Give me orders for user 123\" + token — self-contained",
            ],
          ],
        },
        { kind: "paragraph", text: "Why this matters for scale: any server can handle any request. No sticky sessions." },
        { kind: "paragraph", text: "Constraint 3: Uniform Interface. This is the heart of REST. Four sub-rules:" },
        { kind: "paragraph", text: "a) Resource-based URLs — everything is a resource (noun), identified by a URL." },
        {
          kind: "table",
          headers: ["Action-based (not RESTful)", "Resource-based (RESTful)"],
          rows: [
            ["/getUser", "/users"],
            ["/createOrder", "/orders"],
            ["/deleteProduct", "/products"],
            ["/fetchRestaurantMenu", "/restaurants"],
          ],
        },
        { kind: "paragraph", text: "b) HTTP methods define the action — the URL identifies what, the method identifies what to do:" },
        {
          kind: "code",
          code: "GET    /users/123      → fetch user 123\nPOST   /users          → create new user\nPUT    /users/123      → replace user 123\nPATCH  /users/123      → partially update user 123\nDELETE /users/123      → delete user 123",
        },
        { kind: "paragraph", text: "c) Representations — resources are sent as representations (usually JSON). The actual server-side storage doesn't matter — what matters is the JSON shape the client receives." },
        { kind: "paragraph", text: "d) Self-descriptive messages — each request/response contains enough information to understand it (content-type headers, status codes, etc.)." },
        {
          kind: "paragraph",
          text: "Constraint 4: Layered System. Client doesn't know if it's talking to the actual server, a load balancer, a cache, or a CDN. The layers are transparent.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "layered-client", label: "Client", col: 0, row: 0, entityType: "client" },
            { id: "layered-cdn", label: "CDN", col: 1, row: 0, entityType: "cdn" },
            { id: "layered-lb", label: "Load Balancer", col: 2, row: 0, entityType: "load_balancer" },
            { id: "layered-cache", label: "Cache", col: 3, row: 0, entityType: "cache" },
            { id: "layered-app", label: "App Server", col: 4, row: 0, entityType: "api" },
            { id: "layered-db", label: "DB", col: 5, row: 0, entityType: "database" },
          ],
          edges: [
            { from: "layered-client", to: "layered-cdn" },
            { from: "layered-cdn", to: "layered-lb" },
            { from: "layered-lb", to: "layered-cache" },
            { from: "layered-cache", to: "layered-app" },
            { from: "layered-app", to: "layered-db" },
          ],
        },
        { kind: "paragraph", text: "Client only knows it called GET /products/123 and got a response." },
      ],
    },
    {
      id: "designing-an-api",
      heading: "Designing a REST API — the right way",
      blocks: [
        { kind: "paragraph", text: "Let's design the Zomato API from scratch. This is exactly what an interview expects." },
        { kind: "paragraph", text: "Step 1: Identify Your Resources" },
        {
          kind: "list",
          items: ["restaurants", "menus", "items (menu items)", "orders", "users", "reviews", "addresses"],
        },
        { kind: "paragraph", text: "Step 2: Define URL Structure" },
        {
          kind: "code",
          code: "/restaurants                    → collection of restaurants\n/restaurants/{id}               → specific restaurant\n/restaurants/{id}/menu          → menu of a restaurant\n/restaurants/{id}/menu/{itemId} → specific menu item\n/orders                         → collection of orders\n/orders/{id}                    → specific order\n/users/{id}                     → specific user\n/users/{id}/addresses           → addresses of a user",
        },
        { kind: "paragraph", text: "Key rule: URLs are nouns, methods are verbs." },
        { kind: "paragraph", text: "Step 3: Map Operations to Methods" },
        {
          kind: "code",
          code: "GET    /restaurants              → list all restaurants\nPOST   /restaurants              → create a restaurant (admin)\nGET    /restaurants/42           → get restaurant details\nPUT    /restaurants/42           → update restaurant (admin)\nDELETE /restaurants/42           → delete restaurant (admin)\n\nGET    /restaurants/42/menu      → get menu\nPOST   /restaurants/42/menu      → add item to menu\n\nGET    /orders                   → list my orders\nPOST   /orders                   → place new order\nGET    /orders/9981              → get order details\nPATCH  /orders/9981              → update order status\nDELETE /orders/9981              → cancel order",
        },
        { kind: "paragraph", text: "Step 4: Design Request/Response Shape — place an order:" },
        {
          kind: "code",
          code: 'POST /orders\nAuthorization: Bearer eyJhbGc...\nContent-Type: application/json\n\n{\n  "restaurant_id": 42,\n  "items": [\n    { "item_id": 101, "quantity": 2 },\n    { "item_id": 205, "quantity": 1 }\n  ],\n  "address_id": 789,\n  "payment_method": "UPI"\n}',
        },
        {
          kind: "code",
          code: 'HTTP/1.1 201 Created\nLocation: /orders/9981\n\n{\n  "order_id": 9981,\n  "status": "confirmed",\n  "restaurant": { "id": 42, "name": "Paradise Biryani" },\n  "items": [\n    { "name": "Chicken Biryani", "quantity": 2, "price": 280 },\n    { "name": "Raita", "quantity": 1, "price": 45 }\n  ],\n  "total": 605,\n  "eta_minutes": 40,\n  "created_at": "2024-01-15T14:30:00Z"\n}',
        },
      ],
    },
    {
      id: "api-versioning",
      heading: "API versioning — a must-know",
      blocks: [
        {
          kind: "paragraph",
          text: "APIs evolve. But you can't break existing clients. This is the API versioning problem.",
        },
        { kind: "paragraph", text: "Option 1: URL Versioning ← most common" },
        { kind: "code", code: "/api/v1/orders\n/api/v2/orders" },
        { kind: "list", items: ["Simple, visible, easy to route", "Used by: Twitter, Stripe, Flipkart", "Downside: URL \"should\" only identify a resource, not a version"] },
        { kind: "paragraph", text: "Option 2: Header Versioning" },
        { kind: "code", code: "GET /orders\nAPI-Version: 2" },
        { kind: "list", items: ["Cleaner URLs", "Used by: GitHub, Microsoft", "Downside: less visible, harder to test in browser"] },
        { kind: "paragraph", text: "Option 3: Query Parameter" },
        { kind: "code", code: "GET /orders?version=2" },
        { kind: "list", items: ["Easy to test", "Used by: some Google APIs", "Downside: pollutes query parameters"] },
        { kind: "insight", text: "My recommendation for interviews: URL versioning. It's the most widely used and easiest to explain." },
      ],
    },
    {
      id: "query-parameters",
      heading: "Query parameters — filtering, sorting, pagination",
      blocks: [
        {
          kind: "paragraph",
          text: "A production API needs more than basic CRUD. Users need to filter, sort, and paginate results.",
        },
        { kind: "paragraph", text: "Filtering:" },
        { kind: "code", code: "GET /restaurants?city=mumbai&cuisine=chinese&rating_gte=4" },
        { kind: "paragraph", text: "Sorting:" },
        { kind: "code", code: "GET /restaurants?sort=rating&order=desc" },
        { kind: "paragraph", text: "Pagination — offset-based:" },
        { kind: "code", code: "GET /restaurants?page=3&limit=20" },
        {
          kind: "code",
          code: 'Response:\n{\n  "data": [...],\n  "pagination": {\n    "page": 3,\n    "limit": 20,\n    "total": 10000,\n    "total_pages": 500\n  }\n}',
        },
        {
          kind: "paragraph",
          text: "Problem: if new records are inserted, pages shift. A user might see duplicates or miss records.",
        },
        { kind: "paragraph", text: "Pagination — cursor-based (the fix):" },
        { kind: "code", code: "GET /restaurants?cursor=xyz789&limit=20" },
        {
          kind: "paragraph",
          text: "The cursor is usually an encoded timestamp or ID. Stable even when new records are inserted.",
        },
        {
          kind: "insight",
          text: "Instagram, Twitter, and Facebook all use cursor-based pagination for feeds. This is the industry standard for real-time data.",
        },
      ],
    },
    {
      id: "error-responses",
      heading: "Error responses — design them well",
      blocks: [
        { kind: "paragraph", text: "Bad error response:" },
        { kind: "code", code: 'HTTP 400\n{ "error": true }' },
        { kind: "paragraph", text: "Good error response:" },
        {
          kind: "code",
          code: 'HTTP 400\n{\n  "error": {\n    "code": "INVALID_ADDRESS",\n    "message": "Delivery address is outside our serviceable area",\n    "field": "address_id",\n    "docs": "https://api.zomato.com/docs/errors#INVALID_ADDRESS"\n  }\n}',
        },
        {
          kind: "paragraph",
          text: "Always include: a specific error code (machine-readable), a human-readable message, which field caused the error (for validation errors), and a documentation link (for developer APIs).",
        },
      ],
    },
    {
      id: "rest-vs-other-styles",
      heading: "REST vs other API styles",
      blocks: [
        { kind: "paragraph", text: "REST isn't the only option. Interviewers sometimes ask you to compare:" },
        {
          kind: "table",
          headers: ["", "REST", "GraphQL", "gRPC"],
          rows: [
            ["Format", "JSON over HTTP", "JSON over HTTP", "Binary (Protobuf) over HTTP/2"],
            ["Who defines query", "Server", "Client", "Server"],
            ["Flexibility", "Fixed endpoints", "Client queries exactly what it needs", "Fixed methods"],
            ["Performance", "Good", "Good", "Excellent"],
            ["Used by", "Everyone", "Facebook, GitHub, Shopify", "Google, Netflix internals"],
            ["Best for", "Public APIs, most backends", "Complex frontends, mobile (save bandwidth)", "Internal microservice communication"],
          ],
        },
        {
          kind: "paragraph",
          text: "GraphQL — when REST's fixed endpoints hurt. Problem with REST on mobile: mobile needs user name + profile photo only, but REST returns the entire user object (50 fields) — wasteful.",
        },
        { kind: "code", code: "query {\n  user(id: 123) {\n    name\n    profilePhoto\n  }\n}" },
        {
          kind: "paragraph",
          text: "GraphQL lets the client ask for exactly what it needs.",
        },
        {
          kind: "paragraph",
          text: "gRPC — when performance is critical. Used for internal microservice communication where binary encoding is 5-10x smaller than JSON, contracts are strongly typed (fewer bugs), and HTTP/2 multiplexing is built-in.",
        },
        { kind: "insight", text: "Netflix uses gRPC internally between services, REST externally for clients." },
      ],
    },
    {
      id: "common-mistakes",
      heading: "REST API design — common mistakes",
      blocks: [
        { kind: "paragraph", text: "Things juniors get wrong that interviewers notice:" },
        {
          kind: "table",
          headers: ["Mistake", "Wrong", "Correct"],
          rows: [
            [
              "Verbs in URLs",
              "GET /getRestaurant/42, POST /createOrder, DELETE /deleteUser/123",
              "GET /restaurants/42, POST /orders, DELETE /users/123",
            ],
            [
              "Wrong HTTP methods",
              "GET /orders/cancel/9981 (using GET to modify state), POST /users/123 (using POST to fetch a user)",
              "DELETE /orders/9981, GET /users/123",
            ],
            [
              "Inconsistent naming",
              "/Users/123, /restaurant_menu, /OrderHistory",
              "/users/123, /restaurant-menus, /orders — consistent lowercase, hyphens or underscores",
            ],
            [
              "Returning 200 for errors",
              'HTTP 200 { "success": false, "error": "User not found" }',
              'HTTP 404 { "error": { "code": "USER_NOT_FOUND" } } — use correct status codes',
            ],
          ],
        },
      ],
    },
  ],
  summary:
    "REST is a set of architectural constraints — stateless, resource-based URLs, uniform HTTP method semantics — that standardizes how clients and servers communicate, and designing a good REST API means thinking carefully about resources, versioning, pagination, and error handling before writing a single line of code.",
  keyTakeaways: [
    "URLs are nouns, HTTP methods are verbs — this is the fundamental REST rule that most people violate.",
    "Statelessness enables horizontal scaling — every request is self-contained, any server can handle it.",
    "Pagination is non-negotiable — offset for simple cases, cursor for real-time feeds (Instagram, Twitter).",
    "API versioning via URL (/v1/, /v2/) is the industry standard — plan for it from day one.",
    "REST vs GraphQL vs gRPC — REST for public APIs, GraphQL for flexible frontends, gRPC for internal microservices.",
  ],
  exercise: {
    prompt:
      "You're a backend engineer at BookMyShow. Design a REST API for the core booking flow. Users need to: browse movies currently showing in their city; select a movie and see available theatres + showtimes; select a showtime and see available seats; book specific seats; view their booking history; cancel a booking. Your task: define the resources, write the endpoint URLs, specify HTTP methods, show request/response shape for at least the \"book seats\" endpoint, and handle the edge case — two users try to book the same seat simultaneously — what HTTP status code do you return to the loser? Don't worry about the database or backend logic yet — just the API contract.",
  },
  relatedEntitySlugs: [],
  prerequisites: ["http-and-https"],
};
