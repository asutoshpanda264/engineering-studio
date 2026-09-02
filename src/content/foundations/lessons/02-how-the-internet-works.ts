import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 2 | Topic: How the Internet Works | Phase: 1 — Foundations".
 */
export const HOW_THE_INTERNET_WORKS: FoundationLesson = {
  slug: "how-the-internet-works",
  number: 2,
  title: "How the Internet Works",
  tagline:
    "Packets can be lost, round trips cost latency, bandwidth is finite — every system design decision sits on top of these three facts.",
  estimatedMinutes: 45,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "You open Instagram on your phone and a photo loads in under a second.",
        },
        {
          kind: "paragraph",
          text: "That photo might be stored on a server in Singapore. You're sitting in Mumbai. And somehow, in ~200 milliseconds, that image travels across the world and appears on your screen.",
        },
        { kind: "paragraph", text: "How?" },
        {
          kind: "paragraph",
          text: "Most engineers just accept this as magic. We're going to demystify it — because understanding what happens in that 200ms is the foundation of every system design decision you'll ever make.",
        },
      ],
    },
    {
      id: "the-problem",
      heading: "The problem being solved",
      blocks: [
        {
          kind: "paragraph",
          text: "Computers need to talk to each other. But there are billions of them, made by different manufacturers, running different software, in different countries.",
        },
        { kind: "paragraph", text: "How do you make all of them communicate reliably?" },
        { kind: "paragraph", text: "The answer: agreed-upon rules called protocols." },
        {
          kind: "paragraph",
          text: "Think of it like language. If we both speak English, we can communicate regardless of where we're from. Protocols are the \"English\" that computers speak.",
        },
      ],
    },
    {
      id: "layers",
      heading: "The core mental model — layers",
      blocks: [
        {
          kind: "paragraph",
          text: "The internet works in layers. Each layer has one job, and it hands off to the next layer.",
        },
        { kind: "paragraph", text: "Think of sending a parcel internationally:" },
        {
          kind: "list",
          items: [
            "You write a letter → Application Layer (what you're sending)",
            "Put it in an envelope → Transport Layer (how it's packaged)",
            "Write the address on it → Network Layer (where it's going)",
            "The postal truck drives it → Physical Layer (how it physically moves)",
          ],
        },
        {
          kind: "paragraph",
          text: "The receiver does the reverse — unpacks layer by layer until they get your letter.",
        },
        {
          kind: "paragraph",
          text: "Computers do the exact same thing. This is called the TCP/IP model.",
        },
      ],
    },
    {
      id: "four-layers",
      heading: "The four layers you need to know",
      blocks: [
        {
          kind: "table",
          headers: ["Layer", "Protocol", "Job", "Real example"],
          rows: [
            ["Application", "HTTP, HTTPS, DNS", "What data is being sent", "Your Instagram request"],
            ["Transport", "TCP, UDP", "How reliably it's delivered", "Splitting data into packets"],
            ["Network", "IP", "Which route to take", "Finding the path Mumbai → Singapore"],
            ["Physical", "Ethernet, WiFi, Fiber", "Actually moving the bits", "Fiber optic cables under the ocean"],
          ],
        },
        {
          kind: "paragraph",
          text: "You don't need to memorize all protocols. You need to understand the mental model: data travels down these layers on the sender's side, and back up on the receiver's side.",
        },
      ],
    },
    {
      id: "key-players",
      heading: "The key players",
      blocks: [
        {
          kind: "paragraph",
          text: "When you type www.instagram.com and hit enter, multiple systems are involved:",
        },
        {
          kind: "flow",
          steps: [
            { title: "Your Phone" },
            { title: "Your WiFi Router" },
            { title: "Your ISP", detail: "Jio, Airtel, BSNL" },
            { title: "The Internet", detail: "a network of networks" },
            { title: "Instagram's Servers" },
          ],
        },
        { kind: "paragraph", text: "Let's zoom into each:" },
        { kind: "paragraph", text: "Your Device (Client)" },
        {
          kind: "list",
          items: [
            "Makes requests",
            "Displays responses",
            "Has an IP address — a unique number that identifies it on the network",
            "Think of IP as your home address",
          ],
        },
        { kind: "paragraph", text: "Router / ISP" },
        {
          kind: "list",
          items: [
            "Your router connects your device to your ISP",
            "Your ISP connects you to the broader internet",
            "They handle routing — figuring out the best path for your data",
          ],
        },
        { kind: "paragraph", text: "The Internet" },
        {
          kind: "list",
          items: [
            "Not one thing — it's thousands of networks connected together",
            "Data travels in small chunks called packets",
            "Packets can take different routes and reassemble at the destination",
          ],
        },
        { kind: "paragraph", text: "Instagram's Server" },
        { kind: "list", items: ["Receives your request", "Processes it", "Sends back the response (the photo, the HTML, the data)"] },
      ],
    },
    {
      id: "ip-addresses",
      heading: "IP addresses — the internet's phone book problem",
      blocks: [
        { kind: "paragraph", text: "Every device needs an address. That's an IP address." },
        {
          kind: "list",
          items: [
            "Your phone: 192.168.1.5 (private, inside your home network)",
            "Instagram's server: 157.240.241.174 (public, visible on the internet)",
          ],
        },
        { kind: "paragraph", text: "The problem: humans can't remember numbers like 157.240.241.174." },
        { kind: "paragraph", text: "We remember names like instagram.com." },
        { kind: "paragraph", text: "The solution: DNS — Domain Name System." },
        {
          kind: "paragraph",
          text: "DNS is like a phone book. You give it a name, it gives you the number (IP address).",
        },
        {
          kind: "flow",
          steps: [
            { title: "You type instagram.com" },
            { title: "DNS returns 157.240.241.174" },
            { title: "Your device connects to that IP" },
          ],
        },
        {
          kind: "paragraph",
          text: "We'll go deep on DNS in Lesson 5. For now, just know it exists and why.",
        },
      ],
    },
    {
      id: "tcp-vs-udp",
      heading: "TCP vs UDP — reliability vs speed",
      blocks: [
        { kind: "paragraph", text: "Once we know where to send data, we need to decide how to send it." },
        { kind: "paragraph", text: "Two main options:" },
        { kind: "paragraph", text: "TCP (Transmission Control Protocol)" },
        {
          kind: "list",
          items: [
            "Guarantees delivery — if a packet is lost, it resends it",
            "Ordered — packets arrive in the right sequence",
            "Slower — because of all these checks",
          ],
        },
        { kind: "paragraph", text: "Use TCP when: correctness matters" },
        { kind: "list", items: ["Loading a webpage", "Sending a WhatsApp message", "Bank transactions"] },
        { kind: "paragraph", text: "UDP (User Datagram Protocol)" },
        {
          kind: "list",
          items: ["No guarantee — fire and forget", "No ordering — packets might arrive out of order", "Faster — no overhead"],
        },
        { kind: "paragraph", text: "Use UDP when: speed matters more than perfection" },
        { kind: "list", items: ["Video calls (a dropped frame is fine, lag is not)", "Online gaming", "Live cricket scores"] },
        {
          kind: "insight",
          text: "Google Meet uses UDP for video. If a frame drops, it doesn't matter — resending it would make your call choppy. Speed > perfection.",
        },
      ],
    },
    {
      id: "packets",
      heading: "How data actually travels — packets",
      blocks: [
        {
          kind: "paragraph",
          text: "Your request doesn't travel as one big blob. It gets broken into packets — small chunks of data, typically ~1500 bytes each.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "request", label: "Your request", sublabel: "\"Send me the Instagram homepage\"", col: 1, row: 0 },
            { id: "p1", label: "Packet 1", sublabel: "\"Send me the In\"", col: 0, row: 1 },
            { id: "p2", label: "Packet 2", sublabel: "\"stagram homep\"", col: 1, row: 1 },
            { id: "p3", label: "Packet 3", sublabel: "\"age\"", col: 2, row: 1 },
          ],
          edges: [
            { from: "request", to: "p1" },
            { from: "request", to: "p2" },
            { from: "request", to: "p3" },
          ],
        },
        {
          kind: "paragraph",
          text: "Each packet travels independently — possibly taking different routes — and gets reassembled at the destination.",
        },
        {
          kind: "list",
          items: [
            "This is why the internet is resilient — one broken route doesn't stop delivery",
            "A large file download can use multiple paths simultaneously",
            "Streaming video can start playing before the full file arrives",
          ],
        },
      ],
    },
    {
      id: "full-picture",
      heading: "The full picture — what happens when you open Instagram",
      blocks: [
        {
          kind: "flow",
          steps: [
            { title: "You type instagram.com" },
            { title: "DNS lookup", detail: "\"What's the IP for instagram.com?\" → \"157.240.241.174\"" },
            { title: "Your device creates an HTTP request", detail: "GET /feed HTTP/1.1" },
            { title: "TCP breaks it into packets" },
            { title: "IP routes packets", detail: "Mumbai → Singapore (or wherever)" },
            { title: "Instagram's server receives packets", detail: "reassembles them" },
            { title: "Server processes the request", detail: "fetches your feed" },
            { title: "Server sends response back", detail: "same journey in reverse" },
            { title: "Your device receives, reassembles, renders the page" },
          ],
        },
        { kind: "paragraph", text: "All of this in ~200 milliseconds. That's the internet." },
      ],
    },
    {
      id: "why-it-matters",
      heading: "Why this matters for system design",
      blocks: [
        {
          kind: "paragraph",
          text: "Every system design decision you'll ever make sits on top of this foundation:",
        },
        {
          kind: "table",
          headers: ["Internet concept", "System design impact"],
          rows: [
            ["Packets can be lost", "Design systems that handle failures gracefully"],
            ["Round trips have latency", "Minimize the number of network calls your system makes"],
            ["Bandwidth is finite", "Compress data, use CDNs to serve content closer to users"],
            ["IP addresses are how computers find each other", "Load balancers, DNS-based routing, service discovery"],
            ["TCP guarantees ordering", "Databases use TCP; real-time games use UDP"],
          ],
        },
        {
          kind: "paragraph",
          text: "When an interviewer asks \"how would you reduce latency in your system?\" — the answer always comes back to these fundamentals.",
        },
      ],
    },
  ],
  summary:
    "The internet is a layered system where data travels as packets across networks using addresses (IP) and agreed-upon rules (protocols), with DNS translating human-readable names to machine-readable addresses — and every system design decision you make is ultimately constrained by how this underlying infrastructure behaves.",
  keyTakeaways: [
    "The internet is layers — Application → Transport → Network → Physical. Each layer has one job.",
    "IP addresses identify devices — DNS translates names to IPs. Without DNS, we'd memorize numbers.",
    "TCP = reliable, UDP = fast — choose based on whether correctness or speed matters more.",
    "Data travels as packets — they can take different routes and are reassembled at the destination. This is why the internet is resilient.",
    "Latency is real and physical — data can't travel faster than light. Distance matters. This is why CDNs exist.",
  ],
  exercise: {
    prompt:
      "You're designing a live cricket score app for 10 million users. Scores update every ball — roughly every 30 seconds. Your teammate says: \"Let's use TCP — we need reliable delivery, we can't miss a score update.\" Another teammate says: \"Let's use UDP — we need speed, TCP is too slow.\" Who is right? Or are both wrong? Think about: What happens if a score update is lost? What happens if a score arrives 2 seconds late? Does \"reliability\" mean the same thing here as it does for a bank transaction? Write your reasoning — don't worry about being right, reason through it like an engineer.",
  },
  relatedEntitySlugs: [],
  prerequisites: ["what-is-system-design"],
};
