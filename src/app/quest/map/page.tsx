import type { Metadata } from "next";
import { QuestMapView } from "./QuestMapView";

export const metadata: Metadata = {
  title: "World Map — Quest",
  description: "Travel through the system design world, one node at a time.",
};

/**
 * The Learning World Map — see docs-game/CLAUDE.md §3. Only "The Load
 * Balancer Gate" is real; everything else is a locked silhouette so the
 * world reads as bigger than the one lesson. No scroll-triggered
 * reveals — the whole map exists the instant it paints, same principle
 * the rest of the project already follows for its own landing page.
 * Stays a server component purely to export `metadata` — the actual
 * view needs a client-side store subscription (session progress), so
 * it lives in `QuestMapView`.
 */
export default function QuestMapPage() {
  return <QuestMapView />;
}
