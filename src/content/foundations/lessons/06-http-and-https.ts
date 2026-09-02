import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 6 | Topic: HTTP & HTTPS | Phase: 1 — Foundations". Two very short
 * spans (a Set-Cookie header line, and the one-sentence intro to "Cookies
 * vs Tokens") were behind the source page's own client-side security
 * filter on the literal word "cookie" and couldn't be pulled verbatim —
 * paraphrased tightly from the surrounding, verbatim text instead of
 * invented from scratch.
 */
export const HTTP_AND_HTTPS: FoundationLesson = {
  slug: "http-and-https",
  number: 6,
  title: "HTTP & HTTPS",
  tagline:
    "The protocol that powers every web request — methods, headers, status codes, and why HTTPS is non-negotiable.",
  estimatedMinutes: 60,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Every time your app talks to a server — fetching your Instagram feed, placing a Swiggy order, logging into Flipkart — it speaks one language: HTTP.",
        },
        { kind: "paragraph", text: "HTTP is the protocol that defines:" },
        {
          kind: "list",
          items: [
            "How requests are structured",
            "How responses are structured",
            "What methods exist (GET, POST, PUT, DELETE)",
            "What status codes mean (200, 404, 500)",
            "How headers carry metadata",
          ],
        },
        {
          kind: "paragraph",
          text: "You've been using HTTP your entire life without knowing its internals. After this lesson, you'll never look at a network request the same way again.",
        },
      ],
    },
    {
      id: "what-is-http",
      heading: "What is HTTP?",
      blocks: [
        { kind: "paragraph", text: "HTTP = HyperText Transfer Protocol" },
        { kind: "paragraph", text: "It's a set of rules for how clients and servers communicate over the internet." },
        { kind: "paragraph", text: "Think of it as a formal letter format: a specific way to write the address, a specific structure for the body, a specific format for the reply." },
        { kind: "paragraph", text: "Both sides agree on the format — that's what makes communication possible." },
        {
          kind: "sequence",
          actors: [
            { id: "client", label: "Client" },
            { id: "server", label: "Server" },
          ],
          messages: [
            { from: "client", to: "server", label: "HTTP Request (formatted message)" },
            { from: "server", to: "client", label: "HTTP Response (formatted reply)", dashed: true },
          ],
        },
      ],
    },
    {
      id: "request-anatomy",
      heading: "HTTP request — anatomy",
      blocks: [
        { kind: "paragraph", text: "Every HTTP request has three parts:" },
        {
          kind: "code",
          code: 'POST /orders HTTP/1.1                    ← Request Line\nHost: api.swiggy.com                     ← Headers (start)\nContent-Type: application/json\nAuthorization: Bearer eyJhbGc...\nUser-Agent: SwiggyApp/4.2 (Android)\nContent-Length: 87                       ← Headers (end)\n                                          ← Blank line (separates headers from body)\n{\n  "restaurant_id": 42,\n  "items": [{"id": 101, "qty": 2}],\n  "address_id": 789\n}                                         ← Body',
        },
        { kind: "paragraph", text: "Breaking it down — the Request Line:" },
        { kind: "code", code: "POST        /orders         HTTP/1.1\n[Method]    [Path]          [Protocol Version]" },
        { kind: "paragraph", text: "Headers — metadata about the request:" },
        {
          kind: "table",
          headers: ["Header", "Purpose"],
          rows: [
            ["Host", "Which domain (one server can host many)"],
            ["Content-Type", "What format is the body in"],
            ["Authorization", "Who is making this request"],
            ["User-Agent", "What client is making this request"],
            ["Content-Length", "How long is the body"],
            ["Accept", "What format can the client accept in response"],
          ],
        },
        { kind: "paragraph", text: "Body — the actual data being sent (only for POST, PUT, PATCH)." },
      ],
    },
    {
      id: "http-methods",
      heading: "HTTP methods — the verbs",
      blocks: [
        { kind: "paragraph", text: "HTTP methods tell the server what action to perform:" },
        {
          kind: "table",
          headers: ["Method", "Action", "Has body?", "Example"],
          rows: [
            ["GET", "Read/fetch data", "No", "Get my order history"],
            ["POST", "Create new resource", "Yes", "Place a new order"],
            ["PUT", "Replace entire resource", "Yes", "Update entire profile"],
            ["PATCH", "Update part of resource", "Yes", "Update just phone number"],
            ["DELETE", "Remove resource", "No", "Cancel an order"],
          ],
        },
        {
          kind: "paragraph",
          text: "Idempotency matters here: a request is idempotent if calling it multiple times has the same effect as calling it once. GET, PUT, and DELETE are idempotent by design — POST is not.",
        },
        {
          kind: "insight",
          text: "This is how Stripe, Razorpay, and PayTM handle payment APIs — idempotency keys prevent double charges. The client generates a unique key per user action (e.g. \"unique-uuid-per-tap\"), sends it with the request, and the server checks: seen this key before? Return the same response. Never seen it? Process the request.",
        },
      ],
    },
    {
      id: "response-anatomy",
      heading: "HTTP response — anatomy",
      blocks: [
        {
          kind: "code",
          code: 'HTTP/1.1 200 OK                          ← Status Line\nContent-Type: application/json           ← Headers (start)\nContent-Length: 142\nCache-Control: max-age=60                ← Headers (end)\n                                          ← Blank line\n{                                        ← Body\n  "order_id": 9981,\n  "status": "confirmed",\n  "eta_minutes": 35,\n  "total": 485.00\n}',
        },
        { kind: "paragraph", text: "Status Line:" },
        { kind: "code", code: "HTTP/1.1    200         OK\n[Version]  [Code]   [Reason Phrase]" },
      ],
    },
    {
      id: "status-codes",
      heading: "Status codes — the language of responses",
      blocks: [
        { kind: "paragraph", text: "Status codes tell the client what happened." },
        { kind: "paragraph", text: "1xx — Informational. Rarely seen in practice. \"Keep going.\"" },
        {
          kind: "table",
          headers: ["Code", "Meaning", "When used"],
          rows: [
            ["200 OK", "Request succeeded", "GET returned data"],
            ["201 Created", "Resource created", "POST created new order"],
            ["204 No Content", "Success, no body", "DELETE succeeded"],
          ],
        },
        { kind: "paragraph", text: "3xx — Redirection" },
        {
          kind: "table",
          headers: ["Code", "Meaning", "When used"],
          rows: [
            ["301 Moved Permanently", "URL changed forever", "http:// → https:// redirect"],
            ["302 Found", "Temporary redirect", "A/B testing, maintenance page"],
            ["304 Not Modified", "Use your cached version", "Browser caching optimization"],
          ],
        },
        { kind: "paragraph", text: "4xx — Client Errors (you did something wrong)" },
        {
          kind: "table",
          headers: ["Code", "Meaning", "When used"],
          rows: [
            ["400 Bad Request", "Invalid request format", "Missing required field"],
            ["401 Unauthorized", "Not authenticated", "No login token provided"],
            ["403 Forbidden", "Authenticated but not allowed", "Accessing someone else's order"],
            ["404 Not Found", "Resource doesn't exist", "Order ID doesn't exist"],
            ["409 Conflict", "State conflict", "Booking already taken"],
            ["422 Unprocessable", "Valid format, invalid data", "Invalid phone number format"],
            ["429 Too Many Requests", "Rate limited", "Too many API calls"],
          ],
        },
        { kind: "paragraph", text: "5xx — Server Errors (server did something wrong)" },
        {
          kind: "table",
          headers: ["Code", "Meaning", "When used"],
          rows: [
            ["500 Internal Server Error", "Generic server crash", "Unhandled exception"],
            ["502 Bad Gateway", "Upstream server failed", "Load balancer can't reach app server"],
            ["503 Service Unavailable", "Server overloaded/down", "Maintenance or traffic spike"],
            ["504 Gateway Timeout", "Upstream server too slow", "DB query timed out"],
          ],
        },
        {
          kind: "insight",
          label: "The 401 vs 403 distinction matters in interviews",
          text: "401 Unauthorized: \"I don't know who you are\" → log in first. 403 Forbidden: \"I know who you are, you just can't do this\" → access denied.",
        },
      ],
    },
    {
      id: "http-versions",
      heading: "HTTP versions — evolution",
      blocks: [
        {
          kind: "table",
          headers: ["Version", "Year", "Key feature", "Used by"],
          rows: [
            ["HTTP/1.0", "1996", "One request per connection", "Ancient history"],
            ["HTTP/1.1", "1997", "Keep-alive, persistent connections", "Still common"],
            ["HTTP/2", "2015", "Multiplexing, header compression, server push", "Most modern sites"],
            ["HTTP/3", "2022", "Built on UDP (QUIC), faster on mobile", "Google, Cloudflare"],
          ],
        },
        { kind: "paragraph", text: "HTTP/1.1 Problem — Head of Line Blocking. A connection can handle one request at a time:" },
        { kind: "paragraph", text: "Browser workaround: open 6 parallel TCP connections per domain. Hacky." },
        { kind: "paragraph", text: "HTTP/2 Solution — Multiplexing. One connection, multiple streams simultaneously:" },
        {
          kind: "compare",
          panels: [
            {
              title: "HTTP/1.1 — blocked",
              nodes: [
                { id: "r1", label: "Request 1", sublabel: "GET /image1.jpg", col: 0, row: 0 },
                { id: "r2", label: "Request 2", sublabel: "GET /image2.jpg", col: 0, row: 1, tone: "signal" },
                { id: "r3", label: "Request 3", sublabel: "GET /image3.jpg", col: 0, row: 2, tone: "critical" },
              ],
              edges: [
                { from: "r1", to: "r2", label: "blocked", tone: "signal" },
                { from: "r2", to: "r3", label: "blocked", tone: "critical" },
              ],
            },
            {
              title: "HTTP/2 — multiplexed",
              nodes: [
                { id: "s1", label: "Stream 1", sublabel: "GET /image1.jpg", col: 0, row: 0, tone: "healthy" },
                { id: "s2", label: "Stream 2", sublabel: "GET /image2.jpg", col: 1, row: 0, tone: "healthy" },
                { id: "s3", label: "Stream 3", sublabel: "GET /image3.jpg", col: 2, row: 0, tone: "healthy" },
              ],
              edges: [],
            },
          ],
        },
        { kind: "paragraph", text: "Result: Flipkart, Amazon, and Netflix all use HTTP/2. Page loads are significantly faster." },
      ],
    },
    {
      id: "why-https",
      heading: "HTTPS — why HTTP alone is dangerous",
      blocks: [
        { kind: "paragraph", text: "Plain HTTP has a fatal flaw: everything is sent in plain text." },
        {
          kind: "code",
          code: 'POST /login HTTP/1.1\nHost: flipkart.com\n\n{"email": "user@gmail.com", "password": "mypassword123"}',
        },
        {
          kind: "paragraph",
          text: "Anyone on the same WiFi network (coffee shop, airport) can see this with a tool like Wireshark. This is called a man-in-the-middle attack.",
        },
        { kind: "paragraph", text: "HTTPS = HTTP + TLS (Transport Layer Security). TLS encrypts everything so it looks like:" },
        { kind: "code", code: "x8Kp2mN9qR4vL7wJ3cF6hT1nY5bD0eA..." },
        { kind: "paragraph", text: "Completely unreadable to anyone intercepting it." },
      ],
    },
    {
      id: "how-tls-works",
      heading: "How TLS works — the simplified version",
      blocks: [
        { kind: "paragraph", text: "TLS solves two problems:" },
        {
          kind: "list",
          items: [
            "Encryption — nobody can read the data in transit",
            "Authentication — you're actually talking to Flipkart, not an imposter",
          ],
        },
        {
          kind: "sequence",
          actors: [
            { id: "browser", label: "Browser" },
            { id: "server", label: "Flipkart Server" },
          ],
          messages: [
            { from: "browser", to: "server", label: "\"Hello, I support TLS 1.3\"" },
            { from: "server", to: "browser", label: "\"Here's my certificate\" (signed by trusted CA)", dashed: true },
            { from: "browser", to: "server", label: "Verified — DigiCert is trusted, this IS Flipkart. Generating shared secret key.", tone: "healthy" },
            { from: "server", to: "browser", label: "All further communication encrypted", dashed: true, tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "TLS Certificates — a certificate is like a passport for a website:" },
        {
          kind: "list",
          items: [
            "Contains the domain name (flipkart.com)",
            "Contains the public key",
            "Signed by a trusted Certificate Authority (CA) — DigiCert, Let's Encrypt, Comodo",
            "Your browser has a built-in list of trusted CAs",
          ],
        },
        { kind: "paragraph", text: "If a certificate is:" },
        {
          kind: "list",
          items: [
            "Expired → browser shows \"Your connection is not secure\"",
            "Self-signed (not from a trusted CA) → browser warns you",
            "Domain mismatch → browser blocks the connection",
          ],
        },
        {
          kind: "insight",
          label: "TLS termination — important for system design",
          text: "Encrypting/decrypting is computationally expensive. You don't want every app server doing it. Solution: terminate TLS at the load balancer — Internet → [Load Balancer: handles TLS] → [App Servers: plain HTTP internally]. Benefits: app servers don't waste CPU on encryption, certificates are managed in one place, and internal network traffic is plain HTTP (faster). This is how Flipkart, Google, and Netflix do it.",
        },
      ],
    },
    {
      id: "headers-deep-dive",
      heading: "HTTP headers deep dive — the ones that matter",
      blocks: [
        { kind: "paragraph", text: "Caching Headers" },
        {
          kind: "code",
          code: 'Cache-Control: max-age=3600   → cache for 1 hour\nCache-Control: no-cache       → always revalidate\nCache-Control: no-store       → never cache (sensitive data)\nETag: "abc123"                → version identifier for the resource\nIf-None-Match: "abc123"       → "only send if changed since this ETag"',
        },
        { kind: "paragraph", text: "When the browser sends If-None-Match and the resource hasn't changed:" },
        {
          kind: "list",
          items: [
            "Server returns 304 Not Modified (no body)",
            "Browser uses its cached version",
            "Saves bandwidth, reduces latency",
          ],
        },
        { kind: "paragraph", text: "Security Headers" },
        {
          kind: "code",
          code: "Strict-Transport-Security: max-age=31536000  → always use HTTPS for 1 year\nX-Frame-Options: DENY                         → can't embed in iframe (prevents clickjacking)\nContent-Security-Policy: script-src 'self'    → only run scripts from same domain",
        },
        {
          kind: "list",
          items: [
            "HttpOnly (on a session cookie) → JavaScript can't read it",
            "Secure (on a session cookie) → only sent over HTTPS",
          ],
        },
        { kind: "paragraph", text: "CORS Headers" },
        { kind: "code", code: "Access-Control-Allow-Origin: https://flipkart.com" },
        {
          kind: "paragraph",
          text: "When your frontend at flipkart.com calls an API at api.flipkart.com — that's a cross-origin request. Browsers block these by default for security. CORS headers tell the browser: \"This is allowed.\"",
        },
      ],
    },
    {
      id: "identity-over-http",
      heading: "Identity over HTTP — sessions vs tokens",
      blocks: [
        {
          kind: "paragraph",
          text: "HTTP is stateless — the server doesn't remember you between requests. Two approaches emerged to carry your identity anyway.",
        },
        { kind: "paragraph", text: "Session-based identity — a login response includes a session identifier stored client-side." },
        {
          kind: "list",
          items: [
            "The browser automatically resends it with every request",
            "The server looks up that identifier in its session store",
            "Works well for web browsers",
          ],
        },
        { kind: "paragraph", text: "JWT Tokens (JSON Web Tokens)" },
        { kind: "code", code: 'Login response:\n{ "token": "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEyM30.abc" }' },
        {
          kind: "list",
          items: [
            "Client stores the token, sends it manually: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...",
            "Token contains encoded user info (userId, roles, expiry)",
            "Server verifies the token's signature — no database lookup needed",
            "Preferred for mobile apps and APIs",
            "Stateless — works perfectly with stateless servers",
          ],
        },
        { kind: "paragraph", text: "We'll go deep on auth patterns in the HLD case studies." },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "HTTP comes up constantly. Key things interviewers probe:" },
        {
          kind: "qa",
          question: "How does HTTPS work?",
          answer: "TLS handshake, certificates, CA trust chain, encryption. Mention TLS termination at the load balancer.",
        },
        {
          kind: "qa",
          question: "What's the difference between 401 and 403?",
          answer: "401 = not authenticated (who are you?). 403 = authenticated but not authorized (I know you, you can't do this).",
        },
        {
          kind: "qa",
          question: "How would you handle duplicate order submissions?",
          answer: "Idempotency keys on POST requests — same key = same response, no duplicate processing.",
        },
        {
          kind: "qa",
          question: "How do you make APIs faster?",
          answer: "HTTP/2 multiplexing, caching headers (ETag, Cache-Control), TLS termination, keep-alive connections, compression (gzip).",
        },
      ],
    },
  ],
  summary:
    "HTTP is the structured request-response protocol that powers all web communication — with methods defining actions, status codes communicating outcomes, and HTTPS adding TLS encryption to prevent man-in-the-middle attacks — while concepts like idempotency, caching headers, and TLS termination are the practical tools that make HTTP-based systems reliable and performant at scale.",
  keyTakeaways: [
    "HTTP methods have semantics — GET reads, POST creates, PUT replaces, PATCH updates, DELETE removes. Idempotency determines if retries are safe.",
    "Status codes communicate intent — 2xx success, 3xx redirect, 4xx client error, 5xx server error. 401 ≠ 403.",
    "HTTPS = HTTP + TLS — encrypts data in transit and authenticates the server via certificates. Terminate TLS at the load balancer.",
    "HTTP/2 multiplexing solves head-of-line blocking — multiple requests over one connection simultaneously.",
    "Caching headers (Cache-Control, ETag) and idempotency keys are practical HTTP tools that appear in every serious system design.",
  ],
  exercise: {
    prompt:
      "You're building the Flipkart checkout API. Three things need to work correctly: a user double-taps \"Pay Now\" and two identical requests hit your server within 500ms; a user's payment goes through but the response never reaches their app (network drop), so they tap \"Pay Now\" again; your server processes the payment but crashes before sending the response. Which HTTP method should POST /payments use — and why does idempotency matter here specifically? What mechanism would you use to prevent the user from being charged twice in all three scenarios above? What HTTP status code should you return if the payment is declined by the bank — and why not 500?",
  },
  relatedEntitySlugs: ["load-balancer"],
  prerequisites: ["client-server-architecture"],
};
