import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.12 (inference serving mechanics —
 * why llm_call latency isn't just a number). The mechanism this lesson
 * points at — llm_call's latency depending on concurrent load — is real
 * in this codebase, not a metaphor: `BoundedProcessor`'s admit→queue→
 * reject shape (shared with APIServer, Database, and every other bounded
 * entity) is exactly what makes a queued request wait behind however
 * much work is already in flight before its own processing time even
 * starts.
 */
export const INFERENCE_SERVING_MECHANICS: AgenticLesson = {
  slug: "inference-serving-mechanics",
  number: 16,
  category: "inference-and-serving",
  title: "Inference Serving Mechanics: Why Latency Depends on Load",
  tagline:
    "A model's per-token speed is a number in a spec sheet. What a request actually experiences depends on how many other requests are sharing the same GPU right now — and that's a serving-engine decision, not a model property.",
  estimatedMinutes: 15,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "\"This model generates at N tokens/second\" sounds like a fixed property of the model. It isn't — it's a property of how the serving engine schedules many concurrent requests onto one (expensive) GPU, and that scheduling is where most of production LLM serving engineering actually lives.",
        },
        {
          kind: "insight",
          text: "This is the same shape this workshop already models for APIServer and Database: BoundedProcessor's admit→queue→reject logic. A request submitted when capacity is already saturated waits in queue before its own processing time starts — llm_call latency depends on concurrent load for exactly this reason, not as an approximation of something more complicated.",
        },
      ],
    },
    {
      id: "three-techniques",
      heading: "Three techniques that make concurrent serving fast",
      blocks: [
        {
          kind: "list",
          items: [
            "PagedAttention — removes the requirement that one request's KV cache sit in contiguous GPU memory, scattering it across pages instead. A small per-token compute tax (~2-5%) buys dramatic memory utilization (95%+), which is what makes serving many concurrent requests off one model copy possible at all.",
            "Continuous batching — schedules at the iteration level, not the batch level: a finished request's slot is immediately backfilled by a new one instead of sitting idle until the whole batch completes. This is the direct reason inference throughput scales sub-linearly with concurrent requests rather than linearly.",
            "Speculative decoding — a cheap draft model proposes several tokens at once, which the real (target) model verifies in parallel. Free latency reduction when the draft's guesses are usually right; wasted compute when they aren't.",
          ],
        },
        {
          kind: "paragraph",
          text: "Real numbers at scale: 128+ concurrent requests combining all three on an H100 deliver 2,200-2,400 tokens/sec for a 70B model at FP8 — roughly 3-4x a naive, unbatched implementation of the same model.",
        },
      ],
    },
    {
      id: "what-this-means-for-design",
      heading: "What this means for how llm_call is designed",
      blocks: [
        {
          kind: "insight",
          label: "The design rule",
          text: "llm_call's latency should be a function of concurrent load, not a flat config value — and this codebase already has the exact mechanism for it, because it's the same bounded admit→queue→reject shape every other entity here uses. A spike of concurrent requests doesn't make each individual generation slower at the token level; it makes more requests wait in queue behind the ones already being served, which is observably the same thing from the caller's side.",
        },
        {
          kind: "paragraph",
          text: "This is why an llm_call node's maxConcurrent isn't a made-up throttle — it stands in for the real ceiling continuous batching and PagedAttention push higher (more concurrent requests fit before queueing starts), and maxQueueLength stands in for what happens once even that raised ceiling is exceeded.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Our agent's p99 latency spikes under load even though we haven't changed the model. Why?\"",
          answer:
            "\"Because latency under load is a queueing problem, not a per-token generation problem — the model's raw tokens/sec hasn't changed, but more concurrent requests means more requests waiting behind the serving engine's current batch before their own generation even starts. The fix is either raising effective concurrent capacity (continuous batching, more replicas) or shedding load before it queues, not making the model 'faster.'\"",
        },
        {
          kind: "qa",
          question: "\"What's continuous batching actually buying you, concretely?\"",
          answer:
            "\"Without it, a batch of N requests all finish only when the slowest one does — a short request sits idle waiting on a long one in the same batch. Continuous batching backfills a finished request's slot immediately with the next one waiting, which is the direct reason throughput scales sub-linearly with concurrency instead of being capped by the batch's slowest member.\"",
        },
      ],
    },
  ],
  summary:
    "A model's per-token speed is a spec-sheet number; what a request actually experiences depends on serving-engine scheduling under concurrent load — the same bounded admit→queue→reject shape this workshop already models for every other bounded-capacity entity. PagedAttention (paged, non-contiguous KV cache — 95%+ memory utilization for a small compute tax), continuous batching (iteration-level scheduling, sub-linear throughput scaling with concurrency), and speculative decoding (a cheap draft model proposing tokens the real model verifies in parallel) are the three real techniques behind why 128+ concurrent requests on an H100 hit 2,200-2,400 tok/s for a 70B model at FP8 — 3-4x a naive unbatched implementation. llm_call's maxConcurrent/maxQueueLength dial is a direct, honest stand-in for this mechanism, not an arbitrary throttle.",
  keyTakeaways: [
    "LLM serving latency depends on concurrent load, not just the model — the same queueing shape BoundedProcessor already models for every bounded entity here.",
    "PagedAttention scatters KV cache across non-contiguous memory pages, trading a small (~2-5%) compute tax for 95%+ memory utilization — what makes serving many concurrent requests off one model copy possible.",
    "Continuous batching schedules at the iteration level, backfilling a finished request's slot immediately — the direct reason throughput scales sub-linearly with concurrency.",
    "Speculative decoding uses a cheap draft model to propose tokens the real model verifies in parallel — a free latency win when the draft is usually right.",
    "128+ concurrent requests combining all three on an H100 deliver 2,200-2,400 tok/s for a 70B model at FP8, roughly 3-4x a naive unbatched implementation.",
  ],
  exercise: {
    prompt:
      "An llm_call node's average latency is fine at low traffic but climbs sharply once concurrent requests exceed a certain number, then plateaus at a much higher value. Before reading further: is the model itself getting slower, and what two config values on the node explain the shape of this curve?",
    guidance: [
      {
        kind: "paragraph",
        text: "The model isn't getting slower at the token level — this is queueing, not degraded generation speed. Below maxConcurrent, every request starts processing immediately and latency stays near the base processing time. Once concurrent load exceeds maxConcurrent, new requests queue behind the ones already in flight, and their observed latency grows by however long they waited in queue.",
      },
      {
        kind: "paragraph",
        text: "The plateau is maxQueueLength: once the queue itself is full, further requests are rejected outright rather than waiting indefinitely, which caps how bad the worst-case observed latency for an admitted request can get — the curve climbs while requests queue, then plateaus because past that point excess load is shed rather than absorbed.",
      },
    ],
  },
  relatedEntitySlugs: ["llm-call"],
};
