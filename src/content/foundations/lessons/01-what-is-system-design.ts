import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 1 | Topic: What is System Design? | Phase: 1 — Foundations".
 * Transcribed closely — original framing, examples (Flipkart/WhatsApp/Indian
 * placement interviews) and structure kept intact per the adapt-closely
 * decision in this module's own build notes.
 *
 * One addition beyond the transcript: the single "insight" block in the
 * "hld-vs-lld" section pointing at `/lld` — this lesson's own line ("Most
 * online resources ignore LLD... we won't either") is the promise the
 * `/lld` module now keeps, so it earned a direct pointer once that module
 * existed. Everything else in this file is unmodified transcript.
 */
export const WHAT_IS_SYSTEM_DESIGN: FoundationLesson = {
  slug: "what-is-system-design",
  number: 1,
  title: "What is System Design?",
  tagline:
    "There is no single correct answer in system design — only better and worse trade-offs you can justify.",
  estimatedMinutes: 30,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        { kind: "paragraph", text: "Imagine you're building WhatsApp." },
        {
          kind: "paragraph",
          text: "On day 1, you write some code, put it on your laptop, and your friend connects. Works great.",
        },
        {
          kind: "paragraph",
          text: "Now imagine 500 million people use it simultaneously. Your laptop catches fire. 😅",
        },
        {
          kind: "paragraph",
          text: "System design is the set of decisions you make so your application doesn't catch fire at scale.",
        },
        {
          kind: "paragraph",
          text: "Every decision has a cost. Every shortcut eventually breaks. System design is about making conscious trade-offs instead of accidental ones.",
        },
      ],
    },
    {
      id: "the-problem",
      heading: "What problem does it solve?",
      blocks: [
        {
          kind: "paragraph",
          text: "Without system design thinking, here's what happens in real companies:",
        },
        {
          kind: "flow",
          steps: [
            { title: "Day 1 — 10 users", detail: "works fine on one server" },
            { title: "Day 30 — 10,000 users", detail: "server gets slow" },
            { title: "Day 60 — 1M users", detail: "server crashes", tone: "critical" },
            { title: "Day 90", detail: "engineers panic, rewrite everything at 3am", tone: "critical" },
            { title: "Day 120", detail: "company loses crores, engineers quit", tone: "critical" },
          ],
        },
        {
          kind: "paragraph",
          text: "This is not hypothetical. This happened to Twitter, Friendster, early Flipkart.",
        },
        { kind: "paragraph", text: "System design is how you prevent that story." },
      ],
    },
    {
      id: "hld-vs-lld",
      heading: "HLD vs LLD — the two sides",
      blocks: [
        {
          kind: "paragraph",
          text: "System design has two halves. Both are tested in Indian placements.",
        },
        {
          kind: "paragraph",
          text: "High-Level Design (HLD) — \"What boxes do we need, and how do they talk to each other?\"",
        },
        {
          kind: "list",
          items: [
            "Which databases?",
            "Do we need a cache?",
            "How do we handle 10 million users?",
            "Where does the code live?",
          ],
        },
        { kind: "paragraph", text: "Think of it as architecture — the blueprint of a building." },
        {
          kind: "paragraph",
          text: "Low-Level Design (LLD) — \"How do we actually write the code inside those boxes?\"",
        },
        {
          kind: "list",
          items: [
            "What classes do we need?",
            "How do they relate?",
            "Which design patterns apply?",
            "How do we keep it maintainable?",
          ],
        },
        { kind: "paragraph", text: "Think of it as interior design — what goes inside each room." },
        {
          kind: "paragraph",
          text: "Most online resources ignore LLD. Indian companies don't. We won't either.",
        },
        {
          kind: "insight",
          text: "This course covers HLD — the boxes and how they talk. This project's own LLD track lives separately, at /lld: OOP, SOLID, UML, design patterns, and case studies like Parking Lot and LRU Cache, worked in the same depth as everything here.",
        },
      ],
    },
    {
      id: "why-companies-ask",
      heading: "Why do companies ask this?",
      blocks: [
        {
          kind: "paragraph",
          text: "Here's the honest truth from someone who's been on both sides of the table: companies don't ask system design to test your knowledge. They test your judgment.",
        },
        { kind: "paragraph", text: "They want to know:" },
        {
          kind: "list",
          items: [
            "Can you break a vague problem into concrete pieces?",
            "Do you know when to optimize and when not to?",
            "Can you explain trade-offs like an engineer, not a student?",
            "Will you panic or think clearly under ambiguity?",
          ],
        },
        {
          kind: "insight",
          text: "There is no single correct answer in system design. There are only better and worse trade-offs — and your job is to justify your choices.",
        },
      ],
    },
    {
      id: "good-system",
      heading: "What makes a good system?",
      blocks: [
        {
          kind: "paragraph",
          text: "Every system you'll ever design is trying to balance these properties:",
        },
        {
          kind: "table",
          headers: ["Property", "What it means", "Real example"],
          rows: [
            ["Scalability", "Handle more users without breaking", "Instagram scaling from 1M → 1B users"],
            ["Reliability", "Keep working even when things fail", "WhatsApp working during server crashes"],
            ["Availability", "Always accessible", "Google Search being up 99.99% of the time"],
            ["Performance", "Fast responses", "Amazon checkout under 100ms"],
            ["Maintainability", "Easy to change and extend", "Netflix deploying 100 times a day"],
            ["Cost efficiency", "Don't burn money unnecessarily", "Startups using fewer, smarter servers"],
          ],
        },
        { kind: "paragraph", text: "The hard part? These properties conflict with each other." },
        {
          kind: "paragraph",
          text: "More reliability often means more cost. More performance often means more complexity. Your job as a designer is to find the right balance for the specific problem.",
        },
      ],
    },
    {
      id: "interview-format",
      heading: "How Indian placement interviews work",
      blocks: [
        {
          kind: "paragraph",
          text: "Here's what a typical 45-minute system design round looks like at companies like Flipkart, Uber, or Microsoft India:",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "0–5 min: Clarify requirements (what exactly are we building?)",
            "5–15 min: High-level design (draw the boxes)",
            "15–30 min: Deep dives (databases, scaling, caching)",
            "30–40 min: LLD (class design, patterns)",
            "40–45 min: Your questions to them",
          ],
        },
        {
          kind: "paragraph",
          text: "Most candidates fail in the first 5 minutes — they jump to drawing boxes without understanding what they're building. We'll fix that habit before it forms.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "paragraph",
          text: "When an interviewer says \"Design Instagram\", they're not expecting you to design all of Instagram. They're watching:",
        },
        {
          kind: "list",
          items: [
            "Do you ask clarifying questions?",
            "Do you make reasonable assumptions?",
            "Do you know what to build first vs. what to defer?",
            "Can you explain why you made each choice?",
          ],
        },
        {
          kind: "insight",
          label: "The magic phrase in every interview",
          text: "\"I'm going to start with a simple design that works, and then we'll identify where it breaks and improve it.\"",
        },
        {
          kind: "paragraph",
          text: "This shows engineering maturity. Juniors design the \"perfect\" system. Senior engineers start simple and evolve.",
        },
      ],
    },
  ],
  summary:
    "System design is the discipline of making conscious, justified trade-offs so your application works reliably at scale — and Indian placements test both the architecture (HLD) and code-level design (LLD) aspects of this.",
  keyTakeaways: [
    "System design = trade-offs, not \"correct answers.\" There is no perfect system.",
    "HLD and LLD are both tested heavily in Indian product company interviews — don't skip LLD.",
    "Start simple, then scale — this is how real engineers think, and interviewers reward this mindset.",
    "The goal is judgment, not memorization. Can you justify why you made a choice?",
  ],
  exercise: {
    prompt:
      "You're a new engineer at Flipkart. Your manager says: \"Our product search is slow. Users are complaining. Fix it.\" Without using any technical terms you don't know yet — just using common sense — write down 3 questions you would ask before writing a single line of code or drawing any diagram. Think like an engineer, not a student: what do you need to know before you can solve this?",
  },
};
