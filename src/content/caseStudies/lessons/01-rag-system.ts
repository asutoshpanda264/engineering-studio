import type { CaseStudy } from "../types";

/**
 * RAG System — Pillar E Phase 1, entry 1 of `docs/Expansion_TODO.md`.
 * This one is deliberately the smallest possible slice: the architecture
 * *already exists* as `src/scenarios/researchAssistant.ts` (see that
 * file's own header for the verified engine numbers quoted below, seed
 * 300, 15s @ 10 req/s) — what was actually missing was this walkthrough
 * of *why* the architecture looks the way it does, not a new build.
 * Every number here is copied from that scenario's own docblock, not
 * re-derived — no hand math.
 */
export const RAG_SYSTEM: CaseStudy = {
  slug: "rag-system",
  number: 1,
  category: "agentic",
  title: "Case Study: RAG System",
  tagline:
    "A research assistant over an internal knowledge base — and the retrieval-architecture choice that decides whether it actually works.",
  estimatedMinutes: 20,
  sections: [
    {
      id: "the-brief",
      heading: "The brief",
      blocks: [
        {
          kind: "paragraph",
          text: "A research team wants an assistant that answers questions over their internal knowledge base. On paper this is the most generic RAG pitch there is — embed the docs, retrieve the closest chunks, hand them to an LLM. In practice, most of what this team actually asks isn't lookup: \"which of our vendors also supply our biggest competitor,\" \"what changed between this decision and the one it replaced.\" Those answers live in the relationships between documents, not inside any single one of them — and that fact is the entire design problem.",
        },
        {
          kind: "insight",
          text: "This is the same trap the RAG pitch always sets: a retrieval architecture that only ever gets validated against simple lookup queries looks done. It isn't — it's untested against the traffic shape that actually matters.",
        },
      ],
    },
    {
      id: "architecture",
      heading: "The architecture",
      blocks: [
        {
          kind: "paragraph",
          text: "Underneath, this is the standard RAG mechanism: a knowledge base gets embedded and indexed ahead of time; a live query gets embedded the same way, compared against that index by vector similarity, and the closest chunks come back; those chunks get combined with the original query into one prompt; the LLM answers from that, not from its own training data alone.",
        },
        {
          kind: "pipeline",
          variant: "phase",
          animated: true,
          nodes: [
            { label: "Client", sublabel: "user query", entityType: "client" },
            { label: "Embed Query", icon: "embedding" },
            { label: "Vector DB", sublabel: "cosine similarity, top-k", icon: "vector-db" },
            { label: "Combine", sublabel: "chunks + query", icon: "combine" },
            { label: "LLM Call", entityType: "llm_call" },
            { label: "Output", icon: "output" },
          ],
          edgeLabels: ["query", "embedding", "top-k chunks", "prompt", "answer"],
          sideNodes: [
            {
              label: "Data Sources",
              icon: "data-source",
              intoIndex: 2,
              edgeLabel: "embedded & indexed ahead of time",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "In the Workshop, the \"Embed Query → Vector DB → Combine\" stretch is exactly what a single Retriever node simulates — it's a policy-bearing entity with four selectable modes, each a different way of implementing that middle stretch, and which one is wired in is the single dial that decides whether this system clears its own bar:",
        },
        {
          kind: "pipeline",
          nodes: [
            { label: "Client", entityType: "client" },
            { label: "Retriever", sublabel: "mode dial", tone: "signal", entityType: "retriever" },
            { label: "LLM Call", entityType: "llm_call" },
          ],
          edgeLabels: ["question", "context"],
        },
        {
          kind: "paragraph",
          text: "\"Which of our vendors also supply our biggest competitor?\" — 60% of this traffic is relationship-shaped, not simple lookup. Whichever mode the Retriever runs decides whether it resolves that into real context or noise; the LLM Call is only ever as good as what it's handed, and can't recover from a structurally-blind retrieval.",
        },
        {
          kind: "list",
          items: [
            "Pipeline — the mechanism diagrammed above, exactly: embed → top-k → generate, one shot, no self-correction. Cheap, and structurally blind to relationship queries — it's comparing chunk similarity, not traversing a graph.",
            "Agentic — turns retrieval into a bounded retrieve/critique/re-retrieve loop. Better on some misses, but the real documented risk is that without redundancy it can self-correct into a more elaborate hallucination rather than an honest miss.",
            "GraphRAG — extracts entities/relationships into a graph and retrieves via traversal instead of chunk similarity. Slower and slightly worse than Pipeline on an ordinary lookup, but wins decisively on exactly the traffic Pipeline structurally cannot answer.",
            "Adaptive — a query-complexity classifier routes each query to whichever mode fits it, reusing Pipeline's or GraphRAG's own real behavior per query rather than inventing a fifth set of numbers.",
          ],
        },
      ],
    },
    {
      id: "why-mode-is-the-whole-decision",
      heading: "Why mode is the whole decision",
      blocks: [
        {
          kind: "paragraph",
          text: "Run this system's real traffic — 60% relationship-shaped queries, 40% ordinary lookup — against each mode, and the gap isn't a tuning gap:",
        },
        {
          kind: "table",
          headers: ["Retriever mode", "Success rate", "What's actually happening"],
          rows: [
            ["Pipeline", "39.0%", "A 4x relationship penalty on Miss Rate hits 60% of all traffic — a structural ceiling, not an undertuned dial."],
            ["GraphRAG", "85.1%", "Relationship traversal is this mode's real strength, on the traffic that's actually testing for it."],
            ["Adaptive", "87.2%", "Delegates to GraphRAG's own behavior on relationship queries, and routes the easier 40% through Pipeline's cheaper path instead."],
          ],
        },
        {
          kind: "insight",
          label: "The trap",
          text: "Lowering Pipeline's Miss Rate doesn't close this gap — the Relationship Penalty Multiplier scales whatever Miss Rate is configured. 12% base miss rate x 4x penalty is a 48% effective miss rate on the 60% of traffic that needs relationship reasoning, no matter how aggressively the base rate is tuned down. This traffic needs a different retrieval architecture, not a better-tuned version of the wrong one.",
        },
        {
          kind: "paragraph",
          text: "Adaptive isn't a compromise between the other three — it's genuine per-query delegation. It edges out GraphRAG alone specifically because GraphRAG pays a real, constant cost (higher traversal time, a worse base miss rate) even on the 40% of traffic that never needed graph reasoning in the first place; Adaptive skips that cost on the queries where it doesn't pay off.",
        },
      ],
    },
    {
      id: "what-this-generalizes-to",
      heading: "What this generalizes to",
      blocks: [
        {
          kind: "paragraph",
          text: "The lesson isn't \"GraphRAG is better than Pipeline\" — on a workload that's mostly simple lookup, GraphRAG would be paying its constant traversal cost for nothing, and Pipeline would win outright. The right retrieval architecture is a function of the shape of the traffic, decided by looking at what your users actually ask, not a general leaderboard of RAG techniques.",
        },
      ],
    },
  ],
  summary:
    "A RAG system's retrieval architecture isn't one dial among many — it's the decision that determines whether the system can answer the traffic it's actually given. Chunk-similarity retrieval (Pipeline) and graph-traversal retrieval (GraphRAG) answer genuinely different kinds of questions; no amount of tuning turns one into the other, and the right choice depends entirely on the shape of real demand.",
  keyTakeaways: [
    "Pipeline mode's structural weakness on relationship queries can't be tuned away — the penalty multiplies whatever miss rate is configured.",
    "GraphRAG wins decisively on relationship-shaped traffic specifically because it retrieves via graph traversal instead of chunk similarity — not because it's a strictly better retriever.",
    "Adaptive mode is real per-query delegation, not an averaged compromise — it reuses each mode's own behavior and only pays a mode's cost on the traffic that actually needs it.",
    "The right retrieval architecture is decided by the shape of your traffic, not a general ranking of RAG techniques.",
  ],
  exercise: {
    prompt:
      "This case study's traffic is 60% relationship queries. Suppose a second team's knowledge base is instead 90% simple factual lookup (\"what's the API rate limit for tier 2\") and 10% relationship queries. Would you still wire in GraphRAG or Adaptive? What would you expect Pipeline's success rate to look like on that traffic, and why?",
    guidance: [
      {
        kind: "paragraph",
        text: "Pipeline would likely clear a high success rate here — only 10% of traffic hits its structural weak spot, so the relationship penalty only drags down a small slice of the overall number. GraphRAG would still work, but it's paying its constant traversal-time and base-miss-rate cost on the 90% of traffic that never needed it — a real, unnecessary cost for no measurable benefit on this traffic shape.",
      },
      {
        kind: "paragraph",
        text: "Adaptive is the least risky choice precisely because it doesn't require correctly guessing the traffic mix ahead of time — it pays GraphRAG's cost only on the queries that actually need it, whichever fraction that turns out to be. But if the traffic mix is confidently known and stable, a plain Pipeline is a legitimate, simpler answer here — this is the flip side of this lesson's own point: the right choice depends on the traffic, and 90/10 is a different traffic shape than 40/60.",
      },
    ],
  },
  relatedEntitySlugs: ["retriever", "llm-call"],
  crossLinks: [
    { label: "Agentic AI — RAG Architectures", href: "/agentic/rag-architectures" },
    { label: "Entity reference — Retriever", href: "/entities/retriever" },
  ],
  buildIt: {
    scenarioId: "research-assistant",
    note: "The exact architecture above, live — swap the Retriever's mode and rerun to reproduce the 39% / 85.1% / 87.2% split yourself.",
  },
};
