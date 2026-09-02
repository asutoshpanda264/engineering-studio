import type { Metadata } from "next";
import { LLDIndexView } from "./LLDIndexView";

export const metadata: Metadata = {
  title: "Low-Level Design — Engineering Studio",
  description:
    "OOP fundamentals, SOLID, UML, design patterns, and classic case studies (Parking Lot, LRU Cache, Movie Ticket Booking) — the code-level counterpart to the Workshop's architecture decisions.",
};

/**
 * Index of every LLD lesson — the third reading room, alongside
 * `/foundations` and `/entities`. A server component purely for
 * `metadata`; the actual body is `LLDIndexView` (a client component — it
 * needs `useTheme()` to pick between a Journey/Atlas toggle in the default
 * theme and the arcade `LLDMap` in Batman Mode). See that file's own doc
 * comment.
 */
export default function LLDIndexPage() {
  return <LLDIndexView />;
}
