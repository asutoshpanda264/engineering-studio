import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.6 (observability converged on one
 * vendor-neutral vocabulary) and §2.4 (the trace panel: real vocabulary,
 * not invented UI). This workshop's own playback view for agentic builds
 * (`src/simulation/playback/otelTraceFormatter.ts`, rendered by
 * `TracePanel.tsx`) is a direct implementation of what this lesson
 * describes — reading your own architecture's trace here is reading the
 * same shape you'd see in a real observability platform.
 */
export const OPENTELEMETRY_GENAI_TRACING: AgenticLesson = {
  slug: "opentelemetry-genai-tracing",
  number: 13,
  category: "protocols-and-infra",
  title: "OpenTelemetry GenAI Tracing",
  tagline:
    "Every observability vendor used to invent its own agent-tracing schema. Now there's one vendor-neutral vocabulary — and it's what this workshop's own trace panel speaks.",
  estimatedMinutes: 14,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "An agent's decision chain is opaque by default: which tool did it call, with what arguments, how many tokens did that cost, did it retry, and why? Without a shared vocabulary for answering these questions, every team — and every vendor's dashboard — invents its own ad hoc logging shape, none of which compose with each other.",
        },
        {
          kind: "insight",
          text: "OpenTelemetry's GenAI semantic conventions are the industry's answer: a standard set of span and attribute names for exactly this. Not a new tool to adopt — a shared vocabulary any tracing backend can already speak.",
        },
      ],
    },
    {
      id: "vocabulary",
      heading: "The actual vocabulary",
      blocks: [
        {
          kind: "paragraph",
          text: "One trace_id per run. Nested under one invoke_agent root span, each meaningful step — an LLM call, a tool invocation — gets its own span with attributes drawn from a fixed, documented set rather than a free-text log line:",
        },
        {
          kind: "table",
          headers: ["Attribute", "What it captures"],
          rows: [
            ["gen_ai.operation.name", "What kind of step this span is — a chat completion, a tool execution, an embedding call"],
            ["gen_ai.request.model", "Which model/tier actually handled this step"],
            ["gen_ai.usage.input_tokens / output_tokens", "The token counts a cost calculation derives from"],
            ["gen_ai.tool.name", "Which tool a tool-call span invoked"],
          ],
        },
        {
          kind: "paragraph",
          text: "The value isn't the specific attribute names — it's that every compliant backend (Datadog, Arize, LangSmith, and this workshop's own trace panel among them) renders the identical vocabulary. A trace exported from one system is legible in another without a translation layer.",
        },
      ],
    },
    {
      id: "this-workshop",
      heading: "This workshop's trace panel is a direct implementation",
      blocks: [
        {
          kind: "paragraph",
          text: "The existing event log and playback UI needed no new mechanism to support this — only new formatting. Every simulated event in an agentic build renders using this exact attribute vocabulary, nested under one invoke_agent root, one trace_id per run.",
        },
        {
          kind: "list",
          items: [
            "gen_ai.request.model reflects which llm_call tier actually handled that step.",
            "The quantization tier in effect for that call is surfaced per span, not just as a global config value.",
            "A cache-hit outcome (prompt cache or semantic cache) shows up on the span it affected, the same way a real trace would show a cache short-circuit.",
          ],
        },
        {
          kind: "insight",
          text: "Reading your own architecture's playback here is reading the same shape of trace you'd see in a real job's observability stack — this is the clearest \"actually useful, not resume-fodder\" payoff in this whole pillar: a genuinely transferable skill, not an invented UI you'd have to unlearn.",
        },
      ],
    },
    {
      id: "why-it-matters",
      heading: "Why a shared vocabulary, specifically",
      blocks: [
        {
          kind: "paragraph",
          text: "Before a standard existed, debugging a multi-agent system meant learning that team's bespoke logging format from scratch, every time. A shared vocabulary means the skill of reading an agent trace — spotting a runaway loop from repeated identical spans, spotting a cost spike from a span's token counts, spotting a stale cache from a missing cache-hit attribute — transfers across every system that speaks it, the same way SQL transfers across databases that all speak it.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Why does agent observability need its own semantic conventions instead of reusing plain HTTP tracing?\"",
          answer:
            "\"Because the questions you need to answer are different: not just 'how long did this request take,' but 'which model handled it, how many tokens did it use, which tool did it call, and did that cost come from a cache hit or a real generation.' HTTP tracing has no vocabulary for any of that — GenAI semantic conventions add exactly the attributes an LLM-based system actually needs to be debuggable.\"",
        },
        {
          kind: "qa",
          question: "\"What's the actual cost of NOT standardizing this?\"",
          answer:
            "\"Every team reinvents its own trace format, every vendor's dashboard is incompatible with every other's, and the skill of reading a trace doesn't transfer between jobs. A shared vocabulary turns that into a one-time learning cost instead of a per-system one — the same value proposition HTTP or SQL already proved.\"",
        },
      ],
    },
  ],
  summary:
    "OpenTelemetry's GenAI semantic conventions are the industry's converged, vendor-neutral vocabulary for tracing agent behavior — gen_ai.operation.name, gen_ai.usage.input_tokens/output_tokens, gen_ai.tool.name, gen_ai.request.model, all nested under one invoke_agent root span with one trace_id per run. Every compliant backend (Datadog, Arize, LangSmith, and this workshop's own trace panel) renders the identical shape, which is what makes a trace legible without a per-vendor translation layer. This workshop's playback view for agentic builds is a direct, honest implementation of that vocabulary — reading it is a transferable skill, not an invented UI.",
  keyTakeaways: [
    "GenAI semantic conventions are OpenTelemetry's standard vocabulary for agent tracing — gen_ai.operation.name, gen_ai.usage.input_tokens/output_tokens, gen_ai.tool.name, gen_ai.request.model.",
    "One trace_id per run, one invoke_agent root span, every meaningful step (LLM call, tool call) nested underneath with standard attributes.",
    "The value is interoperability — Datadog, Arize, LangSmith, and this workshop's own trace panel all speak the identical vocabulary.",
    "This workshop's playback view for agentic builds renders real events using this exact vocabulary, including quantization tier and cache-hit outcome per span.",
    "Reading an agent trace is a transferable skill precisely because the vocabulary is shared, the same value proposition HTTP or SQL already proved for their own domains.",
  ],
  exercise: {
    prompt:
      "You're debugging a production agent that's costing far more than expected. Before reading further: which gen_ai.* attributes, read directly off the trace, would tell you whether the cost spike is coming from more requests, bigger requests, a fallen-through cache, or an escalation to a more expensive model tier?",
    guidance: [
      {
        kind: "list",
        items: [
          "More requests: count of invoke_agent root spans in the time window.",
          "Bigger requests: gen_ai.usage.input_tokens/output_tokens trending up per span.",
          "A fallen-through cache: the previously-present cache-hit attribute missing from spans that used to carry it.",
          "Escalation to a pricier tier: gen_ai.request.model shifting from an SLM tier to an LLM tier across spans that used to route to the cheaper one.",
        ],
      },
      {
        kind: "paragraph",
        text: "This is exactly why the vocabulary is standardized rather than free-text: each of these four causes has a specific, named attribute to check, instead of a debugging session that starts by re-deriving what to even look for.",
      },
    ],
  },
  relatedEntitySlugs: ["llm-call", "tool-call", "agent-orchestrator"],
};
