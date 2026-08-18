import type { FoundationLesson } from "../types";

/**
 * Source: Alex Xu, "System Design Interview" Vol. 1, Chapter 2
 * ("Back-of-the-Envelope Estimation") and Chapter 3 ("A Framework for
 * System Design Interviews") — the latency-numbers table, the Twitter
 * worked example, the 4-step framework, and its time budget are all drawn
 * from those chapters. Structural template borrowed from
 * `src/content/lld/lessons/05-lld-interview-approach.ts` (the LLD track's
 * equivalent "how to run the interview" lesson) — this is the missing HLD
 * counterpart.
 */
export const ESTIMATION_AND_INTERVIEW_FRAMEWORK: FoundationLesson = {
  slug: "estimation-and-interview-framework",
  number: 20,
  title: "Back-of-the-Envelope Estimation & the HLD Interview Framework",
  tagline:
    "The math you do out loud in the first ten minutes decides whether the rest of the round even matters — QPS, storage, and a four-step script for spending 45 minutes like they're finite.",
  estimatedMinutes: 55,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Every lesson so far in this course taught a component — a database, a cache, a queue. This lesson teaches neither a component nor a technique. It teaches the two things that decide whether all that knowledge actually shows up in a 45-minute interview: doing capacity math fast enough that it doesn't eat your whole clock, and running a process specific enough that you never sit there wondering what to do next.",
        },
        {
          kind: "insight",
          text: "Jeff Dean, Google Senior Fellow: \"back-of-the-envelope calculations are estimates you create using a combination of thought experiments and common performance numbers to get a good feel for which designs will meet your requirements.\" The goal isn't a precise number — it's a fast, defensible one that tells you whether your design is in the right order of magnitude.",
        },
      ],
    },
    {
      id: "latency-numbers",
      heading: "Latency numbers every engineer should know",
      blocks: [
        {
          kind: "paragraph",
          text: "You can't reason about where time goes in a system without a rough feel for how operations compare. These are Jeff Dean's widely-cited numbers (2010, still the right order of magnitude today) — the conclusions matter more than memorizing exact values: memory is fast, disk is slow, avoid disk seeks, and a cross-region round trip costs roughly 300x a same-datacenter one.",
        },
        {
          kind: "table",
          headers: ["Operation", "Typical latency"],
          rows: [
            ["L1 cache reference", "~0.5 ns"],
            ["Main memory (RAM) reference", "~100 ns"],
            ["Round trip within the same datacenter", "~0.5 ms"],
            ["Read 4KB randomly from SSD", "~150 µs"],
            ["Disk seek", "~10 ms"],
            ["Packet round trip, cross-region (e.g. US ↔ Europe)", "~150 ms"],
          ],
        },
        {
          kind: "insight",
          text: "The two comparisons worth internalizing: RAM is about 100,000x faster than a disk seek, and a cross-region round trip is about 300x a same-datacenter one. That's the entire justification for caching (Lesson 14) and for placing replicas/CDN edges (Lessons 12, 18) close to users — this table is where those design decisions actually come from, not intuition.",
        },
      ],
    },
    {
      id: "estimation-workflow",
      heading: "The estimation workflow — QPS, storage, bandwidth",
      blocks: [
        {
          kind: "paragraph",
          text: "Almost every capacity estimate in an interview is built from the same three formulas, applied to whatever the prompt gives you:",
        },
        {
          kind: "list",
          items: [
            "QPS (average) = actions per user per day × daily active users ÷ 86,400 seconds",
            "QPS (peak) = average QPS × a peak multiplier (2-3x is a reasonable default absent better data — traffic isn't flat across a day)",
            "Storage = size per record × records per day × retention period",
            "Bandwidth = QPS × average payload size",
          ],
        },
        {
          kind: "table",
          headers: ["Unit", "Bytes"],
          rows: [
            ["1 KB", "1,024 bytes"],
            ["1 MB", "1,024 KB"],
            ["1 GB", "1,024 MB"],
            ["1 TB", "1,024 GB"],
            ["1 PB", "1,024 TB"],
          ],
        },
        {
          kind: "insight",
          text: "Round aggressively. \"99,987 ÷ 9.1\" becomes \"100,000 ÷ 10\" — precision isn't the point, and an interviewer watching you grind through exact arithmetic is watching you waste their clock. Say your assumptions and units out loud as you go (\"let's say 500KB per photo\" — not silent scribbling), and write down every assumption, since you'll reuse it later in the design.",
        },
      ],
    },
    {
      id: "worked-prompt-photo-app",
      heading: "Worked prompt 1 — \"Design for 10 million DAU\"",
      blocks: [
        {
          kind: "paragraph",
          text: "A photo-sharing app. Assumptions (state these out loud before computing anything): 10 million daily active users (DAU), each user posts 1 photo/day on average, each user views 20 photos/day, average photo size 500KB, 5-year retention.",
        },
        {
          kind: "table",
          headers: ["Metric", "Formula", "Result"],
          rows: [
            ["Write QPS (avg)", "10M × 1 ÷ 86,400", "~116"],
            ["Write QPS (peak, ×3)", "116 × 3", "~350"],
            ["Read QPS (avg)", "10M × 20 ÷ 86,400", "~2,315"],
            ["Read QPS (peak, ×2)", "2,315 × 2", "~4,630"],
            ["Storage per day", "10M × 1 × 500KB", "~4.7 TB/day"],
            ["Storage over 5 years", "4.7 TB × 365 × 5", "~8.3 PB"],
          ],
        },
        {
          kind: "insight",
          text: "Notice the read:write ratio falls out for free — roughly 20:1 here — and it's not a throwaway number. It's the concrete justification for read replicas and a caching layer being in your high-level design at all (Lesson 12's \"Instagram: 99% reads, 1% writes\" claim is exactly this kind of estimate, just with different assumptions).",
        },
      ],
    },
    {
      id: "worked-prompt-iot",
      heading: "Worked prompt 2 — \"Design for X writes/sec\"",
      blocks: [
        {
          kind: "paragraph",
          text: "An IoT sensor-ingestion pipeline. Assumptions: 500,000 devices, each sends a 200-byte reading every 10 seconds, 1-year retention, no reads modeled (a downstream analytics pipeline consumes separately).",
        },
        {
          kind: "table",
          headers: ["Metric", "Formula", "Result"],
          rows: [
            ["Write QPS", "500,000 ÷ 10", "50,000/sec"],
            ["Ingest bandwidth", "50,000 × 200 bytes", "10 MB/sec"],
            ["Storage per day", "10 MB/sec × 86,400 sec", "~864 GB/day"],
            ["Storage over 1 year", "864 GB × 365", "~315 TB"],
          ],
        },
        {
          kind: "paragraph",
          text: "50,000 constant writes/sec with no read traffic to speak of is a completely different shape of problem than Prompt 1 — it's exactly the profile Lesson 16 (Message Queues) and Lesson 17 (Kafka) exist for: absorb a steady high-volume write stream, let consumers process at their own pace. The estimate is what tells you to reach for that shape of design instead of a plain load-balanced API tier.",
        },
      ],
    },
    {
      id: "worked-prompt-twitter",
      heading: "Worked prompt 3 — Twitter QPS and media storage",
      blocks: [
        {
          kind: "paragraph",
          text: "The book's own worked example (numbers are illustrative, not Twitter's real figures). Assumptions: 300 million monthly active users (MAU), 50% are daily active, users post 2 tweets/day on average, 10% of tweets contain media averaging 1MB, 5-year retention.",
        },
        {
          kind: "table",
          headers: ["Metric", "Formula", "Result"],
          rows: [
            ["DAU", "300M × 50%", "150 million"],
            ["Tweet QPS (avg)", "150M × 2 ÷ 86,400", "~3,500"],
            ["Tweet QPS (peak, ×2)", "3,500 × 2", "~7,000"],
            ["Media storage per day", "150M × 2 × 10% × 1MB", "~30 TB/day"],
            ["Media storage over 5 years", "30 TB × 365 × 5", "~55 PB"],
          ],
        },
        {
          kind: "insight",
          text: "All three worked prompts used the exact same three formulas from the previous section — only the assumptions changed. That's the actual skill being tested: not memorizing formulas, but translating a vague prompt into a short list of stated assumptions fast enough to leave 35+ minutes for the actual design.",
        },
      ],
    },
    {
      id: "four-step-framework",
      heading: "The 4-step interview framework",
      blocks: [
        {
          kind: "flow",
          steps: [
            { title: "1. Understand the problem, establish scope", detail: "clarifying questions, explicit assumptions — 3-10 min" },
            { title: "2. Propose a high-level design, get buy-in", detail: "boxes on a whiteboard, sanity-checked against your estimate — 10-15 min" },
            { title: "3. Design deep dive", detail: "1-2 components, at the depth the interviewer steers you toward — 10-25 min" },
            { title: "4. Wrap up", detail: "bottlenecks, tradeoffs, what changes at 10x scale — 3-5 min" },
          ],
        },
        {
          kind: "paragraph",
          text: "That time budget assumes a 45-minute round and is a rough guide, not a script — a good interviewer interrupts with follow-ups at any point, and that's a sign of engagement, not that you're behind.",
        },
        {
          kind: "table",
          headers: ["Step", "What a good answer sounds like", "What a bad answer sounds like"],
          rows: [
            [
              "1. Scope",
              "\"Is this a mobile app, web app, or both? What's the DAU? Should the feed be reverse-chronological or ranked?\" — then a short explicit in/out-of-scope list",
              "Silence, followed by drawing boxes for a design nobody asked for",
            ],
            [
              "2. High-level design",
              "Client → API → cache/DB boxes, narrated while drawing, with a QPS/storage estimate to sanity-check the shape (\"at ~5K QPS peak, one Postgres primary plus read replicas covers this\")",
              "A wall of boxes drawn in silence, no numbers mentioned anywhere, no pause for interviewer feedback",
            ],
            [
              "3. Deep dive",
              "Following the interviewer's steer into 1-2 components (\"let's go deep on how news feed generation actually works\"), naming the real tradeoff at that layer",
              "Grinding through EdgeRank-level algorithm detail on a component the interviewer never asked about, burning the clock",
            ],
            [
              "4. Wrap-up",
              "\"The single point of failure here is X; at 10x scale, Y becomes the bottleneck and I'd shard by Z\" — offered unprompted",
              "\"I think this design is basically perfect\" — no bottleneck, no tradeoff, nothing left to improve",
            ],
          ],
        },
      ],
    },
    {
      id: "common-failure-modes",
      heading: "Common failure modes",
      blocks: [
        {
          kind: "table",
          headers: ["Failure mode", "What it signals to the interviewer"],
          rows: [
            ["Diving into deep-dive before requirements are clear", "You designed for assumptions the interviewer never confirmed — the rest of the round is built on a guess"],
            ["Long silence while doing capacity math", "The interviewer can't tell if you're thinking or stuck — narrate the math as you do it, even roughly"],
            ["No capacity numbers mentioned anywhere in the design", "Unclear whether one server or one thousand servers would satisfy this design — the interviewer can't tell if you understand the scale you're building for"],
            ["No tradeoffs stated, ever", "Reads as not knowing the alternatives, or as design purity divorced from real constraints — every real choice (SQL vs NoSQL, strong vs eventual consistency) has a cost you should be able to name"],
          ],
        },
        {
          kind: "insight",
          text: "Every one of these maps to skipping a step in the framework above, not to a missing fact. The framework existing at all is precisely so you don't have to improvise structure while also solving the actual problem under time pressure.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Why bother with capacity estimation at all — doesn't it just eat time you could spend on the design?\"",
          answer:
            "\"It's what tells you which design is even appropriate. A single Postgres instance with a read replica is a fine answer at 5,000 QPS and a wrong one at 500,000 — without the estimate, both answers sound equally plausible on a whiteboard. Spending 5 minutes on it up front is what prevents spending the other 40 defending a design sized for the wrong order of magnitude.\"",
        },
        {
          kind: "qa",
          question: "\"The interviewer gave me a vague prompt like 'design Instagram.' Where do I even start?\"",
          answer:
            "\"Step 1, not step 2 — I wouldn't draw anything yet. I'd ask what's actually in scope (just the feed? DMs too? uploads?), roughly how many users, and whether feed ordering is chronological or ranked. Those answers change the entire design, so getting them wrong at minute 2 is far more expensive than asking what feels like an obvious question.\"",
        },
        {
          kind: "qa",
          question: "\"How precise does the math actually need to be?\"",
          answer:
            "\"Not very — order of magnitude is the bar. 116 QPS rounds to 'about 100'; what matters is that it's closer to 100 than to 100,000, because that's what decides whether a single server, a load-balanced pool, or a sharded fleet is the right shape of answer. I'd rather say '100,000 divided by 10' out loud and move on than spend two minutes getting '99,987 divided by 9.1' exactly right.\"",
        },
      ],
    },
  ],
  summary:
    "Back-of-the-envelope estimation turns a vague prompt into concrete QPS, storage, and bandwidth numbers using three formulas (QPS from daily actions ÷ 86,400 with a peak multiplier, storage from record size × count × retention, bandwidth from QPS × payload size) — precision doesn't matter, order of magnitude does, and the numbers are what justify design choices like caching, read replicas, or a queue-backed ingestion pipeline instead of just asserting them. Layered on top, the 4-step interview framework (scope → high-level design → deep dive → wrap-up) paces a 45-minute round so requirements are locked before a line is drawn, the design is sanity-checked against the estimate, the deep dive follows the interviewer's actual interest, and the wrap-up proactively names bottlenecks and tradeoffs instead of claiming the design is finished.",
  keyTakeaways: [
    "Three formulas cover almost every estimate: QPS = daily actions ÷ 86,400 (×2-3 for peak); storage = record size × count × retention; bandwidth = QPS × payload size.",
    "Memory is ~100,000x faster than a disk seek, and a cross-region round trip is ~300x a same-datacenter one — this is the actual justification for caching and for placing replicas/edges near users, not just intuition.",
    "Round aggressively and narrate as you go — precision isn't the point, and silence while doing math reads as being stuck, not as thinking.",
    "The 4-step framework: understand & scope (3-10 min) → high-level design (10-15 min) → deep dive (10-25 min) → wrap-up (3-5 min), for a 45-minute round — a rough guide the interviewer's own follow-ups will reshape, not a rigid script.",
    "Every common failure mode (jumping to deep-dive early, no numbers ever mentioned, no tradeoffs stated, claiming the design is perfect) maps back to skipping one framework step, not to a missing fact.",
  ],
  exercise: {
    prompt:
      "You're asked to \"design a URL shortener\" and told: 100 million new URLs created per month, a 100:1 read:write ratio (redirects far outnumber creations), and shortened URLs should remain valid for 10 years. (1) Estimate average and peak write QPS, average and peak read QPS, and total storage after 10 years assuming each stored record (short code + original URL + metadata) averages 500 bytes. (2) State your peak multiplier assumption explicitly and justify it — is 2x reasonable for redirect traffic, or should it be higher? (3) Walk through what a good vs. bad Step 1 (scope) exchange would sound like for this exact prompt, listing at least 3 clarifying questions worth asking before any design work starts. (4) Name one bottleneck this design will hit at 10x the stated scale, and what you'd change.",
  },
  relatedEntitySlugs: [],
};
