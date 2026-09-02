import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.11 (quantization: the
 * memory/latency/accuracy dial) and §2.7 (llm_call's tier/quantization/
 * deployment-target dials) — the multipliers quoted here are
 * `src/simulation/entities/LlmCall.ts`'s own TIER_PROFILE and
 * QUANTIZATION_PROFILE tables, not invented numbers.
 */
export const QUANTIZATION_TRADEOFFS: AgenticLesson = {
  slug: "quantization-tradeoffs",
  number: 15,
  category: "inference-and-serving",
  title: "Quantization: A Trade-off Surface, Not a Toggle",
  tagline:
    "\"Just quantize it\" treats precision like an on/off switch. It's a dial with a real, measurable cost on the other end — and picking a point on that dial is a decision, not a default.",
  estimatedMinutes: 14,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "A model's weights are stored at some numeric precision — full precision is accurate but memory-hungry and slow; lower precision is smaller and faster to run, at some cost to accuracy. Quantization is the technique of deliberately storing weights at lower precision to trade accuracy for speed and memory.",
        },
        {
          kind: "insight",
          text: "The trade-off is real and directional, not a free lunch: every step down in precision buys latency and cost, and spends some accuracy. Treating it as a toggle (\"quantized\" vs. \"not\") hides that it's actually a spectrum with multiple real stopping points.",
        },
      ],
    },
    {
      id: "the-dial",
      heading: "The dial, with real numbers",
      blocks: [
        {
          kind: "paragraph",
          text: "This workshop's llm_call entity models tier (SLM vs. LLM) and quantization as two independent multiplier dials on latency and hallucination rate — none is a strictly free improvement over the one before it:",
        },
        {
          kind: "table",
          headers: ["Precision", "Latency multiplier", "Hallucination-rate multiplier"],
          rows: [
            ["None (full precision, BF16)", "1.0x — baseline", "1.0x — baseline"],
            ["FP8", "0.9x", "1.05x"],
            ["INT8", "0.75x", "1.15x"],
            ["INT4", "0.6x", "1.5x"],
          ],
        },
        {
          kind: "paragraph",
          text: "INT4 is roughly 40% faster than full precision, at 1.5x the baseline hallucination rate. Whether that trade is worth it depends entirely on what the request is for — a customer-support FAQ answer tolerates a higher error rate far more comfortably than a refund-issuing tool call does.",
        },
      ],
    },
    {
      id: "tier-vs-quantization",
      heading: "Tier and quantization are independent dials",
      blocks: [
        {
          kind: "paragraph",
          text: "Model tier (SLM vs. LLM) is a separate choice from quantization level — an SLM is 0.3x latency but 1.4x hallucination rate relative to an LLM at full precision, before any quantization is even applied. The two dials compose: a quantized SLM is the cheapest, fastest, least reliable point reachable; a full-precision, unquantized LLM is the most expensive, slowest, most reliable point.",
        },
        {
          kind: "insight",
          text: "This is exactly the surface a model_router cascade and a semantic cache both sit on top of (see the next two lessons) — quantization and tier are two of the dials the cascade decision is actually choosing between when it routes a request to the cheap path.",
        },
      ],
    },
    {
      id: "what-quantization-formats-mean",
      heading: "What the format names actually mean",
      blocks: [
        {
          kind: "list",
          items: [
            "FP8 / INT8 — 8-bit floating-point or integer weights, roughly half the memory of 16-bit, the least aggressive quantization step with the smallest accuracy hit.",
            "INT4 — 4-bit integer weights, a quarter the memory of 16-bit, the most aggressive common production setting, with the largest accuracy hit of the options here.",
            "AWQ, GGUF — specific quantization methods/file formats the industry uses to actually produce and ship these lower-precision weights; the precision level (FP8/INT8/INT4) is the trade-off, the method is how you get there.",
          ],
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Should we just quantize everything to save cost?\"",
          answer:
            "\"It depends on what each request is for, not a blanket policy — quantization buys real latency and cost savings at a real, measured hallucination-rate cost. A high-volume, low-stakes path (FAQ answers, draft summaries) is a good candidate for aggressive quantization; a path gating an irreversible action is a much worse one, and probably belongs behind a guardrail regardless of precision.\"",
        },
        {
          kind: "qa",
          question: "\"How would you decide which requests get quantized in production?\"",
          answer:
            "\"This is exactly the model_router / cascade decision from the previous lesson — quantization level and tier are two of the dials a cascade routes between per request, ideally driven by the same confidence or cost signal that decides SLM-vs-LLM, not a single global toggle applied to every request identically.\"",
        },
      ],
    },
  ],
  summary:
    "Quantization trades weight precision for speed and cost, on a real dial, not an on/off toggle: FP8 (0.9x latency, 1.05x hallucination rate), INT8 (0.75x, 1.15x), and INT4 (0.6x, 1.5x) each buy a different amount of speed for a different amount of reliability, relative to full-precision baseline. Model tier (SLM vs. LLM) is a second, independent dial on the same trade-off surface. Whether a given point on the dial is worth it depends entirely on what the request is for — the same reasoning that motivates a cascade rather than one global precision setting.",
  keyTakeaways: [
    "Quantization is a dial, not a toggle: FP8/INT8/INT4 each buy a different amount of latency reduction for a different hallucination-rate increase.",
    "The real multipliers: FP8 0.9x/1.05x, INT8 0.75x/1.15x, INT4 0.6x/1.5x, relative to full-precision baseline.",
    "Model tier (SLM vs. LLM) is a second, independent dial on the same surface, not the same thing as quantization.",
    "There is no universally-correct precision setting — the right point on the dial depends on what the request is for and what a wrong answer there costs.",
    "AWQ and GGUF are quantization methods/formats used to produce lower-precision weights; the precision level itself (FP8/INT8/INT4) is the actual trade-off being made.",
  ],
  exercise: {
    prompt:
      "You have two paths through the same agent: a high-volume FAQ-answering path, and a low-volume path that drafts the exact wording of a refund confirmation sent to a customer. Before reading further: would you set the same quantization level on both, and why or why not?",
    guidance: [
      {
        kind: "paragraph",
        text: "No — this is precisely the case for two different points on the dial. The FAQ path is high-volume and low-stakes: INT4's latency/cost win is worth its higher hallucination rate, because a wrong FAQ answer is cheap to be wrong about and easy to catch.",
      },
      {
        kind: "paragraph",
        text: "The refund-confirmation path is low-volume and higher-stakes — the cost of an INT4-induced hallucination (a wrong dollar amount, a wrong policy claim) is disproportionate to the latency it would save. Full precision, or at most FP8, is the right call there, ideally still behind a guardrail_validator regardless of precision level — quantization reduces reliability, it doesn't replace a check.",
      },
    ],
  },
  relatedEntitySlugs: ["llm-call"],
};
