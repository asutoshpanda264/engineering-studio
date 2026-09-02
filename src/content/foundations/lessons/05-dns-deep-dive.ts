import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 5 | Topic: DNS Deep Dive | Phase: 1 — Foundations".
 */
export const DNS_DEEP_DIVE: FoundationLesson = {
  slug: "dns-deep-dive",
  number: 5,
  title: "DNS — The Internet's Phone Book",
  tagline:
    "Not just name-to-IP translation — a distributed, globally cached routing system companies use for load balancing, failover, and geo-routing.",
  estimatedMinutes: 45,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Imagine Swiggy has 500 servers handling traffic. When you type swiggy.com, how does your browser know which of those 500 servers to connect to?",
        },
        { kind: "paragraph", text: "The answer isn't random. It's carefully engineered — and DNS is the control panel that makes it work." },
        {
          kind: "insight",
          text: "Most engineers think DNS is just \"domain name to IP translation.\" That's like saying a hospital is just \"a building with beds.\" Technically true, completely misses the point.",
        },
        {
          kind: "paragraph",
          text: "DNS is actually a distributed, globally cached, highly available routing system — and understanding it deeply will unlock load balancing, failover, and geo-routing concepts that come up constantly in interviews.",
        },
      ],
    },
    {
      id: "the-problem",
      heading: "The problem DNS solves",
      blocks: [
        { kind: "paragraph", text: "Three problems:" },
        { kind: "paragraph", text: "Problem 1 — humans can't remember IPs." },
        {
          kind: "list",
          items: [
            { text: "google.com — easy to remember", tone: "healthy" },
            { text: "142.250.x.x — not easy to remember", tone: "critical" },
          ],
        },
        {
          kind: "paragraph",
          text: "Problem 2 — IPs change, names shouldn't. Flipkart might move from one data center to another. Their IP changes. But flipkart.com stays the same — only the DNS record changes.",
        },
        {
          kind: "paragraph",
          text: "Problem 3 — one name, many IPs. google.com resolves to different IPs depending on where you are — because Google has servers everywhere. DNS makes this routing transparent to you.",
        },
      ],
    },
    {
      id: "distributed-database",
      heading: "DNS is a distributed database",
      blocks: [
        {
          kind: "paragraph",
          text: "DNS isn't one server somewhere. It's a hierarchy of servers distributed across the globe.",
        },
        { kind: "figure", diagram: "dns-hierarchy", caption: "Root → TLD → Authoritative" },
        { kind: "paragraph", text: "The three levels:" },
        { kind: "paragraph", text: "Root DNS Servers" },
        {
          kind: "list",
          items: [
            "13 logical clusters (hundreds of physical servers)",
            "Know nothing about specific domains",
            "Only know: \"for .com domains, ask this TLD server\"",
            "Operated by ICANN, Verisign, NASA, etc.",
          ],
        },
        { kind: "paragraph", text: "TLD (Top Level Domain) Servers" },
        {
          kind: "list",
          items: [
            "One set per extension: .com, .in, .org, .io",
            "Know: \"for flipkart.com, ask Flipkart's own DNS server\"",
            "Operated by registries (Verisign runs .com)",
          ],
        },
        { kind: "paragraph", text: "Authoritative DNS Servers" },
        {
          kind: "list",
          items: [
            "Flipkart/Swiggy/Google runs these themselves",
            "The final authority: \"flipkart.com = 13.227.220.45\"",
            "This is where you actually configure your DNS records",
          ],
        },
      ],
    },
    {
      id: "resolution-journey",
      heading: "The full resolution journey",
      blocks: [
        { kind: "paragraph", text: "Let's trace swiggy.com resolution step by step:" },
        { kind: "figure", diagram: "dns-resolution-flow", caption: "swiggy.com resolution, step by step" },
        {
          kind: "paragraph",
          text: "Same journey, but the list above hides one thing worth seeing directly: the resolver never lets Root, the TLD server, and the authoritative server talk to each other. It's the one making every trip — four separate round trips out and back.",
        },
        { kind: "figure", diagram: "dns-recursive-lookup", caption: "the resolver's four round trips, live" },
        { kind: "paragraph", text: "This entire journey: ~20-120ms because of heavy caching at every level." },
      ],
    },
    {
      id: "record-types",
      heading: "DNS record types — the ones you must know",
      blocks: [
        { kind: "paragraph", text: "DNS isn't just name → IP. It stores different types of records:" },
        {
          kind: "table",
          headers: ["Record", "Full name", "What it does", "Example"],
          rows: [
            ["A", "Address", "Domain → IPv4 address", "flipkart.com → 13.227.220.45"],
            ["AAAA", "Address v6", "Domain → IPv6 address", "flipkart.com → 2001:db8::1"],
            ["CNAME", "Canonical Name", "Domain → another domain", "www.flipkart.com → flipkart.com"],
            ["MX", "Mail Exchange", "Domain → mail server", "flipkart.com → mail.flipkart.com"],
            ["TXT", "Text", "Arbitrary text, used for verification", "Google site verification, SPF records"],
            ["NS", "Name Server", "Which servers are authoritative for this domain", "—"],
            ["TTL", "Time To Live", "How long to cache this record (seconds)", "TTL=300 = cache 5 minutes"],
          ],
        },
        { kind: "paragraph", text: "The ones that matter most in system design:" },
        {
          kind: "paragraph",
          text: "A Record — the fundamental record. Maps your domain to your server's IP.",
        },
        { kind: "code", code: "api.swiggy.com    A    13.234.156.90    TTL=60" },
        {
          kind: "paragraph",
          text: "CNAME Record — maps one domain to another. Used heavily with CDNs and load balancers.",
        },
        {
          kind: "code",
          code: "www.swiggy.com     CNAME    swiggy.com\nimages.swiggy.com  CNAME    swiggy.cloudfront.net  ← CDN",
        },
        { kind: "paragraph", text: "TTL — not a record type but a field on every record. Controls caching duration." },
      ],
    },
    {
      id: "ttl",
      heading: "TTL — the most important DNS concept for system design",
      blocks: [
        { kind: "paragraph", text: "TTL (Time To Live) is how long DNS resolvers cache your record before re-asking." },
        {
          kind: "table",
          headers: ["TTL", "Cached for"],
          rows: [
            ["300", "5 minutes"],
            ["3600", "1 hour"],
            ["86400", "24 hours"],
          ],
        },
        {
          kind: "table",
          headers: ["", "High TTL (86400)", "Low TTL (60)"],
          rows: [
            ["Performance", "Fewer DNS lookups", "More DNS lookups"],
            ["DNS server load", "Less load", "More load"],
            ["Propagation speed", "Changes take 24hrs to propagate", "Changes propagate in 1 min"],
            ["Failover speed", "Slow — users stuck on old IP", "Fast — can redirect quickly"],
          ],
        },
        {
          kind: "paragraph",
          text: "Real-world implication: if Swiggy's server at 13.234.156.90 goes down and they need to redirect traffic to a backup server at 13.234.156.91 — with TTL=86400, users are stuck for up to 24 hours; with TTL=60, users get the new IP within 1 minute.",
        },
        {
          kind: "insight",
          label: "Industry practice",
          text: "Normal operation: TTL = 3600 (1 hour) — good balance. Before planned maintenance/migration: lower TTL to 60 first, then make the change. After migration is stable: raise TTL back to 3600. This is called TTL pre-lowering, and every ops team does it.",
        },
      ],
    },
    {
      id: "dns-as-design-tool",
      heading: "DNS as a system design tool",
      blocks: [
        {
          kind: "paragraph",
          text: "Here's where DNS gets genuinely powerful. Companies use DNS to do things beyond simple name resolution.",
        },
        { kind: "paragraph", text: "Load Balancing via DNS (Round Robin DNS) — return multiple IPs for the same domain. Each requester gets a different one." },
        {
          kind: "code",
          code: "swiggy.com → 13.234.156.90   (Server 1)\nswiggy.com → 13.234.156.91   (Server 2)\nswiggy.com → 13.234.156.92   (Server 3)",
        },
        {
          kind: "paragraph",
          text: "This is how AWS Route 53 works. You configure routing policies:",
        },
        {
          kind: "list",
          items: [
            "Geolocation routing — based on user's country/region",
            "Latency-based routing — route to lowest latency datacenter",
            "Weighted routing — send 90% to main server, 10% to new version (canary deploy)",
            "Failover routing — primary server down? Auto-route to backup",
          ],
        },
        {
          kind: "insight",
          text: "Netflix uses DNS-based geo-routing to direct Indian users to Mumbai/Singapore servers instead of US servers — cutting latency by 150ms+.",
        },
        { kind: "paragraph", text: "Failover via DNS:" },
        { kind: "figure", diagram: "dns-failover", caption: "Primary down → health check → DNS flips to backup" },
        {
          kind: "paragraph",
          text: "This is DNS failover — used by almost every large company as part of their disaster recovery plan.",
        },
      ],
    },
    {
      id: "cdn-and-dns",
      heading: "CDN and DNS — how they connect",
      blocks: [
        {
          kind: "paragraph",
          text: "When you use a CDN like Cloudflare or AWS CloudFront, DNS is the mechanism that routes users to the nearest CDN edge node.",
        },
        { kind: "code", code: "images.flipkart.com   CNAME   flipkart.cloudfront.net" },
        {
          kind: "paragraph",
          text: "When you resolve flipkart.cloudfront.net:",
        },
        {
          kind: "table",
          headers: ["User location", "CDN node"],
          rows: [
            ["Mumbai", "CDN node in Mumbai"],
            ["London", "CDN node in London"],
            ["Tokyo", "CDN node in Tokyo"],
          ],
        },
        {
          kind: "paragraph",
          text: "The CNAME points to CloudFront, and CloudFront's own DNS returns the nearest edge node's IP. This is how CDNs work at the DNS level — we'll go deep on CDNs in Lesson 18.",
        },
      ],
    },
    {
      id: "common-problems",
      heading: "Common DNS problems in system design",
      blocks: [
        {
          kind: "table",
          headers: ["Problem", "What happens", "Solution"],
          rows: [
            ["DNS propagation delay", "Changed IP takes hours to reach all users", "Pre-lower TTL before changes"],
            ["DNS as single point of failure", "Your DNS server goes down, domain unreachable", "Multiple NS records, redundant DNS providers"],
            ["DNS cache poisoning", "Attacker inserts false DNS records", "DNSSEC (cryptographic verification)"],
            ["Thundering herd on TTL expiry", "Million users' TTL expires simultaneously, flood DNS", "Slightly randomize TTL values"],
          ],
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "DNS comes up in system design interviews in three ways:" },
        {
          kind: "qa",
          question: "As a warm-up: \"Walk me through what happens when you type google.com\"",
          answer: "You now know: browser cache → OS cache → recursive resolver → root → TLD → authoritative.",
        },
        {
          kind: "qa",
          question: "As a scaling question: \"How would you route Indian users to Indian servers?\"",
          answer: "Geo-DNS / latency-based routing with AWS Route 53 or Cloudflare.",
        },
        {
          kind: "qa",
          question: "As a reliability question: \"How do you handle datacenter failover?\"",
          answer: "DNS failover with low TTL + health checks.",
        },
        {
          kind: "insight",
          text: "TTL is a trade-off between performance (high TTL) and agility (low TTL). Smart engineers pre-lower TTL before planned changes.",
        },
      ],
    },
  ],
  summary:
    "DNS is not just a phone book — it's a globally distributed, hierarchically cached routing system that companies use for load balancing, geographic routing, failover, and CDN integration, with TTL being the critical knob that trades off performance against propagation speed.",
  keyTakeaways: [
    "DNS hierarchy: Root → TLD → Authoritative. Each level delegates to the next.",
    "TTL is a trade-off: high TTL = better performance, slow failover; low TTL = slower performance, fast failover. Pre-lower TTL before planned changes.",
    "DNS is a system design tool — not just infrastructure. Use it for geo-routing, load balancing, and failover.",
    "CNAME records connect your domain to CDNs and load balancers — the glue between DNS and your infrastructure.",
    "DNS failover + health checks is the first line of defense when a datacenter goes down.",
  ],
  exercise: {
    prompt:
      "Flipkart is planning a major infrastructure migration — moving all their servers from their own data center in Bangalore to AWS Mumbai region. The migration will happen at 2 AM on a Sunday. Their current DNS records: flipkart.com A 103.240.158.53 TTL=86400. A junior engineer says: \"At 2 AM, we'll just update the DNS record to point to the new AWS IP. Done.\" You're the senior engineer on call. What's wrong with the junior engineer's plan, and what would you do differently — and when would you start doing it? Think step by step. The answer requires understanding TTL deeply.",
  },
  relatedEntitySlugs: ["load-balancer", "cdn"],
  prerequisites: ["client-server-architecture"],
};
