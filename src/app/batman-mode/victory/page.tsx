import type { Metadata } from "next";
import { VictoryScreen } from "./VictoryScreen";

export const metadata: Metadata = {
  title: "Victory — Engineering Studio",
  description: "Batman Mode lock-in trilogy complete.",
};

/**
 * Server shell + client body: a page can either export static `metadata`
 * or read reactive client-only state (`useLockInState`), not both, so
 * the state-dependent part lives in `VictoryScreen` instead.
 */
export default function BatmanModeVictoryPage() {
  return <VictoryScreen />;
}
