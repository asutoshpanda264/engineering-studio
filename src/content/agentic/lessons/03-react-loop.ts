import type { AgenticLesson } from "../types";

/**
 * Split from a single combined "ReAct & Tool Use" lesson into two, so each
 * concept gets its own dedicated section instead of one lesson silently
 * covering both (user feedback: Tool Use read as folded into ReAct rather
 * than being its own thing). This lesson is purely the reasoning-loop
 * mechanism; `04-tool-use-and-the-tool-call-boundary.ts` is purely the
 * tool-call boundary itself and its two most directly relevant named
 * failure modes (schema violation, hallucinated tool invocation). Nothing
 * about the content changed beyond the split and each half's own new
 * framing — no material was cut.
 */
export const REACT_LOOP: AgenticLesson = {
  slug: "react-loop",
  number: 3,
  category: "fundamentals",
  title: "ReAct: The Reasoning Loop",
  tagline:
    "The loop that turns a text generator into something that can act: think, act, observe what happened, repeat — until the answer is actually grounded in something real.",
  estimatedMinutes: 15,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Ask a plain LLM \"what's 47293 times 8124\" and it will confidently produce an answer — sometimes right, often subtly wrong, because next-token prediction is not arithmetic. Give that same model a calculator tool and the ability to decide when to use it, and the failure mode changes entirely: it doesn't have to guess anymore, it can check.",
        },
        {
          kind: "paragraph",
          text: "That capability — deciding to act, then reasoning over what actually happened — needs a loop shape, not just a bigger prompt. ReAct is the name for that loop, and it's the mechanism underneath essentially every tool-using agent, including the next lesson's Tool Use pattern.",
        },
      ],
    },
    {
      id: "react-loop",
      heading: "The ReAct loop: Thought → Action → Observation",
      blocks: [
        {
          kind: "paragraph",
          text: "ReAct (Reasoning + Acting) names the specific loop shape most tool-using agents run: the model narrates a thought, picks an action (a tool call, with arguments), receives an observation (the tool's real output), and either repeats or produces a final answer.",
        },
        {
          kind: "flow",
          animated: true,
          steps: [
            { title: "Thought", detail: "\"I need the current weather in Boston to answer this — I don't know it.\"" },
            { title: "Action", detail: "call get_weather(city: \"Boston\")" },
            { title: "Observation", detail: "tool returns { temp: 58, condition: \"cloudy\" }" },
            { title: "Thought", detail: "\"I now have what I need.\"" },
            { title: "Final answer", detail: "\"It's 58°F and cloudy in Boston right now.\"" },
          ],
        },
        {
          kind: "insight",
          text: "The loop can run more than once — a real task often needs several tool calls chained together, each observation informing the next thought. That's the exact mechanism an agent_orchestrator exists to own: it's the thing holding the iteration count, which is also why an unbounded loop here is a named, documented failure mode — an infinite retry loop, covered where agent_orchestrator's own Max Iterations dial lives.",
        },
      ],
    },
    {
      id: "where-this-goes",
      heading: "What this loop doesn't cover yet",
      blocks: [
        {
          kind: "paragraph",
          text: "ReAct explains the shape of the loop — when the model decides to act versus answer directly. It says nothing about what happens at the specific moment an \"Action\" step tries to become a real, executed function call: whether the arguments are even valid, whether the tool being called actually exists, or what stops a malicious tool result from hijacking the next \"Thought.\" That boundary — and the two most common documented failure modes that live exactly there — is the next lesson's whole subject.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"What's actually different between an agent and a plain function-calling API call?\"",
          answer:
            "\"Function calling is the mechanism — the model can emit a structured call instead of only text. ReAct is what you build with that mechanism inside a loop: the model decides whether to act at all, reads the real result back, and can act again based on what it learned. A single function call with no loop around it is function calling, not yet an agent.\"",
        },
        {
          kind: "qa",
          question: "\"How does an agent know when to stop looping?\"",
          answer:
            "\"Two ways, and only one of them is safe on its own: the model can decide it has what it needs and produce a final answer — but nothing stops it from being wrong about that, or from looping on a task that never resolves. The real safety net is an explicit iteration cap held by whatever's coordinating the loop (an agent_orchestrator's Max Iterations, in this app's own model) — a hard stop that doesn't depend on the model correctly recognizing its own completion.\"",
        },
      ],
    },
  ],
  summary:
    "ReAct is the loop shape underneath most tool-using agents: Thought → Action → Observation, repeated until the model has what it needs. It explains *when* a model decides to act instead of answering directly — not what happens at the moment that action becomes a real, structured call, which is the next lesson's subject. The loop needs an external, explicit stopping condition (an iteration cap) — it can't safely rely on the model correctly recognizing its own completion.",
  keyTakeaways: [
    "ReAct's loop — Thought, Action, Observation, repeat — is the reasoning mechanism underneath most tool-using agents.",
    "The loop can chain multiple tool calls, each observation informing the next thought — and needs an explicit iteration cap, not just the model's own judgment about when to stop.",
    "ReAct explains the loop's shape, not the tool-call boundary itself — what happens when a \"Thought\" becomes a real function call is a separate, dedicated concern.",
  ],
  exercise: {
    prompt:
      "Trace through a ReAct loop by hand for the question \"Is it currently raining in the city with the most Nobel laureates born there?\" — write out each Thought/Action/Observation step you'd expect, and note the one point where the loop could go wrong even if every individual tool call succeeds.",
    guidance: [
      {
        kind: "paragraph",
        text: "A reasonable trace: Thought (\"I need to find which city has the most Nobel-laureate births\") → Action (search tool) → Observation (a city name) → Thought (\"now I need current weather there\") → Action (weather tool) → Observation (conditions) → final answer. The failure point that survives even if every tool call individually succeeds: the search tool could return a subtly wrong or outdated \"most laureates\" city, and nothing in the loop itself re-checks that — a ReAct loop only ever grounds the *tool-using* steps in something real, not the model's own judgment about which step to take next.",
      },
    ],
  },
  relatedEntitySlugs: ["llm-call", "agent-orchestrator"],
};
