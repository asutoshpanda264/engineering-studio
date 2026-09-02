/**
 * Research Assistant — `docs/Agentic_AI.md` Part 4, scenario 3. The
 * `retriever` mode choice is the whole point: this scenario's fixed
 * demand is mostly relationship-shaped queries ("which of our vendors
 * also supply our top competitor," not "what's vendor X's phone
 * number"), and Pipeline mode's chunk-similarity search structurally
 * cannot answer that kind of query well at any Miss Rate — see
 * `Retriever.ts`'s own class doc. GraphRAG (or Adaptive, which delegates
 * to GraphRAG's own behavior on exactly this traffic) wins specifically
 * because it retrieves via entity/relationship graph traversal instead
 * of chunk similarity, not because it's "better" in general.
 *
 * Only the Client is given — both Request Rate *and* Relationship Query
 * Rate are locked, since the fixed demand this scenario hands the
 * student is specifically "mostly relationship queries," not just "some
 * traffic."
 *
 * TUNING NOTE (verified against the real engine, seed 300, 15s @ 10
 * req/s, Relationship Query Rate 0.6, via a throwaway script, deleted
 * after use):
 *
 *   Pipeline mode: 39.0% success — Relationship Penalty Multiplier (4x
 *   default) on Miss Rate for 60% of traffic that needs relationship
 *   reasoning is exactly the structural ceiling `Retriever.ts` documents,
 *   not a tuning problem a lower base Miss Rate would fix.
 *   GraphRAG mode: 85.1% success — Relationship Bonus Multiplier makes
 *   the traffic this scenario is actually testing against its real
 *   strength.
 *   Adaptive mode: 87.2% success — delegates to GraphRAG's own real
 *   behavior on relationship queries, slightly ahead of GraphRAG alone
 *   since it routes the easier 40% through Pipeline's cheaper path
 *   instead.
 *
 * No budget gate on this scenario, deliberately — the lesson here is
 * mode choice, not cost optimization (that's `costConstrainedEdge
 * Assistant.ts`'s job).
 */

import type { Scenario } from "./types";

export const researchAssistant: Scenario = {
  id: "research-assistant",
  title: "Research Assistant",
  difficulty: 3,
  topics: ["retrieval", "agentic-system-design"],
  story:
    "A research team wants an assistant that can answer questions over their internal " +
    "knowledge base — but most of what they actually ask isn't simple lookup. It's questions " +
    "like 'which of our vendors also supply our biggest competitor' or 'what changed between " +
    "this decision and the one it replaced' — the kind of answer that lives in the " +
    "relationships between documents, not inside any single one of them.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 220 },
      config: { requestRate: 10, relationshipQueryRate: 0.6 },
    },
  ],
  startingConnections: [],
  givenNodeIds: ["client"],
  lockedFields: { client: ["requestRate", "relationshipQueryRate"] },

  trafficPattern: { type: "constant", rate: 10 },
  durationMs: 15_000,
  seed: 300,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.7,
      label: "At least 70% of research questions are actually answered",
      unit: "%",
    },
  ],

  hints: [
    "60% of the traffic this scenario hands you needs relationship reasoning across documents, not lookup inside one. Which of the four Retriever modes is actually built to traverse relationships instead of comparing chunk similarity?",
    "Lowering Miss Rate on Pipeline mode doesn't fix a structural ceiling — Relationship Penalty Multiplier is multiplying whatever Miss Rate you set, on 60% of your traffic, no matter how low you push it.",
    "Adaptive mode isn't a fifth, separately-tuned architecture — it's a router that delegates to Pipeline's or GraphRAG's own real numbers per query. What does that actually buy you on traffic that's a mix of both kinds of question?",
  ],

  learningGoals: [
    "No amount of tuning closes a structural gap — Pipeline (chunk similarity) and GraphRAG (relationship traversal) aren't the same idea at two different quality settings, they answer genuinely different kinds of questions.",
    "The right retrieval architecture depends on the shape of the traffic, not a general 'which one is best' ranking — the same GraphRAG that wins decisively here would be paying a real, unnecessary cost on traffic that's mostly simple lookup.",
    "Adaptive's real value: it's not a compromise between two options, it's genuine per-query delegation to whichever one actually fits.",
  ],

  capacityEstimate: {
    prompt:
      "Pipeline mode's Miss Rate defaults to 12%, multiplied by a Relationship Penalty of 4x on " +
      "a relationship-shaped query. At a 60% Relationship Query Rate, roughly what fraction of " +
      "all traffic ends up hitting that penalized miss rate, and how bad does the effective " +
      "miss rate get on just that slice?",
    worked:
      "12% x 4 = 48% effective miss rate on the 60% of traffic that needs relationship " +
      "reasoning — under half of that slice succeeds at all, dragging the overall success rate " +
      "down even though the other 40% (ordinary lookups) still clears easily. The problem " +
      "isn't a bad roll of the dice, it's that nearly half of the traffic that matters most is " +
      "structurally miss-prone under this mode.",
  },

  reflection: {
    template:
      "This run landed at {{successRate}} success. If that number is well under 70%, check " +
      "which Retriever mode is wired in before touching a single other dial — this scenario's " +
      "gap between a passing and a failing build is a mode choice, not a tuning problem.",
  },

  optimalSolution: {
    summary: "GraphRAG (or Adaptive) mode, wired directly between the Client and an LLM Call.",
    editorial: [
      "The fix is a single dial: Retriever Mode set to GraphRAG (or Adaptive) instead of " +
        "Pipeline. Nothing else about the topology needs to change — the same two-node " +
        "Client -> Retriever -> LLM Call shape works under any mode, only the retrieval " +
        "architecture underneath it differs.",
      "GraphRAG pays a real, constant cost even on the 40% of traffic that didn't need it " +
        "(higher Graph Traversal Time, a worse base Miss Rate than Pipeline on an ordinary " +
        "query) — it wins here specifically because the traffic mix rewards that trade.",
      "Adaptive edges GraphRAG out slightly on this exact traffic by routing the easier 40% " +
        "through Pipeline's cheaper path instead of paying GraphRAG's constant cost on queries " +
        "that didn't need it — the closest thing to 'best of both' this entity offers, since " +
        "it's genuinely delegating to each mode's own real behavior per query.",
      "A common near-miss: assuming a lower Miss Rate on Pipeline mode is 'good enough' — it " +
        "isn't, because the penalty multiplier scales whatever Miss Rate is configured. This " +
        "traffic needs a different retrieval architecture, not a better-tuned version of the " +
        "wrong one.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 220 },
        config: { requestRate: 10, relationshipQueryRate: 0.6 },
      },
      {
        id: "ret1",
        type: "retriever",
        label: "Retriever",
        position: { x: 380, y: 220 },
        config: { mode: "adaptive" },
      },
      {
        id: "llm1",
        type: "llm_call",
        label: "LLM Call",
        position: { x: 680, y: 220 },
        config: { hallucinationRate: 0.02, schemaFailureRate: 0.02 },
      },
    ],
    connections: [
      { source: "client", target: "ret1", latencyMs: 5 },
      { source: "ret1", target: "llm1", latencyMs: 5 },
    ],
  },
};
