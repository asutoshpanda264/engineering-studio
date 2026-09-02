import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.12 (serving mechanics — why latency
 * isn't a flat number), §1.13 (caching/cost economics, output-vs-input
 * token pricing), and §2.6-2.7 (what stays simulated, and the tier/
 * quantization/deployment dials `llm_call` will carry once it lands on
 * canvas). Deliberately honest about what's conceptual-only right now vs.
 * what a later phase of this track builds hands-on, same "scope note"
 * instinct `lld/lessons/01-what-is-lld.ts` used for its own track.
 */
export const LLM_CALL_AS_A_PRIMITIVE: AgenticLesson = {
  slug: "llm-call-as-a-primitive",
  number: 2,
  category: "fundamentals",
  title: "The LLM Call as a Primitive",
  tagline:
    "Every agent pattern is built out of one repeated unit: a call to a model that costs money, takes time, and sometimes returns the wrong thing. Understand that unit first.",
  estimatedMinutes: 20,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "In the Workshop's existing HLD domain, the API Server is the unit everything is built from — every pattern (load balancing, caching, replication) is really a story about how requests reach and flow through API Server instances. In this track, that same load-bearing role belongs to the LLM call.",
        },
        {
          kind: "paragraph",
          text: "It's tempting to treat a call to a model as a black box: prompt goes in, answer comes out, and the interesting engineering happens somewhere else — in the orchestration logic around it. That's backwards. The call itself has real, measurable properties that shape everything built on top of it: latency, token cost, and a non-zero chance of returning something malformed or simply wrong.",
        },
        {
          kind: "insight",
          text: "An llm_call is not fundamentally different from a Database entity's processing-time config in this project's existing simulation model — a distribution of outcomes (latency, cost, failure) that other components have to account for, not a guaranteed instant answer.",
        },
      ],
    },
    {
      id: "what-varies",
      heading: "What actually varies from one call to the next",
      blocks: [
        {
          kind: "paragraph",
          text: "Three dials, independent of each other, shape a real llm_call's cost/latency/quality trade-off:",
        },
        {
          kind: "table",
          headers: ["Dial", "Range", "What it trades"],
          rows: [
            ["Model tier", "SLM (0.5B-14B params) vs. LLM", "Speed & cost vs. raw capability — an SLM gives roughly 90% of an LLM's functionality at roughly 10% of the cost."],
            ["Quantization", "None (BF16) / FP8 / INT8 / INT4", "Memory & cost down, latency down, accuracy-risk up — FP8/INT8 is production-ready today with minimal loss; INT4 pushes further but starts measurably biting."],
            ["Deployment target", "Cloud vs. Edge", "Edge removes network round-trip latency entirely (sub-20ms token generation vs. 200-500ms for a cloud round trip) but caps which model tier is even usable — edge hardware can't hold a full-size LLM."],
          ],
        },
        {
          kind: "paragraph",
          text: "None of these is a free win. A quantized, edge-deployed SLM is dramatically cheaper and faster than a cloud LLM at full precision — and it will get harder questions wrong more often. That's a real trade-off surface, the same shape as choosing round-robin vs. least-connections on a Load Balancer: there's no single dominant choice, only a trade-off you make deliberately for your workload.",
        },
      ],
    },
    {
      id: "cost-shape",
      heading: "Why cost isn't just 'tokens × price'",
      blocks: [
        {
          kind: "paragraph",
          text: "One detail that's easy to miss and expensive to ignore: output tokens cost 3-8x what input tokens cost. An agent that reads a lot of context and answers in one short sentence pays a structurally different price than one that reasons verbosely — a long chain-of-thought before a short final answer can dominate the bill even though the input context was much larger in raw token count.",
        },
        {
          kind: "paragraph",
          text: "The baseline is also moving fast regardless of any single design choice: frontier-equivalent inference cost has fallen roughly 1,000x in three years (about $20 per million tokens in late 2022 to roughly $0.40 per million tokens in 2026), with open-weight hosted APIs running $0.07-$0.90 per million tokens. Cost-per-call is a moving target, not a fixed constant — which is exactly why this track's cost metric (a later Production-category lesson covers it) is designed to be computed from live config, not hardcoded.",
        },
      ],
    },
    {
      id: "load-dependent-latency",
      heading: "Latency is a function of load, not a flat number",
      blocks: [
        {
          kind: "paragraph",
          text: "It's tempting to model an LLM call's latency as one fixed number — \"this call takes 800ms.\" Real inference serving doesn't work that way. Production serving stacks batch requests at the iteration level (a finished request's slot gets backfilled by a new one immediately, instead of the whole batch waiting for its slowest member), which is why throughput scales sub-linearly with concurrent requests rather than linearly, and why an individual call's latency creeps up as concurrent load rises.",
        },
        {
          kind: "insight",
          text: "This is the same admit → queue → reject shape this project's simulation engine already models for a Database or API Server under load — llm_call is designed to reuse that exact mechanism once it lands on canvas, rather than inventing new queueing logic for a domain that turns out to need the same one.",
        },
      ],
    },
    {
      id: "scope-note",
      heading: "What's conceptual right now, and what's coming",
      blocks: [
        {
          kind: "paragraph",
          text: "Everything above is written content for now — there's no llm_call node on the canvas yet to actually configure a tier, a quantization level, or a deployment target and watch the cost readout change. That hands-on primitive is the very next phase of this track (see `docs/Agentic_AI.md`'s roadmap), and it's designed from the start to reuse this project's existing deterministic simulation engine rather than faking numbers in a UI.",
        },
        {
          kind: "paragraph",
          text: "No real model calls happen anywhere in this project, now or later — an llm_call's latency, cost, and failure rate are configurable synthetic distributions, the same way a Database entity's processing time is today. What's real is the consequence: watching cost balloon because every sub-task spawns a fresh call instead of batching is a genuine, measurable outcome of a genuine, if simplified, mechanic — not a scripted animation.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Why would anyone deliberately choose a lower-precision model?\"",
          answer:
            "\"Because the accuracy loss is often small and the cost/latency win is large — FP8 gives roughly 4x memory reduction with minimal accuracy loss, which is why it's the recommended first thing to reach for in production. It only becomes a real risk at INT4, where measured accuracy drops range from -0.6% to -6.2% depending on the model — a deliberate trade-off, not free lunch.\"",
        },
        {
          kind: "qa",
          question: "\"Is a smaller model just a worse model?\"",
          answer:
            "\"No — it's a different design philosophy. Small Language Models prioritize data quality and architectural efficiency over raw parameter count, purpose-built to run on hardware a frontier LLM never will: consumer devices, mobile NPUs, edge SoCs. The right mental model is 'right-sized for the task,' not 'a compressed version of a real model.'\"",
        },
      ],
    },
  ],
  summary:
    "The LLM call is this track's foundational primitive — an atomic unit with real cost, latency, and reliability properties, not a black box. Model tier, quantization, and deployment target are three independent dials that trade capability against cost/latency/risk, output tokens cost several times what input tokens cost, and latency itself should scale with concurrent load the same way this project already models it for a Database. All of it stays a configurable synthetic distribution — no real model calls happen anywhere in this project — but the consequences of misconfiguring it are real and measurable.",
  keyTakeaways: [
    "An llm_call has real, measurable properties — latency, token cost, failure rate — it's not a black box the interesting engineering happens around.",
    "Model tier, quantization, and deployment target are three independent trade-off dials, not one 'fast mode' toggle.",
    "Output tokens cost 3-8x input tokens — an agent that reasons verbosely pays a structurally different price than one that answers briefly.",
    "Latency should be a function of concurrent load, not a flat config value, reusing this project's existing admit-queue-reject simulation shape.",
    "No real model calls happen in this project, now or later — llm_call's behavior is a configurable synthetic distribution, same as Database's processing time today.",
  ],
  exercise: {
    prompt:
      "A team is deciding between two configurations for a high-volume customer-support agent: (A) a cloud LLM at full precision for every request, or (B) an edge-deployed, INT8-quantized SLM that escalates only uncertain cases to option A. Before reading further, write down one scenario where (A) is clearly the right call despite the cost, and one metric you'd actually want to measure — not guess at — before shipping (B).",
    guidance: [
      {
        kind: "paragraph",
        text: "(A) is the right call when the task genuinely needs frontier-level reasoning on every request and the volume is low enough that cost isn't the binding constraint — e.g. a small number of high-stakes legal-document reviews, where an SLM's lower accuracy ceiling is a real risk, not a rounding error.",
      },
      {
        kind: "paragraph",
        text: "For (B), the metric worth measuring rather than assuming is the actual accuracy delta the INT8 quantization introduces on your specific workload, not a generic benchmark number — measured drops vary from roughly -0.6% to -6.2% depending on model and technique, which is a wide enough range that 'INT8 is fine' isn't a safe assumption without checking it on your own data.",
      },
    ],
  },
  relatedEntitySlugs: ["llm-call"],
};
