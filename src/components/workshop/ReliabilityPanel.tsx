"use client";

import { RefreshCw, ShieldQuestion, X } from "lucide-react";
import { useWorkshopStore } from "@/store/workshopStore";
import { DEFAULT_SEEDS } from "@/simulation/engine/reliabilityScore";

/**
 * `docs/Agentic_AI.md` §2.5's pass^k reliability score — this pillar's one
 * genuinely novel contribution, not just a translation of an existing idea
 * into this engine (see `reliabilityScore.ts`'s own doc for the full
 * reasoning). A toggleable drawer, same pattern `TracePanel.tsx` already
 * establishes for this bottom bar, but universal rather than
 * agentic-domain-gated — reliability-under-repeated-seeds is a real
 * question for any architecture this app can build, not just agentic
 * ones (a flaky cache stampede is just as much a reliability story as an
 * unreliable retry loop).
 */
export function ReliabilityPanel() {
  const open = useWorkshopStore((s) => s.reliabilityPanelOpen);
  const setOpen = useWorkshopStore((s) => s.setReliabilityPanelOpen);
  const result = useWorkshopStore((s) => s.reliabilityScoreResult);
  const computing = useWorkshopStore((s) => s.isComputingReliability);
  const error = useWorkshopStore((s) => s.reliabilityScoreError);
  const run = useWorkshopStore((s) => s.runReliabilityScore);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-xs text-text-muted transition-colors hover:text-text"
        aria-pressed={open}
      >
        <ShieldQuestion className="size-3.5 shrink-0" aria-hidden />
        Reliability{result ? ` (${result.passingSeeds}/${result.seeds})` : ""}
      </button>
      {open && (
        <div className="fixed bottom-24 left-0 right-80 z-20 flex h-80 flex-col border-t border-border bg-bg-elevated shadow-lg">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
            <div className="flex items-center gap-2">
              <ShieldQuestion className="size-3.5 text-text-subtle" aria-hidden />
              <h2 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                Reliability — pass^k
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-text-subtle transition-colors hover:text-text"
              aria-label="Close reliability panel"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="mb-4 text-xs leading-relaxed text-text-subtle">
              Re-runs the current architecture across {result?.seeds ?? DEFAULT_SEEDS} different seeds and
              reports the fraction that reach a successful terminal state (success rate ≥{" "}
              {((result?.successRateThreshold ?? 0.95) * 100).toFixed(0)}%) — τ-bench&apos;s pass^k
              reliability metric: does this architecture work every time, not just once.
            </p>
            <button
              type="button"
              onClick={run}
              disabled={computing}
              className="mb-4 flex items-center gap-2 rounded border border-border bg-bg px-3 py-1.5 text-xs text-text transition-colors hover:border-signal hover:text-signal disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 shrink-0 ${computing ? "animate-spin" : ""}`} aria-hidden />
              {computing ? "Running…" : result ? "Run Again" : `Run Check (${DEFAULT_SEEDS} seeds)`}
            </button>
            {error && <p className="text-xs text-status-critical">{error}</p>}
            {!error && !result && !computing && (
              <p className="text-xs text-text-subtle">
                No check run yet — click Run Check to see how reliably this architecture behaves.
              </p>
            )}
            {result && (
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-semibold ${
                      result.passRate === 1
                        ? "text-status-healthy"
                        : result.passRate >= 0.5
                          ? "text-status-degraded"
                          : "text-status-critical"
                    }`}
                  >
                    {result.passingSeeds}/{result.seeds}
                  </span>
                  <span className="text-xs text-text-subtle">
                    seeds reached ≥{(result.successRateThreshold * 100).toFixed(0)}% success
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.perSeedSuccessRates.map((rate, i) => {
                    const passed = rate >= result.successRateThreshold;
                    return (
                      <span
                        key={i}
                        title={`Seed ${i}: ${(rate * 100).toFixed(1)}% success`}
                        className={`flex size-6 items-center justify-center rounded text-[10px] ${
                          passed
                            ? "bg-status-healthy/15 text-status-healthy"
                            : "bg-status-critical/15 text-status-critical"
                        }`}
                      >
                        {i}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
