import type { Metadata } from "next";
import { EntitiesIndexView } from "./EntitiesIndexView";

export const metadata: Metadata = {
  title: "Entities — Engineering Studio",
  description:
    "What each infrastructure component does, the tradeoffs it makes, and how to trigger its named failure modes in the Workshop.",
};

/**
 * Index of every entity's deep-dive page. Deliberately separate from the
 * Workshop's Component Library sidebar — this is the reading room, not the
 * build surface. A server component purely for `metadata`; the actual
 * body is `EntitiesIndexView` (a client component — it needs `useTheme()`
 * to pick between `EntitiesList` in the default theme and the arcade
 * `EntitiesMap` in Batman Mode). See that file's own doc comment.
 */
export default function EntitiesIndexPage() {
  return <EntitiesIndexView />;
}
