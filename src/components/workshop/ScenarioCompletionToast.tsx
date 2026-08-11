"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper, Trophy, X } from "lucide-react";
import { useWorkshopStore } from "@/store/workshopStore";
import { getScenario } from "@/scenarios";
import { scoreScenario } from "@/lib/scenarioScoring";
import type { SimulationResult } from "@/simulation/types";

/**
 * A brief, self-dismissing banner the moment a run newly clears every gate
 * for the active scenario (success rate, latency, and budget all at once).
 *
 * Exists alongside — not instead of — SimulationResultsPanel's persistent
 * star stat and InspectorPanel's full ScenarioBriefing: neither of those
 * is guaranteed to be in a student's eyeline the instant a run finishes,
 * especially since finishing a build usually means a node is still
 * selected (which hides ScenarioBriefing entirely — see that file). This
 * is the "hey, look" nobody should have to go hunting for.
 */
export function ScenarioCompletionToast() {
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const simulationResult = useWorkshopStore((s) => s.simulationResult);
  const nodes = useWorkshopStore((s) => s.nodes);
  const edges = useWorkshopStore((s) => s.edges);
  const scenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;

  const score = useMemo(() => {
    if (!scenario || !simulationResult) return null;
    return scoreScenario(scenario, simulationResult, nodes, edges);
  }, [scenario, simulationResult, nodes, edges]);

  // Holds whichever *specific* result has already been dismissed (by the
  // close button or the timeout below) — not a boolean flag. A genuinely
  // new Run Simulation always produces a new simulationResult object, so
  // comparing by reference means a fresh run is automatically "not
  // dismissed" again with no explicit reset needed; re-selecting a node or
  // scrubbing playback never changes that reference, so neither reopens it.
  const [dismissedResult, setDismissedResult] = useState<SimulationResult | null>(null);
  const visible =
    score?.gatesPassed === true && simulationResult !== null && simulationResult !== dismissedResult;
  const legendary = score?.legendary ?? false;
  const stars = score?.stars ?? 0;

  useEffect(() => {
    if (!visible) return;
    // A legendary result gets a beat longer on screen — it's the rarer,
    // bigger deal of the two.
    const timeout = setTimeout(() => setDismissedResult(simulationResult), legendary ? 8000 : 6000);
    return () => clearTimeout(timeout);
  }, [visible, simulationResult, legendary]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
      <AnimatePresence>
        {visible && scenario && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`pointer-events-auto flex items-center gap-3 rounded-lg border bg-bg-elevated px-4 py-2.5 shadow-dropdown ${
              legendary ? "border-signal" : "border-signal/40"
            }`}
          >
            {legendary ? (
              <Trophy className="size-4 shrink-0 text-signal" aria-hidden />
            ) : (
              <PartyPopper className="size-4 shrink-0 text-signal" aria-hidden />
            )}
            <div>
              <p className="text-sm font-medium text-text">
                {legendary ? `${scenario.title} — LEGENDARY` : `${scenario.title} solved`}
              </p>
              <p
                className="text-xs text-text-subtle"
                aria-label={legendary ? "Legendary — beat the reference solution" : `${stars} out of 3 stars`}
              >
                {legendary ? "★★★★★ Beat the reference solution" : `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissedResult(simulationResult)}
              aria-label="Dismiss"
              className="ml-2 shrink-0 text-text-subtle transition-colors hover:text-text"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
