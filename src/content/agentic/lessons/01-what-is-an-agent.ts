import type { AgenticLesson } from "../types";

/**
 * Opening lesson of the Agentic AI track — grounded in `docs/Agentic_AI.md`
 * §1.1 (six canonical patterns), §1.7 (failure taxonomy, cited here only to
 * set honest stakes — the full taxonomy is its own lesson later), and §2.1
 * (composition-not-entity-zoo, this project's standing design philosophy
 * applied to a new domain).
 */
export const WHAT_IS_AN_AGENT: AgenticLesson = {
  slug: "what-is-an-agent",
  number: 1,
  category: "fundamentals",
  title: "What is an Agent?",
  tagline:
    "Not a chatbot with extra steps. An agent is a loop: an LLM call that can act, observe what happened, and decide what to do next — until it stops.",
  estimatedMinutes: 20,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "A single LLM call is a function: text in, text out. Ask it a question, get an answer, done. That's not an agent — it's a request/response, the same shape as any API call this project's Workshop already simulates.",
        },
        {
          kind: "paragraph",
          text: "An agent is what you get when you wrap that call in a loop and give it the ability to act on the world, not just describe it. The model doesn't just answer \"what's the weather in Boston\" — it can call a weather API, read the result, and decide whether it has enough information to answer or needs to act again.",
        },
        {
          kind: "insight",
          text: "Agent = LLM call + loop + tools + memory of what already happened. Remove any one piece and you're back to a plain chatbot: no loop means one shot only, no tools means it can only talk, no memory means every step forgets the last.",
        },
        {
          kind: "paragraph",
          text: "This track treats that loop the same way the rest of this project treats a request hitting a Load Balancer: something with real, observable mechanics — latency, cost, failure modes — not a black box you take on faith.",
        },
      ],
    },
    {
      id: "six-patterns",
      heading: "Six patterns, not a framework zoo",
      blocks: [
        {
          kind: "paragraph",
          text: "Dozens of agent frameworks exist — LangGraph, CrewAI, Microsoft's Agent Framework, the Claude Agent SDK, OpenAI's Agents SDK, Google's ADK. Despite the framework sprawl, the field has converged on a small, reusable vocabulary of control-flow patterns that every one of those frameworks is really just scaffolding around.",
        },
        {
          kind: "list",
          items: [
            "Reflection — the model critiques its own output and revises before finishing.",
            "Tool Use — the model calls an external function/API to do something it can't do by generating text alone.",
            "Planning — the model breaks a goal into an ordered sequence of subtasks before executing them.",
            "Multi-Agent Collaboration — two or more agents exchange messages as peers, no single one owns the whole task.",
            "Orchestrator-Worker — one agent fans a task out to several specialized workers and synthesizes their results.",
            "Evaluator-Optimizer — one agent produces, another scores it, feedback loops back until a threshold is hit.",
          ],
        },
        {
          kind: "insight",
          label: "Interview framing",
          text: "\"AI system design interviews in 2026 won't be about RAG — they test the ability to build robust agents using orchestrators and secure tool gateways. Designing agent control flow is now the highest-leverage skill in AI engineering.\"",
        },
        {
          kind: "paragraph",
          text: "Orchestrator-Worker specifically earns its keep only when subtasks are heterogeneous and the latency you save by running them in parallel is worth the extra concurrent-call cost — it's explicitly overkill for a linear, dependent workflow. That's the exact same trade-off judgment this project already trains with load balancers and caches: a mechanism this powerful is not free, and knowing when *not* to reach for it is half the skill.",
        },
      ],
    },
    {
      id: "composition-not-entities",
      heading: "How this track builds it: composition, not an entity zoo",
      blocks: [
        {
          kind: "paragraph",
          text: "The Workshop doesn't have a \"load-balanced cluster\" entity — it has a Load Balancer and N API Servers the user wires together, and the pattern emerges from composition. This track gets the same treatment: the six patterns above are not six entity types you drag onto a canvas. They're topologies built from a small set of primitives.",
        },
        {
          kind: "table",
          headers: ["Primitive", "Role"],
          rows: [
            ["llm_call", "The reasoning/generation step — the atomic unit everything else routes through."],
            ["tool_call", "An external action: a function, an API, an MCP tool."],
            ["agent_orchestrator", "Routes, plans, loops; owns the iteration cap."],
            ["retriever", "Knowledge lookup — pipeline, agentic, or graph-based."],
            ["memory_context_store", "The context window itself, with a compaction policy."],
            ["guardrail_validator", "An inline check or scorer on a call's output."],
            ["human_in_loop_gate", "An approval branch before an irreversible action."],
            ["model_router", "Routes a request to a cheap or expensive llm_call by tier."],
          ],
        },
        {
          kind: "paragraph",
          text: "Tool Use is just llm_call → tool_call. Reflection is llm_call → guardrail_validator with an edge back into the same llm_call. Orchestrator-Worker is one agent_orchestrator fanning out to N workers in parallel. None of these need a bespoke entity — they fall out of how a handful of primitives get wired together, same as everything else in this project.",
        },
        {
          kind: "insight",
          text: "These primitives land on the Workshop canvas starting in a later phase of this track (see the note at the end of this lesson) — for now, this is the vocabulary the rest of the reading content is built on.",
        },
      ],
    },
    {
      id: "stakes",
      heading: "Why this is worth taking seriously",
      blocks: [
        {
          kind: "paragraph",
          text: "It's tempting to treat \"give the model tools and a loop\" as basically solved. It isn't. Industry postmortems converge on ten distinct, named failure modes — schema violations, hallucinated tool calls, infinite retry loops, context rot, prompt injection, and more — and real-world agent failure rates land somewhere between 70% and 95% depending on task complexity.",
        },
        {
          kind: "paragraph",
          text: "That's not an edge case to footnote. It's the median experience of building one of these systems, which is exactly why \"designing agent control flow\" — not prompt-writing — is the actual skill this track is teaching. A later lesson in the Production category walks through the full ten-item taxonomy, each with its cause and mitigation.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Isn't an agent just a chatbot that can browse the web?\"",
          answer:
            "\"No — the defining trait isn't the tool, it's the loop. A chatbot with a web-search plugin that runs the search once and answers is still one LLM call with an extra input. An agent decides for itself whether to search, what to search for, whether the result was good enough, and whether to search again — that decision-making loop is the whole thing.\"",
        },
        {
          kind: "qa",
          question: "\"Which framework should I learn — LangGraph, CrewAI, something else?\"",
          answer:
            "\"For an interview, none of them specifically — interviewers are testing whether you understand the six control-flow patterns and when each earns its place, not whether you know one framework's API. This track teaches the concepts every framework is scaffolding around, deliberately without embedding any one of them.\"",
        },
      ],
    },
  ],
  summary:
    "An agent is an LLM call wrapped in a loop with the ability to act (tools) and remember what already happened (memory) — not a fundamentally different kind of model, a different control-flow shape around the same primitive. The field has converged on six canonical patterns (Reflection, Tool Use, Planning, Multi-Agent Collaboration, Orchestrator-Worker, Evaluator-Optimizer), all of which fall out of composing a small set of primitives rather than needing their own entity types. Real-world agents fail often — 70-95% depending on task complexity — which is the whole reason control-flow design, not prompt-writing, is the actual skill.",
  keyTakeaways: [
    "Agent = LLM call + loop + tools + memory. Remove any one piece and it's a plain chatbot.",
    "Six canonical patterns cover the field: Reflection, Tool Use, Planning, Multi-Agent Collaboration, Orchestrator-Worker, Evaluator-Optimizer.",
    "This track models the patterns as compositions of a small primitive set (llm_call, tool_call, agent_orchestrator, retriever, memory_context_store, guardrail_validator, human_in_loop_gate, model_router) rather than one entity per pattern.",
    "Orchestrator-Worker is explicitly overkill for a linear, dependent workflow — parallel fan-out only earns its cost/latency trade-off when subtasks are genuinely heterogeneous.",
    "Real-world agent failure rates run 70-95% depending on task complexity — this is the median experience, not an edge case, and it's why control-flow design is the highest-leverage skill here.",
  ],
  exercise: {
    prompt:
      "You're asked to design a customer-support agent that can look up an order, issue a refund, and escalate to a human for anything over $500. Using only the primitive table above, sketch which primitives you'd wire together and in what order — before reading further, write down which of the six canonical patterns your sketch actually is.",
    guidance: [
      {
        kind: "paragraph",
        text: "A reasonable first sketch: llm_call reads the customer's message → tool_call looks up the order → llm_call decides the refund amount → a human_in_loop_gate sits before any tool_call that actually issues a refund over $500 → otherwise the refund tool_call fires directly.",
      },
      {
        kind: "paragraph",
        text: "That's Tool Use with a human-in-the-loop gate layered on top of the risky action, not a new pattern of its own — the gate is what makes an irreversible action (issuing money) reversible in effect, by inserting an approval step before it fires. The refund-amount decision doesn't need Planning or Orchestrator-Worker: there's exactly one subtask, so fan-out would be pure overhead.",
      },
    ],
  },
};
