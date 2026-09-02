import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.5 (RAG fractured into three
 * architectures pretending to be one) and the `Retriever` entity itself
 * (`src/simulation/entities/Retriever.ts`), which models all four modes
 * described here — this lesson is the conceptual half of what that
 * primitive already lets you build and compare on canvas.
 */
export const RAG_ARCHITECTURES: AgenticLesson = {
  slug: "rag-architectures",
  number: 12,
  category: "protocols-and-infra",
  title: "RAG's Three Architectures (and a Fourth That Routes Between Them)",
  tagline:
    "\"RAG\" isn't one thing. Pipeline, Agentic, and GraphRAG make different, measurable trade-offs — and picking wrong shows up as a specific class of query the system just can't answer.",
  estimatedMinutes: 16,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "\"We're doing RAG\" sounds like one architectural decision. It isn't — three genuinely different retrieval strategies all get called RAG, and they don't just differ in cost or speed, they differ in what kinds of questions they can structurally answer at all.",
        },
        {
          kind: "insight",
          text: "The retriever entity (Retriever, in this workshop) is the third policy-bearing primitive alongside the LLM call and the memory/context store — same \"ship multiple comparable options, not one hardcoded default\" rule the rest of this track follows. Four selectable modes, not one.",
        },
      ],
    },
    {
      id: "pipeline",
      heading: "Pipeline RAG — the 2023-era baseline",
      blocks: [
        {
          kind: "paragraph",
          text: "Embed the query, fetch the top-k most similar chunks, hand them to the LLM call, generate an answer. One shot, no self-correction. This is what most people mean by \"RAG\" by default: fast, cheap, and the thing that made retrieval-augmented generation a mainstream pattern in the first place.",
        },
        {
          kind: "paragraph",
          text: "Its failure mode is structural, not incidental: chunk similarity search finds text that *looks like* the answer, not text that's *related to* the answer in ways similarity scoring can't see. A single retrieval attempt either surfaces what actually answers the query or it doesn't — there's no second try.",
        },
      ],
    },
    {
      id: "agentic-rag",
      heading: "Agentic RAG — retrieval as a bounded loop",
      blocks: [
        {
          kind: "paragraph",
          text: "Turns retrieval into a loop: retrieve, critique the result, re-retrieve if it's not good enough, up to a capped number of attempts — paying real overhead on every extra attempt rather than accepting the first miss.",
        },
        {
          kind: "insight",
          label: "The real risk, not a free improvement",
          text: "§1.7's documented risk isn't modeled as harmless retrying: if the loop exhausts its attempt budget without ever resolving, the final answer is more likely to come back *confidently wrong* than to honestly report a miss. Without redundancy checks, self-correction can self-correct into a more elaborate hallucination — a strictly worse outcome than Pipeline's plain \"didn't find it.\"",
        },
        {
          kind: "paragraph",
          text: "This is why Agentic RAG isn't a strictly-better upgrade over Pipeline — it trades a cheap, honest miss for a more expensive attempt that, when it fails, fails in a more dangerous way.",
        },
      ],
    },
    {
      id: "graphrag",
      heading: "GraphRAG — traversal instead of similarity",
      blocks: [
        {
          kind: "paragraph",
          text: "Extracts entities and relationships into a graph ahead of time, and answers queries by traversing that graph instead of ranking chunks by embedding similarity.",
        },
        {
          kind: "list",
          items: [
            { text: "On an ordinary lookup query, GraphRAG is slower and a little less reliable than Pipeline — traversal isn't free even for a simple fact.", tone: "critical" },
            { text: "On a relationship query — \"who reports to the person who approved this?\" — chunk similarity has nothing to rank; the answer isn't textually similar to the question. GraphRAG wins decisively here, precisely because it's not doing similarity search at all.", tone: "healthy" },
          ],
        },
        {
          kind: "insight",
          text: "There's no strictly-dominant choice between Pipeline and GraphRAG — the honest comparison is traffic-shaped: what fraction of real queries are relationship queries a chunk-based retriever structurally cannot answer, no matter how much you tune it?",
        },
      ],
    },
    {
      id: "adaptive",
      heading: "Adaptive routing — pick the cheapest pipeline that can answer",
      blocks: [
        {
          kind: "paragraph",
          text: "A query-complexity classifier routes each query to the cheapest architecture that can actually answer it: Pipeline's own behavior for an ordinary query, GraphRAG's own behavior for a relationship query — plus a small classification overhead on every request for the routing decision itself.",
        },
        {
          kind: "paragraph",
          text: "Adaptive isn't a fifth, separately-tuned architecture — it's literally Pipeline and GraphRAG composed behind one router, the same shape §2.8's model_router later applies to the SLM/LLM cascade decision.",
        },
      ],
    },
    {
      id: "comparison",
      heading: "Side by side",
      blocks: [
        {
          kind: "table",
          headers: ["Mode", "Mechanism", "Wins on", "Real risk"],
          rows: [
            ["Pipeline", "Embed → top-k → generate, one shot", "Ordinary lookup queries, cheapest option", "Structural miss on anything similarity can't rank"],
            ["Agentic", "Retrieve → critique → re-retrieve, bounded", "Recovering from an initial miss", "Exhausted budget reads as confidently wrong, not honestly missed"],
            ["GraphRAG", "Entity/relationship graph traversal", "Relationship queries chunk similarity can't answer", "Slower, slightly less reliable on ordinary queries"],
            ["Adaptive", "Classifier routes to Pipeline or GraphRAG per query", "Mixed traffic — cheap when it can be, capable when it must be", "Classifier overhead on every request, misroutes on ambiguous queries"],
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
          question: "\"Our RAG system answers factual questions fine but falls apart on anything relational — why?\"",
          answer:
            "\"Because chunk-similarity retrieval was never structurally capable of answering relationship queries — the answer isn't textually similar to the question, so no amount of re-ranking or re-retrying fixes it. The fix isn't tuning Pipeline RAG harder, it's GraphRAG for that traffic slice, or an Adaptive router that sends relationship queries there specifically.\"",
        },
        {
          kind: "qa",
          question: "\"Isn't Agentic RAG just strictly better than Pipeline, since it can retry?\"",
          answer:
            "\"No — a retry loop that exhausts its budget without genuinely resolving tends to produce a more confident wrong answer than a single honest miss would have. It trades a cheap, legible failure for a more expensive, more dangerous one. The right lens is measuring the failure mode, not assuming more effort strictly helps.\"",
        },
      ],
    },
  ],
  summary:
    "RAG isn't one architecture — Pipeline (embed → top-k → generate, one shot), Agentic (bounded retrieve-critique-reretrieve loop, real risk of confidently-wrong answers on exhaustion), and GraphRAG (entity/relationship graph traversal, wins decisively on relationship queries chunk similarity structurally can't answer) make genuinely different trade-offs. Adaptive routing composes Pipeline and GraphRAG behind one query-complexity classifier rather than being a fifth tuned architecture. The right choice is traffic-shaped, not universal — measured by what fraction of real queries are the kind only one architecture can actually answer.",
  keyTakeaways: [
    "Pipeline, Agentic, and GraphRAG are three different retrieval architectures, not three tuning levels of the same idea.",
    "Agentic RAG's retry loop isn't free insurance — exhausting its attempt budget tends to produce a confidently-wrong answer, worse than Pipeline's honest miss.",
    "GraphRAG's advantage over chunk similarity is structural, not incremental — it wins specifically on relationship queries similarity search cannot rank at all.",
    "Adaptive routing composes Pipeline and GraphRAG behind a classifier rather than being a separately-tuned fourth architecture.",
    "The right mode is a traffic-shape question — what fraction of real queries need relationship reasoning — not a universal best answer.",
  ],
  exercise: {
    prompt:
      "A research-assistant agent needs to answer both \"what does this paper say about transformer attention?\" (an ordinary lookup) and \"which of these five papers cites the author of the paper that introduced this technique?\" (a relationship query). Before reading further: would Pipeline RAG alone be enough here, and if not, what would you wire instead?",
    guidance: [
      {
        kind: "paragraph",
        text: "Pipeline RAG alone handles the first question fine — it's a direct lookup, exactly what chunk-similarity retrieval is good at. It structurally cannot answer the second: \"cites the author of the paper that introduced X\" requires following a chain of relationships (paper → author → citation), which has no textual similarity to the question itself.",
      },
      {
        kind: "paragraph",
        text: "The right build is either GraphRAG outright, or — better, given the mixed traffic — Adaptive routing: an ordinary lookup gets Pipeline's cheap path, and a relationship query gets routed to GraphRAG's traversal path, paying the classifier's small overhead on every request in exchange for never structurally failing on either query type.",
      },
    ],
  },
  relatedEntitySlugs: ["retriever"],
};
