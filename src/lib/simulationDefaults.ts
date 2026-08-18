/**
 * The connection latency (ms) the live Workshop applies to every edge by
 * default. `workshopBridge.ts`'s `buildSimulationConfig` applies this
 * value to every connection *unconditionally* — regardless of whether the
 * connection itself specifies a `latencyMs` — whenever a scenario is
 * loaded and run through the real UI (see `workshopStore.ts`'s
 * `connectionLatencyMs` state, seeded from this constant).
 *
 * Every scenario's `optimalSolution` and starting scaffold must be tuned
 * and tested against this value, not 0ms — it's what a real student's
 * simulation always actually uses, and every scenario-authoring
 * throwaway script and regression test must apply it too, or "verified
 * against the real engine" quietly stops being true the moment a
 * scenario ships. (Discovered the hard way: three difficulty-4/5
 * scenarios — `viralVideoComments`, `trendingProductSearch`,
 * `globalLeaderboardUpdates` — were tuned against 0ms and failed
 * outright at the real 5ms default; see each file's own header for the
 * retune.)
 */
export const DEFAULT_CONNECTION_LATENCY_MS = 5;
