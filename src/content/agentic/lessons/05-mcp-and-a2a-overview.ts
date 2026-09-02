import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.2 (the two protocols that now own
 * the wire format) and §1.3 (framework landscape, for research grounding
 * only — this project doesn't embed any of them, same "teach the
 * concepts, not one vendor's SDK" stance the rest of this track takes).
 */
export const MCP_AND_A2A_OVERVIEW: AgenticLesson = {
  slug: "mcp-and-a2a-overview",
  number: 5,
  category: "protocols-and-infra",
  title: "MCP & A2A: The Protocol Layer",
  tagline:
    "USB-C for tools, HTTP for agents. Two protocols now own how agents talk to tools and to each other — and the distinction between them is the whole point.",
  estimatedMinutes: 18,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Before a shared protocol existed, every agent framework wired up tools its own way — one bespoke integration per tool per framework, an N-times-M problem that scaled badly the moment you wanted the same tool usable from more than one framework.",
        },
        {
          kind: "paragraph",
          text: "Two protocols have since converged on solving two genuinely different problems, and conflating them is a common mistake worth avoiding from the start.",
        },
        {
          kind: "insight",
          text: "MCP is USB-C for tools — vertical, agent-to-tool. A2A is HTTP for agent collaboration — horizontal, agent-to-agent. Production systems combine both: A2A routes a task to the right specialist agent, and MCP gives that agent its context and tools once it has the task.",
        },
      ],
    },
    {
      id: "mcp",
      heading: "MCP — Model Context Protocol",
      blocks: [
        {
          kind: "paragraph",
          text: "MCP, created by Anthropic, standardizes how an agent connects to external tools, data sources, and context — one protocol a tool author implements once, usable from any MCP-compliant client, rather than a bespoke integration per framework.",
        },
        {
          kind: "list",
          items: [
            "Donated to the Linux Foundation's new Agentic AI Foundation in December 2025.",
            "110M+ monthly downloads.",
            "Adopted by Anthropic, OpenAI, Google, and Microsoft — the closest thing this space has to a settled standard.",
            "Effectively \"won\" the agent-to-tool layer, in the sense that building a new bespoke tool-integration format today would mean competing with something already this broadly adopted.",
          ],
        },
        {
          kind: "paragraph",
          text: "Concretely: an MCP server exposes a set of tools (and optionally data resources) with a defined schema; an MCP client — the agent's runtime — discovers what's available and calls them through one uniform interface. The value isn't the wire format itself, it's that a tool built once is now usable by any compliant agent, not re-integrated per framework.",
        },
      ],
    },
    {
      id: "a2a",
      heading: "A2A — Agent2Agent",
      blocks: [
        {
          kind: "paragraph",
          text: "A2A, Google's protocol for agent-to-agent communication, solves a different problem: how does one autonomous agent hand off a task to, or collaborate with, another agent — potentially one built by a different team, on a different framework entirely?",
        },
        {
          kind: "list",
          items: [
            "Hit v1.0 in early 2026.",
            "150+ organizations in production, including AWS, Microsoft, Salesforce, SAP, IBM, and ServiceNow.",
            "Designed for peer-to-peer agent collaboration — one agent doesn't need to know the internal implementation of another, only how to send it a task and receive a result over the shared protocol.",
          ],
        },
        {
          kind: "paragraph",
          text: "This is the mechanism underneath the Multi-Agent Collaboration pattern from the first lesson in this track: two or more agent_orchestrator nodes exchanging A2A-shaped messages as peers, not routed through one shared parent.",
        },
      ],
    },
    {
      id: "comparison",
      heading: "Side by side",
      blocks: [
        {
          kind: "table",
          headers: ["", "MCP", "A2A"],
          rows: [
            ["Created by", "Anthropic (now Linux Foundation)", "Google"],
            ["Direction", "Vertical — agent → tool", "Horizontal — agent → agent"],
            ["Mental model", "USB-C for tools", "HTTP for agent collaboration"],
            ["Solves", "One tool, usable from any compliant agent runtime", "One agent handing a task to, or collaborating with, another"],
            ["Maps to primitive", "tool_call, flagged \"via MCP\"", "agent_orchestrator nodes exchanging peer messages"],
          ],
        },
        {
          kind: "paragraph",
          text: "A production system rarely uses only one. A common real shape: A2A routes an incoming task to the right specialist agent (a billing agent, a shipping agent, a support agent), and once that specialist agent is working the task, MCP is how it reaches its own tools and data sources.",
        },
      ],
    },
    {
      id: "framework-landscape",
      heading: "Where frameworks fit — and why this track doesn't pick one",
      blocks: [
        {
          kind: "paragraph",
          text: "The framework layer sits above both protocols, and it's genuinely fragmented: LangGraph has the largest production footprint for enterprise multi-agent systems (maximum control, steepest learning curve); CrewAI wins on prototype-to-demo speed but trails on production observability and error recovery; Microsoft merged Semantic Kernel and AutoGen into Agent Framework 1.0 (session state, type safety, telemetry, and multi-agent orchestration in one SDK); Anthropic ships the Claude Agent SDK, OpenAI ships the Agents SDK, Google ships ADK.",
        },
        {
          kind: "insight",
          text: "This project isn't built on top of any of these, on purpose — the point of this track is to model the concepts every one of these frameworks converges on, the same way the existing Workshop teaches load balancing without embedding nginx. Learning the concepts transfers to whichever framework a real job happens to use; learning one framework's specific API doesn't transfer back the other way.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Do I need MCP and A2A, or is one enough?\"",
          answer:
            "\"They solve different problems, so the honest answer is 'it depends on the shape of the system.' A single agent that just needs tools only needs MCP. A system with multiple specialist agents that hand work to each other needs A2A for that handoff, and each of those agents likely still uses MCP internally to reach its own tools — the two compose rather than compete.\"",
        },
        {
          kind: "qa",
          question: "\"Why did the industry converge on standard protocols here instead of everyone building their own?\"",
          answer:
            "\"The same reason HTTP won over every company inventing its own wire protocol: an N-tools-times-M-frameworks integration problem is expensive for everyone, and a shared standard collapses it to N-plus-M. Once major providers — Anthropic, OpenAI, Google, Microsoft — all adopted the same protocol, building a competing bespoke format stopped making sense for almost anyone.\"",
        },
      ],
    },
  ],
  summary:
    "MCP and A2A solve two different problems and the distinction matters: MCP standardizes agent-to-tool connections (vertical, 'USB-C for tools', donated to the Linux Foundation, adopted across Anthropic/OpenAI/Google/Microsoft), while A2A standardizes agent-to-agent collaboration (horizontal, 'HTTP for agents', Google's protocol, 150+ organizations in production). Production systems typically use both together — A2A to route a task to the right specialist agent, MCP for that agent's own tools once it has the task. The framework layer above both (LangGraph, CrewAI, Microsoft Agent Framework, the various vendor SDKs) is where this track deliberately declines to pick a side, teaching the protocol and pattern concepts every framework converges on instead.",
  keyTakeaways: [
    "MCP is vertical (agent → tool); A2A is horizontal (agent → agent). Conflating the two is the most common mistake to avoid.",
    "MCP was created by Anthropic, donated to the Linux Foundation's Agentic AI Foundation, and is adopted across Anthropic, OpenAI, Google, and Microsoft.",
    "A2A is Google's protocol, hit v1.0 in early 2026, and has 150+ organizations in production including AWS, Microsoft, Salesforce, SAP, IBM, and ServiceNow.",
    "Production systems commonly combine both: A2A routes a task to a specialist agent, MCP gives that agent its own tools and context.",
    "This project intentionally doesn't embed any single agent framework — it teaches the protocol and pattern concepts every framework converges on, same stance the Workshop already takes toward infrastructure tools like nginx.",
  ],
  exercise: {
    prompt:
      "A company has one \"research agent\" that needs to search the web and read internal documents, and separately wants that research agent to be able to hand off a task to a completely different team's \"drafting agent\" to write a report from the findings. Before reading further: which protocol handles which part of this, and where exactly does the handoff between the two agents happen?",
    guidance: [
      {
        kind: "paragraph",
        text: "The research agent's own tools — web search, internal document access — are an MCP concern: each is exposed as an MCP tool the research agent's runtime discovers and calls through one uniform interface.",
      },
      {
        kind: "paragraph",
        text: "The handoff to the drafting agent is an A2A concern: the research agent sends a task (its findings) to the drafting agent as a peer, over A2A, without needing to know anything about the drafting agent's internal implementation, model choice, or even which team or framework built it. The drafting agent then likely uses its own MCP tools (a document-formatting tool, perhaps) to actually produce the report — two protocols, two different edges in the same system.",
      },
    ],
  },
};
