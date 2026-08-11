import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 3 | Topic: Browser Request Lifecycle | Phase: 1 — Foundations".
 * The exercise's `guidance` is transcribed from the tutor's own follow-up
 * walkthrough later in the same chat, not invented for this port.
 */
export const BROWSER_REQUEST_LIFECYCLE: FoundationLesson = {
  slug: "browser-request-lifecycle",
  number: 3,
  title: "Browser Request Lifecycle",
  tagline:
    "\"What happens when you type google.com?\" — the most common interview warm-up, and a map of nine separate optimization opportunities.",
  estimatedMinutes: 45,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        { kind: "paragraph", text: "You type www.flipkart.com in your browser and hit Enter." },
        {
          kind: "paragraph",
          text: "In the next 200-500 milliseconds, your browser figures out where Flipkart lives on the internet, establishes a secure connection, asks for the page, receives it, and renders it on your screen.",
        },
        {
          kind: "paragraph",
          text: "This single user action triggers 8-10 distinct steps involving DNS servers, TCP handshakes, TLS certificates, HTTP requests, and rendering engines.",
        },
        { kind: "paragraph", text: "Why does this matter for system design?" },
        {
          kind: "insight",
          text: "Every step is a potential bottleneck. Every step is something you can optimize. When an interviewer asks \"how would you make your app faster?\" — the answer lives somewhere in this lifecycle.",
        },
      ],
    },
    {
      id: "bird-eye-view",
      heading: "The full lifecycle — bird's eye view",
      blocks: [
        {
          kind: "flow",
          steps: [
            { title: "You type URL" },
            { title: "Browser Cache Check" },
            { title: "DNS Resolution", detail: "finds the IP address" },
            { title: "TCP Handshake", detail: "establishes connection" },
            { title: "TLS Handshake", detail: "secures the connection (HTTPS)" },
            { title: "HTTP Request", detail: "asks for the page" },
            { title: "Server Processing", detail: "backend does its work" },
            { title: "HTTP Response", detail: "server sends back data" },
            { title: "Browser Rendering", detail: "paints the page on screen" },
          ],
        },
        { kind: "paragraph", text: "Let's walk through each step with real depth." },
      ],
    },
    {
      id: "step-1-url",
      heading: "Step 1 — you type the URL",
      blocks: [
        { kind: "paragraph", text: "A URL has anatomy. Let's dissect it:" },
        { kind: "code", code: "https://www.flipkart.com/search?q=iphone&sort=price" },
        {
          kind: "list",
          items: [
            "https:// → Protocol (use HTTPS, not HTTP)",
            "www → Subdomain",
            "flipkart.com → Domain name",
            "/search → Path (which page/resource)",
            "?q=iphone → Query parameter (what you're searching)",
            "&sort=price → Another query parameter",
          ],
        },
        {
          kind: "paragraph",
          text: "The browser reads this and says: \"I need to connect to flipkart.com and ask for /search with these parameters.\"",
        },
      ],
    },
    {
      id: "step-2-cache",
      heading: "Step 2 — browser cache check",
      blocks: [
        {
          kind: "paragraph",
          text: "Before doing any network work, the browser asks itself: \"Have I visited this before? Do I already have a fresh copy?\"",
        },
        {
          kind: "paragraph",
          text: "Browsers store previously fetched resources — HTML, CSS, JS, images — in a local cache.",
        },
        {
          kind: "list",
          items: [
            "Cache hit → serve immediately, no network call needed ✅",
            "Cache miss → proceed to DNS resolution ❌ (need to fetch)",
          ],
        },
        {
          kind: "insight",
          text: "Caching eliminates unnecessary work. The fastest network call is the one you never make.",
        },
        { kind: "paragraph", text: "We'll go very deep on caching in Lesson 16. For now, just note it exists here." },
      ],
    },
    {
      id: "step-3-dns",
      heading: "Step 3 — DNS resolution",
      blocks: [
        {
          kind: "paragraph",
          text: "The browser has the domain name flipkart.com. It needs the IP address.",
        },
        { kind: "paragraph", text: "DNS resolution is itself a multi-step process:" },
        {
          kind: "flow",
          steps: [
            { title: "Check browser's own DNS cache", detail: "not found" },
            { title: "Check OS DNS cache", detail: "not found" },
            { title: "Ask Recursive Resolver", detail: "your ISP's DNS server — not found" },
            { title: "Resolver asks Root DNS Server", detail: "\"Who handles .com domains?\" → \"Ask the .com TLD server\"" },
            { title: "Resolver asks .com TLD Server", detail: "\"Who handles flipkart.com?\" → \"Ask Flipkart's Authoritative DNS\"" },
            { title: "Resolver asks Flipkart's Authoritative DNS", detail: "\"What's the IP for flipkart.com?\" → \"13.227.220.45\"" },
            { title: "Resolver caches the answer", detail: "returns IP to browser", tone: "healthy" },
          ],
        },
        {
          kind: "paragraph",
          text: "This looks slow — but in practice it takes ~20-120ms because of aggressive caching at every level.",
        },
        {
          kind: "paragraph",
          text: "The result has a TTL (Time To Live) — after which the cache expires and the lookup repeats.",
        },
        {
          kind: "list",
          items: ["TTL = 300 seconds → cache this answer for 5 minutes", "TTL = 86400 seconds → cache for 24 hours"],
        },
        {
          kind: "insight",
          text: "Low TTL = faster DNS changes propagate. High TTL = fewer DNS lookups, better performance. This is a real trade-off Flipkart/Amazon engineers make.",
        },
      ],
    },
    {
      id: "step-4-tcp",
      heading: "Step 4 — TCP handshake",
      blocks: [
        {
          kind: "paragraph",
          text: "Now the browser knows the IP. It needs to establish a connection before sending any data.",
        },
        { kind: "paragraph", text: "TCP uses a 3-way handshake:" },
        {
          kind: "sequence",
          actors: [
            { id: "browser", label: "Browser" },
            { id: "server", label: "Server" },
          ],
          messages: [
            { from: "browser", to: "server", label: "SYN — \"Hey, I want to connect\"" },
            { from: "server", to: "browser", label: "SYN-ACK — \"Got it, I'm ready\"", dashed: true },
            { from: "browser", to: "server", label: "ACK — \"Great, let's talk\"" },
          ],
        },
        {
          kind: "list",
          items: ["SYN = Synchronize (I want to connect)", "ACK = Acknowledge (I received your message)"],
        },
        {
          kind: "paragraph",
          text: "This takes 1 round trip — roughly equal to the latency between you and the server.",
        },
        {
          kind: "list",
          items: ["Mumbai → Flipkart server in Mumbai = ~5ms round trip", "Mumbai → US server = ~180ms round trip"],
        },
        {
          kind: "insight",
          text: "This is why you place servers close to your users. Every extra round trip adds latency. This is why CDNs exist — they put servers physically closer to users.",
        },
      ],
    },
    {
      id: "step-5-tls",
      heading: "Step 5 — TLS handshake (HTTPS only)",
      blocks: [
        {
          kind: "paragraph",
          text: "If the site uses HTTPS (which all modern sites do), there's an additional handshake to establish encryption. Simplified version:",
        },
        {
          kind: "sequence",
          actors: [
            { id: "browser", label: "Browser" },
            { id: "server", label: "Server" },
          ],
          messages: [
            { from: "browser", to: "server", label: "\"I support these encryption methods\"" },
            { from: "server", to: "browser", label: "\"Let's use this one. Here's my certificate\"", dashed: true },
            { from: "browser", to: "server", label: "verify cert, generate session key → \"Ready to encrypt\"" },
            { from: "server", to: "browser", label: "\"Ready to encrypt\"", dashed: true, tone: "healthy" },
          ],
        },
        {
          kind: "paragraph",
          text: "This adds 1-2 more round trips on top of the TCP handshake.",
        },
        {
          kind: "paragraph",
          text: "Modern TLS 1.3 reduced this to just 1 round trip. TLS 1.2 needed 2.",
        },
        {
          kind: "insight",
          text: "HTTPS adds latency. Companies use TLS termination at the load balancer — the load balancer handles encryption/decryption so backend servers don't have to. We'll revisit this in the Load Balancer lesson.",
        },
      ],
    },
    {
      id: "step-6-http-request",
      heading: "Step 6 — HTTP request",
      blocks: [
        { kind: "paragraph", text: "Connection established. Now the browser sends the actual request:" },
        {
          kind: "code",
          code: 'GET /search?q=iphone HTTP/1.1\nHost: www.flipkart.com\nUser-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)\nAccept: text/html,application/json\nAccept-Language: en-IN\nConnection: keep-alive',
        },
        {
          kind: "table",
          headers: ["Part", "Meaning"],
          rows: [
            ["GET", "HTTP method — I want to read something"],
            ["/search?q=iphone", "The path and query parameters"],
            ["HTTP/1.1", "Protocol version"],
            ["Host", "Which website (one server can host many)"],
            ["User-Agent", "What device/browser is making the request"],
            ["Connection: keep-alive", "Don't close this connection after one request"],
          ],
        },
        { kind: "paragraph", text: "We'll go deep on HTTP methods, headers, and status codes in Lessons 6-8." },
      ],
    },
    {
      id: "step-7-server",
      heading: "Step 7 — server processing",
      blocks: [
        { kind: "paragraph", text: "This is where your actual system design lives." },
        { kind: "paragraph", text: "The request hits Flipkart's infrastructure:" },
        {
          kind: "flow",
          steps: [
            { title: "Request arrives" },
            { title: "Load Balancer", detail: "which server should handle this?" },
            { title: "Application Server", detail: "run the search logic" },
            { title: "Cache Check", detail: "is this search result cached? — cache miss" },
            { title: "Database Query", detail: "find iPhones, filter, sort" },
            { title: "Build Response", detail: "format the results as JSON/HTML" },
            { title: "Send back", tone: "healthy" },
          ],
        },
        {
          kind: "paragraph",
          text: "Each arrow is a lesson in this course — Load Balancer → Lesson 13, Caching → Lesson 14, Databases → Lessons 8-11.",
        },
        { kind: "paragraph", text: "For now, understand that many systems work together to process one request." },
      ],
    },
    {
      id: "step-8-response",
      heading: "Step 8 — HTTP response",
      blocks: [
        { kind: "paragraph", text: "The server sends back:" },
        {
          kind: "code",
          code: 'HTTP/1.1 200 OK\nContent-Type: text/html; charset=UTF-8\nContent-Length: 48291\nCache-Control: max-age=300\n\n[HTML/JSON body with the actual page content]',
        },
        {
          kind: "table",
          headers: ["Part", "Meaning"],
          rows: [
            ["200 OK", "Status code — request succeeded"],
            ["Content-Type", "What kind of data is coming back"],
            ["Cache-Control: max-age=300", "Browser, cache this for 5 minutes"],
          ],
        },
      ],
    },
    {
      id: "step-9-rendering",
      heading: "Step 9 — browser rendering",
      blocks: [
        { kind: "paragraph", text: "The browser receives the HTML and starts rendering:" },
        {
          kind: "flow",
          steps: [
            { title: "HTML received" },
            { title: "Build DOM", detail: "Document Object Model — the page structure" },
            { title: "Fetch CSS", detail: "apply styles" },
            { title: "Fetch JavaScript", detail: "execute" },
            { title: "Fetch Images", detail: "triggers new HTTP requests for each!" },
            { title: "Paint pixels on screen", tone: "healthy" },
          ],
        },
        {
          kind: "insight",
          text: "Loading one page often triggers dozens of additional HTTP requests — for CSS files, JS files, images, fonts, analytics scripts. Each is another trip through (parts of) this lifecycle.",
        },
        {
          kind: "list",
          items: [
            "This is why images are served from CDNs",
            "This is why CSS/JS files are minified and bundled",
            "This is why browsers open multiple parallel connections",
          ],
        },
      ],
    },
    {
      id: "timings",
      heading: "The complete picture with timings",
      blocks: [
        {
          kind: "table",
          headers: ["Action", "Typical time"],
          rows: [
            ["Browser cache check", "~1ms"],
            ["DNS resolution", "~20-120ms"],
            ["TCP handshake", "~10-50ms"],
            ["TLS handshake", "~10-50ms"],
            ["HTTP request sent", "~1ms"],
            ["Server processing", "~50-200ms ← this is YOUR code"],
            ["Network transfer", "~10-100ms"],
            ["Browser rendering", "~100-300ms"],
            ["Total", "~200-900ms"],
          ],
        },
        {
          kind: "paragraph",
          text: "Notice: server processing is often the biggest variable. That's what you control as a backend engineer.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "paragraph",
          text: "This question or a variant of it appears in almost every system design interview as a warm-up:",
        },
        {
          kind: "insight",
          text: "\"What happens when you type google.com in your browser?\"",
        },
        { kind: "paragraph", text: "What interviewers want to hear:" },
        {
          kind: "list",
          items: [
            "DNS resolution with caching",
            "TCP handshake",
            "TLS for HTTPS",
            "HTTP request/response cycle",
            "That you understand each step is an optimization opportunity",
          ],
        },
        {
          kind: "paragraph",
          text: "What separates good answers from great ones: connecting each step to a system design concept. \"DNS has TTLs, which is a caching trade-off.\" \"TLS adds round trips, which is why companies terminate TLS at the load balancer.\" \"Server processing time is where your architecture decisions matter most.\"",
        },
      ],
    },
  ],
  summary:
    "The browser request lifecycle is a 9-step journey from URL to rendered page — DNS resolution, TCP handshake, TLS negotiation, HTTP request, server processing, and rendering — and every single step is an optimization opportunity that maps directly to a system design concept.",
  keyTakeaways: [
    "DNS resolution is cached at multiple levels — browser, OS, ISP. TTL controls how long caches are valid.",
    "TCP + TLS = 2-3 round trips before a single byte of your content is sent — this is why latency matters and why CDNs exist.",
    "Server processing time is the variable you control — caching, databases, load balancers all live here.",
    "One page load = dozens of HTTP requests — for images, CSS, JS. Each is a new mini-lifecycle.",
    "Keep-alive connections reuse TCP connections across multiple requests — avoiding repeated handshakes.",
  ],
  exercise: {
    prompt:
      "A user in Chennai opens Flipkart on their phone. The page takes 3.2 seconds to load. Your manager says: \"Fix it. Get it under 1 second.\" You profile the request and find: DNS resolution 800ms (unusually high), TCP + TLS handshake 600ms (unusually high), server processing 900ms (high), image loading 900ms (high). For each of the four slow steps, suggest one specific thing you would investigate or change — and explain why that step is slow in the first place.",
    guidance: [
      {
        kind: "table",
        headers: ["Step", "Time", "Why it's slow", "Fix"],
        rows: [
          [
            "DNS Resolution",
            "800ms",
            "DNS cache at the browser, OS, and ISP level is either empty or the TTL expired, so it's doing a full lookup through every hop.",
            'Increase TTL on Flipkart\'s DNS records so ISPs cache longer; use DNS prefetching (`<link rel="dns-prefetch" href="//cdn.flipkart.com">`) to resolve known domains before the user clicks; use a fast DNS provider with edge nodes close to India.',
          ],
          [
            "TCP + TLS Handshake",
            "600ms",
            "The server is physically far from Chennai — each round trip is ~150-200ms, and TCP (1 round trip) + TLS 1.2 (2 more) adds up to 3 × ~200ms.",
            "Put a CDN edge node or load balancer in Chennai/South India so the handshake happens locally (~5ms instead of 200ms); upgrade to TLS 1.3 (1 round trip instead of 2); use connection keep-alive so the TCP connection is reused instead of re-handshaking every time.",
          ],
          [
            "Server Processing",
            "900ms",
            "The backend is doing too much per request — likely hitting the database directly with no caching, slow queries, or sequential calls that could run in parallel.",
            "Add a cache (Redis) in front of the database; check for missing indexes/full table scans; parallelize independent operations; add more servers behind a load balancer if the server itself is overloaded.",
          ],
          [
            "Image Loading",
            "900ms",
            "Images are large files served from a single origin server far from Chennai, each image triggering its own request.",
            "Serve images from a CDN edge near Chennai instead of a distant origin; compress images (WebP instead of JPEG/PNG); lazy-load offscreen images; use HTTP/2 so images download in parallel over one connection instead of sequentially.",
          ],
        ],
      },
      {
        kind: "insight",
        text: "Every fix here — CDN, Redis, load balancer, caching, indexes — is its own dedicated lesson later in this course. Diagnosing this scenario yourself is the preview of why each one exists.",
      },
    ],
  },
  relatedEntitySlugs: [],
};
