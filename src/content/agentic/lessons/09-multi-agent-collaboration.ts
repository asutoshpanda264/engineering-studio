import type { AgenticLesson } from "../types";

/**
 * Fourth of the six "patterns" lessons — see 05-tool-use.ts's docblock.
 * Multi-Agent Collaboration needs no additional entity beyond
 * agent_orchestrator itself: 2+ orchestrator nodes wired to each other as
 * peers, not through a shared parent, is the whole pattern. Grounded in
 * §1.2's A2A research (the previous protocols lesson) — this is the
 * pattern A2A's wire format exists to carry.
 */
export const MULTI_AGENT_COLLABORATION: AgenticLesson = {
  slug: "multi-agent-collaboration-pattern",
  number: 9,
  category: "patterns",
  title: "Pattern: Multi-Agent Collaboration",
  tagline: "Two orchestrators, wired to each other as peers — not through one parent coordinating everything.",
  estimatedMinutes: 15,
  sections: [
    {
      id: "the-pattern",
      heading: "The pattern",
      blocks: [
        {
          kind: "paragraph",
          text: "Every pattern so far has one orchestrator (or none) sitting above its workers. Multi-Agent Collaboration is structurally different: two or more agent_orchestrator nodes exchange messages as peers, neither one owning the other. In production this is exactly what A2A (the MCP & A2A lesson's \"HTTP for agent collaboration\") standardizes — one agent handing a task to another, built by a different team, on a different framework, with neither needing to know the other's internals.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "mac-client", label: "Client", col: 0, row: 1, entityType: "client" },
            { id: "mac-a", label: "Agent Orchestrator A", sublabel: "e.g. research agent", col: 1, row: 1, entityType: "agent_orchestrator" },
            { id: "mac-b", label: "Agent Orchestrator B", sublabel: "e.g. drafting agent", col: 2, row: 1, entityType: "agent_orchestrator" },
            { id: "mac-tool", label: "Tool Call", col: 3, row: 1, entityType: "tool_call" },
          ],
          edges: [
            { from: "mac-client", to: "mac-a" },
            { from: "mac-a", to: "mac-b", label: "peer handoff" },
            { from: "mac-b", to: "mac-tool" },
          ],
        },
        {
          kind: "insight",
          text: "Nothing new is required to build this — it's the same agent_orchestrator entity from the last three lessons, wired in a chain of peers instead of one hub with spokes. The pattern is entirely a wiring decision, the same way the Workshop's existing HLD domain never needed a \"microservices mesh\" entity — it's Load Balancers and API Servers, composed.",
        },
      ],
    },
    {
      id: "build-it",
      heading: "Build it",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            "Drag a Client, two Agent Orchestrators, and a Tool Call onto the canvas.",
            "Wire Client → Orchestrator A → Orchestrator B → Tool Call.",
            "Run it. In the trace, confirm the request's path genuinely passes through both orchestrators — a REQUEST_ROUTED direction:\"request\" hop with source Orchestrator A and destination Orchestrator B.",
          ],
        },
        {
          kind: "paragraph",
          text: "Orchestrator B here is just another downstream target from A's point of view — A doesn't know or care that B happens to be another orchestrator rather than a plain worker. That's the peer relationship made concrete: A hands off a task, B does whatever it does (including running its own Sequential or Parallel plan against its own workers), and the response flows back the same way every other response does in this engine.",
        },
      ],
    },
  ],
  summary:
    "Multi-Agent Collaboration is two or more agent_orchestrator nodes wired as peers — no new entity, no new mechanism, just composition. One orchestrator handing a task to another (rather than that other orchestrator being one of its own \"workers\" in a fan-out) is structurally what A2A exists to standardize in production, and it's buildable today with the exact same primitive every other Phase 2 pattern uses.",
  keyTakeaways: [
    "Multi-Agent Collaboration needs no new entity — two or more agent_orchestrator nodes wired peer-to-peer is the whole pattern.",
    "An orchestrator has no special awareness of what's downstream of it — handing a task to another orchestrator looks identical, from its own point of view, to handing a task to a plain worker.",
    "This is the pattern A2A (the previous protocols lesson) standardizes for production: one agent handing off to another, independent of team or framework.",
  ],
  exercise: {
    prompt:
      "Build Client → Orchestrator A → Orchestrator B, where B fans out (Parallel mode) to two Tool Calls of its own. Before running: sketch what you'd expect the full request path to look like by the time it reaches the first Tool Call, and how many entities are in it.",
    guidance: [
      {
        kind: "paragraph",
        text: "The path by the time it reaches a Tool Call is [Client, Orchestrator A, Orchestrator B] — three entities recorded before the tool call itself, since both orchestrators forward the request onward and append themselves. Response routing walks this same path in reverse: the Tool Call responds to B, B waits for its second worker too (Parallel mode), then B responds to A, and A responds to the Client — four hops on the way back for a topology that only looks like two on the canvas.",
      },
    ],
  },
  relatedEntitySlugs: ["agent-orchestrator"],
};
