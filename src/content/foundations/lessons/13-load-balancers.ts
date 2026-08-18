import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 13 | Topic: Load Balancers | Phase: 1 — Foundations".
 */
export const LOAD_BALANCERS: FoundationLesson = {
  slug: "load-balancers",
  number: 13,
  title: "Load Balancers",
  tagline:
    "Without a load balancer, horizontal scaling is impossible — the entrance greeter that keeps one busy counter from collapsing while nine sit empty.",
  estimatedMinutes: 60,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Imagine a busy McDonald's with 10 counters. Customers walk in and naturally spread across counters. But what if all 1000 customers rushed to Counter 1 while Counters 2-10 stood empty?",
        },
        { kind: "paragraph", text: "Counter 1 collapses. Everyone waits. The other counters are useless." },
        {
          kind: "paragraph",
          text: "You need someone at the entrance saying: \"Counter 3 is free, go there. Counter 7 is free, go there.\" That's a load balancer.",
        },
        {
          kind: "paragraph",
          text: "In software systems, when millions of requests arrive simultaneously, a load balancer sits in front of your servers and decides which server handles which request — ensuring no single server is overwhelmed while others are idle.",
        },
        { kind: "insight", text: "Without a load balancer, horizontal scaling is impossible." },
      ],
    },
    {
      id: "what-it-does",
      heading: "What a load balancer does",
      blocks: [
        {
          kind: "compare",
          panels: [
            {
              title: "Without a load balancer",
              nodes: [
                { id: "no-lb-source", label: "1M requests/sec", col: 0, row: 1 },
                { id: "no-lb-s1", label: "Server 1", sublabel: "💥 overwhelmed", col: 1, row: 0, tone: "critical", entityType: "api" },
                { id: "no-lb-s2", label: "Server 2", sublabel: "😴 idle", col: 1, row: 1, entityType: "api" },
                { id: "no-lb-s3", label: "Server 3", sublabel: "😴 idle", col: 1, row: 2, entityType: "api" },
              ],
              edges: [{ from: "no-lb-source", to: "no-lb-s1", tone: "critical" }],
            },
            {
              title: "With a load balancer",
              nodes: [
                { id: "lb-source", label: "1M requests/sec", col: 0, row: 1 },
                { id: "lb-node", label: "LB", col: 1, row: 1, entityType: "load_balancer" },
                { id: "lb-s1", label: "Server 1", sublabel: "~333K req/sec", col: 2, row: 0, tone: "healthy", entityType: "api" },
                { id: "lb-s2", label: "Server 2", sublabel: "~333K req/sec", col: 2, row: 1, tone: "healthy", entityType: "api" },
                { id: "lb-s3", label: "Server 3", sublabel: "~333K req/sec", col: 2, row: 2, tone: "healthy", entityType: "api" },
              ],
              edges: [
                { from: "lb-source", to: "lb-node" },
                { from: "lb-node", to: "lb-s1", tone: "healthy" },
                { from: "lb-node", to: "lb-s2", tone: "healthy" },
                { from: "lb-node", to: "lb-s3", tone: "healthy" },
              ],
            },
          ],
        },
        { kind: "paragraph", text: "Core responsibilities of a load balancer:" },
        {
          kind: "list",
          ordered: true,
          items: [
            "Traffic distribution → spread requests across servers",
            "Health checking → detect and avoid dead servers",
            "SSL termination → handle HTTPS so servers don't have to",
            "Session persistence → route the same user to the same server (when needed)",
            "Rate limiting → block abusive clients",
            "Logging & metrics → track traffic patterns",
          ],
        },
      ],
    },
    {
      id: "algorithms",
      heading: "Load balancing algorithms",
      blocks: [
        {
          kind: "paragraph",
          text: "The load balancer needs a strategy for deciding which server gets each request. Different algorithms suit different situations.",
        },
        { kind: "paragraph", text: "Algorithm 1: Round Robin. The simplest — distribute requests in order, cycling through servers." },
        {
          kind: "table",
          headers: ["Request #", "Server"],
          rows: [
            ["1", "Server 1"],
            ["2", "Server 2"],
            ["3", "Server 3"],
            ["4", "Server 1 (back to start)"],
            ["5", "Server 2"],
          ],
        },
        { kind: "paragraph", text: "Good for: servers with identical hardware and similar request types." },
        {
          kind: "paragraph",
          text: "Problem: Request 1 → Server 1 (simple API call, done in 1ms); Request 2 → Server 2 (heavy video processing, takes 30 seconds); Request 3 → Server 3 (simple call, done in 1ms); Request 4 → Server 1 (simple call, done in 1ms); Request 5 → Server 2 (heavy video, waits behind Request 2). Round Robin doesn't know Server 2 is already backed up.",
        },
        { kind: "paragraph", text: "Algorithm 2: Weighted Round Robin. Assign weights based on server capacity — more powerful servers get more requests." },
        {
          kind: "table",
          headers: ["Server", "Weight", "Capacity"],
          rows: [
            ["Server 1", "3", "16 CPU cores (powerful)"],
            ["Server 2", "2", "8 CPU cores (medium)"],
            ["Server 3", "1", "4 CPU cores (small)"],
          ],
        },
        { kind: "paragraph", text: "Distribution:" },
        {
          kind: "table",
          headers: ["Request #", "Server"],
          rows: [
            ["1", "Server 1"],
            ["2", "Server 1"],
            ["3", "Server 1"],
            ["4", "Server 2"],
            ["5", "Server 2"],
            ["6", "Server 3"],
            ["7", "Server 1 (cycle repeats)"],
          ],
        },
        { kind: "paragraph", text: "Good for: heterogeneous server fleets where servers have different capacities." },
        { kind: "paragraph", text: "Algorithm 3: Least Connections. Route each new request to the server with the fewest active connections." },
        {
          kind: "table",
          headers: ["Server", "Active connections"],
          rows: [
            ["Server 1", "150"],
            ["Server 2", "20 ← least"],
            ["Server 3", "89"],
          ],
        },
        { kind: "paragraph", text: "New request → Server 2." },
        {
          kind: "paragraph",
          text: "Good for: long-lived connections (WebSockets, streaming) where some requests take much longer than others. Round Robin blindly cycles → might send to an already-busy server. Least Connections checks actual load → always picks the least busy.",
        },
        { kind: "paragraph", text: "Algorithm 4: IP Hash (Sticky Sessions). Hash the client's IP address to determine which server handles all their requests." },
        {
          kind: "table",
          headers: ["Client IP", "Hash % 3", "Server"],
          rows: [
            ["192.168.1.100", "1", "Server 1 (always)"],
            ["10.0.0.55", "2", "Server 2 (always)"],
          ],
        },
        {
          kind: "paragraph",
          text: "Good for: when server-side state can't be moved to a shared store (legacy apps). Problem: if Server 1 goes down, all users hashed to Server 1 lose their session.",
        },
        {
          kind: "insight",
          text: "Real usage: avoid if possible. Make your app stateless instead. But useful for legacy systems during migration.",
        },
        { kind: "paragraph", text: "Algorithm 5: Least Response Time. Route to the server with the lowest combination of active connections AND response time." },
        {
          kind: "table",
          headers: ["Server", "Connections", "Avg response", "Score"],
          rows: [
            ["Server 1", "50", "200ms", "high"],
            ["Server 2", "80", "10ms", "low ← pick this"],
            ["Server 3", "30", "500ms", "medium"],
          ],
        },
        {
          kind: "paragraph",
          text: "Good for: heterogeneous workloads where response time varies significantly. Used by AWS Application Load Balancer (ALB), Nginx Plus.",
        },
        {
          kind: "table",
          headers: ["Algorithm", "Best for", "Avoid when"],
          rows: [
            ["Round Robin", "Identical servers, similar requests", "Requests vary in processing time"],
            ["Weighted Round Robin", "Different server capacities", "Dynamic load changes"],
            ["Least Connections", "Long-lived connections, variable request time", "Very short requests"],
            ["IP Hash", "Legacy stateful apps", "Server failures cause session loss"],
            ["Least Response Time", "Mixed workloads", "Simple setups (overkill)"],
          ],
        },
      ],
    },
    {
      id: "health-checks",
      heading: "Health checks — detecting dead servers",
      blocks: [
        {
          kind: "paragraph",
          text: "A load balancer continuously monitors server health. Dead servers are removed from rotation automatically.",
        },
        { kind: "paragraph", text: "Passive Health Checks — monitor actual traffic. If a server returns errors or times out, mark it unhealthy." },
        {
          kind: "flow",
          steps: [
            { title: "Request to Server 2", detail: "timeout (5 seconds)", tone: "critical" },
            { title: "LB marks Server 2 as unhealthy", tone: "signal" },
            { title: "Next requests skip Server 2" },
            { title: "After 3 consecutive failures", detail: "Server 2 removed from pool", tone: "critical" },
          ],
        },
        { kind: "paragraph", text: "Active Health Checks — the load balancer proactively pings servers at regular intervals." },
        { kind: "paragraph", text: "Every 10 seconds, GET /health:" },
        {
          kind: "architecture",
          nodes: [
            { id: "active-hc-lb", label: "LB", col: 1, row: 0, entityType: "load_balancer" },
            { id: "active-hc-s1", label: "Server 1", col: 0, row: 1, tone: "healthy", entityType: "api" },
            { id: "active-hc-s2", label: "Server 2", col: 1, row: 1, tone: "critical", entityType: "api" },
            { id: "active-hc-s3", label: "Server 3", col: 2, row: 1, tone: "healthy", entityType: "api" },
          ],
          edges: [
            { from: "active-hc-lb", to: "active-hc-s1", label: "200 OK", tone: "healthy" },
            { from: "active-hc-lb", to: "active-hc-s2", label: "timeout", tone: "critical" },
            { from: "active-hc-lb", to: "active-hc-s3", label: "200 OK", tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "Server 2 removed from rotation immediately. Users never sent to Server 2." },
        { kind: "paragraph", text: "What a health check endpoint looks like:" },
        {
          kind: "code",
          language: "java",
          code: '// Simple health check endpoint\n@GetMapping("/health")\npublic ResponseEntity<Map> health() {\n    Map<String, String> status = new HashMap<>();\n\n    boolean dbHealthy = databaseService.isConnected();\n    boolean cacheHealthy = redisService.isConnected();\n\n    if (dbHealthy && cacheHealthy) {\n        status.put("status", "UP");\n        return ResponseEntity.ok(status);\n    } else {\n        status.put("status", "DOWN");\n        status.put("database", dbHealthy ? "UP" : "DOWN");\n        status.put("cache", cacheHealthy ? "UP" : "DOWN");\n        return ResponseEntity.status(503).body(status);\n    }\n}',
        },
        {
          kind: "insight",
          text: "A good health check doesn't just verify the server is running — it verifies the server can actually do its job (connect to DB, connect to cache, etc.).",
        },
      ],
    },
    {
      id: "layer4-vs-layer7",
      heading: "Layer 4 vs Layer 7 load balancers",
      blocks: [
        {
          kind: "paragraph",
          text: "Load balancers operate at different layers of the network stack. This is a common interview topic.",
        },
        { kind: "paragraph", text: "Layer 4 (Transport Layer) Load Balancer — operates at TCP/UDP level. Doesn't look at the actual content of requests." },
        {
          kind: "list",
          items: [
            "Sees: source IP, destination IP, TCP port",
            "Does NOT see: HTTP headers, URLs, cookies",
            "Decision based on: IP + port only",
            "Speed: extremely fast (no content inspection)",
          ],
        },
        { kind: "paragraph", text: "Used for: raw TCP traffic, database connections, any non-HTTP protocol. Example: AWS Network Load Balancer (NLB)." },
        { kind: "paragraph", text: "Layer 7 (Application Layer) Load Balancer — operates at HTTP level. Can inspect request content and make intelligent routing decisions." },
        {
          kind: "list",
          items: [
            "Sees: HTTP method (GET, POST), URL path (/api/v1/orders), headers (Content-Type, Authorization), cookies, request body",
            "Decision based on: actual request content",
            "Speed: slightly slower (must parse HTTP)",
            "Power: much more flexible",
          ],
        },
        { kind: "paragraph", text: "Capabilities of a Layer 7 LB:" },
        {
          kind: "table",
          headers: ["Category", "Example rule"],
          rows: [
            ["Content-based routing", "/api/orders/* → Order Service servers"],
            ["Header-based routing", "X-API-Version: v2 → new server cluster"],
            ["A/B testing", "10% of traffic → new feature servers"],
            ["Geographic routing", "User from India → Mumbai servers"],
          ],
        },
        {
          kind: "paragraph",
          text: "Example: AWS Application Load Balancer (ALB), Nginx, HAProxy.",
        },
        {
          kind: "paragraph",
          text: "Which to use? Layer 4: raw performance, non-HTTP traffic, simple TCP routing. Layer 7: HTTP traffic, microservices routing, A/B testing, SSL termination.",
        },
        { kind: "insight", text: "In practice: almost all modern web applications use Layer 7 LBs." },
      ],
    },
    {
      id: "ssl-termination",
      heading: "SSL termination at the load balancer",
      blocks: [
        { kind: "paragraph", text: "We touched on this in Lesson 6. Let's go deeper." },
        {
          kind: "compare",
          panels: [
            {
              title: "Without SSL termination",
              nodes: [
                { id: "no-term-client", label: "Client", col: 0, row: 1, entityType: "client" },
                { id: "no-term-lb", label: "LB", col: 1, row: 1, entityType: "load_balancer" },
                { id: "no-term-s1", label: "Server 1", sublabel: "HTTPS", col: 2, row: 0, entityType: "api" },
                { id: "no-term-s2", label: "Server 2", sublabel: "HTTPS", col: 2, row: 1, entityType: "api" },
                { id: "no-term-s3", label: "Server 3", sublabel: "HTTPS", col: 2, row: 2, entityType: "api" },
              ],
              edges: [
                { from: "no-term-client", to: "no-term-lb", label: "HTTPS" },
                { from: "no-term-lb", to: "no-term-s1", label: "HTTPS" },
                { from: "no-term-lb", to: "no-term-s2", label: "HTTPS" },
                { from: "no-term-lb", to: "no-term-s3", label: "HTTPS" },
              ],
            },
            {
              title: "With SSL termination at LB",
              nodes: [
                { id: "term-client", label: "Client", col: 0, row: 1, entityType: "client" },
                { id: "term-lb", label: "LB", col: 1, row: 1, tone: "healthy", entityType: "load_balancer" },
                { id: "term-s1", label: "Server 1", sublabel: "HTTP", col: 2, row: 0, tone: "healthy", entityType: "api" },
                { id: "term-s2", label: "Server 2", sublabel: "HTTP", col: 2, row: 1, tone: "healthy", entityType: "api" },
                { id: "term-s3", label: "Server 3", sublabel: "HTTP", col: 2, row: 2, tone: "healthy", entityType: "api" },
              ],
              edges: [
                { from: "term-client", to: "term-lb", label: "HTTPS" },
                { from: "term-lb", to: "term-s1", label: "HTTP", tone: "healthy" },
                { from: "term-lb", to: "term-s2", label: "HTTP", tone: "healthy" },
                { from: "term-lb", to: "term-s3", label: "HTTP", tone: "healthy" },
              ],
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Every server must: store SSL certificates, decrypt incoming requests (CPU intensive), encrypt outgoing responses (CPU intensive), and handle certificate renewal on every server.",
        },
        {
          kind: "paragraph",
          text: "Only the LB handles SSL certificates, encryption/decryption, and certificate renewal — all in one place. Servers get plain HTTP, which is simpler and faster.",
        },
        { kind: "paragraph", text: "Benefits: servers save CPU (no encryption overhead), certificate management lives in one place, internal network traffic is plain HTTP (the internal network is trusted), and certificate rotation is easier." },
        {
          kind: "insight",
          text: "Security note: internal traffic between LB and servers is unencrypted. This is acceptable when servers are in a private VPC/network. For highly sensitive data, encrypt internal traffic too (end-to-end TLS).",
        },
      ],
    },
    {
      id: "types-in-practice",
      heading: "Types of load balancers in practice",
      blocks: [
        { kind: "paragraph", text: "Hardware Load Balancers — physical devices. Extremely fast. Extremely expensive." },
        { kind: "list", items: ["F5 Big-IP, Citrix ADC", "Cost: $50,000 – $500,000+", "Used by: banks, telecom companies, large enterprises", "Trend: being replaced by software LBs"] },
        { kind: "paragraph", text: "Software Load Balancers — run on commodity servers. Flexible and cost-effective." },
        {
          kind: "list",
          items: [
            "Nginx → most popular, also a web server and reverse proxy",
            "HAProxy → high-performance, often used for TCP load balancing",
            "Envoy → modern, used in service meshes",
            "Traefik → Kubernetes-native, auto-configures",
          ],
        },
        { kind: "paragraph", text: "Cloud Load Balancers — managed services, no maintenance overhead." },
        {
          kind: "list",
          items: [
            "AWS: ALB (Application LB, Layer 7, HTTP/HTTPS), NLB (Network LB, Layer 4, TCP/UDP), CLB (Classic LB, legacy, avoid)",
            "GCP: Cloud Load Balancing — global, anycast IP",
            "Azure: Azure Load Balancer (Layer 4), Application Gateway (Layer 7)",
          ],
        },
        { kind: "insight", text: "In interviews: always mention cloud LBs for modern systems. Shows practical knowledge." },
      ],
    },
    {
      id: "redundancy",
      heading: "Load balancer redundancy",
      blocks: [
        {
          kind: "paragraph",
          text: "Wait — if the load balancer is the single entry point, isn't it a single point of failure?",
        },
        { kind: "insight", text: "Yes. And you fix it by having multiple load balancers." },
        {
          kind: "architecture",
          nodes: [
            { id: "redundancy-dns", label: "DNS", sublabel: "returns 2 IPs", col: 1, row: 0 },
            { id: "redundancy-lb1", label: "LB 1", sublabel: "active", col: 0, row: 1, entityType: "load_balancer" },
            { id: "redundancy-lb2", label: "LB 2", sublabel: "standby", col: 2, row: 1, entityType: "load_balancer" },
            { id: "redundancy-pool", label: "Server Pool", sublabel: "S1 S2 S3", col: 1, row: 2, entityType: "api" },
          ],
          edges: [
            { from: "redundancy-dns", to: "redundancy-lb1" },
            { from: "redundancy-dns", to: "redundancy-lb2" },
            { from: "redundancy-lb1", to: "redundancy-pool" },
            { from: "redundancy-lb2", to: "redundancy-pool" },
          ],
        },
        {
          kind: "paragraph",
          text: "Active-Passive: LB1 handles all traffic. LB2 monitors LB1. If LB1 dies, LB2 takes over (failover). Brief downtime during switchover.",
        },
        {
          kind: "insight",
          text: "Active-Active: both LBs handle traffic simultaneously. DNS round-robins between them. No downtime if one fails. Used by every major company — Flipkart, Amazon, Google all run multiple load balancers in active-active configuration.",
        },
      ],
    },
    {
      id: "global-load-balancing",
      heading: "Global load balancing",
      blocks: [
        {
          kind: "paragraph",
          text: "For companies serving users worldwide, you need load balancing at a global level — not just within one datacenter.",
        },
        {
          kind: "table",
          headers: ["User region", "Datacenter"],
          rows: [
            ["Indian users", "Mumbai datacenter"],
            ["European users", "Frankfurt datacenter"],
            ["US users", "Virginia datacenter"],
          ],
        },
        {
          kind: "paragraph",
          text: "How? DNS-based global load balancing: flipkart.com resolves to different IPs based on user location (we covered this in Lesson 5 — Geo-DNS). Then within each datacenter, a standard load balancer distributes across servers.",
        },
        { kind: "paragraph", text: "This is called a two-tier load balancing architecture:" },
        { kind: "list", items: ["Tier 1: Global (DNS-based, geographic routing)", "Tier 2: Regional (standard LB within datacenter)"] },
        { kind: "paragraph", text: "AWS Global Accelerator and Cloudflare Load Balancing provide this as managed services." },
      ],
    },
    {
      id: "service-mesh",
      heading: "Load balancers in microservices — service mesh",
      blocks: [
        {
          kind: "paragraph",
          text: "In a microservices architecture, you don't just need one load balancer at the edge. Every service needs to load balance requests to other services.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "mesh-client", label: "Client", col: 0, row: 0, entityType: "client" },
            { id: "mesh-edge-lb", label: "Edge LB", col: 1, row: 0, entityType: "load_balancer" },
            { id: "mesh-order", label: "Order Service", sublabel: "x3 instances", col: 2, row: 0, entityType: "api" },
            { id: "mesh-payment", label: "Payment Service", sublabel: "x5 instances", col: 3, row: 0, entityType: "api" },
            { id: "mesh-notification", label: "Notification Service", sublabel: "x2 instances", col: 4, row: 0, entityType: "api" },
          ],
          edges: [
            { from: "mesh-client", to: "mesh-edge-lb" },
            { from: "mesh-edge-lb", to: "mesh-order" },
            { from: "mesh-order", to: "mesh-payment", label: "calls" },
            { from: "mesh-payment", to: "mesh-notification", label: "calls" },
          ],
        },
        { kind: "paragraph", text: "Each arrow needs load balancing! Solution: Service Mesh (Istio, Linkerd)." },
        {
          kind: "paragraph",
          text: "Each service gets a sidecar proxy (like Envoy) that handles load balancing between service instances, health checking, retries, circuit breaking, and metrics.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "sidecar-order", label: "Order Service", col: 0, row: 0, entityType: "api" },
            { id: "sidecar-envoy", label: "Envoy Sidecar", sublabel: "handles LB, retries, circuit breaking", col: 1, row: 0 },
            { id: "sidecar-payment", label: "Payment Service", sublabel: "instances", col: 2, row: 0, entityType: "api" },
          ],
          edges: [
            { from: "sidecar-order", to: "sidecar-envoy" },
            { from: "sidecar-envoy", to: "sidecar-payment" },
          ],
        },
        { kind: "insight", text: "For interviews: mention service mesh when discussing microservices at scale. Shows senior thinking." },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "Load balancer questions come in three forms:" },
        {
          kind: "qa",
          question: "\"How would you scale your system to handle 10x traffic?\"",
          answer:
            "\"Add more application servers behind a load balancer. Use a Layer 7 ALB for HTTP traffic with a least-connections algorithm since our requests vary in processing time. Enable health checks so dead servers are automatically removed. Terminate SSL at the load balancer to reduce server CPU overhead.\"",
        },
        {
          kind: "qa",
          question: "\"What algorithm would you use for a video streaming service?\"",
          answer:
            "\"Least connections — video streaming creates long-lived connections that transfer large amounts of data. Round Robin would be wrong because a server handling 100 active streams is far busier than one handling 10, even if they have the same number of connections in a naive count.\"",
        },
        {
          kind: "qa",
          question: "\"What's the difference between Layer 4 and Layer 7 load balancers?\"",
          answer:
            "\"Layer 4 operates at TCP level — fast but can only route based on IP and port. Layer 7 understands HTTP — can route based on URL, headers, cookies. For microservices, Layer 7 is essential because you need to route /api/orders to the orders service and /api/payments to the payment service.\"",
        },
      ],
    },
  ],
  summary:
    "A load balancer sits in front of your server pool and distributes incoming traffic using algorithms like Round Robin or Least Connections, continuously health-checks servers to remove unhealthy ones, and provides critical capabilities like SSL termination and Layer 7 content-based routing — making it the essential enabler of horizontal scaling.",
  keyTakeaways: [
    "Load balancers enable horizontal scaling — without them, you can't distribute traffic across multiple servers.",
    "Algorithm choice matters — Round Robin for uniform workloads, Least Connections for variable-length requests, IP Hash for legacy stateful apps (avoid if possible).",
    "Health checks are non-negotiable — the LB must detect and remove dead servers automatically, never route to a server that can't serve requests.",
    "Layer 7 LBs are more powerful — content-based routing, A/B testing, SSL termination. Use them for HTTP/microservices.",
    "Load balancers themselves need redundancy — active-active configuration prevents the LB from being a single point of failure.",
  ],
  exercise: {
    prompt:
      "You're designing the infrastructure for PhonePe — a payments app processing 10 million transactions/day with strict reliability requirements. Current setup: 1 load balancer (Nginx), 5 application servers, 1 PostgreSQL primary + 2 read replicas, traffic is 70% reads/30% writes, peak traffic is 10x normal during salary days (1st-5th of month). Three problems have been reported: Problem 1 — the Nginx load balancer went down for 8 minutes last month, causing a complete outage with zero transactions during that window. Problem 2 — on salary day, 3 of 5 servers get overloaded while 2 sit idle; investigation shows heavy transaction-processing requests always land on the same servers (Round Robin is in use currently). Problem 3 — the SSL certificate on the LB expired and required updating on every application server individually (5 servers, 45 minutes of work). How do you fix Problem 1? Draw the architecture. Which load balancing algorithm fixes Problem 2 — and why specifically? Problem 3 reveals an architectural mistake — what is it, and how does SSL termination at the load balancer fix it?",
  },
  relatedEntitySlugs: ["load-balancer", "reverse-proxy"],
};
