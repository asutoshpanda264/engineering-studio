import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 18 | Topic: CDN — Content Delivery Network | Phase: 1 — Foundations".
 * Last lesson in the shared chat — Phase 1's own Lesson 21 ("End-to-End
 * Request Flow") was only named as a "Next" pointer, never written out, so
 * this module stops at Lesson 18/CDN per the scope this port covers.
 */
export const CDN: FoundationLesson = {
  slug: "cdn",
  number: 18,
  title: "CDN — Content Delivery Network",
  tagline:
    "40 petabytes served in one evening — not from Virginia, but from a server 10km from you. The speed of light is the one constraint no amount of engineering removes.",
  estimatedMinutes: 45,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Netflix has 200 million subscribers worldwide. On a Friday evening, 10 million people simultaneously press play on different movies.",
        },
        { kind: "paragraph", text: "Each movie is 4GB. 10 million × 4GB = 40 petabytes of data served in one evening." },
        { kind: "paragraph", text: "If all that traffic went to Netflix's servers in Virginia, USA:" },
        {
          kind: "list",
          items: [
            "Users in Mumbai would experience 200ms+ latency just for the network round trip",
            "The bandwidth required would be astronomical",
            "The servers would need to be impossibly large",
          ],
        },
        {
          kind: "insight",
          text: "Netflix doesn't work this way. When you press play in Mumbai, the video comes from a server that might be 10km away — not Virginia. That's a CDN.",
        },
      ],
    },
    {
      id: "the-problem",
      heading: "The problem CDNs solve",
      blocks: [
        { kind: "paragraph", text: "Problem 1: Physical Distance = Latency. The speed of light through fiber optic cable is ~200,000 km/second." },
        {
          kind: "code",
          code: "Mumbai → Virginia (USA): ~13,000 km\nRound trip time (minimum): 13,000 × 2 / 200,000 = ~130ms\n\nFor video streaming: unacceptable\nFor a webpage loading 50 resources: catastrophic",
        },
        { kind: "paragraph", text: "Problem 2: Origin Server Bandwidth." },
        {
          kind: "code",
          code: "Hotstar during IPL final:\n50 million viewers × 5 Mbps video stream\n= 250 Tbps of bandwidth required\n\nSingle datacenter can't provide this\nCost would be enormous",
        },
        { kind: "paragraph", text: "Problem 3: Single Point of Failure." },
        {
          kind: "flow",
          steps: [
            { title: "One datacenter in Mumbai serves all Indian users" },
            { title: "Mumbai datacenter goes down", tone: "signal" },
            { title: "All Indian users lose access", detail: "entire service down for India", tone: "critical" },
          ],
        },
        {
          kind: "paragraph",
          text: "CDN solves all three: edge servers near users → low latency; distributed load → no bandwidth bottleneck; multiple locations → no single point of failure.",
        },
      ],
    },
    {
      id: "how-it-works",
      heading: "How a CDN works — the core mechanism",
      blocks: [
        {
          kind: "paragraph",
          text: "A CDN is a globally distributed network of servers (edge nodes/PoPs) that cache content close to users.",
        },
        {
          kind: "compare",
          panels: [
            {
              title: "Without CDN",
              nodes: [
                { id: "no-cdn-user", label: "User in Chennai", col: 0, row: 0, entityType: "client" },
                {
                  id: "no-cdn-origin",
                  label: "Origin Server in Mumbai",
                  sublabel: "200km, ~5ms — US users 13,000km, ~130ms",
                  col: 1,
                  row: 0,
                },
              ],
              edges: [{ from: "no-cdn-user", to: "no-cdn-origin" }],
            },
            {
              title: "With CDN",
              nodes: [
                { id: "cdn-user", label: "User in Chennai", col: 0, row: 0, entityType: "client" },
                {
                  id: "cdn-edge",
                  label: "CDN Edge Node in Chennai",
                  sublabel: "5km away, ~0.5ms — serves cached content instantly",
                  col: 1,
                  row: 0,
                  tone: "healthy",
                  entityType: "cdn",
                },
              ],
              edges: [{ from: "cdn-user", to: "cdn-edge", tone: "healthy" }],
            },
          ],
        },
        { kind: "paragraph", text: "The CDN request flow:" },
        {
          kind: "compare",
          panels: [
            {
              title: "First request (cache miss)",
              nodes: [
                { id: "flow-miss-user", label: "User", col: 0, row: 0, entityType: "client" },
                { id: "flow-miss-edge", label: "CDN Edge Node", col: 1, row: 0, entityType: "cdn" },
                { id: "flow-miss-origin", label: "Origin Server", col: 2, row: 0 },
              ],
              edges: [
                { from: "flow-miss-user", to: "flow-miss-edge" },
                { from: "flow-miss-edge", to: "flow-miss-origin", label: "\"Don't have this\"" },
                { from: "flow-miss-origin", to: "flow-miss-edge", label: "content + Cache-Control", dashed: true },
                { from: "flow-miss-edge", to: "flow-miss-user", label: "caches + returns content", dashed: true },
              ],
            },
            {
              title: "Subsequent requests (cache hit)",
              nodes: [
                { id: "flow-hit-user", label: "User", col: 0, row: 0, entityType: "client" },
                { id: "flow-hit-edge", label: "CDN Edge Node", col: 1, row: 0, tone: "healthy", entityType: "cdn" },
              ],
              edges: [
                { from: "flow-hit-user", to: "flow-hit-edge", label: "\"Have it!\"", tone: "healthy" },
                { from: "flow-hit-edge", to: "flow-hit-user", label: "cached content — origin never contacted", dashed: true, tone: "healthy" },
              ],
            },
          ],
        },
        { kind: "paragraph", text: "Points of Presence (PoPs) — CDN providers have hundreds of edge locations worldwide:" },
        {
          kind: "list",
          items: [
            "Cloudflare: 300+ cities worldwide",
            "AWS CloudFront: 400+ edge locations",
            "Akamai: 4,000+ edge locations (largest)",
          ],
        },
        { kind: "paragraph", text: "In India: Mumbai, Delhi, Chennai, Bangalore, Hyderabad, Kolkata, and more." },
      ],
    },
    {
      id: "caching-strategies",
      heading: "CDN caching — how content gets to the edge",
      blocks: [
        { kind: "paragraph", text: "Pull CDN (most common) — the edge node fetches from origin on demand, on the first cache miss." },
        {
          kind: "flow",
          steps: [
            { title: "User requests image.jpg" },
            { title: "Edge node: \"Don't have it\"", detail: "fetch from origin, cache it, serve to user", tone: "signal" },
            { title: "Next user requests same image.jpg" },
            { title: "Edge node: \"Have it!\"", detail: "serve from cache", tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "Origin only contacted once per edge node per cache lifetime." },
        { kind: "paragraph", text: "Configuration: the origin sets Cache-Control headers." },
        { kind: "code", code: "Cache-Control: public, max-age=86400" },
        { kind: "paragraph", text: "The edge node caches for 86400 seconds (24 hours). After 24 hours it expires — the next request fetches fresh from origin." },
        { kind: "paragraph", text: "Advantages: simple (just set cache headers on origin); only caches what's actually requested; no pre-warming needed. Disadvantages: the first user per edge node gets a slower response (cache miss); latency spike on cold start or after cache expiry." },
        { kind: "paragraph", text: "Push CDN — you proactively upload content to all edge nodes before users request it." },
        {
          kind: "flow",
          steps: [
            { title: "Netflix uploads new movie \"Pathaan\"" },
            { title: "Pushes to ALL edge nodes worldwide", detail: "before release" },
            { title: "User presses play", detail: "content already at nearest edge", tone: "healthy" },
            { title: "Zero cache miss on launch day", tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "Used for: predictable high-demand content (movie releases, software updates, game patches)." },
        {
          kind: "paragraph",
          text: "Advantages: no cache miss (content pre-positioned); perfect for known high-demand content; consistent performance from the first request. Disadvantages: must manage when to push/invalidate; storage used even for unpopular content; more complex operations.",
        },
      ],
    },
    {
      id: "cdn-and-dns",
      heading: "CDN and DNS — how users find the nearest edge",
      blocks: [
        { kind: "paragraph", text: "We covered DNS in Lesson 5. Now let's connect it to CDNs." },
        { kind: "code", code: "images.flipkart.com    CNAME    flipkart.cloudfront.net" },
        { kind: "paragraph", text: "Geo-DNS: CloudFront's DNS checks the user's location and returns a different IP per region." },
        { kind: "paragraph", text: "Anycast Routing (used by Cloudflare) — multiple edge nodes share the SAME IP address; internet routing automatically directs to the nearest node with that IP." },
        {
          kind: "table",
          headers: ["Method", "User location", "Routed to"],
          rows: [
            ["Geo-DNS", "Mumbai user", "Mumbai edge node — 54.230.10.45"],
            ["Geo-DNS", "Delhi user", "Delhi edge node — 54.230.20.67"],
            ["Anycast", "Mumbai user", "Mumbai node — IP 104.16.100.1"],
            ["Anycast", "Delhi user", "Delhi node — same IP 104.16.100.1"],
          ],
        },
      ],
    },
    {
      id: "cache-invalidation",
      heading: "Cache invalidation at CDN scale",
      blocks: [
        { kind: "paragraph", text: "This is one of the hardest CDN problems in production." },
        { kind: "paragraph", text: "The problem:" },
        {
          kind: "flow",
          steps: [
            { title: "Flipkart product cached with TTL=24 hours", detail: "iPhone 15 Pro, price ₹1,19,900" },
            { title: "2 hours later: price drops to ₹1,09,900", detail: "flash sale!", tone: "signal" },
            { title: "CDN still serving old price", detail: "for the next 22 hours", tone: "critical" },
            { title: "Orders fail", detail: "actual price different from shown", tone: "critical" },
          ],
        },
        { kind: "paragraph", text: "Solution 1: Short TTL." },
        { kind: "code", code: "Cache-Control: max-age=300  // 5 minute TTL" },
        { kind: "paragraph", text: "Content refreshes every 5 minutes. Stale data window: maximum 5 minutes. Cost: more origin hits (every 5 min per edge node)." },
        { kind: "paragraph", text: "Solution 2: Explicit Cache Invalidation — immediately purge specific files when content changes." },
        {
          kind: "code",
          language: "javascript",
          code: '// Product price updated in database\n// → Application triggers CDN purge:\n\n// AWS CloudFront invalidation\ncloudfront.createInvalidation({\n    DistributionId: "ABCDEF123",\n    InvalidationBatch: {\n        Paths: {\n            Items: [\n                "/products/iphone-15-pro",\n                "/api/products/iphone-15-pro*",\n                "/homepage"  // if homepage shows price\n            ]\n        }\n    }\n});\n\n// Cloudflare purge by URL\ncloudflare.purgeCache({\n    files: ["https://flipkart.com/products/iphone-15-pro"]\n});',
        },
        {
          kind: "paragraph",
          text: "Propagation time: ~5-30 seconds globally, immediate for most users. Cost: invalidations are charged by CDN providers — purging millions of files is expensive.",
        },
        { kind: "paragraph", text: "Solution 3: Cache Versioning (best for static assets) — instead of invalidating, change the filename." },
        {
          kind: "compare",
          panels: [
            {
              title: "❌ Invalidation approach",
              nodes: [
                { id: "invalidation-css", label: "styles.css", sublabel: "CDN caches", col: 0, row: 0 },
                { id: "invalidation-change", label: "code changes", sublabel: "must invalidate globally", col: 1, row: 0, tone: "critical" },
              ],
              edges: [{ from: "invalidation-css", to: "invalidation-change", tone: "critical" }],
            },
            {
              title: "✅ Versioning approach",
              nodes: [
                { id: "versioning-v1", label: "styles.abc123.css", sublabel: "CDN caches forever", col: 0, row: 0 },
                {
                  id: "versioning-v2",
                  label: "styles.xyz789.css",
                  sublabel: "new file, new URL → CDN fetches fresh",
                  col: 1,
                  row: 0,
                  tone: "healthy",
                },
              ],
              edges: [{ from: "versioning-v1", to: "versioning-v2", label: "new deployment", tone: "healthy" }],
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Old version stays cached (still served to users mid-session), the new version is immediately available, and no invalidation is needed.",
        },
        {
          kind: "code",
          language: "html",
          code: '<!-- Old deployment -->\n<link href="/static/styles.abc123.css" rel="stylesheet">\n\n<!-- New deployment — new hash in filename -->\n<link href="/static/styles.xyz789.css" rel="stylesheet">',
        },
        {
          kind: "insight",
          text: "This is how Flipkart, Netflix, and Google deploy frontend assets. Content hash in filename = immutable caching + automatic invalidation on deploy.",
        },
      ],
    },
    {
      id: "netflix-open-connect",
      heading: "CDN for video streaming — Netflix deep dive",
      blocks: [
        {
          kind: "flow",
          steps: [
            {
              title: "Netflix algorithm predicts tomorrow's Mumbai trends",
              detail: "Pathaan (trending), Sacred Games S3 (new), RRR (popular)",
            },
            { title: "Night before: pre-download these titles to Mumbai ISP servers" },
            { title: "User presses play in morning", detail: "content already there", tone: "healthy" },
            { title: "Instant start", tone: "healthy" },
          ],
        },
        {
          kind: "paragraph",
          text: "Netflix is the most sophisticated CDN use case in the world — instead of using AWS CloudFront or Akamai, they built their own: Open Connect.",
        },
        {
          kind: "paragraph",
          text: "Open Connect Appliances (OCAs): physical servers Netflix installs inside ISPs (Jio, Airtel, BSNL). Scale: 17,000+ servers, 100+ countries, storing ~1 petabyte of content per major location.",
        },
        {
          kind: "paragraph",
          text: "Why build their own CDN? Cost: CDN providers charge per GB transferred, and Netflix transfers hundreds of petabytes/day — a third-party CDN would cost billions of dollars/year, while their own CDN is much cheaper at scale. Control: they can optimize specifically for video streaming with custom hardware, custom protocols, and deep integration with the recommendation system.",
        },
        { kind: "paragraph", text: "Adaptive Bitrate Streaming — video is stored in multiple qualities:" },
        {
          kind: "table",
          headers: ["Quality", "Bitrate"],
          rows: [
            ["4K", "25 Mbps"],
            ["1080p", "8 Mbps"],
            ["720p", "4 Mbps"],
            ["480p", "1.5 Mbps"],
            ["360p", "0.5 Mbps"],
          ],
        },
        {
          kind: "paragraph",
          text: "The CDN serves all qualities. The player measures bandwidth every few seconds — a strong connection fetches 4K chunks, a weakening connection switches to 1080p, a poor connection drops to 480p. Video never stops; quality adjusts dynamically, and all chunks are fetched from the nearest CDN edge.",
        },
      ],
    },
    {
      id: "security",
      heading: "CDN security features",
      blocks: [
        { kind: "paragraph", text: "Modern CDNs provide more than just caching." },
        { kind: "paragraph", text: "DDoS Protection:" },
        {
          kind: "flow",
          steps: [
            { title: "Attack: 10 million bots send requests to flipkart.com simultaneously", tone: "critical" },
            { title: "Without CDN: origin servers overwhelmed, site goes down", tone: "critical" },
            { title: "With CDN: absorbs traffic at edge", detail: "Cloudflare's 100+ Tbps capacity, identifies bot patterns", tone: "signal" },
            { title: "Blocks malicious requests at edge", detail: "origin server never sees attack traffic", tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "Web Application Firewall (WAF) — the CDN inspects requests at the edge:" },
        {
          kind: "list",
          items: [
            "SQL injection attempts → blocked",
            "XSS attacks → blocked",
            "Rate limiting per IP → enforced",
            "Bot detection → challenge or block",
          ],
        },
        { kind: "paragraph", text: "Protection happens at the edge — zero impact on the origin server." },
        { kind: "paragraph", text: "SSL/TLS Termination:" },
        {
          kind: "architecture",
          nodes: [
            { id: "tls-user", label: "User", col: 0, row: 0, entityType: "client" },
            { id: "tls-edge", label: "CDN Edge", sublabel: "HTTPS terminates here", col: 1, row: 0, entityType: "cdn" },
            { id: "tls-origin", label: "Origin", sublabel: "HTTP or HTTPS", col: 2, row: 0 },
          ],
          edges: [
            { from: "tls-user", to: "tls-edge", label: "HTTPS" },
            { from: "tls-edge", to: "tls-origin", label: "HTTP or HTTPS" },
          ],
        },
        {
          kind: "paragraph",
          text: "CDN handles SSL certificate management, TLS handshake (at the edge, near the user), and certificate renewal. Benefits: lower latency (TLS handshake at a nearby edge), and the origin doesn't need SSL certificate management.",
        },
      ],
    },
    {
      id: "pricing",
      heading: "CDN pricing models",
      blocks: [
        { kind: "paragraph", text: "Understanding pricing helps you make architectural decisions." },
        { kind: "paragraph", text: "Cloudflare: free tier (unlimited bandwidth for static sites), Pro ($20/month), Business ($200/month)." },
        { kind: "paragraph", text: "AWS CloudFront: pay per GB transferred ($0.0085/GB, India region), pay per request ($0.0075 per 10,000 HTTPS requests) — 1TB/month ≈ $85." },
        { kind: "paragraph", text: "Akamai: enterprise pricing, typically $0.05-0.10/GB — cheapest for massive volume." },
        { kind: "paragraph", text: "Fastly: $0.12/GB starting, with volume discounts, real-time purging, fast propagation." },
        {
          kind: "insight",
          text: "For interviews: know that at scale, CDN cost is significant, and companies often build custom CDNs (Netflix, Facebook) or negotiate massive volume discounts (Flipkart with Akamai/CloudFront).",
        },
      ],
    },
    {
      id: "architecture-patterns",
      heading: "CDN architecture patterns",
      blocks: [
        { kind: "paragraph", text: "Multi-CDN Strategy — large companies use multiple CDN providers for redundancy." },
        {
          kind: "compare",
          panels: [
            {
              title: "Normal operation",
              nodes: [
                { id: "multicdn-traffic-1", label: "Traffic", col: 0, row: 1 },
                { id: "multicdn-cloudflare-1", label: "Cloudflare", sublabel: "primary, best performance", col: 1, row: 0, tone: "healthy", entityType: "cdn" },
                { id: "multicdn-cloudfront-1", label: "AWS CloudFront", sublabel: "secondary", col: 1, row: 1, entityType: "cdn" },
              ],
              edges: [
                { from: "multicdn-traffic-1", to: "multicdn-cloudflare-1", label: "70%", tone: "healthy" },
                { from: "multicdn-traffic-1", to: "multicdn-cloudfront-1", label: "30%" },
              ],
            },
            {
              title: "Cloudflare outage — automatic failover",
              nodes: [
                { id: "multicdn-traffic-2", label: "Traffic", col: 0, row: 1 },
                { id: "multicdn-cloudflare-2", label: "Cloudflare", sublabel: "down", col: 1, row: 0, tone: "critical", dashed: true, entityType: "cdn" },
                { id: "multicdn-cloudfront-2", label: "AWS CloudFront", sublabel: "100% traffic", col: 1, row: 1, tone: "healthy", entityType: "cdn" },
              ],
              edges: [
                { from: "multicdn-traffic-2", to: "multicdn-cloudflare-2", label: "✕ down", dashed: true, tone: "critical" },
                { from: "multicdn-traffic-2", to: "multicdn-cloudfront-2", label: "100%", tone: "healthy" },
              ],
            },
          ],
        },
        { kind: "paragraph", text: "No single CDN failure takes down the site." },
        { kind: "paragraph", text: "Used by: Flipkart, Netflix, Hotstar, major banks." },
        { kind: "paragraph", text: "CDN with Origin Shield." },
        {
          kind: "compare",
          panels: [
            {
              title: "Without Origin Shield",
              nodes: [
                { id: "shield-off-mumbai", label: "Edge: Mumbai", col: 0, row: 0, entityType: "cdn" },
                { id: "shield-off-delhi", label: "Edge: Delhi", col: 0, row: 1, entityType: "cdn" },
                { id: "shield-off-chennai", label: "Edge: Chennai", col: 0, row: 2, entityType: "cdn" },
                { id: "shield-off-kolkata", label: "Edge: Kolkata", col: 0, row: 3, entityType: "cdn" },
                { id: "shield-off-origin", label: "Origin: US-East", col: 1, row: 1, tone: "critical" },
              ],
              edges: [
                { from: "shield-off-mumbai", to: "shield-off-origin", tone: "critical" },
                { from: "shield-off-delhi", to: "shield-off-origin", tone: "critical" },
                { from: "shield-off-chennai", to: "shield-off-origin", tone: "critical" },
                { from: "shield-off-kolkata", to: "shield-off-origin", tone: "critical" },
              ],
            },
            {
              title: "With Origin Shield",
              nodes: [
                { id: "shield-on-mumbai", label: "Edge: Mumbai", col: 0, row: 0, entityType: "cdn" },
                { id: "shield-on-delhi", label: "Edge: Delhi", col: 0, row: 1, entityType: "cdn" },
                { id: "shield-on-chennai", label: "Edge: Chennai", col: 0, row: 2, entityType: "cdn" },
                { id: "shield-on-kolkata", label: "Edge: Kolkata", col: 0, row: 3, entityType: "cdn" },
                { id: "shield-on-shield", label: "Origin Shield: Singapore", col: 1, row: 1, tone: "healthy", entityType: "cdn" },
                { id: "shield-on-origin", label: "Origin: US-East", col: 2, row: 1, tone: "healthy" },
              ],
              edges: [
                { from: "shield-on-mumbai", to: "shield-on-shield", tone: "healthy" },
                { from: "shield-on-delhi", to: "shield-on-shield", tone: "healthy" },
                { from: "shield-on-chennai", to: "shield-on-shield", tone: "healthy" },
                { from: "shield-on-kolkata", to: "shield-on-shield", tone: "healthy" },
                { from: "shield-on-shield", to: "shield-on-origin", tone: "healthy" },
              ],
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Origin gets a maximum of 1 request per object instead of 100 — origin traffic reduced drastically.",
        },
      ],
    },
    {
      id: "when-to-use",
      heading: "When NOT to use a CDN",
      blocks: [
        {
          kind: "list",
          items: [
            "❌ Highly personalized content: user-specific dashboards, private data — a CDN would serve user A's data to user B.",
            "❌ Real-time data: live stock prices, live sports scores — cached data is immediately stale.",
            "❌ Small user base in a single region: 10,000 users all in Mumbai — CDN overhead isn't worth it, serve from one server.",
            "❌ Private API responses: requires authentication, and a CDN can't serve without compromising security (unless you implement edge auth).",
          ],
        },
        { kind: "paragraph", text: "✅ Use a CDN for: any static asset (images, CSS, JS, fonts), large files (videos, software downloads), high-traffic public content, a global user base, and DDoS protection." },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "paragraph",
          text: "CDN questions appear in system design for media, e-commerce, and any global product:",
        },
        {
          kind: "qa",
          question: "\"How would you design Netflix?\"",
          answer:
            "\"Videos stored in S3, served through a CDN (like Open Connect or CloudFront). Edge nodes pre-positioned near major ISPs. Adaptive bitrate streaming — multiple quality versions cached at edge. Pull CDN for long-tail content, push CDN for new releases. Cache-Control headers set for long TTL on video chunks since content doesn't change.\"",
        },
        {
          kind: "qa",
          question: "\"How would you reduce page load time for Flipkart users in Tier-2 cities?\"",
          answer:
            "\"CDN with edge nodes in Tier-2 cities or nearby. All static assets (images, JS, CSS) served from CDN. Image optimization (WebP format, responsive images). Lazy loading. Content pre-positioning for popular products during Big Billion Day.\"",
        },
        {
          kind: "qa",
          question: "\"How does a CDN handle cache invalidation?\"",
          answer:
            "\"Three approaches: TTL expiry (simple, eventual consistency), explicit purge API (immediate, has cost), and cache versioning via content hash in filename (best for static assets — no invalidation needed, new filename = automatic cache miss). For critical content like prices, combine short TTL with explicit purge on update.\"",
        },
      ],
    },
  ],
  summary:
    "A CDN is a globally distributed network of edge servers that caches content close to users — eliminating the speed-of-light latency penalty of serving from a central origin, absorbing massive bandwidth load through distributed caching, and enabling global-scale content delivery that would be impossible from a single datacenter.",
  keyTakeaways: [
    "Physical distance = latency — CDNs solve this by serving content from nearby edge nodes, reducing 130ms transcontinental latency to sub-millisecond local delivery.",
    "Pull CDN caches on demand, Push CDN pre-positions content — pull for general content, push for known high-demand releases.",
    "Cache versioning beats cache invalidation — content hash in filename means immutable caching + automatic freshness on deploy.",
    "CDNs do more than caching — DDoS protection, WAF, SSL termination, and bot detection at the edge.",
    "Multi-CDN strategy prevents any single CDN outage from taking down your service — route traffic between providers with DNS failover.",
  ],
  exercise: {
    prompt:
      "You're the infrastructure lead at Hotstar preparing for the ICC Cricket World Cup Final — expected to be the most-watched streaming event in history with 100 million concurrent viewers (beating their own IPL record). Content to serve: live video stream (5 Mbps per viewer × 100M viewers = 500 Tbps); static assets (app UI — JS, CSS, images — loaded by all viewers); player assets (video player JavaScript, 2MB, loaded once); thumbnail images (10,000 match-related images); API responses (match score updates every ball, ~30 seconds). For the live video stream — should you use Pull CDN or Push CDN? How does adaptive bitrate streaming help with the 500 Tbps requirement? For static assets (JS, CSS) — what caching strategy gives you both long cache lifetime AND the ability to deploy updates instantly? The match score API (GET /matches/current/score) updates every 30 seconds — should it go through CDN? If yes, what TTL, and what's the worst-case staleness a user could experience? During the match, Hotstar wants to serve a personalized \"Watch with Friends\" widget showing which of your friends are watching — can this go through CDN? Why or why not, and what's the alternative?",
  },
  relatedEntitySlugs: ["cdn"],
};
