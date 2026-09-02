import type { Metadata } from "next";
import { AgenticIndexView } from "./AgenticIndexView";

export const metadata: Metadata = {
  title: "Agentic AI — Engineering Studio",
  description:
    "Agent control flow, MCP/A2A, RAG architectures, OpenTelemetry GenAI tracing, SLM/LLM inference economics, and the documented failure taxonomy — the fourth reading room.",
};

/**
 * Index of every Agentic AI lesson — the fourth reading room, alongside
 * `/foundations`, `/lld`, and `/entities`. A server component purely for
 * `metadata`; the actual body is `AgenticIndexView` (a client component —
 * it needs `useTheme()` to pick between a Journey/Atlas toggle in the
 * default theme and the arcade `AgenticMap` in Batman Mode). See that
 * file's own doc comment.
 */
export default function AgenticIndexPage() {
  return <AgenticIndexView />;
}
