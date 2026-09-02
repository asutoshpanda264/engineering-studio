import type { Metadata } from "next";
import { FOUNDATION_LESSONS } from "@/content/foundations";
import { FoundationsIndexView } from "./FoundationsIndexView";

export const metadata: Metadata = {
  title: "Foundations — Engineering Studio",
  description:
    "Core system-design theory — the internet, DNS, HTTP, databases, caching, queues — the vocabulary the Workshop and entity reference assume you already have.",
};

/**
 * Index of every Foundations lesson — the theory layer, separate from
 * `/entities` (the simulated, draggable components). A server component
 * purely for `metadata`; the actual body is `FoundationsIndexView` (a
 * client component — it needs `useTheme()` to decide which of two shapes
 * to render: the arcade `FoundationsMap` in Batman Mode (`night-ops`), or
 * `FoundationsJourney` (a tracked, sequenced index — deliberately not the
 * same flat-grid shape the other reading rooms use, see that file's own
 * doc comment for why) in the default theme. See `FoundationsIndexView`'s
 * own doc comment for why the map is Batman-Mode-only and the `<main>`
 * wrapper lives there instead of here.
 */
export default function FoundationsIndexPage() {
  return <FoundationsIndexView lessons={FOUNDATION_LESSONS} />;
}
