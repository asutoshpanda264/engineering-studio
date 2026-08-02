/**
 * Derives, per edge, how many of the requests that actually crossed it
 * succeeded vs. were rejected by the entity on the other end — from the
 * real event log, not a fabricated ratio. Powers the AnimatedEdge dots.
 *
 * A request "failed on this edge" if the same requestId has a
 * REQUEST_FAILED event whose source is this edge's target — i.e. it
 * arrived here and got rejected, rather than failing somewhere further
 * downstream (which would show up as a failure on the *next* edge
 * instead, not this one).
 */

import type { SimulationResult } from "@/simulation/types";
import type { ArchitectureEdge } from "@/store/workshopStore";
import type { PacketSample } from "@/components/workshop/edges/AnimatedEdge";

const MAX_SAMPLE_SIZE = 10;

export function computeEdgePacketSamples(
  edges: ArchitectureEdge[],
  result: SimulationResult
): Record<string, PacketSample> {
  const failedAt = new Map<string, string>();
  for (const event of result.events) {
    if (event.type === "REQUEST_FAILED" && event.requestId && event.source) {
      failedAt.set(event.requestId, event.source);
    }
  }

  const samples: Record<string, PacketSample> = {};

  for (const edge of edges) {
    let total = 0;
    let failed = 0;

    for (const event of result.events) {
      if (
        event.type !== "REQUEST_ROUTED" ||
        event.source !== edge.source ||
        event.destination !== edge.target ||
        !event.requestId
      ) {
        continue;
      }
      total++;
      if (failedAt.get(event.requestId) === edge.target) failed++;
    }

    if (total === 0) continue;

    const sampleSize = Math.min(MAX_SAMPLE_SIZE, total);
    const sampleFailed = Math.round((failed / total) * sampleSize);
    samples[edge.id] = {
      success: sampleSize - sampleFailed,
      failed: sampleFailed,
    };
  }

  return samples;
}
