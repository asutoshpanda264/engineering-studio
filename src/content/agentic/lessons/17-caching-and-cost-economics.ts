import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.13 (caching and cost economics)
 * and §2.9 (caching composes with existing infrastructure — no new
 * cache entity: llm_call's own prompt-cache discount, plus Cache's
 * "semantic" CachingMode). Real numbers throughout are quoted directly
 * from §1.13, not invented.
 */
export const CACHING_AND_COST_ECONOMICS: AgenticLesson = {
  slug: "caching-and-cost-economics",
  number: 17,
  category: "inference-and-serving",
  title: "Caching and Cost Economics",
  tagline:
    "Prompt caching and semantic caching get confused constantly, and they do genuinely different jobs — one makes a call cheaper, the other skips the call entirely.",
  estimatedMinutes: 15,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Two caching layers show up in every serious cost-optimization conversation about LLM systems, and they're frequently used as if they were the same idea. They aren't — knowing which one you're reaching for changes what it can actually do for you.",
        },
      ],
    },
    {
      id: "prompt-caching",
      heading: "Prompt caching — makes a call cheaper",
      blocks: [
        {
          kind: "paragraph",
          text: "Provider-side (OpenAI/Anthropic-style): the provider caches a previously-seen prompt prefix server-side and bills the cached portion at roughly 1/10th price on a repeat call that shares that prefix. It reduces the cost of a call that still happens — the model still runs, generation still occurs, only the priced-in cost of re-processing an already-seen prefix drops.",
        },
        {
          kind: "paragraph",
          text: "In this workshop, llm_call models this directly as a promptCacheHitRate config that discounts the priced cost of a fraction of calls — it doesn't skip processing, it changes what that processing is billed at.",
        },
      ],
    },
    {
      id: "semantic-caching",
      heading: "Semantic caching — skips the call entirely",
      blocks: [
        {
          kind: "paragraph",
          text: "A similarity-matched response is served for a semantically-equivalent query, and the model call never happens at all. This is Cache's own \"semantic\" mode in this workshop, composing directly with the existing cache-aside infrastructure rather than being a bespoke new entity: \"exact\" mode answers a hit only when the literal key matches, \"semantic\" mode answers a hit when a semantically-similar-enough query was already answered before.",
        },
        {
          kind: "paragraph",
          text: "Production deployments report 20-45% hit rates on real traffic. One documented case cut a support bot's bill from $10,000/mo to $2,361/mo — a 76% reduction — at a 95% cache hit rate on that particular workload.",
        },
      ],
    },
    {
      id: "side-by-side",
      heading: "Side by side",
      blocks: [
        {
          kind: "table",
          headers: ["", "Prompt caching", "Semantic caching"],
          rows: [
            ["What it caches", "A previously-seen prompt prefix", "A previously-seen semantically-similar response"],
            ["Does the model still run?", "Yes — cheaper, not skipped", "No — the call is skipped entirely"],
            ["Where it lives here", "llm_call's promptCacheHitRate", "Cache's \"semantic\" CachingMode"],
            ["Typical real-world win", "~10x discount on the cached prefix portion", "20-45% hit rate; one case: 76% total bill reduction"],
          ],
        },
      ],
    },
    {
      id: "the-moving-baseline",
      heading: "The baseline keeps moving regardless",
      blocks: [
        {
          kind: "paragraph",
          text: "Frontier-equivalent inference cost has fallen roughly 1,000x in three years — about $20 per million tokens in late 2022 to roughly $0.40 per million tokens in 2026 — and open-weight hosted APIs now run $0.07-$0.90 per million tokens. Every optimization in this lesson compounds on top of a cost floor that's already been falling fast on its own.",
        },
        {
          kind: "insight",
          label: "A detail worth making visible in any cost metric",
          text: "Output tokens cost 3-8x input tokens. An agent that reasons verbosely (long chain-of-thought output) pays a structurally different price than one that reads a lot of context and answers briefly — the same total token count can hide a very different cost depending on the input/output split.",
        },
      ],
    },
    {
      id: "putting-it-together",
      heading: "Where this all composes: the edge-assistant scenario",
      blocks: [
        {
          kind: "paragraph",
          text: "Model routing/cascading (the previous lessons' model_router) achieves roughly 95% of frontier-model quality at a 75-85% cost cut by escalating only low-confidence responses. A cost-constrained build that has to hit both a hard $/1000-requests budget and a quality floor composes all of this at once: an SLM-first cascade, a quantization tier, edge deployment, and a semantic cache in front of the whole thing — the direct, measured payoff of everything in this section, not a lesson's word for it.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"We added prompt caching and our bill barely moved — why?\"",
          answer:
            "\"Prompt caching only discounts the portion of a prompt that's a repeated prefix — it doesn't skip the call, and it doesn't help at all if your requests don't actually share a common prefix (highly variable system prompts, mostly-unique context per request). If the real win you're after is skipping redundant calls entirely, that's semantic caching's job, not prompt caching's.\"",
        },
        {
          kind: "qa",
          question: "\"Is a 95% cache hit rate realistic?\"",
          answer:
            "\"It's workload-dependent — the documented 76%-bill-reduction case ran at 95% hit rate, but that reflects a support-bot workload with a lot of genuinely repeated questions. Typical production semantic-cache hit rates run 20-45%; treat 95% as the ceiling for a highly repetitive workload, not a baseline expectation for arbitrary traffic.\"",
        },
      ],
    },
  ],
  summary:
    "Prompt caching and semantic caching solve different problems: prompt caching discounts a repeated prompt prefix on a call that still happens (roughly 1/10th price on the cached portion), while semantic caching skips the model call entirely when a semantically-equivalent query was already answered (20-45% typical hit rates; one documented case cut a bill 76%, $10,000/mo to $2,361/mo, at 95% hit rate). Both compose with existing infrastructure in this workshop rather than needing a new entity — llm_call's own promptCacheHitRate, and Cache's \"semantic\" mode alongside its existing \"exact\" mode. Model routing/cascading adds a third lever, hitting roughly 95% of frontier quality at a 75-85% cost cut. All of it sits on a cost floor that's already fallen ~1,000x in three years, and output tokens costing 3-8x input tokens is worth surfacing in any cost metric.",
  keyTakeaways: [
    "Prompt caching discounts a repeated prompt prefix on a call that still happens; semantic caching skips the model call entirely for a semantically-equivalent query. They aren't the same lever.",
    "Semantic caching hits 20-45% typically in production; one documented case reached 95% and cut a support bot's bill 76%.",
    "Both cache types compose with existing infrastructure here — llm_call's promptCacheHitRate and Cache's \"semantic\" CachingMode, not a new entity.",
    "Model routing/cascading achieves roughly 95% of frontier quality at a 75-85% cost cut by escalating only low-confidence responses.",
    "Frontier-equivalent inference cost has fallen ~1,000x in three years, and output tokens cost 3-8x input tokens — worth surfacing explicitly in any cost metric.",
  ],
  exercise: {
    prompt:
      "A support bot receives a large fraction of near-duplicate questions (\"how do I reset my password,\" asked a thousand different ways) and a system prompt that's identical on every single call. Before reading further: which caching layer captures the bulk of the possible savings here, and does adding the other one still help?",
    guidance: [
      {
        kind: "paragraph",
        text: "Semantic caching captures the bulk of the savings — near-duplicate questions phrased differently are exactly what it's built to catch, skipping the model call entirely on a hit, which is a strictly bigger win than discounting a call that still runs.",
      },
      {
        kind: "paragraph",
        text: "Prompt caching still helps on top of it: every call semantic caching doesn't catch (a genuinely novel question) still shares that identical system prompt, so its prefix gets the roughly 1/10th-price discount regardless. The two compose — semantic caching reduces how many calls happen at all, prompt caching reduces the cost of the calls that still do.",
      },
    ],
  },
  relatedEntitySlugs: ["llm-call", "model-router", "cache"],
};
