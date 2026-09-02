import type { Metadata } from "next";
import { CaseStudiesIndexView } from "./CaseStudiesIndexView";

export const metadata: Metadata = {
  title: "Case Studies — Engineering Studio",
  description:
    "Reference-design walkthroughs — RAG System, AI Search, MCP Design, Trip-Planning Agent — synthesizing Agentic AI and Foundations into complete, worked architectures.",
};

/**
 * Index of every case study — the fifth reading room, alongside
 * `/foundations`, `/lld`, `/entities`, and `/agentic`. A server component
 * purely for `metadata`; the actual body is `CaseStudiesIndexView` (a
 * client component — it needs `useTheme()` to pick between
 * a Journey/Atlas toggle in the default theme and the arcade
 * `CaseStudiesMap` in Batman Mode). See that file's own doc comment.
 */
export default function CaseStudiesIndexPage() {
  return <CaseStudiesIndexView />;
}
